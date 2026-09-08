
## this was used at the beginning of the project to create a post, but it is not used anymore. It is kept here for reference.
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..schemas import posts as post_schemas

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_post(post: post_schemas.PostCreate, db: Session = Depends(get_db)):
    db_post = models.Post(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

