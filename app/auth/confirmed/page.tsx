'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmedContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (!error) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setUserEmail(user.email)
      })
    }
  }, [error])

  if (error) {
    return (
      <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>&times;</div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '10px', color: 'var(--coral)' }}>Link expired or invalid</h1>
        <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px' }}>
          The confirmation link has expired or was already used.<br/>Please sign up again to get a new link.
        </p>
        <Link href="/auth/register" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '9px', fontSize: '14px', fontWeight: 700, color: '#04120c', background: 'var(--teal)', textDecoration: 'none' }}>
          Sign up again &rarr;
        </Link>
        <div style={{ marginTop: '12px' }}>
          <Link href="/auth/login" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>Already confirmed? Sign in &rarr;</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px', boxShadow: '0 0 40px var(--teal-glow)' }}>&#10003;</div>
      <h1 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Account confirmed!</h1>
      {userEmail && <p style={{ fontSize: '14px', color: 'var(--t3)', marginBottom: '8px' }}>{userEmail}</p>}
      <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '24px' }}>
        Your email has been verified. You now have full access to TheFundedDiaries.
      </p>
      <div style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', fontSize: '13.5px', color: 'var(--teal)', fontWeight: 600 }}>
        🪙 50 welcome coins have been added to your account!
      </div>
      <Link href="/auth/login" style={{ display: 'inline-block', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', textDecoration: 'none', boxShadow: '0 0 24px var(--teal-glow)' }}>
        Sign In to Your Account &rarr;
      </Link>
    </div>
  )
}

export default function EmailConfirmedPage() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <Suspense fallback={<div style={{ color: 'var(--t2)' }}>Loading...</div>}>
          <ConfirmedContent />
        </Suspense>
      </main>
    </>
  )
}