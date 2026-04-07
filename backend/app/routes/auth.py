from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.schemas.auth import AuthConfigResponse, GoogleAuthRequest, TokenResponse, UserResponse
from app.services.auth_service import (
    ACCESS_TOKEN_COOKIE_NAME,
    verify_google_token, 
    create_access_token, 
    get_or_create_user,
    get_current_user
)
from app.models.user import User

router = APIRouter()
settings = get_settings()


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with Google OAuth.
    Expects the Google ID token from frontend.
    """
    # Verify Google token and get user info
    google_data = verify_google_token(request.credential)
    
    # Get or create user
    user = get_or_create_user(db, google_data)
    
    # Create JWT token - sub must be a string per JWT spec
    access_token = create_access_token(data={"sub": str(user.id)})

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    
    return TokenResponse(
        user=UserResponse.model_validate(user)
    )


@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config():
    """Get auth-related client configuration."""
    return AuthConfigResponse(google_client_id=settings.google_client_id)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.post("/logout")
async def logout(response: Response):
    """
    Logout endpoint (client-side token removal).
    JWT tokens are stateless, so we just return success.
    """
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}
