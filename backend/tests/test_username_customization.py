import pytest
from app import models

def test_signup_with_custom_username_sets_display_name_default(client, db_session):
    """DoD: Providing a custom username sets username and defaults display_name to it if not given."""
    payload = {
        "username": "custom_user99",
        "password": "12345",
        "role": "community_member",
        "submission_duration_ms": 3000,
    }
    response = client.post("/users/account/create", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "custom_user99"
    assert data["display_name"] == "custom_user99"

    db_user = db_session.query(models.User).filter_by(username="custom_user99").first()
    assert db_user is not None
    assert db_user.display_name == "custom_user99"


def test_signup_with_custom_username_case_insensitive_duplicate(client, db_session):
    """DoD: Registering with existing username (case-insensitive) returns 409."""
    payload1 = {
        "username": "unique_name1",
        "password": "12345",
        "submission_duration_ms": 3000,
    }
    resp1 = client.post("/users/account/create", json=payload1)
    assert resp1.status_code == 201

    payload2 = {
        "username": "UNIQUE_NAME1",
        "password": "12345",
        "submission_duration_ms": 3000,
    }
    resp2 = client.post("/users/account/create", json=payload2)
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"].lower()


def test_update_profile_username_success(client, community_user, community_user_auth_headers, db_session):
    """DoD: Updating username via PATCH /users/me/profile updates username and syncs display_name."""
    # Ensure current user display_name matches username
    community_user.display_name = community_user.username
    db_session.commit()

    update_payload = {
        "username": "brand_new_handle",
    }
    response = client.patch("/users/me/profile", json=update_payload, headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "brand_new_handle"
    assert data["display_name"] == "brand_new_handle"

    # Check database
    db_session.refresh(community_user)
    assert community_user.username == "brand_new_handle"
    assert community_user.display_name == "brand_new_handle"


def test_update_profile_username_conflict(client, community_user, admin_user, community_user_auth_headers):
    """DoD: Updating username to one already taken by another user returns 409."""
    update_payload = {
        "username": admin_user.username,
    }
    response = client.patch("/users/me/profile", json=update_payload, headers=community_user_auth_headers)
    assert response.status_code == 409
    assert "already taken" in response.json()["detail"].lower()


def test_update_profile_username_invalid_chars(client, community_user, community_user_auth_headers):
    """DoD: Invalid username characters or length fails validation."""
    resp1 = client.patch("/users/me/profile", json={"username": "ab"}, headers=community_user_auth_headers)
    assert resp1.status_code == 422

    resp2 = client.patch("/users/me/profile", json={"username": "invalid username with spaces"}, headers=community_user_auth_headers)
    assert resp2.status_code == 422


def test_login_with_updated_username(client, community_user, community_user_auth_headers):
    """DoD: After updating username, user can log in with new username."""
    update_payload = {
        "username": "new_login_user",
    }
    resp = client.patch("/users/me/profile", json=update_payload, headers=community_user_auth_headers)
    assert resp.status_code == 200

    login_resp = client.post("/users/login", data={"username": "new_login_user", "password": "12345"})
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()
