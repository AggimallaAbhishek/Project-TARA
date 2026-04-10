import pathlib
import sys
import unittest

from pydantic import ValidationError


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.analysis import AnalysisCreate


class AnalysisSchemaValidationTest(unittest.TestCase):
    def test_trims_valid_input(self):
        payload = AnalysisCreate(
            title="  Sample Analysis  ",
            system_description="  This architecture has an API gateway and auth service.  ",
        )
        self.assertEqual(payload.title, "Sample Analysis")
        self.assertEqual(payload.system_description, "This architecture has an API gateway and auth service.")

    def test_rejects_blank_title_after_trim(self):
        with self.assertRaises(ValidationError):
            AnalysisCreate(
                title="   ",
                system_description="This architecture has sufficient detail.",
            )

    def test_rejects_blank_description_after_trim(self):
        with self.assertRaises(ValidationError):
            AnalysisCreate(
                title="Valid Title",
                system_description="          ",
            )

    def test_rejects_description_above_max_length(self):
        with self.assertRaises(ValidationError):
            AnalysisCreate(
                title="Valid Title",
                system_description="a" * 5001,
            )


if __name__ == "__main__":
    unittest.main()
