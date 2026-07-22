import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { notificationsApi } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, ShieldAlert, ShieldCheck, Mail, User, Shield, Trash2, Megaphone } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'

export function UsersManagementPage() {
  const qc = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'Manager' | 'HR'>('Manager')
  const [submitting, setSubmitting] = useState(false)

  // Broadcast state
  const [bTitle, setBTitle] = useState('System Announcement')
  const [bMessage, setBMessage] = useState('')
  const [bTarget, setBTarget] = useState<'All' | 'Manager' | 'HR'>('All')
  const [broadcasting, setBroadcasting] = useState(false)

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null)

  const { data: recruiters, isLoading } = useQuery({
    queryKey: ['recruiters'],
    queryFn: () => authApi.listRecruiters().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: { email: string; password?: string; full_name: string }) =>
      authApi.createRecruiter(data, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiters'] })
      toast.success(`${role} created successfully!`)
      setFullName('')
      setEmail('')
      setPassword('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to create user'
      toast.error(msg)
    },
    onSettled: () => setSubmitting(false),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteRecruiter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiters'] })
      toast.success('Recruiter deleted successfully')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to delete user'
      toast.error(msg)
    },
  })

  const handleDelete = (id: string, name: string) => {
    setUserToDelete({ id, name })
    setDeleteConfirmOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    createMutation.mutate({
      full_name: fullName,
      email,
      password,
    })
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bMessage.trim()) {
      toast.error('Please enter a notification message')
      return
    }
    setBroadcasting(true)
    try {
      await notificationsApi.broadcast(bTitle, bMessage, bTarget)
      toast.success('Broadcast notification sent successfully!')
      setBMessage('')
      setBTitle('System Announcement')
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to send broadcast'
      toast.error(msg)
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Control Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Super Admin Panel to provision accounts and broadcast alerts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* Create Recruiter Form */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-500" />
                Provision Account
              </CardTitle>
              <CardDescription>Create a new Manager or HR recruiter account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Temporary Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>System Role</Label>
                  <Select value={role} onValueChange={(v: 'Manager' | 'HR') => setRole(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-750 hover:to-indigo-750 text-white font-bold py-2 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? 'Creating User...' : 'Create Recruiter'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Broadcast Notification Form */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-violet-500" />
                Broadcast Notification
              </CardTitle>
              <CardDescription>Send a system-wide alert to Manager and HR accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="broadcastTitle">Alert Title</Label>
                  <Input
                    id="broadcastTitle"
                    placeholder="System Announcement"
                    value={bTitle}
                    onChange={(e) => setBTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="broadcastMessage">Message Content</Label>
                  <textarea
                    id="broadcastMessage"
                    placeholder="Type your announcement here..."
                    value={bMessage}
                    onChange={(e) => setBMessage(e.target.value)}
                    className="w-full min-h-[80px] p-3 bg-gray-50 border border-gray-205 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Target Audience</Label>
                  <Select value={bTarget} onValueChange={(v: 'All' | 'Manager' | 'HR') => setBTarget(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Users</SelectItem>
                      <SelectItem value="Manager">Managers Only</SelectItem>
                      <SelectItem value="HR">HR Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={broadcasting}
                  className="w-full bg-gradient-to-r from-purple-650 to-indigo-600 hover:from-purple-750 hover:to-indigo-750 text-white font-bold py-2 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                >
                  {broadcasting ? 'Sending Alert...' : 'Send Broadcast'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recruiters List */}
        <Card className="lg:col-span-2 bg-white/95 backdrop-blur-sm shadow-md border border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Existing Recruiter Accounts</CardTitle>
            <CardDescription>All Manager and HR accounts currently provisioned.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">Loading accounts...</div>
            ) : !recruiters || recruiters.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No recruiters provisioned yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Provisioned Date</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recruiters.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{rec.full_name}</td>
                        <td className="px-6 py-4 text-slate-600">{rec.email}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${
                              rec.role?.toLowerCase() === 'manager'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                            }`}
                          >
                            {rec.role?.toLowerCase() === 'manager' ? (
                              <ShieldCheck className="h-3 w-3" />
                            ) : (
                              <ShieldAlert className="h-3 w-3" />
                            )}
                            {rec.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rec.id, rec.full_name)}
                            disabled={deleteMutation.isPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => !open && setDeleteConfirmOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 font-semibold">{userToDelete?.name}</strong>? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
            <DialogClose asChild>
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteConfirmOpen(false)
                  setUserToDelete(null)
                }}
                className="rounded-xl px-4 py-2 hover:bg-slate-100 transition-colors text-slate-600 font-semibold text-xs border border-slate-200"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (userToDelete) {
                  deleteMutation.mutate(userToDelete.id)
                  setDeleteConfirmOpen(false)
                  setUserToDelete(null)
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-rose-200 transition-all text-xs"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
