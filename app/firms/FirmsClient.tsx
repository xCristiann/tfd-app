'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import type { Firm, Challenge } from '@/types'

type FirmWithChallenges = Firm & { challenges: Challenge[] }

export default function FirmsClient() {
  const [firms, setFirms] = useState<FirmWithChallenges[]>([])
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState<'all' | 'forex' | 'futures' | 'crypto'>('all')
  const [sortCol, setSortCol] = useState<'trust_score' | 'price' | 'profit_split'>('trust_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('firms')
      .select('*, challenges(*)')
      .eq('is_published', true)
      .then(({ data }) => {
        setFirms((data as FirmWithChallenges[]) || [])
        setLoading(false)
      })
  }, [])

  const filtered = firms.filter(f => {
    if (market === 'forex') return f.markets_forex
    if (market === 'futures') return f.markets_futures
    if (market === 'crypto') return f.markets_crypto
    return true
  })

  const getLowestChallenge = (f: FirmWithChallenges) =>
    f.challenges?.sort((a, b) => a.price_usd - b.price_usd)[0]

  const sorted = [...filtered].sort((a, b) => {
    let av = 0, bv = 0
    if (sortCol === 'trust_score') { av = a.trust_score; bv = b.trust_score }
    if (sortCol === 'price') {
      av = getLowestChallenge(a)?.price_usd || 999999
      bv = getLowestChallenge(b)?.price_usd || 999999
    }
    if (sortCol === 'profit_split') {
      av = parseInt(getLowestChallenge(a)?.profit_split || '0')
      bv = parseInt(getLowestChallenge(b)?.profit_split || '0')
    }
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <span style={{ marginLeft: '4px', color: sortCol === col ? 'var(--teal)' : 'var(--t3)', fontSize: '10px' }}>
      {sortCol === col ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  )

  const pills = [
    { key: 'all', label: 'All Firms' },
    { key: 'forex', label: 'Forex' },
    { key: 'futures', label: 'Futures' },
    { key: 'crypto', label: 'Crypto' },
  ]

  const splitColor = (split: string) => {
    const n = parseInt(split)
    if (n >= 90) return 'var(--green)'
    if (n >= 80) return 'var(--teal)'
    return 'var(--amber)'
  }

  const trustColor = (score: number) => {
    if (score >= 90) return 'var(--green)'
    if (score >= 80) return 'var(--teal)'
    return 'var(--amber)'
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
            Compare
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>
            All Prop Firms
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--t2)' }}>
            {sorted.length} firms · ranked by trust score · click any row to see full details
          </p>
        </div>

        {/* MARKET PILLS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '36px' }}>
          {pills.map(p => (
            <button
              key={p.key}
              onClick={() => setMarket(p.key as typeof market)}
              style={{
                padding: '9px 22px',
                borderRadius: '100px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${market === p.key ? 'transparent' : 'var(--border2)'}`,
                background: market === p.key
                  ? p.key === 'futures' ? 'linear-gradient(135deg, #f97316, #ec4899)'
                    : p.key === 'crypto' ? 'linear-gradient(135deg, var(--violet), #818cf8)'
                    : p.key === 'forex' ? 'linear-gradient(135deg, var(--teal), var(--teal2))'
                    : 'linear-gradient(135deg, var(--teal), var(--violet))'
                  : 'var(--bg1)',
                color: market === p.key ? '#fff' : 'var(--t2)',
                boxShadow: market === p.key ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                transition: 'all .2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {p.label}
              {p.key === 'crypto' && (
                <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.25)', letterSpacing: '.05em' }}>
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TABLE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)' }}>Loading firms...</div>
        ) : (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            {/* TABLE HEADER */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 2fr 100px 80px 90px 80px 80px 100px 110px 120px',
              padding: '13px 20px',
              background: 'var(--bg2)',
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)',
              gap: '8px', alignItems: 'center'
            }}>
              <div>#</div>
              <div>Firm</div>
              <div style={{ cursor: 'pointer' }} onClick={() => handleSort('trust_score')}>
                Trust <SortIcon col="trust_score" />
              </div>
              <div>Steps</div>
              <div>Ph1 Target</div>
              <div>Daily DD</div>
              <div>Max DD</div>
              <div style={{ cursor: 'pointer' }} onClick={() => handleSort('profit_split')}>
                Split <SortIcon col="profit_split" />
              </div>
              <div>Payout</div>
              <div style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('price')}>
                Price <SortIcon col="price" />
              </div>
            </div>

            {/* ROWS */}
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>
                No firms found for this market filter.
              </div>
            ) : sorted.map((firm, i) => {
              const ch = getLowestChallenge(firm)
              const isPhase2 = ch && ch.phase2_target && ch.phase2_target > 0
              return (
                <Link
                  key={firm.id}
                  href={`/firms/${firm.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 2fr 100px 80px 90px 80px 80px 100px 110px 120px',
                      padding: '16px 20px',
                      borderTop: '1px solid var(--border)',
                      gap: '8px', alignItems: 'center',
                      transition: 'background .15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* RANK */}
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {i + 1}
                    </div>

                    {/* FIRM */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '9px',
                        background: 'var(--bg3)', border: '1px solid var(--border2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 800, color: 'var(--t2)',
                        fontFamily: 'JetBrains Mono, monospace', flexShrink: 0
                      }}>
                        {firm.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{firm.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', gap: '5px' }}>
                          {firm.markets_forex && <span style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--teal)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>FX</span>}
                          {firm.markets_futures && <span style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>FUT</span>}
                          {firm.markets_crypto && <span style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--violet)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>CRYPTO</span>}
                        </div>
                      </div>
                    </div>

                    {/* TRUST */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: trustColor(firm.trust_score), marginBottom: '3px' }}>
                        {firm.trust_score}/100
                      </div>
                      <div style={{ height: '3px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${firm.trust_score}%`, background: trustColor(firm.trust_score), borderRadius: '100px' }} />
                      </div>
                    </div>

                    {/* STEPS */}
                    <div style={{ fontSize: '13px', color: 'var(--t2)' }}>
                      {isPhase2 ? '2 Steps' : '1 Step'}
                    </div>

                    {/* PH1 TARGET */}
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>
                      {ch?.phase1_target ? `${ch.phase1_target}%` : '—'}
                      {isPhase2 && ch?.phase2_target ? (
                        <span style={{ color: 'var(--t3)', fontWeight: 400 }}> / {ch.phase2_target}%</span>
                      ) : null}
                    </div>

                    {/* DAILY DD */}
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--coral)' }}>
                      {ch?.phase1_daily_dd ? `${ch.phase1_daily_dd}%` : '—'}
                    </div>

                    {/* MAX DD */}
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--coral)' }}>
                      {ch?.phase1_max_dd ? `${ch.phase1_max_dd}%` : '—'}
                    </div>

                    {/* PROFIT SPLIT */}
                    <div style={{ fontSize: '13px', fontWeight: 800, color: splitColor(ch?.profit_split || '0') }}>
                      {ch?.profit_split || '—'}
                    </div>

                    {/* PAYOUT FREQ */}
                    <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                      {ch?.payout_frequency || '—'}
                    </div>

                    {/* PRICE */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--t1)', marginBottom: '2px' }}>
                        ${ch?.price_usd || '—'}
                      </div>
                      <div style={{
                        display: 'inline-block', padding: '5px 14px', borderRadius: '100px',
                        background: 'var(--teal)', color: '#04120c', fontSize: '11.5px', fontWeight: 800,
                        boxShadow: '0 0 12px var(--teal-glow)'
                      }}>
                        View →
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* LEGEND */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--t3)' }}>
          <span>Prices shown are lowest available challenge tier</span>
          <span>·</span>
          <span>Trust score calculated independently</span>
          <span>·</span>
          <span>Click any row for full details</span>
        </div>
      </main>
      <Footer />
    </>
  )
}
