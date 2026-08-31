"""
Unit Tests for Backlog Item 6: Researcher Verification
======================================================
Kanban Item: Researcher verification
PDF Spec: Backlog Item 4 / 7 (Research management & Admin role authorization)

User Story:
  As an administrator, I want to review, approve, or reject pending researcher registrations,
  and prevent unverified accounts from conducting research or scheduling sessions.

Acceptance Criteria (DoD):
  1. Signup with role=researcher automatically sets verification_status=pending.
  2. GET /users/admin/researchers/pending lists all pending researcher accounts for admin.
  3. PATCH /users/admin/researchers/{id}/approve transitions status to 'verified'.
  4. PATCH /users/admin/researchers/{id}/reject transitions status to 'rejected'.
  5. Non-admin users cannot access approval/rejection endpoints (403 Forbidden).
  6. Unverified/pending researchers are blocked from creating studies (403).
  7. Unverified/pending researchers are blocked from creating workshops (403).
  8. Verified researchers can successfully create studies and schedule workshops.
"""

import pytest
from app import models


def test_researcher_registration_defaults_to_pending(client, db_session):
    """DoD: New researcher signup initializes with verification_status=pending."""
    payload = {
        "username": "dr_alice",
        "email": "alice@uct.ac.za",
        "password": "12345",
        "role": "researcher",
        "display_name": "Dr. Alice Smith",
    }
    response = client.post("/users/account/create", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "researcher"
    assert data["verification_status"] == "pending"


def test_admin_list_pending_researchers(client, unverified_researcher, admin_auth_headers):
    """DoD: Admin can retrieve the list of pending researchers."""
    response = client.get("/users/admin/researchers/pending", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    usernames = [r["username"] for r in data]
    assert unverified_researcher.username in usernames


def test_admin_approve_researcher(client, unverified_researcher, admin_auth_headers, db_session):
    """DoD: Admin approves pending researcher, updating status to verified."""
    response = client.patch(
        f"/users/admin/researchers/{unverified_researcher.id}/approve",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["verification_status"] == "verified"

    # Verify DB persistence
    db_user = db_session.query(models.User).filter_by(id=unverified_researcher.id).first()
    assert db_user.verification_status == models.VerificationStatus.VERIFIED


def test_admin_reject_researcher(client, unverified_researcher, admin_auth_headers, db_session):
    """DoD: Admin rejects pending researcher, updating status to rejected."""
    response = client.patch(
        f"/users/admin/researchers/{unverified_researcher.id}/reject",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["verification_status"] == "rejected"

    db_user = db_session.query(models.User).filter_by(id=unverified_researcher.id).first()
    assert db_user.verification_status == models.VerificationStatus.REJECTED


def test_non_admin_cannot_approve_researcher(client, unverified_researcher, community_user_auth_headers):
    """DoD: Community member cannot approve researcher accounts (403 Forbidden)."""
    response = client.patch(
        f"/users/admin/researchers/{unverified_researcher.id}/approve",
        headers=community_user_auth_headers,
    )
    assert response.status_code == 403


def test_unverified_researcher_blocked_from_creating_study(client, unverified_researcher_auth_headers):
    """DoD: Pending researcher cannot post study listing (403 Forbidden)."""
    payload = {
        "title": "Community Health Study",
        "description": "Investigating access to clinics",
    }
    response = client.post("/studies/", json=payload, headers=unverified_researcher_auth_headers)
    assert response.status_code == 403
    assert "pending admin verification" in response.json()["detail"]


def test_unverified_researcher_blocked_from_creating_workshop(client, unverified_researcher_auth_headers):
    """DoD: Pending researcher cannot schedule workshops (403 Forbidden)."""
    payload = {
        "title": "Nutrition Focus Group",
        "description": "In-person discussion",
        "location": "Community Hall",
        "date_time": "2028-10-15T10:00:00Z",
        "max_participants": 15,
    }
    response = client.post("/workshops/", json=payload, headers=unverified_researcher_auth_headers)
    assert response.status_code == 403
    assert "pending admin verification" in response.json()["detail"]


def test_verified_researcher_can_create_study(client, verified_researcher_auth_headers):
    """DoD: Verified researcher can post study listing successfully."""
    payload = {
        "title": "Verified Study on Water Access",
        "description": "Assessing municipal water delivery reliability",
        "honorarium": "R100 Voucher",
        "participant_limit": 20,
    }
    response = client.post("/studies/", json=payload, headers=verified_researcher_auth_headers)
    assert response.status_code == 201
    assert response.json()["title"] == payload["title"]
    assert response.json()["state"] == "live"

