import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import AOS from 'aos'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  full_name: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'At least 10 digits'),
  expected_salary: z.string().optional(),
  notice_period: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [resume, setResume] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    })
  }, [])

  const { data: job } = useQuery({
    queryKey: ['portal-job', jobId],
    queryFn: () => portalApi.getJob(jobId!).then((r) => r.data),
    enabled: !!jobId,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (!resume) {
      toast.error('Please upload your resume')
      return
    }
    setLoading(true)
    try {
      await portalApi.apply(jobId!, data, resume)
      setSuccess(true)
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Application failed'
      toast.error(typeof msg === 'string' ? msg : 'Application failed')  // guard object render
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 mb-6">
          Thank you for applying to <strong>{job?.title}</strong>. We'll review
          your application and get back to you soon.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/careers/openings">View More Jobs</Link>
          </Button>
          <Button asChild>
            <Link to="/careers?checkStatus=true">Check Status</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6" data-aos="fade-down">
        <h1 className="text-2xl font-bold text-gray-900">
          Apply for {job?.title ?? 'Position'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in your details and upload your resume
        </p>
      </div>

      <Card data-aos="fade-up" data-aos-delay="100">
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Jane Smith" {...register('full_name')} />
              {errors.full_name?.message && (
                <p className="text-xs text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="jane@email.com" {...register('email')} />
              {errors.email?.message && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input type="tel" placeholder="+91 98765 43210" {...register('phone')} />
              {errors.phone?.message && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Expected Salary</Label>
                <Input placeholder="₹10 LPA" {...register('expected_salary')} />
              </div>
              <div className="space-y-1.5">
                <Label>Notice Period</Label>
                <Input placeholder="30 days" {...register('notice_period')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Resume (PDF) *</Label>
              <div
                onClick={() => document.getElementById('resume-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  resume
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {resume ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{resume.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload your resume</p>
                    <p className="text-xs text-gray-400 mt-1">PDF · Max 10MB</p>
                  </>
                )}
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (
                      f &&
                      (f.type === 'application/pdf' ||
                        f.name.toLowerCase().endsWith('.pdf') ||
                        f.name.toLowerCase().endsWith('.docx') ||
                        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') &&
                      f.size <= 10 * 1024 * 1024
                    ) {
                      setResume(f)
                    } else if (f) {
                      toast.error('Please upload a PDF under 10MB')
                    }
                  }}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting Application…' : 'Submit Application'}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}