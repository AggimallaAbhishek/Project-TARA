import logging
import os
from pathlib import Path
from typing import Any

try:
    import ollama
except ImportError:
    raise ImportError("ollama package not installed. Run: pip install ollama")

from app.config import get_settings
from app.services.diagram_extract_internal import (
    DRAWIO_EXTENSIONS,
    IMAGE_EXTENSIONS,
    MERMAID_EXTENSIONS,
    PDF_EXTENSIONS,
    PLANTUML_EXTENSIONS,
    SUPPORTED_EXTENSIONS,
    decode_text,
    extract_from_drawio,
    extract_from_image,
    extract_from_mermaid,
    extract_from_pdf,
    extract_from_plantuml,
    normalize_extracted_text,
    validate_content_type,
    validate_image,
    validate_pdf,
)

settings = get_settings()
logger = logging.getLogger(__name__)
os.environ.setdefault("OLLAMA_HOST", settings.ollama_host)


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
        current_settings = get_settings()
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
                "extractor_used": f"ollama_vision:{current_settings.ollama_vision_model}",
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
                "extractor_used": f"ollama_vision:{current_settings.ollama_vision_model}",
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

    def extract_from_uml_code(self, *, uml_format: str, uml_code: str) -> str:
        normalized_format = (uml_format or "").strip().lower()
        normalized_code = (uml_code or "").strip()
        if not normalized_code:
            raise DiagramExtractionError("UML code cannot be blank.")

        if normalized_format == "mermaid":
            extracted = self._extract_from_mermaid(normalized_code)
        elif normalized_format == "plantuml":
            extracted = self._extract_from_plantuml(normalized_code)
        else:
            raise DiagramExtractionError("Unsupported UML format. Use Mermaid or PlantUML.")

        logger.debug(
            "UML code extracted format=%s chars=%s",
            normalized_format,
            len(normalized_code),
        )
        return self._normalize_extracted_text(extracted)

    @staticmethod
    def _validate_content_type(*, extension: str, content_type: str | None) -> None:
        validate_content_type(
            extension=extension,
            content_type=content_type,
            error_cls=DiagramExtractionError,
        )

    @staticmethod
    def _normalize_extracted_text(text: str) -> str:
        return normalize_extracted_text(text, error_cls=DiagramExtractionError)

    @staticmethod
    def _decode_text(file_bytes: bytes) -> str:
        return decode_text(file_bytes, error_cls=DiagramExtractionError)

    @staticmethod
    def _validate_pdf(file_bytes: bytes) -> None:
        validate_pdf(file_bytes, error_cls=DiagramExtractionError)

    @staticmethod
    def _validate_image(file_bytes: bytes) -> None:
        validate_image(file_bytes, error_cls=DiagramExtractionError)

    async def _extract_from_image(self, image_bytes: bytes) -> str:
        return await extract_from_image(
            image_bytes=image_bytes,
            diagram_prompt=self._diagram_prompt,
            settings=get_settings(),
            ollama_chat=ollama.chat,
            response_error_cls=ollama.ResponseError,
            logger=logger,
            error_cls=DiagramExtractionError,
        )

    async def _extract_from_pdf(self, pdf_bytes: bytes) -> tuple[str, int]:
        return await extract_from_pdf(
            pdf_bytes=pdf_bytes,
            settings=get_settings(),
            extract_image_fn=self._extract_from_image,
            error_cls=DiagramExtractionError,
        )

    def _extract_from_mermaid(self, content: str) -> str:
        return extract_from_mermaid(content, error_cls=DiagramExtractionError)

    def _extract_from_plantuml(self, content: str) -> str:
        return extract_from_plantuml(content, error_cls=DiagramExtractionError)

    def _extract_from_drawio(self, content: str) -> str:
        return extract_from_drawio(content, error_cls=DiagramExtractionError)


diagram_extract_service = DiagramExtractService()
