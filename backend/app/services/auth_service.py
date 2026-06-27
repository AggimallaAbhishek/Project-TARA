from datetime import datetime, timedelta, timezone
import logging
import secrets
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token
from google.auth.transport import requests
from app.config import get_settings
from app.database import get_async_db
from app.models.user import User
from app.utils.time import utc_now_for_db

settings = get_settings()
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)
ACCESS_TOKEN_COOKIE_NAME = "tara_access_token"
CSRF_COOKIE_NAME = "tara_csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"


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
            settings.google_client_id,
            clock_skew_in_seconds=60
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


def create_csrf_token() -> str:
    """Create a random token for double-submit CSRF validation."""
    return secrets.token_urlsafe(32)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_async_db)
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
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    
    return user


async def get_or_create_user(db: AsyncSession, google_data: dict) -> User:
    """Get existing user or create new one from Google data.

    This function does **not** commit the transaction — callers are responsible
    for calling ``await db.commit()`` after this returns, so that the operation
    can be composed into a larger unit of work if needed.
    """
    result = await db.execute(select(User).where(User.google_id == google_data['google_id']))
    user = result.scalars().first()

    if user:
        # Update last login and any changed profile info.
        logger.debug("Updating Google auth profile user_id=%s", user.id)
        user.last_login = utc_now_for_db()
        user.name = google_data['name']
        user.picture = google_data.get('picture')
        await db.flush()
    else:
        # Create new user — the commit is deferred to the caller.
        logger.debug("Creating user from verified Google auth token")
        user = User(
            email=google_data['email'],
            name=google_data['name'],
            picture=google_data.get('picture'),
            google_id=google_data['google_id']
        )
        db.add(user)
        await db.flush()
        logger.debug("Flushed new Google auth user (pre-commit)")

    return user
