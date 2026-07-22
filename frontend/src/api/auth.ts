import { api } from './client'

export interface UserProfile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'recruiter' | 'candidate' | 'hr' | 'manager' | string
  avatar_url?: string
  display_name?: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: UserProfile
}

export const authApi = {
  signin: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/signin', { email, password }),

  signout: () => api.post('/api/auth/signout'),

  getProfile: () => api.get<UserProfile>('/api/auth/me'),

  updateProfile: (data: { full_name?: string; avatar_url?: string; password?: string; display_name?: string }) =>
    api.put<UserProfile>('/api/auth/me', data),

  listManagers: () =>
    api.get<UserProfile[]>('/api/auth/managers'),

  refresh: (refresh_token: string) =>
    api.post<AuthResponse>('/api/auth/refresh', { refresh_token }),

  createRecruiter: (data: { email: string; password?: string; full_name: string }, role: string) =>
    api.post<UserProfile>('/api/auth/create-recruiter', data, { params: { role } }),

  listRecruiters: () =>
    api.get<UserProfile[]>('/api/auth/recruiters'),

  deleteRecruiter: (id: string) =>
    api.delete(`/api/auth/recruiters/${id}`),
}
