import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { interviewsApi } from '@/api/interviews'
import { authApi, type UserProfile } from '@/api/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { User, Briefcase, CalendarDays, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  interview_type: z.string().min(1, 'Required'),
  round_number: z.coerce.number().min(1).default(1),
  scheduled_at: z.string().optional(),
  duration_minutes: z.coerce.number().min(15).default(60),
  generate_questions: z.boolean().default(true),
  interviewer_id: z.string().min(1, 'Interviewer is required'),
})
type FormData = z.infer<typeof schema>

interface ScheduleInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string | null
  candidateName?: string
  jobTitle?: string
  defaultInterviewerId?: string
  onSuccess?: () => void
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  applicationId,
  candidateName = 'Unknown Candidate',
  jobTitle = 'Unknown Job',
  defaultInterviewerId = '',
  onSuccess,
}: ScheduleInterviewModalProps) {
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: managersData, isLoading: managersLoading } = useQuery({
    queryKey: ['managers'],
    queryFn: () => authApi.listManagers().then((r) => r.data),
    enabled: isHR && isOpen,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      interview_type: 'technical',
      round_number: 1,
      duration_minutes: 60,
      generate_questions: true,
      interviewer_id: defaultInterviewerId,
    },
  })

  // Reset or update interviewer value when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        interview_type: 'technical',
        round_number: 1,
        duration_minutes: 60,
        generate_questions: true,
        interviewer_id: defaultInterviewerId,
      })
    }
  }, [isOpen, defaultInterviewerId, reset])

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      interviewsApi.create({
        application_id: applicationId || '',
        interviewer_id: data.interviewer_id,
        interview_type: data.interview_type,
        round_number: data.round_number,
        scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : undefined,
        duration_minutes: data.duration_minutes,
      }, data.generate_questions),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      toast.success('Interview scheduled with AI questions')
      onSuccess?.()
      onClose()
      navigate(`/interviews/${res.data.id}`)
    },
    onError: () => toast.error('Failed to schedule interview'),
  })

  if (!isHR) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[95vh] overflow-y-auto rounded-2xl flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Schedule Interview
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-1">
            AI will auto-generate tailored interview questions based on type and profile.
          </DialogDescription>
        </DialogHeader>

        {!applicationId ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No candidate selected. Go to an application and click <strong>Schedule</strong> on a candidate with score ≥ 60.
          </div>
        ) : (
          <div className="space-y-5 pt-3">
            {/* Candidate Info Card */}
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-1.5 rounded-lg">
                  <User className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Candidate</p>
                  <p className="font-semibold text-gray-900">{candidateName}</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-6 bg-indigo-150" />
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-1.5 rounded-lg">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Job</p>
                  <p className="font-semibold text-gray-900">{jobTitle}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Interview Type *</Label>
                <Controller name="interview_type" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone Screen</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {errors.interview_type && <p className="text-[10px] text-red-500">{errors.interview_type.message}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Interviewer (Manager) *</Label>
                <Controller name="interviewer_id" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={managersLoading}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={managersLoading ? "Loading managers..." : "Select a manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {managersData?.map((m: UserProfile) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.full_name} ({m.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.interviewer_id && <p className="text-[10px] text-red-500">{errors.interviewer_id.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Round Number</Label>
                  <Input type="number" min={1} {...register('round_number')} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Duration (minutes)</Label>
                  <Input type="number" min={15} {...register('duration_minutes')} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Scheduled At (optional)</Label>
                <Input type="datetime-local" {...register('scheduled_at')} className="h-9 text-xs" />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                <div>
                  <p className="font-semibold text-gray-700">Auto-generate AI questions</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Tailored to interview type & candidate profile</p>
                </div>
                <Controller name="generate_questions" control={control} render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )} />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Scheduling...
                    </>
                  ) : 'Schedule Interview'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
