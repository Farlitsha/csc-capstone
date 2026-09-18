"""
Unit Tests for Backlog Item 8: Survey Support (In-House Survey Builder & Responses)
===================================================================================
Kanban Item: Survey Support
PDF Spec: Backlog Item 4 & 15 (Research management & Survey teardown)

User Story:
  As a researcher, I want to build and manage surveys directly within CommHub (supporting multiple
  question types), analyze responses, and close/teardown surveys when completed.
  As an accepted participant, I want to submit my answers once with ethical consent.

Acceptance Criteria (DoD):
  1. PUT /studies/{id}/survey creates or replaces survey questions (short_text, rating, etc.).
  2. GET /studies/{id}/survey retrieves survey questions.
  3. POST /studies/{id}/survey/responses requires caller to be an ACCEPTED participant (403 otherwise).
  4. Only one survey response allowed per participant (duplicate submission rejected with 400).
  5. Required questions must be answered (400 Bad Request if missing/empty).
  6. Researcher can view all submitted responses for their study (GET /studies/{id}/survey/responses).
  7. PATCH /studies/{id}/close closes study/survey (teardown) and records audit log.
"""

import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


@pytest.fixture
def study_with_survey(db_session, verified_researcher):
    # Create study
    study = models.StudyListing(
        researcher_id=verified_researcher.id,
        title="Public Transport Survey",
        description="Assessing bus and taxi reliability",
        honorarium="R50 airtime",
        state=models.StudyState.LIVE,
    )
    db_session.add(study)
    db_session.commit()
    db_session.refresh(study)

    # Create survey with 2 questions (one required, one optional)
    survey = models.Survey(study_id=study.id)
    db_session.add(survey)
    db_session.flush()

    q1 = models.SurveyQuestion(
        survey_id=survey.id, order=0, type=models.QuestionType.SHORT_TEXT,
        prompt="Which transport mode do you use most often?", required=True,
    )
    q2 = models.SurveyQuestion(
        survey_id=survey.id, order=1, type=models.QuestionType.RATING,
        prompt="Rate the safety of your commute (1-5)", required=True,
    )
    db_session.add_all([q1, q2])
    db_session.commit()
    db_session.refresh(survey)
    return study, survey, [q1, q2]


def test_upsert_survey_questions(client, verified_researcher_auth_headers, study_with_survey):
    """DoD: Researcher can replace and update survey questions."""
    study, _, _ = study_with_survey
    payload = {
        "questions": [
            {"type": "yes_no", "prompt": "Do you commute daily?", "required": True},
            {"type": "multiple_choice", "prompt": "Peak travel time?", "required": True, "options": ["Morning", "Evening"]},
        ]
    }
    response = client.put(f"/studies/{study.id}/survey", json=payload, headers=verified_researcher_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) == 2
    assert data["questions"][0]["type"] == "yes_no"
    assert data["questions"][1]["options"] == ["Morning", "Evening"]


def test_get_study_survey_questions(client, study_with_survey):
    """DoD: Public endpoint returns survey questions for participants to answer."""
    study, _, questions = study_with_survey
    response = client.get(f"/studies/{study.id}/survey")
    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) == 2
    assert data["questions"][0]["prompt"] == questions[0].prompt


def test_submit_survey_unaccepted_user_rejected(client, study_with_survey, community_user, community_user_auth_headers):
    """DoD: Participant who has NOT been accepted is forbidden from taking survey (403)."""
    study, _, questions = study_with_survey
    payload = {
        "answers": [
            {"question_id": questions[0].id, "value": "Minibus Taxi"},
            {"question_id": questions[1].id, "value": "4"},
        ]
    }
    response = client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 403
    assert "accepted into this study" in response.json()["detail"]


def test_submit_survey_accepted_user_success(
    client, study_with_survey, community_user, community_user_auth_headers, db_session
):
    """DoD: Accepted participant successfully submits answers."""
    study, survey, questions = study_with_survey

    # Accept the community user into the study
    app_record = models.Application(
        study_id=study.id, user_id=community_user.id, status=models.ApplicationStatus.ACCEPTED
    )
    db_session.add(app_record)
    db_session.commit()

    payload = {
        "answers": [
            {"question_id": questions[0].id, "value": "Golden Arrow Bus"},
            {"question_id": questions[1].id, "value": "5"},
        ]
    }
    response = client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 201
    assert response.json()["user_id"] == community_user.id
    assert len(response.json()["answers"]) == 2


def test_submit_survey_duplicate_rejected(
    client, study_with_survey, community_user, community_user_auth_headers, db_session
):
    """DoD: Participant cannot submit the same survey more than once."""
    study, survey, questions = study_with_survey
    app_record = models.Application(
        study_id=study.id, user_id=community_user.id, status=models.ApplicationStatus.ACCEPTED
    )
    db_session.add(app_record)
    db_session.commit()

    payload = {
        "answers": [
            {"question_id": questions[0].id, "value": "Train"},
            {"question_id": questions[1].id, "value": "3"},
        ]
    }
    resp1 = client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)
    assert resp1.status_code == 201

    resp2 = client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)
    assert resp2.status_code == 400
    assert "already submitted" in resp2.json()["detail"]


def test_submit_survey_missing_required_answer_rejected(
    client, study_with_survey, community_user, community_user_auth_headers, db_session
):
    """DoD: Submitting empty answers for required questions returns 400."""
    study, survey, questions = study_with_survey
    app_record = models.Application(
        study_id=study.id, user_id=community_user.id, status=models.ApplicationStatus.ACCEPTED
    )
    db_session.add(app_record)
    db_session.commit()

    # Missing question 2 which is required
    payload = {
        "answers": [
            {"question_id": questions[0].id, "value": "Walking"},
        ]
    }
    response = client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 400
    assert "is required" in response.json()["detail"]


def test_researcher_view_survey_responses(
    client, study_with_survey, verified_researcher_auth_headers, community_user, db_session
):
    """DoD: Researcher can view all submitted responses for their study."""
    study, survey, questions = study_with_survey
    resp_obj = models.SurveyResponse(survey_id=survey.id, user_id=community_user.id)
    db_session.add(resp_obj)
    db_session.flush()

    ans1 = models.SurveyAnswer(response_id=resp_obj.id, question_id=questions[0].id, value="Bus")
    ans2 = models.SurveyAnswer(response_id=resp_obj.id, question_id=questions[1].id, value="4")
    db_session.add_all([ans1, ans2])
    db_session.commit()

    response = client.get(f"/studies/{study.id}/survey/responses", headers=verified_researcher_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["response_count"] == 1
    assert len(data["responses"]) == 1


def test_close_and_teardown_study(client, study_with_survey, verified_researcher_auth_headers, db_session):
    """DoD: Researcher can close/teardown study (Backlog Item 15: survey teardown)."""
    study, _, _ = study_with_survey
    response = client.patch(f"/studies/{study.id}/close", headers=verified_researcher_auth_headers)
    assert response.status_code == 200
    assert response.json()["state"] == "closed"

    db_study = db_session.query(models.StudyListing).filter_by(id=study.id).first()
    assert db_study.state == models.StudyState.CLOSED


def test_clear_completed_survey(client, study_with_survey, community_user, community_user_auth_headers, db_session):
    """DoD: Community member can clear/erase their completed survey response and application."""
    study, survey, questions = study_with_survey
    app_record = models.Application(
        study_id=study.id, user_id=community_user.id, status=models.ApplicationStatus.ACCEPTED
    )
    db_session.add(app_record)
    db_session.commit()

    # Submit response
    payload = {
        "answers": [
            {"question_id": questions[0].id, "value": "Bus"},
            {"question_id": questions[1].id, "value": "5"},
        ]
    }
    client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)

    # Verify survey is completed in my applications
    my_apps = client.get("/applications/me", headers=community_user_auth_headers).json()
    assert len(my_apps) == 1
    assert my_apps[0]["has_submitted_survey"] is True

    # Clear completed survey
    clear_resp = client.delete(f"/studies/{study.id}/survey/response", headers=community_user_auth_headers)
    assert clear_resp.status_code == 200

    # Verify survey response and application are cleared
    my_apps_after = client.get("/applications/me", headers=community_user_auth_headers).json()
    assert len(my_apps_after) == 0


def test_clear_all_completed_surveys(client, study_with_survey, community_user, community_user_auth_headers, db_session):
    """DoD: Community member can batch-clear all completed survey applications."""
    study, survey, questions = study_with_survey
    app_record = models.Application(
        study_id=study.id, user_id=community_user.id, status=models.ApplicationStatus.ACCEPTED
    )
    db_session.add(app_record)
    db_session.commit()

    payload = {
        "answers": [
            {"question_id": questions[0].id, "value": "Bus"},
            {"question_id": questions[1].id, "value": "4"},
        ]
    }
    client.post(f"/studies/{study.id}/survey/responses", json=payload, headers=community_user_auth_headers)

    clear_all_resp = client.delete("/applications/me/completed", headers=community_user_auth_headers)
    assert clear_all_resp.status_code == 200
    assert clear_all_resp.json()["cleared_count"] == 1

    my_apps_after = client.get("/applications/me", headers=community_user_auth_headers).json()
    assert len(my_apps_after) == 0

