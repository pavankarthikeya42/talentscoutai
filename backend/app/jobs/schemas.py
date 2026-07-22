from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


# ── Nested Schemas ──

class JobRequirements(BaseModel):
    skills: list[str] = []
    min_experience_years: int = 0
    education: str = ""
    certifications: list[str] = []


class ScreeningCriteria(BaseModel):
    skill_weight: int = 40
    experience_weight: int = 30
    education_weight: int = 20
    certification_weight: int = 10


# ── Request Schemas ──

class JobCreateRequest(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: str
    requirements: JobRequirements = JobRequirements()
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    status: str = "open"
    screening_criteria: ScreeningCriteria = ScreeningCriteria()
    vacancies: int = 1
    closing_date: Optional[date] = None
    emergency: bool = False
    post_to_linkedin: bool = False
    post_to_naukri: bool = False


class JobAutofillRequest(BaseModel):
    description: str
    min_experience_years: Optional[int] = None


class JobAutofillResponse(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: str
    requirements: JobRequirements
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    screening_criteria: ScreeningCriteria


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[JobRequirements] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    status: Optional[str] = None
    screening_criteria: Optional[ScreeningCriteria] = None
    vacancies: Optional[int] = None
    closing_date: Optional[date] = None
    emergency: Optional[bool] = None


# ── Response Schemas ──

class JobResponse(BaseModel):
    id: str
    recruiter_id: str
    recruiter_name: Optional[str] = None
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: str
    requirements: dict = {}
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    status: str
    screening_criteria: dict = {}
    applicant_count: Optional[int] = 0
    vacancies: int = 1
    closing_date: Optional[date] = None
    emergency: bool = False
    posted_to_linkedin: bool = False
    posted_to_naukri: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int
    page_size: int