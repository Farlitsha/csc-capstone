from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from app.models import UserRole, StudyState, ApplicationStatus

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

class StudyListingCreate(StudyListingBase):
    #TODO: replace with the logged-in user's id once auth (JWT) is wired up.
    researcher_id: int

class StudyListingOut(StudyListingBase):
    id: int
    state: StudyState
    researcher_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ApplicationCreate(BaseModel):
    # TODO: replace with the logged-in user's id once auth (JWT) is wired up.
    user_id: int

class ApplicationOut(BaseModel):
    id: int
    study_id: int
    user_id: int
    status: ApplicationStatus
    applied_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus