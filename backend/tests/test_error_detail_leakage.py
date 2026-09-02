"""Only messages written for users may reach an HTTP response body."""
import pathlib
import sys

import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.utils.errors import GENERIC_ERROR_DETAIL, UserFacingError, safe_detail

# The shape of things that must never be echoed back.
LEAKY = [
    RuntimeError("connection to server at \"db.internal\" (10.0.0.5), port 5432 failed"),
    RuntimeError("/srv/app/secrets/service_account.json: No such file"),
    ValueError("invalid literal for int() with base 10: 'x'"),
    KeyError("SECRET_KEY"),
    Exception("Traceback (most recent call last): File \"/app/main.py\", line 42"),
]


@pytest.mark.parametrize("exc", LEAKY, ids=lambda e: type(e).__name__)
def test_uncurated_exceptions_are_never_echoed(exc):
    detail = safe_detail(exc)
    assert detail == GENERIC_ERROR_DETAIL
    assert str(exc) not in detail


def test_curated_messages_still_reach_the_user():
    exc = UserFacingError("Ollama is unreachable. Start Ollama and verify OLLAMA_HOST.")
    assert safe_detail(exc) == str(exc)


def test_a_caller_supplied_fallback_is_used():
    assert safe_detail(RuntimeError("boom"), "Analysis is temporarily unavailable.") == (
        "Analysis is temporarily unavailable."
    )


def test_user_facing_error_is_still_a_runtime_error():
    """Existing `except RuntimeError` clauses must keep catching these."""
    assert issubclass(UserFacingError, RuntimeError)
    try:
        raise UserFacingError("curated")
    except RuntimeError as exc:
        assert str(exc) == "curated"
