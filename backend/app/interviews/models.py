import json
from asyncpg import Connection


async def insert_interview(conn: Connection, data: dict) -> dict:
    row = await conn.fetchrow(
        """
        INSERT INTO interviews (
            application_id, interviewer_id, round_number, interview_type,
            scheduled_at, duration_minutes, status, ai_suggested_questions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING *
        """,
        data["application_id"],
        data.get("interviewer_id"),
        data.get("round_number", 1),
        data.get("interview_type", "technical"),
        data.get("scheduled_at"),
        data.get("duration_minutes", 60),
        data.get("status", "scheduled"),
        json.dumps(data.get("ai_suggested_questions", [])),
    )
    return dict(row)


async def get_interview_by_id(conn: Connection, interview_id: str) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT i.*, c.full_name AS candidate_name, c.email AS candidate_email,
               j.title AS job_title, p.full_name AS interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN profiles p ON p.id = i.interviewer_id
        WHERE i.id = $1
        """,
        interview_id,
    )
    return dict(row) if row else None


async def get_interviews(
    conn: Connection,
    application_id: str | None = None,
    interviewer_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    recruiter_id: str | None = None,
) -> tuple[list[dict], int]:
    conditions = []
    params = []
    idx = 1

    if application_id:
        conditions.append(f"i.application_id = ${idx}")
        params.append(application_id)
        idx += 1

    if interviewer_id:
        conditions.append(f"i.interviewer_id = ${idx}")
        params.append(interviewer_id)
        idx += 1

    if status:
        conditions.append(f"i.status = ${idx}")
        params.append(status)
        idx += 1

    if recruiter_id:
        conditions.append(f"(i.interviewer_id = ${idx} OR j.recruiter_id = ${idx})")
        params.append(recruiter_id)
        idx += 1

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = await conn.fetchval(
        f"""
        SELECT COUNT(*) FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN jobs j ON j.id = a.job_id
        {where_clause}
        """,
        *params,
    )

    offset = (page - 1) * page_size
    params.extend([page_size, offset])

    rows = await conn.fetch(
        f"""
        SELECT i.*, c.full_name AS candidate_name, c.email AS candidate_email,
               j.title AS job_title, p.full_name AS interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN profiles p ON p.id = i.interviewer_id
        {where_clause}
        ORDER BY i.scheduled_at ASC NULLS LAST
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )
    return [dict(r) for r in rows], total


async def get_interviews_by_job(conn: Connection, job_id: str) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT i.*, c.full_name AS candidate_name, c.email AS candidate_email,
               j.title AS job_title, p.full_name AS interviewer_name
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN profiles p ON p.id = i.interviewer_id
        WHERE a.job_id = $1
        ORDER BY i.scheduled_at ASC NULLS LAST
        """,
        job_id,
    )
    return [dict(r) for r in rows]


async def update_interview(conn: Connection, interview_id: str, data: dict) -> dict | None:
    set_clauses = []
    params = []
    idx = 1

    simple_fields = [
        "interviewer_id", "round_number", "interview_type",
        "scheduled_at", "duration_minutes", "status", "feedback", "rating",
    ]
    for field in simple_fields:
        if field in data:
            set_clauses.append(f"{field} = ${idx}")
            params.append(data[field])
            idx += 1

    if "ai_suggested_questions" in data:
        set_clauses.append(f"ai_suggested_questions = ${idx}::jsonb")
        params.append(json.dumps(data["ai_suggested_questions"]))
        idx += 1

    if not set_clauses:
        return await get_interview_by_id(conn, interview_id)

    params.append(interview_id)
    row = await conn.fetchrow(
        f"""
        UPDATE interviews SET {', '.join(set_clauses)}
        WHERE id = ${idx}
        RETURNING *
        """,
        *params,
    )
    return dict(row) if row else None


async def delete_interview(conn: Connection, interview_id: str) -> bool:
    result = await conn.execute("DELETE FROM interviews WHERE id = $1", interview_id)
    return result == "DELETE 1"


async def get_application_context(conn: Connection, application_id: str) -> dict | None:
    """Get full context needed for AI question generation."""
    row = await conn.fetchrow(
        """
        SELECT
            a.id AS application_id,
            a.suitability_score,
            a.score_breakdown,
            a.ai_summary,
            c.full_name AS candidate_name,
            c.summary AS candidate_summary,
            c.skills AS candidate_skills,
            c.experience AS candidate_experience,
            c.education AS candidate_education,
            c.certifications AS candidate_certifications,
            c.total_experience_years,
            j.title AS job_title,
            j.description AS job_description,
            j.requirements AS job_requirements,
            j.department
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        WHERE a.id = $1
        """,
        application_id,
    )
    return dict(row) if row else None