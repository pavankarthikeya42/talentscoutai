from fastapi import APIRouter, UploadFile, File, Form, Depends
from asyncpg import Connection
from typing import Optional

from app.database import get_db
from app.portal import service
from app.portal.schemas import (
    DashboardResponse,
    PortalJobsResponse,
    PortalJobDetail,
    PortalApplyRequest,
    PortalApplyResponse,
    PortalStatusResponse,
)
from app.common.exceptions import BadRequestError

router = APIRouter(prefix="/careers", tags=["Career Portal"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(conn: Connection = Depends(get_db)):
    """Company landing page with open positions count and careers link."""
    return await service.get_dashboard(conn)


@router.get("/careers", response_model=PortalJobsResponse)
async def get_careers(conn: Connection = Depends(get_db)):
    """List all open job positions. No authentication required."""
    return await service.get_careers(conn)


@router.get("/careers/{job_id}", response_model=PortalJobDetail)
async def get_job_detail(
    job_id: str,
    conn: Connection = Depends(get_db),
):
    """View full job description and requirements. No authentication required."""
    return await service.get_job_detail(conn, job_id)


@router.post("/careers/{job_id}/apply", response_model=PortalApplyResponse)
async def apply_to_job(
    job_id: str,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    resume: UploadFile = File(...),
    expected_salary: Optional[str] = Form(None),
    notice_period: Optional[str] = Form(None),
    conn: Connection = Depends(get_db),
):
    """
    Apply to a job position.

    Submit your details and resume. The system will:
    - Parse your resume using AI
    - Extract skills, experience, and education
    - Create your candidate profile
    - Link your application to the job

    No authentication required.
    """
    # Validate file
    if not (resume.filename.lower().endswith(".pdf") or resume.filename.lower().endswith(".docx")):
        raise BadRequestError("Only PDF and DOCX resumes are accepted")

    file_bytes = await resume.read()

    if len(file_bytes) == 0:
        raise BadRequestError("Resume file is empty")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise BadRequestError("Resume file exceeds 10MB limit")

    # Build form data
    form_data = PortalApplyRequest(
        full_name=full_name,
        email=email,
        phone=phone,
        expected_salary=expected_salary,
        notice_period=notice_period,
    )

    return await service.apply_to_job(conn, job_id, form_data, file_bytes, resume.filename)


@router.get("/status/{email}", response_model=PortalStatusResponse)
async def check_application_status(
    email: str,
    conn: Connection = Depends(get_db),
):
    """
    Check your application status using your email address.
    Shows all jobs you've applied to and their current status.
    No authentication required.
    """
    return await service.check_status(conn, email)