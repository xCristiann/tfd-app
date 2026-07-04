'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function RegisterClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleRegister = async () => {
    if (!email || !password || !name) { setError('Please fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      }
    })

    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>
            📧
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px' }}>Check your email</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px' }}>
            We sent a confirmation link to <b style={{ color: 'var(--t1)' }}>{email}</b>.<br />
            Click the link in the email to activate your account.
          </p>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>Didn't receive it?</div>
            <div>• Check your spam/junk folder</div>
            <div>• Make sure you typed the correct email</div>
            <div>• The link expires in 24 hours</div>
          </div>
          <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 440px 1fr' }}>

      {/* LEFT AD */}
      <div style={{ background: 'var(--bg1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '20px' }}>
        <div style={{ width: '100%', maxWidth: '280px', aspectRatio: '1/1.4', background: 'linear-gradient(135deg,rgba(0,229,160,0.1),rgba(167,139,250,0.1))', border: '1px dashed rgba(0,229,160,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ad Space</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 392px</div>
        </div>
      </div>

      {/* CENTER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid var(--border)' }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '24px' }}>
              <TFDLogo size={40} />
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-.03em' }}>
                TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
              </span>
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', marginTop: '8px' }}>Create your account</h1>
            <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Free forever · No credit card needed</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', color: 'var(--coral)', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={e => e.key === 'Enter' && handleRegister()} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleRegister} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>

          <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Privacy Policy</Link>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>

      {/* RIGHT AD */}
      <div style={{ background: 'var(--bg1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '280px', height: '600px', background: 'linear-gradient(135deg,rgba(167,139,250,0.1),rgba(0,229,160,0.1))', border: '1px dashed rgba(167,139,250,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Premium Ad</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 600px</div>
        </div>
      </div>
    </div>
  )
}