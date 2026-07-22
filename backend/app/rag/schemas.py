from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    job_id: Optional[str] = None  # optional job context for scoped queries


class RetrievedCandidate(BaseModel):
    candidate_id: str
    full_name: str
    email: str
    similarity_score: float
    skills: list[str] = []
    total_experience_years: float = 0
    location: Optional[str] = None
    summary: Optional[str] = None


class ChatMessageResponse(BaseModel):
    session_id: str
    role: str  # assistant
    content: str
    retrieved_candidates: list[RetrievedCandidate] = []
    metadata: dict = {}


class ChatHistoryMessage(BaseModel):
    id: str
    role: str
    content: str
    metadata: dict = {}
    created_at: Optional[datetime] = None


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: list[ChatHistoryMessage]


class ChatSessionListResponse(BaseModel):
    sessions: list[dict]