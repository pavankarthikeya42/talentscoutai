import json
from asyncpg import Connection

from app.common.gemini import generate_embedding


async def retrieve_candidates_by_query(
    conn: Connection,
    query: str,
    top_k: int = 10,
    min_similarity: float = 0.3,
) -> list[dict]:
    """
    Semantic search: embed the user query, then find
    the most similar candidate resumes via pgvector.
    """
    query_embedding = await generate_embedding(query)

    rows = await conn.fetch(
        """
        SELECT
            id, full_name, email, phone, location, summary,
            skills, experience, education, certifications,
            total_experience_years,
            1 - (resume_embedding <=> $1::vector) AS similarity_score
        FROM candidates
        WHERE resume_embedding IS NOT NULL
          AND 1 - (resume_embedding <=> $1::vector) > $3
        ORDER BY resume_embedding <=> $1::vector
        LIMIT $2
        """,
        str(query_embedding),
        top_k,
        min_similarity,
    )

    results = []
    for row in rows:
        r = dict(row)
        # Parse JSONB fields
        for field in ["skills", "experience", "education", "certifications"]:
            if isinstance(r.get(field), str):
                r[field] = json.loads(r[field])
        results.append(r)

    return results


async def retrieve_candidates_for_job(
    conn: Connection,
    job_id: str,
    top_k: int = 10,
    min_similarity: float = 0.3,
) -> list[dict]:
    """
    Retrieve candidates similar to a specific job's embedding.
    """
    rows = await conn.fetch(
        """
        SELECT
            c.id, c.full_name, c.email, c.phone, c.location, c.summary,
            c.skills, c.experience, c.education, c.certifications,
            c.total_experience_years,
            1 - (c.resume_embedding <=> j.description_embedding) AS similarity_score
        FROM candidates c, jobs j
        WHERE j.id = $1
          AND c.resume_embedding IS NOT NULL
          AND j.description_embedding IS NOT NULL
          AND 1 - (c.resume_embedding <=> j.description_embedding) > $3
        ORDER BY c.resume_embedding <=> j.description_embedding
        LIMIT $2
        """,
        job_id,
        top_k,
        min_similarity,
    )

    results = []
    for row in rows:
        r = dict(row)
        for field in ["skills", "experience", "education", "certifications"]:
            if isinstance(r.get(field), str):
                r[field] = json.loads(r[field])
        results.append(r)

    return results


async def retrieve_with_filters(
    conn: Connection,
    query: str,
    min_experience: float | None = None,
    required_skills: list[str] | None = None,
    location: str | None = None,
    top_k: int = 10,
) -> list[dict]:
    """
    Hybrid retrieval: semantic search + structured filters.
    """
    query_embedding = await generate_embedding(query)

    conditions = [
        "resume_embedding IS NOT NULL",
        "1 - (resume_embedding <=> $1::vector) > 0.25",
    ]
    params = [str(query_embedding)]
    idx = 2

    if min_experience is not None:
        conditions.append(f"total_experience_years >= ${idx}")
        params.append(min_experience)
        idx += 1

    if location:
        conditions.append(f"location ILIKE ${idx}")
        params.append(f"%{location}%")
        idx += 1

    if required_skills:
        for skill in required_skills:
            conditions.append(f"skills::text ILIKE ${idx}")
            params.append(f"%{skill}%")
            idx += 1

    params.append(top_k)
    where_clause = " AND ".join(conditions)

    rows = await conn.fetch(
        f"""
        SELECT
            id, full_name, email, phone, location, summary,
            skills, experience, education, certifications,
            total_experience_years,
            1 - (resume_embedding <=> $1::vector) AS similarity_score
        FROM candidates
        WHERE {where_clause}
        ORDER BY resume_embedding <=> $1::vector
        LIMIT ${idx}
        """,
        *params,
    )

    results = []
    for row in rows:
        r = dict(row)
        for field in ["skills", "experience", "education", "certifications"]:
            if isinstance(r.get(field), str):
                r[field] = json.loads(r[field])
        results.append(r)

    return results