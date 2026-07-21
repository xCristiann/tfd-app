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

// Read current HomeClient to preserve hero section
const homeClientPath = path.join(root, 'app/HomeClient.tsx')
const existing = fs.existsSync(homeClientPath) ? fs.readFileSync(homeClientPath, 'utf8') : ''
console.log('Existing HomeClient lines:', existing.split('\n').length)

write('app/HomeClient.tsx', `'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

const MARKETS = [
  { key: 'all', label: 'All' },
  { key: 'forex', label: 'Forex' },
  { key: 'futures', label: 'Futures' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'metals', label: 'Metals' },
  { key: 'indices', label: 'Indices' },
]

export default function HomeClient() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'trust'|'price'|'split'>('trust')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms')
      .select('*, challenges(*)')
      .eq('is_published', true)
      .order('trust_score', { ascending: false })
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
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
        const pa = Math.min(...(a.challenges||[]).map((c:any) => c.price_usd||9999))
        const pb = Math.min(...(b.challenges||[]).map((c:any) => c.price_usd||9999))
        return pa - pb
      }
      if (sort === 'split') {
        const sa = parseInt((a.challenges||[])[0]?.profit_split||'0')
        const sb = parseInt((b.challenges||[])[0]?.profit_split||'0')
        return sb - sa
      }
      return (b.trust_score||0) - (a.trust_score||0)
    })

  const getLowest = (f: any) =>
    (f.challenges||[]).sort((a:any,b:any) => (a.price_usd||9999)-(b.price_usd||9999))[0]

  const trustColor = (s: number) => s >= 80 ? 'var(--teal)' : s >= 60 ? 'var(--amber)' : 'var(--t3)'

  return (
    <>
      <Navbar />
      <main>
        {/* ═══ HERO ═══ */}
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(40px,6vw,80px) clamp(16px,4vw,40px) clamp(32px,4vw,56px)', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', fontSize: '12px', fontWeight: 700, color: 'var(--teal)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '20px' }}>
            Independent &middot; Verified &middot; Transparent
          </div>
          <h1 style={{ fontSize: 'clamp(28px,6vw,58px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: '18px' }}>
            Find Your Perfect<br />
            <span style={{ background: 'linear-gradient(135deg,#00e5a0,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Prop Firm
            </span>
          </h1>
          <p style={{ fontSize: 'clamp(14px,2.5vw,17px)', color: 'var(--t2)', lineHeight: 1.65, maxWidth: '560px', margin: '0 auto 28px' }}>
            Compare {firms.length}+ prop firms by trust score, rules, payouts, and price. Real data, no paid rankings.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/calculator" style={{ padding: 'clamp(10px,2vw,13px) clamp(20px,3vw,28px)', borderRadius: '10px', background: 'var(--teal)', color: '#04120c', fontSize: 'clamp(13px,2vw,15px)', fontWeight: 800, textDecoration: 'none', boxShadow: '0 0 28px var(--teal-glow)' }}>
              Find My Firm
            </Link>
            <Link href="/compare" style={{ padding: 'clamp(10px,2vw,13px) clamp(20px,3vw,28px)', borderRadius: '10px', border: '1px solid var(--border2)', color: 'var(--t1)', fontSize: 'clamp(13px,2vw,15px)', fontWeight: 600, textDecoration: 'none' }}>
              Compare vs
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'clamp(16px,4vw,40px)', justifyContent: 'center', marginTop: 'clamp(28px,4vw,48px)', flexWrap: 'wrap' }}>
            {[
              { v: firms.length + '+', l: 'Prop Firms' },
              { v: '$200K', l: 'Monthly Giveaway' },
              { v: '100%', l: 'Independent' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: 'var(--t1)' }}>{s.v}</div>
                <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FIRMS LIST ═══ */}
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px) 80px' }}>

          {/* Market filter pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
            {MARKETS.map(m => (
              <button key={m.key} onClick={() => setMarket(m.key)}
                style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: '1px solid ' + (market===m.key?'transparent':'var(--border2)'), background: market===m.key?'var(--teal)':'var(--bg1)', color: market===m.key?'#04120c':'var(--t2)', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search firms..."
              style={{ flex: 1, minWidth: '160px', padding: '9px 14px', background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '5px' }}>
              {([['trust','Trust'],['price','Price'],['split','Split']] as const).map(([k,l]) => (
                <button key={k} onClick={() => setSort(k)}
                  style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: '1px solid ' + (sort===k?'rgba(0,229,160,0.3)':'var(--border2)'), background: sort===k?'rgba(0,229,160,0.08)':'var(--bg1)', color: sort===k?'var(--teal)':'var(--t2)' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '12px' }}>
            Showing <b style={{ color: 'var(--t1)' }}>{filtered.length}</b> firms
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading firms...</div>
          ) : (
            <>
              {/* ── DESKTOP TABLE (hidden on mobile) ── */}
              <div style={{ overflowX: 'auto' }} className="desktop-table">
                <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', minWidth: '720px' }}>
                  <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '2.2fr 70px 90px 80px 80px 110px 130px', gap: '10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', alignItems: 'center' }}>
                    <div>Firm</div>
                    <div style={{ textAlign: 'center' }}>Trust</div>
                    <div>From</div>
                    <div>Split</div>
                    <div>Rating</div>
                    <div>Promo</div>
                    <div style={{ textAlign: 'right' }}>Action</div>
                  </div>

                  {filtered.map((firm, i) => {
                    const ch = getLowest(firm)
                    return (
                      <div key={firm.slug} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2.2fr 70px 90px 80px 80px 110px 130px', gap: '10px', alignItems: 'center', transition: 'background .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background='transparent')}>

                        {/* Rank + Logo + Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--t3)', width: '18px', flexShrink: 0, textAlign: 'center', fontWeight: 700 }}>{i+1}</span>
                          <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={36} radius={9} />
                          <div style={{ minWidth: 0 }}>
                            <Link href={'/firms/'+firm.slug} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {firm.name}
                            </Link>
                            <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>
                              {[firm.markets_forex&&'FX', firm.markets_futures&&'FUT', firm.markets_crypto&&'CRYPTO', firm.markets_metals&&'Metals'].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </div>

                        {/* Trust */}
                        <div style={{ textAlign: 'center', fontSize: '17px', fontWeight: 900, color: trustColor(firm.trust_score||0) }}>
                          {firm.trust_score||0}
                        </div>

                        {/* Price */}
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{ch ? '$'+ch.price_usd : '—'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{ch?.account_size ? '$'+Math.round(ch.account_size/1000)+'K acct' : ''}</div>
                        </div>

                        {/* Split */}
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)' }}>{ch?.profit_split||'—'}</div>

                        {/* Rating */}
                        <div>
                          {(firm.rating||0)>0 ? (
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>{firm.rating.toFixed(1)} ★<div style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: 400 }}>{firm.review_count} reviews</div></div>
                          ) : <span style={{ fontSize: '12px', color: 'var(--t3)' }}>New</span>}
                        </div>

                        {/* Promo */}
                        <div>
                          {firm.promo_discount && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 7px', borderRadius: '5px', background: 'rgba(236,72,153,0.12)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)' }}>
                              {firm.promo_discount}
                            </span>
                          )}
                        </div>

                        {/* CTA */}
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Link href={'/firms/'+firm.slug}
                            style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', background: 'var(--bg2)', color: 'var(--t1)', border: '1px solid var(--border2)' }}>
                            Details
                          </Link>
                          {firm.affiliate_link && (
                            <a href={firm.affiliate_link} target="_blank" rel="noopener noreferrer"
                              style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', background: 'var(--teal)', color: '#04120c' }}>
                              Start
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── MOBILE CARDS (hidden on desktop) ── */}
              <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
                {filtered.map((firm, i) => {
                  const ch = getLowest(firm)
                  return (
                    <div key={firm.slug} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                      {/* Card top */}
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 700, width: '20px', flexShrink: 0 }}>#{i+1}</span>
                        <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={44} radius={11} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firm.name}</div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                            {firm.markets_forex && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(0,229,160,0.1)', color: 'var(--teal)' }}>FX</span>}
                            {firm.markets_futures && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>FUT</span>}
                            {firm.markets_crypto && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(167,139,250,0.1)', color: 'var(--violet)' }}>CRYPTO</span>}
                          </div>
                        </div>
                        {firm.promo_discount && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(236,72,153,0.12)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {firm.promo_discount}
                          </span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: '1px solid var(--border)' }}>
                        {[
                          { label: 'Trust', value: String(firm.trust_score||0), color: trustColor(firm.trust_score||0) },
                          { label: 'From', value: ch ? '$'+ch.price_usd : '—', color: 'var(--t1)' },
                          { label: 'Split', value: ch?.profit_split||'—', color: 'var(--green)' },
                          { label: 'Rating', value: (firm.rating||0)>0 ? firm.rating.toFixed(1)+'★' : 'New', color: 'var(--amber)' },
                        ].map(stat => (
                          <div key={stat.label} style={{ padding: '10px 12px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '1px' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* CTA row */}
                      <div style={{ display: 'flex', gap: '0', borderTop: '1px solid var(--border)' }}>
                        <Link href={'/firms/'+firm.slug}
                          style={{ flex: 1, padding: '11px', textAlign: 'center', fontSize: '13px', fontWeight: 600, textDecoration: 'none', color: 'var(--t2)', background: 'transparent' }}>
                          View Details
                        </Link>
                        {firm.affiliate_link && (
                          <a href={firm.affiliate_link} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, padding: '11px', textAlign: 'center', fontSize: '13px', fontWeight: 800, textDecoration: 'none', color: '#04120c', background: 'var(--teal)', borderLeft: '1px solid var(--border)' }}>
                            Start Challenge
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* ═══ CTA SECTION ═══ */}
        <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px) 80px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.08),rgba(124,58,237,0.08))', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '20px', padding: 'clamp(32px,5vw,56px)', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, marginBottom: '12px', letterSpacing: '-.02em' }}>
              Not sure which firm fits your style?
            </h2>
            <p style={{ fontSize: 'clamp(13px,2vw,15px)', color: 'var(--t2)', lineHeight: 1.65, marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
              Enter your target capital, trading style, and budget. Our matching engine finds your best match.
            </p>
            <Link href="/calculator" style={{ display: 'inline-block', padding: 'clamp(11px,2vw,14px) clamp(24px,4vw,36px)', borderRadius: '10px', background: 'var(--teal)', color: '#04120c', fontSize: 'clamp(14px,2vw,16px)', fontWeight: 800, textDecoration: 'none', boxShadow: '0 0 32px var(--teal-glow)' }}>
              Launch the Matching Calculator
            </Link>
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--t3)' }}>No account required. Free forever.</div>
          </div>
        </section>
      </main>
      <Footer />

      <style>{\`
        @media (max-width: 700px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
        }
        @media (min-width: 701px) {
          .mobile-cards { display: none !important; }
          .desktop-table { display: block !important; }
        }
      \`}</style>
    </>
  )
}
`)

console.log('\nDone! Run:')
console.log('node fix-jsx-entities.js')
console.log('git add . && git commit -m "Mobile homepage: firm cards with stats row + CTA" && git push')
