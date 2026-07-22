import { api } from './client'

export interface ExperienceItem {
  title: string
  company: string
  start_date: string
  end_date?: string
  description?: string
}

export interface EducationItem {
  degree: string
  institution: string
  year?: string
}

export interface Candidate {
  id: string
  full_name: string
  email: string
  phone?: string
  location?: string
  summary?: string
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  certifications: string[]
  total_experience_years: number
  resume_url?: string
  resume_file_path?: string
  parsed_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CandidateListResponse {
  candidates: Candidate[]
  total: number
  page: number
  page_size: number
}

export const candidatesApi = {
  list: (params?: { search?: string; skills?: string; page?: number; page_size?: number }) =>
    api.get<CandidateListResponse>('/api/candidates', { params }),

  get: (id: string) => api.get<Candidate>(`/api/candidates/${id}`),

  update: (id: string, data: Partial<Candidate>) =>
    api.put<Candidate>(`/api/candidates/${id}`, data),

  delete: (id: string) => api.delete(`/api/candidates/${id}`),
}
