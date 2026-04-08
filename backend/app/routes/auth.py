from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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
from app.services.rate_limit_service import HybridRateLimiter

router = APIRouter()
settings = get_settings()
auth_rate_limiter = HybridRateLimiter(max_requests=10, window_seconds=60)


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    raw_request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with Google OAuth.
    Expects the Google ID token from frontend.
    """
    # Rate limit by client IP
    client_ip = raw_request.client.host if raw_request.client else "unknown"
    is_allowed, retry_after = auth_rate_limiter.is_allowed(f"auth:{client_ip}")
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
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
