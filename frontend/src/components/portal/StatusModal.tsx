import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { portalApi } from '@/api/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Search, FileText, X, Sparkles, Building2, CalendarDays, Inbox } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const schema = z.object({ email: z.string().email('Please enter a valid email address') })
type FormData = z.infer<typeof schema>

interface StatusItem {
  job_title: string
  department?: string
  status: string
  applied_at?: string
  suitability_score?: number
}

interface StatusData {
  candidate_name: string
  email: string
  total_applications: number
  applications: StatusItem[]
}

interface StatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StatusModal({ open, onOpenChange }: StatusModalProps) {
  const [result, setResult] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ 
    resolver: zodResolver(schema) 
  })

  // Reset states when modal closes or opens
  useEffect(() => {
    if (!open) {
      setResult(null)
      setError('')
      reset()
    }
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await portalApi.checkStatus(data.email)
      setResult(res.data)
    } catch {
      setError('No application found for this email address')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-0 bg-slate-50/50 border border-slate-100 shadow-2xl premium-job-dialog">
        
        {/* Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-8 sm:px-8 rounded-t-2xl">
          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          {/* Abstract light blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/10 shadow-sm shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-extrabold text-white tracking-tight">Application Status</DialogTitle>
              <DialogDescription className="text-sm text-indigo-100 font-medium mt-1">
                Enter your email address to search all your active job applications.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:pb-8 space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Registered Email Address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type="email" 
                    placeholder="your@email.com" 
                    className="w-full pl-3 pr-3 py-2 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-100 transition-all font-medium"
                    {...register('email')} 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 gap-2 group cursor-pointer shadow-md shadow-indigo-500/10 shrink-0"
                >
                  <Search className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  {loading ? 'Searching...' : 'Check Status'}
                </Button>
              </div>
              {errors.email && <p className="text-xs font-semibold text-rose-500">{errors.email.message}</p>}
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm font-semibold text-rose-700 text-center animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* Results Container */}
          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Applications for {result.candidate_name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{result.total_applications} active role(s) found</p>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-600 tracking-widest uppercase bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">
                  Verified Candidate
                </span>
              </div>

              {result.applications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-2">
                  <Inbox className="h-8 w-8 text-slate-200" />
                  <p className="text-sm font-medium">No open applications found for this email</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                  {result.applications.map((app, i) => (
                    <div 
                      key={i} 
                      className="rounded-2xl border border-slate-150 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-extrabold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {app.job_title}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium pt-0.5">
                            {app.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {app.department}
                              </span>
                            )}
                            {app.applied_at && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-2 shrink-0">
                          <StatusBadge status={app.status} />
                          {app.suitability_score != null && (
                            <p className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                              Match score: {app.suitability_score.toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
