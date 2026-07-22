import json
from asyncpg import Connection


async def insert_job(conn: Connection, job_data: dict) -> dict:
    row = await conn.fetchrow(
        """
        INSERT INTO jobs (
            recruiter_id, title, department, location, employment_type,
            description, requirements, salary_min, salary_max, status,
            screening_criteria, description_embedding, vacancies, closing_date,
            emergency, posted_to_linkedin, posted_to_naukri
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::jsonb,$12::vector,$13,$14,$15,$16,$17)
        RETURNING *
        """,
        job_data["recruiter_id"],
        job_data["title"],
        job_data.get("department"),
        job_data.get("location"),
        job_data.get("employment_type"),
        job_data["description"],
        json.dumps(job_data.get("requirements", {})),
        job_data.get("salary_min"),
        job_data.get("salary_max"),
        job_data.get("status", "open"),
        json.dumps(job_data.get("screening_criteria", {})),
        job_data.get("description_embedding"),
        job_data.get("vacancies", 1),
        job_data.get("closing_date"),
        job_data.get("emergency", False),
        job_data.get("posted_to_linkedin", False),
        job_data.get("posted_to_naukri", False),
    )
    return dict(row)


async def get_job_by_id(conn: Connection, job_id: str) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT j.*,
               p.full_name AS recruiter_name,
               (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicant_count
        FROM jobs j
        LEFT JOIN profiles p ON p.id = j.recruiter_id
        WHERE j.id = $1
        """,
        job_id,
    )
    return dict(row) if row else None


async def get_jobs(
    conn: Connection,
    recruiter_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[dict], int]:
    conditions = []
    params = []
    idx = 1

    if recruiter_id:
        conditions.append(f"j.recruiter_id = ${idx}")
        params.append(recruiter_id)
        idx += 1

    if status:
        conditions.append(f"j.status = ${idx}")
        params.append(status)
        idx += 1

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Count
    total = await conn.fetchval(
        f"SELECT COUNT(*) FROM jobs j {where_clause}", *params
    )

    # Paginated results
    offset = (page - 1) * page_size
    params.extend([page_size, offset])

    rows = await conn.fetch(
        f"""
        SELECT j.*,
               p.full_name AS recruiter_name,
               (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicant_count
        FROM jobs j
        LEFT JOIN profiles p ON p.id = j.recruiter_id
        {where_clause}
        ORDER BY j.emergency DESC, j.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )

    return [dict(r) for r in rows], total


async def update_job(conn: Connection, job_id: str, update_data: dict) -> dict | None:
    set_clauses = []
    params = []
    idx = 1

    field_map = {
        "title": "title",
        "department": "department",
        "location": "location",
        "employment_type": "employment_type",
        "description": "description",
        "salary_min": "salary_min",
        "salary_max": "salary_max",
        "status": "status",
        "vacancies": "vacancies",
        "closing_date": "closing_date",
        "emergency": "emergency",
        "posted_to_linkedin": "posted_to_linkedin",
        "posted_to_naukri": "posted_to_naukri",
    }

    for key, col in field_map.items():
        if key in update_data:
            set_clauses.append(f"{col} = ${idx}")
            params.append(update_data[key])
            idx += 1

    # JSONB fields
    for key in ["requirements", "screening_criteria"]:
        if key in update_data:
            set_clauses.append(f"{key} = ${idx}::jsonb")
            params.append(json.dumps(update_data[key]))
            idx += 1

    # Embedding
    if "description_embedding" in update_data:
        set_clauses.append(f"description_embedding = ${idx}::vector")
        params.append(update_data["description_embedding"])
        idx += 1

    if not set_clauses:
        return await get_job_by_id(conn, job_id)

    params.append(job_id)
    row = await conn.fetchrow(
        f"""
        UPDATE jobs SET {', '.join(set_clauses)}
        WHERE id = ${idx}
        RETURNING *
        """,
        *params,
    )
    return dict(row) if row else None


async def delete_job(conn: Connection, job_id: str) -> bool:
    result = await conn.execute("DELETE FROM jobs WHERE id = $1", job_id)
    return result == "DELETE 1"