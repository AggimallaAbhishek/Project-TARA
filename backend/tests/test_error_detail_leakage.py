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


def test_user_facing_value_error_keeps_the_404_409_status_mapping():
    """Handlers map ValueError to 404/409; the marker must not break that."""
    from app.utils.errors import UserFacingValueError

    assert issubclass(UserFacingValueError, ValueError)
    try:
        raise UserFacingValueError("A project with this name already exists")
    except ValueError as exc:
        assert safe_detail(exc) == "A project with this name already exists"


def test_an_incidental_value_error_is_not_echoed():
    """A stray ValueError inside the same try block must not reach the client."""
    exc = ValueError("invalid literal for int() with base 10: '/srv/secret.key'")
    assert safe_detail(exc, "Project not found.") == "Project not found."


def test_every_broad_handler_routes_through_safe_detail():
    """Guard against a future handler re-introducing a raw echo."""
    import pathlib
    import re

    root = pathlib.Path(__file__).resolve().parents[1] / "app"
    domain_types = {
        "DiagramRenderError",
        "DiagramRendererUnavailableError",
        "DiagramExtractionError",
        "DocumentExtractionError",
    }

    offenders = []
    for path in list(root.rglob("routes/*.py")) + list(root.rglob("services/*.py")):
        caught = None
        for lineno, line in enumerate(path.read_text().splitlines(), start=1):
            match = re.search(r"except\s+([\w.]+)\s+as\s+exc:", line)
            if match:
                caught = match.group(1)
            if re.search(r"detail=(f?\"[^\"]*\{)?str\(exc\)", line):
                if caught not in domain_types:
                    offenders.append(f"{path.name}:{lineno} catches {caught}")

    assert offenders == [], (
        "broad exception handlers echo raw text; route them through safe_detail: "
        + ", ".join(offenders)
    )
