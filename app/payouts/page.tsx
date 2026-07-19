'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function PayoutsPage() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'trust'|'speed'|'reliability'>('trust')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms')
      .select('name, slug, logo_url, payout_reliability, avg_payout_days, support_quality, trust_score, max_allocation, delayed_payout_reports, challenges(payout_frequency, payout_methods, min_payout, profit_split)')
      .eq('is_published', true)
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
  }, [])

  const sorted = [...firms].sort((a, b) => {
    if (sort === 'speed') return (a.avg_payout_days || 99) - (b.avg_payout_days || 99)
    if (sort === 'reliability') return (b.payout_reliability === 'Confirmed' ? 1 : 0) - (a.payout_reliability === 'Confirmed' ? 1 : 0)
    return (b.trust_score || 0) - (a.trust_score || 0)
  })

  const reliabilityStyle = (r: string) => {
    if (r === 'Confirmed') return { bg: 'rgba(0,229,160,0.1)', color: 'var(--teal)', border: 'rgba(0,229,160,0.2)' }
    if (r === 'Reported issues') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)' }
    return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
  }

  const speedColor = (d: number) => !d ? 'var(--t3)' : d <= 1 ? 'var(--teal)' : d <= 3 ? 'var(--green)' : d <= 7 ? 'var(--amber)' : 'var(--coral)'

  const getBestChallenge = (f: any) => f.challenges?.sort((a: any, b: any) => a.price_usd - b.price_usd)[0]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Transparency</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Payout Tracker</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Verified payout data &mdash; speed, reliability, methods, and profit splits for all listed firms.</p>
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: 'var(--t3)', alignSelf: 'center', marginRight: '4px' }}>Sort by:</span>
          {[['trust','Trust Score'],['speed','Fastest Payouts'],['reliability','Most Reliable']].map(([k,l]) => (
            <button key={k} onClick={() => setSort(k as any)}
              style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: `1px solid ${sort === k ? 'rgba(0,229,160,0.3)' : 'var(--border2)'}`, background: sort === k ? 'rgba(0,229,160,0.08)' : 'transparent', color: sort === k ? 'var(--teal)' : 'var(--t2)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Stats summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Firms Tracked', value: firms.length, color: 'var(--teal)' },
            { label: 'Confirmed Payouts', value: firms.filter(f => f.payout_reliability === 'Confirmed').length, color: 'var(--green)' },
            { label: 'Avg Payout Speed', value: `${Math.round(firms.filter(f=>f.avg_payout_days).reduce((a,b)=>a+b.avg_payout_days,0)/Math.max(1,firms.filter(f=>f.avg_payout_days).length))}d`, color: 'var(--amber)' },
            { label: 'Reported Issues', value: firms.filter(f => f.payout_reliability === 'Reported issues').length, color: 'var(--coral)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading payout data...</div>
        ) : (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr 120px 90px 90px 100px 1fr', gap: '12px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', alignItems: 'center' }}>
              <div>Firm</div>
              <div>Reliability</div>
              <div>Speed</div>
              <div>Split</div>
              <div>Frequency</div>
              <div>Methods</div>
            </div>
            {sorted.map(firm => {
              const rs = reliabilityStyle(firm.payout_reliability || 'Unknown')
              const ch = getBestChallenge(firm)
              return (
                <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 120px 90px 90px 100px 1fr', gap: '12px', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={38} radius={9} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{firm.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                          {firm.delayed_payout_reports > 0 ? `⚠️ ${firm.delayed_payout_reports} delayed reports` : '&#10003; No delays reported'}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, whiteSpace: 'nowrap', display: 'inline-block' }}>
                      {firm.payout_reliability || 'Unknown'}
                    </span>

                    <div style={{ fontSize: '16px', fontWeight: 700, color: speedColor(firm.avg_payout_days) }}>
                      {firm.avg_payout_days ? `${firm.avg_payout_days}d` : '&mdash;'}
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)' }}>
                      {ch?.profit_split || '&mdash;'}
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--t2)' }}>
                      {ch?.payout_frequency || '&mdash;'}
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(ch?.payout_methods || []).map((m: string) => (
                        <span key={m} style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border)' }}>{m}</span>
                      ))}
                      {(!ch?.payout_methods || ch.payout_methods.length === 0) && <span style={{ fontSize: '12px', color: 'var(--t3)' }}>&mdash;</span>}
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