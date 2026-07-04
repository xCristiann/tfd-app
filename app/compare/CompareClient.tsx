'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function CompareClient() {
  const [firms, setFirms] = useState<any[]>([])
  const [firmA, setFirmA] = useState<any>(null)
  const [firmB, setFirmB] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms').select('*, challenges(*), rules(*)').eq('is_published', true).order('trust_score', { ascending: false })
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
  }, [])

  const getLowest = (f: any) => f?.challenges?.sort((a: any, b: any) => a.price_usd - b.price_usd)[0]

  const val = (v: any, suffix = '') => v !== null && v !== undefined ? `${v}${suffix}` : '—'
  const bool = (v: boolean) => v ? { text: '✓ Yes', color: 'var(--green)' } : { text: '✗ No', color: 'var(--coral)' }

  const Row = ({ label, a, b, colorA, colorB }: { label: string; a: string; b: string; colorA?: string; colorB?: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      <div style={{ padding: '13px 16px', fontSize: '13px', color: 'var(--t2)', background: 'var(--bg2)', fontWeight: 500 }}>{label}</div>
      <div style={{ padding: '13px 16px', fontSize: '14px', fontWeight: 700, color: colorA || 'var(--t1)', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>{a}</div>
      <div style={{ padding: '13px 16px', fontSize: '14px', fontWeight: 700, color: colorB || 'var(--t1)', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>{b}</div>
    </div>
  )

  const Section = ({ title }: { title: string }) => (
    <div style={{ padding: '10px 16px', background: 'linear-gradient(90deg,rgba(0,229,160,0.08),transparent)', fontSize: '11px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--teal)', borderTop: '1px solid var(--border)' }}>
      {title}
    </div>
  )

  const chA = getLowest(firmA)
  const chB = getLowest(firmB)

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '56px 32px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Compare Tool</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Firm vs Firm</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Select two firms to compare all their data side by side.</p>
        </div>

        {/* FIRM SELECTORS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Firm A</label>
            <select value={firmA?.id || ''} onChange={e => setFirmA(firms.find(f => f.id === e.target.value) || null)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: '10px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
              <option value="">Select a firm...</option>
              {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {firmA && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--bg1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px' }}>
                <FirmLogo name={firmA.name} logoUrl={firmA.logo_url} size={36} radius={8} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{firmA.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--teal)' }}>Trust {firmA.trust_score}/100</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--t3)', textAlign: 'center', padding: '20px 0' }}>VS</div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Firm B</label>
            <select value={firmB?.id || ''} onChange={e => setFirmB(firms.find(f => f.id === e.target.value) || null)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: '10px', color: 'var(--t1)', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
              <option value="">Select a firm...</option>
              {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {firmB && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--bg1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px' }}>
                <FirmLogo name={firmB.name} logoUrl={firmB.logo_url} size={36} radius={8} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{firmB.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--violet)' }}>Trust {firmB.trust_score}/100</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COMPARISON TABLE */}
        {firmA && firmB ? (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            {/* HEADER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--bg2)' }}>
              <div style={{ padding: '16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)' }}>Category</div>
              <div style={{ padding: '16px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FirmLogo name={firmA.name} logoUrl={firmA.logo_url} size={24} radius={6} />
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--teal)' }}>{firmA.name}</span>
                </div>
              </div>
              <div style={{ padding: '16px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FirmLogo name={firmB.name} logoUrl={firmB.logo_url} size={24} radius={6} />
                  <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--violet)' }}>{firmB.name}</span>
                </div>
              </div>
            </div>

            <Section title="Overview" />
            <Row label="Trust Score" a={`${firmA.trust_score}/100`} b={`${firmB.trust_score}/100`}
              colorA={firmA.trust_score >= firmB.trust_score ? 'var(--green)' : 'var(--t1)'}
              colorB={firmB.trust_score > firmA.trust_score ? 'var(--green)' : 'var(--t1)'} />
            <Row label="Founded" a={val(firmA.founded_year)} b={val(firmB.founded_year)} />
            <Row label="Headquarters" a={val(firmA.headquarters)} b={val(firmB.headquarters)} />
            <Row label="Max Allocation" a={firmA.max_allocation ? `$${Math.round(firmA.max_allocation/1000)}K` : '—'} b={firmB.max_allocation ? `$${Math.round(firmB.max_allocation/1000)}K` : '—'} />
            <Row label="Accepts EU" a={bool(firmA.accepts_eu).text} b={bool(firmB.accepts_eu).text}
              colorA={firmA.accepts_eu ? 'var(--green)' : 'var(--coral)'}
              colorB={firmB.accepts_eu ? 'var(--green)' : 'var(--coral)'} />

            <Section title="Lowest Challenge" />
            <Row label="Price" a={chA ? `$${chA.price_usd}` : '—'} b={chB ? `$${chB.price_usd}` : '—'}
              colorA={chA && chB && chA.price_usd <= chB.price_usd ? 'var(--green)' : 'var(--t1)'}
              colorB={chA && chB && chB.price_usd < chA.price_usd ? 'var(--green)' : 'var(--t1)'} />
            <Row label="Profit Split" a={val(chA?.profit_split)} b={val(chB?.profit_split)} colorA="var(--green)" colorB="var(--green)" />
            <Row label="Phase 1 Target" a={val(chA?.phase1_target, '%')} b={val(chB?.phase1_target, '%')} colorA="var(--amber)" colorB="var(--amber)" />
            <Row label="Daily Drawdown" a={val(chA?.phase1_daily_dd, '%')} b={val(chB?.phase1_daily_dd, '%')} colorA="var(--coral)" colorB="var(--coral)" />
            <Row label="Max Drawdown" a={val(chA?.phase1_max_dd, '%')} b={val(chB?.phase1_max_dd, '%')} colorA="var(--coral)" colorB="var(--coral)" />
            <Row label="Phase 2 Target" a={chA?.phase2_target ? `${chA.phase2_target}%` : '1-Step'} b={chB?.phase2_target ? `${chB.phase2_target}%` : '1-Step'} colorA="var(--amber)" colorB="var(--amber)" />
            <Row label="Time Limit" a={chA?.phase1_time_limit === 0 ? 'None' : val(chA?.phase1_time_limit, 'd')} b={chB?.phase1_time_limit === 0 ? 'None' : val(chB?.phase1_time_limit, 'd')}
              colorA={chA?.phase1_time_limit === 0 ? 'var(--green)' : 'var(--t1)'}
              colorB={chB?.phase1_time_limit === 0 ? 'var(--green)' : 'var(--t1)'} />
            <Row label="Payout Frequency" a={val(chA?.payout_frequency)} b={val(chB?.payout_frequency)} />

            <Section title="Trading Rules" />
            <Row label="Weekend Holding" a={bool(chA?.allows_weekend_holding).text} b={bool(chB?.allows_weekend_holding).text}
              colorA={chA?.allows_weekend_holding ? 'var(--green)' : 'var(--coral)'}
              colorB={chB?.allows_weekend_holding ? 'var(--green)' : 'var(--coral)'} />
            <Row label="News Trading" a={bool(chA?.allows_news_trading).text} b={bool(chB?.allows_news_trading).text}
              colorA={chA?.allows_news_trading ? 'var(--green)' : 'var(--coral)'}
              colorB={chB?.allows_news_trading ? 'var(--green)' : 'var(--coral)'} />
            <Row label="EA / Bots" a={bool(chA?.allows_ea).text} b={bool(chB?.allows_ea).text}
              colorA={chA?.allows_ea ? 'var(--green)' : 'var(--coral)'}
              colorB={chB?.allows_ea ? 'var(--green)' : 'var(--coral)'} />
            <Row label="Hedging" a={bool(chA?.allows_hedging).text} b={bool(chB?.allows_hedging).text}
              colorA={chA?.allows_hedging ? 'var(--green)' : 'var(--coral)'}
              colorB={chB?.allows_hedging ? 'var(--green)' : 'var(--coral)'} />

            <Section title="Markets" />
            <Row label="Forex" a={bool(firmA.markets_forex).text} b={bool(firmB.markets_forex).text}
              colorA={firmA.markets_forex ? 'var(--green)' : 'var(--coral)'}
              colorB={firmB.markets_forex ? 'var(--green)' : 'var(--coral)'} />
            <Row label="Futures" a={bool(firmA.markets_futures).text} b={bool(firmB.markets_futures).text}
              colorA={firmA.markets_futures ? 'var(--green)' : 'var(--coral)'}
              colorB={firmB.markets_futures ? 'var(--green)' : 'var(--coral)'} />
            <Row label="Crypto" a={bool(firmA.markets_crypto).text} b={bool(firmB.markets_crypto).text}
              colorA={firmA.markets_crypto ? 'var(--green)' : 'var(--coral)'}
              colorB={firmB.markets_crypto ? 'var(--green)' : 'var(--coral)'} />
            <Row label="Metals" a={bool(firmA.markets_metals).text} b={bool(firmB.markets_metals).text}
              colorA={firmA.markets_metals ? 'var(--green)' : 'var(--coral)'}
              colorB={firmB.markets_metals ? 'var(--green)' : 'var(--coral)'} />
            <Row label="Indices" a={bool(firmA.markets_indices).text} b={bool(firmB.markets_indices).text}
              colorA={firmA.markets_indices ? 'var(--green)' : 'var(--coral)'}
              colorB={firmB.markets_indices ? 'var(--green)' : 'var(--coral)'} />

            <Section title="Payout & Trust" />
            <Row label="Payout Reliability" a={val(firmA.payout_reliability)} b={val(firmB.payout_reliability)} />
            <Row label="Avg Payout Speed" a={firmA.avg_payout_days ? `${firmA.avg_payout_days} days` : '—'} b={firmB.avg_payout_days ? `${firmB.avg_payout_days} days` : '—'}
              colorA={firmA.avg_payout_days <= firmB.avg_payout_days ? 'var(--green)' : 'var(--t1)'}
              colorB={firmB.avg_payout_days < firmA.avg_payout_days ? 'var(--green)' : 'var(--t1)'} />
            <Row label="Delayed Reports" a={val(firmA.delayed_payout_reports)} b={val(firmB.delayed_payout_reports)}
              colorA={firmA.delayed_payout_reports === 0 ? 'var(--green)' : 'var(--amber)'}
              colorB={firmB.delayed_payout_reports === 0 ? 'var(--green)' : 'var(--amber)'} />
            <Row label="Support Quality" a={val(firmA.support_quality)} b={val(firmB.support_quality)} />
            <Row label="Platforms" a={(firmA.platforms || []).join(', ') || '—'} b={(firmB.platforms || []).join(', ') || '—'} />

            <Section title="Discount" />
            <Row label="Promo Code" a={firmA.discount_code || '—'} b={firmB.discount_code || '—'} colorA="var(--teal)" colorB="var(--teal)" />
            <Row label="Discount" a={firmA.promo_discount || '—'} b={firmB.promo_discount || '—'} />

            {/* CTA ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>
              <div style={{ padding: '16px' }} />
              <div style={{ padding: '16px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <a href={firmA.affiliate_link || firmA.website || '#'} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '100px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>
                  Get {firmA.name} →
                </a>
              </div>
              <div style={{ padding: '16px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <a href={firmB.affiliate_link || firmB.website || '#'} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '100px', background: 'var(--violet)', color: '#fff', fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>
                  Get {firmB.name} →
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--t2)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚡</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Select two firms above</div>
            <div style={{ fontSize: '14px' }}>Choose Firm A and Firm B to see a full side-by-side comparison.</div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--t3)' }}>
          Green highlights indicate the better value for each metric · <Link href="/trust-score" style={{ color: 'var(--teal)', textDecoration: 'none' }}>How Trust Score works</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}