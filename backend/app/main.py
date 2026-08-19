from typing import List
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



@app.post("/studies/", response_model=schemas.StudyListingOut, status_code=status.HTTP_201_CREATED)
async def create_study(study: schemas.StudyListingCreate, db: Session = Depends(get_db)):
    """A researcher posts a new study/survey listing. no draft flow yet"""
    researcher = db.query(models.User).filter(models.User.id == study.researcher_id).first()
    if not researcher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Researcher account not found")
    if researcher.role != models.UserRole.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only accounts with the researcher role can post study listings"
        )

    db_study = models.StudyListing(**study.dict(), state=models.StudyState.LIVE)
    db.add(db_study)
    db.commit()
    db.refresh(db_study)
    return db_study


@app.get("/studies/", response_model=List[schemas.StudyListingOut])
async def list_studies(db: Session = Depends(get_db)):
    """Browse all currently open (live) studies."""
    return db.query(models.StudyListing).filter(models.StudyListing.state == models.StudyState.LIVE).all()


@app.get("/studies/{study_id}", response_model=schemas.StudyListingOut)
async def get_study(study_id: int, db: Session = Depends(get_db)):
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    return study


@app.patch("/studies/{study_id}/close", response_model=schemas.StudyListingOut)
async def close_study(study_id: int, db: Session = Depends(get_db)):
    """Researcher takes down a study once they have enough responses (backlog item 15: survey teardown)."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    study.state = models.StudyState.CLOSED
    db.commit()
    db.refresh(study)
    return study



@app.post("/studies/{study_id}/apply", response_model=schemas.ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_study(study_id: int, application: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    """Community member applies/opts in to a study. Enforces: study is live, no duplicate applications,
    and respects the participant_limit if the researcher set one."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")

    if study.state != models.StudyState.LIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This study is not currently accepting participants")

    already_applied = db.query(models.Application).filter(
        models.Application.study_id == study_id,
        models.Application.user_id == application.user_id
    ).first()
    if already_applied:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already applied to this study")

    if study.participant_limit is not None:
        accepted_count = db.query(models.Application).filter(
            models.Application.study_id == study_id,
            models.Application.status == models.ApplicationStatus.ACCEPTED
        ).count()
        if accepted_count >= study.participant_limit:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This study has reached its participant limit")

    db_application = models.Application(study_id=study_id, user_id=application.user_id)
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@app.get("/studies/{study_id}/applicants", response_model=List[schemas.ApplicationOut])
async def get_applicants(study_id: int, db: Session = Depends(get_db)):
    """Researcher views everyone who has applied to their study, with current status."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    return db.query(models.Application).filter(models.Application.study_id == study_id).all()


@app.patch("/applications/{application_id}", response_model=schemas.ApplicationOut)
async def update_application_status(
    application_id: int,
    update: schemas.ApplicationStatusUpdate,
    db: Session = Depends(get_db)
):
    """Researcher accepts or declines an applicant (backlog item: applicant view / opt-in)."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {application_id} not found")
    application.status = update.status
    db.commit()
    db.refresh(application)
    return application

