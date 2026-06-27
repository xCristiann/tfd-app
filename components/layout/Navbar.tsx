'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href

  return (
    <nav style={{position:'sticky',top:0,zIndex:100,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',background:'rgba(7,9,15,0.8)',borderBottom:'1px solid var(--border)'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 40px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'64px'}}>

        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'9px',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px var(--teal-glow)'}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".9"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/>
              <path d="M9 12h6M12 9v6" stroke="#04120c" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{fontSize:'17px',fontWeight:800,letterSpacing:'-.03em',color:'var(--t1)'}}>
            TheFunded<span style={{color:'var(--teal)'}}>Diaries</span>
          </span>
        </Link>

        <div style={{display:'flex',gap:'2px'}}>
          {[{href:'/',label:'Firms'},{href:'/firms',label:'Compare'},{href:'/calculator',label:'Calculator'}].map(l => (
            <Link key={l.href} href={l.href} style={{fontSize:'13.5px',color:isActive(l.href)?'var(--t1)':'var(--t2)',padding:'7px 14px',borderRadius:'8px',textDecoration:'none',background:isActive(l.href)?'rgba(255,255,255,0.05)':'transparent'}}>
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          {user ? (
            <>
              <Link href="/admin" style={{textDecoration:'none',fontSize:'13.5px',padding:'8px 16px',borderRadius:'9px',border:'1px solid var(--border2)',color:'var(--t1)',background:'transparent'}}>Admin CRM</Link>
              <button onClick={handleSignOut} style={{padding:'8px 16px',borderRadius:'9px',fontSize:'13.5px',border:'1px solid var(--border2)',color:'var(--t1)',background:'transparent',cursor:'pointer'}}>Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" style={{textDecoration:'none',fontSize:'13.5px',padding:'8px 16px',borderRadius:'9px',border:'1px solid var(--border2)',color:'var(--t1)',background:'transparent'}}>Sign In</Link>
              <Link href="/auth/register" style={{textDecoration:'none',fontSize:'13.5px',padding:'9px 18px',borderRadius:'9px',color:'#04120c',background:'var(--teal)',fontWeight:700,boxShadow:'0 0 20px var(--teal-glow)'}}>Get Started →</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
