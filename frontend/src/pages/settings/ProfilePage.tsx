import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { User, Mail, ShieldCheck, Pencil, AtSign, CheckCircle2, Fingerprint, RefreshCw, InfoIcon } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  display_name: z.string().min(2, 'Display name must be at least 2 characters').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})
type PasswordFormData = z.infer<typeof passwordSchema>

const ROLE_CONFIG: Record<string, { label: string }> = {
  hr: { label: 'HR' },
  manager: { label: 'Manager' },
  superadmin: { label: 'Super Admin' },
}

function FieldRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-black-400 last:border-0">
      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-indigo-50 border border-black-800 shrink-0">
        <Icon className="h-3.5 w-3.5 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-indigo-600">
          {label}
        </p>
        <p className="text-[13px] font-medium text-stone-800 truncate mt-0.5">
          {value ?? <span className="text-indigo-300 font-normal italic">Not set</span>}
        </p>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile().then((r) => r.data),
  })
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [isPassOpen, setIsPassOpen] = useState(false)

  const {
    register: registerInfo,
    handleSubmit: handleInfoSubmit,
    formState: { errors: infoErrors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: profile ? { full_name: profile.full_name, display_name: profile.display_name ?? '' } : undefined,
  })

  const {
    register: registerPass,
    handleSubmit: handlePassSubmit,
    reset: resetPass,
    formState: { errors: passErrors },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  const infoMutation = useMutation({
    mutationFn: (data: FormData) => authApi.updateProfile(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profile updated'); setIsInfoOpen(false) },
    onError: () => toast.error('Failed to update profile'),
  })

  const passMutation = useMutation({
    mutationFn: (data: PasswordFormData) => authApi.updateProfile({ password: data.password }),
    onSuccess: () => { resetPass(); toast.success('Password updated'); setIsPassOpen(false) },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update password'),
  })

  if (isLoading) return <PageLoader />

  const initial = profile?.full_name?.charAt(0).toUpperCase() ?? 'U'
  const roleKey = profile?.role?.toLowerCase() ?? ''
  const roleLabel = ROLE_CONFIG[roleKey]?.label ?? profile?.role ?? ''

  return (
    <div className="min-h-screen bg-indigo-50/60">
      <div className="max-w-[540px] mx-auto py-8 px-4 space-y-3">

        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Account settings</h1>
          <p className="text-[12.5px] text-indigo-400 mt-1">Manage your profile and keep your account secure</p>
        </div>

        {/* ── Identity card ── */}
        <div className="bg-white rounded-[18px] border border-indigo-200 overflow-hidden">
          {/* Orange top stripe */}
          <div className="h-[3px] bg-indigo-500" />

          {/* Hero section */}
          <div className="relative px-5 pt-4 pb-4">
            {/* Edit button — top right */}
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <DialogTrigger asChild>
                <button className="absolute top-4 right-4 h-7 px-2.5 rounded-[8px] border-none bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-indigo-600 transition-colors">
                  <Pencil className="h-3 w-3 text-white" />
                  Edit
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden border-indigo-200">
                <div className="h-[3px] bg-indigo-500" />
                <div className="p-6">
                  <DialogHeader className="mb-5">
                    <DialogTitle className="text-base font-bold text-stone-1000">Edit profile</DialogTitle>
                    <p className="text-xs text-stone-600 mt-0.5">Here you can edit your name and display name</p>
                  </DialogHeader>
                  <form onSubmit={handleInfoSubmit((d) => infoMutation.mutate(d))} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">New Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 pointer-events-none" />
                        <Input className="pl-9 h-10 rounded-xl border-indigo-200 bg-indigo-50/40 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="Your full name" {...registerInfo('full_name')} />
                      </div>
                      {infoErrors.full_name && <p className="text-xs text-red-600">{infoErrors.full_name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">New Display Name</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 pointer-events-none" />
                        <Input className="pl-9 h-10 rounded-xl border-indigo-200 bg-indigo-50/40 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="e.g. john_doe" {...registerInfo('display_name')} />
                      </div>
                      {infoErrors.display_name && <p className="text-xs text-red-500">{infoErrors.display_name.message}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" className="rounded-xl text-stone-500" onClick={() => setIsInfoOpen(false)}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={infoMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-green-700 text-white px-5">
                        {infoMutation.isPending ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>

            {/* Avatar + name */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="h-[62px] w-[62px] rounded-2xl bg-indigo-200 flex items-center justify-center text-indigo-900 text-xl font-bold border-2 border-indigo-300">
                  {initial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0 pt-1 pr-16">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-bold text-stone-900">{profile?.full_name}</h2>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                    <span className="h-[5px] w-[5px] rounded-full bg-indigo-500" />
                    {roleLabel}
                  </span>
                </div>
                <p className="text-[12.5px] text-stone-400 mt-1 truncate">{profile?.email}</p>
                {profile?.display_name
                  ? <p className="text-[11px] font-medium text-indigo-500 mt-0.5">@{profile.display_name}</p>
                  : <p className="text-[11px] text-indigo-300 italic mt-0.5">No display name set</p>}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-b border-black-400" />

          {/* Fields */}
          <div className="px-5">
            <FieldRow icon={User} label="Full name" value={profile?.full_name} />
            <FieldRow icon={AtSign} label="Display name" value={profile?.display_name ? `@${profile.display_name}` : null} />
            <FieldRow icon={Mail} label="Email address" value={profile?.email} />
            <FieldRow icon={ShieldCheck} label="Role" value={profile?.role} />
          </div>
        </div>

        {/* ── Security card ── */}
        <div className="bg-white rounded-[18px] border border-indigo-200 overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-3 border-b border-indigo-100 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-600">Security</span>
          </div>

          {/* Password row */}
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="h-[42px] w-[42px] rounded-[12px] bg-indigo-50 border border-indigo-400 flex items-center justify-center shrink-0">
              <Fingerprint className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-stone-800">Login Password</p>
              <p className="text-[11.5px] text-stone-600 mt-0.5 leading-snug">
                Please choose a strong, unique password to help protect your account.
              </p>
            </div>

            <Dialog open={isPassOpen} onOpenChange={setIsPassOpen}>
              <DialogTrigger asChild>
                <button className="h-8 px-3 rounded-[9px] border-none bg-indigo-600 text-white text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-indigo-800 transition-colors shrink-0">
                  <RefreshCw className="h-3 w-3 text-white" />
                  Change Password
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden border-indigo-200">
                <div className="h-[3px] bg-indigo-500" />
                <div className="p-6">
                  <DialogHeader className="mb-5">
                    <DialogTitle className="text-base font-bold text-stone-900">Update Your Password</DialogTitle>
                    <p className="text-xs text-red-400 mt-0.6">Choose a strong password with  8 characters long, including uppercase letters, lowercase letters, numbers, and symbols.</p>
                  </DialogHeader>
                  <form onSubmit={handlePassSubmit((d) => passMutation.mutate(d))} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">New Password</Label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 pointer-events-none" />
                        <Input type="password" placeholder="••••••••" className="pl-9 h-10 rounded-xl border-indigo-200 bg-indigo-50/40 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" {...registerPass('password')} />
                      </div>
                      {passErrors.password && <p className="text-xs text-red-500">{passErrors.password.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Confirm your Password</Label>
                      <div className="relative">
                        <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 pointer-events-none" />
                        <Input type="password" placeholder="••••••••" className="pl-9 h-10 rounded-xl border-indigo-200 bg-indigo-50/40 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" {...registerPass('confirm_password')} />
                      </div>
                      {passErrors.confirm_password && <p className="text-xs text-red-500">{passErrors.confirm_password.message}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="ghost" size="sm" className="rounded-xl text-stone-500" onClick={() => setIsPassOpen(false)}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={passMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-600 text-white px-5">
                        {passMutation.isPending ? 'Updating…' : 'Update password'}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Note hint */}
          <div className="mx-5 mb-4 px-3 py-2.5 bg-red-50 rounded-[10px] border border-red-200 flex items-center gap-2.5">
            <InfoIcon className="h-4.5 w-4.5 text-red-800 shrink-0" />
            <span className="text-[11.5px] text-red-800 leading-snug">
              Note: Your password must be at least 8 characters long, including uppercase letters, lowercase letters, numbers, and symbols.
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
