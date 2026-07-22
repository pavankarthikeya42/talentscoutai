import { api } from './client'

export interface ResumeUploadResponse {
  message: string
  candidate_id: string
  parsed_data: Record<string, unknown>
  file_path: string
}

export interface BulkUploadResult {
  filename: string
  status: 'success' | 'error'
  candidate_id?: string
  error?: string
}

export interface BulkUploadResponse {
  message: string
  total: number
  successful: number
  failed: number
  results: BulkUploadResult[]
}

export const resumesApi = {
  upload: (file: File, jobId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (jobId) form.append('job_id', jobId)
    return api.post<ResumeUploadResponse>('/api/resumes/upload', form)
  },

  uploadBulk: (files: File[], jobId?: string) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    if (jobId) form.append('job_id', jobId)
    return api.post<BulkUploadResponse>('/api/resumes/upload-bulk', form)
  },
}
