from sqlalchemy import Column, DateTime, Integer, String, Boolean, TIMESTAMP, func, text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

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
    role = Column(Enum(UserRole), nullable=False, server_default=UserRole.COMMUNITY_MEMBER.value)
    time = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    studies = relationship("StudyListing", back_populates="researcher", cascade="all, delete")
    applications = relationship("Application", back_populates="applicant", cascade="all, delete")

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
    state = Column(Enum(StudyState), nullable=False)

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
    status = Column(Enum(ApplicationStatus), nullable=False, server_default=ApplicationStatus.APPLIED.value)
    applied_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))

    study = relationship("StudyListing", back_populates="applications")
    applicant = relationship("User", back_populates="applications")