"""
Unit Tests for Item 18: Peer Rating Feature for Services
========================================================
User Story:
  As a community member, I want to rate and review services posted by peers (1-5 stars with optional feedback)
  so that I can build local trust and help others find reliable services.

Acceptance Criteria:
  1. Authenticated member can rate another member's service (1-5 stars, optional comment).
  2. Submitting a new rating on the same service updates the member's existing rating (upsert).
  3. Service poster cannot rate their own listing (400 Bad Request).
  4. Scores outside 1-5 are rejected with validation errors (422).
  5. GET /services/{id}/ratings returns summary (average_rating, total_ratings) and review list with rater details.
  6. GET /services/ includes average_rating and rating_count for all listings.
  7. Member can delete their own rating via DELETE /services/{id}/ratings/mine.
  8. Unauthenticated requests to rate or delete return 401 Unauthorized.
"""

import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


@pytest.fixture
def service_poster(db_session):
    return create_user_in_db(
        db_session,
        username="lungile_plumber",
        email="lungile@example.com",
        display_name="Lungile Dlamini",
    )


@pytest.fixture
def sample_service(db_session, service_poster):
    service = models.Service(
        poster_id=service_poster.id,
        type=models.ServiceType.OFFER,
        category="Home repair",
        title="Plumbing and Leak Fixes",
        description="Reliable emergency plumbing.",
        price="R150 / hr",
        status=models.ServiceStatus.OPEN,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


def test_rate_service_success(client, sample_service, community_user, community_user_auth_headers):
    """DoD: Authenticated member can rate another member's service."""
    payload = {"score": 5, "comment": "Excellent work on our leaking pipe!"}
    response = client.post(f"/services/{sample_service.id}/ratings", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 5
    assert data["comment"] == "Excellent work on our leaking pipe!"
    assert data["service_id"] == sample_service.id
    assert data["user_id"] == community_user.id
    assert data["rater_username"] == community_user.username


def test_rate_service_update_existing(client, sample_service, community_user, community_user_auth_headers):
    """DoD: Rating a service again updates the existing rating (upsert)."""
    # First rating
    client.post(f"/services/{sample_service.id}/ratings", json={"score": 5, "comment": "Good"}, headers=community_user_auth_headers)

    # Updated rating
    response = client.post(
        f"/services/{sample_service.id}/ratings",
        json={"score": 4, "comment": "Updated: pretty good overall"},
        headers=community_user_auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 4
    assert data["comment"] == "Updated: pretty good overall"

    # Confirm only one rating exists
    ratings_resp = client.get(f"/services/{sample_service.id}/ratings")
    ratings_data = ratings_resp.json()
    assert ratings_data["total_ratings"] == 1
    assert ratings_data["average_rating"] == 4.0


def test_rate_service_self_rejected(client, sample_service, service_poster):
    """DoD: Service poster cannot rate their own listing."""
    poster_headers = get_auth_headers_for_user(service_poster)
    response = client.post(
        f"/services/{sample_service.id}/ratings",
        json={"score": 5, "comment": "I am the best"},
        headers=poster_headers,
    )
    assert response.status_code == 400
    assert "cannot rate your own service" in response.json()["detail"].lower()


def test_rate_service_invalid_score(client, sample_service, community_user_auth_headers):
    """DoD: Score below 1 or above 5 is rejected."""
    # Score 0
    resp_zero = client.post(f"/services/{sample_service.id}/ratings", json={"score": 0}, headers=community_user_auth_headers)
    assert resp_zero.status_code == 422

    # Score 6
    resp_six = client.post(f"/services/{sample_service.id}/ratings", json={"score": 6}, headers=community_user_auth_headers)
    assert resp_six.status_code == 422


def test_get_service_ratings_summary(client, sample_service, community_user, community_user_auth_headers, db_session):
    """DoD: Multiple ratings correctly calculate the average and list reviews."""
    second_user = create_user_in_db(
        db_session,
        username="ayanda_reviewer",
        email="ayanda@example.com",
        display_name="Ayanda M.",
    )
    second_headers = get_auth_headers_for_user(second_user)

    client.post(f"/services/{sample_service.id}/ratings", json={"score": 5, "comment": "Top notch"}, headers=community_user_auth_headers)
    client.post(f"/services/{sample_service.id}/ratings", json={"score": 3, "comment": "Decent service"}, headers=second_headers)

    response = client.get(f"/services/{sample_service.id}/ratings")
    assert response.status_code == 200
    data = response.json()
    assert data["total_ratings"] == 2
    assert data["average_rating"] == 4.0
    assert len(data["ratings"]) == 2
    comments = [r["comment"] for r in data["ratings"]]
    assert "Top notch" in comments
    assert "Decent service" in comments


def test_list_services_includes_rating(client, sample_service, community_user_auth_headers):
    """DoD: Service listings returned by GET /services/ include average_rating and rating_count."""
    client.post(f"/services/{sample_service.id}/ratings", json={"score": 5}, headers=community_user_auth_headers)

    response = client.get("/services/")
    assert response.status_code == 200
    items = response.json()
    target = next((s for s in items if s["id"] == sample_service.id), None)
    assert target is not None
    assert target["average_rating"] == 5.0
    assert target["rating_count"] == 1


def test_delete_my_rating(client, sample_service, community_user_auth_headers):
    """DoD: Member can delete their own rating, updating the service average."""
    client.post(f"/services/{sample_service.id}/ratings", json={"score": 5}, headers=community_user_auth_headers)

    # Delete
    del_resp = client.delete(f"/services/{sample_service.id}/ratings/mine", headers=community_user_auth_headers)
    assert del_resp.status_code == 200

    # Verify ratings are now empty
    summary = client.get(f"/services/{sample_service.id}/ratings").json()
    assert summary["total_ratings"] == 0
    assert summary["average_rating"] is None


def test_unauthenticated_rate_and_delete_rejected(client, sample_service):
    """DoD: Unauthenticated requests return 401 Unauthorized."""
    post_resp = client.post(f"/services/{sample_service.id}/ratings", json={"score": 5})
    assert post_resp.status_code == 401

    del_resp = client.delete(f"/services/{sample_service.id}/ratings/mine")
    assert del_resp.status_code == 401

