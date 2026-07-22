import json
import uuid
from asyncpg import Connection

from app.rag.retriever import (
    retrieve_candidates_by_query,
    retrieve_candidates_for_job,
    retrieve_with_filters,
)
from app.rag.embeddings import build_candidate_context, extract_search_intent
from app.rag.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    RetrievedCandidate,
    ChatHistoryMessage,
    ChatHistoryResponse,
)
from app.common.groq_llm import generate_text, generate_json


OFF_TOPIC_REFUSAL = (
    "I'm TalentScout AI, a recruitment assistant. I can only help with "
    "candidate search, job matching, screening, and other hiring-related questions. "
    "Please ask me something related to your talent pipeline!"
)

RELEVANCE_CHECK_PROMPT = """Determine whether the following user message is related to recruitment, hiring, candidates, jobs, resumes, skills, interviews, or talent management.

User message: "{query}"

Return JSON: {{"is_relevant": true}} if the message is about recruitment/hiring topics, or {{"is_relevant": false}} if it is off-topic (e.g. general knowledge, politics, sports, math, personal questions, etc.).
"""

RELEVANCE_SYSTEM_INSTRUCTION = "You are a classifier. Return only JSON. No explanation."


async def _is_recruitment_related(query: str) -> bool:
    """Check if a query is related to recruitment using the LLM."""
    try:
        result = await generate_json(
            RELEVANCE_CHECK_PROMPT.format(query=query),
            RELEVANCE_SYSTEM_INSTRUCTION,
        )
        import json
        parsed = json.loads(result) if isinstance(result, str) else result
        return parsed.get("is_relevant", True)
    except Exception:
        return True


RAG_SYSTEM_PROMPT = """You are TalentScout AI, a recruitment assistant. Be concise and direct.

RULES:
- Answer ONLY recruitment-related questions (candidates, jobs, skills, hiring, interviews)
- Base answers strictly on the retrieved candidate data — never fabricate information
- If no candidates match, say so in one sentence
- When listing candidates, use a brief structured format: name, key skills, experience years
- Do NOT repeat the user's question back to them
- Do NOT add filler phrases like "I'm happy to help", "Great question", "Let me check"
- Do NOT explain that you're a recruitment assistant or describe your capabilities
- Do NOT add unnecessary suggestions unless the user asks for them
- Keep responses short: 2-4 sentences for simple queries, bullet points for lists
"""

RAG_PROMPT_TEMPLATE = """
## Chat History
{chat_history}

## Retrieved Candidate Data
{candidate_context}

## Question
{user_query}

Answer directly based on the candidate data above. If no candidates match, say "No matching candidates found." in one line. Do not repeat the question, do not add filler, do not explain what you are doing. Be brief.
"""


async def _save_message(
    conn: Connection, user_id: str, session_id: str, role: str, content: str, metadata: dict = None
):
    """Save a chat message to history."""
    await conn.execute(
        """
        INSERT INTO chat_history (user_id, session_id, role, content, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        """,
        user_id,
        session_id,
        role,
        content,
        json.dumps(metadata or {}),
    )


async def _get_recent_history(
    conn: Connection, session_id: str, limit: int = 10
) -> list[dict]:
    """Get recent chat history for context."""
    rows = await conn.fetch(
        """
        SELECT role, content FROM chat_history
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        session_id,
        limit,
    )
    # Reverse to chronological order
    return [dict(r) for r in reversed(rows)]


async def chat(
    conn: Connection,
    user_id: str,
    request: ChatMessageRequest,
) -> ChatMessageResponse:
    """
    Full RAG pipeline:
    1. Extract search intent from user query
    2. Retrieve relevant candidates (vector search + optional filters)
    3. Build context from retrieved candidates
    4. Get chat history for continuity
    5. Generate response with Gemini
    6. Save messages to history
    """
    # Session management
    session_id = request.session_id or str(uuid.uuid4())

    # 1. Save user message
    await _save_message(conn, user_id, session_id, "user", request.message)

    # 1.5 Check if query is recruitment-related before doing any retrieval
    if not await _is_recruitment_related(request.message):
        await _save_message(conn, user_id, session_id, "assistant", OFF_TOPIC_REFUSAL, {
            "off_topic": True,
            "candidates_found": 0,
        })
        return ChatMessageResponse(
            session_id=session_id,
            role="assistant",
            content=OFF_TOPIC_REFUSAL,
            retrieved_candidates=[],
            metadata={"off_topic": True, "candidates_found": 0},
        )

    # 2. Extract intent for hybrid search
    intent = await extract_search_intent(request.message)

    # 3. Retrieve candidates
    if request.job_id:
        # Job-scoped retrieval
        candidates = await retrieve_candidates_for_job(
            conn, request.job_id, top_k=10
        )
    elif intent["min_experience"] or intent["skills"] or intent["location"]:
        # Hybrid retrieval with filters
        candidates = await retrieve_with_filters(
            conn,
            query=request.message,
            min_experience=intent["min_experience"],
            required_skills=intent["skills"] if intent["skills"] else None,
            location=intent["location"],
            top_k=10,
        )
    else:
        # Pure semantic search
        candidates = await retrieve_candidates_by_query(
            conn, request.message, top_k=10
        )

    # 4. Build context
    candidate_context = build_candidate_context(candidates)

    # 5. Get chat history
    history = await _get_recent_history(conn, session_id, limit=6)
    chat_history_text = ""
    if history:
        chat_history_text = "\n".join(
            f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[:-1]  # exclude current
        )
    else:
        chat_history_text = "No previous messages."

    # 6. Generate response
    prompt = RAG_PROMPT_TEMPLATE.format(
        chat_history=chat_history_text,
        candidate_context=candidate_context,
        user_query=request.message,
    )

    response_text = await generate_text(prompt, RAG_SYSTEM_PROMPT)

    # 7. Build retrieved candidates list
    retrieved = [
        RetrievedCandidate(
            candidate_id=str(c["id"]),
            full_name=c["full_name"],
            email=c["email"],
            similarity_score=round(float(c.get("similarity_score", 0)), 3),
            skills=c.get("skills", []) if isinstance(c.get("skills"), list) else [],
            total_experience_years=round(float(c.get("total_experience_years", 0)), 1),
            location=c.get("location"),
            summary=c.get("summary"),
        )
        for c in candidates
    ]

    # 8. Save assistant response
    metadata = {
        "retrieved_candidate_ids": [str(c["id"]) for c in candidates],
        "job_id": request.job_id,
        "candidates_found": len(candidates),
    }
    await _save_message(conn, user_id, session_id, "assistant", response_text, metadata)

    return ChatMessageResponse(
        session_id=session_id,
        role="assistant",
        content=response_text,
        retrieved_candidates=retrieved,
        metadata=metadata,
    )


async def get_chat_history(
    conn: Connection, user_id: str, session_id: str
) -> ChatHistoryResponse:
    """Get full chat history for a session."""
    rows = await conn.fetch(
        """
        SELECT id, role, content, metadata, created_at
        FROM chat_history
        WHERE user_id = $1 AND session_id = $2
        ORDER BY created_at ASC
        """,
        user_id,
        session_id,
    )

    messages = []
    for r in rows:
        meta = r["metadata"]
        if isinstance(meta, str):
            meta = json.loads(meta)

        messages.append(ChatHistoryMessage(
            id=str(r["id"]),
            role=r["role"],
            content=r["content"],
            metadata=meta,
            created_at=r["created_at"],
        ))

    return ChatHistoryResponse(session_id=session_id, messages=messages)


async def get_user_sessions(conn: Connection, user_id: str) -> list[dict]:
    """Get all chat sessions for a user."""
    rows = await conn.fetch(
        """
        SELECT
            session_id,
            MIN(created_at) AS started_at,
            MAX(created_at) AS last_message_at,
            COUNT(*) AS message_count,
            (
                SELECT content FROM chat_history ch2
                WHERE ch2.session_id = ch.session_id AND ch2.role = 'user'
                ORDER BY ch2.created_at ASC LIMIT 1
            ) AS first_message
        FROM chat_history ch
        WHERE user_id = $1
        GROUP BY session_id
        ORDER BY MAX(created_at) DESC
        """,
        user_id,
    )

    return [
        {
            "session_id": str(r["session_id"]),
            "started_at": r["started_at"],
            "last_message_at": r["last_message_at"],
            "message_count": r["message_count"],
            "first_message": r["first_message"],
        }
        for r in rows
    ]


async def delete_session(conn: Connection, user_id: str, session_id: str) -> bool:
    """Delete a chat session."""
    result = await conn.execute(
        "DELETE FROM chat_history WHERE user_id = $1 AND session_id = $2",
        user_id,
        session_id,
    )
    return "DELETE" in result