const fs = require('fs')
const path = require('path')
const root = process.cwd()

function write(filePath, content) {
  const full = path.join(root, filePath)
  const dir = path.dirname(full)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log('  [OK]', filePath)
}

write('app/firms/FirmsClient.tsx', `'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FirmLogo from '@/components/firm/FirmLogo'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const MARKETS = [
  { key: 'all', label: 'All Markets' },
  { key: 'forex', label: 'Forex' },
  { key: 'futures', label: 'Futures' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'metals', label: 'Metals' },
  { key: 'indices', label: 'Indices' },
]

export default function FirmsClient() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState('all')
  const [sort, setSort] = useState<'trust'|'price'|'split'>('trust')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms')
      .select('*, challenges(*)')
      .eq('is_published', true)
      .order('trust_score', { ascending: false })
      .then(({ data }) => {
        setFirms(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = firms
    .filter(f => {
      if (market === 'forex') return f.markets_forex
      if (market === 'futures') return f.markets_futures
      if (market === 'crypto') return f.markets_crypto
      if (market === 'metals') return f.markets_metals
      if (market === 'indices') return f.markets_indices
      return true
    })
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price') {
        const pa = Math.min(...(a.challenges || []).map((c: any) => c.price_usd || 9999))
        const pb = Math.min(...(b.challenges || []).map((c: any) => c.price_usd || 9999))
        return pa - pb
      }
      if (sort === 'split') {
        const sa = parseInt((a.challenges || [])[0]?.profit_split || '0')
        const sb = parseInt((b.challenges || [])[0]?.profit_split || '0')
        return sb - sa
      }
      return (b.trust_score || 0) - (a.trust_score || 0)
    })

  const getLowest = (f: any) => f.challenges?.sort((a: any, b: any) => (a.price_usd||9999) - (b.price_usd||9999))[0]

  const trustColor = (score: number) => {
    if (score >= 80) return 'var(--teal)'
    if (score >= 60) return 'var(--amber)'
    return 'var(--t3)'
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(32px,4vw,56px) clamp(16px,4vw,40px) 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Directory</div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '10px' }}>All Prop Firms</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>{firms.length} firms listed. Ranked by verified Trust Score.</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {MARKETS.map(m => (
            <button key={m.key} onClick={() => setMarket(m.key)}
              style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: '1px solid ' + (market===m.key?'transparent':'var(--border2)'), background: market===m.key?'var(--teal)':'transparent', color: market===m.key?'#04120c':'var(--t2)', transition: 'all .15s' }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search firms..."
            style={{ flex: 1, minWidth: '200px', padding: '9px 14px', background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none' }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['trust','Trust'],['price','Price'],['split','Split']].map(([k,l]) => (
              <button key={k} onClick={() => setSort(k as any)}
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: '1px solid ' + (sort===k?'rgba(0,229,160,0.3)':'var(--border2)'), background: sort===k?'rgba(0,229,160,0.08)':'transparent', color: sort===k?'var(--teal)':'var(--t2)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading firms...</div>
        ) : (
          <>
            {/* Desktop table */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', minWidth: '700px' }}>
                {/* Table header */}
                <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 80px 100px 120px', gap: '10px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', alignItems: 'center' }}>
                  <div>Firm</div>
                  <div style={{ textAlign: 'center' }}>Trust</div>
                  <div>From</div>
                  <div>Split</div>
                  <div style={{ textAlign: 'center' }}>Rating</div>
                  <div>Promo</div>
                  <div style={{ textAlign: 'right' }}>Action</div>
                </div>

                {filtered.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--t2)' }}>
                    No firms match your filters.
                  </div>
                ) : filtered.map((firm, i) => {
                  const ch = getLowest(firm)
                  return (
                    <div key={firm.slug} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 80px 100px 120px', gap: '10px', alignItems: 'center', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--bg2)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>

                      {/* Firm */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t3)', width: '20px', flexShrink: 0, textAlign: 'center' }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                        </div>
                        <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={36} radius={8} />
                        <div>
                          <Link href={'/firms/' + firm.slug} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', textDecoration: 'none' }}>
                            {firm.name}
                          </Link>
                          <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '1px' }}>
                            {[firm.markets_forex&&'FX',firm.markets_futures&&'FUT',firm.markets_crypto&&'CRYPTO'].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>

                      {/* Trust */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: trustColor(firm.trust_score||0) }}>{firm.trust_score||0}</div>
                      </div>

                      {/* Price */}
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>{ch ? '$' + ch.price_usd : '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{ch?.account_size ? '$' + Math.round(ch.account_size/1000) + 'K' : ''}</div>
                      </div>

                      {/* Split */}
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)' }}>
                        {ch?.profit_split || '—'}
                      </div>

                      {/* Rating */}
                      <div style={{ textAlign: 'center' }}>
                        {(firm.rating||0) > 0 ? (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>{firm.rating.toFixed(1)}</div>
                            <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{firm.review_count}</div>
                          </div>
                        ) : <span style={{ color: 'var(--t3)', fontSize: '12px' }}>New</span>}
                      </div>

                      {/* Promo */}
                      <div>
                        {firm.promo_discount && (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(124,58,237,0.15))', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)', whiteSpace: 'nowrap' }}>
                            {firm.promo_discount}
                          </span>
                        )}
                      </div>

                      {/* CTA */}
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link href={'/firms/' + firm.slug}
                          style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none', background: 'var(--bg2)', color: 'var(--t1)', border: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>
                          Details
                        </Link>
                        {firm.affiliate_link && (
                          <a href={firm.affiliate_link} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none', background: 'var(--teal)', color: '#04120c', whiteSpace: 'nowrap' }}>
                            Start
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile cards — shown below 700px */}
            <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {filtered.map((firm) => {
                const ch = getLowest(firm)
                return (
                  <Link key={firm.slug} href={'/firms/' + firm.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={40} radius={10} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{firm.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>Trust {firm.trust_score || 0}/100</div>
                        </div>
                        {firm.promo_discount && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)' }}>
                            {firm.promo_discount}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div><div style={{ fontSize: '16px', fontWeight: 800 }}>{ch ? '$' + ch.price_usd : '—'}</div><div style={{ fontSize: '10px', color: 'var(--t3)' }}>From</div></div>
                        <div><div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--green)' }}>{ch?.profit_split || '—'}</div><div style={{ fontSize: '10px', color: 'var(--t3)' }}>Split</div></div>
                        <div><div style={{ fontSize: '16px', fontWeight: 800, color: trustColor(firm.trust_score||0) }}>{firm.trust_score||0}</div><div style={{ fontSize: '10px', color: 'var(--t3)' }}>Trust</div></div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>
      <Footer />
      <style>{\`
        @media (max-width: 700px) {
          .mobile-cards { display: flex !important; }
        }
      \`}</style>
    </>
  )
}
`)

console.log('\nDone! Run:')
console.log('git add . && git commit -m "Fix FirmsClient parse error + mobile cards" && git push')
