import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

const CHALLENGE_TYPES = [
  { value: '2step',    label: '2-Step Challenge',     desc: 'Phase 1 → Phase 2 → Funded' },
  { value: '1step',    label: '1-Step Challenge',      desc: 'Phase 1 → Funded' },
  { value: 'instant',  label: 'Instant Funding',       desc: 'Funded immediately, no evaluation' },
  { value: 'payafter', label: 'Pay After You Pass',    desc: 'Trade free, pay only if you pass' },
]

const DRAWDOWN_TYPES = [
  { value: 'static',   label: 'Static Drawdown',   desc: 'Fixed floor — never moves' },
  { value: 'trailing', label: 'Trailing Drawdown',  desc: 'Floor follows highest balance' },
]

const EMPTY = {
  name: '', account_size: '', price_usd: '',
  challenge_type: '2step', drawdown_type: 'static', trailing_drawdown: '8',
  ph1_profit_target: '8', ph1_daily_dd: '5', ph1_max_dd: '10', ph1_min_days: '0',
  ph2_profit_target: '5', ph2_daily_dd: '5', ph2_max_dd: '10', ph2_min_days: '0',
  funded_daily_dd: '5', funded_max_dd: '10', funded_profit_split: '85',
  news_trading: true, weekend_holding: true, is_active: true,
}

function typeBadge(t: string) {
  const c: Record<string,string> = {
    '2step':   'text-[#2255CC] bg-[rgba(34,85,204,.08)] border-[rgba(34,85,204,.2)]',
    '1step':   'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]',
    'instant': 'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]',
    'payafter':'text-[#7C3AED] bg-[rgba(124,58,237,.08)] border-[rgba(124,58,237,.2)]',
  }
  return c[t] ?? 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'
}

export function AdminChallengePage() {
  const { toasts, toast, dismiss } = useToast()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState<any>({ ...EMPTY })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    supabase.from('challenge_products').select('*').order('account_size', { ascending: true })
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [])

  const F = (k: string) => (e: any) =>
    setForm((f: any) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function openNew() { setEditing(null); setForm({ ...EMPTY }); setModal(true) }

  function openEdit(p: any) {
    setEditing(p)
    setForm({
      name: p.name, account_size: String(p.account_size), price_usd: String(p.price_usd),
      challenge_type: p.challenge_type ?? '2step',
      drawdown_type: p.drawdown_type ?? 'static',
      trailing_drawdown: String(p.trailing_drawdown ?? 8),
      ph1_profit_target: String(p.ph1_profit_target), ph1_daily_dd: String(p.ph1_daily_dd),
      ph1_max_dd: String(p.ph1_max_dd), ph1_min_days: String(p.ph1_min_days ?? 0),
      ph2_profit_target: String(p.ph2_profit_target), ph2_daily_dd: String(p.ph2_daily_dd),
      ph2_max_dd: String(p.ph2_max_dd), ph2_min_days: String(p.ph2_min_days ?? 0),
      funded_daily_dd: String(p.funded_daily_dd), funded_max_dd: String(p.funded_max_dd),
      funded_profit_split: String(p.funded_profit_split),
      news_trading: p.news_trading ?? true, weekend_holding: p.weekend_holding ?? true, is_active: p.is_active,
    })
    setModal(true)
  }

  async function save() {
    if (!form.name || !form.account_size || !form.price_usd) {
      toast('warning','⚠️','Missing','Fill in name, size and price.'); return
    }
    setSaving(true)
    const payload: any = {
      name: form.name,
      account_size: parseFloat(form.account_size),
      price_usd: parseFloat(form.price_usd),
      challenge_type: form.challenge_type,
      drawdown_type: form.drawdown_type,
      trailing_drawdown: parseFloat(form.trailing_drawdown || '8'),
      ph1_profit_target: parseFloat(form.ph1_profit_target),
      ph1_daily_dd: parseFloat(form.ph1_daily_dd),
      ph1_max_dd: parseFloat(form.ph1_max_dd),
      ph1_min_days: parseInt(form.ph1_min_days || '0'),
      ph2_profit_target: parseFloat(form.ph2_profit_target),
      ph2_daily_dd: parseFloat(form.ph2_daily_dd),
      ph2_max_dd: parseFloat(form.ph2_max_dd),
      ph2_min_days: parseInt(form.ph2_min_days || '0'),
      funded_daily_dd: parseFloat(form.funded_daily_dd),
      funded_max_dd: parseFloat(form.funded_max_dd),
      funded_profit_split: parseFloat(form.funded_profit_split),
      funded_immediately: form.challenge_type === 'instant',
      pay_after_pass: form.challenge_type === 'payafter',
      news_trading: form.news_trading,
      weekend_holding: form.weekend_holding,
      is_active: form.is_active,
    }
    if (editing) {
      const { data, error } = await supabase.from('challenge_products').update(payload).eq('id', editing.id).select().single()
      if (error) { toast('error','❌','Error', error.message); setSaving(false); return }
      setProducts(ps => ps.map(p => p.id === editing.id ? data : p))
      toast('success','✅','Updated', `${form.name} updated.`)
    } else {
      const { data, error } = await supabase.from('challenge_products').insert(payload).select().single()
      if (error) { toast('error','❌','Error', error.message); setSaving(false); return }
      setProducts(ps => [...ps, data])
      toast('success','✅','Created', `${form.name} created.`)
    }
    setSaving(false); setModal(false)
  }

  async function toggleActive(p: any) {
    const { data } = await supabase.from('challenge_products').update({ is_active: !p.is_active }).eq('id', p.id).select().single()
    if (data) setProducts(ps => ps.map(x => x.id === p.id ? data : x))
    toast('info','🔄','Updated', `${p.name} ${!p.is_active ? 'activated' : 'deactivated'}.`)
  }

  async function deleteProduct(p: any) {
    if (!confirm(`Delete "${p.name}"?`)) return
    await supabase.from('challenge_products').delete().eq('id', p.id)
    setProducts(ps => ps.filter(x => x.id !== p.id))
    toast('success','🗑️','Deleted', `${p.name} deleted.`)
  }

  const isTrailing = form.drawdown_type === 'trailing'
  const isInstant  = form.challenge_type === 'instant'
  const isPayAfter = form.challenge_type === 'payafter'
  const inp = "w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] transition-colors rounded"
  const lbl = "text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-1"

  return (
    <>
      <DashboardLayout title="Challenge Products" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`All Products (${products.length})`} action={<Button onClick={openNew}>+ New Product</Button>}/>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-[11px] text-[#8FA3BF]">No products yet</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-[#F0F4FB]">
                {['Name','Model','Size','Price','DD Type','DD Rule','Daily DD','Split','Rules','Status','Actions'].map(h=>(
                  <th key={h} className="px-[9px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)] whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                    <td className="px-[9px] py-[8px] font-semibold">{p.name}</td>
                    <td className="px-[9px] py-[8px]">
                      <span className={`text-[8px] uppercase font-bold px-2 py-1 border ${typeBadge(p.challenge_type)}`}>
                        {CHALLENGE_TYPES.find(x=>x.value===p.challenge_type)?.label ?? p.challenge_type}
                      </span>
                    </td>
                    <td className="px-[9px] py-[8px] font-mono">${Number(p.account_size).toLocaleString()}</td>
                    <td className="px-[9px] py-[8px] font-mono font-semibold text-[#2255CC]">${p.price_usd}</td>
                    <td className="px-[9px] py-[8px]">
                      <span className={`text-[8px] uppercase font-bold px-2 py-1 border ${p.drawdown_type==='trailing' ? 'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]' : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                        {p.drawdown_type==='trailing' ? '⟳ Trailing' : '— Static'}
                      </span>
                    </td>
                    <td className="px-[9px] py-[8px] font-mono">
                      {p.drawdown_type==='trailing'
                        ? <span className="text-[#D97706]">{p.trailing_drawdown}% trailing</span>
                        : `${p.ph1_max_dd}% max`}
                    </td>
                    <td className="px-[9px] py-[8px] font-mono">{p.ph1_daily_dd}%</td>
                    <td className="px-[9px] py-[8px] font-mono text-[#16A34A]">{p.funded_profit_split}%</td>
                    <td className="px-[9px] py-[8px]">
                      <span className="text-[10px]">{p.news_trading?'✓':'-'}</span>
                      <span className="text-[10px] ml-1">{p.weekend_holding?'✓':'-'}</span>
                    </td>
                    <td className="px-[9px] py-[8px]">
                      <span className={`text-[8px] uppercase font-bold px-2 py-1 border ${p.is_active ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                        {p.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-[9px] py-[8px]">
                      <div className="flex gap-1">
                        <button onClick={()=>openEdit(p)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[rgba(34,85,204,.2)] rounded cursor-pointer">Edit</button>
                        <button onClick={()=>toggleActive(p)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[#F4F7FD] text-[#5C7A9E] border border-[#E8EEF8] rounded cursor-pointer">{p.is_active?'Hide':'Show'}</button>
                        <button onClick={()=>deleteProduct(p)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-[780px] max-h-[90vh] flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EEF8] flex-shrink-0">
              <h2 className="text-[15px] font-bold text-[#1A3A6B]">{editing ? `Edit — ${editing.name}` : 'New Challenge Product'}</h2>
              <button onClick={()=>setModal(false)} className="text-[#8FA3BF] hover:text-[#1A3A6B] text-[20px] bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-5">

              {/* Challenge model */}
              <div>
                <label className={lbl}>Challenge Model</label>
                <div className="grid grid-cols-4 gap-2">
                  {CHALLENGE_TYPES.map(ct => (
                    <label key={ct.value} className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-all ${form.challenge_type===ct.value ? 'border-[#2255CC] bg-[rgba(34,85,204,.05)]' : 'border-[#E8EEF8] hover:border-[#C5D5EA]'}`}>
                      <input type="radio" name="ct" value={ct.value} checked={form.challenge_type===ct.value} onChange={F('challenge_type')} className="hidden"/>
                      <span className={`text-[10px] font-bold mb-1 ${form.challenge_type===ct.value?'text-[#2255CC]':'text-[#1A3A6B]'}`}>{ct.label}</span>
                      <span className="text-[9px] text-[#8FA3BF]">{ct.desc}</span>
                    </label>
                  ))}
                </div>
                {isInstant && <div className="mt-2 p-3 bg-[rgba(217,119,6,.06)] border border-[rgba(217,119,6,.2)] rounded-lg text-[10px] text-[#D97706]">⚡ Trader pays and gets funded immediately — no evaluation.</div>}
                {isPayAfter && <div className="mt-2 p-3 bg-[rgba(124,58,237,.06)] border border-[rgba(124,58,237,.2)] rounded-lg text-[10px] text-[#7C3AED]">💜 Trader evaluates for free — fee charged only after passing.</div>}
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Product Name *</label><input value={form.name} onChange={F('name')} placeholder="e.g. $50K 2-Step" className={inp}/></div>
                <div><label className={lbl}>Account Size ($) *</label><input type="number" value={form.account_size} onChange={F('account_size')} placeholder="50000" className={inp}/></div>
                <div><label className={lbl}>Price ($) *</label><input type="number" value={form.price_usd} onChange={F('price_usd')} placeholder="125" className={inp}/></div>
              </div>

              {/* Drawdown type */}
              <div>
                <label className={lbl}>Drawdown Type</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {DRAWDOWN_TYPES.map(dt => (
                    <label key={dt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${form.drawdown_type===dt.value ? 'border-[#D97706] bg-[rgba(217,119,6,.05)]' : 'border-[#E8EEF8] hover:border-[#C5D5EA]'}`}>
                      <input type="radio" name="dt" value={dt.value} checked={form.drawdown_type===dt.value} onChange={F('drawdown_type')} className="accent-[#D97706]"/>
                      <div>
                        <div className={`text-[11px] font-bold ${form.drawdown_type===dt.value?'text-[#D97706]':'text-[#1A3A6B]'}`}>{dt.label}</div>
                        <div className="text-[9px] text-[#8FA3BF]">{dt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {isTrailing && (
                  <div className="flex gap-3 items-end">
                    <div className="w-48">
                      <label className={lbl}>Trailing Drawdown (%)</label>
                      <input type="number" value={form.trailing_drawdown} onChange={F('trailing_drawdown')} placeholder="8" className={inp}/>
                    </div>
                    <div className="flex-1 p-3 bg-[rgba(217,119,6,.05)] border border-[rgba(217,119,6,.2)] rounded-lg text-[10px] text-[#D97706]">
                      ⟳ Floor = Peak Balance − {form.trailing_drawdown || 8}%. Moves up as balance grows, never down.
                      <br/>Example: $50K account → floor starts at ${(50000*(1-parseFloat(form.trailing_drawdown||'8')/100)).toLocaleString()}. If balance peaks at $52K → floor moves to ${(52000*(1-parseFloat(form.trailing_drawdown||'8')/100)).toLocaleString()}.
                    </div>
                  </div>
                )}
              </div>

              {/* Phase 1 */}
              {!isInstant && (
                <div className="border border-[#E8EEF8] rounded-lg p-4">
                  <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#2255CC] mb-3">Phase 1{isPayAfter ? ' — Free Evaluation' : ''}</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div><label className={lbl}>Profit Target (%)</label><input type="number" value={form.ph1_profit_target} onChange={F('ph1_profit_target')} className={inp}/></div>
                    <div><label className={lbl}>Daily DD (%)</label><input type="number" value={form.ph1_daily_dd} onChange={F('ph1_daily_dd')} className={inp}/></div>
                    <div>
                      <label className={lbl}>{isTrailing ? 'Max DD — auto from trailing' : 'Max DD (%)'}</label>
                      <input type="number" value={form.ph1_max_dd} onChange={F('ph1_max_dd')} className={inp} disabled={isTrailing} style={isTrailing?{opacity:0.4}:{}}/>
                    </div>
                    <div><label className={lbl}>Min Trading Days</label><input type="number" value={form.ph1_min_days} onChange={F('ph1_min_days')} className={inp}/></div>
                  </div>
                </div>
              )}

              {/* Phase 2 */}
              {form.challenge_type === '2step' && (
                <div className="border border-[#E8EEF8] rounded-lg p-4">
                  <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#16A34A] mb-3">Phase 2</div>
                  <div className="grid grid-cols-4 gap-3">
                    <div><label className={lbl}>Profit Target (%)</label><input type="number" value={form.ph2_profit_target} onChange={F('ph2_profit_target')} className={inp}/></div>
                    <div><label className={lbl}>Daily DD (%)</label><input type="number" value={form.ph2_daily_dd} onChange={F('ph2_daily_dd')} className={inp}/></div>
                    <div><label className={lbl}>{isTrailing ? 'Max DD — auto' : 'Max DD (%)'}</label><input type="number" value={form.ph2_max_dd} onChange={F('ph2_max_dd')} className={inp} disabled={isTrailing} style={isTrailing?{opacity:0.4}:{}}/></div>
                    <div><label className={lbl}>Min Trading Days</label><input type="number" value={form.ph2_min_days} onChange={F('ph2_min_days')} className={inp}/></div>
                  </div>
                </div>
              )}

              {/* Funded */}
              <div className="border border-[#E8EEF8] rounded-lg p-4">
                <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#D97706] mb-3">Funded Account</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={lbl}>Profit Split (%)</label><input type="number" value={form.funded_profit_split} onChange={F('funded_profit_split')} className={inp}/></div>
                  <div><label className={lbl}>Daily DD (%)</label><input type="number" value={form.funded_daily_dd} onChange={F('funded_daily_dd')} className={inp}/></div>
                  <div><label className={lbl}>{isTrailing ? 'Max DD — auto' : 'Max DD (%)'}</label><input type="number" value={form.funded_max_dd} onChange={F('funded_max_dd')} className={inp} disabled={isTrailing} style={isTrailing?{opacity:0.4}:{}}/></div>
                </div>
              </div>

              {/* Rules */}
              <div className="border border-[#E8EEF8] rounded-lg p-4">
                <div className="text-[9px] uppercase tracking-[2px] font-bold text-[#8FA3BF] mb-3">Trading Rules & Visibility</div>
                <div className="flex gap-6 flex-wrap">
                  {[['news_trading','News Trading Allowed'],['weekend_holding','Weekend Holding Allowed'],['is_active','Active (visible to traders)']].map(([k,l])=>(
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[k]} onChange={F(k)} className="accent-[#2255CC]"/>
                      <span className="text-[12px] text-[#5C7A9E]">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[#E8EEF8] flex-shrink-0">
              <button onClick={()=>setModal(false)} className="flex-1 py-2.5 bg-[#F4F7FD] border border-[#E8EEF8] text-[#5C7A9E] text-[10px] uppercase font-bold cursor-pointer rounded">Cancel</button>
              <Button onClick={save} loading={saving} className="flex-[2]">{editing ? 'Save Changes' : 'Create Product'}</Button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}