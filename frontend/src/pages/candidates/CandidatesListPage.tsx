import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Upload, X, ChevronDown,
  Users, Star, Briefcase, CalendarDays,
} from 'lucide-react'
import { candidatesApi } from '@/api/candidates'
import { analyticsApi } from '@/api/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuth } from '@/contexts/AuthContext'

// ── Avatar ─────────────────────────────────────────────────────────────────────
const AV_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899','#14b8a6','#f97316','#6366f1']

function Avatar({ name }: { name: string }) {
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AV_COLORS.length
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
      style={{ backgroundColor: AV_COLORS[idx] }}
    >
      {initials}
    </div>
  )
}


// ── Experience filter options ───────────────────────────────────────────────────
const EXP_OPTS = [
  { label: 'Any Experience', min: 0,  max: 99 },
  { label: '0–2 Years',      min: 0,  max: 2  },
  { label: '3–5 Years',      min: 3,  max: 5  },
  { label: '6–9 Years',      min: 6,  max: 9  },
  { label: '10+ Years',      min: 10, max: 99 },
]

// ── Page ────────────────────────────────────────────────────────────────────────
export function CandidatesListPage() {
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const [skillInput, setSkillInput]       = useState('')
  const [activeSkill, setActiveSkill]     = useState('')
  const [expFilter, setExpFilter]         = useState(EXP_OPTS[0])
  const [expOpen, setExpOpen]             = useState(false)
  const [page, setPage]                   = useState(1)
  const expRef                            = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (expRef.current && !expRef.current.contains(e.target as Node)) setExpOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['candidates', { search: debouncedSearch, page, skill: activeSkill }],
    queryFn: () => candidatesApi.list({
      search:    debouncedSearch || undefined,
      skills:    activeSkill    || undefined,
      page,
      page_size: 15,
    }).then(r => r.data),
  })

  const { data: pipeline } = useQuery({
    queryKey: ['analytics', 'pipeline'],
    queryFn: () => analyticsApi.pipeline().then(r => r.data),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((window as { _cst?: ReturnType<typeof setTimeout> })._cst)
    ;(window as { _cst?: ReturnType<typeof setTimeout> })._cst =
      setTimeout(() => { setDebounced(v); setPage(1) }, 380)
  }

  const applySkill = () => {
    const s = skillInput.trim()
    if (s) { setActiveSkill(s); setSkillInput(''); setPage(1) }
  }

  const clearAll = () => {
    setActiveSkill(''); setExpFilter(EXP_OPTS[0])
    setSearch(''); setDebounced(''); setPage(1)
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  type PL = { status: string; count: number }
  const pipelineMap = Object.fromEntries(
    ((pipeline as PL[] | undefined) ?? []).map(p => [p.status, p.count])
  )

  const rawCandidates = data?.candidates ?? []

  // Client-side experience filter (API doesn't support it)
  const candidates = useMemo(() =>
    rawCandidates.filter(c =>
      c.total_experience_years >= expFilter.min &&
      c.total_experience_years <= expFilter.max
    )
  , [rawCandidates, expFilter])

  const newThisWeek = rawCandidates.filter(c =>
    new Date(c.created_at) > new Date(Date.now() - 7 * 86_400_000)
  ).length

  const filtersActive = !!(activeSkill || expFilter !== EXP_OPTS[0] || debouncedSearch)
  const totalPages    = Math.ceil((data?.total ?? 0) / 15)

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5 page-enter">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and manage your talent pool</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total in Pool',    value: data?.total ?? 0,              sub: 'all candidates',    Icon: Users,        bg: 'bg-blue-50',    color: 'text-blue-600'    },
          { label: 'Shortlisted',      value: pipelineMap['shortlisted'] ?? 0, sub: 'across all jobs', Icon: Star,         bg: 'bg-violet-50',  color: 'text-violet-600'  },
          { label: 'In Interviews',    value: pipelineMap['interview']    ?? 0, sub: 'active now',     Icon: Briefcase,    bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Added This Week',  value: newThisWeek,                    sub: 'recent additions', Icon: CalendarDays, bg: 'bg-amber-50',   color: 'text-amber-600'   },
        ].map(s => (
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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-sm"
          />
        </div>

        {/* Skill chip / input */}
        {activeSkill ? (
          <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium h-8 px-3 rounded-lg">
            Skill: {activeSkill}
            <button onClick={() => { setActiveSkill(''); setPage(1) }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              placeholder="Skill filter…"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySkill()}
              className="h-8 w-32 text-xs"
            />
            {skillInput && (
              <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={applySkill}>
                Add
              </Button>
            )}
          </div>
        )}

        {/* Experience filter */}
        <div className="relative" ref={expRef}>
          <button
            onClick={() => setExpOpen(v => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${
              expFilter !== EXP_OPTS[0]
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {expFilter.label} <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {expOpen && (
            <div className="absolute top-9 left-0 z-30 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
              {EXP_OPTS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { setExpFilter(opt); setExpOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 ${
                    expFilter.label === opt.label ? 'text-blue-600 font-semibold' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all */}
        {filtersActive && (
          <button onClick={clearAll} className="h-8 px-2 text-xs text-gray-500 hover:text-gray-800 transition-colors">
            Clear all
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {candidates.length} of {data?.total ?? 0} candidates
        </span>
      </div>

      {/* Table */}
      {candidates.length === 0 ? (
        <EmptyState
          title={filtersActive ? 'No matches found' : 'No candidates yet'}
          description={filtersActive ? 'Try adjusting your filters' : 'Upload resumes to add candidates to the pipeline'}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Candidate', 'Latest Role', 'Skills', 'Experience', 'Education', ''].map(h => (
                      <th
                        key={h}
                        className={`py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === 'Experience' ? 'text-right px-4' : 'text-left px-4'} ${h === 'Candidate' ? 'pl-5' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidates.map(c => {
                    const latestExp = c.experience?.[0]
                    const latestEdu = c.education?.[0]
                    return (
                      <tr key={c.id} className="candidate-row group">

                        {/* Candidate — avatar + name + location */}
                        <td className="pl-5 pr-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.full_name} />
                            <div className="min-w-0">
                              <Link
                                to={`/candidates/${c.id}`}
                                className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block"
                              >
                                {c.full_name}
                              </Link>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {c.location ?? c.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Latest role */}
                        <td className="px-4 py-3.5">
                          {latestExp ? (
                            <div className="min-w-0">
                              <p className="text-sm text-gray-800 font-medium truncate">{latestExp.title}</p>
                              <p className="text-xs text-gray-400 truncate">{latestExp.company}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>

                        {/* Skills */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {c.skills.slice(0, 3).map(s => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                            {c.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{c.skills.length - 3}</Badge>
                            )}
                            {c.skills.length === 0 && <span className="text-xs text-gray-300">—</span>}
                          </div>
                        </td>

                        {/* Experience */}
                        <td className="px-4 py-3.5 text-right">
                          <p className="text-sm font-bold text-gray-900 leading-none">
                            {c.total_experience_years}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">yrs</p>
                        </td>

                        {/* Education */}
                        <td className="px-4 py-3.5">
                          {latestEdu ? (
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-700 truncate max-w-[160px]">{latestEdu.degree}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">{latestEdu.institution}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* View profile — appears on hover */}
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/candidates/${c.id}`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View Profile →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(data?.total ?? 0) > 15 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {((page - 1) * 15 + 1).toLocaleString()}–{Math.min(page * 15, data?.total ?? 0).toLocaleString()} of {(data?.total ?? 0).toLocaleString()}
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
