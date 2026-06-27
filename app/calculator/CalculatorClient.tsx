'use client'
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

type Result = { name: string; score: number; reasons: string[]; price: number; split: string }

export default function CalculatorClient() {
  const [budget, setBudget] = useState('')
  const [target, setTarget] = useState('')
  const [style, setStyle] = useState('')
  const [experience, setExperience] = useState('')
  const [markets, setMarkets] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const calculate = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    const matches: Result[] = [
      { name:'The5ers', score:94, reasons:['No time limit matches your style','EA bots allowed','Best profit split scaling'], price:99, split:'80→100%' },
      { name:'FundingPips', score:81, reasons:[`Low entry price fits your budget`,'Forex + Crypto available','Fast challenge process'], price:49, split:'80%' },
      { name:'Alpha Capital', score:72, reasons:['Flexible drawdown rules','Good for swing traders','Weekend holding allowed'], price:79, split:'85%' },
    ]
    setResults(matches); setLoading(false); setDone(true)
  }

  const sel = (label: string, val: string, setVal: (v:string)=>void, opts: string[][]) => (
    <div>
      <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
      <select value={val} onChange={e=>setVal(e.target.value)} style={{width:'100%',padding:'12px 16px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'10px',color:val?'var(--t1)':'var(--t3)',fontSize:'15px',fontFamily:'Inter,sans-serif',outline:'none'}}>
        <option value="">Select...</option>
        {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )

  const allFilled = budget && target && style && experience && markets

  return (
    <>
      <Navbar />
      <main style={{maxWidth:'800px',margin:'0 auto',padding:'64px 40px 80px'}}>
        <div style={{textAlign:'center',marginBottom:'56px'}}>
          <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--teal)',marginBottom:'12px'}}>Matching Engine</div>
          <h1 style={{fontSize:'44px',fontWeight:900,letterSpacing:'-.03em',marginBottom:'16px'}}>Find your <span className="gradient-text">perfect prop firm</span></h1>
          <p style={{fontSize:'17px',color:'var(--t2)',lineHeight:1.65}}>Answer 5 questions. Our algorithm scores every firm against your profile and returns a ranked list with reasons.</p>
        </div>

        <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'16px',padding:'40px',marginBottom:'32px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
            {sel('Challenge budget',budget,setBudget,[['50','Under $50'],['100','$50–$100'],['200','$100–$200'],['500','$200+']])}
            {sel('Target account size',target,setTarget,[['10k','Up to $10K'],['25k','$25K'],['50k','$50K'],['100k','$100K+']])}
            {sel('Trading style',style,setStyle,[['scalping','Scalping'],['day','Day trading'],['swing','Swing trading'],['ea','EA / Automated']])}
            {sel('Experience level',experience,setExperience,[['beginner','Beginner (under 1 yr)'],['intermediate','Intermediate (1–3 yrs)'],['advanced','Advanced (3+ yrs)']])}
            <div style={{gridColumn:'1/-1'}}>
              {sel('Preferred markets',markets,setMarkets,[['forex','Forex only'],['futures','Futures'],['crypto','Crypto'],['mixed','Mixed / Don\'t mind']])}
            </div>
          </div>
          <button onClick={calculate} disabled={loading||!allFilled} className="btn-primary" style={{width:'100%',padding:'15px',fontSize:'16px',borderRadius:'12px',marginTop:'24px',opacity:!allFilled?0.5:1}}>
            {loading?'Calculating best matches...':'Find My Best Firm →'}
          </button>
        </div>

        {done && (
          <div>
            <div style={{fontSize:'13px',color:'var(--t2)',marginBottom:'20px',textAlign:'center'}}>Top <b style={{color:'var(--t1)'}}>{results.length} matches</b> for your profile</div>
            {results.map((r,i) => (
              <div key={r.name} style={{background:'var(--bg1)',border:`1px solid ${i===0?'rgba(0,229,160,0.3)':'var(--border)'}`,borderRadius:'14px',padding:'24px',marginBottom:'14px',boxShadow:i===0?'0 0 30px rgba(0,229,160,0.07)':undefined}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'38px',height:'38px',borderRadius:'9px',background:'var(--bg2)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:800,color:'var(--t2)',fontFamily:'JetBrains Mono,monospace'}}>
                      {r.name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:'16px'}}>{r.name}</div>
                      <div style={{fontSize:'12px',color:'var(--t3)'}}>From ${r.price} · Split {r.split}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'28px',fontWeight:900,color:i===0?'var(--teal)':'var(--t1)',lineHeight:1}}>{r.score}</div>
                    <div style={{fontSize:'11px',color:'var(--t3)'}}>match score</div>
                  </div>
                </div>
                <div style={{marginBottom:'16px'}}>
                  {r.reasons.map(reason=>(
                    <div key={reason} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'var(--t2)',marginBottom:'5px'}}>
                      <span style={{color:'var(--teal)',fontWeight:700}}>✓</span>{reason}
                    </div>
                  ))}
                </div>
                <a href={`/firms/${r.name.toLowerCase().replace(/\s+/g,'-')}`} style={{display:'inline-block',padding:'9px 20px',borderRadius:'9px',fontSize:'13px',fontWeight:700,textDecoration:'none',background:i===0?'var(--teal)':'var(--bg2)',color:i===0?'#04120c':'var(--t1)',border:i===0?'none':'1px solid var(--border2)'}}>
                  {i===0?'View firm →':'See details →'}
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
