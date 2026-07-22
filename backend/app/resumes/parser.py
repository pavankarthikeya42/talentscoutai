import json
from datetime import date
from app.common.groq_llm import generate_json


def _build_parse_prompt() -> str:
    today = date.today().strftime("%B %Y")
    return f"""
You are an expert resume parser. Extract structured information from the following resume text.

Return ONLY valid JSON with this exact structure:
{{
    "full_name": "candidate's full name",
    "email": "email address",
    "phone": "phone number or null",
    "location": "city, state/country or null",
    "summary": "brief professional summary in 2-3 sentences",
    "skills": ["skill1", "skill2", ...],
    "experience": [
        {{
            "title": "job title",
            "company": "company name",
            "start_date": "MM/YYYY or YYYY",
            "end_date": "MM/YYYY or YYYY or Present",
            "description": "brief description of role and achievements"
        }}
    ],
    "education": [
        {{
            "degree": "degree name",
            "institution": "university/college name",
            "year": 2020
        }}
    ],
    "certifications": ["cert1", "cert2", ...],
    "total_experience_years": 5.0
}}

Rules:
- Extract ALL skills mentioned anywhere in the resume
- Calculate total_experience_years by summing up all work experience durations
- TODAY'S DATE IS {today}. If an end_date says "Present", "Current", "Till Date", or is missing, treat it as {today} when calculating duration
- Round total_experience_years to 1 decimal place (e.g. 2.5, not 2.45 or 2.456)
- Do NOT double-count overlapping periods — if two jobs overlap in time, count the overlapping months only once
- If information is not found, use empty string, null, or empty array as appropriate
- For total_experience_years, provide a numeric value (float)
- Keep the summary concise but informative

Resume Text:
"""


async def parse_resume_text(resume_text: str) -> dict:
    """Parse resume text using Gemini and return structured data."""
    prompt = _build_parse_prompt() + resume_text

    system_instruction = (
        "You are a precise resume parser. Return only valid JSON, no markdown, no backticks, no explanation."
    )

    response = await generate_json(prompt, system_instruction)

    try:
        parsed = json.loads(response)
    except json.JSONDecodeError:
        # Try to clean up the response
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        parsed = json.loads(cleaned.strip())

    # Validate and set defaults
    parsed.setdefault("full_name", "Unknown")
    parsed.setdefault("email", "")
    parsed.setdefault("phone", None)
    parsed.setdefault("location", None)
    parsed.setdefault("summary", None)
    parsed.setdefault("skills", [])
    parsed.setdefault("experience", [])
    parsed.setdefault("education", [])
    parsed.setdefault("certifications", [])
    parsed.setdefault("total_experience_years", 0)

    # Ensure total_experience_years is numeric and rounded to 1 decimal
    try:
        parsed["total_experience_years"] = round(float(parsed["total_experience_years"]), 1)
    except (ValueError, TypeError):
        parsed["total_experience_years"] = 0.0

    return parsed