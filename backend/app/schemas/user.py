import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from app.models import UserRole, VerificationStatus
from app.utils import sanitize_text


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    id: Optional[str] = None


class UserBase(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str
    role: Optional[UserRole] = UserRole.COMMUNITY_MEMBER
    display_name: Optional[str] = None
    phone: Optional[str] = None
    struggles: Optional[List[str]] = None
    website_hp: Optional[str] = None
    submission_duration_ms: Optional[int] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                return None
            if len(v) < 3:
                raise ValueError("Username must be at least 3 characters long")
            if not re.match(r"^[a-zA-Z0-9_\.\-]+$", v):
                raise ValueError("Username may only contain letters, numbers, underscores, dashes, and periods")
        return v

    @field_validator("password")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not v or not v.isdigit() or len(v) != 5:
            raise ValueError("PIN must be exactly 5 digits")
        return v


class UserOut(BaseModel):
    id: int
    username: Optional[str] = None
    email: Optional[str] = None
    role: UserRole
    verification_status: Optional[VerificationStatus] = VerificationStatus.NONE
    time: datetime
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    struggles: Optional[List[str]] = None
    is_active: bool = True
    researcher_downgraded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PrivateProfileOut(BaseModel):
    """Full profile returned to the authenticated owner of the account."""
    id: int
    username: Optional[str] = None
    email: Optional[str] = None
    role: UserRole
    verification_status: Optional[VerificationStatus] = VerificationStatus.NONE
    time: datetime
    display_name: Optional[str] = None
    bio: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    struggles: Optional[List[str]] = None
    is_active: bool = True
    researcher_downgraded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PublicProfileOut(BaseModel):
    """Publicly visible profile returned when any user views another user's profile."""
    id: int
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    """Body for PATCH /users/me/profile — all fields are optional."""
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Username cannot be empty")
            if len(v) < 3:
                raise ValueError("Username must be at least 3 characters long")
            if not re.match(r"^[a-zA-Z0-9_\.\-]+$", v):
                raise ValueError("Username may only contain letters, numbers, underscores, dashes, and periods")
        return v

    @field_validator("bio", "display_name")
    @classmethod
    def sanitize_html(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return sanitize_text(v)
        return v


class RoleUpdate(BaseModel):
    role: UserRole


class PhoneUpdate(BaseModel):
    phone: Optional[str] = None


class ReactivateRequest(BaseModel):
    username: str
    password: str


class ResearcherApplicationRequest(BaseModel):
    phone: Optional[str] = None


class ChangePinRequest(BaseModel):
    current_pin: str
    new_pin: str

    @field_validator("new_pin")
    @classmethod
    def validate_new_pin(cls, v: str) -> str:
        if not v or not v.isdigit() or len(v) != 5:
            raise ValueError("New PIN must be exactly 5 digits")
        return v


