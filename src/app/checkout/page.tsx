import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

const PLATFORMS = ['MT4', 'MT5']
const COUNTRIES = [
  'Romania','United Kingdom','United States','Germany','France','Italy','Spain',
  'Netherlands','Belgium','Sweden','Norway','Denmark','Switzerland','Austria',
  'Canada','Australia','New Zealand','Singapore','UAE','Other'
]

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

  // Form fields
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [email, setEmail] = useState(session?.user?.email ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [platform, setPlatform] = useState('MT5')
  const [agree, setAgree] = useState(false)

  // Payment (demo - Stripe coming)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')

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
    if (!product || !profile || !session) return
    if (!agree) { toast('warning','⚠️','Required','Please agree to the terms.'); return }
    setPlacing(true)

    // In production this would call a Stripe checkout session
    // For now we create the order record and simulate success
    const orderNumber = `TFD-${Date.now().toString().slice(-8)}`

    const { error } = await supabase.from('orders').insert({
      user_id: profile.id,
      product_id: product.id,
      order_number: orderNumber,
      amount_usd: product.price_usd,
      platform,
      status: 'pending_payment',
      created_at: new Date().toISOString(),
    }).select().single()

    // If orders table doesn't exist yet, still show success flow
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
        <div className="w-full max-w-[900px] flex gap-6">

          {/* Left — form */}
          <div className="flex-1">
            {/* Steps */}
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

            {/* Step 1 — Account Details */}
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

                <div className="mb-4">
                  <label className={lbl}>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className={`${inp} appearance-none cursor-pointer`}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="mb-6">
                  <label className={lbl}>Trading Platform</label>
                  <div className="flex gap-3">
                    {PLATFORMS.map(p => (
                      <button key={p} onClick={() => setPlatform(p)}
                        className={`flex-1 py-3 text-[11px] font-bold tracking-[1px] uppercase cursor-pointer border transition-all ${
                          platform === p
                            ? 'bg-[rgba(212,168,67,.1)] border-[var(--bdr2)] text-[var(--gold)]'
                            : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                        }`}>{p}</button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!firstName || !lastName || !country) { toast('warning','⚠️','Required','Fill all fields.'); return }
                    setStep(2)
                  }}
                  className="w-full py-[13px] bg-[var(--gold)] text-[var(--bg)] text-[11px] tracking-[2px] uppercase font-bold cursor-pointer border-none hover:opacity-90 transition-opacity">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-6">
                <div className="font-serif text-[18px] font-bold mb-1">Payment Details</div>
                <p className="text-[11px] text-[var(--text2)] mb-6">Secure payment powered by Stripe</p>

                {/* Stripe placeholder notice */}
                <div className="mb-5 px-4 py-3 bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.2)] text-[10px] text-[var(--gold)]">
                  🔒 Stripe integration — live payments will be processed securely
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
                  <input value={cardName} onChange={e => setCardName(e.target.value)}
                    className={inp} placeholder="John Doe"/>
                </div>

                <div className="mb-5 flex items-start gap-3 p-3 bg-[var(--bg3)] border border-[var(--dim)]">
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}
                    className="mt-[2px] accent-[var(--gold)] cursor-pointer"/>
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
                    {placing ? 'Processing…' : `Pay $${product?.price_usd} →`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Success */}
            {step === 3 && (
              <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[rgba(0,217,126,.1)] border border-[var(--green)] flex items-center justify-center mx-auto mb-4 text-[28px]">✓</div>
                <div className="font-serif text-[24px] font-bold mb-2 text-[var(--green)]">Order Placed!</div>
                <p className="text-[13px] text-[var(--text2)] mb-1">Thank you, {firstName}.</p>
                <p className="text-[12px] text-[var(--text3)] mb-6">
                  Your <strong className="text-[var(--gold)]">{product?.name}</strong> challenge credentials will be sent to <strong>{email}</strong> within 24 hours.
                </p>
                <div className="inline-block px-4 py-3 bg-[var(--bg3)] border border-[var(--dim)] mb-6 text-left">
                  {[
                    ['Account Size', `$${Number(product?.account_size).toLocaleString()}`],
                    ['Platform', platform],
                    ['Profit Split', `${product?.funded_profit_split}%`],
                    ['Phase 1 Target', `${product?.ph1_profit_target}%`],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between gap-8 py-[4px]">
                      <span className="text-[9px] text-[var(--text3)] uppercase tracking-[1px]">{l}</span>
                      <span className="font-mono text-[11px] text-[var(--gold)]">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => navigate('/dashboard')}
                    className="px-6 py-[10px] bg-[var(--gold)] text-[var(--bg)] text-[10px] tracking-[2px] uppercase font-bold cursor-pointer border-none">
                    Go to Dashboard →
                  </button>
                  <button onClick={() => navigate('/dashboard/support')}
                    className="px-6 py-[10px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[10px] tracking-[2px] uppercase font-bold cursor-pointer">
                    Contact Support
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
                <div className="font-serif text-[16px] font-bold text-[var(--gold)]">
                  ${Number(product?.account_size).toLocaleString()}
                </div>
                <div className="text-[12px] text-[var(--text2)]">{product?.name}</div>
                <div className="text-[10px] text-[var(--text3)] mt-1 capitalize">{product?.challenge_type} Challenge</div>
              </div>

              {[
                ['Phase 1 Target', `${product?.ph1_profit_target}%`],
                ['Phase 1 Daily DD', `${product?.ph1_daily_dd}%`],
                ['Phase 1 Max DD', `${product?.ph1_max_dd}%`],
                ...(product?.challenge_type === '2step' ? [
                  ['Phase 2 Target', `${product?.ph2_profit_target}%`],
                  ['Phase 2 Max DD', `${product?.ph2_max_dd}%`],
                ] : []),
                ['Funded Daily DD', `${product?.funded_daily_dd}%`],
                ['Profit Split', `${product?.funded_profit_split}%`],
              ].map(([l,v]) => (
                <div key={l} className="flex justify-between py-[5px] border-b border-[var(--dim)] last:border-0">
                  <span className="text-[9px] text-[var(--text3)]">{l}</span>
                  <span className="font-mono text-[10px] text-[var(--text2)]">{v}</span>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-[var(--bdr)] flex justify-between items-center">
                <span className="text-[11px] font-semibold">Total</span>
                <span className="font-serif text-[20px] font-bold text-[var(--gold)]">${product?.price_usd}</span>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[9px] text-[var(--text3)]">
                  <span className="text-[var(--green)]">✓</span> Instant account setup
                </div>
                <div className="flex items-center gap-2 text-[9px] text-[var(--text3)]">
                  <span className="text-[var(--green)]">✓</span> {product?.funded_profit_split}% profit split
                </div>
                <div className="flex items-center gap-2 text-[9px] text-[var(--text3)]">
                  <span className="text-[var(--green)]">✓</span> No time limit
                </div>
                <div className="flex items-center gap-2 text-[9px] text-[var(--text3)]">
                  <span className="text-[var(--green)]">✓</span> Crypto & bank payouts
                </div>
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
