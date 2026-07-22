import json
from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from app.database import get_db
from app.auth.dependencies import get_current_user, require_hr
from app.auth.schemas import UserProfile, MessageResponse
from app.screening import service, models
from app.screening.schemas import (
    ScreenJobRequest,
    ScreenCandidateRequest,
    RankingResponse,
    ScreeningResult,
    ApplicationResponse,
    ApplicationListResponse,
    ApplicationStatusUpdate,
    RecruiterNotesUpdate,
    DraftEmailResponse,
    SendCustomEmailRequest,
)
from app.common.exceptions import NotFoundError

router = APIRouter(prefix="/screening", tags=["Screening & Applications"])


# ── Screening ──

@router.post("/jobs/{job_id}/screen", response_model=RankingResponse)
async def screen_candidates(
    job_id: str,
    request: ScreenJobRequest = ScreenJobRequest(),
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    return await service.screen_candidates_for_job(conn, job_id, request.top_k)


@router.post("/screen-candidate", response_model=ScreeningResult)
async def screen_single_candidate(
    request: ScreenCandidateRequest,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Screen a single candidate against a specific job."""
    return await service.screen_single_candidate(conn, request.job_id, request.candidate_id)


# ── Applications Management ──

@router.get("/applications", response_model=ApplicationListResponse)
async def get_all_applications(
    job_id: str | None = Query(None),
    status: str | None = Query(None),
    min_score: float | None = Query(None, ge=0, le=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    rows, total = await models.get_all_applications(conn, job_id, status, min_score, page, page_size, recruiter_id)

    applications = []
    for r in rows:
        breakdown = r.get("score_breakdown", {})
        if isinstance(breakdown, str):
            breakdown = json.loads(breakdown)
        applications.append(ApplicationResponse(
            id=str(r["id"]),
            job_id=str(r["job_id"]),
            candidate_id=str(r["candidate_id"]),
            status=r["status"],
            source=r.get("source", "manual"),
            suitability_score=float(r.get("suitability_score", 0)),
            score_breakdown=breakdown,
            ai_summary=r.get("ai_summary"),
            recruiter_notes=r.get("recruiter_notes"),
            applied_at=r.get("applied_at"),
            updated_at=r.get("updated_at"),
            candidate_name=r.get("candidate_name"),
            candidate_email=r.get("candidate_email"),
            job_title=r.get("job_title"),
            recruiter_name=r.get("recruiter_name"),
            recruiter_id=str(r["recruiter_id"]) if r.get("recruiter_id") else None,
            automated_email_sent=r.get("automated_email_sent", False),
        ))

    return ApplicationListResponse(applications=applications, total=total, page=page, page_size=page_size)


@router.get("/jobs/{job_id}/applications", response_model=ApplicationListResponse)
async def get_job_applications(
    job_id: str,
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    recruiter_id = current_user.id if current_user.role == 'Manager' else None
    rows, total = await models.get_applications_by_job(conn, job_id, status, page, page_size, recruiter_id)

    applications = []
    for r in rows:
        breakdown = r.get("score_breakdown", {})
        if isinstance(breakdown, str):
            breakdown = json.loads(breakdown)

        applications.append(ApplicationResponse(
            id=str(r["id"]),
            job_id=str(r["job_id"]),
            candidate_id=str(r["candidate_id"]),
            status=r["status"],
            source=r.get("source", "manual"),
            suitability_score=float(r.get("suitability_score", 0)),
            score_breakdown=breakdown,
            ai_summary=r.get("ai_summary"),
            recruiter_notes=r.get("recruiter_notes"),
            applied_at=r.get("applied_at"),
            updated_at=r.get("updated_at"),
            candidate_name=r.get("candidate_name"),
            candidate_email=r.get("candidate_email"),
            job_title=r.get("job_title"),
            recruiter_name=r.get("recruiter_name"),
            recruiter_id=str(r["recruiter_id"]) if r.get("recruiter_id") else None,
            automated_email_sent=r.get("automated_email_sent", False),
        ))

    return ApplicationListResponse(
        applications=applications, total=total, page=page, page_size=page_size
    )


@router.get("/candidates/{candidate_id}/applications")
async def get_candidate_applications(
    candidate_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Get all job applications for a specific candidate."""
    rows = await models.get_applications_by_candidate(conn, candidate_id)
    return [
        {
            "id": str(r["id"]),
            "application_id": str(r["id"]),  # ← ADDED for recommend rounds button
            "job_id": str(r["job_id"]),
            "job_title": r.get("job_title"),
            "department": r.get("department"),
            "status": r["status"],
            "suitability_score": float(r.get("suitability_score", 0)),
            "applied_at": r.get("applied_at"),
        }
        for r in rows
    ]


@router.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    request: ApplicationStatusUpdate,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Update application status."""
    row = await models.update_application_status(conn, application_id, request.status)
    if not row:
        raise NotFoundError("Application not found")

    # Automatically dispatch status email if status is eligible
    if request.status in ["shortlisted", "interview", "offered", "hired", "rejected"]:
        try:
            await service.send_automated_email(conn, application_id)
        except Exception as e:
            print(f"[WARNING] Automatic email send failed on status change: {e}")

    full_row = await models.get_application_by_id(conn, application_id)
    breakdown = full_row.get("score_breakdown", {})
    if isinstance(breakdown, str):
        breakdown = json.loads(breakdown)

    return ApplicationResponse(
        id=str(full_row["id"]),
        job_id=str(full_row["job_id"]),
        candidate_id=str(full_row["candidate_id"]),
        status=full_row["status"],
        source=full_row.get("source", "manual"),
        suitability_score=float(full_row.get("suitability_score", 0)),
        score_breakdown=breakdown,
        ai_summary=full_row.get("ai_summary"),
        recruiter_notes=full_row.get("recruiter_notes"),
        applied_at=full_row.get("applied_at"),
        updated_at=full_row.get("updated_at"),
        candidate_name=full_row.get("candidate_name"),
        candidate_email=full_row.get("candidate_email"),
        job_title=full_row.get("job_title"),
        recruiter_name=full_row.get("recruiter_name"),
        recruiter_id=str(full_row["recruiter_id"]) if full_row.get("recruiter_id") else None,
        automated_email_sent=full_row.get("automated_email_sent", False),
    )


@router.patch("/applications/{application_id}/notes", response_model=ApplicationResponse)
async def update_recruiter_notes(
    application_id: str,
    request: RecruiterNotesUpdate,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Add or update recruiter notes on an application."""
    row = await models.update_application_notes(conn, application_id, request.recruiter_notes)
    if not row:
        raise NotFoundError("Application not found")

    full_row = await models.get_application_by_id(conn, application_id)
    breakdown = full_row.get("score_breakdown", {})
    if isinstance(breakdown, str):
        breakdown = json.loads(breakdown)

    return ApplicationResponse(
        id=str(full_row["id"]),
        job_id=str(full_row["job_id"]),
        candidate_id=str(full_row["candidate_id"]),
        status=full_row["status"],
        source=full_row.get("source", "manual"),
        suitability_score=float(full_row.get("suitability_score", 0)),
        score_breakdown=breakdown,
        ai_summary=full_row.get("ai_summary"),
        recruiter_notes=full_row.get("recruiter_notes"),
        applied_at=full_row.get("applied_at"),
        updated_at=full_row.get("updated_at"),
        candidate_name=full_row.get("candidate_name"),
        candidate_email=full_row.get("candidate_email"),
        job_title=full_row.get("job_title"),
        recruiter_name=full_row.get("recruiter_name"),
        recruiter_id=str(full_row["recruiter_id"]) if full_row.get("recruiter_id") else None,
        automated_email_sent=full_row.get("automated_email_sent", False),
    )


@router.post("/applications/{application_id}/send-email")
async def send_automated_email(
    application_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """
    Trigger automated interview invitation email to a shortlisted candidate.
    Uses AI to draft a personalized invitation.
    Sets automated_email_sent = True in the database.
    """
    return await service.send_automated_email(conn, application_id)

@router.post("/applications/{application_id}/draft-email", response_model=DraftEmailResponse)
async def draft_automated_email(
    application_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Draft an email for a candidate using AI without sending it."""
    draft = await service.draft_automated_email(conn, application_id)
    return DraftEmailResponse(subject=draft["subject"], body=draft["body"])

@router.post("/applications/{application_id}/send-custom-email")
async def send_custom_email(
    application_id: str,
    request: SendCustomEmailRequest,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Send a custom email via SMTP."""
    return await service.send_custom_email(
        conn, application_id, request.subject, request.body
    )


@router.delete("/applications/{application_id}", response_model=MessageResponse)
async def delete_application(
    application_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """
    Delete an application and its associated interviews.
    Restricted to HR.
    """
    deleted = await models.delete_application(conn, application_id)
    if not deleted:
        raise NotFoundError("Application not found")
    return MessageResponse(message="Application deleted successfully")