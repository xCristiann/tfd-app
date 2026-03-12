import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/database'

interface SidebarProps {
  logo: { icon: string; name: string; subtitle: string }
  accountBox?: { id: string; label: string }
  nav: { section?: string; items: NavItem[] }[]
  user: { initials: string; name: string; role: string }
  onLogout: () => void
  accentColor?: 'gold' | 'red' | 'blue'
}

const accents = {
  gold: { active: 'bg-[rgba(212,168,67,.07)] text-[var(--gold)] border-l-[var(--gold)]', hover: 'hover:bg-[rgba(212,168,67,.04)]', icon: 'border-[var(--gold)] text-[var(--gold)]', role: 'bg-[rgba(212,168,67,.08)] border-[var(--bdr2)] text-[var(--gold)]' },
  red:  { active: 'bg-[rgba(255,51,82,.07)] text-[var(--red)] border-l-[var(--red)]',   hover: 'hover:bg-[rgba(255,51,82,.04)]', icon: 'border-[var(--red)] text-[var(--red)]',  role: 'bg-[rgba(255,51,82,.08)] border-[rgba(255,51,82,.2)] text-[var(--red)]' },
  blue: { active: 'bg-[rgba(59,158,255,.07)] text-[var(--blue)] border-l-[var(--blue)]', hover: 'hover:bg-[rgba(59,158,255,.04)]', icon: 'border-[var(--blue)] text-[var(--blue)]', role: 'bg-[rgba(59,158,255,.08)] border-[rgba(59,158,255,.2)] text-[var(--blue)]' },
}

export function Sidebar({ logo, accountBox, nav, user, onLogout, accentColor = 'gold' }: SidebarProps) {
  const a = accents[accentColor]
  return (
    <aside className="w-[224px] bg-[var(--bg2)] border-r border-[var(--bdr)] flex flex-col flex-shrink-0 h-full">
      {/* Top */}
      <div className="px-4 pt-[18px] pb-[14px] border-b border-[var(--bdr)]">
        <div className="flex items-center gap-[10px] mb-[10px]">
          <div className={cn('w-[30px] h-[30px] border flex items-center justify-center text-[12px]', a.icon)}>
            {logo.icon}
          </div>
          <div>
            <div className="serif text-[13px] font-bold leading-[1.2]">{logo.name}</div>
          </div>
        </div>
        <div className={cn('flex items-center gap-[7px] px-[9px] py-[5px] border mt-2', a.role)}>
          <div className="w-[5px] h-[5px] rounded-full bg-current opacity-80" />
          <span className="text-[9px] tracking-[1.5px] uppercase font-bold">{logo.subtitle}</span>
        </div>
        {accountBox && (
          <div className="bg-[var(--bg3)] border border-[var(--dim)] px-[9px] py-[7px] mt-2">
            <div className="mono text-[10px] text-[var(--gold)]">{accountBox.id}</div>
            <div className="text-[8px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mt-[1px]">{accountBox.label}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <div className="px-4 pt-[6px] pb-[3px] mt-1 text-[7px] tracking-[2.5px] uppercase text-[var(--text3)] font-semibold">
                {group.section}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-[9px] px-4 py-[8px] text-[12px] font-medium transition-all cursor-pointer border-l-2 border-transparent',
                  isActive ? a.active : cn('text-[var(--text2)]', a.hover)
                )}
              >
                <span className="text-[13px] w-[17px] text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    'text-[7px] px-[5px] py-[1px] rounded-[7px] font-bold',
                    item.badgeType === 'red' ? 'bg-[var(--red)] text-white' :
                    item.badgeType === 'blue' ? 'bg-[var(--blue)] text-white' :
                    'bg-[var(--gold3)] text-[var(--gold2)]'
                  )}>{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom user */}
      <div className="px-4 py-3 border-t border-[var(--bdr)] flex items-center gap-[9px]">
        <div className={cn('w-[30px] h-[30px] rounded-full border-[1.5px] flex items-center justify-center serif text-[11px] font-bold', a.icon)} style={{ background: 'rgba(0,0,0,.2)' }}>
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold truncate">{user.name}</div>
          <div className="text-[9px] text-[var(--text3)] capitalize">{user.role}</div>
        </div>
        <button
          onClick={onLogout}
          className="text-[var(--text3)] hover:text-[var(--red)] transition-colors text-[13px] cursor-pointer bg-none border-none"
          title="Logout"
        >⏻</button>
      </div>
    </aside>
  )
}
