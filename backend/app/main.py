from typing import List
from pathlib import Path
from fastapi import FastAPI, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db, Base, engine
from app.config import settings
from app.limesurvey import LimeSurveyClient, LimeSurveyError, build_participation_url
from app.oauth2 import get_current_user
from .routers import user, services, announcements, workshops

app = FastAPI()

# Ensure the avatar upload directory exists
UPLOADS_DIR = Path("uploads/avatars")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

Base.metadata.create_all(bind=engine)

# Serve uploaded files (e.g. avatars) at /uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    # In docker-compose, the frontend is served from its own container/origin, so the
    # API needs CORS enabled for it. Tighten this to real origins in production.
    allow_origins=settings.cors_origins.split(",") if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(services.router)
app.include_router(announcements.router)
app.include_router(workshops.router)


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



@app.post("/studies/", response_model=schemas.StudyListingOut, status_code=status.HTTP_201_CREATED)
async def create_study(
    study: schemas.StudyListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """A researcher posts a new study/survey listing."""
    if current_user.role != models.UserRole.RESEARCHER and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only accounts with the researcher role can post study listings",
        )

    if current_user.role == models.UserRole.RESEARCHER and current_user.verification_status != models.VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researcher account is pending admin verification",
        )

    db_study = models.StudyListing(**study.dict(), researcher_id=current_user.id, state=models.StudyState.LIVE)
    db.add(db_study)
    db.commit()
    db.refresh(db_study)
    return db_study


@app.get("/studies/", response_model=List[schemas.StudyListingOut])
async def list_studies(db: Session = Depends(get_db)):
    """Browse all currently open (live) studies."""
    rows = (
        db.query(models.StudyListing, models.User.username, models.User.display_name, models.User.avatar_url)
        .join(models.User, models.StudyListing.researcher_id == models.User.id)
        .filter(models.StudyListing.state == models.StudyState.LIVE)
        .all()
    )
    return [
        schemas.StudyListingOut(
            **{c.key: getattr(study, c.key) for c in models.StudyListing.__table__.columns},
            researcher_username=username,
            researcher_display_name=display_name,
            researcher_avatar_url=avatar_url,
        )
        for study, username, display_name, avatar_url in rows
    ]


@app.get("/studies/{study_id}", response_model=schemas.StudyListingOut)
async def get_study(study_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(models.StudyListing, models.User.username, models.User.display_name, models.User.avatar_url)
        .join(models.User, models.StudyListing.researcher_id == models.User.id)
        .filter(models.StudyListing.id == study_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    study, username, display_name, avatar_url = row
    return schemas.StudyListingOut(
        **{c.key: getattr(study, c.key) for c in models.StudyListing.__table__.columns},
        researcher_username=username,
        researcher_display_name=display_name,
        researcher_avatar_url=avatar_url,
    )


@app.patch("/studies/{study_id}/close", response_model=schemas.StudyListingOut)
async def close_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher or Admin closes a study listing."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can close it")
    study.state = models.StudyState.CLOSED
    db.commit()
    db.refresh(study)
    return study



def _get_limesurvey_client() -> LimeSurveyClient:
    if not (settings.limesurvey_rpc_url and settings.limesurvey_username and settings.limesurvey_password):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LimeSurvey is not configured (set limesurvey_rpc_url / limesurvey_username / limesurvey_password)",
        )
    return LimeSurveyClient(settings.limesurvey_rpc_url, settings.limesurvey_username, settings.limesurvey_password)


@app.get("/studies/{study_id}/survey", response_model=schemas.SurveyStatusOut)
async def get_study_survey(study_id: int, lang: str = "en", db: Session = Depends(get_db)):
    """
    Participant-facing: returns the LimeSurvey link for a study, plus whether
    the survey is currently active in LimeSurvey. `lang` (en/af/xh/zu) is
    passed through so LimeSurvey opens in the participant's chosen language,
    if that language has been added to the survey in LimeSurvey.
    """
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if not study.limesurvey_survey_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no LimeSurvey survey linked to it")
    if not settings.limesurvey_public_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="limesurvey_public_url is not configured")

    survey_id = study.limesurvey_survey_id
    title = None
    active = True
    try:
        with _get_limesurvey_client() as client:
            props = client.get_survey_properties(survey_id)
            title = props.get("surveyls_title")
            active = props.get("active") == "Y"
    except LimeSurveyError as e:
        # Don't hard-fail the participant just because we couldn't reach LimeSurvey's
        # admin RPC - still hand back a usable link, minus the live metadata.
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not reach LimeSurvey: {e}")

    return schemas.SurveyStatusOut(
        survey_id=survey_id,
        title=title,
        active=active,
        participation_url=build_participation_url(settings.limesurvey_public_url, survey_id, lang=lang),
    )


@app.get("/studies/{study_id}/survey/responses", response_model=schemas.SurveyStatusOut)
async def get_study_survey_responses(study_id: int, db: Session = Depends(get_db)):
    """Researcher-facing: same as above plus completed/incomplete response counts from LimeSurvey."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if not study.limesurvey_survey_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no LimeSurvey survey linked to it")
    if not settings.limesurvey_public_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="limesurvey_public_url is not configured")

    survey_id = study.limesurvey_survey_id
    try:
        with _get_limesurvey_client() as client:
            props = client.get_survey_properties(survey_id)
            summary = client.get_summary(survey_id)
    except LimeSurveyError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not reach LimeSurvey: {e}")

    def _to_int(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    return schemas.SurveyStatusOut(
        survey_id=survey_id,
        title=props.get("surveyls_title"),
        active=props.get("active") == "Y",
        participation_url=build_participation_url(settings.limesurvey_public_url, survey_id),
        completed_responses=_to_int(summary.get("completed_responses")),
        incomplete_responses=_to_int(summary.get("incomplete_responses")),
    )


@app.post("/studies/{study_id}/apply", response_model=schemas.ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Community member applies/opts in to a study. Enforces: study is live, no duplicate applications,
    and respects the participant_limit if the researcher set one."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")

    if study.state != models.StudyState.LIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This study is not currently accepting participants")

    already_applied = db.query(models.Application).filter(
        models.Application.study_id == study_id,
        models.Application.user_id == current_user.id
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

    db_application = models.Application(study_id=study_id, user_id=current_user.id, status=models.ApplicationStatus.APPLIED)
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@app.get("/studies/{study_id}/applicants", response_model=List[schemas.ApplicantOut])
async def get_applicants(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher views everyone who has applied to their study, with current status."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can view applicants")

    rows = (
        db.query(models.Application, models.User.username, models.User.email)
        .join(models.User, models.Application.user_id == models.User.id)
        .filter(models.Application.study_id == study_id)
        .order_by(models.Application.applied_at.desc())
        .all()
    )
    return [
        schemas.ApplicantOut(
            id=application.id,
            study_id=application.study_id,
            user_id=application.user_id,
            status=application.status,
            applied_at=application.applied_at,
            applicant_username=username,
            applicant_email=email,
        )
        for application, username, email in rows
    ]


@app.get("/applications/me", response_model=List[schemas.MyApplicationOut])
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Community member views their own study applications and current status (accepted/declined/applied)."""
    rows = (
        db.query(models.Application, models.StudyListing.title, models.StudyListing.honorarium)
        .join(models.StudyListing, models.Application.study_id == models.StudyListing.id)
        .filter(models.Application.user_id == current_user.id)
        .order_by(models.Application.applied_at.desc())
        .all()
    )
    return [
        schemas.MyApplicationOut(
            id=application.id,
            study_id=application.study_id,
            user_id=application.user_id,
            status=application.status,
            applied_at=application.applied_at,
            study_title=title,
            study_honorarium=honorarium,
        )
        for application, title, honorarium in rows
    ]


@app.patch("/applications/{application_id}", response_model=schemas.ApplicationOut)
async def update_application_status(
    application_id: int,
    update: schemas.ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher or Admin updates the status of an applicant."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {application_id} not found")
    study = db.query(models.StudyListing).filter(models.StudyListing.id == application.study_id).first()
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can update applicant status")
    application.status = update.status
    db.commit()
    db.refresh(application)
    return application

