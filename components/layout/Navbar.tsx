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
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href

  const navLinks = [
    { href: '/', label: 'Firms' },
    { href: '/offers', label: 'Offers' },
    { href: '/best-sellers', label: 'Best Sellers' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/compare', label: 'vs Tool' },
    { href: '/prop-firm-rules', label: 'Rules' },
    { href: '/spreads', label: 'Spreads' },
    { href: '/payouts', label: 'Payouts' },
  ]

  const linkStyle = (href: string): React.CSSProperties => ({
    fontSize: '13.5px',
    color: isActive(href) ? 'var(--t1)' : 'var(--t2)',
    padding: '7px 12px', borderRadius: '8px', textDecoration: 'none',
    background: isActive(href) ? 'rgba(255,255,255,0.05)' : 'transparent',
    fontWeight: isActive(href) ? 600 : 400,
    whiteSpace: 'nowrap' as const,
  })

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(7,9,15,0.95)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', gap: '12px' }}>

          {/* Logo */}
          <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
            <TFDLogo size={44} />
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--t1)', whiteSpace: 'nowrap' }}>
              TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', gap: '0', flexWrap: 'nowrap', overflowX: 'auto' }} className="desktop-nav">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="desktop-nav">
            {!loaded ? <div style={{ width: '80px' }} /> : user ? (
              <>
                <Link href="/coins" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '9px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', textDecoration: 'none', fontSize: '12px', fontWeight: 700, color: 'var(--amber)' }}>
                  TFD {coins?.toLocaleString() ?? '0'}
                </Link>
                {isAdmin && (
                  <Link href="/admin" style={{ textDecoration: 'none', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--teal)', background: 'rgba(0,229,160,0.06)', fontWeight: 600 }}>Admin</Link>
                )}
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{ textDecoration: 'none', fontSize: '13px', padding: '7px 14px', borderRadius: '9px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', whiteSpace: 'nowrap' }}>Sign In</Link>
                <Link href="/auth/register" style={{ textDecoration: 'none', fontSize: '13px', padding: '8px 14px', borderRadius: '9px', color: '#04120c', background: 'var(--teal)', fontWeight: 700, whiteSpace: 'nowrap' }}>Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(o => !o)}
            className="mobile-menu-btn"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', display: 'none', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
            <span style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? 'var(--teal)' : 'var(--t1)', borderRadius: '2px', transition: 'all .2s', transform: menuOpen ? 'rotate(45deg) translate(4px,4px)' : 'none' }} />
            <span style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? 'var(--teal)' : 'var(--t1)', borderRadius: '2px', transition: 'all .2s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? 'var(--teal)' : 'var(--t1)', borderRadius: '2px', transition: 'all .2s', transform: menuOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: '64px', left: 0, right: 0, bottom: 0, zIndex: 99, background: 'rgba(7,9,15,0.98)', backdropFilter: 'blur(24px)', overflowY: 'auto', display: 'none' }} className="mobile-drawer">
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

            {/* Nav links */}
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', background: isActive(l.href) ? 'rgba(0,229,160,0.08)' : 'transparent', border: isActive(l.href) ? '1px solid rgba(0,229,160,0.15)' : '1px solid transparent', color: isActive(l.href) ? 'var(--teal)' : 'var(--t1)', fontSize: '16px', fontWeight: isActive(l.href) ? 700 : 400 }}>
                {l.label}
                <span style={{ color: 'var(--t3)', fontSize: '18px' }}>›</span>
              </Link>
            ))}

            <div style={{ height: '1px', background: 'var(--border)', margin: '12px 0' }} />

            {/* Auth section */}
            {loaded && (
              user ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', color: 'var(--t1)', fontSize: '16px', background: 'rgba(255,255,255,0.04)' }}>
                    My Profile
                    <span style={{ color: 'var(--t3)', fontSize: '18px' }}>›</span>
                  </Link>
                  <Link href="/coins" onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', color: 'var(--amber)', fontSize: '16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <span>TFD Coins</span>
                    <span style={{ fontWeight: 800 }}>{coins?.toLocaleString() ?? '0'}</span>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', color: 'var(--teal)', fontSize: '16px', background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)' }}>
                      Admin Panel
                      <span style={{ fontSize: '18px' }}>›</span>
                    </Link>
                  )}
                  <button onClick={handleSignOut}
                    style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: 'var(--coral)', fontSize: '16px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', textAlign: 'left', marginTop: '4px' }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', color: 'var(--t1)', fontSize: '16px', background: 'rgba(255,255,255,0.04)', textAlign: 'center', border: '1px solid var(--border2)' }}>
                    Sign In
                  </Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', color: '#04120c', fontSize: '16px', background: 'var(--teal)', textAlign: 'center', fontWeight: 800, boxShadow: '0 0 24px var(--teal-glow)', marginTop: '4px' }}>
                    Get Started Free
                  </Link>
                </>
              )
            )}

            <div style={{ height: '1px', background: 'var(--border)', margin: '12px 0' }} />

            {/* Quick links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { href: '/calculator', label: 'Calculator' },
                { href: '/affiliate', label: 'Affiliate' },
                { href: '/trust-score', label: 'Trust Score' },
                { href: '/contact', label: 'Contact' },
              ].map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                  style={{ padding: '10px 14px', borderRadius: '10px', textDecoration: 'none', color: 'var(--t3)', fontSize: '13.5px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{
        `@media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-drawer { display: block !important; }
        }`
      }</style>
    </>
  )
}
