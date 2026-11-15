from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfileBase(BaseModel):
    target_role: str = Field(default="SDE", description="Target role e.g. SDE, Frontend, Backend, ML Engineer, Data Analyst, HR/Behavioral")
    experience_level: str = Field(default="fresher", description="fresher or 0-2 yrs")
    tech_focus_areas: list[str] = Field(default_factory=list, description="Technologies or topic focus")
    bio: str | None = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    target_role: str | None = None
    experience_level: str | None = None
    tech_focus_areas: list[str] | None = None
    bio: str | None = None


class ProfileOut(ProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    target_role: str | None = "SDE"
    experience_level: str | None = "fresher"
    tech_focus_areas: list[str] | None = Field(default_factory=list)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    profile: ProfileOut | None = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str
