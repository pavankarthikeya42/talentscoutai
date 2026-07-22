from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import UserProfile
from app.candidates import service
from app.candidates.schemas import (
    CandidateResponse,
    CandidateListResponse,
    CandidateUpdateRequest,
)

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    search: str | None = Query(None, description="Search by name, email, or location"),
    skills: str | None = Query(None, description="Filter by skill"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """List all candidates with search and pagination."""
    skill_list = [skills] if skills else None
    candidates, total = await service.list_candidates(conn, search, skill_list, page, page_size)
    return CandidateListResponse(
        candidates=candidates, total=total, page=page, page_size=page_size
    )


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Get a single candidate by ID with refreshed resume URL."""
    return await service.get_candidate(conn, candidate_id)


@router.put("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: str,
    request: CandidateUpdateRequest,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Update candidate details manually."""
    return await service.update_candidate(conn, candidate_id, request)


@router.delete("/{candidate_id}")
async def delete_candidate(
    candidate_id: str,
    current_user: UserProfile = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    """Delete a candidate."""
    await service.delete_candidate(conn, candidate_id)
    return {"message": "Candidate deleted successfully"}