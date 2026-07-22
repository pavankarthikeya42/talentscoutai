-- TalentScout AI — Supabase PostgreSQL schema
-- Run this once in Supabase SQL Editor (or: python -m app.init_schema)

-- @@@
CREATE EXTENSION IF NOT EXISTS vector;
-- @@@
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- @@@

-- ── Profiles (linked to Supabase Auth) ──
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'Manager',
    avatar_url TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['Manager'::text, 'HR'::text, 'SuperAdmin'::text]))
);
-- @@@

-- ── Jobs ──
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department TEXT,
    location TEXT,
    employment_type TEXT,
    description TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    salary_min NUMERIC,
    salary_max NUMERIC,
    status TEXT NOT NULL DEFAULT 'open',
    screening_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    description_embedding vector(768),
    vacancies INTEGER NOT NULL DEFAULT 1,
    closing_date DATE,
    emergency BOOLEAN NOT NULL DEFAULT FALSE,
    posted_to_linkedin BOOLEAN NOT NULL DEFAULT FALSE,
    posted_to_naukri BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT jobs_status_check CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'draft'::text, 'on-hold'::text])),
    CONSTRAINT jobs_vacancies_check CHECK (vacancies >= 1)
);
-- @@@
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vacancies INTEGER NOT NULL DEFAULT 1;
-- @@@
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closing_date DATE;
-- @@@
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS emergency BOOLEAN NOT NULL DEFAULT FALSE;
-- @@@

-- ── Candidates ──
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    location TEXT,
    summary TEXT,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_experience_years REAL NOT NULL DEFAULT 0,
    resume_url TEXT,
    resume_file_path TEXT,
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    resume_embedding vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- @@@

-- ── Applications ──
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT NOT NULL DEFAULT 'manual',
    suitability_score REAL NOT NULL DEFAULT 0,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_summary TEXT,
    recruiter_notes TEXT,
    expected_salary TEXT,
    notice_period TEXT,
    automated_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT applications_status_check CHECK (
        status = ANY (ARRAY['new'::text, 'screened'::text, 'shortlisted'::text, 'interview'::text, 'offered'::text, 'hired'::text, 'rejected'::text])
    ),
    CONSTRAINT applications_job_candidate_key UNIQUE (job_id, candidate_id)
);
-- @@@

-- ── Interviews ──
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    interview_type TEXT NOT NULL DEFAULT 'technical',
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'scheduled',
    ai_suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    feedback TEXT DEFAULT '',
    rating INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT interviews_status_check CHECK (
        status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text, 'no-show'::text])
    ),
    CONSTRAINT interviews_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);
-- @@@

-- ── RAG chat history ──
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_history_role_check CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text]))
);
-- @@@

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON public.candidates(email);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON public.interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON public.interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session ON public.chat_history(user_id, session_id);
-- @@@

CREATE INDEX IF NOT EXISTS idx_candidates_resume_embedding
    ON public.candidates USING ivfflat (resume_embedding vector_cosine_ops) WITH (lists = 100);
-- @@@
CREATE INDEX IF NOT EXISTS idx_jobs_description_embedding
    ON public.jobs USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
-- @@@
CREATE INDEX IF NOT EXISTS idx_candidates_skills_gin ON public.candidates USING gin (skills);
-- @@@

-- ── updated_at trigger ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- @@@

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- @@@

DROP TRIGGER IF EXISTS set_jobs_updated_at ON public.jobs;
CREATE TRIGGER set_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- @@@

DROP TRIGGER IF EXISTS set_candidates_updated_at ON public.candidates;
CREATE TRIGGER set_candidates_updated_at
    BEFORE UPDATE ON public.candidates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- @@@

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- @@@

DROP TRIGGER IF EXISTS set_interviews_updated_at ON public.interviews;
CREATE TRIGGER set_interviews_updated_at
    BEFORE UPDATE ON public.interviews
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- @@@

-- ── Auto-create profile on signup ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        'Manager'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- @@@

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- @@@

-- ── Row Level Security ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
-- @@@

DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles"
    ON public.profiles FOR SELECT TO authenticated USING (true);
-- @@@

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
-- @@@

DROP POLICY IF EXISTS "Authenticated users full access jobs" ON public.jobs;
CREATE POLICY "Authenticated users full access jobs"
    ON public.jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- @@@

DROP POLICY IF EXISTS "Authenticated users full access candidates" ON public.candidates;
CREATE POLICY "Authenticated users full access candidates"
    ON public.candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- @@@

DROP POLICY IF EXISTS "Authenticated users full access applications" ON public.applications;
CREATE POLICY "Authenticated users full access applications"
    ON public.applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- @@@

DROP POLICY IF EXISTS "Authenticated users full access interviews" ON public.interviews;
CREATE POLICY "Authenticated users full access interviews"
    ON public.interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- @@@

DROP POLICY IF EXISTS "Users manage own chat history" ON public.chat_history;
CREATE POLICY "Users manage own chat history"
    ON public.chat_history FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- @@@

-- Public read for open jobs (career portal)
DROP POLICY IF EXISTS "Public can read open jobs" ON public.jobs;
CREATE POLICY "Public can read open jobs"
    ON public.jobs FOR SELECT TO anon USING (status = 'open');
-- @@@

-- ── Resume storage bucket ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;
-- @@@

DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;
CREATE POLICY "Authenticated users can upload resumes"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'resumes');
-- @@@

DROP POLICY IF EXISTS "Authenticated users can read resumes" ON storage.objects;
CREATE POLICY "Authenticated users can read resumes"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'resumes');
-- @@@

DROP POLICY IF EXISTS "Service role full access resumes" ON storage.objects;
CREATE POLICY "Service role full access resumes"
    ON storage.objects FOR ALL TO service_role
    USING (bucket_id = 'resumes') WITH CHECK (bucket_id = 'resumes');
-- @@@

-- ── Notifications ──
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- @@@

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
-- @@@
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
-- @@@

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- @@@

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

