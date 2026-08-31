from sqlalchemy import Column, DateTime, Integer, String, Boolean, TIMESTAMP, func, text, ForeignKey, UniqueConstraint, Enum as SAEnum
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
    username = Column(String(255), nullable=False, unique=True)
    email = Column(String(255), nullable=False, unique=True)
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

    studies = relationship("StudyListing", back_populates="researcher", cascade="all, delete")
    applications = relationship("Application", back_populates="applicant", cascade="all, delete")
    services = relationship("Service", back_populates="poster", cascade="all, delete")
    service_applications = relationship("ServiceApplication", back_populates="applicant", cascade="all, delete")
    announcements = relationship("Announcement", back_populates="author", cascade="all, delete")
    workshops = relationship("Workshop", back_populates="organizer", cascade="all, delete")
    workshop_registrations = relationship("WorkshopRegistration", back_populates="participant", cascade="all, delete")


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
    limesurvey_survey_id = Column(Integer, nullable=True)

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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    poster = relationship("User", back_populates="services")
    applications = relationship("ServiceApplication", back_populates="service", cascade="all, delete")
    reports = relationship("Report", back_populates="service", cascade="all, delete")


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


class Report(Base):
    """A report / flag on a service listing."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String(500), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    service = relationship("Service", back_populates="reports")


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
