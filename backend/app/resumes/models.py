# Resume-specific DB queries are minimal since candidates table holds all data.
# This file exists for any future resume-only operations (e.g., re-parse history).

from asyncpg import Connection


async def get_resume_by_candidate(conn: Connection, candidate_id: str) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT id, full_name, email, resume_url, resume_file_path, parsed_data, created_at
        FROM candidates
        WHERE id = $1
        """,
        candidate_id,
    )
    return dict(row) if row else None


async def get_resumes_by_job(conn: Connection, job_id: str) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT c.id, c.full_name, c.email, c.resume_url, c.resume_file_path,
               a.status, a.suitability_score, a.applied_at
        FROM candidates c
        JOIN applications a ON a.candidate_id = c.id
        WHERE a.job_id = $1
        ORDER BY a.applied_at DESC
        """,
        job_id,
    )
    return [dict(r) for r in rows]