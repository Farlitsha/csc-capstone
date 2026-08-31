from typing import List
from pathlib import Path
from fastapi import FastAPI, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app import models, schemas, utils, audit
from app.database import get_db, Base, engine
from app.config import settings
from app.oauth2 import get_current_user
from .routers import user, services, announcements, workshops, community, reports, audit_logs

app = FastAPI()

# Ensure upload directories exist
UPLOADS_DIR = Path("uploads/avatars")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SERVICES_DIR = Path("uploads/services")
SERVICES_DIR.mkdir(parents=True, exist_ok=True)

try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

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
app.include_router(community.router)
app.include_router(reports.router)
app.include_router(audit_logs.router)

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

    payload = study.dict()
    questions = payload.pop("questions", [])

    db_study = models.StudyListing(**payload, researcher_id=current_user.id, state=models.StudyState.LIVE)
    db.add(db_study)
    db.commit()
    db.refresh(db_study)

    # Build the survey inline if the researcher added questions in the builder.
    if questions:
        db_survey = models.Survey(study_id=db_study.id)
        db.add(db_survey)
        db.flush()
        for i, q in enumerate(questions):
            db.add(models.SurveyQuestion(
                survey_id=db_survey.id,
                order=i,
                type=q["type"],
                prompt=q["prompt"],
                required=q.get("required", True),
                options=q.get("options"),
            ))
        db.commit()

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
    """Researcher or Admin closes a study listing (backlog item 15: survey teardown)."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can close it")
    study.state = models.StudyState.CLOSED
    audit.log_action(
        db,
        actor_id=current_user.id,
        action="study_closed",
        target_type="study",
        target_id=study.id,
        details={"title": study.title, "closed_by_admin": current_user.role == models.UserRole.ADMIN},
    )
    db.commit()
    db.refresh(study)
    return study


@app.put("/studies/{study_id}", response_model=schemas.StudyListingOut)
@app.patch("/studies/{study_id}", response_model=schemas.StudyListingOut)
async def update_study(
    study_id: int,
    study_in: schemas.StudyListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher or Admin updates a study listing."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can edit it")

    payload = study_in.dict()
    questions = payload.pop("questions", None)

    study.title = payload.get("title", study.title)
    study.description = payload.get("description", study.description)
    study.honorarium = payload.get("honorarium", study.honorarium)
    study.participant_limit = payload.get("participant_limit", study.participant_limit)
    study.closing_date = payload.get("closing_date", study.closing_date)

    if questions is not None:
        db_survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
        if not db_survey:
            db_survey = models.Survey(study_id=study.id)
            db.add(db_survey)
            db.flush()
        else:
            db.query(models.SurveyQuestion).filter(models.SurveyQuestion.survey_id == db_survey.id).delete()

        for i, q in enumerate(questions):
            db.add(models.SurveyQuestion(
                survey_id=db_survey.id,
                order=i,
                type=q["type"],
                prompt=q["prompt"],
                required=q.get("required", True),
                options=q.get("options"),
            ))

    audit.log_action(
        db,
        actor_id=current_user.id,
        action="study_updated",
        target_type="study",
        target_id=study.id,
        details={"title": study.title, "updated_by_admin": current_user.role == models.UserRole.ADMIN},
    )
    db.commit()
    db.refresh(study)
    return study


@app.delete("/studies/{study_id}", status_code=status.HTTP_200_OK)
async def delete_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher or Admin permanently deletes a study listing."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can delete it")

    audit.log_action(
        db,
        actor_id=current_user.id,
        action="study_deleted",
        target_type="study",
        target_id=study.id,
        details={"title": study.title, "deleted_by_admin": current_user.role == models.UserRole.ADMIN},
    )
    db.delete(study)
    db.commit()
    return {"message": "Study deleted successfully"}




def _get_owned_study(study_id: int, db: Session, current_user: models.User) -> models.StudyListing:
    """Fetches a study and checks the caller is its researcher (or an admin)."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can do this")
    return study


@app.put("/studies/{study_id}/survey", response_model=schemas.SurveyOut)
async def upsert_study_survey(
    study_id: int,
    survey_in: schemas.SurveyIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher creates or fully replaces their study's survey questions, built with
    CommHub's own in-house survey builder (no more linking out to LimeSurvey)."""
    _get_owned_study(study_id, db, current_user)

    db_survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if db_survey:
        db.query(models.SurveyQuestion).filter(models.SurveyQuestion.survey_id == db_survey.id).delete()
    else:
        db_survey = models.Survey(study_id=study_id)
        db.add(db_survey)
        db.flush()

    for i, q in enumerate(survey_in.questions):
        db.add(models.SurveyQuestion(
            survey_id=db_survey.id,
            order=i,
            type=q.type,
            prompt=q.prompt,
            required=q.required,
            options=q.options,
        ))
    db.commit()
    db.refresh(db_survey)
    return db_survey


@app.get("/studies/{study_id}/survey", response_model=schemas.SurveyOut)
async def get_study_survey(study_id: int, db: Session = Depends(get_db)):
    """Public: the survey's questions - used by a participant to take it, or a researcher to preview it."""
    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no survey yet")
    return survey


@app.post("/studies/{study_id}/survey/responses", response_model=schemas.SurveyResponseOut, status_code=status.HTTP_201_CREATED)
async def submit_survey_response(
    study_id: int,
    response_in: schemas.SurveyResponseIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Community member submits their answers. Requires having been accepted into the study,
    and only one response per participant."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no survey yet")

    application = db.query(models.Application).filter(
        models.Application.study_id == study_id,
        models.Application.user_id == current_user.id,
    ).first()
    if not application or application.status != models.ApplicationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You need to be accepted into this study before taking its survey",
        )

    already = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.survey_id == survey.id,
        models.SurveyResponse.user_id == current_user.id,
    ).first()
    if already:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already submitted this survey")

    question_ids = {q.id for q in survey.questions}
    for a in response_in.answers:
        if a.question_id not in question_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Question {a.question_id} does not belong to this survey")

    answer_by_question = {a.question_id: a.value for a in response_in.answers}
    for q in survey.questions:
        if q.required:
            value = answer_by_question.get(q.id)
            if value is None or value == "" or value == []:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Question '{q.prompt}' is required")

    db_response = models.SurveyResponse(survey_id=survey.id, user_id=current_user.id)
    db.add(db_response)
    db.flush()
    for a in response_in.answers:
        db.add(models.SurveyAnswer(response_id=db_response.id, question_id=a.question_id, value=a.value))
    db.commit()
    db.refresh(db_response)
    return db_response


@app.get("/studies/{study_id}/survey/responses", response_model=schemas.SurveyResponsesOut)
async def get_study_survey_responses(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Researcher-facing: every response submitted to this study's survey, for review/analysis."""
    study = _get_owned_study(study_id, db, current_user)
    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no survey yet")

    responses = (
        db.query(models.SurveyResponse)
        .filter(models.SurveyResponse.survey_id == survey.id)
        .order_by(models.SurveyResponse.submitted_at.desc())
        .all()
    )
    return schemas.SurveyResponsesOut(response_count=len(responses), responses=responses)


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
    old_status = application.status.value
    application.status = update.status
    audit.log_action(
        db,
        actor_id=current_user.id,
        action="application_status_changed",
        target_type="application",
        target_id=application.id,
        details={"study_id": application.study_id, "applicant_user_id": application.user_id, "old_status": old_status, "new_status": update.status.value},
    )
    db.commit()
    db.refresh(application)
    return application

