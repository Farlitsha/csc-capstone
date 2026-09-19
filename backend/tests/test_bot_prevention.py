import pytest
from app import models, utils

def test_signup_honeypot_triggers_rejection(client):
    payload = {
        "display_name": "Bot Tester",
        "password": "12345",
        "website_hp": "http://spam-link.xyz",
        "submission_duration_ms": 3000,
    }
    resp = client.post("/users/account/create", json=payload)
    assert resp.status_code == 400
    assert "Spam submission detected" in resp.json()["detail"]


def test_signup_fast_submission_triggers_rejection(client):
    payload = {
        "display_name": "Fast Bot",
        "password": "12345",
        "submission_duration_ms": 400,  # under 1200ms
    }
    resp = client.post("/users/account/create", json=payload)
    assert resp.status_code == 400
    assert "Spam submission detected" in resp.json()["detail"]


def test_signup_valid_submission_succeeds(client):
    payload = {
        "display_name": "Human User",
        "password": "12345",
        "submission_duration_ms": 4500,
    }
    resp = client.post("/users/account/create", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["display_name"] == "Human User"


def test_service_honeypot_and_timing(client, community_user_auth_headers):
    # Honeypot filled
    hp_payload = {
        "category": "Home repair",
        "title": "Cheap plumbing",
        "description": "Call me now",
        "website_hp": "spam_bot_field",
        "submission_duration_ms": 5000,
    }
    resp = client.post("/services/", json=hp_payload, headers=community_user_auth_headers)
    assert resp.status_code == 400
    assert "Spam submission detected" in resp.json()["detail"]

    # Timing too fast
    fast_payload = {
        "category": "Home repair",
        "title": "Cheap plumbing",
        "description": "Call me now",
        "submission_duration_ms": 500,
    }
    resp = client.post("/services/", json=fast_payload, headers=community_user_auth_headers)
    assert resp.status_code == 400
    assert "Spam submission detected" in resp.json()["detail"]

    # Valid service post
    valid_payload = {
        "category": "Home repair",
        "title": "Legit plumbing service",
        "description": "Experienced local plumber offering quality repairs.",
        "submission_duration_ms": 2500,
    }
    resp = client.post("/services/", json=valid_payload, headers=community_user_auth_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Legit plumbing service"


def test_rate_limiting_login(client):
    # Endpoint is limited to 15/minute
    # Send 16 rapid failed login requests
    hit_limit = False
    for i in range(18):
        resp = client.post(
            "/users/login",
            data={"username": f"baduser_{i}", "password": "00000"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code == 429:
            hit_limit = True
            break
    assert hit_limit, "Expected 429 Too Many Requests after exceeding 15 attempts/min"
