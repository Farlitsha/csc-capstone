"""
Unit Tests for Backlog Item 2: Profile Management
=================================================
Kanban Item: Profile Management
PDF Spec: Backlog Item 2 (Profile management)

User Story:
  As a community member, I want to edit my profile (display name, bio, contact details, avatar)
  and view public profiles of others while keeping my private data secure.

Acceptance Criteria (DoD):
  1. GET /users/me returns full authenticated user private profile.
  2. PATCH /users/me/profile updates display name, bio, contact phone/email and persists in DB.
  3. POST /users/me/avatar uploads and stores avatar image (JPEG/PNG/WebP, <= 2MB).
  4. Unsupported avatar MIME types (e.g. text/plain, image/gif) are rejected with 422.
  5. Oversized avatars (> 2MB) are rejected with 413.
  6. GET /users/{id} returns only public fields (display name, bio, avatar) and hides private phone/email.
  7. Unauthenticated requests to private profile return 401.
"""

import io
import pytest
from app import models


def test_get_current_user_private_profile(client, community_user, community_user_auth_headers):
    """DoD: Authenticated user can fetch their complete private profile."""
    response = client.get("/users/me", headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == community_user.username
    assert data["email"] == community_user.email
    assert data["display_name"] == community_user.display_name
    assert "role" in data
    assert "struggles" in data


def test_get_current_user_unauthenticated_fails(client):
    """DoD: Unauthenticated request to /users/me returns 401 Unauthorized."""
    response = client.get("/users/me")
    assert response.status_code == 401


def test_update_profile_fields(client, community_user, community_user_auth_headers, db_session):
    """DoD: Patching profile updates display name, bio, and contact details."""
    payload = {
        "display_name": "Sipho K. Senior",
        "bio": "Community organiser with 5 years experience in local food security.",
        "phone": "0839998877",
        "contact_phone": "0839998877",
        "contact_email": "sipho.contact@example.com",
    }
    response = client.patch("/users/me/profile", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Sipho K. Senior"
    assert data["bio"] == "Community organiser with 5 years experience in local food security."
    assert data["contact_email"] == "sipho.contact@example.com"

    # Verify DB persistence
    db_user = db_session.query(models.User).filter_by(id=community_user.id).first()
    assert db_user.display_name == "Sipho K. Senior"
    assert db_user.bio == "Community organiser with 5 years experience in local food security."


def test_upload_avatar_valid_image(client, community_user, community_user_auth_headers):
    """DoD: Uploading a valid JPEG avatar stores file and updates avatar_url."""
    fake_image_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"A" * 100
    files = {
        "file": ("avatar.jpg", io.BytesIO(fake_image_bytes), "image/jpeg")
    }
    response = client.post("/users/me/avatar", files=files, headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["avatar_url"] is not None
    assert "/uploads/avatars/" in data["avatar_url"]


def test_upload_avatar_unsupported_type_rejected(client, community_user, community_user_auth_headers):
    """DoD: Uploading non-allowed MIME type (e.g. text/plain or executable) returns 422."""
    files = {
        "file": ("script.sh", io.BytesIO(b"echo 'malicious'"), "text/plain")
    }
    response = client.post("/users/me/avatar", files=files, headers=community_user_auth_headers)
    assert response.status_code == 422
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_avatar_oversized_rejected(client, community_user, community_user_auth_headers):
    """DoD: Uploading image larger than 2MB returns 413 Payload Too Large."""
    oversized_bytes = b"X" * (2 * 1024 * 1024 + 1024)  # 2MB + 1KB
    files = {
        "file": ("large_image.png", io.BytesIO(oversized_bytes), "image/png")
    }
    response = client.post("/users/me/avatar", files=files, headers=community_user_auth_headers)
    assert response.status_code == 413
    assert "2 MB or smaller" in response.json()["detail"]


def test_get_public_profile_of_another_user(client, community_user, admin_user, community_user_auth_headers):
    """DoD: Public profile returns display name, bio, avatar, but hides email/phone."""
    response = client.get(f"/users/{admin_user.id}", headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == admin_user.username
    assert data["display_name"] == admin_user.display_name
    assert "email" not in data
    assert "phone" not in data
    assert "contact_email" not in data


def test_get_nonexistent_user_profile_returns_404(client, community_user_auth_headers):
    """DoD: Requesting public profile for non-existent ID returns 404."""
    response = client.get("/users/99999", headers=community_user_auth_headers)
    assert response.status_code == 404

