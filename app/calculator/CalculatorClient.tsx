'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function CalculatorClient() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<any[]>([])
  const [searched, setSearched] = useState(false)

  // Filters
  const [budget, setBudget] = useState('')
  const [accountSize, setAccountSize] = useState('')
  const [market, setMarket] = useState('forex')
  const [allowEA, setAllowEA] = useState(false)
  const [allowNews, setAllowNews] = useState(false)
  const [allowWeekend, setAllowWeekend] = useState(false)
  const [maxPhases, setMaxPhases] = useState('2')
  const [minSplit, setMinSplit] = useState('')
  const [euFriendly, setEuFriendly] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('firms').select('*, challenges(*)').eq('is_published', true)
      .then(({ data }) => { setFirms(data || []); setLoading(false) })
  }, [])

  const find = () => {
    const budgetNum = parseInt(budget) || 0
    const accountNum = parseInt(accountSize) || 0
    const splitNum = parseInt(minSplit) || 0
    const phasesMax = parseInt(maxPhases) || 2

    const scored = firms.map(firm => {
      // Filter challenges
      const matching = (firm.challenges || []).filter((ch: any) => {
        if (budgetNum > 0 && ch.price_usd > budgetNum) return false
        if (accountNum > 0 && ch.account_size < accountNum) return false
        if (allowEA && !ch.allows_ea) return false
        if (allowNews && !ch.allows_news_trading) return false
        if (allowWeekend && !ch.allows_weekend_holding) return false
        if (splitNum > 0 && parseInt(ch.profit_split) < splitNum) return false
        const phases = ch.phase2_target ? 2 : 1
        if (phases > phasesMax) return false
        return true
      })
      if (!matching.length) return null

      // Market filter
      if (market === 'forex' && !firm.markets_forex) return null
      if (market === 'futures' && !firm.markets_futures) return null
      if (market === 'crypto' && !firm.markets_crypto) return null
      if (euFriendly && !firm.accepts_eu) return null

      const best = matching.sort((a: any, b: any) => a.price_usd - b.price_usd)[0]

      // Score: trust score + bonuses
      let score = firm.trust_score || 0
      if (best.allows_ea) score += 5
      if (best.allows_news_trading) score += 5
      if (best.allows_weekend_holding) score += 3
      if (best.phase1_time_limit === 0) score += 5 // no time limit
      if (parseInt(best.profit_split) >= 90) score += 8
      if (parseInt(best.profit_split) >= 80) score += 4
      if (firm.payout_reliability === 'Confirmed') score += 10
      if ((firm.avg_payout_days || 99) <= 2) score += 5

      return { firm, best, score, matchCount: matching.length }
    }).filter(Boolean)

    const sorted = scored.sort((a: any, b: any) => b!.score - a!.score)
    setResults(sorted.slice(0, 10) as any[])
    setSearched(true)
  }

  const inp = (label: string, value: string, setter: (v:string)=>void, placeholder='', type='number') => (
    <div>
      <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em' }}>{label}</label>
      <input type={type} value={value} onChange={e=>setter(e.target.value)} placeholder={placeholder}
        style={{ width:'100%',padding:'10px 14px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'9px',color:'var(--t1)',fontSize:'14px',fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box' }} />
    </div>
  )

  const chk = (label: string, value: boolean, setter: (v:boolean)=>void) => (
    <label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13.5px',color:'var(--t1)',padding:'8px 0' }}>
      <input type="checkbox" checked={value} onChange={e=>setter(e.target.checked)} style={{ width:'16px',height:'16px',accentColor:'var(--teal)',cursor:'pointer' }} />
      {label}
    </label>
  )

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--teal)',marginBottom:'10px' }}>Smart Matching</div>
          <h1 style={{ fontSize:'38px',fontWeight:900,letterSpacing:'-.03em',marginBottom:'12px' }}>Prop Firm Calculator</h1>
          <p style={{ fontSize:'15px',color:'var(--t2)' }}>Tell us what you need and we will find your perfect prop firm.</p>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'340px 1fr',gap:'28px',alignItems:'start' }}>
          {/* FILTERS */}
          <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'16px',padding:'24px',position:'sticky',top:'88px' }}>
            <h2 style={{ fontSize:'15px',fontWeight:700,marginBottom:'20px' }}>Your Requirements</h2>

            <div style={{ display:'flex',flexDirection:'column',gap:'16px',marginBottom:'20px' }}>
              {inp('Max Budget ($)',''+budget,setBudget,'e.g. 500')}
              {inp('Min Account Size ($)',''+accountSize,setAccountSize,'e.g. 100000')}
              {inp('Min Profit Split (%)',''+minSplit,setMinSplit,'e.g. 80')}

              <div>
                <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em' }}>Market</label>
                <select value={market} onChange={e=>setMarket(e.target.value)}
                  style={{ width:'100%',padding:'10px 14px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'9px',color:'var(--t1)',fontSize:'14px',fontFamily:'Inter,sans-serif',outline:'none' }}>
                  <option value="forex">Forex</option>
                  <option value="futures">Futures</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em' }}>Max Challenge Phases</label>
                <select value={maxPhases} onChange={e=>setMaxPhases(e.target.value)}
                  style={{ width:'100%',padding:'10px 14px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'9px',color:'var(--t1)',fontSize:'14px',fontFamily:'Inter,sans-serif',outline:'none' }}>
                  <option value="1">1 Phase only</option>
                  <option value="2">Up to 2 Phases</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--border)',paddingTop:'16px',marginBottom:'20px' }}>
              <div style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.04em' }}>Required Features</div>
              {chk('EA / Bots Allowed',allowEA,setAllowEA)}
              {chk('News Trading Allowed',allowNews,setAllowNews)}
              {chk('Weekend Holding',allowWeekend,setAllowWeekend)}
              {chk('EU Friendly',euFriendly,setEuFriendly)}
            </div>

            <button onClick={find} disabled={loading}
              style={{ width:'100%',padding:'13px',borderRadius:'10px',fontSize:'15px',fontWeight:800,color:'#04120c',background:'var(--teal)',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',boxShadow:'0 0 24px var(--teal-glow)',opacity:loading?0.7:1 }}>
              {loading ? 'Loading firms...' : 'Find My Firm'}
            </button>
          </div>

          {/* RESULTS */}
          <div>
            {!searched ? (
              <div style={{ textAlign:'center',padding:'80px',background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'16px',color:'var(--t2)' }}>
                <div style={{ fontSize:'48px',marginBottom:'12px' }}>&#128269;</div>
                <div style={{ fontSize:'16px',fontWeight:700,marginBottom:'8px' }}>Set your requirements</div>
                <div style={{ fontSize:'14px' }}>Fill in the filters and click Find My Firm to get personalized matches.</div>
              </div>
            ) : results.length === 0 ? (
              <div style={{ textAlign:'center',padding:'80px',background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'16px',color:'var(--t2)' }}>
                <div style={{ fontSize:'48px',marginBottom:'12px' }}>&#128549;</div>
                <div style={{ fontSize:'16px',fontWeight:700,marginBottom:'8px' }}>No matches found</div>
                <div style={{ fontSize:'14px' }}>Try relaxing your requirements.</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:'14px',color:'var(--t2)',marginBottom:'16px',fontWeight:600 }}>
                  Found <span style={{ color:'var(--teal)' }}>{results.length}</span> matching firms
                </div>
                <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
                  {results.map((r: any, i) => (
                    <Link key={r.firm.slug} href={`/firms/${r.firm.slug}`} style={{ textDecoration:'none',color:'inherit' }}>
                      <div style={{ background:'var(--bg1)',border:`1px solid ${i===0?'rgba(0,229,160,0.3)':'var(--border)'}`,borderRadius:'14px',padding:'20px 24px',display:'grid',gridTemplateColumns:'40px 1fr auto',gap:'16px',alignItems:'center',transition:'background .15s',cursor:'pointer',boxShadow:i===0?'0 0 20px rgba(0,229,160,0.06)':'none' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='var(--bg2)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='var(--bg1)')}>

                        <div style={{ width:'40px',height:'40px',borderRadius:'50%',background:i===0?'var(--teal)':i===1?'var(--violet)':'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:900,color:i<2?'#04120c':'var(--t3)',flexShrink:0 }}>
                          {i+1}
                        </div>

                        <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
                          <FirmLogo name={r.firm.name} logoUrl={r.firm.logo_url} size={44} radius={10} />
                          <div>
                            <div style={{ fontSize:'16px',fontWeight:700,marginBottom:'4px' }}>{r.firm.name}</div>
                            <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
                              <span style={{ fontSize:'12px',color:'var(--teal)',fontWeight:600 }}>Score: {Math.round(r.score)}</span>
                              <span style={{ fontSize:'12px',color:'var(--t3)' }}>Trust: {r.firm.trust_score}/100</span>
                              <span style={{ fontSize:'12px',color:'var(--t3)' }}>{r.best.phase2_target ? '2-Step' : '1-Step'}</span>
                              {r.best.allows_ea && <span style={{ fontSize:'11px',padding:'1px 6px',borderRadius:'4px',background:'rgba(0,229,160,0.1)',color:'var(--teal)',fontWeight:600 }}>EA</span>}
                              {r.best.allows_news_trading && <span style={{ fontSize:'11px',padding:'1px 6px',borderRadius:'4px',background:'rgba(0,229,160,0.1)',color:'var(--teal)',fontWeight:600 }}>News</span>}
                              {r.best.allows_weekend_holding && <span style={{ fontSize:'11px',padding:'1px 6px',borderRadius:'4px',background:'rgba(0,229,160,0.1)',color:'var(--teal)',fontWeight:600 }}>Weekend</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign:'right',flexShrink:0 }}>
                          <div style={{ fontSize:'22px',fontWeight:900,marginBottom:'2px' }}>${r.best.price_usd}</div>
                          <div style={{ fontSize:'13px',color:'var(--green)',fontWeight:700 }}>{r.best.profit_split} split</div>
                          {r.firm.promo_discount && (
                            <div style={{ fontSize:'11px',padding:'2px 8px',borderRadius:'4px',background:'linear-gradient(135deg,#ec4899,var(--violet))',color:'#fff',fontWeight:700,marginTop:'4px',display:'inline-block' }}>
                              {r.firm.promo_discount}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}