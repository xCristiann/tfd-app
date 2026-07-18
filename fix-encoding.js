// Run with: node fix-encoding.js
// From: C:\TheFundedDiaries\tfd-app
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

console.log('=== Fix Encoding + All Remaining ===')

// ══════════════════════════════════════════
// 1. LAYOUT.TSX — single NewsletterPopup, no duplicate
// ══════════════════════════════════════════
write('app/layout.tsx', `import type { Metadata } from 'next'
import './globals.css'
import NewsletterPopup from '@/components/ui/NewsletterPopup'

export const metadata: Metadata = {
  title: 'TheFundedDiaries - Find Your Prop Firm',
  description: 'Independent prop firm comparison. Verified data, real trader reviews, transparent rankings.',
  openGraph: {
    title: 'TheFundedDiaries - Find Your Prop Firm',
    description: 'Independent prop firm comparison platform.',
    url: 'https://www.thefundeddiaries.com',
    siteName: 'TheFundedDiaries',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NewsletterPopup />
        {children}
      </body>
    </html>
  )
}
`)

// ══════════════════════════════════════════
// 2. FOOTER — pure HTML entities, no special chars
// ══════════════════════════════════════════
write('components/layout/Footer.tsx', `import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function Footer() {
  const sections = [
    {
      title: 'Prop Firms',
      links: [
        { label: 'All Prop Firms', href: '/' },
        { label: 'Best Sellers', href: '/best-sellers' },
        { label: 'Compare Firms', href: '/compare' },
        { label: 'Offers & Discounts', href: '/offers' },
      ]
    },
    {
      title: 'Research',
      links: [
        { label: 'Prop Firm Rules', href: '/prop-firm-rules' },
        { label: 'Spreads & Instruments', href: '/spreads' },
        { label: 'Payout Tracker', href: '/payouts' },
        { label: 'Trader Reviews', href: '/reviews' },
      ]
    },
    {
      title: 'Tools',
      links: [
        { label: 'Matching Calculator', href: '/calculator' },
        { label: 'TFD Coins & Prizes', href: '/coins' },
        { label: 'My Profile', href: '/profile' },
        { label: 'Affiliate Program', href: '/affiliate' },
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ]
    },
  ]

  return (
    <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '56px', marginTop: '80px', background: 'var(--bg1)' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px repeat(4, 1fr)', gap: '40px', marginBottom: '48px' }}>
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <TFDLogo size={40} />
              <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)' }}>
                TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.7, marginBottom: '16px' }}>
              Independent prop firm comparison. Verified rules, transparent data, real trader reviews.
            </p>
            <div style={{ fontSize: '11px', color: 'var(--teal)', padding: '8px 12px', background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px' }}>
              100% Independent &middot; No paid rankings
            </div>
          </div>
          {sections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '16px' }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.links.map(link => (
                  <Link key={link.label} href={link.href} style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
            &copy; 2026 TheFundedDiaries &middot; Independent &middot; Not financial advice
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/privacy" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Terms</Link>
            <Link href="/contact" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
`)

// ══════════════════════════════════════════
// 3. NAVBAR — no special chars
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

  const isActive = (href: string) => pathname === href
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
    { href: '/compare', label: 'vs Tool' },
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
        <div style={{ display: 'flex', gap: '0', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={linkStyle(l.href)}>{l.label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {!loaded ? <div style={{ width: '120px' }} /> : user ? (
            <>
              <Link href="/coins" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', textDecoration: 'none', fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>
                <span style={{ fontWeight: 900, fontSize: '11px' }}>TFD</span> {coins?.toLocaleString() ?? '0'}
              </Link>
              <Link href="/profile" style={{ padding: '6px 12px', borderRadius: '9px', border: '1px solid var(--border2)', color: 'var(--t2)', textDecoration: 'none', fontSize: '13px' }}>
                Profile
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
`)

// ══════════════════════════════════════════
// 4. NEWSLETTER POPUP — no special chars, no emoji
// ══════════════════════════════════════════
write('components/ui/NewsletterPopup.tsx', `'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function NewsletterPopup() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => setShow(false)

  const submit = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email'); return }
    if (!agreed) { setError('Please check the checkbox to continue'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'popup_giveaway' })
      })
      if (res.ok) { setDone(true) }
      else { setError('Something went wrong. Please try again.') }
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={dismiss} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', maxWidth: '460px', width: '100%', background: 'linear-gradient(160deg,#0c0f1a,#080b12)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '24px', padding: '40px 36px', textAlign: 'center', boxShadow: '0 0 80px rgba(0,229,160,0.12)' }}>
        <button onClick={dismiss} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--t2)', fontSize: '18px', cursor: 'pointer', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif' }}>
          &times;
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <Image src="/logo.png" alt="TheFundedDiaries" width={36} height={36} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)' }}>
            TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
          </span>
        </div>

        {!done ? (
          <>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,229,160,0.15),rgba(124,58,237,0.15))', border: '2px solid rgba(0,229,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexDirection: 'column' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '1px' }}>WIN</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--t1)', lineHeight: 1 }}>$200K</div>
              <div style={{ fontSize: '9px', color: 'var(--t3)', marginTop: '1px' }}>ACCOUNT</div>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '10px' }}>
              Win a <span style={{ color: 'var(--teal)' }}>$200K</span> Challenge Account
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '20px' }}>
              Join the TheFundedDiaries community. Get exclusive offers, rule updates, and enter our monthly giveaway.
            </p>
            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '9px', fontSize: '13px', color: 'var(--coral)', marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Your email address"
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '18px', cursor: 'pointer', textAlign: 'left' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: 'var(--teal)', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1.5 }}>
                I agree to receive exclusive offers, discount codes, and news from TheFundedDiaries.
              </span>
            </label>
            <button onClick={submit} disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'linear-gradient(135deg,#00e5a0,#00c085)', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entering...' : 'Enter Giveaway'}
            </button>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--t3)' }}>
              No spam. Unsubscribe anytime. Winner drawn monthly.
            </div>
          </>
        ) : (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px', color: '#04120c', fontWeight: 900 }}>
              &#10003;
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '10px', color: 'var(--teal)' }}>
              You are entered!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '24px' }}>
              Good luck! Winner announced end of month.
            </p>
            <button onClick={dismiss}
              style={{ padding: '11px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Start Exploring
            </button>
          </>
        )}
      </div>
    </div>
  )
}
`)

console.log('\n=== Done! ===')
console.log('Now run:')
console.log('  git add .')
console.log('  git commit -m "Fix encoding via Node.js - no special chars"')
console.log('  git push')

// ══════════════════════════════════════════
// 5. COINS PAGE — no special chars
// ══════════════════════════════════════════
write('app/coins/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TIERS = [
  { name: 'Beginner', min: 0,    max: 499,     color: '#8b92a8' },
  { name: 'Trader',   min: 500,  max: 1499,    color: '#f59e0b' },
  { name: 'Pro',      min: 1500, max: 2999,    color: '#00e5a0' },
  { name: 'Elite',    min: 3000, max: Infinity, color: '#a78bfa' },
]

export default function CoinsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shop'|'earn'|'history'>('shop')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login?redirect=/coins'); return }
      fetch('/api/coins').then(r => r.json()).then(d => { setData(d); setLoading(false) })
    })
  }, [])

  const redeem = async (prizeId: string) => {
    setRedeeming(prizeId); setMsg(null)
    const res = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', prize_id: prizeId })
    })
    const result = await res.json()
    setMsg({ text: result.message || result.error, ok: !!result.success })
    setRedeeming(null)
    if (result.success) fetch('/api/coins').then(r => r.json()).then(setData)
  }

  const copyReferral = () => {
    const code = data?.profile?.referral_code
    if (!code) return
    navigator.clipboard.writeText('https://www.thefundeddiaries.com/auth/register?ref=' + code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return (
    <>
      <Navbar />
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)' }}>Loading your coins...</div>
      </main>
    </>
  )

  const coins = data?.profile?.coins || 0
  const lifetime = data?.profile?.coins_lifetime || 0
  const tier = TIERS.find(t => lifetime >= t.min && lifetime <= t.max) || TIERS[0]
  const nextTier = TIERS[TIERS.indexOf(tier) + 1]
  const progress = nextTier ? Math.min(100, ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100) : 100

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Available Coins</div>
            <div style={{ fontSize: '52px', fontWeight: 900, color: 'var(--teal)', letterSpacing: '-.04em', lineHeight: 1, marginBottom: '4px' }}>{coins.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '16px' }}>{lifetime.toLocaleString()} lifetime earned</div>
            {data?.profile?.referral_code && (
              <div style={{ background: 'rgba(0,229,160,0.08)', borderRadius: '9px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>Your referral code</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: 'var(--teal)' }}>{data.profile.referral_code}</span>
                  <button onClick={copyReferral} style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', border: 'none', background: 'var(--teal)', color: '#04120c', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>Your Tier</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid ' + tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, color: tier.color }}>
                {tier.name.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: tier.color, lineHeight: 1 }}>{tier.name}</div>
                {nextTier && <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{(nextTier.min - lifetime).toLocaleString()} coins to {nextTier.name}</div>}
              </div>
            </div>
            <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg,' + tier.color + ',' + (nextTier?.color || tier.color) + ')', borderRadius: '100px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {([['shop','Shop'],['earn','How to Earn'],['history','History']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: 'none', background: 'transparent', color: tab === k ? 'var(--teal)' : 'var(--t2)', borderBottom: '2px solid ' + (tab === k ? 'var(--teal)' : 'transparent'), marginBottom: '-1px' }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'shop' && (
          <div>
            {msg && (
              <div style={{ background: msg.ok ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)', border: '1px solid ' + (msg.ok ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'), borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: msg.ok ? 'var(--teal)' : 'var(--coral)', fontWeight: 600 }}>
                {msg.text}
              </div>
            )}
            {(data?.prizes || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No prizes available yet</div>
                <div style={{ fontSize: '14px' }}>Check back soon!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
                {(data?.prizes || []).map((prize: any) => {
                  const canAfford = coins >= prize.coins_required
                  const outOfStock = prize.stock === 0
                  return (
                    <div key={prize.id} style={{ background: 'var(--bg1)', border: '1px solid ' + (canAfford && !outOfStock ? 'rgba(0,229,160,0.2)' : 'var(--border)'), borderRadius: '14px', padding: '20px', opacity: outOfStock ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', background: 'var(--bg2)', color: 'var(--t3)', textTransform: 'uppercase' }}>{prize.prize_type}</span>
                        {prize.stock === -1 && <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>Unlimited</span>}
                        {prize.stock > 0 && prize.stock <= 10 && <span style={{ fontSize: '11px', color: 'var(--coral)', fontWeight: 600 }}>Only {prize.stock} left</span>}
                        {prize.stock === 0 && <span style={{ fontSize: '11px', color: 'var(--coral)', fontWeight: 600 }}>Sold out</span>}
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>{prize.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px', lineHeight: 1.5 }}>{prize.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '22px', fontWeight: 900, color: canAfford ? 'var(--teal)' : 'var(--t3)' }}>{prize.coins_required.toLocaleString()} coins</div>
                          {!canAfford && !outOfStock && <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>Need {(prize.coins_required - coins).toLocaleString()} more</div>}
                        </div>
                        <button onClick={() => redeem(prize.id)} disabled={!canAfford || outOfStock || redeeming === prize.id}
                          style={{ padding: '10px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: canAfford && !outOfStock ? 'pointer' : 'not-allowed', border: 'none', background: canAfford && !outOfStock ? 'var(--teal)' : 'var(--bg3)', color: canAfford && !outOfStock ? '#04120c' : 'var(--t3)', fontFamily: 'Inter,sans-serif' }}>
                          {redeeming === prize.id ? '...' : outOfStock ? 'Sold out' : !canAfford ? 'Need more' : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'earn' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
            {(data?.rewards || []).map((r: any) => (
              <div key={r.action} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,229,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', fontWeight: 900, color: 'var(--teal)' }}>+{r.coins}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{r.description}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono,monospace' }}>{r.action}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {(data?.transactions || []).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)' }}>No transactions yet</div>
            ) : (data.transactions || []).map((tx: any) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{tx.description || tx.type}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{tx.firm_slug ? tx.firm_slug + ' - ' : ''}{new Date(tx.created_at).toLocaleDateString('en-GB')}</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: tx.amount > 0 ? 'var(--teal)' : 'var(--coral)' }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
`)

// ══════════════════════════════════════════
// 6. PROFILE PAGE — no special chars
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
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.08),rgba(124,58,237,0.08))', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '20px', padding: '32px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, color: '#04120c', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{profile?.full_name || 'Anonymous Trader'}</h1>
            </div>
            {msg && <div style={{ fontSize: '13px', color: 'var(--teal)', marginBottom: '4px' }}>{msg}</div>}
            <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '12px' }}>{profile?.email}</div>
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {badges.map((b: string) => {
                  const cfg = BADGE_CONFIG[b] || { bg: 'linear-gradient(135deg,var(--teal),var(--violet))', label: 'TFD' }
                  return (
                    <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '100px', background: cfg.bg, color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                      <span style={{ fontSize: '10px' }}>{cfg.label}</span> {b}
                    </span>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--teal)' }}>{coins.toLocaleString()}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Coins</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 900, color: tier.color }}>{tier.name}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Tier</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 900 }}>{reviews.length}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Reviews</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--amber)' }}>{badges.length}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Badges</div></div>
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid ' + tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: tier.color }}>{tier.name.slice(0,3).toUpperCase()}</div>
              <div style={{ fontSize: '9px', color: 'var(--t3)' }}>{lifetime.toLocaleString()}</div>
            </div>
            <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg,' + tier.color + ',' + (nextTier?.color || tier.color) + ')', borderRadius: '100px' }} />
            </div>
            {nextTier && <div style={{ fontSize: '9px', color: 'var(--t3)', marginTop: '3px' }}>{(nextTier.min - lifetime).toLocaleString()} to {nextTier.name}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {([['overview','Overview'],['reviews','My Reviews'],['coins','Coin History'],['settings','Settings']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: 'none', background: 'transparent', color: tab === k ? 'var(--teal)' : 'var(--t2)', borderBottom: '2px solid ' + (tab === k ? 'var(--teal)' : 'transparent'), marginBottom: '-1px' }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Coins Balance</div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--teal)', marginBottom: '4px' }}>{coins.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '16px' }}>{lifetime.toLocaleString()} total earned</div>
              <Link href="/coins" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Go to Shop</Link>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Referral Code</div>
              <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '12px' }}>Share your code and earn <b style={{ color: 'var(--teal)' }}>+100 coins</b> for each friend who signs up.</div>
              {profile?.referral_code && (
                <div style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '16px', fontWeight: 700, color: 'var(--teal)' }}>{profile.referral_code}</span>
                  <button onClick={() => { navigator.clipboard.writeText('https://www.thefundeddiaries.com/auth/register?ref=' + profile.referral_code); setMsg('Copied!'); setTimeout(()=>setMsg(''),1500) }}
                    style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--teal)', color: '#04120c', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Copy
                  </button>
                </div>
              )}
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', gridColumn: '1/-1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Badges ({badges.length})</div>
                <Link href="/coins" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Earn badges in Shop</Link>
              </div>
              {badges.length === 0 ? (
                <div style={{ fontSize: '13.5px', color: 'var(--t3)', padding: '20px', textAlign: 'center' }}>
                  No badges yet. Visit the <Link href="/coins" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Coins Shop</Link> to redeem badges.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {badges.map((b: string) => {
                    const cfg = BADGE_CONFIG[b] || { bg: 'linear-gradient(135deg,var(--teal),var(--violet))', label: 'TFD' }
                    return (
                      <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '.05em', boxShadow: '0 0 16px rgba(0,229,160,0.2)' }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600, textAlign: 'center', maxWidth: '70px' }}>{b}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{reviews.length} reviews written</div>
              <Link href="/reviews" style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Write Review</Link>
            </div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)', background: 'var(--bg1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '12px' }}>No reviews yet.</div>
                <Link href="/reviews" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Write your first review and earn 75 coins</Link>
              </div>
            ) : reviews.map((r: any) => (
              <div key={r.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link href={'/firms/' + r.firms?.slug} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', textDecoration: 'none' }}>{r.firms?.name}</Link>
                    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: r.status === 'approved' ? 'rgba(0,229,160,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'approved' ? 'var(--teal)' : 'var(--amber)' }}>{r.status}</span>
                  </div>
                  <div style={{ color: 'var(--amber)' }}>{'★'.repeat(r.rating || 0)}</div>
                </div>
                {r.title && <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{r.title}</div>}
                <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6 }}>{r.content}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'coins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Transaction History</div>
              <Link href="/coins" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Go to Shop</Link>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)' }}>No transactions yet.</div>
              ) : transactions.map((tx: any) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{tx.description || tx.type}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono,monospace' }}>{new Date(tx.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: tx.amount > 0 ? 'var(--teal)' : 'var(--coral)' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Account Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email</label>
                  <input value={profile?.email || ''} disabled
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--t3)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  style={{ padding: '11px 24px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Password</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--t2)', marginBottom: '14px' }}>Change your password via the forgot password flow.</p>
              <Link href="/auth/forgot-password" style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border2)', color: 'var(--t1)', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Change Password
              </Link>
            </div>
            <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--coral)' }}>Danger Zone</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--t2)', marginBottom: '14px' }}>Deleting your account is permanent.</p>
              <button onClick={async () => { if (!confirm('Delete account? This cannot be undone.')) return; await supabase.auth.signOut(); router.push('/') }}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--coral)', background: 'rgba(248,113,113,0.08)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
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

// ══════════════════════════════════════════
// 7. ADMIN DASHBOARD
// ══════════════════════════════════════════
write('app/admin/page.tsx', `import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const admin = await createAdminClient()

  const [firmsRes, usersRes, reviewsRes, redemptionsRes, changesRes] = await Promise.all([
    admin.from('firms').select('id, is_published'),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('reviews').select('id, status'),
    admin.from('coin_redemptions').select('id, status'),
    admin.from('scraper_changes').select('id').eq('applied', false),
  ])

  const totalFirms = firmsRes.data?.length || 0
  const publishedFirms = (firmsRes.data || []).filter(f => f.is_published).length
  const totalUsers = usersRes.count || 0
  const pendingReviews = (reviewsRes.data || []).filter(r => r.status === 'pending').length
  const pendingRedemptions = (redemptionsRes.data || []).filter(r => r.status === 'pending').length
  const pendingChanges = changesRes.data?.length || 0

  const stats = [
    { label: 'Live Firms', value: publishedFirms, sub: totalFirms + ' total', href: '/admin/firms', color: 'var(--teal)' },
    { label: 'Registered Users', value: totalUsers, sub: 'Total accounts', href: '/admin/firms', color: 'var(--violet)' },
    { label: 'Pending Reviews', value: pendingReviews, sub: 'Need approval', href: '/admin/reviews', color: pendingReviews > 0 ? 'var(--amber)' : 'var(--teal)' },
    { label: 'Pending Redemptions', value: pendingRedemptions, sub: 'Coins shop orders', href: '/admin/coins', color: pendingRedemptions > 0 ? 'var(--amber)' : 'var(--teal)' },
    { label: 'Site Changes', value: pendingChanges, sub: 'From scraper', href: '/admin/scraper', color: pendingChanges > 0 ? 'var(--coral)' : 'var(--teal)' },
  ]

  const quickLinks = [
    { label: 'Add New Firm', href: '/admin/firms/new', desc: 'Create a new prop firm listing' },
    { label: 'Send Email Blast', href: '/admin/email', desc: 'Email all users or affiliate firms' },
    { label: 'Approve Reviews', href: '/admin/reviews', desc: pendingReviews + ' review(s) waiting' },
    { label: 'Grant Coins', href: '/admin/coins', desc: 'Manage user coins and prizes' },
    { label: 'Check Scraper', href: '/admin/scraper', desc: pendingChanges + ' change(s) detected' },
    { label: 'Manage Prizes', href: '/admin/coins', desc: 'Add or edit coin prizes' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Admin Dashboard</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>TheFundedDiaries CRM</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '32px' }}>
        {stats.map(s => (
          <Link key={s.label} href={s.href} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{s.sub}</div>
          </Link>
        ))}
      </div>
      <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
        {quickLinks.map(l => (
          <Link key={l.label} href={l.href} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{l.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{l.desc}</div>
            </div>
            <span style={{ color: 'var(--teal)', fontSize: '18px' }}>&rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
`)

// Remove NewsletterPopup from HomeClient if present
const homeClientPath = path.join(root, 'app/HomeClient.tsx')
if (fs.existsSync(homeClientPath)) {
  let c = fs.readFileSync(homeClientPath, 'utf8')
  c = c.replace(/import NewsletterPopup from '@\/components\/ui\/NewsletterPopup'\n/g, '')
  c = c.replace(/import NewsletterPopup from "@\/components\/ui\/NewsletterPopup"\n/g, '')
  c = c.replace(/<NewsletterPopup \/>\n?/g, '')
  fs.writeFileSync(homeClientPath, c, 'utf8')
  console.log('  [OK] Cleaned NewsletterPopup from HomeClient.tsx')
}

// Remove NewsletterPopup from app/page.tsx if present
const appPagePath = path.join(root, 'app/page.tsx')
if (fs.existsSync(appPagePath)) {
  let c = fs.readFileSync(appPagePath, 'utf8')
  c = c.replace(/import NewsletterPopup from '@\/components\/ui\/NewsletterPopup'\n/g, '')
  c = c.replace(/<NewsletterPopup \/>\n?/g, '')
  fs.writeFileSync(appPagePath, c, 'utf8')
  console.log('  [OK] Cleaned NewsletterPopup from page.tsx')
}

console.log('\n=== ALL DONE ===')
console.log('Run:')
console.log('  git add .')
console.log('  git commit -m "Fix all encoding + all pages complete"')
console.log('  git push')
