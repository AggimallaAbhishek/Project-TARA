import asyncio
import logging
import os
import time
from typing import Any, Callable

try:
    import ollama
except ImportError:
    raise ImportError("ollama package not installed. Run: pip install ollama")

from app.config import get_settings
from app.services.llm_internal.parsing import (
    extract_json_payload,
    format_step_text,
    normalize_mitigation_steps,
    parse_llm_response,
    parse_serialized_mitigation_list,
    validate_threat,
)
from app.services.llm_internal.prompting import (
    build_cache_key,
    build_stride_prompt,
    estimate_target_threat_count,
    normalize_description,
    normalize_source_context,
)
from app.services.llm_internal.transport import build_chat_request_kwargs
from app.services.threat_cache_service import HybridThreatCache

settings = get_settings()
logger = logging.getLogger(__name__)
os.environ.setdefault("OLLAMA_HOST", settings.ollama_host)


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
        return normalize_description(system_description)

    @staticmethod
    def _build_cache_key(normalized_description: str) -> str:
        return build_cache_key(normalized_description)

    @staticmethod
    def _estimate_target_threat_count(system_description: str) -> int:
        return estimate_target_threat_count(system_description)

    async def _request_threats(
        self,
        prompt: str,
        *,
        num_predict: int,
        force_json: bool,
    ) -> dict[str, Any]:
        request_kwargs = build_chat_request_kwargs(
            model=self.model,
            prompt=prompt,
            temperature=self.temperature,
            num_predict=num_predict,
            num_ctx=self.num_ctx,
            keep_alive=self.keep_alive,
            force_json=force_json,
        )

        return await asyncio.wait_for(
            asyncio.to_thread(ollama.chat, **request_kwargs),
            timeout=self.request_timeout_seconds,
        )

    def _extract_json_payload(self, response_text: str) -> Any:
        return extract_json_payload(response_text)

    async def analyze_system(
        self,
        system_description: str,
        source_context: dict[str, Any] | None = None,
    ) -> tuple[list[dict[str, Any]], float]:
        """
        Analyze a system description and return identified threats with timing.
        Returns: (threats, analysis_time_seconds)
        """
        overall_start = time.perf_counter()
        normalized_context = normalize_source_context(source_context)
        normalized_description = self._normalize_description(
            f"{normalized_context['source_type']} "
            f"{normalized_context['source_metadata']} "
            f"{normalized_context['structured_context']} "
            f"{system_description}"
        )
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

        prompt = build_stride_prompt(system_description, normalized_context)
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
        except ConnectionError as exc:
            elapsed = time.perf_counter() - overall_start
            logger.warning(
                "Threat analysis provider_unreachable model=%s host=%s chars=%d elapsed=%.2fs error=%s",
                self.model,
                settings.ollama_host,
                len(system_description),
                elapsed,
                str(exc),
            )
            raise RuntimeError(
                "Ollama is unreachable. Start Ollama and verify OLLAMA_HOST is reachable from the backend runtime."
            ) from exc
        except ollama.ResponseError as exc:
            elapsed = time.perf_counter() - overall_start
            status_code = getattr(exc, "status_code", None)
            error_text = str(getattr(exc, "error", "") or str(exc))
            logger.warning(
                "Threat analysis provider_response_error model=%s status=%s chars=%d elapsed=%.2fs error=%s",
                self.model,
                status_code,
                len(system_description),
                elapsed,
                error_text,
            )
            if status_code == 404:
                raise RuntimeError(
                    f"Ollama model '{self.model}' is unavailable. Pull the model or set OLLAMA_MODEL to an installed model."
                ) from exc
            raise RuntimeError("Threat analysis provider error from Ollama") from exc
        except ValueError as exc:
            elapsed = time.perf_counter() - overall_start
            logger.warning("LLM response parsing error after %.2fs: %s", elapsed, str(exc))
            raise RuntimeError("Threat analysis response was invalid") from exc
        except Exception as exc:
            elapsed = time.perf_counter() - overall_start
            logger.exception(
                "Threat analysis unexpected_error model=%s chars=%d elapsed=%.2fs",
                self.model,
                len(system_description),
                elapsed,
            )
            raise RuntimeError("Threat analysis request failed unexpectedly") from exc

    def _parse_response(self, response_text: str) -> list[dict[str, Any]]:
        return parse_llm_response(response_text, logger)

    @staticmethod
    def _format_step_text(step: str) -> str:
        return format_step_text(step)

    @classmethod
    def _parse_serialized_mitigation_list(cls, mitigation_text: str) -> list[str] | None:
        return parse_serialized_mitigation_list(mitigation_text)

    @classmethod
    def _normalize_mitigation_steps(cls, mitigation_text: str) -> str:
        return normalize_mitigation_steps(mitigation_text)

    def _validate_threat(self, threat: dict[str, Any]) -> dict[str, Any] | None:
        return validate_threat(threat, logger)


llm_service = LLMService()
