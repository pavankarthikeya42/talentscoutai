import json
import httpx
from asyncpg import Connection

from app.jobs import models
from app.jobs.schemas import JobCreateRequest, JobUpdateRequest, JobResponse, JobAutofillResponse
from app.common.gemini import generate_embedding
from app.common.exceptions import NotFoundError, ForbiddenError
from app.common.groq_llm import generate_json
from app.config import get_settings


def _build_embedding_text(title: str, description: str, requirements: dict) -> str:
    """Build a combined text for embedding generation."""
    parts = [f"Job Title: {title}", f"Description: {description}"]
    if requirements.get("skills"):
        parts.append(f"Required Skills: {', '.join(requirements['skills'])}")
    if requirements.get("education"):
        parts.append(f"Education: {requirements['education']}")
    if requirements.get("min_experience_years"):
        parts.append(f"Minimum Experience: {requirements['min_experience_years']} years")
    if requirements.get("certifications"):
        parts.append(f"Certifications: {', '.join(requirements['certifications'])}")
    return "\n".join(parts)


def _row_to_response(row: dict) -> JobResponse:
    """Convert a DB row to a JobResponse, handling JSONB parsing."""
    requirements = row.get("requirements", {})
    screening = row.get("screening_criteria", {})

    if isinstance(requirements, str):
        requirements = json.loads(requirements)
    if isinstance(screening, str):
        screening = json.loads(screening)

    return JobResponse(
        id=str(row["id"]),
        recruiter_id=str(row["recruiter_id"]),
        title=row["title"],
        department=row.get("department"),
        location=row.get("location"),
        employment_type=row.get("employment_type"),
        description=row["description"],
        requirements=requirements,
        salary_min=row.get("salary_min"),
        salary_max=row.get("salary_max"),
        status=row["status"],
        screening_criteria=screening,
        applicant_count=row.get("applicant_count", 0),
        vacancies=row.get("vacancies", 1),
        closing_date=row.get("closing_date"),
        emergency=row.get("emergency", False),
        posted_to_linkedin=row.get("posted_to_linkedin", False),
        posted_to_naukri=row.get("posted_to_naukri", False),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


async def _post_to_linkedin(job_data: dict, api_key: str):
    """Make a REST API call to post a job to LinkedIn."""
    print(f"[JOB BOARD] Syndicating to LinkedIn using API key: {api_key[:6]}***...")
    url = "https://api.linkedin.com/v2/simpleJobPostings"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    payload = {
        "title": job_data["title"],
        "description": job_data["description"],
        "location": job_data["location"],
        "employmentStatus": "FULL_TIME" if job_data["employment_type"] == "full-time" else "PART_TIME",
        "externalJobPostingId": "external-id-" + str(job_data.get("id", "temp")),
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=10.0)
        response.raise_for_status()
        print(f"[JOB BOARD] LinkedIn response: {response.status_code}")


async def _post_to_naukri(job_data: dict, api_key: str):
    """Make a REST API call to post a job to Naukri."""
    print(f"[JOB BOARD] Syndicating to Naukri using API key: {api_key[:6]}***...")
    url = "https://openapi.naukri.com/v2/jobs"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "jobTitle": job_data["title"],
        "jobDescription": job_data["description"],
        "locations": [job_data["location"]],
        "employmentType": job_data["employment_type"]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=10.0)
        response.raise_for_status()
        print(f"[JOB BOARD] Naukri response: {response.status_code}")


async def create_job(conn: Connection, request: JobCreateRequest, recruiter_id: str) -> JobResponse:
    # Build text and generate embedding
    req_dict = request.requirements.model_dump()
    embedding_text = _build_embedding_text(request.title, request.description, req_dict)
    embedding = await generate_embedding(embedding_text)

    job_data = {
        "recruiter_id": recruiter_id,
        "title": request.title,
        "department": request.department,
        "location": request.location,
        "employment_type": request.employment_type,
        "description": request.description,
        "requirements": req_dict,
        "salary_min": request.salary_min,
        "salary_max": request.salary_max,
        "status": request.status,
        "screening_criteria": request.screening_criteria.model_dump(),
        "description_embedding": str(embedding),
        "vacancies": request.vacancies,
        "closing_date": request.closing_date,
        "emergency": request.emergency,
        "posted_to_linkedin": request.post_to_linkedin,
        "posted_to_naukri": request.post_to_naukri,
    }

    if request.post_to_linkedin:
        settings = get_settings()
        if settings.linkedin_api_key:
            try:
                await _post_to_linkedin(job_data, settings.linkedin_api_key)
            except Exception as e:
                print(f"[JOB BOARD] Failed to post to LinkedIn: {e}")
        else:
            print(f"[JOB BOARD] Automatic syndication: Posting '{request.title}' to LinkedIn...")
            
    if request.post_to_naukri:
        settings = get_settings()
        if settings.naukri_api_key:
            try:
                await _post_to_naukri(job_data, settings.naukri_api_key)
            except Exception as e:
                print(f"[JOB BOARD] Failed to post to Naukri: {e}")
        else:
            print(f"[JOB BOARD] Automatic syndication: Posting '{request.title}' to Naukri...")

    row = await models.insert_job(conn, job_data)

    # Insert notification for recruiter
    import uuid
    boards = []
    if request.post_to_linkedin:
        boards.append("LinkedIn")
    if request.post_to_naukri:
        boards.append("Naukri")

    if boards:
        try:
            boards_str = " and ".join(boards)
            await conn.execute(
                """
                INSERT INTO notifications (user_id, title, message)
                VALUES ($1, $2, $3)
                """,
                uuid.UUID(recruiter_id),
                "Job Syndicated Successfully",
                f"Your job opening '{request.title}' has been automatically posted to {boards_str}."
            )
            print(f"[NOTIFICATION] Generated syndication alert for recruiter {recruiter_id}")
        except Exception as err:
            print(f"[ERROR] Failed to save syndication notification: {err}")

    row["applicant_count"] = 0
    return _row_to_response(row)


async def get_job(conn: Connection, job_id: str) -> JobResponse:
    row = await models.get_job_by_id(conn, job_id)
    if not row:
        raise NotFoundError("Job not found")
    return _row_to_response(row)


async def list_jobs(
    conn: Connection,
    recruiter_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[JobResponse], int]:
    rows, total = await models.get_jobs(conn, recruiter_id, status, page, page_size)
    jobs = [_row_to_response(r) for r in rows]
    return jobs, total


async def update_job(
    conn: Connection,
    job_id: str,
    request: JobUpdateRequest,
    recruiter_id: str,
) -> JobResponse:
    # Verify ownership
    existing = await models.get_job_by_id(conn, job_id)
    if not existing:
        raise NotFoundError("Job not found")
    if str(existing["recruiter_id"]) != recruiter_id:
        raise ForbiddenError("You can only update your own jobs")

    update_data = request.model_dump(exclude_none=True)

    # Convert nested models to dicts
    if "requirements" in update_data:
        update_data["requirements"] = update_data["requirements"]
    if "screening_criteria" in update_data:
        update_data["screening_criteria"] = update_data["screening_criteria"]

    # Re-generate embedding if description or requirements changed
    if "description" in update_data or "requirements" in update_data:
        title = update_data.get("title", existing["title"])
        description = update_data.get("description", existing["description"])
        requirements = update_data.get("requirements", existing.get("requirements", {}))
        if isinstance(requirements, str):
            requirements = json.loads(requirements)

        embedding_text = _build_embedding_text(title, description, requirements)
        embedding = await generate_embedding(embedding_text)
        update_data["description_embedding"] = str(embedding)

    row = await models.update_job(conn, job_id, update_data)
    if not row:
        raise NotFoundError("Job not found")

    row["applicant_count"] = existing.get("applicant_count", 0)
    return _row_to_response(row)


async def delete_job(conn: Connection, job_id: str, recruiter_id: str) -> bool:
    existing = await models.get_job_by_id(conn, job_id)
    if not existing:
        raise NotFoundError("Job not found")
    if str(existing["recruiter_id"]) != recruiter_id:
        raise ForbiddenError("You can only delete your own jobs")

    return await models.delete_job(conn, job_id)


JOB_AUTOFILL_PROMPT = """
You are an expert HR assistant. Extract structured job posting information from the raw job description, and write a polished, clear, and comprehensive job description.
If the user provided a minimum experience years, use it; otherwise extract it from the description if possible.

Return ONLY valid JSON with this exact structure:
{{
    "title": "extracted job title or logical title based on description",
    "department": "department name, e.g., Engineering, AI Engineering, Human Resources, Design, Sales, Product, Marketing, or Operations",
    "location": "location, e.g., Hyderabad, Bangalore, Remote, Pune, Mumbai, etc. Default to Remote if not specified",
    "employment_type": "employment type: full-time, part-time, contract, internship, or remote",
    "description": "A professionally formatted, comprehensive, and clear description of the job based on the raw input. It should be structured with sections like 'About the Role', 'Key Responsibilities', and 'Key Requirements' using clean line breaks.",
    "requirements": {{
        "skills": ["skill1", "skill2", ...],
        "min_experience_years": 3,
        "education": "minimum education required, e.g., Bachelor's in CS, MBA, or equivalent",
        "certifications": ["cert1", "cert2", ...]
    }},
    "salary_min": 1000000.0 or null,
    "salary_max": 2000000.0 or null,
    "screening_criteria": {{
        "skill_weight": 40,
        "experience_weight": 30,
        "education_weight": 20,
        "certification_weight": 10
    }}
}}

Rules for the "description" field:
- Write a highly clear, detailed, and professionally formatted job description.
- Do not just echo the raw input; expand it into a complete, high-quality, and appealing job advertisement.
- Structure the description using clearly defined sections with ALL-CAPS headings separated by double line breaks (\\n\\n). Specifically, use these exact sections:
  
  ABOUT THE ROLE
  [Write a detailed, clear overview of the role, the team, and how this role contributes to the organization's goals.]
  
  KEY RESPONSIBILITIES
  - [Responsibility 1]
  - [Responsibility 2]
  - [Responsibility 3]
  ... (include a robust list of at least 4-6 key responsibilities)
  
  REQUIRED SKILLS & EXPERIENCE
  - [Skill or requirement 1]
  - [Skill or requirement 2]
  - [Skill or requirement 3]
  ... (include technical skills, soft skills, and years of experience)
  
  WHAT WE OFFER
  - [Benefit 1, e.g., Competitive compensation and benefits]
  - [Benefit 2, e.g., Collaborative and inclusive team culture]
  - [Benefit 3, e.g., Career growth and learning opportunities]

Rules for general JSON:
- The sum of skill_weight, experience_weight, education_weight, and certification_weight in screening_criteria MUST be exactly 100. Adjust weights based on what is emphasized in the description.
- Extract up to 6 key skills.
- Extract any certifications or leave certifications empty if none mentioned.
- Estimate realistic salary_min and salary_max in Indian Rupees (INR) if mentioned, otherwise leave as null.
- Do NOT wrap the JSON output itself in markdown formatting or backticks (e.g. do not wrap the response in ```json ... ```). Return only the raw JSON.

Job Description:
{description}

Provided Experience: {min_experience_years} years
"""


async def autofill_job_details(description: str, min_experience_years: int | None = None) -> JobAutofillResponse:
    prompt = JOB_AUTOFILL_PROMPT.format(
        description=description,
        min_experience_years=min_experience_years if min_experience_years is not None else "Not specified"
    )

    system_instruction = (
        "You are a precise HR parser. Return only valid JSON matching the schema, no markdown, no backticks, no explanation."
    )

    response = await generate_json(prompt, system_instruction)

    try:
        parsed = json.loads(response)
    except json.JSONDecodeError:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        parsed = json.loads(cleaned.strip())

    parsed.setdefault("description", description.strip())
    if not parsed.get("description", "").strip():
        parsed["description"] = description.strip()

    reqs = parsed.setdefault("requirements", {})
    reqs.setdefault("skills", [])
    
    if min_experience_years is not None:
        reqs["min_experience_years"] = min_experience_years
    else:
        try:
            reqs["min_experience_years"] = int(float(reqs.get("min_experience_years", 0)))
        except (ValueError, TypeError):
            reqs["min_experience_years"] = 0
            
    reqs.setdefault("education", "")
    reqs.setdefault("certifications", [])

    criteria = parsed.setdefault("screening_criteria", {})
    s_w = int(criteria.setdefault("skill_weight", 40))
    ex_w = int(criteria.setdefault("experience_weight", 30))
    ed_w = int(criteria.setdefault("education_weight", 20))
    c_w = int(criteria.setdefault("certification_weight", 10))
    
    total = s_w + ex_w + ed_w + c_w
    if total != 100:
        criteria["skill_weight"] = 40
        criteria["experience_weight"] = 30
        criteria["education_weight"] = 20
        criteria["certification_weight"] = 10

    for field in ["salary_min", "salary_max"]:
        if parsed.get(field) is not None:
            try:
                parsed[field] = float(parsed[field])
            except (ValueError, TypeError):
                parsed[field] = None

    return JobAutofillResponse(**parsed)