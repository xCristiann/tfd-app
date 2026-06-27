'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Firm } from '@/types'

const EMPTY: Partial<Firm> = {
  name:'', slug:'', website:'', affiliate_link:'', discount_code:'',
  founded_year: undefined, headquarters:'', platforms:[], short_description:'',
  admin_notes:'', trust_score:0, payout_reliability:'Unknown', avg_payout_days: undefined,
  support_quality:'Medium', years_active: undefined, delayed_payout_reports:0,
  rules_clarity:'Clear', total_funded_traders:'', payout_methods:[],
  accepts_eu:true, markets_forex:true, markets_futures:false, markets_crypto:false,
  markets_indices:false, markets_metals:false, markets_commodities:false,
  is_published:false, is_featured:false
}

export default function FirmForm({ firm }: { firm?: Firm }) {
  const [data, setData] = useState<Partial<Firm>>(firm || EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const set = (k: keyof Firm, v: any) => setData(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true); setError('')
    if (!data.name || !data.slug) { setError('Name and slug are required'); setSaving(false); return }
    const payload = { ...data, updated_at: new Date().toISOString() }
    let err
    if (firm?.id) {
      ({ error: err } = await supabase.from('firms').update(payload).eq('id', firm.id))
    } else {
      ({ error: err } = await supabase.from('firms').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/admin/firms')
    router.refresh()
  }

  const inp = (label: string, key: keyof Firm, type='text', placeholder='') => (
    <div>
      <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
      <input type={type} value={String(data[key]??'')} onChange={e=>set(key, type==='number'?Number(e.target.value):e.target.value)} placeholder={placeholder} className="input-base" />
    </div>
  )

  const sel = (label: string, key: keyof Firm, options: string[]) => (
    <div>
      <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
      <select value={String(data[key]??'')} onChange={e=>set(key,e.target.value)} className="input-base">
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  )

  const tog = (label: string, key: keyof Firm) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderTop:'1px solid var(--border)'}}>
      <label style={{fontSize:'14px',color:'var(--t2)'}}>{label}</label>
      <div onClick={()=>set(key,!data[key])} style={{width:'44px',height:'24px',borderRadius:'100px',background:data[key]?'var(--teal)':'var(--bg3)',border:`1px solid ${data[key]?'var(--teal)':'var(--border2)'}`,position:'relative',cursor:'pointer',transition:'background .2s',boxShadow:data[key]?'0 0 10px var(--teal-glow)':undefined}}>
        <div style={{position:'absolute',top:'3px',left:data[key]?'23px':'3px',width:'16px',height:'16px',borderRadius:'50%',background:data[key]?'#04120c':'var(--t3)',transition:'left .2s'}} />
      </div>
    </div>
  )

  const panel = (title: string, children: React.ReactNode) => (
    <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'28px',marginBottom:'20px'}}>
      <h3 style={{fontSize:'15px',fontWeight:700,marginBottom:'20px',paddingBottom:'14px',borderBottom:'1px solid var(--border)'}}>{title}</h3>
      {children}
    </div>
  )

  return (
    <div>
      {error && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'9px',padding:'12px 16px',color:'var(--coral)',fontSize:'13.5px',marginBottom:'20px'}}>{error}</div>}

      {panel('Firm Identity', (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          {inp('Firm Name','name','text','e.g. The5ers')}
          {inp('Slug (URL)','slug','text','e.g. the5ers')}
          {inp('Official Website','website','url','https://')}
          {inp('Affiliate / Referral Link','affiliate_link','url','https://')}
          {inp('Discount Code','discount_code','text','e.g. TFD10')}
          {inp('Founded Year','founded_year','number','2016')}
          {inp('Headquarters','headquarters','text','Tel Aviv, Israel')}
          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Platforms (comma separated)</label>
            <input value={(data.platforms||[]).join(', ')} onChange={e=>set('platforms',e.target.value.split(',').map(s=>s.trim()))} placeholder="MT4, MT5, cTrader" className="input-base" />
          </div>
          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Total Funded Traders</label>
            <input value={data.total_funded_traders||''} onChange={e=>set('total_funded_traders',e.target.value)} placeholder="10,000+" className="input-base" />
          </div>
        </div>
      ))}

      {panel('Trust Score Inputs', (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Trust Score (0–100)</label>
            <input type="number" min={0} max={100} value={data.trust_score||0} onChange={e=>set('trust_score',Number(e.target.value))} className="input-base" />
          </div>
          {sel('Payout Reliability','payout_reliability',['Unknown','Confirmed','Reported issues'])}
          {inp('Avg Payout Speed (days)','avg_payout_days','number')}
          {sel('Support Quality','support_quality',['Fast','Medium','Slow'])}
          {inp('Years Active','years_active','number')}
          {inp('Delayed Payout Reports','delayed_payout_reports','number')}
          {sel('Rules Clarity','rules_clarity',['Clear','Ambiguous','Unclear'])}
          <div>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Payout Methods (comma sep.)</label>
            <input value={(data.payout_methods||[]).join(', ')} onChange={e=>set('payout_methods',e.target.value.split(',').map(s=>s.trim()))} placeholder="Wire, Wise, Crypto" className="input-base" />
          </div>
        </div>
      ))}

      {panel('Markets & Instruments', (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
          {(['markets_forex','markets_futures','markets_crypto','markets_indices','markets_metals','markets_commodities'] as (keyof Firm)[]).map(k => (
            <div key={String(k)} style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}} onClick={()=>set(k,!data[k])}>
              <div style={{width:'18px',height:'18px',borderRadius:'5px',border:`2px solid ${data[k]?'var(--teal)':'var(--border2)'}`,background:data[k]?'var(--teal)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {data[k] && <span style={{color:'#04120c',fontSize:'12px',fontWeight:800}}>✓</span>}
              </div>
              <span style={{fontSize:'14px',color:'var(--t2)',textTransform:'capitalize'}}>{String(k).replace('markets_','')}</span>
            </div>
          ))}
        </div>
      ))}

      {panel('Description & Settings', (
        <div>
          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Short description (shown on card)</label>
            <textarea value={data.short_description||''} onChange={e=>set('short_description',e.target.value)} className="input-base" style={{minHeight:'80px',resize:'vertical',lineHeight:1.6}} placeholder="One-paragraph summary..." />
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Internal notes (admin only)</label>
            <textarea value={data.admin_notes||''} onChange={e=>set('admin_notes',e.target.value)} className="input-base" style={{minHeight:'60px',resize:'vertical',lineHeight:1.6}} placeholder="Private notes..." />
          </div>
          <div style={{borderTop:'1px solid var(--border)',paddingTop:'4px'}}>
            {tog('Published (visible on site)','is_published')}
            {tog('Featured on homepage','is_featured')}
            {tog('Accepts EU / Romanian traders','accepts_eu')}
          </div>
        </div>
      ))}

      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'4px'}}>
        <button onClick={()=>router.back()} style={{padding:'10px 20px',borderRadius:'9px',fontSize:'14px',fontWeight:500,color:'var(--t1)',background:'transparent',border:'1px solid var(--border2)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary" style={{opacity:saving?0.7:1}}>
          {saving ? 'Saving...' : (firm ? 'Save Changes' : 'Create Firm')}
        </button>
      </div>
    </div>
  )
}
