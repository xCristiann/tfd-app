'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Challenge } from '@/types'

const EMPTY_CH: Partial<Challenge> = {
  name:'', account_size:0, price_usd:0, profit_split:'80%',
  phase1_target:8, phase1_daily_dd:4, phase1_max_dd:8, phase1_min_days:0, phase1_time_limit:0,
  phase2_target:5, phase2_daily_dd:4, phase2_max_dd:8, phase2_min_days:0, phase2_time_limit:0,
  payout_frequency:'Bi-weekly', min_payout:100, payout_methods:[],
  allows_weekend_holding:true, allows_news_trading:true, allows_ea:true, allows_hedging:true, sort_order:0
}

export default function ChallengesBuilder({ firms, challenges }: { firms: {id:string;name:string}[]; challenges: Challenge[] }) {
  const [selectedFirmId, setSelectedFirmId] = useState(firms[0]?.id || '')
  const [activeIdx, setActiveIdx] = useState(0)
  const [editing, setEditing] = useState<Partial<Challenge>>(EMPTY_CH)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'list'|'edit'>('list')
  const router = useRouter()
  const supabase = createClient()

  const firmChallenges = challenges.filter(c => c.firm_id === selectedFirmId)

  const openNew = () => { setEditing({ ...EMPTY_CH, firm_id: selectedFirmId, sort_order: firmChallenges.length }); setMode('edit') }
  const openEdit = (c: Challenge) => { setEditing(c); setMode('edit') }

  const set = (k: keyof Challenge, v: any) => setEditing(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true); setError('')
    const payload = { ...editing, firm_id: selectedFirmId }
    let err: any
    if (editing.id) {
      ({ error: err } = await supabase.from('challenges').update(payload).eq('id', editing.id))
    } else {
      ({ error: err } = await supabase.from('challenges').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false); setMode('list')
    router.refresh()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this challenge?')) return
    await supabase.from('challenges').delete().eq('id', id)
    router.refresh()
  }

  const inp = (label: string, key: keyof Challenge, type='text', placeholder='') => (
    <div>
      <label style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
      <input type={type} value={String(editing[key]??'')} onChange={e=>set(key, type==='number'?Number(e.target.value):e.target.value)} placeholder={placeholder} className="input-base" style={{fontSize:'13px',padding:'9px 12px'}} />
    </div>
  )

  const tog = (label: string, key: keyof Challenge) => (
    <div style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}} onClick={()=>set(key,!editing[key])}>
      <div style={{width:'18px',height:'18px',borderRadius:'5px',border:`2px solid ${editing[key]?'var(--teal)':'var(--border2)'}`,background:editing[key]?'var(--teal)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {editing[key] && <span style={{color:'#04120c',fontSize:'11px',fontWeight:800}}>&#10003;</span>}
      </div>
      <span style={{fontSize:'13px',color:'var(--t2)'}}>{label}</span>
    </div>
  )

  const panel = (title: string, children: React.ReactNode) => (
    <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'24px',marginBottom:'16px'}}>
      <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'16px',paddingBottom:'12px',borderBottom:'1px solid var(--border)'}}>{title}</h3>
      {children}
    </div>
  )

  return (
    <div>
      {/* Firm selector */}
      <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'16px'}}>
        <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',textTransform:'uppercase',letterSpacing:'.04em',whiteSpace:'nowrap'}}>Select Firm</label>
        <select value={selectedFirmId} onChange={e=>{ setSelectedFirmId(e.target.value); setMode('list') }} className="input-base" style={{maxWidth:'280px'}}>
          {firms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {mode === 'list' && <button onClick={openNew} className="btn-primary" style={{marginLeft:'auto',whiteSpace:'nowrap'}}>+ Add Challenge Tier</button>}
      </div>

      {error && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'9px',padding:'12px 16px',color:'var(--coral)',fontSize:'13.5px',marginBottom:'16px'}}>{error}</div>}

      {mode === 'list' && (
        <>
          {firmChallenges.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',color:'var(--t2)'}}>
              No challenges yet for this firm. <button onClick={openNew} style={{color:'var(--teal)',background:'none',border:'none',cursor:'pointer',fontWeight:600,fontSize:'14px'}}>Add first tier &rarr;</button>
            </div>
          ) : firmChallenges.map(c => (
            <div key={c.id} style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',marginBottom:'12px'}}>
              <div style={{background:'var(--bg2)',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontWeight:700,fontSize:'14px'}}>{c.name} &mdash; ${c.account_size.toLocaleString()}</div>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'18px',fontWeight:900,color:'var(--teal)'}}>${c.price_usd}</span>
                  <button onClick={()=>openEdit(c)} style={{padding:'6px 14px',borderRadius:'7px',fontSize:'12px',fontWeight:600,background:'transparent',border:'1px solid var(--border2)',color:'var(--t1)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Edit</button>
                  <button onClick={()=>del(c.id)} style={{padding:'6px 12px',borderRadius:'7px',fontSize:'12px',fontWeight:600,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',color:'var(--coral)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Del</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'16px 20px',gap:'12px',fontSize:'12px'}}>
                {[['Ph1 Target',`${c.phase1_target}%`,'amber'],['Max DD',`${c.phase1_max_dd}%`,'red'],['Profit Split',c.profit_split||'&mdash;','green'],['Min Payout',`$${c.min_payout}`,'neutral']].map(([l,v,t])=>(
                  <div key={String(l)}>
                    <div style={{color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px',fontSize:'10px',fontWeight:600}}>{l}</div>
                    <div style={{fontWeight:700,fontFamily:'JetBrains Mono,monospace',color:t==='green'?'var(--green)':t==='red'?'var(--coral)':t==='amber'?'var(--amber)':'var(--t1)'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {mode === 'edit' && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
            <h2 style={{fontSize:'16px',fontWeight:700}}>{editing.id ? 'Edit Challenge' : 'New Challenge Tier'}</h2>
            <button onClick={()=>setMode('list')} style={{padding:'7px 14px',borderRadius:'8px',fontSize:'13px',border:'1px solid var(--border2)',color:'var(--t2)',background:'transparent',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>&larr; Back to list</button>
          </div>

          {panel('Challenge Identity', (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}}>
              {inp('Challenge Name','name','text','e.g. Standard')}
              {inp('Account Size (USD)','account_size','number','25000')}
              {inp('Price (USD)','price_usd','number','99')}
              {inp('Profit Split','profit_split','text','80% or 80&rarr;100%')}
              {inp('Sort Order','sort_order','number','0')}
            </div>
          ))}

          {panel('Phase 1', (
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'14px'}}>
              {inp('Profit Target %','phase1_target','number')}
              {inp('Daily DD %','phase1_daily_dd','number')}
              {inp('Max DD %','phase1_max_dd','number')}
              {inp('Min Days','phase1_min_days','number')}
              {inp('Time Limit Days','phase1_time_limit','number')}
            </div>
          ))}

          {panel('Phase 2', (
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'14px'}}>
              {inp('Profit Target %','phase2_target','number')}
              {inp('Daily DD %','phase2_daily_dd','number')}
              {inp('Max DD %','phase2_max_dd','number')}
              {inp('Min Days','phase2_min_days','number')}
              {inp('Time Limit Days','phase2_time_limit','number')}
            </div>
          ))}

          {panel('Funded Account & Payout', (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em'}}>Payout Frequency</label>
                <select value={editing.payout_frequency||'Bi-weekly'} onChange={e=>set('payout_frequency',e.target.value)} className="input-base" style={{fontSize:'13px',padding:'9px 12px'}}>
                  {['Bi-weekly','Monthly','Weekly','On demand'].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              {inp('Min Payout ($)','min_payout','number','100')}
              <div>
                <label style={{fontSize:'11px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em'}}>Payout Methods</label>
                <input value={(editing.payout_methods||[]).join(', ')} onChange={e=>set('payout_methods',e.target.value.split(',').map((s:string)=>s.trim()))} placeholder="Wire, Wise, Crypto" className="input-base" style={{fontSize:'13px',padding:'9px 12px'}} />
              </div>
            </div>
          ))}

          {panel('Allowed Trading Styles', (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
              {tog('Weekend Holding','allows_weekend_holding')}
              {tog('News Trading','allows_news_trading')}
              {tog('EA / Bots','allows_ea')}
              {tog('Hedging','allows_hedging')}
            </div>
          ))}

          <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
            <button onClick={()=>setMode('list')} style={{padding:'10px 20px',borderRadius:'9px',fontSize:'14px',fontWeight:500,color:'var(--t1)',background:'transparent',border:'1px solid var(--border2)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary" style={{opacity:saving?0.7:1}}>
              {saving ? 'Saving...' : 'Save Challenge'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
