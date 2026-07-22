import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, ComposedChart, ScatterChart, Scatter, ZAxis,
  LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Trophy,
  CalendarDays, Star, Percent, ArrowRight,
  Flame, Clock, Users,
} from 'lucide-react'
import { analyticsApi } from '@/api/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoader } from '@/components/shared/LoadingSpinner'

// ── palette ────────────────────────────────────────────────────────────────────
const BLUE   = '#3b82f6'
const GREEN  = '#22c55e'
const AMBER  = '#f59e0b'
const RED    = '#ef4444'
const VIOLET = '#8b5cf6'
const TEAL   = '#14b8a6'
const PINK   = '#ec4899'
const COLORS = [BLUE, GREEN, AMBER, RED, VIOLET, TEAL, PINK, '#f97316']

// ── stage order for funnel ──────────────────────────────────────────────────
const FUNNEL_STAGES = ['new', 'screened', 'shortlisted', 'interview', 'offered', 'hired']

// ── helpers ────────────────────────────────────────────────────────────────────
function pct(n: number, d: number) {
  if (!d) return 0
  return Math.round((n / d) * 100)
}

// ── glassmorphism card class ───────────────────────────────────────────────────
const glassCard = 'bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-lg shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/15 hover:border-indigo-100/80 transition-all duration-300 rounded-xl overflow-hidden'

// ── stat card with fixed identity color (like dashboard) ───────────────────────
function StatRateCard({
  label, value, sub, icon: Icon, tintBg, iconBg,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  tintBg: string
  iconBg: string
}) {
  return (
    <div className={`${tintBg} rounded-xl border border-slate-100/60 p-5 flex items-start justify-between transition-all duration-300 hover:shadow-md`}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`h-11 w-11 rounded-full ${iconBg} flex items-center justify-center shadow-lg shrink-0 ml-3`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  )
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

// ── main ───────────────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const [deptSort, setDeptSort] = useState<'hire_rate' | 'score' | 'volume'>('hire_rate')

  // ── queries ──────────────────────────────────────────────────────────────────
  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['analytics', 'pipeline'],
    queryFn: () => analyticsApi.pipeline().then(r => r.data),
  })
  const { data: interviewData } = useQuery({
    queryKey: ['analytics', 'interviews'],
    queryFn: () => analyticsApi.interviews().then(r => r.data),
  })
  const { data: jobsData } = useQuery({
    queryKey: ['analytics', 'jobs-detail'],
    queryFn: () => analyticsApi.jobs().then(r => r.data),
  })
  const { data: deptData } = useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: () => analyticsApi.departments().then(r => r.data),
  })
  const { data: scoreData } = useQuery({
    queryKey: ['analytics', 'score-dist'],
    queryFn: () => analyticsApi.scoreDistribution().then(r => r.data),
  })
  const { data: skillsData } = useQuery({
    queryKey: ['analytics', 'skills'],
    queryFn: () => analyticsApi.topSkills(20).then(r => r.data),
  })
  const { data: timeData } = useQuery({
    queryKey: ['analytics', 'time'],
    queryFn: () => analyticsApi.timeToHire().then(r => r.data),
  })

  // ── typed data ───────────────────────────────────────────────────────────────
  type PipeRow = { status: string; count: number }
  type JobRow  = { job_id: string; title: string; status: string; department?: string; created_at?: string; total_applicants: number; shortlisted_count: number; interview_count: number; hired_count: number; rejected_count: number; avg_score: number; top_score: number }
  type DeptRow = { department: string; total_jobs: number; total_applicants: number; hired_count: number; avg_score: number }
  type IvData  = { total_interviews: number; completed: number; scheduled: number; cancelled: number; no_show: number; avg_rating: number | null; avg_duration_minutes: number | null; by_type: { type: string; count: number; avg_rating: number | null }[] }
  type ScoreRow = { range: string; count: number }
  type SkillRow = { skill: string; count: number }
  type TimeRow  = { avg_days_to_screen?: number; avg_days_to_interview?: number; avg_days_to_hire?: number }

  const pipeArr   = (pipeline as PipeRow[] | undefined) ?? []
  const jobsArr   = (jobsData  as JobRow[]  | undefined) ?? []
  const deptsArr  = (deptData  as DeptRow[] | undefined) ?? []
  const scoreArr  = (scoreData as ScoreRow[] | undefined) ?? []
  const skillsArr = (skillsData as SkillRow[] | undefined) ?? []
  const iv        = interviewData as IvData | undefined
  const td        = timeData as TimeRow | undefined

  // ── derived metrics ──────────────────────────────────────────────────────────
  const stageMap = useMemo(() => Object.fromEntries(pipeArr.map(p => [p.status, p.count])), [pipeArr])

  const totalApps      = pipeArr.reduce((s, p) => s + p.count, 0)
  const newCount       = stageMap['new']          ?? 0
  const screenedCount  = stageMap['screened']     ?? 0
  const shortlistCount = stageMap['shortlisted']  ?? 0
  const interviewCount = stageMap['interview']    ?? 0
  const offeredCount   = stageMap['offered']      ?? 0
  const hiredCount     = stageMap['hired']        ?? 0
  const rejectedCount  = stageMap['rejected']     ?? 0

  // Cumulative stage calculations for rate summaries
  const hiredOrLater       = hiredCount
  const offeredOrLater     = offeredCount + hiredCount
  const interviewOrLater   = interviewCount + offeredCount + hiredCount
  const shortlistedOrLater = shortlistCount + interviewCount + offeredCount + hiredCount
  const screenedOrLater    = screenedCount + shortlistCount + interviewCount + offeredCount + hiredCount

  const shortlistRate    = pct(shortlistedOrLater, totalApps)
  const interviewRate    = pct(interviewOrLater, shortlistedOrLater)
  const offerRate        = pct(offeredOrLater, interviewOrLater)
  const acceptanceRate   = pct(hiredOrLater, offeredOrLater)
  const overallHireRate  = pct(hiredOrLater, totalApps)

  const conversionSteps = useMemo(() => {
    const cumulativeCounts = FUNNEL_STAGES.map((s, i) => {
      let sum = 0
      for (let j = i; j < FUNNEL_STAGES.length; j++) {
        sum += stageMap[FUNNEL_STAGES[j]] ?? 0
      }
      return sum
    })

    const steps = FUNNEL_STAGES.map((s, i) => {
      const count = cumulativeCounts[i]
      const prev  = i === 0 ? totalApps : cumulativeCounts[i - 1]
      const rate  = i === 0 ? 100 : pct(count, prev)
      const drop  = i === 0 ? 0   : (prev - count)
      return { stage: s, count, rate, drop, prev }
    })
    return steps
  }, [stageMap, totalApps])

  const pipelineComposition = useMemo(() => {
    return FUNNEL_STAGES.map((s) => ({
      stage: s,
      count: stageMap[s] ?? 0,
    }))
  }, [stageMap])

  const bottleneck = useMemo(() => {
    return conversionSteps.slice(1).reduce((worst, step) =>
      step.rate < worst.rate ? step : worst
    , conversionSteps[1] ?? conversionSteps[0])
  }, [conversionSteps])

  const rejectionByStage = useMemo(() => {
    return conversionSteps.slice(1).map(s => ({
      stage: s.stage,
      lost: s.drop,
    })).filter(s => s.lost > 0)
  }, [conversionSteps])

  const rankedDepts = useMemo(() => {
    return [...deptsArr].map(d => ({
      ...d,
      hireRate: pct(d.hired_count, d.total_applicants),
    })).sort((a, b) => {
      if (deptSort === 'hire_rate') return b.hireRate - a.hireRate
      if (deptSort === 'score')     return b.avg_score - a.avg_score
      return b.total_applicants - a.total_applicants
    })
  }, [deptsArr, deptSort])


  const radarDepts = useMemo(() => {
    const top3 = [...deptsArr]
      .sort((a, b) => b.total_applicants - a.total_applicants)
      .slice(0, 3)
    const maxApplicants = Math.max(...top3.map(d => d.total_applicants), 1)
    const maxScore      = 100
    const metrics = ['Volume', 'Hire Rate', 'Avg Score', 'Jobs']
    return metrics.map(m => {
      const obj: Record<string, number | string> = { metric: m }
      top3.forEach(d => {
        if (m === 'Volume')    obj[d.department] = Math.round((d.total_applicants / maxApplicants) * 100)
        if (m === 'Hire Rate') obj[d.department] = pct(d.hired_count, d.total_applicants)
        if (m === 'Avg Score') obj[d.department] = Math.round((d.avg_score / maxScore) * 100)
        if (m === 'Jobs')      obj[d.department] = Math.min(d.total_jobs * 10, 100)
      })
      return obj
    })
  }, [deptsArr])

  const top3DeptNames = useMemo(() =>
    [...deptsArr].sort((a, b) => b.total_applicants - a.total_applicants).slice(0, 3).map(d => d.department)
  , [deptsArr])

  const scoreTiers = useMemo(() => {
    const total = scoreArr.reduce((s, r) => s + r.count, 0)
    const excellent = (scoreArr.find(s => s.range === '90-100')?.count ?? 0) + (scoreArr.find(s => s.range === '80-89')?.count ?? 0)
    const good      = (scoreArr.find(s => s.range === '70-79')?.count ?? 0) + (scoreArr.find(s => s.range === '60-69')?.count ?? 0)
    const average   = (scoreArr.find(s => s.range === '50-59')?.count ?? 0) + (scoreArr.find(s => s.range === '40-49')?.count ?? 0)
    const weak      = scoreArr.find(s => s.range === '0-39')?.count ?? 0
    return { excellent, good, average, weak, total }
  }, [scoreArr])

  const ivByType = iv?.by_type ?? []

  const emptyJobs    = jobsArr.filter(j => j.total_applicants === 0 && j.status === 'open')
  const highHireJobs = jobsArr.filter(j => j.total_applicants >= 5).sort((a, b) => {
    const ra = pct(a.hired_count, a.total_applicants)
    const rb = pct(b.hired_count, b.total_applicants)
    return rb - ra
  }).slice(0, 5)

  const maxSkill   = skillsArr[0]?.count ?? 1

  // ── Skills bar chart data (sorted descending) ────────────────────────────────
  const skillsBarData = useMemo(() => {
    return skillsArr.slice(0, 20).map(s => {
      const weight = s.count / maxSkill
      const tier = weight >= 0.65 ? 'Most Common' : weight >= 0.3 ? 'Common' : 'Less Common'
      const color = weight >= 0.65 ? VIOLET : weight >= 0.3 ? BLUE : TEAL
      return { ...s, tier, color, weight }
    })
  }, [skillsArr, maxSkill])

  const skillTierCounts = useMemo(() => {
    const high = skillsBarData.filter(s => s.tier === 'Most Common').length
    const growing = skillsBarData.filter(s => s.tier === 'Common').length
    const emerging = skillsBarData.filter(s => s.tier === 'Less Common').length
    return { high, growing, emerging }
  }, [skillsBarData])

  if (isLoading) return <PageLoader />

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruitment Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Conversion rates, efficiency metrics, and department comparisons</p>
        </div>
        <div className="text-xs text-slate-400 bg-white/80 backdrop-blur-sm border border-slate-100/80 rounded-xl px-3 py-2 shadow-sm">
          Updated {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* ── Conversion Rate Strip — fixed identity colors per card ─────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatRateCard
          label="Shortlist Rate"
          value={`${shortlistRate}%`}
          sub="applications → shortlisted"
          icon={Percent}
          tintBg="bg-blue-50/70"
          iconBg="bg-blue-500"
        />
        <StatRateCard
          label="Interview Rate"
          value={`${interviewRate}%`}
          sub="shortlisted → interview"
          icon={CalendarDays}
          tintBg="bg-teal-50/70"
          iconBg="bg-teal-500"
        />
        <StatRateCard
          label="Offer Rate"
          value={`${offerRate}%`}
          sub="interviewed → offered"
          icon={Star}
          tintBg="bg-violet-50/70"
          iconBg="bg-violet-500"
        />
        <StatRateCard
          label="Offer Acceptance"
          value={`${acceptanceRate}%`}
          sub="offered → hired"
          icon={CheckCircle2}
          tintBg="bg-rose-50/70"
          iconBg="bg-rose-500"
        />
        <StatRateCard
          label="Overall Hire Rate"
          value={`${overallHireRate}%`}
          sub="total applications → hired"
          icon={Trophy}
          tintBg="bg-emerald-50/70"
          iconBg="bg-emerald-500"
        />
      </div>

      {/* ── Conversion Funnel ──────────────────────────────────────────────── */}
      <Card className={`${glassCard} overflow-visible`}>
        <CardHeader className="pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between bg-slate-50/30">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-indigo-600" />
              </div>
              Recruitment Pipeline
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">Candidate drop-off at each stage of the pipeline</p>
          </div>
          {totalApps > 0 && (
            <div className="text-right">
              <p className="text-2xl font-black text-slate-800 tracking-tight">{totalApps.toLocaleString()}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total Candidates</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-8 pb-10">
          {totalApps === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <TrendingDown className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-medium">No application data yet</p>
            </div>
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

              {rejectedCount > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{rejectedCount.toLocaleString()} total rejections ({pct(rejectedCount, totalApps)}% of all applications)</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="funnel">
        <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-white/80 backdrop-blur-sm border border-slate-100/80 rounded-xl">
          <TabsTrigger value="funnel"       className="gap-1.5 rounded-lg"><TrendingDown className="h-3.5 w-3.5" />Stage Analysis</TabsTrigger>
          <TabsTrigger value="departments"  className="gap-1.5 rounded-lg"><Trophy className="h-3.5 w-3.5" />Department Comparison</TabsTrigger>
          <TabsTrigger value="quality"      className="gap-1.5 rounded-lg"><Star className="h-3.5 w-3.5" />Talent Quality</TabsTrigger>
          <TabsTrigger value="interviews"   className="gap-1.5 rounded-lg"><CalendarDays className="h-3.5 w-3.5" />Interview Intelligence</TabsTrigger>
        </TabsList>

        {/* ── Stage Analysis ─────────────────────────────────────────────────── */}
        <TabsContent value="funnel" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            <Card className={glassCard}>
              <CardHeader className="pb-3 border-b border-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800">Drop-off by Stage</CardTitle>
                <p className="text-xs text-slate-400">How many candidates fail to progress at each gate</p>
              </CardHeader>
              <CardContent>
                {rejectionByStage.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">No drop-off data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={rejectionByStage} margin={{ top: 10, right: 32, left: -20, bottom: 0 }}>
                      <defs>
                        <filter id="line-shadow-dropoff" x="-10%" y="-10%" width="120%" height="130%">
                          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.22"/>
                        </filter>
                      </defs>
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="lost" name="Candidates lost" stroke="#ef4444" strokeWidth={3} dot={{ r: 5, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} filter="url(#line-shadow-dropoff)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardHeader className="pb-3 border-b border-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800">Active Pipeline Composition</CardTitle>
                <p className="text-xs text-slate-400">Current distribution of live applications across stages</p>
              </CardHeader>
              <CardContent>
                {totalApps === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">No data</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <defs>
                          <filter id="pie-shadow-active" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.08"/>
                          </filter>
                        </defs>
                        <Pie data={pipelineComposition.filter(s => s.count > 0)} dataKey="count" nameKey="stage" cx="50%" cy="50%" innerRadius={50} outerRadius={80} filter="url(#pie-shadow-active)">
                          {pipelineComposition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pipelineComposition.filter(s => s.count > 0).map((s, i) => (
                        <div key={s.stage} className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-slate-600 capitalize flex-1">{s.stage}</span>
                          <span className="text-xs font-bold text-slate-900">{s.count}</span>
                          <span className="text-xs text-slate-400 w-8 text-right">{pct(s.count, totalApps)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {emptyJobs.length > 0 && (
            <Card className={`${glassCard} !border-amber-200/80 !bg-amber-50/40`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center shadow-md shrink-0">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {emptyJobs.length} open {emptyJobs.length === 1 ? 'job has' : 'jobs have'} zero applicants
                    </p>
                    <p className="text-xs text-amber-600 mt-1">Consider promoting these roles or reviewing the job requirements.</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {emptyJobs.map(j => (
                        <Badge key={j.job_id} variant="warning" className="text-xs">{j.title}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Department Comparison ──────────────────────────────────────────── */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          {deptsArr.length === 0 ? (
            <Card className={glassCard}><CardContent className="py-16 text-center text-sm text-slate-400">No department data yet — add departments to your jobs to see comparisons.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {top3DeptNames.length >= 2 && (
                  <Card className={glassCard}>
                    <CardHeader className="pb-3 border-b border-slate-50/50">
                      <CardTitle className="text-sm font-bold text-slate-800">Top Department Radar</CardTitle>
                      <p className="text-xs text-slate-400">Normalised comparison across 4 dimensions (top 3 departments by volume)</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={radarDepts}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                          {top3DeptNames.map((name, i) => (
                            <Radar key={name} name={name} dataKey={name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                          ))}
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card className={glassCard}>
                  <CardHeader className="pb-3 border-b border-slate-50/50">
                    <CardTitle className="text-sm font-bold text-slate-800">Hire Rate by Department</CardTitle>
                    <p className="text-xs text-slate-400">% of applicants who were eventually hired</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={rankedDepts.map(d => ({ ...d, hireRateDisplay: d.hireRate }))} margin={{ top: 10, right: 36, left: -20, bottom: 0 }}>
                        <defs>
                          <filter id="line-shadow-dept" x="-10%" y="-10%" width="120%" height="130%">
                            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#22c55e" floodOpacity="0.22"/>
                          </filter>
                        </defs>
                        <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                        <Tooltip formatter={(v: unknown) => [`${v}%`, 'Hire Rate']} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                        <Line type="monotone" dataKey="hireRate" name="Hire Rate" stroke="#22c55e" strokeWidth={3} dot={{ r: 5, stroke: '#22c55e', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} filter="url(#line-shadow-dept)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className={glassCard}>
                <CardHeader className="pb-3 border-b border-slate-50/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">Department Leaderboard</CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">All departments ranked and compared</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-400 mr-1">Rank by:</span>
                      {(['hire_rate', 'score', 'volume'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setDeptSort(s)}
                          className={`px-2.5 py-1 rounded-lg border transition-all duration-200 ${deptSort === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white/80 text-slate-600 border-slate-200/80 hover:border-indigo-300'}`}
                        >
                          {s === 'hire_rate' ? 'Hire Rate' : s === 'score' ? 'Score' : 'Volume'}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100/80 bg-slate-50/40">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rank</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Jobs</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Applicants</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hired</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hire Rate</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Score</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hire Rate Bar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/80">
                      {rankedDepts.map((d, i) => {
                        const rankColors = [
                          { bg: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 shadow-md shadow-amber-500/20 border-yellow-300' },
                          { bg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800 shadow-md shadow-slate-300/20 border-slate-100' },
                          { bg: 'bg-gradient-to-br from-orange-300 via-orange-400 to-amber-600 text-orange-950 shadow-md shadow-orange-500/20 border-orange-200' },
                        ]
                        const currentRank = rankColors[i] ?? { bg: 'bg-slate-100 text-slate-500 border-slate-200' }
                        return (
                          <tr key={d.department} className="hover:bg-slate-50/60 transition-all duration-200 hover:scale-[1.005] hover:shadow-sm">
                            <td className="px-5 py-3.5">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm border ${currentRank.bg}`}>
                                {i + 1}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-slate-900">{d.department}</td>
                            <td className="px-4 py-3.5 text-right font-medium text-slate-600">{d.total_jobs}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-slate-800">{d.total_applicants}</td>
                            <td className="px-4 py-3.5 text-right text-emerald-700 font-bold">{d.hired_count}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                d.hireRate >= 20 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                  : d.hireRate >= 10 
                                  ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                  : 'bg-slate-50 text-slate-600 border-slate-100'
                              }`}>
                                {d.hireRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                d.avg_score >= 70 
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                  : d.avg_score >= 50 
                                  ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                  : 'bg-slate-50 text-slate-400 border-slate-100'
                              }`}>
                                {d.avg_score > 0 ? d.avg_score.toFixed(1) : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="h-2 w-28 bg-slate-100/80 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(d.hireRate, 100)}%`, backgroundColor: d.hireRate >= 20 ? GREEN : d.hireRate >= 10 ? AMBER : BLUE }} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Talent Quality ─────────────────────────────────────────────────── */}
        <TabsContent value="quality" className="space-y-4 mt-4">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Excellent', range: '80–100', count: scoreTiers.excellent, tintBg: 'bg-emerald-50/70', iconBg: 'bg-emerald-500', border: 'border-emerald-200/60', color: GREEN, desc: 'Strong hire candidates' },
              { label: 'Good',      range: '60–79',  count: scoreTiers.good,      tintBg: 'bg-blue-50/70',    iconBg: 'bg-blue-500',    border: 'border-blue-200/60',    color: BLUE,  desc: 'Promising — worth interviewing' },
              { label: 'Average',   range: '40–59',  count: scoreTiers.average,   tintBg: 'bg-amber-50/70',   iconBg: 'bg-amber-500',   border: 'border-amber-200/60',   color: AMBER, desc: 'Partial match — needs review' },
              { label: 'Weak',      range: '< 40',   count: scoreTiers.weak,      tintBg: 'bg-red-50/70',     iconBg: 'bg-red-500',     border: 'border-red-200/60',     color: RED,   desc: 'Poor fit — likely reject' },
            ].map(t => (
              <div key={t.label} className={`${t.tintBg} border ${t.border} rounded-xl p-4 text-center transition-all duration-300 hover:shadow-md`}>
                <p className="text-3xl font-bold" style={{ color: t.color }}>{t.count}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">{t.label}</p>
                <p className="text-xs text-slate-500">Score {t.range}</p>
                <p className="text-xs mt-2" style={{ color: t.color }}>
                  {scoreTiers.total > 0 ? pct(t.count, scoreTiers.total) : 0}% of pool
                </p>
                <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            <Card className={glassCard}>
              <CardHeader className="pb-3 border-b border-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Score Distribution
                  <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Multi-Dim</span>
                </CardTitle>
                <p className="text-xs text-slate-400">Candidate count per score bucket · cumulative pool %</p>
              </CardHeader>
              <CardContent className="pt-4">
                {scoreArr.every(s => s.count === 0) ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Run AI screening to populate this chart</p>
                ) : (() => {
                  // Build chart data with cumulative %
                  let running = 0
                  const chartData = scoreArr.map(s => {
                    running += s.count
                    const quality = ['90-100','80-89'].includes(s.range) ? GREEN
                      : ['70-79','60-69'].includes(s.range) ? BLUE
                      : ['50-59','40-49'].includes(s.range) ? AMBER
                      : RED
                    return {
                      range: s.range,
                      count: s.count,
                      pct: scoreTiers.total > 0 ? Math.round((s.count / scoreTiers.total) * 100) : 0,
                      cumPct: scoreTiers.total > 0 ? Math.round((running / scoreTiers.total) * 100) : 0,
                      fill: quality,
                    }
                  })
                  return (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            {chartData.map((d, i) => (
                              <linearGradient key={i} id={`scoreBar${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={d.fill} stopOpacity={0.9}/>
                                <stop offset="95%" stopColor={d.fill} stopOpacity={0.55}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5}/>
                          <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={6}/>
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} label={{ value: 'Candidates Count', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#94a3b8' } }}/>
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null
                              const countVal = payload[0]?.value ?? 0
                              const pctVal = scoreTiers.total > 0 ? Math.round((Number(countVal) / scoreTiers.total) * 100) : 0
                              return (
                                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
                                  <p className="font-bold text-slate-700 mb-1.5">Score Range: {label}</p>
                                  <p className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: payload[0]?.payload?.fill ?? '#3b82f6' }}/>
                                    <span className="text-slate-600">Candidates:</span>
                                    <strong className="text-slate-800">{countVal} ({pctVal}%)</strong>
                                  </p>
                                </div>
                              )
                            }}
                          />
                          <Bar dataKey="count" name="Candidates" radius={[6,6,0,0]} maxBarSize={48} isAnimationActive>
                            {chartData.map((d, i) => (
                              <Cell key={i} fill={`url(#scoreBar${i})`}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Quality tier badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { label: 'Excellent', range: '80–100', color: GREEN,  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                          { label: 'Good',      range: '60–79',  color: BLUE,   bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700'    },
                          { label: 'Average',   range: '40–59',  color: AMBER,  bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
                          { label: 'Weak',      range: '< 40',   color: RED,    bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700'     },
                        ].map(t => (
                          <div key={t.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${t.bg} ${t.border} ${t.text}`}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }}/>
                            {t.label} · {t.range}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* ── Skills — Horizontal Bar Chart (replaces bubble cluster) ────── */}
            <Card className={glassCard}>
              <CardHeader className="pb-3 border-b border-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
                        <Flame className="h-3.5 w-3.5 text-white" />
                      </span>
                      Top Skills in Talent Pool
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">Candidate count per skill · color-coded by frequency tier</p>
                  </div>
                  {skillsBarData.length > 0 && (
                    <div className="flex items-center gap-3 shrink-0">
                      {[
                        { label: 'Most Common', dot: 'bg-violet-500' },
                        { label: 'Common',      dot: 'bg-blue-500'   },
                        { label: 'Less Common', dot: 'bg-teal-500'   },
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
                            <span className="text-xs font-medium text-slate-700 w-24 truncate shrink-0" title={skill.skill}>
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
          </div>

          {highHireJobs.length > 0 && (
            <Card className={glassCard}>
              <CardHeader className="pb-4 border-b border-slate-100/80">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      Highest Hire-Rate Jobs
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">Jobs with ≥5 applicants, ranked by % of applicants hired</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100/80 px-2.5 py-1 rounded-lg">{highHireJobs.length} jobs</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100/60">
                  {highHireJobs.map((job, i) => {
                    const rate = pct(job.hired_count, job.total_applicants)
                    const rankColors = [
                      { bg: 'bg-amber-400', text: 'text-amber-900', ring: 'ring-amber-300/50' },
                      { bg: 'bg-slate-400', text: 'text-slate-900', ring: 'ring-slate-300/50' },
                      { bg: 'bg-orange-400', text: 'text-orange-900', ring: 'ring-orange-300/50' },
                    ]
                    const rank = rankColors[i] ?? { bg: 'bg-indigo-100', text: 'text-indigo-600', ring: 'ring-indigo-100' }
                    const barColor = rate >= 50 ? '#10b981' : rate >= 25 ? '#3b82f6' : '#6366f1'
                    const barWidth = Math.min(rate * 2.5, 100)
                    return (
                      <div key={job.job_id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-all duration-200 group">
                        {/* Rank badge */}
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ring-2 ${rank.ring} ${rank.bg} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                          <span className={`text-xs font-black ${rank.text}`}>#{i + 1}</span>
                        </div>

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{job.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-slate-400">{job.department ?? 'No Dept.'}</span>
                            <span className="text-slate-200">·</span>
                            <span className="text-[11px] font-semibold text-slate-500">{job.total_applicants} applicants</span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${barWidth}%`,
                                background: `linear-gradient(90deg, ${barColor}66 0%, ${barColor} 100%)`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Rate badge */}
                        <div className="text-right shrink-0">
                          <div className="inline-flex flex-col items-end">
                            <span className={`text-xl font-black tracking-tight ${rate >= 50 ? 'text-emerald-600' : rate >= 25 ? 'text-blue-600' : 'text-indigo-600'}`}>
                              {rate}%
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              {job.hired_count} hired
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Interview Intelligence ─────────────────────────────────────────── */}
        <TabsContent value="interviews" className="space-y-4 mt-4">

          {/* Interview stat cards — fixed identity colors */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatRateCard
              label="Completion Rate"
              value={iv && iv.total_interviews > 0 ? `${pct(iv.completed, iv.total_interviews)}%` : '—'}
              sub={`${iv?.completed ?? 0} of ${iv?.total_interviews ?? 0} completed`}
              icon={CheckCircle2}
              tintBg="bg-emerald-50/70"
              iconBg="bg-emerald-500"
            />
            <StatRateCard
              label="No-show Rate"
              value={iv && iv.total_interviews > 0 ? `${pct(iv.no_show, iv.total_interviews)}%` : '—'}
              sub={`${iv?.no_show ?? 0} no-shows`}
              icon={AlertTriangle}
              tintBg="bg-amber-50/70"
              iconBg="bg-amber-500"
            />
            <StatRateCard
              label="Avg. Rating"
              value={iv?.avg_rating != null ? `${Number(iv.avg_rating).toFixed(1)} / 5` : '—'}
              sub="interviewer rating"
              icon={Star}
              tintBg="bg-yellow-50/70"
              iconBg="bg-yellow-500"
            />
            <StatRateCard
              label="Avg. Duration"
              value={iv?.avg_duration_minutes != null ? `${iv.avg_duration_minutes} min` : '—'}
              sub="per session"
              icon={Clock}
              tintBg="bg-violet-50/70"
              iconBg="bg-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            <Card className={glassCard}>
              <CardHeader className="pb-3 border-b border-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800">Interview Type Effectiveness</CardTitle>
                <p className="text-xs text-slate-400">Avg. rating per type — which format gets the best feedback?</p>
              </CardHeader>
              <CardContent>
                {ivByType.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">No interview data yet</p>
                ) : (
                  <div className="space-y-4">
                    {ivByType.map((t, i) => {
                      const ratingPct = t.avg_rating != null ? (t.avg_rating / 5) * 100 : 0
                      const volumePct = iv ? pct(t.count, iv.total_interviews) : 0
                      return (
                        <div key={t.type} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-sm font-medium text-slate-700 capitalize">{t.type}</span>
                              <Badge variant="secondary" className="text-xs">{t.count} sessions · {volumePct}%</Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {t.avg_rating != null ? t.avg_rating.toFixed(1) : 'N/A'}
                            </div>
                          </div>
                          <div className="h-2.5 bg-slate-100/80 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${ratingPct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardHeader className="pb-3 border-b border-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800">Pipeline Velocity</CardTitle>
                <p className="text-xs text-slate-400">Average days a candidate spends before reaching each milestone</p>
              </CardHeader>
              <CardContent>
                {!td?.avg_days_to_screen && !td?.avg_days_to_interview && !td?.avg_days_to_hire ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Not enough data to compute velocity yet</p>
                ) : (
                  <div className="relative pt-4 pb-2">
                    <div className="absolute top-11 left-8 right-8 h-0.5 bg-slate-200/80" />
                    <div className="flex justify-between relative">
                      {[
                        { label: 'Apply', days: 0, color: '#94a3b8' },
                        { label: 'Screened', days: td?.avg_days_to_screen, color: BLUE },
                        { label: 'Interview', days: td?.avg_days_to_interview, color: VIOLET },
                        { label: 'Hired', days: td?.avg_days_to_hire, color: GREEN },
                      ].map((m, i) => (
                        <div key={m.label} className="flex flex-col items-center gap-2 z-10">
                          <div className="h-9 w-9 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.color }}>
                            {i === 0 ? '0' : m.days != null ? Math.round(m.days) : '?'}
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-slate-700">{m.label}</p>
                            <p className="text-xs text-slate-400">{i === 0 ? 'day 0' : m.days != null ? `day ~${Math.round(m.days)}` : '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-around mt-4 px-8">
                      {[
                        { label: 'Screening', days: td?.avg_days_to_screen },
                        { label: 'Screen → Interview', days: td?.avg_days_to_interview != null && td?.avg_days_to_screen != null ? td.avg_days_to_interview - td.avg_days_to_screen : null },
                        { label: 'Interview → Hire', days: td?.avg_days_to_hire != null && td?.avg_days_to_interview != null ? td.avg_days_to_hire - td.avg_days_to_interview : null },
                      ].map(g => (
                        <div key={g.label} className="text-center">
                          <ArrowRight className="h-3 w-3 text-slate-300 mx-auto" />
                          <p className="text-xs text-slate-500 mt-1 font-semibold">{g.days != null && g.days > 0 ? `+${Math.round(g.days)}d` : '—'}</p>
                          <p className="text-xs text-slate-400">{g.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={`${glassCard} !border-dashed !border-slate-200/80 !bg-slate-50/30`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center shadow-md shrink-0">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Interview Scheduling Heatmap</p>
                  <p className="text-xs text-slate-400 mt-0.5">Which days & times are most popular for interviews? Available once you have 20+ scheduled interviews with full timestamps.</p>
                </div>
                <Badge variant="secondary" className="ml-auto shrink-0">Coming soon</Badge>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}