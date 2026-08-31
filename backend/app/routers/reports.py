from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas, oauth2, audit
from ..database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_admin(current_user: models.User = Depends(oauth2.get_current_user)) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.post("/", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Any logged-in member flags a service, study, or user for admin review."""
    db_report = models.Report(
        reporter_id=current_user.id,
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return schemas.ReportOut.from_model(db_report)


@router.get("/", response_model=List[schemas.ReportOut])
async def list_reports(
    status_filter: Optional[schemas.ReportStatus] = None,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(_require_admin),
):
    """Admin-only. Defaults to showing everything; pass ?status_filter=open to see the queue."""
    q = db.query(models.Report).options(joinedload(models.Report.reporter))
    if status_filter:
        q = q.filter(models.Report.status == status_filter)
    reports = q.order_by(models.Report.created_at.desc()).all()
    return [schemas.ReportOut.from_model(r) for r in reports]


@router.patch("/{report_id}", response_model=schemas.ReportOut)
async def update_report_status(
    report_id: int,
    update: schemas.ReportStatusUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(_require_admin),
):
    """Admin resolves or dismisses a report. Recorded to the audit log either way."""
    from datetime import datetime, timezone

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report {report_id} not found")
    if update.status == models.ReportStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot re-open a report through this endpoint")

    report.status = update.status
    report.resolved_at = datetime.now(timezone.utc)
    report.resolved_by_id = admin.id

    audit.log_action(
        db,
        actor_id=admin.id,
        action=f"report_{update.status.value}",
        target_type=report.target_type.value,
        target_id=report.target_id,
        details={"report_id": report.id, "reason": report.reason},
    )

    db.commit()
    db.refresh(report)
    return schemas.ReportOut.from_model(report)
