from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models import ServiceType, ServiceStatus


class ServiceBase(BaseModel):
    type: ServiceType = ServiceType.OFFER
    category: str
    title: str
    description: str
    price: Optional[str] = None
    image_url: Optional[str] = None
    image_size: Optional[int] = None  # bytes, set at upload time


class ServiceCreate(ServiceBase):
    website_hp: Optional[str] = None
    submission_duration_ms: Optional[int] = None


class ServiceOut(ServiceBase):
    id: int
    poster_id: int
    poster_username: Optional[str] = None
    poster_display_name: Optional[str] = None
    poster_avatar_url: Optional[str] = None
    poster_email: Optional[str] = None
    poster_phone: Optional[str] = None
    status: ServiceStatus
    created_at: datetime
    average_rating: Optional[float] = None
    rating_count: int = 0

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


class ServiceRatingCreate(BaseModel):
    score: int = Field(..., ge=1, le=5, description="Rating score between 1 and 5 stars")
    comment: Optional[str] = Field(None, max_length=500, description="Optional peer feedback comment")


class ServiceRatingOut(BaseModel):
    id: int
    service_id: int
    user_id: int
    score: int
    comment: Optional[str] = None
    created_at: datetime
    rater_username: Optional[str] = None
    rater_display_name: Optional[str] = None
    rater_avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceRatingsSummaryOut(BaseModel):
    average_rating: Optional[float] = None
    total_ratings: int = 0
    ratings: List[ServiceRatingOut] = []


