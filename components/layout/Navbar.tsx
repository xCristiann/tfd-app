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
  const [isAdmin, setIsAdmin] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(profile?.is_admin || false)
      }
      setLoaded(true)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin || false)
      } else {
        setIsAdmin(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href

  const navLinkStyle = (href: string) => ({
    fontSize: '13.5px',
    color: isActive(href) ? 'var(--t1)' : 'var(--t2)',
    padding: '7px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    background: isActive(href) ? 'rgba(255,255,255,0.05)' : 'transparent',
  })

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(7,9,15,0.8)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px var(--teal-glow)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".9" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6" />
              <path d="M9 12h6M12 9v6" stroke="#04120c" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--t1)' }}>
            TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '2px' }}>
          <Link href="/" style={navLinkStyle('/')}>Firms</Link>
          <Link href="/firms" style={navLinkStyle('/firms')}>Compare</Link>
          <Link href="/offers" style={navLinkStyle('/offers')}>Offers</Link>
          <Link href="/calculator" style={navLinkStyle('/calculator')}>Calculator</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!loaded ? (
            <div style={{ width: '120px', height: '36px' }} />
          ) : user ? (
            <>
              {isAdmin && (
                <Link href="/admin" style={{ textDecoration: 'none', fontSize: '13.5px', padding: '8px 16px', borderRadius: '9px', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--teal)', background: 'rgba(0,229,160,0.06)', fontWeight: 600 }}>
                  Admin CRM
                </Link>
              )}
              <button onClick={handleSignOut} style={{ padding: '8px 16px', borderRadius: '9px', fontSize: '13.5px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" style={{ textDecoration: 'none', fontSize: '13.5px', padding: '8px 16px', borderRadius: '9px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent' }}>
                Sign In
              </Link>
              <Link href="/auth/register" style={{ textDecoration: 'none', fontSize: '13.5px', padding: '9px 18px', borderRadius: '9px', color: '#04120c', background: 'var(--teal)', fontWeight: 700, boxShadow: '0 0 20px var(--teal-glow)' }}>
                Get Started →
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
