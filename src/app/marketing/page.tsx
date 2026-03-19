import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const NAV_LINKS = [
  ['How It Works', '#how'],
  ['Challenge Plans', '#plans'],
  ['Payouts', '#payouts'],
  ['Features', '#features'],
  ['FAQ', '#faq'],
]

export function MarketingPage() {
  const navigate = useNavigate()
  const { profile, session } = useAuth()
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    supabase.from('challenge_products').select('*').eq('is_active', true).order('account_size').then(({ data }) => setProducts(data ?? []))
  }, [])

  const isLoggedIn = !!session

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#fff',color:'#1A3A6B',minHeight:'100vh'}}>

      {/* NAV */}
      <nav style={{height:'64px',display:'flex',alignItems:'center',padding:'0 48px',borderBottom:'1px solid #E8EEF8',background:'#fff',position:'sticky',top:0,zIndex:100}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'18px',fontWeight:700,color:'#1A3A6B',marginRight:'auto',letterSpacing:'-0.3px'}}>
          The Funded <span style={{color:'#2255CC',fontStyle:'italic'}}>Diaries</span>
        </div>
        <div style={{display:'flex'}}>
          {NAV_LINKS.map(([l, h]) => (
            <a key={l} href={h} style={{fontSize:'12px',fontWeight:500,color:'#5C7A9E',padding:'0 16px',height:'64px',display:'flex',alignItems:'center',cursor:'pointer',textDecoration:'none',transition:'color .15s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='#1A3A6B')} onMouseLeave={e=>(e.currentTarget.style.color='#5C7A9E')}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:'10px',marginLeft:'32px'}}>
          {isLoggedIn ? (
            <button onClick={() => navigate('/dashboard')} style={{fontSize:'12px',fontWeight:600,color:'#fff',padding:'8px 20px',background:'#2255CC',border:'none',borderRadius:'8px',cursor:'pointer'}}>
              Dashboard →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{fontSize:'12px',fontWeight:500,color:'#1A3A6B',padding:'8px 18px',border:'1.5px solid #C5D5EA',background:'#fff',borderRadius:'8px',cursor:'pointer'}}>
                Log in
              </button>
              <button onClick={() => navigate('/login')} style={{fontSize:'12px',fontWeight:600,color:'#fff',padding:'8px 20px',background:'#2255CC',border:'none',borderRadius:'8px',cursor:'pointer'}}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 440px',minHeight:'440px',borderBottom:'1px solid #E8EEF8'}}>
        <div style={{padding:'64px 48px',display:'flex',flexDirection:'column',justifyContent:'center',background:'#fff'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'#EEF3FF',border:'1px solid #C5D5FA',borderRadius:'20px',padding:'5px 14px',marginBottom:'24px',width:'fit-content'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22C55E'}}/>
            <span style={{fontSize:'10px',fontWeight:700,color:'#2255CC',letterSpacing:'0.5px',textTransform:'uppercase'}}>14,281 traders funded worldwide</span>
          </div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'52px',fontWeight:700,color:'#1A3A6B',lineHeight:1.03,letterSpacing:'-0.8px',marginBottom:'16px'}}>
            Trade our capital.<br/>Keep your <span style={{color:'#2255CC',fontStyle:'italic'}}>profits.</span>
          </h1>
          <p style={{fontSize:'15px',fontWeight:300,color:'#5C7A9E',lineHeight:1.75,marginBottom:'32px',maxWidth:'420px'}}>
            Get funded up to $200,000. Keep up to 90% of what you earn. One payment — no subscriptions, no recurring fees.
          </p>
          <div style={{display:'flex',gap:'12px',alignItems:'center',marginBottom:'44px'}}>
            <button onClick={() => navigate('/login')} style={{fontSize:'13px',fontWeight:600,color:'#fff',background:'#2255CC',border:'none',padding:'13px 28px',borderRadius:'8px',cursor:'pointer',boxShadow:'0 4px 16px rgba(34,85,204,.25)'}}>
              Start your challenge
            </button>
            <button onClick={() => document.getElementById('plans')?.scrollIntoView({behavior:'smooth'})} style={{fontSize:'13px',fontWeight:500,color:'#2255CC',background:'#EEF3FF',border:'none',padding:'13px 20px',borderRadius:'8px',cursor:'pointer'}}>
              View plans
            </button>
          </div>
          <div style={{display:'flex',gap:'0',paddingTop:'28px',borderTop:'1px solid #E8EEF8'}}>
            {[['$4.8M+','Paid out'],['90%','Max split'],['24h','Payouts'],['$200K','Max account']].map(([v,l],i,arr)=>(
              <div key={l} style={{paddingRight: i<arr.length-1 ? '28px':'0', marginRight: i<arr.length-1 ? '28px':'0', borderRight: i<arr.length-1 ? '1px solid #E8EEF8':'none'}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:'26px',fontWeight:700,color:'#1A3A6B'}}>{v}</div>
                <div style={{fontSize:'11px',color:'#8FA3BF',marginTop:'2px',letterSpacing:'0.3px'}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero right - live account card */}
        <div style={{background:'#1A3A6B',padding:'40px 36px',display:'flex',flexDirection:'column',gap:'0'}}>
          <div style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'12px',padding:'22px',marginBottom:'12px'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'rgba(255,255,255,.4)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'12px'}}>Live funded account</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'38px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',lineHeight:1}}>$10,842</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'12px',color:'#4ADE80',marginTop:'4px',marginBottom:'18px'}}>+$842.00 · +8.42% this phase</div>
            <div style={{height:'52px',display:'flex',alignItems:'flex-end',gap:'3px'}}>
              {[30,36,33,44,48,52,47,58,54,64,70,62,72,78,74,82,80,88,84,92,96,100].map((v,i,arr)=>(
                <div key={i} style={{flex:1,borderRadius:'3px 3px 0 0',background: i===arr.length-1 ? '#60A5FA' : v>80 ? 'rgba(96,165,250,.5)' : 'rgba(255,255,255,.1)',height:`${Math.round(v/100*100)}%`}}/>
              ))}
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'12px',padding:'18px'}}>
            <div style={{marginBottom:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                <span style={{fontSize:'11px',color:'rgba(255,255,255,.4)'}}>Phase 1 target</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',color:'#60A5FA',fontWeight:500}}>8.4% / 10%</span>
              </div>
              <div style={{height:'4px',background:'rgba(255,255,255,.1)',borderRadius:'2px',overflow:'hidden'}}>
                <div style={{height:'100%',width:'84%',background:'#60A5FA',borderRadius:'2px'}}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              {[['Daily DD','0.8% / 5%','#4ADE80'],['Max DD','4.2% / 10%','#60A5FA'],['Win rate','68%','#fff'],['Open P&L','+$368','#4ADE80']].map(([l,v,c])=>(
                <div key={l}>
                  <div style={{fontSize:'10px',color:'rgba(255,255,255,.4)',fontWeight:500,letterSpacing:'0.5px',marginBottom:'3px'}}>{l}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'14px',fontWeight:500,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" style={{padding:'64px 48px',background:'#F4F7FD',borderBottom:'1px solid #E8EEF8'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{width:'28px',height:'2px',background:'#2255CC',borderRadius:'1px'}}/>
          <span style={{fontSize:'10px',fontWeight:700,color:'#2255CC',letterSpacing:'2.5px',textTransform:'uppercase'}}>How it works</span>
        </div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'36px',fontWeight:700,color:'#1A3A6B',letterSpacing:'-0.4px',marginBottom:'36px'}}>
          From challenge to <span style={{color:'#2255CC',fontStyle:'italic'}}>funded</span> in four steps.
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
          {[
            ['01','Choose your challenge','Select your account size and pay a one-time fee. No subscriptions, no recurring costs ever.'],
            ['02','Pass the evaluation','Hit the profit target while respecting drawdown rules. No time pressure — trade at your pace.'],
            ['03','Get funded','Receive your funded account credentials and start trading our capital immediately.'],
            ['04','Withdraw profits','Request payouts whenever you want. Crypto delivered within 24 hours.'],
          ].map(([n,t,d])=>(
            <div key={n} style={{background:'#fff',border:'1px solid #E8EEF8',borderRadius:'12px',padding:'24px'}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',fontWeight:500,color:'#2255CC',letterSpacing:'1px',marginBottom:'14px'}}>{n} —</div>
              <div style={{fontSize:'14px',fontWeight:600,color:'#1A3A6B',marginBottom:'8px',lineHeight:1.3}}>{t}</div>
              <div style={{fontSize:'12px',fontWeight:300,color:'#5C7A9E',lineHeight:1.65}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CHALLENGE PLANS */}
      <div id="plans" style={{padding:'64px 48px',background:'#fff',borderBottom:'1px solid #E8EEF8'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{width:'28px',height:'2px',background:'#2255CC',borderRadius:'1px'}}/>
          <span style={{fontSize:'10px',fontWeight:700,color:'#2255CC',letterSpacing:'2.5px',textTransform:'uppercase'}}>Challenge plans</span>
        </div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'36px',fontWeight:700,color:'#1A3A6B',letterSpacing:'-0.4px',marginBottom:'32px'}}>
          Pick your <span style={{color:'#2255CC',fontStyle:'italic'}}>account size.</span>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(products.length||3,4)},1fr)`,gap:'16px'}}>
          {(products.length ? products : [
            {id:'1',name:'Starter',account_size:25000,price_usd:199,ph1_profit_target:8,ph1_daily_dd:5,funded_profit_split:80},
            {id:'2',name:'Professional',account_size:100000,price_usd:549,ph1_profit_target:10,ph1_daily_dd:5,funded_profit_split:85},
            {id:'3',name:'Elite',account_size:200000,price_usd:999,ph1_profit_target:10,ph1_daily_dd:5,funded_profit_split:90},
          ]).map((p:any, i:number) => {
            const featured = i === 1
            return (
              <div key={p.id} style={{border: featured ? '2px solid #2255CC' : '1.5px solid #E8EEF8',borderRadius:'12px',padding:'26px',background: featured ? '#F0F5FF' : '#fff',position:'relative'}}>
                {featured && <div style={{position:'absolute',top:'-1px',right:'20px',background:'#2255CC',color:'#fff',fontSize:'9px',fontWeight:700,padding:'4px 12px',borderRadius:'0 0 8px 8px',letterSpacing:'1px',textTransform:'uppercase'}}>Most popular</div>}
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:'32px',fontWeight:700,color:'#1A3A6B',marginBottom:'2px'}}>${(p.account_size/1000).toFixed(0)}K</div>
                <div style={{fontSize:'11px',fontWeight:600,color:'#8FA3BF',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'16px'}}>{p.name}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'30px',fontWeight:500,color:'#2255CC',marginBottom:'2px'}}>${p.price_usd}</div>
                <div style={{fontSize:'11px',color:'#8FA3BF',marginBottom:'20px'}}>One-time · no subscriptions</div>
                <div style={{height:'1px',background:'#E8EEF8',marginBottom:'16px'}}/>
                {[['Phase 1 target',`${p.ph1_profit_target}%`],['Daily drawdown',`${p.ph1_daily_dd}%`],['Profit split',`${p.funded_profit_split}%`]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',fontSize:'12px'}}>
                    <span style={{color:'#5C7A9E'}}>{l}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:'#1A3A6B'}}>{v}</span>
                  </div>
                ))}
                <button onClick={() => navigate(`/checkout?product=${p.id}`)} style={{width:'100%',padding:'11px',fontSize:'11px',fontWeight:600,letterSpacing:'0.5px',borderRadius:'8px',cursor:'pointer',border:'none',marginTop:'18px',background: featured ? '#2255CC' : '#F4F7FD',color: featured ? '#fff' : '#1A3A6B',transition:'all .2s'}}>
                  Get started
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" style={{padding:'64px 48px',background:'#F4F7FD',borderBottom:'1px solid #E8EEF8'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{width:'28px',height:'2px',background:'#2255CC',borderRadius:'1px'}}/>
          <span style={{fontSize:'10px',fontWeight:700,color:'#2255CC',letterSpacing:'2.5px',textTransform:'uppercase'}}>Features</span>
        </div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'36px',fontWeight:700,color:'#1A3A6B',letterSpacing:'-0.4px',marginBottom:'36px'}}>
          Everything you need to <span style={{color:'#2255CC',fontStyle:'italic'}}>succeed.</span>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
          {[
            ['Real-time Risk Monitor','Live drawdown tracking, breach alerts, and daily P&L — all updated automatically.'],
            ['CFT Trade Platform','Professional-grade trading terminal with full MT4/MT5 compatibility.'],
            ['Same-day Payouts','Request your profits anytime. Crypto payouts processed within 24 hours.'],
            ['Trade Journal','Log and analyze every trade. Build discipline with structured performance reviews.'],
            ['Affiliate Program','Earn 10% commission on every referral. Track your earnings in real time.'],
            ['24/7 Support','Our team is available around the clock to help with any questions.'],
          ].map(([t,d])=>(
            <div key={t} style={{background:'#fff',border:'1px solid #E8EEF8',borderRadius:'12px',padding:'24px'}}>
              <div style={{width:'36px',height:'36px',background:'#EEF3FF',borderRadius:'8px',marginBottom:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:'12px',height:'12px',background:'#2255CC',borderRadius:'3px'}}/>
              </div>
              <div style={{fontSize:'14px',fontWeight:600,color:'#1A3A6B',marginBottom:'6px'}}>{t}</div>
              <div style={{fontSize:'12px',fontWeight:300,color:'#5C7A9E',lineHeight:1.65}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" style={{padding:'64px 48px',background:'#fff',borderBottom:'1px solid #E8EEF8'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{width:'28px',height:'2px',background:'#2255CC',borderRadius:'1px'}}/>
          <span style={{fontSize:'10px',fontWeight:700,color:'#2255CC',letterSpacing:'2.5px',textTransform:'uppercase'}}>FAQ</span>
        </div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'36px',fontWeight:700,color:'#1A3A6B',letterSpacing:'-0.4px',marginBottom:'36px'}}>
          Common <span style={{color:'#2255CC',fontStyle:'italic'}}>questions.</span>
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',maxWidth:'900px'}}>
          {[
            ['Is there a time limit on challenges?','No. Take as long as you need to reach the profit target while respecting drawdown rules.'],
            ['How are payouts processed?','Payouts are made via cryptocurrency. Once approved, funds arrive within 24 hours.'],
            ['Can I trade any instrument?','Yes — forex, indices, gold, and more. All instruments available on CFT Trade.'],
            ['What happens if I breach?','Your account is locked. You can purchase a new challenge at any time to try again.'],
            ['Is there a free trial?','We do not offer free trials, but our one-time fee is the only cost — no subscriptions.'],
            ['How does the affiliate program work?','Share your referral link and earn 10% commission on every successful challenge purchase.'],
          ].map(([q,a])=>(
            <div key={q} style={{background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:600,color:'#1A3A6B',marginBottom:'6px'}}>{q}</div>
              <div style={{fontSize:'12px',fontWeight:300,color:'#5C7A9E',lineHeight:1.65}}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA FOOTER */}
      <div style={{background:'#1A3A6B',padding:'64px 48px',textAlign:'center'}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'40px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'14px'}}>
          Ready to write your <span style={{color:'#60A5FA',fontStyle:'italic'}}>story?</span>
        </h2>
        <p style={{fontSize:'14px',fontWeight:300,color:'rgba(255,255,255,.5)',marginBottom:'32px'}}>Join 14,000+ funded traders worldwide.</p>
        <button onClick={() => navigate('/login')} style={{fontSize:'13px',fontWeight:600,color:'#1A3A6B',background:'#fff',border:'none',padding:'14px 32px',borderRadius:'8px',cursor:'pointer',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>
          Start your challenge today
        </button>
      </div>

      {/* FOOTER */}
      <div style={{background:'#142D54',padding:'24px 48px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',color:'rgba(255,255,255,.4)'}}>
          The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span>
        </div>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,.25)'}}>© 2026 The Funded Diaries. All rights reserved.</div>
        <div style={{display:'flex',gap:'16px'}}>
          {['Terms','Privacy','Support'].map(l=>(
            <span key={l} style={{fontSize:'11px',color:'rgba(255,255,255,.3)',cursor:'pointer'}}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
