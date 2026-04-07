from datetime import datetime, timedelta, timezone
import logging
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests
from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)
ACCESS_TOKEN_COOKIE_NAME = "tara_access_token"


def verify_google_token(token: str) -> dict:
    """Verify Google ID token and return user info."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is not configured"
        )

    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.google_client_id
        )
        
        # Validate issuer
        issuer = idinfo.get('iss', '')
        if issuer not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid issuer')
        
        # Validate required fields exist
        if 'sub' not in idinfo or 'email' not in idinfo:
            raise ValueError('Missing required fields in Google token')
        
        # Extract and validate name
        name = idinfo.get('name', '')
        if not name:
            # Fallback to email username
            name = idinfo['email'].split('@')[0] if idinfo['email'] else 'User'
        
        return {
            'google_id': idinfo['sub'],
            'email': idinfo['email'],
            'name': name,
            'picture': idinfo.get('picture')
        }
    except ValueError as e:
        logger.warning("Google token validation failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    except Exception:
        logger.exception("Failed to verify Google token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google token"
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user."""
    token = credentials.credentials if credentials else request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        # Convert to int safely
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user


def get_or_create_user(db: Session, google_data: dict) -> User:
    """Get existing user or create new one from Google data."""
    user = db.query(User).filter(User.google_id == google_data['google_id']).first()
    
    if user:
        # Update last login and any changed info
        user.last_login = datetime.now(timezone.utc)
        user.name = google_data['name']
        user.picture = google_data.get('picture')
        db.commit()
        db.refresh(user)
    else:
        # Create new user
        user = User(
            email=google_data['email'],
            name=google_data['name'],
            picture=google_data.get('picture'),
            google_id=google_data['google_id']
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user
