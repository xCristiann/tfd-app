'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmsTable from '@/components/firm/FirmsTable'
import Link from 'next/link'
import type { Firm } from '@/types'

export default function HomeClient() {
  const [firms, setFirms] = useState<Firm[]>([])
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState<'all' | 'forex' | 'futures' | 'crypto'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('firms')
      .select('*, challenges(*), rules(*)')
      .eq('is_published', true)
      .order('trust_score', { ascending: false })
      .then(({ data }) => {
        setFirms(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = firms.filter(f => {
    if (market === 'forex') return f.markets_forex
    if (market === 'futures') return f.markets_futures
    if (market === 'crypto') return f.markets_crypto
    return true
  })

  const pills = [
    { key: 'all', label: 'All Firms', gradient: 'linear-gradient(135deg,var(--teal),var(--violet))' },
    { key: 'forex', label: 'Forex', gradient: 'linear-gradient(135deg,#00e5a0,#00c085)' },
    { key: 'futures', label: 'Futures', gradient: 'linear-gradient(135deg,#f97316,#ec4899)' },
    { key: 'crypto', label: 'Crypto', gradient: 'linear-gradient(135deg,var(--violet),#818cf8)', isNew: true },
  ]

  return (
    <>
      <Navbar />
            <main>

        {/* â"€â"€â"€ HERO â"€â"€â"€ */}
        <section style={{ padding: '80px 0 56px', textAlign: 'center' }}>
          <div style={{ maxWidth: '1300px', width: '100%', margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' }}>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px 6px 12px', borderRadius: '100px', background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)', fontSize: '12.5px', color: 'var(--teal)', fontWeight: 500, marginBottom: '28px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              Independent · Verified · Transparent
            </div>

            <h1 style={{ fontSize: '60px', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.04, marginBottom: '20px' }}>
              Find your prop firm<br />
              <span style={{ background: 'linear-gradient(115deg,var(--teal) 0%,#4fffcc 40%,var(--violet) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                without the bias
              </span>
            </h1>

            <p style={{ fontSize: '18px', color: 'var(--t2)', maxWidth: '560px', margin: '0 auto 44px', lineHeight: 1.65 }}>
              The only prop firm comparison platform where every rule is verified, every challenge is current, and every firm is ranked on merit.
            </p>

            {/* MARKET PILLS "" CENTRATE */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {pills.map(p => {
                const active = market === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => setMarket(p.key as typeof market)}
                    style={{
                      padding: '10px 26px', borderRadius: '100px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      border: active ? 'none' : '1px solid var(--border2)',
                      background: active ? p.gradient : 'var(--bg1)',
                      color: active ? '#fff' : 'var(--t2)',
                      boxShadow: active ? '0 4px 20px rgba(0,0,0,0.35), 0 0 20px rgba(0,229,160,0.15)' : 'none',
                      transition: 'all .2s', fontFamily: 'Inter, sans-serif',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    {p.label}
                    {p.isNew && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', letterSpacing: '.06em', background: active ? 'rgba(255,255,255,0.25)' : 'rgba(167,139,250,0.2)', color: active ? '#fff' : 'var(--violet)' }}>
                        NEW
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* SEARCH */}
            <div style={{ display: 'flex', gap: '8px', maxWidth: '540px', margin: '0 auto 56px', background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: '14px', padding: '6px 6px 6px 20px' }}>
              <input type="text" placeholder={`Search ${market === 'all' ? 'all firms' : market + ' firms'}...`}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--t1)', fontFamily: 'Inter, sans-serif' }} />
              <button style={{ padding: '10px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 700, color: '#04120c', background: 'var(--teal)', border: 'none', cursor: 'pointer', boxShadow: '0 0 16px var(--teal-glow)', whiteSpace: 'nowrap' }}>
                Search
              </button>
            </div>
          </div>
        </section>

        <div style={{ maxWidth: '1300px', width: '100%', margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' }}>

          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '56px' }}>
            {[['20', 'Verified firms'], ['100%', 'Rules manually checked'], ['Verified', 'Real trader reviews'], ['Live', 'Challenge data updated']].map(([n, l]) => (
              <div key={l} style={{ background: 'var(--bg1)', padding: '24px 20px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '5px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{n}</div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', fontWeight: 500 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* TABLE SECTION */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '8px' }}>
                {market === 'all' ? 'Top Firms' : market === 'forex' ? 'Forex Firms' : market === 'futures' ? 'Futures Firms' : 'Crypto Firms'}
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-.02em', marginBottom: '6px' }}>
                Ranked by trust score, not commission
              </div>
              <div style={{ fontSize: '14px', color: 'var(--t2)' }}>
                {loading ? 'Loading...' : `${filtered.length} firms shown · click any row for full details`}
              </div>
            </div>
            <Link href="/firms" style={{ fontSize: '13px', color: 'var(--teal)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Full comparison ←’
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>âš¡</div>
              Loading firms...
            </div>
          ) : (
            <div style={{ marginBottom: '64px' }}>
              <FirmsTable firms={filtered} market={market} />
            </div>
          )}

          {/* CALCULATOR CTA */}
          <div style={{ borderRadius: '16px', padding: '60px 56px', marginBottom: '80px', position: 'relative', overflow: 'hidden', background: 'var(--bg1)', border: '1px solid var(--border2)', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(0,229,160,0.06),rgba(167,139,250,0.06))', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,139,250,0.18),transparent 70%)', pointerEvents: 'none' }} />
            <h2 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px', position: 'relative' }}>
              Not sure which firm fits your style?
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--t2)', maxWidth: '480px', margin: '0 auto 32px', position: 'relative' }}>
              Enter your target capital, trading style, and budget. Our matching engine calculates real expected value per firm.
            </p>
            <Link href="/calculator" style={{ display: 'inline-block', padding: '15px 34px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, color: '#04120c', background: 'linear-gradient(135deg,var(--teal),#4fffcc)', textDecoration: 'none', boxShadow: '0 0 40px var(--teal-glow)', position: 'relative' }}>
              Launch the Matching Calculator ←’
            </Link>
            <div style={{ marginTop: '14px', fontSize: '13px', color: 'var(--t3)', position: 'relative' }}>
              No account required. Free forever.
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
