from datetime import datetime
from typing import Optional, List, Union, Any
from pydantic import BaseModel, ConfigDict
from app.models import StudyState, ApplicationStatus, QuestionType


class StudyListingBase(BaseModel):
    title: str
    description: str
    honorarium: Optional[str] = None
    participant_limit: Optional[int] = None
    closing_date: Optional[datetime] = None


class SurveyQuestionIn(BaseModel):
    type: QuestionType
    prompt: str
    required: bool = True
    options: Optional[List[str]] = None  # multiple_choice / checkbox only


class StudyListingCreate(StudyListingBase):
    questions: List[SurveyQuestionIn] = []


class StudyListingOut(StudyListingBase):
    id: int
    state: StudyState
    researcher_id: int
    created_at: datetime
    researcher_username: Optional[str] = None
    researcher_display_name: Optional[str] = None
    researcher_avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyQuestionOut(SurveyQuestionIn):
    id: int
    order: int

    model_config = ConfigDict(from_attributes=True)


class SurveyIn(BaseModel):
    """Full replace: the researcher's builder always sends the complete question list."""
    questions: List[SurveyQuestionIn] = []


class SurveyOut(BaseModel):
    id: int
    study_id: int
    questions: List[SurveyQuestionOut]

    model_config = ConfigDict(from_attributes=True)


class SurveyAnswerIn(BaseModel):
    question_id: int
    value: Union[str, int, float, bool, List[Any], Any]


class SurveyResponseIn(BaseModel):
    answers: List[SurveyAnswerIn]


class SurveyAnswerOut(BaseModel):
    question_id: int
    value: Union[str, int, float, bool, List[Any], Any, None] = None

    model_config = ConfigDict(from_attributes=True)


class SurveyResponseOut(BaseModel):
    id: int
    user_id: int
    submitted_at: datetime
    answers: List[SurveyAnswerOut]

    model_config = ConfigDict(from_attributes=True)


class SurveyResponsesOut(BaseModel):
    response_count: int
    responses: List[SurveyResponseOut]


class ApplicationOut(BaseModel):
    id: int
    study_id: int
    user_id: int
    status: ApplicationStatus
    applied_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyApplicationOut(ApplicationOut):
    study_title: str
    study_honorarium: Optional[str] = None
    has_submitted_survey: bool = False
    survey_response_id: Optional[int] = None


class ApplicantOut(ApplicationOut):
    applicant_username: Optional[str] = None
    applicant_email: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus

