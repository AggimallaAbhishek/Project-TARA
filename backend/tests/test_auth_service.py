from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services import auth_service


def test_verify_google_token_hides_internal_validation_detail():
    with patch.object(auth_service.settings, "google_client_id", "client-id"), patch(
        "app.services.auth_service.id_token.verify_oauth2_token",
        side_effect=ValueError("clock skew too large"),
    ) as verify_mock:
        with pytest.raises(HTTPException) as exc_info:
            auth_service.verify_google_token("bad-token")

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid Google token"
    assert verify_mock.call_args.kwargs["clock_skew_in_seconds"] == 60
