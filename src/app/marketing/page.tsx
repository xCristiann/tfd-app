import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const PLANS = [
  {
    name:'Starter', size:'$25,000', price:'$199', popular:false,
    ph1:{ target:'8%', daily:'5%', max:'8%', days:5 },
    ph2:{ target:'5%', daily:'5%', max:'8%', days:5 },
    funded:{ daily:'5%', max:'8%', split:'80%' },
    features:['Proprietary trading platform','Real-time risk dashboard','Same-day crypto payouts','News trading allowed'],
  },
  {
    name:'Professional', size:'$100,000', price:'$549', popular:true,
    ph1:{ target:'10%', daily:'5%', max:'10%', days:5 },
    ph2:{ target:'5%', daily:'5%', max:'10%', days:5 },
    funded:{ daily:'5%', max:'10%', split:'85%' },
    features:['Everything in Starter','Priority support (4h SLA)','Weekly profit snapshots','Dedicated account manager'],
  },
  {
    name:'Elite', size:'$200,000', price:'$999', popular:false,
    ph1:{ target:'10%', daily:'5%', max:'10%', days:5 },
    ph2:{ target:'5%', daily:'5%', max:'10%', days:5 },
    funded:{ daily:'5%', max:'10%', split:'90%' },
    features:['Everything in Professional','90% profit split','VIP support (1h SLA)','Monthly payout guarantee'],
  },
]

const TESTIMONIALS = [
  { q:'"Passed Phase 1 in 11 days. Platform is clean, payout same day. TFD is the real deal."', av:'SK', name:'Sofia Kowalski', detail:'$200K Funded · Withdrawn $35,020' },
  { q:'"Signup to funded in under two weeks. Proprietary platform is faster and cleaner than MT5."', av:'MT', name:'Marcus Thompson', detail:'$100K Funded · Withdrawn $24,174' },
  { q:'"First payout was $19,200. Submitted Sunday, crypto in wallet Monday afternoon."', av:'DM', name:'Daniel Moreira', detail:'$200K Funded · Withdrawn $19,200' },
  { q:'"Best prop firm I\'ve tried. Rules are clear, risk dashboard is transparent, team actually replies."', av:'YC', name:'Yuki Chen', detail:'$25K Funded · Withdrawn $8,400' },
]

const FAQS = [
  ['What is a funded trading account?','A funded account lets you trade using The Funded Diaries\' capital. You keep up to 90% of profits with zero personal risk beyond your challenge fee.'],
  ['How long does the challenge take?','Most traders pass Phase 1 in 7–14 days. There\'s no maximum time limit — take as long as you need.'],
  ['When do I get paid?','Payouts are processed within 24 hours of approval. Crypto (USDT/BTC) typically arrives same day.'],
  ['What instruments can I trade?','Forex, Gold, Indices (NAS100, SPX500, DE40), Crypto (BTC, ETH) — all on our proprietary platform.'],
  ['Is news trading allowed?','Yes. We allow news trading with no time restrictions, unlike most prop firms.'],
  ['What if I breach the rules?','Your challenge is terminated. You can repurchase at a 10% discount. Breached accounts cannot be appealed.'],
]

const LIVE_PAYOUTS = [
  { trader:'Marcus T.', amount:'+$12,840', acct:'Funded' },
  { trader:'Sofia K.',  amount:'+$31,500', acct:'Funded' },
  { trader:'Daniel M.', amount:'+$19,200', acct:'Funded' },
  { trader:'Yuki C.',   amount:'+$8,400',  acct:'Funded' },
  { trader:'Lucia R.',  amount:'+$4,200',  acct:'Funded' },
  { trader:'Tom B.',    amount:'+$6,840',  acct:'Funded' },
]

const HOW_STEPS = [
  { n:'01', title:'Choose Your Challenge', desc:'Select a $25K, $100K, or $200K account. Pay a one-time fee — no subscriptions, no hidden costs.' },
  { n:'02', title:'Pass the Evaluation', desc:'Hit your profit target while respecting daily and maximum drawdown limits. Take your time — no deadline.' },
  { n:'03', title:'Get Funded', desc:'Pass both phases and receive your funded account credentials. Start trading with real capital immediately.' },
  { n:'04', title:'Withdraw Profits', desc:'Request payouts anytime. Crypto payouts processed within 24 hours. Keep up to 90% of every dollar you earn.' },
]

const FEATURES = [
  { ico:'📈', title:'Proprietary Terminal', desc:'Our custom-built platform with real-time charts, advanced order types, and instant execution.' },
  { ico:'🔒', title:'Transparent Risk Rules', desc:'Live drawdown gauges in your dashboard. Know exactly where you stand at every moment.' },
  { ico:'⚡', title:'Same-Day Payouts', desc:'Crypto payouts dispatched within hours of approval. No waiting 5–10 business days.' },
  { ico:'📰', title:'News Trading Allowed', desc:'Trade through economic events without restriction. No blackout windows, no forced closures.' },
  { ico:'🎯', title:'Realistic Targets', desc:'8–10% Phase 1 targets with generous drawdown rules. Built for real traders, not to fail you.' },
  { ico:'💬', title:'Human Support', desc:'Real agents, not bots. Average 2.4h response time. Ticket system with guaranteed SLA.' },
]

export function MarketingPage() {
  const navigate = useNavigate()
  const [faqOpen, setFaqOpen] = useState<number|null>(null)
  const [testIdx, setTestIdx] = useState(0)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const iv = setInterval(() => setTestIdx(i => (i+1) % TESTIMONIALS.length), 5000)
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => { clearInterval(iv); window.removeEventListener('scroll', onScroll) }
  }, [])

  const SectionEyebrow = ({ text }: { text:string }) => (
    <div className="flex items-center gap-3 justify-center mb-4">
      <div className="w-8 h-[1px] bg-[var(--gold)]"/>
      <span className="text-[9px] tracking-[3px] uppercase text-[var(--gold)] font-semibold">{text}</span>
      <div className="w-8 h-[1px] bg-[var(--gold)]"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled?'bg-[rgba(6,6,15,.95)] backdrop-blur-md border-b border-[var(--bdr)]':''}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-[32px] h-[32px] border-[1.5px] border-[var(--gold)] flex items-center justify-center text-[12px] text-[var(--gold)]">✦</div>
            <div>
              <div className="font-serif text-[14px] font-bold leading-[1.15]">The Funded Diaries</div>
              <div className="text-[7px] tracking-[2.5px] uppercase text-[var(--gold)] font-semibold">Write Your Trading Story</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 ml-8 flex-1">
            {[['How It Works','#how'],['Challenge Plans','#plans'],['Payouts','#payouts'],['Features','#features'],['FAQ','#faq']].map(([l,h])=>(
              <a key={l} href={h} className="text-[12px] text-[var(--text2)] hover:text-[var(--gold)] transition-colors font-medium">{l}</a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={()=>navigate('/login')} className="px-[16px] py-[7px] text-[9px] tracking-[1.5px] uppercase font-bold text-[var(--text2)] bg-transparent border border-[var(--bdr2)] hover:text-[var(--gold)] transition-colors cursor-pointer">Sign In</button>
            <button onClick={()=>navigate('/login')} className="px-[16px] py-[7px] text-[9px] tracking-[1.5px] uppercase font-bold text-[var(--bg)] bg-[var(--gold)] hover:bg-[var(--gold2)] transition-colors cursor-pointer border-none">Get Funded →</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-[64px] overflow-hidden" id="home">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{backgroundImage:'linear-gradient(rgba(212,168,67,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(212,168,67,.025) 1px,transparent 1px)',backgroundSize:'48px 48px'}}/>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'radial-gradient(ellipse at 50% 40%,rgba(212,168,67,.06) 0%,transparent 60%)'}}/>

        {/* Live payout badge */}
        <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-[rgba(0,217,126,.06)] border border-[rgba(0,217,126,.18)] mb-8">
          <div className="w-[5px] h-[5px] bg-[var(--green)] rounded-full shadow-[0_0_6px_var(--green)] animate-pulse"/>
          <span className="text-[10px] text-[var(--text2)]">Latest Payout</span>
          <span className="font-mono text-[12px] font-semibold text-[var(--green)]">$12,840.00</span>
          <span className="text-[10px] text-[var(--text3)]">Marcus T. · 2 minutes ago</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 text-center max-w-[780px] px-6">
          <h1 className="font-serif text-[64px] font-bold leading-[1.05] mb-6"
            style={{background:'linear-gradient(135deg,rgba(230,226,248,.95),rgba(212,168,67,.9))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            Every trader<br/>has a <em style={{fontStyle:'italic',WebkitTextFillColor:'var(--gold)'}}>story</em>.<br/>Write yours.
          </h1>
          <p className="text-[16px] text-[var(--text2)] leading-[1.75] max-w-[520px] mx-auto mb-10">
            Trade our capital. Keep up to 90% of profits. Same-day payouts in crypto or wire. Join 14,281 funded traders worldwide.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={()=>navigate('/login')}
              className="px-[32px] py-[14px] text-[10px] tracking-[2px] uppercase font-bold text-[var(--bg)] bg-[var(--gold)] hover:bg-[var(--gold2)] transition-all cursor-pointer border-none shadow-[0_0_30px_rgba(212,168,67,.25)]">
              Start Your Journey →
            </button>
            <button onClick={()=>document.getElementById('how')?.scrollIntoView({behavior:'smooth'})}
              className="px-[32px] py-[14px] text-[10px] tracking-[2px] uppercase font-bold text-[var(--text2)] bg-transparent border border-[var(--bdr2)] hover:bg-[var(--dim)] transition-all cursor-pointer">
              How It Works
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-0 mt-16 border-t border-[var(--bdr)]">
          {[['$4.8M','Total Paid Out'],['14,281','Traders Funded'],['$2M','Max Account Size'],['90%','Max Profit Split'],['24h','Payout Speed']].map(([n,l],i)=>(
            <div key={l} className={`px-[40px] py-[22px] text-center ${i<4?'border-r border-[var(--bdr)]':''}`}>
              <div className="font-serif text-[28px] font-bold text-[var(--gold)]">{n}</div>
              <div className="text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live ticker */}
      <div className="overflow-hidden border-y border-[rgba(0,217,126,.1)] bg-[rgba(0,217,126,.04)] py-[10px]">
        <div className="flex gap-[52px] animate-[marquee_20s_linear_infinite]" style={{width:'max-content'}}>
          {[...LIVE_PAYOUTS,...LIVE_PAYOUTS].map((p,i)=>(
            <div key={i} className="flex items-center gap-[10px] flex-shrink-0">
              <div className="w-[4px] h-[4px] bg-[var(--green)] rounded-full shadow-[0_0_5px_var(--green)]"/>
              <span className="text-[10px] text-[var(--text2)] font-medium">{p.trader}</span>
              <span className="font-mono text-[10px] text-[var(--green)] font-semibold">{p.amount}</span>
              <span className="text-[9px] text-[var(--text3)]">just withdrew</span>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <section id="how" className="py-[88px] px-6 max-w-[1200px] mx-auto">
        <SectionEyebrow text="The Process"/>
        <h2 className="font-serif text-[42px] font-bold text-center mb-3">Simple. Transparent. <em className="text-[var(--gold)] not-italic">Fair.</em></h2>
        <p className="text-[14px] text-[var(--text2)] text-center max-w-[480px] mx-auto mb-14 leading-[1.7]">No tricks, no gotcha rules. Four steps from registration to your first payout.</p>
        <div className="grid grid-cols-4 gap-6">
          {HOW_STEPS.map((s,i)=>(
            <div key={s.n} className="relative">
              {i < HOW_STEPS.length-1 && <div className="absolute top-[20px] left-[calc(50%+30px)] right-[-50%] h-[1px] bg-[var(--bdr)] hidden xl:block"/>}
              <div className="text-center">
                <div className="w-[44px] h-[44px] border border-[var(--bdr2)] bg-[var(--dim)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--gold)] mx-auto mb-4">{s.n}</div>
                <div className="font-serif text-[17px] font-semibold mb-2">{s.title}</div>
                <p className="text-[12px] text-[var(--text2)] leading-[1.7]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Challenge Plans */}
      <section id="plans" className="py-[88px] px-6 bg-[var(--bg2)] border-y border-[var(--bdr)]">
        <div className="max-w-[1200px] mx-auto">
          <SectionEyebrow text="Challenge Plans"/>
          <h2 className="font-serif text-[42px] font-bold text-center mb-3">Choose Your <em className="text-[var(--gold)] not-italic">Account Size</em></h2>
          <p className="text-[14px] text-[var(--text2)] text-center max-w-[480px] mx-auto mb-14 leading-[1.7]">All plans include our full platform, real-time risk monitoring, and same-day payouts.</p>
          <div className="grid grid-cols-3 gap-6">
            {PLANS.map(p=>(
              <div key={p.name} className={`relative flex flex-col border p-[28px] transition-all ${p.popular?'border-[var(--gold)] bg-[rgba(212,168,67,.04)] shadow-[0_0_40px_rgba(212,168,67,.12)]':'border-[var(--bdr)] bg-[var(--bg)]'}`}>
                {p.popular && <div className="absolute -top-[10px] left-1/2 -translate-x-1/2 px-[14px] py-[3px] bg-[var(--gold)] text-[var(--bg)] text-[8px] tracking-[2px] uppercase font-bold">Most Popular</div>}
                <div className="mb-6">
                  <div className="font-serif text-[32px] font-bold text-[var(--gold)] mb-1">{p.size}</div>
                  <div className="text-[11px] text-[var(--text2)]">{p.name} Challenge</div>
                </div>
                <div className="font-serif text-[42px] font-bold mb-1">{p.price}</div>
                <div className="text-[10px] text-[var(--text3)] mb-6">One-time fee · No subscriptions</div>
                <div className="flex flex-col gap-2 mb-6 pb-6 border-b border-[var(--bdr)]">
                  {[['Phase 1',`${p.ph1.target} target · ${p.ph1.daily} daily DD`],['Phase 2',`${p.ph2.target} target · ${p.ph2.daily} daily DD`],[`Profit Split`,p.funded.split]].map(([l,v])=>(
                    <div key={l} className="flex justify-between text-[11px]">
                      <span className="text-[var(--text3)]">{l}</span>
                      <span className="font-mono text-[var(--gold)]">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-[7px] mb-8 flex-1">
                  {p.features.map(f=>(
                    <div key={f} className="flex items-start gap-2 text-[11px] text-[var(--text2)]">
                      <span className="text-[var(--green)] mt-[1px] flex-shrink-0">✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={()=>navigate('/login')}
                  className={`w-full py-[13px] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none transition-all ${p.popular?'bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold2)]':'bg-[var(--bg3)] text-[var(--text)] border border-[var(--bdr2)] hover:bg-[var(--dim)]'}`}>
                  Get {p.name} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Payouts */}
      <section id="payouts" className="py-[88px] px-6 max-w-[1200px] mx-auto">
        <SectionEyebrow text="Recent Payouts"/>
        <h2 className="font-serif text-[42px] font-bold text-center mb-3">Real Traders. <em className="text-[var(--gold)] not-italic">Real Withdrawals.</em></h2>
        <p className="text-[14px] text-[var(--text2)] text-center max-w-[480px] mx-auto mb-14 leading-[1.7]">Every payout is processed and verified. This is a live feed.</p>
        <div className="grid grid-cols-3 gap-4">
          {LIVE_PAYOUTS.map((p,i)=>(
            <div key={i} className="flex items-center gap-4 bg-[var(--bg2)] border border-[var(--bdr)] px-[18px] py-[14px]">
              <div className="w-[36px] h-[36px] bg-[rgba(0,217,126,.1)] border border-[rgba(0,217,126,.2)] flex items-center justify-center font-serif text-[13px] font-bold text-[var(--green)] flex-shrink-0">{p.trader.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[12px]">{p.trader}</div>
                <div className="text-[9px] text-[var(--text3)]">{p.acct} Account</div>
              </div>
              <div className="font-mono text-[16px] font-semibold text-[var(--green)]">{p.amount}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <div className="text-[10px] text-[var(--text3)]">+ 4,812 more payouts processed · <span className="text-[var(--gold)]">$4.8M total</span></div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-[88px] px-6 bg-[var(--bg2)] border-y border-[var(--bdr)]">
        <div className="max-w-[1200px] mx-auto">
          <SectionEyebrow text="Platform Features"/>
          <h2 className="font-serif text-[42px] font-bold text-center mb-3">Built for <em className="text-[var(--gold)] not-italic">Serious Traders</em></h2>
          <p className="text-[14px] text-[var(--text2)] text-center max-w-[480px] mx-auto mb-14 leading-[1.7]">Every detail engineered for performance, transparency, and your success.</p>
          <div className="grid grid-cols-3 gap-5">
            {FEATURES.map(f=>(
              <div key={f.title} className="bg-[var(--bg)] border border-[var(--bdr)] p-[22px] hover:border-[var(--bdr2)] transition-colors">
                <div className="text-[22px] mb-3">{f.ico}</div>
                <div className="font-serif text-[16px] font-semibold mb-2">{f.title}</div>
                <p className="text-[12px] text-[var(--text2)] leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-[88px] px-6 max-w-[1200px] mx-auto" id="testimonials">
        <SectionEyebrow text="Trader Stories"/>
        <h2 className="font-serif text-[42px] font-bold text-center mb-14">What Our <em className="text-[var(--gold)] not-italic">Traders Say</em></h2>
        <div className="grid grid-cols-2 gap-5">
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} className={`bg-[var(--bg2)] border border-[var(--bdr)] border-l-[3px] px-[22px] py-[20px] ${i===testIdx?'border-l-[var(--gold)]':'border-l-[var(--bdr)]'}`}>
              <p className="text-[13px] text-[var(--text2)] italic leading-[1.75] mb-4">{t.q}</p>
              <div className="flex items-center gap-3">
                <div className="w-[32px] h-[32px] rounded-full bg-[rgba(212,168,67,.14)] border border-[var(--bdr2)] flex items-center justify-center font-serif text-[11px] font-bold text-[var(--gold)]">{t.av}</div>
                <div>
                  <div className="text-[12px] font-semibold">{t.name}</div>
                  <div className="text-[9px] text-[var(--text3)]">{t.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-[88px] px-6 bg-[var(--bg2)] border-y border-[var(--bdr)]">
        <div className="max-w-[760px] mx-auto">
          <SectionEyebrow text="FAQ"/>
          <h2 className="font-serif text-[42px] font-bold text-center mb-14">Common <em className="text-[var(--gold)] not-italic">Questions</em></h2>
          <div className="flex flex-col gap-2">
            {FAQS.map((faq,i)=>(
              <div key={i} className="border border-[var(--bdr)] overflow-hidden">
                <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                  className="w-full flex items-center justify-between px-[18px] py-[14px] text-left cursor-pointer bg-transparent border-none hover:bg-[var(--dim)] transition-colors">
                  <span className="font-semibold text-[13px]">{faq[0]}</span>
                  <span className={`text-[var(--gold)] text-[14px] transition-transform ${faqOpen===i?'rotate-45':''}`}>+</span>
                </button>
                {faqOpen===i && (
                  <div className="px-[18px] pb-[14px] text-[12px] text-[var(--text2)] leading-[1.75] border-t border-[var(--dim)]">
                    {faq[1]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-[88px] px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 50% 50%,rgba(212,168,67,.06),transparent 70%)'}}/>
        <div className="relative z-10">
          <div className="font-serif text-[52px] font-bold mb-4">Ready to write your<br/><em className="text-[var(--gold)]">trading story?</em></div>
          <p className="text-[15px] text-[var(--text2)] max-w-[440px] mx-auto mb-10 leading-[1.7]">Join 14,281 traders who have already started. Challenges from $199. No subscriptions.</p>
          <button onClick={()=>navigate('/login')}
            className="px-[44px] py-[16px] text-[11px] tracking-[2px] uppercase font-bold text-[var(--bg)] bg-[var(--gold)] hover:bg-[var(--gold2)] transition-all cursor-pointer border-none shadow-[0_0_40px_rgba(212,168,67,.3)]">
            Start For $199 →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--bdr)] bg-[var(--bg2)] px-6 py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-[26px] h-[26px] border border-[var(--gold)] flex items-center justify-center text-[10px] text-[var(--gold)]">✦</div>
                <span className="font-serif font-bold">The Funded Diaries</span>
              </div>
              <p className="text-[11px] text-[var(--text3)] leading-[1.7]">Empowering traders to write their financial story. Prop trading done right.</p>
            </div>
            {[['Platform',['Dashboard','Trading Terminal','Payouts','Analytics']],['Company',['About Us','Careers','Press','Contact']],['Legal',['Terms of Service','Privacy Policy','Risk Disclosure','Refund Policy']]].map(([h,links]:any)=>(
              <div key={h}>
                <div className="text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-3">{h}</div>
                <div className="flex flex-col gap-2">
                  {links.map((l:string)=><a key={l} href="#" className="text-[11px] text-[var(--text2)] hover:text-[var(--gold)] transition-colors">{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-[var(--bdr)]">
            <div className="text-[10px] text-[var(--text3)]">© 2026 The Funded Diaries. All rights reserved.</div>
            <div className="text-[10px] text-[var(--text3)]">Trading involves substantial risk. Past performance is not indicative of future results.</div>
          </div>
        </div>
      </footer>

      {/* Marquee keyframe injected via style tag */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
    </div>
  )
}
