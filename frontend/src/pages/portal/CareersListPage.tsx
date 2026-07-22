import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AOS from 'aos'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Briefcase, ArrowRight, UserPlus, CalendarClock } from 'lucide-react'
import { portalApi, type PortalJob } from '@/api/portal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatClosingLabel } from '@/lib/utils'

export function CareersListPage() {
  const [search, setSearch] = useState('')

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    })
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['portal-jobs'],
    queryFn: () => portalApi.getJobs().then((r) => r.data),
  })

  if (isLoading) return <div className="py-16 flex justify-center"><PageLoader /></div>

  const jobs = (data?.jobs ?? []).filter((j: PortalJob) =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.department?.toLowerCase().includes(search.toLowerCase())
  )

  const totalVacancies = (data?.jobs ?? []).reduce((sum: number, j: PortalJob) => sum + (j.vacancies ?? 1), 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-8 page-enter">
      <div className="text-center" data-aos="fade-down">
        <h1 className="text-3xl font-bold text-gray-900">Open Positions</h1>
        <p className="text-gray-500 mt-2">{data?.total_openings ?? 0} roles · {totalVacancies} vacancies at {data?.company ?? 'Motivity Labs'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto" data-aos="fade-up" data-aos-delay="100">
        {[
          { label: 'Open Roles', value: data?.total_openings ?? 0 },
          { label: 'Total Vacancies', value: totalVacancies },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative" data-aos="fade-up" data-aos-delay="150">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input placeholder="Search jobs by title or department…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-12 text-base" />
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No openings found" description="Check back later for new opportunities" />
      ) : (
        <div className="space-y-3">
          {jobs.map((job: PortalJob, idx: number) => {
            const closing = formatClosingLabel(job.closing_date)
            return (
              <Card key={job.id} data-aos="fade-up" data-aos-delay={(idx + 1) * 50} className="group hover:border-indigo-200 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 text-lg">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        {job.department && <Badge variant="secondary">{job.department}</Badge>}
                        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                        {job.employment_type && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.employment_type}</span>}
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <UserPlus className="h-3.5 w-3.5" />{job.vacancies ?? 1} {(job.vacancies ?? 1) === 1 ? 'vacancy' : 'vacancies'}
                        </span>
                        {closing && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <CalendarClock className="h-3.5 w-3.5" />{closing}
                          </span>
                        )}
                      </div>
                      {(job.salary_min || job.salary_max) && (
                        <p className="text-sm font-medium text-emerald-600 mt-2">
                          ₹{(job.salary_min ?? 0).toLocaleString()} – ₹{(job.salary_max ?? 0).toLocaleString()} / year
                        </p>
                      )}
                    </div>
                    <Button asChild className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600">
                      <Link to={`/careers/openings/${job.id}`}>
                        Apply <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
