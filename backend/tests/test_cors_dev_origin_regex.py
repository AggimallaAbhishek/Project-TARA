import pathlib
import sys
import unittest

from fastapi.testclient import TestClient


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app


class CORSDevOriginRegexTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def test_preflight_allows_localhost_alt_port(self):
        response = self.client.options(
            "/api/analyze",
            headers={
                "Origin": "http://localhost:5174",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:5174")

    def test_preflight_blocks_non_local_origin(self):
        response = self.client.options(
            "/api/analyze",
            headers={
                "Origin": "http://malicious.example.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
