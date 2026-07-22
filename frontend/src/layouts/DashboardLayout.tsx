import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import AOS from 'aos'
import 'aos/dist/aos.css'
import {
  LayoutDashboard, Briefcase, Users, Upload, CalendarDays,
  MessageSquare, BarChart3, LogOut, Menu, X, ClipboardList,
} from 'lucide-react'
import motivityIcon from '@/assets/motivityicon.jpg'
import motivitylogo2 from '@/assets/motivitylogo2.png'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { ChatWidget } from '@/components/ChatWidget'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Jobs', icon: Briefcase, to: '/jobs' },
  { label: 'Applications', icon: ClipboardList, to: '/applications' },
  { label: 'Candidates', icon: Users, to: '/candidates' },
  { label: 'Upload Resumes', icon: Upload, to: '/resumes/upload' },
  { label: 'Interviews', icon: CalendarDays, to: '/interviews' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  { label: 'Manage Users', icon: Users, to: '/users' },
]

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-cubic',
    })
  }, [])

  useEffect(() => {
    AOS.refresh()
  }, [location.pathname])

  const isManager = user?.role?.toLowerCase() === 'manager'
  const isHR = user?.role?.toLowerCase() === 'hr'
  const isSuperAdmin = user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super admin'

  const filteredNavItems = navItems.filter((item) => {
    if (isSuperAdmin) {
      return ['Manage Users'].includes(item.label)
    }
    if (isManager) {
      // Manager can view: Dashboard, Jobs, Candidates (read-only), Interviews (own)
      return ['Dashboard', 'Jobs', 'Candidates', 'Interviews'].includes(item.label)
    }
    if (isHR) {
      return ['Dashboard', 'Jobs', 'Applications', 'Candidates', 'Upload Resumes', 'Interviews', 'Analytics'].includes(item.label)
    }
    return true
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-gradient-to-b from-white via-slate-50 to-indigo-50/30 text-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-200/80">
        <div className="relative">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-45 blur animate-pulse" />
          <div className="relative p-1 rounded-xl bg-white border border-slate-100">
            <img src={motivityIcon} alt="TalentScout" className="h-8 w-8 rounded-lg object-cover" />
          </div>
        </div>
          
        <div className="flex flex-col">
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 tracking-tight text-base leading-none">
            TalentScout AI
          </span>
          <span className="text-[9px] font-bold text-indigo-600/80 tracking-wider uppercase mt-1">
            Powered by Motivity Labs
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 transform group relative',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50/60 border border-indigo-100/60 text-indigo-700 font-semibold shadow-md shadow-indigo-500/5 translate-x-1'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 hover:translate-x-1',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110',
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    )} />
                    <span>{item.label}</span>
                  </div>
                  
                  {isActive && (
                    <div className="absolute left-0 top-1/4 h-1/2 w-0.5 rounded-r-full bg-gradient-to-b from-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.95)]" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User Profile & Actions Footer */}
      <div className="border-t border-slate-200/80 p-4 space-y-4">
        <div className="flex justify-center my-3">
          <img src={motivitylogo2} alt="Motivity Logo" className="h-9 w-auto" />
        </div>
        {/* User Badge */}
        <NavLink
          to="/settings/profile"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            cn(
              'relative group overflow-hidden p-3 rounded-2xl flex items-center gap-3 transition-all duration-300 border cursor-pointer',
              isActive
                ? 'bg-indigo-50/30 border-black-200/60 shadow-sm'
                : 'bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300/80'
            )
          }
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-sm" />
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 font-extrabold text-white text-sm shadow-md transition-transform duration-300 group-hover:scale-105">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.display_name ? `@${user.display_name}` : user?.email}</p>
          </div>
        </NavLink>
        
        
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-3 rounded-xl px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 group" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-rose-550 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#f3f4fd]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/85 bg-white shrink-0 sidebar-glow-hover">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white z-50 sidebar-glow-hover">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 text-slate-800">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-950 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">TalentScout AI</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 font-extrabold text-white text-xs">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </header>

        {/* Notification bell — fixed top-right */}
        <div className="fixed top-4 right-6 z-50">
          <NotificationBell />
        </div>

        {/* AI chat — fixed bottom-right */}
        <div className="fixed bottom-6 right-6 z-50">
          <ChatWidget />
        </div>

        <main className="flex-1 overflow-y-auto p-6 bg-transparent relative">
          {/* Decorative ambient light blobs */}
          <div className="fixed top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-400/12 via-indigo-400/10 to-violet-400/12 blur-3xl pointer-events-none -z-10" />
          <div className="fixed bottom-1/4 left-10 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-purple-400/12 via-pink-400/8 to-indigo-400/10 blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="fixed top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-violet-300/8 to-blue-300/8 blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '12s' }} />
          
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
