import ast
import json
import re
from typing import Any

from app.services.risk_service import risk_service

VALID_STRIDE_CATEGORIES = [
    "Spoofing",
    "Tampering",
    "Repudiation",
    "Information Disclosure",
    "Denial of Service",
    "Elevation of Privilege",
]
VALID_RISK_LEVELS = ["Low", "Medium", "High", "Critical"]
GENERIC_THREAT_NAMES = {
    "threat",
    "security threat",
    "potential threat",
    "generic threat",
    "untitled threat",
}


def extract_json_payload(response_text: str) -> Any:
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(
            r"^```(?:json)?\s*|\s*```$",
            "",
            cleaned,
            flags=re.IGNORECASE | re.DOTALL,
        ).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"\[[\s\S]*\]", cleaned)
    if not json_match:
        raise ValueError("Could not find valid JSON array in LLM response")

    return json.loads(json_match.group())


def format_step_text(step: str) -> str:
    cleaned = step.strip()
    for _ in range(3):
        updated = cleaned.strip()
        updated = re.sub(r"^[\[\]\"'`]+", "", updated)
        updated = re.sub(r"[\[\]\"'`]+$", "", updated)
        updated = re.sub(r"[\[\]\"'`]+(?=[\.,;:!?]+$)", "", updated)
        updated = updated.strip()
        if updated == cleaned:
            break
        cleaned = updated

    cleaned = cleaned.strip(".,;")
    if not cleaned:
        return ""

    return cleaned if cleaned.endswith(".") else f"{cleaned}."


def parse_serialized_mitigation_list(mitigation_text: str) -> list[str] | None:
    trimmed = mitigation_text.strip()
    if not (trimmed.startswith("[") and trimmed.endswith("]")):
        return None

    for parser in (json.loads, ast.literal_eval):
        try:
            parsed = parser(trimmed)
        except Exception:
            continue

        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]

    return None


def normalize_mitigation_steps(mitigation_text: str) -> str:
    cleaned = mitigation_text.strip()
    if not cleaned:
        return "Mitigation not provided."

    serialized_steps = parse_serialized_mitigation_list(cleaned)
    if serialized_steps:
        normalized_steps = [
            formatted
            for formatted in (format_step_text(step) for step in serialized_steps)
            if formatted
        ]
        if normalized_steps:
            return "\n".join(
                f"{index}. {step}" for index, step in enumerate(normalized_steps[:6], start=1)
            )

    explicit_lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
    step_prefix_pattern = re.compile(r"^(\d+[\).]?\s+|[-*•]\s+)")
    if len(explicit_lines) >= 2 and any(step_prefix_pattern.match(line) for line in explicit_lines):
        normalized_steps: list[str] = []
        for raw_line in explicit_lines:
            line = step_prefix_pattern.sub("", raw_line).strip()
            formatted = format_step_text(line)
            if formatted:
                normalized_steps.append(formatted)
        if normalized_steps:
            return "\n".join(
                f"{index}. {step}" for index, step in enumerate(normalized_steps, start=1)
            )

    split_candidates = re.split(r";+|\n+", cleaned)
    if len(split_candidates) <= 1:
        split_candidates = re.split(r",\s+|\s+and\s+", cleaned)

    normalized_candidates: list[str] = []
    seen_lower: set[str] = set()
    for candidate in split_candidates:
        formatted = format_step_text(candidate)
        if not formatted:
            continue
        key = formatted.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        normalized_candidates.append(formatted)

    if len(normalized_candidates) >= 2:
        return "\n".join(
            f"{index}. {step}"
            for index, step in enumerate(normalized_candidates[:6], start=1)
        )

    fallback = format_step_text(cleaned)
    return fallback or "Mitigation not provided."


def _as_str(value: Any, default: str) -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text or default


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()][:8]
    if isinstance(value, str):
        parsed = parse_serialized_mitigation_list(value)
        if parsed:
            return [item.strip() for item in parsed if item.strip()][:8]
        return [value.strip()] if value.strip() else []
    return [str(value).strip()] if str(value).strip() else []


def _as_confidence(value: Any) -> float:
    if value is None:
        return 0.5
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"high", "strong"}:
            return 0.85
        if lowered in {"medium", "moderate"}:
            return 0.6
        if lowered in {"low", "weak"}:
            return 0.35
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = 0.5
    if numeric > 1:
        numeric = numeric / 100
    return max(0.0, min(1.0, numeric))


def _normalize_tag_list(value: Any, *, prefix: str | None = None) -> list[str]:
    tags: list[str] = []
    for item in _as_list(value):
        cleaned = item.strip().upper()
        if prefix and not cleaned.startswith(prefix):
            continue
        if cleaned and cleaned not in tags:
            tags.append(cleaned)
    return tags[:8]


def validate_threat(threat: dict[str, Any], logger) -> dict[str, Any] | None:
    if not isinstance(threat, dict):
        return None

    normalized: dict[str, Any] = {}
    normalized["name"] = _as_str(threat.get("name"), "Untitled threat")
    normalized["description"] = _as_str(threat.get("description"), "No description provided.")
    normalized["affected_component"] = _as_str(
        threat.get("affected_component"),
        "Unspecified component",
    )

    mitigation_text = _as_str(threat.get("mitigation"), "Mitigation not provided.")
    normalized["mitigation"] = normalize_mitigation_steps(mitigation_text)
    normalized["evidence"] = _as_list(threat.get("evidence"))
    normalized["assumptions"] = _as_list(threat.get("assumptions"))
    normalized["confidence"] = _as_confidence(threat.get("confidence"))
    normalized["owasp_tags"] = _normalize_tag_list(threat.get("owasp_tags") or threat.get("owasp"), prefix="A")
    normalized["cwe_tags"] = _normalize_tag_list(threat.get("cwe_tags") or threat.get("cwe"), prefix="CWE-")

    stride = _as_str(threat.get("stride_category"), "")
    if stride not in VALID_STRIDE_CATEGORIES:
        for category in VALID_STRIDE_CATEGORIES:
            if category.lower() in stride.lower() or stride.lower() in category.lower():
                stride = category
                break

    if stride not in VALID_STRIDE_CATEGORIES:
        logger.warning(
            "Unknown STRIDE category '%s' from LLM, defaulting to Information Disclosure",
            stride,
        )
        stride = "Information Disclosure"
    normalized["stride_category"] = stride

    try:
        likelihood = int(threat.get("likelihood", 3))
    except (TypeError, ValueError):
        likelihood = 3

    try:
        impact = int(threat.get("impact", 3))
    except (TypeError, ValueError):
        impact = 3

    normalized["likelihood"] = max(1, min(5, likelihood))
    normalized["impact"] = max(1, min(5, impact))

    risk = _as_str(threat.get("risk_level"), "")
    if risk in VALID_RISK_LEVELS:
        normalized["risk_level"] = risk
    else:
        derived_score = risk_service.calculate_risk_score(
            normalized["likelihood"],
            normalized["impact"],
        )
        normalized["risk_level"] = risk_service.get_risk_level_from_score(derived_score)

    if (
        normalized["name"].strip().lower() in GENERIC_THREAT_NAMES
        and normalized["affected_component"] == "Unspecified component"
    ):
        logger.warning("Rejected generic LLM threat without affected component")
        return None

    return normalized


def _dedupe_key(threat: dict[str, Any]) -> str:
    return "|".join(
        re.sub(r"[^a-z0-9]+", " ", str(threat.get(field, "")).lower()).strip()
        for field in ("stride_category", "affected_component", "name")
    )


def deduplicate_threats(threats: list[dict[str, Any]], logger) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for threat in threats:
        key = _dedupe_key(threat)
        if key in seen:
            logger.warning("Dropped duplicate LLM threat key=%s", key)
            continue
        seen.add(key)
        deduped.append(threat)
    return deduped


def parse_llm_response(response_text: str, logger) -> list[dict[str, Any]]:
    payload = extract_json_payload(response_text)

    if isinstance(payload, dict):
        threats = payload.get("threats", [])
    elif isinstance(payload, list):
        threats = payload
    else:
        raise ValueError("Unexpected JSON shape from LLM")

    validated_threats: list[dict[str, Any]] = []
    for threat in threats:
        validated = validate_threat(threat, logger)
        if validated:
            validated_threats.append(validated)

    return deduplicate_threats(validated_threats, logger)
