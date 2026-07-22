import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Zap, TrendingUp, Users, ShieldCheck, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import motivityIcon from '@/assets/motivityicon.jpg'
import loginBackgroundArtwork from '@/assets/login_background_artwork.png'
import loginHeroArtwork from '@/assets/login_hero_artwork.png'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginData = z.infer<typeof loginSchema>

function StatChip({
  icon: Icon, iconBg, iconColor, value, label, delay = 0, className = '',
}: {
  icon: React.ElementType; iconBg: string; iconColor: string
  value: string; label: string; delay?: number; className?: string
}) {
  return (
    <div
      className={`float-anim absolute bg-white/75 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-200/50 flex items-center gap-3 transition-all duration-300 hover:scale-105 hover:bg-white/90 hover:border-indigo-200/50 ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-lg font-black text-slate-800 leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  )
}


export function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isHeroHovered, setIsHeroHovered] = useState(false)

  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 })
  const [hoveredField, setHoveredField] = useState<'email' | 'password' | null>(null)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const activeField = focusedField || hoveredField

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const emailRegister = register('email')
  const passwordRegister = register('password')

  const onLogin = async (data: LoginData) => {
    setLoading(true)
    try {
      const role = await login(data.email, data.password)
      // Route based on actual role from database
      const r = (role ?? '').toLowerCase()
      if (r === 'superadmin' || r === 'super admin' || r === 'super_admin') {
        navigate('/users')
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Invalid credentials'
      setErrorMessage(msg)
      setErrorModalOpen(true)
      setValue('password', '') // Clear the password input bar
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Define dynamic colors for the liquid mouse-following animation blobs
  const followerColors = activeField === 'email'
    ? 'from-sky-500/40 via-blue-500/20'
    : activeField === 'password'
    ? 'from-rose-500/40 via-pink-500/20'
    : 'from-violet-600/60 via-purple-500/35'

  return (
    <div onMouseMove={handleMouseMove} className="flex flex-col min-h-screen bg-white text-slate-800 overflow-hidden relative">
      {/* Global Background Artwork Watermark */}
      <img
        src={loginBackgroundArtwork}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.08] pointer-events-none z-0"
      />
      {/* Dynamic Color-Shifting Glossy Liquid Follower (Halo & Core) */}
      <div
        className={`pointer-events-none fixed z-0 w-[550px] h-[550px] rounded-full bg-gradient-to-tr ${followerColors} to-transparent blur-[90px] transition-all duration-300 ease-out`}
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className={`pointer-events-none fixed z-0 w-[220px] h-[220px] rounded-full bg-gradient-to-tr ${followerColors} to-transparent blur-[45px] transition-all duration-500 ease-out`}
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden relative z-10">

        {/* LEFT: hero panel */}
        <div 
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          className="hidden md:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-black border-r border-slate-900"
        >
          <img
            src={loginHeroArtwork}
            alt="TalentScout AI Hero Background"
            className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none z-0"
          />
          {/* Black Gradient Overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-tr from-black via-black/40 to-transparent z-0 transition-opacity duration-500 ease-in-out" 
            style={{ opacity: isHeroHovered ? 0 : 1 }}
          />
          {/* Violet Gradient Overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-tr from-violet-950 via-purple-900/40 to-transparent z-0 transition-opacity duration-500 ease-in-out" 
            style={{ opacity: isHeroHovered ? 1 : 0 }}
          />

          {/* Branding and Heading Info */}
          <div className="relative z-10 space-y-4 pointer-events-none max-w-lg mt-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
              AI-Powered Recruitment Portal
            </div>
            <h3 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white">
              Hire smarter with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400">
                TalentScout AI
              </span>
            </h3>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Match candidates, screen resumes, and manage schedules all in a unified, intelligence-driven recruitment workflow.
            </p>
          </div>


          {/* Floating glass chips in corners, adjusted for light background */}
          <StatChip icon={Zap}         iconBg="bg-indigo-50"  iconColor="text-indigo-600"  value="70%"  label="Faster Sourcing"   delay={0}   className="top-[18%] right-[8%] z-20" />
          <StatChip icon={ShieldCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" value="0%"   label="Unconscious Bias"  delay={2.2} className="bottom-[8%] right-[8%] z-20" />
        </div>

        {/* RIGHT: form panel */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-8 py-12 md:px-16 bg-slate-50/40 relative">
          {/* Subtle light dotted grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#6366f10c_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-200/50 shadow-[0_24px_60px_rgba(99,102,241,0.08)]">

            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <img src={motivityIcon} alt="TalentScout" className="h-7 w-7 rounded-lg object-cover" />
              </div>
              <span className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800 tracking-tight">TalentScout AI</span>
            </div>

            {/* Headline */}
            <div className="space-y-1.5">
              <h2 className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight">Welcome back</h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">Intelligent recruitment starts here.</p>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit(onLogin)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none transition-colors ${activeField === 'email' ? 'text-sky-500' : 'text-slate-400'}`}>
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    onMouseEnter={() => setHoveredField('email')}
                    onMouseLeave={() => setHoveredField(null)}
                    onFocus={() => setFocusedField('email')}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all font-medium shadow-sm ${
                      activeField === 'email'
                        ? 'border-sky-400 ring-2 ring-sky-100/70 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                        : 'border-slate-200'
                    }`}
                    {...emailRegister}
                    onBlur={(e) => {
                      emailRegister.onBlur(e)
                      setFocusedField(null)
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1.5 font-semibold">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none transition-colors ${activeField === 'password' ? 'text-rose-500' : 'text-slate-400'}`}>
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    onMouseEnter={() => setHoveredField('password')}
                    onMouseLeave={() => setHoveredField(null)}
                    onFocus={() => setFocusedField('password')}
                    className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all font-medium shadow-sm ${
                      activeField === 'password'
                        ? 'border-rose-400 ring-2 ring-rose-100/70 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'border-slate-200'
                    }`}
                    {...passwordRegister}
                    onBlur={(e) => {
                      passwordRegister.onBlur(e)
                      setFocusedField(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1.5 font-semibold">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-750 hover:to-blue-700 disabled:opacity-60 text-white font-extrabold rounded-xl transition-all duration-300 transform active:scale-[0.98] cursor-pointer shadow-[0_8px_30px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.5)] border border-white/10 tracking-wide"
              >
                {loading ? 'Signing in…' : 'Login'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
              Contact your administrator to request access.
            </p>

          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-100 py-5 px-8">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 font-medium">© 2026 TalentScout AI. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(l => (
              <a key={l} href="#" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium">{l}</a>
            ))}
          </div>
        </div>
      </footer>
      {/* Custom Error Dialog */}
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent className="sm:max-w-[400px] border border-slate-200 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 text-slate-800">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
              <AlertCircle className="h-6 w-6 text-rose-600 animate-bounce" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              {errorMessage.toLowerCase().includes('provision') ? 'Account Not Provisioned' : 'Invalid Credentials'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed px-2 font-medium">
              {errorMessage || 'The email or password you entered is incorrect. Please try again.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <DialogClose asChild>
              <button
                type="button"
                className="w-full max-w-[200px] py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:shadow-indigo-100 hover:shadow-xl text-white font-bold rounded-xl transition-all duration-300 text-xs active:scale-[0.98] shadow-md cursor-pointer"
              >
                Try Again
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
