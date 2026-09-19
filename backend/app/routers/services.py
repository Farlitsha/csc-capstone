import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import Depends, status, HTTPException, APIRouter, UploadFile, File, Request
from sqlalchemy.orm import Session, joinedload, selectinload
from pydantic import BaseModel
from .. import models, schemas, oauth2, audit
from ..limiter import limiter
from ..database import get_db

router = APIRouter(prefix="/services", tags=["services"])

SERVICES_UPLOAD_DIR = Path("uploads/services")
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SERVICE_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/upload-photo", status_code=status.HTTP_200_OK)
async def upload_service_photo(
    file: UploadFile = File(...),
    _current_user: models.User = Depends(oauth2.get_current_user),
):
    """Upload a photo for a service listing. Accepts JPEG, PNG, or WebP up to 5 MB."""
    SERVICES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{file.content_type}'. Please upload a JPEG, PNG, or WebP image.",
        )

    contents = await file.read()
    if len(contents) > MAX_SERVICE_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 5 MB or smaller.",
        )

    ext = file.content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    filename = f"service_{uuid.uuid4().hex[:12]}.{ext}"
    dest = SERVICES_UPLOAD_DIR / filename

    with open(dest, "wb") as f:
        f.write(contents)

    return {"image_url": f"/uploads/services/{filename}", "image_size": len(contents)}


@router.get("/", response_model=List[schemas.ServiceOut])
async def list_services(
    category: Optional[str] = None,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Browse open service listings, optionally filtered by category and/or a title search.

    Poster contact details are included on each listing so interested members
    can reach out directly to work out the details, rather than applying
    through the platform.
    """

    # q is query object, not a list of results yet. We can add filters to it before executing it.
    q = db.query(models.Service).options(
        joinedload(models.Service.poster),
        selectinload(models.Service.ratings),
    ).filter(
        models.Service.status == models.ServiceStatus.OPEN
    )
    if category and category.lower() != "all":
        q = q.filter(models.Service.category == category)
    if query:
        q = q.filter(models.Service.title.ilike(f"%{query}%"))
    return q.order_by(models.Service.created_at.desc(), models.Service.id.desc()).all()


@router.post("/", response_model=schemas.ServiceOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
async def create_service(
    request: Request,
    service: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Any logged-in member posts a service (offer or request)."""
    # Bot prevention: honeypot & timing heuristic
    if service.website_hp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Spam submission detected")
    if service.submission_duration_ms is not None and service.submission_duration_ms < 1200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Spam submission detected")

    service_dict = service.dict(exclude={"website_hp", "submission_duration_ms"})
    db_service = models.Service(**service_dict, poster_id=current_user.id, status=models.ServiceStatus.OPEN)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service


@router.get("/{service_id}", response_model=schemas.ServiceOut)
async def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(models.Service).options(
        joinedload(models.Service.poster),
        selectinload(models.Service.ratings),
    ).filter(
        models.Service.id == service_id
    ).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    return service



@router.put("/{service_id}", response_model=schemas.ServiceOut)
@router.patch("/{service_id}", response_model=schemas.ServiceOut)
async def update_service(
    service_id: int,
    service_in: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Poster or Admin edits an existing service listing."""
    service = db.query(models.Service).options(joinedload(models.Service.poster)).filter(
        models.Service.id == service_id
    ).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")
    if service.poster_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the poster or an admin can edit this listing")

    service.title = service_in.title
    service.category = service_in.category
    service.type = service_in.type
    service.description = service_in.description
    service.price = service_in.price
    if service_in.image_url is not None:
        service.image_url = service_in.image_url
        service.image_size = service_in.image_size

    audit.log_action(
        db,
        actor_id=current_user.id,
        action="service_updated",
        target_type="service",
        target_id=service.id,
        details={"title": service.title, "updated_by_admin": current_user.role == models.UserRole.ADMIN},
    )
    db.commit()
    db.refresh(service)
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
    audit.log_action(
        db,
        actor_id=current_user.id,
        action="service_closed",
        target_type="service",
        target_id=service.id,
        details={"title": service.title, "closed_by_admin": current_user.role == models.UserRole.ADMIN},
    )
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
    audit.log_action(
        db,
        actor_id=current_user.id,
        action="service_deleted",
        target_type="service",
        target_id=service.id,
        details={"title": service.title, "deleted_by_admin": current_user.role == models.UserRole.ADMIN},
    )
    db.delete(service)
    db.commit()
    return {"message": "Service listing deleted successfully"}


class ServiceReportPayload(BaseModel):
    reason: str


@router.post("/{service_id}/report", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
async def report_service(
    service_id: int,
    payload: ServiceReportPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Flag a service listing for admin review."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")

    report = models.Report(
        reporter_id=current_user.id,
        target_type=models.ReportTargetType.SERVICE,
        target_id=service_id,
        reason=payload.reason.strip(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return schemas.ReportOut.from_model(report, target_title=service.title)


@router.post("/{service_id}/ratings", response_model=schemas.ServiceRatingOut, status_code=status.HTTP_200_OK)
async def rate_service(
    service_id: int,
    rating_in: schemas.ServiceRatingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member rates and reviews a service listing (1-5 stars, optional comment)."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")

    if service.poster_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot rate your own service listing")

    existing_rating = db.query(models.ServiceRating).filter(
        models.ServiceRating.service_id == service_id,
        models.ServiceRating.user_id == current_user.id,
    ).first()

    if existing_rating:
        existing_rating.score = rating_in.score
        existing_rating.comment = rating_in.comment.strip() if rating_in.comment else None
        audit.log_action(
            db,
            actor_id=current_user.id,
            action="service_rating_updated",
            target_type="service",
            target_id=service_id,
            details={"score": rating_in.score, "has_comment": bool(rating_in.comment)},
        )
        db.commit()
        db.refresh(existing_rating)
        return existing_rating
    else:
        new_rating = models.ServiceRating(
            service_id=service_id,
            user_id=current_user.id,
            score=rating_in.score,
            comment=rating_in.comment.strip() if rating_in.comment else None,
        )
        db.add(new_rating)
        audit.log_action(
            db,
            actor_id=current_user.id,
            action="service_rated",
            target_type="service",
            target_id=service_id,
            details={"score": rating_in.score, "has_comment": bool(rating_in.comment)},
        )
        db.commit()
        db.refresh(new_rating)
        return new_rating


@router.get("/{service_id}/ratings", response_model=schemas.ServiceRatingsSummaryOut)
async def get_service_ratings(service_id: int, db: Session = Depends(get_db)):
    """Fetch peer reviews and rating summary for a service listing."""
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service {service_id} not found")

    ratings = (
        db.query(models.ServiceRating)
        .options(joinedload(models.ServiceRating.user))
        .filter(models.ServiceRating.service_id == service_id)
        .order_by(models.ServiceRating.created_at.desc())
        .all()
    )

    avg = round(sum(r.score for r in ratings) / len(ratings), 1) if ratings else None
    return schemas.ServiceRatingsSummaryOut(
        average_rating=avg,
        total_ratings=len(ratings),
        ratings=ratings,
    )


@router.delete("/{service_id}/ratings/mine", status_code=status.HTTP_200_OK)
async def delete_my_service_rating(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Member removes their previous rating for a service listing."""
    rating = db.query(models.ServiceRating).filter(
        models.ServiceRating.service_id == service_id,
        models.ServiceRating.user_id == current_user.id,
    ).first()
    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You haven't rated this service")

    audit.log_action(
        db,
        actor_id=current_user.id,
        action="service_rating_deleted",
        target_type="service",
        target_id=service_id,
    )
    db.delete(rating)
    db.commit()
    return {"message": "Rating deleted successfully"}


