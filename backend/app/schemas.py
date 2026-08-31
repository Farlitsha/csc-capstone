from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, List
from app.models import UserRole, VerificationStatus, StudyState, ApplicationStatus, ServiceType, ServiceStatus, WorkshopStatus

class PostBase(BaseModel):
    title: str
    content: str
    published: bool = True

class PostCreate(PostBase):
    pass

class UserBase(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[UserRole] = UserRole.COMMUNITY_MEMBER
    display_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class StudyListingBase(BaseModel):
    title: str
    description: str
    honorarium: Optional[str] = None
    participant_limit: Optional[int] = None
    closing_date: Optional[datetime] = None
    limesurvey_survey_id: Optional[int] = None

class StudyListingCreate(StudyListingBase):
    pass

class StudyListingOut(StudyListingBase):
    id: int
    state: StudyState
    researcher_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SurveyStatusOut(BaseModel):
    survey_id: int
    title: Optional[str] = None
    active: bool
    participation_url: str
    completed_responses: Optional[int] = None
    incomplete_responses: Optional[int] = None


class ApplicationOut(BaseModel):
    id: int
    study_id: int
    user_id: int
    status: ApplicationStatus
    applied_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyApplicationOut(ApplicationOut):
    study_title: str
    study_honorarium: Optional[str] = None


class ApplicantOut(ApplicationOut):
    applicant_username: str
    applicant_email: str

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    id: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    verification_status: Optional[VerificationStatus] = VerificationStatus.NONE
    time: datetime
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

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
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class RoleUpdate(BaseModel):
    role: UserRole


class ServiceBase(BaseModel):
    type: ServiceType = ServiceType.OFFER
    category: str
    title: str
    description: str
    price: Optional[str] = None
    image_url: Optional[str] = None


class ServiceCreate(ServiceBase):
    pass


class ServiceOut(ServiceBase):
    id: int
    poster_id: int
    status: ServiceStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceApplicationCreate(BaseModel):
    message: Optional[str] = None


class ServiceApplicationOut(BaseModel):
    id: int
    service_id: int
    applicant_id: int
    message: Optional[str] = None
    applied_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    reason: str


class ReportOut(BaseModel):
    id: int
    service_id: int
    service_title: str
    service_description: str
    reporter_id: int
    reporter_username: str
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnnouncementCreate(BaseModel):
    audience: str = "All members"
    content: str


class AnnouncementOut(BaseModel):
    id: int
    author_id: int
    author_username: str
    audience: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminStatsOut(BaseModel):
    total_users: int
    researchers: int
    admins: int
    community_members: int
    flagged_listings: int
    total_services: int
    total_studies: int
    total_workshops: Optional[int] = 0
    total_workshop_registrations: Optional[int] = 0


# ── Workshop Schemas ─────────────────────────────────────────────────────────

class WorkshopBase(BaseModel):
    title: str
    description: str
    location: str
    date_time: datetime
    max_participants: int


class WorkshopCreate(WorkshopBase):
    @field_validator("max_participants")
    @classmethod
    def validate_max_participants(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Maximum participant count must be greater than zero")
        return v

    @field_validator("date_time")
    @classmethod
    def validate_future_date(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        target = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if target <= now:
            raise ValueError("Workshop date and time must be in the future")
        return v


class WorkshopUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    date_time: Optional[datetime] = None
    max_participants: Optional[int] = None

    @field_validator("max_participants")
    @classmethod
    def validate_max_participants(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Maximum participant count must be greater than zero")
        return v

    @field_validator("date_time")
    @classmethod
    def validate_future_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            now = datetime.now(timezone.utc)
            target = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
            if target <= now:
                raise ValueError("Workshop date and time must be in the future")
        return v


class WorkshopOut(WorkshopBase):
    id: int
    organizer_id: int
    status: WorkshopStatus
    created_at: datetime
    organizer_username: Optional[str] = None
    organizer_display_name: Optional[str] = None
    registered_count: Optional[int] = 0
    is_registered: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)


class WorkshopRegistrationOut(BaseModel):
    id: int
    workshop_id: int
    user_id: int
    registered_at: datetime
    participant_username: Optional[str] = None
    participant_display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MyWorkshopRegistrationOut(BaseModel):
    id: int
    workshop_id: int
    registered_at: datetime
    workshop_title: str
    workshop_description: str
    workshop_location: str
    workshop_date_time: datetime
    workshop_status: WorkshopStatus

    model_config = ConfigDict(from_attributes=True)