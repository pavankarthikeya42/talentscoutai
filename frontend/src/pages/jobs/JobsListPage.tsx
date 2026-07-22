import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Eye, Users, Briefcase, BarChart2, UserPlus, CalendarClock, Building2, MapPin, User } from 'lucide-react'
import { jobsApi, type Job } from '@/api/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { formatClosingLabel } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { JobForm, type JobFormData } from './_JobForm'

export function JobsListPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isManager = user?.role?.toLowerCase() === 'manager'
  const isHR = user?.role?.toLowerCase() === 'hr'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [deleteJobTitle, setDeleteJobTitle] = useState<string>('')
  const navigate = useNavigate()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const createMutation = useMutation({
    mutationFn: (data: JobFormData) =>
      jobsApi.create({
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
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      toast.success('Job created successfully')
      setIsCreateOpen(false)
      navigate(`/jobs/${res.data.id}`)
    },
    onError: () => toast.error('Failed to create job'),
    onSettled: () => setCreateLoading(false),
  })

  const onCreateSubmit = (data: JobFormData) => {
    setCreateLoading(true)
    createMutation.mutate(data)
  }

  const editMutation = useMutation({
    mutationFn: (data: JobFormData) =>
      jobsApi.update(editJob!.id, {
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
      toast.success('Job updated successfully')
      setEditJob(null)
    },
    onError: () => toast.error('Failed to update job'),
    onSettled: () => setEditLoading(false),
  })

  const onEditSubmit = (data: JobFormData) => {
    setEditLoading(true)
    editMutation.mutate(data)
  }


  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { status, page }],
    queryFn: () => jobsApi.list({ status: status === 'all' ? undefined : status, page, page_size: 20 }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Job deleted') },
    onError: () => toast.error('Failed to delete job'),
  })

  const jobs = data?.jobs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const filtered = search
    ? jobs.filter((j) =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.department?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs

  const openCount = jobs.filter((j) => j.status === 'open').length
  const totalVacancies = jobs.reduce((sum, j) => sum + (j.vacancies ?? 1), 0)
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicant_count ?? 0), 0)

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isHR ? 'View all openings and run AI screening' : `${data?.total ?? 0} total job postings`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Jobs', value: data?.total ?? 0, sub: 'all postings', Icon: Briefcase, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Open Roles', value: openCount, sub: 'accepting applicants', Icon: Users, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Vacancies', value: totalVacancies, sub: 'open positions', Icon: UserPlus, bg: 'bg-violet-50', color: 'text-violet-600' },
          { label: 'Applicants', value: totalApplicants, sub: 'across all jobs', Icon: BarChart2, bg: 'bg-amber-50', color: 'text-amber-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-none">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.bg} shrink-0`}>
                  <s.Icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description={isManager ? 'Create your first job posting to get started' : 'No job postings match your filters'}
          action={isManager ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Job
            </Button>
          ) : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Title', 'Department', 'Location', 'Status', 'Vacancies', 'Applicants', 'Career Deadline', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((job: Job) => {
                    const closing = formatClosingLabel(job.closing_date)
                    return (
                      <tr key={job.id} className="job-row group hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <Link to={`/jobs/${job.id}`} className="hover:text-blue-600 transition-colors">{job.title}</Link>
                            {job.emergency && (
                              <Badge variant="destructive" className="bg-rose-50 text-rose-600 hover:bg-rose-50 border-rose-200/50 text-[10px] px-1.5 py-0 font-bold">
                                Emergency
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                            {job.department && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {job.department}</span>}
                            {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                            {job.recruiter_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {job.recruiter_name}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500">{job.department ?? '—'}</td>
                        <td className="px-4 py-3.5 text-gray-500">{job.location ?? '—'}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={job.status} /></td>
                        <td className="px-4 py-3.5">
                          <Badge variant="secondary" className="font-semibold">{job.vacancies ?? 1}</Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="flex items-center gap-1 text-gray-600">
                            <Users className="h-3.5 w-3.5" />{job.applicant_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {closing ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                              <CalendarClock className="h-3 w-3" />{closing}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">No deadline</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild><Link to={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link></Button>
                            {isHR && (
                              <Button variant="ghost" size="icon" asChild title="Run AI Screening">
                                <Link to={`/jobs/${job.id}/screening`}><BarChart2 className="h-4 w-4 text-indigo-600" /></Link>
                              </Button>
                            )}
                            {isManager && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditJob(job)}
                                  title="Edit Job"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => {
                                    setDeleteJobId(job.id)
                                    setDeleteJobTitle(job.title)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      {/* Custom Delete Confirmation Dialog */}
      <Dialog open={!!deleteJobId} onOpenChange={(open) => !open && setDeleteJobId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Job Role
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-gray-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 font-semibold">{deleteJobTitle}</strong>? This action cannot be undone and will permanently remove the job description and all associated applicant screening data.
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
              onClick={() => {
                if (deleteJobId) {
                  deleteMutation.mutate(deleteJobId)
                  setDeleteJobId(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fixed bottom-right Create Job button — portal to body so fixed positioning works */}
      {isManager && createPortal(
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="fixed bottom-10 right-10 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border-0 rounded-xl px-5 h-12 gap-2 group cursor-pointer"
        >
          <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
          Create Job
        </Button>,
        document.body
      )}

      {/* Create Job Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                <DialogTitle className="text-2xl font-extrabold text-white tracking-tight">Create New Job</DialogTitle>
                <DialogDescription className="text-sm text-indigo-100 font-medium mt-1">
                  Configure the job description, requirements, and AI screening criteria.
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 sm:px-8 sm:pb-8">
            <JobForm loading={createLoading} submitLabel="Create Job" onSubmit={onCreateSubmit} />
          </div>

          {/* Premium Loading Overlay */}
          {createLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/75 backdrop-blur-sm rounded-2xl transition-all duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 shadow-md" />
                  <Briefcase className="absolute h-6 w-6 text-indigo-600 animate-pulse" />
                </div>
                <p className="text-base font-extrabold text-slate-900 tracking-tight animate-pulse mt-2">Posting Job...</p>
                <p className="text-xs font-semibold text-slate-500">Creating suitability matrices & rules</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editJob} onOpenChange={(open) => !open && setEditJob(null)}>
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
            {editJob && (
              <JobForm
                loading={editLoading}
                submitLabel="Update Job"
                defaultValues={{
                  title: editJob.title,
                  department: editJob.department,
                  location: editJob.location,
                  employment_type: editJob.employment_type,
                  description: editJob.description,
                  skills: editJob.requirements.skills,
                  min_experience_years: editJob.requirements.min_experience_years,
                  education: editJob.requirements.education,
                  certifications: editJob.requirements.certifications,
                  salary_min: editJob.salary_min,
                  salary_max: editJob.salary_max,
                  status: editJob.status,
                  skill_weight: editJob.screening_criteria.skill_weight,
                  experience_weight: editJob.screening_criteria.experience_weight,
                  education_weight: editJob.screening_criteria.education_weight,
                  certification_weight: editJob.screening_criteria.certification_weight,
                  vacancies: editJob.vacancies ?? 1,
                  closing_date: editJob.closing_date ? editJob.closing_date.slice(0, 10) : undefined,
                  emergency: editJob.emergency ?? false,
                  post_to_linkedin: editJob.posted_to_linkedin ?? false,
                  post_to_naukri: editJob.posted_to_naukri ?? false,
                }}
                onSubmit={onEditSubmit}
              />
            )}
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
