from io import BytesIO
import re
from typing import Iterable
from xml.sax.saxutils import escape as xml_escape

from app.models.analysis import Analysis, Threat


class PDFReportService:
    @staticmethod
    def _sorted_threats(threats: Iterable[Threat]) -> list[Threat]:
        return sorted(threats, key=lambda threat: threat.risk_score, reverse=True)

    @staticmethod
    def _sanitize_mitigation_segment(text: str) -> str:
        cleaned = text.strip()
        for _ in range(4):
            updated = cleaned.strip()
            updated = re.sub(r"^[\[\]\"'`]+", "", updated)
            updated = re.sub(r"[\[\]\"'`]+$", "", updated)
            updated = re.sub(r"[\[\]\"'`]+(?=[\.,;:!?]+$)", "", updated)
            updated = updated.strip()
            if updated == cleaned:
                break
            cleaned = updated
        return cleaned

    @classmethod
    def _sanitize_mitigation_text(cls, text: str) -> str:
        raw = (text or "").strip()
        if not raw:
            return "Mitigation not provided."

        step_prefix_pattern = re.compile(r"^(\d+[).]?\s+|[-*•]\s+)")
        lines = [line.strip() for line in raw.splitlines() if line.strip()]
        if lines:
            normalized_steps: list[str] = []
            for line in lines:
                step = step_prefix_pattern.sub("", line).strip()
                step = cls._sanitize_mitigation_segment(step)
                if not step:
                    continue
                if step[-1] not in ".!?":
                    step = f"{step}."
                normalized_steps.append(step)

            if normalized_steps:
                return "\n".join(
                    f"{index}. {step}" for index, step in enumerate(normalized_steps, start=1)
                )

        fallback = cls._sanitize_mitigation_segment(raw)
        return fallback or "Mitigation not provided."

    def build_analysis_pdf(self, analysis: Analysis) -> bytes:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import inch
            from reportlab.platypus import (
                Paragraph,
                SimpleDocTemplate,
                Spacer,
                Table,
                TableStyle,
            )
        except ImportError as exc:
            raise RuntimeError("PDF export dependency is missing. Install reportlab.") from exc

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            topMargin=0.6 * inch,
            bottomMargin=0.6 * inch,
            leftMargin=0.6 * inch,
            rightMargin=0.6 * inch,
            title=f"Analysis Report #{analysis.id}",
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0E2142"),
            spaceAfter=6,
        )
        section_heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#132E5C"),
            spaceAfter=4,
            spaceBefore=6,
        )
        body_style = ParagraphStyle(
            "BodyStyle",
            parent=styles["BodyText"],
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#1F2937"),
            wordWrap="CJK",
        )
        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13,
            textColor=colors.white,
            wordWrap="CJK",
        )
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["BodyText"],
            fontSize=9.8,
            leading=12.2,
            textColor=colors.HexColor("#111827"),
            wordWrap="CJK",
        )
        table_score_style = ParagraphStyle(
            "TableScoreCell",
            parent=table_cell_style,
            alignment=2,  # Right align numeric values
        )

        elements = []
        safe_title = xml_escape(analysis.title)
        elements.append(Paragraph("TARA Threat Analysis Report", title_style))
        elements.append(Spacer(1, 6))

        elements.append(Paragraph(f"<b>Report ID:</b> #{analysis.id}", body_style))
        elements.append(Paragraph(f"<b>Title:</b> {safe_title}", body_style))
        elements.append(
            Paragraph(
                f"<b>Created At:</b> {analysis.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                body_style,
            )
        )
        elements.append(
            Paragraph(
                f"<b>Total Risk Score:</b> {analysis.total_risk_score:.2f}",
                body_style,
            )
        )
        elements.append(Paragraph(f"<b>Threat Count:</b> {len(analysis.threats)}", body_style))
        if analysis.analysis_time and analysis.analysis_time > 0:
            elements.append(
                Paragraph(
                    f"<b>Analysis Time:</b> {analysis.analysis_time:.2f}s",
                    body_style,
                )
            )

        elements.append(Spacer(1, 12))
        elements.append(Paragraph("System Description", section_heading_style))
        elements.append(Spacer(1, 6))
        safe_desc = xml_escape(analysis.system_description).replace("\n", "<br/>")
        elements.append(Paragraph(safe_desc, body_style))

        elements.append(Spacer(1, 14))
        elements.append(Paragraph("Threat Summary", section_heading_style))
        elements.append(Spacer(1, 6))

        table_data = [[
            Paragraph("Name", table_header_style),
            Paragraph("STRIDE", table_header_style),
            Paragraph("Risk", table_header_style),
            Paragraph("Score", table_header_style),
            Paragraph("Component", table_header_style),
        ]]
        for threat in self._sorted_threats(analysis.threats):
            table_data.append(
                [
                    Paragraph(xml_escape(threat.name), table_cell_style),
                    Paragraph(xml_escape(threat.stride_category), table_cell_style),
                    Paragraph(xml_escape(threat.risk_level), table_cell_style),
                    Paragraph(f"{threat.risk_score:.1f}", table_score_style),
                    Paragraph(xml_escape(threat.affected_component), table_cell_style),
                ]
            )

        col_widths = [
            doc.width * 0.31,
            doc.width * 0.20,
            doc.width * 0.13,
            doc.width * 0.09,
            doc.width * 0.27,
        ]
        summary_table = Table(table_data, repeatRows=1, colWidths=col_widths, hAlign="LEFT")
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2A44")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#8AA1C8")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFF"), colors.HexColor("#EEF3FF")]),
                    ("ALIGN", (3, 1), (3, -1), "RIGHT"),
                ]
            )
        )
        elements.append(summary_table)

        elements.append(Spacer(1, 14))
        elements.append(Paragraph("Threat Details", section_heading_style))
        elements.append(Spacer(1, 6))

        for index, threat in enumerate(self._sorted_threats(analysis.threats), start=1):
            safe_name = xml_escape(threat.name)
            safe_stride = xml_escape(threat.stride_category)
            safe_risk = xml_escape(threat.risk_level)
            safe_description = xml_escape(threat.description).replace("\n", "<br/>")
            cleaned_mitigation = self._sanitize_mitigation_text(threat.mitigation)
            safe_mitigation = xml_escape(cleaned_mitigation).replace("\n", "<br/>")
            safe_component = xml_escape(threat.affected_component)

            elements.append(Paragraph(f"<b>{index}. {safe_name}</b>", body_style))
            elements.append(
                Paragraph(
                    f"<b>Category:</b> {safe_stride} | <b>Risk:</b> {safe_risk} ({threat.risk_score:.1f})",
                    body_style,
                )
            )
            elements.append(Paragraph(f"<b>Component:</b> {safe_component}", body_style))
            elements.append(Paragraph(f"<b>Description:</b> {safe_description}", body_style))
            elements.append(Paragraph(f"<b>Mitigation:</b> {safe_mitigation}", body_style))
            elements.append(Spacer(1, 10))

        doc.build(elements)
        return buffer.getvalue()


pdf_report_service = PDFReportService()
