from sqlalchemy import Column, DateTime, Integer, String, Boolean, TIMESTAMP, func, text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

def _values_enum(enum_cls):
    """SQLAlchemy's Enum() stores the Python member NAME by default (e.g. "COMMUNITY_MEMBER"),
    but every server_default / frontend payload in this app uses the lowercase .value
    (e.g. "community_member"). Without this, DB round-trips raise a LookupError as soon as
    a row is read back after the DB applies a server_default instead of an explicit value."""
    return SAEnum(enum_cls, values_callable=lambda obj: [e.value for e in obj])

class UserRole(str, enum.Enum):
    COMMUNITY_MEMBER = "community_member"
    RESEARCHER = "researcher"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable = False, unique = True)
    email = Column(String(255), nullable = False, unique = True)
    password = Column(String(255), nullable = False)
    role = Column(_values_enum(UserRole), nullable=False, server_default=UserRole.COMMUNITY_MEMBER.value)
    time = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    studies = relationship("StudyListing", back_populates="researcher", cascade="all, delete")
    applications = relationship("Application", back_populates="applicant", cascade="all, delete")
    services = relationship("Service", back_populates="poster", cascade="all, delete")
    service_applications = relationship("ServiceApplication", back_populates="applicant", cascade="all, delete")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String(255), nullable=False)
    published = Column(Boolean, nullable=False, default=True) 
    time = Column(DateTime(timezone=True),server_default=func.now(),nullable=False)

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
    created_at = Column(DateTime(timezone=True),server_default=func.now(),nullable=False)
    closing_date = Column(DateTime(timezone=True), nullable=True) 
    state = Column(_values_enum(StudyState), nullable=False)
    limesurvey_survey_id = Column(Integer, nullable=True)  # LimeSurvey survey ID this study links to, if any

    researcher = relationship("User", back_populates="studies")
    applications = relationship("Application", back_populates="study", cascade="all, delete")

class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    ACCEPTED = "accepted"
    DECLINED = "declined"

class Application(Base):
    """A community member's application to participate in a StudyListing"""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(_values_enum(ApplicationStatus), nullable=False, server_default=ApplicationStatus.APPLIED.value)
    applied_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    study = relationship("StudyListing", back_populates="applications")
    applicant = relationship("User", back_populates="applications")


class ServiceType(str, enum.Enum):
    OFFER = "offer"      # a member offering a service to others
    REQUEST = "request"  # a member requesting a service from others


class ServiceStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class Service(Base):
    """A community-posted service listing (offer or request) - the Services Directory."""
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


class ServiceApplication(Base):
    """A member expressing interest in / applying to a Service listing."""
    __tablename__ = "service_applications"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    applicant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String(500), nullable=True)
    applied_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    service = relationship("Service", back_populates="applications")
    applicant = relationship("User", back_populates="service_applications")