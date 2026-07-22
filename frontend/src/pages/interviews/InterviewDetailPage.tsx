import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interviewsApi, type RoundRecommendationResponse } from '@/api/interviews'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  Star, RefreshCw, Clock, User, Sparkles,
  ChevronDown, ChevronUp, Target, AlertTriangle,
  TrendingUp, TrendingDown, FileText, Trash2
} from 'lucide-react'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogClose
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

const complexityColor = (complexity: string) => {
  switch (complexity?.toLowerCase()) {
    case 'basic': return 'bg-green-100 text-green-700 border-green-200'
    case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'advanced': return 'bg-red-100 text-red-700 border-red-200'
    case 'standard': return 'bg-gray-100 text-gray-700 border-gray-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const roundIcon = (roundNumber: number) => {
  const icons = ['①', '②', '③']
  return icons[roundNumber - 1] ?? roundNumber
}

export function InterviewDetailPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const isManager = user?.role?.toLowerCase() === 'manager'
  const qc = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Round recommendation state
  const [roundData, setRoundData] = useState<RoundRecommendationResponse | null>(null)
  const [roundsLoading, setRoundsLoading] = useState(false)
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  const handleStartEdit = () => {
    setFeedback(interview?.feedback ?? '')
    setRating(interview?.rating ?? 0)
    setIsEditing(true)
  }

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId!).then((r) => r.data),
    enabled: !!interviewId,
  })

  const feedbackMutation = useMutation({
    mutationFn: () => interviewsApi.submitFeedback(interviewId!, feedback, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interview', interviewId] })
      toast.success('Feedback submitted')
      setSubmittingFeedback(false)
      setIsEditing(false)
    },
    onError: () => toast.error('Failed to submit feedback'),
    onSettled: () => setSubmittingFeedback(false),
  })

  const regenMutation = useMutation({
    mutationFn: () => interviewsApi.regenerateQuestions(interviewId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interview', interviewId] })
      toast.success('Questions regenerated')
    },
    onError: () => toast.error('Failed to regenerate questions'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => interviewsApi.delete(interviewId!),
    onSuccess: () => {
      toast.success('Interview cancelled and deleted successfully')
      setIsDeleteDialogOpen(false)
      navigate('/interviews')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to cancel/delete interview'
      toast.error(msg)
    },
  })

  const handleRecommendRounds = async () => {
    if (!interview?.application_id) {
      toast.error('No application linked to this interview')
      return
    }
    setRoundData(null)
    setExpandedRound(null)
    setRoundsLoading(true)
    try {
      const res = await interviewsApi.recommendRounds(interview.application_id)
      if (res.data && res.data.rounds) {
        setRoundData(res.data)
      } else {
        toast.error('Unexpected response from server')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed to generate round recommendations'
      toast.error(msg)
    } finally {
      setRoundsLoading(false)
    }
  }

  if (isLoading) return <PageLoader />
  if (!interview) return <p className="text-gray-500">Interview not found</p>

  const difficultyColors: Record<string, string> = {
    easy: 'text-green-600',
    medium: 'text-yellow-600',
    hard: 'text-red-500'
  }

  return (
    <div className="space-y-6 max-w-4xl page-enter">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Detail</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {interview.candidate_name && (
              <span className="text-sm text-gray-600 font-medium">{interview.candidate_name}</span>
            )}
            {interview.job_title && (
              <span className="text-sm text-gray-500">· {interview.job_title}</span>
            )}
            <StatusBadge status={interview.status} />
            <Badge variant="secondary">{interview.interview_type}</Badge>
            <span className="text-sm text-gray-500">Round {interview.round_number}</span>
          </div>
          {interview.scheduled_at && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(interview.scheduled_at).toLocaleString()} · {interview.duration_minutes} min
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Recommend Rounds Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecommendRounds}
            disabled={roundsLoading}
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Sparkles className={`h-4 w-4 mr-1 ${roundsLoading ? 'animate-pulse' : ''}`} />
            {roundsLoading ? 'Generating...' : 'Recommend Rounds'}
          </Button>
          {isHR && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => regenMutation.mutate()}
                disabled={regenMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${regenMutation.isPending ? 'animate-spin' : ''}`} />
                Regenerate Questions
              </Button>
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Cancel Interview
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">Cancel Interview</DialogTitle>
                    <DialogDescription className="pt-2 text-sm text-gray-500 leading-relaxed">
                      Are you sure you want to cancel and delete the scheduled interview with{' '}
                      <strong className="text-gray-900 font-semibold">{interview.candidate_name || 'this candidate'}</strong>{' '}
                      for the position <strong className="text-gray-900 font-semibold">'{interview.job_title}'</strong>?
                      The assigned manager will receive a cancellation notification. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">Keep Interview</Button>
                    </DialogClose>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleteMutation.isPending ? 'Cancelling...' : 'Cancel Interview'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* ── AI ROUND RECOMMENDATION ── */}
      {roundData && (
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Sparkles className="h-5 w-5" />
                AI Interview Round Plan
              </CardTitle>
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 capitalize text-sm px-3 py-1">
                {roundData.experience_level}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">

            {/* ── Candidate Profile Summary ── */}
            {roundData.interview_summary && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5" />
                  Candidate Profile Summary
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{roundData.interview_summary}</p>
              </div>
            )}

            {/* ── Strengths & Weaknesses ── */}
            {((roundData.candidate_strengths?.length > 0) || (roundData.candidate_weaknesses?.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Strengths */}
                {roundData.candidate_strengths?.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Candidate Strengths
                    </p>
                    <ul className="space-y-2">
                      {roundData.candidate_strengths.map((s, i) => (
                        <li key={i} className="text-xs">
                          <span className="font-semibold text-green-800">{s.area}</span>
                          <span className="text-green-700"> — {s.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {roundData.candidate_weaknesses?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Areas to Watch
                    </p>
                    <ul className="space-y-2">
                      {roundData.candidate_weaknesses.map((w, i) => (
                        <li key={i} className="text-xs">
                          <span className="font-semibold text-red-800">{w.area}</span>
                          <span className="text-red-700"> — {w.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Recruiter Evaluation Focus ── */}
            {roundData.evaluation_focus && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Recruiter Evaluation Focus
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">{roundData.evaluation_focus}</p>
              </div>
            )}

            {/* ── Strengths to Probe ── */}
            {roundData.strengths_to_probe?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Strengths to Probe in Interview
                </p>
                <div className="flex flex-wrap gap-1">
                  {roundData.strengths_to_probe.map((s) => (
                    <Badge key={s} className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* ── 3 Rounds ── */}
            {roundData.rounds.map((round) => (
              <div key={round.round_number} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpandedRound(expandedRound === round.round_number ? null : round.round_number)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-indigo-600">{roundIcon(round.round_number)}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{round.round_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${complexityColor(round.complexity)}`}>
                          {round.complexity}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{round.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedRound === round.round_number
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-400" />
                  }
                </button>

                {expandedRound === round.round_number && (
                  <div className="p-4 space-y-3 bg-gray-50 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> Focus Areas
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {round.focus_areas.map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Key Topics
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {round.key_topics.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">What to Assess</p>
                      <p className="text-xs text-blue-800 leading-relaxed">{round.what_to_assess}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Tips for Interviewer</p>
                      <p className="text-xs text-purple-800 leading-relaxed">{round.tips_for_interviewer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

          </CardContent>
        </Card>
      )}

      {/* AI Suggested Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI Suggested Questions ({interview.ai_suggested_questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interview.ai_suggested_questions.length === 0 ? (
            <p className="text-sm text-gray-500">No questions generated yet.</p>
          ) : (
            interview.ai_suggested_questions.map((q, i) => (
              <div key={i} className="border border-indigo-100 rounded-xl p-4 space-y-1.5 bg-white/70">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Q{i + 1}</span>
                  <Badge variant="secondary" className="text-xs">{q.category}</Badge>
                  <span className={`text-xs font-medium ${difficultyColors[q.difficulty] ?? ''}`}>
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">{q.question}</p>
                {q.what_to_look_for && (
                  <p className="text-xs text-gray-500 italic">Look for: {q.what_to_look_for}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Feedback */}
      {(interview.status !== 'completed' || isEditing) ? (
        isManager ? (
          <Card>
            <CardHeader><CardTitle>{isEditing ? 'Edit Feedback' : 'Submit Feedback'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      className="focus:outline-none"
                    >
                      <Star className={`h-7 w-7 transition-colors ${s <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-gray-600 self-center">{rating}/5</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Feedback *</Label>
                <Textarea
                  placeholder="Describe the candidate's performance, strengths, areas for improvement…"
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => { setSubmittingFeedback(true); feedbackMutation.mutate() }}
                  disabled={!feedback || rating === 0 || submittingFeedback}
                >
                  {submittingFeedback ? 'Saving…' : 'Submit Feedback'}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={submittingFeedback}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-sm text-slate-500">
              Feedback submission is restricted to Managers.
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Feedback</CardTitle>
            {isManager && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                Edit Feedback
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <User className="h-4 w-4" /> Interviewer
              </span>
              <span className="font-medium text-gray-900">
                {interview.interviewer_name || 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Rating:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= (interview.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-600">{interview.rating}/5</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.feedback}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}