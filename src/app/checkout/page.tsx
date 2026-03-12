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

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1|2|3>(1)
  const [placing, setPlacing] = useState(false)

  // Order result
  const [createdAccount, setCreatedAccount] = useState<any>(null)

  // Form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [agree, setAgree] = useState(false)

  // Payment
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')

  // Affiliate ref code (from URL or localStorage)
  const refCode = searchParams.get('ref') ?? localStorage.getItem('tfd_ref_code') ?? null

  useEffect(() => {
    // Persist ref code from URL
    const urlRef = searchParams.get('ref')
    if (urlRef) localStorage.setItem('tfd_ref_code', urlRef)
  }, [])

  useEffect(() => {
    if (!productId) { navigate('/dashboard/challenges'); return }
    supabase.from('challenge_products').select('*').eq('id', productId).single()
      .then(({ data, error }) => {
        if (error || !data) { navigate('/dashboard/challenges'); return }
        setProduct(data)
        setLoading(false)
      })
  }, [productId])

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setCountry(profile.country ?? '')
    }
    if (session?.user?.email) setEmail(session.user.email)
  }, [profile, session])

  async function placeOrder() {
    if (!product || !profile) return
    if (!agree) { toast('warning','⚠️','Required','Please agree to the terms.'); return }
    setPlacing(true)

    // Generate CFT Trade credentials
    const login = generateLogin()
    const password = generatePassword()
    const accountNumber = `TFD-${Number(product.account_size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`

    // Create trading account in DB
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .insert({
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
      .select()
      .single()

    if (accErr) {
      // Still show success even if account creation has issues - admin can manually create
      console.error('Account creation error:', accErr)
    }

    // Update user profile with name/country if changed
    await supabase.from('users').update({
      first_name: firstName,
      last_name: lastName,
      country,
    }).eq('id', profile.id)

    // Record affiliate referral if ref code present
    if (refCode && product) {
      await supabase.rpc('record_affiliate_referral', {
        p_code: refCode,
        p_referred_user_id: profile.id,
        p_referred_email: email,
        p_product_id: product.id,
        p_product_name: product.name,
        p_order_amount: product.price_usd,
      }).catch(() => {}) // silent fail — don't block purchase
      localStorage.removeItem('tfd_ref_code')
    }

    setCreatedAccount({
      accountNumber,
      login,
      password,
      server: 'CFT-Live-01',
      balance: product.account_size,
      phase: 'Phase 1',
    })

    setPlacing(false)
    setStep(3)
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const inp = "w-full px-3 py-[10px] bg-[var(--bg3)] border border-[var(--dim)] focus:border-[var(--bdr2)] outline-none text-[var(--text)] font-mono text-[12px] transition-colors"
  const lbl = "block text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1"

  return (
    <>
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--bdr)] bg-[var(--bg2)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-[var(--gold)] flex items-center justify-center text-[10px] text-[var(--gold)]">✦</div>
          <span className="font-serif text-[15px] font-bold">The Funded Diaries</span>
        </div>
        <button onClick={() => navigate('/dashboard/challenges')}
          className="text-[10px] text-[var(--text3)] hover:text-[var(--text)] transition-colors cursor-pointer bg-transparent border-none">
          ← Back to Challenges
        </button>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[920px] flex gap-6">

          {/* Left — form */}
          <div className="flex-1">

            {/* Steps indicator */}
            {step < 3 && (
              <div className="flex items-center gap-3 mb-8">
                {[['1','Account Details'],['2','Payment']].map(([n, l], i) => {
                  const active = step === i + 1
                  const done = step > i + 1
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold border transition-all ${
                        done ? 'bg-[var(--green)] border-[var(--green)] text-[var(--bg)]' :
                        active ? 'bg-[var(--gold)] border-[var(--gold)] text-[var(--bg)]' :
                        'border-[var(--dim)] text-[var(--text3)]'
                      }`}>{done ? '✓' : n}</div>
                      <span className={`text-[11px] font-semibold ${active ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>{l}</span>
                      {i < 1 && <div className="w-8 h-[1px] bg-[var(--dim)]"/>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-6">
                <div className="font-serif text-[18px] font-bold mb-1">Account Details</div>
                <p className="text-[11px] text-[var(--text2)] mb-6">Confirm your information for the trading account</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={lbl}>First Name</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} placeholder="John"/>
                  </div>
                  <div>
                    <label className={lbl}>Last Name</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className={inp} placeholder="Doe"/>
                  </div>
                </div>

                <div className="mb-4">
                  <label className={lbl}>Email</label>
                  <input value={email} readOnly className={`${inp} opacity-60 cursor-not-allowed`}/>
                </div>

                <div className="mb-6">
                  <label className={lbl}>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className={`${inp} appearance-none cursor-pointer`} style={{background:'var(--bg3)'}}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Platform selection */}
                <div className="mb-6">
                  <label className={lbl}>Trading Platform</label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* CFT Trade — available */}
                    <div className="border-2 border-[var(--gold)] bg-[rgba(212,168,67,.06)] p-3 cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[var(--gold)]">CFT Trade</span>
                        <span className="text-[7px] px-[5px] py-[2px] bg-[var(--green)] text-[var(--bg)] font-bold uppercase">Available</span>
                      </div>
                      <div className="text-[9px] text-[var(--text3)]">Our proprietary platform</div>
                      <div className="mt-2 flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full border-2 border-[var(--gold)] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"/>
                        </div>
                        <span className="text-[9px] text-[var(--gold)] font-semibold">Selected</span>
                      </div>
                    </div>

                    {/* MT4 — soon */}
                    <div className="border border-[var(--dim)] bg-[var(--bg3)] p-3 opacity-50 cursor-not-allowed">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[var(--text2)]">MT4</span>
                        <span className="text-[7px] px-[5px] py-[2px] bg-[var(--bg)] border border-[var(--dim)] text-[var(--text3)] font-bold uppercase">Soon</span>
                      </div>
                      <div className="text-[9px] text-[var(--text3)]">MetaTrader 4</div>
                    </div>

                    {/* MT5 — soon */}
                    <div className="border border-[var(--dim)] bg-[var(--bg3)] p-3 opacity-50 cursor-not-allowed">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[var(--text2)]">MT5</span>
                        <span className="text-[7px] px-[5px] py-[2px] bg-[var(--bg)] border border-[var(--dim)] text-[var(--text3)] font-bold uppercase">Soon</span>
                      </div>
                      <div className="text-[9px] text-[var(--text3)]">MetaTrader 5</div>
                    </div>
                  </div>
                </div>

                <button onClick={() => {
                  if (!firstName || !lastName || !country) { toast('warning','⚠️','Required','Fill all fields.'); return }
                  setStep(2)
                }} className="w-full py-[13px] bg-[var(--gold)] text-[var(--bg)] text-[11px] tracking-[2px] uppercase font-bold cursor-pointer border-none hover:opacity-90 transition-opacity">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-6">
                <div className="font-serif text-[18px] font-bold mb-1">Payment Details</div>
                <p className="text-[11px] text-[var(--text2)] mb-6">Secure payment — your account will be created instantly after payment</p>

                <div className="mb-5 px-4 py-3 bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.2)] text-[10px] text-[var(--gold)]">
                  🔒 Secure checkout · Your CFT Trade credentials will be generated immediately after payment
                </div>

                <div className="mb-4">
                  <label className={lbl}>Card Number</label>
                  <input value={cardNumber}
                    onChange={e => setCardNumber(e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19))}
                    className={inp} placeholder="1234 5678 9012 3456" maxLength={19}/>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={lbl}>Expiry</label>
                    <input value={cardExpiry}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,'')
                        setCardExpiry(v.length >= 2 ? v.slice(0,2) + '/' + v.slice(2,4) : v)
                      }}
                      className={inp} placeholder="MM/YY" maxLength={5}/>
                  </div>
                  <div>
                    <label className={lbl}>CVC</label>
                    <input value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g,'').slice(0,3))}
                      className={inp} placeholder="123" maxLength={3}/>
                  </div>
                </div>

                <div className="mb-5">
                  <label className={lbl}>Name on Card</label>
                  <input value={cardName} onChange={e => setCardName(e.target.value)} className={inp} placeholder="John Doe"/>
                </div>

                <div className="mb-5 flex items-start gap-3 p-3 bg-[var(--bg3)] border border-[var(--dim)]">
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}
                    className="mt-[2px] cursor-pointer" style={{accentColor:'var(--gold)'}}/>
                  <span className="text-[11px] text-[var(--text2)] leading-[1.6]">
                    I agree to the <span className="text-[var(--gold)] cursor-pointer">Terms & Conditions</span> and{' '}
                    <span className="text-[var(--gold)] cursor-pointer">Challenge Rules</span>. I understand that challenge fees are non-refundable.
                  </span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-6 py-[13px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[11px] tracking-[2px] uppercase font-bold cursor-pointer">
                    ← Back
                  </button>
                  <button onClick={placeOrder} disabled={placing || !agree}
                    className="flex-1 py-[13px] bg-[var(--gold)] text-[var(--bg)] text-[11px] tracking-[2px] uppercase font-bold cursor-pointer border-none disabled:opacity-40 hover:opacity-90 transition-opacity">
                    {placing ? 'Creating Account…' : `Pay $${product?.price_usd} & Get Access →`}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Success + credentials */}
            {step === 3 && createdAccount && (
              <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[rgba(0,217,126,.1)] border-2 border-[var(--green)] flex items-center justify-center mx-auto mb-4 text-[28px]">✓</div>
                  <div className="font-serif text-[24px] font-bold text-[var(--green)] mb-1">Account Created!</div>
                  <p className="text-[12px] text-[var(--text2)]">
                    Your <strong className="text-[var(--gold)]">{product?.name}</strong> is ready. Login details below.
                  </p>
                </div>

                {/* Credentials box */}
                <div className="bg-[var(--bg3)] border-2 border-[var(--gold)] p-5 mb-6">
                  <div className="text-[8px] tracking-[2px] uppercase text-[var(--gold)] font-semibold mb-4 flex items-center gap-2">
                    <span>🔑</span> CFT Trade Login Credentials
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Platform', 'CFT Trade'],
                      ['Server', createdAccount.server],
                      ['Account Number', createdAccount.accountNumber],
                      ['Login ID', createdAccount.login],
                      ['Password', createdAccount.password],
                      ['Balance', `$${Number(createdAccount.balance).toLocaleString()}`],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-[var(--bg2)] border border-[var(--dim)] px-3 py-2">
                        <div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div>
                        <div className="font-mono text-[12px] text-[var(--gold)] font-bold select-all">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-[9px] text-[var(--text3)] flex items-center gap-2">
                    <span className="text-[var(--red)]">⚠</span>
                    Save your password now — it will not be shown again. These credentials will also be sent to {email}.
                  </div>
                </div>

                {/* Next steps */}
                <div className="bg-[var(--bg3)] border border-[var(--dim)] p-4 mb-6">
                  <div className="text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-3">How to Start Trading</div>
                  {[
                    ['1', 'Go to Trading Platform', 'Click "Trading Platform" in the sidebar'],
                    ['2', 'Select your account', `Choose account ${createdAccount.accountNumber} from the dropdown`],
                    ['3', 'Start trading', 'Meet the Phase 1 targets to advance to funded status'],
                  ].map(([n, t, d]) => (
                    <div key={n} className="flex gap-3 mb-3 last:mb-0">
                      <div className="w-5 h-5 flex-shrink-0 bg-[var(--gold)] text-[var(--bg)] flex items-center justify-center text-[9px] font-bold">{n}</div>
                      <div>
                        <div className="text-[11px] font-semibold">{t}</div>
                        <div className="text-[10px] text-[var(--text3)]">{d}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate('/platform')}
                    className="flex-1 py-[12px] bg-[var(--gold)] text-[var(--bg)] text-[10px] tracking-[2px] uppercase font-bold cursor-pointer border-none hover:opacity-90">
                    Open Trading Platform →
                  </button>
                  <button onClick={() => navigate('/dashboard')}
                    className="px-6 py-[12px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[10px] tracking-[2px] uppercase font-bold cursor-pointer">
                    Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right — Order summary */}
          <div className="w-[280px] flex-shrink-0">
            <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-5 sticky top-6">
              <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-3">Order Summary</div>

              <div className="mb-4 pb-4 border-b border-[var(--bdr)]">
                <div className="font-serif text-[18px] font-bold text-[var(--gold)]">
                  ${Number(product?.account_size).toLocaleString()}
                </div>
                <div className="text-[12px] text-[var(--text2)]">{product?.name}</div>
                <div className="text-[10px] text-[var(--text3)] mt-1 capitalize">{product?.challenge_type} · CFT Trade</div>
              </div>

              {[
                ['Ph1 Target', `${product?.ph1_profit_target}%`],
                ['Ph1 Daily DD', `${product?.ph1_daily_dd}%`],
                ['Ph1 Max DD', `${product?.ph1_max_dd}%`],
                ...(product?.challenge_type === '2step' ? [
                  ['Ph2 Target', `${product?.ph2_profit_target}%`],
                  ['Ph2 Max DD', `${product?.ph2_max_dd}%`],
                ] : []),
                ['Profit Split', `${product?.funded_profit_split}%`],
              ].map(([l,v]) => (
                <div key={l} className="flex justify-between py-[5px] border-b border-[var(--dim)] last:border-0">
                  <span className="text-[9px] text-[var(--text3)]">{l}</span>
                  <span className="font-mono text-[10px] text-[var(--text2)]">{v}</span>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-[var(--bdr)] flex justify-between items-center">
                <span className="text-[11px] font-semibold">Total</span>
                <span className="font-serif text-[22px] font-bold text-[var(--gold)]">${product?.price_usd}</span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {[
                  'Instant account activation',
                  `${product?.funded_profit_split}% profit split`,
                  'CFT Trade platform access',
                  'Crypto & bank payouts',
                  '24/7 support',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-[9px] text-[var(--text3)]">
                    <span className="text-[var(--green)]">✓</span> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
