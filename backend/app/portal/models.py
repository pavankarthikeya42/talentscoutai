import json
from asyncpg import Connection


_OPEN_JOB_FILTER = """
    status = 'open'
    AND (closing_date IS NULL OR closing_date >= CURRENT_DATE)
"""


async def get_open_jobs_count(conn: Connection) -> int:
    return await conn.fetchval(f"SELECT COUNT(*) FROM jobs WHERE {_OPEN_JOB_FILTER}")


async def get_open_jobs(conn: Connection) -> list[dict]:
    rows = await conn.fetch(
        f"""
        SELECT id, title, department, location, employment_type,
               salary_min, salary_max, vacancies, closing_date, created_at
        FROM jobs
        WHERE {_OPEN_JOB_FILTER}
        ORDER BY emergency DESC, created_at DESC
        """
    )
    return [dict(r) for r in rows]


async def get_open_job_by_id(conn: Connection, job_id: str) -> dict | None:
    row = await conn.fetchrow(
        f"""
        SELECT id, title, department, location, employment_type,
               description, requirements, salary_min, salary_max,
               vacancies, closing_date, created_at
        FROM jobs
        WHERE id = $1 AND {_OPEN_JOB_FILTER}
        """,
        job_id,
    )
    return dict(row) if row else None


async def get_job_title(conn: Connection, job_id: str) -> dict | None:
    row = await conn.fetchrow(
        f"SELECT id, title FROM jobs WHERE id = $1 AND {_OPEN_JOB_FILTER}",
        job_id,
    )
    return dict(row) if row else None


async def check_duplicate_application(
    conn: Connection, job_id: str, candidate_id: str
) -> bool:
    result = await conn.fetchval(
        "SELECT id FROM applications WHERE job_id = $1 AND candidate_id = $2",
        job_id,
        candidate_id,
    )
    return result is not None


async def create_application(
    conn: Connection,
    job_id: str,
    candidate_id: str,
    expected_salary: str | None = None,
    notice_period: str | None = None,
) -> dict:
    row = await conn.fetchrow(
        """
        INSERT INTO applications (
            job_id, candidate_id, status, source,
            expected_salary, notice_period
        ) VALUES ($1, $2, 'new', 'career_portal', $3, $4)
        RETURNING *
        """,
        job_id,
        candidate_id,
        expected_salary,
        notice_period,
    )
    return dict(row)


async def get_applications_by_email(conn: Connection, candidate_id: str) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT j.title AS job_title, j.department,
               a.status, a.applied_at, a.suitability_score
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        WHERE a.candidate_id = $1
        ORDER BY a.applied_at DESC
        """,
        candidate_id,
    )
    return [dict(r) for r in rows]