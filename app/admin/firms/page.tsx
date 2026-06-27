import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminFirmsPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase.from('firms').select('*').order('created_at', { ascending: false })

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:800,marginBottom:'4px'}}>Manage Firms</h1>
          <p style={{fontSize:'13.5px',color:'var(--t2)'}}>All firms in the database.</p>
        </div>
        <Link href="/admin/firms/new" style={{padding:'10px 20px',borderRadius:'9px',fontSize:'14px',fontWeight:700,color:'#04120c',background:'var(--teal)',textDecoration:'none',boxShadow:'0 0 20px var(--teal-glow)'}}>+ Add Firm</Link>
      </div>
      <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden'}}>
        <div style={{background:'var(--bg2)',padding:'14px 20px',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 120px',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--t3)'}}>
          <div>Firm</div><div>Trust Score</div><div>Challenges</div><div>Status</div><div>Updated</div><div>Actions</div>
        </div>
        {(firms||[]).map((firm: any) => (
          <div key={firm.id} style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 120px',alignItems:'center',fontSize:'13.5px',borderTop:'1px solid var(--border)'}}>
            <div style={{fontWeight:600,display:'flex',alignItems:'center',gap:'10px'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'var(--bg3)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:800,fontFamily:'JetBrains Mono,monospace',color:'var(--t2)'}}>{firm.name.slice(0,2).toUpperCase()}</div>
              {firm.name}
            </div>
            <div style={{color:'var(--green)',fontWeight:700}}>{firm.trust_score}/100</div>
            <div style={{color:'var(--t2)'}}>—</div>
            <div>
              <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'100px',background:firm.is_published?'rgba(0,229,160,0.1)':'var(--bg2)',color:firm.is_published?'var(--teal)':'var(--t3)',border:`1px solid ${firm.is_published?'rgba(0,229,160,0.2)':'var(--border)'}`}}>
                {firm.is_published?'Live':'Draft'}
              </span>
            </div>
            <div style={{color:'var(--t2)',fontSize:'13px',fontFamily:'JetBrains Mono,monospace'}}>{new Date(firm.updated_at).toLocaleDateString('en-GB')}</div>
            <div style={{display:'flex',gap:'6px'}}>
              <Link href={`/admin/firms/${firm.id}`} style={{padding:'6px 12px',borderRadius:'7px',fontSize:'12px',fontWeight:600,background:'transparent',border:'1px solid var(--border2)',color:'var(--t1)',textDecoration:'none'}}>Edit</Link>
              <Link href={`/admin/firms/${firm.id}/delete`} style={{padding:'6px 12px',borderRadius:'7px',fontSize:'12px',fontWeight:600,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',color:'var(--coral)',textDecoration:'none'}}>Del</Link>
            </div>
          </div>
        ))}
        {(!firms||firms.length===0) && (
          <div style={{padding:'40px',textAlign:'center',color:'var(--t2)'}}>No firms yet. <Link href="/admin/firms/new" style={{color:'var(--teal)',textDecoration:'none',fontWeight:600}}>Add your first →</Link></div>
        )}
      </div>
    </div>
  )
}
