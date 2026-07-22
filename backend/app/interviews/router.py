from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from app.database import get_db
from app.auth.dependencies import get_current_user, require_hr, require_manager
from app.auth.schemas import UserProfile
from app.interviews import service
from app.interviews.schemas import (
    InterviewCreateRequest,
    InterviewUpdateRequest,
    InterviewFeedbackRequest,
    GenerateQuestionsRequest,
    InterviewResponse,
    InterviewListResponse,
)

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.post("", response_model=InterviewResponse)
async def create_interview(
    request: InterviewCreateRequest,
    generate_questions: bool = Query(True, description="Auto-generate AI questions"),
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """
    Create an interview for an application.
    Automatically generates AI-tailored questions based on
    the candidate profile, job requirements, and interview type.
    """
    return await service.create_interview(conn, request, generate_questions)


@router.get("", response_model=InterviewListResponse)
async def list_interviews(
    application_id: str | None = Query(None),
    interviewer_id: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """List interviews with optional filters."""
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    interviews, total = await service.list_interviews(
        conn, application_id, interviewer_id, status, page, page_size, recruiter_id
    )
    return InterviewListResponse(
        interviews=interviews, total=total, page=page, page_size=page_size
    )


@router.get("/job/{job_id}")
async def get_job_interviews(
    job_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Get all interviews for a specific job."""
    from app.interviews.models import get_interviews_by_job
    rows = await get_interviews_by_job(conn, job_id)
    return [service._row_to_response(r) for r in rows]


# ── NEW: Round Recommendation ─────────────────────────────────────────────────
@router.get("/applications/{application_id}/recommend-rounds")
async def recommend_rounds(
    application_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """
    AI-powered interview round recommendation for a candidate.
    Everyone gets 3 rounds — complexity adapts based on:
    - Experience level (fresher / mid-level / senior)
    - Skill gaps vs job requirements
    - Suitability score
    """
    return await service.recommend_interview_rounds(conn, application_id)


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Get a single interview with AI questions and feedback."""
    return await service.get_interview(conn, interview_id)


@router.put("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: str,
    request: InterviewUpdateRequest,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Update interview details (schedule, type, status)."""
    return await service.update_interview(conn, interview_id, request)


@router.post("/{interview_id}/feedback", response_model=InterviewResponse)
async def submit_feedback(
    interview_id: str,
    request: InterviewFeedbackRequest,
    current_user: UserProfile = Depends(require_manager),
    conn: Connection = Depends(get_db),
):
    """Submit feedback and rating for a completed interview."""
    res = await service.submit_feedback(conn, interview_id, request)

    await conn.execute(
        """
        INSERT INTO notifications (user_id, title, message)
        SELECT id, 'Interview Feedback Submitted', $1
        FROM profiles WHERE role = 'HR'
        """,
        f"Feedback submitted for candidate {res.candidate_name} regarding {res.job_title} role."
    )
    return res


@router.post("/{interview_id}/notify-manager")
async def notify_manager(
    interview_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Send a notification to the manager for an upcoming interview."""
    from app.interviews.models import get_interview_by_id
    from app.common.exceptions import NotFoundError
    interview = await get_interview_by_id(conn, interview_id)
    if not interview or not interview.get("interviewer_id"):
        raise NotFoundError("Interview or interviewer not found")

    await conn.execute(
        """
        INSERT INTO notifications (user_id, title, message)
        VALUES ($1, $2, $3)
        """,
        interview["interviewer_id"],
        "Upcoming Interview Scheduled",
        f"You have an upcoming interview scheduled for {interview.get('candidate_name', 'a candidate')} regarding the {interview.get('job_title', 'Job')} role."
    )
    return {"message": "Notification sent"}


@router.post("/{interview_id}/regenerate-questions", response_model=InterviewResponse)
async def regenerate_questions(
    interview_id: str,
    request: GenerateQuestionsRequest = GenerateQuestionsRequest(),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Regenerate AI interview questions with custom parameters."""
    return await service.regenerate_questions(conn, interview_id, request)


@router.delete("/{interview_id}")
async def delete_interview(
    interview_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Delete an interview."""
    await service.delete_interview(conn, interview_id)
    return {"message": "Interview deleted successfully"}