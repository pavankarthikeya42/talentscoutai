import json
from asyncpg import Connection

from app.interviews import models
from app.interviews.schemas import (
    InterviewCreateRequest,
    InterviewUpdateRequest,
    InterviewFeedbackRequest,
    GenerateQuestionsRequest,
    InterviewResponse,
)
from app.common.groq_llm import generate_json
from app.common.exceptions import NotFoundError, BadRequestError


QUESTION_GENERATION_PROMPT = """
You are an expert interviewer. Generate exactly {num_questions} interview questions for this candidate and role.

## Job
Title: {job_title}
Department: {department}
Description: {job_description}
Requirements: {job_requirements}

## Candidate
Name: {candidate_name}
Summary: {candidate_summary}
Skills: {candidate_skills}
Experience ({experience_years} years): {candidate_experience}
Education: {candidate_education}
Certifications: {candidate_certifications}

## AI Screening Summary
Score: {suitability_score}/100
Summary: {ai_summary}

## Interview Type: {interview_type}
## Difficulty: {difficulty}
## Focus Areas: {focus_areas}

## STRICT INSTRUCTIONS
- Generate EXACTLY {num_questions} questions total
- Split evenly: {half_questions} technical questions + {half_questions} behavioral questions
- Technical questions: focus on their claimed skills ({candidate_skills}), job requirements, and any skill gaps
- Behavioral questions: use STAR-format prompts about real situations, teamwork, problem-solving, conflict resolution
- For HR interviews: cover culture fit, motivation, salary expectations, and career goals
- Tailor every question specifically to this candidate — do NOT generate generic questions

Return ONLY a valid JSON object with a "questions" key containing exactly {num_questions} items:
{{
    "questions": [
        {{
            "question": "the interview question",
            "category": "technical|behavioral|situational|culture_fit|role_specific",
            "difficulty": "easy|medium|hard",
            "what_to_look_for": "what a good answer should include"
        }}
    ]
}}
"""


ROUND_RECOMMENDATION_PROMPT = """
You are a senior technical recruiter. Based on this candidate's profile and job requirements,
recommend exactly 3 interview rounds. Everyone gets all 3 rounds — only the COMPLEXITY and
FOCUS of each round changes based on their experience and skill level.

## Candidate Profile
Name: {candidate_name}
Experience: {experience_years} years
Skills: {candidate_skills}
Education: {candidate_education}
Suitability Score: {suitability_score}/100
AI Summary: {ai_summary}

## Job
Title: {job_title}
Requirements: {job_requirements}

## Skill Gaps (skills required but candidate lacks)
{skill_gaps}

## Experience Level Classification
{experience_level}

## Rules
- ALWAYS return exactly 3 rounds
- Round 1: Technical Screening (adjust depth based on experience)
- Round 2: Technical Deep Dive (focus on skill gaps and hands-on ability)
- Round 3: HR + Managerial (culture fit, expectations, soft skills)
- For freshers (0-2 yrs): focus on fundamentals, learning attitude, potential
- For mid-level (2-5 yrs): focus on practical application, problem solving
- For senior (5+ yrs): focus on system design, leadership, architecture decisions

## Instructions for new fields
For "interview_summary": Write 2-3 sentences covering the candidate's name, their educational
background, their strongest technical skills, and their overall readiness for this role.
Example: "Surya is a BE Computer Science graduate with a strong foundation in Java and Spring Boot.
He has worked on academic projects involving REST APIs and MySQL. He is a fresher with high
motivation to learn and grow."

For "candidate_strengths": List 3-4 specific strengths by COMPARING the candidate's skills and
experience directly against the job requirements. Each item must have an "area" (short label)
and "detail" (one sentence explaining the evidence from their profile).

For "candidate_weaknesses": List 2-3 specific weaknesses or gaps by comparing what the job
requires versus what the candidate lacks. Each item must have an "area" (short label) and
"detail" (one sentence explaining the gap).

For "evaluation_focus": Write one clear sentence telling the recruiter what to focus on and
what to skip. Example: "Skip basic Java syntax checks — focus technical rounds on real-world
Spring Boot usage and system design thinking since candidate claims project experience."

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{{
    "experience_level": "fresher|mid-level|senior",
    "interview_summary": "2-3 sentence plain-English summary of who this candidate is, their education, top skills, and readiness",
    "candidate_strengths": [
        {{
            "area": "Short label e.g. Java & Spring Boot",
            "detail": "One sentence explaining this strength based on their resume vs job requirements"
        }}
    ],
    "candidate_weaknesses": [
        {{
            "area": "Short label e.g. System Design",
            "detail": "One sentence explaining this gap based on what the job needs vs what candidate has"
        }}
    ],
    "evaluation_focus": "One sentence telling recruiter where to focus and what to skip during evaluation",
    "strengths_to_probe": ["strong areas worth exploring deeper in interview"],
    "red_flags": ["any concerns to watch for"],
    "overall_recommendation": "brief overall hiring recommendation",
    "rounds": [
        {{
            "round_number": 1,
            "round_name": "Technical Screening",
            "interview_type": "technical",
            "complexity": "basic|intermediate|advanced",
            "duration_minutes": 45,
            "focus_areas": ["area1", "area2"],
            "key_topics": ["topic1", "topic2", "topic3"],
            "what_to_assess": "what this round should evaluate",
            "tips_for_interviewer": "specific guidance based on this candidate"
        }},
        {{
            "round_number": 2,
            "round_name": "Technical Deep Dive",
            "interview_type": "technical",
            "complexity": "basic|intermediate|advanced",
            "duration_minutes": 60,
            "focus_areas": ["area1", "area2"],
            "key_topics": ["topic1", "topic2", "topic3"],
            "what_to_assess": "what this round should evaluate",
            "tips_for_interviewer": "specific guidance based on this candidate"
        }},
        {{
            "round_number": 3,
            "round_name": "HR & Managerial",
            "interview_type": "hr",
            "complexity": "standard",
            "duration_minutes": 30,
            "focus_areas": ["culture fit", "expectations", "soft skills"],
            "key_topics": ["topic1", "topic2", "topic3"],
            "what_to_assess": "what this round should evaluate",
            "tips_for_interviewer": "specific guidance based on this candidate"
        }}
    ]
}}
"""


def _get_experience_level(years: float) -> str:
    if years <= 2:
        return "Fresher (0-2 years) — Focus on fundamentals, learning curve, academic projects"
    elif years <= 5:
        return "Mid-level (2-5 years) — Focus on practical experience, problem-solving, ownership"
    else:
        return "Senior (5+ years) — Focus on system design, leadership, architectural thinking"


def _get_skill_gaps(candidate_skills: list, job_requirements: dict) -> list:
    required_skills = []
    if isinstance(job_requirements, dict):
        required_skills = job_requirements.get("required_skills", [])
        if isinstance(required_skills, str):
            required_skills = [s.strip() for s in required_skills.split(",")]

    candidate_skills_lower = [s.lower() for s in candidate_skills]
    gaps = [
        skill for skill in required_skills
        if skill.lower() not in candidate_skills_lower
    ]
    return gaps


def _row_to_response(row: dict) -> InterviewResponse:
    questions = row.get("ai_suggested_questions", [])
    if isinstance(questions, str):
        questions = json.loads(questions)

    return InterviewResponse(
        id=str(row["id"]),
        application_id=str(row["application_id"]),
        interviewer_id=str(row["interviewer_id"]) if row.get("interviewer_id") else None,
        round_number=row["round_number"],
        interview_type=row["interview_type"],
        scheduled_at=row.get("scheduled_at"),
        duration_minutes=row["duration_minutes"],
        status=row["status"],
        ai_suggested_questions=questions,
        feedback=row.get("feedback"),
        rating=row.get("rating"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        candidate_name=row.get("candidate_name"),
        candidate_email=row.get("candidate_email"),
        job_title=row.get("job_title"),
        interviewer_name=row.get("interviewer_name"),
    )


async def recommend_interview_rounds(conn: Connection, application_id: str) -> dict:
    context = await models.get_application_context(conn, application_id)
    if not context:
        raise NotFoundError("Application not found")

    skills = context.get("candidate_skills", [])
    if isinstance(skills, str):
        skills = json.loads(skills)

    experience = context.get("candidate_experience", [])
    if isinstance(experience, str):
        experience = json.loads(experience)

    education = context.get("candidate_education", [])
    if isinstance(education, str):
        education = json.loads(education)

    requirements = context.get("job_requirements", {})
    if isinstance(requirements, str):
        requirements = json.loads(requirements)

    experience_years = float(context.get("total_experience_years", 0) or 0)
    experience_level = _get_experience_level(experience_years)
    skill_gaps = _get_skill_gaps(skills, requirements)

    prompt = ROUND_RECOMMENDATION_PROMPT.format(
        candidate_name=context.get("candidate_name", ""),
        experience_years=experience_years,
        candidate_skills=", ".join(skills) if skills else "N/A",
        candidate_education=json.dumps(education),
        suitability_score=context.get("suitability_score", 0),
        ai_summary=context.get("ai_summary", "N/A"),
        job_title=context.get("job_title", ""),
        job_requirements=json.dumps(requirements),
        skill_gaps=", ".join(skill_gaps) if skill_gaps else "None — candidate meets all requirements",
        experience_level=experience_level,
    )

    system_instruction = (
        "You are a senior technical recruiter. "
        "Return only valid JSON, no markdown, no backticks, no explanation."
    )

    response = await generate_json(prompt, system_instruction)

    try:
        result = json.loads(response)
    except json.JSONDecodeError:
        cleaned = response.strip().strip("`").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        result = json.loads(cleaned)

    result["candidate_name"] = context.get("candidate_name", "")
    result["job_title"] = context.get("job_title", "")
    result["suitability_score"] = context.get("suitability_score", 0)
    result["total_experience_years"] = experience_years
    result["skill_gaps"] = skill_gaps

    result.setdefault("interview_summary", "")
    result.setdefault("candidate_strengths", [])
    result.setdefault("candidate_weaknesses", [])
    result.setdefault("evaluation_focus", "")
    result.setdefault("strengths_to_probe", [])
    result.setdefault("red_flags", [])
    result.setdefault("overall_recommendation", "")

    return result


async def generate_questions(
    conn: Connection,
    application_id: str,
    interview_type: str,
    request: GenerateQuestionsRequest,
) -> list[dict]:
    context = await models.get_application_context(conn, application_id)
    if not context:
        raise NotFoundError("Application not found")

    skills = context.get("candidate_skills", [])
    if isinstance(skills, str):
        skills = json.loads(skills)

    experience = context.get("candidate_experience", [])
    if isinstance(experience, str):
        experience = json.loads(experience)

    education = context.get("candidate_education", [])
    if isinstance(education, str):
        education = json.loads(education)

    certifications = context.get("candidate_certifications", [])
    if isinstance(certifications, str):
        certifications = json.loads(certifications)

    requirements = context.get("job_requirements", {})
    if isinstance(requirements, str):
        requirements = json.loads(requirements)

    num_questions = request.num_questions
    half = num_questions // 2

    prompt = QUESTION_GENERATION_PROMPT.format(
        job_title=context.get("job_title", ""),
        department=context.get("department", "N/A"),
        job_description=context.get("job_description", ""),
        job_requirements=json.dumps(requirements),
        candidate_name=context.get("candidate_name", ""),
        candidate_summary=context.get("candidate_summary", "N/A"),
        candidate_skills=", ".join(skills) if skills else "N/A",
        experience_years=context.get("total_experience_years", 0),
        candidate_experience=json.dumps(experience[:5]),
        candidate_education=json.dumps(education),
        candidate_certifications=", ".join(certifications) if certifications else "N/A",
        suitability_score=context.get("suitability_score", 0),
        ai_summary=context.get("ai_summary", "N/A"),
        interview_type=interview_type,
        difficulty=request.difficulty,
        focus_areas=", ".join(request.focus_areas) if request.focus_areas else "general",
        num_questions=num_questions,
        half_questions=half,
    )

    system_instruction = (
        "You are an expert interviewer. "
        "Return only a valid JSON array, no markdown, no backticks, no explanation."
    )
    response = await generate_json(prompt, system_instruction)

    try:
        parsed = json.loads(response)
    except json.JSONDecodeError:
        cleaned = response.strip().strip("`").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        parsed = json.loads(cleaned)

    # Unwrap from object if needed — Groq json_object mode returns {} not []
    if isinstance(parsed, dict):
        questions = parsed.get("questions", list(parsed.values())[0] if parsed else [])
    else:
        questions = parsed

    if not isinstance(questions, list):
        questions = [questions]

    return questions


async def create_interview(
    conn: Connection, request: InterviewCreateRequest, generate_ai_questions: bool = True
) -> InterviewResponse:
    context = await models.get_application_context(conn, request.application_id)
    if not context:
        raise NotFoundError("Application not found")

    ai_questions = []
    if generate_ai_questions:
        try:
            ai_questions = await generate_questions(
                conn,
                request.application_id,
                request.interview_type,
                GenerateQuestionsRequest(num_questions=10),
            )
        except Exception:
            ai_questions = []

    interview_data = {
        "application_id": request.application_id,
        "interviewer_id": request.interviewer_id,
        "round_number": request.round_number,
        "interview_type": request.interview_type,
        "scheduled_at": request.scheduled_at,
        "duration_minutes": request.duration_minutes,
        "status": "scheduled",
        "ai_suggested_questions": ai_questions,
    }

    row = await models.insert_interview(conn, interview_data)

    await conn.execute(
        "UPDATE applications SET status = 'interview', automated_email_sent = FALSE WHERE id = $1",
        request.application_id,
    )

    # Try sending automated email with the interview details
    from app.screening.service import send_automated_email
    try:
        await send_automated_email(conn, request.application_id)
    except Exception as e:
        print(f"[WARNING] Automatic email send failed on interview schedule: {e}")

    if request.interviewer_id:
        await conn.execute(
            """
            INSERT INTO notifications (user_id, title, message)
            VALUES ($1, $2, $3)
            """,
            request.interviewer_id,
            "New Interview Scheduled",
            "An interview has been scheduled and assigned to you.",
        )

    full_row = await models.get_interview_by_id(conn, str(row["id"]))
    return _row_to_response(full_row)


async def get_interview(conn: Connection, interview_id: str) -> InterviewResponse:
    row = await models.get_interview_by_id(conn, interview_id)
    if not row:
        raise NotFoundError("Interview not found")
    return _row_to_response(row)


async def list_interviews(
    conn: Connection,
    application_id: str | None = None,
    interviewer_id: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    recruiter_id: str | None = None,
) -> tuple[list[InterviewResponse], int]:
    rows, total = await models.get_interviews(
        conn, application_id, interviewer_id, status, page, page_size, recruiter_id
    )
    return [_row_to_response(r) for r in rows], total


async def update_interview(
    conn: Connection, interview_id: str, request: InterviewUpdateRequest
) -> InterviewResponse:
    existing = await models.get_interview_by_id(conn, interview_id)
    if not existing:
        raise NotFoundError("Interview not found")

    update_data = request.model_dump(exclude_none=True)
    await models.update_interview(conn, interview_id, update_data)

    full_row = await models.get_interview_by_id(conn, interview_id)
    return _row_to_response(full_row)


async def submit_feedback(
    conn: Connection, interview_id: str, request: InterviewFeedbackRequest
) -> InterviewResponse:
    existing = await models.get_interview_by_id(conn, interview_id)
    if not existing:
        raise NotFoundError("Interview not found")

    if request.rating < 1 or request.rating > 5:
        raise BadRequestError("Rating must be between 1 and 5")

    update_data = {
        "feedback": request.feedback,
        "rating": request.rating,
        "status": "completed",
    }
    await models.update_interview(conn, interview_id, update_data)

    full_row = await models.get_interview_by_id(conn, interview_id)
    return _row_to_response(full_row)


async def regenerate_questions(
    conn: Connection,
    interview_id: str,
    request: GenerateQuestionsRequest,
) -> InterviewResponse:
    existing = await models.get_interview_by_id(conn, interview_id)
    if not existing:
        raise NotFoundError("Interview not found")

    regen_request = GenerateQuestionsRequest(
        num_questions=10,
        difficulty=request.difficulty,
        focus_areas=request.focus_areas,
    )

    questions = await generate_questions(
        conn,
        str(existing["application_id"]),
        existing["interview_type"],
        regen_request,
    )

    await models.update_interview(conn, interview_id, {"ai_suggested_questions": questions})

    full_row = await models.get_interview_by_id(conn, interview_id)
    return _row_to_response(full_row)


async def delete_interview(conn: Connection, interview_id: str) -> bool:
    existing = await models.get_interview_by_id(conn, interview_id)
    if not existing:
        raise NotFoundError("Interview not found")
        
    result = await models.delete_interview(conn, interview_id)
    
    # If the interview had an interviewer assigned, send them a cancellation notification
    if result and existing.get("interviewer_id"):
        try:
            candidate_name = existing.get("candidate_name", "Candidate")
            job_title = existing.get("job_title", "Position")
            await conn.execute(
                """
                INSERT INTO notifications (user_id, title, message)
                VALUES ($1, $2, $3)
                """,
                existing["interviewer_id"],
                "Interview Cancelled",
                f"The scheduled interview with candidate {candidate_name} for the position '{job_title}' has been cancelled."
            )
            print(f"[NOTIFICATION] Generated cancellation alert for interviewer {existing['interviewer_id']}")
        except Exception as err:
            print(f"[ERROR] Failed to save cancellation notification: {err}")
            
    return result