from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas, oauth2
from ..database import get_db

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("/", response_model=List[schemas.AuditLogOut])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Admin-only. Append-only history of moderation/admin actions - who did what, to what,
    and when. Nothing here is ever edited or deleted through the API."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    entries = (
        db.query(models.AuditLog)
        .options(joinedload(models.AuditLog.actor))
        .order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [schemas.AuditLogOut.from_model(e) for e in entries]
