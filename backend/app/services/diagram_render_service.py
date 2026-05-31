import hashlib
import logging
from collections import OrderedDict

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

SUPPORTED_UML_FORMATS = {"mermaid", "plantuml"}
SUPPORTED_OUTPUT_FORMATS = {"svg", "png"}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class DiagramRenderError(RuntimeError):
    """Raised when diagram rendering fails due to invalid UML code or unexpected responses."""


class DiagramRendererUnavailableError(RuntimeError):
    """Raised when the diagram renderer service cannot be reached."""


class DiagramRenderService:
    def __init__(self, cache_max_entries: int = 64):
        self.cache_max_entries = max(1, cache_max_entries)
        self._render_cache: OrderedDict[str, bytes] = OrderedDict()

    def _cache_key(self, uml_format: str, uml_code: str, output_format: str) -> str:
        payload = f"{uml_format}\0{output_format}\0{uml_code}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _get_cached_render(self, key: str) -> bytes | None:
        cached_output = self._render_cache.get(key)
        if cached_output is None:
            return None
        self._render_cache.move_to_end(key)
        return cached_output

    def _set_cached_render(self, key: str, rendered_output: bytes) -> None:
        self._render_cache[key] = rendered_output
        self._render_cache.move_to_end(key)
        while len(self._render_cache) > self.cache_max_entries:
            self._render_cache.popitem(last=False)

    def render_diagram(self, uml_format: str, uml_code: str, *, output_format: str, force_refresh: bool = False) -> bytes:
        settings = get_settings()
        normalized_format = (uml_format or "").strip().lower()
        normalized_output_format = (output_format or "").strip().lower()
        normalized_code = (uml_code or "").strip()
        if normalized_format not in SUPPORTED_UML_FORMATS:
            raise DiagramRenderError("Unsupported UML format for rendering.")
        if normalized_output_format not in SUPPORTED_OUTPUT_FORMATS:
            raise DiagramRenderError("Unsupported diagram output format.")
        if not normalized_code:
            raise DiagramRenderError("UML code cannot be blank.")
        if len(normalized_code) > settings.diagram_render_max_chars:
            raise DiagramRenderError(
                f"UML code is too large for rendering. Maximum {settings.diagram_render_max_chars} characters."
            )

        key = self._cache_key(normalized_format, normalized_code, normalized_output_format)
        cached_output = None if force_refresh else self._get_cached_render(key)
        if cached_output is not None:
            logger.debug(
                "Diagram render cache hit format=%s output=%s chars=%s",
                normalized_format,
                normalized_output_format,
                len(normalized_code),
            )
            return cached_output

        render_url = f"{settings.diagram_renderer_url.rstrip('/')}/{normalized_format}/{normalized_output_format}"
        logger.debug(
            "Diagram render request format=%s output=%s chars=%s force_refresh=%s url=%s",
            normalized_format,
            normalized_output_format,
            len(normalized_code),
            force_refresh,
            render_url,
        )
        try:
            with httpx.Client(timeout=settings.diagram_render_timeout_seconds) as client:
                response = client.post(
                    render_url,
                    content=normalized_code.encode("utf-8"),
                    headers={"Content-Type": "text/plain; charset=utf-8"},
                )
        except httpx.TimeoutException as exc:
            logger.warning("Diagram render timeout format=%s url=%s", normalized_format, render_url, exc_info=True)
            raise DiagramRendererUnavailableError("Diagram renderer timed out.") from exc
        except httpx.RequestError as exc:
            logger.warning(
                "Diagram renderer request failed format=%s url=%s",
                normalized_format,
                render_url,
                exc_info=True,
            )
            raise DiagramRendererUnavailableError("Diagram renderer is unreachable.") from exc

        if response.status_code >= 500:
            logger.warning(
                "Diagram renderer returned server error status=%s format=%s output=%s",
                response.status_code,
                normalized_format,
                normalized_output_format,
            )
            raise DiagramRendererUnavailableError("Diagram renderer is unavailable.")

        if response.status_code in {400, 404, 422}:
            logger.info(
                "Diagram renderer rejected UML code status=%s format=%s output=%s",
                response.status_code,
                normalized_format,
                normalized_output_format,
            )
            raise DiagramRenderError("Diagram renderer rejected UML code. Check syntax and try again.")

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Diagram renderer unexpected response status=%s format=%s output=%s",
                response.status_code,
                normalized_format,
                normalized_output_format,
            )
            raise DiagramRendererUnavailableError("Diagram renderer request failed.") from exc

        rendered_output = response.content
        if normalized_output_format == "svg":
            svg_content = response.text.strip()
            if "<svg" not in svg_content[:200]:
                logger.warning("Diagram renderer returned non-SVG payload format=%s", normalized_format)
                raise DiagramRenderError("Diagram renderer returned invalid SVG output.")
            rendered_output = svg_content.encode("utf-8")
        elif normalized_output_format == "png":
            if not rendered_output.startswith(PNG_SIGNATURE):
                logger.warning("Diagram renderer returned non-PNG payload format=%s", normalized_format)
                raise DiagramRenderError("Diagram renderer returned invalid PNG output.")

        self._set_cached_render(key, rendered_output)
        logger.debug(
            "Diagram render success format=%s output=%s chars=%s bytes=%s",
            normalized_format,
            normalized_output_format,
            len(normalized_code),
            len(rendered_output),
        )
        return rendered_output

    def render_svg(self, uml_format: str, uml_code: str, *, force_refresh: bool = False) -> str:
        svg_bytes = self.render_diagram(
            uml_format,
            uml_code,
            output_format="svg",
            force_refresh=force_refresh,
        )
        return svg_bytes.decode("utf-8")

    def render_png(self, uml_format: str, uml_code: str, *, force_refresh: bool = False) -> bytes:
        return self.render_diagram(
            uml_format,
            uml_code,
            output_format="png",
            force_refresh=force_refresh,
        )


diagram_render_service = DiagramRenderService()
