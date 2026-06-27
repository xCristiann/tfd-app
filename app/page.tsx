import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmCard from '@/components/firm/FirmCard'
import Link from 'next/link'
import type { Firm } from '@/types'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: firms } = await supabase
    .from('firms')
    .select('*, challenges(*), rules(*)')
    .eq('is_published', true)
    .order('trust_score', { ascending: false })
    .limit(6)

  const firmsList: Firm[] = firms || []

  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section style={{padding:'100px 0 72px',textAlign:'center'}}>
          <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 40px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'6px 16px 6px 12px',borderRadius:'100px',background:'rgba(0,229,160,0.07)',border:'1px solid rgba(0,229,160,0.2)',fontSize:'12.5px',color:'var(--teal)',fontWeight:500,marginBottom:'30px'}}>
              <span className="badge-dot" />
              Independent · Verified · Transparent
            </div>
            <h1 style={{fontSize:'62px',fontWeight:900,letterSpacing:'-.04em',lineHeight:1.04,marginBottom:'22px'}}>
              Find your prop firm<br />
              <span className="gradient-text">without the bias</span>
            </h1>
            <p style={{fontSize:'18px',color:'var(--t2)',maxWidth:'560px',margin:'0 auto 44px',lineHeight:1.65}}>
              The only prop firm comparison platform where every rule is verified, every challenge is current, and every firm is ranked on merit — not marketing budgets.
            </p>
            <div style={{display:'flex',gap:'8px',maxWidth:'580px',margin:'0 auto 20px',background:'var(--bg1)',border:'1px solid var(--border2)',borderRadius:'14px',padding:'6px 6px 6px 20px'}}>
              <input type="text" placeholder="Search firms: FTMO, FundingPips, The5ers..." style={{flex:1,background:'none',border:'none',outline:'none',fontSize:'15px',color:'var(--t1)',fontFamily:'Inter,sans-serif'}} />
              <button style={{padding:'11px 22px',borderRadius:'9px',fontSize:'14px',fontWeight:700,color:'#04120c',background:'var(--teal)',border:'none',cursor:'pointer',boxShadow:'0 0 16px var(--teal-glow)'}}>Search</button>
            </div>
            <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap',marginBottom:'60px'}}>
              {['All Markets','Forex','Futures','Crypto','Equities','Under $100','High Split','No Time Limit'].map(f => (
                <button key={f} style={{padding:'7px 16px',borderRadius:'100px',fontSize:'13px',fontWeight:500,color:f==='All Markets'?'var(--teal)':'var(--t2)',background:f==='All Markets'?'rgba(0,229,160,0.06)':'var(--bg1)',border:`1px solid ${f==='All Markets'?'rgba(0,229,160,0.3)':'var(--border)'}`,cursor:'pointer'}}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 40px'}}>
          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderRadius:'16px',overflow:'hidden',border:'1px solid var(--border)',marginBottom:'80px'}}>
            {[['14','Verified firms'],['100%','Rules manually checked'],['2,800+','Verified reviews'],['Live','Challenge data updated']].map(([n,l]) => (
              <div key={l} style={{background:'var(--bg1)',padding:'28px 20px',textAlign:'center',borderLeft:'1px solid var(--border)'}}>
                <div style={{fontSize:'30px',fontWeight:900,letterSpacing:'-.03em',marginBottom:'5px',background:'linear-gradient(135deg,var(--teal),var(--violet))',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>{n}</div>
                <div style={{fontSize:'12.5px',color:'var(--t2)',fontWeight:500}}>{l}</div>
              </div>
            ))}
          </div>

          {/* FIRMS */}
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'28px'}}>
            <div>
              <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--teal)',marginBottom:'10px'}}>Top Firms</div>
              <div style={{fontSize:'28px',fontWeight:800,letterSpacing:'-.02em',marginBottom:'8px'}}>Ranked by trust score, not commission</div>
              <div style={{fontSize:'15px',color:'var(--t2)'}}>Every ranking is calculated independently. Click any firm to see full rules, challenges, and verified reviews.</div>
            </div>
            <Link href="/firms" style={{fontSize:'13px',color:'var(--teal)',fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>View all firms →</Link>
          </div>

          {firmsList.length > 0 ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'80px'}}>
              {firmsList.map((firm, i) => (
                <FirmCard key={firm.id} firm={firm} featured={i === 0} />
              ))}
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'80px 20px',color:'var(--t2)',marginBottom:'80px'}}>
              <div style={{fontSize:'48px',marginBottom:'16px'}}>🏦</div>
              <div style={{fontSize:'20px',fontWeight:700,marginBottom:'8px'}}>No firms yet</div>
              <div style={{marginBottom:'24px'}}>Add your first firm from the Admin CRM to get started.</div>
              <Link href="/auth/login" style={{padding:'11px 22px',borderRadius:'9px',fontSize:'14px',fontWeight:700,color:'#04120c',background:'var(--teal)',textDecoration:'none'}}>Go to Admin →</Link>
            </div>
          )}

          {/* CTA */}
          <div style={{borderRadius:'16px',padding:'60px 56px',marginBottom:'80px',position:'relative',overflow:'hidden',background:'var(--bg1)',border:'1px solid var(--border2)',textAlign:'center'}}>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(0,229,160,0.06),rgba(167,139,250,0.06))',pointerEvents:'none'}} />
            <div style={{position:'absolute',top:'-100px',right:'-100px',width:'380px',height:'380px',borderRadius:'50%',background:'radial-gradient(circle,rgba(167,139,250,0.18),transparent 70%)',pointerEvents:'none'}} />
            <h2 style={{fontSize:'32px',fontWeight:900,letterSpacing:'-.03em',marginBottom:'12px',position:'relative'}}>Not sure which firm fits your style?</h2>
            <p style={{fontSize:'16px',color:'var(--t2)',maxWidth:'480px',margin:'0 auto 32px',position:'relative'}}>Enter your target capital, trading style, and budget. Our matching engine calculates real expected value per firm.</p>
            <Link href="/calculator" style={{display:'inline-block',padding:'15px 34px',borderRadius:'12px',fontSize:'15px',fontWeight:800,color:'#04120c',background:'linear-gradient(135deg,var(--teal),#4fffcc)',textDecoration:'none',boxShadow:'0 0 40px var(--teal-glow)',position:'relative'}}>
              Launch the Matching Calculator →
            </Link>
            <div style={{marginTop:'14px',fontSize:'13px',color:'var(--t3)',position:'relative'}}>No account required. Free forever.</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
