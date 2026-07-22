import json
from asyncpg import Connection

from app.candidates import models
from app.candidates.schemas import CandidateResponse, CandidateUpdateRequest
from app.common.storage import get_file_url
from app.common.exceptions import NotFoundError


def _parse_json_field(value, default):
    if value is None:
        return default
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            # If it's a plain string that can't be parsed as JSON, keep it as is
            pass
    return value


def _as_list(value) -> list:
    """Normalize JSONB that may be stored as a single object or a list."""
    value = _parse_json_field(value, [])
    if isinstance(value, dict):
        return [value]
    if isinstance(value, list):
        return value
    return []


def _normalize_education(education) -> list[dict]:
    items = []
    for item in _as_list(education):
        if not isinstance(item, dict):
            continue
        normalized = dict(item)
        if "school" in normalized and "institution" not in normalized:
            normalized["institution"] = normalized["school"]
        items.append(normalized)
    return items


def _row_to_response(row: dict) -> CandidateResponse:
    skills = _as_list(row.get("skills", []))
    experience = _as_list(row.get("experience", []))
    education = _normalize_education(row.get("education", []))
    certifications = _as_list(row.get("certifications", []))
    parsed_data = _parse_json_field(row.get("parsed_data", {}), {})
    if not isinstance(parsed_data, dict):
        parsed_data = {}

    # Refresh signed URL if file path exists
    resume_url = row.get("resume_url")
    if row.get("resume_file_path"):
        try:
            resume_url = get_file_url(row["resume_file_path"])
        except Exception:
            pass

    return CandidateResponse(
        id=str(row["id"]),
        full_name=row["full_name"],
        email=row["email"],
        phone=row.get("phone"),
        location=row.get("location"),
        summary=row.get("summary"),
        skills=skills,
        experience=experience,
        education=education,
        certifications=certifications,
        total_experience_years=round(float(row.get("total_experience_years", 0)), 1),
        resume_url=resume_url,
        resume_file_path=row.get("resume_file_path"),
        parsed_data=parsed_data,
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


async def get_candidate(conn: Connection, candidate_id: str) -> CandidateResponse:
    row = await models.get_candidate_by_id(conn, candidate_id)
    if not row:
        raise NotFoundError("Candidate not found")
    return _row_to_response(row)


async def list_candidates(
    conn: Connection,
    search: str | None = None,
    skills: list[str] | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[CandidateResponse], int]:
    rows, total = await models.get_candidates(conn, search, skills, page, page_size)
    return [_row_to_response(r) for r in rows], total


async def update_candidate(
    conn: Connection, candidate_id: str, request: CandidateUpdateRequest
) -> CandidateResponse:
    existing = await models.get_candidate_by_id(conn, candidate_id)
    if not existing:
        raise NotFoundError("Candidate not found")

    update_data = request.model_dump(exclude_none=True)
    row = await models.update_candidate(conn, candidate_id, update_data)
    if not row:
        raise NotFoundError("Candidate not found")
    return _row_to_response(row)


async def delete_candidate(conn: Connection, candidate_id: str) -> bool:
    existing = await models.get_candidate_by_id(conn, candidate_id)
    if not existing:
        raise NotFoundError("Candidate not found")
    return await models.delete_candidate(conn, candidate_id)