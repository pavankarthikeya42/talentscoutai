import { cn } from '@/lib/utils'

interface ScoreBarProps {
  label: string
  score: number
  max?: number
  className?: string
}

function getScoreGradient(score: number) {
  if (score >= 80) return 'from-emerald-400 to-emerald-500'
  if (score >= 60) return 'from-blue-400 to-violet-500'
  if (score >= 40) return 'from-amber-400 to-orange-500'
  return 'from-red-400 to-rose-500'
}

function getScoreGlow(score: number) {
  if (score >= 80) return 'shadow-[0_0_8px_rgba(16,185,129,0.4)]'
  if (score >= 60) return 'shadow-[0_0_8px_rgba(99,102,241,0.4)]'
  if (score >= 40) return 'shadow-[0_0_8px_rgba(245,158,11,0.4)]'
  return 'shadow-[0_0_8px_rgba(239,68,68,0.4)]'
}

export function ScoreBar({ label, score, max = 100, className }: ScoreBarProps) {
  const pct = Math.min((score / max) * 100, 100)
  return (
    <div className={cn('space-y-1.5 group', className)}>
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span className="group-hover:text-indigo-600 transition-colors duration-200">{label}</span>
        <span className="font-bold text-slate-700">{score.toFixed(0)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100/80 overflow-hidden">
        <div
          className={cn(
            'h-2 rounded-full bg-gradient-to-r transition-all duration-700 ease-out',
            getScoreGradient(score),
            getScoreGlow(score),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
