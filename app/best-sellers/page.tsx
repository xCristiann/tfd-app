import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogoServer from '@/components/firm/FirmLogoServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function BestSellersPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase
    .from('firms')
    .select('*, challenges(*)')
    .eq('is_published', true)
    .order('trust_score', { ascending: false })

  const getLowest = (f: any) => f.challenges?.sort((a: any, b: any) => a.price_usd - b.price_usd)[0]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Rankings</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Best Sellers</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
            Top-rated prop firms ranked by trust score, value, and trader satisfaction.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(firms || []).map((firm: any, i: number) => {
            const ch = getLowest(firm)
            const isTop = i < 3
            return (
              <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: 'var(--bg1)', border: `1px solid ${isTop ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, borderRadius: '14px', padding: '20px 24px', display: 'grid', gridTemplateColumns: '48px 2fr 100px 100px 120px 100px', gap: '16px', alignItems: 'center', transition: 'all .15s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg1)')}>

                  <div style={{ fontSize: i === 0 ? '28px' : i === 1 ? '24px' : i === 2 ? '22px' : '14px', textAlign: 'center', fontWeight: 700, color: 'var(--t3)' }}>
                    {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <FirmLogoServer name={firm.name} logoUrl={firm.logo_url} size={44} radius={10} />
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '3px' }}>{firm.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{firm.headquarters || '—'}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--teal)' }}>{firm.trust_score}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Trust Score</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green)' }}>{ch?.profit_split || '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Profit Split</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{ch ? `$${ch.price_usd}` : '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>From</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '8px', background: isTop ? 'var(--teal)' : 'var(--bg2)', color: isTop ? '#04120c' : 'var(--t1)', fontSize: '13px', fontWeight: 700, border: isTop ? 'none' : '1px solid var(--border)' }}>
                      View →
                    </div>
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