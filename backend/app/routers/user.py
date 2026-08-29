from .. import models, schemas, utils, oauth2
from fastapi import Depends, status, HTTPException, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from sqlalchemy.orm import Session

router = APIRouter(   prefix="/users",tags=["users"])

@router.post("/account/create", status_code = status.HTTP_201_CREATED, response_model=schemas.UserOut) ## works as expected
async def create_user(user: schemas.UserBase, db: Session = Depends(get_db)):

    user_exists = db.query(models.User).filter(models.User.email == user.email).first()
    if user_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists, please use a different email")

    user_exists = db.query(models.User).filter(models.User.username == user.username).first()
    if user_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this username already exists, please use a different username")

    user.password = utils.hash_password(user.password)
    # Explicitly set role here rather than leaning on the DB's server_default -
    # avoids SQLAlchemy's post-insert "eager default fetch" round-trip for this column entirely.
    db_user = models.User(**user.dict(), role=models.UserRole.COMMUNITY_MEMBER)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=schemas.Token)
async def login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Username + password login. Returns a JWT carrying the user's id and role."""
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not utils.verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid username or password",
        )
    access_token = oauth2.create_access_token(data={"user_id": user.id, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
async def get_current_user_info(current_user: models.User = Depends(oauth2.get_current_user)):
    return current_user


@router.get("/{user_id}", status_code = status.HTTP_200_OK, response_model=schemas.UserOut)##go to go
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.get("/accounts/all", status_code = status.HTTP_200_OK, response_model=list[schemas.UserOut])##go to go
async def get_all_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id).offset(skip).limit(limit).all()
    return users


def _require_admin(current_user: models.User = Depends(oauth2.get_current_user), db: Session = Depends(get_db)) -> models.User:
    if current_user.role == models.UserRole.ADMIN:
        return current_user
    # Bootstrap: a brand-new database has zero admins, so nobody could ever call this
    # endpoint otherwise. Until the first admin exists, any logged-in user may promote
    # (including themselves) - close this off in production once you have a real admin.
    admin_exists = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).first()
    if admin_exists is None:
        return current_user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.patch("/{user_id}/role", status_code=status.HTTP_200_OK, response_model=schemas.UserOut)
async def update_user_role(
    user_id: int,
    update: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(_require_admin),
):
    """Admin promotes/demotes a user's role. Everyone signs up as community_member;
    this is the only way researcher/admin accounts get created."""
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db_user.role = update.role
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/account/update",  status_code = status.HTTP_200_OK)#go to go
async def update_user(user: schemas.UserBase, user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db_user.email = user.email
    db_user.password = user.password
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/account/delete", status_code = status.HTTP_200_OK)## go to go
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

    