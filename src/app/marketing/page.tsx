import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const TESTIMONIALS = [
  { q:'"Passed Phase 1 in 11 days. Platform is clean, payout same day. TFD is the real deal."', av:'SK', name:'Sofia Kowalski', detail:'$200K Funded · Withdrawn $35,020' },
  { q:'"Signup to funded in under two weeks. Proprietary platform is faster and cleaner than MT5."', av:'MT', name:'Marcus Thompson', detail:'$100K Funded · Withdrawn $24,174' },
  { q:'"First payout was $19,200. Submitted Sunday, crypto in wallet Monday afternoon."', av:'DM', name:'Daniel Moreira', detail:'$200K Funded · Withdrawn $19,200' },
  { q:'"Best prop firm I\'ve tried. Rules are clear, risk dashboard is transparent, team actually replies."', av:'YC', name:'Yuki Chen', detail:'$25K Funded · Withdrawn $8,400' },
]

const FAQS = [
  ['What is a funded trading account?','A funded account lets you trade using The Funded Diaries\' capital. You keep up to 90% of profits with zero personal risk beyond your challenge fee.'],
  ["How long does the challenge take?","Most traders pass Phase 1 in 7–14 days. There's no maximum time limit — take as long as you need."],
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
  { n:'01', title:'Choose Your Challenge', desc:'Select your account size and challenge type. Pay a one-time fee — no subscriptions, no hidden costs.' },
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

const CAT_LABELS: Record<string,string> = {
  'all':      '⚡ All Plans',
  '1step':    '1 Step',
  '2step':    '2 Step',
  'instant':  '⚡ Instant Funded',
  'pay_after':'💎 Pay After You Pass',
}

const CAT_ORDER = ['all','1step','2step','instant','pay_after']

export function MarketingPage() {
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const isLoggedIn = !!session
  const [faqOpen, setFaqOpen] = useState<number|null>(null)
  const [testIdx, setTestIdx] = useState(0)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    supabase.from('challenge_products').select('*').eq('is_active', true)
      .order('account_size', { ascending: true })
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoadingProducts(false)
      })
  }, [])

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

  // Build categories from actual products
  const availableCats = CAT_ORDER.filter(c =>
    c === 'all' || products.some(p => p.challenge_type === c)
  )
  const filtered = activeCategory === 'all' ? products : products.filter(p => p.challenge_type === activeCategory)

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[rgba(10,10,15,.95)] backdrop-blur border-b border-[var(--bdr)]' : ''}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="font-serif text-[18px] font-bold tracking-tight">
            The Funded <span className="text-[var(--gold)]">Diaries</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[['How It Works','#how'],['Challenge Plans','#plans'],['Payouts','#payouts'],['Features','#features'],['FAQ','#faq']].map(([l,h])=>(
              <a key={l} href={h} className="text-[11px] tracking-[1px] uppercase text-[var(--text2)] hover:text-[var(--gold)] transition-colors no-underline">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button onClick={()=>navigate('/dashboard')} className="px-[16px] py-[8px] text-[9px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all">
                Dashboard →
              </button>
            ) : (
              <>
                <button onClick={()=>navigate('/login')} className="hidden md:block px-[16px] py-[8px] text-[9px] tracking-[2px] uppercase font-bold bg-transparent border border-[var(--bdr2)] text-[var(--text2)] hover:text-[var(--gold)] hover:border-[var(--gold)] cursor-pointer transition-all">Log In</button>
                <button onClick={()=>navigate('/login')} className="px-[16px] py-[8px] text-[9px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all">Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-[64px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(212,168,67,.08)_0%,transparent_60%)]"/>
        <div className="text-center max-w-[760px] relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-[6px] border border-[rgba(212,168,67,.3)] bg-[rgba(212,168,67,.06)] mb-8">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--green)] animate-pulse"/>
            <span className="text-[9px] tracking-[2px] uppercase text-[var(--gold)] font-semibold">14,281 Traders Funded</span>
          </div>
          <h1 className="font-serif text-[64px] md:text-[80px] font-bold leading-[1.05] mb-6">
            Write Your<br/><em className="text-[var(--gold)] not-italic">Trading Story</em>
          </h1>
          <p className="text-[16px] text-[var(--text2)] leading-[1.7] mb-10 max-w-[520px] mx-auto">
            Get funded up to $200,000. Keep up to 90% of your profits. No subscriptions, no hidden fees — just pure trading.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={()=>navigate('/login')} className="px-[28px] py-[14px] text-[10px] tracking-[2.5px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all">
              Start Your Challenge →
            </button>
            <a href="#how" className="px-[28px] py-[14px] text-[10px] tracking-[2.5px] uppercase font-bold bg-transparent border border-[var(--bdr2)] text-[var(--text2)] hover:text-[var(--gold)] hover:border-[var(--gold)] cursor-pointer transition-all no-underline">
              How It Works
            </a>
          </div>
          <div className="flex justify-center gap-8 mt-12">
            {[['$4.8M+','Total Payouts'],['14,281','Traders Funded'],['90%','Max Profit Split'],['24h','Avg Payout Time']].map(([v,l])=>(
              <div key={l} className="text-center">
                <div className="font-serif text-[22px] font-bold text-[var(--gold)]">{v}</div>
                <div className="text-[9px] tracking-[1px] uppercase text-[var(--text3)] mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-[88px] px-6 max-w-[1200px] mx-auto">
        <SectionEyebrow text="How It Works"/>
        <h2 className="font-serif text-[42px] font-bold text-center mb-3">From Challenge to <em className="text-[var(--gold)] not-italic">Funded</em></h2>
        <p className="text-[14px] text-[var(--text2)] text-center max-w-[480px] mx-auto mb-14 leading-[1.7]">Four simple steps between you and a funded trading account.</p>
        <div className="grid grid-cols-4 gap-6">
          {HOW_STEPS.map(s=>(
            <div key={s.n} className="text-center">
              <div className="w-[44px] h-[44px] border border-[var(--bdr2)] bg-[var(--dim)] flex items-center justify-center font-mono text-[11px] font-bold text-[var(--gold)] mx-auto mb-4">{s.n}</div>
              <div className="font-serif text-[17px] font-semibold mb-2">{s.title}</div>
              <p className="text-[12px] text-[var(--text2)] leading-[1.7]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Challenge Plans */}
      <section id="plans" className="py-[88px] px-6 bg-[var(--bg2)] border-y border-[var(--bdr)]">
        <div className="max-w-[1200px] mx-auto">
          <SectionEyebrow text="Challenge Plans"/>
          <h2 className="font-serif text-[42px] font-bold text-center mb-3">Choose Your <em className="text-[var(--gold)] not-italic">Challenge Type</em></h2>
          <p className="text-[14px] text-[var(--text2)] text-center max-w-[560px] mx-auto mb-10 leading-[1.7]">All plans include our proprietary trading platform, real-time risk monitoring, and same-day crypto payouts.</p>

          {loadingProducts ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-[var(--text3)] text-[13px]">No challenge plans available at the moment.</div>
          ) : (
            <>
              {/* Category tabs */}
              {availableCats.length > 1 && (
                <div className="flex justify-center gap-[6px] mb-10 flex-wrap">
                  {availableCats.map(c => (
                    <button key={c} onClick={() => setActiveCategory(c)}
                      className={`px-[16px] py-[7px] text-[9px] tracking-[1.5px] uppercase font-bold cursor-pointer transition-all border ${
                        activeCategory === c
                          ? 'bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]'
                          : 'bg-[var(--bg3)] text-[var(--text2)] border-[var(--bdr2)] hover:border-[var(--gold)] hover:text-[var(--gold)]'
                      }`}>
                      {CAT_LABELS[c] ?? c}
                    </button>
                  ))}
                </div>
              )}

              <div className={`grid gap-6 ${filtered.length === 1 ? 'grid-cols-1 max-w-[400px] mx-auto' : filtered.length === 2 ? 'grid-cols-2 max-w-[800px] mx-auto' : filtered.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {filtered.map((p, i) => {
                  const isPopular = filtered.length > 1 && i === Math.floor(filtered.length / 2)
                  const size = Number(p.account_size)
                  const is2step = p.challenge_type === '2step'
                  const isInstant = p.challenge_type === 'instant'
                  const isPayAfter = p.challenge_type === 'pay_after'

                  return (
                    <div key={p.id} className={`relative flex flex-col border p-[28px] transition-all ${
                      isPopular
                        ? 'border-[var(--gold)] bg-[rgba(212,168,67,.04)] shadow-[0_0_40px_rgba(212,168,67,.12)]'
                        : 'border-[var(--bdr)] bg-[var(--bg)]'
                    }`}>
                      {isPopular && (
                        <div className="absolute -top-[10px] left-1/2 -translate-x-1/2 px-[14px] py-[3px] bg-[var(--gold)] text-[var(--bg)] text-[8px] tracking-[2px] uppercase font-bold whitespace-nowrap">Most Popular</div>
                      )}
                      {isInstant && (
                        <div className="absolute -top-[10px] left-1/2 -translate-x-1/2 px-[14px] py-[3px] bg-[var(--green)] text-[var(--bg)] text-[8px] tracking-[2px] uppercase font-bold whitespace-nowrap">⚡ Instant Access</div>
                      )}
                      {isPayAfter && (
                        <div className="absolute -top-[10px] left-1/2 -translate-x-1/2 px-[14px] py-[3px] bg-[rgba(59,130,246,1)] text-white text-[8px] tracking-[2px] uppercase font-bold whitespace-nowrap">💎 Pay After Passing</div>
                      )}

                      <div className="mb-3">
                        <span className="text-[7px] tracking-[2px] uppercase font-bold px-2 py-1 border border-[var(--dim)] text-[var(--text3)]">
                          {CAT_LABELS[p.challenge_type]?.replace(/^[^\s]+\s/,'') ?? p.challenge_type ?? 'Challenge'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="font-serif text-[32px] font-bold text-[var(--gold)] mb-1">
                          ${size >= 1000 ? `${size/1000}K` : size.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-[var(--text2)]">{p.name}</div>
                      </div>

                      <div className="font-serif text-[38px] font-bold mb-1">${p.price_usd}</div>
                      <div className="text-[10px] text-[var(--text3)] mb-5">
                        {isPayAfter ? 'Fee charged after passing · No upfront cost' : 'One-time fee · No subscriptions'}
                      </div>

                      <div className="flex flex-col gap-[6px] mb-5 pb-5 border-b border-[var(--bdr)]">
                        {isInstant ? (
                          <>
                            <div className="flex justify-between text-[11px]"><span className="text-[var(--text3)]">Daily DD</span><span className="font-mono text-[var(--gold)]">{p.funded_daily_dd}%</span></div>
                            <div className="flex justify-between text-[11px]"><span className="text-[var(--text3)]">Max DD</span><span className="font-mono text-[var(--gold)]">{p.funded_max_dd}%</span></div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-[11px]"><span className="text-[var(--text3)]">Phase 1 Target</span><span className="font-mono text-[var(--gold)]">{p.ph1_profit_target}%</span></div>
                            <div className="flex justify-between text-[11px]"><span className="text-[var(--text3)]">Phase 1 Daily DD</span><span className="font-mono text-[var(--gold)]">{p.ph1_daily_dd}%</span></div>
                            {is2step && <div className="flex justify-between text-[11px]"><span className="text-[var(--text3)]">Phase 2 Target</span><span className="font-mono text-[var(--gold)]">{p.ph2_profit_target}%</span></div>}
                          </>
                        )}
                        <div className="flex justify-between text-[11px]"><span className="text-[var(--text3)]">Profit Split</span><span className="font-mono text-[var(--gold)]">{p.funded_profit_split}%</span></div>
                      </div>

                      <div className="flex flex-col gap-[6px] mb-8 flex-1">
                        {[
                          'Proprietary CFT Trade platform',
                          'Real-time risk dashboard',
                          'Same-day crypto payouts',
                          'News trading allowed',
                          ...(isPopular ? ['Priority support (4h SLA)'] : []),
                          ...(p.funded_profit_split >= 90 ? ['90% profit split'] : []),
                        ].map(f=>(
                          <div key={f} className="flex items-start gap-2 text-[11px] text-[var(--text2)]">
                            <span className="text-[var(--green)] mt-[1px] flex-shrink-0">✓</span>{f}
                          </div>
                        ))}
                      </div>

                      <button onClick={()=>navigate('/login')}
                        className={`w-full py-[13px] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none transition-all ${
                          isPopular
                            ? 'bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold2)]'
                            : 'bg-[var(--bg3)] text-[var(--text)] border border-[var(--bdr2)] hover:bg-[var(--dim)]'
                        }`}>
                        Get {p.name} →
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
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
          <p className="text-[14px] text-[var(--text2)] text-center max-w-[480px] mx-auto mb-14 leading-[1.7]">Every feature designed to give you an edge, not take it away.</p>
          <div className="grid grid-cols-3 gap-6">
            {FEATURES.map(f=>(
              <div key={f.title} className="p-[24px] border border-[var(--bdr)] bg-[var(--bg)] hover:border-[var(--bdr2)] transition-all">
                <div className="text-[28px] mb-4">{f.ico}</div>
                <div className="font-serif text-[16px] font-semibold mb-2">{f.title}</div>
                <p className="text-[12px] text-[var(--text2)] leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-[88px] px-6 max-w-[800px] mx-auto text-center">
        <SectionEyebrow text="Trader Stories"/>
        <h2 className="font-serif text-[42px] font-bold mb-14">What Our <em className="text-[var(--gold)] not-italic">Traders Say</em></h2>
        <div className="relative min-h-[160px]">
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} className={`absolute inset-0 transition-opacity duration-700 flex flex-col items-center ${i===testIdx?'opacity-100':'opacity-0 pointer-events-none'}`}>
              <p className="text-[16px] leading-[1.8] text-[var(--text2)] italic mb-6">{t.q}</p>
              <div className="w-[40px] h-[40px] bg-[rgba(212,168,67,.1)] border border-[var(--bdr2)] flex items-center justify-center font-serif text-[14px] font-bold text-[var(--gold)] mb-3">{t.av}</div>
              <div className="font-semibold text-[13px]">{t.name}</div>
              <div className="text-[10px] text-[var(--green)] mt-1">{t.detail}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-4">
          {TESTIMONIALS.map((_,i)=>(
            <button key={i} onClick={()=>setTestIdx(i)}
              className={`w-[6px] h-[6px] rounded-full cursor-pointer border-none transition-all ${i===testIdx?'bg-[var(--gold)]':'bg-[var(--dim)]'}`}/>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-[88px] px-6 bg-[var(--bg2)] border-y border-[var(--bdr)]">
        <div className="max-w-[720px] mx-auto">
          <SectionEyebrow text="FAQ"/>
          <h2 className="font-serif text-[42px] font-bold text-center mb-14">Common <em className="text-[var(--gold)] not-italic">Questions</em></h2>
          <div className="flex flex-col gap-2">
            {FAQS.map(([q,a],i)=>(
              <div key={i} className="border border-[var(--bdr)] bg-[var(--bg)]">
                <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                  className="w-full px-5 py-4 flex justify-between items-center text-left cursor-pointer bg-transparent border-none text-[var(--text)]">
                  <span className="font-semibold text-[13px]">{q}</span>
                  <span className={`text-[var(--gold)] transition-transform ${faqOpen===i?'rotate-45':''} text-[18px] ml-4 flex-shrink-0`}>+</span>
                </button>
                {faqOpen===i && (
                  <div className="px-5 pb-4 text-[12px] text-[var(--text2)] leading-[1.7]">{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-[88px] px-6 text-center max-w-[600px] mx-auto">
        <SectionEyebrow text="Get Started"/>
        <h2 className="font-serif text-[48px] font-bold mb-4">Ready to Get <em className="text-[var(--gold)] not-italic">Funded?</em></h2>
        <p className="text-[15px] text-[var(--text2)] max-w-[440px] mx-auto mb-10 leading-[1.7]">Join 14,281 traders who have already started. Challenges from $199. No subscriptions.</p>
        <button onClick={()=>navigate('/login')}
          className="px-[32px] py-[16px] text-[10px] tracking-[2.5px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all">
          Start Your Challenge →
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--bdr)] py-[40px] px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-serif text-[16px] font-bold">The Funded <span className="text-[var(--gold)]">Diaries</span></div>
          <div className="text-[10px] text-[var(--text3)]">© 2025 The Funded Diaries. All rights reserved.</div>
          <div className="flex gap-6">
            {['Terms','Privacy','Risk Disclosure'].map(l=>(
              <a key={l} href="#" className="text-[10px] text-[var(--text3)] hover:text-[var(--gold)] no-underline transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
