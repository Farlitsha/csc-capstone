"""
Unit Tests for Backlog Item 3: Adverts (Service Directory Listings)
===================================================================
Kanban Item: Adverts
PDF Spec: Backlog Item 3 (Service directory)

User Story:
  As a community member, I want to create, manage, upload photos for, and close/delete
  service adverts (offers/requests) so that I can advertise my skills or request assistance.

Acceptance Criteria (DoD):
  1. POST /services/ creates an open listing associated with the logged-in member.
  2. POST /services/upload-photo uploads a service image (<= 5MB, JPEG/PNG/WebP).
  3. GET /services/{id} retrieves full details including poster contact details.
  4. PATCH /services/{id}/close allows only poster or admin to close the listing.
  5. DELETE /services/{id} allows only poster or admin to remove the listing.
  6. Non-owners are forbidden (403) from closing or deleting other people's listings.
  7. Audit log captures closure and deletion actions.
"""

import io
import pytest
from app import models


def test_create_service_advert_offer(client, community_user, community_user_auth_headers, db_session):
    """DoD: Logged-in member can create a service advert offer."""
    payload = {
        "type": "offer",
        "category": "Gardening",
        "title": "Lawn Mowing & Yard Cleanup",
        "description": "Available on weekends for garden maintenance in the community.",
        "price": "R150 / session",
    }
    response = client.post("/services/", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Lawn Mowing & Yard Cleanup"
    assert data["type"] == "offer"
    assert data["category"] == "Gardening"
    assert data["status"] == "open"
    assert data["poster_id"] == community_user.id
    assert data["poster_username"] == community_user.username


def test_create_service_advert_request(client, community_user, community_user_auth_headers):
    """DoD: Member can create a service request."""
    payload = {
        "type": "request",
        "category": "Tutoring",
        "title": "Need Grade 10 Maths Tutor",
        "description": "Looking for tutor twice a week after school.",
        "price": "R100 / hr",
    }
    response = client.post("/services/", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 201
    assert response.json()["type"] == "request"


def test_upload_service_photo_success(client, community_user_auth_headers):
    """DoD: Uploading a valid image for a service listing returns relative image URL."""
    fake_img = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    files = {"file": ("tool.png", io.BytesIO(fake_img), "image/png")}
    response = client.post("/services/upload-photo", files=files, headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "image_url" in data
    assert "/uploads/services/" in data["image_url"]


def test_upload_service_photo_oversized_rejected(client, community_user_auth_headers):
    """DoD: Uploading service image exceeding 5MB returns 413."""
    oversized = b"P" * (5 * 1024 * 1024 + 1024)
    files = {"file": ("big.jpg", io.BytesIO(oversized), "image/jpeg")}
    response = client.post("/services/upload-photo", files=files, headers=community_user_auth_headers)
    assert response.status_code == 413
    assert "5 MB or smaller" in response.json()["detail"]


def test_get_single_service_by_id(client, community_user, community_user_auth_headers):
    """DoD: Fetching a service by ID returns full advert details and poster contact info."""
    create_resp = client.post("/services/", json={
        "category": "Plumbing", "title": "Leak Repair", "description": "Fix pipes", "price": "R200"
    }, headers=community_user_auth_headers)
    service_id = create_resp.json()["id"]

    get_resp = client.get(f"/services/{service_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == service_id
    assert data["poster_email"] == community_user.email
    assert data["poster_phone"] == community_user.phone


def test_close_service_advert_by_owner(client, community_user, community_user_auth_headers, db_session):
    """DoD: Service owner can close an active listing."""
    create_resp = client.post("/services/", json={
        "category": "Electrical", "title": "Wiring fix", "description": "Quick fix"
    }, headers=community_user_auth_headers)
    service_id = create_resp.json()["id"]

    close_resp = client.patch(f"/services/{service_id}/close", headers=community_user_auth_headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"

    # Verify DB state
    db_service = db_session.query(models.Service).filter_by(id=service_id).first()
    assert db_service.status == models.ServiceStatus.CLOSED


def test_close_service_advert_by_unauthorized_user_forbidden(client, community_user, admin_user, db_session):
    """DoD: Non-owner cannot close another user's advert."""
    # Create service as community user
    service = models.Service(
        poster_id=community_user.id, category="Tech", title="PC Repair", description="Fixes"
    )
    db_session.add(service)
    db_session.commit()

    # Another regular user tries to close it
    from tests.conftest import create_user_in_db, get_auth_headers_for_user
    intruder = create_user_in_db(db_session, username="intruder", email="intruder@test.com")
    intruder_headers = get_auth_headers_for_user(intruder)

    close_resp = client.patch(f"/services/{service.id}/close", headers=intruder_headers)
    assert close_resp.status_code == 403
    assert "Only the poster or an admin" in close_resp.json()["detail"]


def test_delete_service_by_admin(client, community_user, admin_user, admin_auth_headers, db_session):
    """DoD: Admin can delete any service listing."""
    service = models.Service(
        poster_id=community_user.id, category="Misc", title="To Be Deleted", description="Desc"
    )
    db_session.add(service)
    db_session.commit()
    service_id = service.id

    del_resp = client.delete(f"/services/{service_id}", headers=admin_auth_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["message"] == "Service listing deleted successfully"

    # Verify listing is removed from DB
    assert db_session.query(models.Service).filter_by(id=service_id).first() is None

