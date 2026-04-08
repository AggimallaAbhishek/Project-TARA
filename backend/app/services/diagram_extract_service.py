import asyncio
import base64
import html
import logging
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

try:
    import ollama
except ImportError:
    raise ImportError("ollama package not installed. Run: pip install ollama")

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

MAX_EXTRACTED_TEXT_LENGTH = 5000

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
MERMAID_EXTENSIONS = {".mmd", ".mermaid"}
PLANTUML_EXTENSIONS = {".puml", ".plantuml", ".uml"}
DRAWIO_EXTENSIONS = {".drawio", ".xml"}
PDF_EXTENSIONS = {".pdf"}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | MERMAID_EXTENSIONS | PLANTUML_EXTENSIONS | DRAWIO_EXTENSIONS | PDF_EXTENSIONS


class DiagramExtractionError(ValueError):
    pass


class DiagramExtractService:
    def __init__(self):
        self._diagram_prompt = (
            "Extract an architecture description from this diagram for threat modeling. "
            "Return plain text with short sections: Components, Data Flows, Trust Boundaries, "
            "External Systems. Be concise and concrete."
        )

    async def extract_from_upload(
        self,
        *,
        file_name: str,
        content_type: str | None,
        file_bytes: bytes,
    ) -> tuple[str, dict[str, Any]]:
        extension = Path(file_name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise DiagramExtractionError(
                "Unsupported file type. Supported formats: PNG, JPG, JPEG, PDF, Mermaid, PlantUML, draw.io XML."
            )
        if not file_bytes:
            raise DiagramExtractionError("Uploaded file is empty.")
        self._validate_content_type(extension=extension, content_type=content_type)

        if extension in IMAGE_EXTENSIONS:
            self._validate_image(file_bytes)
            extracted = await self._extract_from_image(file_bytes)
            metadata = {
                "input_type": "image",
                "file_name": file_name,
                "file_size": len(file_bytes),
                "pages_processed": None,
                "extractor_used": f"ollama_vision:{settings.ollama_vision_model}",
            }
            return self._normalize_extracted_text(extracted), metadata

        if extension in PDF_EXTENSIONS:
            self._validate_pdf(file_bytes)
            extracted, pages_processed = await self._extract_from_pdf(file_bytes)
            metadata = {
                "input_type": "pdf",
                "file_name": file_name,
                "file_size": len(file_bytes),
                "pages_processed": pages_processed,
                "extractor_used": f"ollama_vision:{settings.ollama_vision_model}",
            }
            return self._normalize_extracted_text(extracted), metadata

        text_content = self._decode_text(file_bytes)

        if extension in MERMAID_EXTENSIONS:
            extracted = self._extract_from_mermaid(text_content)
            metadata = {
                "input_type": "mermaid",
                "file_name": file_name,
                "file_size": len(file_bytes),
                "pages_processed": None,
                "extractor_used": "mermaid_parser_v1",
            }
            return self._normalize_extracted_text(extracted), metadata

        if extension in PLANTUML_EXTENSIONS:
            extracted = self._extract_from_plantuml(text_content)
            metadata = {
                "input_type": "plantuml",
                "file_name": file_name,
                "file_size": len(file_bytes),
                "pages_processed": None,
                "extractor_used": "plantuml_parser_v1",
            }
            return self._normalize_extracted_text(extracted), metadata

        extracted = self._extract_from_drawio(text_content)
        metadata = {
            "input_type": "drawio",
            "file_name": file_name,
            "file_size": len(file_bytes),
            "pages_processed": None,
            "extractor_used": "drawio_parser_v1",
        }
        return self._normalize_extracted_text(extracted), metadata

    @staticmethod
    def _validate_content_type(*, extension: str, content_type: str | None) -> None:
        if not content_type:
            return
        normalized = content_type.lower().strip()
        if extension in IMAGE_EXTENSIONS and not normalized.startswith("image/"):
            raise DiagramExtractionError("Uploaded content type does not match image format.")
        if extension in PDF_EXTENSIONS and normalized not in {"application/pdf", "application/x-pdf"}:
            raise DiagramExtractionError("Uploaded content type does not match PDF format.")
        if extension in (MERMAID_EXTENSIONS | PLANTUML_EXTENSIONS | DRAWIO_EXTENSIONS):
            # Text diagram uploads are typically sent as text/plain, application/xml, or octet-stream.
            allowed = {
                "text/plain",
                "application/xml",
                "text/xml",
                "application/octet-stream",
            }
            if normalized not in allowed:
                raise DiagramExtractionError("Unsupported content type for text diagram upload.")

    @staticmethod
    def _normalize_extracted_text(text: str) -> str:
        normalized = text.strip()
        if not normalized:
            raise DiagramExtractionError(
                "Could not extract a usable architecture description from this file."
            )
        if len(normalized) > MAX_EXTRACTED_TEXT_LENGTH:
            normalized = normalized[:MAX_EXTRACTED_TEXT_LENGTH].rstrip()
        return normalized

    @staticmethod
    def _decode_text(file_bytes: bytes) -> str:
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                return file_bytes.decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                raise DiagramExtractionError("Text diagram files must be valid UTF-8.") from exc

    @staticmethod
    def _validate_pdf(file_bytes: bytes) -> None:
        if not file_bytes.startswith(b"%PDF"):
            raise DiagramExtractionError("Invalid PDF file content.")

    @staticmethod
    def _validate_image(file_bytes: bytes) -> None:
        is_png = file_bytes.startswith(b"\x89PNG\r\n\x1a\n")
        is_jpeg = file_bytes.startswith(b"\xff\xd8")
        if not is_png and not is_jpeg:
            raise DiagramExtractionError("Invalid image content. Use PNG or JPEG images.")

    async def _extract_from_image(self, image_bytes: bytes) -> str:
        if not settings.ollama_vision_model:
            raise RuntimeError("OLLAMA_VISION_MODEL is not configured.")

        message = {
            "role": "user",
            "content": self._diagram_prompt,
            "images": [base64.b64encode(image_bytes).decode("utf-8")],
        }
        response = await asyncio.wait_for(
            asyncio.to_thread(
                ollama.chat,
                model=settings.ollama_vision_model,
                messages=[message],
                options={
                    "temperature": 0.1,
                    "num_ctx": settings.ollama_num_ctx,
                    "num_predict": settings.ollama_num_predict,
                },
            ),
            timeout=settings.ollama_request_timeout_seconds,
        )
        message_payload = response.get("message", {}) if isinstance(response, dict) else {}
        extracted = str(message_payload.get("content", "") or "").strip()
        if not extracted:
            raise DiagramExtractionError(
                "Vision model returned an empty extraction. Try a clearer diagram."
            )
        return extracted

    async def _extract_from_pdf(self, pdf_bytes: bytes) -> tuple[str, int]:
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("PDF extraction dependency is missing. Install pymupdf.") from exc

        try:
            document = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            raise DiagramExtractionError("Failed to open PDF file.") from exc

        try:
            pages_to_process = min(len(document), max(1, settings.diagram_pdf_max_pages))
            if pages_to_process <= 0:
                raise DiagramExtractionError("PDF contains no pages to process.")

            page_descriptions: list[str] = []
            for page_index in range(pages_to_process):
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                page_bytes = pixmap.tobytes("png")
                extracted = await self._extract_from_image(page_bytes)
                page_descriptions.append(f"Page {page_index + 1}:\n{extracted}")

            combined = "\n\n".join(page_descriptions).strip()
            if not combined:
                raise DiagramExtractionError("Could not extract content from PDF pages.")
            return combined, pages_to_process
        finally:
            document.close()

    def _extract_from_mermaid(self, content: str) -> str:
        cleaned_lines: list[str] = []
        components: set[str] = set()
        data_flows: set[str] = set()
        boundaries: set[str] = set()

        for raw_line in content.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("%%"):
                continue
            cleaned_lines.append(line)

            subgraph_match = re.match(r"^subgraph\s+(.+)$", line, flags=re.IGNORECASE)
            if subgraph_match:
                boundaries.add(subgraph_match.group(1).strip())
                continue

            edge_match = re.match(
                r"^(.+?)\s*[-.=]+[->]+\s*(?:\|[^|]*\|\s*)?(.+)$",
                line,
            )
            if edge_match:
                source = self._normalize_node_token(edge_match.group(1))
                target = self._normalize_node_token(edge_match.group(2))
                if source and target:
                    components.add(source)
                    components.add(target)
                    data_flows.add(f"{source} -> {target}")
                continue

            component_match = re.match(r"^([A-Za-z0-9_]+)\s*[\[\(\{](.+)[\]\)\}]$", line)
            if component_match:
                components.add(component_match.group(2).strip())

        if not data_flows and not components and cleaned_lines:
            raise DiagramExtractionError("Could not identify Mermaid components or flows.")

        return self._build_summary_text(
            diagram_type="Mermaid",
            components=components,
            data_flows=data_flows,
            boundaries=boundaries,
        )

    def _extract_from_plantuml(self, content: str) -> str:
        components: set[str] = set()
        data_flows: set[str] = set()
        boundaries: set[str] = set()

        for raw_line in content.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("'") or line.startswith("//"):
                continue
            if line.lower() in {"@startuml", "@enduml"}:
                continue

            boundary_match = re.match(r"^(package|node|cloud|frame)\s+(.+)$", line, flags=re.IGNORECASE)
            if boundary_match:
                boundaries.add(self._strip_alias(boundary_match.group(2)))

            component_match = re.match(
                r"^(actor|component|database|queue|node|cloud|rectangle|package)\s+(.+)$",
                line,
                flags=re.IGNORECASE,
            )
            if component_match:
                components.add(self._strip_alias(component_match.group(2)))
                continue

            edge_match = re.match(
                r"^(.+?)\s*[-.o*<]*[<>-]+[.]?[->]*\s*(.+?)(?:\s*:\s*(.+))?$",
                line,
            )
            if edge_match:
                source = self._normalize_node_token(edge_match.group(1))
                target = self._normalize_node_token(edge_match.group(2))
                if source and target:
                    components.add(source)
                    components.add(target)
                    data_flows.add(f"{source} -> {target}")

        if not data_flows and not components:
            raise DiagramExtractionError("Could not identify PlantUML components or flows.")

        return self._build_summary_text(
            diagram_type="PlantUML",
            components=components,
            data_flows=data_flows,
            boundaries=boundaries,
        )

    def _extract_from_drawio(self, content: str) -> str:
        try:
            root = ET.fromstring(content)
        except ET.ParseError as exc:
            raise DiagramExtractionError("Invalid draw.io XML content.") from exc

        root_tag = root.tag.lower()
        if "mxfile" not in root_tag and "mxgraphmodel" not in root_tag:
            # Scan child tags in case we start at a wrapper root.
            tags = {child.tag.lower() for child in root.iter()}
            if not any("mxfile" in tag or "mxgraphmodel" in tag for tag in tags):
                raise DiagramExtractionError("Uploaded XML is not a draw.io file.")

        node_labels: dict[str, str] = {}
        components: set[str] = set()
        data_flows: set[str] = set()
        boundaries: set[str] = set()

        for cell in root.iter():
            if not cell.tag.lower().endswith("mxcell"):
                continue
            cell_id = cell.attrib.get("id")
            value = self._clean_drawio_label(cell.attrib.get("value", ""))
            style = cell.attrib.get("style", "")

            if cell.attrib.get("vertex") == "1":
                if value:
                    node_labels[cell_id] = value
                    components.add(value)
                if "swimlane" in style and value:
                    boundaries.add(value)

        for cell in root.iter():
            if not cell.tag.lower().endswith("mxcell"):
                continue
            if cell.attrib.get("edge") != "1":
                continue
            source = node_labels.get(cell.attrib.get("source", ""))
            target = node_labels.get(cell.attrib.get("target", ""))
            if source and target:
                data_flows.add(f"{source} -> {target}")

        if not data_flows and not components:
            raise DiagramExtractionError("Could not identify draw.io components or flows.")

        return self._build_summary_text(
            diagram_type="draw.io",
            components=components,
            data_flows=data_flows,
            boundaries=boundaries,
        )

    @staticmethod
    def _clean_drawio_label(value: str) -> str:
        if not value:
            return ""
        text = html.unescape(value)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    @staticmethod
    def _strip_alias(token: str) -> str:
        token = token.strip()
        quoted = re.findall(r'"([^"]+)"', token)
        if quoted:
            return quoted[-1].strip()

        alias_match = re.match(r"(.+?)\s+as\s+.+$", token, flags=re.IGNORECASE)
        if alias_match:
            token = alias_match.group(1)
        return DiagramExtractService._normalize_node_token(token)

    @staticmethod
    def _normalize_node_token(token: str) -> str:
        cleaned = token.strip().strip('"').strip("'").strip("`")
        if not cleaned:
            return ""

        bracket_match = re.search(r"[\[\(\{]([^\]\)\}]+)[\]\)\}]", cleaned)
        if bracket_match:
            cleaned = bracket_match.group(1)

        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = cleaned.replace("|", " ")
        cleaned = re.sub(r"\s+", " ", cleaned)
        cleaned = cleaned.strip()
        return cleaned

    @staticmethod
    def _build_summary_text(
        *,
        diagram_type: str,
        components: set[str],
        data_flows: set[str],
        boundaries: set[str],
    ) -> str:
        components_block = "\n".join(f"- {component}" for component in sorted(components))
        data_flows_block = "\n".join(f"- {flow}" for flow in sorted(data_flows))
        boundaries_block = "\n".join(f"- {boundary}" for boundary in sorted(boundaries))
        if not boundaries_block:
            boundaries_block = "- Not explicitly identified"

        return (
            f"Diagram Type: {diagram_type}\n\n"
            f"Components:\n{components_block or '- Not identified'}\n\n"
            f"Data Flows:\n{data_flows_block or '- Not identified'}\n\n"
            f"Trust Boundaries:\n{boundaries_block}\n\n"
            "System Summary:\n"
            "This architecture includes the components and flows listed above. "
            "Apply STRIDE analysis across each component, trust boundary crossing, and inter-service flow."
        )


diagram_extract_service = DiagramExtractService()
