from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    audience: str = "All members"
    content: str


class AnnouncementOut(BaseModel):
    id: int
    author_id: int
    author_username: Optional[str] = None
    audience: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

