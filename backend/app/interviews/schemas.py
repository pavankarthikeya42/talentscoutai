from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InterviewCreateRequest(BaseModel):
    application_id: str
    interviewer_id: Optional[str] = None
    round_number: int = 1
    interview_type: str = "technical"  # phone, technical, behavioral, hr, final
    scheduled_at: Optional[datetime] = None
    duration_minutes: int = 60


class InterviewUpdateRequest(BaseModel):
    interviewer_id: Optional[str] = None
    round_number: Optional[int] = None
    interview_type: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None


class InterviewFeedbackRequest(BaseModel):
    feedback: str
    rating: int  # 1-5


class GenerateQuestionsRequest(BaseModel):
    num_questions: int = 10
    difficulty: str = "mixed"  # easy, medium, hard, mixed
    focus_areas: list[str] = []


class InterviewQuestion(BaseModel):
    question: str
    category: str
    difficulty: str
    what_to_look_for: str


class InterviewResponse(BaseModel):
    id: str
    application_id: str
    interviewer_id: Optional[str] = None
    round_number: int
    interview_type: str
    scheduled_at: Optional[datetime] = None
    duration_minutes: int
    status: str
    ai_suggested_questions: list[dict] = []
    feedback: Optional[str] = None
    rating: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Joined fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    interviewer_name: Optional[str] = None


class InterviewListResponse(BaseModel):
    interviews: list[InterviewResponse]
    total: int
    page: int
    page_size: int