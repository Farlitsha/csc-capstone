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
    q = db.query(models.Service).filter(models.Service.status == models.ServiceStatus.OPEN)
    if category and category.lower() != "all":
        q = q.filter(models.Service.category == category)
    if query:
        q = q.filter(models.Service.title.ilike(f"%{query}%"))
    return q.order_by(models.Service.created_at.desc()).all()


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


@router.get("/{service_id}", response_model=schemas.ServiceOut)
async def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    return service


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
