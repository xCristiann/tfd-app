import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt, formatDate } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'
import { sendEmail } from '@/lib/email'

function randomCode(len = 8) {
  return Array.from({ length: len }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
}
function generateLogin()    { return `TFD${Math.floor(100000 + Math.random() * 900000)}` }
function generatePassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

const EMPTY_FORM: any = {
  coupon_type: 'discount',
  code: '',
  discount_type: 'percent',
  discount_value: '',
  max_uses: '',
  one_per_account: false,
  single_use: false,
  expires_at: '',
  description: '',
  min_order_usd: '',
  product_id: '',
  // BOGO fields
  bogo_product_id: '',
  bogo_trigger: 'immediate',
  bogo_discount_type: 'percent',
  bogo_discount_value: '100',
  bogo_primary_discount_type: 'percent',
  bogo_primary_discount_value: '0',
}

const BOGO_TRIGGERS = [
  { value: 'immediate',  label: 'Immediately',          desc: 'Second account created right after purchase' },
  { value: 'on_funded',  label: 'When primary is Funded', desc: 'Second account created when trader passes & gets funded' },
  { value: 'on_phase2',  label: 'When Phase 2 passed',   desc: 'Second account created after passing Phase 2' },
]

function PrimaryAccountPhase({ userId, triggerType }: { userId: string, triggerType: string }) {
  const [bestPhase, setBestPhase] = useState<string|null>(null)
  useEffect(() => {
    if (!userId) return
    // Check all accounts for this user — advancePhase creates new accounts per phase
    supabase.from('accounts').select('phase')
      .eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => {
        const phases = data?.map((a:any) => a.phase) ?? []
        // Find best phase achieved
        const order = ['funded','passed','phase2','phase1']
        const best = order.find(p => phases.includes(p)) ?? phases[0] ?? null
        setBestPhase(best)
      })
  }, [userId])
  if (!bestPhase) return null
  const needed = triggerType === 'on_funded' ? 'funded' : 'phase2'
  const ok = triggerType === 'on_funded'
    ? (bestPhase === 'funded' || bestPhase === 'passed')
    : (bestPhase === 'phase2' || bestPhase === 'funded' || bestPhase === 'passed')
  return (
    <div className={`text-[9px] mt-0.5 font-semibold ${ok ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
      {ok ? `✓ Best phase: ${bestPhase}` : `⏳ Best phase: ${bestPhase} (needs ${needed})`}
    </div>
  )
}

export function AdminCouponsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [coupons, setCoupons]     = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [bogoRewards, setBogoRewards] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [filter, setFilter]       = useState('all')
  const [tab, setTab]             = useState<'coupons'|'bogo'>('coupons')
  const [usageModal, setUsageModal] = useState<any>(null)
  const [usages, setUsages]       = useState<any[]>([])
  const [form, setForm]           = useState<any>({ ...EMPTY_FORM, code: randomCode() })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cps }, { data: prods }, { data: bogo }] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('challenge_products').select('id, name, account_size, challenge_type').eq('is_active', true).order('account_size'),
      supabase.from('bogo_rewards').select('*, users(first_name,last_name,email), bogo_product:bogo_product_id(name,account_size)').order('created_at', { ascending: false }).limit(100),
    ])
    setCoupons(cps ?? [])
    setProducts(prods ?? [])
    setBogoRewards(bogo ?? [])
    setLoading(false)
  }

  const F = (k: string) => (e: any) =>
    setForm((f: any) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function openCreate() {
    setForm({ ...EMPTY_FORM, code: randomCode() })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(c: any) {
    setForm({
      coupon_type: c.coupon_type ?? 'discount',
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      max_uses: c.max_uses ? String(c.max_uses) : '',
      one_per_account: c.one_per_account ?? false,
      single_use: c.single_use ?? false,
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
      description: c.description ?? '',
      min_order_usd: c.min_order_usd ? String(c.min_order_usd) : '',
      product_id: c.product_id ?? '',
      bogo_product_id: c.bogo_product_id ?? '',
      bogo_trigger: c.bogo_trigger ?? 'immediate',
      bogo_discount_type: c.bogo_discount_type ?? 'percent',
      bogo_discount_value: String(c.bogo_discount_value ?? 100),
      bogo_primary_discount_type: c.bogo_primary_discount_type ?? 'percent',
      bogo_primary_discount_value: String(c.bogo_primary_discount_value ?? 0),
    })
    setEditId(c.id)
    setShowModal(true)
  }

  async function loadUsages(coupon: any) {
    setUsageModal(coupon)
    const { data } = await supabase
      .from('orders')
      .select('*, users(first_name, last_name, email)')
      .eq('coupon_code', coupon.code)
      .order('created_at', { ascending: false })
    setUsages(data ?? [])
  }

  async function saveCoupon() {
    if (!form.code.trim()) { toast('error','❌','Required','Coupon code is required.'); return }
    if (form.coupon_type === 'discount' && (!form.discount_value || parseFloat(form.discount_value) <= 0)) {
      toast('error','❌','Required','Discount value must be > 0.'); return
    }
    if (form.coupon_type === 'bogo' && !form.bogo_product_id) {
      toast('error','❌','Required','Select the BOGO second account product.'); return
    }

    setSaving(true)
    const payload: any = {
      coupon_type: form.coupon_type,
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: form.coupon_type === 'bogo' ? 0 : parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      one_per_account: form.one_per_account,
      single_use: form.single_use,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      description: form.description.trim() || null,
      min_order_usd: form.min_order_usd ? parseFloat(form.min_order_usd) : null,
      product_id: form.product_id || null,
      is_active: true,
    }
    if (form.coupon_type === 'bogo') {
      payload.bogo_product_id    = form.bogo_product_id || null
      payload.bogo_trigger       = form.bogo_trigger
      payload.bogo_discount_type = form.bogo_discount_type
      payload.bogo_discount_value= parseFloat(form.bogo_discount_value || '100')
      payload.bogo_primary_discount_type  = form.bogo_primary_discount_type
      payload.bogo_primary_discount_value = parseFloat(form.bogo_primary_discount_value || '0')
      // discount_value on main coupon = primary discount (for validate_coupon RPC compatibility)
      payload.discount_value     = parseFloat(form.bogo_primary_discount_value || '0')
      payload.discount_type      = form.bogo_primary_discount_type
    }

    let error
    if (editId) {
      ;({ error } = await supabase.from('coupons').update(payload).eq('id', editId))
    } else {
      payload.uses_count = 0
      payload.total_discount_given = 0
      ;({ error } = await supabase.from('coupons').insert(payload))
    }
    setSaving(false)
    if (error) { toast('error','❌','Error', error.message); return }
    toast('success','✅', editId ? 'Updated' : 'Created', `Coupon ${payload.code} ${editId ? 'updated' : 'created'}.`)
    setShowModal(false)
    load()
  }

  async function triggerBogoReward(reward: any) {
    if (reward.status !== 'pending') return

    // Validate trigger conditions — look at ALL accounts for this user, not just the original
    // because advancePhase creates new accounts at each phase transition
    if (reward.trigger_type === 'on_funded' || reward.trigger_type === 'on_phase2') {
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('phase, status, product_id')
        .eq('user_id', reward.user_id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const phases = userAccounts?.map((a:any) => a.phase) ?? []
      const hasFunded = phases.includes('funded') || phases.includes('passed')
      const hasPhase2 = hasFunded || phases.includes('phase2')

      if (reward.trigger_type === 'on_funded' && !hasFunded) {
        toast('warning','⚠️','Not Yet Funded',
          `Trader has not reached funded phase yet. Active phases: ${phases.join(', ') || 'none'}.`)
        return
      }
      if (reward.trigger_type === 'on_phase2' && !hasPhase2) {
        toast('warning','⚠️','Phase 2 Not Reached',
          `Trader has not reached Phase 2 yet. Active phases: ${phases.join(', ') || 'none'}.`)
        return
      }
    }

    const { data: bogoProduct } = await supabase.from('challenge_products').select('*').eq('id', reward.bogo_product_id).single()
    if (!bogoProduct) { toast('error','❌','Error','BOGO product not found'); return }

    const login    = generateLogin()
    const password = generatePassword()
    const size     = bogoProduct.account_size
    const accountNumber = `TFD-${Number(size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: acc, error } = await supabase.from('accounts').insert({
      user_id: reward.user_id,
      product_id: reward.bogo_product_id,
      account_number: accountNumber,
      phase: bogoProduct.challenge_type === 'instant' ? 'funded' : 'phase1',
      balance: size, equity: size, starting_balance: size,
      daily_dd_used: 0, max_dd_used: 0, trading_days: 0,
      platform_login: login, server: 'TFD-Live-01', status: 'active',
      drawdown_type: bogoProduct.drawdown_type ?? 'static',
      trailing_drawdown: bogoProduct.trailing_drawdown ?? 8,
      funded_at: bogoProduct.challenge_type === 'instant' ? new Date().toISOString() : null,
    }).select().single()

    if (error) { toast('error','❌','Error', error.message); return }

    await supabase.from('bogo_rewards').update({
      status: 'completed',
      bogo_account_id: acc.id,
      triggered_at: new Date().toISOString(),
    }).eq('id', reward.id)

    // Notify trader by email
    const { data: user } = await supabase.from('users').select('email, first_name').eq('id', reward.user_id).single()
    if (user?.email) {
      await sendEmail('bogo_account', user.email, {
        first_name:     user.first_name ?? 'Trader',
        promo_code:     reward.coupon_code,
        product_name:   bogoProduct.name,
        account_size:   Number(size),
        account_number: accountNumber,
        login, password,
        server:         'TFD-Live-01',
        phase:          bogoProduct.challenge_type === 'instant' ? 'Funded (BOGO)' : 'Phase 1 (BOGO)',
      })
    }
    toast('success','✅','BOGO Triggered', `Account ${accountNumber} created for ${user?.email}`)
    load()
  }

  async function toggleActive(c: any) {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id)
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
    toast('success','✅','Updated', `${c.code} ${!c.is_active ? 'enabled' : 'disabled'}.`)
  }

  async function deleteCoupon(c: any) {
    if (!confirm(`Delete coupon ${c.code}?`)) return
    await supabase.from('coupons').delete().eq('id', c.id)
    setCoupons(prev => prev.filter(x => x.id !== c.id))
    toast('success','🗑️','Deleted', `${c.code} deleted.`)
  }

  function isExpired(c: any) { return c.expires_at && new Date(c.expires_at) < new Date() }
  function isMaxed(c: any)   { return c.max_uses && c.uses_count >= c.max_uses }
  function getStatus(c: any) {
    if (isExpired(c)) return { label: 'Expired',  cls: 'text-[#DC2626] bg-[rgba(220,38,38,.08)] border-[rgba(220,38,38,.2)]' }
    if (isMaxed(c))   return { label: 'Maxed',    cls: 'text-[#DC2626] bg-[rgba(220,38,38,.08)] border-[rgba(220,38,38,.2)]' }
    if (c.is_active)  return { label: 'Active',   cls: 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' }
    return                   { label: 'Disabled', cls: 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]' }
  }

  const filtered = coupons.filter(c => {
    if (filter === 'all')      return true
    if (filter === 'active')   return c.is_active && !isExpired(c) && !isMaxed(c)
    if (filter === 'bogo')     return c.coupon_type === 'bogo'
    if (filter === 'expired')  return isExpired(c)
    if (filter === 'disabled') return !c.is_active
    return true
  })

  const totalUses     = coupons.reduce((s,c) => s + (c.uses_count ?? 0), 0)
  const totalDiscount = coupons.reduce((s,c) => s + (c.total_discount_given ?? 0), 0)
  const activeCoupons = coupons.filter(c => c.is_active && !isExpired(c) && !isMaxed(c)).length
  const pendingBogo   = bogoRewards.filter(r => r.status === 'pending').length

  const inp = "w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] rounded"
  const lbl = "text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-1"
  const mono = { fontFamily:"'JetBrains Mono',monospace" } as const

  return (
    <>
      <DashboardLayout title="Coupon Codes" nav={ADMIN_NAV} accentColor="red">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Total Coupons"    value={String(coupons.length)}  sub={`${activeCoupons} active`} subColor="text-[#16A34A]"/>
          <KPICard label="Total Uses"       value={String(totalUses)}       sub="All time"/>
          <KPICard label="Discount Given"   value={fmt(totalDiscount)}      sub="All time" subColor="text-[#DC2626]"/>
          <KPICard label="Pending BOGO"     value={String(pendingBogo)}     sub="Awaiting trigger" subColor={pendingBogo>0?"text-[#D97706]":"text-[#8FA3BF]"}/>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#E8EEF8] pb-0">
          {[['coupons','All Coupons'],['bogo','🎁 BOGO Rewards']].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v as any)}
              className={`px-4 py-2 text-[11px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent ${tab===v?'border-[#2255CC] text-[#2255CC]':'border-transparent text-[#8FA3BF] hover:text-[#5C7A9E]'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'coupons' && (
          <Card>
            <CardHeader title={`Coupons (${filtered.length})`} action={<Button onClick={openCreate}>+ New Coupon</Button>}/>

            {/* Filter bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-[#F0F4FB] flex-wrap">
              {[['all','All'],['active','Active'],['bogo','BOGO'],['expired','Expired'],['disabled','Disabled']].map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v)}
                  className={`px-3 py-1 text-[10px] font-semibold border cursor-pointer transition-all ${filter===v?'bg-[#2255CC] text-white border-[#2255CC]':'bg-[#F4F7FD] text-[#5C7A9E] border-[#E8EEF8] hover:border-[#C5D5EA]'}`}>
                  {l}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead><tr className="border-b border-[#F0F4FB]">
                  {['Code','Type','Discount / BOGO','Uses','Min Order','Expires','Status','Actions'].map(h=>(
                    <th key={h} className="px-[10px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)] whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(c => {
                    const st = getStatus(c)
                    const isBogo = c.coupon_type === 'bogo'
                    return (
                      <tr key={c.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                        <td className="px-[10px] py-[8px]">
                          <div className="flex items-center gap-2">
                            <span style={mono} className="font-bold text-[#2255CC]">{c.code}</span>
                            {isBogo && <span className="text-[8px] px-1.5 py-0.5 bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] font-bold">BOGO</span>}
                          </div>
                          {c.description && <div className="text-[9px] text-[#8FA3BF] mt-0.5">{c.description}</div>}
                        </td>
                        <td className="px-[10px] py-[8px] text-[#5C7A9E]">
                          {isBogo ? <span className="text-[#D97706] font-semibold">Buy 1 Get 1</span> : c.discount_type}
                        </td>
                        <td className="px-[10px] py-[8px]" style={mono}>
                          {isBogo ? (
                            <div>
                              <div className="text-[10px] font-semibold text-[#1A3A6B]">
                                {c.bogo_discount_value === 100 ? 'Free account' : `${c.bogo_discount_value}% off second account`}
                              </div>
                              <div className="text-[9px] text-[#8FA3BF]">
                                {BOGO_TRIGGERS.find(t=>t.value===c.bogo_trigger)?.label ?? c.bogo_trigger}
                              </div>
                            </div>
                          ) : (
                            c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`
                          )}
                        </td>
                        <td className="px-[10px] py-[8px]" style={mono}>
                          {c.uses_count ?? 0}{c.max_uses ? `/${c.max_uses}` : ''}
                        </td>
                        <td className="px-[10px] py-[8px]" style={mono}>
                          {c.min_order_usd ? `$${c.min_order_usd}` : '—'}
                        </td>
                        <td className="px-[10px] py-[8px] text-[#8FA3BF] text-[10px]">
                          {c.expires_at ? formatDate(c.expires_at) : '—'}
                        </td>
                        <td className="px-[10px] py-[8px]">
                          <span className={`text-[8px] font-bold px-2 py-0.5 border ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-[10px] py-[8px]">
                          <div className="flex gap-1">
                            <button onClick={()=>openEdit(c)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[rgba(34,85,204,.2)] rounded cursor-pointer">Edit</button>
                            <button onClick={()=>loadUsages(c)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[#F4F7FD] text-[#5C7A9E] border border-[#E8EEF8] rounded cursor-pointer">Uses</button>
                            <button onClick={()=>toggleActive(c)} className={`px-2 py-1 text-[8px] font-bold uppercase border rounded cursor-pointer ${c.is_active?'bg-[rgba(220,38,38,.08)] text-[#DC2626] border-[rgba(220,38,38,.2)]':'bg-[rgba(22,163,74,.08)] text-[#16A34A] border-[rgba(22,163,74,.2)]'}`}>
                              {c.is_active?'Off':'On'}
                            </button>
                            <button onClick={()=>deleteCoupon(c)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.06)] text-[#DC2626] border border-[rgba(220,38,38,.15)] rounded cursor-pointer">Del</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {tab === 'bogo' && (
          <Card>
            <CardHeader title={`BOGO Rewards (${bogoRewards.length}) — ${pendingBogo} pending`}/>
            {bogoRewards.length === 0 ? (
              <div className="py-10 text-center text-[11px] text-[#8FA3BF]">No BOGO rewards yet. Create a BOGO coupon and it will appear here when used.</div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead><tr className="border-b border-[#F0F4FB]">
                  {['Trader','Coupon','Second Account Product','Trigger','Status','Actions'].map(h=>(
                    <th key={h} className="px-[10px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {bogoRewards.map(r => (
                    <tr key={r.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                      <td className="px-[10px] py-[8px]">
                        <div className="font-semibold">{r.users?.first_name} {r.users?.last_name}</div>
                        <div className="text-[9px] text-[#8FA3BF]">{r.users?.email}</div>
                      </td>
                      <td className="px-[10px] py-[8px]" style={mono}>{r.coupon_code}</td>
                      <td className="px-[10px] py-[8px]">
                        <div>{r.bogo_product?.name ?? '—'}</div>
                        <div className="text-[9px] text-[#8FA3BF]">${Number(r.bogo_product?.account_size??0).toLocaleString()}</div>
                      </td>
                      <td className="px-[10px] py-[8px]">
                        <div className="text-[#5C7A9E]">{BOGO_TRIGGERS.find(t=>t.value===r.trigger_type)?.label ?? r.trigger_type}</div>
                        {r.trigger_type !== 'immediate' && (
                          <PrimaryAccountPhase userId={r.user_id} triggerType={r.trigger_type}/>
                        )}
                      </td>
                      <td className="px-[10px] py-[8px]">
                        <span className={`text-[8px] font-bold px-2 py-0.5 border ${
                          r.status==='completed' ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' :
                          r.status==='pending'   ? 'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]' :
                          'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-[10px] py-[8px]">
                        {r.status === 'pending' && (
                          <button onClick={()=>triggerBogoReward(r)}
                            className="px-3 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">
                            🎁 Create Account Now
                          </button>
                        )}
                        {r.status === 'completed' && (
                          <span className="text-[9px] text-[#16A34A]">✓ Account created</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

      </DashboardLayout>

      {/* ── CREATE/EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-[680px] max-h-[90vh] flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EEF8] flex-shrink-0">
              <h2 className="text-[15px] font-bold text-[#1A3A6B]">{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={()=>setShowModal(false)} className="text-[#8FA3BF] text-[20px] bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-5">

              {/* Coupon type selector */}
              <div>
                <label className={lbl}>Coupon Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${form.coupon_type==='discount'?'border-[#2255CC] bg-[rgba(34,85,204,.04)]':'border-[#E8EEF8] hover:border-[#C5D5EA]'}`}>
                    <input type="radio" name="ctype" value="discount" checked={form.coupon_type==='discount'} onChange={F('coupon_type')} className="hidden"/>
                    <span className={`text-[12px] font-bold mb-1 ${form.coupon_type==='discount'?'text-[#2255CC]':'text-[#1A3A6B]'}`}>🏷️ Discount Coupon</span>
                    <span className="text-[10px] text-[#8FA3BF]">Percentage or fixed amount off the price</span>
                  </label>
                  <label className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${form.coupon_type==='bogo'?'border-[#D97706] bg-[rgba(217,119,6,.04)]':'border-[#E8EEF8] hover:border-[#C5D5EA]'}`}>
                    <input type="radio" name="ctype" value="bogo" checked={form.coupon_type==='bogo'} onChange={F('coupon_type')} className="hidden"/>
                    <span className={`text-[12px] font-bold mb-1 ${form.coupon_type==='bogo'?'text-[#D97706]':'text-[#1A3A6B]'}`}>🎁 BOGO — Buy 1 Get 1</span>
                    <span className="text-[10px] text-[#8FA3BF]">Trader gets a second account when they buy</span>
                  </label>
                </div>
              </div>

              {/* Code + description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Coupon Code *</label>
                  <div className="flex gap-2">
                    <input value={form.code} onChange={F('code')} className={inp + ' flex-1'} style={{textTransform:'uppercase'}} placeholder="CODE"/>
                    <button onClick={()=>setForm((f:any)=>({...f,code:randomCode()}))} className="px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#5C7A9E] text-[10px] font-bold rounded cursor-pointer">↺</button>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <input value={form.description} onChange={F('description')} className={inp} placeholder="Internal note"/>
                </div>
              </div>

              {/* DISCOUNT fields */}
              {form.coupon_type === 'discount' && (
                <div className="border border-[#E8EEF8] rounded-lg p-4">
                  <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#2255CC] mb-3">Discount Settings</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Discount Type</label>
                      <select value={form.discount_type} onChange={F('discount_type')} className={inp}>
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Value *</label>
                      <input type="number" value={form.discount_value} onChange={F('discount_value')} className={inp} placeholder={form.discount_type==='percent'?'20':'25'}/>
                    </div>
                  </div>
                </div>
              )}

              {/* BOGO fields */}
              {form.coupon_type === 'bogo' && (
                <div className="border border-[rgba(217,119,6,.25)] rounded-lg p-4 bg-[rgba(217,119,6,.02)]">
                  <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#D97706] mb-3">🎁 BOGO Settings</div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className={lbl}>Second Account — Product *</label>
                      <select value={form.bogo_product_id} onChange={F('bogo_product_id')} className={inp}>
                        <option value="">Select account product…</option>
                        {products.map(p=>(
                          <option key={p.id} value={p.id}>
                            ${Number(p.account_size).toLocaleString()} — {p.name} ({p.challenge_type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Second Account Discount</label>
                      <select value={form.bogo_discount_type} onChange={F('bogo_discount_type')} className={inp}>
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Discount Value (100 = free)</label>
                      <input type="number" value={form.bogo_discount_value} onChange={F('bogo_discount_value')} className={inp} placeholder="100"/>
                    </div>
                  </div>

                  {/* Primary account discount */}
                  <div className="mt-3 p-3 bg-[rgba(34,85,204,.04)] border border-[rgba(34,85,204,.2)] rounded-lg">
                    <div className="text-[9px] uppercase tracking-[1.5px] font-bold text-[#2255CC] mb-2">Discount on Primary Account (optional)</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Type</label>
                        <select value={form.bogo_primary_discount_type} onChange={F('bogo_primary_discount_type')} className={inp}>
                          <option value="percent">Percentage (%)</option>
                          <option value="fixed">Fixed ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Value (0 = no discount on primary)</label>
                        <input type="number" value={form.bogo_primary_discount_value} onChange={F('bogo_primary_discount_value')} className={inp} placeholder="0"/>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-[#5C7A9E]">
                      Ex: BOGO40 → 40% discount here + free second account. Trader pays 60% of primary price and gets a second account free.
                    </div>
                  </div>

                  <div>
                    <label className={lbl}>When to Give the Second Account</label>
                    <div className="flex flex-col gap-2">
                      {BOGO_TRIGGERS.map(t=>(
                        <label key={t.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${form.bogo_trigger===t.value?'border-[#D97706] bg-[rgba(217,119,6,.04)]':'border-[#E8EEF8] hover:border-[#C5D5EA]'}`}>
                          <input type="radio" name="btrigger" value={t.value} checked={form.bogo_trigger===t.value} onChange={F('bogo_trigger')} className="accent-[#D97706]"/>
                          <div>
                            <div className={`text-[11px] font-bold ${form.bogo_trigger===t.value?'text-[#D97706]':'text-[#1A3A6B]'}`}>{t.label}</div>
                            <div className="text-[9px] text-[#8FA3BF]">{t.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Common settings */}
              <div className="border border-[#E8EEF8] rounded-lg p-4">
                <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#8FA3BF] mb-3">Usage Rules</div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className={lbl}>Max Uses (blank = unlimited)</label>
                    <input type="number" value={form.max_uses} onChange={F('max_uses')} className={inp} placeholder="∞"/>
                  </div>
                  <div>
                    <label className={lbl}>Min Order ($)</label>
                    <input type="number" value={form.min_order_usd} onChange={F('min_order_usd')} className={inp} placeholder="0"/>
                  </div>
                  <div>
                    <label className={lbl}>Expires</label>
                    <input type="date" value={form.expires_at} onChange={F('expires_at')} className={inp}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Restrict to Product</label>
                    <select value={form.product_id} onChange={F('product_id')} className={inp}>
                      <option value="">All products</option>
                      {products.map(p=>(
                        <option key={p.id} value={p.id}>${Number(p.account_size).toLocaleString()} — {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    {[['one_per_account','One use per account'],['single_use','Single use globally']].map(([k,l])=>(
                      <label key={k} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form[k]} onChange={F(k)} className="accent-[#2255CC]"/>
                        <span className="text-[11px] text-[#5C7A9E]">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[#E8EEF8] flex-shrink-0">
              <button onClick={()=>setShowModal(false)} className="flex-1 py-2.5 bg-[#F4F7FD] border border-[#E8EEF8] text-[#5C7A9E] text-[10px] uppercase font-bold cursor-pointer rounded">Cancel</button>
              <Button onClick={saveCoupon} loading={saving} className="flex-[2]">{editId ? 'Save Changes' : 'Create Coupon'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Usage modal */}
      {usageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setUsageModal(null)}>
          <div className="bg-white rounded-xl w-full max-w-[560px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EEF8]">
              <h3 className="text-[13px] font-bold">Uses — <span style={mono}>{usageModal.code}</span></h3>
              <button onClick={()=>setUsageModal(null)} className="text-[#8FA3BF] text-[18px] bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {usages.length === 0 ? (
                <p className="text-[11px] text-[#8FA3BF] text-center py-8">No uses yet.</p>
              ) : (
                <table className="w-full text-[11px] border-collapse">
                  <thead><tr className="border-b border-[#F0F4FB]">
                    {['Trader','Email','Amount','Date'].map(h=>(
                      <th key={h} className="px-3 py-2 text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {usages.map(u=>(
                      <tr key={u.id} className="border-b border-[#F4F7FD]">
                        <td className="px-3 py-2 font-semibold">{u.users?.first_name} {u.users?.last_name}</td>
                        <td className="px-3 py-2 text-[#8FA3BF]">{u.users?.email}</td>
                        <td className="px-3 py-2" style={mono}>${u.final_amount_usd}</td>
                        <td className="px-3 py-2 text-[#8FA3BF]">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}