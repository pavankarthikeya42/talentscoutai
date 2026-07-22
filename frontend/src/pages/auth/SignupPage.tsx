import { Navigate } from 'react-router-dom'

// Signup is now handled as a tab on the login page
export function SignupPage() {
  return <Navigate to="/login" replace />
}
