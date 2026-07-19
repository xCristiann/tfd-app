'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thefundeddiaries.com'

export default function RegisterClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleRegister = async () => {
    if (!email || !password || !name) { setError('Please fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')

    const supabase = createClient()

    // Validate referral code if provided
    let referrerId: string | null = null
    if (referralCode.trim()) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.trim().toLowerCase())
        .single()
      if (!referrer) {
        setError('Invalid referral code. Please check and try again.')
        setLoading(false)
        return
      }
      referrerId = referrer.id
    }

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          referred_by_code: referralCode.trim().toLowerCase() || null,
          referrer_id: referrerId,
        },
        emailRedirectTo: `${SITE_URL}/auth/callback?next=/auth/confirmed`,
      }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>📧</div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px' }}>Check your email</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px' }}>
            We sent a confirmation link to <b style={{ color: 'var(--t1)' }}>{email}</b>.<br/>
            Click the link to activate your account.
          </p>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>Didn&apos;t receive it?</div>
            <div>• Check your spam/junk folder</div>
            <div>• The link expires in 24 hours</div>
          </div>
          <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none' }}>&larr; Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 440px 1fr' }}>
      <div style={{ background: 'var(--bg1)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '280px', aspectRatio: '1/1.4', background: 'rgba(0,229,160,0.05)', border: '1px dashed rgba(0,229,160,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ad Space</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>280 × 392px</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '20px' }}>
              <TFDLogo size={36} />
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-.03em' }}>TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span></span>
            </Link>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px', marginTop: '8px' }}>Create your account</h1>
            <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Free forever &middot; No credit card needed</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', color: 'var(--coral)', marginBottom: '16px' }}>{error}</div>
          )}

          {[
            { label: 'Full Name', value: name, setter: setName, type: 'text', placeholder: 'Your name' },
            { label: 'Email address', value: email, setter: setEmail, type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: 'Min 8 characters' },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{f.label}</label>
              <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          {/* REFERRAL CODE */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Referral Code <span style={{ color: 'var(--t3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="e.g. ab12cd34"
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                style={{ width: '100%', padding: '11px 14px', background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box', letterSpacing: '.04em' }} />
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '5px' }}>
              🪙 You and your friend both get +100 bonus coins
            </div>
          </div>

          <button onClick={handleRegister} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 24px var(--teal-glow)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account &rarr;'}
          </button>

          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center', lineHeight: 1.6 }}>
            By signing up you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Terms</Link>{' '}and{' '}
            <Link href="/privacy" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Privacy Policy</Link>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
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