# TalentScout AI - Advanced Learning Guide

Welcome to the **TalentScout AI** project! This document provides an extremely detailed deep-dive into the application's architecture, core services, background logic, important terminal commands, and a complete API dictionary.

---

## 🚀 1. Quick Start & Majorly Used Commands

When developing or managing the application, these are the commands you will use the most:

### Backend Commands (from the `backend` directory)
* **Start Server:** `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
* **Seed Database:** `python scripts/seed_data.py` *(Populates the Supabase DB with dummy jobs, candidates, and AI embeddings)*
* **Run Tests:** `python -m pytest` *(If configured)*

### Frontend Commands (from the `frontend` directory)
* **Start Dev Server:** `npm run dev` *(Runs Vite with Hot Module Replacement)*
* **Build for Production:** `npm run build`
* **Typecheck:** `npx tsc --noEmit`
* **Linting:** `npm run lint`

---

## 🏗️ 2. Frontend Deep-Dive

The frontend is a React 19 Single Page Application (SPA).

### Key Architectural Concepts
* **Context API (`src/contexts/`)**: Uses `AuthContext.tsx` to handle JWT tokens, login states, and user roles (Manager, HR, Superadmin). It wraps the entire app to provide secure routing.
* **Routing (`src/routes/` or Layouts)**: Uses `react-router-dom` to separate the app into:
  * `PublicLayout`: Accessible to candidates (Careers portal, Apply page).
  * `AuthLayout`: Login / Signup.
  * `DashboardLayout`: Protected HR/Manager interface, wrapped by a `ProtectedRoute` component that checks the user's role.
* **Forms & Validation (`zod` + `react-hook-form`)**: Used extensively (e.g., in `LoginPage.tsx` and `_JobForm.tsx`) to validate data before sending it to the backend.
* **Component Library**: Uses **Radix UI** primitives styled with **Tailwind CSS**. Custom UI components are stored in `src/components/ui/` (e.g., `dialog.tsx`, `select.tsx`).

---

## ⚙️ 3. Backend Deep-Dive: Core Services & Functions

The backend business logic is isolated into `service.py` files within each feature directory. Here is a detailed breakdown of the major functions running behind the scenes:

### 📄 `resumes/service.py` (Resume Parsing & Processing)
Handles file uploads and interacts with LLMs to extract data.
* **`extract_text_from_pdf(file_bytes)` / `extract_text_from_docx`**: Uses raw byte parsing to extract text from candidate uploads.
* **`process_resume(...)`**: The master function. It extracts text, sends the text to **Groq / Gemini** to parse it into structured JSON (skills, experience, education), generates an AI summary, and then calls `_build_candidate_embedding_text` to generate a vector embedding using the text.
* **`process_resumes_bulk(...)`**: Asynchronously processes zip files containing multiple resumes.

### 🎯 `screening/service.py` (AI Candidate Matching)
The brain of the matching engine.
* **`screen_candidates_for_job(conn, job_id, top_k)`**: Uses Postgres `pgvector` to perform a cosine similarity search between the job's embedding and all candidates' embeddings in the database.
* **`_score_candidate(...)`**: Calculates a `suitability_score` based on AI vector similarity, hard skill matching, and experience gaps.
* **`send_automated_email(...)`**: Uses AI to draft a personalized interview invitation or rejection email and sends it via SMTP based on the application status.

### 🗓️ `interviews/service.py` (Interview Management)
* **`recommend_interview_rounds(conn, application_id)`**: Looks at a candidate's skill gaps against a job description and uses AI to recommend specific interview rounds (e.g., "System Design Round", "Behavioral").
* **`generate_questions(...)`**: Uses an LLM to generate targeted technical questions based on the candidate's specific resume and the job requirements.
* **`submit_feedback(...)`**: Records the interviewer's rating and updates the application pipeline.

### 💬 `rag/service.py` (Conversational AI Chatbot)
Retrieval-Augmented Generation (RAG) assistant for recruiters.
* **`chat(conn, user_id, session_id, message)`**: Takes a recruiter's question, searches the `pgvector` database for relevant candidates/jobs, constructs a prompt with this context, and streams back an answer via Groq/Gemini.
* **`_save_message(...)`**: Persists chat history in the database so the AI remembers previous context in the session.

### 💼 `jobs/service.py` (Job Management)
* **`create_job(...)`**: Inserts a new job and calculates its vector embedding via `_build_embedding_text`.
* **`autofill_job_details(description)`**: Takes a short prompt from an HR user and uses AI to flesh out a full, professional Job Description and requirements list.

### 🧑‍💼 `candidates/service.py` (Candidate CRUD)
* **`_normalize_education(...)` & `_parse_json_field(...)`**: Critical utility functions that safely decode JSONB fields from the database, preventing crashes on legacy string data.
* Handles basic Create, Read, Update, Delete queries via raw `asyncpg`.

---

## 📡 4. Comprehensive API Endpoints Dictionary

*All endpoints are prefixed with `/api`.*

### 🔐 Auth (`/api/auth`)
* `POST /login`: Authenticate user and receive JWT token.
* `POST /signup`: Register a new user.
* `POST /logout`: Terminate the user session.
* `GET /me`: Retrieve the current user's profile and role.

### 💼 Jobs (`/api/jobs`)
* `GET /` & `POST /`: List all jobs / Create a new job opening.
* `GET /{job_id}` & `PUT /{job_id}` & `DELETE /{job_id}`: Manage a specific job.
* `POST /autofill`: AI auto-generation of job descriptions.

### 📄 Resumes (`/api/resumes`)
* `POST /upload`: Upload and parse a single resume using AI.
* `POST /upload-bulk`: Upload multiple resumes (Zip) simultaneously.
* `POST /reembed-all`: Trigger a background task to regenerate all vector embeddings.

### 🧑‍💼 Candidates (`/api/candidates`)
* `GET /`: List all parsed candidates.
* `GET /{candidate_id}` & `PUT /{candidate_id}` & `DELETE /{candidate_id}`: Manage specific candidates.

### 🎯 Screening & Applications (`/api/screening`)
* `GET /applications`: List all applications.
* `GET /jobs/{job_id}/applications`: List candidates applied to a specific job.
* `GET /candidates/{candidate_id}/applications`: View the application history of a specific candidate.
* `POST /jobs/{job_id}/screen`: Run AI vector search to rank the top candidates for a job.
* `POST /screen-candidate`: Perform a direct 1-to-1 match between a candidate and a job.
* `PATCH /applications/{application_id}/status`: Update the hiring stage.
* `PATCH /applications/{application_id}/notes`: Update internal recruiter notes.
* `POST /applications/{application_id}/send-email`: Send AI-drafted automated emails.

### 🗓️ Interviews (`/api/interviews`)
* `GET /` & `POST /`: List / Schedule interviews.
* `GET /{interview_id}` & `PUT /{interview_id}` & `DELETE /{interview_id}`: Manage an interview.
* `GET /applications/{application_id}/recommend-rounds`: Get AI-recommended interview rounds.
* `POST /{interview_id}/feedback`: Submit interviewer feedback and scores.
* `POST /{interview_id}/regenerate-questions`: Generate new technical questions using AI.

### 💬 AI RAG Chatbot (`/api/rag`)
* `POST /chat`: Send a message to the AI recruiter assistant.
* `GET /sessions`: Get the history of previous chat sessions.
* `GET /sessions/{session_id}`: Retrieve full message history.

### 📊 Analytics (`/api/analytics`)
* `GET /overview`, `GET /pipeline`, `GET /time-to-hire`, `GET /top-skills`, `GET /source-distribution`, `GET /jobs`: Endpoints driving the data visualization charts on the frontend dashboard.

### 🌐 Public Careers Portal (`/api/portal`)
* `GET /dashboard`, `GET /careers`, `GET /careers/{job_id}`: Public endpoints for candidates.
* `POST /careers/{job_id}/apply`: Endpoint for candidates to submit applications.
* `GET /status/{email}`: Check application status.

### 🔔 Notifications (`/api/notifications`)
* `GET /`: Fetch the unread notification feed.
* `PUT /{notification_id}/read`: Mark as read.

---

> [!IMPORTANT]
> **Database Architecture:** The backend bypasses ORMs (like SQLAlchemy) and uses `asyncpg` to write raw SQL. This is done specifically to interact cleanly with `pgvector` operators (e.g., `<=>`) for AI similarity matching, ensuring maximum query speed.
