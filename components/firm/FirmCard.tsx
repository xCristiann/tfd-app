import Link from 'next/link'
import type { Firm } from '@/types'

function TrustBar({ score }: { score: number }) {
  return (
    <div style={{marginBottom:'16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'7px',fontSize:'12px'}}>
        <span style={{color:'var(--t2)'}}>Trust Score</span>
        <b style={{color:'var(--t1)',fontWeight:700}}>{score} / 100</b>
      </div>
      <div className="trust-bar">
        <div className="trust-fill" style={{width:`${score}%`}} />
      </div>
    </div>
  )
}

export default function FirmCard({ firm, featured }: { firm: Firm; featured?: boolean }) {
  const initials = firm.name.slice(0,2).toUpperCase()
  const lowestChallenge = firm.challenges?.sort((a,b) => a.price_usd - b.price_usd)[0]

  const markets = [
    firm.markets_forex && 'Forex',
    firm.markets_futures && 'Futures',
    firm.markets_crypto && 'Crypto',
    firm.markets_metals && 'Metals',
    firm.markets_indices && 'Indices',
  ].filter(Boolean).slice(0,2).join(', ')

  return (
    <div style={{background:'var(--bg1)',border:`1px solid ${featured ? 'rgba(0,229,160,0.3)' : 'var(--border)'}`,borderRadius:'16px',padding:'24px',position:'relative',transition:'all .2s',boxShadow:featured?'0 0 40px rgba(0,229,160,0.07)':undefined}} className="card-hover">
      {featured && (
        <div style={{position:'absolute',top:'-11px',left:'20px',background:'var(--teal)',color:'#04120c',fontSize:'10px',fontWeight:800,padding:'4px 12px',borderRadius:'100px',letterSpacing:'.05em',textTransform:'uppercase',boxShadow:'0 0 16px var(--teal-glow)'}}>
          ★ Top Rated
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:'13px',marginBottom:'18px'}}>
        <div style={{width:'44px',height:'44px',borderRadius:'11px',background:'var(--bg2)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:800,color:'var(--t2)',fontFamily:'JetBrains Mono, monospace',flexShrink:0}}>
          {initials}
        </div>
        <div>
          <div style={{fontSize:'15.5px',fontWeight:700,marginBottom:'3px'}}>{firm.name}</div>
          <div style={{fontSize:'12px',color:'var(--t3)',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{color:'var(--amber)'}}>{'★'.repeat(Math.round((firm.trust_score/100)*5))}</span>
            <span>{firm.trust_score >= 90 ? '4.7' : firm.trust_score >= 80 ? '4.3' : '3.9'} · Verified</span>
          </div>
        </div>
      </div>

      <TrustBar score={firm.trust_score} />

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'9px',marginBottom:'16px'}}>
        <div style={{background:'var(--bg2)',borderRadius:'9px',padding:'10px 13px'}}>
          <div style={{fontSize:'10px',color:'var(--t3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px'}}>Profit Split</div>
          <div style={{fontSize:'13.5px',fontWeight:700,color:'var(--green)'}}>{lowestChallenge?.profit_split || 'N/A'}</div>
        </div>
        <div style={{background:'var(--bg2)',borderRadius:'9px',padding:'10px 13px'}}>
          <div style={{fontSize:'10px',color:'var(--t3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px'}}>From</div>
          <div style={{fontSize:'13.5px',fontWeight:700}}>${lowestChallenge?.price_usd || '—'}</div>
        </div>
        <div style={{background:'var(--bg2)',borderRadius:'9px',padding:'10px 13px'}}>
          <div style={{fontSize:'10px',color:'var(--t3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px'}}>Max Drawdown</div>
          <div style={{fontSize:'13.5px',fontWeight:700}}>{lowestChallenge?.phase1_max_dd ? `${lowestChallenge.phase1_max_dd}%` : '—'}</div>
        </div>
        <div style={{background:'var(--bg2)',borderRadius:'9px',padding:'10px 13px'}}>
          <div style={{fontSize:'10px',color:'var(--t3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px'}}>Markets</div>
          <div style={{fontSize:'13.5px',fontWeight:700}}>{markets || '—'}</div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
        <div style={{display:'flex',gap:'6px'}}>
          {lowestChallenge?.allows_ea && (
            <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'100px',fontWeight:600,background:'rgba(0,229,160,0.1)',color:'var(--teal)',border:'1px solid rgba(0,229,160,0.2)'}}>EA ok</span>
          )}
          {(lowestChallenge?.phase1_time_limit === 0) && (
            <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'100px',fontWeight:600,background:'rgba(0,229,160,0.1)',color:'var(--teal)',border:'1px solid rgba(0,229,160,0.2)'}}>No limit</span>
          )}
        </div>
        <Link href={`/firms/${firm.slug}`} style={{padding:'8px 16px',borderRadius:'8px',fontSize:'12.5px',fontWeight:700,color:'#04120c',background:'var(--teal)',textDecoration:'none',boxShadow:'0 0 12px var(--teal-glow)'}}>
          View →
        </Link>
      </div>
    </div>
  )
}
