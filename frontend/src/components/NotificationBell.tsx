import { useState, useRef, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type Notification } from '@/api/notifications'
import { Button } from '@/components/ui/button'

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const { data: response } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getUnread(),
    refetchInterval: 5000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = response?.data || []
  const unreadCount = notifications.length

  return (
    <div className="relative" ref={ref}>
      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className="h-9 w-9 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white shadow-2xl rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h4 className="font-semibold text-slate-800">Notifications</h4>
            <span className="text-xs font-medium text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-slate-200" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n: Notification) => (
                  <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{n.title}</p>
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 font-medium pt-1">
                          {formatTimeAgo(n.created_at)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => markRead.mutate(n.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
