from typing import List, Union
from fastapi import APIRouter, Depends, status, HTTPException, Body, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import models, audit, oauth2
from ..limiter import limiter
from ..database import get_db
from ..schemas import studies as study_schemas

router = APIRouter(tags=["studies"])


def _get_owned_study(study_id: int, db: Session, current_user: models.User) -> models.StudyListing:
    """Fetches a study and checks the caller is its researcher (or an admin)."""
    study = db.query(models.StudyListing).filter(models.StudyListing.id == study_id).first()
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Study {study_id} not found")
    if study.researcher_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the study's researcher or an admin can do this")
    return study


@router.post("/studies/", response_model=study_schemas.StudyListingOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
async def create_study(
    request: Request,
    study: study_schemas.StudyListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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

    return study_schemas.StudyListingOut(
        **{c.key: getattr(db_study, c.key) for c in models.StudyListing.__table__.columns},
        researcher_username=current_user.username,
        researcher_display_name=current_user.display_name,
        researcher_avatar_url=current_user.avatar_url,
        response_count=0,
        can_edit_questions=True,
    )


@router.get("/studies/", response_model=List[study_schemas.StudyListingOut])
async def list_studies(db: Session = Depends(get_db)):
    """Browse all currently open (live) studies, sorted with newest studies first."""
    rows = (
        db.query(models.StudyListing, models.User.username, models.User.display_name, models.User.avatar_url)
        .join(models.User, models.StudyListing.researcher_id == models.User.id)
        .filter(
            models.StudyListing.state == models.StudyState.LIVE,
            models.User.role == models.UserRole.RESEARCHER,
            models.User.verification_status == models.VerificationStatus.VERIFIED,
        )
        .order_by(models.StudyListing.created_at.desc())
        .all()
    )

    survey_counts = dict(
        db.query(models.Survey.study_id, func.count(models.SurveyResponse.id))
        .join(models.SurveyResponse, models.Survey.id == models.SurveyResponse.survey_id)
        .group_by(models.Survey.study_id)
        .all()
    )

    return [
        study_schemas.StudyListingOut(
            **{c.key: getattr(study, c.key) for c in models.StudyListing.__table__.columns},
            researcher_username=username,
            researcher_display_name=display_name,
            researcher_avatar_url=avatar_url,
            response_count=survey_counts.get(study.id, 0),
            can_edit_questions=bool(survey_counts.get(study.id, 0) == 0),
        )
        for study, username, display_name, avatar_url in rows
    ]


@router.get("/studies/{study_id}", response_model=study_schemas.StudyListingOut)
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

    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    resp_count = (
        db.query(func.count(models.SurveyResponse.id))
        .filter(models.SurveyResponse.survey_id == survey.id)
        .scalar()
        if survey
        else 0
    ) or 0

    return study_schemas.StudyListingOut(
        **{c.key: getattr(study, c.key) for c in models.StudyListing.__table__.columns},
        researcher_username=username,
        researcher_display_name=display_name,
        researcher_avatar_url=avatar_url,
        response_count=resp_count,
        can_edit_questions=bool(resp_count == 0),
    )


@router.patch("/studies/{study_id}/close", response_model=study_schemas.StudyListingOut)
async def close_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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


@router.put("/studies/{study_id}", response_model=study_schemas.StudyListingOut)
@router.patch("/studies/{study_id}", response_model=study_schemas.StudyListingOut)
async def update_study(
    study_id: int,
    study_in: study_schemas.StudyListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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

    db_survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    resp_count = (
        db.query(models.SurveyResponse).filter(models.SurveyResponse.survey_id == db_survey.id).count()
        if db_survey
        else 0
    )

    if questions is not None:
        if db_survey:
            if resp_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot modify questions because participants have already taken this survey",
                )
            db.query(models.SurveyQuestion).filter(models.SurveyQuestion.survey_id == db_survey.id).delete()
        else:
            db_survey = models.Survey(study_id=study.id)
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

    return study_schemas.StudyListingOut(
        **{c.key: getattr(study, c.key) for c in models.StudyListing.__table__.columns},
        researcher_username=current_user.username if study.researcher_id == current_user.id else None,
        researcher_display_name=current_user.display_name if study.researcher_id == current_user.id else None,
        researcher_avatar_url=current_user.avatar_url if study.researcher_id == current_user.id else None,
        response_count=resp_count,
        can_edit_questions=bool(resp_count == 0),
    )


@router.delete("/studies/{study_id}", status_code=status.HTTP_200_OK)
async def delete_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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


@router.put("/studies/{study_id}/survey", response_model=study_schemas.SurveyOut)
async def upsert_study_survey(
    study_id: int,
    survey_in: study_schemas.SurveyIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Researcher creates or fully replaces their study's survey questions."""
    _get_owned_study(study_id, db, current_user)

    db_survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if db_survey:
        resp_count = db.query(models.SurveyResponse).filter(models.SurveyResponse.survey_id == db_survey.id).count()
        if resp_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify questions because participants have already taken this survey",
            )
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
    return study_schemas.SurveyOut(
        id=db_survey.id,
        study_id=db_survey.study_id,
        questions=db_survey.questions,
        response_count=0,
        can_edit_questions=True,
    )


@router.get("/studies/{study_id}/survey", response_model=study_schemas.SurveyOut)
async def get_study_survey(study_id: int, db: Session = Depends(get_db)):
    """Public: the survey's questions - used by a participant to take it, or a researcher to preview it."""
    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no survey yet")
    resp_count = db.query(models.SurveyResponse).filter(models.SurveyResponse.survey_id == survey.id).count()
    return study_schemas.SurveyOut(
        id=survey.id,
        study_id=survey.study_id,
        questions=survey.questions,
        response_count=resp_count,
        can_edit_questions=bool(resp_count == 0),
    )


@router.post("/studies/{study_id}/survey/responses", response_model=study_schemas.SurveyResponseOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
async def submit_survey_response(
    request: Request,
    study_id: int,
    response_in: study_schemas.SurveyResponseIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member submits their answers. Requires having been accepted into the study."""
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


@router.get("/studies/{study_id}/survey/responses", response_model=study_schemas.SurveyResponsesOut)
async def get_study_survey_responses(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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
    return study_schemas.SurveyResponsesOut(response_count=len(responses), responses=responses)


@router.post("/studies/{study_id}/apply", response_model=study_schemas.ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member applies/opts in to a study."""
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


@router.get("/studies/{study_id}/applicants", response_model=List[study_schemas.ApplicantOut])
async def get_applicants(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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
        study_schemas.ApplicantOut(
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


@router.get("/applications/me", response_model=List[study_schemas.MyApplicationOut])
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member views their own study applications, current status, and survey completion state."""
    rows = (
        db.query(
            models.Application,
            models.StudyListing.title,
            models.StudyListing.honorarium,
            models.SurveyResponse.id.label("survey_response_id"),
        )
        .join(models.StudyListing, models.Application.study_id == models.StudyListing.id)
        .outerjoin(models.Survey, models.StudyListing.id == models.Survey.study_id)
        .outerjoin(
            models.SurveyResponse,
            (models.Survey.id == models.SurveyResponse.survey_id) & (models.SurveyResponse.user_id == current_user.id),
        )
        .filter(models.Application.user_id == current_user.id)
        .order_by(models.Application.applied_at.desc())
        .all()
    )
    return [
        study_schemas.MyApplicationOut(
            id=application.id,
            study_id=application.study_id,
            user_id=application.user_id,
            status=application.status,
            applied_at=application.applied_at,
            study_title=title,
            study_honorarium=honorarium,
            has_submitted_survey=bool(survey_response_id is not None),
            survey_response_id=survey_response_id,
        )
        for application, title, honorarium, survey_response_id in rows
    ]


@router.delete("/studies/{study_id}/apply", status_code=status.HTTP_200_OK)
async def unapply_from_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member unapplies / withdraws application from a pending or accepted study."""
    application = db.query(models.Application).filter(
        models.Application.study_id == study_id,
        models.Application.user_id == current_user.id,
    ).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have not applied to this study")

    # Clean up any survey response associated with this study for this user
    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if survey:
        db.query(models.SurveyResponse).filter(
            models.SurveyResponse.survey_id == survey.id,
            models.SurveyResponse.user_id == current_user.id,
        ).delete()

    db.delete(application)
    db.commit()
    return {"message": "Application withdrawn successfully", "study_id": study_id}


@router.delete("/studies/{study_id}/survey/response", status_code=status.HTTP_200_OK)
async def clear_survey_response(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member clears/erases their submitted survey response and cleans up their application (POPIA Right to Erasure)."""
    survey = db.query(models.Survey).filter(models.Survey.study_id == study_id).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This study has no survey")

    resp = db.query(models.SurveyResponse).filter(
        models.SurveyResponse.survey_id == survey.id,
        models.SurveyResponse.user_id == current_user.id,
    ).first()
    if not resp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No survey response found for this study")

    db.delete(resp)

    # Also clean up the application record so it no longer clutters their applications list
    application = db.query(models.Application).filter(
        models.Application.study_id == study_id,
        models.Application.user_id == current_user.id,
    ).first()
    if application:
        db.delete(application)

    db.commit()
    return {"message": "Survey response cleared successfully", "study_id": study_id}


@router.delete("/applications/me/completed", status_code=status.HTTP_200_OK)
async def clear_all_completed_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Batch clears all completed surveys and associated applications for the current user."""
    rows = (
        db.query(models.Application.id, models.Application.study_id, models.SurveyResponse.id.label("resp_id"))
        .join(models.StudyListing, models.Application.study_id == models.StudyListing.id)
        .outerjoin(models.Survey, models.StudyListing.id == models.Survey.study_id)
        .outerjoin(
            models.SurveyResponse,
            (models.Survey.id == models.SurveyResponse.survey_id) & (models.SurveyResponse.user_id == current_user.id),
        )
        .filter(models.Application.user_id == current_user.id)
        .all()
    )

    completed_app_ids = [row.id for row in rows if row.resp_id is not None]
    if completed_app_ids:
        for row in rows:
            if row.resp_id is not None:
                resp = db.query(models.SurveyResponse).filter(models.SurveyResponse.id == row.resp_id).first()
                if resp:
                    db.delete(resp)
        db.query(models.Application).filter(models.Application.id.in_(completed_app_ids)).delete(synchronize_session=False)
        db.commit()

    return {"message": f"Cleared {len(completed_app_ids)} completed surveys", "cleared_count": len(completed_app_ids)}


@router.delete("/applications/{application_id}", status_code=status.HTTP_200_OK)
async def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Community member deletes/withdraws their application or removes declined/completed application from history."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {application_id} not found")

    if application.user_id != current_user.id and current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own applications")

    survey = db.query(models.Survey).filter(models.Survey.study_id == application.study_id).first()
    if survey:
        db.query(models.SurveyResponse).filter(
            models.SurveyResponse.survey_id == survey.id,
            models.SurveyResponse.user_id == application.user_id,
        ).delete()

    db.delete(application)
    db.commit()
    return {"message": "Application deleted successfully", "id": application_id}


@router.patch("/applications/{application_id}", response_model=study_schemas.ApplicationOut)
async def update_application_status(
    application_id: int,
    update: study_schemas.ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
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


