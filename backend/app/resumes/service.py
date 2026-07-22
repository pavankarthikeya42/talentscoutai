import uuid
from PyPDF2 import PdfReader
from io import BytesIO
from asyncpg import Connection

from app.resumes.parser import parse_resume_text
from app.resumes.schemas import ParsedResume, ResumeUploadResponse
from app.candidates import models as candidate_models
from app.common.storage import upload_file, get_file_url
from app.common.gemini import generate_embedding
from app.common.exceptions import BadRequestError


def _build_candidate_embedding_text(parsed: dict) -> str:
    """Build text for embedding from parsed resume data."""
    parts = []

    if parsed.get("full_name"):
        parts.append(f"Name: {parsed['full_name']}")
    if parsed.get("summary"):
        parts.append(f"Summary: {parsed['summary']}")
    if parsed.get("skills"):
        parts.append(f"Skills: {', '.join(parsed['skills'])}")
    if parsed.get("experience"):
        for exp in parsed["experience"]:
            exp_text = f"{exp.get('title', '')} at {exp.get('company', '')}"
            if exp.get("description"):
                exp_text += f" - {exp['description']}"
            parts.append(exp_text)
    if parsed.get("education"):
        for edu in parsed["education"]:
            parts.append(f"{edu.get('degree', '')} from {edu.get('institution', '')}")
    if parsed.get("certifications"):
        parts.append(f"Certifications: {', '.join(parsed['certifications'])}")
    if parsed.get("total_experience_years"):
        parts.append(f"Total Experience: {parsed['total_experience_years']} years")

    return "\n".join(parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file using Python standard zipfile and xml libraries."""
    import zipfile
    import xml.etree.ElementTree as ET
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as docx:
            document_xml = docx.read('word/document.xml')
            root = ET.fromstring(document_xml)
            
            paragraphs = []
            for element in root.iter():
                tag_local = element.tag.split('}')[-1]
                if tag_local == 'p':
                    t_texts = []
                    for child in element.iter():
                        child_local = child.tag.split('}')[-1]
                        if child_local == 't' and child.text:
                            t_texts.append(child.text)
                    paragraphs.append("".join(t_texts))
            
            full_text = "\n".join(paragraphs)
            if not full_text.strip():
                raise BadRequestError("Could not extract text from DOCX. The file may be empty or invalid.")
            return full_text
    except BadRequestError:
        raise
    except Exception as e:
        raise BadRequestError(f"Failed to read DOCX: {str(e)}")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        full_text = "\n".join(text_parts)

        if not full_text.strip():
            raise BadRequestError("Could not extract text from PDF. The file may be scanned/image-based.")

        return full_text
    except BadRequestError:
        raise
    except Exception as e:
        raise BadRequestError(f"Failed to read PDF: {str(e)}")


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract text from a PDF or DOCX file based on its extension."""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        return extract_text_from_docx(file_bytes)
    else:
        raise BadRequestError(f"Unsupported file format: .{ext}. Only PDF and DOCX are supported.")


async def process_resume(
    conn: Connection,
    file_bytes: bytes,
    filename: str,
    job_id: str | None = None,
) -> ResumeUploadResponse:
    """
    Full resume processing pipeline:
    1. Upload PDF to Supabase Storage
    2. Extract text from PDF
    3. Parse with Gemini AI
    4. Generate embedding
    5. Create/update candidate in DB
    6. Optionally link to a job application
    """

    # 1. Upload to storage
    file_ext = filename.rsplit(".", 1)[-1] if "." in filename else "pdf"
    storage_path = f"uploads/{uuid.uuid4()}.{file_ext}"
    upload_file(file_bytes, storage_path)

    # 2. Extract text
    resume_text = extract_text(file_bytes, filename)

    # 3. AI parsing
    parsed = await parse_resume_text(resume_text)

    if not parsed.get("email"):
        raise BadRequestError(
            "Could not extract email from resume. Please ensure the resume contains a valid email address."
        )

    # 4. Generate embedding
    embedding_text = _build_candidate_embedding_text(parsed)
    embedding = await generate_embedding(embedding_text)

    # 5. Get signed URL
    resume_url = get_file_url(storage_path)

    # 6. Save candidate
    candidate_data = {
        "full_name": parsed["full_name"],
        "email": parsed["email"],
        "phone": parsed.get("phone"),
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

    # 7. If job_id provided, create application
    if job_id:
        await conn.execute(
            """
            INSERT INTO applications (job_id, candidate_id, status, source)
            VALUES ($1, $2, 'new', 'manual')
            ON CONFLICT (job_id, candidate_id) DO NOTHING
            """,
            job_id,
            str(candidate_row["id"]),
        )

    return ResumeUploadResponse(
        message="Resume processed successfully",
        candidate_id=str(candidate_row["id"]),
        parsed_data=ParsedResume(**parsed),
        file_path=storage_path,
    )


async def process_resumes_bulk(
    conn: Connection,
    files: list[tuple[bytes, str]],
    job_id: str | None = None,
) -> dict:
    """Process multiple resumes."""
    results = []
    successful = 0
    failed = 0

    for file_bytes, filename in files:
        try:
            result = await process_resume(conn, file_bytes, filename, job_id)
            results.append({
                "filename": filename,
                "status": "success",
                "candidate_id": result.candidate_id,
                "candidate_name": result.parsed_data.full_name,
            })
            successful += 1
        except Exception as e:
            results.append({
                "filename": filename,
                "status": "error",
                "error": str(e),
            })
            failed += 1

    return {
        "message": f"Processed {successful + failed} resumes",
        "total": successful + failed,
        "successful": successful,
        "failed": failed,
        "results": results,
    }