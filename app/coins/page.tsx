'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TIERS = [
  { name: 'Beginner', min: 0, max: 499, color: '#8b92a8', icon: '🥉' },
  { name: 'Trader', min: 500, max: 1499, color: '#f59e0b', icon: '🥈' },
  { name: 'Pro Trader', min: 1500, max: 2999, color: '#00e5a0', icon: '🏆' },
  { name: 'Elite', min: 3000, max: Infinity, color: '#a78bfa', icon: '💎' },
]

const TX_LABELS: Record<string, string> = {
  purchase_via_link: '🛒 Purchase via link',
  purchase_via_code: '🛒 Purchase via code',
  review_submitted: '⭐ Review submitted',
  review_approved: '✅ Review approved',
  referral_signup: '👥 Referral signup',
  referral_purchase: '👥 Referral purchase',
  signup: '🎉 Welcome bonus',
  admin_grant: '🎁 Admin grant',
  redemption: '🎟️ Prize redeemed',
  profile_complete: '✍️ Profile completed',
}

export default function CoinsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shop' | 'earn' | 'history'>('shop')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login?redirect=/coins'); return }
      fetch('/api/coins').then(r => r.json()).then(d => { setData(d); setLoading(false) })
    })
  }, [])

  const redeem = async (prizeId: string) => {
    setRedeeming(prizeId); setMsg(null)
    const res = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', prize_id: prizeId })
    })
    const result = await res.json()
    setMsg({ text: result.message || result.error, ok: !!result.success })
    setRedeeming(null)
    if (result.success) fetch('/api/coins').then(r => r.json()).then(setData)
  }

  const copyReferral = () => {
    const code = data?.profile?.referral_code
    if (!code) return
    navigator.clipboard.writeText(`https://www.thefundeddiaries.com/auth/register?ref=${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return (
    <>
      <Navbar />
      <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)', fontSize: '15px' }}>Loading your coins...</div>
      </main>
    </>
  )

  const coins = data?.profile?.coins || 0
  const lifetime = data?.profile?.coins_lifetime || 0
  const tier = TIERS.find(t => lifetime >= t.min && lifetime <= t.max) || TIERS[0]
  const nextTier = TIERS[TIERS.indexOf(tier) + 1]
  const progress = nextTier ? Math.min(100, ((lifetime - tier.min) / (nextTier.min - tier.min)) * 100) : 100

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* HEADER */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          {/* BALANCE */}
          <div style={{ background: 'linear-gradient(135deg,rgba(0,229,160,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Available Coins</div>
            <div style={{ fontSize: '52px', fontWeight: 900, color: 'var(--teal)', letterSpacing: '-.04em', lineHeight: 1, marginBottom: '4px' }}>
              🪙 {coins.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '16px' }}>{lifetime.toLocaleString()} lifetime earned</div>

            {/* REFERRAL */}
            {data?.profile?.referral_code && (
              <div style={{ background: 'rgba(0,229,160,0.08)', borderRadius: '9px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>Your referral code</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: 'var(--teal)', letterSpacing: '.04em' }}>{data.profile.referral_code}</span>
                  <button onClick={copyReferral} style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', border: 'none', background: 'var(--teal)', color: '#04120c', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {copied ? '✓ Copied!' : 'Copy link'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>Share your link — you both get +100 coins</div>
              </div>
            )}
          </div>

          {/* TIER */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>Your Tier</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{tier.icon}</span>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: tier.color, lineHeight: 1 }}>{tier.name}</div>
                {nextTier && <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{(nextTier.min - lifetime).toLocaleString()} coins to {nextTier.name}</div>}
              </div>
            </div>
            <div style={{ height: '8px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${tier.color},${nextTier?.color || tier.color})`, borderRadius: '100px', transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginTop: '14px' }}>
              {TIERS.map(t => (
                <div key={t.name} style={{ textAlign: 'center', opacity: lifetime >= t.min ? 1 : 0.35 }}>
                  <div style={{ fontSize: '16px' }}>{t.icon}</div>
                  <div style={{ fontSize: '10px', color: t.color, fontWeight: 600, marginTop: '2px' }}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {(['shop', 'earn', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', background: 'transparent', color: tab === t ? 'var(--teal)' : 'var(--t2)', borderBottom: `2px solid ${tab === t ? 'var(--teal)' : 'transparent'}`, marginBottom: '-1px', textTransform: 'capitalize' }}>
              {t === 'shop' ? '🎁 Shop' : t === 'earn' ? '🪙 How to Earn' : '📋 History'}
            </button>
          ))}
        </div>

        {/* SHOP TAB */}
        {tab === 'shop' && (
          <div>
            {msg && (
              <div style={{ background: msg.ok ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${msg.ok ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: msg.ok ? 'var(--teal)' : 'var(--coral)', fontWeight: 600 }}>
                {msg.ok ? '✓' : '✗'} {msg.text}
              </div>
            )}
            {(data?.prizes || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t2)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎁</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No prizes available yet</div>
                <div style={{ fontSize: '14px' }}>Check back soon — prizes are being added!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
                {(data?.prizes || []).map((prize: any) => {
                  const canAfford = coins >= prize.coins_required
                  const outOfStock = prize.stock === 0
                  return (
                    <div key={prize.id} style={{ background: 'var(--bg1)', border: `1px solid ${canAfford && !outOfStock ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, borderRadius: '14px', padding: '20px', opacity: outOfStock ? 0.5 : 1, transition: 'border-color .2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', background: 'var(--bg2)', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          {prize.prize_type}
                        </span>
                        {prize.stock > 0 && prize.stock <= 10 && (
                          <span style={{ fontSize: '11px', color: 'var(--coral)', fontWeight: 600 }}>Only {prize.stock} left!</span>
                        )}
                        {prize.stock === -1 && (
                          <span style={{ fontSize: '11px', color: 'var(--teal)', fontWeight: 600 }}>∞ Unlimited</span>
                        )}
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>{prize.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '16px', lineHeight: 1.5 }}>{prize.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '22px', fontWeight: 900, color: canAfford ? 'var(--teal)' : 'var(--t3)' }}>
                            🪙 {prize.coins_required.toLocaleString()}
                          </div>
                          {!canAfford && !outOfStock && (
                            <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
                              Need {(prize.coins_required - coins).toLocaleString()} more
                            </div>
                          )}
                        </div>
                        <button onClick={() => redeem(prize.id)} disabled={!canAfford || outOfStock || redeeming === prize.id}
                          style={{ padding: '10px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: canAfford && !outOfStock ? 'pointer' : 'not-allowed', border: 'none', background: canAfford && !outOfStock ? 'var(--teal)' : 'var(--bg3)', color: canAfford && !outOfStock ? '#04120c' : 'var(--t3)', fontFamily: 'Inter, sans-serif', transition: 'all .15s' }}>
                          {redeeming === prize.id ? '...' : outOfStock ? 'Sold out' : !canAfford ? 'Need more coins' : 'Redeem →'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* EARN TAB */}
        {tab === 'earn' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
            {(data?.rewards || []).map((r: any) => (
              <div key={r.action} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,229,160,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--teal)' }}>+{r.coins}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{r.description}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.action}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {(data?.transactions || []).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)', fontSize: '14px' }}>No transactions yet — start earning!</div>
            ) : (data.transactions || []).map((tx: any) => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{TX_LABELS[tx.type] || tx.type}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{tx.description}{tx.firm_slug ? ` · ${tx.firm_slug}` : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: tx.amount > 0 ? 'var(--teal)' : 'var(--coral)' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(tx.created_at).toLocaleDateString('en-GB')}
                  </div>
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