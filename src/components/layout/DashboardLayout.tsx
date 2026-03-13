import { useState, useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { auth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { NavItem } from '@/types/database'

interface Props {
  children: React.ReactNode
  title: string
  topbarRight?: React.ReactNode
  nav: { section?: string; items: NavItem[] }[]
  accentColor?: 'gold' | 'red' | 'blue'
  accountBox?: { id: string; label: string }
  logoSubtitle?: string
}

function AdminNotifications() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifs()
    const iv = setInterval(fetchNotifs, 30000)
    return () => clearInterval(iv)
  }, [])

  async function fetchNotifs() {
    const { data } = await supabase.from('notifications')
      .select('*')
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data ?? [])
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  async function markAllRead() {
    await supabase.from('notifications')
      .update({ is_read: true })
      .is('user_id', null)
      .eq('is_read', false)
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length

  const iconMap: Record<string, string> = {
    admin_target_reached: '🎯',
    admin_breach: '🚨',
    default: '🔔',
  }

  const colorMap: Record<string, string> = {
    admin_target_reached: 'border-l-[var(--gold)] bg-[rgba(212,168,67,.04)]',
    admin_breach: 'border-l-[var(--red)] bg-[rgba(255,51,82,.04)]',
    default: 'border-l-[var(--bdr2)]',
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative w-[36px] h-[36px] flex items-center justify-center bg-[var(--bg3)] border border-[var(--dim)] hover:border-[var(--bdr2)] transition-all cursor-pointer">
        <span className="text-[15px]">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-[4px] -right-[4px] w-[16px] h-[16px] rounded-full bg-[var(--red)] text-white text-[8px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[42px] w-[340px] bg-[var(--bg2)] border border-[var(--bdr)] shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bdr)]">
            <span className="text-[11px] font-semibold">Notifications {unread > 0 && <span className="text-[var(--red)]">({unread} new)</span>}</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[9px] uppercase tracking-[1px] text-[var(--text3)] hover:text-[var(--gold)] cursor-pointer bg-none border-none">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-[11px] text-[var(--text3)]">No notifications</div>
            ) : notifs.map(n => (
              <div key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex gap-3 px-4 py-3 border-b border-[var(--dim)] border-l-2 cursor-pointer hover:bg-[var(--bg3)] transition-all ${
                  !n.is_read ? (colorMap[n.type] ?? colorMap.default) : 'border-l-transparent opacity-50'
                }`}>
                <span className="text-[16px] flex-shrink-0 mt-[1px]">{iconMap[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold mb-[2px]">{n.title}</div>
                  <div className="text-[10px] text-[var(--text3)] leading-[1.5]">{n.body}</div>
                  <div className="text-[9px] text-[var(--text3)] mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.is_read && <span className="w-[6px] h-[6px] rounded-full bg-[var(--red)] flex-shrink-0 mt-[5px]"/>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DashboardLayout({ children, title, topbarRight, nav, accentColor = 'gold', accountBox, logoSubtitle }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : '?'

  const subtitleMap: Record<string, string> = {
    gold: logoSubtitle ?? 'Trader Portal',
    red:  logoSubtitle ?? 'Admin Panel',
    blue: logoSubtitle ?? 'Support Agent',
  }

  const handleLogout = async () => {
    await auth.signOut()
    navigate('/login')
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        logo={{ icon: '✦', name: 'The Funded\nDiaries', subtitle: subtitleMap[accentColor] }}
        accountBox={accountBox}
        nav={nav}
        user={{
          initials,
          name: profile ? `${profile.first_name} ${profile.last_name}` : '…',
          role: profile?.role ?? 'trader',
        }}
        onLogout={handleLogout}
        accentColor={accentColor}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Marketing Navbar */}
        <nav className="bg-[rgba(10,10,15,.95)] border-b border-[var(--bdr)] flex-shrink-0">
          <div className="mx-auto px-6 h-[48px] flex items-center justify-between">
            <div className="hidden md:flex items-center gap-8">
              {[['How It Works','/#how'],['Challenge Plans','/#plans'],['Payouts','/#payouts'],['Features','/#features'],['FAQ','/#faq']].map(([l,h])=>(
                <a key={l} href={h} className="text-[11px] tracking-[1px] uppercase text-[var(--text2)] hover:text-[var(--gold)] transition-colors no-underline">{l}</a>
              ))}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button onClick={() => navigate('/dashboard')} className="px-[14px] py-[6px] text-[9px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all">
                Dashboard →
              </button>
              <button onClick={handleLogout} className="px-[14px] py-[6px] text-[9px] tracking-[2px] uppercase font-bold bg-transparent border border-[var(--bdr2)] text-[var(--text2)] hover:text-[var(--gold)] hover:border-[var(--gold)] cursor-pointer transition-all">
                Log Out
              </button>
            </div>
          </div>
        </nav>

        {/* Topbar */}
        <div className="h-[48px] bg-[var(--bg2)] border-b border-[var(--bdr)] flex items-center px-[22px] gap-[14px] flex-shrink-0">
          <h1 className="serif text-[17px] font-bold">{title}</h1>
          <div className="ml-auto flex items-center gap-[9px]">
            {topbarRight}
            {isAdmin && <AdminNotifications />}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-[22px] flex flex-col gap-[18px]">
          {children}
        </main>
      </div>
    </div>
  )
}
