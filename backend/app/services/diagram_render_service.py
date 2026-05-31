import hashlib
import logging
from collections import OrderedDict

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

SUPPORTED_UML_FORMATS = {"mermaid", "plantuml"}


class DiagramRenderError(RuntimeError):
    """Raised when diagram rendering fails due to invalid UML code or unexpected responses."""


class DiagramRendererUnavailableError(RuntimeError):
    """Raised when the diagram renderer service cannot be reached."""


class DiagramRenderService:
    def __init__(self, cache_max_entries: int = 64):
        self.cache_max_entries = max(1, cache_max_entries)
        self._svg_cache: OrderedDict[str, str] = OrderedDict()

    def _cache_key(self, uml_format: str, uml_code: str) -> str:
        payload = f"{uml_format}\0{uml_code}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _get_cached_svg(self, key: str) -> str | None:
        cached_svg = self._svg_cache.get(key)
        if cached_svg is None:
            return None
        self._svg_cache.move_to_end(key)
        return cached_svg

    def _set_cached_svg(self, key: str, svg_content: str) -> None:
        self._svg_cache[key] = svg_content
        self._svg_cache.move_to_end(key)
        while len(self._svg_cache) > self.cache_max_entries:
            self._svg_cache.popitem(last=False)

    def render_svg(self, uml_format: str, uml_code: str) -> str:
        settings = get_settings()
        normalized_format = (uml_format or "").strip().lower()
        normalized_code = (uml_code or "").strip()
        if normalized_format not in SUPPORTED_UML_FORMATS:
            raise DiagramRenderError("Unsupported UML format for rendering.")
        if not normalized_code:
            raise DiagramRenderError("UML code cannot be blank.")
        if len(normalized_code) > settings.diagram_render_max_chars:
            raise DiagramRenderError(
                f"UML code is too large for rendering. Maximum {settings.diagram_render_max_chars} characters."
            )

        key = self._cache_key(normalized_format, normalized_code)
        cached_svg = self._get_cached_svg(key)
        if cached_svg is not None:
            logger.debug(
                "Diagram render cache hit format=%s chars=%s",
                normalized_format,
                len(normalized_code),
            )
            return cached_svg

        render_url = f"{settings.diagram_renderer_url.rstrip('/')}/{normalized_format}/svg"
        logger.debug(
            "Diagram render request format=%s chars=%s url=%s",
            normalized_format,
            len(normalized_code),
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
                "Diagram renderer returned server error status=%s format=%s",
                response.status_code,
                normalized_format,
            )
            raise DiagramRendererUnavailableError("Diagram renderer is unavailable.")

        if response.status_code in {400, 404, 422}:
            logger.info(
                "Diagram renderer rejected UML code status=%s format=%s",
                response.status_code,
                normalized_format,
            )
            raise DiagramRenderError("Diagram renderer rejected UML code. Check syntax and try again.")

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Diagram renderer unexpected response status=%s format=%s",
                response.status_code,
                normalized_format,
            )
            raise DiagramRendererUnavailableError("Diagram renderer request failed.") from exc

        svg_content = response.text.strip()
        if "<svg" not in svg_content[:200]:
            logger.warning("Diagram renderer returned non-SVG payload format=%s", normalized_format)
            raise DiagramRenderError("Diagram renderer returned invalid SVG output.")

        self._set_cached_svg(key, svg_content)
        logger.debug(
            "Diagram render success format=%s chars=%s svg_bytes=%s",
            normalized_format,
            len(normalized_code),
            len(svg_content.encode("utf-8")),
        )
        return svg_content


diagram_render_service = DiagramRenderService()
