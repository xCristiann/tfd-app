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

export function Sidebar({ logo, accountBox, nav, user, onLogout, accentColor = 'gold' }: SidebarProps) {
  const isAdmin = accentColor === 'red'
  const isSupport = accentColor === 'blue'

  return (
    <aside className="w-[212px] bg-white border-r border-[#E8EEF8] flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#E8EEF8]">
        <div className="mb-1" style={{fontFamily:"'Playfair Display',serif",fontSize:'16px',fontWeight:700,color:'#1A3A6B',letterSpacing:'-0.2px'}}>
          The Funded <span style={{color:'#2255CC',fontStyle:'italic'}}>Diaries</span>
        </div>
        <div className="text-[9px] font-600 uppercase tracking-[2px]" style={{fontWeight:600,color: isAdmin ? '#DC2626' : isSupport ? '#2255CC' : '#2255CC',opacity:.7}}>
          {logo.subtitle}
        </div>
        {accountBox && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#EEF3FF] border border-[#C5D5FA] rounded-lg">
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',fontWeight:500,color:'#2255CC',flex:1}}>{accountBox.id}</div>
            <div className="text-[8px] uppercase tracking-[1px] font-700 text-[#2255CC] bg-[#2255CC] text-white px-1.5 py-0.5 rounded" style={{background:'#2255CC',color:'#fff',fontWeight:700}}>{accountBox.label}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <div className="px-5 pt-3 pb-1 text-[9px] font-700 uppercase tracking-[2px] text-[#BCC9DA]" style={{fontWeight:700}}>
                {group.section}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[12px] font-500 transition-all cursor-pointer border-l-[3px] mx-1 rounded-r-lg',
                  isActive
                    ? 'bg-[#EEF3FF] text-[#2255CC] border-l-[#2255CC] font-600'
                    : 'text-[#5C7A9E] border-l-transparent hover:bg-[#F4F7FD] hover:text-[#1A3A6B]'
                )}
                style={{fontWeight: undefined}}
              >
                <span className="text-[13px] w-4 text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-700',
                    item.badgeType === 'red' ? 'bg-red-100 text-red-600' :
                    item.badgeType === 'blue' ? 'bg-blue-100 text-blue-700' :
                    'bg-[#EEF3FF] text-[#2255CC]'
                  )} style={{fontWeight:700}}>{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#E8EEF8] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1A3A6B] flex items-center justify-center text-[11px] font-700 text-white flex-shrink-0" style={{fontWeight:700}}>
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-600 text-[#1A3A6B] truncate" style={{fontWeight:600}}>{user.name}</div>
            <div className="text-[10px] text-[#8FA3BF] capitalize">{user.role}</div>
          </div>
          <button onClick={onLogout} className="text-[#8FA3BF] hover:text-[#DC2626] cursor-pointer bg-transparent border-none text-[11px] transition-colors" title="Log out">
            ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}
