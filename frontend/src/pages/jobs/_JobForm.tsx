import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { jobsApi, type Job } from '@/api/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/shared/TagInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, ListTodo, Coins, Sliders, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const schema = z.object({
  title: z.string().min(3, 'At least 3 characters'),
  department: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  description: z.string().min(50, 'At least 50 characters'),
  skills: z.array(z.string()).default([]),
  min_experience_years: z.coerce.number().min(0).max(50).default(0),
  education: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  status: z.string().default('open'),
  vacancies: z.coerce.number().min(1).max(100).default(1),
  closing_date: z.string().optional(),
  emergency: z.boolean().default(false),
  post_to_linkedin: z.boolean().default(false),
  post_to_naukri: z.boolean().default(false),
  skill_weight: z.coerce.number().min(0).max(100).default(40),
  experience_weight: z.coerce.number().min(0).max(100).default(30),
  education_weight: z.coerce.number().min(0).max(100).default(20),
  certification_weight: z.coerce.number().min(0).max(100).default(10),
}).refine((d) => {
  if (d.salary_min && d.salary_max && d.salary_max <= d.salary_min) return false
  return true
}, { message: 'Salary max must be greater than salary min', path: ['salary_max'] }).refine((d) => {
  const sum = (d.skill_weight ?? 0) + (d.experience_weight ?? 0) + (d.education_weight ?? 0) + (d.certification_weight ?? 0)
  return sum === 100
}, { message: 'Weights must sum to 100', path: ['skill_weight'] })

export type JobFormData = z.infer<typeof schema>

interface JobFormProps {
  defaultValues?: Partial<JobFormData>
  onSubmit: (data: JobFormData) => void
  loading?: boolean
  submitLabel?: string
}

export function JobForm({ defaultValues, onSubmit, loading, submitLabel = 'Save Job' }: JobFormProps) {
  const [aiDescription, setAiDescription] = useState('')
  const [aiExperience, setAiExperience] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<JobFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: '', description: '', skills: [], certifications: [],
      status: 'open', vacancies: 1, skill_weight: 40, experience_weight: 30,
      education_weight: 20, certification_weight: 10,
      min_experience_years: 0, emergency: false,
      post_to_linkedin: false, post_to_naukri: false,
      ...defaultValues,
    },
  })

  const handleAiAutofill = async () => {
    if (!aiDescription.trim()) {
      toast.error('Please enter a job description for the AI to parse.')
      return
    }

    setAiLoading(true)
    try {
      const response = await jobsApi.autofill({
        description: aiDescription,
        min_experience_years: aiExperience ? parseInt(aiExperience, 10) : undefined,
      })

      const data = response.data

      setValue('title', data.title || '')
      setValue('department', data.department || '')
      setValue('location', data.location || '')
      setValue('employment_type', data.employment_type || '')
      setValue('description', data.description || aiDescription)
      setValue('skills', data.requirements?.skills || [])
      setValue('min_experience_years', data.requirements?.min_experience_years || 0)
      setValue('education', data.requirements?.education || '')
      setValue('certifications', data.requirements?.certifications || [])

      if (data.salary_min !== undefined) setValue('salary_min', data.salary_min)
      if (data.salary_max !== undefined) setValue('salary_max', data.salary_max)

      if (data.screening_criteria) {
        setValue('skill_weight', data.screening_criteria.skill_weight)
        setValue('experience_weight', data.screening_criteria.experience_weight)
        setValue('education_weight', data.screening_criteria.education_weight)
        setValue('certification_weight', data.screening_criteria.certification_weight)
      }

      toast.success('✨ Form successfully autofilled by AI!')
    } catch (error) {
      console.error('AI autofill failed:', error)
      toast.error('Failed to generate job details. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const [sw, ew, edw, cw] = watch(['skill_weight', 'experience_weight', 'education_weight', 'certification_weight'])
  const total = (Number(sw) || 0) + (Number(ew) || 0) + (Number(edw) || 0) + (Number(cw) || 0)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white border border-indigo-100/60 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3 border-b border-indigo-50/30">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            AI Job Form Autofill
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-xs text-slate-500">
            Paste your raw job description and optional required experience, and AI will analyze and populate all form fields below automatically.
          </p>
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-xs font-semibold">Raw Job Description</Label>
            <Textarea
              placeholder="e.g. We are looking for a Senior React Developer to join our team in Hyderabad. Candidates should have 5+ years of experience with React, TypeScript, and Tailwind. They will design web portals and build modular UI components."
              rows={4}
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              className="bg-white/70"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-semibold">Required Experience (Years - Optional)</Label>
              <Input
                type="number"
                placeholder="e.g. 5"
                min={0}
                value={aiExperience}
                onChange={(e) => setAiExperience(e.target.value)}
                className="bg-white/70"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAiAutofill}
                disabled={aiLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 rounded-xl shadow transition-all duration-300 h-10 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing & Autofilling...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate & Autofill</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-blue-500" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Job Title *</Label>
            <Input placeholder="e.g. Senior React Developer" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input placeholder="Engineering" {...register('department')} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input placeholder="Hyderabad / Remote" {...register('location')} />
          </div>
          <div className="space-y-1.5">
            <Label>Employment Type</Label>
            <Controller name="employment_type" control={control} render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller name="status" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Vacancies</Label>
            <Input type="number" min={1} max={100} placeholder="1" {...register('vacancies')} />
          </div>
          <div className="space-y-1.5">
            <Label>Career Portal Closing Date</Label>
            <Input type="date" {...register('closing_date')} />
            <p className="text-xs text-slate-400">Job is hidden from the career portal after this date</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 p-4 bg-slate-50/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-800">Emergency Hiring</Label>
              <p className="text-xs text-slate-400">Marking this will prioritize this opening at the top of the careers page</p>
            </div>
            <Controller
              name="emergency"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Description *</Label>
            <Textarea placeholder="Describe the role, responsibilities, and what you're looking for…" rows={5} {...register('description')} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ListTodo className="h-4.5 w-4.5 text-indigo-500" />
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Required Skills</Label>
            <Controller name="skills" control={control} render={({ field }) => (
              <TagInput value={field.value} onChange={field.onChange} placeholder="Add skill, press Enter" />
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Min Experience (years)</Label>
            <Input type="number" min={0} max={50} {...register('min_experience_years')} />
          </div>
          <div className="space-y-1.5">
            <Label>Education Required</Label>
            <Input placeholder="e.g. Bachelor's in CS" {...register('education')} />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Certifications</Label>
            <Controller name="certifications" control={control} render={({ field }) => (
              <TagInput value={field.value} onChange={field.onChange} placeholder="Add certification, press Enter" />
            )} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Coins className="h-4.5 w-4.5 text-emerald-500" />
            Salary Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 pt-5">
          <div className="space-y-1.5">
            <Label>Salary Min (₹)</Label>
            <Input type="number" placeholder="500000" {...register('salary_min')} />
          </div>
          <div className="space-y-1.5">
            <Label>Salary Max (₹)</Label>
            <Input type="number" placeholder="1000000" {...register('salary_max')} />
            {errors.salary_max && <p className="text-xs text-red-500">{errors.salary_max.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
            Automatic Job Board Syndication
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 p-4 bg-slate-50/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-800">Post to LinkedIn</Label>
              <p className="text-xs text-slate-400">Automatically post this job opening to LinkedIn network</p>
            </div>
            <Controller
              name="post_to_linkedin"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 p-4 bg-slate-50/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-800">Post to Naukri</Label>
              <p className="text-xs text-slate-400">Syndicate this job opening to Naukri job portal</p>
            </div>
            <Controller
              name="post_to_naukri"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90 backdrop-blur-sm border border-slate-100/80 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-purple-500" />
              Screening Weights
            </CardTitle>
            <p className="text-xs font-semibold text-slate-500">
              Must sum to 100. Current total:{' '}
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-xs font-bold",
                total === 100 
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' 
                  : 'text-rose-700 bg-rose-50 border border-rose-100'
              )}>
                {total}%
              </span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
          {([['skill_weight', 'Skills'], ['experience_weight', 'Experience'], ['education_weight', 'Education'], ['certification_weight', 'Certifications']] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label} (%)</Label>
              <Input type="number" min={0} max={100} {...register(key)} />
            </div>
          ))}
          {errors.skill_weight && <p className="col-span-full text-xs text-red-500">{errors.skill_weight.message}</p>}
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        disabled={loading} 
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-11 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Saving…</span>
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}
