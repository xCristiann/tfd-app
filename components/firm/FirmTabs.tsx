'use client'
import { useState } from 'react'
import type { Firm, Challenge, Rule, Review } from '@/types'
import ReviewSection from './ReviewSection'

const ruleColor = (type: string) => {
  if (type === 'green') return 'var(--green)'
  if (type === 'red') return 'var(--coral)'
  if (type === 'amber') return 'var(--amber)'
  return 'var(--t1)'
}

export default function FirmTabs({ firm, challenges, rules, reviews }: {
  firm: Firm; challenges: Challenge[]; rules: Rule[]; reviews: Review[]
}) {
  const [tab, setTab] = useState('challenges')
  const [activeChallenge, setActiveChallenge] = useState(0)

  const tabStyle = (t: string) => ({
    padding:'11px 20px',fontSize:'14px',fontWeight:500,
    color: tab===t ? 'var(--teal)' : 'var(--t2)',
    cursor:'pointer',border:'none',background:'none',
    borderBottom: tab===t ? '2px solid var(--teal)' : '2px solid transparent',
    marginBottom:'-1px',transition:'all .15s',fontFamily:'Inter,sans-serif'
  })

  const cats = [...new Set(rules.map(r => r.category))]
  const ch = challenges[activeChallenge]

  return (
    <div>
      {/* TABS */}
      <div style={{display:'flex',gap:'2px',borderBottom:'1px solid var(--border)',marginBottom:'36px'}}>
        <button style={tabStyle('challenges')} onClick={()=>setTab('challenges')}>Challenges</button>
        <button style={tabStyle('rules')} onClick={()=>setTab('rules')}>Rules</button>
        <button style={tabStyle('reviews')} onClick={()=>setTab('reviews')}>Reviews & Comments ({reviews.length})</button>
      </div>

      {/* CHALLENGES */}
      {tab === 'challenges' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'24px'}}>
          <div>
            {challenges.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px',color:'var(--t2)'}}>No challenges added yet.</div>
            ) : (
              <>
                <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
                  {challenges.map((c, i) => (
                    <button key={c.id} onClick={()=>setActiveChallenge(i)} style={{padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:`1px solid ${activeChallenge===i?'rgba(0,229,160,0.3)':'var(--border2)'}`,color:activeChallenge===i?'var(--teal)':'var(--t2)',background:activeChallenge===i?'rgba(0,229,160,0.06)':'transparent',fontFamily:'Inter,sans-serif'}}>
                      {c.name} — ${c.account_size.toLocaleString()}
                    </button>
                  ))}
                </div>
                {ch && (
                  <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden'}}>
                    <div style={{background:'var(--bg2)',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:'14px',fontWeight:700}}>{ch.name} — ${ch.account_size.toLocaleString()} Account</div>
                      <div style={{fontSize:'18px',fontWeight:900,color:'var(--teal)'}}>${ch.price_usd}</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'20px',gap:'16px'}}>
                      {[
                        ['Phase 1 Target', ch.phase1_target ? `${ch.phase1_target}%` : '—', 'amber'],
                        ['Phase 2 Target', ch.phase2_target ? `${ch.phase2_target}%` : '—', 'amber'],
                        ['Daily Drawdown', ch.phase1_daily_dd ? `${ch.phase1_daily_dd}%` : '—', 'red'],
                        ['Max Drawdown', ch.phase1_max_dd ? `${ch.phase1_max_dd}%` : '—', 'red'],
                        ['Profit Split', ch.profit_split || '—', 'green'],
                        ['Min Trading Days', ch.phase1_min_days === 0 ? 'None' : `${ch.phase1_min_days}d`, 'neutral'],
                        ['Time Limit', ch.phase1_time_limit === 0 ? 'None' : `${ch.phase1_time_limit}d`, 'green'],
                        ['Payout Frequency', ch.payout_frequency || '—', 'neutral'],
                      ].map(([lbl, val, type]) => (
                        <div key={String(lbl)} style={{background:'var(--bg2)',borderRadius:'9px',padding:'12px'}}>
                          <div style={{fontSize:'10.5px',color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.04em',fontWeight:600,marginBottom:'4px'}}>{lbl}</div>
                          <div style={{fontSize:'14px',fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:ruleColor(String(type))}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:'0 20px 20px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      {[['Weekend Holding', ch.allows_weekend_holding],['News Trading', ch.allows_news_trading],['EA / Bots', ch.allows_ea],['Hedging', ch.allows_hedging]].map(([lbl, val]) => (
                        <span key={String(lbl)} style={{fontSize:'11.5px',padding:'4px 11px',borderRadius:'100px',fontWeight:600,background:val?'rgba(0,229,160,0.1)':'rgba(248,113,113,0.1)',color:val?'var(--teal)':'var(--coral)',border:`1px solid ${val?'rgba(0,229,160,0.2)':'rgba(248,113,113,0.2)'}`}}>
                          {val ? '✓' : '✗'} {lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <Sidebar firm={firm} />
        </div>
      )}

      {/* RULES */}
      {tab === 'rules' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'24px'}}>
          <div>
            {cats.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px',color:'var(--t2)'}}>No rules added yet.</div>
            ) : cats.map(cat => (
              <div key={cat} style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',marginBottom:'16px'}}>
                <div style={{background:'var(--bg2)',padding:'14px 20px',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--t3)'}}>{cat}</div>
                {rules.filter(r => r.category === cat).map(rule => (
                  <div key={rule.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderTop:'1px solid var(--border)',fontSize:'14px'}}>
                    <span style={{color:'var(--t2)'}}>{rule.label}</span>
                    <span style={{fontWeight:700,fontFamily:'JetBrains Mono,monospace',fontSize:'13px',color:ruleColor(rule.value_type)}}>{rule.value}</span>
                  </div>
                ))}
              </div>
            ))}
            {firm.rules_last_verified && (
              <div style={{fontSize:'12px',color:'var(--t3)',marginTop:'8px'}}>
                Rules last verified: <span style={{color:'var(--teal)'}}>{new Date(firm.rules_last_verified).toLocaleDateString('en-GB')}</span>
              </div>
            )}
          </div>
          <Sidebar firm={firm} />
        </div>
      )}

      {/* REVIEWS */}
      {tab === 'reviews' && <ReviewSection firmId={firm.id} reviews={reviews} />}
    </div>
  )
}

function Sidebar({ firm }: { firm: Firm }) {
  return (
    <div>
      <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
        <h3 style={{fontSize:'11.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--t3)',marginBottom:'16px'}}>Trust Score Breakdown</h3>
        <div style={{fontSize:'42px',fontWeight:900,color:'var(--teal)',letterSpacing:'-.03em',lineHeight:1,marginBottom:'4px'}}>{firm.trust_score}</div>
        <div style={{fontSize:'13px',color:'var(--t2)',marginBottom:'16px'}}>out of 100</div>
        <div className="trust-bar" style={{marginBottom:'18px'}}><div className="trust-fill" style={{width:`${firm.trust_score}%`}} /></div>
        <div>
          {[
            ['Payout reliability', firm.payout_reliability || '—', firm.payout_reliability === 'Confirmed'],
            ['Support quality', firm.support_quality || '—', firm.support_quality === 'Fast'],
            ['Delayed payouts', `${firm.delayed_payout_reports || 0} reported`, firm.delayed_payout_reports === 0],
            ['Rules clarity', firm.rules_clarity || '—', firm.rules_clarity === 'Clear'],
            ['Years active', firm.years_active ? `${firm.years_active} yrs` : '—', true],
          ].map(([lbl, val, ok]) => (
            <div key={String(lbl)} style={{display:'flex',justifyContent:'space-between',fontSize:'12.5px',padding:'7px 0',borderTop:'1px solid var(--border)'}}>
              <span style={{color:'var(--t2)'}}>{lbl}</span>
              <b style={{color:ok?'var(--green)':'var(--amber)',fontWeight:700}}>{String(val)}</b>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
        <h3 style={{fontSize:'11.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',color:'var(--t3)',marginBottom:'16px'}}>Quick Facts</h3>
        <div>
          {[
            ['HQ', firm.headquarters],
            ['Founded', firm.founded_year],
            ['Platforms', firm.platforms?.join(', ')],
            ['Payout methods', firm.payout_methods?.join(', ')],
            ['Total funded', firm.total_funded_traders],
            ['Accepts EU', firm.accepts_eu ? 'Yes' : 'No'],
          ].filter(([,v])=>v).map(([lbl, val]) => (
            <div key={String(lbl)} style={{display:'flex',justifyContent:'space-between',fontSize:'12.5px',padding:'7px 0',borderTop:'1px solid var(--border)'}}>
              <span style={{color:'var(--t2)'}}>{lbl}</span>
              <b style={{color:'var(--t1)',fontWeight:600}}>{String(val)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
