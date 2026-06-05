import logging
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.services.diagram_extract_internal.vision import extract_from_image
from app.services.source_context_service import (
    build_editable_summary,
    build_structured_context,
    chunk_text,
    summarize_chunks,
)

try:
    import ollama
except ImportError:
    raise ImportError("ollama package not installed. Run: pip install ollama")

settings = get_settings()
logger = logging.getLogger(__name__)

MAX_EXTRACTED_TEXT_LENGTH = 5000
MIN_SELECTABLE_PDF_TEXT_CHARS = 1

TXT_EXTENSIONS = {".txt"}
PDF_EXTENSIONS = {".pdf"}
SUPPORTED_EXTENSIONS = TXT_EXTENSIONS | PDF_EXTENSIONS


class DocumentExtractionError(ValueError):
    """Raised when uploaded document validation/extraction fails."""


class DocumentExtractService:
    async def extract_from_upload(
        self,
        *,
        file_name: str,
        content_type: str | None,
        file_bytes: bytes,
    ) -> tuple[str, dict[str, Any]]:
        extension = Path(file_name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise DocumentExtractionError("Unsupported file type. Supported formats: PDF, TXT.")
        if not file_bytes:
            raise DocumentExtractionError("Uploaded file is empty.")

        self._validate_content_type(extension=extension, content_type=content_type)

        if extension in TXT_EXTENSIONS:
            extracted = self._extract_from_txt(file_bytes)
            normalized = self._normalize_extracted_text(extracted)
            structured = build_structured_context(normalized)
            metadata = {
                "input_type": "txt",
                "file_name": file_name,
                "file_size": len(file_bytes),
                "pages_processed": None,
                "extractor_used": "text_decoder_v1",
                "raw_text_length": len(extracted),
                "chunks_processed": len(chunk_text(extracted)),
                "structured_context": structured,
                "editable_summary": build_editable_summary(normalized, structured),
            }
            return normalized, metadata

        self._validate_pdf(file_bytes)
        try:
            extracted, pages_processed = self._extract_from_pdf(file_bytes)
            input_type = "pdf"
            extractor_used = "pymupdf_text_v1"
        except DocumentExtractionError as exc:
            if "No extractable text found" not in str(exc):
                raise
            extracted, pages_processed = await self._extract_from_scanned_pdf(file_bytes)
            input_type = "pdf_scanned"
            extractor_used = f"ollama_vision:{get_settings().ollama_vision_model}"

        normalized = self._normalize_extracted_text(extracted)
        structured = build_structured_context(normalized)
        metadata = {
            "input_type": input_type,
            "file_name": file_name,
            "file_size": len(file_bytes),
            "pages_processed": pages_processed,
            "extractor_used": extractor_used,
            "raw_text_length": len(extracted),
            "chunks_processed": len(chunk_text(extracted)),
            "structured_context": structured,
            "editable_summary": build_editable_summary(normalized, structured),
        }
        return normalized, metadata

    @staticmethod
    def _validate_content_type(*, extension: str, content_type: str | None) -> None:
        if not content_type:
            return
        normalized = content_type.lower().strip()

        if extension in TXT_EXTENSIONS:
            allowed = {
                "text/plain",
                "application/octet-stream",
            }
            if normalized not in allowed:
                raise DocumentExtractionError("Uploaded content type does not match TXT format.")
            return

        if extension in PDF_EXTENSIONS and normalized not in {"application/pdf", "application/x-pdf"}:
            raise DocumentExtractionError("Uploaded content type does not match PDF format.")

    @staticmethod
    def _validate_pdf(file_bytes: bytes) -> None:
        if not file_bytes.startswith(b"%PDF"):
            raise DocumentExtractionError("Invalid PDF file content.")

    @staticmethod
    def _extract_from_txt(file_bytes: bytes) -> str:
        try:
            return file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise DocumentExtractionError("TXT file must be valid UTF-8.") from exc

    def _extract_from_pdf(self, file_bytes: bytes) -> tuple[str, int]:
        current_settings = get_settings()
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("PDF extraction dependency is missing. Install pymupdf.") from exc

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise DocumentExtractionError("Failed to open PDF file.") from exc

        try:
            if getattr(document, "is_encrypted", False):
                raise DocumentExtractionError("Encrypted PDFs are not supported.")
            current_settings = get_settings()
            if len(document) > current_settings.document_pdf_hard_max_pages:
                raise DocumentExtractionError(
                    f"Document PDF has too many pages. Maximum allowed is {current_settings.document_pdf_hard_max_pages} pages."
                )
            pages_to_process = min(len(document), max(1, current_settings.document_pdf_max_pages))
            if pages_to_process <= 0:
                raise DocumentExtractionError("PDF contains no pages to process.")

            extracted_pages: list[str] = []
            for page_index in range(pages_to_process):
                page = document.load_page(page_index)
                page_text = str(page.get_text("text") or "").strip()
                if page_text:
                    extracted_pages.append(f"Page {page_index + 1}\n{page_text}")

            combined_text = "\n\n".join(extracted_pages).strip()
            if len(combined_text) < MIN_SELECTABLE_PDF_TEXT_CHARS:
                raise DocumentExtractionError(
                    "No extractable text found in PDF. Ensure the PDF contains selectable text."
                )
            return combined_text, pages_to_process
        finally:
            document.close()

    async def _extract_from_scanned_pdf(self, file_bytes: bytes) -> tuple[str, int]:
        current_settings = get_settings()
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("PDF extraction dependency is missing. Install pymupdf.") from exc

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise DocumentExtractionError("Failed to open PDF file.") from exc

        try:
            if getattr(document, "is_encrypted", False):
                raise DocumentExtractionError("Encrypted PDFs are not supported.")
            if len(document) > current_settings.document_pdf_hard_max_pages:
                raise DocumentExtractionError(
                    f"Document PDF has too many pages. Maximum allowed is {current_settings.document_pdf_hard_max_pages} pages."
                )
            pages_to_process = min(len(document), max(1, current_settings.document_pdf_max_pages))
            page_descriptions: list[str] = []
            for page_index in range(pages_to_process):
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                extracted = await extract_from_image(
                    image_bytes=pixmap.tobytes("png"),
                    diagram_prompt=(
                        "Extract architecture, security, component, data-flow, trust-boundary, "
                        "asset, and external-system details from this scanned document page. "
                        "Return concise plain text only."
                    ),
                    settings=current_settings,
                    ollama_chat=ollama.chat,
                    response_error_cls=ollama.ResponseError,
                    logger=logger,
                    error_cls=DocumentExtractionError,
                )
                page_descriptions.append(f"Scanned Page {page_index + 1}\n{extracted}")
            combined = "\n\n".join(page_descriptions).strip()
            if not combined:
                raise DocumentExtractionError("Vision model could not extract scanned PDF content.")
            return combined, pages_to_process
        finally:
            document.close()

    @staticmethod
    def _normalize_extracted_text(text: str) -> str:
        lines = [line.strip() for line in text.splitlines()]
        normalized = "\n".join(line for line in lines if line).strip()
        if not normalized:
            raise DocumentExtractionError(
                "Could not extract a usable document description from this file."
            )

        max_chars = get_settings().document_summary_max_chars
        if len(normalized) > max_chars:
            chunks = chunk_text(normalized)
            normalized = summarize_chunks(chunks, max_chars=max_chars).rstrip()
        return normalized


document_extract_service = DocumentExtractService()
