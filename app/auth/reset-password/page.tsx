'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    if (!password || !confirm) { setError('Please fill in both fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>&#10003;</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px' }}>Password updated!</h1>
          <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>Redirecting you to sign in...</p>
          <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}>Sign in now &rarr;</Link>
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
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Set new password</h1>
          <p style={{ fontSize: '14px', color: 'var(--t2)' }}>Choose a strong password for your account.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', color: 'var(--coral)', marginBottom: '16px' }}>{error}</div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
            onKeyDown={e => e.key === 'Enter' && handleReset()}
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Updating...' : 'Update Password &rarr;'}
        </button>
      </div>
    </div>
  )
}