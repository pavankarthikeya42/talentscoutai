import json
from asyncpg import Connection


async def find_similar_candidates(
    conn: Connection, job_embedding: str, top_k: int = 20,
    job_id: str | None = None,
) -> list[dict]:
    """Find candidates most similar to a job using pgvector cosine distance.

    If job_id is provided, only candidates who have applied to that job are searched.
    """
    if job_id:
        rows = await conn.fetch(
            """
            SELECT c.id, c.full_name, c.email, c.phone, c.location, c.summary,
                   c.skills, c.experience, c.education, c.certifications,
                   c.total_experience_years, c.resume_file_path,
                   1 - (c.resume_embedding <=> $1::vector) AS similarity_score
            FROM candidates c
            JOIN applications a ON a.candidate_id = c.id
            WHERE a.job_id = $3
              AND c.resume_embedding IS NOT NULL
            ORDER BY c.resume_embedding <=> $1::vector
            LIMIT $2
            """,
            job_embedding,
            top_k,
            job_id,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT id, full_name, email, phone, location, summary,
                   skills, experience, education, certifications,
                   total_experience_years, resume_file_path,
                   1 - (resume_embedding <=> $1::vector) AS similarity_score
            FROM candidates
            WHERE resume_embedding IS NOT NULL
            ORDER BY resume_embedding <=> $1::vector
            LIMIT $2
            """,
            job_embedding,
            top_k,
        )
    return [dict(r) for r in rows]


async def get_job_with_embedding(conn: Connection, job_id: str) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT id, title, department, location, employment_type,
               description, requirements, screening_criteria,
               description_embedding::text AS description_embedding
        FROM jobs WHERE id = $1
        """,
        job_id,
    )
    return dict(row) if row else None


async def upsert_application(conn: Connection, data: dict) -> dict:
    row = await conn.fetchrow(
        """
        INSERT INTO applications (
            job_id, candidate_id, status, source,
            suitability_score, score_breakdown, ai_summary
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (job_id, candidate_id) DO UPDATE SET
            status = EXCLUDED.status,
            suitability_score = EXCLUDED.suitability_score,
            score_breakdown = EXCLUDED.score_breakdown,
            ai_summary = EXCLUDED.ai_summary,
            updated_at = NOW()
        RETURNING *
        """,
        data["job_id"],
        data["candidate_id"],
        data.get("status", "screened"),
        data.get("source", "manual"),
        data.get("suitability_score", 0),
        json.dumps(data.get("score_breakdown", {})),
        data.get("ai_summary"),
    )
    return dict(row)


async def update_application_scores(conn: Connection, data: dict) -> dict:
    """Update only the screening scores on an existing application, preserving source."""
    row = await conn.fetchrow(
        """
        UPDATE applications
        SET status = $3,
            suitability_score = $4,
            score_breakdown = $5::jsonb,
            ai_summary = $6,
            updated_at = NOW()
        WHERE job_id = $1 AND candidate_id = $2
        RETURNING *
        """,
        data["job_id"],
        data["candidate_id"],
        data.get("status", "screened"),
        data.get("suitability_score", 0),
        json.dumps(data.get("score_breakdown", {})),
        data.get("ai_summary"),
    )
    return dict(row) if row else None


async def get_applications_by_job(
    conn: Connection,
    job_id: str,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    recruiter_id: str | None = None,
) -> tuple[list[dict], int]:
    conditions = ["a.job_id = $1"]
    params = [job_id]
    idx = 2

    if recruiter_id:
        conditions.append(f"j.recruiter_id = ${idx}")
        params.append(recruiter_id)
        idx += 1

    if status:
        conditions.append(f"a.status = ${idx}")
        params.append(status)
        idx += 1

    where_clause = " AND ".join(conditions)

    total = await conn.fetchval(
        f"SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id = a.job_id WHERE {where_clause}",
        *params,
    )

    offset = (page - 1) * page_size
    params.extend([page_size, offset])

    rows = await conn.fetch(
        f"""
        SELECT a.*, c.full_name AS candidate_name, c.email AS candidate_email,
               j.title AS job_title, p.full_name AS recruiter_name, j.recruiter_id AS recruiter_id
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN profiles p ON p.id = j.recruiter_id
        WHERE {where_clause}
        ORDER BY a.suitability_score DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )
    return [dict(r) for r in rows], total


async def get_all_applications(
    conn: Connection,
    job_id: str | None = None,
    status: str | None = None,
    min_score: float | None = None,
    page: int = 1,
    page_size: int = 20,
    recruiter_id: str | None = None,
) -> tuple[list[dict], int]:
    conditions = []
    params: list = []
    idx = 1

    if recruiter_id:
        conditions.append(f"j.recruiter_id = ${idx}")
        params.append(recruiter_id)
        idx += 1

    if job_id:
        conditions.append(f"a.job_id = ${idx}")
        params.append(job_id)
        idx += 1
    if status:
        conditions.append(f"a.status = ${idx}")
        params.append(status)
        idx += 1
    if min_score is not None:
        conditions.append(f"a.suitability_score >= ${idx}")
        params.append(min_score)
        idx += 1

    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = await conn.fetchval(
        f"SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id = a.job_id {where_clause}",
        *params,
    )

    offset = (page - 1) * page_size
    params.extend([page_size, offset])

    rows = await conn.fetch(
        f"""
        SELECT a.*, c.full_name AS candidate_name, c.email AS candidate_email,
               j.title AS job_title, p.full_name AS recruiter_name, j.recruiter_id AS recruiter_id
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN profiles p ON p.id = j.recruiter_id
        {where_clause}
        ORDER BY a.suitability_score DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )
    return [dict(r) for r in rows], total


async def get_applications_by_candidate(
    conn: Connection, candidate_id: str
) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT a.*, j.title AS job_title, j.department, j.status AS job_status
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        WHERE a.candidate_id = $1
        ORDER BY a.applied_at DESC
        """,
        candidate_id,
    )
    return [dict(r) for r in rows]


async def get_application_by_id(conn: Connection, application_id: str) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT a.*, c.full_name AS candidate_name, c.email AS candidate_email,
               j.title AS job_title, p.full_name AS recruiter_name, j.recruiter_id AS recruiter_id
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        JOIN jobs j ON j.id = a.job_id
        LEFT JOIN profiles p ON p.id = j.recruiter_id
        WHERE a.id = $1
        """,
        application_id,
    )
    return dict(row) if row else None


async def update_application_status(
    conn: Connection, application_id: str, status: str
) -> dict | None:
    row = await conn.fetchrow(
        """
        UPDATE applications 
        SET status = $2, automated_email_sent = FALSE
        WHERE id = $1
        RETURNING *
        """,
        application_id,
        status,
    )
    return dict(row) if row else None


async def update_application_notes(
    conn: Connection, application_id: str, notes: str
) -> dict | None:
    row = await conn.fetchrow(
        """
        UPDATE applications SET recruiter_notes = $2
        WHERE id = $1
        RETURNING *
        """,
        application_id,
        notes,
    )
    return dict(row) if row else None


async def delete_application(conn: Connection, application_id: str) -> bool:
    # Delete interviews first to satisfy foreign keys
    await conn.execute("DELETE FROM interviews WHERE application_id = $1", application_id)
    
    # Delete application
    res = await conn.execute("DELETE FROM applications WHERE id = $1", application_id)
    return res == "DELETE 1"