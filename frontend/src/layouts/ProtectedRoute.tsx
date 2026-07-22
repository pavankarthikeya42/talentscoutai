import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const role = user.role?.toLowerCase() ?? ''
  const isSuperAdmin = role === 'superadmin' || role === 'super admin' || role === 'super_admin'
  const isManager = role === 'manager'
  const isHR = role === 'hr'

  // SuperAdmin can ONLY access /users and /settings/profile
  const superAdminAllowed = ['/users', '/settings/profile']
  if (isSuperAdmin && !superAdminAllowed.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/users" replace />
  }

  // Manager & HR cannot access /users page
  if ((isManager || isHR) && location.pathname.startsWith('/users')) {
    return <Navigate to="/dashboard" replace />
  }

  // Manager cannot access /analytics page
  if (isManager && location.pathname.startsWith('/analytics')) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
