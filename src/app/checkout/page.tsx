import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
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
  const [selectedPlatform] = useState('tfd')

  // Address fields
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')

  // Coupon
  const [couponCode, setCouponCode] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponData, setCouponData] = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

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
    if (!product || !profile) { setLoading(false); return }
    setLoading(true)
    try {

    // Calculate inside function to avoid stale closure issues
    const _discountAmount = couponData?._discount ?? 0
    const _finalPrice = Math.max(0, (product?.price_usd ?? 0) - _discountAmount)

    const login = generateLogin()
    const password = generatePassword()
    const accountNumber = `TFD-${Number(product.account_size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`

    // Determine phase based on challenge type
    const isInstant  = product.challenge_type === 'instant'
    const isPayAfter = product.challenge_type === 'payafter'
    const initialPhase  = isInstant ? 'funded' : 'phase1'
    const fundedAt      = isInstant ? new Date().toISOString() : null

    const { error: accErr } = await supabase.from('accounts').insert({
      user_id: profile.id,
      product_id: product.id,
      account_number: accountNumber,
      phase: initialPhase,
      balance: product.account_size,
      equity: product.account_size,
      starting_balance: product.account_size,
      daily_dd_used: 0,
      max_dd_used: 0,
      trading_days: 0,
      platform_login: login,
      server: 'TFD-Live-01',
      status: 'active',
      funded_at: fundedAt,
      drawdown_type: product.drawdown_type ?? 'static',
      trailing_drawdown: product.trailing_drawdown ?? 8,
      // For pay-after-pass: mark as pending activation until they pay activation fee
      payout_locked: isPayAfter ? true : false,
    })

    if (accErr) console.error('Account creation error:', accErr)

    await supabase.from('users').update({
      first_name: firstName || profile.first_name,
      last_name: lastName || profile.last_name,
      country: country || profile.country,
    }).eq('id', profile.id)

    // Create order record
    const orderNum = `TFD-${Date.now().toString().slice(-8)}`
    await supabase.from('orders').insert({
      user_id: profile.id,
      product_id: product.id,
      order_number: orderNum,
      amount_usd: product.price_usd,
      discount_usd: _discountAmount,
      final_amount_usd: _finalPrice,
      coupon_code: couponCode || null,
      status: 'completed',
      payment_method: 'stripe',
      billing_address: address,
      billing_city: city,
      billing_postal: postal,
    })

    // Increment coupon uses
    if (couponCode) {
      try { await supabase.from('coupons').update({ uses_count: (couponData?.uses_count ?? 0) + 1 }).eq('code', couponCode) } catch {}
    }

    // Handle BOGO — create reward record
    if (couponData?.coupon_type === 'bogo' && couponData?.bogo_product_id) {
      try {
        const { data: newAcc } = await supabase.from('accounts').select('id').eq('account_number', accountNumber).single()
        const bogoRewardPayload = {
          coupon_id: couponData.id,
          coupon_code: couponCode,
          user_id: profile.id,
          order_id: orderNum,
          primary_account_id: newAcc?.id ?? null,
          bogo_product_id: couponData.bogo_product_id,
          trigger_type: couponData.bogo_trigger ?? 'immediate',
          status: 'pending',
        }
        await supabase.from('bogo_rewards').insert(bogoRewardPayload)

        // If trigger is immediate — create the second account right now
        if (couponData.bogo_trigger === 'immediate') {
          const { data: bogoProd } = await supabase.from('challenge_products').select('*').eq('id', couponData.bogo_product_id).single()
          if (bogoProd) {
            const bogoLogin    = generateLogin()
            const bogoPassword = generatePassword()
            const bogoSize     = bogoProd.account_size
            const bogoAccNum   = `TFD-${Number(bogoSize)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`
            const { data: bogoAcc } = await supabase.from('accounts').insert({
              user_id: profile.id,
              product_id: bogoProd.id,
              account_number: bogoAccNum,
              phase: bogoProd.challenge_type === 'instant' ? 'funded' : 'phase1',
              balance: bogoSize, equity: bogoSize, starting_balance: bogoSize,
              daily_dd_used: 0, max_dd_used: 0, trading_days: 0,
              platform_login: bogoLogin, server: 'TFD-Live-01', status: 'active',
              drawdown_type: bogoProd.drawdown_type ?? 'static',
              trailing_drawdown: bogoProd.trailing_drawdown ?? 8,
              funded_at: bogoProd.challenge_type === 'instant' ? new Date().toISOString() : null,
            }).select().single()

            if (bogoAcc) {
              // Mark BOGO as completed
              await supabase.from('bogo_rewards')
                .update({ status: 'completed', bogo_account_id: bogoAcc.id, triggered_at: new Date().toISOString() })
                .eq('coupon_code', couponCode).eq('user_id', profile.id).eq('status', 'pending')

              // Add BOGO creds to confirmation email
              const _bogoMsg = `\n\n🎁 BOGO BONUS ACCOUNT:\nAccount: ${bogoAccNum}\nLogin: ${bogoLogin}\nPassword: ${bogoPassword}\nServer: TFD-Live-01`
              console.log('[BOGO] Second account created:', bogoAccNum, _bogoMsg)
            }
          }
        }
      } catch (e) { console.error('[BOGO]', e) }
    }

    if (refCode) {
      try {
        await supabase.rpc('record_affiliate_referral', {
          p_code: refCode,
          p_referred_user_id: profile.id,
          p_referred_email: email,
          p_product_id: product.id,
          p_product_name: product.name,
          p_order_amount: product.price_usd,
        })
      } catch {}
      localStorage.removeItem('tfd_ref_code')
    }

    const creds = { accountNumber, login, password, server: 'TFD-Live-01', balance: product.account_size }
    setCreatedAccount(creds)

    // Send order confirmation email
    await sendEmail('order_confirmation', email || profile.email, {
      first_name:     firstName || profile.first_name,
      order_number:   orderNum ?? accountNumber,
      product_name:   product.name,
      account_size:   Number(product.account_size).toLocaleString(),
      account_number: accountNumber,
      login,
      password,
      server:         'TFD-Live-01',
      amount:         (Number(_finalPrice) || 0).toFixed(2),
      phase:          isInstant ? 'Funded' : isPayAfter ? 'Phase 1 (Pay After Pass)' : 'Phase 1',
    })

    setLoading(false)
    setStep(3)
    } catch (err: any) {
      console.error('[handleStripeSuccess]', err)
      toast('error','❌','Error', 'Something went wrong activating your account. Contact support.')
      setLoading(false)
      setPlacing(false)
    }
  }

  async function applyCoupon() {
    if (!couponInput.trim() || !product || !profile) return
    setCouponLoading(true); setCouponError('')
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code:       couponInput.toUpperCase().trim(),
      p_user_id:    profile.id,
      p_product_id: product.id,
      p_order_usd:  product.price_usd,
    })
    setCouponLoading(false)
    if (error || !data?.valid) {
      setCouponError(data?.error ?? error?.message ?? 'Invalid coupon code.')
      setCouponData(null)
      return
    }
    // Fetch full coupon for display
    const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponInput.toUpperCase().trim()).single()
    setCouponData({ ...coupon, _discount: data.discount_usd ?? 0 })
    setCouponCode(coupon.code)
  }

  function removeCoupon() { setCouponData(null); setCouponCode(''); setCouponInput(''); setCouponError('') }

  const discountAmount = couponData?._discount ?? 0
  const finalPrice = Math.max(0, (product?.price_usd ?? 0) - discountAmount)
  const activationFee = product?.activation_fee ?? 0
  const isInstantProduct  = product?.challenge_type === 'instant'
  const isPayAfterProduct = product?.challenge_type === 'payafter'

  async function proceedToPayment() {
    if (!product || !profile) return
    if (!agree) { toast('warning','⚠️','Required','Please agree to the terms.'); return }
    if (!firstName || !lastName) { toast('warning','⚠️','Required','Please fill in your name.'); return }
    setPlacing(true)

    // Save profile first
    try { await supabase.from('users').update({ first_name: firstName, last_name: lastName, country }).eq('id', profile.id) } catch {}

    // If final price is 0 (100% coupon) — skip payment
    if (finalPrice === 0) {
      await handleStripeSuccess()
      setPlacing(false)
      return
    }

    // Check if Stripe is configured
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    const hasStripe = stripeKey && stripeKey !== 'pk_test_placeholder' && stripeKey.startsWith('pk_')

    if (!hasStripe) {
      // No Stripe — activate directly (demo / internal use)
      toast('info','💳','Processing','Activating your account…')
      await handleStripeSuccess()
      setPlacing(false)
      return
    }

    // Try Stripe via Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          productId:   product.id,
          productName: product.name,
          priceUsd:    finalPrice,
          userId:      profile.id,
          userEmail:   email || session?.user?.email,
          successUrl:  `${window.location.origin}/checkout?product=${product.id}&payment=success`,
          cancelUrl:   `${window.location.origin}/checkout?product=${product.id}&payment=cancel`,
        }
      })

      if (error) {
        console.error('[checkout] Edge function error:', error)
        throw new Error(error.message ?? 'Payment service unavailable')
      }

      if (!data?.url) {
        console.error('[checkout] No URL in response:', data)
        throw new Error('No checkout URL returned from payment service')
      }

      // Redirect to Stripe
      window.location.href = data.url

    } catch (err: any) {
      console.error('[checkout] Stripe error:', err)
      const msg = err?.message ?? 'Could not connect to payment service'
      toast('error','❌','Payment Error', msg)
      setPlacing(false)
    }
  }

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F0F4FB]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin"/>
        <div className="text-[11px] text-[#8FA3BF]">
          {paymentStatus === 'success' ? 'Activating your account…' : 'Loading…'}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="min-h-screen bg-[#F0F4FB] text-[#1A3A6B] font-sans">
        {/* Top bar */}
        <div className="border-b border-[#E8EEF8] px-6 py-4 flex items-center justify-between">
          <div className="font-sans text-[16px] font-bold cursor-pointer" onClick={() => navigate('/')}>
            The Funded <span className="text-[#2255CC]">Diaries</span>
          </div>
          <div className="flex items-center gap-3">
            {[['1','Account Info'],['2','Payment'],['3','Credentials']].map(([n,l]) => (
              <div key={n} className={`flex items-center gap-2 ${Number(n) <= step ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                  Number(n) < step ? 'bg-[#2255CC] border-[#2255CC] text-[#F0F4FB]' :
                  Number(n) === step ? 'border-[#2255CC] text-[#2255CC]' : 'border-[#F0F4FB] text-[#8FA3BF]'
                }`}>{Number(n) < step ? '✓' : n}</div>
                <span className="text-[9px] uppercase tracking-[1px] hidden md:block">{l}</span>
                {n !== '3' && <div className="w-8 h-[1px] bg-[rgba(26,58,107,.06)] hidden md:block"/>}
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/dashboard')} className="text-[10px] text-[#8FA3BF] hover:text-[#1A3A6B] cursor-pointer bg-transparent border-none">✕ Cancel</button>
        </div>

        <div className="max-w-[1000px] mx-auto px-6 py-10 grid grid-cols-[1fr_320px] gap-8">
          {/* Left */}
          <div>
            {/* Step 1: Account Info */}
            {step === 1 && (
              <div>
                <div className="text-[9px] tracking-[2px] uppercase text-[#2255CC] font-semibold mb-2">Step 1 of 3</div>
                <h2 className="font-sans text-[24px] font-bold mb-1">Your Information</h2>
                <p className="text-[11px] text-[#5C7A9E] mb-8">Confirm your details for the trading account.</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[['First Name', firstName, setFirstName], ['Last Name', lastName, setLastName]].map(([l, v, s]) => (
                    <div key={String(l)}>
                      <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">{String(l)}</label>
                      <input value={String(v)} onChange={e => (s as any)(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] transition-colors"/>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Email</label>
                  <input value={email} disabled className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#F0F4FB] text-[#8FA3BF] text-[12px] outline-none cursor-not-allowed"/>
                </div>

                <div className="mb-6">
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Country of Residence</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none cursor-pointer focus:border-[#2255CC] transition-colors">
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Address */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="col-span-3">
                    <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Street Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main Street"
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] transition-colors"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">City</label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="London"
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] transition-colors"/>
                  </div>
                  <div>
                    <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Postal Code</label>
                    <input value={postal} onChange={e => setPostal(e.target.value)} placeholder="SW1A 1AA"
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] transition-colors"/>
                  </div>
                </div>

                {/* Platform */}
                <div className="mb-6">
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Trading Platform</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id:'tfd', label:'TFD Platform', sub:'Available now', available: true },
                      { id:'mt4', label:'MT4',       sub:'Coming soon',   available: false },
                      { id:'mt5', label:'MT5',       sub:'Coming soon',   available: false },
                    ].map(p => (
                      <div key={p.id} className={`p-3 border text-center transition-all ${
                        p.id === 'tfd'
                          ? 'border-[#2255CC] bg-[rgba(34,85,204,.05)]'
                          : 'border-[#F0F4FB] opacity-40'
                      }`}>
                        <div className={` font-bold text-[13px] mb-1 ${p.id === 'tfd' ? 'text-[#2255CC]' : 'text-[#8FA3BF]'}`}>{p.label}</div>
                        <div className="text-[9px] text-[#8FA3BF]">{p.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-8">
                  <input type="checkbox" id="agree" checked={agree} onChange={e => setAgree(e.target.checked)}
                    className="mt-[2px] cursor-pointer accent-[#2255CC]"/>
                  <label htmlFor="agree" className="text-[11px] text-[#5C7A9E] cursor-pointer leading-[1.6]">
                    I agree to the <span className="text-[#2255CC]">Terms & Conditions</span>, <span className="text-[#2255CC]">Risk Disclosure</span>, and confirm I am 18+.
                  </label>
                </div>

                <button onClick={() => setStep(2)} disabled={!agree || !firstName || !lastName}
                  className="w-full py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[#2255CC] text-[#F0F4FB] border-none cursor-pointer hover:bg-[#1A44B0] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div>
                <div className="text-[9px] tracking-[2px] uppercase text-[#2255CC] font-semibold mb-2">Step 2 of 3</div>
                <h2 className="font-sans text-[24px] font-bold mb-1">
                  {isInstantProduct ? '⚡ Instant Funding Payment' : isPayAfterProduct ? '💜 Start Your Evaluation' : 'Payment'}
                </h2>
                <p className="text-[11px] text-[#5C7A9E] mb-6">
                  {isInstantProduct
                    ? 'Pay once and receive your funded account immediately.'
                    : isPayAfterProduct
                    ? 'Pay the upfront evaluation fee. If you pass, you will be charged the activation fee to receive your funded account.'
                    : "You'll be redirected to Stripe's secure payment page."}
                </p>

                {/* Pay After You Pass — fee breakdown */}
                {isPayAfterProduct && activationFee > 0 && (
                  <div className="mb-5 p-4 bg-[rgba(124,58,237,.05)] border border-[rgba(124,58,237,.2)] rounded-lg">
                    <div className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wide mb-3">Payment Structure</div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center py-2 border-b border-[rgba(124,58,237,.1)]">
                        <div>
                          <div className="text-[12px] font-semibold text-[#1A3A6B]">Upfront Fee — Pay now</div>
                          <div className="text-[10px] text-[#8FA3BF]">Required to start the evaluation</div>
                        </div>
                        <span className="font-mono font-bold text-[#2255CC] text-[14px]">${product?.price_usd}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div>
                          <div className="text-[12px] font-semibold text-[#1A3A6B]">Activation Fee — Pay after passing</div>
                          <div className="text-[10px] text-[#8FA3BF]">Charged only if you pass the evaluation</div>
                        </div>
                        <span className="font-mono font-bold text-[#7C3AED] text-[14px]">${activationFee}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 border border-[#E8EEF8] bg-white mb-6">
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#F0F4FB]">
                    <div className="w-10 h-10 bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] flex items-center justify-center text-[18px]">💳</div>
                    <div>
                      <div className="font-semibold text-[13px]">Secure Payment via Stripe</div>
                      <div className="text-[10px] text-[#8FA3BF]">Credit card, debit card, Apple Pay, Google Pay</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[12px] text-[#5C7A9E]">
                      <span>{isPayAfterProduct ? 'Upfront Evaluation Fee' : isInstantProduct ? 'Instant Funding Fee' : 'Challenge Fee'}</span>
                      <span>${product?.price_usd}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[12px] text-[#16A34A]">
                        <span>Discount ({couponCode})</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {couponData?.coupon_type === 'bogo' && (
                      <div className="flex justify-between text-[12px] text-[#D97706]">
                        <span>🎁 BOGO — second account included</span>
                        <span>{couponData?.bogo_trigger === 'immediate' ? 'Created immediately' : couponData?.bogo_trigger === 'on_funded' ? 'When you get funded' : 'After Phase 2'}</span>
                      </div>
                    )}
                    {isPayAfterProduct && activationFee > 0 && (
                      <div className="flex justify-between text-[12px] text-[#7C3AED]">
                        <span>Activation fee (after passing)</span>
                        <span className="italic">${activationFee} — billed later</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[12px] font-bold pt-2 border-t border-[#F0F4FB] text-[#2255CC]">
                      <span>Total due today</span>
                      <span>${(Number(finalPrice) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mb-6 text-[10px] text-[#8FA3BF]">
                  {[
                    '256-bit SSL encryption — your card data never touches our servers',
                    'Powered by Stripe — trusted by millions of businesses worldwide',
                    isPayAfterProduct ? `Activation fee $${activationFee} only charged after successfully passing` : 'One-time payment · No recurring charges · No subscriptions',
                  ].map(t => (
                    <div key={t} className="flex items-center gap-2"><span className="text-[#16A34A]">🔒</span>{t}</div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="px-6 py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[#F4F7FD] border border-[#F0F4FB] text-[#5C7A9E] cursor-pointer hover:text-[#1A3A6B] transition-all">
                    ← Back
                  </button>
                  <button onClick={proceedToPayment} disabled={placing}
                    className="flex-1 py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[#2255CC] text-[#F0F4FB] border-none cursor-pointer hover:bg-[#1A44B0] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {placing
                      ? 'Redirecting to Stripe…'
                      : isInstantProduct
                      ? `⚡ Pay $${(Number(finalPrice)||0).toFixed(2)} & Get Funded →`
                      : isPayAfterProduct
                      ? `💜 Pay $${(Number(finalPrice)||0).toFixed(2)} & Start Evaluation →`
                      : `Pay $${(Number(finalPrice)||0).toFixed(2)} Securely →`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Credentials */}
            {step === 3 && createdAccount && (
              <div>
                <div className="text-[9px] tracking-[2px] uppercase text-[#16A34A] font-semibold mb-2">
                  {isInstantProduct ? '⚡ Funded Immediately ✓' : 'Payment Confirmed ✓'}
                </div>
                <h2 className="font-sans text-[24px] font-bold mb-1">
                  {isInstantProduct ? 'Welcome, Funded Trader!' : 'Your Trading Account'}
                </h2>
                <p className="text-[11px] text-[#5C7A9E] mb-4">
                  {isInstantProduct
                    ? 'Your funded account is active. Save these credentials immediately.'
                    : isPayAfterProduct
                    ? 'Your evaluation account is ready. Pass the challenge to activate your funded account.'
                    : 'Save these credentials — your password cannot be recovered.'}
                </p>

                {/* Pay After Pass reminder */}
                {isPayAfterProduct && activationFee > 0 && (
                  <div className="mb-4 p-3 bg-[rgba(124,58,237,.06)] border border-[rgba(124,58,237,.2)] rounded-lg text-[10px] text-[#7C3AED]">
                    💜 <strong>Pay After You Pass:</strong> Once you hit your profit target, you will be charged the <strong>${activationFee}</strong> activation fee to unlock your funded account.
                  </div>
                )}

                <div className="p-5 border border-[#2255CC] bg-[rgba(34,85,204,.03)] mb-6">
                  <div className="text-[8px] uppercase tracking-[2px] text-[#2255CC] font-semibold mb-4">TFD Platform Login Details</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Login ID', createdAccount.login],
                      ['Password', createdAccount.password],
                      ['Account Number', createdAccount.accountNumber],
                      ['Server', createdAccount.server],
                      ['Account Size', fmt(createdAccount.balance)],
                      ['Phase', isInstantProduct ? 'Funded ✓' : isPayAfterProduct ? 'Phase 1 (Pay After Pass)' : 'Phase 1'],
                    ].map(([l,v]) => (
                      <div key={l} className="bg-[#F4F7FD] border border-[#F0F4FB] p-3">
                        <div className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] mb-1">{l}</div>
                        <div className=" text-[12px] font-bold text-[#2255CC] break-all">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border border-[rgba(255,180,0,.2)] bg-[rgba(255,180,0,.04)] mb-6">
                  <div className="text-[10px] text-[#2255CC] font-semibold mb-1">⚠️ Save your credentials now</div>
                  <div className="text-[10px] text-[#5C7A9E]">Your password is shown only once. Screenshot or copy it now before continuing.</div>
                </div>

                <div className="p-4 border border-[#E8EEF8] bg-white mb-6">
                  <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-3">Next Steps</div>
                  {(isInstantProduct ? [
                    ['1', 'Save credentials', 'Copy and store the login details above securely.'],
                    ['2', 'Open Trading Platform', 'Go to Dashboard → Trading Platform and select your funded account.'],
                    ['3', 'Request Payouts', 'You are already funded — start trading and withdraw profits anytime.'],
                  ] : isPayAfterProduct ? [
                    ['1', 'Save credentials', 'Copy and store the login details above securely.'],
                    ['2', 'Open Trading Platform', 'Go to Dashboard → Trading Platform and select your account.'],
                    ['3', 'Pass the Evaluation', `Hit your profit target. Once you pass, pay the $${activationFee} activation fee to get funded.`],
                  ] : [
                    ['1', 'Save credentials', 'Copy and store the login details above securely.'],
                    ['2', 'Open Trading Platform', 'Go to Dashboard → Trading Platform and select your new account.'],
                    ['3', 'Start Trading', 'Begin Phase 1 — hit your profit target to get funded.'],
                  ]).map(([n, t, d]) => (
                    <div key={n} className="flex gap-3 mb-3 last:mb-0">
                      <div className="w-5 h-5 bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] flex items-center justify-center text-[9px] font-bold text-[#2255CC] flex-shrink-0">{n}</div>
                      <div><div className="text-[11px] font-semibold mb-[2px]">{t}</div><div className="text-[10px] text-[#8FA3BF]">{d}</div></div>
                    </div>
                  ))}
                </div>

                <button onClick={() => navigate('/dashboard')}
                  className="w-full py-[14px] text-[10px] tracking-[2px] uppercase font-bold bg-[#2255CC] text-[#F0F4FB] border-none cursor-pointer hover:bg-[#1A44B0] transition-all">
                  Go to Dashboard →
                </button>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="border border-[#E8EEF8] bg-white p-5 sticky top-6">
              <div className="text-[8px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-4">Order Summary</div>
              <div className="font-sans text-[28px] font-bold text-[#2255CC] mb-1">
                ${product ? Number(product.account_size)/1000 : 0}K
              </div>
              <div className="text-[11px] text-[#5C7A9E] mb-1">{product?.name} Challenge</div>
              <div className="text-[9px] text-[#8FA3BF] mb-5">{product?.challenge_type === '1step' ? '1-Step Challenge' : product?.challenge_type === 'instant' ? '⚡ Instant Funding' : product?.challenge_type === 'payafter' ? '💜 Pay After You Pass' : '2-Step Challenge'}</div>

              <div className="flex flex-col gap-2 pb-4 mb-4 border-b border-[#F0F4FB]">
                {product && [
                  ...(product.challenge_type !== 'instant' ? [['Phase 1 Target', `${product.ph1_profit_target}%`]] : []),
                  ['Daily Drawdown', `${product.ph1_daily_dd}%`],
                  product.drawdown_type === 'trailing'
                    ? ['Trailing DD', `${product.trailing_drawdown ?? 8}% from peak equity`]
                    : ['Max Drawdown', `${product.ph1_max_dd}%`],
                  ['Profit Split', `${product.funded_profit_split}%`],
                  ['Platform', 'TFD Platform'],
                ].map(([l,v]) => (
                  <div key={l} className="flex justify-between text-[10px]">
                    <span className="text-[#8FA3BF]">{l}</span>
                    <span className={`font-mono ${String(l).includes('Trailing') ? 'text-[#D97706]' : 'text-[#2255CC]'}`}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="mb-4">
                <div className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-2">Coupon Code</div>
                {couponData ? (
                  <div className="flex items-center justify-between p-2 bg-[rgba(22,163,74,.06)] border border-[rgba(22,163,74,.2)]">
                    <div>
                      <div className=" font-bold text-[#16A34A] text-[11px]">{couponData.code}</div>
                      <div className="text-[9px] text-[#16A34A]">-{couponData.discount_type==='percent'?`${couponData.discount_value}%`:`$${couponData.discount_value}`} applied</div>
                    </div>
                    <button onClick={removeCoupon} className="text-[#8FA3BF] hover:text-[#DC2626] cursor-pointer bg-transparent border-none text-[14px]">✕</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B]  text-[11px] uppercase outline-none focus:border-[#2255CC] transition-colors"/>
                    <button onClick={applyCoupon} disabled={couponLoading || !couponInput}
                      className="px-3 py-2 bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] text-[#2255CC] text-[9px] font-bold uppercase cursor-pointer hover:bg-[rgba(34,85,204,.2)] transition-colors disabled:opacity-40">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <div className="text-[9px] text-[#DC2626] mt-1">{couponError}</div>}
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-[#16A34A] mb-2">
                  <span>Discount</span>
                  <span className="">-${(Number(discountAmount) || 0).toFixed(2)}</span>
                </div>
              )}

              {isPayAfterProduct && activationFee > 0 && (
                <div className="flex justify-between text-[10px] text-[#7C3AED] mb-2">
                  <span>Activation fee (after passing)</span>
                  <span className="font-mono">${activationFee}</span>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-semibold">
                  {isPayAfterProduct ? 'Due Today (upfront)' : 'Total Due'}
                </span>
                <div className="text-right">
                  {discountAmount > 0 && <div className="text-[10px] text-[#8FA3BF] line-through ">${product?.price_usd}</div>}
                  <span className=" text-[18px] font-bold text-[#2255CC]">${(Number(finalPrice) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[9px] text-[#8FA3BF] leading-[1.6]">
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