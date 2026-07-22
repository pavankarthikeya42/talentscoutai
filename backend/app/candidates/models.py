import json
from asyncpg import Connection


async def insert_candidate(conn: Connection, data: dict) -> dict:
    row = await conn.fetchrow(
        """
        INSERT INTO candidates (
            full_name, email, phone, location, summary,
            skills, experience, education, certifications,
            total_experience_years, resume_url, resume_file_path,
            parsed_data, resume_embedding
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14::vector)
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            location = EXCLUDED.location,
            summary = EXCLUDED.summary,
            skills = EXCLUDED.skills,
            experience = EXCLUDED.experience,
            education = EXCLUDED.education,
            certifications = EXCLUDED.certifications,
            total_experience_years = EXCLUDED.total_experience_years,
            resume_url = EXCLUDED.resume_url,
            resume_file_path = EXCLUDED.resume_file_path,
            parsed_data = EXCLUDED.parsed_data,
            resume_embedding = EXCLUDED.resume_embedding,
            updated_at = NOW()
        RETURNING *
        """,
        data["full_name"],
        data["email"],
        data.get("phone"),
        data.get("location"),
        data.get("summary"),
        json.dumps(data.get("skills", [])),
        json.dumps(data.get("experience", [])),
        json.dumps(data.get("education", [])),
        json.dumps(data.get("certifications", [])),
        data.get("total_experience_years", 0),
        data.get("resume_url"),
        data.get("resume_file_path"),
        json.dumps(data.get("parsed_data", {})),
        data.get("resume_embedding"),
    )
    return dict(row)


async def get_candidate_by_id(conn: Connection, candidate_id: str) -> dict | None:
    row = await conn.fetchrow("SELECT * FROM candidates WHERE id = $1", candidate_id)
    return dict(row) if row else None


async def get_candidate_by_email(conn: Connection, email: str) -> dict | None:
    row = await conn.fetchrow("SELECT * FROM candidates WHERE email = $1", email)
    return dict(row) if row else None


async def get_candidates(
    conn: Connection,
    search: str | None = None,
    skills: list[str] | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[dict], int]:
    conditions = []
    params = []
    idx = 1

    if search:
        conditions.append(
            f"(full_name ILIKE ${idx} OR email ILIKE ${idx} OR location ILIKE ${idx})"
        )
        params.append(f"%{search}%")
        idx += 1

    if skills:
        conditions.append(f"EXISTS (SELECT 1 FROM jsonb_array_elements_text(skills) s WHERE s ILIKE ${idx})")
        params.append(f"%{skills[0]}%")
        idx += 1

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = await conn.fetchval(
        f"SELECT COUNT(*) FROM candidates {where_clause}", *params
    )

    offset = (page - 1) * page_size
    params.extend([page_size, offset])

    rows = await conn.fetch(
        f"""
        SELECT * FROM candidates
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )

    return [dict(r) for r in rows], total


async def update_candidate(conn: Connection, candidate_id: str, data: dict) -> dict | None:
    set_clauses = []
    params = []
    idx = 1

    simple_fields = ["full_name", "phone", "location", "summary", "total_experience_years"]
    for field in simple_fields:
        if field in data:
            set_clauses.append(f"{field} = ${idx}")
            params.append(data[field])
            idx += 1

    json_fields = ["skills", "certifications"]
    for field in json_fields:
        if field in data:
            set_clauses.append(f"{field} = ${idx}::jsonb")
            params.append(json.dumps(data[field]))
            idx += 1

    if "resume_embedding" in data:
        set_clauses.append(f"resume_embedding = ${idx}::vector")
        params.append(data["resume_embedding"])
        idx += 1

    if not set_clauses:
        return await get_candidate_by_id(conn, candidate_id)

    params.append(candidate_id)
    row = await conn.fetchrow(
        f"""
        UPDATE candidates SET {', '.join(set_clauses)}
        WHERE id = ${idx}
        RETURNING *
        """,
        *params,
    )
    return dict(row) if row else None


async def delete_candidate(conn: Connection, candidate_id: str) -> bool:
    result = await conn.execute("DELETE FROM candidates WHERE id = $1", candidate_id)
    return result == "DELETE 1"