from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScoreBreakdown(BaseModel):
    skill_score: float = 0
    experience_score: float = 0
    education_score: float = 0
    certification_score: float = 0
    semantic_score: float = 0
    reasoning: str = ""


class ScreeningResult(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    suitability_score: float
    score_breakdown: ScoreBreakdown
    ai_summary: str
    status: str


class ScreenJobRequest(BaseModel):
    top_k: int = 20  # how many candidates to retrieve via vector search


class ScreenCandidateRequest(BaseModel):
    job_id: str
    candidate_id: str


class RankingResponse(BaseModel):
    job_id: str
    job_title: str
    total_screened: int
    rankings: list[ScreeningResult]


class ApplicationStatusUpdate(BaseModel):
    status: str  # new, screened, shortlisted, interview, offered, hired, rejected


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    status: str
    source: str
    suitability_score: float
    score_breakdown: dict = {}
    ai_summary: Optional[str] = None
    recruiter_notes: Optional[str] = None
    applied_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Joined fields
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_id: Optional[str] = None
    automated_email_sent: Optional[bool] = False


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationResponse]
    total: int
    page: int
    page_size: int


class RecruiterNotesUpdate(BaseModel):
    recruiter_notes: str


class DraftEmailResponse(BaseModel):
    subject: str
    body: str


class SendCustomEmailRequest(BaseModel):
    subject: str
    body: str