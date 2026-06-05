import logging
import re
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

STRUCTURED_FIELDS = (
    "components",
    "data_flows",
    "trust_boundaries",
    "external_entities",
    "assets",
)


def _normalize_item(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", str(value or "")).strip(" -:\t\r\n")
    return cleaned[:240]


def _append_unique(items: list[str], value: str, *, limit: int = 40) -> None:
    cleaned = _normalize_item(value)
    if not cleaned:
        return
    lowered = {item.lower() for item in items}
    if cleaned.lower() not in lowered and len(items) < limit:
        items.append(cleaned)


def _extract_section_items(text: str, section_name: str) -> list[str]:
    pattern = re.compile(
        rf"^\s*{re.escape(section_name)}\s*:?\s*$([\s\S]*?)(?=^\s*[A-Za-z][^\n]{{0,80}}\s*:?\s*$|\Z)",
        flags=re.IGNORECASE | re.MULTILINE,
    )
    match = pattern.search(text)
    if not match:
        return []

    items: list[str] = []
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(("-", "•", "*")):
            line = line[1:].strip()
        _append_unique(items, line)
    return items


def _infer_external_entities(text: str) -> list[str]:
    entities: list[str] = []
    patterns = (
        r"\b(?:external|third[- ]party|partner|vendor|public)\s+([A-Za-z0-9][A-Za-z0-9 _./-]{2,80})",
        r"\b(Stripe|Twilio|SendGrid|AWS|Azure|GCP|Google|GitHub|Okta|Auth0|Salesforce)\b",
    )
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            _append_unique(entities, match.group(1) if match.lastindex else match.group(0))
    return entities


def _infer_assets(text: str) -> list[str]:
    assets: list[str] = []
    asset_terms = (
        "credentials",
        "token",
        "session",
        "payment",
        "pii",
        "phi",
        "secret",
        "database",
        "audit log",
        "customer data",
        "medical record",
    )
    lowered = text.lower()
    for term in asset_terms:
        if term in lowered:
            _append_unique(assets, term.title())
    return assets


def build_structured_context(text: str, metadata: dict[str, Any] | None = None) -> dict[str, list[str]]:
    normalized_text = str(text or "").strip()
    context = {field: [] for field in STRUCTURED_FIELDS}

    section_map = {
        "components": ("Components", "Services", "Systems"),
        "data_flows": ("Data Flows", "Flows", "Connections"),
        "trust_boundaries": ("Trust Boundaries", "Boundaries", "Network Zones"),
        "external_entities": ("External Systems", "External Entities", "Third Parties"),
        "assets": ("Assets", "Sensitive Data", "Data Stores"),
    }
    for field, section_names in section_map.items():
        for section_name in section_names:
            for item in _extract_section_items(normalized_text, section_name):
                _append_unique(context[field], item)

    for source, target in re.findall(r"([A-Za-z0-9][A-Za-z0-9 _./-]{1,80})\s*(?:--?>|→| to )\s*([A-Za-z0-9][A-Za-z0-9 _./-]{1,80})", normalized_text):
        _append_unique(context["components"], source)
        _append_unique(context["components"], target)
        _append_unique(context["data_flows"], f"{_normalize_item(source)} -> {_normalize_item(target)}")

    for term in ("client", "gateway", "api", "service", "database", "queue", "cache", "worker", "frontend", "backend"):
        for match in re.finditer(rf"\b([A-Za-z0-9_-]*{term}[A-Za-z0-9_-]*)\b", normalized_text, flags=re.IGNORECASE):
            _append_unique(context["components"], match.group(1))

    for entity in _infer_external_entities(normalized_text):
        _append_unique(context["external_entities"], entity)
    for asset in _infer_assets(normalized_text):
        _append_unique(context["assets"], asset)

    if metadata:
        input_type = str(metadata.get("input_type") or "").strip()
        if input_type:
            _append_unique(context["assets"], f"Source type: {input_type}", limit=10)

    return context


def chunk_text(text: str, chunk_chars: int | None = None) -> list[str]:
    settings = get_settings()
    max_chars = max(500, chunk_chars or settings.document_chunk_chars)
    normalized = str(text or "").strip()
    if not normalized:
        return []

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for paragraph in re.split(r"\n{2,}", normalized):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if current and current_len + len(paragraph) + 2 > max_chars:
            chunks.append("\n\n".join(current))
            current = []
            current_len = 0
        if len(paragraph) > max_chars:
            for index in range(0, len(paragraph), max_chars):
                chunks.append(paragraph[index:index + max_chars])
            continue
        current.append(paragraph)
        current_len += len(paragraph) + 2
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def summarize_chunks(chunks: list[str], max_chars: int | None = None) -> str:
    settings = get_settings()
    target = max(1000, max_chars or settings.document_summary_max_chars)
    if not chunks:
        return ""

    summaries: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        structured = build_structured_context(chunk)
        signals = []
        for field in STRUCTURED_FIELDS:
            if structured[field]:
                signals.append(f"{field}: {', '.join(structured[field][:8])}")
        preview = re.sub(r"\s+", " ", chunk).strip()[:700]
        summaries.append(f"Chunk {index}: {preview}" + (f"\nSignals: {'; '.join(signals)}" if signals else ""))

    merged = "\n\n".join(summaries)
    if len(merged) <= target:
        return merged
    logger.info("Summarized document chunks from %s to %s characters", len(merged), target)
    return merged[:target].rstrip()


def build_editable_summary(text: str, structured_context: dict[str, list[str]] | None = None) -> str:
    context = structured_context or build_structured_context(text)
    sections: list[str] = []
    for label, key in (
        ("Components", "components"),
        ("Data Flows", "data_flows"),
        ("Trust Boundaries", "trust_boundaries"),
        ("External Systems", "external_entities"),
        ("Assets", "assets"),
    ):
        values = context.get(key) or []
        if values:
            sections.append(f"{label}:\n" + "\n".join(f"- {item}" for item in values[:20]))

    if sections:
        return "\n\n".join(sections)
    return summarize_chunks(chunk_text(text), max_chars=get_settings().document_summary_max_chars)


def build_source_context(
    *,
    source_type: str,
    raw_or_extracted_text: str,
    source_metadata: dict[str, Any] | None = None,
    structured_context: dict[str, Any] | None = None,
    editable_summary: str | None = None,
) -> dict[str, Any]:
    structured = structured_context or build_structured_context(raw_or_extracted_text, source_metadata)
    summary = (editable_summary or build_editable_summary(raw_or_extracted_text, structured)).strip()
    return {
        "source_type": source_type,
        "source_metadata": source_metadata or {},
        "raw_or_extracted_text": raw_or_extracted_text,
        "structured_context": structured,
        "editable_summary": summary,
    }
