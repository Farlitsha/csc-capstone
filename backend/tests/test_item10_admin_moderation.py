"""
Unit Tests for Backlog Item 10: Admin Moderation
=================================================
Kanban Item: Admin Moderation
PDF Spec: Backlog Item 7 (Admin and Moderation)

User Story:
  As an administrator, I want to manage user roles, review platform stats, view all accounts,
  broadcast system announcements, and enforce strict role-based access control (RBAC).

Acceptance Criteria (DoD):
  1. GET /users/admin-bootstrap-status reflects whether an admin exists.
  2. PATCH /users/{id}/role allows admin to promote/demote user roles.
  3. Non-admin users cannot access admin role change endpoint (403 Forbidden).
  4. GET /users/admin/stats provides total counts of users, studies, services, workshops.
  5. GET /users/accounts/all returns paginated user list for admin.
  6. POST /announcements/ allows admin to broadcast announcements.
  7. Non-admin users cannot post announcements (403 Forbidden).
  8. GET /announcements/ provides public list of platform announcements.
"""

import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


def test_admin_bootstrap_status_true_when_admin_exists(client, admin_user):
    """DoD: Returns admin_exists=True when an admin user is present in DB."""
    response = client.get("/users/admin-bootstrap-status")
    assert response.status_code == 200
    data = response.json()
    assert data["admin_exists"] is True
    assert data["can_bootstrap_admin"] is False


def test_admin_update_user_role(client, community_user, admin_user, admin_auth_headers, db_session):
    """DoD: Admin can promote a community member to researcher role."""
    response = client.patch(
        f"/users/{community_user.id}/role",
        json={"role": "researcher"},
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["role"] == "researcher"

    # Verify in DB
    db_user = db_session.query(models.User).filter_by(id=community_user.id).first()
    assert db_user.role == models.UserRole.RESEARCHER


def test_non_admin_cannot_promote_roles(client, community_user, admin_user, community_user_auth_headers):
    """DoD: Regular member cannot alter user roles (403 Forbidden)."""
    response = client.patch(
        f"/users/{community_user.id}/role",
        json={"role": "admin"},
        headers=community_user_auth_headers,
    )
    assert response.status_code == 403


def test_admin_stats_endpoint(client, admin_user, admin_auth_headers, community_user, verified_researcher):
    """DoD: Admin stats endpoint returns accurate breakdown of platform entities."""
    response = client.get("/users/admin/stats", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_users"] >= 3
    assert data["admins"] >= 1
    assert data["researchers"] >= 1
    assert data["community_members"] >= 1


def test_admin_get_all_accounts(client, admin_user, admin_auth_headers):
    """DoD: Admin retrieves all registered accounts with pagination."""
    response = client.get("/users/accounts/all?skip=0&limit=10", headers=admin_auth_headers)
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1


def test_admin_post_announcement_and_public_view(client, admin_user, admin_auth_headers):
    """DoD: Admin posts platform announcement and public can view it."""
    payload = {
        "audience": "All members",
        "content": "Water maintenance scheduled for Sector 4 this Wednesday.",
    }
    post_resp = client.post("/announcements/", json=payload, headers=admin_auth_headers)
    assert post_resp.status_code == 201
    assert post_resp.json()["content"] == payload["content"]
    assert post_resp.json()["author_username"] == admin_user.username

    # Public list
    list_resp = client.get("/announcements/")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1
    assert items[0]["content"] == payload["content"]


def test_community_member_cannot_post_announcement(client, admin_user, community_user_auth_headers):
    """DoD: Non-admin member cannot post announcement (403 Forbidden)."""
    payload = {"audience": "All members", "content": "Fake announcement"}
    response = client.post("/announcements/", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 403


def test_admin_login_endpoint_success(client, admin_user):
    """DoD: Dedicated /users/admin/login authenticates admin and returns token."""
    response = client.post(
        "/users/admin/login",
        data={"username": admin_user.username, "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_admin_login_rejects_non_admin_user(client, community_user):
    """DoD: Dedicated /users/admin/login rejects non-admin users with 403 Forbidden."""
    response = client.post(
        "/users/admin/login",
        data={"username": community_user.username, "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 403
    assert "administrators are authorized" in response.json()["detail"].lower()


def test_standard_login_rejects_admin_user(client, admin_user):
    """DoD: Standard /users/login rejects administrator accounts with 403 redirecting to /admin/login."""
    response = client.post(
        "/users/login",
        data={"username": admin_user.username, "password": "12345"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 403
    assert "/admin/login" in response.json()["detail"]


def test_admin_login_invalid_credentials_fails(client, admin_user):
    """DoD: Invalid password on /users/admin/login returns 401 Unauthorized."""
    response = client.post(
        "/users/admin/login",
        data={"username": admin_user.username, "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401


def test_admin_delete_announcement(client, admin_user, admin_auth_headers):
    """DoD: Admin can delete an existing announcement."""
    post_resp = client.post(
        "/announcements/",
        json={"audience": "All members", "content": "Notice to be deleted"},
        headers=admin_auth_headers,
    )
    assert post_resp.status_code == 201
    ann_id = post_resp.json()["id"]

    del_resp = client.delete(f"/announcements/{ann_id}", headers=admin_auth_headers)
    assert del_resp.status_code == 200

    # Ensure it is removed
    list_resp = client.get("/announcements/")
    ids = [a["id"] for a in list_resp.json()]
    assert ann_id not in ids


def test_admin_cannot_delete_self(client, admin_user, admin_auth_headers):
    """DoD: Admin cannot delete their own active account from the admin console."""
    response = client.delete(f"/users/{admin_user.id}", headers=admin_auth_headers)
    assert response.status_code == 400
    assert "Cannot delete your own" in response.json()["detail"]


def test_admin_delete_user_creates_audit_log(client, admin_user, admin_auth_headers, db_session):
    """DoD: Deleting a user generates a record in the audit log."""
    user = create_user_in_db(db_session, username="victim_user", email="victim@example.com")
    del_resp = client.delete(f"/users/{user.id}", headers=admin_auth_headers)
    assert del_resp.status_code == 200

    audit_entry = db_session.query(models.AuditLog).filter_by(
        action="user_deleted",
        target_type="user",
        target_id=user.id,
    ).first()
    assert audit_entry is not None
    assert audit_entry.actor_id == admin_user.id


def test_reports_include_target_title(client, admin_user, admin_auth_headers, community_user, community_user_auth_headers, db_session):
    """DoD: GET /reports/ populates target_title for flagged services."""
    service = models.Service(
        title="Plumbing Help",
        description="Fix leaky pipes in Ocean View",
        type=models.ServiceType.OFFER,
        category="Maintenance",
        poster_id=community_user.id,
        status=models.ServiceStatus.OPEN,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)

    # Report the service
    rep_resp = client.post(
        f"/services/{service.id}/report",
        json={"reason": "Inappropriate listing content"},
        headers=community_user_auth_headers,
    )
    assert rep_resp.status_code == 201
    assert rep_resp.json()["target_title"] == "Plumbing Help"

    # List reports as admin
    list_resp = client.get("/reports/", headers=admin_auth_headers)
    assert list_resp.status_code == 200
    reports = list_resp.json()
    matching = [r for r in reports if r["target_id"] == service.id]
    assert len(matching) > 0
    assert matching[0]["target_title"] == "Plumbing Help"


