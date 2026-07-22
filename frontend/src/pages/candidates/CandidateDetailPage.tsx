import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Download, Mail, Phone, MapPin, Calendar, Trash2, User,
  Sparkles, ChevronDown, ChevronUp, AlertTriangle, Star, Clock, Target
} from 'lucide-react'
import { candidatesApi } from '@/api/candidates'
import { screeningApi } from '@/api/screening'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogClose
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'


export function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => candidatesApi.get(candidateId!).then((r) => r.data),
    enabled: !!candidateId,
  })

  const { data: applications } = useQuery({
    queryKey: ['candidate-applications', candidateId],
    queryFn: () => screeningApi.getCandidateApplications(candidateId!).then((r) => r.data),
    enabled: !!candidateId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => candidatesApi.delete(candidateId!),
    onSuccess: () => {
      toast.success('Candidate deleted successfully')
      setIsDeleteDialogOpen(false)
      navigate('/candidates')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete candidate'
      toast.error(msg)
    },
  })

  if (isLoading) return <PageLoader />
  if (!candidate) return <p className="text-gray-500">Candidate not found</p>

  const appList = (applications as {
    application_id?: string
    job_id: string
    job_title?: string
    status: string
    recruiter_name?: string
  }[]) ?? []

  return (
    <div className="space-y-6 max-w-4xl page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{candidate.full_name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{candidate.email}</span>
            {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{candidate.phone}</span>}
            {candidate.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{candidate.location}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{candidate.total_experience_years} yrs exp.</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {candidate.resume_url && (
            <Button variant="outline" asChild>
              <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" /> Resume
              </a>
            </Button>
          )}
          {isHR && (
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Candidate
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900">Delete Candidate</DialogTitle>
                  <DialogDescription className="pt-2 text-sm text-gray-500 leading-relaxed">
                    Are you sure you want to delete <strong className="text-gray-900 font-semibold">{candidate.full_name}</strong>? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {candidate.summary && (
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-700 leading-relaxed">{candidate.summary}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Experience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {candidate.experience.length === 0
                ? <p className="text-sm text-gray-500">No experience data</p>
                : candidate.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-blue-200 pl-4">
                    <p className="font-medium text-gray-900">{exp.title}</p>
                    <p className="text-sm text-gray-600">{exp.company}</p>
                    <p className="text-xs text-gray-400">{exp.start_date} – {exp.end_date ?? 'Present'}</p>
                    {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                  </div>
                ))
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Education</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {candidate.education.length === 0
                ? <p className="text-sm text-gray-500">No education data</p>
                : candidate.education.map((edu, i) => (
                  <div key={i}>
                    <p className="font-medium text-gray-900">{edu.degree}</p>
                    <p className="text-sm text-gray-600">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </CardContent>
          </Card>

          {candidate.certifications.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Certifications</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.certifications.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {appList.length === 0 ? (
                <p className="text-sm text-gray-500">No applications</p>
              ) : (
                appList.map((app, i) => (
                  <div key={i} className="flex flex-col gap-2 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/jobs/${app.job_id}`} className="text-sm text-blue-600 hover:underline truncate">
                        {app.job_title ?? 'Job'}
                      </Link>
                      <StatusBadge status={app.status} />
                    </div>
                    {app.recruiter_name && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> Manager: {app.recruiter_name}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}