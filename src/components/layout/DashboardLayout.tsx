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
