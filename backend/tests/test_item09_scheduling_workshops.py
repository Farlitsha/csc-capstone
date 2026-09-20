"""
Unit Tests for Backlog Item 9: Scheduling for Interviews and Workshops
======================================================================
Kanban Item: Scheduling for interviews/workshops
PDF Spec: Backlog Item 5 (Scheduling and Event)

User Story:
  As a researcher, I want to schedule, edit, and cancel interview/workshop sessions.
  As a community member, I want to reserve a slot, prevent double-booking, cancel my slot,
  and view upcoming confirmed sessions.

Acceptance Criteria (DoD):
  1. POST /workshops/ schedules a workshop with positive capacity and future date.
  2. Past dates or zero/negative participant limits are rejected with 422.
  3. GET /workshops/ returns scheduled sessions and registered participant counts.
  4. PATCH /workshops/{id} allows organizer/admin to update details.
  5. PATCH /workshops/{id}/cancel marks workshop as cancelled.
  6. POST /workshops/{id}/register reserves a slot for authenticated member.
  7. Duplicate registration for same session is rejected with 400.
  8. Registration fails when session is fully booked or cancelled (400).
  9. DELETE /workshops/{id}/register allows member to cancel reservation.
  10. GET /workshops/{id}/registrations provides roster to organizer/admin.
"""

from datetime import datetime, timedelta, timezone
import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


@pytest.fixture
def future_workshop(db_session, verified_researcher):
    session_time = datetime.now(timezone.utc) + timedelta(days=7)
    workshop = models.Workshop(
        organizer_id=verified_researcher.id,
        title="Community Skills Workshop",
        description="Hands-on digital literacy session",
        location="Ocean View Civic Centre",
        date_time=session_time,
        max_participants=2,
        status=models.WorkshopStatus.SCHEDULED,
    )
    db_session.add(workshop)
    db_session.commit()
    db_session.refresh(workshop)
    return workshop


def test_schedule_workshop_success(client, verified_researcher_auth_headers):
    """DoD: Verified researcher schedules an upcoming workshop."""
    future_time = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    payload = {
        "title": "Health & Nutrition Workshop",
        "description": "Healthy cooking on a budget",
        "location": "Local Library Hall",
        "date_time": future_time,
        "max_participants": 20,
    }
    response = client.post("/workshops/", json=payload, headers=verified_researcher_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "scheduled"
    assert data["max_participants"] == 20


def test_schedule_workshop_past_date_rejected(client, verified_researcher_auth_headers):
    """DoD: Setting workshop date in the past fails schema validation (422)."""
    past_time = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    payload = {
        "title": "Past Workshop",
        "description": "Already happened",
        "location": "Room 1",
        "date_time": past_time,
        "max_participants": 10,
    }
    response = client.post("/workshops/", json=payload, headers=verified_researcher_auth_headers)
    assert response.status_code == 422


def test_schedule_workshop_invalid_capacity_rejected(client, verified_researcher_auth_headers):
    """DoD: Capacity <= 0 is rejected with 422."""
    future_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    payload = {
        "title": "Zero Capacity Workshop",
        "description": "Invalid",
        "location": "Room 2",
        "date_time": future_time,
        "max_participants": 0,
    }
    response = client.post("/workshops/", json=payload, headers=verified_researcher_auth_headers)
    assert response.status_code == 422


def test_register_for_workshop_success(client, future_workshop, community_user, community_user_auth_headers, db_session):
    """DoD: Community member books a slot in an upcoming workshop."""
    response = client.post(f"/workshops/{future_workshop.id}/register", headers=community_user_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["workshop_id"] == future_workshop.id
    assert data["user_id"] == community_user.id

    # Verify registration count
    reg_count = db_session.query(models.WorkshopRegistration).filter_by(workshop_id=future_workshop.id).count()
    assert reg_count == 1


def test_register_duplicate_booking_prevented(client, future_workshop, community_user_auth_headers):
    """DoD: Double booking by the same member is prevented (400 Bad Request)."""
    resp1 = client.post(f"/workshops/{future_workshop.id}/register", headers=community_user_auth_headers)
    assert resp1.status_code == 201

    resp2 = client.post(f"/workshops/{future_workshop.id}/register", headers=community_user_auth_headers)
    assert resp2.status_code == 400
    assert "already registered" in resp2.json()["detail"]


def test_register_fully_booked_workshop_prevented(client, future_workshop, db_session):
    """DoD: Registering when max_participants is reached returns 400 Fully Booked."""
    # Capacity is 2
    u1 = create_user_in_db(db_session, username="booker1", email="b1@test.com")
    u2 = create_user_in_db(db_session, username="booker2", email="b2@test.com")
    u3 = create_user_in_db(db_session, username="booker3", email="b3@test.com")

    r1 = models.WorkshopRegistration(workshop_id=future_workshop.id, user_id=u1.id)
    r2 = models.WorkshopRegistration(workshop_id=future_workshop.id, user_id=u2.id)
    db_session.add_all([r1, r2])
    db_session.commit()

    u3_headers = get_auth_headers_for_user(u3)
    response = client.post(f"/workshops/{future_workshop.id}/register", headers=u3_headers)
    assert response.status_code == 400
    assert "fully booked" in response.json()["detail"]


def test_cancel_workshop_registration(client, future_workshop, community_user, community_user_auth_headers, db_session):
    """DoD: Member can cancel their workshop booking."""
    reg = models.WorkshopRegistration(workshop_id=future_workshop.id, user_id=community_user.id)
    db_session.add(reg)
    db_session.commit()

    response = client.delete(f"/workshops/{future_workshop.id}/register", headers=community_user_auth_headers)
    assert response.status_code == 200
    assert "cancelled successfully" in response.json()["message"]

    # Verify record is deleted
    assert db_session.query(models.WorkshopRegistration).filter_by(
        workshop_id=future_workshop.id, user_id=community_user.id
    ).first() is None


def test_cancel_workshop_by_organizer(client, future_workshop, verified_researcher_auth_headers, db_session):
    """DoD: Organizer can cancel a scheduled workshop."""
    response = client.patch(f"/workshops/{future_workshop.id}/cancel", headers=verified_researcher_auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"

    db_w = db_session.query(models.Workshop).filter_by(id=future_workshop.id).first()
    assert db_w.status == models.WorkshopStatus.CANCELLED


def test_view_workshop_roster(client, future_workshop, verified_researcher_auth_headers, community_user, db_session):
    """DoD: Organizer can view list of registered participants."""
    reg = models.WorkshopRegistration(workshop_id=future_workshop.id, user_id=community_user.id)
    db_session.add(reg)
    db_session.commit()

    response = client.get(f"/workshops/{future_workshop.id}/registrations", headers=verified_researcher_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["participant_username"] == community_user.username


def test_workshops_filtered_by_organizer_id(client, future_workshop, verified_researcher):
    """DoD: Workshops list can be filtered strictly by organizer_id for researcher dashboard."""
    res = client.get(f"/workshops/?include_cancelled=true&organizer_id={verified_researcher.id}")
    assert res.status_code == 200
    workshops = res.json()
    assert len(workshops) >= 1
    assert all(w["organizer_id"] == verified_researcher.id for w in workshops)

    res_empty = client.get("/workshops/?include_cancelled=true&organizer_id=99999")
    assert res_empty.status_code == 200
    assert res_empty.json() == []


