import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

export default function EmailConfirmedPage() {
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
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '32px' }}>
            Your email has been verified. You now have full access to TheFundedDiaries — compare firms, write reviews, and earn coins.
          </p>
          <Link href="/auth/login" style={{ display: 'inline-block', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'var(--teal)', textDecoration: 'none', boxShadow: '0 0 24px var(--teal-glow)' }}>
            Sign In to Your Account →
          </Link>
          <div style={{ marginTop: '16px' }}>
            <Link href="/" style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>
              ← Back to TheFundedDiaries
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}