'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError(''); setUnverified(false)

    const { error, data } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setUnverified(true)
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single()
      const redirect = searchParams.get('redirect')
      router.push(redirect || (profile?.is_admin ? '/admin' : '/'))
      router.refresh()
    }
  }

  const resendConfirmation = async () => {
    setResendLoading(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thefundeddiaries.com'
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/auth/confirmed` }
    })
    setResendDone(true)
    setResendLoading(false)
  }

  return (
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
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', color: 'var(--coral)', marginBottom: '16px' }}>{error}</div>
      )}

      {unverified && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '9px', padding: '14px 16px', fontSize: '13.5px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: '6px' }}>⚠️ Email not verified</div>
          <div style={{ color: 'var(--t2)', lineHeight: 1.6 }}>
            Please confirm your email before signing in.{' '}
            {!resendDone ? (
              <button onClick={resendConfirmation} disabled={resendLoading}
                style={{ color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', padding: 0, fontFamily: 'Inter, sans-serif' }}>
                {resendLoading ? 'Sending...' : 'Resend confirmation email'}
              </button>
            ) : (
              <span style={{ color: 'var(--teal)', fontWeight: 600 }}>&#10003; Email sent! Check your inbox.</span>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        <Link href="/auth/forgot-password" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}>
          Forgot password?
        </Link>
      </div>

      <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Signing in...' : 'Sign In &rarr;'}
      </button>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Create one free</Link>
      </div>
      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Link href="/" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>&larr; Back to TheFundedDiaries</Link>
      </div>
    </div>
  )
}

export default function LoginClient() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 440px 1fr', gap: '0' }}>
      <div style={{ background: 'var(--bg1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '20px' }}>
        <div style={{ width: '100%', maxWidth: '280px', aspectRatio: '1/1.4', background: 'rgba(0,229,160,0.05)', border: '1px dashed rgba(0,229,160,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ad Space</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 392px</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid var(--border)' }}>
        <Suspense fallback={<div />}>
          <LoginForm />
        </Suspense>
      </div>

      <div style={{ background: 'var(--bg1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '280px', height: '600px', background: 'rgba(167,139,250,0.05)', border: '1px dashed rgba(167,139,250,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Premium Ad</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 600px</div>
        </div>
      </div>
    </div>
  )
}