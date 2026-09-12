from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models import ReportTargetType, ReportStatus


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: int
    reason: str


class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reporter_username: str
    target_type: ReportTargetType
    target_id: int
    reason: str
    status: ReportStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None
    target_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, r, target_title: Optional[str] = None):
        return cls(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_username=r.reporter.username if r.reporter else "unknown",
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            status=r.status,
            created_at=r.created_at,
            resolved_at=r.resolved_at,
            resolved_by_id=r.resolved_by_id,
            target_title=target_title,
        )


class ReportStatusUpdate(BaseModel):
    status: ReportStatus

