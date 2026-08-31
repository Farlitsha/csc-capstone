"""
Unit Tests for Backlog Item 1: Login and Profiles (Account Management)
=======================================================================
Kanban Item: Login and Profiles
PDF Spec: Backlog Item 1 (Account Management)

User Story:
  As a user (community member / researcher / admin), I want to create an account,
  log in securely, update my credentials, and delete my account so that I can access
  the platform or remove my personal information under POPIA.

Acceptance Criteria (DoD):
  1. Valid registration creates user in DB with hashed password and correct role.
  2. 5-digit PIN password validation is enforced.
  3. Duplicate email or duplicate username is rejected with 409 Conflict.
  4. Login accepts username, display_name, or email with valid PIN and issues JWT.
  5. Invalid login credentials returns 401 Unauthorized.
  6. Authenticated user can update email and PIN.
  7. Account deletion removes record from DB.
"""

import pytest
from app import models, utils


def test_register_community_member_success(client, db_session):
    """DoD: Valid community member signup succeeds and persists in DB with correct role."""
    payload = {
        "username": "thabo123",
        "email": "thabo@example.com",
        "password": "12345",
        "role": "community_member",
        "display_name": "Thabo Mbeki",
        "phone": "0712345678",
        "struggles": ["employment", "housing"],
    }
    response = client.post("/users/account/create", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "thabo123"
    assert data["email"] == "thabo@example.com"
    assert data["role"] == "community_member"
    assert data["verification_status"] == "none"

    # Verify password is not plaintext in DB
    db_user = db_session.query(models.User).filter_by(username="thabo123").first()
    assert db_user is not None
    assert db_user.password != "12345"
    assert utils.verify_password("12345", db_user.password)


def test_register_invalid_pin_rejected(client):
    """DoD: PIN must be exactly 5 digits; alphabetic or non-5-digit strings are rejected."""
    # Non-digit
    resp1 = client.post("/users/account/create", json={
        "username": "badpin1", "email": "bad1@example.com", "password": "abcde"
    })
    assert resp1.status_code == 422

    # Too short
    resp2 = client.post("/users/account/create", json={
        "username": "badpin2", "email": "bad2@example.com", "password": "123"
    })
    assert resp2.status_code == 422

    # Too long
    resp3 = client.post("/users/account/create", json={
        "username": "badpin3", "email": "bad3@example.com", "password": "123456"
    })
    assert resp3.status_code == 422


def test_register_duplicate_email_conflict(client, community_user):
    """DoD: Duplicate email registration returns 409 Conflict."""
    payload = {
        "username": "another_user",
        "email": community_user.email,  # duplicate
        "password": "54321",
    }
    response = client.post("/users/account/create", json=payload)
    assert response.status_code == 409
    assert "email already exists" in response.json()["detail"]


def test_register_duplicate_username_conflict(client, community_user):
    """DoD: Duplicate username registration returns 409 Conflict."""
    payload = {
        "username": community_user.username,  # duplicate
        "email": "brandnew@example.com",
        "password": "54321",
    }
    response = client.post("/users/account/create", json=payload)
    assert response.status_code == 409
    assert "username already exists" in response.json()["detail"]


def test_login_with_username_success(client, community_user):
    """DoD: Login with username + valid PIN returns JWT access token."""
    response = client.post(
        "/users/login",
        data={"username": community_user.username, "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_with_email_success(client, community_user):
    """DoD: Login with email + valid PIN returns JWT access token."""
    response = client.post(
        "/users/login",
        data={"username": community_user.email, "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_with_display_name_success(client, community_user):
    """DoD: Login with display name + valid PIN returns JWT access token."""
    response = client.post(
        "/users/login",
        data={"username": community_user.display_name, "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_password_fails(client, community_user):
    """DoD: Incorrect PIN returns 401 Unauthorized."""
    response = client.post(
        "/users/login",
        data={"username": community_user.username, "password": "99999"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_login_nonexistent_user_fails(client):
    """DoD: Login with unknown username returns 401 Unauthorized."""
    response = client.post(
        "/users/login",
        data={"username": "ghost_user", "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401


def test_update_account_credentials(client, community_user, community_user_auth_headers, db_session):
    """DoD: Authenticated user can update their login email and password."""
    update_payload = {
        "username": community_user.username,
        "email": "new_email@example.com",
        "password": "98765",
    }
    response = client.put("/users/account/update", json=update_payload, headers=community_user_auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "new_email@example.com"

    # Verify new credentials work for login
    login_resp = client.post(
        "/users/login",
        data={"username": "new_email@example.com", "password": "98765"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_resp.status_code == 200


def test_delete_own_account(client, community_user, community_user_auth_headers, db_session):
    """DoD: User can permanently delete their own account."""
    user_id = community_user.id
    response = client.delete(f"/users/{user_id}", headers=community_user_auth_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "User deleted successfully"

    # Verify user record is gone from DB
    deleted = db_session.query(models.User).filter_by(id=user_id).first()
    assert deleted is None


def test_delete_other_user_account_forbidden(client, community_user, admin_user, community_user_auth_headers):
    """DoD: A regular user cannot delete another user's account."""
    response = client.delete(f"/users/{admin_user.id}", headers=community_user_auth_headers)
    assert response.status_code == 403

