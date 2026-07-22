from asyncpg import Connection


async def get_overview(conn: Connection, recruiter_id: str | None = None) -> dict:
    """High-level dashboard numbers."""
    job_filter = ""
    app_filter = ""
    params = []
    if recruiter_id:
        job_filter = "WHERE recruiter_id = $1"
        app_filter = "WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)"
        params = [recruiter_id]

    # Jobs stats
    jobs_stats = await conn.fetchrow(
        f"""
        SELECT
            COUNT(*) AS total_jobs,
            COUNT(*) FILTER (WHERE status = 'open') AS open_jobs,
            COUNT(*) FILTER (WHERE status = 'closed') AS closed_jobs,
            COUNT(*) FILTER (WHERE status = 'draft') AS draft_jobs,
            COUNT(*) FILTER (WHERE status = 'on-hold') AS on_hold_jobs
        FROM jobs
        {job_filter}
        """,
        *params,
    )

    # Candidate & application stats
    totals = await conn.fetchrow(
        f"""
        SELECT
            (SELECT COUNT(DISTINCT candidate_id) FROM applications {app_filter}) AS total_candidates,
            (SELECT COUNT(*) FROM applications {app_filter}) AS total_applications,
            (SELECT COUNT(*) FROM interviews WHERE application_id IN (SELECT id FROM applications {app_filter}) OR interviewer_id = $1) AS total_interviews
        """,
        *(params if params else [None])
    )

    # Average suitability score
    avg_score = await conn.fetchval(
        f"SELECT ROUND(AVG(suitability_score)::numeric, 2) FROM applications {app_filter} {'AND' if app_filter else 'WHERE'} suitability_score > 0",
        *params
    )

    return {
        "jobs": {
            "total": jobs_stats["total_jobs"],
            "open": jobs_stats["open_jobs"],
            "closed": jobs_stats["closed_jobs"],
            "draft": jobs_stats["draft_jobs"],
            "on_hold": jobs_stats["on_hold_jobs"],
        },
        "total_candidates": totals["total_candidates"],
        "total_applications": totals["total_applications"],
        "total_interviews": totals["total_interviews"],
        "average_suitability_score": float(avg_score) if avg_score else 0,
    }


async def get_pipeline_funnel(conn: Connection, job_id: str | None = None, recruiter_id: str | None = None) -> list[dict]:
    """Application pipeline funnel: how many candidates at each stage."""
    job_filter = ""
    params = []
    if job_id:
        job_filter = "WHERE job_id = $1"
        params = [job_id]
        if recruiter_id:
            job_filter += " AND job_id IN (SELECT id FROM jobs WHERE recruiter_id = $2)"
            params.append(recruiter_id)
    elif recruiter_id:
        job_filter = "WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)"
        params = [recruiter_id]

    rows = await conn.fetch(
        f"""
        SELECT status, COUNT(*) AS count
        FROM applications
        {job_filter}
        GROUP BY status
        ORDER BY
            CASE status
                WHEN 'new' THEN 1
                WHEN 'screened' THEN 2
                WHEN 'shortlisted' THEN 3
                WHEN 'interview' THEN 4
                WHEN 'offered' THEN 5
                WHEN 'hired' THEN 6
                WHEN 'rejected' THEN 7
            END
        """,
        *params,
    )

    # Ensure all statuses appear even if count is 0
    all_statuses = ["new", "screened", "shortlisted", "interview", "offered", "hired", "rejected"]
    status_counts = {r["status"]: r["count"] for r in rows}

    return [
        {"status": s, "count": status_counts.get(s, 0)}
        for s in all_statuses
    ]


async def get_time_to_hire(conn: Connection, job_id: str | None = None, recruiter_id: str | None = None) -> dict:
    """Average time from application to each stage."""
    job_filter = ""
    params = []
    if job_id:
        job_filter = "AND a.job_id = $1"
        params = [job_id]
        if recruiter_id:
            job_filter += " AND a.job_id IN (SELECT id FROM jobs WHERE recruiter_id = $2)"
            params.append(recruiter_id)
    elif recruiter_id:
        job_filter = "AND a.job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)"
        params = [recruiter_id]

    # Average days from application to hire
    avg_hire = await conn.fetchval(
        f"""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (a.updated_at - a.applied_at)) / 86400)::numeric, 1)
        FROM applications a
        WHERE a.status = 'hired'
        {job_filter}
        """,
        *params,
    )

    # Average days from application to interview
    avg_interview = await conn.fetchval(
        f"""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (i.scheduled_at - a.applied_at)) / 86400)::numeric, 1)
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        WHERE i.scheduled_at IS NOT NULL
        {job_filter}
        """,
        *params,
    )

    # Average days from application to screening
    avg_screen = await conn.fetchval(
        f"""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (a.updated_at - a.applied_at)) / 86400)::numeric, 1)
        FROM applications a
        WHERE a.status IN ('screened', 'shortlisted', 'interview', 'offered', 'hired')
        {job_filter}
        """,
        *params,
    )

    return {
        "avg_days_to_hire": float(avg_hire) if avg_hire else None,
        "avg_days_to_interview": float(avg_interview) if avg_interview else None,
        "avg_days_to_screen": float(avg_screen) if avg_screen else None,
    }


async def get_top_skills(conn: Connection, limit: int = 15) -> list[dict]:
    """Most common skills across all candidates."""
    rows = await conn.fetch(
        """
        SELECT skill, COUNT(*) AS count
        FROM (
            SELECT jsonb_array_elements_text(skills) AS skill
            FROM candidates
            WHERE skills IS NOT NULL AND skills != '[]'::jsonb
        ) sub
        GROUP BY skill
        ORDER BY count DESC
        LIMIT $1
        """,
        limit,
    )
    return [{"skill": r["skill"], "count": r["count"]} for r in rows]


async def get_source_distribution(conn: Connection, job_id: str | None = None, recruiter_id: str | None = None) -> list[dict]:
    """Candidate distribution by source."""
    job_filter = ""
    params = []
    if job_id:
        job_filter = "WHERE job_id = $1"
        params = [job_id]
        if recruiter_id:
            job_filter += " AND job_id IN (SELECT id FROM jobs WHERE recruiter_id = $2)"
            params.append(recruiter_id)
    elif recruiter_id:
        job_filter = "WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)"
        params = [recruiter_id]

    rows = await conn.fetch(
        f"""
        SELECT source, COUNT(*) AS count
        FROM applications
        {job_filter}
        GROUP BY source
        ORDER BY count DESC
        """,
        *params,
    )
    return [{"source": r["source"], "count": r["count"]} for r in rows]


async def get_jobs_analytics(conn: Connection, recruiter_id: str | None = None) -> list[dict]:
    """Per-job analytics: applicant counts, avg scores, hire rate."""
    job_filter = ""
    params = []
    if recruiter_id:
        job_filter = "WHERE j.recruiter_id = $1"
        params = [recruiter_id]

    rows = await conn.fetch(
        f"""
        SELECT
            j.id,
            j.title,
            j.status,
            j.department,
            j.created_at,
            j.emergency,
            COUNT(a.id) AS total_applicants,
            COUNT(a.id) FILTER (WHERE a.status = 'hired') AS hired_count,
            COUNT(a.id) FILTER (WHERE a.status = 'rejected') AS rejected_count,
            COUNT(a.id) FILTER (WHERE a.status = 'interview') AS interview_count,
            COUNT(a.id) FILTER (WHERE a.status = 'shortlisted') AS shortlisted_count,
            ROUND(AVG(a.suitability_score)::numeric, 2) AS avg_score,
            ROUND(MAX(a.suitability_score)::numeric, 2) AS top_score
        FROM jobs j
        LEFT JOIN applications a ON a.job_id = j.id
        {job_filter}
        GROUP BY j.id, j.emergency
        ORDER BY j.created_at DESC
        """,
        *params
    )

    return [
        {
            "job_id": str(r["id"]),
            "title": r["title"],
            "status": r["status"],
            "department": r["department"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "emergency": r["emergency"],
            "total_applicants": r["total_applicants"],
            "hired_count": r["hired_count"],
            "rejected_count": r["rejected_count"],
            "interview_count": r["interview_count"],
            "shortlisted_count": r["shortlisted_count"],
            "avg_score": float(r["avg_score"]) if r["avg_score"] else 0,
            "top_score": float(r["top_score"]) if r["top_score"] else 0,
        }
        for r in rows
    ]


async def get_department_analytics(conn: Connection, recruiter_id: str | None = None) -> list[dict]:
    """Aggregated analytics per department."""
    job_filter = ""
    params = []
    if recruiter_id:
        job_filter = "WHERE j.recruiter_id = $1"
        params = [recruiter_id]

    rows = await conn.fetch(
        f"""
        SELECT
            COALESCE(j.department, 'Unassigned') AS department,
            COUNT(DISTINCT j.id) AS total_jobs,
            COUNT(a.id) AS total_applicants,
            COUNT(a.id) FILTER (WHERE a.status = 'hired') AS hired_count,
            ROUND(AVG(a.suitability_score)::numeric, 2) AS avg_score
        FROM jobs j
        LEFT JOIN applications a ON a.job_id = j.id
        {job_filter}
        GROUP BY j.department
        ORDER BY total_applicants DESC
        """,
        *params
    )

    return [
        {
            "department": r["department"],
            "total_jobs": r["total_jobs"],
            "total_applicants": r["total_applicants"],
            "hired_count": r["hired_count"],
            "avg_score": float(r["avg_score"]) if r["avg_score"] else 0,
        }
        for r in rows
    ]


async def get_manager_analytics(conn: Connection) -> list[dict]:
    """Aggregated analytics per manager/recruiter."""
    rows = await conn.fetch(
        """
        SELECT
            p.id AS manager_id,
            COALESCE(p.full_name, p.display_name, p.email) AS manager_name,
            p.email AS manager_email,
            p.role AS manager_role,
            COUNT(DISTINCT j.id) AS total_jobs,
            COUNT(a.id) AS total_applicants,
            COUNT(a.id) FILTER (WHERE a.status = 'hired') AS hired_count,
            ROUND(AVG(a.suitability_score)::numeric, 2) AS avg_score
        FROM profiles p
        LEFT JOIN jobs j ON j.recruiter_id = p.id
        LEFT JOIN applications a ON a.job_id = j.id
        WHERE p.role IN ('Manager', 'HR')
        GROUP BY p.id, p.full_name, p.display_name, p.email, p.role
        ORDER BY total_applicants DESC
        """
    )
    return [
        {
            "manager_id": str(r["manager_id"]),
            "manager_name": r["manager_name"],
            "manager_email": r["manager_email"],
            "manager_role": r["manager_role"],
            "total_jobs": r["total_jobs"],
            "total_applicants": r["total_applicants"],
            "hired_count": r["hired_count"],
            "avg_score": float(r["avg_score"]) if r["avg_score"] else 0,
        }
        for r in rows
    ]


async def get_interview_analytics(conn: Connection, recruiter_id: str | None = None) -> dict:
    """Interview completion rates and average ratings."""
    filter_sql = ""
    params = []
    if recruiter_id:
        filter_sql = "WHERE i.interviewer_id = $1 OR i.application_id IN (SELECT a.id FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.recruiter_id = $1)"
        params = [recruiter_id]

    stats = await conn.fetchrow(
        f"""
        SELECT
            COUNT(*) AS total_interviews,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
            COUNT(*) FILTER (WHERE status = 'no-show') AS no_show,
            COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
            ROUND(AVG(rating)::numeric, 2) AS avg_rating,
            ROUND(AVG(duration_minutes)::numeric, 0) AS avg_duration
        FROM interviews i
        {filter_sql}
        """,
        *params
    )

    type_breakdown = await conn.fetch(
        f"""
        SELECT
            interview_type,
            COUNT(*) AS count,
            ROUND(AVG(rating)::numeric, 2) AS avg_rating
        FROM interviews i
        {filter_sql}
        GROUP BY interview_type
        ORDER BY count DESC
        """,
        *params
    )

    return {
        "total_interviews": stats["total_interviews"],
        "completed": stats["completed"],
        "cancelled": stats["cancelled"],
        "no_show": stats["no_show"],
        "scheduled": stats["scheduled"],
        "avg_rating": float(stats["avg_rating"]) if stats["avg_rating"] else None,
        "avg_duration_minutes": int(stats["avg_duration"]) if stats["avg_duration"] else None,
        "by_type": [
            {
                "type": r["interview_type"],
                "count": r["count"],
                "avg_rating": float(r["avg_rating"]) if r["avg_rating"] else None,
            }
            for r in type_breakdown
        ],
    }


async def get_score_distribution(conn: Connection, job_id: str | None = None, recruiter_id: str | None = None) -> list[dict]:
    """Distribution of suitability scores in buckets."""
    job_filter = ""
    params = []
    if job_id:
        job_filter = "WHERE job_id = $1"
        params = [job_id]
        if recruiter_id:
            job_filter += " AND job_id IN (SELECT id FROM jobs WHERE recruiter_id = $2)"
            params.append(recruiter_id)
    elif recruiter_id:
        job_filter = "WHERE job_id IN (SELECT id FROM jobs WHERE recruiter_id = $1)"
        params = [recruiter_id]

    rows = await conn.fetch(
        f"""
        SELECT
            CASE
                WHEN suitability_score >= 90 THEN '90-100'
                WHEN suitability_score >= 80 THEN '80-89'
                WHEN suitability_score >= 70 THEN '70-79'
                WHEN suitability_score >= 60 THEN '60-69'
                WHEN suitability_score >= 50 THEN '50-59'
                WHEN suitability_score >= 40 THEN '40-49'
                ELSE '0-39'
            END AS score_range,
            COUNT(*) AS count
        FROM applications
        {job_filter}
        GROUP BY score_range
        ORDER BY score_range DESC
        """,
        *params,
    )

    # Ensure all buckets appear
    all_ranges = ["90-100", "80-89", "70-79", "60-69", "50-59", "40-49", "0-39"]
    range_counts = {r["score_range"]: r["count"] for r in rows}

    return [
        {"range": rng, "count": range_counts.get(rng, 0)}
        for rng in all_ranges
    ]