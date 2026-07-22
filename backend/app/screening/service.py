import json
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from asyncpg import Connection

from app.screening import models
from app.screening.schemas import ScreeningResult, ScoreBreakdown, RankingResponse
from app.common.groq_llm import generate_json
from app.common.exceptions import NotFoundError, BadRequestError

SHORTLIST_THRESHOLD = 75.0
REJECT_THRESHOLD = 60.0


AI_SCORING_PROMPT = """
You are an expert recruiter AI. Score this candidate against the job requirements.

## Job Details
Title: {job_title}
Description: {job_description}
Required Skills: {required_skills}
Minimum Experience: {min_experience} years
Education Required: {education_required}
Certifications Required: {certifications_required}

## Screening Weights
- Skill Weight: {skill_weight}%
- Experience Weight: {experience_weight}%
- Education Weight: {education_weight}%
- Certification Weight: {certification_weight}%

## Candidate Profile
Name: {candidate_name}
Summary: {candidate_summary}
Skills: {candidate_skills}
Total Experience: {candidate_experience_years} years
Experience Details: {candidate_experience}
Education: {candidate_education}
Certifications: {candidate_certifications}

## Semantic Similarity Score (pre-computed): {semantic_score}/100

## Instructions
Score the candidate on each dimension (0-100), then compute a weighted total.
Apply the semantic similarity as a bonus factor (up to 10% boost).

Return ONLY valid JSON:
{{
    "skill_score": <0-100 based on skill match>,
    "experience_score": <0-100 based on experience match>,
    "education_score": <0-100 based on education match>,
    "certification_score": <0-100 based on certification match>,
    "reasoning": "<2-3 sentence explanation of overall fit>",
    "ai_summary": "<1 paragraph summary of the candidate's suitability>"
}}
"""


async def _score_candidate(
    job: dict, candidate: dict, semantic_score: float
) -> tuple[float, dict, str]:
    """Use Gemini to score a candidate against a job."""
    requirements = job.get("requirements", {})
    if isinstance(requirements, str):
        requirements = json.loads(requirements)

    screening = job.get("screening_criteria", {})
    if isinstance(screening, str):
        screening = json.loads(screening)

    skills = candidate.get("skills", [])
    if isinstance(skills, str):
        skills = json.loads(skills)

    experience = candidate.get("experience", [])
    if isinstance(experience, str):
        experience = json.loads(experience)

    education = candidate.get("education", [])
    if isinstance(education, str):
        education = json.loads(education)

    certifications = candidate.get("certifications", [])
    if isinstance(certifications, str):
        certifications = json.loads(certifications)

    prompt = AI_SCORING_PROMPT.format(
        job_title=job["title"],
        job_description=job["description"],
        required_skills=", ".join(requirements.get("skills", [])),
        min_experience=requirements.get("min_experience_years", 0),
        education_required=requirements.get("education", "Not specified"),
        certifications_required=", ".join(requirements.get("certifications", [])),
        skill_weight=screening.get("skill_weight", 40),
        experience_weight=screening.get("experience_weight", 30),
        education_weight=screening.get("education_weight", 20),
        certification_weight=screening.get("certification_weight", 10),
        candidate_name=candidate["full_name"],
        candidate_summary=candidate.get("summary", "N/A"),
        candidate_skills=", ".join(skills),
        candidate_experience_years=candidate.get("total_experience_years", 0),
        candidate_experience=json.dumps(experience[:5]),  # limit for token size
        candidate_education=json.dumps(education),
        candidate_certifications=", ".join(certifications),
        semantic_score=round(semantic_score * 100, 1),
    )

    system_instruction = "You are a precise recruiter scoring AI. Return only valid JSON."
    response = await generate_json(prompt, system_instruction)

    try:
        scores = json.loads(response)
    except json.JSONDecodeError:
        cleaned = response.strip().strip("`").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        scores = json.loads(cleaned)

    # Calculate weighted score
    sw = screening.get("skill_weight", 40) / 100
    ew = screening.get("experience_weight", 30) / 100
    edw = screening.get("education_weight", 20) / 100
    cw = screening.get("certification_weight", 10) / 100

    weighted_score = (
        scores.get("skill_score", 0) * sw
        + scores.get("experience_score", 0) * ew
        + scores.get("education_score", 0) * edw
        + scores.get("certification_score", 0) * cw
    )

    # Add semantic bonus (up to 10 points)
    semantic_bonus = semantic_score * 10
    final_score = min(96.0, weighted_score + semantic_bonus)

    breakdown = {
        "skill_score": scores.get("skill_score", 0),
        "experience_score": scores.get("experience_score", 0),
        "education_score": scores.get("education_score", 0),
        "certification_score": scores.get("certification_score", 0),
        "semantic_score": round(semantic_score * 100, 1),
        "reasoning": scores.get("reasoning", ""),
    }

    ai_summary = scores.get("ai_summary", scores.get("reasoning", ""))

    return round(final_score, 2), breakdown, ai_summary


async def screen_candidates_for_job(
    conn: Connection, job_id: str, top_k: int = 20
) -> RankingResponse:
    """
    Full screening pipeline:
    1. Fetch job with embedding
    2. Vector search for top-k similar candidates
    3. AI-score each candidate
    4. Save applications with scores
    5. Return ranked results
    """
    # 1. Get job
    job = await models.get_job_with_embedding(conn, job_id)
    if not job:
        raise NotFoundError("Job not found")

    if not job.get("description_embedding"):
        raise BadRequestError("Job has no embedding. Update the job to generate one.")

    # 2. Vector search — only candidates who applied to this job
    candidates = await models.find_similar_candidates(
        conn, job["description_embedding"], top_k, job_id=job_id
    )

    if not candidates:
        return RankingResponse(
            job_id=job_id,
            job_title=job["title"],
            total_screened=0,
            rankings=[],
        )

    # 3 & 4. Score each candidate and save
    rankings = []
    for candidate in candidates:
        semantic_score = float(candidate.get("similarity_score", 0))

        try:
            final_score, breakdown, ai_summary = await _score_candidate(
                job, candidate, semantic_score
            )
        except Exception as e:
            # If AI scoring fails, use semantic score only
            print(f"[ERROR] AI scoring failed: {str(e)}")
            final_score = min(96.0, round(semantic_score * 100, 2))
            breakdown = {
                "skill_score": min(96.0, round(semantic_score * 100, 1)),
                "experience_score": min(96.0, round(semantic_score * 100, 1)),
                "education_score": min(96.0, round(semantic_score * 100, 1)),
                "certification_score": min(96.0, round(semantic_score * 100, 1)),
                "semantic_score": min(96.0, round(semantic_score * 100, 1)),
                "reasoning": "Using semantic score only.",
            }
            ai_summary = "AI scoring unavailable."

        # Update scores on existing application (preserves original source)
        if final_score > SHORTLIST_THRESHOLD:
            determined_status = "shortlisted"
        elif final_score >= REJECT_THRESHOLD:
            determined_status = "screened"
        else:
            determined_status = "rejected"

        app_data = {
            "job_id": job_id,
            "candidate_id": str(candidate["id"]),
            "status": determined_status,
            "suitability_score": final_score,
            "score_breakdown": breakdown,
            "ai_summary": ai_summary,
        }
        app_row = await models.update_application_scores(conn, app_data)
        if not app_row:
            app_row = await models.upsert_application(conn, app_data)

        rankings.append(ScreeningResult(
            application_id=str(app_row["id"]),
            candidate_id=str(candidate["id"]),
            candidate_name=candidate["full_name"],
            candidate_email=candidate["email"],
            suitability_score=final_score,
            score_breakdown=ScoreBreakdown(**breakdown),
            ai_summary=ai_summary,
            status=determined_status,
        ))

    # 5. Sort by score descending
    rankings.sort(key=lambda r: r.suitability_score, reverse=True)

    return RankingResponse(
        job_id=job_id,
        job_title=job["title"],
        total_screened=len(rankings),
        rankings=rankings,
    )


async def screen_single_candidate(
    conn: Connection, job_id: str, candidate_id: str
) -> ScreeningResult:
    """Screen a single candidate against a job."""
    job = await models.get_job_with_embedding(conn, job_id)
    if not job:
        raise NotFoundError("Job not found")

    from app.candidates.models import get_candidate_by_id
    candidate = await get_candidate_by_id(conn, candidate_id)
    if not candidate:
        raise NotFoundError("Candidate not found")

    # Calculate semantic similarity
    if job.get("description_embedding") and candidate.get("resume_embedding"):
        sim_row = await conn.fetchrow(
            """
            SELECT 1 - (
                (SELECT description_embedding FROM jobs WHERE id = $1)
                <=>
                (SELECT resume_embedding FROM candidates WHERE id = $2)
            ) AS similarity
            """,
            job_id,
            candidate_id,
        )
        semantic_score = float(sim_row["similarity"]) if sim_row else 0
    else:
        semantic_score = 0

    try:
        final_score, breakdown, ai_summary = await _score_candidate(
            job, candidate, semantic_score
        )
    except Exception as e:
        # If AI scoring fails, use semantic score only
        print(f"[ERROR] AI scoring failed: {str(e)}")
        final_score = min(96.0, round(semantic_score * 100, 2))
        breakdown = {
            "skill_score": min(96.0, round(semantic_score * 100, 1)),
            "experience_score": min(96.0, round(semantic_score * 100, 1)),
            "education_score": min(96.0, round(semantic_score * 100, 1)),
            "certification_score": min(96.0, round(semantic_score * 100, 1)),
            "semantic_score": min(96.0, round(semantic_score * 100, 1)),
            "reasoning": "Using semantic score only.",
        }
        ai_summary = "AI scoring unavailable."

    if final_score > SHORTLIST_THRESHOLD:
        determined_status = "shortlisted"
    elif final_score >= REJECT_THRESHOLD:
        determined_status = "screened"
    else:
        determined_status = "rejected"

    app_data = {
        "job_id": job_id,
        "candidate_id": candidate_id,
        "status": determined_status,
        "source": "manual",
        "suitability_score": final_score,
        "score_breakdown": breakdown,
        "ai_summary": ai_summary,
    }
    app_row = await models.upsert_application(conn, app_data)

    return ScreeningResult(
        application_id=str(app_row["id"]),
        candidate_id=candidate_id,
        candidate_name=candidate["full_name"],
        candidate_email=candidate["email"],
        suitability_score=final_score,
        score_breakdown=ScoreBreakdown(**breakdown),
        ai_summary=ai_summary,
        status=determined_status,
    )


EMAIL_PROMPT = """
You are an expert HR Coordinator. Write a professional, polite, and encouraging email invitation for an interview to a shortlisted candidate.

Job Title: {job_title}
Candidate Name: {candidate_name}
Candidate Email: {candidate_email}
Suitability Score: {suitability_score}/100

Instructions:
1. Subject line should be professional and clear, e.g. "TalentScout AI - Interview Invitation: Senior React Developer".
2. The email body should congratulate them on being shortlisted, mention that their profile matched our requirements closely (suitability score: {suitability_score}%), and invite them to schedule a chat.
3. Keep formatting clean (multiline) and friendly.

Return ONLY valid JSON as:
{{
    "subject": "the email subject",
    "body": "the email body text"
}}
"""

def _send_email_smtp_sync(host: str, port: int, username: str, password: str, sender: str, recipient: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = recipient
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    if port == 465:
        # SSL connection
        with smtplib.SMTP_SSL(host, port) as server:
            if username and password:
                server.login(username, password)
            server.send_message(msg)
    else:
        # TLS/STARTTLS connection
        with smtplib.SMTP(host, port) as server:
            if username and password:
                try:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                except Exception as e:
                    print(f"[WARNING] STARTTLS failed, proceeding without TLS: {e}")
                server.login(username, password)
            server.send_message(msg)

async def draft_automated_email(conn: Connection, application_id: str) -> dict:
    """Draft an automated email using Gemini based on current application status."""
    app_row = await models.get_application_by_id(conn, application_id)
    if not app_row:
        raise NotFoundError("Application not found")

    recipient_email = app_row.get("candidate_email")
    if not recipient_email:
        raise BadRequestError(
            f"Cannot send email: Candidate email is missing for application {application_id}."
        )

    status = app_row.get("status")
    allowed_statuses = ["shortlisted", "interview", "offered", "hired", "rejected"]
    if status not in allowed_statuses:
        raise BadRequestError(
            f"Automated emails can only be sent for statuses: {', '.join(allowed_statuses)}. "
            f"Current status is: {status}"
        )

    # Fetch scheduled interview details if application is in 'interview' status
    interview_details = ""
    if status == "interview":
        iv_row = await conn.fetchrow(
            """
            SELECT scheduled_at, duration_minutes, interview_type 
            FROM interviews 
            WHERE application_id = $1 
            ORDER BY scheduled_at DESC 
            LIMIT 1
            """,
            application_id
        )
        if iv_row:
            sched_time = iv_row["scheduled_at"]
            if hasattr(sched_time, "strftime"):
                if sched_time.tzinfo:
                    sched_time = sched_time.astimezone()
                sched_str = sched_time.strftime("%B %d, %Y at %I:%M %p")
            else:
                sched_str = str(sched_time)
            interview_details = (
                f"\nInterview Details:\n"
                f"- Type: {iv_row['interview_type']}\n"
                f"- Date/Time: {sched_str}\n"
                f"- Duration: {iv_row['duration_minutes']} minutes"
            )
        else:
            interview_details = "\nInterview details: An interview will be scheduled shortly."

    # Build prompt content based on status
    if status == "shortlisted":
        prompt_content = f"""
Write a professional, encouraging email to a candidate who has been shortlisted.
Congratulate them, mention their profile matched our requirements closely (suitability score: {round(float(app_row.get("suitability_score", 0)), 1)}%), and tell them we will reach out soon to schedule an interview.
"""
    elif status == "interview":
        prompt_content = f"""
Write a professional email confirming the scheduled interview details for the candidate.
Inform them about their upcoming interview.{interview_details}
Include details on what to expect, and ask them to reply to confirm.
"""
    elif status == "offered":
        prompt_content = f"""
Write a congratulatory job offer email to the candidate.
Inform them they have been selected for the position of {app_row.get("job_title", "Position")}.
Express excitement about having them join the team, and let them know the official offer letter will follow.
"""
    elif status == "hired":
        prompt_content = f"""
Write a congratulatory onboarding email to the candidate.
Inform them that they have been officially hired for the position of {app_row.get("job_title", "Position")}!
Express excitement about them joining the team, and let them know that the HR team will be in touch shortly with onboarding details.
"""
    elif status == "rejected":
        prompt_content = f"""
Write a polite and professional job application rejection email.
Thank them for their interest in the {app_row.get("job_title", "Position")} role and for going through our evaluation process.
Politely let them know that we have chosen to move forward with other candidates whose qualifications closely align with our current needs.
Wish them the best in their job search.
"""
    else:
        prompt_content = f"Write a professional update email regarding their application for {app_row.get('job_title', 'Position')}."

    prompt = f"""
You are an expert HR Coordinator at TalentScout AI.
Write a professional, polite email based on the following details:

Job Title: {app_row.get("job_title", "Position")}
Candidate Name: {app_row.get("candidate_name", "Candidate")}
Candidate Email: {app_row.get("candidate_email", "")}
Application Status: {status}

{prompt_content}

Instructions:
1. Subject line should be professional, clear, and include "TalentScout AI".
2. The email body should be professional, well-formatted, and encouraging/polite.
3. Return ONLY valid JSON in this exact structure:
{{
    "subject": "the email subject",
    "body": "the email body text"
}}
"""

    system_instruction = "You are a professional HR assistant. Return only a valid JSON object."
    response = await generate_json(prompt, system_instruction)

    try:
        email_data = json.loads(response)
    except Exception:
        cleaned = response.strip().strip("`").strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        email_data = json.loads(cleaned)

    return {
        "subject": email_data.get("subject", ""),
        "body": email_data.get("body", "")
    }

async def send_custom_email(conn: Connection, application_id: str, subject: str, body: str) -> dict:
    """Send an email with custom subject and body via SMTP."""
    app_row = await models.get_application_by_id(conn, application_id)
    if not app_row:
        raise NotFoundError("Application not found")

    recipient_email = app_row.get("candidate_email")
    if not recipient_email:
        raise BadRequestError(
            f"Cannot send email: Candidate email is missing for application {application_id}."
        )

    # Dispatch SMTP email if host is configured
    from app.config import get_settings
    settings = get_settings()
    if settings.smtp_host and settings.smtp_host.strip():
        try:
            await asyncio.to_thread(
                _send_email_smtp_sync,
                settings.smtp_host,
                settings.smtp_port,
                settings.smtp_username,
                settings.smtp_password,
                settings.smtp_sender,
                recipient_email,
                subject,
                body
            )
            print(f"[OK] SMTP email sent successfully to {recipient_email}")
        except Exception as e:
            print(f"[WARNING] SMTP send failed: {e}. Falling back to mock send.")
    else:
        print(f"[INFO] SMTP_HOST is not configured. Mock sending email to {recipient_email}")

    # Mark as sent in DB
    await conn.execute(
        "UPDATE applications SET automated_email_sent = TRUE WHERE id = $1",
        application_id
    )

    return {
        "application_id": application_id,
        "recipient_email": recipient_email,
        "subject": subject,
        "body": body,
        "status": "sent"
    }

async def send_automated_email(conn: Connection, application_id: str) -> dict:
    """Legacy helper: drafts and sends an email automatically."""
    draft = await draft_automated_email(conn, application_id)
    return await send_custom_email(conn, application_id, draft["subject"], draft["body"])