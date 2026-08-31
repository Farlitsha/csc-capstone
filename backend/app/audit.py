"""
audit.py

Helper for recording moderation/admin actions to the append-only audit_logs table.

log_action() only calls db.add() - it deliberately does NOT commit. This makes the audit
entry part of the same transaction as the action it's recording (e.g. a role change and its
audit log row commit together, or not at all), which is what you want: an audit log that
records a change that didn't actually happen (because the surrounding commit failed) would be
worse than no audit log at all.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app import models


def log_action(
    db: Session,
    actor_id: Optional[int],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[dict] = None,
) -> models.AuditLog:
    entry = models.AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    return entry
