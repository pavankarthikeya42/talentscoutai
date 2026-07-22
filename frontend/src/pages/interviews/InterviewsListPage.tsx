import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { interviewsApi } from '@/api/interviews'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function InterviewsListPage() {
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const isManager = user?.role?.toLowerCase() === 'manager'
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['interviews', { status, page, interviewer_id: isManager ? user?.id : undefined }],
    queryFn: () =>
      interviewsApi
        .list({
          status: status === 'all' ? undefined : status,
          interviewer_id: isManager ? user?.id : undefined,
          page,
          page_size: 20,
        })
        .then((r) => r.data),
  })

  if (isLoading) return <PageLoader />
  const interviews = data?.interviews ?? []

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total ?? 0} total</p>
        </div>
      </div>

      <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {interviews.length === 0 ? (
        <EmptyState title="No interviews scheduled" description="Schedule an interview for a shortlisted candidate" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Candidate</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Job</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Interviewer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Round</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Scheduled</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Rating</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => (
                    <tr key={iv.id} className="border-b border-indigo-50 hover:bg-indigo-50/30 transition-all duration-200 group">
                      <td className="px-4 py-3 font-medium text-gray-900">{iv.candidate_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 truncate max-w-32">{iv.job_title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 truncate max-w-32">{iv.interviewer_name ?? '—'}</td>
                      <td className="px-4 py-3"><Badge variant="secondary">{iv.interview_type}</Badge></td>
                      <td className="px-4 py-3 text-gray-500">Round {iv.round_number}</td>
                      <td className="px-4 py-3 text-gray-500">{iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={iv.status} /></td>
                      <td className="px-4 py-3">
                        {iv.rating ? (
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />{iv.rating}/5</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" asChild><Link to={`/interviews/${iv.id}`}>View</Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.total > 20 && (
              <div className="flex justify-center gap-2 p-4">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-gray-500 self-center">Page {page}</span>
                <Button variant="outline" size="sm" disabled={interviews.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
