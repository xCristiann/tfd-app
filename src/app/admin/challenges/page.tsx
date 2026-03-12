import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, Modal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

const EMPTY = {
  name: '', account_size: '', price_usd: '', challenge_type: '2step',
  ph1_profit_target: '8', ph1_daily_dd: '5', ph1_max_dd: '10', ph1_min_days: '5',
  ph2_profit_target: '5', ph2_daily_dd: '5', ph2_max_dd: '10', ph2_min_days: '5',
  funded_daily_dd: '5', funded_max_dd: '10', funded_profit_split: '85',
  is_active: true,
}

export function AdminChallengePage() {
  const { toasts, toast, dismiss } = useToast()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('challenge_products').select('*').order('account_size', { ascending: true })
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setModal(true)
  }

  function openEdit(p: any) {
    setEditing(p)
    setForm({
      name: p.name, account_size: String(p.account_size), price_usd: String(p.price_usd),
      challenge_type: p.challenge_type,
      ph1_profit_target: String(p.ph1_profit_target), ph1_daily_dd: String(p.ph1_daily_dd),
      ph1_max_dd: String(p.ph1_max_dd), ph1_min_days: String(p.ph1_min_days),
      ph2_profit_target: String(p.ph2_profit_target), ph2_daily_dd: String(p.ph2_daily_dd),
      ph2_max_dd: String(p.ph2_max_dd), ph2_min_days: String(p.ph2_min_days),
      funded_daily_dd: String(p.funded_daily_dd), funded_max_dd: String(p.funded_max_dd),
      funded_profit_split: String(p.funded_profit_split), is_active: p.is_active,
    })
    setModal(true)
  }

  async function save() {
    if (!form.name || !form.account_size || !form.price_usd) {
      toast('warning','⚠️','Missing','Fill in name, size and price.'); return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      account_size: parseFloat(form.account_size),
      price_usd: parseFloat(form.price_usd),
      challenge_type: form.challenge_type,
      ph1_profit_target: parseFloat(form.ph1_profit_target),
      ph1_daily_dd: parseFloat(form.ph1_daily_dd),
      ph1_max_dd: parseFloat(form.ph1_max_dd),
      ph1_min_days: parseInt(form.ph1_min_days),
      ph2_profit_target: parseFloat(form.ph2_profit_target),
      ph2_daily_dd: parseFloat(form.ph2_daily_dd),
      ph2_max_dd: parseFloat(form.ph2_max_dd),
      ph2_min_days: parseInt(form.ph2_min_days),
      funded_daily_dd: parseFloat(form.funded_daily_dd),
      funded_max_dd: parseFloat(form.funded_max_dd),
      funded_profit_split: parseFloat(form.funded_profit_split),
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
      toast('success','✅','Created', `${form.name} added.`)
    }
    setSaving(false)
    setModal(false)
  }

  async function toggleActive(p: any) {
    const { data } = await supabase.from('challenge_products').update({ is_active: !p.is_active }).eq('id', p.id).select().single()
    if (data) setProducts(ps => ps.map(x => x.id === p.id ? data : x))
    toast('info','🔄','Updated', `${p.name} ${!p.is_active ? 'activated' : 'deactivated'}.`)
  }

  async function deleteProduct(p: any) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('challenge_products').delete().eq('id', p.id)
    if (error) { toast('error','❌','Error', error.message); return }
    setProducts(ps => ps.filter(x => x.id !== p.id))
    toast('success','🗑','Deleted', `${p.name} removed.`)
  }

  const F = ({ label, k, type='text' }: { label:string; k:string; type?:string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{label}</label>
      <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
        <input type={type} value={form[k]} onChange={e=>setForm((f:any)=>({...f,[k]:e.target.value}))}
          className="flex-1 px-3 py-[8px] bg-transparent outline-none text-[var(--text)] text-[12px] font-mono"/>
      </div>
    </div>
  )

  return (
    <>
      <DashboardLayout title="Challenge Products" nav={ADMIN_NAV} accentColor="red">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[11px] text-[var(--text3)]">{products.length} products · {products.filter(p=>p.is_active).length} active</span>
          <Button onClick={openNew}>+ Add Challenge</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
        ) : products.length === 0 ? (
          <Card><div className="py-16 text-center">
            <div className="text-[32px] mb-3">🎯</div>
            <p className="text-[12px] text-[var(--text2)] mb-4">No challenge products yet.</p>
            <Button onClick={openNew}>Create First Challenge</Button>
          </div></Card>
        ) : (
          <div className="grid grid-cols-3 gap-[14px]">
            {products.map(p=>(
              <Card key={p.id}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-serif text-[17px] font-bold text-[var(--gold)]">${Number(p.account_size).toLocaleString()}</div>
                    <div className="text-[11px] text-[var(--text2)]">{p.name}</div>
                    <div className={`text-[9px] mt-1 font-semibold ${p.is_active ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {p.is_active ? '● Active' : '○ Inactive'}
                    </div>
                  </div>
                  <div className="font-serif text-[22px] font-bold">${p.price_usd}</div>
                </div>
                {[
                  ['Type', p.challenge_type],
                  ['Ph1 Target/Daily/Max', `${p.ph1_profit_target}% / ${p.ph1_daily_dd}% / ${p.ph1_max_dd}%`],
                  ['Ph2 Target/Daily/Max', `${p.ph2_profit_target}% / ${p.ph2_daily_dd}% / ${p.ph2_max_dd}%`],
                  ['Funded DD/Max', `${p.funded_daily_dd}% / ${p.funded_max_dd}%`],
                  ['Profit Split', `${p.funded_profit_split}%`],
                ].map(([l,v])=>(
                  <div key={l} className="flex justify-between py-[5px] border-b border-[var(--dim)] last:border-0">
                    <span className="text-[9px] text-[var(--text3)]">{l}</span>
                    <span className="font-mono text-[10px] text-[var(--gold)]">{v}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={()=>openEdit(p)}>✏ Edit</Button>
                  <button onClick={()=>toggleActive(p)}
                    className={`flex-1 py-[5px] text-[8px] uppercase font-bold cursor-pointer border transition-all ${
                      p.is_active
                        ? 'bg-[rgba(255,51,82,.1)] text-[var(--red)] border-[rgba(255,51,82,.2)]'
                        : 'bg-[rgba(0,217,126,.1)] text-[var(--green)] border-[rgba(0,217,126,.2)]'
                    }`}>{p.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={()=>deleteProduct(p)}
                    className="px-[8px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.08)] text-[var(--red)] border border-[rgba(255,51,82,.15)]">🗑</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DashboardLayout>

      <Modal open={modal} onClose={()=>setModal(false)}
        title={editing ? 'Edit Challenge' : 'New Challenge'}
        subtitle="Configure challenge rules and pricing">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><F label="Product Name" k="name"/></div>
          <F label="Account Size ($)" k="account_size" type="number"/>
          <F label="Price ($)" k="price_usd" type="number"/>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Type</label>
            <div className="flex bg-[var(--bg3)] border border-[var(--dim)]">
              {['2step','1step'].map(t=>(
                <button key={t} onClick={()=>setForm((f:any)=>({...f,challenge_type:t}))}
                  className={`flex-1 py-[7px] text-[9px] uppercase font-bold cursor-pointer border-none transition-all ${form.challenge_type===t?'bg-[rgba(212,168,67,.15)] text-[var(--gold)]':'bg-transparent text-[var(--text3)]'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="col-span-2 text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold pt-1">Phase 1</div>
          <F label="Profit Target %" k="ph1_profit_target" type="number"/>
          <F label="Daily DD %" k="ph1_daily_dd" type="number"/>
          <F label="Max DD %" k="ph1_max_dd" type="number"/>
          <F label="Min Days" k="ph1_min_days" type="number"/>
          {form.challenge_type === '2step' && <>
            <div className="col-span-2 text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold pt-1">Phase 2</div>
            <F label="Profit Target %" k="ph2_profit_target" type="number"/>
            <F label="Daily DD %" k="ph2_daily_dd" type="number"/>
            <F label="Max DD %" k="ph2_max_dd" type="number"/>
            <F label="Min Days" k="ph2_min_days" type="number"/>
          </>}
          <div className="col-span-2 text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold pt-1">Funded Account</div>
          <F label="Daily DD %" k="funded_daily_dd" type="number"/>
          <F label="Max DD %" k="funded_max_dd" type="number"/>
          <div className="col-span-2"><F label="Profit Split %" k="funded_profit_split" type="number"/></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={()=>setModal(false)} className="px-[18px] py-[8px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-[22px] py-[8px] bg-[var(--gold)] text-[var(--bg)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
