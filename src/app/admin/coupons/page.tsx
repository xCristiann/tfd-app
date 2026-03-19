import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt, formatDate } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

function randomCode(len = 8) {
  return Array.from({ length: len }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
}

const EMPTY_FORM = {
  code: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  discount_value: '',
  max_uses: '',
  one_per_account: false,
  single_use: false,
  expires_at: '',
  description: '',
  min_order_usd: '',
  product_id: '',
}

export function AdminCouponsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [coupons, setCoupons] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [usageModal, setUsageModal] = useState<any>(null)
  const [usages, setUsages] = useState<any[]>([])
  const [form, setForm] = useState({ ...EMPTY_FORM, code: randomCode() })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cps }, { data: prods }] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('challenge_products').select('id, name, account_size').eq('is_active', true),
    ])
    setCoupons(cps ?? [])
    setProducts(prods ?? [])
    setLoading(false)
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, code: randomCode() })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(c: any) {
    setForm({
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
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) { toast('error','❌','Required','Discount value must be greater than 0.'); return }

    setSaving(true)
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      one_per_account: form.one_per_account,
      single_use: form.single_use,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      description: form.description.trim() || null,
      min_order_usd: form.min_order_usd ? parseFloat(form.min_order_usd) : null,
      product_id: form.product_id || null,
      is_active: true,
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

  async function toggleActive(c: any) {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id)
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
    toast('success','✅','Updated', `${c.code} ${!c.is_active ? 'enabled' : 'disabled'}.`)
  }

  async function deleteCoupon(c: any) {
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return
    await supabase.from('coupons').delete().eq('id', c.id)
    setCoupons(prev => prev.filter(x => x.id !== c.id))
    toast('success','🗑️','Deleted', `${c.code} deleted.`)
  }

  function isExpired(c: any) { return c.expires_at && new Date(c.expires_at) < new Date() }
  function isMaxed(c: any)   { return c.max_uses && c.uses_count >= c.max_uses }
  function getStatus(c: any) {
    if (isExpired(c)) return { label: 'Expired',  color: 'bg-[rgba(220,38,38,.1)] text-[#DC2626]' }
    if (isMaxed(c))   return { label: 'Maxed',    color: 'bg-[rgba(220,38,38,.1)] text-[#DC2626]' }
    if (c.is_active)  return { label: 'Active',   color: 'bg-[rgba(22,163,74,.1)] text-[#16A34A]' }
    return               { label: 'Disabled', color: 'bg-[rgba(220,38,38,.1)] text-[#DC2626]' }
  }

  const filtered = coupons.filter(c => {
    if (filter === 'all')     return true
    if (filter === 'active')  return c.is_active && !isExpired(c) && !isMaxed(c)
    if (filter === 'expired') return isExpired(c)
    if (filter === 'maxed')   return isMaxed(c)
    if (filter === 'disabled') return !c.is_active
    return true
  })

  const totalUses     = coupons.reduce((s,c) => s + (c.uses_count ?? 0), 0)
  const totalDiscount = coupons.reduce((s,c) => s + (c.total_discount_given ?? 0), 0)
  const activeCoupons = coupons.filter(c => c.is_active && !isExpired(c) && !isMaxed(c)).length

  return (
    <>
      <DashboardLayout title="Coupon Codes" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Total Coupons"  value={String(coupons.length)} sub={`${activeCoupons} active`}/>
          <KPICard label="Total Uses"     value={String(totalUses)}      sub="All time" subColor="text-[#2255CC]"/>
          <KPICard label="Discount Given" value={fmt(totalDiscount)}     sub="Revenue reduced" subColor="text-[#DC2626]"/>
          <KPICard label="Active Now"     value={String(activeCoupons)}  sub="Live codes" subColor="text-[#16A34A]"/>
        </div>

        <Card>
          <CardHeader
              title={`Coupon Codes (${filtered.length})`}
              action={
                <div className="flex items-center gap-2">
                  <div className="flex gap-[3px]">
                    {['all','active','expired','maxed','disabled'].map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`px-[9px] py-[4px] text-[7px] tracking-[1px] uppercase font-semibold cursor-pointer border transition-all ${filter===f?'bg-[rgba(220,38,38,.1)] border-[rgba(220,38,38,.3)] text-[#DC2626]':'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF]'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={openCreate}>+ New Coupon</Button>
                </div>
              }
            />

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-[24px] mb-2">🏷️</div>
              <div className="text-[12px] font-semibold mb-1">No coupons yet</div>
              <p className="text-[10px] text-[#8FA3BF]">Create your first coupon code to offer discounts to traders.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#F0F4FB]">
                  {['Code','Discount','Restrictions','Uses','Expires','Min Order','Applies To','Status',''].map(h => (
                    <th key={h} className="px-[10px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(220,38,38,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const st = getStatus(c)
                  const prod = products.find(p => p.id === c.product_id)
                  return (
                    <tr key={c.id} className="border-b border-[rgba(220,38,38,.04)] hover:bg-[rgba(220,38,38,.02)]">
                      <td className="px-[10px] py-[10px]">
                        <div className=" font-bold text-[13px] text-[#2255CC] tracking-[2px]">{c.code}</div>
                        {c.description && <div className="text-[9px] text-[#8FA3BF] mt-[2px]">{c.description}</div>}
                      </td>
                      <td className="px-[10px] py-[10px]  font-bold text-[#2255CC]">
                        {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`}
                        <div className="text-[8px] text-[#8FA3BF] font-normal">{c.discount_type}</div>
                      </td>
                      <td className="px-[10px] py-[10px]">
                        <div className="flex flex-col gap-[2px]">
                          {c.single_use && <span className="text-[8px] px-1 py-[1px] bg-[rgba(34,85,204,.08)] text-[#2255CC] font-bold">Single Use</span>}
                          {c.one_per_account && <span className="text-[8px] px-1 py-[1px] bg-[rgba(34,85,204,.08)] text-[#2255CC] font-bold">1/Account</span>}
                          {!c.single_use && !c.one_per_account && <span className="text-[8px] text-[#8FA3BF]">Unlimited</span>}
                        </div>
                      </td>
                      <td className="px-[10px] py-[10px] ">
                        {c.uses_count ?? 0}{c.max_uses ? `/${c.max_uses}` : ''}
                      </td>
                      <td className="px-[10px] py-[10px] text-[10px]">
                        {c.expires_at
                          ? <span className={isExpired(c) ? 'text-[#DC2626]' : 'text-[#5C7A9E]'}>{formatDate(c.expires_at)}</span>
                          : <span className="text-[#8FA3BF]">Never</span>}
                      </td>
                      <td className="px-[10px] py-[10px]  text-[10px]">{c.min_order_usd ? `$${c.min_order_usd}` : '—'}</td>
                      <td className="px-[10px] py-[10px] text-[10px]">
                        {prod ? <div><div className="font-semibold">{prod.name}</div><div className="text-[9px] text-[#8FA3BF]">${Number(prod.account_size).toLocaleString()}</div></div> : <span className="text-[#8FA3BF]">All Products</span>}
                      </td>
                      <td className="px-[10px] py-[10px]">
                        <span className={`text-[8px] px-2 py-1 font-bold uppercase ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-[10px] py-[10px]">
                        <div className="flex gap-[4px]">
                          <button onClick={() => openEdit(c)}
                            className="px-[7px] py-[3px] text-[8px] font-bold uppercase cursor-pointer border border-[#C5D5EA] text-[#5C7A9E] hover:text-[#2255CC] hover:border-[#2255CC] transition-colors">
                            Edit
                          </button>
                          <button onClick={() => loadUsages(c)}
                            className="px-[7px] py-[3px] text-[8px] font-bold uppercase cursor-pointer border border-[#F0F4FB] text-[#8FA3BF] hover:text-[#1A3A6B] transition-colors">
                            Uses
                          </button>
                          <button onClick={() => toggleActive(c)}
                            className={`px-[7px] py-[3px] text-[8px] font-bold uppercase cursor-pointer border transition-colors ${c.is_active ? 'border-[rgba(220,38,38,.2)] text-[#DC2626]' : 'border-[rgba(22,163,74,.2)] text-[#16A34A]'}`}>
                            {c.is_active ? 'Off' : 'On'}
                          </button>
                          <button onClick={() => deleteCoupon(c)}
                            className="px-[7px] py-[3px] text-[8px] font-bold uppercase cursor-pointer border border-[rgba(220,38,38,.2)] text-[#DC2626] hover:bg-[rgba(220,38,38,.1)] transition-colors">
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.75)]" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[#F0F4FB] border border-[#C5D5EA] w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E8EEF8]">
              <div className="font-sans text-[17px] font-bold">{editId ? 'Edit Coupon' : 'Create Coupon'}</div>
              <p className="text-[10px] text-[#8FA3BF] mt-[2px]">Coupon codes are applied by traders at checkout.</p>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Code + type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Code *</label>
                  <div className="flex gap-2">
                    <input value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))}
                      disabled={!!editId}
                      className="flex-1 px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#2255CC]  font-bold text-[13px] tracking-[2px] outline-none uppercase disabled:opacity-50"/>
                    {!editId && <button onClick={() => setForm(f=>({...f,code:randomCode()}))}
                      className="px-3 py-2 bg-[#F4F7FD] border border-[#F0F4FB] text-[#8FA3BF] text-[11px] cursor-pointer hover:text-[#1A3A6B] transition-colors">↺</button>}
                  </div>
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Discount Type *</label>
                  <select value={form.discount_type} onChange={e => setForm(f=>({...f,discount_type:e.target.value as any}))}
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] outline-none cursor-pointer">
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              {/* Value + min order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">
                    Discount Value * {form.discount_type === 'percent' ? '(%)' : '($)'}
                  </label>
                  <input type="number" value={form.discount_value} onChange={e => setForm(f=>({...f,discount_value:e.target.value}))}
                    placeholder={form.discount_type === 'percent' ? '20' : '50'} min="0" step="any"
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B]  outline-none"/>
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Min Order ($)</label>
                  <input type="number" value={form.min_order_usd} onChange={e => setForm(f=>({...f,min_order_usd:e.target.value}))}
                    placeholder="Optional — e.g. 100" min="0"
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B]  outline-none"/>
                </div>
              </div>

              {/* Usage restrictions */}
              <div>
                <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-3">Usage Restrictions</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { key: 'single_use', label: 'Single Use', desc: 'Code can only be used once total, then auto-disables' },
                    { key: 'one_per_account', label: 'One Per Account', desc: 'Each trader account can only use this code once' },
                  ].map(({ key, label, desc }) => (
                    <label key={key} className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${(form as any)[key] ? 'border-[#2255CC] bg-[rgba(34,85,204,.05)]' : 'border-[#F0F4FB] bg-[#F4F7FD]'}`}>
                      <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(f=>({...f,[key]:e.target.checked}))}
                        className="mt-[2px] cursor-pointer accent-[#2255CC] flex-shrink-0"/>
                      <div>
                        <div className={`text-[11px] font-semibold ${(form as any)[key] ? 'text-[#2255CC]' : ''}`}>{label}</div>
                        <div className="text-[9px] text-[#8FA3BF] leading-[1.4] mt-[2px]">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Max Total Uses (blank = unlimited)</label>
                  <input type="number" value={form.max_uses} onChange={e => setForm(f=>({...f,max_uses:e.target.value}))}
                    placeholder="e.g. 100" min="1"
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B]  outline-none"/>
                </div>
              </div>

              {/* Applies to product */}
              <div>
                <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Applies To</label>
                <select value={form.product_id} onChange={e => setForm(f=>({...f,product_id:e.target.value}))}
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] outline-none cursor-pointer">
                  <option value="">All Challenge Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (${Number(p.account_size).toLocaleString()})</option>)}
                </select>
              </div>

              {/* Expires + description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Expires At</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(f=>({...f,expires_at:e.target.value}))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] outline-none"/>
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Internal Description</label>
                  <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                    placeholder="e.g. Black Friday 2025"
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] outline-none"/>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-[rgba(34,85,204,.05)] border border-[rgba(34,85,204,.2)]">
                <div className="text-[8px] uppercase tracking-[1.5px] text-[#2255CC] font-semibold mb-2">Preview</div>
                <div className=" text-[18px] font-bold text-[#2255CC] tracking-[3px] mb-2">{form.code || 'YOURCODE'}</div>
                <div className="text-[11px] text-[#5C7A9E] leading-[1.6]">
                  <span className="text-[#2255CC]">{form.discount_value ? (form.discount_type === 'percent' ? `${form.discount_value}% off` : `$${form.discount_value} off`) : '— off'}</span>
                  {form.product_id ? ` on ${products.find(p=>p.id===form.product_id)?.name ?? 'selected product'}` : ' on all products'}
                  {form.min_order_usd ? ` · min order $${form.min_order_usd}` : ''}
                  {form.single_use ? ' · single use' : ''}
                  {form.one_per_account ? ' · 1 per account' : ''}
                  {form.max_uses ? ` · max ${form.max_uses} uses` : ' · unlimited uses'}
                  {form.expires_at ? ` · expires ${form.expires_at}` : ' · no expiry'}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-[#F4F7FD] border border-[#F0F4FB] text-[#5C7A9E] text-[10px] uppercase font-bold cursor-pointer hover:border-[#C5D5EA] transition-colors">
                Cancel
              </button>
              <Button onClick={saveCoupon} loading={saving} className="flex-1">
                {editId ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Usage details modal */}
      {usageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.75)]" onClick={e => e.target === e.currentTarget && setUsageModal(null)}>
          <div className="bg-[#F0F4FB] border border-[#C5D5EA] w-[540px] max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E8EEF8] flex items-center justify-between">
              <div>
                <div className=" text-[16px] font-bold text-[#2255CC]">{usageModal.code}</div>
                <div className="text-[10px] text-[#8FA3BF]">{usages.length} uses recorded</div>
              </div>
              <button onClick={() => setUsageModal(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] cursor-pointer bg-transparent border-none text-[18px]">✕</button>
            </div>
            <div className="p-4">
              {usages.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No orders found with this coupon.</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#F0F4FB]">
                      {['Trader','Order #','Amount','Discount','Date'].map(h => (
                        <th key={h} className="px-[8px] py-[5px] text-[7px] uppercase text-[#8FA3BF] text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usages.map(o => (
                      <tr key={o.id} className="border-b border-[#F0F4FB]">
                        <td className="px-[8px] py-[7px]">
                          <div className="font-semibold">{o.users?.first_name} {o.users?.last_name}</div>
                          <div className="text-[9px] text-[#8FA3BF]">{o.users?.email}</div>
                        </td>
                        <td className="px-[8px] py-[7px]  text-[#2255CC] text-[10px]">{o.order_number}</td>
                        <td className="px-[8px] py-[7px] ">${o.amount_usd}</td>
                        <td className="px-[8px] py-[7px]  text-[#16A34A]">-${o.discount_usd}</td>
                        <td className="px-[8px] py-[7px] text-[#8FA3BF] text-[10px]">{formatDate(o.created_at)}</td>
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
