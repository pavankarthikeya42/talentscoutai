from fastapi import APIRouter, Depends
from asyncpg import Connection

from app.database import get_db
from app.auth.dependencies import get_current_user, require_hr
from app.auth.schemas import UserProfile
from app.rag import service
from app.rag.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatHistoryResponse,
    ChatSessionListResponse,
)

router = APIRouter(prefix="/rag", tags=["RAG Chat"])


@router.post("/chat", response_model=ChatMessageResponse)
async def chat(
    request: ChatMessageRequest,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """
    Send a natural language query about candidates.

    Examples:
    - "Who has 5+ years of Python and AWS experience?"
    - "Find React developers in Hyderabad"
    - "Compare the top 3 candidates for the Senior Backend Engineer role"
    - "Which candidates have machine learning certifications?"
    - "Summarize the strongest candidate for the DevOps position"

    Optionally pass a job_id to scope the search to candidates
    relevant to a specific job posting.
    """
    return await service.chat(conn, current_user.id, request)


@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """List all chat sessions for the current user."""
    sessions = await service.get_user_sessions(conn, current_user.id)
    return ChatSessionListResponse(sessions=sessions)


@router.get("/sessions/{session_id}", response_model=ChatHistoryResponse)
async def get_session_history(
    session_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Get full chat history for a specific session."""
    return await service.get_chat_history(conn, current_user.id, session_id)


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: UserProfile = Depends(require_hr),
    conn: Connection = Depends(get_db),
):
    """Delete a chat session and all its messages."""
    await service.delete_session(conn, current_user.id, session_id)
    return {"message": "Session deleted successfully"}