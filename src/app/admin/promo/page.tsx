import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

const TEMPLATES = [
  { id: 'bogo',      label: 'BOGO Offer',         bg: '#D97706', text: '#000',  preview: '🎁 BUY ONE GET ONE FREE · Use code {code} at checkout · Limited time!' },
  { id: 'discount',  label: 'Discount',            bg: '#2255CC', text: '#fff',  preview: '{pct}% OFF · Use code {code} · New traders only' },
  { id: 'newtrader', label: 'New Trader',          bg: '#16A34A', text: '#fff',  preview: '🚀 {pct}% OFF for new traders · Code: {code} · Start your journey today' },
  { id: 'flash',     label: 'Flash Sale',          bg: '#DC2626', text: '#fff',  preview: '⚡ FLASH SALE · {pct}% OFF all challenges · Ends {date} · Code: {code}' },
  { id: 'custom',    label: 'Custom Message',      bg: '#1A3A6B', text: '#fff',  preview: 'Write your own message...' },
]

const PRESETS_BG = ['#D97706','#2255CC','#16A34A','#DC2626','#1A3A6B','#7C3AED','#0F172A','#B45309']

interface PromoBar {
  id: string
  is_active: boolean
  template: string
  message: string
  badge_1_text: string
  badge_1_code: string
  badge_2_text: string
  badge_2_code: string
  bg_color: string
  text_color: string
  link_url: string
  link_text: string
  show_close: boolean
  created_at: string
}

const EMPTY: Omit<PromoBar,'id'|'created_at'> = {
  is_active:    false,
  template:     'discount',
  message:      '🎉 Special offer — trade with us today!',
  badge_1_text: '40% OFF',
  badge_1_code: 'SAVE40',
  badge_2_text: '50% OFF for new traders',
  badge_2_code: 'FIRSTGET',
  bg_color:     '#D97706',
  text_color:   '#000000',
  link_url:     '/#plans',
  link_text:    'View Plans',
  show_close:   true,
}

export function AdminPromoPage() {
  const { toasts, toast, dismiss } = useToast()
  const [bars, setBars]       = useState<PromoBar[]>([])
  const [form, setForm]       = useState<Omit<PromoBar,'id'|'created_at'>>(EMPTY)
  const [editId, setEditId]   = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('promo_bars').select('*').order('created_at', { ascending: false })
    setBars(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startNew() {
    setForm(EMPTY)
    setEditId(null)
  }

  function startEdit(b: PromoBar) {
    const { id, created_at, ...rest } = b
    setForm(rest)
    setEditId(id)
  }

  async function save() {
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('promo_bars').update(form).eq('id', editId)
      if (error) { toast('error','❌','Error', error.message); setSaving(false); return }
      toast('success','✅','Saved','Promo bar updated.')
    } else {
      const { error } = await supabase.from('promo_bars').insert(form)
      if (error) { toast('error','❌','Error', error.message); setSaving(false); return }
      toast('success','✅','Created','Promo bar created.')
    }
    setSaving(false)
    setEditId(null)
    setForm(EMPTY)
    load()
  }

  async function toggleActive(id: string, val: boolean) {
    // Only one bar can be active at a time
    if (val) await supabase.from('promo_bars').update({ is_active: false }).neq('id', id)
    await supabase.from('promo_bars').update({ is_active: val }).eq('id', id)
    toast(val ? 'success' : 'warning', val ? '✅' : '⏸', val ? 'Live' : 'Hidden', `Promo bar ${val ? 'is now live on the homepage' : 'hidden'}.`)
    load()
  }

  async function del(id: string) {
    if (!window.confirm('Delete this promo bar?')) return
    await supabase.from('promo_bars').delete().eq('id', id)
    if (editId === id) { setEditId(null); setForm(EMPTY) }
    toast('warning','🗑','Deleted','Promo bar removed.')
    load()
  }

  const inp = 'w-full px-3 py-2 text-[12px] border border-[#E8EEF8] rounded-lg bg-white text-[#1A3A6B] outline-none focus:border-[#2255CC]'

  return (
    <>
      <DashboardLayout title="Promo Bar Manager" nav={ADMIN_NAV} accentColor="red">

        {/* Live preview */}
        <div className="rounded-xl overflow-hidden border border-[#E8EEF8]">
          <div className="text-[9px] uppercase tracking-[2px] text-[#8FA3BF] px-4 py-2 bg-[#F8F9FC] border-b border-[#E8EEF8] font-semibold">
            Live Preview
          </div>
          <div style={{
            background: form.bg_color,
            color: form.text_color,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '12px',
            fontWeight: 600,
            minHeight: '44px',
          }}>
            <span style={{letterSpacing:'0.5px'}}>{form.message}</span>
            {form.badge_1_code && (
              <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{opacity:.7,fontSize:'11px'}}>{form.badge_1_text}</span>
                <span style={{background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.35)',padding:'2px 10px',borderRadius:'4px',fontSize:'11px',fontWeight:700,letterSpacing:'1px'}}>
                  CODE: {form.badge_1_code}
                </span>
              </span>
            )}
            {form.badge_2_code && (
              <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{opacity:.7,fontSize:'11px'}}>{form.badge_2_text}</span>
                <span style={{background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.35)',padding:'2px 10px',borderRadius:'4px',fontSize:'11px',fontWeight:700,letterSpacing:'1px'}}>
                  CODE: {form.badge_2_code}
                </span>
              </span>
            )}
            {form.link_url && <a href={form.link_url} style={{color:form.text_color,textDecoration:'underline',fontSize:'11px',opacity:.8}}>{form.link_text} →</a>}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-5">

          {/* Form */}
          <Card>
            <CardHeader title={editId ? 'Edit Promo Bar' : 'Create New Promo Bar'}/>

            {/* Template picker */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Template</label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => {
                    setForm(f => ({
                      ...f,
                      template: t.id,
                      bg_color: t.bg,
                      text_color: t.text,
                      message: t.id !== 'custom' ? t.preview.replace('{code}', f.badge_1_code).replace('{pct}', '40').replace('{date}', 'midnight') : f.message,
                    }))
                  }}
                    className={`px-3 py-2 text-[10px] font-semibold rounded-lg border cursor-pointer text-left transition-all ${form.template === t.id ? 'border-[#2255CC] bg-[rgba(34,85,204,.06)] text-[#2255CC]' : 'border-[#E8EEF8] text-[#5C7A9E] hover:border-[#C5D5EA]'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main message */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Main Message</label>
              <input className={inp} value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} placeholder="e.g. Special offer — trade with us today!"/>
            </div>

            {/* Badges */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Badge 1 Label</label>
                <input className={inp} value={form.badge_1_text} onChange={e => setForm(f => ({...f, badge_1_text: e.target.value}))} placeholder="e.g. 40% OFF + BOGO"/>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Badge 1 Code</label>
                <input className={inp} value={form.badge_1_code} onChange={e => setForm(f => ({...f, badge_1_code: e.target.value.toUpperCase()}))} placeholder="e.g. BOGO40"/>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Badge 2 Label</label>
                <input className={inp} value={form.badge_2_text} onChange={e => setForm(f => ({...f, badge_2_text: e.target.value}))} placeholder="e.g. 50% OFF for new traders"/>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Badge 2 Code</label>
                <input className={inp} value={form.badge_2_code} onChange={e => setForm(f => ({...f, badge_2_code: e.target.value.toUpperCase()}))} placeholder="e.g. FIRSTGET"/>
              </div>
            </div>

            {/* Link */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Link URL</label>
                <input className={inp} value={form.link_url} onChange={e => setForm(f => ({...f, link_url: e.target.value}))} placeholder="/#plans"/>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Link Text</label>
                <input className={inp} value={form.link_text} onChange={e => setForm(f => ({...f, link_text: e.target.value}))} placeholder="View Plans"/>
              </div>
            </div>

            {/* Colors */}
            <div className="mb-5">
              <label className="text-[10px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Background Color</label>
              <div className="flex gap-2 flex-wrap items-center">
                {PRESETS_BG.map(c => (
                  <button key={c} onClick={() => setForm(f => ({...f, bg_color: c, text_color: ['#D97706','#16A34A','#2255CC'].includes(c) ? '#fff' : '#fff'}))}
                    style={{width:'28px',height:'28px',borderRadius:'6px',background:c,border:form.bg_color===c?'2px solid #1A3A6B':'2px solid transparent',cursor:'pointer',flexShrink:0}}/>
                ))}
                <input type="color" value={form.bg_color} onChange={e => setForm(f => ({...f, bg_color: e.target.value}))}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"/>
                <span className="text-[10px] text-[#8FA3BF]">Text:</span>
                <input type="color" value={form.text_color} onChange={e => setForm(f => ({...f, text_color: e.target.value}))}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"/>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={save} disabled={saving}
                className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide bg-[#2255CC] text-white rounded-lg cursor-pointer border-none disabled:opacity-50">
                {saving ? 'Saving...' : editId ? 'Update Bar' : 'Create Bar'}
              </button>
              {editId && (
                <button onClick={startNew}
                  className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide bg-[#F4F7FD] text-[#5C7A9E] rounded-lg cursor-pointer border-none">
                  Cancel
                </button>
              )}
            </div>
          </Card>

          {/* List */}
          <div className="flex flex-col gap-3">
            <button onClick={startNew}
              className="w-full py-2.5 text-[11px] font-bold uppercase tracking-wide border border-dashed border-[#C5D5EA] text-[#2255CC] rounded-lg cursor-pointer bg-transparent hover:bg-[rgba(34,85,204,.04)] transition-all">
              + New Promo Bar
            </button>

            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
            ) : bars.length === 0 ? (
              <div className="text-center py-8 text-[#8FA3BF] text-[12px]">No promo bars yet</div>
            ) : bars.map(b => (
              <div key={b.id} className={`border rounded-xl overflow-hidden ${b.is_active ? 'border-[rgba(34,85,204,.3)]' : 'border-[#E8EEF8]'}`}>
                {/* Mini preview */}
                <div style={{background: b.bg_color, padding:'8px 12px', minHeight:'32px', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                  <span style={{color: b.text_color, fontSize:'10px', fontWeight:600}}>{b.message}</span>
                  {b.badge_1_code && <span style={{background:'rgba(255,255,255,.2)',color:b.text_color,fontSize:'9px',fontWeight:700,padding:'1px 6px',borderRadius:'3px'}}>CODE: {b.badge_1_code}</span>}
                  {b.badge_2_code && <span style={{background:'rgba(255,255,255,.2)',color:b.text_color,fontSize:'9px',fontWeight:700,padding:'1px 6px',borderRadius:'3px'}}>CODE: {b.badge_2_code}</span>}
                </div>
                {/* Actions */}
                <div className="bg-white px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase ${b.is_active ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                      {b.is_active ? 'LIVE' : 'HIDDEN'}
                    </span>
                    <span className="text-[10px] text-[#8FA3BF]">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => toggleActive(b.id, !b.is_active)}
                      className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded cursor-pointer border ${b.is_active ? 'bg-[rgba(220,38,38,.06)] text-[#DC2626] border-[rgba(220,38,38,.2)]' : 'bg-[rgba(22,163,74,.06)] text-[#16A34A] border-[rgba(22,163,74,.2)]'}`}>
                      {b.is_active ? 'Deactivate' : 'Go Live'}
                    </button>
                    <button onClick={() => startEdit(b)}
                      className="px-2.5 py-1 text-[9px] font-bold uppercase rounded cursor-pointer bg-[rgba(34,85,204,.06)] text-[#2255CC] border border-[rgba(34,85,204,.2)]">
                      Edit
                    </button>
                    <button onClick={() => del(b.id)}
                      className="px-2.5 py-1 text-[9px] font-bold uppercase rounded cursor-pointer bg-[rgba(220,38,38,.04)] text-[#DC2626] border border-[rgba(220,38,38,.15)]">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
