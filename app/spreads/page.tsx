'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function SpreadsPage() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'forex'|'futures'|'crypto'|'metals'|'indices'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms').select('name, slug, logo_url, platforms, markets_forex, markets_futures, markets_crypto, markets_metals, markets_indices, markets_commodities, trust_score')
      .eq('is_published', true).order('trust_score', { ascending: false })
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
  }, [])

  const filtered = firms.filter(f => {
    if (filter === 'forex') return f.markets_forex
    if (filter === 'futures') return f.markets_futures
    if (filter === 'crypto') return f.markets_crypto
    if (filter === 'metals') return f.markets_metals
    if (filter === 'indices') return f.markets_indices
    return true
  })

  const Cell = ({ v }: { v: boolean }) => (
    <div style={{ textAlign: 'center' as const }}>
      {v ? <span style={{ color: 'var(--teal)', fontSize: '18px', fontWeight: 700 }}>&#10003;</span>
         : <span style={{ color: 'var(--border2)', fontSize: '14px' }}>&mdash;</span>}
    </div>
  )

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Instruments</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Spreads & Instruments</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Compare tradeable markets and platforms across all listed prop firms.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[['all','All'],['forex','Forex'],['futures','Futures'],['crypto','Crypto'],['metals','Metals'],['indices','Indices']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              style={{ padding: '7px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: `1px solid ${filter === k ? 'transparent' : 'var(--border2)'}`, background: filter === k ? 'var(--teal)' : 'transparent', color: filter === k ? '#04120c' : 'var(--t2)', transition: 'all .15s' }}>
              {l} {filter !== k && firms.filter(f => k === 'all' || (f as any)[`markets_${k}`]).length > 0 ? `(${firms.filter(f => k === 'all' || (f as any)[`markets_${k}`]).length})` : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading...</div>
        ) : (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr 80px 90px 80px 80px 90px 1fr', gap: '8px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--t3)', alignItems: 'center' }}>
              <div>Firm</div>
              <div style={{ textAlign: 'center' }}>Forex</div>
              <div style={{ textAlign: 'center' }}>Futures</div>
              <div style={{ textAlign: 'center' }}>Crypto</div>
              <div style={{ textAlign: 'center' }}>Metals</div>
              <div style={{ textAlign: 'center' }}>Indices</div>
              <div>Platforms</div>
            </div>
            {filtered.map(firm => (
              <Link key={firm.slug} href={`/firms/${firm.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 80px 90px 80px 80px 90px 1fr', gap: '8px', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={36} radius={8} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{firm.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Trust {firm.trust_score}/100</div>
                    </div>
                  </div>
                  <Cell v={firm.markets_forex} />
                  <Cell v={firm.markets_futures} />
                  <Cell v={firm.markets_crypto} />
                  <Cell v={firm.markets_metals} />
                  <Cell v={firm.markets_indices} />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(firm.platforms || []).map((p: string) => (
                      <span key={p} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border)' }}>{p}</span>
                    ))}
                    {(!firm.platforms || firm.platforms.length === 0) && <span style={{ fontSize: '12px', color: 'var(--t3)' }}>&mdash;</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}