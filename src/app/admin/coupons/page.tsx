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
  return Array.from({ length: len }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
}

export function AdminCouponsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: randomCode(),
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    max_uses: '',
    expires_at: '',
    description: '',
    applies_to: 'all', // 'all' or specific product_id
    min_order_usd: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    setCoupons(data ?? [])
    setLoading(false)
  }

  async function saveCoupon() {
    if (!form.code || !form.discount_value) { toast('error','❌','Required','Fill code and discount value.'); return }
    setSaving(true)
    const { error } = await supabase.from('coupons').insert({
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      description: form.description || null,
      min_order_usd: form.min_order_usd ? parseFloat(form.min_order_usd) : null,
      is_active: true,
      uses_count: 0,
    })
    setSaving(false)
    if (error) { toast('error','❌','Error', error.message); return }
    toast('success','✅','Created', `Coupon ${form.code} created.`)
    setShowModal(false)
    setForm({ code: randomCode(), discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '', description: '', applies_to: 'all', min_order_usd: '' })
    load()
  }

  async function toggleActive(c: any) {
    const { error } = await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id)
    if (!error) setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Delete this coupon?')) return
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(prev => prev.filter(c => c.id !== id))
    toast('success','🗑️','Deleted','Coupon deleted.')
  }

  const active = coupons.filter(c => c.is_active)
  const totalUses = coupons.reduce((s,c) => s + (c.uses_count ?? 0), 0)
  const totalDiscount = coupons.reduce((s,c) => s + (c.total_discount_given ?? 0), 0)

  return (
    <>
      <DashboardLayout title="Coupon Codes" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Total Coupons"  value={String(coupons.length)} sub={`${active.length} active`}/>
          <KPICard label="Total Uses"     value={String(totalUses)}      sub="All time" subColor="text-[var(--gold)]"/>
          <KPICard label="Total Discount" value={fmt(totalDiscount)}     sub="Given out" subColor="text-[var(--red)]"/>
          <KPICard label="Active Codes"   value={String(active.length)}  sub="Live now" subColor="text-[var(--green)]"/>
        </div>

        <Card>
          <CardHeader title={`Coupons (${coupons.length})`}>
            <Button size="sm" onClick={() => setShowModal(true)}>+ New Coupon</Button>
          </CardHeader>

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
          ) : coupons.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[var(--text3)]">No coupons yet. Create your first one.</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Code','Type','Value','Uses','Max Uses','Expires','Min Order','Status','Actions'].map(h => (
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(255,51,82,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => {
                  const expired = c.expires_at && new Date(c.expires_at) < new Date()
                  const maxed = c.max_uses && c.uses_count >= c.max_uses
                  return (
                    <tr key={c.id} className="border-b border-[rgba(255,51,82,.04)] hover:bg-[rgba(255,51,82,.02)]">
                      <td className="px-[11px] py-[9px]">
                        <div className="font-mono font-bold text-[13px] text-[var(--gold)] tracking-[2px]">{c.code}</div>
                        {c.description && <div className="text-[9px] text-[var(--text3)] mt-[1px]">{c.description}</div>}
                      </td>
                      <td className="px-[11px] py-[9px] text-[var(--text2)]">{c.discount_type === 'percent' ? 'Percent' : 'Fixed'}</td>
                      <td className="px-[11px] py-[9px] font-mono font-bold text-[var(--gold)]">
                        {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`}
                      </td>
                      <td className="px-[11px] py-[9px] font-mono">{c.uses_count ?? 0}</td>
                      <td className="px-[11px] py-[9px] font-mono text-[var(--text3)]">{c.max_uses ?? '∞'}</td>
                      <td className="px-[11px] py-[9px] text-[10px]">
                        {c.expires_at
                          ? <span className={expired ? 'text-[var(--red)]' : 'text-[var(--text2)]'}>{formatDate(c.expires_at)}</span>
                          : <span className="text-[var(--text3)]">Never</span>}
                      </td>
                      <td className="px-[11px] py-[9px] font-mono text-[10px]">{c.min_order_usd ? `$${c.min_order_usd}` : '—'}</td>
                      <td className="px-[11px] py-[9px]">
                        <span className={`text-[8px] px-2 py-1 font-bold uppercase ${
                          expired || maxed ? 'bg-[rgba(255,51,82,.1)] text-[var(--red)]' :
                          c.is_active ? 'bg-[rgba(0,217,126,.1)] text-[var(--green)]' : 'bg-[rgba(255,51,82,.1)] text-[var(--red)]'
                        }`}>
                          {expired ? 'Expired' : maxed ? 'Maxed' : c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-[11px] py-[9px]">
                        <div className="flex gap-2">
                          <button onClick={() => toggleActive(c)}
                            className={`px-[7px] py-[3px] text-[8px] uppercase font-bold cursor-pointer border transition-all ${c.is_active ? 'text-[var(--red)] border-[rgba(255,51,82,.2)]' : 'text-[var(--green)] border-[rgba(0,217,126,.2)]'}`}>
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => deleteCoupon(c.id)}
                            className="px-[7px] py-[3px] text-[8px] uppercase font-bold cursor-pointer border border-[rgba(255,51,82,.2)] text-[var(--red)] hover:bg-[rgba(255,51,82,.1)] transition-colors">
                            Delete
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.75)]">
          <div className="bg-[var(--bg)] border border-[var(--bdr2)] p-6 w-[480px] max-h-[90vh] overflow-y-auto">
            <div className="font-serif text-[18px] font-bold mb-1">Create Coupon</div>
            <p className="text-[10px] text-[var(--text3)] mb-5">Coupon codes are applied at checkout by traders.</p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Code</label>
                  <div className="flex gap-2">
                    <input value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value.toUpperCase()}))}
                      className="flex-1 px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--gold)] font-mono font-bold text-[13px] tracking-[2px] outline-none uppercase"/>
                    <button onClick={() => setForm(f=>({...f,code:randomCode()}))}
                      className="px-3 py-2 bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text3)] text-[9px] cursor-pointer hover:text-[var(--text)] transition-colors">↺</button>
                  </div>
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Discount Type</label>
                  <select value={form.discount_type} onChange={e => setForm(f=>({...f,discount_type:e.target.value as any}))}
                    className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] outline-none cursor-pointer">
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">
                    Discount Value {form.discount_type === 'percent' ? '(%)' : '($)'}
                  </label>
                  <input type="number" value={form.discount_value} onChange={e => setForm(f=>({...f,discount_value:e.target.value}))}
                    placeholder={form.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 50'}
                    className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] font-mono outline-none"/>
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Max Uses (blank = unlimited)</label>
                  <input type="number" value={form.max_uses} onChange={e => setForm(f=>({...f,max_uses:e.target.value}))}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] font-mono outline-none"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Expires At (blank = never)</label>
                  <input type="date" value={form.expires_at} onChange={e => setForm(f=>({...f,expires_at:e.target.value}))}
                    className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] outline-none"/>
                </div>
                <div>
                  <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Min Order ($)</label>
                  <input type="number" value={form.min_order_usd} onChange={e => setForm(f=>({...f,min_order_usd:e.target.value}))}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] font-mono outline-none"/>
                </div>
              </div>

              <div>
                <label className="text-[7px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Description (internal)</label>
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="e.g. Black Friday 2025 — 20% off"
                  className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] outline-none"/>
              </div>

              {/* Preview */}
              <div className="p-3 bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.2)]">
                <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--gold)] font-semibold mb-2">Preview</div>
                <div className="font-mono text-[16px] font-bold text-[var(--gold)] tracking-[3px] mb-1">{form.code || 'CODE'}</div>
                <div className="text-[11px] text-[var(--text2)]">
                  {form.discount_value ? (form.discount_type === 'percent' ? `${form.discount_value}% off` : `$${form.discount_value} off`) : '— off'}
                  {form.min_order_usd ? ` on orders over $${form.min_order_usd}` : ''}
                  {form.max_uses ? ` · max ${form.max_uses} uses` : ' · unlimited uses'}
                  {form.expires_at ? ` · expires ${form.expires_at}` : ' · no expiry'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text2)] text-[10px] uppercase font-bold cursor-pointer">
                Cancel
              </button>
              <Button onClick={saveCoupon} loading={saving} className="flex-1">Create Coupon</Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
