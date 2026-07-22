import { api } from './client'

export const analyticsApi = {
  overview: (myJobsOnly = false) =>
    api.get('/api/analytics/overview', { params: { my_jobs_only: myJobsOnly } }),

  pipeline: (jobId?: string) =>
    api.get('/api/analytics/pipeline', { params: jobId ? { job_id: jobId } : {} }),

  timeToHire: (jobId?: string) =>
    api.get('/api/analytics/time-to-hire', { params: jobId ? { job_id: jobId } : {} }),

  topSkills: (limit = 15) =>
    api.get('/api/analytics/top-skills', { params: { limit } }),

  sourceDistribution: (jobId?: string) =>
    api.get('/api/analytics/source-distribution', { params: jobId ? { job_id: jobId } : {} }),

  jobs: () => api.get('/api/analytics/jobs'),

  departments: () => api.get('/api/analytics/departments'),

  managers: () => api.get('/api/analytics/managers'),

  interviews: () => api.get('/api/analytics/interviews'),

  scoreDistribution: (jobId?: string) =>
    api.get('/api/analytics/score-distribution', { params: jobId ? { job_id: jobId } : {} }),
}
