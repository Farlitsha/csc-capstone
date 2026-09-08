from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict


class AdminStatsOut(BaseModel):
    total_users: int
    researchers: int
    admins: int
    community_members: int
    flagged_listings: int
    total_services: int
    total_studies: int
    total_workshops: Optional[int] = 0
    total_workshop_registrations: Optional[int] = 0


class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_username: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    details: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, entry):
        return cls(
            id=entry.id,
            actor_id=entry.actor_id,
            actor_username=entry.actor.username if entry.actor else None,
            action=entry.action,
            target_type=entry.target_type,
            target_id=entry.target_id,
            details=entry.details,
            created_at=entry.created_at,
        )

