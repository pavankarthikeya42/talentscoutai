from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    start_date: str = ""
    end_date: str = ""
    description: str = ""


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    year: Optional[int] = None


class CandidateResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    certifications: list[str] = []
    total_experience_years: float = 0
    resume_url: Optional[str] = None
    resume_file_path: Optional[str] = None
    parsed_data: dict = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CandidateListResponse(BaseModel):
    candidates: list[CandidateResponse]
    total: int
    page: int
    page_size: int


class CandidateUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[list[str]] = None
    certifications: Optional[list[str]] = None
    total_experience_years: Optional[float] = None