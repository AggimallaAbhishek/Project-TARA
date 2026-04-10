"""Deterministic DB connectivity check used before local backend startup."""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import get_settings


def main() -> int:
    settings = get_settings()
    engine_kwargs = {}
    if settings.database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    try:
        engine = create_engine(settings.database_url, **engine_kwargs)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        print(f"DB check: FAILED ({exc})", file=sys.stderr)
        return 1

    print("DB check: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
