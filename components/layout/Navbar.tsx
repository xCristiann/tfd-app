'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { TFDLogo } from '@/components/ui/TFDLogo'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [coins, setCoins] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: p } = await supabase.from('profiles').select('is_admin, coins').eq('id', user.id).single()
        setIsAdmin(p?.is_admin || false)
        setCoins(p?.coins ?? 0)
      }
      setLoaded(true)
    }
    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: p } = await supabase.from('profiles').select('is_admin, coins').eq('id', session.user.id).single()
        setIsAdmin(p?.is_admin || false)
        setCoins(p?.coins ?? 0)
      } else { setIsAdmin(false); setCoins(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const linkStyle = (href: string): React.CSSProperties => ({
    fontSize: '13.5px',
    color: isActive(href) ? 'var(--t1)' : 'var(--t2)',
    padding: '7px 12px', borderRadius: '8px', textDecoration: 'none',
    background: isActive(href) ? 'rgba(255,255,255,0.05)' : 'transparent',
    fontWeight: isActive(href) ? 600 : 400,
    whiteSpace: 'nowrap' as const,
  })

  const navLinks = [
    { href: '/', label: 'Firms' },
    { href: '/offers', label: 'Offers' },
    { href: '/best-sellers', label: 'Best Sellers' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/compare', label: '⚡ vs' },
    { href: '/prop-firm-rules', label: 'Rules' },
    { href: '/spreads', label: 'Spreads' },
    { href: '/payouts', label: 'Payouts' },
  ]

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(7,9,15,0.9)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', gap: '16px' }}>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flexShrink: 0 }}>
          <TFDLogo size={52} />
          <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--t1)', whiteSpace: 'nowrap' }}>
            TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '0px', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {!loaded ? <div style={{ width: '120px' }} /> : user ? (
            <>
              <Link href="/coins" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '9px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', textDecoration: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>
                🪙 {coins?.toLocaleString() ?? '0'}
              </Link>
              {isAdmin && (
                <Link href="/admin" style={{ textDecoration: 'none', fontSize: '13px', padding: '7px 14px', borderRadius: '9px', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--teal)', background: 'rgba(0,229,160,0.06)', fontWeight: 600 }}>
                  Admin
                </Link>
              )}
              <button onClick={handleSignOut} style={{ padding: '7px 14px', borderRadius: '9px', fontSize: '13px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" style={{ textDecoration: 'none', fontSize: '13px', padding: '7px 14px', borderRadius: '9px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', whiteSpace: 'nowrap' }}>
                Sign In
              </Link>
              <Link href="/auth/register" style={{ textDecoration: 'none', fontSize: '13px', padding: '8px 16px', borderRadius: '9px', color: '#04120c', background: 'var(--teal)', fontWeight: 700, boxShadow: '0 0 20px var(--teal-glow)', whiteSpace: 'nowrap' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}