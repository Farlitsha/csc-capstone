from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, List, Union, Any
from app.models import (
    UserRole, VerificationStatus, StudyState, ApplicationStatus, ServiceType, ServiceStatus,
    WorkshopStatus, QuestionType, ReportTargetType, ReportStatus,
)
from app.utils import sanitize_text

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
    phone: Optional[str] = None
    struggles: Optional[List[str]] = None

    @field_validator("password")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not v or not v.isdigit() or len(v) != 5:
            raise ValueError("PIN must be exactly 5 digits")
        return v

class StudyListingBase(BaseModel):
    title: str
    description: str
    honorarium: Optional[str] = None
    participant_limit: Optional[int] = None
    closing_date: Optional[datetime] = None

class SurveyQuestionIn(BaseModel):
    type: QuestionType
    prompt: str
    required: bool = True
    options: Optional[List[str]] = None  # multiple_choice / checkbox only

class StudyListingCreate(StudyListingBase):
    # Optional set of survey questions to create alongside the study, built with
    # CommHub's own in-house survey builder (see Survey/SurveyQuestion in app/models.py).
    questions: List[SurveyQuestionIn] = []

class StudyListingOut(StudyListingBase):
    id: int
    state: StudyState
    researcher_id: int
    created_at: datetime
    researcher_username: Optional[str] = None
    researcher_display_name: Optional[str] = None
    researcher_avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyQuestionOut(SurveyQuestionIn):
    id: int
    order: int

    model_config = ConfigDict(from_attributes=True)


class SurveyIn(BaseModel):
    """Full replace: the researcher's builder always sends the complete question list."""
    questions: List[SurveyQuestionIn] = []


class SurveyOut(BaseModel):
    id: int
    study_id: int
    questions: List[SurveyQuestionOut]

    model_config = ConfigDict(from_attributes=True)


class SurveyAnswerIn(BaseModel):
    question_id: int
    value: Union[str, List[str]]


class SurveyResponseIn(BaseModel):
    answers: List[SurveyAnswerIn]


class SurveyAnswerOut(BaseModel):
    question_id: int
    value: Union[str, List[str], None] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyResponseOut(BaseModel):
    id: int
    user_id: int
    submitted_at: datetime
    answers: List[SurveyAnswerOut]

    model_config = ConfigDict(from_attributes=True)


class SurveyResponsesOut(BaseModel):
    response_count: int
    responses: List[SurveyResponseOut]


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
    poster_username: str
    poster_display_name: Optional[str] = None
    poster_avatar_url: Optional[str] = None
    poster_email: str
    poster_phone: Optional[str] = None
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


# --- Community statistics & census ---

class StruggleCount(BaseModel):
    struggle: str
    count: int


class CommunityStatsOut(BaseModel):
    total_members: int
    members_by_role: dict[str, int]
    new_members_last_30_days: int
    struggles_breakdown: List[StruggleCount]


class CommunityCensusCreate(BaseModel):
    employment_status: str
    income_bracket: str
    education_level: str
    job_skills: Optional[List[str]] = []
    job_support_needs: Optional[List[str]] = []


class CommunityCensusOut(BaseModel):
    id: int
    user_id: int
    employment_status: str
    income_bracket: str
    education_level: str
    job_skills: Optional[List[str]] = []
    job_support_needs: Optional[List[str]] = []
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChartDataPoint(BaseModel):
    label: str
    count: int
    percentage: float


class CommunityCensusStatsOut(BaseModel):
    total_respondents: int
    unemployment_rate: float
    poverty_rate: float
    employment_distribution: List[ChartDataPoint]
    income_distribution: List[ChartDataPoint]
    education_distribution: List[ChartDataPoint]
    top_skills: List[ChartDataPoint]
    top_support_needs: List[ChartDataPoint]



# --- Reports (member flags a listing/study/user for admin review) ---

class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: int
    reason: str


class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reporter_username: str
    target_type: ReportTargetType
    target_id: int
    reason: str
    status: ReportStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, r):
        return cls(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_username=r.reporter.username,
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            status=r.status,
            created_at=r.created_at,
            resolved_at=r.resolved_at,
            resolved_by_id=r.resolved_by_id,
        )


class ReportStatusUpdate(BaseModel):
    status: ReportStatus


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


# --- Audit log (admin-only, append-only) ---

class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_username: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    details: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, entry):
        return cls(
            id=entry.id,
            actor_id=entry.actor_id,
            actor_username=entry.actor.username if entry.actor else None,
            action=entry.action,
            target_type=entry.target_type,
            target_id=entry.target_id,
            details=entry.details,
            created_at=entry.created_at,
        )


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
