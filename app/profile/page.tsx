'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

const TIER_LEVELS = [
  { name: 'Beginner', min: 0,    max: 499,      color: '#8b92a8' },
  { name: 'Trader',   min: 500,  max: 1499,     color: '#f59e0b' },
  { name: 'Pro',      min: 1500, max: 2999,     color: '#00e5a0' },
  { name: 'Elite',    min: 3000, max: Infinity,  color: '#a78bfa' },
]

const BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
  'TFD Pro Trader': { bg: 'linear-gradient(135deg,#00e5a0,#7c3aed)', label: 'PRO' },
  'Elite Trader':   { bg: 'linear-gradient(135deg,#f59e0b,#ef4444)', label: 'ELITE' },
  'Top Reviewer':   { bg: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', label: 'TOP' },
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'overview'|'reviews'|'coins'|'settings'>('overview')
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login?redirect=/profile'); return }
      const [p, r, tx] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('reviews').select('*, firms(name,slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('coin_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      setProfile({ ...p.data, email: user.email })
      setName(p.data?.full_name || '')
      setReviews(r.data || [])
      setTransactions(tx.data || [])
      setLoading(false)
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    setProfile((p: any) => ({ ...p, full_name: name }))
    setMsg('Profile updated!')
    setTimeout(() => setMsg(''), 2000)
    setSaving(false)
  }

  if (loading) return (
    <>
      <Navbar />
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)' }}>Loading profile...</div>
      </main>
    </>
  )

  const coins = profile?.coins || 0
  const lifetime = profile?.coins_lifetime || 0
  const badges = profile?.badges || []
  const tier = TIER_LEVELS.find(t => lifetime >= t.min && lifetime <= t.max) || TIER_LEVELS[0]
  const nextTier = TIER_LEVELS[TIER_LEVELS.indexOf(tier) + 1]
  const progress = nextTier ? Math.min(100, ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100) : 100
  const initials = (profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.08),rgba(124,58,237,0.08))', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '20px', padding: '32px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900, color: '#04120c', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{profile?.full_name || 'Anonymous Trader'}</h1>
            </div>
            {msg && <div style={{ fontSize: '13px', color: 'var(--teal)', marginBottom: '4px' }}>{msg}</div>}
            <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '12px' }}>{profile?.email}</div>
            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {badges.map((b: string) => {
                  const cfg = BADGE_CONFIG[b] || { bg: 'linear-gradient(135deg,var(--teal),var(--violet))', label: 'TFD' }
                  return (
                    <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '100px', background: cfg.bg, color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                      <span style={{ fontSize: '10px' }}>{cfg.label}</span> {b}
                    </span>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--teal)' }}>{coins.toLocaleString()}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Coins</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 900, color: tier.color }}>{tier.name}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Tier</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 900 }}>{reviews.length}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Reviews</div></div>
              <div><div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--amber)' }}>{badges.length}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>Badges</div></div>
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid ' + tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: tier.color }}>{tier.name.slice(0,3).toUpperCase()}</div>
              <div style={{ fontSize: '9px', color: 'var(--t3)' }}>{lifetime.toLocaleString()}</div>
            </div>
            <div style={{ height: '4px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg,' + tier.color + ',' + (nextTier?.color || tier.color) + ')', borderRadius: '100px' }} />
            </div>
            {nextTier && <div style={{ fontSize: '9px', color: 'var(--t3)', marginTop: '3px' }}>{(nextTier.min - lifetime).toLocaleString()} to {nextTier.name}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {([['overview','Overview'],['reviews','My Reviews'],['coins','Coin History'],['settings','Settings']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', border: 'none', background: 'transparent', color: tab === k ? 'var(--teal)' : 'var(--t2)', borderBottom: '2px solid ' + (tab === k ? 'var(--teal)' : 'transparent'), marginBottom: '-1px' }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Coins Balance</div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--teal)', marginBottom: '4px' }}>{coins.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '16px' }}>{lifetime.toLocaleString()} total earned</div>
              <Link href="/coins" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Go to Shop</Link>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Referral Code</div>
              <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '12px' }}>Share your code and earn <b style={{ color: 'var(--teal)' }}>+100 coins</b> for each friend who signs up.</div>
              {profile?.referral_code && (
                <div style={{ background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '16px', fontWeight: 700, color: 'var(--teal)' }}>{profile.referral_code}</span>
                  <button onClick={() => { navigator.clipboard.writeText('https://www.thefundeddiaries.com/auth/register?ref=' + profile.referral_code); setMsg('Copied!'); setTimeout(()=>setMsg(''),1500) }}
                    style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--teal)', color: '#04120c', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    Copy
                  </button>
                </div>
              )}
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', gridColumn: '1/-1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Badges ({badges.length})</div>
                <Link href="/coins" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Earn badges in Shop</Link>
              </div>
              {badges.length === 0 ? (
                <div style={{ fontSize: '13.5px', color: 'var(--t3)', padding: '20px', textAlign: 'center' }}>
                  No badges yet. Visit the <Link href="/coins" style={{ color: 'var(--teal)', textDecoration: 'none' }}>Coins Shop</Link> to redeem badges.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {badges.map((b: string) => {
                    const cfg = BADGE_CONFIG[b] || { bg: 'linear-gradient(135deg,var(--teal),var(--violet))', label: 'TFD' }
                    return (
                      <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '.05em', boxShadow: '0 0 16px rgba(0,229,160,0.2)' }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600, textAlign: 'center', maxWidth: '70px' }}>{b}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{reviews.length} reviews written</div>
              <Link href="/reviews" style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Write Review</Link>
            </div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)', background: 'var(--bg1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '12px' }}>No reviews yet.</div>
                <Link href="/reviews" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Write your first review and earn 75 coins</Link>
              </div>
            ) : reviews.map((r: any) => (
              <div key={r.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link href={'/firms/' + r.firms?.slug} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', textDecoration: 'none' }}>{r.firms?.name}</Link>
                    <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: r.status === 'approved' ? 'rgba(0,229,160,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'approved' ? 'var(--teal)' : 'var(--amber)' }}>{r.status}</span>
                  </div>
                  <div style={{ color: 'var(--amber)' }}>{'★'.repeat(r.rating || 0)}</div>
                </div>
                {r.title && <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{r.title}</div>}
                <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6 }}>{r.content}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'coins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Transaction History</div>
              <Link href="/coins" style={{ fontSize: '13px', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Go to Shop</Link>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)' }}>No transactions yet.</div>
              ) : transactions.map((tx: any) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{tx.description || tx.type}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono,monospace' }}>{new Date(tx.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: tx.amount > 0 ? 'var(--teal)' : 'var(--coral)' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Account Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email</label>
                  <input value={profile?.email || ''} disabled
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--t3)', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  style={{ padding: '11px 24px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Password</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--t2)', marginBottom: '14px' }}>Change your password via the forgot password flow.</p>
              <Link href="/auth/forgot-password" style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border2)', color: 'var(--t1)', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                Change Password
              </Link>
            </div>
            <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: 'var(--coral)' }}>Danger Zone</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--t2)', marginBottom: '14px' }}>Deleting your account is permanent.</p>
              <button onClick={async () => { if (!confirm('Delete account? This cannot be undone.')) return; await supabase.auth.signOut(); router.push('/') }}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--coral)', background: 'rgba(248,113,113,0.08)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                Delete Account
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
