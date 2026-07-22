import { api } from './client'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  action_url?: string
  read: boolean
  created_at: string
}

export const notificationsApi = {
  getUnread: () => api.get<Notification[]>('/api/notifications'),
  markRead: (id: string) => api.put(`/api/notifications/${id}/read`),
  broadcast: (title: string, message: string, target_role: string) =>
    api.post('/api/notifications/broadcast', { title, message, target_role }),
}
