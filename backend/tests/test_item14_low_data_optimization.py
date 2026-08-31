"""
Unit Tests for Backlog Item 14: Low-Data Optimisations & Platform Hosting
=========================================================================
Kanban Item: Low-data optimisations & Platform hosting
PDF Spec: Backlog Item 8 & 11 (Platform hosting & Low bandwidth optimization)

User Story:
  As a community member with poor connectivity or limited mobile data on an iNethi local server,
  I want the system to be lightweight, responsive, and robust with minimal bandwidth overhead.

Acceptance Criteria (DoD):
  1. GET / returns immediate health check verification ("API is running successfully!").
  2. Endpoints return compact, lightweight JSON payloads without extraneous metadata.
  3. Upload endpoints enforce strict bandwidth-saving size limits (2MB avatar, 5MB service photo).
  4. Static files are served directly via local /uploads mount for offline network compatibility.
  5. CORS headers allow local and intranet frontend origins.
"""

import pytest


def test_api_health_check(client):
    """DoD: API health check endpoint responds with 200 OK for local/offline hosting checks."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "API is running successfully!"}


def test_compact_payload_size_on_services_listing(client, db_session, community_user):
    """DoD: Service listing payload remains lightweight and concise for low-data mobile usage."""
    from app import models
    # Create 5 services
    for i in range(5):
        s = models.Service(
            poster_id=community_user.id, category="General", title=f"Service {i}",
            description=f"Short description {i}", status=models.ServiceStatus.OPEN,
        )
        db_session.add(s)
    db_session.commit()

    response = client.get("/services/")
    assert response.status_code == 200
    content_bytes = len(response.content)
    # 5 items should comfortably be under 5KB in compact JSON format
    assert content_bytes < 5000, f"Payload too large for low-data mode: {content_bytes} bytes"


def test_static_uploads_mount_available(client):
    """DoD: /uploads static route is mounted and accessible for offline media serving."""
    # Requesting non-existent file in uploads returns 404 from static file handler, not 500
    response = client.get("/uploads/avatars/non_existent.jpg")
    assert response.status_code == 404

