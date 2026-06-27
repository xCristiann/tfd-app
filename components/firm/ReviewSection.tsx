'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Review } from '@/types'
import type { User } from '@supabase/supabase-js'

export default function ReviewSection({ firmId, reviews: initialReviews }: { firmId: string; reviews: Review[] }) {
  const [user, setUser] = useState<User | null>(null)
  const [reviews, setReviews] = useState(initialReviews)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const submitReview = async () => {
    if (!user || !body.trim()) return
    setSubmitting(true)
    await supabase.from('reviews').insert({ firm_id: firmId, user_id: user.id, title, body, rating, status: 'pending' })
    setSubmitting(false)
    setSuccess(true)
    setTitle(''); setBody(''); setRating(5)
  }

  const submitComment = async (reviewId: string) => {
    if (!user || !commentTexts[reviewId]?.trim()) return
    const { data } = await supabase.from('comments').insert({ review_id: reviewId, user_id: user.id, body: commentTexts[reviewId] }).select('*, profiles(username, full_name)').single()
    if (data) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, comments: [...(r.comments||[]), data] } : r))
      setCommentTexts(prev => ({ ...prev, [reviewId]: '' }))
    }
  }

  const avgRating = reviews.length > 0 ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'

  return (
    <div>
      {/* SUMMARY */}
      <div style={{display:'flex',alignItems:'center',gap:'20px',marginBottom:'28px',padding:'20px',background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'48px',fontWeight:900,color:'var(--teal)',lineHeight:1}}>{avgRating}</div>
          <div style={{color:'var(--amber)',fontSize:'18px',margin:'4px 0'}}>{'★'.repeat(Math.round(Number(avgRating)||0))}</div>
          <div style={{fontSize:'12px',color:'var(--t3)'}}>{reviews.length} reviews</div>
        </div>
        <div style={{flex:1}}>
          {[5,4,3,2,1].map(s => {
            const count = reviews.filter(r=>r.rating===s).length
            const pct = reviews.length ? (count/reviews.length)*100 : 0
            return (
              <div key={s} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',fontSize:'12px'}}>
                <span style={{color:'var(--t2)',width:'12px'}}>{s}</span>
                <span style={{color:'var(--amber)',fontSize:'10px'}}>★</span>
                <div style={{flex:1,height:'5px',background:'var(--bg3)',borderRadius:'100px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:'var(--amber)',borderRadius:'100px'}} />
                </div>
                <span style={{color:'var(--t3)',width:'20px',textAlign:'right'}}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* WRITE REVIEW */}
      {!user ? (
        <div style={{background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'10px',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'}}>
          <div style={{fontSize:'13.5px',color:'var(--t2)'}}>To leave a review or comment, <b style={{color:'var(--t1)'}}>sign in or create a free account.</b></div>
          <a href="/auth/login" style={{padding:'9px 18px',borderRadius:'9px',fontSize:'13.5px',border:'1px solid var(--border2)',color:'var(--t1)',background:'transparent',textDecoration:'none',whiteSpace:'nowrap'}}>Sign In →</a>
        </div>
      ) : success ? (
        <div style={{background:'rgba(0,229,160,0.08)',border:'1px solid rgba(0,229,160,0.2)',borderRadius:'10px',padding:'16px 20px',marginBottom:'28px',color:'var(--teal)',fontWeight:600}}>
          ✓ Review submitted — it will appear after moderation. Thank you!
        </div>
      ) : (
        <div style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'24px',marginBottom:'28px'}}>
          <h3 style={{fontSize:'15px',fontWeight:700,marginBottom:'16px'}}>Write a Review</h3>
          <div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
            {[1,2,3,4,5].map(s => (
              <span key={s} onClick={()=>setRating(s)} onMouseEnter={()=>setHoverRating(s)} onMouseLeave={()=>setHoverRating(0)} style={{fontSize:'24px',cursor:'pointer',color:(hoverRating||rating)>=s?'var(--amber)':'var(--t3)',transition:'color .1s'}}>★</span>
            ))}
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Summarise your experience" className="input-base" />
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Your Review</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Share your honest experience — challenge process, payout speed, support quality..." className="input-base" style={{minHeight:'90px',resize:'vertical',lineHeight:1.6}} />
          </div>
          <button onClick={submitReview} disabled={submitting||!body.trim()} className="btn-primary" style={{opacity:!body.trim()?0.5:1}}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      )}

      {/* REVIEWS LIST */}
      <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
        {reviews.length === 0 && <div style={{textAlign:'center',padding:'40px',color:'var(--t2)'}}>No reviews yet. Be the first!</div>}
        {reviews.map(review => (
          <div key={review.id} style={{background:'var(--bg1)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'var(--t2)'}}>
                  {(review.profiles?.username || review.profiles?.full_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:'13.5px',fontWeight:600}}>{review.profiles?.username || review.profiles?.full_name || 'User'}</div>
                  <div style={{fontSize:'11.5px',color:'var(--t3)'}}>{new Date(review.created_at).toLocaleDateString('en-GB')} · Verified account</div>
                </div>
              </div>
              <div style={{color:'var(--amber)',fontSize:'13px'}}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</div>
            </div>
            {review.title && <div style={{fontWeight:600,marginBottom:'6px'}}>{review.title}</div>}
            <div style={{fontSize:'14px',color:'var(--t2)',lineHeight:1.65,marginBottom:'14px'}}>{review.body}</div>

            {/* COMMENTS */}
            <div style={{borderTop:'1px solid var(--border)',paddingTop:'14px'}}>
              <div style={{fontSize:'11.5px',fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'10px'}}>{(review.comments||[]).length} Comments</div>
              {(review.comments||[]).map((comment: any) => (
                <div key={comment.id} style={{display:'flex',gap:'10px',padding:'10px 0',borderTop:'1px solid var(--border)'}}>
                  <div style={{width:'26px',height:'26px',borderRadius:'50%',background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:700,color:'var(--t3)',flexShrink:0,marginTop:'2px'}}>
                    {(comment.profiles?.username||'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:'12.5px',fontWeight:600,marginBottom:'3px'}}>{comment.profiles?.username || 'User'}</div>
                    <div style={{fontSize:'13px',color:'var(--t2)',lineHeight:1.55}}>{comment.body}</div>
                    <div style={{fontSize:'11px',color:'var(--t3)',marginTop:'4px'}}>{new Date(comment.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              ))}
              {user && (
                <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                  <input
                    value={commentTexts[review.id]||''}
                    onChange={e=>setCommentTexts(p=>({...p,[review.id]:e.target.value}))}
                    placeholder="Add a comment..."
                    style={{flex:1,padding:'9px 13px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'Inter,sans-serif'}}
                    onKeyDown={e=>e.key==='Enter'&&submitComment(review.id)}
                  />
                  <button onClick={()=>submitComment(review.id)} style={{padding:'9px 16px',borderRadius:'8px',fontSize:'12.5px',fontWeight:700,color:'#04120c',background:'var(--teal)',border:'none',cursor:'pointer'}}>Post</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
