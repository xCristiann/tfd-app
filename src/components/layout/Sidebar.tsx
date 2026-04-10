import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ICONS } from '@/lib/nav'
import type { NavItem } from '@/types/database'

interface SidebarProps {
  logo: { icon: string; name: string; subtitle: string }
  accountBox?: { id: string; label: string }
  nav: { section?: string; items: NavItem[] }[]
  user: { initials: string; name: string; role: string }
  onLogout: () => void
  accentColor?: 'gold' | 'red' | 'blue'
}

const BOTTOM_PRIORITY = ['Overview', 'Trading Platform', 'Payouts', 'Challenges', 'Support']

export function Sidebar({ logo, accountBox, nav, user, onLogout, accentColor = 'gold' }: SidebarProps) {
  const isMobile  = useIsMobile()
  const location  = useLocation()
  const [open, setOpen] = useState(false)

  const isAdmin   = accentColor === 'red'
  const isSupport = accentColor === 'blue'
  const accent    = isAdmin ? '#DC2626' : '#2255CC'
  const accentBg  = isAdmin ? 'rgba(220,38,38,.05)' : 'rgba(34,85,204,.05)'

  const allItems  = nav.flatMap(g => g.items)
  const bottomItems = [
    ...allItems.filter(i => BOTTOM_PRIORITY.includes(i.label)),
    ...allItems.filter(i => !BOTTOM_PRIORITY.includes(i.label)),
  ].slice(0, 4)

  /* ── DESKTOP ── */
  if (!isMobile) {
    return (
      <aside className="w-[212px] bg-white border-r border-[#E8EEF8] flex flex-col flex-shrink-0 h-full">
        <div className="px-5 py-4 border-b border-[#E8EEF8]">
          <div className="mb-1">
            <img src="/logo.png" alt="The Funded Diaries" style={{height:'36px',width:'auto',objectFit:'contain'}}/>
          </div>
          <div className="text-[9px] uppercase tracking-[2px]" style={{fontWeight:600,color:accent,opacity:.7}}>{logo.subtitle}</div>
          {accountBox && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#EEF3FF] border border-[#C5D5FA] rounded-lg">
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',fontWeight:500,color:'#2255CC',flex:1}}>{accountBox.id}</div>
              <div className="text-[8px] uppercase tracking-[1px] px-1.5 py-0.5 rounded" style={{background:'#2255CC',color:'#fff',fontWeight:700}}>{accountBox.label}</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map((group, gi) => (
            <div key={gi}>
              {group.section && <div className="px-5 pt-3 pb-1 text-[9px] uppercase tracking-[2px] text-[#BCC9DA]" style={{fontWeight:700}}>{group.section}</div>}
              {group.items.map(item => (
                <NavLink key={item.path} to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-4 py-2 text-[12px] transition-all cursor-pointer border-l-[3px] mx-1 rounded-r-lg',
                    isActive ? 'bg-[#EEF3FF] text-[#2255CC] border-l-[#2255CC]' : 'text-[#5C7A9E] border-l-transparent hover:bg-[#F4F7FD] hover:text-[#1A3A6B]'
                  )}>
                  <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center" style={{color:"inherit"}} dangerouslySetInnerHTML={{__html: ICONS[item.icon] || item.icon}}/>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', item.badgeType==='red'?'bg-red-100 text-red-600':item.badgeType==='blue'?'bg-blue-100 text-blue-700':'bg-[#EEF3FF] text-[#2255CC]')} style={{fontWeight:700}}>{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-[#E8EEF8] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1A3A6B] flex items-center justify-center text-[11px] text-white flex-shrink-0" style={{fontWeight:700}}>{user.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#1A3A6B] truncate" style={{fontWeight:600}}>{user.name}</div>
              <div className="text-[10px] text-[#8FA3BF] capitalize">{user.role}</div>
            </div>
            <button onClick={onLogout} className="text-[#8FA3BF] hover:text-[#DC2626] cursor-pointer bg-transparent border-none text-[11px] transition-colors" title="Log out">⎋</button>
          </div>
        </div>
      </aside>
    )
  }

  /* ── MOBILE ── */
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Bottom tab bar */}
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:200,
        background:'#fff',borderTop:'1px solid #E8EEF8',
        display:'flex',alignItems:'stretch',
        paddingBottom:'env(safe-area-inset-bottom)',
        boxShadow:'0 -2px 16px rgba(0,0,0,.1)',
      }}>
        {bottomItems.map(item => (
          <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)}
            style={{
              flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',padding:'8px 2px',textDecoration:'none',
              color: isActive(item.path) ? accent : '#8FA3BF',
              background: isActive(item.path) ? accentBg : 'transparent',
              borderTop: `2px solid ${isActive(item.path) ? accent : 'transparent'}`,
              position:'relative',
            }}>
            <span style={{width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center'}} dangerouslySetInnerHTML={{__html: ICONS[item.icon] || item.icon}}/>
            <span style={{fontSize:'9px',fontWeight:600,marginTop:'3px',letterSpacing:'0.2px',whiteSpace:'nowrap'}}>
              {item.label.split(' ')[0]}
            </span>
            {item.badge !== undefined && (
              <span style={{
                position:'absolute',top:'5px',right:'calc(50% - 18px)',
                background:item.badgeType==='red'?'#DC2626':accent,
                color:'#fff',fontSize:'8px',fontWeight:700,
                padding:'1px 4px',borderRadius:'10px',minWidth:'14px',textAlign:'center',
              }}>{item.badge}</span>
            )}
          </NavLink>
        ))}
        {/* More / Menu */}
        <button onClick={() => setOpen(o => !o)} style={{
          flex:1,display:'flex',flexDirection:'column',alignItems:'center',
          justifyContent:'center',padding:'8px 2px',background:'transparent',
          border:'none',cursor:'pointer',
          color: open ? accent : '#8FA3BF',
          borderTop:`2px solid ${open ? accent : 'transparent'}`,
        }}>
          <span style={{fontSize:'16px',lineHeight:1,fontWeight:600}}>{open ? '✕' : '☰'}</span>
          <span style={{fontSize:'9px',fontWeight:600,marginTop:'3px'}}>{open ? 'Close' : 'Menu'}</span>
        </button>
      </nav>

      {/* Slide-up drawer */}
      {open && (
        <div style={{position:'fixed',inset:0,zIndex:199,background:'rgba(0,0,0,.5)'}}
          onClick={() => setOpen(false)}>
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,
            background:'#fff',borderRadius:'20px 20px 0 0',
            maxHeight:'82vh',display:'flex',flexDirection:'column',
            paddingBottom:'calc(env(safe-area-inset-bottom) + 68px)',
          }} onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div style={{display:'flex',justifyContent:'center',padding:'12px 0 6px'}}>
              <div style={{width:'40px',height:'4px',background:'#E8EEF8',borderRadius:'2px'}}/>
            </div>

            {/* Header */}
            <div style={{
              padding:'10px 20px 12px',borderBottom:'1px solid #F0F4FB',
              display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',
            }}>
              <div>
                <div>
                  <img src="/logo.png" alt="The Funded Diaries" style={{height:'36px',width:'auto',objectFit:'contain'}}/>
                </div>
                <div style={{fontSize:'9px',fontWeight:600,color:accent,opacity:.7,textTransform:'uppercase',letterSpacing:'2px',marginTop:'2px'}}>{logo.subtitle}</div>
              </div>
              {accountBox && (
                <div style={{background:'rgba(34,85,204,.07)',border:'1px solid rgba(34,85,204,.2)',borderRadius:'8px',padding:'6px 10px',maxWidth:'150px',flexShrink:0}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',color:'#2255CC',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{accountBox.id}</div>
                  <div style={{fontSize:'8px',color:'#2255CC',fontWeight:700,marginTop:'1px',opacity:.8}}>{accountBox.label}</div>
                </div>
              )}
            </div>

            {/* Nav list */}
            <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
              {nav.map((group, gi) => (
                <div key={gi}>
                  {group.section && (
                    <div style={{padding:'10px 20px 4px',fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'2px',color:'#BCC9DA'}}>
                      {group.section}
                    </div>
                  )}
                  {group.items.map(item => {
                    const active = isActive(item.path)
                    return (
                      <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)}
                        style={{
                          display:'flex',alignItems:'center',gap:'14px',
                          padding:'13px 20px',textDecoration:'none',
                          color: active ? accent : '#374151',
                          background: active ? accentBg : 'transparent',
                          borderLeft:`3px solid ${active ? accent : 'transparent'}`,
                          fontSize:'15px',fontWeight: active ? 600 : 400,
                        }}>
                        <span style={{width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} dangerouslySetInnerHTML={{__html: ICONS[item.icon] || item.icon}}/>
                        <span style={{flex:1}}>{item.label}</span>
                        {item.badge !== undefined && (
                          <span style={{
                            background:item.badgeType==='red'?'#DC2626':accent,
                            color:'#fff',fontSize:'10px',fontWeight:700,
                            padding:'2px 8px',borderRadius:'10px',
                          }}>{item.badge}</span>
                        )}
                        {active && <span style={{fontSize:'12px',color:accent}}>›</span>}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* User + logout */}
            <div style={{borderTop:'1px solid #F0F4FB',padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'#1A3A6B',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'14px',fontWeight:700,flexShrink:0}}>
                {user.initials}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'14px',fontWeight:600,color:'#1A3A6B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
                <div style={{fontSize:'11px',color:'#8FA3BF',textTransform:'capitalize'}}>{user.role}</div>
              </div>
              <button onClick={onLogout} style={{
                padding:'9px 18px',background:'rgba(220,38,38,.08)',color:'#DC2626',
                border:'1px solid rgba(220,38,38,.2)',borderRadius:'8px',
                fontSize:'13px',fontWeight:600,cursor:'pointer',flexShrink:0,
              }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* No width spacer on mobile — content fills full width */}
      <div style={{width:0,flexShrink:0}}/>
    </>
  )
}