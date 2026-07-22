from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date


# ── Request Schemas ──

class PortalApplyRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None


# ── Response Schemas ──

class PortalJobListItem(BaseModel):
    id: str
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    vacancies: int = 1
    closing_date: Optional[date] = None
    created_at: Optional[datetime] = None


class PortalJobDetail(BaseModel):
    id: str
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: str
    requirements: dict = {}
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    vacancies: int = 1
    closing_date: Optional[date] = None
    created_at: Optional[datetime] = None


class PortalJobsResponse(BaseModel):
    company: str
    total_openings: int
    jobs: list[PortalJobListItem]


class PortalApplyResponse(BaseModel):
    message: str
    application_id: str
    candidate_name: str
    job_title: str


class PortalStatusItem(BaseModel):
    job_title: str
    department: Optional[str] = None
    status: str
    applied_at: Optional[datetime] = None
    suitability_score: Optional[float] = None


class PortalStatusResponse(BaseModel):
    candidate_name: str
    email: str
    total_applications: int
    applications: list[PortalStatusItem]


class DashboardResponse(BaseModel):
    company: str
    tagline: str
    about: str
    open_positions: int
    careers_url: str