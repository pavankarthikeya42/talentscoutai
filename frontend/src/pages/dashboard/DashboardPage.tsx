import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, Users, FileText, Star, CalendarDays,
  Plus, Upload, MessageSquare, TrendingUp, Clock,
  UserCheck, ArrowRight, BarChart2, Zap, TrendingDown, Flame,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from 'recharts'
import { analyticsApi } from '@/api/analytics'
import { interviewsApi } from '@/api/interviews'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleInterviewModal } from '@/components/interviews/ScheduleInterviewModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { jobsApi } from '@/api/jobs'
import { JobForm, type JobFormData } from '../jobs/_JobForm'
import { toast } from 'sonner'

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']

const FUNNEL_STAGES = ['new', 'screened', 'shortlisted', 'interview', 'offered', 'hired']

function pct(n: number, d: number) {
  if (!d) return 0
  return Math.round((n / d) * 100)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

function getTimeBasedGreeting() {
  const now = new Date()
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const hour = istTime.getHours()
  
  if (hour >= 5 && hour < 12) return 'Good Morning'
  if (hour >= 12 && hour < 18) return 'Good Afternoon'
  return 'Good evening'
}

interface StatCardProps {
  title: string
  value: number | string
  sub?: string
  icon: React.ElementType
  iconBg: string
  to?: string
}

function StatCard({ title, value, sub, icon: Icon, iconBg, to }: StatCardProps) {
  const content = (
    <Card className={cn(
      "relative overflow-hidden bg-white/90 backdrop-blur-md shadow-sm group dashboard-card-glow",
      to ? "cursor-pointer" : ""
    )}>
      {/* Subtle bottom-right glow background */}
      <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-indigo-50/20 blur-xl group-hover:bg-indigo-50/35 transition-colors duration-300" />
      
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight transition-transform duration-300 group-hover:scale-[1.02] origin-left">
              {value}
            </p>
            {sub && <p className="text-[11px] text-slate-400 mt-2 font-medium truncate">{sub}</p>}
          </div>
          <div className={cn(
            "p-3 rounded-2xl shrink-0 transition-transform duration-350 group-hover:scale-110 shadow-sm",
            iconBg
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

interface JobRow {
  job_id: string
  title: string
  status: string
  department?: string
  total_applicants: number
  shortlisted_count: number
  interview_count: number
  hired_count: number
  avg_score?: number
  emergency?: boolean
}

export function DashboardPage() {
  const { user } = useAuth()
  const isManager = user?.role?.toLowerCase() === 'manager'
  const isHR = user?.role?.toLowerCase() === 'hr'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)

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
      qc.invalidateQueries({ queryKey: ['analytics'] })
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

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then((r) => r.data),
  })

  const { data: pipeline, isLoading: pipLoading } = useQuery({
    queryKey: ['analytics', 'pipeline'],
    queryFn: () => analyticsApi.pipeline().then((r) => r.data),
  })

  const { data: skills } = useQuery({
    queryKey: ['analytics', 'top-skills'],
    queryFn: () => analyticsApi.topSkills(10).then((r) => r.data),
  })

  const { data: timeData } = useQuery({
    queryKey: ['analytics', 'time-to-hire'],
    queryFn: () => analyticsApi.timeToHire().then((r) => r.data),
  })

  const { data: jobsAnalytics } = useQuery({
    queryKey: ['analytics', 'jobs-detail'],
    queryFn: () => analyticsApi.jobs().then((r) => r.data),
  })

  const { data: interviewsData } = useQuery({
    queryKey: ['interviews', 'upcoming', { interviewer_id: isManager ? user?.id : undefined }],
    queryFn: () =>
      interviewsApi
        .list({
          status: 'scheduled',
          interviewer_id: isManager ? user?.id : undefined,
          page: 1,
          page_size: 5,
        })
        .then((r) => r.data),
  })

  const { data: interviewStats } = useQuery({
    queryKey: ['analytics', 'interview-stats'],
    queryFn: () => analyticsApi.interviews().then((r) => r.data),
  })

  const handleNotify = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await interviewsApi.notifyManager(id)
      toast.success('Notification sent')
    } catch {
      toast.error('Failed to send notification')
    }
  }

  const pipelineData = (pipeline as { status: string; count: number }[] | undefined) ?? []
  const stageMap = Object.fromEntries(pipelineData.map((p) => [p.status, p.count]))
  const totalApps = pipelineData.reduce((s, p) => s + p.count, 0)

  const conversionSteps = FUNNEL_STAGES.map((stage, i, arr) => {
    let count = 0
    for (let j = i; j < arr.length; j++) {
      count += stageMap[arr[j]] ?? 0
    }
    return { stage, count }
  }).map((step, i, stepsArr) => {
    const count = step.count
    const prev = i === 0 ? totalApps : stepsArr[i - 1].count
    const rate = i === 0 ? 100 : pct(count, prev)
    const drop = i === 0 ? 0 : (prev - count)
    return { stage: step.stage, count, rate, drop, prev }
  })

  const skillsData = (skills as { skill: string; count: number }[] | undefined) ?? []

  const maxSkill = skillsData[0]?.count ?? 1
  const VIOLET = '#8b5cf6'
  const BLUE = '#3b82f6'
  const TEAL = '#14b8a6'

  const skillsBarData = useMemo(() => {
    return skillsData.slice(0, 10).map((s) => {
      const weight = s.count / maxSkill
      const tier = weight >= 0.65 ? 'Most Common' : weight >= 0.3 ? 'Common' : 'Less Common'
      const color = weight >= 0.65 ? VIOLET : weight >= 0.3 ? BLUE : TEAL
      return { ...s, tier, color, weight }
    })
  }, [skillsData, maxSkill])

  const skillTierCounts = useMemo(() => {
    const high = skillsBarData.filter((s) => s.tier === 'Most Common').length
    const growing = skillsBarData.filter((s) => s.tier === 'Common').length
    const emerging = skillsBarData.filter((s) => s.tier === 'Less Common').length
    return { high, growing, emerging }
  }, [skillsBarData])

  if (ovLoading || pipLoading) return <PageLoader />

  const topJobs = ((jobsAnalytics as JobRow[] | undefined) ?? [])
    .sort((a, b) => (b.total_applicants ?? 0) - (a.total_applicants ?? 0))
    .slice(0, 6)
  const upcomingInterviews = interviewsData?.interviews ?? []

  const hired = pipelineData.find((p) => p.status === 'hired')?.count ?? 0
  const shortlisted = pipelineData.find((p) => p.status === 'shortlisted')?.count ?? 0
  const scheduledInterviews = (interviewStats as { scheduled?: number } | undefined)?.scheduled ?? 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 tracking-tight">
            {getTimeBasedGreeting()}, {user?.full_name ? user.full_name.split(' ')[0] : 'Recruiter'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Today is {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stat Cards — Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Open Jobs"
          value={overview?.jobs?.open ?? 0}
          sub={`${overview?.jobs?.total ?? 0} total · ${overview?.jobs?.draft ?? 0} draft`}
          icon={Briefcase}
          iconBg="bg-gradient-to-tr from-blue-500 to-sky-400"
          to="/jobs"
        />
        <StatCard
          title="Candidates"
          value={overview?.total_candidates ?? 0}
          sub="in talent pool"
          icon={Users}
          iconBg="bg-gradient-to-tr from-emerald-500 to-teal-400"
          to="/candidates"
        />
        <StatCard
          title="Applications"
          value={overview?.total_applications ?? 0}
          sub={`${shortlisted} shortlisted`}
          icon={FileText}
          iconBg="bg-gradient-to-tr from-indigo-500 to-violet-400"
        />
        <StatCard
          title="Avg. Score"
          value={overview?.average_suitability_score ? Number(overview.average_suitability_score).toFixed(1) : '—'}
          sub="suitability score"
          icon={Star}
          iconBg="bg-gradient-to-tr from-amber-500 to-yellow-400"
        />
        <StatCard
          title="Interviews"
          value={scheduledInterviews}
          sub="scheduled"
          icon={CalendarDays}
          iconBg="bg-gradient-to-tr from-pink-500 to-rose-400"
          to="/interviews"
        />
        <StatCard
          title="Hired"
          value={hired}
          sub="all time"
          icon={UserCheck}
          iconBg="bg-gradient-to-tr from-teal-500 to-cyan-400"
        />
      </div>

      {/* Time-to-Hire KPIs */}
      {timeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Average days to Screen', value: (timeData as { avg_days_to_screen?: number }).avg_days_to_screen, icon: Zap, color: 'text-blue-600 bg-blue-50/70 border border-blue-100/50' },
            { label: 'Average days to Interview', value: (timeData as { avg_days_to_interview?: number }).avg_days_to_interview, icon: CalendarDays, color: 'text-violet-600 bg-violet-50/70 border border-violet-100/50' },
            { label: 'Average days to Hire', value: (timeData as { avg_days_to_hire?: number }).avg_days_to_hire, icon: Clock, color: 'text-teal-600 bg-teal-50/70 border border-teal-100/50' },
          ].map((t) => (
            <Card key={t.label} className="bg-white/80 backdrop-blur-sm group dashboard-card-glow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-105", t.color)}>
                    <t.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {t.value != null ? `${Number(t.value).toFixed(1)}d` : '—'}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{t.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pipeline */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 dashboard-card-glow overflow-visible">
          <CardHeader className="pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between bg-slate-50/30">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-indigo-600" />
                </div>
                Recruitment Pipeline
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">Candidate drop-off at each stage of the pipeline</p>
            </div>
            <div className="flex items-center gap-4">
              {totalApps > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-800 tracking-tight">{totalApps.toLocaleString()}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total Candidates</p>
                </div>
              )}
              {!isManager && (
                <Link to="/analytics" className="text-xs font-semibold text-indigo-650 hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors">
                  Full analytics <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-10">
            {totalApps === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No pipeline data yet</div>
            ) : (
              <div className="space-y-4 max-w-5xl mx-auto">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={conversionSteps} margin={{ top: 20, right: 30, left: -20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                      <filter id="funnel-shadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.25"/>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis 
                      dataKey="stage" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10}
                      tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="Candidates"
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#funnelGradient)" 
                      activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: '#4f46e5' }} 
                      filter="url(#funnel-shadow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-4 mt-4 border-t border-slate-100/80">
                  {conversionSteps.map((step, i) => (
                    <div key={step.stage} className="text-center p-3 rounded-xl bg-slate-50/50 border border-slate-100/80 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md hover:border-indigo-100 duration-300">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{step.stage}</p>
                      <p className="text-xl font-black text-slate-800 mt-1">{step.count}</p>
                      <div className="flex flex-col items-center mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${i === 0 ? 'bg-slate-200/50 text-slate-500' : step.rate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {i === 0 ? '100%' : `${step.rate}% Conv.`}
                        </span>
                        {i > 0 && (
                          <span className="text-[9px] font-semibold text-slate-400 mt-1">
                            -{step.drop} lost
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Performance + Upcoming Interviews */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top Jobs */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 dashboard-card-glow">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-indigo-500" />
                Jobs
              </CardTitle>
              <Link to="/jobs" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors">
                All jobs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400 px-6">
                No jobs yet.{' '}
                <Link to="/jobs?create=true" className="text-indigo-600 hover:underline font-medium">Create one</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topJobs.map((job) => (
                  <div key={job.job_id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/70 transition-all duration-200 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={`/jobs/${job.job_id}`} className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 truncate block transition-colors">
                          {job.title}
                        </Link>
                        {job.emergency && (
                          <Badge variant="destructive" className="bg-rose-50 text-rose-650 hover:bg-rose-50 border-rose-200/50 text-[10px] px-1.5 py-0 font-bold">
                            Emergency
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-1">{job.department ?? 'No department'}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 shrink-0">
                      <span className="flex items-center gap-1 hover:text-indigo-600 transition-colors" title="Applicants">
                        <Users className="h-3.5 w-3.5 text-slate-400" />{job.total_applicants}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600" title="Hired">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500" />{job.hired_count}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isHR && (
                        <Link to={`/jobs/${job.job_id}/screening`} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">
                          <BarChart2 className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 dashboard-card-glow">
          <CardHeader className="pb-3 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-indigo-500" />
                Upcoming Interviews
              </CardTitle>
              <Link to="/interviews" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors">
                All interviews <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingInterviews.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400 px-6">
                No scheduled interviews.{' '}
                <button onClick={() => setScheduleModalOpen(true)} className="text-indigo-650 hover:underline font-medium cursor-pointer">Schedule one</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingInterviews.map((iv) => (
                  <div key={iv.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/70 transition-all duration-200 group">
                    <Link to={`/interviews/${iv.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0 group-hover:scale-105 transition-transform duration-200">
                        <CalendarDays className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 truncate transition-colors">{iv.candidate_name ?? 'Candidate'}</p>
                        <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{iv.job_title ?? 'Job'}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <Badge variant="secondary" className="text-xs capitalize font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">{iv.interview_type}</Badge>
                        {iv.scheduled_at && (
                          <p className="text-[10px] font-semibold text-slate-500 mt-1.5 flex items-center justify-end gap-1">
                            <span>{new Date(iv.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            <span>·</span>
                            <span>{new Date(iv.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                        )}
                      </div>
                      {isHR && (
                        <Button size="sm" variant="outline" className="h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs px-3" onClick={(e) => handleNotify(iv.id, e)}>
                          Notify
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Skills */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 dashboard-card-glow">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-indigo-650" />
                </div>
                Top Skills in Talent Pool
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">Candidate count per skill · color-coded by frequency tier</p>
            </div>
            {skillsBarData.length > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                {[
                  { label: 'Most Common', dot: 'bg-violet-500' },
                  { label: 'Common',     dot: 'bg-blue-500'   },
                  { label: 'Less Common',    dot: 'bg-teal-500'   },
                ].map(t => (
                  <div key={t.label} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.dot} shadow-sm`} />
                    <span className="text-[10px] font-semibold text-slate-500">{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-5">
          {skillsBarData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Flame className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Upload resumes to see skills</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Horizontal bar rows */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {skillsBarData.map((skill, i) => {
                  const barWidth = Math.max(Math.round(skill.weight * 100), 6)
                  return (
                    <div key={skill.skill} className="group flex items-center gap-3">
                      {/* Rank */}
                      <span className="text-xs font-semibold text-slate-300 w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      {/* Skill name */}
                      <span className="text-xs font-semibold text-slate-700 w-24 truncate shrink-0" title={skill.skill}>
                        {skill.skill}
                      </span>
                      {/* Bar */}
                      <div className="flex-1 h-7 bg-slate-50/80 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-2.5"
                          style={{
                            width: `${barWidth}%`,
                            background: `linear-gradient(90deg, ${skill.color}22 0%, ${skill.color} 100%)`,
                          }}
                        >
                          {barWidth > 20 && (
                            <span className="text-[10px] font-bold text-white drop-shadow-sm">
                              {skill.count}
                            </span>
                          )}
                        </div>
                        {barWidth <= 20 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">
                            {skill.count}
                          </span>
                        )}
                      </div>
                      {/* Tier badge */}
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                        skill.tier === 'Most Common'
                          ? 'bg-violet-100 text-violet-700'
                          : skill.tier === 'Common'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-teal-100 text-teal-700'
                      }`}>
                        {skill.tier === 'Most Common' ? 'Most' : skill.tier === 'Less Common' ? 'Less' : skill.tier}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Footer tier summary */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100/80">
                {[
                  { label: 'Most Common', count: skillTierCounts.high, bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', sub: 'text-violet-400' },
                  { label: 'Common',     count: skillTierCounts.growing, bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   sub: 'text-blue-400'   },
                  { label: 'Less Common',    count: skillTierCounts.emerging, bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   sub: 'text-teal-400'   },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl ${c.bg} border ${c.border} px-3 py-2 text-center`}>
                    <p className={`text-xs font-bold ${c.text}`}>{c.label}</p>
                    <p className={`text-[11px] font-semibold ${c.sub} mt-0.5`}>{c.count} skills</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


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

      <ScheduleInterviewModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        applicationId={null}
      />
    </div>
  )
}

