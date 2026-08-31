from datetime import datetime, timedelta, timezone
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/stats", response_model=schemas.CommunityStatsOut)
async def get_community_stats(db: Session = Depends(get_db)):
    """Public aggregate stats for the home page: member count, role mix, growth, and what
    the community says it's struggling with (self-reported at signup, see User.struggles).
    No individual member's answers are exposed here - only counts."""
    users = db.query(models.User).all()

    members_by_role = Counter(u.role.value for u in users)

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    new_members = sum(
        1 for u in users
        if u.time and (u.time if u.time.tzinfo else u.time.replace(tzinfo=timezone.utc)) >= thirty_days_ago
    )

    struggle_counts = Counter()
    for u in users:
        for s in (u.struggles or []):
            struggle_counts[s] += 1

    struggles_breakdown = [
        schemas.StruggleCount(struggle=s, count=c)
        for s, c in sorted(struggle_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return schemas.CommunityStatsOut(
        total_members=len(users),
        members_by_role=dict(members_by_role),
        new_members_last_30_days=new_members,
        struggles_breakdown=struggles_breakdown,
    )
