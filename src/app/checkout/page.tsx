import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

const COUNTRIES = [
  'Romania','United Kingdom','United States','Germany','France','Italy','Spain',
  'Netherlands','Belgium','Sweden','Norway','Denmark','Switzerland','Austria',
  'Canada','Australia','New Zealand','Singapore','UAE','Other'
]

function generateLogin() {
  return `TFD${Math.floor(100000 + Math.random() * 900000)}`
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function CheckoutPage() {
  const { profile, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toasts, toast, dismiss } = useToast()
  const productId = searchParams.get('product')
  const paymentStatus = searchParams.get('payment')  // 'success' or 'cancel'

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1|2|3>(1)
  const [placing, setPlacing] = useState(false)
  const [createdAccount, setCreatedAccount] = useState<any>(null)

  // Form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [agree, setAgree] = useState(false)
  const [selectedPlatform] = useState('cft')

  // Affiliate ref code
  const refCode = searchParams.get('ref') ?? localStorage.getItem('tfd_ref_code') ?? null

  useEffect(() => {
    const urlRef = searchParams.get('ref')
    if (urlRef) localStorage.setItem('tfd_ref_code', urlRef)
  }, [])

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setCountry(profile.country ?? '')
    }
    if (session?.user?.email) setEmail(session.user.email)
  }, [profile, session])

  useEffect(() => {
    if (!productId) { navigate('/dashboard/challenges'); return }
    supabase.from('challenge_products').select('*').eq('id', productId).single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/dashboard/challenges'); return }
        setProduct(data)
        setLoading(false)
      })
  }, [productId])

  // Handle return from Stripe
  useEffect(() => {
    if (paymentStatus === 'success' && productId && profile) {
      handleStripeSuccess()
    } else if (paymentStatus === 'cancel') {
      toast('warning','⚠️','Payment Cancelled','Your payment was cancelled. You can try again.')
      setStep(2)
      setLoading(false)
    }
  }, [paymentStatus, profile?.id])

  async function handleStripeSuccess() {
    if (!product || !profile) return
    setLoading(true)

    const login = generateLogin()
    const password = generatePassword()
    const accountNumber = `TFD-${Number(product.account_size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`

    const { error: accErr } = await supabase.from('accounts').insert({
      user_id: profile.id,
      product_id: product.id,
      account_number: accountNumber,
      phase: 'phase1',
      balance: product.account_size,
      equity: product.account_size,
      starting_balance: product.account_size,
      daily_dd_used: 0,
      max_dd_used: 0,
      trading_days: 0,
      platform_login: login,
      server: 'CFT-Live-01',
      status: 'active',
    })

    if (accErr) console.error('Account creation error:', accErr)

    await supabase.from('users').update({
      first_name: firstName || profile.first_name,
      last_name: lastName || profile.last_name,
      country: country || profile.country,
    }).eq('id', profile.id)

    if (refCode) {
      await supabase.rpc('record_affiliate_referral', {
        p_code: refCode,
        p_referred_user_id: profile.id,
        p_referred_email: email,
        p_product_id: product.id,
        p_product_name: product.name,
        p_order_amount: product.price_usd,
      }).catch(() => {})
      localStorage.removeItem('tfd_ref_code')
    }

    setCreatedAccount({ accountNumber, login, password, server: 'CFT-Live-01', balance: product.account_size })
    setLoading(false)
    setStep(3)
  }

  async function proceedToPayment() {
    if (!product || !profile) return
    if (!agree) { toast('warning','⚠️','Required','Please agree to the terms.'); return }
    if (!firstName || !lastName) { toast('warning','⚠️','Required','Please fill in your name.'); return }
    setPlacing(true)

    // Save profile first
    await supabase.from('users').update({ first_name: firstName, last_name: lastName, country }).eq('id', profile.id)

    // Check if Stripe is configured via env var
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!stripeKey || stripeKey === 'pk_test_placeholder') {
      // Stripe not configured — demo mode
      toast('info','💳','Demo Mode','Stripe not configured. Activating account directly.')
      await handleStripeSuccess()
      setPlacing(false)
      return
    }

    // Create Stripe Checkout Session via Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          productId: product.id,
          productName: product.name,
          priceUsd: product.price_usd,
          userId: profile.id,
          userEmail: email,
          successUrl: `${window.location.origin}/checkout?product=${product.id}&payment=success`,
          cancelUrl: `${window.location.origin}/checkout?product=${product.id}&payment=cancel`,
        }
      })
      if (error || !data?.url) throw new Error(error?.message ?? 'No checkout URL')
      window.location.href = data.url
    } catch (err: any) {
      toast('error','❌','Error', err.message ?? 'Could not start payment.')
      setPlacing(false)
    }
  }

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/>
        <div className="text-[11px] text-[var(--text3)]">
          {paymentStatus === 'success' ? 'Activating your account…' : 'Loading…'}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
        {/* Top bar */}
        <div className="border-b border-[var(--bdr)] px-6 py-4 flex items-center justify-between">
          <div className="font-serif text-[16px] font-bold cursor-pointer" onClick={() => navigate('/')}>
            The Funded <span className="text-[var(--gold)]">Diaries</span>
          </div>
          <div className="flex items-center gap-3">
            {[['1','Account Info'],['2','Payment'],['3','Credentials']].map(([n,l]) => (
              <div key={n} className={`flex items-center gap-2 ${Number(n) <= step ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                  Number(n) < step ? 'bg-[var(--gold)] border-[var(--gold)] text-[var(--bg)]' :
                  Number(n) === step ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--dim)] text-[var(--text3)]'
                }`}>{Number(n) < step ? '✓' : n}</div>
                <span className="text-[9px] uppercase tracking-[1px] hidden md:block">{l}</span>
                {n !== '3' && <div className="w-8 h-[1px] bg-[var(--dim)] hidden md:block"/>}
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-[10px] text-[var(--text3)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none">✕ Cancel</button>
        </div>

        <div className="max-w-[1000px] mx-auto px-6 py-10 grid grid-cols-[1fr_320px] gap-8">
          {/* Left */}
          <div>
            {/* Step 1: Account Info */}
            {step === 1 && (
              <div>
                <div className="text-[9px] tracking-[2px] uppercase text-[var(--gold)] font-semibold mb-2">Step 1 of 3</div>
                <h2 className="font-serif text-[24px] font-bold mb-1">Your Information</h2>
                <p className="text-[11px] text-[var(--text2)] mb-8">Confirm your details for the trading account.</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[['First Name', firstName, setFirstName], ['Last Name', lastName, setLastName]].map(([l, v, s]) => (
                    <div key={String(l)}>
                      <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">{String(l)}</label>
                      <input value={String(v)} onChange={e => (s as any)(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] text-[12px] outline-none focus:border-[var(--gold)] transition-colors"/>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Email</label>
                  <input value={email} disabled className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text3)] text-[12px] outline-none cursor-not-allowed"/>
                </div>

                <div className="mb-6">
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Country of Residence</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] text-[12px] outline-none cursor-pointer focus:border-[var(--gold)] transition-colors">
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Platform */}
                <div className="mb-6">
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Trading Platform</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id:'cft', label:'CFT Trade', sub:'Available now', available: true },
                      { id:'mt4', label:'MT4',       sub:'Coming soon',   available: false },
                      { id:'mt5', label:'MT5',       sub:'Coming soon',   available: false },
                    ].map(p => (
                      <div key={p.id} className={`p-3 border text-center transition-all ${
                        p.id === 'cft'
                          ? 'border-[var(--gold)] bg-[rgba(212,168,67,.06)]'
                          : 'border-[var(--dim)] opacity-40'
                      }`}>
                        <div className={`font-mono font-bold text-[13px] mb-1 ${p.id === 'cft' ? 'text-[var(--gold)]' : 'text-[var(--text3)]'}`}>{p.label}</div>
                        <div className="text-[9px] text-[var(--text3)]">{p.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-8">
                  <input type="checkbox" id="agree" checked={agree} onChange={e => setAgree(e.target.checked)}
                    className="mt-[2px] cursor-pointer accent-[var(--gold)]"/>
                  <label htmlFor="agree" className="text-[11px] text-[var(--text2)] cursor-pointer leading-[1.6]">
                    I agree to the <span className="text-[var(--gold)]">Terms & Conditions</span>, <span className="text-[var(--gold)]">Risk Disclosure</span>, and confirm I am 18+.
                  </label>
                </div>

                <button onClick={() => setStep(2)} disabled={!agree || !firstName || !lastName}
                  className="w-full py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div>
                <div className="text-[9px] tracking-[2px] uppercase text-[var(--gold)] font-semibold mb-2">Step 2 of 3</div>
                <h2 className="font-serif text-[24px] font-bold mb-1">Payment</h2>
                <p className="text-[11px] text-[var(--text2)] mb-8">You'll be redirected to Stripe's secure payment page.</p>

                <div className="p-6 border border-[var(--bdr)] bg-[var(--bg2)] mb-6">
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--dim)]">
                    <div className="w-10 h-10 bg-[rgba(212,168,67,.1)] border border-[var(--bdr2)] flex items-center justify-center text-[18px]">💳</div>
                    <div>
                      <div className="font-semibold text-[13px]">Secure Payment via Stripe</div>
                      <div className="text-[10px] text-[var(--text3)]">Credit card, debit card, Apple Pay, Google Pay</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      ['Challenge Fee', `$${product?.price_usd}`],
                      ['Processing Fee', '$0'],
                      ['Total', `$${product?.price_usd}`],
                    ].map(([l,v],i) => (
                      <div key={l} className={`flex justify-between text-[12px] ${i === 2 ? 'font-bold pt-2 border-t border-[var(--dim)] text-[var(--gold)]' : 'text-[var(--text2)]'}`}>
                        <span>{l}</span><span className="font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 mb-6 text-[10px] text-[var(--text3)]">
                  {['256-bit SSL encryption — your card data never touches our servers','Powered by Stripe — trusted by millions of businesses worldwide','One-time payment · No recurring charges · No subscriptions'].map(t => (
                    <div key={t} className="flex items-center gap-2"><span className="text-[var(--green)]">🔒</span>{t}</div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-6 py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text2)] cursor-pointer hover:text-[var(--text)] transition-all">
                    ← Back
                  </button>
                  <button onClick={proceedToPayment} disabled={placing}
                    className="flex-1 py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {placing ? 'Redirecting to Stripe…' : `Pay $${product?.price_usd} Securely →`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Credentials */}
            {step === 3 && createdAccount && (
              <div>
                <div className="text-[9px] tracking-[2px] uppercase text-[var(--green)] font-semibold mb-2">Payment Confirmed ✓</div>
                <h2 className="font-serif text-[24px] font-bold mb-1">Your Trading Account</h2>
                <p className="text-[11px] text-[var(--text2)] mb-6">Save these credentials — your password cannot be recovered.</p>

                <div className="p-5 border border-[var(--gold)] bg-[rgba(212,168,67,.04)] mb-6">
                  <div className="text-[8px] uppercase tracking-[2px] text-[var(--gold)] font-semibold mb-4">CFT Trade Login Details</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Login ID', createdAccount.login],
                      ['Password', createdAccount.password],
                      ['Account Number', createdAccount.accountNumber],
                      ['Server', createdAccount.server],
                      ['Account Size', fmt(createdAccount.balance)],
                      ['Phase', 'Phase 1'],
                    ].map(([l,v]) => (
                      <div key={l} className="bg-[var(--bg3)] border border-[var(--dim)] p-3">
                        <div className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] mb-1">{l}</div>
                        <div className="font-mono text-[12px] font-bold text-[var(--gold)] break-all">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border border-[rgba(255,180,0,.2)] bg-[rgba(255,180,0,.04)] mb-6">
                  <div className="text-[10px] text-[var(--gold)] font-semibold mb-1">⚠️ Save your credentials now</div>
                  <div className="text-[10px] text-[var(--text2)]">Your password is shown only once. Screenshot or copy it now before continuing.</div>
                </div>

                <div className="p-4 border border-[var(--bdr)] bg-[var(--bg2)] mb-6">
                  <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold mb-3">Next Steps</div>
                  {[
                    ['1', 'Save credentials', 'Copy and store the login details above securely.'],
                    ['2', 'Open Trading Platform', 'Go to Dashboard → Trading Platform and select your new account.'],
                    ['3', 'Start Trading', 'Begin Phase 1 — hit your profit target to get funded.'],
                  ].map(([n, t, d]) => (
                    <div key={n} className="flex gap-3 mb-3 last:mb-0">
                      <div className="w-5 h-5 bg-[rgba(212,168,67,.1)] border border-[var(--bdr2)] flex items-center justify-center text-[9px] font-bold text-[var(--gold)] flex-shrink-0">{n}</div>
                      <div><div className="text-[11px] font-semibold mb-[2px]">{t}</div><div className="text-[10px] text-[var(--text3)]">{d}</div></div>
                    </div>
                  ))}
                </div>

                <button onClick={() => navigate('/dashboard')}
                  className="w-full py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all">
                  Go to Dashboard →
                </button>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="border border-[var(--bdr)] bg-[var(--bg2)] p-5 sticky top-6">
              <div className="text-[8px] uppercase tracking-[2px] text-[var(--text3)] font-semibold mb-4">Order Summary</div>
              <div className="font-serif text-[28px] font-bold text-[var(--gold)] mb-1">
                ${product ? Number(product.account_size)/1000 : 0}K
              </div>
              <div className="text-[11px] text-[var(--text2)] mb-1">{product?.name} Challenge</div>
              <div className="text-[9px] text-[var(--text3)] mb-5">{product?.challenge_type === '1step' ? '1-Step' : product?.challenge_type === 'instant' ? 'Instant' : '2-Step'} Challenge</div>

              <div className="flex flex-col gap-2 pb-4 mb-4 border-b border-[var(--dim)]">
                {product && [
                  ['Phase 1 Target', `${product.ph1_profit_target}%`],
                  ['Daily Drawdown', `${product.ph1_daily_dd}%`],
                  ['Max Drawdown', `${product.ph1_max_dd}%`],
                  ['Profit Split', `${product.funded_profit_split}%`],
                  ['Platform', 'CFT Trade'],
                ].map(([l,v]) => (
                  <div key={l} className="flex justify-between text-[10px]">
                    <span className="text-[var(--text3)]">{l}</span>
                    <span className="font-mono text-[var(--gold)]">{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-semibold">Total Due</span>
                <span className="font-mono text-[18px] font-bold text-[var(--gold)]">${product?.price_usd}</span>
              </div>

              <div className="text-[9px] text-[var(--text3)] leading-[1.6]">
                One-time fee. No subscriptions. No hidden charges. 30-day challenge validity.
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
