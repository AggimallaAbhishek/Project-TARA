from app.services.diagram_extract_internal.constants import (
    DRAWIO_EXTENSIONS,
    IMAGE_EXTENSIONS,
    MAX_EXTRACTED_TEXT_LENGTH,
    MERMAID_EXTENSIONS,
    PDF_EXTENSIONS,
    PLANTUML_EXTENSIONS,
)


def validate_content_type(*, extension: str, content_type: str | None, error_cls) -> None:
    if not content_type:
        return

    normalized = content_type.lower().strip()
    if extension in IMAGE_EXTENSIONS and not normalized.startswith("image/"):
        raise error_cls("Uploaded content type does not match image format.")

    if extension in PDF_EXTENSIONS and normalized not in {"application/pdf", "application/x-pdf"}:
        raise error_cls("Uploaded content type does not match PDF format.")

    if extension in (MERMAID_EXTENSIONS | PLANTUML_EXTENSIONS | DRAWIO_EXTENSIONS):
        allowed = {
            "text/plain",
            "application/xml",
            "text/xml",
            "application/octet-stream",
        }
        if normalized not in allowed:
            raise error_cls("Unsupported content type for text diagram upload.")


def normalize_extracted_text(text: str, *, error_cls) -> str:
    normalized = text.strip()
    if not normalized:
        raise error_cls("Could not extract a usable architecture description from this file.")

    if len(normalized) > MAX_EXTRACTED_TEXT_LENGTH:
        normalized = normalized[:MAX_EXTRACTED_TEXT_LENGTH].rstrip()

    return normalized


def decode_text(file_bytes: bytes, *, error_cls) -> str:
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise error_cls("Text diagram files must be valid UTF-8.") from exc


def validate_pdf(file_bytes: bytes, *, error_cls) -> None:
    if not file_bytes.startswith(b"%PDF"):
        raise error_cls("Invalid PDF file content.")


def validate_image(file_bytes: bytes, *, error_cls) -> None:
    is_png = file_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    is_jpeg = file_bytes.startswith(b"\xff\xd8")
    if not is_png and not is_jpeg:
        raise error_cls("Invalid image content. Use PNG or JPEG images.")
