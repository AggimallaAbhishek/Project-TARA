import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import httpx


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.diagram_render_service import (  # noqa: E402
    DiagramRenderError,
    DiagramRenderService,
    DiagramRendererUnavailableError,
)


def _build_settings():
    return SimpleNamespace(
        diagram_renderer_url="http://kroki:8000",
        diagram_render_timeout_seconds=5,
        diagram_render_max_chars=50000,
    )


class _FakeClient:
    def __init__(self, response_or_exception):
        self.response_or_exception = response_or_exception
        self.post_calls = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def post(self, url, content, headers):
        self.post_calls.append((url, content, headers))
        if isinstance(self.response_or_exception, Exception):
            raise self.response_or_exception
        return self.response_or_exception


class DiagramRenderServiceTest(unittest.TestCase):
    def test_render_svg_success_and_cache_hit(self):
        service = DiagramRenderService(cache_max_entries=8)
        response = httpx.Response(
            status_code=200,
            text="<svg><rect/></svg>",
            request=httpx.Request("POST", "http://kroki:8000/mermaid/svg"),
        )
        fake_client = _FakeClient(response)

        with patch("app.services.diagram_render_service.get_settings", return_value=_build_settings()):
            with patch("app.services.diagram_render_service.httpx.Client", return_value=fake_client):
                first = service.render_svg("mermaid", "graph TD\nA-->B")
                second = service.render_svg("mermaid", "graph TD\nA-->B")

        self.assertEqual(first, "<svg><rect/></svg>")
        self.assertEqual(second, "<svg><rect/></svg>")
        self.assertEqual(len(fake_client.post_calls), 1)

    def test_render_svg_rejected_by_renderer(self):
        service = DiagramRenderService()
        response = httpx.Response(
            status_code=400,
            text="bad syntax",
            request=httpx.Request("POST", "http://kroki:8000/mermaid/svg"),
        )
        fake_client = _FakeClient(response)

        with patch("app.services.diagram_render_service.get_settings", return_value=_build_settings()):
            with patch("app.services.diagram_render_service.httpx.Client", return_value=fake_client):
                with self.assertRaises(DiagramRenderError):
                    service.render_svg("mermaid", "invalid")

    def test_render_svg_unavailable_on_network_error(self):
        service = DiagramRenderService()
        request_error = httpx.ConnectError(
            "connection refused",
            request=httpx.Request("POST", "http://kroki:8000/plantuml/svg"),
        )
        fake_client = _FakeClient(request_error)

        with patch("app.services.diagram_render_service.get_settings", return_value=_build_settings()):
            with patch("app.services.diagram_render_service.httpx.Client", return_value=fake_client):
                with self.assertRaises(DiagramRendererUnavailableError):
                    service.render_svg("plantuml", "@startuml\nA->B\n@enduml")


if __name__ == "__main__":
    unittest.main()
