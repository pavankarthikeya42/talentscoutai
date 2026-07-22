from pydantic import BaseModel
from typing import Optional


class ParsedResume(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    certifications: list[str] = []
    total_experience_years: float = 0


class ResumeUploadResponse(BaseModel):
    message: str
    candidate_id: str
    parsed_data: ParsedResume
    file_path: str


class BulkUploadResponse(BaseModel):
    message: str
    total: int
    successful: int
    failed: int
    results: list[dict]