"""
Unit Tests for Backlog Item 7: Participant Recruitment
======================================================
Kanban Item: Participant recruitment
PDF Spec: Backlog Item 4 (Research management: participant recruitment)

User Story:
  As a community member, I want to apply/opt in to open research studies,
  and as a researcher, I want to manage applicants, enforce recruitment limits,
  and accept or decline applicants.

Acceptance Criteria (DoD):
  1. POST /studies/{id}/apply records an application with status 'applied'.
  2. Applying to a closed study returns 400 Bad Request.
  3. Re-applying to same study returns 400 Bad Request (duplicate prevention).
  4. Enforces participant_limit when accepted count meets capacity.
  5. GET /studies/{id}/applicants allows researcher to see applicants list.
  6. GET /applications/me allows community member to track their own applications.
  7. PATCH /applications/{id} allows researcher to accept or decline applicants.
"""

import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


@pytest.fixture
def live_study(db_session, verified_researcher):
    study = models.StudyListing(
        researcher_id=verified_researcher.id,
        title="Youth Employment Study 2026",
        description="Understanding youth job searching experiences",
        honorarium="R150",
        participant_limit=2,
        state=models.StudyState.LIVE,
    )
    db_session.add(study)
    db_session.commit()
    db_session.refresh(study)
    return study


def test_apply_to_study_success(client, live_study, community_user, community_user_auth_headers, db_session):
    """DoD: Community member successfully applies to a live study."""
    response = client.post(f"/studies/{live_study.id}/apply", headers=community_user_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["study_id"] == live_study.id
    assert data["user_id"] == community_user.id
    assert data["status"] == "applied"


def test_apply_duplicate_study_rejected(client, live_study, community_user_auth_headers):
    """DoD: Duplicate application by same member is rejected with 400."""
    resp1 = client.post(f"/studies/{live_study.id}/apply", headers=community_user_auth_headers)
    assert resp1.status_code == 201

    resp2 = client.post(f"/studies/{live_study.id}/apply", headers=community_user_auth_headers)
    assert resp2.status_code == 400
    assert "already applied" in resp2.json()["detail"]


def test_apply_to_closed_study_rejected(client, live_study, community_user_auth_headers, db_session):
    """DoD: Applying to a closed study returns 400 Bad Request."""
    live_study.state = models.StudyState.CLOSED
    db_session.commit()

    response = client.post(f"/studies/{live_study.id}/apply", headers=community_user_auth_headers)
    assert response.status_code == 400
    assert "not currently accepting participants" in response.json()["detail"]


def test_participant_limit_enforcement(client, live_study, db_session):
    """DoD: When accepted applications meet participant_limit, new applications are rejected."""
    # Seed 2 accepted participants (limit is 2)
    u1 = create_user_in_db(db_session, username="u1", email="u1@test.com")
    u2 = create_user_in_db(db_session, username="u2", email="u2@test.com")
    u3 = create_user_in_db(db_session, username="u3", email="u3@test.com")

    app1 = models.Application(study_id=live_study.id, user_id=u1.id, status=models.ApplicationStatus.ACCEPTED)
    app2 = models.Application(study_id=live_study.id, user_id=u2.id, status=models.ApplicationStatus.ACCEPTED)
    db_session.add_all([app1, app2])
    db_session.commit()

    u3_headers = get_auth_headers_for_user(u3)
    response = client.post(f"/studies/{live_study.id}/apply", headers=u3_headers)
    assert response.status_code == 400
    assert "reached its participant limit" in response.json()["detail"]


def test_researcher_view_and_manage_applicants(
    client, live_study, verified_researcher_auth_headers, community_user, db_session
):
    """DoD: Researcher views applicants and accepts an applicant."""
    app_record = models.Application(
        study_id=live_study.id, user_id=community_user.id, status=models.ApplicationStatus.APPLIED
    )
    db_session.add(app_record)
    db_session.commit()
    db_session.refresh(app_record)

    # View applicants
    get_resp = client.get(f"/studies/{live_study.id}/applicants", headers=verified_researcher_auth_headers)
    assert get_resp.status_code == 200
    applicants = get_resp.json()
    assert len(applicants) == 1
    assert applicants[0]["applicant_username"] == community_user.username

    # Accept applicant
    patch_resp = client.patch(
        f"/applications/{app_record.id}",
        json={"status": "accepted"},
        headers=verified_researcher_auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "accepted"


def test_member_view_my_applications(client, live_study, community_user, community_user_auth_headers, db_session):
    """DoD: Member can list their own applied studies and see their status."""
    app_record = models.Application(
        study_id=live_study.id, user_id=community_user.id, status=models.ApplicationStatus.ACCEPTED
    )
    db_session.add(app_record)
    db_session.commit()

    response = client.get("/applications/me", headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["study_title"] == live_study.title
    assert data[0]["status"] == "accepted"
    assert data[0]["has_submitted_survey"] is False


def test_unapply_from_study(client, live_study, community_user, community_user_auth_headers, db_session):
    """Member can unapply / withdraw their application from a study."""
    app_record = models.Application(
        study_id=live_study.id, user_id=community_user.id, status=models.ApplicationStatus.APPLIED
    )
    db_session.add(app_record)
    db_session.commit()

    # Unapply
    del_resp = client.delete(f"/studies/{live_study.id}/apply", headers=community_user_auth_headers)
    assert del_resp.status_code == 200
    assert "withdrawn" in del_resp.json()["message"]

    # Verify no longer applied
    my_apps = client.get("/applications/me", headers=community_user_auth_headers).json()
    assert len(my_apps) == 0


def test_delete_application_by_id(client, live_study, community_user, community_user_auth_headers, db_session):
    """Member can delete their application by application id."""
    app_record = models.Application(
        study_id=live_study.id, user_id=community_user.id, status=models.ApplicationStatus.APPLIED
    )
    db_session.add(app_record)
    db_session.commit()

    del_resp = client.delete(f"/applications/{app_record.id}", headers=community_user_auth_headers)
    assert del_resp.status_code == 200

    my_apps = client.get("/applications/me", headers=community_user_auth_headers).json()
    assert len(my_apps) == 0

