import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function AuthLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
