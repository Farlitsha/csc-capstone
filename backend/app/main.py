from fastapi import FastAPI, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db, Base, engine

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
async def check():
    return {"message": "API is running successfully!"}

@app.post("/users/", status_code = status.HTTP_201_CREATED)
async def create_user(user: schemas.UserBase, db: Session = Depends(get_db)):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/posts/", status_code = status.HTTP_201_CREATED)
async def create_post(post: schemas.PostCreate, db: Session = Depends(get_db)):
    db_post = models.Post(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post




