"""
Unit Tests for Backlog Item 5: Advert Responses (Service Applications)
======================================================================
Kanban Item: Advert Responses
PDF Spec: Backlog Item 3 (Service directory: applications & responses)

User Story:
  As a community member, I want to apply/respond to an open service advert with a message,
  and as a service poster, I want to review applicants who applied to my advert.

Acceptance Criteria (DoD):
  1. POST /services/{id}/apply records application with optional message in DB.
  2. Member cannot apply to their own listing (400 Bad Request).
  3. Duplicate applications by same member to same service rejected (400 Bad Request).
  4. Cannot apply to a closed service listing (400 Bad Request).
  5. GET /services/{id}/applicants allows only the listing owner or admin to view responses.
  6. Non-owners are forbidden (403) from viewing applicants.
"""

import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


@pytest.fixture
def service_poster(db_session):
    return create_user_in_db(db_session, username="poster_jane", email="poster@example.com")


@pytest.fixture
def open_service(db_session, service_poster):
    service = models.Service(
        poster_id=service_poster.id,
        category="Carpentry",
        title="Custom Wooden Shelves",
        description="Handcrafted shelving for homes.",
        status=models.ServiceStatus.OPEN,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


def test_apply_to_service_success(client, open_service, community_user, community_user_auth_headers, db_session):
    """DoD: Community member can apply to an open service with a message."""
    payload = {"message": "Hi, I have 3 shelves that need building this Friday."}
    response = client.post(f"/services/{open_service.id}/apply", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["service_id"] == open_service.id
    assert data["applicant_id"] == community_user.id
    assert data["message"] == "Hi, I have 3 shelves that need building this Friday."

    # Verify DB persistence
    app_record = db_session.query(models.ServiceApplication).filter_by(
        service_id=open_service.id, applicant_id=community_user.id
    ).first()
    assert app_record is not None
    assert app_record.message == payload["message"]


def test_apply_to_own_service_rejected(client, open_service, service_poster):
    """DoD: Poster cannot apply to their own service advert."""
    poster_headers = get_auth_headers_for_user(service_poster)
    response = client.post(f"/services/{open_service.id}/apply", json={"message": "Self apply"}, headers=poster_headers)
    assert response.status_code == 400
    assert "You can't apply to your own listing" in response.json()["detail"]


def test_duplicate_service_application_rejected(client, open_service, community_user_auth_headers):
    """DoD: Re-applying to same listing returns 400 Bad Request."""
    # First application
    resp1 = client.post(f"/services/{open_service.id}/apply", json={"message": "First"}, headers=community_user_auth_headers)
    assert resp1.status_code == 201

    # Second application
    resp2 = client.post(f"/services/{open_service.id}/apply", json={"message": "Duplicate"}, headers=community_user_auth_headers)
    assert resp2.status_code == 400
    assert "already applied" in resp2.json()["detail"]


def test_apply_to_closed_service_rejected(client, open_service, community_user_auth_headers, db_session):
    """DoD: Applying to a closed service is rejected."""
    open_service.status = models.ServiceStatus.CLOSED
    db_session.commit()

    response = client.post(f"/services/{open_service.id}/apply", json={"message": "Late application"}, headers=community_user_auth_headers)
    assert response.status_code == 400
    assert "no longer open" in response.json()["detail"]


def test_poster_view_applicants_success(client, open_service, service_poster, community_user, db_session):
    """DoD: Poster can view all applicants for their listing."""
    # Add application
    app_record = models.ServiceApplication(
        service_id=open_service.id, applicant_id=community_user.id, message="Interested!"
    )
    db_session.add(app_record)
    db_session.commit()

    poster_headers = get_auth_headers_for_user(service_poster)
    response = client.get(f"/services/{open_service.id}/applicants", headers=poster_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["applicant_id"] == community_user.id
    assert data[0]["message"] == "Interested!"


def test_non_owner_view_applicants_forbidden(client, open_service, community_user_auth_headers):
    """DoD: Non-owner member cannot view applicants of someone else's listing."""
    response = client.get(f"/services/{open_service.id}/applicants", headers=community_user_auth_headers)
    assert response.status_code == 403
    assert "Only the poster or an admin" in response.json()["detail"]

