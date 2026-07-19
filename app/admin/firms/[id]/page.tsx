'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function AdminFirmEditPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const supabase = createClient()
  const [firm, setFirm] = useState<any>({})
  const [challenges, setChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<'basic'|'trust'|'markets'|'challenges'>('basic')

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); return }
    Promise.all([
      supabase.from('firms').select('*').eq('id', id).single(),
      supabase.from('challenges').select('*').eq('firm_id', id).order('price_usd')
    ]).then(([f, c]) => {
      setFirm(f.data || {})
      setChallenges(c.data || [])
      setLoading(false)
    })
  }, [id])

  const set = (k: string, v: any) => setFirm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!firm.name || !firm.slug) { setMsg('&times; Name and slug required'); return }
    setSaving(true); setMsg('')
    const payload = {
      name: firm.name, slug: firm.slug,
      website: firm.website||null, affiliate_link: firm.affiliate_link||null,
      discount_code: firm.discount_code||null, short_description: firm.short_description||null,
      logo_url: firm.logo_url||null, founded_year: firm.founded_year?parseInt(firm.founded_year):null,
      headquarters: firm.headquarters||null, country_code: firm.country_code||null,
      max_allocation: firm.max_allocation?parseInt(firm.max_allocation):null,
      promo_discount: firm.promo_discount||null, promo_label: firm.promo_label||null,
      promo_discount_value: firm.promo_discount?parseInt(firm.promo_discount.replace(/[^0-9]/g,''))||0:0,
      years_active: firm.years_active?parseInt(firm.years_active):null,
      platforms: firm.platforms?(typeof firm.platforms==='string'?firm.platforms.split(',').map((p:string)=>p.trim()).filter(Boolean):firm.platforms):[],
      payout_reliability: firm.payout_reliability||'Unknown',
      avg_payout_days: firm.avg_payout_days?parseInt(firm.avg_payout_days):null,
      support_quality: firm.support_quality||'Medium',
      delayed_payout_reports: parseInt(firm.delayed_payout_reports)||0,
      rules_clarity: firm.rules_clarity||'Clear',
      markets_forex:!!firm.markets_forex, markets_futures:!!firm.markets_futures,
      markets_crypto:!!firm.markets_crypto, markets_indices:!!firm.markets_indices,
      markets_metals:!!firm.markets_metals, markets_commodities:!!firm.markets_commodities,
      accepts_eu:!!firm.accepts_eu, is_published:!!firm.is_published, is_featured:!!firm.is_featured,
    }

    let error
    if (id && id !== 'new') {
      const res = await supabase.from('firms').update(payload).eq('id', id)
      error = res.error
    } else {
      const res = await supabase.from('firms').insert(payload).select().single()
      error = res.error
      if (!error && res.data) { router.push(`/admin/firms/${res.data.id}`); return }
    }

    setMsg(error ? `&times; ${error.message}` : '&#10003; Saved!')
    setSaving(false)
  }

  const inp = (label: string, key: string, type='text', placeholder='') => (
    <div>
      <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em' }}>{label}</label>
      <input type={type} value={firm?.[key]||''} onChange={e=>set(key,e.target.value)} placeholder={placeholder}
        style={{ width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--t1)',fontSize:'13.5px',fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box' }} />
    </div>
  )

  const sel = (label: string, key: string, opts: string[]) => (
    <div>
      <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em' }}>{label}</label>
      <select value={firm?.[key]||''} onChange={e=>set(key,e.target.value)}
        style={{ width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--t1)',fontSize:'13.5px',fontFamily:'Inter,sans-serif',outline:'none' }}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  const chk = (label: string, key: string) => (
    <label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13.5px',color:'var(--t1)' }}>
      <input type="checkbox" checked={!!firm?.[key]} onChange={e=>set(key,e.target.checked)} style={{ width:'16px',height:'16px',accentColor:'var(--teal)',cursor:'pointer' }} />
      {label}
    </label>
  )

  if (loading) return <div style={{ padding:'40px',color:'var(--t2)' }}>Loading...</div>

  return (
    <div style={{ maxWidth:'800px' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
          {firm?.logo_url && <FirmLogo name={firm.name||''} logoUrl={firm.logo_url} size={36} radius={8} />}
          <div>
            <h1 style={{ fontSize:'20px',fontWeight:800,marginBottom:'2px' }}>{firm?.name||'New Firm'}</h1>
            <div style={{ fontSize:'12px',color:'var(--teal)' }}>Trust Score: {firm?.trust_score||0}/100 (auto-calculated)</div>
          </div>
        </div>
        <Link href="/admin/firms" style={{ fontSize:'13px',color:'var(--t3)',textDecoration:'none' }}>&larr; Back</Link>
      </div>

      {msg && <div style={{ background:msg.startsWith('&#10003;')?'rgba(0,229,160,0.1)':'rgba(248,113,113,0.1)',border:`1px solid ${msg.startsWith('&#10003;')?'rgba(0,229,160,0.2)':'rgba(248,113,113,0.2)'}`,borderRadius:'9px',padding:'10px 16px',marginBottom:'16px',fontSize:'13.5px',color:msg.startsWith('&#10003;')?'var(--teal)':'var(--coral)',fontWeight:600 }}>{msg}</div>}

      <div style={{ display:'flex',gap:'4px',borderBottom:'1px solid var(--border)',marginBottom:'20px' }}>
        {[['basic','Basic'],['trust','Trust Factors'],['markets','Markets'],['challenges','Challenges']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k as any)} style={{ padding:'9px 16px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',border:'none',background:'transparent',color:tab===k?'var(--teal)':'var(--t2)',borderBottom:`2px solid ${tab===k?'var(--teal)':'transparent'}`,marginBottom:'-1px' }}>{l}</button>
        ))}
      </div>

      <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'16px' }}>
        {tab==='basic' && (
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
            {inp('Firm Name *','name','text','FTMO')}
            {inp('Slug *','slug','text','ftmo')}
            {inp('Website','website','url','https://ftmo.com')}
            {inp('Affiliate Link','affiliate_link','url','https://...')}
            {inp('Discount Code','discount_code','text','DIARIES')}
            {inp('Logo URL','logo_url','url','https://...')}
            {inp('Country Code','country_code','text','CZ')}
            {inp('Headquarters','headquarters','text','Prague, CZ')}
            {inp('Founded Year','founded_year','number','2020')}
            {inp('Max Allocation ($)','max_allocation','number','2000000')}
            {inp('Promo Discount','promo_discount','text','25% OFF')}
            {inp('Promo Label','promo_label','text','HOT')}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:'11px',fontWeight:700,color:'var(--t2)',display:'block',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.04em' }}>Short Description</label>
              <textarea value={firm?.short_description||''} onChange={e=>set('short_description',e.target.value)} rows={2}
                style={{ width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'8px',color:'var(--t1)',fontSize:'13.5px',fontFamily:'Inter,sans-serif',outline:'none',resize:'vertical',boxSizing:'border-box' }} />
            </div>
            <div style={{ gridColumn:'1/-1',display:'flex',gap:'20px',flexWrap:'wrap' }}>
              {chk('Published (live)','is_published')}
              {chk('Featured','is_featured')}
              {chk('Accepts EU','accepts_eu')}
            </div>
          </div>
        )}

        {tab==='trust' && (
          <div>
            <div style={{ background:'rgba(0,229,160,0.06)',border:'1px solid rgba(0,229,160,0.15)',borderRadius:'9px',padding:'12px 16px',marginBottom:'16px' }}>
              <div style={{ fontSize:'11px',color:'var(--teal)',fontWeight:700,marginBottom:'2px' }}>AUTO-CALCULATED</div>
              <div style={{ fontSize:'28px',fontWeight:900,color:'var(--teal)' }}>{firm?.trust_score||0}<span style={{ fontSize:'14px',color:'var(--t3)' }}>/100</span></div>
              <div style={{ fontSize:'12px',color:'var(--t3)' }}>Updates automatically after saving</div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px' }}>
              {sel('Payout Reliability','payout_reliability',['Confirmed','Unknown','Reported issues'])}
              {inp('Avg Payout Days','avg_payout_days','number','3')}
              {sel('Support Quality','support_quality',['Fast','Medium','Slow'])}
              {sel('Rules Clarity','rules_clarity',['Clear','Ambiguous','Unclear'])}
              {inp('Years Active','years_active','number','3')}
              {inp('Delayed Payout Reports','delayed_payout_reports','number','0')}
            </div>
          </div>
        )}

        {tab==='markets' && (
          <div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'16px' }}>
              {chk('Forex','markets_forex')}
              {chk('Futures','markets_futures')}
              {chk('Crypto','markets_crypto')}
              {chk('Indices','markets_indices')}
              {chk('Metals','markets_metals')}
              {chk('Commodities','markets_commodities')}
            </div>
            {inp('Platforms (comma separated)','platforms','text','MT4, MT5, cTrader')}
          </div>
        )}

        {tab==='challenges' && (
          <div>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'16px' }}>
              <h3 style={{ fontSize:'15px',fontWeight:700 }}>Challenges ({challenges.length})</h3>
              {id&&id!=='new'&&<Link href={`/admin/challenges/new?firm_id=${id}`} style={{ padding:'8px 16px',borderRadius:'8px',background:'var(--teal)',color:'#04120c',fontSize:'13px',fontWeight:700,textDecoration:'none' }}>+ Add Challenge</Link>}
            </div>
            {challenges.length===0?(
              <div style={{ padding:'40px',textAlign:'center',color:'var(--t2)' }}>No challenges yet. Save the firm first, then add challenges.</div>
            ):challenges.map(ch=>(
              <div key={ch.id} style={{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px' }}>
                <div>
                  <div style={{ fontWeight:600,marginBottom:'3px' }}>{ch.name||`$${ch.account_size?.toLocaleString()}`}</div>
                  <div style={{ fontSize:'12px',color:'var(--t3)' }}>${ch.price_usd} &middot; {ch.profit_split} split &middot; {ch.phase1_target}% Ph1 target</div>
                </div>
                <Link href={`/admin/challenges/${ch.id}`} style={{ padding:'6px 14px',borderRadius:'7px',fontSize:'12.5px',fontWeight:600,textDecoration:'none',border:'1px solid var(--border2)',color:'var(--t1)',background:'var(--bg1)' }}>Edit</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {tab!=='challenges'&&(
        <div style={{ display:'flex',gap:'10px' }}>
          <Link href="/admin/firms" style={{ padding:'11px 20px',borderRadius:'9px',fontSize:'14px',fontWeight:600,textDecoration:'none',border:'1px solid var(--border2)',color:'var(--t2)',background:'transparent' }}>Cancel</Link>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:'11px 24px',borderRadius:'9px',fontSize:'14px',fontWeight:800,cursor:'pointer',border:'none',color:'#04120c',background:'var(--teal)',fontFamily:'Inter,sans-serif',opacity:saving?0.7:1 }}>
            {saving?'Saving...':'Save Firm &rarr;'}
          </button>
        </div>
      )}
    </div>
  )
}