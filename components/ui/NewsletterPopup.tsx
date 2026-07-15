'use client'
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
    // Always show after 4 seconds — no localStorage check
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
      <div style={{ position: 'relative', maxWidth: '460px', width: '100%', background: 'linear-gradient(160deg,#0c0f1a,#080b12)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '24px', padding: '40px 36px', textAlign: 'center', boxShadow: '0 0 80px rgba(0,229,160,0.12), 0 0 160px rgba(124,58,237,0.08)' }}>
        <button onClick={dismiss} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--t2)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <Image src="/logo.png" alt="TheFundedDiaries" width={36} height={36} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)' }}>TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span></span>
        </div>

        {!done ? (
          <>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,229,160,0.12),rgba(124,58,237,0.12))', border: '2px solid rgba(0,229,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexDirection: 'column' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '1px' }}>WIN</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--t1)', lineHeight: 1 }}>$200K</div>
              <div style={{ fontSize: '9px', color: 'var(--t3)', marginTop: '1px' }}>ACCOUNT</div>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-.02em', marginBottom: '10px' }}>
              Win a <span style={{ color: 'var(--teal)' }}>$200K</span> Challenge Account!
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '20px' }}>
              Join the TheFundedDiaries community. Get exclusive offers, rule updates, and enter our monthly giveaway.
            </p>

            {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '9px', fontSize: '13px', color: 'var(--coral)', marginBottom: '12px' }}>{error}</div>}

            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address"
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '18px', cursor: 'pointer', textAlign: 'left' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: 'var(--teal)', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1.5 }}>
                I agree to receive exclusive offers, discount codes, and news from TheFundedDiaries.
              </span>
            </label>

            <button onClick={submit} disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'linear-gradient(135deg,#00e5a0,#00c085)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entering...' : 'Enter Giveaway →'}
            </button>

            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--t3)' }}>No spam. Unsubscribe anytime. Winner drawn monthly.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '10px', color: 'var(--teal)' }}>You&apos;re entered!</h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '24px' }}>
              Good luck! Winner announced end of month. Check your email for exclusive offers.
            </p>
            <button onClick={dismiss} style={{ padding: '11px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Start Exploring →
            </button>
          </>
        )}
      </div>
    </div>
  )
}