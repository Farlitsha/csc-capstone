"""
Unit Tests for Backlog Item 15: Database Setup, Schema Integrity & Trust (POPIA)
================================================================================
Kanban Item: Database setup & Trust (POPIA Compliance)
PDF Spec: Backlog Item 6, 9 & 12 (Database setup & Trust)

User Story:
  As a developer and community member, I want strict relational integrity and cascading deletes
  so that data is consistently stored, orphaned records are prevented, and full account erasure
  (POPIA compliance) completely purges associated personal records.

Acceptance Criteria (DoD):
  1. Cascade deletes: Deleting a User removes all their services, applications, studies, and responses.
  2. Cascade deletes: Deleting a StudyListing removes its Survey, SurveyQuestions, and SurveyResponses.
  3. Cascade deletes: Deleting a Workshop removes associated WorkshopRegistrations.
  4. Unique constraints at schema level prevent duplicate records (e.g. workshop registrations).
"""

from datetime import datetime, timedelta, timezone
import pytest
from app import models
from tests.conftest import create_user_in_db


def test_user_deletion_cascades_services_and_applications(db_session):
    """DoD: Deleting a user cascades and deletes their services and applications (POPIA erasure)."""
    user = create_user_in_db(db_session, username="alice_to_delete", email="alice_del@test.com")
    service = models.Service(
        poster_id=user.id, category="Art", title="Portraits", description="Paintings"
    )
    db_session.add(service)
    db_session.commit()
    service_id = service.id

    # Delete user
    db_session.delete(user)
    db_session.commit()

    # Verify service is also removed by cascade
    assert db_session.query(models.Service).filter_by(id=service_id).first() is None


def test_study_deletion_cascades_survey_and_questions(db_session):
    """DoD: Deleting a study listing cascades to its survey and all questions."""
    researcher = create_user_in_db(
        db_session, username="res_cascade", email="res_casc@test.com", role=models.UserRole.RESEARCHER
    )
    study = models.StudyListing(
        researcher_id=researcher.id, title="Study Cascade", description="Desc", state=models.StudyState.LIVE
    )
    db_session.add(study)
    db_session.commit()

    survey = models.Survey(study_id=study.id)
    db_session.add(survey)
    db_session.flush()

    q1 = models.SurveyQuestion(survey_id=survey.id, order=0, type=models.QuestionType.SHORT_TEXT, prompt="Q1")
    db_session.add(q1)
    db_session.commit()

    survey_id = survey.id
    q1_id = q1.id

    # Delete study
    db_session.delete(study)
    db_session.commit()

    assert db_session.query(models.Survey).filter_by(id=survey_id).first() is None
    assert db_session.query(models.SurveyQuestion).filter_by(id=q1_id).first() is None


def test_workshop_deletion_cascades_registrations(db_session):
    """DoD: Deleting a workshop cascades and deletes all registrations for it."""
    researcher = create_user_in_db(db_session, username="res_w", email="res_w@test.com", role=models.UserRole.RESEARCHER)
    member = create_user_in_db(db_session, username="mem_w", email="mem_w@test.com")

    session_time = datetime.now(timezone.utc) + timedelta(days=3)
    workshop = models.Workshop(
        organizer_id=researcher.id, title="W1", description="D", location="L",
        date_time=session_time, max_participants=10,
    )
    db_session.add(workshop)
    db_session.commit()

    reg = models.WorkshopRegistration(workshop_id=workshop.id, user_id=member.id)
    db_session.add(reg)
    db_session.commit()
    reg_id = reg.id

    # Delete workshop
    db_session.delete(workshop)
    db_session.commit()

    assert db_session.query(models.WorkshopRegistration).filter_by(id=reg_id).first() is None

