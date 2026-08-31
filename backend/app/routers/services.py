from typing import List, Optional
from fastapi import Depends, status, HTTPException, APIRouter
from sqlalchemy.orm import Session
from .. import models, schemas, oauth2
from ..database import get_db

router = APIRouter(prefix="/services", tags=["services"])


@router.get("/", response_model=List[schemas.ServiceOut])
async def list_services(
    category: Optional[str] = None,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Browse open service listings, optionally filtered by category and/or a title search."""
    q = (
        db.query(models.Service, models.User.username, models.User.display_name, models.User.avatar_url)
        .join(models.User, models.Service.poster_id == models.User.id)
        .filter(models.Service.status == models.ServiceStatus.OPEN)
    )
    if category and category.lower() != "all":
        q = q.filter(models.Service.category == category)
    if query:
        q = q.filter(models.Service.title.ilike(f"%{query}%"))
    rows = q.order_by(models.Service.created_at.desc()).all()
    return [
        schemas.ServiceOut(
            **{c.key: getattr(service, c.key) for c in models.Service.__table__.columns},
            poster_username=username,
            poster_display_name=display_name,
            poster_avatar_url=avatar_url,
        )
        for service, username, display_name, avatar_url in rows
    ]


@router.post("/", response_model=schemas.ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    service: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Any logged-in member posts a service (offer or request)."""
    db_service = models.Service(**service.dict(), poster_id=current_user.id, status=models.ServiceStatus.OPEN)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.get("/admin/reports", response_model=List[schemas.ReportOut])
async def list_reports(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin views all reported / flagged service listings."""
    rows = (
        db.query(models.Report, models.Service.title, models.Service.description, models.User.username)
        .join(models.Service, models.Report.service_id == models.Service.id)
        .join(models.User, models.Report.reporter_id == models.User.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    return [
        schemas.ReportOut(
            id=report.id,
            service_id=report.service_id,
            service_title=title,
            service_description=description,
            reporter_id=report.reporter_id,
            reporter_username=username,
            reason=report.reason,
            created_at=report.created_at,
        )
        for report, title, description, username in rows
    ]


@router.delete("/admin/reports/{report_id}", status_code=status.HTTP_200_OK)
async def dismiss_report(
    report_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin dismisses a report from the moderation queue."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report dismissed successfully"}


@router.get("/{service_id}", response_model=schemas.ServiceOut)
async def get_service(service_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(models.Service, models.User.username, models.User.display_name, models.User.avatar_url)
        .join(models.User, models.Service.poster_id == models.User.id)
        .filter(models.Service.id == service_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    service, username, display_name, avatar_url = row
    return schemas.ServiceOut(
        **{c.key: getattr(service, c.key) for c in models.Service.__table__.columns},
        poster_username=username,
        poster_display_name=display_name,
        poster_avatar_url=avatar_url,
    )



@router.patch("/{service_id}/close", response_model=schemas.ServiceOut)
async def close_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Poster takes their listing down once it's no longer needed."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    if service.poster_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster or an admin can close this listing")
    service.status = models.ServiceStatus.CLOSED
    db.commit()
    db.refresh(service)
    return service


@router.post("/{service_id}/apply", response_model=schemas.ServiceApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_service(
    service_id: int,
    application: schemas.ServiceApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Member expresses interest in / applies to a service listing."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    if service.status != models.ServiceStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This listing is no longer open")
    if service.poster_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't apply to your own listing")

    already_applied = db.query(models.ServiceApplication).filter(
        models.ServiceApplication.service_id == service_id,
        models.ServiceApplication.applicant_id == current_user.id,
    ).first()
    if already_applied:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You've already applied to this listing")

    db_application = models.ServiceApplication(
        service_id=service_id,
        applicant_id=current_user.id,
        message=application.message,
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.get("/{service_id}/applicants", response_model=List[schemas.ServiceApplicationOut])
async def get_service_applicants(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Poster views everyone who has applied to their listing."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    if service.poster_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster or an admin can view applicants")
    return db.query(models.ServiceApplication).filter(models.ServiceApplication.service_id == service_id).all()


@router.post("/{service_id}/report", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
async def report_service(
    service_id: int,
    report_in: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member reports a service listing with a reason."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    
    if not report_in.reason or not report_in.reason.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A reason is required to report a listing")

    existing_report = db.query(models.Report).filter(
        models.Report.service_id == service_id,
        models.Report.reporter_id == current_user.id,
    ).first()
    if existing_report:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already reported this listing")

    report = models.Report(
        service_id=service_id,
        reporter_id=current_user.id,
        reason=report_in.reason.strip(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return schemas.ReportOut(
        id=report.id,
        service_id=service.id,
        service_title=service.title,
        service_description=service.description,
        reporter_id=current_user.id,
        reporter_username=current_user.username,
        reason=report.reason,
        created_at=report.created_at,
    )


@router.delete("/{service_id}", status_code=status.HTTP_200_OK)
async def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Poster or Admin permanently deletes a service listing."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    if service.poster_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster or an admin can delete this listing")
    db.delete(service)
    db.commit()
    return {"message": "Service listing deleted successfully"}

