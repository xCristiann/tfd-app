'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

const BADGE_CONFIG: Record<string, string> = {
  'TFD Pro Trader': 'linear-gradient(135deg,#00e5a0,#7c3aed)',
  'Elite Trader': 'linear-gradient(135deg,#f59e0b,#ef4444)',
  'Top Reviewer': 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [firms, setFirms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState<'recent'|'top'>('recent')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedFirm, setSelectedFirm] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name, badges').eq('id', user.id).single()
        setUserProfile(p)
      }
    })
    Promise.all([
      supabase.from('reviews').select('*, firms(name,slug,logo_url), profiles(full_name,badges)').order('created_at', { ascending: false }).limit(100),
      supabase.from('firms').select('id,name,slug').eq('is_published', true).order('name')
    ]).then(([rev, f]) => {
      setReviews(rev.data || [])
      setFirms(f.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = reviews
    .filter(r => filter === 'all' || r.firms?.slug === filter)
    .sort((a, b) => sort === 'top' ? (b.rating - a.rating) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const submitReview = async () => {
    if (!selectedFirm || !content || !title) { setSubmitMsg('Please fill all fields'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitMsg('Please sign in'); setSubmitting(false); return }
    const { error } = await supabase.from('reviews').insert({
      firm_id: selectedFirm, user_id: user.id, rating, title, content, status: 'pending'
    })
    if (error) { setSubmitMsg('Error: ' + error.message) }
    else {
      setSubmitMsg('Review submitted! It will appear after approval.')
      setTitle(''); setContent(''); setSelectedFirm(''); setRating(5); setShowForm(false)
      await fetch('/api/coins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review_submitted' }) })
    }
    setSubmitting(false)
  }

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < n ? 'var(--amber)' : 'var(--border2)', fontSize: '15px' }}>&#9733;</span>
  ))

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Community</div>
            <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '8px' }}>Trader Reviews</h1>
            <p style={{ fontSize: '15px', color: 'var(--t2)' }}>{reviews.length} verified reviews from real traders.</p>
          </div>
          {user && (
            <button onClick={() => setShowForm(s => !s)}
              style={{ padding: '11px 22px', borderRadius: '10px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', flexShrink: 0 }}>
              + Write a Review
            </button>
          )}
        </div>

        {showForm && user && (
          <div style={{ background: 'var(--bg1)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '14px', padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Write a Review (+75 coins)</h3>
            {submitMsg && <div style={{ background: submitMsg.includes('Error') ? 'rgba(248,113,113,0.1)' : 'rgba(0,229,160,0.1)', border: `1px solid ${submitMsg.includes('Error') ? 'rgba(248,113,113,0.2)' : 'rgba(0,229,160,0.2)'}`, borderRadius: '8px', padding: '10px', fontSize: '13.5px', color: submitMsg.includes('Error') ? 'var(--coral)' : 'var(--teal)', marginBottom: '16px' }}>{submitMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Prop Firm</label>
                <select value={selectedFirm} onChange={e => setSelectedFirm(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none' }}>
                  <option value="">Select firm...</option>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Rating</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRating(n)} style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', color: n <= rating ? 'var(--amber)' : 'var(--border2)', padding: '0', lineHeight: 1 }}>&#9733;</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Great payout speed"
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Your Review</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Share your experience..."
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitReview} disabled={submitting}
                style={{ padding: '10px 24px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: '9px', background: 'transparent', color: 'var(--t3)', fontSize: '14px', border: '1px solid var(--border2)', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Cancel</button>
            </div>
          </div>
        )}

        {!user && (
          <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: 'var(--t2)' }}>Sign in to write a review and earn +75 coins</span>
            <Link href="/auth/login?redirect=/reviews" style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: '8px 14px', background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter,sans-serif', outline: 'none' }}>
            <option value="all">All Firms ({reviews.length})</option>
            {firms.map(f => <option key={f.slug} value={f.slug}>{f.name} ({reviews.filter(r => r.firms?.slug === f.slug).length})</option>)}
          </select>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[['recent','Recent'],['top','Top Rated']].map(([k,l]) => (
              <button key={k} onClick={() => setSort(k as any)}
                style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: `1px solid ${sort===k?'var(--teal)':'var(--border2)'}`, background: sort===k?'rgba(0,229,160,0.08)':'transparent', color: sort===k?'var(--teal)':'var(--t2)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)', background: 'var(--bg1)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No reviews yet</div>
            {user && <button onClick={() => setShowForm(true)} style={{ padding: '10px 22px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Write First Review</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map((review: any) => (
              <div key={review.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <Link href={`/firms/${review.firms?.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <FirmLogo name={review.firms?.name||''} logoUrl={review.firms?.logo_url} size={32} radius={7} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>{review.firms?.name}</span>
                  </Link>
                  <div>{stars(review.rating||0)}</div>
                </div>
                {review.title && <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{review.title}</div>}
                <div style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '10px' }}>{review.content}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--t3)' }}>{review.profiles?.full_name || 'Anonymous'}</span>
                    {/* Show badges of reviewer */}
                    {(review.profiles?.badges || []).map((b: string) => (
                      <span key={b} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: BADGE_CONFIG[b] || 'linear-gradient(135deg,var(--teal),var(--violet))', color: '#fff' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono,monospace' }}>{new Date(review.created_at).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}