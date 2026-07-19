import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

export default function UnlistedFirmsPage() {
  const firms = [
    { name: 'True Forex Funds', reason: 'Ceased operations 2024', status: 'Closed' },
    { name: 'My Forex Funds', reason: 'CFTC lawsuit, operations suspended', status: 'Suspended' },
    { name: 'Funded Trading Plus', reason: 'Under review &mdash; payout delays reported', status: 'Review' },
    { name: 'Surge Trader', reason: 'Ceased operations 2024', status: 'Closed' },
    { name: 'E8 Funding', reason: 'Rebranded to E8 Markets', status: 'Rebranded' },
    { name: 'Lux Trading Firm', reason: 'Under review', status: 'Review' },
  ]

  const statusColor = (s: string) => {
    if (s === 'Closed') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)' }
    if (s === 'Suspended') return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    if (s === 'Review') return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t2)', border: 'rgba(139,146,168,0.2)' }
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '10px' }}>
            Transparency
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Unlisted Firms</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7 }}>
            These firms are not listed on TheFundedDiaries because they have ceased operations, are under investigation, or have had significant payout issues reported. We track them here for transparency.
          </p>
        </div>

        <div style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', fontSize: '13.5px', color: 'var(--coral)', lineHeight: 1.65 }}>
          ⚠️ Trading with unlisted firms carries significant risk. Always do your own research before funding any account.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {firms.map(firm => {
            const c = statusColor(firm.status)
            return (
              <div key={firm.name} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{firm.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--t2)' }}>{firm.reason}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
                  {firm.status}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
          Know a firm that should be listed or unlisted?{' '}
          <Link href="/contact" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Contact us</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}