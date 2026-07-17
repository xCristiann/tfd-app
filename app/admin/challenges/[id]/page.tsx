'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AdminChallengeEditPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const firmIdFromQuery = searchParams?.get('firm_id') || ''
  const router = useRouter()
  const supabase = createClient()
  const [ch, setCh] = useState<any>({ firm_id: firmIdFromQuery, allows_weekend_holding: false, allows_news_trading: false, allows_ea: false, allows_hedging: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [firms, setFirms] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase.from('firms').select('id,name').eq('is_published', true).order('name')
      setFirms(f || [])
      if (id && id !== 'new') {
        const { data } = await supabase.from('challenges').select('*').eq('id', id).single()
        if (data) setCh(data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const set = (k: string, v: any) => setCh((c: any) => ({ ...c, [k]: v }))

  const save = async () => {
    if (!ch.firm_id) { setMsg('Please select a firm'); return }
    setSaving(true); setMsg('')
    const payload = {
      firm_id: ch.firm_id,
      name: ch.name || null,
      account_size: ch.account_size ? parseInt(ch.account_size) : null,
      price_usd: ch.price_usd ? parseInt(ch.price_usd) : null,
      profit_split: ch.profit_split || null,
      phase1_target: ch.phase1_target ? parseFloat(ch.phase1_target) : null,
      phase1_daily_dd: ch.phase1_daily_dd ? parseFloat(ch.phase1_daily_dd) : null,
      phase1_max_dd: ch.phase1_max_dd ? parseFloat(ch.phase1_max_dd) : null,
      phase1_min_days: ch.phase1_min_days ? parseInt(ch.phase1_min_days) : null,
      phase1_time_limit: ch.phase1_time_limit ? parseInt(ch.phase1_time_limit) : 0,
      phase2_target: ch.phase2_target ? parseFloat(ch.phase2_target) : null,
      phase2_daily_dd: ch.phase2_daily_dd ? parseFloat(ch.phase2_daily_dd) : null,
      phase2_max_dd: ch.phase2_max_dd ? parseFloat(ch.phase2_max_dd) : null,
      phase2_min_days: ch.phase2_min_days ? parseInt(ch.phase2_min_days) : null,
      phase2_time_limit: ch.phase2_time_limit ? parseInt(ch.phase2_time_limit) : 0,
      payout_frequency: ch.payout_frequency || null,
      min_payout: ch.min_payout ? parseInt(ch.min_payout) : null,
      payout_methods: ch.payout_methods ? (typeof ch.payout_methods === 'string' ? ch.payout_methods.split(',').map((p:string)=>p.trim()).filter(Boolean) : ch.payout_methods) : [],
      allows_weekend_holding: !!ch.allows_weekend_holding,
      allows_news_trading: !!ch.allows_news_trading,
      allows_ea: !!ch.allows_ea,
      allows_hedging: !!ch.allows_hedging,
      sort_order: ch.sort_order ? parseInt(ch.sort_order) : 0,
    }
    let error
    if (id && id !== 'new') {
      const res = await supabase.from('challenges').update(payload).eq('id', id)
      error = res.error
    } else {
      const res = await supabase.from('challenges').insert(payload)
      error = res.error
    }
    setMsg(error ? `Error: ${error.message}` : 'Saved!')
    if (!error && ch.firm_id) setTimeout(() => router.push(`/admin/firms/${ch.firm_id}`), 1000)
    setSaving(false)
  }

  const inp = (label: string, key: string, type='text', placeholder='') => (
    <div>
      <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em' }}>{label}</label>
      <input type={type} value={ch?.[key]||''} onChange={e=>set(key,e.target.value)} placeholder={placeholder}
        style={{ width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--t1)',fontSize:'13.5px',fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box' }} />
    </div>
  )

  const chk = (label: string, key: string) => (
    <label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13.5px',color:'var(--t1)' }}>
      <input type="checkbox" checked={!!ch?.[key]} onChange={e=>set(key,e.target.checked)} style={{ width:'16px',height:'16px',accentColor:'var(--teal)',cursor:'pointer' }} />
      {label}
    </label>
  )

  if (loading) return <div style={{ padding:'40px',color:'var(--t2)' }}>Loading...</div>

  const firmId = ch.firm_id || firmIdFromQuery

  return (
    <div style={{ maxWidth:'800px' }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'24px' }}>
        <h1 style={{ fontSize:'20px',fontWeight:800 }}>{id==='new'?'Add Challenge':'Edit Challenge'}</h1>
        <Link href={firmId?`/admin/firms/${firmId}`:'/admin/firms'} style={{ fontSize:'13px',color:'var(--t3)',textDecoration:'none' }}>Back to Firm</Link>
      </div>

      {msg && <div style={{ background:msg.includes('Error')?'rgba(248,113,113,0.1)':'rgba(0,229,160,0.1)',border:`1px solid ${msg.includes('Error')?'rgba(248,113,113,0.2)':'rgba(0,229,160,0.2)'}`,borderRadius:'9px',padding:'10px 16px',marginBottom:'16px',fontSize:'13.5px',color:msg.includes('Error')?'var(--coral)':'var(--teal)',fontWeight:600 }}>{msg}</div>}

      <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px' }}>
        <h3 style={{ fontSize:'13px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'16px' }}>Basic</h3>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
          <div>
            <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em' }}>Firm</label>
            <select value={ch.firm_id||''} onChange={e=>set('firm_id',e.target.value)}
              style={{ width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--t1)',fontSize:'13.5px',fontFamily:'Inter,sans-serif',outline:'none' }}>
              <option value="">Select...</option>
              {firms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {inp('Challenge Name','name','text','e.g. Standard 100K')}
          {inp('Account Size ($)','account_size','number','100000')}
          {inp('Price (USD)','price_usd','number','499')}
          {inp('Profit Split','profit_split','text','80%')}
          {inp('Payout Frequency','payout_frequency','text','Weekly')}
          {inp('Min Payout ($)','min_payout','number','50')}
          {inp('Payout Methods (comma sep)','payout_methods','text','Bank Wire, Crypto')}
          {inp('Sort Order','sort_order','number','0')}
        </div>
      </div>

      <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px' }}>
        <h3 style={{ fontSize:'13px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'16px' }}>Phase 1</h3>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px' }}>
          {inp('Profit Target (%)','phase1_target','number','10')}
          {inp('Daily DD (%)','phase1_daily_dd','number','5')}
          {inp('Max DD (%)','phase1_max_dd','number','10')}
          {inp('Min Trading Days','phase1_min_days','number','4')}
          {inp('Time Limit (days, 0=none)','phase1_time_limit','number','30')}
        </div>
      </div>

      <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px' }}>
        <h3 style={{ fontSize:'13px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'16px' }}>Phase 2 (leave empty for 1-step)</h3>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px' }}>
          {inp('Profit Target (%)','phase2_target','number','5')}
          {inp('Daily DD (%)','phase2_daily_dd','number','5')}
          {inp('Max DD (%)','phase2_max_dd','number','10')}
          {inp('Min Trading Days','phase2_min_days','number','4')}
          {inp('Time Limit (days, 0=none)','phase2_time_limit','number','60')}
        </div>
      </div>

      <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px' }}>
        <h3 style={{ fontSize:'13px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'16px' }}>Trading Rules</h3>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
          {chk('Weekend Holding Allowed','allows_weekend_holding')}
          {chk('News Trading Allowed','allows_news_trading')}
          {chk('EA / Bots Allowed','allows_ea')}
          {chk('Hedging Allowed','allows_hedging')}
        </div>
      </div>

      <div style={{ display:'flex',gap:'10px' }}>
        <Link href={firmId?`/admin/firms/${firmId}`:'/admin/firms'} style={{ padding:'11px 20px',borderRadius:'9px',fontSize:'14px',fontWeight:600,textDecoration:'none',border:'1px solid var(--border2)',color:'var(--t2)',background:'transparent' }}>Cancel</Link>
        <button onClick={save} disabled={saving} style={{ flex:1,padding:'11px 24px',borderRadius:'9px',fontSize:'14px',fontWeight:800,cursor:'pointer',border:'none',color:'#04120c',background:'var(--teal)',fontFamily:'Inter,sans-serif',opacity:saving?0.7:1 }}>
          {saving?'Saving...':'Save Challenge'}
        </button>
      </div>
    </div>
  )
}