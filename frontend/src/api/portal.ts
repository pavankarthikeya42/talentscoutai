import { api } from './client'

export interface PortalJob {
  id: string
  title: string
  department?: string
  location?: string
  employment_type?: string
  salary_min?: number
  salary_max?: number
  vacancies?: number
  closing_date?: string
  created_at: string
}

export interface PortalJobDetail extends PortalJob {
  description: string
  requirements: Record<string, unknown>
}

export interface PortalStatusItem {
  job_title: string
  department?: string
  status: string
  applied_at?: string
  suitability_score?: number
}

export const portalApi = {
  getDashboard: () => api.get('/api/careers/dashboard'),

  getJobs: () =>
    api.get<{ company: string; total_openings: number; jobs: PortalJob[] }>(
      '/api/careers/careers'
    ),

  getJob: (jobId: string) =>
    api.get<PortalJobDetail>(`/api/careers/careers/${jobId}`),

  apply: (
    jobId: string,
    data: {
      full_name: string
      email: string
      phone: string
      expected_salary?: string
      notice_period?: string
    },
    resume: File
  ) => {
    const form = new FormData()
    form.append('full_name', data.full_name)
    form.append('email', data.email)
    form.append('phone', data.phone)
    if (data.expected_salary) form.append('expected_salary', data.expected_salary)
    if (data.notice_period) form.append('notice_period', data.notice_period)
    form.append('resume', resume, resume.name)  // <-- filename included

    return api.post(`/api/careers/careers/${jobId}/apply`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },  // <-- force multipart
    })
  },

  checkStatus: (email: string) =>
    api.get(`/api/careers/status/${email}`),
}