# TheFundedDiaries — PowerShell setup script
# Run from: C:\TheFundedDiaries\tfd-app
# Usage: powershell -ExecutionPolicy Bypass -File setup.ps1

$root = "C:\TheFundedDiaries\tfd-app"
Set-Location $root

Write-Host "=== TheFundedDiaries Setup ===" -ForegroundColor Cyan

# ─── HELPER ───
function Write-File($path, $content) {
    $dir = Split-Path $path
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] $path" -ForegroundColor Green
}

# ══════════════════════════════════════════
# 1. LOGO SVG
# ══════════════════════════════════════════
Write-Host "`n[1/8] Logo..." -ForegroundColor Yellow
$logo = @'
export function TFDLogo({ size = 32 }: { size?: number }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="18" fill="url(#tfd_g)"/>
      <defs>
        <linearGradient id="tfd_g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00e5a0"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect x="22" y="28" width="32" height="44" rx="4" fill="rgba(4,18,12,0.85)"/>
      <rect x="28" y="28" width="32" height="44" rx="4" fill="rgba(4,18,12,0.95)" stroke="rgba(0,229,160,0.4)" strokeWidth="1.2"/>
      <rect x="34" y="38" width="18" height="2" rx="1" fill="#00e5a0" opacity="0.9"/>
      <rect x="34" y="44" width="14" height="2" rx="1" fill="#a78bfa" opacity="0.7"/>
      <rect x="34" y="50" width="16" height="2" rx="1" fill="#00e5a0" opacity="0.5"/>
      <rect x="34" y="56" width="12" height="2" rx="1" fill="#a78bfa" opacity="0.4"/>
      <circle cx="72" cy="34" r="14" fill="rgba(4,18,12,0.9)" stroke="#a78bfa" strokeWidth="1.5"/>
      <path d="M63 36 L68 30 L73 36 L78 28" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="78" cy="28" r="2.5" fill="#00e5a0"/>
    </svg>
  )
}
'@
Write-File "$root\components\ui\TFDLogo.tsx" $logo

# ══════════════════════════════════════════
# 2. NAVBAR with new logo
# ══════════════════════════════════════════
Write-Host "`n[2/8] Navbar..." -ForegroundColor Yellow
$navbar = @'
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
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(p?.is_admin || false)
      }
      setLoaded(true)
    }
    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(p?.is_admin || false)
      } else setIsAdmin(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href
  const linkStyle = (href: string) => ({
    fontSize: '13.5px',
    color: isActive(href) ? 'var(--t1)' : 'var(--t2)',
    padding: '7px 14px', borderRadius: '8px', textDecoration: 'none',
    background: isActive(href) ? 'rgba(255,255,255,0.05)' : 'transparent',
  })

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', background: 'rgba(7,9,15,0.85)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <TFDLogo size={32} />
          <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--t1)' }}>
            TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '2px' }}>
          <Link href="/" style={linkStyle('/')}>Firms</Link>
          <Link href="/firms" style={linkStyle('/firms')}>Compare</Link>
          <Link href="/offers" style={linkStyle('/offers')}>Offers</Link>
          <Link href="/calculator" style={linkStyle('/calculator')}>Calculator</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!loaded ? <div style={{ width: '120px', height: '36px' }} /> : user ? (
            <>
              {isAdmin && <Link href="/admin" style={{ textDecoration: 'none', fontSize: '13.5px', padding: '8px 16px', borderRadius: '9px', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--teal)', background: 'rgba(0,229,160,0.06)', fontWeight: 600 }}>Admin CRM</Link>}
              <button onClick={handleSignOut} style={{ padding: '8px 16px', borderRadius: '9px', fontSize: '13.5px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" style={{ textDecoration: 'none', fontSize: '13.5px', padding: '8px 16px', borderRadius: '9px', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent' }}>Sign In</Link>
              <Link href="/auth/register" style={{ textDecoration: 'none', fontSize: '13.5px', padding: '9px 18px', borderRadius: '9px', color: '#04120c', background: 'var(--teal)', fontWeight: 700, boxShadow: '0 0 20px var(--teal-glow)' }}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
'@
Write-File "$root\components\layout\Navbar.tsx" $navbar

# ══════════════════════════════════════════
# 3. LOGIN PAGE — redesigned with ad panels
# ══════════════════════════════════════════
Write-Host "`n[3/8] Login page..." -ForegroundColor Yellow
$loginClient = @'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single()
      const redirect = searchParams.get('redirect')
      router.push(redirect || (profile?.is_admin ? '/admin' : '/'))
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 440px 1fr', gap: '0' }}>

      {/* LEFT AD PANEL */}
      <div style={{ background: 'var(--bg1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '20px' }}>
        <div style={{ width: '100%', maxWidth: '280px', aspectRatio: '1/1.4', background: 'linear-gradient(135deg,rgba(0,229,160,0.1),rgba(167,139,250,0.1))', border: '1px dashed rgba(0,229,160,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ad Space</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 392px</div>
        </div>
        <div style={{ width: '100%', maxWidth: '280px', height: '90px', background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Banner Ad</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 90px</div>
        </div>
      </div>

      {/* CENTER — LOGIN FORM */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid var(--border)' }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '24px' }}>
              <TFDLogo size={40} />
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-.03em' }}>
                TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
              </span>
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', marginTop: '8px' }}>Welcome back</h1>
            <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Sign in to access your account</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', color: 'var(--coral)', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base" placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
          </div>

          <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Create one free</Link>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>← Back to TheFundedDiaries</Link>
          </div>
        </div>
      </div>

      {/* RIGHT AD PANEL */}
      <div style={{ background: 'var(--bg1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '20px' }}>
        <div style={{ width: '100%', maxWidth: '280px', height: '600px', background: 'linear-gradient(135deg,rgba(167,139,250,0.1),rgba(0,229,160,0.1))', border: '1px dashed rgba(167,139,250,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Premium Ad</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 600px</div>
        </div>
      </div>
    </div>
  )
}
'@
Write-File "$root\app\auth\login\LoginClient.tsx" $loginClient

# ══════════════════════════════════════════
# 4. SESSION — expire on tab close
# ══════════════════════════════════════════
Write-Host "`n[4/8] Session config..." -ForegroundColor Yellow
$supabaseClient = @'
'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  return createBrowserClient(url, key, {
    auth: {
      persistSession: false,
      detectSessionInUrl: true,
    }
  })
}
'@
Write-File "$root\lib\supabase\client.ts" $supabaseClient

# ══════════════════════════════════════════
# 5. DELETE FIRM API route
# ══════════════════════════════════════════
Write-Host "`n[5/8] Delete firm API..." -ForegroundColor Yellow
$deleteFirmRoute = @'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await adminSupabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await adminSupabase.from('firms').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
'@
Write-File "$root\app\api\firms\[id]\route.ts" $deleteFirmRoute

# ══════════════════════════════════════════
# 6. FOOTER with Unlisted Firms + full links
# ══════════════════════════════════════════
Write-Host "`n[6/8] Footer..." -ForegroundColor Yellow
$footer = @'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function Footer() {
  const sections = [
    {
      title: 'Prop Firms',
      links: [
        { label: 'All Prop Firms', href: '/firms' },
        { label: 'Compare Challenges', href: '/firms' },
        { label: 'Offers & Discounts', href: '/offers' },
        { label: 'Prop Firm Rules', href: '/firms' },
        { label: 'Reviews', href: '/firms' },
        { label: 'Unlisted Firms', href: '/unlisted-firms' },
      ]
    },
    {
      title: 'Tools',
      links: [
        { label: 'Matching Calculator', href: '/calculator' },
        { label: 'Forex Firms', href: '/firms?market=forex' },
        { label: 'Futures Firms', href: '/firms?market=futures' },
        { label: 'Crypto Firms', href: '/firms?market=crypto' },
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'How Trust Score Works', href: '/trust-score' },
        { label: 'Offers & Promo Codes', href: '/offers' },
        { label: 'Calculator', href: '/calculator' },
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Affiliate Program', href: '/affiliate' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ]
    },
  ]

  return (
    <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '56px', marginTop: '80px', background: 'var(--bg1)' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px repeat(4, 1fr)', gap: '40px', marginBottom: '48px' }}>

          {/* BRAND */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <TFDLogo size={28} />
              <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)' }}>
                TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.7, marginBottom: '20px' }}>
              Independent prop firm comparison. Verified rules, transparent data, real trader reviews.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['X', 'TG', 'DC'].map(s => (
                <div key={s} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--t3)', cursor: 'pointer' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* LINK SECTIONS */}
          {sections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '16px' }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.links.map(link => (
                  <Link key={link.label} href={link.href} style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none', transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
            © 2026 TheFundedDiaries · Independent prop firm comparison · Not financial advice
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
'@
Write-File "$root\components\layout\Footer.tsx" $footer

# ══════════════════════════════════════════
# 7. UNLISTED FIRMS PAGE
# ══════════════════════════════════════════
Write-Host "`n[7/8] Unlisted firms page..." -ForegroundColor Yellow
$unlistedPage = @'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

export default function UnlistedFirmsPage() {
  const firms = [
    { name: 'True Forex Funds', reason: 'Ceased operations 2024', status: 'Closed' },
    { name: 'My Forex Funds', reason: 'CFTC lawsuit, operations suspended', status: 'Suspended' },
    { name: 'Funded Trading Plus', reason: 'Under review — payout delays reported', status: 'Review' },
    { name: 'Surge Trader', reason: 'Ceased operations 2024', status: 'Closed' },
    { name: 'E8 Funding', reason: 'Rebranded to E8 Markets', status: 'Rebranded' },
    { name: 'Lux Trading Firm', reason: 'Under review', status: 'Review' },
  ]

  const statusColor = (s: string) => {
    if (s === 'Closed') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)' }
    if (s === 'Suspended') return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    if (s === 'Review') return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t2)', border: 'rgba(139,146,168,0.2)' }
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '10px' }}>
            Transparency
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Unlisted Firms</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7 }}>
            These firms are not listed on TheFundedDiaries because they have ceased operations, are under investigation, or have had significant payout issues reported. We track them here for transparency.
          </p>
        </div>

        <div style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', fontSize: '13.5px', color: 'var(--coral)', lineHeight: 1.65 }}>
          ⚠️ Trading with unlisted firms carries significant risk. Always do your own research before funding any account.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {firms.map(firm => {
            const c = statusColor(firm.status)
            return (
              <div key={firm.name} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{firm.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--t2)' }}>{firm.reason}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
                  {firm.status}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
          Know a firm that should be listed or unlisted?{' '}
          <Link href="/contact" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Contact us</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
'@
Write-File "$root\app\unlisted-firms\page.tsx" $unlistedPage

# ══════════════════════════════════════════
# 8. TRUST SCORE page
# ══════════════════════════════════════════
Write-Host "`n[8/8] Trust score page..." -ForegroundColor Yellow
$trustPage = @'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function TrustScorePage() {
  const factors = [
    { label: 'Payout Reliability', max: 25, description: 'Has the firm confirmed all payouts? "Confirmed" = 25pts, "Unknown" = 10pts, "Issues reported" = 0pts.' },
    { label: 'Payout Speed', max: 20, description: 'How quickly does the firm pay out? Same day = 20pts, 1-3 days = 15pts, up to 7 days = 10pts, up to 14 days = 5pts.' },
    { label: 'Years Active', max: 20, description: 'Firm longevity signals stability. 5+ years = 20pts, 3-5 years = 14pts, 2-3 years = 10pts, 1-2 years = 6pts.' },
    { label: 'No Delayed Payouts', max: 15, description: 'Based on reported delays in our system. 0 delays = 15pts, 1-2 delays = 10pts, 3-5 = 5pts, 5+ = 0pts.' },
    { label: 'Support Quality', max: 10, description: 'Assessed from user reports and response time testing. Fast = 10pts, Medium = 6pts, Slow = 2pts.' },
    { label: 'Rules Clarity', max: 5, description: 'Are the trading rules clearly documented? Clear = 5pts, Ambiguous = 2pts, Unclear = 0pts.' },
    { label: 'Average Review Rating', max: 5, description: 'Based on verified reviews on TheFundedDiaries. 4.5+ stars = 5pts, 4.0+ = 4pts, 3.5+ = 2pts.' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Methodology</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>How Trust Score Works</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7 }}>
            The Trust Score is a number from 0–100 calculated automatically from real, verifiable data. It is updated every time we update a firm's information. It is never paid for or influenced by the firm.
          </p>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
          <div style={{ background: 'var(--bg2)', padding: '14px 24px', display: 'grid', gridTemplateColumns: '1fr 80px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)' }}>
            <div>Factor</div><div style={{ textAlign: 'right' }}>Max Points</div>
          </div>
          {factors.map((f, i) => (
            <div key={f.label} style={{ padding: '18px 24px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>{f.max}</div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>{f.description}</div>
              <div style={{ marginTop: '10px', height: '4px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(f.max / 100) * 100}%`, background: 'linear-gradient(90deg,var(--teal2),var(--teal))', borderRadius: '100px' }} />
              </div>
            </div>
          ))}
          <div style={{ padding: '16px 24px', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg2)' }}>
            <div style={{ fontWeight: 700 }}>Total possible score</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>100</div>
          </div>
        </div>

        <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '12px', padding: '20px 24px', fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7 }}>
          <b style={{ color: 'var(--teal)' }}>Important:</b> The Trust Score is calculated automatically and updated when we update firm data. No firm can pay to improve their score. If you believe a score is incorrect, please <a href="/contact" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>contact us</a>.
        </div>
      </main>
      <Footer />
    </>
  )
}
'@
Write-File "$root\app\trust-score\page.tsx" $trustPage

# ══════════════════════════════════════════
# 9. EMAIL TEMPLATE — Affiliate outreach
# ══════════════════════════════════════════
Write-Host "`n[9] Email affiliate template patch..." -ForegroundColor Yellow
$affiliateTemplate = @'

export const AFFILIATE_TEMPLATE = {
  id: 'affiliate_outreach',
  name: '🤝 Affiliate Outreach',
  subject: 'Partnership Opportunity — TheFundedDiaries.com',
  heading: 'Partnership & Affiliate Program Invitation',
  body: `Dear [Firm Name] Team,

My name is Cristian, founder of TheFundedDiaries.com — an independent prop firm comparison and review platform that helps traders find the best prop firm for their trading style.

We are currently building our affiliate partnership network and would love to include [Firm Name] as a featured partner.

What we offer:
• A dedicated, fully-verified firm page with all your challenge details, rules, and payout conditions
• A unique discount code for our community of traders
• A custom affiliate tracking link so you can measure every referral
• Featured placement in our "Top Offers" section

What we ask:
• An affiliate commission for every funded challenge purchase referred through our platform
• A discount code for our community (even 10-15% significantly increases conversion)

Our platform is 100% independent — we never accept payment for rankings. Firms are ranked by trust score based on verified payout data, years active, and real trader reviews.

If you're interested, please reply with:
1. Your affiliate program details (commission %, cookie duration)
2. A discount code for our audience
3. Your preferred affiliate tracking link or platform

We look forward to a mutually beneficial partnership.

Best regards,
Cristian
Founder, TheFundedDiaries.com
hello@thefundeddiaries.com`,
  cta_text: 'View Our Platform',
  cta_url: 'https://thefundeddiaries.com',
}
'@

$composerPath = "$root\components\admin\EmailComposer.tsx"
if (Test-Path $composerPath) {
    $content = Get-Content $composerPath -Raw
    if ($content -notmatch 'affiliate_outreach') {
        $insertAfter = "const TEMPLATES = ["
        $newTemplate = "const TEMPLATES = [
  {
    id: 'affiliate_outreach',
    name: '🤝 Affiliate Outreach',
    subject: 'Partnership Opportunity — TheFundedDiaries.com',
    heading: 'Partnership & Affiliate Program Invitation',
    body: ``Dear [Firm Name] Team,\n\nMy name is Cristian, founder of TheFundedDiaries.com — an independent prop firm comparison and review platform.\n\nWe would love to include [Firm Name] as a featured partner on our platform.\n\nWhat we offer:\n• A dedicated verified firm page with all challenge details\n• Featured placement in our Top Offers section\n• A unique discount code for our trader community\n• Affiliate tracking link to measure every referral\n\nWhat we ask:\n• Affiliate commission for referrals\n• A discount code for our audience (10-15% recommended)\n\nPlease reply with your affiliate program details, a discount code, and your preferred tracking link.\n\nBest regards,\nCristian\nFounder, TheFundedDiaries.com\nhello@thefundeddiaries.com``,
    cta_text: 'View Our Platform',
    cta_url: 'https://thefundeddiaries.com',
  },"
        $content = $content.Replace($insertAfter, $newTemplate)
        [System.IO.File]::WriteAllText($composerPath, $content, [System.Text.Encoding]::UTF8)
        Write-Host "  [OK] Affiliate template added to EmailComposer" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] Affiliate template already exists" -ForegroundColor DarkYellow
    }
}

# ══════════════════════════════════════════
# 10. FROM EMAIL selector in send-email route
# ══════════════════════════════════════════
Write-Host "`n[10] Email sender selector in API route..." -ForegroundColor Yellow
$sendEmailRoute = @'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY!

const ALLOWED_SENDERS = [
  { label: 'TheFundedDiaries (hello@)', value: 'hello@thefundeddiaries.com' },
  { label: 'Support (support@)', value: 'support@thefundeddiaries.com' },
  { label: 'Partnerships (partners@)', value: 'partners@thefundeddiaries.com' },
  { label: 'No-Reply (noreply@)', value: 'noreply@thefundeddiaries.com' },
]

function buildEmailHtml(data: {
  heading: string; body: string; cta_text?: string; cta_url?: string; recipient_name?: string
}): string {
  const { heading, body, cta_text, cta_url, recipient_name } = data
  const greeting = recipient_name ? `Hi ${recipient_name},` : 'Hi there,'
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090f;font-family:'Inter',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07090f;padding:40px 20px;">
    <tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 32px;text-align:center;">
        <span style="font-size:17px;font-weight:800;color:#eef0f6;font-family:Inter,sans-serif;">TheFunded<span style="color:#00e5a0;">Diaries</span></span>
      </td></tr>
      <tr><td style="background:#0c0f1a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#eef0f6;letter-spacing:-0.02em;line-height:1.2;">${heading}</h1>
        <div style="height:2px;background:linear-gradient(90deg,#00e5a0,#a78bfa);border-radius:2px;margin:20px 0;"></div>
        <p style="margin:0 0 16px;font-size:15px;color:#8b92a8;line-height:1.6;">${greeting}</p>
        <div style="font-size:15px;color:#8b92a8;line-height:1.7;margin:0 0 28px;">${body.replace(/\n/g, '<br>')}</div>
        ${cta_text && cta_url ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr><td style="background:#00e5a0;border-radius:9px;padding:13px 28px;">
            <a href="${cta_url}" style="color:#04120c;font-size:14px;font-weight:800;text-decoration:none;">${cta_text} &rarr;</a>
          </td></tr></table>` : ''}
        <div style="height:1px;background:rgba(255,255,255,0.07);margin:28px 0;"></div>
        <p style="margin:0;font-size:12px;color:#4e5568;line-height:1.6;">
          You received this because you have an account on TheFundedDiaries.com.<br>
          &copy; 2026 TheFundedDiaries &middot; Independent prop firm comparison
        </p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`
}

export async function GET() {
  return NextResponse.json({ senders: ALLOWED_SENDERS })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await adminSupabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const { subject, heading, emailBody, cta_text, cta_url, recipients, from_email } = body
    if (!subject || !heading || !emailBody) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const fromAddress = ALLOWED_SENDERS.find(s => s.value === from_email)?.value || ALLOWED_SENDERS[0].value
    let emails: { email: string; name: string }[] = []
    if (recipients === 'all') {
      const { data } = await adminSupabase.from('profiles').select('email, full_name').not('email', 'is', null)
      emails = (data || []).filter(p => p.email).map(p => ({ email: p.email!, name: p.full_name || 'Trader' }))
    } else if (Array.isArray(recipients)) {
      emails = recipients
    }
    if (!emails.length) return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    const results = await Promise.allSettled(
      emails.map(({ email, name }) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `TheFundedDiaries <${fromAddress}>`,
            to: [email], subject,
            html: buildEmailHtml({ heading, body: emailBody, cta_text, cta_url, recipient_name: name }),
          }),
        })
      )
    )
    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    await adminSupabase.from('email_logs').insert({ subject, template: 'custom', recipients_count: sent, sent_by: user.id, status: failed > 0 ? 'partial' : 'sent' })
    return NextResponse.json({ success: true, sent, failed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
'@
Write-File "$root\app\api\send-email\route.ts" $sendEmailRoute

Write-Host "`n=== All done! ===" -ForegroundColor Cyan
Write-Host "Now run: git add . && git commit -m 'Major update' && git push" -ForegroundColor Yellow
