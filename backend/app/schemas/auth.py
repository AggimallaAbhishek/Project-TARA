from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from frontend


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    user: UserResponse


class AuthConfigResponse(BaseModel):
    google_client_id: str
