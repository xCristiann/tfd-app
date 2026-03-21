import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'

export function MarketingPage() {
  const navigate   = useNavigate()
  const { session } = useAuth()
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    supabase.from('challenge_products')
      .select('*').eq('is_active', true).order('account_size')
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  const isLoggedIn = !!session
  const isMobile = useIsMobile()

  const S: Record<string, React.CSSProperties> = {
    page:    { fontFamily:"'Inter',system-ui,sans-serif", background:'#fff', color:'#1A3A6B', minHeight:'100vh' },
    nav:     { height:'64px', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 32px', borderBottom:'none', background:'linear-gradient(135deg, #1A3A8B 0%, #2255CC 100%)', position:'sticky' as const, top:0, zIndex:100 },
    logo:    { fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:700, color:'#1A3A6B', marginRight:'32px', letterSpacing:'-0.3px', textDecoration:'none', flexShrink:0 },
    section: { padding:isMobile?'40px 20px':'72px 48px', borderBottom:'1px solid #E8EEF8' },
    eyebrow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' },
    line:    { width:'28px', height:'2px', background:'#2255CC', borderRadius:'1px' },
    tag:     { fontSize:'10px', fontWeight:700, color:'#2255CC', letterSpacing:'2.5px', textTransform:'uppercase' as const },
    h2:      { fontFamily:"'Playfair Display',serif", fontSize:'36px', fontWeight:700, color:'#1A3A6B', letterSpacing:'-0.4px', marginBottom:'8px' },
    lead:    { fontSize:'14px', fontWeight:300, color:'#5C7A9E', lineHeight:'1.7', marginBottom:'40px', maxWidth:'500px' },
  }

  return (
    <div style={S.page}>

      {/* ── NAV ── */}
      <nav style={{...S.nav, padding: isMobile ? '0 16px' : undefined}}>
        <div style={{maxWidth:'1400px',width:'100%',margin:'0 auto',height:'64px',display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center'}}>
          <a href="/" style={{...S.logo, textDecoration:'none', display:'flex', alignItems:'baseline', gap:'6px'}}>
              <span style={{color:'#F5D878', letterSpacing:'-0.3px'}}>The Funded</span>
              <span style={{color:'#ffffff', fontStyle:'italic'}}>Diaries</span>
            </a>
          {!isMobile && (
            <div style={{display:'flex'}}>
              {[['How It Works','#how'],['Challenge Plans','#plans'],['Payouts','#payouts'],['Features','#features'],['FAQ','/help']].map(([l,h])=>(
                <a key={l} href={h} style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.75)',padding:'0 16px',height:'64px',display:'flex',alignItems:'center',textDecoration:'none',transition:'color .15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.color='#ffffff')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.75)')}>{l}</a>
              ))}
            </div>
          )}
          {isMobile && <div/>}
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',alignItems:'center'}}>
            {isLoggedIn ? (
              <>
                <button onClick={()=>navigate('/dashboard')}
                  style={{fontSize:'12px',fontWeight:600,color:'#1A3A8B',padding:'8px 18px',background:'#ffffff',border:'none',borderRadius:'8px',cursor:'pointer'}}>
                  Dashboard
                </button>
                <button onClick={async()=>{const{supabase}=await import('@/lib/supabase');await supabase.auth.signOut();navigate('/login')}}
                  style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.8)',padding:'8px 16px',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.35)',borderRadius:'8px',cursor:'pointer'}}>
                  Log Out
                </button>
              </>
            ) : (
              <>
                {!isMobile && <button onClick={()=>navigate('/login')} style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.8)',padding:'8px 18px',border:'1.5px solid rgba(255,255,255,0.35)',background:'rgba(255,255,255,0.1)',borderRadius:'8px',cursor:'pointer'}}>Log in</button>}
                <button onClick={()=>navigate('/login')} style={{fontSize:'12px',fontWeight:600,color:'#1A3A8B',padding:'8px 20px',background:'#ffffff',border:'none',borderRadius:'8px',cursor:'pointer'}}>{isMobile ? 'Start' : 'Get started'}</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{padding:isMobile?'40px 20px 48px':'96px 48px 80px', background:'#fff', borderBottom:'1px solid #E8EEF8', maxWidth:'960px', margin:'0 auto'}}>

        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?'36px':'60px',fontWeight:700,color:'#1A3A6B',lineHeight:1.05,letterSpacing:'-0.5px',marginBottom:'20px',maxWidth:'700px'}}>
          Trade our capital.<br/>Keep your <span style={{color:'#2255CC',fontStyle:'italic'}}>profits.</span>
        </h1>
        <p style={{fontSize:'16px',fontWeight:300,color:'#5C7A9E',lineHeight:1.75,marginBottom:'36px',maxWidth:'480px'}}>
          Get funded up to $200,000. Keep up to 90% of your profits. One-time payment — no subscriptions, no recurring fees.
        </p>
        <div style={{display:'flex',gap:'12px',alignItems:'center',marginBottom:'56px'}}>
          <button onClick={()=>navigate('/login')} style={{fontSize:'13px',fontWeight:600,color:'#fff',background:'#2255CC',border:'none',padding:'14px 32px',borderRadius:'8px',cursor:'pointer',boxShadow:'0 4px 16px rgba(34,85,204,.25)'}}>
            Start your challenge
          </button>
          <button onClick={()=>document.getElementById('plans')?.scrollIntoView({behavior:'smooth'})} style={{fontSize:'13px',fontWeight:500,color:'#2255CC',background:'#EEF3FF',border:'none',padding:'14px 24px',borderRadius:'8px',cursor:'pointer'}}>
            View plans
          </button>
        </div>
        <div style={{display:'flex',gap:'0',paddingTop:'32px',borderTop:'1px solid #E8EEF8',flexWrap:'wrap'}}>
          {[['90%','Max split'],['24h','Payout speed'],['$200K','Max account'],['0','Subscriptions']].map(([v,l],i,arr)=>(
            <div key={l} style={{paddingRight:i<arr.length-1?'32px':'0',marginRight:i<arr.length-1?'32px':'0',borderRight:i<arr.length-1?'1px solid #E8EEF8':'none'}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:'28px',fontWeight:700,color:'#1A3A6B'}}>{v}</div>
              <div style={{fontSize:'12px',color:'#8FA3BF',marginTop:'3px',fontWeight:400}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div id="how" style={{...S.section, background:'#F4F7FD'}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          <div style={S.eyebrow}><div style={S.line}/><span style={S.tag}>How it works</span></div>
          <h2 style={S.h2}>From challenge to <span style={{color:'#2255CC',fontStyle:'italic'}}>funded</span> in four steps.</h2>
          <div style={{height:'48px'}}/>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:'16px'}}>
            {[
              ['01','Choose your challenge','Select your account size and pay a one-time fee. No subscriptions, no recurring costs.'],
              ['02','Pass the evaluation','Hit the profit target while respecting drawdown rules. No time pressure.'],
              ['03','Get funded','Receive your funded account credentials and start trading our capital immediately.'],
              ['04','Withdraw profits','Request payouts whenever you want. Crypto delivered within 24 hours.'],
            ].map(([n,t,d])=>(
              <div key={n} style={{background:'#fff',border:'1px solid #E8EEF8',borderRadius:'12px',padding:'28px 24px'}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',fontWeight:500,color:'#2255CC',letterSpacing:'1px',marginBottom:'16px'}}>{n} —</div>
                <div style={{fontSize:'15px',fontWeight:600,color:'#1A3A6B',marginBottom:'10px',lineHeight:1.3}}>{t}</div>
                <div style={{fontSize:'13px',fontWeight:300,color:'#5C7A9E',lineHeight:1.7}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CHALLENGE PLANS ── */}
      <div id="plans" style={{...S.section, background:'#fff'}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          <div style={S.eyebrow}><div style={S.line}/><span style={S.tag}>Challenge plans</span></div>
          <h2 style={S.h2}>Pick your <span style={{color:'#2255CC',fontStyle:'italic'}}>model.</span></h2>
          <p style={{fontSize:'13px',color:'#8FA3BF',marginBottom:'48px'}}>All plans include TFD platform, real-time risk monitoring, and same-day payouts.</p>

          {(() => {
            const groups: Record<string,{label:string,color:string,bg:string,border:string,desc:string}> = {
              '2step':   {label:'2-Step Challenge',     color:'#2255CC',bg:'rgba(34,85,204,.05)', border:'rgba(34,85,204,.15)', desc:'Phase 1 → Phase 2 → Funded. The classic evaluation model.'},
              '1step':   {label:'1-Step Challenge',     color:'#16A34A',bg:'rgba(22,163,74,.05)', border:'rgba(22,163,74,.15)', desc:'Phase 1 → Funded. Faster path with trailing drawdown.'},
              'instant': {label:'⚡ Instant Funding',   color:'#D97706',bg:'rgba(217,119,6,.05)', border:'rgba(217,119,6,.15)', desc:'Pay once and get funded immediately — no evaluation.'},
              'payafter':{label:'💜 Pay After You Pass',color:'#7C3AED',bg:'rgba(124,58,237,.05)',border:'rgba(124,58,237,.15)', desc:'Pay upfront + activation fee only after passing.'},
            }
            const allProducts = (products.length ? products : [
              {id:'1',name:'Starter',account_size:25000,price_usd:125,challenge_type:'2step',ph1_profit_target:8,ph1_daily_dd:5,ph1_max_dd:10,ph1_min_days:5,ph2_profit_target:5,ph2_daily_dd:5,ph2_max_dd:10,funded_profit_split:80,drawdown_type:'static',trailing_drawdown:8,news_trading:true,weekend_holding:true},
              {id:'2',name:'Standard',account_size:50000,price_usd:235,challenge_type:'2step',ph1_profit_target:8,ph1_daily_dd:5,ph1_max_dd:10,ph1_min_days:5,ph2_profit_target:5,ph2_daily_dd:5,ph2_max_dd:10,funded_profit_split:80,drawdown_type:'static',trailing_drawdown:8,news_trading:true,weekend_holding:true},
              {id:'3',name:'Pro',account_size:25000,price_usd:199,challenge_type:'1step',ph1_profit_target:10,ph1_daily_dd:5,ph1_max_dd:10,ph1_min_days:5,funded_profit_split:80,drawdown_type:'trailing',trailing_drawdown:8,news_trading:true,weekend_holding:true},
            ])
            const typeOrder = ['2step','1step','instant','payafter']
            const grouped: Record<string,any[]> = {}
            for (const p of allProducts) {
              const t = p.challenge_type ?? '2step'
              if (!grouped[t]) grouped[t] = []
              grouped[t].push(p)
            }
            return typeOrder.filter(t => grouped[t]?.length > 0).map(type => {
              const g = groups[type]
              const list = grouped[type]
              return (
                <div key={type} style={{marginBottom:'48px'}}>
                  {/* Section header */}
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',paddingBottom:'12px',borderBottom:`2px solid ${g.border}`}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <span style={{fontSize:'18px',fontWeight:700,color:g.color,letterSpacing:'-0.3px'}}>{g.label}</span>
                      <span style={{fontSize:'12px',color:'#8FA3BF',marginTop:'2px'}}>{g.desc}</span>
                    </div>
                  </div>

                  {/* Cards grid */}
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':`repeat(${Math.min(list.length,4)},1fr)`,gap:'16px'}}>
                    {list.map((p:any, i:number) => {
                      const featured = i === 0 && list.length > 1 && type === '2step'
                      return (
                        <div key={p.id} style={{border:featured?`2px solid ${g.color}`:`1.5px solid #E8EEF8`,borderRadius:'12px',padding:'24px 20px',background:featured?g.bg:'#fff',position:'relative'}}>
                          {featured && <div style={{position:'absolute',top:'-1px',right:'16px',background:g.color,color:'#fff',fontSize:'9px',fontWeight:700,padding:'3px 10px',borderRadius:'0 0 6px 6px',letterSpacing:'1px',textTransform:'uppercase'}}>Most popular</div>}

                          {/* DD badge */}
                          {p.drawdown_type==='trailing' && <div style={{display:'inline-block',fontSize:'8px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:'rgba(217,119,6,.08)',color:'#D97706',border:'1px solid rgba(217,119,6,.2)',marginBottom:'8px'}}>⟳ Trailing DD</div>}

                          <div style={{fontFamily:"'Playfair Display',serif",fontSize:'30px',fontWeight:700,color:'#1A3A6B',marginBottom:'2px'}}>${(p.account_size/1000).toFixed(0)}K</div>
                          <div style={{fontSize:'11px',fontWeight:600,color:'#8FA3BF',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'14px'}}>{p.name}</div>

                          {/* Price */}
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'28px',fontWeight:500,color:g.color,marginBottom:'2px'}}>${p.price_usd}</div>
                          {p.activation_fee > 0 && (
                            <div style={{fontSize:'10px',color:'#7C3AED',marginBottom:'2px'}}>+ ${p.activation_fee} activation fee after passing</div>
                          )}
                          <div style={{fontSize:'11px',color:'#8FA3BF',marginBottom:'16px'}}>{type==='instant'?'One-time · instant access':type==='payafter'?'Upfront · + activation if you pass':'One-time · no subscriptions'}</div>
                          <div style={{height:'1px',background:'#E8EEF8',marginBottom:'12px'}}/>

                          {/* Phase 1 */}
                          {type !== 'instant' && (
                            <>
                              <div style={{fontSize:'8px',fontWeight:700,color:g.color,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'6px'}}>{type==='payafter'?'Phase 1':type==='1step'?'Phase 1 → Funded':'Phase 1'}</div>
                              {[
                                ['Profit target', `${p.ph1_profit_target}%`],
                                ['Daily DD', `${p.ph1_daily_dd}%`],
                                p.drawdown_type==='trailing'?['Trailing DD',`${p.trailing_drawdown??8}% from peak equity`]:['Max DD',`${p.ph1_max_dd??10}%`],
                                p.ph1_min_days?['Min days',`${p.ph1_min_days}`]:null,
                              ].filter(Boolean).map(([l,v]:any)=>(
                                <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:'5px',fontSize:'11px'}}>
                                  <span style={{color:'#5C7A9E'}}>{l}</span>
                                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:String(l).includes('Trailing')?'#D97706':'#1A3A6B'}}>{v}</span>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Phase 2 */}
                          {type === '2step' && (
                            <>
                              <div style={{height:'1px',background:'#E8EEF8',margin:'8px 0'}}/>
                              <div style={{fontSize:'8px',fontWeight:700,color:'#16A34A',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'6px'}}>Phase 2</div>
                              {[
                                ['Profit target', `${p.ph2_profit_target??5}%`],
                                ['Daily DD', `${p.ph2_daily_dd??p.ph1_daily_dd}%`],
                                p.drawdown_type==='trailing'?['Trailing DD',`${p.trailing_drawdown??8}% from peak equity`]:['Max DD',`${p.ph2_max_dd??p.ph1_max_dd??10}%`],
                              ].map(([l,v]:any)=>(
                                <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:'5px',fontSize:'11px'}}>
                                  <span style={{color:'#5C7A9E'}}>{l}</span>
                                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:String(l).includes('Trailing')?'#D97706':'#1A3A6B'}}>{v}</span>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Funded */}
                          <div style={{height:'1px',background:'#E8EEF8',margin:'8px 0'}}/>
                          <div style={{fontSize:'8px',fontWeight:700,color:'#D97706',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'6px'}}>Funded</div>
                          {[
                            ['Profit split', `${p.funded_profit_split}%`],
                            ['Daily DD', `${p.funded_daily_dd??p.ph1_daily_dd}%`],
                            p.drawdown_type==='trailing'?['Trailing DD',`${p.trailing_drawdown??8}% from peak equity`]:['Max DD',`${p.funded_max_dd??p.ph1_max_dd??10}%`],
                          ].map(([l,v]:any)=>(
                            <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:'5px',fontSize:'11px'}}>
                              <span style={{color:'#5C7A9E'}}>{l}</span>
                              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:String(l).includes('Trailing')?'#D97706':String(l).includes('split')?'#16A34A':'#1A3A6B'}}>{v}</span>
                            </div>
                          ))}

                          {/* Rules */}
                          <div style={{display:'flex',gap:'5px',marginTop:'10px',flexWrap:'wrap'}}>
                            {p.news_trading&&<span style={{fontSize:'8px',padding:'2px 6px',borderRadius:'20px',background:'rgba(22,163,74,.06)',color:'#16A34A',border:'1px solid rgba(22,163,74,.15)'}}>✓ News</span>}
                            {p.weekend_holding&&<span style={{fontSize:'8px',padding:'2px 6px',borderRadius:'20px',background:'rgba(22,163,74,.06)',color:'#16A34A',border:'1px solid rgba(22,163,74,.15)'}}>✓ Weekend</span>}
                          </div>

                          <button onClick={()=>navigate(`/checkout?product=${p.id}`)}
                            style={{width:'100%',padding:'11px',fontSize:'12px',fontWeight:600,borderRadius:'8px',cursor:'pointer',border:'none',marginTop:'14px',
                              background:type==='payafter'?'#7C3AED':type==='instant'?'#D97706':featured?g.color:'#F4F7FD',
                              color:type==='payafter'||type==='instant'||featured?'#fff':'#1A3A6B',transition:'all .2s'}}>
                            {type==='payafter'?'💜 Start Evaluation →':type==='instant'?'⚡ Get Funded →':'Get started'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}

          {/* Comparison table */}
          <div style={{marginTop:'48px',paddingTop:'40px',borderTop:'1px solid #E8EEF8'}}>
            <div style={S.eyebrow}><div style={S.line}/><span style={S.tag}>Compare models</span></div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'26px',fontWeight:700,color:'#1A3A6B',marginBottom:'24px'}}>Which model is right for you?</h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                <thead>
                  <tr style={{background:'#F8F9FC'}}>
                    <th style={{padding:'12px 16px',textAlign:'left',fontSize:'9px',fontWeight:700,color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1.5px',borderBottom:'2px solid #E8EEF8'}}>Feature</th>
                    {[
                      {label:'2-Step',color:'#2255CC'},
                      {label:'1-Step',color:'#16A34A'},
                      {label:'⚡ Instant',color:'#D97706'},
                      {label:'💜 Pay After',color:'#7C3AED'},
                    ].map(({label,color})=>(
                      <th key={label} style={{padding:'12px 16px',textAlign:'center',fontSize:'11px',fontWeight:700,color,borderBottom:'2px solid #E8EEF8',whiteSpace:'nowrap'}}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Evaluation required',        '✓ 2 phases',  '✓ 1 phase',  '✗ None',        '✓ 1 phase'],
                    ['Pay upfront',                '✓ Yes',       '✓ Yes',      '✓ Yes',          '✓ Yes'],
                    ['Activation fee after pass',  '✗ No',        '✗ No',       '✗ No',           '✓ Yes'],
                    ['Funded immediately',         '✗ No',        '✗ No',       '✓ Yes',          '✗ No'],
                    ['Drawdown type',              'Static',      'Trailing',   'Trailing',        'Trailing'],
                    ['Best for',                   'Disciplined', 'Aggressive', 'Experienced',    'Risk-averse'],
                  ].map(([feat,...vals],ri)=>(
                    <tr key={feat} style={{background:ri%2===0?'#fff':'#F8F9FC'}}>
                      <td style={{padding:'11px 16px',color:'#5C7A9E',fontWeight:500,borderBottom:'1px solid #F0F4FB'}}>{feat}</td>
                      {vals.map((v,vi)=>{
                        const colors=['#2255CC','#16A34A','#D97706','#7C3AED']
                        const isCheck = String(v).startsWith('✓')
                        const isCross = String(v).startsWith('✗')
                        return (
                          <td key={vi} style={{padding:'11px 16px',textAlign:'center',borderBottom:'1px solid #F0F4FB',
                            color:isCheck?colors[vi]:isCross?'#9CA3AF':'#1A3A6B',fontWeight:isCheck?600:400}}>
                            {v}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div id="features" style={{...S.section, background:'#F4F7FD'}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          <div style={S.eyebrow}><div style={S.line}/><span style={S.tag}>Features</span></div>
          <h2 style={S.h2}>Everything you need to <span style={{color:'#2255CC',fontStyle:'italic'}}>succeed.</span></h2>
          <div style={{height:'40px'}}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {[
              ['Real-time Risk Monitor','Live drawdown tracking, breach alerts, and daily P&L updated automatically every 5 seconds.'],
              ['TFD Platform','Professional-grade trading terminal with full MT4/MT5 compatibility across all instruments.'],
              ['Same-day Payouts','Request your profits anytime. Cryptocurrency payouts processed and delivered within 24 hours.'],
              ['Trade Journal','Log and analyze every trade. Build discipline with structured performance reviews and insights.'],
              ['Affiliate Program','Share your referral link and earn 10% commission on every successful challenge purchase.'],
              ['24/7 Support','Our team is available around the clock to help with any questions or issues you encounter.'],
            ].map(([t,d])=>(
              <div key={t} style={{background:'#fff',border:'1px solid #E8EEF8',borderRadius:'12px',padding:'28px 24px'}}>
                <div style={{width:'36px',height:'36px',background:'#EEF3FF',borderRadius:'8px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:'12px',height:'12px',background:'#2255CC',borderRadius:'3px'}}/>
                </div>
                <div style={{fontSize:'15px',fontWeight:600,color:'#1A3A6B',marginBottom:'8px'}}>{t}</div>
                <div style={{fontSize:'13px',fontWeight:300,color:'#5C7A9E',lineHeight:1.7}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAYOUTS ── */}
      <div id="payouts" style={{...S.section, background:'#fff'}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          <div style={S.eyebrow}><div style={S.line}/><span style={S.tag}>Payouts</span></div>
          <h2 style={S.h2}>Real traders, real <span style={{color:'#2255CC',fontStyle:'italic'}}>profits.</span></h2>
          <p style={{...S.lead}}>Join thousands of funded traders who withdraw profits every week.</p>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:'12px'}}>
            {[['AJ','Alex J.','$1,200','TFD-25K'],['MR','Maria R.','$890','TFD-25K'],['DK','David K.','$2,100','TFD-50K'],['ST','Sara T.','$750','TFD-25K']].map(([init,name,amt,acc])=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'10px'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#1A3A6B',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'#fff',flexShrink:0}}>{init}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#1A3A6B'}}>{name}</div>
                  <div style={{fontSize:'11px',color:'#8FA3BF'}}>{acc}</div>
                </div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'16px',fontWeight:500,color:'#16A34A'}}>{amt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div id="faq" style={{...S.section, background:'#F4F7FD'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={S.eyebrow}><div style={S.line}/><span style={S.tag}>FAQ</span></div>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'8px'}}>
            <h2 style={{...S.h2,margin:0}}>Common <span style={{color:'#2255CC',fontStyle:'italic'}}>questions.</span></h2>
            <button onClick={()=>navigate('/help')} style={{fontSize:'12px',fontWeight:600,color:'#2255CC',background:'#EEF3FF',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer'}}>View Help Centre →</button>
          </div>
          <div style={{height:'40px'}}/>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'16px'}}>
            {[
              ['Is there a time limit on challenges?','No. Take as long as you need to reach the profit target while respecting drawdown rules.'],
              ['How are payouts processed?','Payouts are made via cryptocurrency. Once approved, funds arrive within 24 hours.'],
              ['Can I trade any instrument?','Yes — forex, indices, gold, and more. All instruments available on TFD Platform.'],
              ['What happens if I breach?','Your account is locked. You can purchase a new challenge at any time to try again.'],
              ['Is there a free trial?','We do not offer free trials, but our one-time fee is the only cost — no subscriptions ever.'],
              ['How does the affiliate program work?','Share your referral link and earn 10% commission on every successful challenge purchase.'],
            ].map(([q,a])=>(
              <div key={q} style={{background:'#fff',border:'1px solid #E8EEF8',borderRadius:'10px',padding:'22px 24px'}}>
                <div style={{fontSize:'14px',fontWeight:600,color:'#1A3A6B',marginBottom:'8px'}}>{q}</div>
                <div style={{fontSize:'13px',fontWeight:300,color:'#5C7A9E',lineHeight:1.7}}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{padding:'80px 48px',background:'#1A3A6B',textAlign:'center'}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'44px',fontWeight:700,color:'#fff',letterSpacing:'-0.5px',marginBottom:'16px'}}>
          Ready to write your <span style={{color:'#60A5FA',fontStyle:'italic'}}>story?</span>
        </h2>
        <p style={{fontSize:'15px',fontWeight:300,color:'rgba(255,255,255,.5)',marginBottom:'36px'}}>Start your funded trading journey today.</p>
        <button onClick={()=>navigate('/login')} style={{fontSize:'14px',fontWeight:600,color:'#1A3A6B',background:'#fff',border:'none',padding:'16px 40px',borderRadius:'8px',cursor:'pointer',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>
          Start your challenge today
        </button>
      </div>

      {/* ── DISCLAIMER ── */}
      <div style={{background:'#0D1F42',padding:'32px 48px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={{fontSize:'9px',fontWeight:700,color:'rgba(255,255,255,.25)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'12px'}}>Risk Disclaimer</div>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,.2)',lineHeight:'1.8',margin:'0 0 10px'}}>
            Trading foreign exchange, contracts for difference (CFDs), and other financial instruments on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite. There is a possibility that you may sustain a loss of some or all of your initial investment and, therefore, you should not invest money that you cannot afford to lose.
          </p>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,.2)',lineHeight:'1.8',margin:'0 0 10px'}}>
            The Funded Diaries is a proprietary trading firm that provides simulated trading capital to qualified traders through an evaluation process. All trading activity conducted through The Funded Diaries platform is carried out on simulated accounts. Payouts are made from the firm's own funds based on simulated trading performance and are not derived from client investments or real market exposure. Past performance of any trader or trading system is not necessarily indicative of future results.
          </p>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,.2)',lineHeight:'1.8',margin:'0'}}>
            The information provided on this website is for informational purposes only and does not constitute financial, investment, or trading advice. The Funded Diaries does not accept clients from jurisdictions where such services are restricted or prohibited by local law. It is the sole responsibility of the user to ensure compliance with applicable laws and regulations in their jurisdiction. By accessing this website, you acknowledge that you have read, understood, and agreed to this disclaimer in its entirety.
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{background:'#0A1628',padding:'20px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid rgba(255,255,255,.04)'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',color:'rgba(255,255,255,.4)'}}>The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span></div>
        <div style={{fontSize:'10px',color:'rgba(255,255,255,.2)'}}>© {new Date().getFullYear()} The Funded Diaries. All rights reserved.</div>
        <div style={{display:'flex',gap:'20px'}}>
          <a href="/terms" style={{fontSize:'11px',color:'rgba(255,255,255,.35)',cursor:'pointer',textDecoration:'none'}}>Terms</a>
            <a href="/privacy" style={{fontSize:'11px',color:'rgba(255,255,255,.35)',cursor:'pointer',textDecoration:'none'}}>Privacy</a>
            <a href="mailto:support@thefundeddiaries.com" style={{fontSize:'11px',color:'rgba(255,255,255,.35)',cursor:'pointer',textDecoration:'none'}}>Support</a>
        </div>
      </div>

    </div>
  )
}