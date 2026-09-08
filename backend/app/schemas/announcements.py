from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    audience: str = "All members"
    content: str


class AnnouncementOut(BaseModel):
    id: int
    author_id: int
    author_username: str
    audience: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

