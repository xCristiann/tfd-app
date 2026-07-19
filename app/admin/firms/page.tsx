'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FirmLogo from '@/components/firm/FirmLogo'

export default function AdminFirmsPage() {
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'published'|'draft'>('all')
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('firms').select('id,name,slug,is_published,is_featured,trust_score,promo_discount,logo_url,discount_code,review_count,rating,website').order('name')
    if (error) console.error(error)
    setFirms(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('firms').update({ is_published: !current }).eq('id', id)
    setFirms(f => f.map(x => x.id === id ? { ...x, is_published: !current } : x))
    setMsg(`✓ ${!current ? 'Published' : 'Unpublished'}`)
    setTimeout(() => setMsg(''), 2000)
  }

  const deleteFirm = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? Cannot be undone.`)) return
    await supabase.from('firms').delete().eq('id', id)
    setFirms(f => f.filter(x => x.id !== id))
    setMsg(`✓ ${name} deleted`)
  }

  const filtered = firms.filter(f => {
    const s = f.name?.toLowerCase().includes(search.toLowerCase()) || f.slug?.toLowerCase().includes(search.toLowerCase())
    const v = filter === 'all' || (filter === 'published' && f.is_published) || (filter === 'draft' && !f.is_published)
    return s && v
  })

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'22px',fontWeight:800,marginBottom:'4px' }}>Manage Firms</h1>
          <p style={{ fontSize:'13.5px',color:'var(--t2)' }}>
            <span style={{ color:'var(--teal)' }}>{firms.filter(f=>f.is_published).length} live</span> · <span style={{ color:'var(--t3)' }}>{firms.filter(f=>!f.is_published).length} draft</span> · {firms.length} total
          </p>
        </div>
        <Link href="/admin/firms/new" style={{ padding:'10px 20px',borderRadius:'9px',background:'var(--teal)',color:'#04120c',fontSize:'13.5px',fontWeight:700,textDecoration:'none' }}>+ Add Firm</Link>
      </div>

      {msg && <div style={{ background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',borderRadius:'9px',padding:'10px 16px',marginBottom:'16px',fontSize:'13.5px',color:'var(--teal)',fontWeight:600 }}>{msg}</div>}

      <div style={{ display:'flex',gap:'12px',marginBottom:'16px' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ flex:1,padding:'9px 14px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'9px',color:'var(--t1)',fontSize:'14px',fontFamily:'Inter,sans-serif',outline:'none' }} />
        {(['all','published','draft'] as const).map(k => (
          <button key={k} onClick={()=>setFilter(k)} style={{ padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',border:`1px solid ${filter===k?'rgba(0,229,160,0.3)':'var(--border2)'}`,background:filter===k?'rgba(0,229,160,0.08)':'transparent',color:filter===k?'var(--teal)':'var(--t2)' }}>
            {k.charAt(0).toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden' }}>
        <div style={{ background:'var(--bg2)',padding:'12px 20px',display:'grid',gridTemplateColumns:'36px 2fr 70px 60px 60px 90px 160px',gap:'10px',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--t3)',alignItems:'center' }}>
          <div/><div>Firm</div><div>Status</div><div>Trust</div><div>Rating</div><div>Promo</div><div style={{textAlign:'right'}}>Actions</div>
        </div>

        {loading ? (
          <div style={{ padding:'40px',textAlign:'center',color:'var(--t2)' }}>Loading from database...</div>
        ) : filtered.map(firm => (
          <div key={firm.id} style={{ display:'grid',gridTemplateColumns:'36px 2fr 70px 60px 60px 90px 160px',padding:'13px 20px',borderTop:'1px solid var(--border)',gap:'10px',alignItems:'center' }}>
            <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={32} radius={7} />
            <div>
              <div style={{ fontSize:'14px',fontWeight:700 }}>{firm.name}</div>
              <div style={{ fontSize:'11px',color:'var(--t3)',fontFamily:'JetBrains Mono,monospace' }}>{firm.slug}{firm.discount_code?` · ${firm.discount_code}`:''}</div>
            </div>
            <button onClick={()=>togglePublish(firm.id,firm.is_published)} style={{ fontSize:'11px',fontWeight:600,padding:'3px 10px',borderRadius:'100px',border:'none',cursor:'pointer',background:firm.is_published?'rgba(0,229,160,0.1)':'rgba(139,146,168,0.1)',color:firm.is_published?'var(--teal)':'var(--t3)',fontFamily:'Inter,sans-serif' }}>
              {firm.is_published?'● Live':'○ Draft'}
            </button>
            <div style={{ fontSize:'14px',fontWeight:800,color:(firm.trust_score||0)>=70?'var(--teal)':(firm.trust_score||0)>=50?'var(--amber)':'var(--t3)' }}>{firm.trust_score||0}</div>
            <div style={{ fontSize:'13px',color:'var(--amber)' }}>{(firm.rating||0)>0?`${firm.rating.toFixed(1)}★`:'—'}</div>
            <div style={{ fontSize:'12px',color:firm.promo_discount?'var(--amber)':'var(--t3)',fontWeight:firm.promo_discount?700:400 }}>{firm.promo_discount||'—'}</div>
            <div style={{ display:'flex',gap:'5px',justifyContent:'flex-end' }}>
              <Link href={`/admin/firms/${firm.id}`} style={{ padding:'5px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,textDecoration:'none',border:'1px solid var(--border2)',color:'var(--t1)',background:'var(--bg2)' }}>Edit</Link>
              <Link href={`/firms/${firm.slug}`} target="_blank" style={{ padding:'5px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,textDecoration:'none',border:'1px solid rgba(0,229,160,0.2)',color:'var(--teal)',background:'rgba(0,229,160,0.06)' }}>View</Link>
              <button onClick={()=>deleteFirm(firm.id,firm.name)} style={{ padding:'5px 10px',borderRadius:'6px',fontSize:'12px',cursor:'pointer',border:'1px solid rgba(248,113,113,0.2)',color:'var(--coral)',background:'rgba(248,113,113,0.06)',fontFamily:'Inter,sans-serif' }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}