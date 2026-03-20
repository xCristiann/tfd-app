import { useState, useEffect, useRef } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileNav } from './MobileNav'
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

function TraderNotifications({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!userId) return
    fetchNotifs()
    const iv = setInterval(fetchNotifs, 5000)
    const channel = supabase.channel(`trader-notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => fetchNotifs())
      .subscribe()
    return () => { clearInterval(iv); supabase.removeChannel(channel) }
  }, [userId])

  async function fetchNotifs() {
    if (!userId) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    setNotifs(data ?? [])
  }
  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
  }
  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
  }
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length
  const colorMap: Record<string, string> = {
    target_reached: 'border-l-[#2255CC] bg-[#EEF3FF]',
    breach: 'border-l-red-400 bg-red-50',
    breach_warning: 'border-l-amber-400 bg-amber-50',
    default: 'border-l-[#E8EEF8]',
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative w-9 h-9 flex items-center justify-center bg-[#EEF3FF] border border-[#C5D5FA] rounded-lg hover:bg-[#E0EAFF] transition-colors cursor-pointer">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4.5 4.5 0 0 0-4.5 4.5v2L2 10h12l-1.5-1.5v-2A4.5 4.5 0 0 0 8 2zm0 12a1.5 1.5 0 0 1-1.5-1.5h3A1.5 1.5 0 0 1 8 14z" fill="#2255CC"/></svg>
        {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center" style={{fontWeight:700}}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-[#E8EEF8] rounded-xl shadow-xl z-50" style={{animation:'slideIn .15s ease'}}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8EEF8]">
            <span className="text-[12px] font-600 text-[#1A3A6B]" style={{fontWeight:600}}>Notifications {unread > 0 && <span className="text-red-500">({unread})</span>}</span>
            {unread > 0 && <button onClick={markAllRead} className="text-[10px] text-[#2255CC] cursor-pointer bg-none border-none font-500" style={{fontWeight:500}}>Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0
              ? <div className="py-10 text-center text-[12px] text-[#8FA3BF]">No notifications</div>
              : notifs.map(n => (
                <div key={n.id} onClick={async () => { await markRead(n.id); setOpen(false); navigate(n.type === 'payout' ? '/dashboard/payouts' : '/dashboard') }}
                  className={`flex gap-3 px-4 py-3 border-b border-[#F4F7FD] border-l-2 cursor-pointer hover:bg-[#F4F7FD] transition-all ${!n.is_read ? (colorMap[n.type] ?? colorMap.default) : 'border-l-transparent opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-600 text-[#1A3A6B] mb-0.5" style={{fontWeight:600}}>{n.title}</div>
                    <div className="text-[11px] text-[#8FA3BF] leading-relaxed">{n.body}</div>
                    <div className="text-[10px] text-[#BCC9DA] mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1"/>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AdminNotifications() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifs()
    const iv = setInterval(fetchNotifs, 5000)
    const channel = supabase.channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => fetchNotifs())
      .subscribe()
    return () => { clearInterval(iv); supabase.removeChannel(channel) }
  }, [])

  async function fetchNotifs() {
    const { data } = await supabase.from('notifications').select('*').is('user_id', null).order('created_at', { ascending: false }).limit(20)
    setNotifs(data ?? [])
  }
  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
  }
  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).is('user_id', null).eq('is_read', false)
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
  }
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative w-9 h-9 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4.5 4.5 0 0 0-4.5 4.5v2L2 10h12l-1.5-1.5v-2A4.5 4.5 0 0 0 8 2zm0 12a1.5 1.5 0 0 1-1.5-1.5h3A1.5 1.5 0 0 1 8 14z" fill="#DC2626"/></svg>
        {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center" style={{fontWeight:700}}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-[#E8EEF8] rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8EEF8]">
            <span className="text-[12px] font-600 text-[#1A3A6B]" style={{fontWeight:600}}>Admin alerts {unread > 0 && <span className="text-red-500">({unread})</span>}</span>
            {unread > 0 && <button onClick={markAllRead} className="text-[10px] text-red-500 cursor-pointer bg-none border-none">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0
              ? <div className="py-10 text-center text-[12px] text-[#8FA3BF]">No alerts</div>
              : notifs.map(n => (
                <div key={n.id} onClick={async () => { await markRead(n.id); setOpen(false); const m = n.title.match(/[—-]\s*(TFD-[\w-]+)/); navigate(m ? `/admin/traders?account=${m[1]}` : '/admin/traders') }}
                  className={`flex gap-3 px-4 py-3 border-b border-[#F4F7FD] border-l-2 cursor-pointer hover:bg-[#F4F7FD] transition-all ${!n.is_read ? 'border-l-red-400 bg-red-50' : 'border-l-transparent opacity-50'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-600 text-[#1A3A6B] mb-0.5" style={{fontWeight:600}}>{n.title}</div>
                    <div className="text-[11px] text-[#8FA3BF]">{n.body}</div>
                    <div className="text-[10px] text-[#BCC9DA] mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1"/>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DashboardLayout({ children, title, topbarRight, nav, accentColor = 'gold', accountBox, logoSubtitle }: Props) {
  const isMobile = useIsMobile()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?'
  const subtitleMap: Record<string, string> = {
    gold: logoSubtitle ?? 'Trader Portal',
    red:  logoSubtitle ?? 'Admin Panel',
    blue: logoSubtitle ?? 'Support Agent',
  }
  const handleLogout = async () => { await auth.signOut(); navigate('/login') }
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FB]">
      <Sidebar
        logo={{ icon: '◆', name: 'The Funded Diaries', subtitle: subtitleMap[accentColor] }}
        accountBox={accountBox}
        nav={nav}
        user={{ initials, name: profile ? `${profile.first_name} ${profile.last_name}` : '…', role: profile?.role ?? 'trader' }}
        onLogout={handleLogout}
        accentColor={accentColor}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top strip — marketing links */}
        <div className="h-10 bg-[#1A3A6B] flex items-center px-5 flex-shrink-0">
          <div className="flex items-center gap-0 mr-auto">
            {[['How It Works','/#how'],['Challenge Plans','/#plans'],['Payouts','/#payouts'],['Features','/#features'],['Help Centre','/help']].map(([l,h])=>(
              <a key={l} href={h} className="text-[10px] font-500 text-[rgba(255,255,255,.4)] hover:text-white transition-colors no-underline px-3 h-10 flex items-center" style={{fontWeight:500}}>{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 text-[10px] font-600 bg-[#2255CC] text-white border-none cursor-pointer rounded hover:bg-[#1A44B0] transition-colors" style={{fontWeight:600}}>Dashboard</button>
            <button onClick={handleLogout} className="px-3 py-1.5 text-[10px] font-600 bg-transparent border border-[rgba(255,255,255,.2)] text-[rgba(255,255,255,.6)] cursor-pointer rounded hover:border-white hover:text-white transition-all" style={{fontWeight:600}}>Log Out</button>
          </div>
        </div>

        {/* Page topbar */}
        <div className="h-12 bg-white border-b border-[#E8EEF8] flex items-center px-5 gap-3 flex-shrink-0">
          <h1 className="text-[15px] font-600 text-[#1A3A6B]" style={{fontWeight:600}}>{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {topbarRight}
            {isAdmin ? <AdminNotifications/> : profile?.id ? <TraderNotifications userId={profile.id}/> : null}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {children}
        </main>
      </div>
    </div>
  )
}