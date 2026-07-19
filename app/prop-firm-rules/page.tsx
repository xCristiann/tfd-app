'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function PropFirmRulesPage() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'ea'|'news'|'weekend'|'hedging'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms')
      .select('name, slug, logo_url, trust_score, challenges(allows_weekend_holding, allows_news_trading, allows_ea, allows_hedging, phase1_min_days, phase1_time_limit, phase1_daily_dd, phase1_max_dd, price_usd)')
      .eq('is_published', true)
      .order('trust_score', { ascending: false })
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
  }, [])

  const getLowest = (f: any) => f.challenges?.sort((a: any, b: any) => (a.price_usd||0) - (b.price_usd||0))[0]

  const filtered = firms.filter(f => {
    const ch = getLowest(f)
    if (!ch) return filter === 'all'
    if (filter === 'ea') return ch.allows_ea
    if (filter === 'news') return ch.allows_news_trading
    if (filter === 'weekend') return ch.allows_weekend_holding
    if (filter === 'hedging') return ch.allows_hedging
    return true
  })

  const Check = ({ v }: { v: boolean | null }) => (
    <div style={{ textAlign: 'center' as const }}>
      {v === true ? <span style={{ color: 'var(--teal)', fontSize: '18px', fontWeight: 700 }}>&#10003;</span>
       : v === false ? <span style={{ color: 'var(--coral)', fontSize: '14px' }}>&times;</span>
       : <span style={{ color: 'var(--t3)', fontSize: '12px' }}>?</span>}
    </div>
  )

  const filterBtns = [
    ['all', 'All Firms'],
    ['ea', 'EA/Bots Allowed'],
    ['news', 'News Trading'],
    ['weekend', 'Weekend Holding'],
    ['hedging', 'Hedging Allowed'],
  ]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Reference</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Prop Firm Rules</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Quick-reference guide for trading rules, drawdown limits, and restrictions across all listed firms.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {filterBtns.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: `1px solid ${filter === k ? 'transparent' : 'var(--border2)'}`, background: filter === k ? 'var(--teal)' : 'transparent', color: filter === k ? '#04120c' : 'var(--t2)', transition: 'all .15s' }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading rules...</div>
        ) : (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 80px 80px 80px', gap: '8px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--t3)', alignItems: 'center' }}>
              <div>Firm</div>
              <div style={{ textAlign: 'center' }}>Weekend</div>
              <div style={{ textAlign: 'center' }}>News</div>
              <div style={{ textAlign: 'center' }}>EA/Bots</div>
              <div style={{ textAlign: 'center' }}>Hedging</div>
              <div style={{ textAlign: 'center' }}>Min Days</div>
              <div style={{ textAlign: 'center' }}>Daily DD</div>
              <div style={{ textAlign: 'center' }}>Max DD</div>
            </div>
            {filtered.map(firm => {
              const ch = getLowest(firm)
              return (
                <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 80px 80px 80px 80px 80px 80px 80px', gap: '8px', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={32} radius={7} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{firm.name}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--t3)' }}>Trust {firm.trust_score}/100</div>
                      </div>
                    </div>
                    <Check v={ch?.allows_weekend_holding ?? null} />
                    <Check v={ch?.allows_news_trading ?? null} />
                    <Check v={ch?.allows_ea ?? null} />
                    <Check v={ch?.allows_hedging ?? null} />
                    <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {ch?.phase1_min_days ? `${ch.phase1_min_days}d` : '&mdash;'}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--coral)' }}>
                      {ch?.phase1_daily_dd ? `${ch.phase1_daily_dd}%` : '&mdash;'}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--coral)' }}>
                      {ch?.phase1_max_dd ? `${ch.phase1_max_dd}%` : '&mdash;'}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>
          Based on lowest-priced challenge per firm &middot; <Link href="/trust-score" style={{ color: 'var(--teal)', textDecoration: 'none' }}>How we verify &rarr;</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}