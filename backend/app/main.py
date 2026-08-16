from fastapi import FastAPI, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db, Base, engine
from .routers import user

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(user.router)

@app.get("/")
async def check():
    return {"message": "API is running successfully!"}



@app.post("/posts/", status_code = status.HTTP_201_CREATED)
async def create_post(post: schemas.PostCreate, db: Session = Depends(get_db)):
    db_post = models.Post(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post




