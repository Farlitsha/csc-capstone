"""
Unit Tests for Backlog Item 11: Reporting and Audit Logs
========================================================
Kanban Item: Reporting and audit logs
PDF Spec: Backlog Item 7 & Sprint 2 Extended (Reports & Audit Trail)

User Story:
  As a community member, I want to flag/report suspicious services, studies, or users.
  As an administrator, I want to review flagged items, resolve or dismiss them, and have
  an append-only immutable audit trail recording all moderation actions.

Acceptance Criteria (DoD):
  1. POST /reports/ creates a new report with status=open.
  2. GET /reports/ allows admin to list and filter reports by status.
  3. Non-admin users cannot view reports (403 Forbidden).
  4. PATCH /reports/{id} allows admin to resolve or dismiss a report.
  5. Resolving/dismissing a report automatically records an entry in the audit log.
  6. GET /audit-logs/ returns immutable history of administrative actions for admin.
  7. Non-admin users cannot access the audit log (403 Forbidden).
"""

import pytest
from app import models
from tests.conftest import create_user_in_db, get_auth_headers_for_user


def test_create_report_against_service(client, community_user, community_user_auth_headers, db_session):
    """DoD: Community member flags a suspicious service."""
    payload = {
        "target_type": "service",
        "target_id": 42,
        "reason": "Suspected fraudulent pricing and misleading description.",
    }
    response = client.post("/reports/", json=payload, headers=community_user_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["target_type"] == "service"
    assert data["target_id"] == 42
    assert data["status"] == "open"
    assert data["reporter_username"] == community_user.username


def test_admin_list_and_filter_reports(client, admin_user, admin_auth_headers, community_user, db_session):
    """DoD: Admin lists reports and filters by open/resolved status."""
    r1 = models.Report(
        reporter_id=community_user.id, target_type=models.ReportTargetType.SERVICE,
        target_id=1, reason="Spam advert", status=models.ReportStatus.OPEN,
    )
    r2 = models.Report(
        reporter_id=community_user.id, target_type=models.ReportTargetType.USER,
        target_id=2, reason="Harassment", status=models.ReportStatus.RESOLVED,
    )
    db_session.add_all([r1, r2])
    db_session.commit()

    # List all
    all_resp = client.get("/reports/", headers=admin_auth_headers)
    assert all_resp.status_code == 200
    assert len(all_resp.json()) >= 2

    # Filter open
    open_resp = client.get("/reports/?status_filter=open", headers=admin_auth_headers)
    assert open_resp.status_code == 200
    for r in open_resp.json():
        assert r["status"] == "open"


def test_admin_resolve_report_and_check_audit_log(client, admin_user, admin_auth_headers, community_user, db_session):
    """DoD: Resolving a report updates status and generates an audit log entry."""
    report = models.Report(
        reporter_id=community_user.id,
        target_type=models.ReportTargetType.SERVICE,
        target_id=99,
        reason="Inappropriate content",
        status=models.ReportStatus.OPEN,
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    resolve_resp = client.patch(
        f"/reports/{report.id}",
        json={"status": "resolved"},
        headers=admin_auth_headers,
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "resolved"
    assert resolve_resp.json()["resolved_by_id"] == admin_user.id

    # Verify audit log recorded
    audit_resp = client.get("/audit-logs/", headers=admin_auth_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) >= 1
    assert any("report_resolved" in l["action"] for l in logs)


def test_non_admin_cannot_access_audit_logs(client, admin_user, community_user_auth_headers):
    """DoD: Community members cannot access system audit logs (403 Forbidden)."""
    response = client.get("/audit-logs/", headers=community_user_auth_headers)
    assert response.status_code == 403

