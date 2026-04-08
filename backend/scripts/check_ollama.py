"""Deterministic Ollama connectivity check for local runtime verification."""

from __future__ import annotations

import os
import pathlib
import sys

try:
    import ollama
except ImportError as exc:
    print("Ollama check: FAILED (ollama package not installed in backend runtime)", file=sys.stderr)
    raise SystemExit(1) from exc


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings


def main() -> int:
    settings = get_settings()
    ollama_host = os.getenv("OLLAMA_HOST", settings.ollama_host)
    model = settings.ollama_model
    client = ollama.Client(host=ollama_host)

    try:
        client.chat(
            model=model,
            messages=[{"role": "user", "content": "Reply with: ok"}],
            options={
                "temperature": 0.0,
                "num_predict": 16,
                "num_ctx": min(1024, settings.ollama_num_ctx),
            },
        )
    except ConnectionError as exc:
        print(
            "Ollama check: FAILED (cannot reach provider)\n"
            f"- host: {ollama_host}\n"
            "- action: start Ollama on host and verify OLLAMA_HOST is reachable from backend runtime\n"
            f"- error: {exc}",
            file=sys.stderr,
        )
        return 1
    except ollama.ResponseError as exc:
        status_code = getattr(exc, "status_code", None)
        if status_code == 404:
            print(
                "Ollama check: FAILED (model unavailable)\n"
                f"- host: {ollama_host}\n"
                f"- model: {model}\n"
                "- action: pull the model in Ollama or update OLLAMA_MODEL\n"
                f"- error: {getattr(exc, 'error', str(exc))}",
                file=sys.stderr,
            )
            return 1
        print(
            "Ollama check: FAILED (provider returned error)\n"
            f"- host: {ollama_host}\n"
            f"- model: {model}\n"
            f"- status: {status_code}\n"
            f"- error: {getattr(exc, 'error', str(exc))}",
            file=sys.stderr,
        )
        return 1
    except Exception as exc:
        print(
            "Ollama check: FAILED (unexpected provider error)\n"
            f"- host: {ollama_host}\n"
            f"- model: {model}\n"
            f"- error: {exc}",
            file=sys.stderr,
        )
        return 1

    print(f"Ollama check: OK (host={ollama_host}, model={model})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
