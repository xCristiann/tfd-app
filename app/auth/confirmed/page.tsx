'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

export default function EmailConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const handleConfirmation = async () => {
      // Get the code from URL params (PKCE flow)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errorParam = params.get('error')
      const errorDesc = params.get('error_description')

      if (errorParam) {
        setErrorMsg(errorDesc || errorParam)
        setStatus('error')
        return
      }

      if (code) {
        // Exchange code for session — this confirms the email
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setErrorMsg(error.message)
          setStatus('error')
          return
        }
        setStatus('success')
        return
      }

      // Hash-based flow (implicit) — check if already logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        setStatus('success')
      } else {
        setErrorMsg('No confirmation code found. The link may have expired.')
        setStatus('error')
      }
    }

    handleConfirmation()
  }, [])

  if (status === 'loading') {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--teal)', borderTopColor: 'transparent', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '15px', color: 'var(--t2)' }}>Confirming your account...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </main>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>
              ✗
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px', color: 'var(--coral)' }}>Link expired or invalid</h1>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px' }}>
              {errorMsg || 'The confirmation link has expired or was already used. Please try signing up again.'}
            </p>
            <Link href="/auth/register" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '9px', fontSize: '14px', fontWeight: 700, color: '#04120c', background: 'var(--teal)', textDecoration: 'none', marginBottom: '12px' }}>
              Sign up again →
            </Link>
            <div>
              <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>
                Already confirmed? Sign in →
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px', boxShadow: '0 0 40px var(--teal-glow)' }}>
            ✓
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>
            Account confirmed!
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '12px' }}>
            Your email has been verified successfully.
          </p>
          <div style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '28px', fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: '6px' }}>🪙 50 welcome coins added!</div>
            Compare firms, write reviews, and earn more coins on every purchase via our links.
          </div>
          <Link href="/auth/login" style={{ display: 'inline-block', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', textDecoration: 'none', boxShadow: '0 0 24px var(--teal-glow)' }}>
            Sign In to Your Account →
          </Link>
          <div style={{ marginTop: '16px' }}>
            <Link href="/" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>
              ← Browse firms without account
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}