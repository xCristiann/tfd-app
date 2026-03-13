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

  const account: Account | null = (selectedId ? accounts.find(a => a.id === selectedId) : null) ?? accounts[0] ?? null
  const prod = (account as any)?.challenge_products

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

  useEffect(() => {
    if (!account || !prod) return
    if (account.phase === 'phase1' || account.phase === 'phase2') {
      checkRuleViolations(account, prod)
    }
  }, [account?.balance, account?.daily_dd_used, account?.max_dd_used])

  async function checkRuleViolations(acc: Account, product: any) {
    if (!product) return
    const dailyLimit = acc.phase === 'phase2' ? (product.ph2_daily_dd ?? product.ph1_daily_dd ?? 5) : (product.ph1_daily_dd ?? 5)
    const maxLimit   = acc.phase === 'phase2' ? (product.ph2_max_dd ?? product.ph1_max_dd ?? 10) : (product.ph1_max_dd ?? 10)
    const targetPct  = acc.phase === 'phase2' ? (product.ph2_profit_target ?? 5) : (product.ph1_profit_target ?? 8)
    const profitPct  = acc.starting_balance > 0 ? ((acc.balance - acc.starting_balance) / acc.starting_balance) * 100 : 0

    // Breach: daily or max DD exceeded
    if ((acc.daily_dd_used ?? 0) >= dailyLimit || (acc.max_dd_used ?? 0) >= maxLimit) {
      if (acc.status !== 'breached') {
        await supabase.from('accounts').update({ status: 'breached', phase: 'breached' }).eq('id', acc.id)
        await supabase.from('notifications').insert([
          {
            user_id: profile?.id,
            type: 'breach',
            title: 'Account Breached',
            body: `Account ${acc.account_number} has been breached due to drawdown limits being exceeded.`,
            is_read: false,
          },
          {
            user_id: null,
            type: 'admin_breach',
            title: `Account Breached — ${acc.account_number}`,
            body: `${profile?.first_name} ${profile?.last_name} breached account ${acc.account_number}. Daily DD: ${acc.daily_dd_used}% / Max DD: ${acc.max_dd_used}%.`,
            is_read: false,
          }
        ]).then(() => {})
        toast('error', '🚨', 'Account Breached', 'Your drawdown limit was exceeded. Account locked.')
      }
      return
    }

    // Target reached: lock account and notify admin
    if (profitPct >= targetPct && acc.status === 'active') {
      await supabase.from('accounts').update({ status: 'passed' }).eq('id', acc.id)
      // Notify admin
      await supabase.from('notifications').insert([
        {
          user_id: profile?.id,
          type: 'target_reached',
          title: 'Profit Target Reached!',
          body: `Account ${acc.account_number} has reached the ${targetPct}% profit target. Awaiting admin review.`,
          is_read: false,
        },
        // Admin notification — we store with a special marker
        {
          user_id: null, // admin sentinel
          type: 'admin_target_reached',
          title: `Trader Target Reached — ${acc.account_number}`,
          body: `${profile?.first_name} ${profile?.last_name} reached ${profitPct.toFixed(2)}% on ${acc.account_number}. Review and advance phase.`,
          is_read: false,
        }
      ]).then(() => {})
      toast('success', '🎯', 'Target Reached!', 'Profit target hit! Account locked pending admin review.')
    }
  }

  const profit     = account ? (account.balance - account.starting_balance) : 0
  const profitPct  = account && account.starting_balance > 0 ? ((profit / account.starting_balance) * 100).toFixed(2) : '0.00'
  const withdrawable = profit > 0 ? profit * ((prod?.funded_profit_split ?? 85) / 100) : 0
  const dailyLimit = prod?.ph1_daily_dd ?? 5
  const maxLimit   = prod?.ph1_max_dd   ?? 10
  const targetPct  = account?.phase === 'phase2' ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)
  const isFunded   = account?.phase === 'funded'
  const isLocked    = account?.status === 'breached' || account?.status === 'passed' || account?.status === 'suspended'
  const isWarning   = account?.status === 'soft_locked'

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
            {/* Account selector */}
            <div className="flex items-center gap-3 p-3 bg-[var(--bg2)] border border-[var(--bdr)] mb-1">
              <span className="text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold whitespace-nowrap">Select Account</span>
              <div className="flex gap-2 flex-wrap">
                {accounts.map(a => {
                  const isActive = a.id === account?.id
                  return (
                    <button key={a.id} onClick={() => setSelectedId(a.id)}
                      className={`px-3 py-[5px] text-[10px] font-mono font-semibold cursor-pointer border transition-all ${
                        isActive
                          ? 'bg-[rgba(212,168,67,.12)] border-[var(--bdr2)] text-[var(--gold)]'
                          : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)] hover:text-[var(--text2)]'
                      }`}>
                      {a.account_number}
                      <span className={`ml-2 text-[8px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>{phaseLabel(a.phase)}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => navigate('/dashboard/challenges')}
                className="ml-auto text-[8px] tracking-[1px] uppercase text-[var(--text3)] hover:text-[var(--gold)] cursor-pointer bg-transparent border-none transition-colors whitespace-nowrap">
                + New Challenge
              </button>
            </div>

            {/* Warning banner — soft locked */}
            {isWarning && (
              <div className="flex items-center gap-3 px-5 py-3 border border-[rgba(255,180,0,.3)] bg-[rgba(255,180,0,.06)] text-[#ffb400]">
                <span className="text-[16px]">⚠️</span>
                <div>
                  <div className="font-semibold text-[12px]">Drawdown Warning — Soft Locked</div>
                  <div className="text-[10px] opacity-80">Your account is approaching drawdown limits. Risk management has flagged this account. Reduce exposure immediately.</div>
                </div>
              </div>
            )}

            {/* Locked banner */}
            {isLocked && (
              <div className={`flex items-center gap-3 px-5 py-3 border ${
                account?.status === 'breached'
                  ? 'border-[rgba(255,51,82,.3)] bg-[rgba(255,51,82,.06)] text-[var(--red)]'
                  : account?.status === 'suspended'
                  ? 'border-[rgba(255,51,82,.3)] bg-[rgba(255,51,82,.06)] text-[var(--red)]'
                  : 'border-[rgba(212,168,67,.3)] bg-[rgba(212,168,67,.06)] text-[var(--gold)]'
              }`}>
                <span className="text-[16px]">
                  {account?.status === 'breached' ? '🚨' : account?.status === 'suspended' ? '⛔' : '🎯'}
                </span>
                <div>
                  <div className="font-semibold text-[12px]">
                    {account?.status === 'breached'
                      ? 'Account Breached — Trading Locked'
                      : account?.status === 'suspended'
                      ? 'Account Suspended by Risk Management'
                      : 'Profit Target Reached — Pending Admin Review'}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {account?.status === 'breached'
                      ? 'Your drawdown limit was exceeded. This account can no longer trade.'
                      : account?.status === 'suspended'
                      ? 'This account has been suspended. Please contact support for details.'
                      : 'Congratulations! Your account is locked while admin reviews and advances you to the next phase.'
                    }
                  </div>
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

                {/* Profit target — only for phase1/phase2 */}
                {!isFunded && (
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
                )}

                {/* Funded: no target, show profit */}
                {isFunded && (
                  <div className="mb-[11px] p-3 bg-[rgba(212,168,67,.05)] border border-[rgba(212,168,67,.15)]">
                    <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--gold)] font-semibold mb-1">Funded Account — No Target</div>
                    <div className="text-[11px] text-[var(--text2)]">
                      Keep drawdown in check and request payouts anytime.
                      Withdrawable: <span className="text-[var(--gold)] font-mono">{fmt(withdrawable)}</span>
                    </div>
                  </div>
                )}

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
