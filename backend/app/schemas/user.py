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
    username: str
    email: str
    password: str
    role: Optional[UserRole] = UserRole.COMMUNITY_MEMBER
    display_name: Optional[str] = None
    phone: Optional[str] = None
    struggles: Optional[List[str]] = None

    @field_validator("password")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not v or not v.isdigit() or len(v) != 5:
            raise ValueError("PIN must be exactly 5 digits")
        return v


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    verification_status: Optional[VerificationStatus] = VerificationStatus.NONE
    time: datetime
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    struggles: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)


class PrivateProfileOut(BaseModel):
    """Full profile returned to the authenticated owner of the account."""
    id: int
    username: str
    email: str
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
    display_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

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

