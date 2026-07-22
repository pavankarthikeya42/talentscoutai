import { api } from './client'

export interface ScoreBreakdown {
  skill_score: number
  experience_score: number
  education_score: number
  certification_score: number
  semantic_score: number
  reasoning: string
}

export interface ScreeningResult {
  application_id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string
  suitability_score: number
  score_breakdown: ScoreBreakdown
  ai_summary: string
  status: string
}

export interface RankingResponse {
  job_id: string
  job_title: string
  total_screened: number
  rankings: ScreeningResult[]
}

export interface Application {
  id: string
  job_id: string
  candidate_id: string
  status: string
  source: string
  suitability_score?: number
  score_breakdown?: ScoreBreakdown
  ai_summary?: string
  recruiter_notes?: string
  expected_salary?: string
  notice_period?: string
  applied_at: string
  updated_at: string
  candidate_name?: string
  candidate_email?: string
  job_title?: string
  recruiter_name?: string
  recruiter_id?: string
  automated_email_sent?: boolean
}

export interface ApplicationListResponse {
  applications: Application[]
  total: number
  page: number
  page_size: number
}

export const screeningApi = {
  getAllApplications: (params?: { job_id?: string; status?: string; min_score?: number; page?: number; page_size?: number }) =>
    api.get<ApplicationListResponse>('/api/screening/applications', { params }),

  screenJob: (jobId: string, topK = 20) =>
    api.post<RankingResponse>(`/api/screening/jobs/${jobId}/screen`, null, {
      params: { top_k: topK },
    }),

  screenCandidate: (jobId: string, candidateId: string) =>
    api.post<ScreeningResult>('/api/screening/screen-candidate', { job_id: jobId, candidate_id: candidateId }),

  getApplications: (jobId: string, params?: { status?: string; page?: number; page_size?: number }) =>
    api.get<ApplicationListResponse>(`/api/screening/jobs/${jobId}/applications`, { params }),

  getCandidateApplications: (candidateId: string) =>
    api.get(`/api/screening/candidates/${candidateId}/applications`),

  updateStatus: (appId: string, status: string) =>
    api.patch<Application>(`/api/screening/applications/${appId}/status`, { status }),

  updateNotes: (appId: string, recruiter_notes: string) =>
    api.patch<Application>(`/api/screening/applications/${appId}/notes`, { recruiter_notes }),

  sendAutomatedEmail: (appId: string) =>
    api.post<{ application_id: string; recipient_email: string; subject: string; body: string; status: string }>(`/api/screening/applications/${appId}/send-email`),

  draftAutomatedEmail: (appId: string) =>
    api.post<{ subject: string; body: string }>(`/api/screening/applications/${appId}/draft-email`),

  sendCustomEmail: (appId: string, data: { subject: string; body: string }) =>
    api.post<{ application_id: string; recipient_email: string; subject: string; body: string; status: string }>(`/api/screening/applications/${appId}/send-custom-email`, data),

  deleteApplication: (appId: string) =>
    api.delete<{ message: string }>(`/api/screening/applications/${appId}`),
}
