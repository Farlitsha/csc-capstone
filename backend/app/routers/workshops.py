from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from .. import models, schemas, oauth2
from ..database import get_db

router = APIRouter(prefix="/workshops", tags=["workshops"])


@router.post("/", response_model=schemas.WorkshopOut, status_code=status.HTTP_201_CREATED)
async def create_workshop(
    workshop: schemas.WorkshopCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Verified Researcher or Admin schedules a new workshop (Req 9.1, 9.4).
    Validates future date and positive participant count.
    """
    if current_user.role not in (models.UserRole.RESEARCHER, models.UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only researchers and administrators can schedule workshops",
        )

    if current_user.role == models.UserRole.RESEARCHER and current_user.verification_status != models.VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researcher account is pending admin verification",
        )

    db_workshop = models.Workshop(
        organizer_id=current_user.id,
        title=workshop.title.strip(),
        description=workshop.description.strip(),
        location=workshop.location.strip(),
        date_time=workshop.date_time,
        max_participants=workshop.max_participants,
        status=models.WorkshopStatus.SCHEDULED,
    )
    db.add(db_workshop)
    db.commit()
    db.refresh(db_workshop)

    return schemas.WorkshopOut(
        id=db_workshop.id,
        organizer_id=db_workshop.organizer_id,
        title=db_workshop.title,
        description=db_workshop.description,
        location=db_workshop.location,
        date_time=db_workshop.date_time,
        max_participants=db_workshop.max_participants,
        status=db_workshop.status,
        created_at=db_workshop.created_at,
        organizer_username=current_user.username,
        organizer_display_name=current_user.display_name,
        registered_count=0,
        is_registered=False,
    )


@router.get("/", response_model=List[schemas.WorkshopOut])
async def list_workshops(
    include_cancelled: bool = False,
    organizer_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Browse scheduled/upcoming workshops, optionally filtered by organizer_id.
    """
    query = (
        db.query(
            models.Workshop,
            models.User.username,
            models.User.display_name,
            func.count(models.WorkshopRegistration.id).label("registered_count"),
        )
        .join(models.User, models.Workshop.organizer_id == models.User.id)
        .outerjoin(models.WorkshopRegistration, models.Workshop.id == models.WorkshopRegistration.workshop_id)
        .filter(
            or_(
                models.User.role == models.UserRole.ADMIN,
                and_(
                    models.User.role == models.UserRole.RESEARCHER,
                    models.User.verification_status == models.VerificationStatus.VERIFIED,
                ),
            )
        )
        .group_by(models.Workshop.id, models.User.username, models.User.display_name)
    )

    if organizer_id is not None:
        query = query.filter(models.Workshop.organizer_id == organizer_id)

    if not include_cancelled:
        query = query.filter(models.Workshop.status == models.WorkshopStatus.SCHEDULED)

    rows = query.order_by(models.Workshop.date_time.asc()).all()

    return [
        schemas.WorkshopOut(
            id=workshop.id,
            organizer_id=workshop.organizer_id,
            title=workshop.title,
            description=workshop.description,
            location=workshop.location,
            date_time=workshop.date_time,
            max_participants=workshop.max_participants,
            status=workshop.status,
            created_at=workshop.created_at,
            organizer_username=username,
            organizer_display_name=display_name,
            registered_count=registered_count,
            is_registered=False,
        )
        for workshop, username, display_name, registered_count in rows
    ]


@router.get("/me/registrations", response_model=List[schemas.MyWorkshopRegistrationOut])
async def get_my_workshop_registrations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Authenticated user views their workshop registrations (Req 10).
    """
    rows = (
        db.query(
            models.WorkshopRegistration,
            models.Workshop.title,
            models.Workshop.description,
            models.Workshop.location,
            models.Workshop.date_time,
            models.Workshop.status,
        )
        .join(models.Workshop, models.WorkshopRegistration.workshop_id == models.Workshop.id)
        .filter(models.WorkshopRegistration.user_id == current_user.id)
        .order_by(models.Workshop.date_time.asc())
        .all()
    )

    return [
        schemas.MyWorkshopRegistrationOut(
            id=reg.id,
            workshop_id=reg.workshop_id,
            registered_at=reg.registered_at,
            workshop_title=title,
            workshop_description=description,
            workshop_location=location,
            workshop_date_time=date_time,
            workshop_status=w_status,
        )
        for reg, title, description, location, date_time, w_status in rows
    ]


@router.get("/{workshop_id}", response_model=schemas.WorkshopOut)
async def get_workshop(
    workshop_id: int,
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a single workshop.
    """
    row = (
        db.query(
            models.Workshop,
            models.User.username,
            models.User.display_name,
            func.count(models.WorkshopRegistration.id).label("registered_count"),
        )
        .join(models.User, models.Workshop.organizer_id == models.User.id)
        .outerjoin(models.WorkshopRegistration, models.Workshop.id == models.WorkshopRegistration.workshop_id)
        .filter(models.Workshop.id == workshop_id)
        .group_by(models.Workshop.id, models.User.username, models.User.display_name)
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workshop {workshop_id} not found",
        )

    workshop, username, display_name, registered_count = row
    return schemas.WorkshopOut(
        id=workshop.id,
        organizer_id=workshop.organizer_id,
        title=workshop.title,
        description=workshop.description,
        location=workshop.location,
        date_time=workshop.date_time,
        max_participants=workshop.max_participants,
        status=workshop.status,
        created_at=workshop.created_at,
        organizer_username=username,
        organizer_display_name=display_name,
        registered_count=registered_count,
        is_registered=False,
    )


@router.patch("/{workshop_id}", response_model=schemas.WorkshopOut)
async def update_workshop(
    workshop_id: int,
    payload: schemas.WorkshopUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Organizer or Admin updates an upcoming workshop's details (Req 9.2).
    """
    workshop = db.query(models.Workshop).filter(models.Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workshop {workshop_id} not found",
        )

    if workshop.organizer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workshop organizer or an administrator can update this workshop",
        )

    if workshop.status == models.WorkshopStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled workshop",
        )

    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(workshop, field, value)

    db.commit()
    db.refresh(workshop)

    registered_count = db.query(models.WorkshopRegistration).filter(
        models.WorkshopRegistration.workshop_id == workshop.id
    ).count()

    return schemas.WorkshopOut(
        id=workshop.id,
        organizer_id=workshop.organizer_id,
        title=workshop.title,
        description=workshop.description,
        location=workshop.location,
        date_time=workshop.date_time,
        max_participants=workshop.max_participants,
        status=workshop.status,
        created_at=workshop.created_at,
        organizer_username=workshop.organizer.username if workshop.organizer else None,
        organizer_display_name=workshop.organizer.display_name if workshop.organizer else None,
        registered_count=registered_count,
    )


@router.patch("/{workshop_id}/cancel", response_model=schemas.WorkshopOut)
async def cancel_workshop(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Organizer or Admin cancels an upcoming workshop (Req 9.3).
    Updates workshop status to cancelled.
    """
    workshop = db.query(models.Workshop).filter(models.Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workshop {workshop_id} not found",
        )

    if workshop.organizer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workshop organizer or an administrator can cancel this workshop",
        )

    workshop.status = models.WorkshopStatus.CANCELLED
    db.commit()
    db.refresh(workshop)

    registered_count = db.query(models.WorkshopRegistration).filter(
        models.WorkshopRegistration.workshop_id == workshop.id
    ).count()

    return schemas.WorkshopOut(
        id=workshop.id,
        organizer_id=workshop.organizer_id,
        title=workshop.title,
        description=workshop.description,
        location=workshop.location,
        date_time=workshop.date_time,
        max_participants=workshop.max_participants,
        status=workshop.status,
        created_at=workshop.created_at,
        organizer_username=workshop.organizer.username if workshop.organizer else None,
        organizer_display_name=workshop.organizer.display_name if workshop.organizer else None,
        registered_count=registered_count,
    )


@router.delete("/{workshop_id}", status_code=status.HTTP_200_OK)
async def delete_workshop(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Organizer or Admin deletes a workshop."""
    workshop = db.query(models.Workshop).filter(models.Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Workshop {workshop_id} not found")
    if workshop.organizer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer or an admin can delete this workshop")
    db.delete(workshop)
    db.commit()
    return {"message": "Workshop deleted successfully"}



@router.post("/{workshop_id}/register", response_model=schemas.WorkshopRegistrationOut, status_code=status.HTTP_201_CREATED)
async def register_for_workshop(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Authenticated community member registers for a workshop (Req 10.1, 10.2, 10.4, 10.5).
    Enforces available capacity, non-cancelled status, and prevents duplicates.
    """
    workshop = db.query(models.Workshop).filter(models.Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workshop {workshop_id} not found",
        )

    if workshop.status != models.WorkshopStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This workshop is not open for registration",
        )

    now = datetime.now(timezone.utc)
    w_date = workshop.date_time if workshop.date_time.tzinfo else workshop.date_time.replace(tzinfo=timezone.utc)
    if w_date <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register for a workshop that has already taken place",
        )

    # Check for duplicate registration (Req 10.4)
    already_registered = db.query(models.WorkshopRegistration).filter(
        models.WorkshopRegistration.workshop_id == workshop_id,
        models.WorkshopRegistration.user_id == current_user.id,
    ).first()
    if already_registered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered for this workshop",
        )

    # Check capacity (Req 10.2)
    current_count = db.query(models.WorkshopRegistration).filter(
        models.WorkshopRegistration.workshop_id == workshop_id
    ).count()
    if current_count >= workshop.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This workshop is fully booked",
        )

    registration = models.WorkshopRegistration(
        workshop_id=workshop_id,
        user_id=current_user.id,
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    return schemas.WorkshopRegistrationOut(
        id=registration.id,
        workshop_id=registration.workshop_id,
        user_id=registration.user_id,
        registered_at=registration.registered_at,
        participant_username=current_user.username,
        participant_display_name=current_user.display_name,
    )


@router.delete("/{workshop_id}/register", status_code=status.HTTP_200_OK)
async def cancel_workshop_registration(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Authenticated member cancels their registration for a workshop (Req 10.3).
    """
    registration = db.query(models.WorkshopRegistration).filter(
        models.WorkshopRegistration.workshop_id == workshop_id,
        models.WorkshopRegistration.user_id == current_user.id,
    ).first()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered for this workshop",
        )

    db.delete(registration)
    db.commit()
    return {"message": "Workshop registration cancelled successfully"}


@router.get("/{workshop_id}/registrations", response_model=List[schemas.WorkshopRegistrationOut])
async def get_workshop_registrations(
    workshop_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """
    Organizer or Admin views all registered participants for a workshop (Req 9).
    """
    workshop = db.query(models.Workshop).filter(models.Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workshop {workshop_id} not found",
        )

    if workshop.organizer_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workshop organizer or an administrator can view registered participants",
        )

    rows = (
        db.query(models.WorkshopRegistration, models.User.username, models.User.display_name)
        .join(models.User, models.WorkshopRegistration.user_id == models.User.id)
        .filter(models.WorkshopRegistration.workshop_id == workshop_id)
        .order_by(models.WorkshopRegistration.registered_at.asc())
        .all()
    )

    return [
        schemas.WorkshopRegistrationOut(
            id=reg.id,
            workshop_id=reg.workshop_id,
            user_id=reg.user_id,
            registered_at=reg.registered_at,
            participant_username=username,
            participant_display_name=display_name,
        )
        for reg, username, display_name in rows
    ]

