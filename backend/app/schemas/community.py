from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict


class StruggleCount(BaseModel):
    struggle: str
    count: int


class CommunityStatsOut(BaseModel):
    total_members: int
    members_by_role: Dict[str, int]
    new_members_last_30_days: int
    struggles_breakdown: List[StruggleCount]


class CommunityCensusCreate(BaseModel):
    employment_status: str
    income_bracket: str
    education_level: str
    job_skills: Optional[List[str]] = []
    job_support_needs: Optional[List[str]] = []


class CommunityCensusOut(BaseModel):
    id: int
    user_id: int
    employment_status: str
    income_bracket: str
    education_level: str
    job_skills: Optional[List[str]] = []
    job_support_needs: Optional[List[str]] = []
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChartDataPoint(BaseModel):
    label: str
    count: int
    percentage: float


class CommunityCensusStatsOut(BaseModel):
    total_respondents: int
    unemployment_rate: float
    poverty_rate: float
    employment_distribution: List[ChartDataPoint]
    income_distribution: List[ChartDataPoint]
    education_distribution: List[ChartDataPoint]
    top_skills: List[ChartDataPoint]
    top_support_needs: List[ChartDataPoint]

