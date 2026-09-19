from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas, oauth2, audit
from ..limiter import limiter
from ..database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_admin(current_user: models.User = Depends(oauth2.get_current_user)) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.post("/", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_report(
    request: Request,
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
    
    out_list = []
    for r in reports:
        target_title = None
        if r.target_type == models.ReportTargetType.SERVICE:
            srv = db.query(models.Service).filter(models.Service.id == r.target_id).first()
            target_title = srv.title if srv else "[Deleted Service]"
        elif r.target_type == models.ReportTargetType.STUDY:
            st = db.query(models.StudyListing).filter(models.StudyListing.id == r.target_id).first()
            target_title = st.title if st else "[Deleted Study]"
        elif r.target_type == models.ReportTargetType.USER:
            u = db.query(models.User).filter(models.User.id == r.target_id).first()
            target_title = f"@{u.username}" if u else "[Deleted User]"
        out_list.append(schemas.ReportOut.from_model(r, target_title=target_title))
    return out_list


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

    target_title = None
    if report.target_type == models.ReportTargetType.SERVICE:
        srv = db.query(models.Service).filter(models.Service.id == report.target_id).first()
        target_title = srv.title if srv else "[Deleted Service]"
    elif report.target_type == models.ReportTargetType.STUDY:
        st = db.query(models.StudyListing).filter(models.StudyListing.id == report.target_id).first()
        target_title = st.title if st else "[Deleted Study]"
    elif report.target_type == models.ReportTargetType.USER:
        u = db.query(models.User).filter(models.User.id == report.target_id).first()
        target_title = f"@{u.username}" if u else "[Deleted User]"

    audit.log_action(
        db,
        actor_id=admin.id,
        action=f"report_{update.status.value}",
        target_type=report.target_type.value,
        target_id=report.target_id,
        details={"report_id": report.id, "reason": report.reason, "target_title": target_title},
    )

    db.commit()
    db.refresh(report)
    return schemas.ReportOut.from_model(report, target_title=target_title)


@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(_require_admin),
):
    """Admin permanently deletes a report."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report {report_id} not found")

    audit.log_action(
        db,
        actor_id=admin.id,
        action="report_deleted",
        target_type="report",
        target_id=report.id,
        details={"reason": report.reason, "target_type": report.target_type.value, "target_id": report.target_id},
    )

    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}
