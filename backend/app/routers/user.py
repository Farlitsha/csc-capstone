import os
import re
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from .. import models, schemas, utils, oauth2, audit
from fastapi import Depends, status, HTTPException, APIRouter, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])

# avatar upload directory and allowed file types/sizes
AVATAR_DIR = Path("uploads/avatars")
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


def _generate_username(display_name: str, db: Session) -> str:
    """Turn a display name into a unique username, e.g. 'Nomvula Khumalo' -> 'nomvula_khumalo_3'."""
    base = re.sub(r"[^a-z0-9]+", "_", display_name.lower().strip()).strip("_") or "user"
    candidate = base
    counter = 1
    while db.query(models.User).filter(models.User.username == candidate).first():
        candidate = f"{base}_{counter}"
        counter += 1
    return candidate


# User account management endpoints (registration, login, profile updates)

@router.post("/account/create", status_code=status.HTTP_201_CREATED, response_model=schemas.UserOut)
async def create_user(user: schemas.UserBase, db: Session = Depends(get_db)):
    """Register a new user account. Role can be selected (defaults to community_member).
    Researcher accounts are set to pending verification (Req 1.1, 1.5, 12).
    """
    chosen_role = user.role or models.UserRole.COMMUNITY_MEMBER
    verification_status = (
        models.VerificationStatus.PENDING
        if chosen_role == models.UserRole.RESEARCHER
        else models.VerificationStatus.NONE
    )

    user_dict = user.dict()
    user_dict["password"] = utils.hash_password(user.password)
    user_dict["role"] = chosen_role
    user_dict["verification_status"] = verification_status

    # Normalize empty strings to None so they don't trigger unique constraint errors or invalid entries
    email_val = user_dict.get("email")
    user_dict["email"] = email_val.strip() if (email_val and email_val.strip()) else None

    phone_val = user_dict.get("phone")
    user_dict["phone"] = phone_val.strip() if (phone_val and phone_val.strip()) else None

    display_name_val = user_dict.get("display_name")
    user_dict["display_name"] = display_name_val.strip() if (display_name_val and display_name_val.strip()) else None

    username_val = user_dict.get("username")
    user_dict["username"] = username_val.strip() if (username_val and username_val.strip()) else None

    # Check unique email only if an email is provided
    if user_dict["email"] and db.query(models.User).filter(models.User.email == user_dict["email"]).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="User with this email already exists, please use a different email")

    # Check unique username only if a username is explicitly provided
    if user_dict["username"] and db.query(models.User).filter(models.User.username == user_dict["username"]).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="User with this username already exists, please use a different username")

    # Auto-generate a username from display_name if none was provided
    if not user_dict.get("username"):
        name_source = user_dict.get("display_name") or user_dict.get("email") or "user"
        user_dict["username"] = _generate_username(name_source, db)

    # Sanitize struggles — the frontend may send the string "null" instead of None
    if user_dict.get("struggles") in (None, "null", "", []):
        user_dict["struggles"] = None

    db_user = models.User(**user_dict)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/account/reactivate", response_model=schemas.Token)
async def reactivate_account(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Reactivate a deactivated account with username/email + PIN."""
    user = db.query(models.User).filter(
        (models.User.username == credentials.username) |
        (models.User.display_name == credentials.username) |
        (models.User.email == credentials.username)
    ).first()
    if not user or not utils.verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.is_active = True
    audit.log_action(
        db,
        actor_id=user.id,
        action="user_reactivated",
        target_type="user",
        target_id=user.id,
        details={"username": user.username, "role": user.role.value},
    )
    db.commit()
    db.refresh(user)
    access_token = oauth2.create_access_token(data={"user_id": user.id, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
async def login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with Full Name, username, or email + password. Returns a JWT."""
    user = db.query(models.User).filter(
        (models.User.username == credentials.username) |
        (models.User.display_name == credentials.username) |
        (models.User.email == credentials.username)
    ).first()
    if not user or not utils.verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Full Name/username or PIN",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.role == models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts must sign in via the Admin Login portal at /admin/login.",
        )
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is currently deactivated. Please reactivate your account to sign in.",
        )
    access_token = oauth2.create_access_token(data={"user_id": user.id, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/admin/login", response_model=schemas.Token)
@router.post("/admin-login", response_model=schemas.Token)
async def admin_login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Admin-specific login with username/email/name + password. Strictly requires ADMIN role."""
    user = db.query(models.User).filter(
        (models.User.username == credentials.username) |
        (models.User.display_name == credentials.username) |
        (models.User.email == credentials.username)
    ).first()
    if not user or not utils.verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Administrator credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only administrators are authorized to sign in through this portal.",
        )
    access_token = oauth2.create_access_token(data={"user_id": user.id, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}

## Authenticated user endpoints (view/update own profile, upload avatar)
@router.get("/me", response_model=schemas.PrivateProfileOut)
async def get_current_user_info(current_user: models.User = Depends(oauth2.get_current_user)):
    """Return the authenticated user's full private profile."""
    return current_user


@router.patch("/me/profile", status_code=status.HTTP_200_OK, response_model=schemas.PrivateProfileOut)
async def update_profile(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Update the authenticated user's display name, bio, and contact details."""
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    if "phone" in update_data and "contact_phone" not in update_data:
        current_user.contact_phone = update_data["phone"]
    elif "contact_phone" in update_data and "phone" not in update_data:
        current_user.phone = update_data["contact_phone"]
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", status_code=status.HTTP_200_OK, response_model=schemas.PrivateProfileOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Upload or replace the authenticated user's profile picture.
    Accepts JPEG, PNG, or WebP images up to 2 MB.
    The avatar is publicly accessible at the returned avatar_url.
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{file.content_type}'. Please upload a JPEG, PNG, or WebP image.",
        )

    # Read and size-check the upload
    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 2 MB or smaller.",
        )

    # Derive a stable filename from the user id so re-uploading replaces the old file
    ext = file.content_type.split("/")[-1]   # jpeg | png | webp
    if ext == "jpeg":
        ext = "jpg"
    filename = f"{current_user.id}.{ext}"
    dest = AVATAR_DIR / filename

    # Remove any previous avatar files for this user (different extension)
    for old in AVATAR_DIR.glob(f"{current_user.id}.*"):
        old.unlink(missing_ok=True)

    with open(dest, "wb") as f:
        f.write(contents)

    # Store a relative URL that maps to the FastAPI /uploads static mount
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/request-researcher", status_code=status.HTTP_200_OK, response_model=schemas.PrivateProfileOut)
async def request_researcher_upgrade(
    payload: schemas.ResearcherApplicationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member applies to become a verified researcher."""
    if current_user.role == models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators already have full privileges.")
    if current_user.role == models.UserRole.RESEARCHER and current_user.verification_status == models.VerificationStatus.VERIFIED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already a verified researcher.")
    if current_user.verification_status == models.VerificationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your researcher application is already under review.")

    if payload.phone and payload.phone.strip():
        phone_val = payload.phone.strip()
        current_user.phone = phone_val
        current_user.contact_phone = phone_val

    # Check if previously verified researcher re-applying within the 6-month grace period (180 days)
    six_months = timedelta(days=180)
    now = datetime.now(timezone.utc)
    auto_restore = False

    if getattr(current_user, "researcher_downgraded_at", None) is not None:
        downgraded_at = current_user.researcher_downgraded_at
        if downgraded_at.tzinfo is None:
            downgraded_at = downgraded_at.replace(tzinfo=timezone.utc)
        if (now - downgraded_at) <= six_months:
            auto_restore = True

    if auto_restore:
        current_user.role = models.UserRole.RESEARCHER
        current_user.verification_status = models.VerificationStatus.VERIFIED
        current_user.researcher_downgraded_at = None

        audit.log_action(
            db,
            actor_id=current_user.id,
            action="researcher_auto_restored_within_grace_period",
            target_type="user",
            target_id=current_user.id,
            details={
                "username": current_user.username,
                "phone": current_user.phone or current_user.contact_phone,
                "email": current_user.email,
                "reason": "Re-applied within 6 months of voluntary downgrade - auto-verified without admin review",
            },
        )
        db.commit()
        db.refresh(current_user)
        return current_user

    current_user.role = models.UserRole.RESEARCHER
    current_user.verification_status = models.VerificationStatus.PENDING
    current_user.researcher_downgraded_at = None

    audit.log_action(
        db,
        actor_id=current_user.id,
        action="researcher_application_submitted",
        target_type="user",
        target_id=current_user.id,
        details={
            "username": current_user.username,
            "phone": current_user.phone or current_user.contact_phone,
            "email": current_user.email,
        },
    )

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/downgrade", status_code=status.HTTP_200_OK, response_model=schemas.PrivateProfileOut)
async def downgrade_to_community_member(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Researcher downgrades their account back to a standard community member.
    If verified, researcher data is preserved for 6 months (hidden from public)
    and allows auto-restoration without admin review if re-applying within 6 months.
    """
    if current_user.role == models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator accounts cannot be downgraded through this endpoint.",
        )
    if current_user.role == models.UserRole.COMMUNITY_MEMBER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a community member.",
        )

    # If verified researcher, start the 6-month retention grace period timestamp
    if current_user.verification_status == models.VerificationStatus.VERIFIED:
        current_user.researcher_downgraded_at = datetime.now(timezone.utc)
    else:
        current_user.researcher_downgraded_at = None

    current_user.role = models.UserRole.COMMUNITY_MEMBER
    current_user.verification_status = models.VerificationStatus.NONE

    audit.log_action(
        db,
        actor_id=current_user.id,
        action="researcher_downgraded_to_community",
        target_type="user",
        target_id=current_user.id,
        details={
            "username": current_user.username,
            "previous_role": "researcher",
            "new_role": "community_member",
            "grace_period_months": 6 if current_user.researcher_downgraded_at else 0,
        },
    )

    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Deactivate the authenticated user's account (community member or researcher)."""
    if current_user.role == models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator accounts cannot be deactivated.",
        )
    current_user.is_active = False
    audit.log_action(
        db,
        actor_id=current_user.id,
        action="user_deactivated",
        target_type="user",
        target_id=current_user.id,
        details={"username": current_user.username, "role": current_user.role.value},
    )
    db.commit()
    return {"message": "Account deactivated successfully"}


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Delete the authenticated user's account and all associated data."""
    if current_user.role == models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator accounts cannot be deleted through self-service.",
        )
    return await delete_user(user_id=current_user.id, db=db, current_user=current_user)


# Admin / management endpoints
# NOTE: these fixed-path routes MUST be registered before /{user_id} so FastAPI
# does not accidentally try to parse "admin" or "accounts" as an integer user_id.

@router.get("/admin-bootstrap-status", status_code=status.HTTP_200_OK)
async def get_admin_bootstrap_status(db: Session = Depends(get_db)):
    """Check whether an admin already exists on the platform. Bootstrap is permanently disabled."""
    admin_exists = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).first() is not None
    return {"admin_exists": admin_exists, "can_bootstrap_admin": False}


@router.get("/admin/stats", status_code=status.HTTP_200_OK, response_model=schemas.AdminStatsOut)
async def get_admin_stats(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin views platform summary statistics."""
    total_users = db.query(models.User).count()
    researchers = db.query(models.User).filter(models.User.role == models.UserRole.RESEARCHER).count()
    admins = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).count()
    community_members = db.query(models.User).filter(models.User.role == models.UserRole.COMMUNITY_MEMBER).count()
    flagged_listings = db.query(models.Report).count()
    total_services = db.query(models.Service).count()
    total_studies = db.query(models.StudyListing).count()
    total_workshops = db.query(models.Workshop).count()
    total_workshop_registrations = db.query(models.WorkshopRegistration).count()

    return schemas.AdminStatsOut(
        total_users=total_users,
        researchers=researchers,
        admins=admins,
        community_members=community_members,
        flagged_listings=flagged_listings,
        total_services=total_services,
        total_studies=total_studies,
        total_workshops=total_workshops,
        total_workshop_registrations=total_workshop_registrations,
    )


@router.get("/accounts/all", status_code=status.HTTP_200_OK, response_model=list[schemas.UserOut])
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin views all accounts (Req 13.1, 13.4)."""
    users = db.query(models.User).order_by(models.User.id).offset(skip).limit(limit).all()
    return users


@router.get("/admin/researchers/pending", status_code=status.HTTP_200_OK, response_model=list[schemas.UserOut])
async def list_pending_researchers(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin views list of pending researcher accounts (Req 12.3)."""
    return (
        db.query(models.User)
        .filter(
            models.User.role == models.UserRole.RESEARCHER,
            models.User.verification_status == models.VerificationStatus.PENDING,
        )
        .order_by(models.User.time.desc())
        .all()
    )


@router.patch("/admin/researchers/{user_id}/approve", status_code=status.HTTP_200_OK, response_model=schemas.UserOut)
async def approve_researcher(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin approves a pending researcher account (Req 12.1)."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if db_user.role != models.UserRole.RESEARCHER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a researcher")
    
    db_user.verification_status = models.VerificationStatus.VERIFIED
    audit.log_action(
        db,
        actor_id=_admin.id,
        action="researcher_approved",
        target_type="user",
        target_id=user_id,
        details={"username": db_user.username, "display_name": db_user.display_name},
    )
    db.commit()
    db.refresh(db_user)
    return db_user


@router.patch("/admin/researchers/{user_id}/reject", status_code=status.HTTP_200_OK, response_model=schemas.UserOut)
async def reject_researcher(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(oauth2.require_admin),
):
    """Admin rejects a pending researcher account (Req 12.2)."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if db_user.role != models.UserRole.RESEARCHER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a researcher")
    
    db_user.verification_status = models.VerificationStatus.REJECTED
    audit.log_action(
        db,
        actor_id=_admin.id,
        action="researcher_rejected",
        target_type="user",
        target_id=user_id,
        details={"username": db_user.username, "display_name": db_user.display_name},
    )
    db.commit()
    db.refresh(db_user)
    return db_user



def _require_admin(current_user: models.User = Depends(oauth2.get_current_user)) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.patch("/{user_id}/role", status_code=status.HTTP_200_OK, response_model=schemas.UserOut)
async def update_user_role(
    user_id: int,
    update: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(_require_admin),
):
    """Admin promotes/demotes a user's role."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if db_user.role == models.UserRole.ADMIN and update.role != models.UserRole.ADMIN:
        admin_count = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).count()
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote the sole administrator on the platform")

    old_role = db_user.role.value
    db_user.role = update.role
    audit.log_action(
        db,
        actor_id=_admin.id,
        action="user_role_updated",
        target_type="user",
        target_id=user_id,
        details={"username": db_user.username, "old_role": old_role, "new_role": update.role.value},
    )
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/account/update", status_code=status.HTTP_200_OK, response_model=schemas.PrivateProfileOut)
async def update_account_credentials(
    user: schemas.UserBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),  # auth guard added
):
    """Update the authenticated user's login email and password."""
    current_user.email = user.email
    current_user.password = utils.hash_password(user.password)
    db.commit()
    db.refresh(current_user)
    return current_user


# Public profile (other users)

@router.get("/{user_id}", status_code=status.HTTP_200_OK, response_model=schemas.PublicProfileOut)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _current_user: models.User = Depends(oauth2.get_current_user),
):
    """Return the public profile of any user (display name, bio, avatar only).
    Requires authentication so anonymous visitors cannot enumerate profiles.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Admin or the user themselves can delete an account."""
    if current_user.id != user_id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this user")

    # Safety check: Cannot delete your own active admin account from the admin console
    if current_user.role == models.UserRole.ADMIN and current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own active administrator account")

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Safety check: Prevent deleting the only administrator
    if db_user.role == models.UserRole.ADMIN:
        admin_count = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).count()
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the sole administrator on the platform")

    # Clean up avatar file if present
    if db_user.avatar_url:
        avatar_path = Path(db_user.avatar_url.lstrip("/"))
        avatar_path.unlink(missing_ok=True)

    audit.log_action(
        db,
        actor_id=None if current_user.id == user_id else current_user.id,
        action="user_deleted",
        target_type="user",
        target_id=user_id,
        details={
            "username": db_user.username,
            "role": db_user.role.value,
            "deleted_by_admin": current_user.role == models.UserRole.ADMIN,
            "self_deleted": current_user.id == user_id,
        },
    )

    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}