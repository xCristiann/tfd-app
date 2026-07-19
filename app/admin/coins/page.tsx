'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminCoinsPage() {
  const [users, setUsers] = useState<any[]>([])
  const [prizes, setPrizes] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [tab, setTab] = useState<'users' | 'prizes' | 'rates' | 'redemptions'>('users')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Grant/deduct form
  const [selectedUser, setSelectedUser] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinNote, setCoinNote] = useState('')
  const [grantLoading, setGrantLoading] = useState(false)

  // New prize form
  const [newPrize, setNewPrize] = useState({ title: '', description: '', coins_required: '', prize_type: 'discount', prize_value: '', stock: '-1' })
  const [prizeLoading, setPrizeLoading] = useState(false)

  const supabase = createClient()

  const load = async () => {
    setLoading(true)
    const [u, p, r, red] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, coins, coins_lifetime').order('coins_lifetime', { ascending: false }).limit(50),
      supabase.from('coin_prizes').select('*').order('coins_required'),
      supabase.from('coin_rewards').select('*').order('coins', { ascending: false }),
      supabase.from('coin_redemptions').select('*, profiles(full_name,email), coin_prizes(title)').order('created_at', { ascending: false }).limit(30),
    ])
    setUsers(u.data || []); setPrizes(p.data || []); setRewards(r.data || []); setRedemptions(red.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const grantCoins = async (deduct = false) => {
    if (!selectedUser || !coinAmount) { setMsg('Select a user and enter an amount'); return }
    setGrantLoading(true); setMsg('')
    const amount = parseInt(coinAmount) * (deduct ? -1 : 1)
    const res = await fetch('/api/admin/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser, amount, note: coinNote || (deduct ? 'Admin deduction' : 'Admin grant') })
    })
    const data = await res.json()
    setMsg(data.success ? `✓ ${deduct ? 'Deducted' : 'Granted'} ${Math.abs(amount)} coins` : `× ${data.error}`)
    if (data.success) { setCoinAmount(''); setCoinNote(''); load() }
    setGrantLoading(false)
  }

  const addPrize = async () => {
    if (!newPrize.title || !newPrize.coins_required) { setMsg('Fill in title and cost'); return }
    setPrizeLoading(true)
    const { error } = await supabase.from('coin_prizes').insert({
      title: newPrize.title,
      description: newPrize.description,
      coins_required: parseInt(newPrize.coins_required),
      prize_type: newPrize.prize_type,
      prize_value: newPrize.prize_value,
      stock: parseInt(newPrize.stock),
      is_active: true,
    })
    setMsg(error ? `× ${error.message}` : '✓ Prize added!')
    if (!error) { setNewPrize({ title: '', description: '', coins_required: '', prize_type: 'discount', prize_value: '', stock: '-1' }); load() }
    setPrizeLoading(false)
  }

  const deletePrize = async (id: string) => {
    if (!confirm('Delete this prize?')) return
    await supabase.from('coin_prizes').delete().eq('id', id)
    load()
  }

  const updatePrize = async (id: string, field: string, value: any) => {
    await supabase.from('coin_prizes').update({ [field]: value }).eq('id', id)
    load()
  }

  const inp = (label: string, value: string, setter: (v: string) => void, type = 'text', placeholder = '') => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      <input type={type} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Coins & Prizes</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Manage coins, prizes, and user balances.</p>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✓') ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${msg.startsWith('✓') ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '9px', padding: '10px 16px', marginBottom: '16px', fontSize: '13.5px', color: msg.startsWith('✓') ? 'var(--teal)' : 'var(--coral)', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {(['users', 'prizes', 'rates', 'redemptions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', background: 'transparent', color: tab === t ? 'var(--teal)' : 'var(--t2)', borderBottom: `2px solid ${tab === t ? 'var(--teal)' : 'transparent'}`, marginBottom: '-1px', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === 'users' && (
        <div>
          {/* GRANT / DEDUCT */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Grant or Deduct Coins</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>User</label>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                  <option value="">Select user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || 'Anonymous'} ({u.email}) — 🪙 {u.coins}</option>)}
                </select>
              </div>
              {inp('Amount', coinAmount, setCoinAmount, 'number', '100')}
              {inp('Note (optional)', coinNote, setCoinNote, 'text', 'e.g. Contest winner')}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => grantCoins(false)} disabled={grantLoading}
                style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--teal)', color: '#04120c', fontFamily: 'Inter, sans-serif' }}>
                + Grant Coins
              </button>
              <button onClick={() => grantCoins(true)} disabled={grantLoading}
                style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: 'var(--coral)', fontFamily: 'Inter, sans-serif' }}>
                - Deduct Coins
              </button>
            </div>
          </div>

          {/* USERS LIST */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', padding: '11px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
              <div>User</div><div>Balance</div><div>Lifetime</div>
            </div>
            {loading ? <div style={{ padding: '30px', textAlign: 'center', color: 'var(--t2)' }}>Loading...</div> :
              users.map(u => (
                <div key={u.id} style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{u.full_name || 'Anonymous'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)' }}>{u.email}</div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--teal)' }}>🪙 {(u.coins || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '13px', color: 'var(--t3)' }}>{(u.coins_lifetime || 0).toLocaleString()}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* PRIZES TAB */}
      {tab === 'prizes' && (
        <div>
          {/* ADD PRIZE */}
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Add New Prize</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              {inp('Title', newPrize.title, v => setNewPrize(p => ({ ...p, title: v })), 'text', 'e.g. €25 Gift Card')}
              {inp('Cost (coins)', newPrize.coins_required, v => setNewPrize(p => ({ ...p, coins_required: v })), 'number', '500')}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Type</label>
                <select value={newPrize.prize_type} onChange={e => setNewPrize(p => ({ ...p, prize_type: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
                  <option value="discount">Discount</option>
                  <option value="cash">Cash/Gift Card</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="badge">Badge</option>
                </select>
              </div>
              {inp('Stock (-1=∞)', newPrize.stock, v => setNewPrize(p => ({ ...p, stock: v })), 'number', '-1')}
            </div>
            <div style={{ marginBottom: '12px' }}>
              {inp('Description', newPrize.description, v => setNewPrize(p => ({ ...p, description: v })), 'text', 'Short description of the prize')}
            </div>
            <button onClick={addPrize} disabled={prizeLoading}
              style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--teal)', color: '#04120c', fontFamily: 'Inter, sans-serif' }}>
              Add Prize
            </button>
          </div>

          {/* PRIZES LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {prizes.map(p => (
              <div key={p.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{p.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--teal)', whiteSpace: 'nowrap' }}>🪙 {p.coins_required.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                    Stock: {p.stock === -1 ? '∞' : p.stock}
                  </div>
                  <button onClick={() => updatePrize(p.id, 'is_active', !p.is_active)}
                    style={{ fontSize: '11.5px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: p.is_active ? 'rgba(0,229,160,0.1)' : 'rgba(139,146,168,0.1)', color: p.is_active ? 'var(--teal)' : 'var(--t3)', fontFamily: 'Inter, sans-serif' }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => deletePrize(p.id)}
                    style={{ fontSize: '11.5px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(248,113,113,0.1)', color: 'var(--coral)', fontFamily: 'Inter, sans-serif' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RATES TAB */}
      {tab === 'rates' && (
        <div>
          <p style={{ fontSize: '13.5px', color: 'var(--t2)', marginBottom: '16px' }}>Coin earn rates. Edit directly in Supabase → coin_rewards table, or update via SQL.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rewards.map(r => (
              <div key={r.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{r.description}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.action}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--teal)' }}>+{r.coins}</div>
                  <button onClick={() => supabase.from('coin_rewards').update({ is_active: !r.is_active }).eq('id', r.id).then(() => load())}
                    style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: r.is_active ? 'rgba(0,229,160,0.1)' : 'rgba(139,146,168,0.1)', color: r.is_active ? 'var(--teal)' : 'var(--t3)', fontFamily: 'Inter, sans-serif' }}>
                    {r.is_active ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REDEMPTIONS TAB */}
      {tab === 'redemptions' && (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: '11px 20px', display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 80px 80px 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
            <div>User</div><div>Prize</div><div>Coins</div><div>Status</div><div>Date</div>
          </div>
          {redemptions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t2)' }}>No redemptions yet.</div>
          ) : redemptions.map((r: any) => (
            <div key={r.id} style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 80px 80px 1fr', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.profiles?.full_name || 'Anonymous'}</div>
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{r.profiles?.email}</div>
              </div>
              <div>{r.coin_prizes?.title}</div>
              <div style={{ color: 'var(--coral)', fontWeight: 700 }}>-{r.coins_spent}</div>
              <div>
                <button onClick={async () => {
                  await supabase.from('coin_redemptions').update({ status: r.status === 'fulfilled' ? 'pending' : 'fulfilled' }).eq('id', r.id)
                  load()
                }} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: r.status === 'fulfilled' ? 'rgba(0,229,160,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'fulfilled' ? 'var(--teal)' : 'var(--amber)', fontFamily: 'Inter, sans-serif' }}>
                  {r.status}
                </button>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}