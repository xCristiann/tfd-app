'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function BestSellersPage() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'forex' | 'futures' | 'crypto'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms').select('*, challenges(*)').eq('is_published', true)
      .order('trust_score', { ascending: false })
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
  }, [])

  const filtered = firms.filter(f => {
    if (filter === 'forex') return f.markets_forex
    if (filter === 'futures') return f.markets_futures
    if (filter === 'crypto') return f.markets_crypto
    return true
  })

  const getLowest = (f: any) => f.challenges?.sort((a: any, b: any) => a.price_usd - b.price_usd)[0]

  const rankIcon = (i: number) => {
    if (i === 0) return '🏆'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return null
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Rankings</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Best Sellers</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Top-rated prop firms ranked by trust score, payout reliability, and trader satisfaction.</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[['all','All Markets'],['forex','Forex'],['futures','Futures'],['crypto','Crypto']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: `1px solid ${filter === k ? 'transparent' : 'var(--border2)'}`, background: filter === k ? 'var(--teal)' : 'transparent', color: filter === k ? '#04120c' : 'var(--t2)', transition: 'all .15s' }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)' }}>Loading firms...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((firm, i) => {
              const ch = getLowest(firm)
              const icon = rankIcon(i)
              const isTop3 = i < 3
              return (
                <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'var(--bg1)', border: `1px solid ${isTop3 ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, borderRadius: '14px', padding: '18px 24px', display: 'grid', gridTemplateColumns: '52px 1fr 110px 110px 110px 130px 130px', gap: '16px', alignItems: 'center', transition: 'all .15s', cursor: 'pointer', boxShadow: isTop3 ? '0 0 20px rgba(0,229,160,0.04)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg1)')}>

                    {/* Rank */}
                    <div style={{ textAlign: 'center' }}>
                      {icon ? (
                        <span style={{ fontSize: '28px' }}>{icon}</span>
                      ) : (
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>#{i + 1}</span>
                      )}
                    </div>

                    {/* Firm */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={44} radius={10} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>{firm.name}</div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {firm.markets_forex && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(0,229,160,0.1)', color: 'var(--teal)' }}>FX</span>}
                          {firm.markets_futures && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>FUT</span>}
                          {firm.markets_crypto && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(167,139,250,0.1)', color: 'var(--violet)' }}>CRYPTO</span>}
                        </div>
                      </div>
                    </div>

                    {/* Trust */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: (firm.trust_score||0) >= 80 ? 'var(--teal)' : (firm.trust_score||0) >= 60 ? 'var(--amber)' : 'var(--t3)' }}>{firm.trust_score || 0}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>Trust Score</div>
                    </div>

                    {/* Rating */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--amber)' }}>{(firm.rating||0) > 0 ? `${firm.rating.toFixed(1)} ★` : 'New'}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>{(firm.review_count||0) > 0 ? `${firm.review_count} reviews` : 'No reviews'}</div>
                    </div>

                    {/* Profit Split */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--green)' }}>{ch?.profit_split || '—'}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>Profit Split</div>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '17px', fontWeight: 700 }}>{ch ? `$${ch.price_usd}` : '—'}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>From</div>
                    </div>

                    {/* CTA */}
                    <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {firm.promo_discount && (
                        <div style={{ background: 'linear-gradient(135deg,#ec4899,var(--violet))', borderRadius: '7px', padding: '6px 10px', fontSize: '11.5px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                          {firm.promo_discount}
                        </div>
                      )}
                      <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '8px', background: isTop3 ? 'var(--teal)' : 'var(--bg2)', color: isTop3 ? '#04120c' : 'var(--t1)', fontSize: '13px', fontWeight: 700, border: isTop3 ? 'none' : '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        View →
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}