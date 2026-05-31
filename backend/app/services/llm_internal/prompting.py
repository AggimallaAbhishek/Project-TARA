import hashlib

STRIDE_PROMPT = """Analyze this system for security threats using STRIDE. Return JSON only.

System: {system_description}

Return a JSON array with as many meaningful threats as the architecture warrants.
Prioritize broad coverage across components, trust boundaries, and data flows.
Do not force a fixed count.
Aim for at least {target_threat_count} distinct threats when the input has enough detail.

Each threat must include:
- name
- description
- stride_category (one of: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- affected_component
- risk_level (Low, Medium, High, Critical)
- likelihood (1-5)
- impact (1-5)
- mitigation (numbered implementation steps, 3-6 concise and actionable steps)

Output only valid JSON array, no markdown or extra text."""


def normalize_description(system_description: str) -> str:
    # Normalize whitespace to keep cache keys stable for equivalent inputs.
    return " ".join(system_description.split()).strip().lower()


def build_cache_key(normalized_description: str) -> str:
    return hashlib.sha256(normalized_description.encode("utf-8")).hexdigest()


def estimate_target_threat_count(system_description: str) -> int:
    char_count = len(system_description)
    if char_count < 250:
        return 6
    if char_count < 700:
        return 10
    if char_count < 1400:
        return 14
    return 18


def build_stride_prompt(system_description: str) -> str:
    return STRIDE_PROMPT.format(
        system_description=system_description,
        target_threat_count=estimate_target_threat_count(system_description),
    )
