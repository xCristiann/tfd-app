import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogoServer from '@/components/firm/FirmLogoServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PayoutsPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase
    .from('firms')
    .select('name, slug, logo_url, payout_reliability, avg_payout_days, payout_methods, support_quality, trust_score, max_allocation')
    .eq('is_published', true)
    .order('trust_score', { ascending: false })

  const reliabilityColor = (r: string) => {
    if (r === 'Confirmed') return { bg: 'rgba(0,229,160,0.1)', color: 'var(--teal)', border: 'rgba(0,229,160,0.2)' }
    if (r === 'Reported issues') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)' }
    return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
  }

  const speedColor = (days: number) => {
    if (!days) return 'var(--t3)'
    if (days <= 1) return 'var(--green)'
    if (days <= 3) return 'var(--teal)'
    if (days <= 7) return 'var(--amber)'
    return 'var(--coral)'
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Transparency</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Payout Tracker</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
            Verified payout data for all listed prop firms — speed, reliability, and methods.
          </p>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr 120px 100px 100px 1fr 80px', gap: '12px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', alignItems: 'center' }}>
            <div>Firm</div>
            <div>Reliability</div>
            <div>Avg Speed</div>
            <div>Support</div>
            <div>Methods</div>
            <div style={{ textAlign: 'right' }}>Max Alloc.</div>
          </div>

          {(firms || []).map(firm => {
            const rc = reliabilityColor(firm.payout_reliability || 'Unknown')
            return (
              <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 120px 100px 100px 1fr 80px', gap: '12px', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FirmLogoServer name={firm.name} logoUrl={firm.logo_url} size={36} radius={8} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{firm.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--t3)' }}>Trust {firm.trust_score}/100</div>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, whiteSpace: 'nowrap' }}>
                      {firm.payout_reliability || 'Unknown'}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, color: speedColor(firm.avg_payout_days) }}>
                    {firm.avg_payout_days ? `${firm.avg_payout_days}d` : '—'}
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--t2)' }}>
                    {firm.support_quality || '—'}
                  </div>

                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(firm.payout_methods || []).map((m: string) => (
                      <span key={m} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border)', fontWeight: 500 }}>{m}</span>
                    ))}
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: 700 }}>
                    {firm.max_allocation ? `$${Math.round(firm.max_allocation / 1000)}K` : '—'}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>
          Data verified independently · <Link href="/trust-score" style={{ color: 'var(--teal)', textDecoration: 'none' }}>How we verify payout data →</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}