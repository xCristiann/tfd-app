import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard, DrawdownBar } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { EquityCurve } from '@/components/charts/EquityCurve'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt, phaseLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { TRADER_NAV } from '@/lib/nav'
import type { TraderStats, DailySnapshot, Account } from '@/types/database'

export function DashboardPage() {
  const { accounts, loading } = useAccount()
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stats, setStats] = useState<TraderStats | null>(null)
  const [curve, setCurve] = useState<DailySnapshot[]>([])
  const [openTrades, setOpenTrades] = useState<any[]>([])

  // Resolve active account
  const account: Account | null = (selectedId ? accounts.find(a => a.id === selectedId) : null) ?? accounts[0] ?? null
  const prod = (account as any)?.challenge_products

  // Auto-select first account once loaded
  useEffect(() => {
    if (accounts.length > 0 && !selectedId) setSelectedId(accounts[0].id)
  }, [accounts.length])

  useEffect(() => {
    if (!account) return
    setStats(null); setCurve([]); setOpenTrades([])
    analyticsApi.getStats(account.id).then(setStats).catch(() => {})
    analyticsApi.getEquityCurve(account.id, 30).then(setCurve).catch(() => {})
    supabase.from('trades').select('*')
      .eq('account_id', account.id).eq('status', 'open')
      .order('opened_at', { ascending: false })
      .then(({ data }) => setOpenTrades(data ?? []))
  }, [account?.id])

  const profit     = account ? (account.balance - account.starting_balance) : 0
  const profitPct  = account && account.starting_balance > 0 ? ((profit / account.starting_balance) * 100).toFixed(2) : '0.00'
  const withdrawable = profit > 0 ? profit * ((prod?.funded_profit_split ?? 85) / 100) : 0
  const dailyLimit = prod?.ph1_daily_dd ?? 5
  const maxLimit   = prod?.ph1_max_dd   ?? 10
  const targetPct  = account?.phase === 'phase2' ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)

  return (
    <>
      <DashboardLayout
        title={`Welcome back, ${profile?.first_name ?? ''}!`}
        nav={TRADER_NAV} accentColor="gold"
        accountBox={account ? { id: account.account_number, label: `${phaseLabel(account.phase)} · ${prod?.funded_profit_split ?? 85}% Split` } : undefined}
        topbarRight={
          <>
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green)] animate-pulse" />
            <span className="text-[9px] text-[var(--green)] tracking-[1.5px] uppercase font-semibold">Live</span>
            <Button variant="gold" size="sm" onClick={() => navigate('/platform')}>⚡ Open Platform</Button>
          </>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <div className="text-[32px] mb-3">🎯</div>
              <div className="font-serif text-[18px] font-bold mb-2">No Active Account</div>
              <p className="text-[12px] text-[var(--text2)] mb-6">Purchase a challenge to start your funded trading journey.</p>
              <Button onClick={() => navigate('/dashboard/challenges')}>Buy a Challenge →</Button>
            </div>
          </Card>
        ) : (
          <>
            {/* ── Multi-account selector (only shown when >1 account) ── */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-3 p-3 bg-[var(--bg2)] border border-[var(--bdr)] mb-1">
                <span className="text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold whitespace-nowrap">Select Account</span>
                <div className="flex gap-2 flex-wrap">
                  {accounts.map(a => {
                    const ap = (a as any)?.challenge_products
                    const isActive = a.id === account?.id
                    return (
                      <button key={a.id} onClick={() => setSelectedId(a.id)}
                        className={`px-3 py-[5px] text-[10px] font-mono font-semibold cursor-pointer border transition-all ${
                          isActive
                            ? 'bg-[rgba(212,168,67,.12)] border-[var(--bdr2)] text-[var(--gold)]'
                            : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)] hover:text-[var(--text2)]'
                        }`}>
                        {a.account_number}
                        <span className={`ml-2 text-[8px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                          {phaseLabel(a.phase)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* KPI Row */}
            <div className="grid grid-cols-5 gap-[11px]">
              <KPICard label="Balance"       value={fmt(account!.balance)}  sub={`${profit >= 0 ? '+' : ''}${fmt(profit)}`}       subColor={profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'} />
              <KPICard label="Equity"        value={fmt(account!.equity)}   sub="Current equity"                                  subColor="text-[var(--text2)]" />
              <KPICard label="Withdrawable"  value={fmt(withdrawable)}      sub={`${prod?.funded_profit_split ?? 85}% split`}     subColor="text-[var(--gold)]" />
              <KPICard label="Win Rate"      value={stats ? `${stats.win_rate_pct ?? 0}%` : '—'}
                sub={stats ? `${stats.winning_trades}/${stats.total_trades} trades` : 'No trades yet'} subColor="text-[var(--green)]" />
              <KPICard label="Profit Factor" value={stats?.profit_factor ? String(stats.profit_factor) : '—'} sub="Target: 1.5+" subColor="text-[var(--green)]" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-[14px]">
              <Card>
                <CardHeader title="Equity Curve" action={<span className="text-[9px] text-[var(--text3)]">30 days</span>} />
                <EquityCurve data={curve.map(s => s.balance)} />
                {curve.length === 0 && <div className="text-center text-[11px] text-[var(--text3)] py-4">No trading history yet</div>}
              </Card>
              <Card>
                <CardHeader title="Risk Dashboard" />
                <DrawdownBar label="Daily Drawdown" value={account!.daily_dd_used ?? 0} max={dailyLimit} />
                <DrawdownBar label="Max Drawdown"   value={account!.max_dd_used   ?? 0} max={maxLimit} warn={60} danger={80} />
                <div className="mb-[11px]">
                  <div className="flex justify-between mb-[4px]">
                    <span className="text-[9px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold">Profit Progress</span>
                    <span className={`mono text-[11px] ${parseFloat(profitPct) >= targetPct ? 'text-[var(--green)]' : 'text-[var(--gold)]'}`}>
                      {profitPct}% / {targetPct}% target
                    </span>
                  </div>
                  <div className="h-[4px] bg-white/5 rounded-[2px] overflow-hidden">
                    <div className="h-full rounded-[2px] bg-[var(--green)] transition-all"
                      style={{ width: `${Math.min((parseFloat(profitPct) / targetPct) * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    ['Best Trade',   stats?.best_trade  != null ? fmt(stats.best_trade)  : '—', 'var(--green)'],
                    ['Worst Trade',  stats?.worst_trade != null ? fmt(stats.worst_trade) : '—', 'var(--red)'],
                    ['Total Trades', String(stats?.total_trades ?? 0),                           'var(--text)'],
                    ['Total P&L',    stats?.total_pnl   != null ? fmt(stats.total_pnl)   : '—', (stats?.total_pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)'],
                  ].map(([l, v, c]) => (
                    <div key={l} className="bg-[var(--bg3)] border border-[var(--dim)] p-[9px]">
                      <div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div>
                      <div className="mono text-[11px]" style={{ color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Open Positions */}
            <Card>
              <CardHeader title={`Open Positions (${openTrades.length})`}
                action={<Button variant="ghost" size="sm" onClick={() => navigate('/platform')}>Open Platform →</Button>} />
              {openTrades.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text3)]">No open positions</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--dim)]">
                      {['Symbol','Dir','Lots','Open Price','SL','TP','Opened'].map(h => (
                        <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(r => (
                      <tr key={r.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                        <td className="px-[11px] py-[8px] font-semibold">{r.symbol}</td>
                        <td className="px-[11px] py-[8px]"><span className={`text-[9px] font-bold ${r.direction==='buy'?'text-[var(--green)]':'text-[var(--red)]'}`}>{r.direction?.toUpperCase()}</span></td>
                        <td className="px-[11px] py-[8px] mono">{r.lots}</td>
                        <td className="px-[11px] py-[8px] mono">{r.open_price}</td>
                        <td className="px-[11px] py-[8px] mono text-[var(--red)]">{r.sl ?? '—'}</td>
                        <td className="px-[11px] py-[8px] mono text-[var(--green)]">{r.tp ?? '—'}</td>
                        <td className="px-[11px] py-[8px] mono text-[var(--text3)] text-[10px]">{new Date(r.opened_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <div className="flex items-center gap-2">
              <Badge variant={phaseVariant(account!.phase)}>{phaseLabel(account!.phase)}</Badge>
              <span className="text-[10px] text-[var(--text3)]">{account!.account_number}</span>
            </div>
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
