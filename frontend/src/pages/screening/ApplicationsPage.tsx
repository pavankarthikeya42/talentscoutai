import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { screeningApi, type Application } from '@/api/screening'
import { jobsApi } from '@/api/jobs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { CalendarPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmailReviewModal } from '@/components/screening/EmailReviewModal'
import { ScheduleInterviewModal } from '@/components/interviews/ScheduleInterviewModal'

export function ApplicationsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null)
  const [emailReviewAppId, setEmailReviewAppId] = useState<string | null>(null)
  const [schedulingApp, setSchedulingApp] = useState<{
    id: string
    candidateName: string
    jobTitle: string
  } | null>(null)

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId!).then((r) => r.data),
    enabled: !!jobId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['applications', jobId, { status: statusFilter, page }],
    queryFn: () => screeningApi.getApplications(jobId!, { status: statusFilter === 'all' ? undefined : statusFilter, page, page_size: 20 }).then((r) => r.data),
    enabled: !!jobId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) => screeningApi.updateStatus(appId, status),
    onMutate: async ({ appId, status }) => {
      await qc.cancelQueries({ queryKey: ['applications', jobId] })
      const previousData = qc.getQueryData(['applications', jobId, { status: statusFilter, page }])
      qc.setQueryData(
        ['applications', jobId, { status: statusFilter, page }],
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            applications: old.applications.map((app: any) =>
              app.id === appId
                ? { ...app, status, automated_email_sent: false }
                : app
            ),
          }
        }
      )
      return { previousData }
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        qc.setQueryData(['applications', jobId, { status: statusFilter, page }], context.previousData)
      }
      toast.error('Update failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications', jobId] })
      toast.success('Status updated')
    },
  })

  const sendEmailMutation = useMutation({
    mutationFn: (appId: string) => screeningApi.sendAutomatedEmail(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications', jobId] })
      toast.success('Automated email sent to candidate')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to send automated email'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (appId: string) => screeningApi.deleteApplication(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications', jobId] })
      toast.success('Application deleted successfully')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete application'
      toast.error(msg)
    },
  })

  if (isLoading) return <PageLoader />
  const apps = data?.applications ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">{job?.title} · {data?.total ?? 0} total</p>
        </div>
      </div>

      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {['new','screened','shortlisted','interview','offered','hired','rejected'].map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {apps.length === 0 ? (
        <EmptyState title="No applications" description="Run AI screening to populate applications" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Applied</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app: Application) => (
                    <tr key={app.id} className="border-b border-gray-50 table-row-hover">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link to={`/candidates/${app.candidate_id}`} className="hover:text-blue-600">{app.candidate_name ?? '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{app.candidate_email ?? '—'}</td>
                      <td className="px-4 py-3">
                        {app.suitability_score != null ? (
                          <span className={`font-medium ${app.suitability_score >= 70 ? 'text-green-600' : app.suitability_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {app.suitability_score.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isHR ? (
                            <Select value={app.status} onValueChange={(v) => statusMutation.mutate({ appId: app.id, status: v })}>
                              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['new','screened','shortlisted','interview','offered','hired','rejected'].map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusBadge status={app.status} />
                          )}

                          {isHR && (
                            (app.suitability_score ?? 0) >= 60 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={() => {
                                  setSchedulingApp({
                                    id: app.id,
                                    candidateName: app.candidate_name ?? '',
                                    jobTitle: job?.title ?? '',
                                  })
                                }}
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                                Schedule
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-300">Score too low</span>
                            )
                          )}

                          {isHR && ['shortlisted', 'interview', 'offered', 'hired', 'rejected'].includes(app.status) && (
                            <div className="flex items-center gap-1.5">
                              {app.automated_email_sent && (
                                <Badge variant="secondary" className="h-7 bg-green-50 text-green-700 border-green-200">
                                  Sent
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-7 gap-1.5 text-xs ${
                                  app.automated_email_sent
                                    ? 'text-gray-600 border-gray-200 hover:bg-gray-50'
                                    : 'text-purple-600 border-purple-200 hover:bg-purple-50'
                                }`}
                                onClick={() => setEmailReviewAppId(app.id)}
                              >
                                {app.automated_email_sent ? 'Resend' : 'Send Email'}
                              </Button>
                            </div>
                          )}

                          {isHR && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setDeletingAppId(app.id)}
                              disabled={deleteMutation.isPending}
                              title="Delete Application"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 20 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {((page - 1) * 20 + 1).toLocaleString()}–{Math.min(page * 20, total).toLocaleString()} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <PaginationBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PaginationBtn>
                  {paginationRange(page, totalPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="text-xs text-gray-400 px-1">…</span>
                    ) : (
                      <PaginationBtn key={p} active={page === p} onClick={() => setPage(Number(p))}>
                        {p}
                      </PaginationBtn>
                    )
                  )}
                  <PaginationBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</PaginationBtn>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={deletingAppId !== null} onOpenChange={(open) => !open && setDeletingAppId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <span className="text-red-500 font-semibold">⚠️ Delete Application</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete this application? This action is permanent and will also remove all scheduled interviews associated with this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeletingAppId(null)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
              onClick={() => {
                if (deletingAppId) {
                  deleteMutation.mutate(deletingAppId, {
                    onSuccess: () => setDeletingAppId(null)
                  })
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmailReviewModal
        appId={emailReviewAppId}
        isOpen={emailReviewAppId !== null}
        onClose={() => setEmailReviewAppId(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['applications', jobId] })}
      />

      <ScheduleInterviewModal
        isOpen={schedulingApp !== null}
        onClose={() => setSchedulingApp(null)}
        applicationId={schedulingApp?.id ?? null}
        candidateName={schedulingApp?.candidateName}
        jobTitle={schedulingApp?.jobTitle}
      />
    </div>
  )
}

// ── Pagination helpers ─────────────────────────────────────────────────────────

function PaginationBtn({
  children, onClick, disabled, active,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-7 min-w-7 px-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
    >
      {children}
    </button>
  )
}

function paginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
