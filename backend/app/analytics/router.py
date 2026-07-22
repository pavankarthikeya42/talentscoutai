from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import UserProfile
from app.analytics import service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    my_jobs_only: bool = Query(False, description="Show stats for my jobs only"),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """
    Dashboard overview: total jobs (open/closed/draft),
    total candidates, applications, interviews, and average score.
    """
    recruiter_id = current_user.id if (my_jobs_only or current_user.role == 'Manager') else None
    return await service.get_overview(conn, recruiter_id)


@router.get("/pipeline")
async def get_pipeline_funnel(
    job_id: str | None = Query(None, description="Filter by specific job"),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """
    Application pipeline funnel showing candidate count at each stage:
    new → screened → shortlisted → interview → offered → hired → rejected.
    """
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_pipeline_funnel(conn, job_id, recruiter_id)


@router.get("/time-to-hire")
async def get_time_to_hire(
    job_id: str | None = Query(None),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Average days to screen, interview, and hire."""
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_time_to_hire(conn, job_id, recruiter_id)


@router.get("/top-skills")
async def get_top_skills(
    limit: int = Query(15, ge=5, le=50),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Most common skills across all candidates in the talent pool."""
    return await service.get_top_skills(conn, limit)


@router.get("/source-distribution")
async def get_source_distribution(
    job_id: str | None = Query(None),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Candidate distribution by application source (manual, email, linkedin, portal, referral)."""
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_source_distribution(conn, job_id, recruiter_id)


@router.get("/jobs")
async def get_jobs_analytics(
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """
    Per-job breakdown: applicant counts, hired/rejected counts,
    average and top suitability scores.
    """
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_jobs_analytics(conn, recruiter_id)


@router.get("/departments")
async def get_department_analytics(
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Aggregated stats per department: jobs, applicants, hires, avg score."""
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_department_analytics(conn, recruiter_id)


@router.get("/managers")
async def get_manager_analytics(
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Aggregated stats per manager/recruiter: jobs, applicants, hires, avg score."""
    return await service.get_manager_analytics(conn)


@router.get("/interviews")
async def get_interview_analytics(
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Interview stats: completion rates, avg rating, breakdown by type."""
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_interview_analytics(conn, recruiter_id)


@router.get("/score-distribution")
async def get_score_distribution(
    job_id: str | None = Query(None),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Distribution of candidate suitability scores in buckets (0-39, 40-49, ..., 90-100)."""
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    return await service.get_score_distribution(conn, job_id, recruiter_id)