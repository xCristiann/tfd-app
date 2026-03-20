import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface MobileLayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  nav: 'trader' | 'admin'
}

const TRADER_BOTTOM = [
  { path: '/dashboard',          icon: '⊞', label: 'Overview' },
  { path: '/platform',           icon: '📈', label: 'Trade'    },
  { path: '/dashboard/payouts',  icon: '💰', label: 'Payouts'  },
  { path: '/dashboard/kyc',      icon: '🪪', label: 'KYC'      },
  { path: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
]

const ADMIN_BOTTOM = [
  { path: '/admin',          icon: '⊞', label: 'Dashboard' },
  { path: '/admin/traders',  icon: '👥', label: 'Traders'   },
  { path: '/admin/payouts',  icon: '💰', label: 'Payouts'   },
  { path: '/admin/kyc',      icon: '🪪', label: 'KYC'       },
  { path: '/admin/settings', icon: '⚙️', label: 'Settings'  },
]

export function MobileLayout({ children, title, showBack, nav }: MobileLayoutProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile } = useAuth()
  const items     = nav === 'admin' ? ADMIN_BOTTOM : TRADER_BOTTOM
  const active    = (path: string) => location.pathname === path || (path !== '/dashboard' && path !== '/admin' && location.pathname.startsWith(path))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#F0F4FB', fontFamily:"'Inter',system-ui,sans-serif", color:'#1A3A6B', overflow:'hidden' }}>

      {/* TOPBAR */}
      <div style={{ height:'52px', background:'#1A3A6B', display:'flex', alignItems:'center', padding:'0 16px', gap:'12px', flexShrink:0, paddingTop:'env(safe-area-inset-top)' }}>
        {showBack && (
          <button onClick={()=>navigate(-1)} style={{ background:'rgba(255,255,255,.1)', border:'none', color:'#fff', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>←</button>
        )}
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', fontWeight:700, color:'#fff' }}>
          The Funded <span style={{ color:'#60A5FA', fontStyle:'italic' }}>Diaries</span>
        </div>
        {title && <div style={{ fontSize:'13px', color:'rgba(255,255,255,.6)', marginLeft:'auto' }}>{title}</div>}
        {!title && (
          <div style={{ marginLeft:'auto', fontSize:'11px', color:'rgba(255,255,255,.6)' }}>
            {profile?.first_name} {profile?.last_name}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        {children}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ height:'64px', background:'#fff', borderTop:'1px solid #E8EEF8', display:'flex', alignItems:'center', flexShrink:0, paddingBottom:'env(safe-area-inset-bottom)' }}>
        {items.map(item => (
          <button key={item.path} onClick={()=>navigate(item.path)}
            style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', background:'none', border:'none', cursor:'pointer', color: active(item.path) ? '#2255CC' : '#8FA3BF', transition:'color .15s' }}>
            <span style={{ fontSize:'20px', lineHeight:1 }}>{item.icon}</span>
            <span style={{ fontSize:'9px', fontWeight:600, letterSpacing:'0.3px', textTransform:'uppercase' }}>{item.label}</span>
            {active(item.path) && <div style={{ position:'absolute', bottom:0, width:'32px', height:'2px', background:'#2255CC', borderRadius:'1px 1px 0 0' }}/>}
          </button>
        ))}
      </div>
    </div>
  )
}
