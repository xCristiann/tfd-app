import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminCoinsPage() {
  const admin = await createAdminClient()
  const { data: rewards } = await admin.from('coin_rewards').select('*').order('coins', { ascending: false })
  const { data: prizes } = await admin.from('coin_prizes').select('*').order('coins_required', { ascending: true })
  const { data: redemptions } = await admin.from('coin_redemptions').select('*, profiles(full_name, email), coin_prizes(title)').order('created_at', { ascending: false }).limit(20)
  const { data: topUsers } = await admin.from('profiles').select('full_name, email, coins, coins_lifetime').order('coins_lifetime', { ascending: false }).limit(10)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Coins & Prizes</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Manage coin rewards, prizes, and track redemptions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* EARN REWARDS */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Coin Earn Rates</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(rewards || []).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg2)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.action}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--teal)' }}>+{r.coins}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--t3)' }}>Edit rates directly in Supabase → coin_rewards table</div>
        </div>

        {/* TOP USERS */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Top Coin Earners</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(topUsers || []).map((u: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg2)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.full_name || 'Anonymous'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{u.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--teal)' }}>{(u.coins || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{(u.coins_lifetime || 0).toLocaleString()} lifetime</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRIZES */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Active Prizes</h2>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
            <div>Prize</div><div>Type</div><div>Cost</div><div>Stock</div>
          </div>
          {(prizes || []).map((p: any) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '13px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', gap: '12px', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 600 }}>{p.title}</div><div style={{ fontSize: '11.5px', color: 'var(--t3)' }}>{p.description}</div></div>
              <div style={{ fontSize: '12px', color: 'var(--t2)' }}>{p.prize_type}</div>
              <div style={{ fontWeight: 700, color: 'var(--teal)' }}>{p.coins_required.toLocaleString()}</div>
              <div style={{ color: p.stock === 0 ? 'var(--coral)' : p.stock === -1 ? 'var(--teal)' : 'var(--t1)' }}>
                {p.stock === -1 ? '∞ Unlimited' : p.stock === 0 ? 'Sold out' : `${p.stock} left`}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--t3)' }}>Manage prizes directly in Supabase → coin_prizes table</div>
      </div>

      {/* REDEMPTIONS */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Recent Redemptions</h2>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
            <div>User</div><div>Prize</div><div>Coins</div><div>Status</div><div>Date</div>
          </div>
          {(redemptions || []).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)', fontSize: '14px' }}>No redemptions yet.</div>
          ) : (redemptions || []).map((r: any) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr', padding: '13px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', gap: '12px', alignItems: 'center' }}>
              <div><div style={{ fontWeight: 600 }}>{r.profiles?.full_name || 'Anonymous'}</div><div style={{ fontSize: '11px', color: 'var(--t3)' }}>{r.profiles?.email}</div></div>
              <div style={{ fontWeight: 500 }}>{r.coin_prizes?.title}</div>
              <div style={{ fontWeight: 700, color: 'var(--coral)' }}>-{r.coins_spent}</div>
              <div><span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: r.status === 'fulfilled' ? 'rgba(0,229,160,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'fulfilled' ? 'var(--teal)' : 'var(--amber)', border: `1px solid ${r.status === 'fulfilled' ? 'rgba(0,229,160,0.2)' : 'rgba(251,191,36,0.2)'}` }}>{r.status}</span></div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}