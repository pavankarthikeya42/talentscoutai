from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from app.database import get_db
from app.auth.dependencies import get_current_user, require_manager
from app.auth.schemas import UserProfile
from app.jobs import service
from app.jobs.schemas import (
    JobCreateRequest,
    JobUpdateRequest,
    JobResponse,
    JobListResponse,
    JobAutofillRequest,
    JobAutofillResponse,
)
from app.common.exceptions import BadRequestError

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse)
async def create_job(
    request: JobCreateRequest,
    current_user: UserProfile = Depends(require_manager),
    conn: Connection = Depends(get_db),
):
    """Create a new job posting with auto-generated description embedding."""
    return await service.create_job(conn, request, current_user.id)


@router.post("/autofill", response_model=JobAutofillResponse)
async def autofill_job(
    request: JobAutofillRequest,
    current_user: UserProfile = Depends(require_manager),
):
    """Automatically extract and generate job details from a raw job description and optional experience using AI."""
    return await service.autofill_job_details(request.description, request.min_experience_years)



@router.get("", response_model=JobListResponse)
async def list_jobs(
    status: str | None = Query(None, description="Filter by status"),
    my_jobs: bool = Query(False, description="Show only my jobs"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """List jobs. Managers only see their own jobs; HR sees all jobs."""
    role = (current_user.role or '').lower()
    if role == 'manager':
        # Managers are always scoped to their own postings
        recruiter_id = current_user.id
    elif my_jobs:
        recruiter_id = current_user.id
    else:
        recruiter_id = None
    jobs, total = await service.list_jobs(conn, recruiter_id, status, page, page_size)
    return JobListResponse(jobs=jobs, total=total, page=page, page_size=page_size)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Get a single job by ID."""
    return await service.get_job(conn, job_id)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    request: JobUpdateRequest,
    current_user: UserProfile = Depends(require_manager),
    conn: Connection = Depends(get_db),
):
    """Update a job posting. Re-generates embedding if description/requirements change."""
    return await service.update_job(conn, job_id, request, current_user.id)


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    current_user: UserProfile = Depends(require_manager),
    conn: Connection = Depends(get_db),
):
    """Delete a job posting."""
    await service.delete_job(conn, job_id, current_user.id)
    return {"message": "Job deleted successfully"}