import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogoServer from '@/components/firm/FirmLogoServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PropFirmRulesPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase
    .from('firms')
    .select('name, slug, logo_url, trust_score, challenges(allows_weekend_holding, allows_news_trading, allows_ea, allows_hedging, phase1_min_days, phase1_time_limit)')
    .eq('is_published', true)
    .order('trust_score', { ascending: false })

  const tick = (v: boolean) => v
    ? <span style={{ color: 'var(--teal)', fontSize: '16px' }}>✓</span>
    : <span style={{ color: 'var(--coral)', fontSize: '14px' }}>✗</span>

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Reference</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Prop Firm Rules</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
            Quick reference guide for trading rules across all listed firms.
          </p>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr repeat(5, 90px) 80px', gap: '8px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--t3)', alignItems: 'center' }}>
            <div>Firm</div>
            <div style={{ textAlign: 'center' }}>Weekend</div>
            <div style={{ textAlign: 'center' }}>News</div>
            <div style={{ textAlign: 'center' }}>EA/Bots</div>
            <div style={{ textAlign: 'center' }}>Hedging</div>
            <div style={{ textAlign: 'center' }}>Min Days</div>
            <div style={{ textAlign: 'center' }}>Time Limit</div>
          </div>

          {(firms || []).map((firm: any) => {
            const ch = firm.challenges?.sort((a: any, b: any) => (a.price_usd || 0) - (b.price_usd || 0))[0]
            return (
              <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr repeat(5, 90px) 80px', gap: '8px', alignItems: 'center', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FirmLogoServer name={firm.name} logoUrl={firm.logo_url} size={32} radius={7} />
                    <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{firm.name}</span>
                  </div>

                  <div style={{ textAlign: 'center' }}>{tick(ch?.allows_weekend_holding)}</div>
                  <div style={{ textAlign: 'center' }}>{tick(ch?.allows_news_trading)}</div>
                  <div style={{ textAlign: 'center' }}>{tick(ch?.allows_ea)}</div>
                  <div style={{ textAlign: 'center' }}>{tick(ch?.allows_hedging)}</div>
                  <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--t2)' }}>{ch?.phase1_min_days ? `${ch.phase1_min_days}d` : '—'}</div>
                  <div style={{ textAlign: 'center', fontSize: '13px', color: ch?.phase1_time_limit === 0 ? 'var(--teal)' : 'var(--t2)' }}>
                    {ch?.phase1_time_limit === 0 ? 'None' : ch?.phase1_time_limit ? `${ch.phase1_time_limit}d` : '—'}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>
          Based on lowest-priced challenge per firm · <Link href="/trust-score" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Methodology →</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}