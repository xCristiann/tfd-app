'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Rule } from '@/types'

const CATEGORIES = ['General Trading','Account & Payout','Instruments','Prohibited Strategies']
const VALUE_TYPES = ['green','red','amber','neutral'] as const
const EMPTY: Partial<Rule> = { label:'', value:'', value_type:'neutral', category:'General Trading', notes:'', sort_order:0 }

const valueColor = (t: string) => t==='green'?'var(--green)':t==='red'?'var(--coral)':t==='amber'?'var(--amber)':'var(--t1)'

export default function RulesManager({ firms, rules }: { firms:{id:string;name:string}[]; rules: Rule[] }) {
  const [selectedFirmId, setSelectedFirmId] = useState(firms[0]?.id || '')
  const [editing, setEditing] = useState<Partial<Rule>>(EMPTY)
  const [mode, setMode] = useState<'list'|'edit'>('list')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const firmRules = rules.filter(r => r.firm_id === selectedFirmId)
  const cats = CATEGORIES.filter(c => firmRules.some(r => r.category === c))

  const openEdit = (r?: Rule) => { setEditing(r ? {...r} : { ...EMPTY, firm_id: selectedFirmId, sort_order: firmRules.length }); setMode('edit') }

  const set = (k: keyof Rule, v: any) => setEditing(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true); setError('')
    if (!editing.label || !editing.value) { setError('Label and value are required'); setSaving(false); return }
    const payload = { ...editing, firm_id: selectedFirmId }
    let err: any
    if (editing.id) {
      ({ error: err } = await supabase.from('rules').update(payload).eq('id', editing.id))
    } else {
      ({ error: err } = await supabase.from('rules').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false); setMode('list'); router.refresh()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await supabase.from('rules').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      {/* Firm + category selector */}
      <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap'}}>Firm</label>
          <select value={selectedFirmId} onChange={e=>{ setSelectedFirmId(e.target.value); setMode('list') }} className="input-base" style={{maxWidth:'200px'}}>
            {firms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        {mode==='list' && <button onClick={()=>openEdit()} className="btn-primary" style={{marginLeft:'auto'}}>+ Add Rule</button>}
      </div>

      {error && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'9px',padding:'12px 16px',color:'var(--coral)',fontSize:'13.5px',marginBottom:'16px'}}>{error}</div>}

      {/* LIST MODE */}
      {mode==='list' && (
        <>
          {firmRules.length===0 ? (
            <div style={{textAlign:'center',padding:'60px',background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',color:'var(--t2)'}}>
              No rules yet. <button onClick={()=>openEdit()} style={{color:'var(--teal)',background:'none',border:'none',cursor:'pointer',fontWeight:600,fontSize:'14px',fontFamily:'Inter,sans-serif'}}>Add first rule &rarr;</button>
            </div>
          ) : (
            <>
              {/* All rules table */}
              <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',marginBottom:'16px'}}>
                <div style={{background:'var(--bg2)',padding:'13px 20px',display:'grid',gridTemplateColumns:'2fr 1.5fr 1fr 1fr 90px',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--t3)'}}>
                  <div>Rule</div><div>Value</div><div>Type</div><div>Category</div><div>Actions</div>
                </div>
                {firmRules.map(rule => (
                  <div key={rule.id} style={{padding:'14px 20px',display:'grid',gridTemplateColumns:'2fr 1.5fr 1fr 1fr 90px',alignItems:'center',fontSize:'13.5px',borderTop:'1px solid var(--border)',transition:'background .15s'}}>
                    <div style={{fontWeight:500}}>{rule.label}</div>
                    <div style={{fontWeight:700,fontFamily:'JetBrains Mono,monospace',fontSize:'13px',color:valueColor(rule.value_type)}}>{rule.value}</div>
                    <div>
                      <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'100px',fontWeight:600,background:rule.value_type==='green'?'rgba(52,211,153,0.1)':rule.value_type==='red'?'rgba(248,113,113,0.1)':rule.value_type==='amber'?'rgba(251,191,36,0.1)':'var(--bg2)',color:valueColor(rule.value_type),border:`1px solid ${valueColor(rule.value_type)}33`}}>
                        {rule.value_type}
                      </span>
                    </div>
                    <div style={{fontSize:'12px',color:'var(--t3)'}}>{rule.category}</div>
                    <div style={{display:'flex',gap:'5px'}}>
                      <button onClick={()=>openEdit(rule)} style={{padding:'5px 10px',borderRadius:'7px',fontSize:'11.5px',fontWeight:600,background:'transparent',border:'1px solid var(--border2)',color:'var(--t1)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Edit</button>
                      <button onClick={()=>del(rule.id)} style={{padding:'5px 8px',borderRadius:'7px',fontSize:'11.5px',fontWeight:600,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',color:'var(--coral)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* EDIT MODE */}
      {mode==='edit' && (
        <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'28px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',paddingBottom:'16px',borderBottom:'1px solid var(--border)'}}>
            <h3 style={{fontSize:'16px',fontWeight:700}}>{editing.id ? 'Edit Rule' : 'Add Rule'}</h3>
            <button onClick={()=>setMode('list')} style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',border:'1px solid var(--border2)',color:'var(--t2)',background:'transparent',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>&larr; Back</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Rule Label</label>
              <input value={editing.label||''} onChange={e=>set('label',e.target.value)} placeholder="e.g. Weekend holding" className="input-base" />
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Value</label>
              <input value={editing.value||''} onChange={e=>set('value',e.target.value)} placeholder="e.g. Allowed" className="input-base" />
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Value Type (color)</label>
              <select value={editing.value_type||'neutral'} onChange={e=>set('value_type',e.target.value)} className="input-base">
                {VALUE_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}{t==='green'?' &#10003; (Allowed)':t==='red'?' &times; (Not allowed)':t==='amber'?' ⚠ (Limited)':' &mdash; (Neutral)'}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Category</label>
              <select value={editing.category||'General Trading'} onChange={e=>set('category',e.target.value)} className="input-base">
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Sort Order</label>
              <input type="number" value={editing.sort_order??0} onChange={e=>set('sort_order',Number(e.target.value))} className="input-base" />
            </div>
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Notes (shown to user on hover)</label>
            <input value={editing.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Optional clarification..." className="input-base" />
          </div>

          {/* Preview */}
          <div style={{background:'var(--bg2)',borderRadius:'10px',padding:'14px 18px',marginBottom:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'14px'}}>
            <span style={{color:'var(--t2)'}}>Preview: {editing.label||'Rule label'}</span>
            <span style={{fontWeight:700,fontFamily:'JetBrains Mono,monospace',fontSize:'13px',color:valueColor(editing.value_type||'neutral')}}>{editing.value||'Value'}</span>
          </div>

          <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
            <button onClick={()=>setMode('list')} style={{padding:'10px 20px',borderRadius:'9px',fontSize:'14px',fontWeight:500,color:'var(--t1)',background:'transparent',border:'1px solid var(--border2)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary" style={{opacity:saving?0.7:1}}>
              {saving?'Saving...':'Save Rule'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
