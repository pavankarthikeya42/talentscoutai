import { Link, NavLink, Outlet, useSearchParams, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { StatusModal } from '@/components/portal/StatusModal'
import { cn } from '@/lib/utils'
import motivityLogo from '@/assets/MotivityLogo2.png'

export function PublicLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isStatusOpen = searchParams.get('checkStatus') === 'true'
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

  const setIsStatusOpen = (open: boolean) => {
    if (open) {
      setSearchParams({ checkStatus: 'true' })
    } else {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('checkStatus')
      setSearchParams(newParams)
    }
  }

  return (
    <div className="portal-layout text-on-surface antialiased overflow-x-hidden min-h-screen">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 border-b border-slate-150/85 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="flex items-center gap-2">
            <Link to="/careers" className="hover:scale-[1.01] transition-transform duration-300 block">
              <img
                alt="Motivity Labs Logo"
                className="h-8 object-contain"
                src={motivityLogo}
              />
            </Link>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-2 items-center">
              <NavLink 
                to="/careers" 
                end
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700 font-bold" 
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50/50"
                  )
                }
              >
                Home
              </NavLink>
              <NavLink 
                to="/careers/openings"
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300",
                    isActive 
                      ? "bg-indigo-50 text-indigo-700 font-bold" 
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50/50"
                  )
                }
              >
                Careers
              </NavLink>
              <button 
                onClick={() => setIsStatusOpen(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50/50 transition-all duration-300 bg-transparent border-none outline-none cursor-pointer"
              >
                Check Status
              </button>
            </nav>
          </div>

          <button className="md:hidden text-primary p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <StatusModal open={isStatusOpen} onOpenChange={setIsStatusOpen} />

      {/* Footer */}
      <footer className="w-full py-16 bg-slate-900 text-white border-t border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
          {/* Brand & Description */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img
                alt="Motivity Labs Logo"
                className="h-7 object-contain brightness-0 invert"
                src={motivityLogo}
              />
            </div>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Motivity Labs is a global technology services company delivering Product Engineering, Quality Engineering, Cloud, and Data Analytics solutions.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-white tracking-wide mb-1 text-sm uppercase">Quick Links</h4>
            <Link className="text-sm text-slate-400 hover:text-indigo-400 transition-colors" to="/careers">Home</Link>
            <Link className="text-sm text-slate-400 hover:text-indigo-400 transition-colors" to="/careers/openings">Open Openings</Link>
            <button 
              onClick={() => setIsStatusOpen(true)}
              className="text-sm text-slate-400 hover:text-indigo-400 transition-colors bg-transparent border-none outline-none text-left p-0 cursor-pointer"
            >
              Check Status
            </button>
          </div>

          {/* Locations */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-white tracking-wide mb-1 text-sm uppercase">Our Locations</h4>
            <div className="space-y-2 text-xs text-slate-400 leading-normal">
              <p><strong className="text-slate-350">Texas:</strong> Irving, TX (HQ)</p>
              <p><strong className="text-slate-350">Florida:</strong> Miami, FL</p>
              <p><strong className="text-slate-350">Hyderabad:</strong> Knowledge City, IN</p>
              <p><strong className="text-slate-350">Toronto:</strong> Ontario, CA</p>
              <p><strong className="text-slate-350">Dubai:</strong> Meydan Road, UAE</p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-white tracking-wide mb-1 text-sm uppercase">Connect</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Interested in working with us or learning more about our career opportunities?
            </p>
            <p className="text-sm text-slate-300 font-semibold mt-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">phone</span> USA: +1 214-776-6158
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto gap-4">
          <p className="text-xs text-slate-500">
            © 2026 Motivity Labs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
