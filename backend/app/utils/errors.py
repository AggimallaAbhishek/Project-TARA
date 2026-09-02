"""Exceptions whose message is safe to show a user."""


class UserFacingError(RuntimeError):
    """A RuntimeError whose message was written for the end user.

    Broad ``except RuntimeError`` handlers used to forward ``str(exc)`` straight
    into an HTTP response. That is right for the curated operator guidance this
    app raises deliberately ("Ollama is unreachable. Start Ollama and verify
    OLLAMA_HOST.") and wrong for anything else that happens to be a RuntimeError,
    which can carry driver internals, connection strings, or file paths.

    Subclassing RuntimeError keeps every existing ``except RuntimeError`` clause
    working; handlers additionally check for this type before echoing a message.
    """


GENERIC_ERROR_DETAIL = "The request could not be completed due to an internal error."


def safe_detail(exc: Exception, fallback: str = GENERIC_ERROR_DETAIL) -> str:
    """Return the exception's message only when it was written to be shown."""
    if isinstance(exc, UserFacingError):
        return str(exc)
    return fallback
