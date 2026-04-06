from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import GoogleAuthRequest, TokenResponse, UserResponse
from app.services.auth_service import (
    verify_google_token, 
    create_access_token, 
    get_or_create_user,
    get_current_user
)
from app.models.user import User

router = APIRouter()


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with Google OAuth.
    Expects the Google ID token from frontend.
    """
    # Verify Google token and get user info
    google_data = verify_google_token(request.credential)
    
    # Get or create user
    user = get_or_create_user(db, google_data)
    
    # Create JWT token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.post("/logout")
async def logout():
    """
    Logout endpoint (client-side token removal).
    JWT tokens are stateless, so we just return success.
    """
    return {"message": "Logged out successfully"}
