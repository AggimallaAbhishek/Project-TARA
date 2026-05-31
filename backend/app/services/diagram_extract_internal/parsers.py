import html
import re
import xml.etree.ElementTree as ET


def clean_drawio_label(value: str) -> str:
    if not value:
        return ""
    text = html.unescape(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_node_token(token: str) -> str:
    cleaned = token.strip().strip('"').strip("'").strip("`")
    if not cleaned:
        return ""

    bracket_match = re.search(r"[\[\(\{]([^\]\)\}]+)[\]\)\}]", cleaned)
    if bracket_match:
        cleaned = bracket_match.group(1)

    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = cleaned.replace("|", " ")
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.strip()
    return cleaned


def strip_alias(token: str) -> str:
    token = token.strip()
    quoted = re.findall(r'"([^"]+)"', token)
    if quoted:
        return quoted[-1].strip()

    alias_match = re.match(r"(.+?)\s+as\s+.+$", token, flags=re.IGNORECASE)
    if alias_match:
        token = alias_match.group(1)

    return normalize_node_token(token)


def build_summary_text(
    *,
    diagram_type: str,
    components: set[str],
    data_flows: set[str],
    boundaries: set[str],
) -> str:
    components_block = "\n".join(f"- {component}" for component in sorted(components))
    data_flows_block = "\n".join(f"- {flow}" for flow in sorted(data_flows))
    boundaries_block = "\n".join(f"- {boundary}" for boundary in sorted(boundaries))
    if not boundaries_block:
        boundaries_block = "- Not explicitly identified"

    return (
        f"Diagram Type: {diagram_type}\n\n"
        f"Components:\n{components_block or '- Not identified'}\n\n"
        f"Data Flows:\n{data_flows_block or '- Not identified'}\n\n"
        f"Trust Boundaries:\n{boundaries_block}\n\n"
        "System Summary:\n"
        "This architecture includes the components and flows listed above. "
        "Apply STRIDE analysis across each component, trust boundary crossing, and inter-service flow."
    )


def extract_from_mermaid(content: str, *, error_cls) -> str:
    cleaned_lines: list[str] = []
    components: set[str] = set()
    data_flows: set[str] = set()
    boundaries: set[str] = set()

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("%%"):
            continue
        cleaned_lines.append(line)

        subgraph_match = re.match(r"^subgraph\s+(.+)$", line, flags=re.IGNORECASE)
        if subgraph_match:
            boundaries.add(subgraph_match.group(1).strip())
            continue

        edge_match = re.match(
            r"^(.+?)\s*[-.=]+[->]+\s*(?:\|[^|]*\|\s*)?(.+)$",
            line,
        )
        if edge_match:
            source = normalize_node_token(edge_match.group(1))
            target = normalize_node_token(edge_match.group(2))
            if source and target:
                components.add(source)
                components.add(target)
                data_flows.add(f"{source} -> {target}")
            continue

        component_match = re.match(r"^([A-Za-z0-9_]+)\s*[\[\(\{](.+)[\]\)\}]$", line)
        if component_match:
            components.add(component_match.group(2).strip())

    if not data_flows and not components and cleaned_lines:
        raise error_cls("Could not identify Mermaid components or flows.")

    return build_summary_text(
        diagram_type="Mermaid",
        components=components,
        data_flows=data_flows,
        boundaries=boundaries,
    )


def extract_from_plantuml(content: str, *, error_cls) -> str:
    components: set[str] = set()
    data_flows: set[str] = set()
    boundaries: set[str] = set()

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("'") or line.startswith("//"):
            continue
        if line.lower() in {"@startuml", "@enduml"}:
            continue

        boundary_match = re.match(r"^(package|node|cloud|frame)\s+(.+)$", line, flags=re.IGNORECASE)
        if boundary_match:
            boundaries.add(strip_alias(boundary_match.group(2)))

        component_match = re.match(
            r"^(actor|component|database|queue|node|cloud|rectangle|package)\s+(.+)$",
            line,
            flags=re.IGNORECASE,
        )
        if component_match:
            components.add(strip_alias(component_match.group(2)))
            continue

        edge_match = re.match(
            r"^(.+?)\s*[-.o*<]*[<>-]+[.]?[->]*\s*(.+?)(?:\s*:\s*(.+))?$",
            line,
        )
        if edge_match:
            source = normalize_node_token(edge_match.group(1))
            target = normalize_node_token(edge_match.group(2))
            if source and target:
                components.add(source)
                components.add(target)
                data_flows.add(f"{source} -> {target}")

    if not data_flows and not components:
        raise error_cls("Could not identify PlantUML components or flows.")

    return build_summary_text(
        diagram_type="PlantUML",
        components=components,
        data_flows=data_flows,
        boundaries=boundaries,
    )


def extract_from_drawio(content: str, *, error_cls) -> str:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise error_cls("Invalid draw.io XML content.") from exc

    root_tag = root.tag.lower()
    if "mxfile" not in root_tag and "mxgraphmodel" not in root_tag:
        tags = {child.tag.lower() for child in root.iter()}
        if not any("mxfile" in tag or "mxgraphmodel" in tag for tag in tags):
            raise error_cls("Uploaded XML is not a draw.io file.")

    node_labels: dict[str, str] = {}
    components: set[str] = set()
    data_flows: set[str] = set()
    boundaries: set[str] = set()

    for cell in root.iter():
        if not cell.tag.lower().endswith("mxcell"):
            continue
        cell_id = cell.attrib.get("id")
        value = clean_drawio_label(cell.attrib.get("value", ""))
        style = cell.attrib.get("style", "")

        if cell.attrib.get("vertex") == "1":
            if value:
                node_labels[cell_id] = value
                components.add(value)
            if "swimlane" in style and value:
                boundaries.add(value)

    for cell in root.iter():
        if not cell.tag.lower().endswith("mxcell"):
            continue
        if cell.attrib.get("edge") != "1":
            continue
        source = node_labels.get(cell.attrib.get("source", ""))
        target = node_labels.get(cell.attrib.get("target", ""))
        if source and target:
            data_flows.add(f"{source} -> {target}")

    if not data_flows and not components:
        raise error_cls("Could not identify draw.io components or flows.")

    return build_summary_text(
        diagram_type="draw.io",
        components=components,
        data_flows=data_flows,
        boundaries=boundaries,
    )
