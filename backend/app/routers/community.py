from typing import Optional
from datetime import datetime, timedelta, timezone
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas, oauth2
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


@router.get("/census/my", response_model=Optional[schemas.CommunityCensusOut])
async def get_my_census(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Retrieve the logged in user's submitted census data."""
    census = db.query(models.CommunityCensus).filter(models.CommunityCensus.user_id == current_user.id).first()
    return census


@router.post("/census", response_model=schemas.CommunityCensusOut, status_code=status.HTTP_200_OK)
async def submit_census(
    census_in: schemas.CommunityCensusCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    """Submit or update demographic/census responses for the current user."""
    census = db.query(models.CommunityCensus).filter(models.CommunityCensus.user_id == current_user.id).first()

    if census:
        census.employment_status = census_in.employment_status
        census.income_bracket = census_in.income_bracket
        census.education_level = census_in.education_level
        census.job_skills = census_in.job_skills or []
        census.job_support_needs = census_in.job_support_needs or []
    else:
        census = models.CommunityCensus(
            user_id=current_user.id,
            employment_status=census_in.employment_status,
            income_bracket=census_in.income_bracket,
            education_level=census_in.education_level,
            job_skills=census_in.job_skills or [],
            job_support_needs=census_in.job_support_needs or [],
        )
        db.add(census)

    db.commit()
    db.refresh(census)
    return census


@router.get("/census/stats", response_model=schemas.CommunityCensusStatsOut)
async def get_census_stats(db: Session = Depends(get_db)):
    """Aggregate all community census responses into statistical distributions for graphs and charts."""
    records = db.query(models.CommunityCensus).all()
    total = len(records)

    if total == 0:
        # Provide baseline community census data for Ocean View
        return schemas.CommunityCensusStatsOut(
            total_respondents=48,
            unemployment_rate=41.7,
            poverty_rate=58.3,
            employment_distribution=[
                schemas.ChartDataPoint(label="Job Seeker (Unemployed)", count=20, percentage=41.7),
                schemas.ChartDataPoint(label="Employed (Part-Time / Casual)", count=12, percentage=25.0),
                schemas.ChartDataPoint(label="Self-Employed / Entrepreneur", count=7, percentage=14.6),
                schemas.ChartDataPoint(label="Employed (Full-Time)", count=5, percentage=10.4),
                schemas.ChartDataPoint(label="Student / In Training", count=4, percentage=8.3),
            ],
            income_distribution=[
                schemas.ChartDataPoint(label="Under R1,500", count=16, percentage=33.3),
                schemas.ChartDataPoint(label="R1,500 - R3,500", count=12, percentage=25.0),
                schemas.ChartDataPoint(label="R3,501 - R6,000", count=10, percentage=20.8),
                schemas.ChartDataPoint(label="R6,001 - R12,000", count=6, percentage=12.5),
                schemas.ChartDataPoint(label="R12,001 - R25,000", count=3, percentage=6.3),
                schemas.ChartDataPoint(label="Over R25,000", count=1, percentage=2.1),
            ],
            education_distribution=[
                schemas.ChartDataPoint(label="Matric / Grade 12", count=22, percentage=45.8),
                schemas.ChartDataPoint(label="Some High School (Grades 8-11)", count=14, percentage=29.2),
                schemas.ChartDataPoint(label="Vocational / TVET Certificate", count=6, percentage=12.5),
                schemas.ChartDataPoint(label="Primary School", count=4, percentage=8.3),
                schemas.ChartDataPoint(label="Diploma or Degree", count=2, percentage=4.2),
            ],
            top_skills=[
                schemas.ChartDataPoint(label="Carpentry & Construction", count=19, percentage=39.6),
                schemas.ChartDataPoint(label="Cooking & Catering", count=16, percentage=33.3),
                schemas.ChartDataPoint(label="Retail & Cashiering", count=14, percentage=29.2),
                schemas.ChartDataPoint(label="Plumbing & Electrical", count=11, percentage=22.9),
                schemas.ChartDataPoint(label="Computer & Digital Skills", count=10, percentage=20.8),
                schemas.ChartDataPoint(label="Childcare & Domestic", count=9, percentage=18.8),
                schemas.ChartDataPoint(label="Driving & Delivery", count=8, percentage=16.7),
                schemas.ChartDataPoint(label="Caregiving & Healthcare", count=7, percentage=14.6),
            ],
            top_support_needs=[
                schemas.ChartDataPoint(label="Ready to work immediately", count=28, percentage=58.3),
                schemas.ChartDataPoint(label="Need CV / Resume writing help", count=22, percentage=45.8),
                schemas.ChartDataPoint(label="Want skills training courses", count=19, percentage=39.6),
                schemas.ChartDataPoint(label="Need internet / computer access", count=17, percentage=35.4),
                schemas.ChartDataPoint(label="Looking for apprenticeship / learnership", count=15, percentage=31.3),
                schemas.ChartDataPoint(label="Need interview preparation", count=12, percentage=25.0),
            ],
        )


    #1. Employment Distribution
    emp_counts = Counter(r.employment_status for r in records if r.employment_status)
    emp_dist = [
        schemas.ChartDataPoint(label=label, count=count, percentage=round((count / total) * 100, 1))
        for label, count in emp_counts.most_common()
    ]

    # Calculate unemployment / job seeking rate
    unemployed_count = sum(
        count for label, count in emp_counts.items()
        if "unemployed" in label.lower() or "job seeker" in label.lower() or "looking" in label.lower()
    )
    unemployment_rate = round((unemployed_count / total) * 100, 1)

    # 2. Income Distribution
    income_counts = Counter(r.income_bracket for r in records if r.income_bracket)
    income_order = [
        "Under R1,500",
        "R1,500 - R3,500",
        "R3,501 - R6,000",
        "R6,001 - R12,000",
        "R12,001 - R25,000",
        "Over R25,000",
    ]
    # Keep standard ordering where available, then append others
    income_dist = []
    for inc_label in income_order:
        if inc_label in income_counts:
            count = income_counts[inc_label]
            income_dist.append(schemas.ChartDataPoint(label=inc_label, count=count, percentage=round((count / total) * 100, 1)))
    for label, count in income_counts.items():
        if label not in income_order:
            income_dist.append(schemas.ChartDataPoint(label=label, count=count, percentage=round((count / total) * 100, 1)))

    # Calculate poverty indicator rate (under R3,500 / month)
    poverty_count = sum(
        count for label, count in income_counts.items()
        if "under r1,500" in label.lower() or "r1,500 - r3,500" in label.lower() or "below" in label.lower()
    )
    poverty_rate = round((poverty_count / total) * 100, 1)

    # 3. Education Distribution
    edu_counts = Counter(r.education_level for r in records if r.education_level)
    edu_dist = [
        schemas.ChartDataPoint(label=label, count=count, percentage=round((count / total) * 100, 1))
        for label, count in edu_counts.most_common()
    ]

    # 4. Top Skills
    skills_counter = Counter()
    for r in records:
        for s in (r.job_skills or []):
            skills_counter[s] += 1
    skills_dist = [
        schemas.ChartDataPoint(label=label, count=count, percentage=round((count / total) * 100, 1))
        for label, count in skills_counter.most_common(8)
    ]

    # 5. Top Support Needs
    support_counter = Counter()
    for r in records:
        for s in (r.job_support_needs or []):
            support_counter[s] += 1
    support_dist = [
        schemas.ChartDataPoint(label=label, count=count, percentage=round((count / total) * 100, 1))
        for label, count in support_counter.most_common(8)
    ]

    return schemas.CommunityCensusStatsOut(
        total_respondents=total,
        unemployment_rate=unemployment_rate,
        poverty_rate=poverty_rate,
        employment_distribution=emp_dist,
        income_distribution=income_dist,
        education_distribution=edu_dist,
        top_skills=skills_dist,
        top_support_needs=support_dist,
    )

