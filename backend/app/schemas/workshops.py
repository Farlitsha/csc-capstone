from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models import WorkshopStatus


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

