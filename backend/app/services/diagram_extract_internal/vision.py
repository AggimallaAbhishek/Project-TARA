import asyncio
import base64
from typing import Any, Awaitable, Callable


async def extract_from_image(
    *,
    image_bytes: bytes,
    diagram_prompt: str,
    settings,
    ollama_chat: Callable[..., dict[str, Any]],
    response_error_cls,
    logger,
    error_cls,
) -> str:
    if not settings.ollama_vision_model:
        raise RuntimeError("OLLAMA_VISION_MODEL is not configured.")

    message = {
        "role": "user",
        "content": diagram_prompt,
        "images": [base64.b64encode(image_bytes).decode("utf-8")],
    }

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                ollama_chat,
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
    except ConnectionError as exc:
        logger.warning(
            "Diagram vision extraction provider_unreachable model=%s host=%s error=%s",
            settings.ollama_vision_model,
            settings.ollama_host,
            str(exc),
        )
        raise RuntimeError(
            "Ollama vision model is unreachable. Start Ollama and verify OLLAMA_HOST is reachable from the backend runtime."
        ) from exc
    except response_error_cls as exc:
        status_code = getattr(exc, "status_code", None)
        logger.warning(
            "Diagram vision extraction provider_response_error model=%s status=%s error=%s",
            settings.ollama_vision_model,
            status_code,
            str(getattr(exc, "error", "") or str(exc)),
        )
        if status_code == 404:
            raise RuntimeError(
                f"Ollama vision model '{settings.ollama_vision_model}' is unavailable. Pull it or set OLLAMA_VISION_MODEL."
            ) from exc
        raise RuntimeError("Diagram vision extraction provider error from Ollama.") from exc

    message_payload = response.get("message", {}) if isinstance(response, dict) else {}
    extracted = str(message_payload.get("content", "") or "").strip()
    if not extracted:
        raise error_cls("Vision model returned an empty extraction. Try a clearer diagram.")

    return extracted


async def extract_from_pdf(
    *,
    pdf_bytes: bytes,
    settings,
    extract_image_fn: Callable[[bytes], Awaitable[str]],
    error_cls,
) -> tuple[str, int]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PDF extraction dependency is missing. Install pymupdf.") from exc

    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise error_cls("Failed to open PDF file.") from exc

    try:
        pages_to_process = min(len(document), max(1, settings.diagram_pdf_max_pages))
        if pages_to_process <= 0:
            raise error_cls("PDF contains no pages to process.")

        page_descriptions: list[str] = []
        for page_index in range(pages_to_process):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            page_bytes = pixmap.tobytes("png")
            extracted = await extract_image_fn(page_bytes)
            page_descriptions.append(f"Page {page_index + 1}:\n{extracted}")

        combined = "\n\n".join(page_descriptions).strip()
        if not combined:
            raise error_cls("Could not extract content from PDF pages.")

        return combined, pages_to_process
    finally:
        document.close()
