from io import BytesIO
from typing import Iterable
from xml.sax.saxutils import escape as xml_escape

from app.models.analysis import Analysis, Threat


class PDFReportService:
    @staticmethod
    def _sorted_threats(threats: Iterable[Threat]) -> list[Threat]:
        return sorted(threats, key=lambda threat: threat.risk_score, reverse=True)

    def build_analysis_pdf(self, analysis: Analysis) -> bytes:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib.units import inch
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
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
        elements = []

        safe_title = xml_escape(analysis.title)

        elements.append(Paragraph(f"<b>TARA Analysis Report</b> #{analysis.id}", styles["Title"]))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"<b>Title:</b> {safe_title}", styles["BodyText"]))
        elements.append(
            Paragraph(
                f"<b>Created At:</b> {analysis.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                styles["BodyText"],
            )
        )
        elements.append(
            Paragraph(
                f"<b>Total Risk Score:</b> {analysis.total_risk_score:.2f}",
                styles["BodyText"],
            )
        )
        elements.append(Paragraph(f"<b>Threat Count:</b> {len(analysis.threats)}", styles["BodyText"]))
        if analysis.analysis_time and analysis.analysis_time > 0:
            elements.append(
                Paragraph(
                    f"<b>Analysis Time:</b> {analysis.analysis_time:.2f}s",
                    styles["BodyText"],
                )
            )

        elements.append(Spacer(1, 12))
        elements.append(Paragraph("<b>System Description</b>", styles["Heading3"]))
        elements.append(Spacer(1, 6))
        safe_desc = xml_escape(analysis.system_description).replace("\n", "<br/>")
        elements.append(Paragraph(safe_desc, styles["BodyText"]))

        elements.append(Spacer(1, 14))
        elements.append(Paragraph("<b>Threat Summary</b>", styles["Heading3"]))
        elements.append(Spacer(1, 6))

        table_data = [["Name", "STRIDE", "Risk", "Score", "Component"]]
        for threat in self._sorted_threats(analysis.threats):
            table_data.append(
                [
                    threat.name,
                    threat.stride_category,
                    threat.risk_level,
                    f"{threat.risk_score:.1f}",
                    threat.affected_component,
                ]
            )

        summary_table = Table(table_data, repeatRows=1, colWidths=[2.0 * inch, 1.4 * inch, 0.8 * inch, 0.6 * inch, 2.0 * inch])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2A44")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#8AA1C8")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#EEF3FF")]),
                ]
            )
        )
        elements.append(summary_table)

        elements.append(Spacer(1, 14))
        elements.append(Paragraph("<b>Threat Details</b>", styles["Heading3"]))
        elements.append(Spacer(1, 6))

        for index, threat in enumerate(self._sorted_threats(analysis.threats), start=1):
            safe_name = xml_escape(threat.name)
            safe_stride = xml_escape(threat.stride_category)
            safe_risk = xml_escape(threat.risk_level)
            safe_description = xml_escape(threat.description)
            safe_mitigation = xml_escape(threat.mitigation)
            safe_component = xml_escape(threat.affected_component)

            elements.append(Paragraph(f"<b>{index}. {safe_name}</b>", styles["BodyText"]))
            elements.append(
                Paragraph(
                    f"<b>Category:</b> {safe_stride} | <b>Risk:</b> {safe_risk} ({threat.risk_score:.1f})",
                    styles["BodyText"],
                )
            )
            elements.append(Paragraph(f"<b>Component:</b> {safe_component}", styles["BodyText"]))
            elements.append(Paragraph(f"<b>Description:</b> {safe_description}", styles["BodyText"]))
            elements.append(Paragraph(f"<b>Mitigation:</b> {safe_mitigation}", styles["BodyText"]))
            elements.append(Spacer(1, 10))

        doc.build(elements)
        return buffer.getvalue()


pdf_report_service = PDFReportService()
