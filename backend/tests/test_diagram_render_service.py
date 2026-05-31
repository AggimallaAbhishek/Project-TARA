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
        if isinstance(response_or_exception, list):
            self.responses_or_exceptions = response_or_exception
        else:
            self.responses_or_exceptions = [response_or_exception]
        self.post_calls = []
        self._call_index = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def post(self, url, content, headers):
        self.post_calls.append((url, content, headers))
        value = self.responses_or_exceptions[min(self._call_index, len(self.responses_or_exceptions) - 1)]
        self._call_index += 1
        if isinstance(value, Exception):
            raise value
        return value


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

    def test_render_png_cache_is_separate_from_svg_cache(self):
        service = DiagramRenderService(cache_max_entries=8)
        svg_response = httpx.Response(
            status_code=200,
            text="<svg><rect/></svg>",
            request=httpx.Request("POST", "http://kroki:8000/mermaid/svg"),
        )
        png_response = httpx.Response(
            status_code=200,
            content=b"\x89PNG\r\n\x1a\npngbytes",
            request=httpx.Request("POST", "http://kroki:8000/mermaid/png"),
        )
        fake_client = _FakeClient([svg_response, png_response])

        with patch("app.services.diagram_render_service.get_settings", return_value=_build_settings()):
            with patch("app.services.diagram_render_service.httpx.Client", return_value=fake_client):
                svg = service.render_svg("mermaid", "graph TD\nA-->B")
                png_first = service.render_png("mermaid", "graph TD\nA-->B")
                png_second = service.render_png("mermaid", "graph TD\nA-->B")

        self.assertEqual(svg, "<svg><rect/></svg>")
        self.assertTrue(png_first.startswith(b"\x89PNG\r\n\x1a\n"))
        self.assertEqual(png_first, png_second)
        self.assertEqual(len(fake_client.post_calls), 2)

    def test_force_refresh_bypasses_cache_and_updates_entry(self):
        service = DiagramRenderService(cache_max_entries=8)
        first_svg_response = httpx.Response(
            status_code=200,
            text="<svg><text>first</text></svg>",
            request=httpx.Request("POST", "http://kroki:8000/mermaid/svg"),
        )
        second_svg_response = httpx.Response(
            status_code=200,
            text="<svg><text>second</text></svg>",
            request=httpx.Request("POST", "http://kroki:8000/mermaid/svg"),
        )
        fake_client = _FakeClient([first_svg_response, second_svg_response])

        with patch("app.services.diagram_render_service.get_settings", return_value=_build_settings()):
            with patch("app.services.diagram_render_service.httpx.Client", return_value=fake_client):
                first = service.render_svg("mermaid", "graph TD\nA-->B")
                cached = service.render_svg("mermaid", "graph TD\nA-->B")
                refreshed = service.render_svg("mermaid", "graph TD\nA-->B", force_refresh=True)
                post_refresh_cached = service.render_svg("mermaid", "graph TD\nA-->B")

        self.assertEqual(first, "<svg><text>first</text></svg>")
        self.assertEqual(cached, "<svg><text>first</text></svg>")
        self.assertEqual(refreshed, "<svg><text>second</text></svg>")
        self.assertEqual(post_refresh_cached, "<svg><text>second</text></svg>")
        self.assertEqual(len(fake_client.post_calls), 2)


if __name__ == "__main__":
    unittest.main()
