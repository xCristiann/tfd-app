import { Sidebar } from './Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { auth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
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
