from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from app.models import UserRole, StudyState, ApplicationStatus, ServiceType, ServiceStatus

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
    time: datetime

    model_config = ConfigDict(from_attributes=True)


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