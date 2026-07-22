import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { JobForm, type JobFormData } from './_JobForm'
import { toast } from 'sonner'
import { MapPin, Briefcase, CalendarClock, Building2, User, Pencil, Users, BarChart2, Clock } from 'lucide-react'
import { formatClosingLabel } from '@/lib/utils'
import { jobsApi } from '@/api/jobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ScoreBar } from '@/components/shared/ScoreBar'
import { useAuth } from '@/contexts/AuthContext'

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const isManager = user?.role?.toLowerCase() === 'manager'
  const isHR = user?.role?.toLowerCase() === 'hr'
  const qc = useQueryClient()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId!).then((r) => r.data),
    enabled: !!jobId,
  })

  const editMutation = useMutation({
    mutationFn: (data: JobFormData) =>
      jobsApi.update(jobId!, {
        title: data.title,
        department: data.department,
        location: data.location,
        employment_type: data.employment_type,
        description: data.description,
        requirements: {
          skills: data.skills,
          min_experience_years: data.min_experience_years,
          education: data.education ?? '',
          certifications: data.certifications,
        },
        salary_min: data.salary_min,
        salary_max: data.salary_max,
        status: data.status,
        screening_criteria: {
          skill_weight: data.skill_weight,
          experience_weight: data.experience_weight,
          education_weight: data.education_weight,
          certification_weight: data.certification_weight,
        },
        vacancies: data.vacancies,
        closing_date: data.closing_date || undefined,
        emergency: data.emergency,
        post_to_linkedin: data.post_to_linkedin,
        post_to_naukri: data.post_to_naukri,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['job', jobId] })
      toast.success('Job updated successfully')
      setIsEditOpen(false)
    },
    onError: () => toast.error('Failed to update job'),
    onSettled: () => setEditLoading(false),
  })

  const onEditSubmit = (data: JobFormData) => {
    setEditLoading(true)
    editMutation.mutate(data)
  }

  if (isLoading) return <PageLoader />
  if (!job) return <p className="text-gray-500">Job not found</p>

  return (
    <>
      <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
            {job.department && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {job.department}</span>}
            {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>}
            {job.employment_type && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.employment_type}</span>}
            {job.salary_min && job.salary_max && <span className="flex items-center gap-1.5"> ₹{job.salary_min.toLocaleString()} - ₹{job.salary_max.toLocaleString()}</span>}
            {job.recruiter_name && <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> Posted by: {job.recruiter_name}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            {formatClosingLabel(job.closing_date) && (
              <span className="flex items-center gap-1 text-sm text-amber-600"><CalendarClock className="h-3.5 w-3.5" />{formatClosingLabel(job.closing_date)}</span>
            )}
            {job.posted_to_linkedin && (
              <Badge className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white font-medium text-xs select-none">
                🔗 Posted on LinkedIn
              </Badge>
            )}
            {job.posted_to_naukri && (
              <Badge className="bg-[#E96125] hover:bg-[#E96125]/90 text-white font-medium text-xs select-none">
                🔗 Posted on Naukri
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isManager && (
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {isHR && (
            <Button asChild><Link to={`/jobs/${jobId}/screening`}><BarChart2 className="h-4 w-4" />Screen Candidates</Link></Button>
          )}
          <Button variant="outline" asChild><Link to={`/jobs/${jobId}/applications`}><Users className="h-4 w-4" />Applications ({job.applicant_count})</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {job.requirements.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requirements.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Min Experience</p>
                  <p className="font-medium">{job.requirements.min_experience_years}+ years</p>
                </div>
                {job.requirements.education && (
                  <div>
                    <p className="text-gray-500">Education</p>
                    <p className="font-medium">{job.requirements.education}</p>
                  </div>
                )}
              </div>
              {job.requirements.certifications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requirements.certifications.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Salary Range</CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-700">
              {job.salary_min || job.salary_max
                ? `₹${(job.salary_min ?? 0).toLocaleString()} – ₹${(job.salary_max ?? 0).toLocaleString()}`
                : 'Not specified'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screening Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScoreBar label="Skills" score={job.screening_criteria.skill_weight} />
              <ScoreBar label="Experience" score={job.screening_criteria.experience_weight} />
              <ScoreBar label="Education" score={job.screening_criteria.education_weight} />
              <ScoreBar label="Certifications" score={job.screening_criteria.certification_weight} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Created {new Date(job.created_at).toLocaleDateString()}</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Updated {new Date(job.updated_at).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

      {/* Edit Job Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 bg-slate-50/50 border border-slate-100 shadow-2xl premium-job-dialog">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-8 sm:px-8 rounded-t-2xl">
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            {/* Abstract light blobs */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute -bottom-10 left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/10 shadow-sm shrink-0">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-extrabold text-white tracking-tight">Edit Job Posting</DialogTitle>
                <DialogDescription className="text-sm text-indigo-100 font-medium mt-1">
                  Update the job details, requirements, and screening criteria.
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 sm:px-8 sm:pb-8">
            <JobForm
              loading={editLoading}
              submitLabel="Update Job"
              defaultValues={{
                title: job.title,
                department: job.department,
                location: job.location,
                employment_type: job.employment_type,
                description: job.description,
                skills: job.requirements.skills,
                min_experience_years: job.requirements.min_experience_years,
                education: job.requirements.education,
                certifications: job.requirements.certifications,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                status: job.status,
                skill_weight: job.screening_criteria.skill_weight,
                experience_weight: job.screening_criteria.experience_weight,
                education_weight: job.screening_criteria.education_weight,
                certification_weight: job.screening_criteria.certification_weight,
                vacancies: job.vacancies ?? 1,
                closing_date: job.closing_date ? job.closing_date.slice(0, 10) : undefined,
                emergency: job.emergency ?? false,
                post_to_linkedin: job.posted_to_linkedin ?? false,
                post_to_naukri: job.posted_to_naukri ?? false,
              }}
              onSubmit={onEditSubmit}
            />
          </div>

          {/* Premium Loading Overlay */}
          {editLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/75 backdrop-blur-sm rounded-2xl transition-all duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 shadow-md" />
                  <Briefcase className="absolute h-6 w-6 text-indigo-600 animate-pulse" />
                </div>
                <p className="text-base font-extrabold text-slate-900 tracking-tight animate-pulse mt-2">Updating Job...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
