import { api } from './client'

export interface RetrievedCandidate {
  candidate_id: string
  full_name: string
  email: string
  similarity_score: number
  skills: string[]
  total_experience_years: number
  location?: string
  summary?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ChatSession {
  session_id: string
  started_at: string
  last_message_at: string
  message_count: number
  first_message: string
}

export const ragApi = {
  chat: (message: string, session_id?: string, job_id?: string) =>
    api.post('/api/rag/chat', { message, session_id, job_id }),

  getSessions: () => api.get<{ sessions: ChatSession[] }>('/api/rag/sessions'),

  getSession: (sessionId: string) =>
    api.get<{ session_id: string; messages: ChatMessage[] }>(`/api/rag/sessions/${sessionId}`),

  deleteSession: (sessionId: string) =>
    api.delete(`/api/rag/sessions/${sessionId}`),
}
