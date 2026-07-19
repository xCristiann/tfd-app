const fs = require('fs')
const path = require('path')
const root = process.cwd()

function write(filePath, content) {
  const full = path.join(root, filePath)
  const dir = path.dirname(full)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log('  [OK]', filePath)
}

// ══════════════════════════════════════════
// PAYOUTS PAGE — with payout submission form
// ══════════════════════════════════════════
write('app/payouts/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogo from '@/components/firm/FirmLogo'
import Link from 'next/link'

export default function PayoutsPage() {
  const [firms, setFirms] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [sort, setSort] = useState<'trust'|'speed'|'count'>('trust')

  // Form state
  const [firmId, setFirmId] = useState('')
  const [amount, setAmount] = useState('')
  const [days, setDays] = useState('')
  const [method, setMethod] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    Promise.all([
      supabase.from('firms')
        .select('id, name, slug, logo_url, payout_reliability, avg_payout_days, trust_score, max_allocation, challenges(payout_methods, profit_split, payout_frequency)')
        .eq('is_published', true)
        .order('trust_score', { ascending: false }),
      supabase.from('payout_reports')
        .select('*, firms(name, slug, logo_url), profiles(full_name)')
        .eq('status', 'verified')
        .order('created_at', { ascending: false })
        .limit(20)
    ]).then(([f, r]) => {
      setFirms(f.data || [])
      setReports(r.data || [])
      setLoading(false)
    })
  }, [])

  const submitReport = async () => {
    if (!firmId || !amount) { setSubmitMsg('Please select a firm and enter amount'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitMsg('Please sign in'); setSubmitting(false); return }

    const { error } = await supabase.from('payout_reports').insert({
      firm_id: firmId,
      user_id: user.id,
      amount_usd: parseInt(amount),
      days_to_receive: days ? parseInt(days) : null,
      method: method || null,
      proof_url: proofUrl || null,
      notes: notes || null,
      status: 'pending'
    })

    if (error) {
      setSubmitMsg('Error: ' + error.message)
    } else {
      setSubmitMsg('Submitted! Our team will verify your payout proof within 48h. +100 coins once verified.')
      await fetch('/api/coins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'payout_submitted' }) })
      setFirmId(''); setAmount(''); setDays(''); setMethod(''); setProofUrl(''); setNotes('')
      setShowForm(false)
    }
    setSubmitting(false)
  }

  const sorted = [...firms].sort((a, b) => {
    if (sort === 'speed') return (a.avg_payout_days || 999) - (b.avg_payout_days || 999)
    if (sort === 'count') {
      const ca = reports.filter(r => r.firms?.slug === a.slug).length
      const cb = reports.filter(r => r.firms?.slug === b.slug).length
      return cb - ca
    }
    return (b.trust_score || 0) - (a.trust_score || 0)
  })

  const reliabilityStyle = (r: string) => {
    if (r === 'Confirmed') return { bg: 'rgba(0,229,160,0.1)', color: 'var(--teal)', border: 'rgba(0,229,160,0.2)', dot: '#00e5a0' }
    if (r === 'Reported issues') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)', dot: '#f87171' }
    return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t3)', border: 'rgba(139,146,168,0.2)', dot: '#8b92a8' }
  }

  const confirmed = firms.filter(f => f.payout_reliability === 'Confirmed').length
  const totalReports = reports.length

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '56px 40px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Transparency</div>
            <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Payout Tracker</h1>
            <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
              Community-verified payout data. Every confirmation comes from a real trader.
            </p>
          </div>
          {user && (
            <button onClick={() => setShowForm(s => !s)}
              style={{ padding: '11px 22px', borderRadius: '10px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', flexShrink: 0 }}>
              + Submit Payout Proof
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Firms Tracked', value: firms.length, color: 'var(--teal)' },
            { label: 'Confirmed Payouts', value: totalReports, color: 'var(--green)' },
            { label: 'Confirmed Firms', value: confirmed, color: 'var(--amber)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Notice */}
        <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '16px', flexShrink: 0 }}>&#9888;</div>
          <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--amber)' }}>Data is community-sourced.</b> Payout reliability shows "Unknown" until verified by our team from real trader submissions. "Confirmed" means at least one payout was verified with proof. This is not financial advice.
          </div>
        </div>

        {/* Submit form */}
        {showForm && user && (
          <div style={{ background: 'var(--bg1)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '14px', padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Submit Payout Proof (+100 coins)</h3>
            <p style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '20px' }}>Help the community by sharing your payout experience. Our team verifies each submission before publishing.</p>

            {submitMsg && (
              <div style={{ background: submitMsg.includes('Error') ? 'rgba(248,113,113,0.1)' : 'rgba(0,229,160,0.1)', border: '1px solid ' + (submitMsg.includes('Error') ? 'rgba(248,113,113,0.2)' : 'rgba(0,229,160,0.2)'), borderRadius: '9px', padding: '10px 14px', marginBottom: '16px', fontSize: '13.5px', color: submitMsg.includes('Error') ? 'var(--coral)' : 'var(--teal)', fontWeight: 600 }}>
                {submitMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Prop Firm *</label>
                <select value={firmId} onChange={e => setFirmId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none' }}>
                  <option value="">Select firm...</option>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Payout Amount (USD) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Days to Receive</label>
                <input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="e.g. 2"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Payment Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none' }}>
                  <option value="">Select...</option>
                  <option value="Crypto">Crypto (USDT/BTC)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Wise">Wise</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Rise">Rise</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Screenshot / Proof URL (optional but recommended)</label>
                <input type="url" value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://imgur.com/... or Google Drive link"
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional info about your payout experience..."
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitReport} disabled={submitting}
                style={{ padding: '10px 24px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: '9px', background: 'transparent', color: 'var(--t3)', border: '1px solid var(--border2)', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '14px' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!user && (
          <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: 'var(--t2)' }}>Sign in to submit payout proof and earn <b style={{ color: 'var(--teal)' }}>+100 coins</b></span>
            <Link href="/auth/login?redirect=/payouts" style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </div>
        )}

        {/* Sort */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--t3)', marginRight: '4px' }}>Sort:</span>
          {[['trust','Trust Score'],['speed','Fastest'],['count','Most Verified']].map(([k,l]) => (
            <button key={k} onClick={() => setSort(k as any)}
              style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: '1px solid ' + (sort===k?'rgba(0,229,160,0.3)':'var(--border2)'), background: sort===k?'rgba(0,229,160,0.08)':'transparent', color: sort===k?'var(--teal)':'var(--t2)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Firms table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>Loading...</div>
        ) : (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '40px' }}>
            <div style={{ background: 'var(--bg2)', padding: '13px 24px', display: 'grid', gridTemplateColumns: '2fr 130px 90px 90px 1fr 80px', gap: '12px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', alignItems: 'center' }}>
              <div>Firm</div><div>Status</div><div>Avg Speed</div><div>Verified</div><div>Methods</div><div style={{ textAlign: 'right' }}>Max</div>
            </div>
            {sorted.map(firm => {
              const rs = reliabilityStyle(firm.payout_reliability || 'Unknown')
              const verifiedCount = reports.filter(r => r.firms?.slug === firm.slug).length
              const ch = firm.challenges?.[0]
              return (
                <Link key={firm.slug} href={'/firms/' + firm.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 130px 90px 90px 1fr 80px', gap: '12px', alignItems: 'center', transition: 'background .15s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background='var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FirmLogo name={firm.name} logoUrl={firm.logo_url} size={36} radius={8} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{firm.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Trust {firm.trust_score}/100</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: rs.bg, color: rs.color, border: '1px solid ' + rs.border, display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: rs.dot, flexShrink: 0, display: 'inline-block' }} />
                      {firm.payout_reliability || 'Unknown'}
                    </span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: firm.avg_payout_days ? (firm.avg_payout_days <= 2 ? 'var(--teal)' : firm.avg_payout_days <= 5 ? 'var(--amber)' : 'var(--coral)') : 'var(--t3)' }}>
                      {firm.avg_payout_days ? firm.avg_payout_days + 'd' : '—'}
                    </div>
                    <div style={{ fontSize: '13px', color: verifiedCount > 0 ? 'var(--teal)' : 'var(--t3)', fontWeight: verifiedCount > 0 ? 700 : 400 }}>
                      {verifiedCount > 0 ? verifiedCount + ' payout' + (verifiedCount > 1 ? 's' : '') : 'None yet'}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(ch?.payout_methods || []).slice(0,2).map((m: string) => (
                        <span key={m} style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border)' }}>{m}</span>
                      ))}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--t2)' }}>
                      {firm.max_allocation ? '$' + Math.round(firm.max_allocation/1000) + 'K' : '—'}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Recent verified payouts */}
        {reports.length > 0 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Recent Verified Payouts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reports.map(r => (
                <div key={r.id} style={{ background: 'var(--bg1)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FirmLogo name={r.firms?.name||''} logoUrl={r.firms?.logo_url} size={32} radius={7} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{r.firms?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{r.profiles?.full_name || 'Anonymous'} &middot; {r.method || 'Unknown method'} &middot; {r.days_to_receive ? r.days_to_receive + ' days' : 'Speed unknown'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--teal)' }}>${r.amount_usd?.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{new Date(r.verified_at || r.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reports.length === 0 && !loading && (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>&#128176;</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No verified payouts yet</div>
            <div style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>Be the first to submit a payout proof and earn 100 coins!</div>
            {user ? (
              <button onClick={() => setShowForm(true)} style={{ padding: '10px 22px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Submit First Payout
              </button>
            ) : (
              <Link href="/auth/register" style={{ padding: '10px 22px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                Sign Up to Submit
              </Link>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
`)

// ══════════════════════════════════════════
// ADMIN PAYOUTS — verify/reject submissions
// ══════════════════════════════════════════
write('app/admin/payouts/page.tsx', `'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import FirmLogo from '@/components/firm/FirmLogo'

export default function AdminPayoutsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending'|'verified'|'rejected'|'all'>('pending')
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('payout_reports')
      .select('*, firms(name, slug, logo_url), profiles(full_name, email)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setReports(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payout_reports').update({
      status,
      verified_at: status === 'verified' ? new Date().toISOString() : null,
      verified_by: status === 'verified' ? user?.id : null
    }).eq('id', id)
    setMsg(status === 'verified' ? 'Payout verified! Firm stats updated automatically.' : 'Rejected.')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Payout Verifications</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Review and verify trader payout submissions. Verified payouts automatically update firm reliability stats.</p>
      </div>

      {msg && <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '9px', padding: '10px 16px', marginBottom: '16px', fontSize: '13.5px', color: 'var(--teal)', fontWeight: 600 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['pending','verified','rejected','all'] as const).map(k => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: '1px solid ' + (filter===k?'rgba(0,229,160,0.3)':'var(--border2)'), background: filter===k?'rgba(0,229,160,0.08)':'transparent', color: filter===k?'var(--teal)':'var(--t2)', textTransform: 'capitalize' }}>
            {k}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)' }}>Loading...</div>
      ) : reports.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)', background: 'var(--bg1)', borderRadius: '12px', border: '1px solid var(--border)' }}>No {filter} submissions.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map(r => (
            <div key={r.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FirmLogo name={r.firms?.name||''} logoUrl={r.firms?.logo_url} size={32} radius={7} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.firms?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{r.profiles?.full_name || 'Anonymous'} &middot; {r.profiles?.email}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--teal)' }}>${r.amount_usd?.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '12px', background: 'var(--bg2)', borderRadius: '8px', padding: '10px 14px' }}>
                <div><div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '2px' }}>Days to receive</div><div style={{ fontSize: '14px', fontWeight: 700 }}>{r.days_to_receive ? r.days_to_receive + 'd' : '—'}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '2px' }}>Method</div><div style={{ fontSize: '14px', fontWeight: 700 }}>{r.method || '—'}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '2px' }}>Status</div><div style={{ fontSize: '14px', fontWeight: 700, color: r.status==='verified'?'var(--teal)':r.status==='rejected'?'var(--coral)':'var(--amber)', textTransform: 'capitalize' }}>{r.status}</div></div>
              </div>

              {r.notes && <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '10px', lineHeight: 1.5 }}><b>Notes:</b> {r.notes}</div>}

              {r.proof_url && (
                <div style={{ marginBottom: '12px' }}>
                  <a href={r.proof_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
                    View Proof Screenshot &rarr;
                  </a>
                </div>
              )}

              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => updateStatus(r.id, 'verified')}
                    style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(0,229,160,0.15)', color: 'var(--teal)', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Verify Payout
                  </button>
                  <button onClick={() => updateStatus(r.id, 'rejected')}
                    style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(248,113,113,0.1)', color: 'var(--coral)', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
`)

console.log('\n=== Done! ===')
console.log('Run: git add . && git commit -m "Payout system: real verification, admin panel" && git push')
