import logging
from pathlib import Path
from typing import Any

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

MAX_EXTRACTED_TEXT_LENGTH = 5000

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
            metadata = {
                "input_type": "txt",
                "file_name": file_name,
                "file_size": len(file_bytes),
                "pages_processed": None,
                "extractor_used": "text_decoder_v1",
            }
            return self._normalize_extracted_text(extracted), metadata

        self._validate_pdf(file_bytes)
        extracted, pages_processed = self._extract_from_pdf(file_bytes)
        metadata = {
            "input_type": "pdf",
            "file_name": file_name,
            "file_size": len(file_bytes),
            "pages_processed": pages_processed,
            "extractor_used": "pymupdf_text_v1",
        }
        return self._normalize_extracted_text(extracted), metadata

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
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("PDF extraction dependency is missing. Install pymupdf.") from exc

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise DocumentExtractionError("Failed to open PDF file.") from exc

        try:
            pages_to_process = min(len(document), max(1, settings.document_pdf_max_pages))
            if pages_to_process <= 0:
                raise DocumentExtractionError("PDF contains no pages to process.")

            extracted_pages: list[str] = []
            for page_index in range(pages_to_process):
                page = document.load_page(page_index)
                page_text = str(page.get_text("text") or "").strip()
                if page_text:
                    extracted_pages.append(f"Page {page_index + 1}\n{page_text}")

            combined_text = "\n\n".join(extracted_pages).strip()
            if not combined_text:
                raise DocumentExtractionError(
                    "No extractable text found in PDF. Ensure the PDF contains selectable text."
                )
            return combined_text, pages_to_process
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

        if len(normalized) > MAX_EXTRACTED_TEXT_LENGTH:
            logger.info(
                "Truncating extracted document text from %s to %s characters",
                len(normalized),
                MAX_EXTRACTED_TEXT_LENGTH,
            )
            normalized = normalized[:MAX_EXTRACTED_TEXT_LENGTH].rstrip()
        return normalized


document_extract_service = DocumentExtractService()
