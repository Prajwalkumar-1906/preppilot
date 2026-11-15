from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    ProfileOut,
    ProfileUpdate,
    Token,
    TokenRefreshRequest,
    TokenRefreshResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new fresher/user and initialize their role profile."""
    return AuthService.register(db=db, user_in=user_in)


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate with email and password to receive JWT tokens."""
    return AuthService.login(db=db, login_data=login_data)


@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_token(
    refresh_in: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """Exchange a valid refresh token for a fresh access token."""
    new_access_token = AuthService.refresh_access_token(
        db=db, refresh_token=refresh_in.refresh_token
    )
    return TokenRefreshResponse(access_token=new_access_token)


@router.get("/me", response_model=UserOut)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Fetch profile and settings for the authenticated user."""
    return current_user


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user's target role, experience level, and tech focus areas."""
    return AuthService.update_profile(db=db, user=current_user, profile_in=profile_in)
