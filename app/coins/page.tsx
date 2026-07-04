'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIER_LEVELS = [
  { name: 'Beginner', min: 0, max: 499, color: '#8b92a8', icon: '🥉' },
  { name: 'Trader', min: 500, max: 1499, color: '#f59e0b', icon: '🥈' },
  { name: 'Pro Trader', min: 1500, max: 2999, color: '#00e5a0', icon: '🏆' },
  { name: 'Elite', min: 3000, max: Infinity, color: '#a78bfa', icon: '💎' },
]

export default function CoinsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login?redirect=/coins'); return }
      fetch('/api/coins').then(r => r.json()).then(d => { setData(d); setLoading(false) })
    })
  }, [])

  const redeem = async (prizeId: string) => {
    setRedeeming(prizeId)
    const res = await fetch('/api/coins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redeem', prize_id: prizeId }) })
    const result = await res.json()
    setMessage({ text: result.message || result.error, ok: result.success })
    setRedeeming(null)
    if (result.success) fetch('/api/coins').then(r => r.json()).then(setData)
  }

  const coins = data?.profile?.coins || 0
  const lifetime = data?.profile?.coins_lifetime || 0
  const tier = TIER_LEVELS.find(t => lifetime >= t.min && lifetime <= t.max) || TIER_LEVELS[0]
  const nextTier = TIER_LEVELS[TIER_LEVELS.indexOf(tier) + 1]
  const progress = nextTier ? Math.min(100, ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100) : 100

  const typeLabel: Record<string, string> = {
    purchase_via_link: '🛒 Purchase', purchase_via_code: '🛒 Purchase',
    review_submitted: '⭐ Review', review_approved: '✅ Approved',
    referral_signup: '👥 Referral', referral_purchase: '👥 Referral',
    signup: '🎉 Welcome', admin_grant: '🎁 Grant', redemption: '🎟️ Redeemed'
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '56px 32px 80px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)' }}>Loading...</div> : (
          <>
            {/* HEADER */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Rewards</div>
              <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '8px' }}>TFD Coins</h1>
              <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Earn coins by trading with our partners. Redeem for real prizes.</p>
            </div>

            {/* BALANCE + TIER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.1),rgba(167,139,250,0.1))', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '16px', padding: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Available Coins</div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: 'var(--teal)', letterSpacing: '-.03em', lineHeight: 1 }}>{coins.toLocaleString()}</div>
                <div style={{ fontSize: '13px', color: 'var(--t3)', marginTop: '6px' }}>{lifetime.toLocaleString()} lifetime earned</div>
                {data?.profile?.referral_code && (
                  <div style={{ marginTop: '16px', padding: '8px 14px', background: 'rgba(0,229,160,0.08)', borderRadius: '8px', fontSize: '12px', color: 'var(--t2)' }}>
                    Your referral code: <b style={{ color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>{data.profile.referral_code}</b>
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Your Tier</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '32px' }}>{tier.icon}</span>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: tier.color }}>{tier.name}</div>
                    {nextTier && <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{(nextTier.min - lifetime).toLocaleString()} coins to {nextTier.name}</div>}
                  </div>
                </div>
                <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${tier.color},${nextTier?.color || tier.color})`, borderRadius: '100px', transition: 'width .5s' }} />
                </div>
              </div>
            </div>

            {/* HOW TO EARN */}
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>How to Earn Coins</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {(data?.rewards || []).map((r: any) => (
                  <div key={r.action} style={{ background: 'var(--bg2)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--teal)', marginBottom: '4px' }}>+{r.coins}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{r.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.action}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRIZES */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Redeem Prizes</h2>
              {message && (
                <div style={{ background: message.ok ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${message.ok ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: message.ok ? 'var(--teal)' : 'var(--coral)', fontWeight: 600 }}>
                  {message.ok ? '✓' : '✗'} {message.text}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {(data?.prizes || []).map((prize: any) => {
                  const canAfford = coins >= prize.coins_required
                  const outOfStock = prize.stock === 0
                  return (
                    <div key={prize.id} style={{ background: 'var(--bg1)', border: `1px solid ${canAfford && !outOfStock ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, borderRadius: '14px', padding: '20px', opacity: outOfStock ? 0.5 : 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
                        {prize.prize_type}
                        {prize.stock > 0 && <span style={{ marginLeft: '6px', color: prize.stock <= 5 ? 'var(--coral)' : 'var(--t3)' }}>({prize.stock} left)</span>}
                        {prize.stock === -1 && <span style={{ marginLeft: '6px', color: 'var(--teal)' }}>∞</span>}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>{prize.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px', lineHeight: 1.5 }}>{prize.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: canAfford ? 'var(--teal)' : 'var(--t3)' }}>
                          {prize.coins_required.toLocaleString()} coins
                        </div>
                        <button
                          onClick={() => redeem(prize.id)}
                          disabled={!canAfford || outOfStock || redeeming === prize.id}
                          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: canAfford && !outOfStock ? 'pointer' : 'not-allowed', border: 'none', background: canAfford && !outOfStock ? 'var(--teal)' : 'var(--bg3)', color: canAfford && !outOfStock ? '#04120c' : 'var(--t3)', fontFamily: 'Inter, sans-serif' }}
                        >
                          {redeeming === prize.id ? '...' : outOfStock ? 'Sold out' : !canAfford ? 'Need more' : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* TRANSACTION HISTORY */}
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Transaction History</h2>
              <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                {(data?.transactions || []).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)', fontSize: '14px' }}>No transactions yet — start earning!</div>
                ) : (data.transactions || []).map((tx: any) => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{typeLabel[tx.type] || tx.type}</div>
                      <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{tx.description} {tx.firm_slug ? `· ${tx.firm_slug}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: tx.amount > 0 ? 'var(--teal)' : 'var(--coral)' }}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(tx.created_at).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}