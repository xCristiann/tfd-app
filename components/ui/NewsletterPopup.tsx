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
    // Show after 5 seconds, only if not dismissed before
    const dismissed = localStorage.getItem('tfd_popup_dismissed')
    if (dismissed) return
    const timer = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('tfd_popup_dismissed', '1')
  }

  const submit = async () => {
    if (!email || !email.includes('@')) { setError('Please enter a valid email'); return }
    if (!agreed) { setError('Please agree to receive emails'); return }
    setLoading(true); setError('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'popup_giveaway' })
      })
      if (res.ok) {
        setDone(true)
        localStorage.setItem('tfd_popup_dismissed', '1')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Backdrop */}
      <div onClick={dismiss} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} />

      {/* Modal */}
      <div style={{ position: 'relative', maxWidth: '480px', width: '100%', background: 'linear-gradient(160deg,#0c0f1a,#080b12)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '20px', padding: '40px 36px', textAlign: 'center', boxShadow: '0 0 80px rgba(0,229,160,0.1), 0 0 40px rgba(124,58,237,0.1)' }}>

        {/* Close */}
        <button onClick={dismiss} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <Image src="/logo.png" alt="TheFundedDiaries" width={40} height={40} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)' }}>TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span></span>
        </div>

        {!done ? (
          <>
            {/* Prize badge */}
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,229,160,0.15),rgba(124,58,237,0.15))', border: '2px solid rgba(0,229,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', flexDirection: 'column' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '1px' }}>WIN</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--t1)', lineHeight: 1 }}>$200K</div>
              <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>ACCOUNT</div>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-.02em', marginBottom: '10px', color: 'var(--t1)' }}>
              Want a Chance to Win a <span style={{ color: 'var(--teal)' }}>$200K</span> Challenge Account?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '24px' }}>
              Join the TheFundedDiaries community — get exclusive prop firm offers, rule updates, and enter our monthly giveaway for a free $200K challenge account.
            </p>

            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--coral)', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'left' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Your Email Address"
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '10px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', cursor: 'pointer', textAlign: 'left' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: 'var(--teal)', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: '12.5px', color: 'var(--t3)', lineHeight: 1.5 }}>
                I would like to receive exclusive prop firm offers, discount codes, and news from TheFundedDiaries.
              </span>
            </label>

            <button onClick={submit} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'linear-gradient(135deg,var(--teal),#00c085)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entering...' : 'Enter Giveaway →'}
            </button>

            <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--t3)' }}>
              No spam. Unsubscribe anytime. Winner drawn monthly.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '10px', color: 'var(--teal)' }}>You are entered!</h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '24px' }}>
              Good luck! We will announce the $200K account winner at the end of the month. Check your email for exclusive offers in the meantime.
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