"""
Unit Tests for Backlog Item 12: Community Statistics
====================================================
Kanban Item: Community statistics
PDF Spec: Backlog Item 13 (Community statistics)

User Story:
  As a community member or leader, I want to view general aggregated community statistics
  to understand local needs (such as food security or employment challenges) while ensuring
  individual personal privacy is fully protected.

Acceptance Criteria (DoD):
  1. GET /community/stats is publicly accessible without requiring authentication.
  2. Aggregates total member count and breakdown by role.
  3. Counts new members registered within the past 30 days.
  4. Returns aggregated ranking of self-reported community struggles.
  5. Anonymity preserved: no individual identifiable records are exposed in output.
"""

from datetime import datetime, timedelta, timezone
import pytest
from app import models
from tests.conftest import create_user_in_db


def test_community_stats_aggregation(client, db_session):
    """DoD: Public stats endpoint returns accurate aggregate metrics and struggles breakdown."""
    # Seed users with different roles and struggles
    u1 = create_user_in_db(
        db_session, username="c1", email="c1@t.com", role=models.UserRole.COMMUNITY_MEMBER,
        struggles=["food_security", "employment"]
    )
    u2 = create_user_in_db(
        db_session, username="c2", email="c2@t.com", role=models.UserRole.COMMUNITY_MEMBER,
        struggles=["food_security", "housing"]
    )
    u3 = create_user_in_db(
        db_session, username="r1", email="r1@t.com", role=models.UserRole.RESEARCHER,
        struggles=["internet_access"]
    )

    response = client.get("/community/stats")
    assert response.status_code == 200
    data = response.json()

    assert data["total_members"] == 3
    assert data["members_by_role"]["community_member"] == 2
    assert data["members_by_role"]["researcher"] == 1
    assert data["new_members_last_30_days"] == 3

    # Check struggles breakdown: food_security should have count 2
    breakdown_map = {item["struggle"]: item["count"] for item in data["struggles_breakdown"]}
    assert breakdown_map.get("food_security") == 2
    assert breakdown_map.get("employment") == 1
    assert breakdown_map.get("housing") == 1
    assert breakdown_map.get("internet_access") == 1


def test_community_stats_empty_db(client, db_session):
    """DoD: When database has no users, stats endpoint returns zeros without errors."""
    response = client.get("/community/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_members"] == 0
    assert data["new_members_last_30_days"] == 0
    assert data["struggles_breakdown"] == []

