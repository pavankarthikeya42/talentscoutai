import { Link, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import AOS from 'aos'
import { MapPin, Briefcase, ArrowRight, UserPlus, CalendarClock } from 'lucide-react'
import { formatClosingLabel } from '@/lib/utils'
import { portalApi } from '@/api/portal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/shared/LoadingSpinner'

export function JobDetailPortalPage() {
  const { jobId } = useParams<{ jobId: string }>()

  useEffect(() => {
    window.scrollTo(0, 0)
    AOS.init({
      duration: 800,
      once: true,
    })
  }, [jobId])

  const { data: job, isLoading } = useQuery({
    queryKey: ['portal-job', jobId],
    queryFn: () => portalApi.getJob(jobId!).then((r) => r.data),
    enabled: !!jobId,
  })

  if (isLoading) return <div className="py-16 flex justify-center"><PageLoader /></div>
  if (!job) return <p className="text-center py-16 text-gray-500">Job not found</p>

  const req = job.requirements as { skills?: string[]; min_experience_years?: number; education?: string; certifications?: string[] }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8" data-aos="fade-down">
        <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
          {job.department && <Badge variant="secondary">{job.department}</Badge>}
          {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
          {job.employment_type && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.employment_type}</span>}
          <span className="flex items-center gap-1 text-indigo-600 font-medium"><UserPlus className="h-3.5 w-3.5" />{job.vacancies ?? 1} {(job.vacancies ?? 1) === 1 ? 'vacancy' : 'vacancies'}</span>
          {formatClosingLabel(job.closing_date) && (
            <span className="flex items-center gap-1 text-amber-600 font-medium"><CalendarClock className="h-3.5 w-3.5" />{formatClosingLabel(job.closing_date)}</span>
          )}
        </div>
        {(job.salary_min || job.salary_max) && (
          <p className="text-lg font-medium text-green-600 mt-3">₹{(job.salary_min ?? 0).toLocaleString()} – ₹{(job.salary_max ?? 0).toLocaleString()} / year</p>
        )}
      </div>

      <div className="prose max-w-none mb-8" data-aos="fade-up" data-aos-delay="100">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">About the Role</h2>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
      </div>

      {req && (
        <div className="mb-8 space-y-4" data-aos="fade-up" data-aos-delay="200">
          <h2 className="text-lg font-semibold text-gray-900">Requirements</h2>
          {req.skills && req.skills.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {req.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </div>
          )}
          {req.min_experience_years != null && (
            <p className="text-sm text-gray-700"><span className="font-medium">Experience:</span> {req.min_experience_years}+ years</p>
          )}
          {req.education && (
            <p className="text-sm text-gray-700"><span className="font-medium">Education:</span> {req.education}</p>
          )}
          {req.certifications && req.certifications.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {req.certifications.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3" data-aos="fade-up" data-aos-delay="250">
        <Button size="lg" asChild>
          <Link to={`/careers/openings/${jobId}/apply`}>
            Apply Now <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/careers/openings">Back to Jobs</Link>
        </Button>
      </div>
    </div>
  )
}
