from sqlalchemy import Column, DateTime, Integer, String, Boolean, TIMESTAMP, JSON, func, text, ForeignKey, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


def _values_enum(enum_cls):
    """SQLAlchemy Enum stores member NAMEs by default; this forces it to use .value instead."""
    return SAEnum(enum_cls, values_callable=lambda obj: [e.value for e in obj])


class UserRole(str, enum.Enum):
    COMMUNITY_MEMBER = "community_member"
    RESEARCHER = "researcher"
    ADMIN = "admin"


class VerificationStatus(str, enum.Enum):
    NONE = "none"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=True, unique=True)
    email = Column(String(255), nullable=True, unique=True)
    phone = Column(String(30), nullable=True)
    password = Column(String(255), nullable=False)
    role = Column(_values_enum(UserRole), nullable=False, server_default=UserRole.COMMUNITY_MEMBER.value)
    verification_status = Column(
        _values_enum(VerificationStatus),
        nullable=False,
        server_default=VerificationStatus.NONE.value,
    )
    time = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    # Profile fields
    display_name = Column(String(100), nullable=True)
    bio = Column(String(500), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # What this member is finding difficult right now, captured at signup (a fixed list of
    # categories - see SIGNUP_STRUGGLE_CHOICES below). Feeds the community needs breakdown
    # shown on the home page (GET /community/stats) - self-reported, optional, not inferred.
    struggles = Column(JSON, nullable=True)  # list[str]

    # Account status (active / deactivated)
    is_active = Column(Boolean, nullable=False, server_default=text("1"), default=True)

    studies = relationship("StudyListing", back_populates="researcher", cascade="all, delete")
    applications = relationship("Application", back_populates="applicant", cascade="all, delete")
    services = relationship("Service", back_populates="poster", cascade="all, delete")
    service_applications = relationship("ServiceApplication", back_populates="applicant", cascade="all, delete")
    announcements = relationship("Announcement", back_populates="author", cascade="all, delete")
    workshops = relationship("Workshop", back_populates="organizer", cascade="all, delete")
    workshop_registrations = relationship("WorkshopRegistration", back_populates="participant", cascade="all, delete")
    survey_responses = relationship("SurveyResponse", back_populates="respondent", cascade="all, delete")
    census_response = relationship("CommunityCensus", back_populates="user", uselist=False, cascade="all, delete")
    reports_filed = relationship("Report", foreign_keys="Report.reporter_id", back_populates="reporter", cascade="all, delete")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String(255), nullable=False)
    published = Column(Boolean, nullable=False, default=True)
    time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StudyState(str, enum.Enum):
    DRAFT = "draft"
    LIVE = "live"
    CLOSED = "closed"


class StudyListing(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True)
    researcher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=False)
    honorarium = Column(String(50), nullable=True)
    participant_limit = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    closing_date = Column(DateTime(timezone=True), nullable=True)
    state = Column(_values_enum(StudyState), nullable=False)
    survey = relationship("Survey", back_populates="study", uselist=False, cascade="all, delete")

    researcher = relationship("User", back_populates="studies")
    applications = relationship("Application", back_populates="study", cascade="all, delete")


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Application(Base):
    """A community member application to participate in a StudyListing."""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(_values_enum(ApplicationStatus), nullable=False, server_default=ApplicationStatus.APPLIED.value)
    applied_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    study = relationship("StudyListing", back_populates="applications")
    applicant = relationship("User", back_populates="applications")


class ServiceType(str, enum.Enum):
    OFFER = "offer"
    REQUEST = "request"


class ServiceStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class Service(Base):
    """A community-posted service listing (offer or request)."""
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    poster_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(_values_enum(ServiceType), nullable=False, server_default=ServiceType.OFFER.value)
    status = Column(_values_enum(ServiceStatus), nullable=False, server_default=ServiceStatus.OPEN.value)
    category = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=False)
    price = Column(String(50), nullable=True)
    image_url = Column(String(500), nullable=True)
    image_size = Column(Integer, nullable=True)  # file size in bytes, for low-data placeholder overlay
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    poster = relationship("User", back_populates="services")
    applications = relationship("ServiceApplication", back_populates="service", cascade="all, delete")

    # Exposed on ServiceOut so members can reach out directly via WhatsApp/email.
    @property
    def poster_username(self):
        return self.poster.username if self.poster else None

    @property
    def poster_display_name(self):
        return self.poster.display_name if self.poster else None

    @property
    def poster_avatar_url(self):
        return self.poster.avatar_url if self.poster else None

    @property
    def poster_email(self):
        if self.poster:
            return self.poster.contact_email or self.poster.email or None
        return None

    @property
    def poster_phone(self):
        if self.poster:
            return self.poster.contact_phone or self.poster.phone or None
        return None


class QuestionType(str, enum.Enum):
    """The in-house survey builder's question types (see Survey/SurveyQuestion below).
    Replaces the old approach of linking out to a LimeSurvey survey ID."""
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    MULTIPLE_CHOICE = "multiple_choice"  # single select from `options`
    CHECKBOX = "checkbox"                # multi select from `options`
    RATING = "rating"                    # 1-5 scale
    YES_NO = "yes_no"


class Survey(Base):
    """A study's own survey, built and hosted inside CommHub - one per StudyListing."""
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    study = relationship("StudyListing", back_populates="survey")
    questions = relationship(
        "SurveyQuestion", back_populates="survey", cascade="all, delete", order_by="SurveyQuestion.order"
    )
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete")


class SurveyQuestion(Base):
    """A single question in a survey. `options` only applies to multiple_choice/checkbox questions."""
    __tablename__ = "survey_questions"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    type = Column(_values_enum(QuestionType), nullable=False, server_default=QuestionType.SHORT_TEXT.value)
    prompt = Column(String(500), nullable=False)
    required = Column(Boolean, nullable=False, default=True)
    options = Column(JSON, nullable=True)  # list[str], for multiple_choice / checkbox questions

    survey = relationship("Survey", back_populates="questions")
    answers = relationship("SurveyAnswer", back_populates="question", cascade="all, delete")


class SurveyResponse(Base):
    """One participant's full set of answers to a study's survey."""
    __tablename__ = "survey_responses"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    submitted_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    survey = relationship("Survey", back_populates="responses")
    respondent = relationship("User", back_populates="survey_responses")
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete")


class SurveyAnswer(Base):
    """A single answer within a SurveyResponse. `value` is a string for text/rating/yes_no/
    multiple_choice questions, or a list of strings for checkbox (multi-select) questions."""
    __tablename__ = "survey_answers"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("survey_questions.id", ondelete="CASCADE"), nullable=False)
    value = Column(JSON, nullable=True)

    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")


# Fixed set of choices offered at signup for "what are you finding difficult right now?".
# Not DB-enforced (kept as a plain JSON list on User.struggles) so it can change over time
# without a migration, but this is the canonical list the signup form renders.
SIGNUP_STRUGGLE_CHOICES = [
    "employment",
    "housing",
    "healthcare",
    "education",
    "food_security",
    "internet_access",
    "transport",
    "safety",
]


class ServiceApplication(Base):
    """A member applying to a Service listing."""
    __tablename__ = "service_applications"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    applicant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String(500), nullable=True)
    applied_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    service = relationship("Service", back_populates="applications")
    applicant = relationship("User", back_populates="service_applications")


class ReportTargetType(str, enum.Enum):
    SERVICE = "service"
    STUDY = "study"
    USER = "user"


class ReportStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Report(Base):
    """A member flagging a service, study, or user for admin review."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(_values_enum(ReportTargetType), nullable=False)
    target_id = Column(Integer, nullable=False)
    reason = Column(String(1000), nullable=False)
    status = Column(_values_enum(ReportStatus), nullable=False, server_default=ReportStatus.OPEN.value)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reports_filed")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])


class AuditLog(Base):
    """Append-only record of admin/moderation actions - role changes, listing closures,
    application decisions, report resolutions. Never updated or deleted through the API."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=True)
    target_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    actor = relationship("User", foreign_keys=[actor_id])


class Announcement(Base):
    """A platform-wide announcement posted by an admin."""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    audience = Column(String(100), nullable=False, server_default="All members")
    content = Column(String(2000), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    author = relationship("User", back_populates="announcements")


class WorkshopStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Workshop(Base):
    """An in-person workshop or research interview scheduled by a researcher."""
    __tablename__ = "workshops"

    id = Column(Integer, primary_key=True, index=True)
    organizer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=False)
    location = Column(String(255), nullable=False)
    date_time = Column(DateTime(timezone=True), nullable=False)
    max_participants = Column(Integer, nullable=False)
    status = Column(_values_enum(WorkshopStatus), nullable=False, server_default=WorkshopStatus.SCHEDULED.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    organizer = relationship("User", back_populates="workshops")
    registrations = relationship("WorkshopRegistration", back_populates="workshop", cascade="all, delete")


class WorkshopRegistration(Base):
    """A community member's registration for a Workshop."""
    __tablename__ = "workshop_registrations"
    __table_args__ = (
        UniqueConstraint("workshop_id", "user_id", name="uq_workshop_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    workshop_id = Column(Integer, ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    registered_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    workshop = relationship("Workshop", back_populates="registrations")
    participant = relationship("User", back_populates="workshop_registrations")


class CommunityCensus(Base):
    """Community member demographic and economic census data (employment, income/poverty bracket,
    education level, skills, and work support needs) used to generate aggregate community charts."""
    __tablename__ = "community_census"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    employment_status = Column(String(100), nullable=False)
    income_bracket = Column(String(100), nullable=False)
    education_level = Column(String(100), nullable=False)
    job_skills = Column(JSON, nullable=True)          # list[str]
    job_support_needs = Column(JSON, nullable=True)   # list[str]
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="census_response")

