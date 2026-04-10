from pydantic import BaseModel, ConfigDict
from datetime import datetime


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from frontend


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    user: UserResponse


class AuthConfigResponse(BaseModel):
    google_client_id: str
