"""
Unit Tests for Backlog Item 4: Search for Adverts
=================================================
Kanban Item: Search for adverts
PDF Spec: Backlog Item 3 (Service directory: search & filter)

User Story:
  As a community member, I want to search and filter service adverts by title query
  and category so that I can quickly find relevant local services or work opportunities.

Acceptance Criteria (DoD):
  1. GET /services/ returns all open service listings in reverse chronological order.
  2. GET /services/?query=<kw> filters listings matching keyword in title (case-insensitive).
  3. GET /services/?category=<cat> filters listings matching category.
  4. Passing category=all returns listings across all categories.
  5. Combining ?category=...&query=... applies both filters simultaneously.
  6. Closed listings are omitted from search results.
"""

import pytest
from app import models


@pytest.fixture
def seed_services(db_session, community_user):
    """Seed multiple services with different categories, titles, and statuses."""
    s1 = models.Service(
        poster_id=community_user.id, category="Plumbing", title="Emergency Geyser & Pipe Repair",
        description="Fast 24/7 plumbing help", status=models.ServiceStatus.OPEN,
    )
    s2 = models.Service(
        poster_id=community_user.id, category="Plumbing", title="Bathroom Tap Installation",
        description="Affordable tap fitting", status=models.ServiceStatus.OPEN,
    )
    s3 = models.Service(
        poster_id=community_user.id, category="Tutoring", title="Maths & Physics Tutoring",
        description="Grades 8-12", status=models.ServiceStatus.OPEN,
    )
    s4 = models.Service(
        poster_id=community_user.id, category="Gardening", title="Grass Cutting & Weeding",
        description="Garden care", status=models.ServiceStatus.OPEN,
    )
    s5 = models.Service(
        poster_id=community_user.id, category="Plumbing", title="Old Plumbing Listing (Closed)",
        description="Closed advert", status=models.ServiceStatus.CLOSED,
    )
    db_session.add_all([s1, s2, s3, s4, s5])
    db_session.commit()
    return [s1, s2, s3, s4, s5]


def test_list_all_open_services(client, seed_services):
    """DoD: Default listing returns all OPEN services and excludes CLOSED ones."""
    response = client.get("/services/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    titles = [s["title"] for s in data]
    assert "Old Plumbing Listing (Closed)" not in titles


def test_search_services_by_query(client, seed_services):
    """DoD: Searching with ?query= filters titles case-insensitively."""
    response = client.get("/services/?query=geyser")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Emergency Geyser & Pipe Repair"


def test_filter_services_by_category(client, seed_services):
    """DoD: Filtering by category returns only adverts in that category."""
    response = client.get("/services/?category=Plumbing")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for s in data:
        assert s["category"] == "Plumbing"


def test_category_all_returns_all_open_listings(client, seed_services):
    """DoD: Passing category=all returns open listings across all categories."""
    response = client.get("/services/?category=all")
    assert response.status_code == 200
    assert len(response.json()) == 4


def test_combined_search_query_and_category(client, seed_services):
    """DoD: Query and category filters intersect correctly."""
    response = client.get("/services/?category=Plumbing&query=Tap")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Bathroom Tap Installation"


def test_search_no_matches_returns_empty_list(client, seed_services):
    """DoD: Query with no matching results returns 200 OK with empty list."""
    response = client.get("/services/?query=NonExistentKeywordXYZ")
    assert response.status_code == 200
    assert response.json() == []

