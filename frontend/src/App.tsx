import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ProtectedRoute } from '@/layouts/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ApplicationsPage } from '@/pages/applications/ApplicationsPage'
import { ProfilePage } from '@/pages/settings/ProfilePage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { UsersManagementPage } from '@/pages/dashboard/UsersManagementPage'
import { JobsListPage } from '@/pages/jobs/JobsListPage'
import { JobDetailPage } from '@/pages/jobs/JobDetailPage'
import { CandidatesListPage } from '@/pages/candidates/CandidatesListPage'
import { CandidateDetailPage } from '@/pages/candidates/CandidateDetailPage'
import { ResumeUploadPage } from '@/pages/resumes/ResumeUploadPage'
import { ScreeningPage } from '@/pages/screening/ScreeningPage'
import { ApplicationsPage as JobApplicationsPage } from '@/pages/screening/ApplicationsPage'
import { InterviewsListPage } from '@/pages/interviews/InterviewsListPage'
import { InterviewDetailPage } from '@/pages/interviews/InterviewDetailPage'
import { ScheduleInterviewPage } from '@/pages/interviews/ScheduleInterviewPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { CompanyLandingPage } from '@/pages/portal/CompanyLandingPage'
import { CareersListPage } from '@/pages/portal/CareersListPage'
import { JobDetailPortalPage } from '@/pages/portal/JobDetailPortalPage'
import { ApplyPage } from '@/pages/portal/ApplyPage'
import { GlobalProgressBar } from '@/components/shared/LoadingSpinner'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
            </Route>

            {/* HR Dashboard (protected) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/jobs" element={<JobsListPage />} />
                <Route path="/jobs/:jobId" element={<JobDetailPage />} />
                <Route path="/jobs/:jobId/screening" element={<ScreeningPage />} />
                <Route path="/jobs/:jobId/applications" element={<JobApplicationsPage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/candidates" element={<CandidatesListPage />} />
                <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
                <Route path="/resumes/upload" element={<ResumeUploadPage />} />
                <Route path="/interviews" element={<InterviewsListPage />} />
                <Route path="/interviews/schedule" element={<ScheduleInterviewPage />} />
                <Route path="/interviews/:interviewId" element={<InterviewDetailPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings/profile" element={<ProfilePage />} />
                <Route path="/users" element={<UsersManagementPage />} />
              </Route>
            </Route>

            {/* Career Portal (public) */}
            <Route path="/careers" element={<PublicLayout />}>
              <Route index element={<CompanyLandingPage />} />
              <Route path="openings" element={<CareersListPage />} />
              <Route path="openings/:jobId" element={<JobDetailPortalPage />} />
              <Route path="openings/:jobId/apply" element={<ApplyPage />} />
              <Route path="status" element={<Navigate to="/careers?checkStatus=true" replace />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/careers" replace />} />
          </Routes>
        </BrowserRouter>
        <GlobalProgressBar />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}
