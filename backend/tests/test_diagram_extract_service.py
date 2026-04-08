import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings
from app.services.diagram_extract_service import DiagramExtractionError, DiagramExtractService


class DiagramExtractServiceTest(unittest.IsolatedAsyncioTestCase):
    async def test_mermaid_extraction_normalizes_components_and_flows(self):
        service = DiagramExtractService()
        content = b"graph TD\nClient[Browser] --> API[API Gateway]\nsubgraph Internal Network"
        extracted, metadata = await service.extract_from_upload(
            file_name="architecture.mmd",
            content_type="text/plain",
            file_bytes=content,
        )

        self.assertEqual(metadata["input_type"], "mermaid")
        self.assertIn("Browser -> API Gateway", extracted)
        self.assertIn("Internal Network", extracted)

    async def test_plantuml_extraction_normalizes_components_and_flows(self):
        service = DiagramExtractService()
        content = b'@startuml\nactor "User"\ncomponent API\nUser -> API\n@enduml'
        extracted, metadata = await service.extract_from_upload(
            file_name="architecture.puml",
            content_type="text/plain",
            file_bytes=content,
        )

        self.assertEqual(metadata["input_type"], "plantuml")
        self.assertIn("User -> API", extracted)

    async def test_drawio_extraction_parses_nodes_and_edges(self):
        service = DiagramExtractService()
        xml = (
            "<mxfile><diagram><mxGraphModel><root>"
            '<mxCell id="0"/><mxCell id="1" parent="0"/>'
            '<mxCell id="2" value="Frontend" vertex="1" parent="1"/>'
            '<mxCell id="3" value="API Service" vertex="1" parent="1"/>'
            '<mxCell id="4" edge="1" source="2" target="3" parent="1"/>'
            "</root></mxGraphModel></diagram></mxfile>"
        ).encode("utf-8")

        extracted, metadata = await service.extract_from_upload(
            file_name="architecture.drawio",
            content_type="application/xml",
            file_bytes=xml,
        )

        self.assertEqual(metadata["input_type"], "drawio")
        self.assertIn("Frontend -> API Service", extracted)

    async def test_rejects_unsupported_extension(self):
        service = DiagramExtractService()
        with self.assertRaises(DiagramExtractionError):
            await service.extract_from_upload(
                file_name="payload.exe",
                content_type="application/octet-stream",
                file_bytes=b"malicious",
            )

    async def test_pdf_extraction_respects_max_page_limit(self):
        settings = get_settings()
        service = DiagramExtractService()

        class FakePixmap:
            def tobytes(self, _format: str):
                return b"\x89PNG\r\n\x1a\nmock"

        class FakePage:
            def get_pixmap(self, matrix=None, alpha=False):
                return FakePixmap()

        class FakeDocument:
            def __len__(self):
                return 8

            def load_page(self, _index: int):
                return FakePage()

            def close(self):
                return None

        fake_fitz = SimpleNamespace(
            open=lambda stream, filetype: FakeDocument(),
            Matrix=lambda x, y: (x, y),
        )

        with patch.dict(sys.modules, {"fitz": fake_fitz}):
            with patch.object(service, "_extract_from_image", new=AsyncMock(return_value="Page summary")) as extract_mock:
                extracted, pages_processed = await service._extract_from_pdf(b"%PDF-1.4 mock")

        self.assertEqual(pages_processed, settings.diagram_pdf_max_pages)
        self.assertEqual(extract_mock.await_count, settings.diagram_pdf_max_pages)
        self.assertIn("Page 1", extracted)


if __name__ == "__main__":
    unittest.main()
