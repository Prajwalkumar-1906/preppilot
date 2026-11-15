import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import Profile, User
from app.schemas.auth import ProfileUpdate, Token, UserCreate, UserLogin


class AuthService:
    @staticmethod
    def register(db: Session, user_in: UserCreate) -> Token:
        # Check if email is already taken
        query = select(User).where(User.email == user_in.email.lower().strip())
        existing_user = db.execute(query).scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

        user_id = str(uuid.uuid4())
        new_user = User(
            id=user_id,
            email=user_in.email.lower().strip(),
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name.strip(),
            is_active=True
        )
        db.add(new_user)
        db.flush()

        # Create user profile
        profile_id = str(uuid.uuid4())
        new_profile = Profile(
            id=profile_id,
            user_id=new_user.id,
            target_role=user_in.target_role or "SDE",
            experience_level=user_in.experience_level or "fresher",
            tech_focus_areas=user_in.tech_focus_areas or []
        )
        db.add(new_profile)
        db.commit()
        db.refresh(new_user)

        # Reload with profile
        query = select(User).where(User.id == new_user.id).options(joinedload(User.profile))
        user_with_profile = db.execute(query).scalar_one()

        access_token = create_access_token(subject=user_with_profile.id)
        refresh_token = create_refresh_token(subject=user_with_profile.id)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_with_profile
        )

    @staticmethod
    def login(db: Session, login_data: UserLogin) -> Token:
        query = select(User).where(User.email == login_data.email.lower().strip()).options(joinedload(User.profile))
        user = db.execute(query).scalar_one_or_none()

        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account."
            )

        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user
        )

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> str:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        query = select(User).where(User.id == user_id)
        user = db.execute(query).scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive."
            )

        return create_access_token(subject=user.id)

    @staticmethod
    def update_profile(db: Session, user: User, profile_in: ProfileUpdate) -> Profile:
        query = select(Profile).where(Profile.user_id == user.id)
        profile = db.execute(query).scalar_one_or_none()

        if not profile:
            profile = Profile(id=str(uuid.uuid4()), user_id=user.id)
            db.add(profile)

        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)

        db.commit()
        db.refresh(profile)
        return profile
