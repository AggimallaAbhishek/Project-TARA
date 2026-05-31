import pathlib
import sys
import unittest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.services.diagram_extract_internal.parsers import (
    extract_from_drawio,
    extract_from_mermaid,
    extract_from_plantuml,
)


class DiagramExtractInternalParsersTest(unittest.TestCase):
    def test_mermaid_parser_extracts_flow(self):
        result = extract_from_mermaid(
            "graph TD\nClient[Browser] --> API[Gateway]",
            error_cls=ValueError,
        )
        self.assertIn("Browser -> Gateway", result)

    def test_plantuml_parser_extracts_flow(self):
        result = extract_from_plantuml(
            '@startuml\nactor "User"\ncomponent API\nUser -> API\n@enduml',
            error_cls=ValueError,
        )
        self.assertIn("User -> API", result)

    def test_drawio_parser_extracts_flow(self):
        xml = (
            "<mxfile><diagram><mxGraphModel><root>"
            '<mxCell id="0"/><mxCell id="1" parent="0"/>'
            '<mxCell id="2" value="Frontend" vertex="1" parent="1"/>'
            '<mxCell id="3" value="API Service" vertex="1" parent="1"/>'
            '<mxCell id="4" edge="1" source="2" target="3" parent="1"/>'
            "</root></mxGraphModel></diagram></mxfile>"
        )
        result = extract_from_drawio(xml, error_cls=ValueError)
        self.assertIn("Frontend -> API Service", result)


if __name__ == "__main__":
    unittest.main()
