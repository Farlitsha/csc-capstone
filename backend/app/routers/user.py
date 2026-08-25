from .. import models, schemas
from fastapi import Depends, status, HTTPException, APIRouter, APIRouter
from ..database import get_db
from sqlalchemy.orm import Session

router = APIRouter(   prefix="/users",tags=["users"])

@router.post("/account/create", status_code = status.HTTP_201_CREATED) ## works as expected
async def create_user(user: schemas.UserBase, db: Session = Depends(get_db)):

    user_exists = db.query(models.User).filter(models.User.email == user.email).first()
    if user_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists, please use a different email")

    user_exists = db.query(models.User).filter(models.User.username == user.username).first()
    if user_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this username already exists, please use a different username")
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", status_code = status.HTTP_200_OK)##go to go
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.get("/accounts/all", status_code = status.HTTP_200_OK)##go to go
async def get_all_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id).offset(skip).limit(limit).all()
    return users

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

    