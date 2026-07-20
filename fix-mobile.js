const fs = require('fs')
const path = require('path')
const root = process.cwd()

function write(filePath, content) {
  const full = path.join(root, filePath)
  const dir = path.dirname(full)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log('  [OK]', filePath)
}

console.log('=== Mobile Responsive Fix ===\n')

// ══════════════════════════════════════════
// 1. GLOBALS.CSS — add mobile base styles
// ══════════════════════════════════════════
const globalsPath = path.join(root, 'app/globals.css')
let globals = fs.readFileSync(globalsPath, 'utf8')
if (!globals.includes('@media (max-width: 768px)')) {
  globals += `

/* ═══════════════════════════════
   MOBILE RESPONSIVE
═══════════════════════════════ */

* { box-sizing: border-box; }

@media (max-width: 768px) {
  body { font-size: 15px; }

  /* Navbar mobile */
  .nav-links { display: none !important; }
  .nav-mobile-menu { display: flex !important; }

  /* Grid → single column */
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr !important;
  }

  /* Tables → scroll */
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Page padding */
  .page-main {
    padding: 32px 16px 60px !important;
  }
}

@media (max-width: 480px) {
  h1 { font-size: 28px !important; }
  h2 { font-size: 22px !important; }
}
`
  fs.writeFileSync(globalsPath, globals, 'utf8')
  console.log('  [OK] globals.css - mobile styles added')
}

// ══════════════════════════════════════════
// 2. NAVBAR — mobile hamburger menu
// ══════════════════════════════════════════
write('components/layout/Navbar.tsx', `'use client'
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
        \`@media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-drawer { display: block !important; }
        }\`
      }</style>
    </>
  )
}
`)

// ══════════════════════════════════════════
// 3. HOME PAGE — mobile responsive
// ══════════════════════════════════════════
const homeClientPath = path.join(root, 'app/HomeClient.tsx')
if (fs.existsSync(homeClientPath)) {
  let content = fs.readFileSync(homeClientPath, 'utf8')
  // Add mobile meta viewport check and responsive styles
  if (!content.includes('clamp(')) {
    content = content
      // Make hero font sizes responsive with clamp
      .replace(/fontSize: '52px'/g, "fontSize: 'clamp(28px, 6vw, 52px)'")
      .replace(/fontSize: '48px'/g, "fontSize: 'clamp(26px, 5vw, 48px)'")
      .replace(/fontSize: '44px'/g, "fontSize: 'clamp(24px, 5vw, 44px)'")
      .replace(/fontSize: '40px'/g, "fontSize: 'clamp(24px, 4vw, 40px)'")
      .replace(/fontSize: '38px'/g, "fontSize: 'clamp(22px, 4vw, 38px)'")
      .replace(/maxWidth: '1300px'/g, "maxWidth: '1300px', width: '100%'")
      .replace(/padding: '0 40px'/g, "padding: '0 clamp(16px, 4vw, 40px)'")
      .replace(/padding: '56px 40px/g, "padding: 'clamp(32px, 5vw, 56px) clamp(16px, 4vw, 40px)")
    fs.writeFileSync(homeClientPath, content, 'utf8')
    console.log('  [OK] HomeClient.tsx - responsive font sizes')
  }
}

// ══════════════════════════════════════════
// 4. FIRMS TABLE — mobile scrollable
// ══════════════════════════════════════════
const firmsClientPath = path.join(root, 'app/firms/FirmsClient.tsx')
if (fs.existsSync(firmsClientPath)) {
  let content = fs.readFileSync(firmsClientPath, 'utf8')
  if (!content.includes('overflow-x: auto')) {
    // Wrap table in scrollable container
    content = content.replace(
      /(<div style=\{\{[^}]*background: 'var\(--bg1\)'[^}]*border: '1px solid var\(--border\)'[^}]*borderRadius: '16px'[^}]*overflow: 'hidden'[^}]*\}\}>)/,
      '<div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>\n          $1'
    )
    fs.writeFileSync(firmsClientPath, content, 'utf8')
    console.log('  [OK] FirmsClient.tsx - scrollable table')
  }
}

// ══════════════════════════════════════════
// 5. PROFILE PAGE — mobile grid
// ══════════════════════════════════════════
write('app/profile/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

const TIER_LEVELS = [
  { name: 'Beginner', min: 0,    max: 499,      color: '#8b92a8' },
  { name: 'Trader',   min: 500,  max: 1499,     color: '#f59e0b' },
  { name: 'Pro',      min: 1500, max: 2999,     color: '#00e5a0' },
  { name: 'Elite',    min: 3000, max: Infinity,  color: '#a78bfa' },
]

const BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  'TFD Pro Trader': { bg: 'linear-gradient(135deg,#00e5a0,#7c3aed)', label: 'PRO' },
  'Elite Trader':   { bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', label: 'ELITE' },
  'Top Reviewer':   { bg: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', label: 'TOP' },
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'overview'|'reviews'|'coins'|'settings'>('overview')
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login?redirect=/profile'); return }
      const [p, r, tx] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('reviews').select('*, firms(name,slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('coin_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      setProfile({ ...p.data, email: user.email })
      setName(p.data?.full_name || '')
      setReviews(r.data || [])
      setTransactions(tx.data || [])
      setLoading(false)
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    setProfile((p: any) => ({ ...p, full_name: name }))
    setMsg('Profile updated!')
    setTimeout(() => setMsg(''), 2000)
    setSaving(false)
  }

  if (loading) return (
    <>
      <Navbar />
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)' }}>Loading profile...</div>
      </main>
    </>
  )

  const coins = profile?.coins || 0
  const lifetime = profile?.coins_lifetime || 0
  const badges = profile?.badges || []
  const tier = TIER_LEVELS.find(t => lifetime >= t.min && lifetime <= t.max) || TIER_LEVELS[0]
  const nextTier = TIER_LEVELS[TIER_LEVELS.indexOf(tier) + 1]
  const progress = nextTier ? Math.min(100, ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100) : 100
  const initials = (profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,32px) 80px' }}>

        {/* Header card */}
        <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.08),rgba(124,58,237,0.08))', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '20px', padding: 'clamp(20px,4vw,32px)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#04120c', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 800, marginBottom: '4px' }}>{profile?.full_name || 'Anonymous Trader'}</h1>
              {msg && <div style={{ fontSize: '13px', color: 'var(--teal)', marginBottom: '4px' }}>{msg}</div>}
              <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '12px' }}>{profile?.email}</div>
              {badges.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {badges.map((b: string) => {
                    const cfg = BADGE_CONFIG[b] || { bg: 'linear-gradient(135deg,var(--teal),var(--violet))', label: 'TFD' }
                    return (
                      <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', background: cfg.bg, color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                        {cfg.label} {b}
                      </span>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--teal)' }}>{coins.toLocaleString()}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Coins</div></div>
                <div><div style={{ fontSize: '18px', fontWeight: 900, color: tier.color }}>{tier.name}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Tier</div></div>
                <div><div style={{ fontSize: '18px', fontWeight: 900 }}>{reviews.length}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Reviews</div></div>
                <div><div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--amber)' }}>{badges.length}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Badges</div></div>
              </div>
            </div>
            {/* Tier circle */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid ' + tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginBottom: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, color: tier.color }}>{tier.name.slice(0,3).toUpperCase()}</div>
              </div>
              <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden', width: '60px' }}>
                <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg,' + tier.color + ',' + (nextTier?.color || tier.color) + ')', borderRadius: '100px' }} />
              </div>
              {nextTier && <div style={{ fontSize: '9px', color: 'var(--t3)', marginTop: '3px' }}>{(nextTier.min - lifetime).toLocaleString()} to {nextTier.name}</div>}
            </div>
          </div>
        </div>

        {/* Tabs — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {([['overview','Overview'],['reviews','Reviews'],['coins','Coins'],['settings','Settings']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: 'none', background: 'transparent', color: tab === k ? 'var(--teal)' : 'var(--t2)', borderBottom: '2px solid ' + (tab === k ? 'var(--teal)' : 'transparent'), marginBottom: '-1px', whiteSpace: 'nowrap' as const }}>
              {l}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Coins Balance</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--teal)', marginBottom: '4px' }}>{coins.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '14px' }}>{lifetime.toLocaleString()} total earned</div>
              <Link href="/coins" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Go to Shop</Link>
            </div>

            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Referral Code</div>
              <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '10px' }}>Earn <b style={{ color: 'var(--teal)' }}>+100 coins</b> for each friend who signs up.</div>
              {profile?.referral_code && (
                <div style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '15px', fontWeight: 700, color: 'var(--teal)' }}>{profile.referral_code}</span>
                  <button onClick={() => { navigator.clipboard.writeText('https://www.thefundeddiaries.com/auth/register?ref=' + profile.referral_code); setMsg('Copied!'); setTimeout(()=>setMsg(''),1500) }}
                    style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--teal)', color: '#04120c', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' as const }}>
                    Copy
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Badges ({badges.length})</div>
                <Link href="/coins" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Earn more</Link>
              </div>
              {badges.length === 0 ? (
                <div style={{ fontSize: '13.5px', color: 'var(--t3)', padding: '16px', textAlign: 'center' }}>
                  No badges yet. <Link href="/coins" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Redeem badges in Coins Shop</Link>.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {badges.map((b: string) => {
                    const cfg = BADGE_CONFIG[b] || { bg: 'linear-gradient(135deg,var(--teal),var(--violet))', label: 'TFD' }
                    return (
                      <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#fff', boxShadow: '0 0 14px rgba(0,229,160,0.2)' }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--t2)', fontWeight: 600, textAlign: 'center', maxWidth: '60px' }}>{b}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REVIEWS */}
        {tab === 'reviews' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{reviews.length} reviews</div>
              <Link href="/reviews" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Write Review</Link>
            </div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t2)', background: 'var(--bg1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '10px' }}>No reviews yet.</div>
                <Link href="/reviews" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Write first review (+75 coins)</Link>
              </div>
            ) : reviews.map((r: any) => (
              <div key={r.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link href={'/firms/' + r.firms?.slug} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', textDecoration: 'none' }}>{r.firms?.name}</Link>
                    <span style={{ padding: '2px 7px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: r.status === 'approved' ? 'rgba(0,229,160,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'approved' ? 'var(--teal)' : 'var(--amber)' }}>{r.status}</span>
                  </div>
                  <div style={{ color: 'var(--amber)', fontSize: '13px' }}>{'★'.repeat(r.rating || 0)}</div>
                </div>
                {r.title && <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{r.title}</div>}
                <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>{r.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* COINS */}
        {tab === 'coins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Transaction History</div>
              <Link href="/coins" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Shop</Link>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t2)' }}>No transactions yet.</div>
              ) : transactions.map((tx: any) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{tx.description || tx.type}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{new Date(tx.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: tx.amount > 0 ? 'var(--teal)' : 'var(--coral)', flexShrink: 0 }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Account</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email</label>
                  <input value={profile?.email || ''} disabled
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--t3)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  style={{ padding: '11px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Password</h3>
              <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '12px' }}>Change via forgot password flow.</p>
              <Link href="/auth/forgot-password" style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border2)', color: 'var(--t1)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Change Password
              </Link>
            </div>
            <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: 'var(--coral)' }}>Danger Zone</h3>
              <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '12px' }}>Account deletion is permanent.</p>
              <button onClick={async () => { if (!confirm('Delete account? This cannot be undone.')) return; await supabase.auth.signOut(); router.push('/') }}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--coral)', background: 'rgba(248,113,113,0.08)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Delete Account
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
`)

console.log('\n=== Done! ===')
console.log('Run: git add . && git commit -m "Mobile responsive: navbar, profile, all pages" && git push')
