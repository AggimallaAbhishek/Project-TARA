import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings
from app.services.document_extract_service import DocumentExtractService, DocumentExtractionError


class DocumentExtractServiceTest(unittest.IsolatedAsyncioTestCase):
    async def test_extracts_txt_document(self):
        service = DocumentExtractService()
        extracted, metadata = await service.extract_from_upload(
            file_name="architecture.txt",
            content_type="text/plain",
            file_bytes=b" Gateway service\n\nAuth service  \nDatabase",
        )

        self.assertEqual(metadata["input_type"], "txt")
        self.assertIn("Gateway service", extracted)
        self.assertIn("Auth service", extracted)
        self.assertIn("Database", extracted)

    async def test_rejects_unsupported_extension(self):
        service = DocumentExtractService()
        with self.assertRaises(DocumentExtractionError):
            await service.extract_from_upload(
                file_name="payload.docx",
                content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                file_bytes=b"not-supported-in-v1",
            )

    async def test_rejects_invalid_content_type_for_txt(self):
        service = DocumentExtractService()
        with self.assertRaises(DocumentExtractionError):
            await service.extract_from_upload(
                file_name="architecture.txt",
                content_type="application/pdf",
                file_bytes=b"text payload",
            )

    async def test_pdf_extraction_respects_configured_page_limit(self):
        service = DocumentExtractService()
        settings = get_settings()

        class FakePage:
            def __init__(self, index: int):
                self._index = index

            def get_text(self, mode: str):  # noqa: ARG002
                return f"Page text {self._index + 1}"

        class FakeDocument:
            def __len__(self):
                return 10

            def load_page(self, index: int):
                return FakePage(index)

            def close(self):
                return None

        fake_fitz = SimpleNamespace(open=lambda stream, filetype: FakeDocument())  # noqa: ARG005

        with patch.object(settings, "document_pdf_max_pages", 3):
            with patch.dict(sys.modules, {"fitz": fake_fitz}):
                extracted, pages_processed = service._extract_from_pdf(b"%PDF-1.4 mocked")

        self.assertEqual(pages_processed, 3)
        self.assertIn("Page 1", extracted)
        self.assertIn("Page text 3", extracted)

    async def test_pdf_extraction_rejects_empty_text(self):
        service = DocumentExtractService()

        class FakePage:
            def get_text(self, mode: str):  # noqa: ARG002
                return "   "

        class FakeDocument:
            def __len__(self):
                return 2

            def load_page(self, index: int):  # noqa: ARG002
                return FakePage()

            def close(self):
                return None

        fake_fitz = SimpleNamespace(open=lambda stream, filetype: FakeDocument())  # noqa: ARG005

        with patch.dict(sys.modules, {"fitz": fake_fitz}):
            with self.assertRaises(DocumentExtractionError) as context:
                service._extract_from_pdf(b"%PDF-1.4 mocked")

        self.assertIn("No extractable text found in PDF", str(context.exception))


if __name__ == "__main__":
    unittest.main()
