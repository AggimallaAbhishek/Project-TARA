from datetime import datetime, timezone


def utc_now_for_db() -> datetime:
    """Return a naive UTC datetime for SQLAlchemy DateTime columns.

    PostgreSQL TIMESTAMP WITHOUT TIME ZONE rejects offset-aware datetime values
    through asyncpg, so DB-bound timestamps use UTC with tzinfo stripped.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
