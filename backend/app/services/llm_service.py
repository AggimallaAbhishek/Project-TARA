import asyncio
import copy
import hashlib
import json
import logging
import re
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Callable

try:
    import ollama
except ImportError:
    raise ImportError("ollama package not installed. Run: pip install ollama")

from app.config import get_settings
from app.services.risk_service import risk_service

settings = get_settings()
logger = logging.getLogger(__name__)

STRIDE_PROMPT = """Analyze this system for security threats using STRIDE. Return JSON only.

System: {system_description}

Return a JSON array with exactly 5 threats. Each threat must include:
- name
- description
- stride_category (one of: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- affected_component
- risk_level (Low, Medium, High, Critical)
- likelihood (1-5)
- impact (1-5)
- mitigation

Output only valid JSON array, no markdown or extra text."""


class ThreatCache:
    """In-memory LRU threat cache (fallback)."""

    def __init__(self, ttl_seconds: int, max_entries: int, now_fn: Callable[[], float] | None = None):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self.now_fn = now_fn or time.time
        self._entries: OrderedDict[str, tuple[float, list[dict[str, Any]]]] = OrderedDict()
        self._lock = Lock()

    def get(self, key: str) -> list[dict[str, Any]] | None:
        now = self.now_fn()
        with self._lock:
            entry = self._entries.get(key)
            if not entry:
                return None

            expires_at, threats = entry
            if expires_at <= now:
                self._entries.pop(key, None)
                return None

            self._entries.move_to_end(key)
            return copy.deepcopy(threats)

    def set(self, key: str, threats: list[dict[str, Any]]) -> None:
        now = self.now_fn()
        expires_at = now + self.ttl_seconds
        with self._lock:
            self._entries[key] = (expires_at, copy.deepcopy(threats))
            self._entries.move_to_end(key)

            while len(self._entries) > self.max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


class HybridThreatCache:
    """Threat cache that tries Redis first, falls back to in-memory."""

    def __init__(self, ttl_seconds: int, max_entries: int, now_fn: Callable[[], float] | None = None):
        self.ttl_seconds = ttl_seconds
        self._fallback = ThreatCache(
            ttl_seconds=ttl_seconds, max_entries=max_entries, now_fn=now_fn
        )

    def get(self, key: str) -> list[dict[str, Any]] | None:
        try:
            from app.services.redis_service import redis_service
            result = redis_service.get_threat_cache(key)
            if result is not None:
                return result
        except Exception:
            pass
        return self._fallback.get(key)

    def set(self, key: str, threats: list[dict[str, Any]]) -> None:
        try:
            from app.services.redis_service import redis_service
            redis_service.set_threat_cache(key, threats, self.ttl_seconds)
        except Exception:
            pass
        self._fallback.set(key, threats)

    def clear(self) -> None:
        try:
            from app.services.redis_service import redis_service
            if redis_service.client:
                for key in redis_service.client.scan_iter(match="tara:threat_cache:*", count=100):
                    redis_service.client.delete(key)
        except Exception:
            pass
        self._fallback.clear()



class LLMService:
    def __init__(
        self,
        *,
        model: str | None = None,
        temperature: float | None = None,
        num_predict: int | None = None,
        num_ctx: int | None = None,
        request_timeout_seconds: int | None = None,
        keep_alive: str | None = None,
        retry_on_invalid_response: bool | None = None,
        retry_num_predict: int | None = None,
        enable_cache: bool | None = None,
        cache_ttl_seconds: int | None = None,
        cache_max_entries: int | None = None,
        now_fn: Callable[[], float] | None = None,
    ):
        self.model = model or settings.ollama_model
        self.temperature = settings.ollama_temperature if temperature is None else temperature
        self.num_predict = settings.ollama_num_predict if num_predict is None else num_predict
        self.num_ctx = settings.ollama_num_ctx if num_ctx is None else num_ctx
        self.request_timeout_seconds = (
            settings.ollama_request_timeout_seconds
            if request_timeout_seconds is None
            else request_timeout_seconds
        )
        self.keep_alive = settings.ollama_keep_alive if keep_alive is None else keep_alive
        self.retry_on_invalid_response = (
            settings.ollama_retry_on_invalid_response
            if retry_on_invalid_response is None
            else retry_on_invalid_response
        )
        self.retry_num_predict = (
            settings.ollama_retry_num_predict if retry_num_predict is None else retry_num_predict
        )
        self.enable_cache = settings.ollama_enable_cache if enable_cache is None else enable_cache
        cache_ttl = settings.ollama_cache_ttl_seconds if cache_ttl_seconds is None else cache_ttl_seconds
        cache_size = settings.ollama_cache_max_entries if cache_max_entries is None else cache_max_entries
        self.cache = HybridThreatCache(ttl_seconds=cache_ttl, max_entries=cache_size, now_fn=now_fn)

        model_lower = self.model.lower()
        if any(marker in model_lower for marker in ("480b", "405b", "70b")):
            logger.warning(
                "High-parameter model configured (%s). Consider a smaller model for lower analysis latency.",
                self.model,
            )

    @staticmethod
    def _normalize_description(system_description: str) -> str:
        # Normalize whitespace to make cache keys stable for semantically identical descriptions.
        return " ".join(system_description.split()).strip().lower()

    @staticmethod
    def _build_cache_key(normalized_description: str) -> str:
        return hashlib.sha256(normalized_description.encode("utf-8")).hexdigest()

    async def _request_threats(
        self,
        prompt: str,
        *,
        num_predict: int,
        force_json: bool,
    ) -> dict[str, Any]:
        request_kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a security expert. Output valid JSON only, no explanations.",
                },
                {"role": "user", "content": prompt},
            ],
            "options": {
                "temperature": self.temperature,
                "num_predict": num_predict,
                "num_ctx": self.num_ctx,
            },
            "keep_alive": self.keep_alive,
        }
        if force_json:
            request_kwargs["format"] = "json"

        return await asyncio.wait_for(
            asyncio.to_thread(ollama.chat, **request_kwargs),
            timeout=self.request_timeout_seconds,
        )

    def _extract_json_payload(self, response_text: str) -> Any:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL).strip()

        # Fast path: whole payload is valid JSON.
        try:
            direct_parsed = json.loads(cleaned)
            return direct_parsed
        except json.JSONDecodeError:
            pass

        # Fallback: extract array-like payload from mixed text.
        json_match = re.search(r"\[[\s\S]*\]", cleaned)
        if not json_match:
            raise ValueError("Could not find valid JSON array in LLM response")

        return json.loads(json_match.group())

    async def analyze_system(self, system_description: str) -> tuple[list[dict[str, Any]], float]:
        """
        Analyze a system description and return identified threats with timing.
        Returns: (threats, analysis_time_seconds)
        """
        overall_start = time.perf_counter()
        normalized_description = self._normalize_description(system_description)
        cache_key = self._build_cache_key(normalized_description)

        logger.debug(
            "Threat analysis requested model=%s chars=%d cache=%s",
            self.model,
            len(system_description),
            self.enable_cache,
        )

        if self.enable_cache:
            cached_threats = self.cache.get(cache_key)
            if cached_threats is not None:
                elapsed = time.perf_counter() - overall_start
                logger.info(
                    "Threat analysis cache hit model=%s chars=%d threats=%d elapsed=%.2fs",
                    self.model,
                    len(system_description),
                    len(cached_threats),
                    elapsed,
                )
                return cached_threats, round(elapsed, 2)

        prompt = STRIDE_PROMPT.format(system_description=system_description)
        attempts: list[tuple[int, bool]] = [(self.num_predict, False)]
        if self.retry_on_invalid_response:
            attempts.append((max(self.num_predict, self.retry_num_predict), True))

        try:
            total_attempts = len(attempts)
            for attempt_index, (attempt_num_predict, force_json) in enumerate(attempts, start=1):
                llm_start = time.perf_counter()
                content_len = 0
                thinking_len = 0

                try:
                    response = await self._request_threats(
                        prompt,
                        num_predict=attempt_num_predict,
                        force_json=force_json,
                    )
                    llm_elapsed = time.perf_counter() - llm_start

                    if not response or "message" not in response:
                        raise ValueError("Invalid response from Ollama: missing 'message' field")

                    message = response.get("message", {})
                    response_text = str(message.get("content", "") or "").strip()
                    content_len = len(response_text)
                    thinking_len = len(str(message.get("thinking", "") or ""))

                    if not response_text:
                        raise ValueError("Empty response from Ollama")

                    parse_start = time.perf_counter()
                    threats = self._parse_response(response_text)
                    parse_elapsed = time.perf_counter() - parse_start

                    if not threats:
                        raise ValueError("No valid threats parsed from LLM response")
                except ValueError as exc:
                    if attempt_index < total_attempts:
                        logger.warning(
                            "Threat analysis parse failure model=%s attempt=%d/%d num_predict=%d "
                            "force_json=%s content_len=%d thinking_len=%d error=%s",
                            self.model,
                            attempt_index,
                            total_attempts,
                            attempt_num_predict,
                            force_json,
                            content_len,
                            thinking_len,
                            str(exc),
                        )
                        continue

                    logger.error(
                        "Threat analysis parse failure after retries model=%s attempt=%d/%d num_predict=%d "
                        "force_json=%s content_len=%d thinking_len=%d error=%s",
                        self.model,
                        attempt_index,
                        total_attempts,
                        attempt_num_predict,
                        force_json,
                        content_len,
                        thinking_len,
                        str(exc),
                    )
                    raise

                if attempt_index > 1:
                    logger.info(
                        "Threat analysis retry succeeded model=%s attempt=%d/%d num_predict=%d "
                        "force_json=%s llm=%.2fs parse=%.2fs content_len=%d thinking_len=%d",
                        self.model,
                        attempt_index,
                        total_attempts,
                        attempt_num_predict,
                        force_json,
                        llm_elapsed,
                        parse_elapsed,
                        content_len,
                        thinking_len,
                    )

                if self.enable_cache:
                    self.cache.set(cache_key, threats)

                total_elapsed = time.perf_counter() - overall_start
                logger.info(
                    "Threat analysis completed model=%s chars=%d threats=%d llm=%.2fs parse=%.2fs total=%.2fs "
                    "attempt=%d/%d",
                    self.model,
                    len(system_description),
                    len(threats),
                    llm_elapsed,
                    parse_elapsed,
                    total_elapsed,
                    attempt_index,
                    total_attempts,
                )
                return threats, round(total_elapsed, 2)

            raise ValueError("No valid threats parsed from LLM response")

        except asyncio.TimeoutError as exc:
            elapsed = time.perf_counter() - overall_start
            logger.warning(
                "Threat analysis timeout model=%s timeout=%ss chars=%d elapsed=%.2fs",
                self.model,
                self.request_timeout_seconds,
                len(system_description),
                elapsed,
            )
            raise RuntimeError(
                f"Threat analysis timed out after {self.request_timeout_seconds}s. "
                "Try a smaller model or reduce prompt complexity."
            ) from exc
        except ollama.ResponseError as exc:
            elapsed = time.perf_counter() - overall_start
            logger.exception("Ollama API error after %.2fs", elapsed)
            raise RuntimeError("Threat analysis provider error") from exc
        except ValueError as exc:
            elapsed = time.perf_counter() - overall_start
            logger.warning("LLM response parsing error after %.2fs: %s", elapsed, str(exc))
            raise RuntimeError("Threat analysis response was invalid") from exc
        except Exception as exc:
            elapsed = time.perf_counter() - overall_start
            logger.exception("Unexpected Ollama error after %.2fs", elapsed)
            raise RuntimeError("Threat analysis request failed") from exc

    def _parse_response(self, response_text: str) -> list[dict[str, Any]]:
        payload = self._extract_json_payload(response_text)

        if isinstance(payload, dict):
            threats = payload.get("threats", [])
        elif isinstance(payload, list):
            threats = payload
        else:
            raise ValueError("Unexpected JSON shape from LLM")

        validated_threats: list[dict[str, Any]] = []
        for threat in threats:
            validated = self._validate_threat(threat)
            if validated:
                validated_threats.append(validated)

        # Keep output bounded for consistent latency and storage cost.
        return validated_threats[:5]

    def _validate_threat(self, threat: dict[str, Any]) -> dict[str, Any] | None:
        if not isinstance(threat, dict):
            return None

        def _as_str(value: Any, default: str) -> str:
            if value is None:
                return default
            text = str(value).strip()
            return text or default

        normalized: dict[str, Any] = {}
        normalized["name"] = _as_str(threat.get("name"), "Untitled threat")
        normalized["description"] = _as_str(threat.get("description"), "No description provided.")
        normalized["affected_component"] = _as_str(
            threat.get("affected_component"),
            "Unspecified component",
        )
        normalized["mitigation"] = _as_str(threat.get("mitigation"), "Mitigation not provided.")

        valid_categories = [
            "Spoofing",
            "Tampering",
            "Repudiation",
            "Information Disclosure",
            "Denial of Service",
            "Elevation of Privilege",
        ]
        stride = _as_str(threat.get("stride_category"), "")
        if stride not in valid_categories:
            for category in valid_categories:
                if category.lower() in stride.lower() or stride.lower() in category.lower():
                    stride = category
                    break
        if stride not in valid_categories:
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

        valid_risks = ["Low", "Medium", "High", "Critical"]
        risk = _as_str(threat.get("risk_level"), "")
        if risk in valid_risks:
            normalized["risk_level"] = risk
        else:
            derived_score = risk_service.calculate_risk_score(normalized["likelihood"], normalized["impact"])
            normalized["risk_level"] = risk_service.get_risk_level_from_score(derived_score)

        return normalized


llm_service = LLMService()
