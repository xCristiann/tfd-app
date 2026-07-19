'use client'
import Link from 'next/link'
import type { Firm, Challenge } from '@/types'
import FirmLogo from './FirmLogo'

type FirmWithExtras = Firm & {
  challenges?: Challenge[]
  logo_url?: string
  country_code?: string
  max_allocation?: number
  promo_discount?: string
  promo_label?: string
  review_count?: number
  rating?: number
}

const countryFlags: Record<string, string> = {
  AE: '🇦🇪', GB: '🇬🇧', US: '🇺🇸', CZ: '🇨🇿', IL: '🇮🇱', EE: '🇪🇪',
  NL: '🇳🇱', HK: '🇭🇰', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷', CH: '🇨🇭',
  CY: '🇨🇾', LI: '🇱🇮',
}

function formatAllocation(n?: number) {
  if (!n) return '&mdash;'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`
  return `$${Math.round(n / 1000)}K`
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: '20px' }}>🏆</span>
  if (rank === 2) return <span style={{ fontSize: '20px' }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: '20px' }}>🥉</span>
  return (
    <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--t2)' }}>
      {rank}
    </div>
  )
}

export default function FirmsTable({ firms }: { firms: FirmWithExtras[]; market?: string }) {
  const getLowestChallenge = (f: FirmWithExtras) =>
    f.challenges?.sort((a, b) => a.price_usd - b.price_usd)[0]

  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1.8fr 110px 70px 90px 1.6fr 1fr 110px 140px 90px', padding: '14px 20px', background: 'var(--bg2)', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '10px', alignItems: 'center' }}>
        <div>#</div><div>Firm</div><div>Rating</div><div>Country</div><div>Years</div><div>Assets</div><div>Platforms</div><div>Max Alloc.</div><div>Promo</div><div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {firms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>No firms found.</div>
      ) : firms.map((firm, i) => {
        const isTop3 = i < 3
        const markets = [
          firm.markets_crypto && 'Crypto',
          firm.markets_forex && 'FX',
          firm.markets_futures && 'Futures',
          firm.markets_indices && 'Indices',
          firm.markets_metals && 'Metals',
        ].filter((x): x is string => Boolean(x))

        return (
          <div key={firm.id}
            style={{ display: 'grid', gridTemplateColumns: '50px 1.8fr 110px 70px 90px 1.6fr 1fr 110px 140px 90px', padding: '18px 20px', borderTop: '1px solid var(--border)', gap: '10px', alignItems: 'center', background: isTop3 ? 'rgba(167,139,250,0.03)' : 'transparent', transition: 'background .15s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = isTop3 ? 'rgba(167,139,250,0.06)' : 'var(--bg2)')}
            onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? 'rgba(167,139,250,0.03)' : 'transparent')}
            onClick={() => window.location.href = `/firms/${firm.slug}`}
          >
            <RankBadge rank={i + 1} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={40} radius={10} />
              <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firm.name}</div>
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '100px', border: '1px solid rgba(167,139,250,0.3)', fontSize: '12px', fontWeight: 700, color: 'var(--violet)', marginBottom: '4px' }}>
                {(firm.rating || 0) > 0 ? (firm.rating!).toFixed(1) : 'New'} <span style={{ color: 'var(--amber)' }}>&#9733;</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{(firm.review_count || 0) > 0 ? `${firm.review_count} reviews` : 'No reviews yet'}</div>
            </div>

            <div style={{ fontSize: '20px' }} title={firm.country_code}>{countryFlags[firm.country_code || ''] || '🌐'}</div>

            <div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--violet)' }}>
                {firm.years_active && firm.years_active >= 10 ? '10+' : (firm.years_active || '&mdash;')}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {markets.slice(0, 4).map(m => (
                <span key={m} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '100px', background: 'var(--bg2)', color: 'var(--t2)', fontWeight: 600, border: '1px solid var(--border)' }}>{m}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {(firm.platforms || []).slice(0, 3).map(p => (
                <span key={p} style={{ fontSize: '10px', padding: '3px 7px', borderRadius: '6px', background: 'var(--bg2)', color: 'var(--t3)', fontWeight: 600 }}>{p}</span>
              ))}
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '5px' }}>{formatAllocation(firm.max_allocation)}</div>
              <div style={{ height: '3px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '100px', width: `${Math.min(100, ((firm.max_allocation || 0) / 4000000) * 100)}%`, background: 'linear-gradient(90deg,var(--violet),#818cf8)' }} />
              </div>
            </div>

            <div>
              {firm.promo_discount ? (
                <div style={{ background: 'linear-gradient(135deg,#ec4899,var(--violet))', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                  {firm.promo_label && <div style={{ fontSize: '8.5px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginBottom: '2px', letterSpacing: '.04em' }}>{firm.promo_label}</div>}
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>{firm.promo_discount}</div>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginTop: '3px', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                    {(firm as any).discount_code || 'DIARIES'}
                  </div>
                </div>
              ) : <span style={{ fontSize: '11px', color: 'var(--t3)' }}>&mdash;</span>}
            </div>

            <div style={{ textAlign: 'right' }}>
              <Link href={`/firms/${firm.slug}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '100px', border: '1px solid var(--border2)', color: 'var(--t1)', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}>
                Firm
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}