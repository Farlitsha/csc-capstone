from typing import List
from fastapi import Depends, status, HTTPException, APIRouter
from sqlalchemy.orm import Session
from .. import models, schemas, oauth2, audit
from ..database import get_db

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("/", response_model=List[schemas.AnnouncementOut])
async def list_announcements(
    db: Session = Depends(get_db),
):
    """Retrieve all platform announcements in reverse chronological order."""
    rows = (
        db.query(models.Announcement, models.User.username)
        .join(models.User, models.Announcement.author_id == models.User.id)
        .order_by(models.Announcement.created_at.desc(), models.Announcement.id.desc())
        .limit(20)
        .all()
    )
    return [
        schemas.AnnouncementOut(
            id=announcement.id,
            author_id=announcement.author_id,
            author_username=username,
            audience=announcement.audience,
            content=announcement.content,
            created_at=announcement.created_at,
        )
        for announcement, username in rows
    ]


@router.post("/", response_model=schemas.AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(oauth2.require_admin),
):
    """Admin broadcasts a new platform announcement."""
    if not announcement.content or not announcement.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Announcement content cannot be empty")

    db_announcement = models.Announcement(
        author_id=admin_user.id,
        audience=announcement.audience,
        content=announcement.content.strip(),
    )
    db.add(db_announcement)
    db.flush()

    audit.log_action(
        db,
        actor_id=admin_user.id,
        action="announcement_created",
        target_type="announcement",
        target_id=db_announcement.id,
        details={"audience": db_announcement.audience, "preview": db_announcement.content[:60]},
    )

    db.commit()
    db.refresh(db_announcement)

    return schemas.AnnouncementOut(
        id=db_announcement.id,
        author_id=admin_user.id,
        author_username=admin_user.username,
        audience=db_announcement.audience,
        content=db_announcement.content,
        created_at=db_announcement.created_at,
    )


@router.delete("/{announcement_id}", status_code=status.HTTP_200_OK)
async def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(oauth2.require_admin),
):
    """Admin deletes an announcement."""
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Announcement {announcement_id} not found")

    audit.log_action(
        db,
        actor_id=admin_user.id,
        action="announcement_deleted",
        target_type="announcement",
        target_id=announcement_id,
        details={"audience": announcement.audience, "preview": announcement.content[:60]},
    )

    db.delete(announcement)
    db.commit()
    return {"message": "Announcement deleted successfully"}

