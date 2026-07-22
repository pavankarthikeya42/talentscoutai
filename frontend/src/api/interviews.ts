import { api } from './client'

export interface InterviewQuestion {
  question: string
  category: string
  difficulty: string
  what_to_look_for: string
}

export interface Interview {
  id: string
  application_id: string
  interviewer_id?: string
  interviewer_name?: string
  round_number: number
  interview_type: string
  scheduled_at?: string
  duration_minutes: number
  status: string
  ai_suggested_questions: InterviewQuestion[]
  feedback?: string
  rating?: number
  created_at: string
  updated_at: string
  candidate_name?: string
  candidate_email?: string
  job_title?: string
}

export interface InterviewListResponse {
  interviews: Interview[]
  total: number
  page: number
  page_size: number
}

export interface RoundRecommendation {
  round_number: number
  round_name: string
  interview_type: string
  complexity: string
  duration_minutes: number
  focus_areas: string[]
  key_topics: string[]
  what_to_assess: string
  tips_for_interviewer: string
}

export interface CandidateStrength {
  area: string
  detail: string
}

export interface CandidateWeakness {
  area: string
  detail: string
}

export interface RoundRecommendationResponse {
  experience_level: string
  rounds: RoundRecommendation[]
  overall_recommendation: string
  red_flags: string[]
  strengths_to_probe: string[]
  candidate_name: string
  job_title: string
  suitability_score: number
  total_experience_years: number
  skill_gaps: string[]

  // AI resume vs JD analysis — new fields
  interview_summary: string
  candidate_strengths: CandidateStrength[]
  candidate_weaknesses: CandidateWeakness[]
  evaluation_focus: string
}

export const interviewsApi = {
  create: (data: {
    application_id: string
    interviewer_id?: string
    round_number?: number
    interview_type: string
    scheduled_at?: string
    duration_minutes?: number
  }, generateQuestions = true) =>
    api.post<Interview>('/api/interviews', data, { params: { generate_questions: generateQuestions } }),

  list: (params?: { application_id?: string; interviewer_id?: string; status?: string; page?: number; page_size?: number }) =>
    api.get<InterviewListResponse>('/api/interviews', { params }),

  listByJob: (jobId: string) =>
    api.get<Interview[]>(`/api/interviews/job/${jobId}`),

  get: (id: string) => api.get<Interview>(`/api/interviews/${id}`),

  update: (id: string, data: Partial<Interview>) =>
    api.put<Interview>(`/api/interviews/${id}`, data),

  submitFeedback: (id: string, feedback: string, rating: number) =>
    api.post<Interview>(`/api/interviews/${id}/feedback`, { feedback, rating }),

  regenerateQuestions: (id: string, params?: { num_questions?: number; difficulty?: string; focus_areas?: string[] }) =>
    api.post<Interview>(`/api/interviews/${id}/regenerate-questions`, params || {}),

  delete: (id: string) => api.delete(`/api/interviews/${id}`),

  notifyManager: (id: string) => api.post(`/api/interviews/${id}/notify-manager`),

  recommendRounds: (applicationId: string) =>
    api.get<RoundRecommendationResponse>(`/api/interviews/applications/${applicationId}/recommend-rounds`),
}