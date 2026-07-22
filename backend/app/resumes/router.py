from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from asyncpg import Connection
from typing import Optional

from app.database import get_db
from app.auth.dependencies import require_hr
from app.auth.schemas import UserProfile
from app.resumes import service
from app.resumes.schemas import ResumeUploadResponse, BulkUploadResponse
from app.common.exceptions import BadRequestError

router = APIRouter(prefix="/resumes", tags=["Resumes"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    job_id: Optional[str] = Form(None),
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """
    Upload a single resume PDF.
    - Extracts text from PDF
    - Parses with Gemini AI (name, email, skills, experience, etc.)
    - Generates vector embedding for RAG
    - Creates/updates candidate in database
    - Optionally links candidate to a job application
    """
    if not (file.filename.lower().endswith(".pdf") or file.filename.lower().endswith(".docx")):
        raise BadRequestError("Only PDF and DOCX files are supported")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise BadRequestError("File size exceeds 10MB limit")

    if len(file_bytes) == 0:
        raise BadRequestError("Uploaded file is empty")

    return await service.process_resume(conn, file_bytes, file.filename, job_id)


@router.post("/upload-bulk", response_model=BulkUploadResponse)
async def upload_resumes_bulk(
    files: list[UploadFile] = File(...),
    job_id: Optional[str] = Form(None),
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """
    Upload multiple resume files (PDF & DOCX) at once.
    Each resume is processed independently — failures don't block others.
    """
    if len(files) > 20:
        raise BadRequestError("Maximum 20 files per batch upload")

    file_pairs = []
    for f in files:
        if not (f.filename.lower().endswith(".pdf") or f.filename.lower().endswith(".docx")):
            continue
        content = await f.read()
        if 0 < len(content) <= MAX_FILE_SIZE:
            file_pairs.append((content, f.filename))

    if not file_pairs:
        raise BadRequestError("No valid PDF or DOCX files found in upload")

    result = await service.process_resumes_bulk(conn, file_pairs, job_id)
    return BulkUploadResponse(**result)

