import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { screeningApi, type ScreeningResult } from '@/api/screening'
import { jobsApi } from '@/api/jobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ScoreBar } from '@/components/shared/ScoreBar'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

function ScoreBreakdownPanel({ result }: { result: ScreeningResult }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" className="flex items-center gap-1 text-xs text-blue-600 hover:underline" onClick={() => setOpen(!open)}>
        Score Breakdown {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <ScoreBar label="Skills" score={result.score_breakdown.skill_score} />
          <ScoreBar label="Experience" score={result.score_breakdown.experience_score} />
          <ScoreBar label="Education" score={result.score_breakdown.education_score} />
          <ScoreBar label="Certifications" score={result.score_breakdown.certification_score} />
          <ScoreBar label="Semantic Match" score={result.score_breakdown.semantic_score} />
          {result.score_breakdown.reasoning && (
            <p className="text-xs text-gray-600 border-t border-gray-200 pt-2">{result.score_breakdown.reasoning}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ScreeningPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'

  if (!isHR) {
    return <Navigate to={`/jobs/${jobId}`} replace />
  }

  const qc = useQueryClient()
  const [rankings, setRankings] = useState<ScreeningResult[] | null>(null)
  const [screening, setScreening] = useState(false)

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId!).then((r) => r.data),
    enabled: !!jobId,
  })

  const screenMutation = useMutation({
    mutationFn: () => screeningApi.screenJob(jobId!, 20),
    onSuccess: (res) => { setRankings(res.data.rankings); toast.success(`Screened ${res.data.total_screened} candidates`) },
    onError: () => toast.error('Screening failed'),
    onSettled: () => setScreening(false),
  })

  const statusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) => screeningApi.updateStatus(appId, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications', jobId] }); toast.success('Status updated') },
    onError: () => toast.error('Failed to update status'),
  })


  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screening</h1>
          <p className="text-sm text-gray-500 mt-1">{job?.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to={`/jobs/${jobId}/applications`}>View Applications</Link></Button>
          <Button onClick={() => { setScreening(true); screenMutation.mutate() }} disabled={screening}>
            <Zap className="h-4 w-4" />{screening ? 'Screening…' : 'Run AI Screening'}
          </Button>
        </div>
      </div>

      {!rankings ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-gray-700">Run AI Screening to rank candidates</p>
            <p className="text-sm text-gray-500 mt-1">Uses vector similarity + Gemini AI scoring to rank all candidates against this job</p>
          </CardContent>
        </Card>
      ) : rankings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500">No candidates to screen. Upload resumes first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rankings.map((result, i) => (
            <Card key={result.application_id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/candidates/${result.candidate_id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {result.candidate_name}
                      </Link>
                      <span className="text-sm text-gray-500">{result.candidate_email}</span>
                      <StatusBadge status={result.status} />
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Score:</span>
                        <span className={`text-sm font-bold ${result.suitability_score >= 70 ? 'text-green-600' : result.suitability_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {result.suitability_score.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 max-w-32">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${result.suitability_score}%` }} />
                      </div>
                    </div>

                    {result.ai_summary && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{result.ai_summary}</p>
                    )}

                    <div className="mt-2">
                      <ScoreBreakdownPanel result={result} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Select value={result.status} onValueChange={(v) => statusMutation.mutate({ appId: result.application_id, status: v })}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['new','screened','shortlisted','interview','offered','hired','rejected'].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
