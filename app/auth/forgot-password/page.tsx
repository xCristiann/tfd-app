'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thefundeddiaries.com'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>📧</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px' }}>Check your email</h1>
          <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px' }}>
            We sent a password reset link to <b style={{ color: 'var(--t1)' }}>{email}</b>.<br/>
            The link expires in 1 hour.
          </p>
          <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}>← Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '24px' }}>
            <TFDLogo size={36} />
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-.03em' }}>TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span></span>
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Forgot password?</h1>
          <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Enter your email and we'll send you a reset link.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', color: 'var(--coral)', marginBottom: '16px' }}>{error}</div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            onKeyDown={e => e.key === 'Enter' && handleReset()}
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Sending...' : 'Send Reset Link →'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>← Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}