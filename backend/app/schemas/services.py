from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models import ServiceType, ServiceStatus


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

