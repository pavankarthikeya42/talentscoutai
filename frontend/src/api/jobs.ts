import { api } from './client'

export interface JobRequirements {
  skills: string[]
  min_experience_years: number
  education: string
  certifications: string[]
}

export interface ScreeningCriteria {
  skill_weight: number
  experience_weight: number
  education_weight: number
  certification_weight: number
}

export interface Job {
  id: string
  recruiter_id: string
  recruiter_name?: string
  title: string
  department?: string
  location?: string
  employment_type?: string
  description: string
  requirements: JobRequirements
  salary_min?: number
  salary_max?: number
  status: 'draft' | 'open' | 'closed' | 'on-hold'
  screening_criteria: ScreeningCriteria
  applicant_count: number
  vacancies: number
  closing_date?: string
  emergency?: boolean
  posted_to_linkedin?: boolean
  posted_to_naukri?: boolean
  created_at: string
  updated_at: string
}

export interface JobListResponse {
  jobs: Job[]
  total: number
  page: number
  page_size: number
}

export interface JobCreateRequest {
  title: string
  department?: string
  location?: string
  employment_type?: string
  description: string
  requirements: JobRequirements
  salary_min?: number
  salary_max?: number
  status?: string
  screening_criteria?: ScreeningCriteria
  vacancies?: number
  closing_date?: string
  emergency?: boolean
  post_to_linkedin?: boolean
  post_to_naukri?: boolean
}

export const jobsApi = {
  list: (params?: { status?: string; my_jobs?: boolean; page?: number; page_size?: number }) =>
    api.get<JobListResponse>('/api/jobs', { params }),

  get: (id: string) => api.get<Job>(`/api/jobs/${id}`),

  create: (data: JobCreateRequest) => api.post<Job>('/api/jobs', data),

  update: (id: string, data: Partial<JobCreateRequest>) =>
    api.put<Job>(`/api/jobs/${id}`, data),

  delete: (id: string) => api.delete(`/api/jobs/${id}`),

  autofill: (data: { description: string; min_experience_years?: number }) =>
    api.post<{
      title: string
      department: string
      location: string
      employment_type: string
      description?: string
      requirements: JobRequirements
      salary_min?: number
      salary_max?: number
      screening_criteria: ScreeningCriteria
    }>('/api/jobs/autofill', data),
}
