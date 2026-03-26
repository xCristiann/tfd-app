import { useEffect, useState, useMemo } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt, accountTypeLabel, accountBadgeLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { TRADER_NAV } from '@/lib/nav'
import type { TraderStats, DailySnapshot, Account } from '@/types/database'

/* ─────────────────────────────────────────
   DESIGN TOKENS (dark theme)
───────────────────────────────────────── */
const C = {
  bg:       '#0d1117',
  card:     '#161b22',
  cardBrd:  'rgba(255,255,255,0.08)',
  cardHov:  '#1c2130',
  text:     '#e6edf3',
  muted:    'rgba(230,237,243,0.45)',
  dim:      'rgba(230,237,243,0.25)',
  green:    '#3fb950',
  red:      '#f85149',
  cyan:     '#79c0ff',
  purple:   '#bc8cff',
  accent:   '#58a6ff',
}

/* ─────────────────────────────────────────
   SPARKLINE
───────────────────────────────────────── */
function Sparkline({ data, color = C.cyan }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div style={{ height: 48 }} />
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const W = 300, H = 48
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
  const area = `${pts.join(' ')} ${W},${H} 0,${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spk)" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────
   DONUT GAUGE
───────────────────────────────────────── */
function Gauge({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  const r = 30, circ = 2 * Math.PI * r
  const fill = Math.min(Math.max(pct, 0), 100) / 100 * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 76, height: 76 }}>
        <svg viewBox="0 0 68 68" width={76} height={76}>
          <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 34 34)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────
   PROGRESS BAR OBJECTIVE
───────────────────────────────────────── */
function Objective({ label, usedPct, max, threshold, info, failed }: {
  label: string; usedPct: number; max: number; threshold: number; info?: string; failed?: boolean
}) {
  const pct = Math.min(usedPct, 100)
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{label}</span>
          {info && <span style={{ fontSize: 9, color: C.dim }}>({info})</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {failed && <span style={{ fontSize: 9, fontWeight: 700, color: C.red, background: 'rgba(248,81,73,0.15)', padding: '2px 7px', borderRadius: 4 }}>Failed</span>}
          <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>Remaining: {fmt(Math.max(threshold - (max * usedPct / 100), 0))}</span>
        </div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: failed ? C.red : C.accent, borderRadius: 6, transition: 'width 0.9s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: C.dim }}>$0</span>
        <span style={{ fontSize: 9, color: C.dim, fontFamily: 'monospace' }}>Balance Threshold: {fmt(threshold)}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   TRADE CALENDAR
───────────────────────────────────────── */
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

  // Build weeks for summary
  const weeksData = useMemo(() => {
    const result: { start: Date; end: Date; pnl: number; tradeDays: number }[] = []
    let d = 1
    while (d <= daysInMonth) {
      const start = new Date(year, mon, d)
      const endDay = Math.min(d + 6, daysInMonth)
      const end = new Date(year, mon, endDay)
      let pnl = 0, tradeDays = 0
      for (let i = d; i <= endDay; i++) {
        const key = `${year}-${String(mon + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        if (dayMap[key]) { pnl += dayMap[key].pnl; tradeDays++ }
      }
      result.push({ start, end, pnl, tradeDays })
      d += 7
    }
    return result
  }, [dayMap, year, mon, daysInMonth])

  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      {/* controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={() => setMonth(new Date(year, mon - 1))}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: C.text, width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, minWidth: 140 }}>{monthName}</span>
        <button onClick={() => setMonth(new Date(year, mon + 1))}
          style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: C.text, width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>›</button>
        <button onClick={() => setMonth(new Date())}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: C.muted, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}>Today</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        {/* calendar grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, color: C.dim, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e${i}`} style={{ height: 64, borderRadius: 6 }} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const key = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const data = dayMap[key]
              const isToday = new Date().toDateString() === new Date(year, mon, day).toDateString()
              const isProfit = data && data.pnl > 0
              const isLoss = data && data.pnl < 0
              return (
                <div key={day} style={{
                  height: 64, borderRadius: 6, padding: '6px 7px',
                  background: isToday ? 'rgba(88,166,255,0.12)' : isProfit ? 'rgba(63,185,80,0.1)' : isLoss ? 'rgba(248,81,73,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isToday ? 'rgba(88,166,255,0.4)' : isProfit ? 'rgba(63,185,80,0.2)' : isLoss ? 'rgba(248,81,73,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 10, color: isToday ? C.accent : C.muted, fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {data && (
                    <div>
                      <div style={{ fontSize: 8, color: C.dim }}>{data.count} trade{data.count !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isProfit ? C.green : C.red, fontFamily: 'monospace' }}>
                        {isProfit ? '+' : ''}{fmt(data.pnl)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* weekly summary */}
        <div>
          <div style={{ fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Weekly Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weeksData.map((w, i) => {
              const wLabel = `${w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${w.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>Week {i + 1}</span>
                    <span style={{ fontSize: 9, color: C.dim }}>{wLabel}</span>
                  </div>
                  {w.tradeDays === 0 ? (
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>No trades</div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: w.pnl >= 0 ? C.green : C.red, fontFamily: 'monospace' }}>
                        {w.pnl >= 0 ? '+' : ''}{fmt(w.pnl)}
                      </span>
                      <span style={{ fontSize: 9, color: C.dim }}>Days: {w.tradeDays}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
export function DashboardPage() {
  const { accounts, loading } = useAccount()
  const { profile } = useAuth()
  const { toasts, dismiss } = useToast()
  const navigate = useNavigate()

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

  /* derived values */
  const profit     = account ? account.balance - account.starting_balance : 0
  const profitPct  = account?.starting_balance ? (profit / account.starting_balance) * 100 : 0
  const withdrawable = profit > 0 ? profit * ((prod?.funded_profit_split ?? 85) / 100) : 0
  const isFunded   = account?.phase === 'funded'
  const isBreached = account?.status === 'breached'
  const isFrozen   = account?.status === 'soft_locked'
  const dailyPct   = account?.starting_balance ? ((account.daily_dd_used ?? 0) / 100) * account.starting_balance : 0
  const maxPct     = account?.starting_balance ? ((account.max_dd_used ?? 0) / 100) * account.starting_balance : 0
  const dailyLimit = prod?.ph1_daily_dd ?? 5
  const maxLimit   = prod?.ph1_max_dd ?? 10
  const targetPct  = account?.phase === 'phase2' ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)
  const score      = stats ? +(stats.profit_factor * 1.5).toFixed(2) : 0

  const todayKey   = new Date().toISOString().split('T')[0]
  const todayPnl   = closedTrades.filter(t => t.closed_at?.startsWith(todayKey)).reduce((s, t) => s + (t.net_pnl ?? 0), 0)
  const tradingDays = useMemo(() => new Set(closedTrades.map(t => t.closed_at?.split('T')[0]).filter(Boolean)).size, [closedTrades])
  const totalLots  = useMemo(() => closedTrades.reduce((s, t) => s + (t.lots ?? 0), 0), [closedTrades])

  const instrBreakdown = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {}
    closedTrades.forEach(t => {
      if (!m[t.symbol]) m[t.symbol] = { pnl: 0, count: 0 }
      m[t.symbol].pnl += t.net_pnl ?? 0
      m[t.symbol].count++
    })
    return Object.entries(m).map(([sym, v]) => ({ sym, ...v })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 6)
  }, [closedTrades])

  /* styles */
  const card = {
    background: C.card,
    border: `1px solid ${C.cardBrd}`,
    borderRadius: 10,
    padding: 20,
  } as React.CSSProperties

  const label = { fontSize: 10, color: C.dim, textTransform: 'uppercase' as const, letterSpacing: '0.7px', fontWeight: 500, marginBottom: 4 }
  const bigVal = { fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'monospace' as const }

  const content = loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  ) : accounts.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>No Active Account</div>
      <p style={{ color: C.muted, marginBottom: 24 }}>Purchase a challenge to start your funded journey.</p>
      <button onClick={() => navigate('/dashboard/challenges')} style={{ background: C.accent, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Buy a Challenge →</button>
    </div>
  ) : (
    <>
      {/* ── account selector ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {accounts.map(a => {
          const isAct = a.id === account?.id
          return (
            <button key={a.id} onClick={() => setSelectedId(a.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${isAct ? 'rgba(88,166,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: isAct ? 'rgba(88,166,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: isAct ? C.accent : C.muted,
            }}>
              #{(a as any).account_number} · {accountBadgeLabel(a.phase, (a as any).challenge_products?.challenge_type)}
              {(a as any).status === 'soft_locked' && <span style={{ marginLeft: 6, fontSize: 9, color: C.red }}>🔒</span>}
            </button>
          )
        })}
        <button onClick={() => navigate('/dashboard/challenges')} style={{ marginLeft: 'auto', background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', color: C.accent, padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>+ New Challenge</button>
      </div>

      {/* ── status banners ── */}
      {isFrozen && (
        <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🔒</span>
          <div><div style={{ fontWeight: 700, fontSize: 13, color: C.red }}>Account Frozen — Under Investigation</div>
            <div style={{ fontSize: 11, color: C.muted }}>Trading suspended pending risk review. Contact risk@thefundeddiaries.com</div></div>
        </div>
      )}
      {isBreached && (
        <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🚨</span>
          <div><div style={{ fontWeight: 700, fontSize: 13, color: C.red }}>Account Breached — Trading Locked</div>
            <div style={{ fontSize: 11, color: C.muted }}>Drawdown limit exceeded. Your account has been locked.</div></div>
        </div>
      )}

      {account && <>
        {/* ── top info cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Account Size',    value: fmt(account.starting_balance) },
            { label: "Today's Profit",  value: fmt(todayPnl), color: todayPnl >= 0 ? C.green : C.red },
            { label: 'Start Date',      value: new Date(account.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            { label: 'Account Type',    value: accountTypeLabel(account.phase, prod?.challenge_type) },
          ].map(({ label: l, value, color }) => (
            <div key={l} style={card}>
              <div style={label}>{l}</div>
              <div style={{ ...bigVal, fontSize: 18, color: color ?? C.text }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── score + balance/equity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Score */}
          <div style={{ ...card, background: 'linear-gradient(135deg, #0d2137 0%, #0d1a2e 100%)' }}>
            <div style={label}>Performance Score</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 52, fontWeight: 800, color: C.cyan, fontFamily: 'monospace', lineHeight: 1.1, marginTop: 8 }}>
                  {score || '—'}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Based on your trading stats</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Gauge pct={stats?.win_rate_pct ?? 0} color={C.green} label="Win Rate" value={`${stats?.win_rate_pct ?? 0}%`} />
                <Gauge pct={Math.min((stats?.profit_factor ?? 0) / 3 * 100, 100)} color={C.cyan} label="Prof. Factor" value={String(stats?.profit_factor ?? '—')} />
                <Gauge pct={isFunded ? 100 : Math.min((profitPct / targetPct) * 100, 100)} color={C.purple} label="Target" value={`${profitPct.toFixed(1)}%`} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline data={curve.map(c => c.balance)} color={C.cyan} />
            </div>
          </div>

          {/* Balance + Equity */}
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12 }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={label}>Balance</div>
                  <div style={{ ...bigVal }}>{fmt(account.balance)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: profit >= 0 ? C.green : C.red, fontFamily: 'monospace' }}>
                    {profit >= 0 ? '+' : ''}{fmt(profit)} ({profitPct.toFixed(2)}%)
                  </div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>Max: {fmt(account.starting_balance * 1.1)}</div>
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                <div>
                  <div style={label}>Equity</div>
                  <div style={{ ...bigVal }}>{fmt(account.equity || account.balance)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>{fmt(withdrawable)} withdrawable</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>Max: {fmt(account.starting_balance * 1.1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Average Win',    value: fmt(stats?.avg_win ?? 0),              color: C.green   },
            { label: 'Win Ratio',      value: `${stats?.win_rate_pct ?? 0}%`,        color: C.cyan    },
            { label: 'Average Loss',   value: fmt(-(stats?.avg_loss ?? 0)),           color: C.red     },
            { label: 'Profit Factor',  value: String(stats?.profit_factor ?? '—'),   color: C.purple  },
          ].map(({ label: l, value, color }) => (
            <div key={l} style={{ ...card, textAlign: 'center' }}>
              <div style={label}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'monospace', marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── trading objectives ── */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 18 }}>Trading Objectives</div>
          <Objective
            label="Maximum Loss"
            usedPct={account.max_dd_used ?? 0}
            max={account.starting_balance}
            threshold={account.starting_balance * (1 - maxLimit / 100)}
            info={`Balance Threshold: ${fmt(account.starting_balance * (1 - maxLimit / 100))}`}
            failed={(account.max_dd_used ?? 0) >= maxLimit}
          />
          <Objective
            label="Maximum Daily Loss"
            usedPct={account.daily_dd_used ?? 0}
            max={account.starting_balance}
            threshold={account.starting_balance * (1 - dailyLimit / 100)}
            info="Resets daily"
            failed={(account.daily_dd_used ?? 0) >= dailyLimit}
          />
          {!isFunded && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>Profit Target ({targetPct}%)</span>
                <span style={{ fontSize: 10, color: C.cyan, fontFamily: 'monospace' }}>{profitPct.toFixed(2)}% / {targetPct}%</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((profitPct / targetPct) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`, borderRadius: 6, transition: 'width 0.9s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── daily summary calendar ── */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Daily Summary</div>
          <TradeCalendar trades={closedTrades} />
        </div>

        {/* ── 6 stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Number of Days',      value: String(tradingDays),                              color: C.text    },
            { label: 'Total Trades Taken',  value: String(stats?.total_trades ?? 0),                 color: C.text    },
            { label: 'Total Lots Used',     value: totalLots.toFixed(2),                             color: C.text    },
            { label: 'Biggest Win',         value: fmt(stats?.best_trade ?? 0),                      color: C.green   },
            { label: 'Biggest Loss',        value: fmt(-(Math.abs(stats?.worst_trade ?? 0))),         color: C.red     },
            { label: 'Total P&L',           value: `${(stats?.total_pnl ?? 0) >= 0 ? '+' : ''}${fmt(stats?.total_pnl ?? 0)}`,  color: (stats?.total_pnl ?? 0) >= 0 ? C.green : C.red },
          ].map(({ label: l, value, color }) => (
            <div key={l} style={card}>
              <div style={label}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'monospace', marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── instrument breakdown ── */}
        {instrBreakdown.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 16 }}>Instrument Profit Analysis</div>
              {instrBreakdown.map(({ sym, pnl, count }) => {
                const maxAbs = Math.max(...instrBreakdown.map(i => Math.abs(i.pnl)), 1)
                return (
                  <div key={sym} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{sym}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pnl >= 0 ? C.green : C.red, fontFamily: 'monospace' }}>
                        {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(Math.abs(pnl) / maxAbs) * 100}%`, background: pnl >= 0 ? C.green : C.red, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 16 }}>Instrument Volume Analysis</div>
              {instrBreakdown.map(({ sym, count }) => {
                const maxCount = Math.max(...instrBreakdown.map(i => i.count), 1)
                return (
                  <div key={sym} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{sym}</span>
                      <span style={{ fontSize: 11, color: C.dim }}>{count} trades</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: C.cyan, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── trade history / open positions ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 0, borderBottom: `1px solid ${C.cardBrd}` }}>
            {(['history', 'open'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: activeTab === t ? C.accent : C.dim,
                borderBottom: activeTab === t ? `2px solid ${C.accent}` : '2px solid transparent',
                marginBottom: -1,
              }}>
                {t === 'history' ? `Trading History (${closedTrades.length})` : `Open Positions (${openTrades.length})`}
              </button>
            ))}
            <button onClick={() => navigate('/platform')} style={{ marginLeft: 'auto', background: 'rgba(88,166,255,0.1)', border: `1px solid rgba(88,166,255,0.3)`, color: C.accent, padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 2 }}>
              ⚡ Open Platform
            </button>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            {activeTab === 'history' ? (
              closedTrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.dim }}>No closed trades yet</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Symbol', 'Type', 'Open Date', 'Open', 'Closed Date', 'Closed', 'TP', 'SL', 'Lots', 'Commission', 'P&L'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px', color: C.dim, borderBottom: `1px solid ${C.cardBrd}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map(t => (
                      <tr key={t.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: C.text }}>{t.symbol}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: t.direction === 'buy' ? C.green : C.red, background: t.direction === 'buy' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                            {t.direction === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: C.dim, fontFamily: 'monospace', fontSize: 10 }}>{t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.muted }}>{(Number(t.open_price) || 0).toFixed(5)}</td>
                        <td style={{ padding: '10px 12px', color: C.dim, fontFamily: 'monospace', fontSize: 10 }}>{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.muted }}>{(Number(t.close_price) || 0).toFixed(5)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.dim, fontSize: 10 }}>{t.tp ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.dim, fontSize: 10 }}>{t.sl ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.muted }}>{t.lots}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.dim }}>{fmt(t.commission ?? 0)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: (t.net_pnl ?? 0) >= 0 ? C.green : C.red }}>
                          {(t.net_pnl ?? 0) >= 0 ? '+' : ''}{fmt(t.net_pnl ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              openTrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.dim }}>No open positions</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Symbol', 'Type', 'Open Date', 'Open Price', 'SL', 'TP', 'Lots'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px', color: C.dim, borderBottom: `1px solid ${C.cardBrd}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(t => (
                      <tr key={t.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: C.text }}>{t.symbol}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: t.direction === 'buy' ? C.green : C.red, background: t.direction === 'buy' ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                            {t.direction === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: C.dim, fontFamily: 'monospace', fontSize: 10 }}>{new Date(t.opened_at).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.muted }}>{(Number(t.open_price) || 0).toFixed(5)}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.red, fontSize: 10 }}>{t.sl ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.green, fontSize: 10 }}>{t.tp ?? '—'}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: C.muted }}>{t.lots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </>}
    </>
  )

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .tfd-dash-main { background: #0d1117 !important; }
      `}</style>
      <DashboardLayout
        title={`Welcome back, ${profile?.first_name ?? ''}!`}
        nav={TRADER_NAV}
        accentColor="gold"
        accountBox={account ? { id: account.account_number, label: accountTypeLabel(account.phase, prod?.challenge_type) } : undefined}
        topbarRight={
          <>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3fb950', display: 'inline-block', animation: 'spin 3s linear infinite' }} />
            <span style={{ fontSize: 9, color: '#3fb950', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Live</span>
            <button onClick={() => navigate('/platform')} style={{ background: 'linear-gradient(135deg,#58a6ff,#3fb950)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>⚡ Open Platform</button>
          </>
        }
      >
        {/* Override background via inline style on wrapper */}
        <div style={{ background: C.bg, minHeight: '100%', margin: '-20px', padding: '24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {content}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={[]} dismiss={dismiss} />
    </>
  )
}
