"""
Embedding utilities specific to RAG operations.
Core embedding generation lives in app/common/gemini.py.
This module handles RAG-specific text preparation.
"""

import json
import re

from app.common.groq_llm import generate_json as _generate_json


def build_candidate_context(candidates: list[dict]) -> str:
    """
    Build a structured text context from retrieved candidates
    for the LLM to reason over.
    """
    if not candidates:
        return "No matching candidates found in the database."

    parts = []
    for i, c in enumerate(candidates, 1):
        skills = c.get("skills", [])
        if isinstance(skills, str):
            skills = json.loads(skills)

        experience = c.get("experience", [])
        if isinstance(experience, str):
            experience = json.loads(experience)

        education = c.get("education", [])
        if isinstance(education, str):
            education = json.loads(education)

        certifications = c.get("certifications", [])
        if isinstance(certifications, str):
            certifications = json.loads(certifications)

        exp_summary = []
        for exp in experience[:3]:
            exp_summary.append(
                f"  - {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')} "
                f"({exp.get('start_date', '?')} - {exp.get('end_date', '?')})"
            )

        edu_summary = []
        for edu in education:
            edu_summary.append(
                f"  - {edu.get('degree', 'N/A')} from {edu.get('institution', 'N/A')} "
                f"({edu.get('year', 'N/A')})"
            )

        section = f"""
--- Candidate {i} (Similarity: {c.get('similarity_score', 0):.2f}) ---
Name: {c.get('full_name', 'N/A')}
Email: {c.get('email', 'N/A')}
Location: {c.get('location', 'N/A')}
Total Experience: {c.get('total_experience_years', 0)} years
Summary: {c.get('summary', 'N/A')}
Skills: {', '.join(skills) if skills else 'N/A'}
Experience:
{chr(10).join(exp_summary) if exp_summary else '  None listed'}
Education:
{chr(10).join(edu_summary) if edu_summary else '  None listed'}
Certifications: {', '.join(certifications) if certifications else 'None'}
"""
        parts.append(section.strip())

    return "\n\n".join(parts)


_INTENT_PROMPT = """Extract structured search filters from this recruiter query.

Query: "{query}"

Return JSON with these fields only:
{{
  "min_experience": number or null (minimum years of experience requested),
  "skills": ["skill1", "skill2"] (specific technologies, languages, tools, or domain skills mentioned — empty array if none),
  "location": "city or region" or null (location filter if mentioned)
}}

Examples:
- "Find Python developers with 3+ years" → {{"min_experience": 3, "skills": ["Python"], "location": null}}
- "Java and React candidates in Hyderabad" → {{"min_experience": null, "skills": ["Java", "React"], "location": "Hyderabad"}}
- "Who has AWS experience?" → {{"min_experience": null, "skills": ["AWS"], "location": null}}
- "Show all senior candidates" → {{"min_experience": 5, "skills": [], "location": null}}
"""

_INTENT_SYSTEM = "You are a search query parser. Return only valid JSON, no explanation."


def _extract_intent_regex(query: str) -> dict:
    """Fast regex fallback for intent extraction."""
    intent = {
        "min_experience": None,
        "skills": [],
        "location": None,
    }

    query_lower = query.lower()

    exp_patterns = [
        r"(\d+)\+?\s*years?\s*(?:of\s*)?experience",
        r"at\s*least\s*(\d+)\s*years?",
        r"minimum\s*(\d+)\s*years?",
        r"more\s*than\s*(\d+)\s*years?",
    ]
    for pattern in exp_patterns:
        match = re.search(pattern, query_lower)
        if match:
            intent["min_experience"] = float(match.group(1))
            break

    location_patterns = [
        r"(?:in|from|based\s*in|located\s*in)\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:with|who|and|that|\?|$))",
    ]
    for pattern in location_patterns:
        match = re.search(pattern, query)
        if match:
            intent["location"] = match.group(1).strip().rstrip(",")
            break

    return intent


async def extract_search_intent(query: str) -> dict:
    """
    LLM-based intent extraction with regex fallback.
    Extracts skills, experience, and location filters from natural language.
    """
    try:
        raw = await _generate_json(
            _INTENT_PROMPT.format(query=query),
            _INTENT_SYSTEM,
        )
        parsed = json.loads(raw) if isinstance(raw, str) else raw

        intent = {
            "min_experience": None,
            "skills": [],
            "location": None,
        }

        if parsed.get("min_experience") is not None:
            intent["min_experience"] = float(parsed["min_experience"])

        skills = parsed.get("skills")
        if isinstance(skills, list):
            intent["skills"] = [s.strip() for s in skills if isinstance(s, str) and s.strip()]

        if parsed.get("location"):
            intent["location"] = str(parsed["location"]).strip()

        return intent
    except Exception:
        return _extract_intent_regex(query)