import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogoServer from '@/components/firm/FirmLogoServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SpreadsPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase
    .from('firms')
    .select('name, slug, logo_url, platforms, markets_forex, markets_futures, markets_crypto, markets_metals, markets_indices, trust_score')
    .eq('is_published', true)
    .eq('markets_forex', true)
    .order('trust_score', { ascending: false })

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Instruments</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Spreads & Instruments</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
            Compare tradeable instruments, platforms and markets across all listed prop firms.
          </p>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 80px 1fr', gap: '12px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', alignItems: 'center' }}>
            <div>Firm</div>
            <div style={{ textAlign: 'center' }}>Forex</div>
            <div style={{ textAlign: 'center' }}>Futures</div>
            <div style={{ textAlign: 'center' }}>Crypto</div>
            <div style={{ textAlign: 'center' }}>Metals</div>
            <div style={{ textAlign: 'center' }}>Indices</div>
            <div>Platforms</div>
          </div>

          {(firms || []).map(firm => {
            const yes = { fontSize: '16px', textAlign: 'center' as const }
            const no = { fontSize: '13px', color: 'var(--t3)', textAlign: 'center' as const }
            return (
              <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 80px 1fr', gap: '12px', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FirmLogoServer name={firm.name} logoUrl={firm.logo_url} size={36} radius={8} />
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{firm.name}</span>
                  </div>

                  <div style={firm.markets_forex ? yes : no}>{firm.markets_forex ? '✓' : '—'}</div>
                  <div style={firm.markets_futures ? yes : no}>{firm.markets_futures ? '✓' : '—'}</div>
                  <div style={firm.markets_crypto ? yes : no}>{firm.markets_crypto ? '✓' : '—'}</div>
                  <div style={firm.markets_metals ? yes : no}>{firm.markets_metals ? '✓' : '—'}</div>
                  <div style={firm.markets_indices ? yes : no}>{firm.markets_indices ? '✓' : '—'}</div>

                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(firm.platforms || []).map((p: string) => (
                      <span key={p} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border)' }}>{p}</span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
      <Footer />
    </>
  )
}