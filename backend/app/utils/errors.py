"""Exceptions whose message is safe to show a user."""


class UserFacingMixin:
    """Marker: this exception's message was written for the end user.

    Broad ``except RuntimeError`` / ``except ValueError`` handlers forward
    ``str(exc)`` into HTTP responses. That is right for curated guidance this app
    raises deliberately ("Ollama is unreachable. Start Ollama and verify
    OLLAMA_HOST.", "A project with this name already exists") and wrong for
    anything else that happens to share the type, which can carry driver
    internals, connection strings, or file paths.

    Subclasses keep their builtin base so existing ``except`` clauses - and the
    404/409 status mapping that keys off ``ValueError`` - continue to work.
    """


class UserFacingError(UserFacingMixin, RuntimeError):
    """A RuntimeError safe to surface verbatim."""


class UserFacingValueError(UserFacingMixin, ValueError):
    """A ValueError safe to surface verbatim."""


GENERIC_ERROR_DETAIL = "The request could not be completed due to an internal error."


def safe_detail(exc: Exception, fallback: str = GENERIC_ERROR_DETAIL) -> str:
    """Return the exception's message only when it was written to be shown."""
    if isinstance(exc, UserFacingMixin):
        return str(exc)
    return fallback
