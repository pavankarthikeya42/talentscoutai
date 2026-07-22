import { cn } from '@/lib/utils'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center px-4 w-full">
      <div className="loader-card-glow backdrop-blur-md p-8 rounded-2xl flex flex-col items-center justify-center gap-5 max-w-xs w-full relative overflow-hidden">
        
        {/* Glow Shadow effect on card (radial pulse background layer) */}
        <div className="absolute inset-0 rounded-2xl -z-10 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-600/10 blur-xl animate-pulse" />
        
        {/* Spinner wheel that shines and rotates */}
        <div className="relative flex items-center justify-center h-16 w-16">
          {/* Animated gradient ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-100/60" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-r-purple-500 animate-spin" />
          {/* Glow dot in the center */}
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-ping" />
        </div>
        
        {/* Text descriptions */}
        <div className="text-center space-y-1.5 z-10">
          <p className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 tracking-wider uppercase">Loading</p>
          <p className="text-[11px] font-bold text-slate-500 animate-pulse tracking-tight">Buffering assets & data...</p>
        </div>
      </div>
    </div>
  )
}

export function GlobalProgressBar() {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const isLoading = isFetching > 0 || isMutating > 0

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] w-full overflow-hidden bg-indigo-50/20 pointer-events-none">
      <div className="h-full w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 global-loading-bar origin-left shadow-[0_1px_8px_rgba(99,102,241,0.5)]" />
    </div>
  )
}
