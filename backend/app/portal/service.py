import json
import uuid
from asyncpg import Connection

from app.portal import models
from app.resumes.service import extract_text, _build_candidate_embedding_text
from app.resumes.parser import parse_resume_text
from app.common.storage import upload_file, get_file_url
from app.common.gemini import generate_embedding
from app.common.exceptions import NotFoundError, ConflictError
from app.candidates import models as candidate_models
from app.portal.schemas import (
    PortalApplyRequest,
    PortalApplyResponse,
    PortalJobListItem,
    PortalJobDetail,
    PortalJobsResponse,
    PortalStatusItem,
    PortalStatusResponse,
    DashboardResponse,
)


COMPANY_NAME = "Motivity Labs"
COMPANY_TAGLINE = "Building Tomorrow's Technology Today"
COMPANY_ABOUT = (
    "Motivity Labs is a leading technology company specializing in innovative software solutions. "
    "We are always looking for talented individuals to join our growing team."
)


async def get_dashboard(conn: Connection) -> DashboardResponse:
    open_count = await models.get_open_jobs_count(conn)

    return DashboardResponse(
        company=COMPANY_NAME,
        tagline=COMPANY_TAGLINE,
        about=COMPANY_ABOUT,
        open_positions=open_count,
        careers_url="/api/careers/careers",
    )


async def get_careers(conn: Connection) -> PortalJobsResponse:
    rows = await models.get_open_jobs(conn)

    jobs = [
        PortalJobListItem(
            id=str(r["id"]),
            title=r["title"],
            department=r.get("department"),
            location=r.get("location"),
            employment_type=r.get("employment_type"),
            salary_min=r.get("salary_min"),
            salary_max=r.get("salary_max"),
            vacancies=r.get("vacancies", 1),
            closing_date=r.get("closing_date"),
            created_at=r.get("created_at"),
        )
        for r in rows
    ]

    return PortalJobsResponse(
        company=COMPANY_NAME,
        total_openings=len(jobs),
        jobs=jobs,
    )


async def get_job_detail(conn: Connection, job_id: str) -> PortalJobDetail:
    row = await models.get_open_job_by_id(conn, job_id)
    if not row:
        raise NotFoundError("Job not found or no longer accepting applications")

    requirements = row.get("requirements", {})
    if isinstance(requirements, str):
        requirements = json.loads(requirements)

    return PortalJobDetail(
        id=str(row["id"]),
        title=row["title"],
        department=row.get("department"),
        location=row.get("location"),
        employment_type=row.get("employment_type"),
        description=row["description"],
        requirements=requirements,
        salary_min=row.get("salary_min"),
        salary_max=row.get("salary_max"),
        vacancies=row.get("vacancies", 1),
        closing_date=row.get("closing_date"),
        created_at=row.get("created_at"),
    )


async def apply_to_job(
    conn: Connection,
    job_id: str,
    form_data: PortalApplyRequest,
    file_bytes: bytes,
    filename: str,
) -> PortalApplyResponse:
    # 1. Verify job
    job = await models.get_job_title(conn, job_id)
    if not job:
        raise NotFoundError("Job not found or no longer accepting applications")

    # 2. Check duplicate
    existing_candidate = await candidate_models.get_candidate_by_email(conn, form_data.email)
    if existing_candidate:
        is_duplicate = await models.check_duplicate_application(
            conn, job_id, str(existing_candidate["id"])
        )
        if is_duplicate:
            raise ConflictError("You have already applied for this position")

    # 3. Upload to storage
    file_ext = filename.rsplit(".", 1)[-1] if "." in filename else "pdf"
    storage_path = f"portal/{uuid.uuid4()}.{file_ext}"
    upload_file(file_bytes, storage_path)

    # 4. Extract text + AI parse
    resume_text = extract_text(file_bytes, filename)
    parsed = await parse_resume_text(resume_text)

    # 5. Override AI-extracted fields with form data (form = ground truth)
    parsed["full_name"] = form_data.full_name
    parsed["email"] = form_data.email
    parsed["phone"] = form_data.phone

    # 6. Generate embedding
    embedding_text = _build_candidate_embedding_text(parsed)
    embedding = await generate_embedding(embedding_text)

    # 7. Get signed URL
    resume_url = get_file_url(storage_path)

    # 8. Create/update candidate
    candidate_data = {
        "full_name": form_data.full_name,
        "email": form_data.email,
        "phone": form_data.phone,
        "location": parsed.get("location"),
        "summary": parsed.get("summary"),
        "skills": parsed.get("skills", []),
        "experience": parsed.get("experience", []),
        "education": parsed.get("education", []),
        "certifications": parsed.get("certifications", []),
        "total_experience_years": parsed.get("total_experience_years", 0),
        "resume_url": resume_url,
        "resume_file_path": storage_path,
        "parsed_data": parsed,
        "resume_embedding": str(embedding),
    }

    candidate_row = await candidate_models.insert_candidate(conn, candidate_data)

    # 9. Create application
    app_row = await models.create_application(
        conn,
        job_id,
        str(candidate_row["id"]),
        form_data.expected_salary,
        form_data.notice_period,
    )

    return PortalApplyResponse(
        message="Successfully Applied! We will review your application and get back to you soon.",
        application_id=str(app_row["id"]),
        candidate_name=form_data.full_name,
        job_title=job["title"],
    )


async def check_status(conn: Connection, email: str) -> PortalStatusResponse:
    candidate = await candidate_models.get_candidate_by_email(conn, email)
    if not candidate:
        raise NotFoundError("No applications found for this email address")

    rows = await models.get_applications_by_email(conn, str(candidate["id"]))

    applications = [
        PortalStatusItem(
            job_title=r["job_title"],
            department=r.get("department"),
            status=r["status"],
            applied_at=r.get("applied_at"),
            suitability_score=float(r["suitability_score"]) if r.get("suitability_score") else None,
        )
        for r in rows
    ]

    return PortalStatusResponse(
        candidate_name=candidate["full_name"],
        email=email,
        total_applications=len(applications),
        applications=applications,
    )