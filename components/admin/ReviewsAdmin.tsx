'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ReviewsAdmin({ reviews }: { reviews: any[] }) {
  const [filter, setFilter] = useState<'all'|'pending'|'approved'|'rejected'>('pending')
  const [loading, setLoading] = useState<string|null>(null)
  const router = useRouter()
  const supabase = createClient()

  const updateStatus = async (id: string, status: string) => {
    setLoading(id)
    await supabase.from('reviews').update({ status }).eq('id', id)
    setLoading(null)
    router.refresh()
  }

  const filtered = reviews.filter(r => filter === 'all' ? true : r.status === filter)
  const counts = { pending: reviews.filter(r=>r.status==='pending').length, approved: reviews.filter(r=>r.status==='approved').length, rejected: reviews.filter(r=>r.status==='rejected').length }

  const tabBtn = (f: typeof filter, label: string, count: number, color: string) => (
    <button onClick={()=>setFilter(f)} style={{padding:'8px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:`1px solid ${filter===f?color+'44':'var(--border2)'}`,color:filter===f?color:'var(--t2)',background:filter===f?color+'11':'transparent',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:'7px'}}>
      {label}
      <span style={{fontSize:'11px',padding:'1px 7px',borderRadius:'100px',background:filter===f?color+'22':'var(--bg2)',color:filter===f?color:'var(--t3)',fontWeight:700}}>{count}</span>
    </button>
  )

  return (
    <div>
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginBottom:'24px'}}>
        {[['Published',counts.approved,'var(--green)'],['Pending',counts.pending,'var(--amber)'],['Rejected',counts.rejected,'var(--coral)']].map(([l,n,c])=>(
          <div key={String(l)} style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'18px'}}>
            <div style={{fontSize:'26px',fontWeight:900,color:String(c),marginBottom:'4px'}}>{n}</div>
            <div style={{fontSize:'12.5px',color:'var(--t2)',fontWeight:500}}>{l} reviews</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
        {tabBtn('pending','Pending',counts.pending,'var(--amber)')}
        {tabBtn('approved','Approved',counts.approved,'var(--green)')}
        {tabBtn('rejected','Rejected',counts.rejected,'var(--coral)')}
        {tabBtn('all','All',reviews.length,'var(--teal)')}
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px',background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',color:'var(--t2)'}}>
          No {filter} reviews.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {filtered.map((review: any) => (
            <div key={review.id} style={{background:'var(--bg1)',border:`1px solid ${review.status==='pending'?'rgba(251,191,36,0.2)':review.status==='approved'?'rgba(52,211,153,0.15)':'var(--border)'}`,borderRadius:'12px',padding:'20px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'16px',marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'var(--t2)',flexShrink:0}}>
                    {(review.profiles?.username||review.profiles?.full_name||'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:'14px'}}>{review.profiles?.username||review.profiles?.full_name||'Anonymous'}</div>
                    <div style={{fontSize:'12px',color:'var(--t3)'}}>{review.firms?.name} · {new Date(review.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{color:'var(--amber)',fontSize:'13px'}}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span>
                  <span style={{fontSize:'11.5px',fontWeight:600,padding:'3px 10px',borderRadius:'100px',background:review.status==='approved'?'rgba(52,211,153,0.1)':review.status==='pending'?'rgba(251,191,36,0.1)':'rgba(248,113,113,0.1)',color:review.status==='approved'?'var(--green)':review.status==='pending'?'var(--amber)':'var(--coral)',border:`1px solid ${review.status==='approved'?'rgba(52,211,153,0.2)':review.status==='pending'?'rgba(251,191,36,0.2)':'rgba(248,113,113,0.2)'}`}}>
                    {review.status}
                  </span>
                </div>
              </div>

              {review.title && <div style={{fontWeight:600,fontSize:'14px',marginBottom:'6px'}}>{review.title}</div>}
              <div style={{fontSize:'13.5px',color:'var(--t2)',lineHeight:1.65,marginBottom:'16px'}}>{review.body}</div>

              <div style={{display:'flex',gap:'8px',paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
                {review.status !== 'approved' && (
                  <button onClick={()=>updateStatus(review.id,'approved')} disabled={loading===review.id} style={{padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.2)',color:'var(--green)',cursor:'pointer',fontFamily:'Inter,sans-serif',opacity:loading===review.id?0.6:1}}>
                    ✓ Approve
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button onClick={()=>updateStatus(review.id,'rejected')} disabled={loading===review.id} style={{padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',color:'var(--coral)',cursor:'pointer',fontFamily:'Inter,sans-serif',opacity:loading===review.id?0.6:1}}>
                    × Reject
                  </button>
                )}
                {review.status !== 'pending' && (
                  <button onClick={()=>updateStatus(review.id,'pending')} disabled={loading===review.id} style={{padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,background:'var(--bg2)',border:'1px solid var(--border2)',color:'var(--t2)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    Move to Pending
                  </button>
                )}
                <button onClick={async()=>{ if(confirm('Delete permanently?')){ await supabase.from('reviews').delete().eq('id',review.id); router.refresh() }}} style={{padding:'7px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,background:'transparent',border:'1px solid var(--border)',color:'var(--t3)',cursor:'pointer',fontFamily:'Inter,sans-serif',marginLeft:'auto'}}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
