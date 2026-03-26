import { useEffect, useState, useMemo } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt, phaseLabel, accountTypeLabel, accountBadgeLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { TRADER_NAV } from '@/lib/nav'
import type { TraderStats, DailySnapshot, Account } from '@/types/database'

/* ── helpers ── */
function dur(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

/* ── mini sparkline ── */
function Sparkline({ data, color = '#22d3ee', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const w = 200, h = height
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ── donut gauge ── */
function Gauge({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  const r = 36, circ = 2 * Math.PI * r
  const fill = Math.min(pct / 100, 1) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 88, height: 88 }}>
        <svg viewBox="0 0 80 80" width={88} height={88}>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk', monospace" }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "'Space Grotesk', monospace" }}>{value}</span>
    </div>
  )
}

/* ── progress bar ── */
function ProgressBar({ label, used, max, color, info }: { label: string; used: number; max: number; color: string; info?: string }) {
  const pct = Math.min((used / max) * 100, 100)
  const isFailed = pct >= 100
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{label}</span>
          {info && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{info}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isFailed && <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 4 }}>Failed</span>}
          <span style={{ fontSize: 10, color: isFailed ? '#ef4444' : 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk',monospace" }}>
            Remaining: {fmt(Math.max((max / 100) * (max - used), 0))}
          </span>
        </div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: isFailed ? '#ef4444' : color, borderRadius: 6, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>$0</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Grotesk',monospace" }}>Max: {fmt(max)}</span>
      </div>
    </div>
  )
}

/* ── calendar ── */
function TradeCalendar({ trades }: { trades: any[] }) {
  const [month, setMonth] = useState(() => new Date())
  const year = month.getFullYear(), mon = month.getMonth()
  const firstDay = new Date(year, mon, 1).getDay()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()

  const dayMap = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {}
    trades.forEach(t => {
      if (!t.closed_at) return
      const day = t.closed_at.split('T')[0]
      if (!m[day]) m[day] = { pnl: 0, count: 0 }
      m[day].pnl += t.net_pnl ?? 0
      m[day].count++
    })
    return m
  }, [trades])

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Weekly summary
  const weeks: { label: string; pnl: number; days: number }[] = []
  let d = 1
  while (d <= daysInMonth) {
    const weekStart = new Date(year, mon, d)
    const weekEnd = new Date(year, mon, Math.min(d + 6, daysInMonth))
    const wLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    let wPnl = 0, wDays = 0
    for (let i = d; i <= Math.min(d + 6, daysInMonth); i++) {
      const key = `${year}-${String(mon + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      if (dayMap[key]) { wPnl += dayMap[key].pnl; wDays++ }
    }
    weeks.push({ label: wLabel, pnl: wPnl, days: wDays })
    d += 7
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMonth(new Date(year, mon - 1, 1))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{monthLabel}</span>
        <button onClick={() => setMonth(new Date(year, mon + 1, 1))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>›</button>
        <button onClick={() => setMonth(new Date())} style={{ marginLeft: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}>Today</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.3)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} style={{ height: 60, borderRadius: 6 }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const key = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const data = dayMap[key]
              const isToday = new Date().toDateString() === new Date(year, mon, day).toDateString()
              const pnl = data?.pnl ?? 0
              const isProfit = pnl > 0
              const isLoss = pnl < 0
              return (
                <div key={day} style={{
                  height: 60, borderRadius: 6, padding: '6px 8px',
                  background: isToday ? 'rgba(34,211,238,0.12)' : isProfit ? 'rgba(34,197,94,0.12)' : isLoss ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                  border: isToday ? '1px solid rgba(34,211,238,0.4)' : '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 10, color: isToday ? '#22d3ee' : 'rgba(255,255,255,0.5)', fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {data && (
                    <div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{data.count} trade{data.count !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isProfit ? '#4ade80' : '#f87171', fontFamily: "'Space Grotesk',monospace" }}>
                        {isProfit ? '+' : ''}{fmt(pnl)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {/* Weekly summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Weekly Summary</div>
          {weeks.map((w, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Week {i + 1}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{w.label}</span>
              </div>
              {w.days === 0 ? (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>No trades</div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: w.pnl >= 0 ? '#4ade80' : '#f87171', fontFamily: "'Space Grotesk',monospace" }}>
                    {w.pnl >= 0 ? '+' : ''}{fmt(w.pnl)}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Days: {w.days}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── main page ── */
export function DashboardPage() {
  const { accounts, loading } = useAccount()
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stats, setStats] = useState<TraderStats | null>(null)
  const [curve, setCurve] = useState<DailySnapshot[]>([])
  const [openTrades, setOpenTrades] = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'history' | 'open'>('history')

  const account: Account | null = (selectedId ? accounts.find(a => a.id === selectedId) : null) ?? accounts[0] ?? null
  const prod = (account as any)?.challenge_products

  useEffect(() => { if (accounts.length > 0 && !selectedId) setSelectedId(accounts[0].id) }, [accounts.length])

  useEffect(() => {
    if (!account) return
    setStats(null); setCurve([]); setOpenTrades([]); setClosedTrades([])
    analyticsApi.getStats(account.id).then(setStats).catch(() => {})
    analyticsApi.getEquityCurve(account.id, 90).then(setCurve).catch(() => {})
    supabase.from('trades').select('*').eq('account_id', account.id).eq('status', 'open').order('opened_at', { ascending: false }).then(({ data }) => setOpenTrades(data ?? []))
    supabase.from('trades').select('*').eq('account_id', account.id).eq('status', 'closed').order('closed_at', { ascending: false }).limit(100).then(({ data }) => setClosedTrades(data ?? []))
  }, [account?.id])

  const profit = account ? (account.balance - account.starting_balance) : 0
  const profitPct = account && account.starting_balance > 0 ? (profit / account.starting_balance) * 100 : 0
  const withdrawable = profit > 0 ? profit * ((prod?.funded_profit_split ?? 85) / 100) : 0
  const dailyLimit = prod?.ph1_daily_dd ?? 5
  const maxLimit = prod?.ph1_max_dd ?? 10
  const targetPct = account?.phase === 'phase2' ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)
  const isFunded = account?.phase === 'funded'
  const isBreached = account?.status === 'breached'
  const isFrozen = account?.status === 'soft_locked'

  // Instrument breakdown
  const instrBreakdown = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {}
    closedTrades.forEach(t => {
      if (!m[t.symbol]) m[t.symbol] = { pnl: 0, count: 0 }
      m[t.symbol].pnl += t.net_pnl ?? 0
      m[t.symbol].count++
    })
    return Object.entries(m).map(([sym, v]) => ({ sym, ...v })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 5)
  }, [closedTrades])

  const tradingDays = useMemo(() => {
    const days = new Set(closedTrades.map(t => t.closed_at?.split('T')[0]).filter(Boolean))
    return days.size
  }, [closedTrades])

  const totalLots = useMemo(() => closedTrades.reduce((s, t) => s + (t.lots ?? 0), 0), [closedTrades])

  const s = {
    page: { fontFamily: "'DM Sans', system-ui, sans-serif", background: '#0d1117', minHeight: '100vh', color: '#fff' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 } as React.CSSProperties,
    label: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.8px', fontWeight: 500 },
    value: { fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk', monospace" },
  }

  /* ── render ── */
  const content = loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #22d3ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  ) : accounts.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Active Account</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Purchase a challenge to start your funded journey.</p>
      <button onClick={() => navigate('/dashboard/challenges')} style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Buy a Challenge →</button>
    </div>
  ) : (
    <div>
      {/* ── account selector ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {accounts.map(a => {
          const isActive = a.id === account?.id
          return (
            <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: isActive ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.06)',
              color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.5)',
              outline: isActive ? '1px solid rgba(34,211,238,0.4)' : 'none',
            }}>
              #{(a as any).account_number} · {accountBadgeLabel(a.phase, (a as any).challenge_products?.challenge_type)}
              {(a as any).status === 'soft_locked' && <span style={{ marginLeft: 6, fontSize: 9, color: '#ef4444' }}>🔒</span>}
            </button>
          )
        })}
        <button onClick={() => navigate('/dashboard/challenges')} style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#22d3ee,#3b82f6)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>+ New Challenge</button>
      </div>

      {/* ── status banners ── */}
      {isFrozen && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>🔒</span><div><div style={{ fontWeight: 700, fontSize: 13, color: '#f87171' }}>Account Frozen — Under Investigation</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Trading suspended pending risk review.</div></div>
      </div>}
      {isBreached && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>🚨</span><div><div style={{ fontWeight: 700, fontSize: 13, color: '#f87171' }}>Account Breached — Trading Locked</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Drawdown limit exceeded.</div></div>
      </div>}

      {account && <>
        {/* ── top info bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Account Size',   value: fmt(account.starting_balance) },
            { label: "Today's Profit", value: fmt(closedTrades.filter(t => t.closed_at?.startsWith(new Date().toISOString().split('T')[0])).reduce((s, t) => s + (t.net_pnl ?? 0), 0)) },
            { label: 'Start Date',     value: new Date(account.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            { label: 'Account Type',   value: accountTypeLabel(account.phase, prod?.challenge_type) },
          ].map(({ label, value }) => (
            <div key={label} style={{ ...s.card }}>
              <div style={s.label}>{label}</div>
              <div style={{ ...s.value, fontSize: 16, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── score + balance + equity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Score card */}
          <div style={{ ...s.card, background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2a4a 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={s.label}>Performance Score</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: '#22d3ee', fontFamily: "'Space Grotesk',monospace", lineHeight: 1.1, marginTop: 8 }}>
                  {stats ? (stats.profit_factor * 1.5).toFixed(2) : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Based on your trading stats</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <Gauge pct={stats?.win_rate_pct ?? 0} color="#4ade80" label="Win Rate" value={`${stats?.win_rate_pct ?? 0}%`} />
                <Gauge pct={Math.min((stats?.profit_factor ?? 0) / 3 * 100, 100)} color="#22d3ee" label="Prof. Factor" value={String(stats?.profit_factor ?? '—')} />
                <Gauge pct={isFunded ? 100 : Math.min((profitPct / targetPct) * 100, 100)} color="#a78bfa" label="Target" value={`${profitPct.toFixed(1)}%`} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Sparkline data={curve.map(c => c.balance)} color="#22d3ee" height={50} />
            </div>
          </div>

          {/* Balance + equity */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12 }}>
            <div style={{ ...s.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={s.label}>Balance</div>
                  <div style={{ ...s.value, marginTop: 4 }}>{fmt(account.balance)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: profit >= 0 ? '#4ade80' : '#f87171', fontFamily: "'Space Grotesk',monospace", fontWeight: 600 }}>
                    {profit >= 0 ? '+' : ''}{fmt(profit)} ({profitPct.toFixed(2)}%)
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Max: {fmt(account.starting_balance * 1.05)}</div>
                </div>
              </div>
            </div>
            <div style={{ ...s.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={s.label}>Equity</div>
                  <div style={{ ...s.value, marginTop: 4 }}>{fmt(account.equity || account.balance)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk',monospace" }}>
                    {fmt(withdrawable)} withdrawable
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Max: {fmt(account.starting_balance * 1.05)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Average Win',   value: fmt(stats?.avg_win ?? 0),   color: '#4ade80' },
            { label: 'Win Ratio',     value: `${stats?.win_rate_pct ?? 0}%`, color: '#22d3ee' },
            { label: 'Average Loss',  value: fmt(-(stats?.avg_loss ?? 0)), color: '#f87171' },
            { label: 'Profit Factor', value: String(stats?.profit_factor ?? '—'), color: '#a78bfa' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...s.card, textAlign: 'center' }}>
              <div style={s.label}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'Space Grotesk',monospace", marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── trading objectives ── */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#fff' }}>Trading Objectives</div>
          <ProgressBar
            label="Maximum Loss"
            used={account.max_dd_used ?? 0}
            max={maxLimit}
            color="#3b82f6"
            info={`Balance Threshold: ${fmt(account.starting_balance * (1 - maxLimit / 100))}`}
          />
          <ProgressBar
            label="Maximum Daily Loss"
            used={account.daily_dd_used ?? 0}
            max={dailyLimit}
            color="#3b82f6"
            info={`Resets daily`}
          />
          {!isFunded && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Profit Target ({targetPct}%)</span>
                <span style={{ fontSize: 10, color: '#22d3ee', fontFamily: "'Space Grotesk',monospace" }}>{profitPct.toFixed(2)}% / {targetPct}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((profitPct / targetPct) * 100, 100)}%`, background: 'linear-gradient(90deg,#22d3ee,#4ade80)', borderRadius: 6, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── calendar ── */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#fff' }}>Daily Summary</div>
          <TradeCalendar trades={closedTrades} />
        </div>

        {/* ── stats breakdown ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
          <div style={{ ...s.card }}>
            <div style={s.label}>Number of Days</div>
            <div style={{ ...s.value, marginTop: 6 }}>{tradingDays}</div>
          </div>
          <div style={{ ...s.card }}>
            <div style={s.label}>Total Trades Taken</div>
            <div style={{ ...s.value, marginTop: 6 }}>{stats?.total_trades ?? 0}</div>
          </div>
          <div style={{ ...s.card }}>
            <div style={s.label}>Total Lots Used</div>
            <div style={{ ...s.value, marginTop: 6 }}>{totalLots.toFixed(2)}</div>
          </div>
          <div style={{ ...s.card }}>
            <div style={s.label}>Biggest Win</div>
            <div style={{ ...s.value, fontSize: 18, color: '#4ade80', marginTop: 6 }}>{fmt(stats?.best_trade ?? 0)}</div>
          </div>
          <div style={{ ...s.card }}>
            <div style={s.label}>Biggest Loss</div>
            <div style={{ ...s.value, fontSize: 18, color: '#f87171', marginTop: 6 }}>{fmt(-(Math.abs(stats?.worst_trade ?? 0)))}</div>
          </div>
          <div style={{ ...s.card }}>
            <div style={s.label}>Total P&L</div>
            <div style={{ ...s.value, fontSize: 18, color: (stats?.total_pnl ?? 0) >= 0 ? '#4ade80' : '#f87171', marginTop: 6 }}>
              {(stats?.total_pnl ?? 0) >= 0 ? '+' : ''}{fmt(stats?.total_pnl ?? 0)}
            </div>
          </div>
        </div>

        {/* ── instrument breakdown ── */}
        {instrBreakdown.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ ...s.card }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: 'rgba(255,255,255,0.7)' }}>Instrument Profit Analysis</div>
              {instrBreakdown.map(({ sym, pnl, count }) => {
                const maxAbs = Math.max(...instrBreakdown.map(i => Math.abs(i.pnl)))
                return (
                  <div key={sym} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{sym}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pnl >= 0 ? '#4ade80' : '#f87171', fontFamily: "'Space Grotesk',monospace" }}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(Math.abs(pnl) / maxAbs) * 100}%`, background: pnl >= 0 ? '#4ade80' : '#f87171', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ ...s.card }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: 'rgba(255,255,255,0.7)' }}>Instrument Volume Analysis</div>
              {instrBreakdown.map(({ sym, count }) => {
                const maxCount = Math.max(...instrBreakdown.map(i => i.count))
                return (
                  <div key={sym} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{sym}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{count} trades</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: '#22d3ee', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── trade history table ── */}
        <div style={{ ...s.card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {(['history', 'open'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: activeTab === t ? '#22d3ee' : 'rgba(255,255,255,0.4)',
                borderBottom: activeTab === t ? '2px solid #22d3ee' : '2px solid transparent',
                marginBottom: -1,
              }}>
                {t === 'history' ? `Trading History (${closedTrades.length})` : `Open Positions (${openTrades.length})`}
              </button>
            ))}
            <button onClick={() => navigate('/platform')} style={{ marginLeft: 'auto', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ⚡ Open Platform
            </button>
          </div>

          {activeTab === 'history' ? (
            closedTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>No closed trades yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Symbol', 'Type', 'Open Date', 'Open', 'Closed Date', 'Closed', 'TP', 'SL', 'Lots', 'P&L'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.symbol}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: t.direction === 'buy' ? '#4ade80' : '#f87171', background: t.direction === 'buy' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                            {t.direction?.charAt(0).toUpperCase() + t.direction?.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk',monospace", fontSize: 10 }}>{t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace" }}>{(Number(t.open_price) || 0).toFixed(5)}</td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk',monospace", fontSize: 10 }}>{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace" }}>{(Number(t.close_price) || 0).toFixed(5)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace", color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{t.tp ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace", color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{t.sl ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace" }}>{t.lots}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace", fontWeight: 700, color: (t.net_pnl ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                          {(t.net_pnl ?? 0) >= 0 ? '+' : ''}{fmt(t.net_pnl ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            openTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>No open positions</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Symbol', 'Type', 'Open Date', 'Open Price', 'SL', 'TP', 'Lots'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.symbol}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: t.direction === 'buy' ? '#4ade80' : '#f87171', background: t.direction === 'buy' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                            {t.direction?.charAt(0).toUpperCase() + t.direction?.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk',monospace", fontSize: 10 }}>{new Date(t.opened_at).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace" }}>{(Number(t.open_price) || 0).toFixed(5)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace", color: '#f87171', fontSize: 10 }}>{t.sl ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace", color: '#4ade80', fontSize: 10 }}>{t.tp ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: "'Space Grotesk',monospace" }}>{t.lots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </>}
    </div>
  )

  /* ── dark wrapper — override DashboardLayout bg ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .tfd-dark-dash { background: #0d1117 !important; }
        .tfd-dark-dash .tfd-content { padding: 24px; }
      `}</style>
      <DashboardLayout
        title={`Welcome back, ${profile?.first_name ?? ''}!`}
        nav={TRADER_NAV}
        accentColor="gold"
        accountBox={account ? { id: account.account_number, label: accountTypeLabel(account.phase, prod?.challenge_type) } : undefined}
        topbarRight={
          <>
            <span className="w-[5px] h-[5px] rounded-full bg-[#22d3ee] animate-pulse" />
            <span style={{ fontSize: 9, color: '#22d3ee', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Live</span>
            <button onClick={() => navigate('/platform')} style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>⚡ Open Platform</button>
          </>
        }

      >
        <div style={{ background: '#0d1117', minHeight: '100%', padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {content}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
