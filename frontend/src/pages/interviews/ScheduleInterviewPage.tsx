import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interviewsApi } from '@/api/interviews'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { User, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { authApi, type UserProfile } from '@/api/auth'

const schema = z.object({
  interview_type: z.string().min(1, 'Required'),
  round_number: z.coerce.number().min(1).default(1),
  scheduled_at: z.string().optional(),
  duration_minutes: z.coerce.number().min(15).default(60),
  generate_questions: z.boolean().default(true),
  interviewer_id: z.string().min(1, 'Interviewer is required'),
})
type FormData = z.infer<typeof schema>

export function ScheduleInterviewPage() {
  const { user } = useAuth()
  const isHR = user?.role?.toLowerCase() === 'hr'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const { data: managersData, isLoading: managersLoading } = useQuery({
    queryKey: ['managers'],
    queryFn: () => authApi.listManagers().then((r) => r.data),
    enabled: isHR,
  })

  if (!isHR) {
    return <Navigate to="/dashboard" replace />
  }

  const applicationId  = searchParams.get('application_id') ?? ''
  const candidateName  = searchParams.get('candidate_name') ?? 'Unknown Candidate'
  const jobTitle       = searchParams.get('job_title') ?? 'Unknown Job'
  const defaultInterviewerId = searchParams.get('interviewer_id') ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      interview_type: 'technical',
      round_number: 1,
      duration_minutes: 60,
      generate_questions: true,
      interviewer_id: defaultInterviewerId,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      interviewsApi.create({
        application_id: applicationId,
        interviewer_id: data.interviewer_id,
        interview_type: data.interview_type,
        round_number: data.round_number,
        scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : undefined,
        duration_minutes: data.duration_minutes,
      }, data.generate_questions),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      toast.success('Interview scheduled with AI questions')
      navigate(`/interviews/${res.data.id}`)
    },
    onError: () => toast.error('Failed to schedule interview'),
  })

  if (!applicationId) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Interview</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            No candidate selected. Go to an application and click <strong>Schedule</strong> on a candidate with score ≥ 60.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule Interview</h1>
        <p className="text-sm text-gray-500 mt-1">AI will auto-generate tailored interview questions</p>
      </div>

      {/* Candidate info card */}
      <Card className="border-indigo-100 bg-indigo-50/40">
        <CardContent className="py-4 flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Candidate</p>
              <p className="text-sm font-semibold text-gray-900">{candidateName}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-indigo-100" />
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Briefcase className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Job</p>
              <p className="text-sm font-semibold text-gray-900">{jobTitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interview Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Interview Type *</Label>
              <Controller name="interview_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Screen</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              )} />
              {errors.interview_type && <p className="text-xs text-red-500">{errors.interview_type.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Interviewer (Manager) *</Label>
              <Controller name="interviewer_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={managersLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={managersLoading ? "Loading managers..." : "Select a manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    {managersData?.map((m: UserProfile) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.interviewer_id && <p className="text-xs text-red-500">{errors.interviewer_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Round Number</Label>
                <Input type="number" min={1} {...register('round_number')} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={15} {...register('duration_minutes')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Scheduled At (optional)</Label>
              <Input type="datetime-local" {...register('scheduled_at')} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto-generate AI questions</p>
                <p className="text-xs text-gray-500">Tailored to interview type & candidate profile</p>
              </div>
              <Controller name="generate_questions" control={control} render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Scheduling…' : 'Schedule Interview'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
