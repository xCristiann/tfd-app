import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { phaseLabel, fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'
import { sendEmail } from '@/lib/email'

function duration(open: string, close: string | null): string {
  if (!close) return '—'
  const ms = new Date(close).getTime() - new Date(open).getTime()
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60)
  const h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m ${s % 60}s`
}

/* ── Risk detection engine ─────────────────────────────────────── */
interface RiskAlert {
  level: 'critical' | 'warning' | 'info'
  category: string
  message: string
  detail?: string
  trades?: any[]
}

function detectRiskAlerts(trades: any[], account: any): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const closed = trades.filter(t => t.status === 'closed')
  const open   = trades.filter(t => t.status === 'open')

  /* 1. Same IP across multiple accounts — detected from trades.ip_address */
  const ipMap: Record<string, string[]> = {}
  trades.forEach(t => {
    if (!t.ip_address) return
    const ip = t.ip_address
    if (!ipMap[ip]) ipMap[ip] = []
    if (!ipMap[ip].includes(t.account_id)) ipMap[ip].push(t.account_id)
  })
  Object.entries(ipMap).forEach(([ip, accs]) => {
    if (accs.length > 1) {
      alerts.push({
        level: 'critical',
        category: 'Same IP Multiple Accounts',
        message: `IP ${ip} used on ${accs.length} accounts`,
        detail: `This IP address appears on accounts: ${accs.join(', ')}`,
      })
    }
  })

  /* 2. Reverse / inverse trading — BUY then immediately SELL same symbol same size */
  const bySymbol: Record<string, any[]> = {}
  closed.forEach(t => {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = []
    bySymbol[t.symbol].push(t)
  })
  Object.entries(bySymbol).forEach(([sym, ts]) => {
    const sorted = [...ts].sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime())
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1]
      if (a.direction !== b.direction && Math.abs(a.lots - b.lots) < 0.01) {
        const diff = Math.abs(new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
        if (diff < 10000) { // opened within 10 seconds
          alerts.push({
            level: 'warning',
            category: 'Inverse Trading Pattern',
            message: `${sym}: BUY/SELL pair opened <10s apart`,
            detail: `${a.direction.toUpperCase()} & ${b.direction.toUpperCase()} ${a.lots} lots at ${new Date(a.opened_at).toLocaleTimeString()}`,
            trades: [a, b],
          })
          break
        }
      }
    }
  })

  /* 3. High frequency trading — more than 20 trades in 1 hour */
  if (closed.length > 0) {
    const timeWindows: Record<string, number> = {}
    closed.forEach(t => {
      const hour = new Date(t.opened_at).toISOString().slice(0, 13) // YYYY-MM-DDTHH
      timeWindows[hour] = (timeWindows[hour] || 0) + 1
    })
    const maxInHour = Math.max(...Object.values(timeWindows))
    if (maxInHour >= 20) {
      const peakHour = Object.entries(timeWindows).find(([, v]) => v === maxInHour)?.[0]
      alerts.push({
        level: 'warning',
        category: 'High Frequency Trading',
        message: `${maxInHour} trades in a single hour`,
        detail: `Peak hour: ${peakHour ? new Date(peakHour).toLocaleString() : '—'}`,
      })
    }
  }

  /* 4. News sniping — trades opened & closed in under 2 minutes with large profit */
  const snipers = closed.filter(t => {
    if (!t.closed_at || !t.opened_at) return false
    const ms = new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()
    return ms < 120_000 && (t.net_pnl ?? 0) > 200
  })
  if (snipers.length >= 3) {
    alerts.push({
      level: 'warning',
      category: 'Potential News Sniping',
      message: `${snipers.length} trades < 2min with profit > $200`,
      detail: 'Quick profitable trades may indicate news event exploitation',
      trades: snipers.slice(0, 5),
    })
  }

  /* 5. Copy trading — identical trade times across multiple trades */
  const openTimes = closed.map(t => new Date(t.opened_at).getTime())
  const duplicateTimes = openTimes.filter((t, i) =>
    openTimes.some((t2, j) => j !== i && Math.abs(t - t2) < 2000)
  )
  if (duplicateTimes.length >= 4) {
    alerts.push({
      level: 'warning',
      category: 'Possible Copy Trading',
      message: `${duplicateTimes.length} trades opened within 2s of another trade`,
      detail: 'Simultaneous trade openings may indicate copy trading activity',
    })
  }

  /* 6. Drawdown thresholds */
  const ddUsed = account.max_dd_used ?? 0
  const dailyDdUsed = account.daily_dd_used ?? 0
  if (ddUsed >= 8) alerts.push({ level: 'critical', category: 'Max Drawdown Critical', message: `Max DD at ${ddUsed.toFixed(2)}% — approaching breach`, detail: 'Account is at risk of automatic breach' })
  else if (ddUsed >= 5) alerts.push({ level: 'warning', category: 'Max Drawdown Warning', message: `Max DD at ${ddUsed.toFixed(2)}%`, detail: 'Monitor closely' })
  if (dailyDdUsed >= 4) alerts.push({ level: 'critical', category: 'Daily Drawdown Critical', message: `Daily DD at ${dailyDdUsed.toFixed(2)}%`, detail: 'May breach daily limit today' })

  /* 7. Single large losing trade */
  const worstTrade = closed.reduce((w, t) => (t.net_pnl ?? 0) < (w?.net_pnl ?? 0) ? t : w, null as any)
  if (worstTrade && account.starting_balance > 0) {
    const lossRatio = Math.abs(worstTrade.net_pnl ?? 0) / account.starting_balance * 100
    if (lossRatio >= 3) {
      alerts.push({
        level: 'critical',
        category: 'Large Single Loss',
        message: `Single trade lost ${lossRatio.toFixed(2)}% of account`,
        detail: `${worstTrade.symbol} ${worstTrade.direction?.toUpperCase()} ${worstTrade.lots} lots — Loss: $${Math.abs(worstTrade.net_pnl ?? 0).toFixed(2)}`,
        trades: [worstTrade],
      })
    }
  }

  /* 8. Unique IPs — suspicious number of different IPs */
  const uniqueIPs = new Set(trades.map(t => t.ip_address).filter(Boolean))
  if (uniqueIPs.size >= 4) {
    alerts.push({
      level: 'info',
      category: 'Multiple IPs',
      message: `Traded from ${uniqueIPs.size} different IP addresses`,
      detail: Array.from(uniqueIPs).join(', '),
    })
  }

  return alerts
}

/* ── Alert badge ───────────────────────────────────────────────── */
function AlertBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: 'rgba(220,38,38,.1)', text: '#DC2626', label: 'CRITICAL' },
    warning:  { bg: 'rgba(245,158,11,.1)', text: '#D97706', label: 'WARNING' },
    info:     { bg: 'rgba(34,85,204,.1)',  text: '#2255CC', label: 'INFO' },
  }
  const s = map[level] ?? map.info
  return (
    <span style={{ background: s.bg, color: s.text, padding: '2px 7px', borderRadius: 4, fontSize: 8, fontWeight: 700, letterSpacing: '0.8px' }}>
      {s.label}
    </span>
  )
}

export function AdminAccountsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [accounts, setAccounts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')

  const [selected, setSelected]   = useState<any>(null)
  const [panelTab, setPanelTab]   = useState<'trades'|'risk'|'breach'|'notify'>('trades')
  const [trades, setTrades]       = useState<any[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)

  const [notifyMsg, setNotifyMsg] = useState('')
  const [notifying, setNotifying] = useState(false)

  useEffect(() => {
    supabase.from('accounts')
      .select('*, users(id, first_name, last_name, email), challenge_products(name, account_size)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAccounts(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const openAccount = useCallback(async (acc: any) => {
    setSelected(acc)
    setPanelTab('trades')
    setTrades([])
    setTradesLoading(true)
    const { data } = await supabase
      .from('trades').select('*').eq('account_id', acc.id)
      .order('opened_at', { ascending: false })
    setTrades(data ?? [])
    setTradesLoading(false)
  }, [])

  async function breachAccount() {
    if (!selected) return
    if (!confirm(`Breach account ${selected.account_number}? This cannot be undone.`)) return
    await supabase.from('accounts').update({ status: 'breached', phase: 'breached' }).eq('id', selected.id)
    setAccounts(prev => prev.map(a => a.id === selected.id ? { ...a, status: 'breached', phase: 'breached' } : a))
    setSelected((s: any) => ({ ...s, status: 'breached', phase: 'breached' }))
    try {
      if (selected.users?.email) {
        await sendEmail('account_breached', selected.users.email, {
          first_name: selected.users.first_name ?? 'Trader',
          account_number: selected.account_number,
          reason: 'Account breached by risk management.',
          balance: `$${Number(selected.balance).toLocaleString()}`,
        })
      }
    } catch {}
    await supabase.from('notifications').insert({
      user_id: selected.users?.id, type: 'breach',
      title: 'Account Breached',
      body: `Your account ${selected.account_number} has been breached by risk management.`,
      is_read: false,
    })
    toast('warning', '⛔', 'Breached', `${selected.account_number} marked as breached.`)
  }

  async function sendNotification() {
    if (!selected || !notifyMsg.trim()) return
    setNotifying(true)
    await supabase.from('notifications').insert({
      user_id: selected.users?.id, type: 'admin_message',
      title: 'Message from Risk Management', body: notifyMsg.trim(), is_read: false,
    })
    if (selected.users?.email) {
      await sendEmail('custom', selected.users.email, {
        first_name: selected.users.first_name ?? 'Trader',
        subject: 'Message from The Funded Diaries', body: notifyMsg.trim(),
      }).catch(() => {})
    }
    setNotifyMsg(''); setNotifying(false)
    toast('success', '📨', 'Sent', 'Notification delivered to trader.')
  }

  const phases = ['All','phase1','phase2','funded','breached','passed']
  const filtered = accounts.filter(a => {
    const trader = a.users ? `${a.users.first_name} ${a.users.last_name}` : ''
    const matchSearch = !search ||
      a.account_number?.toLowerCase().includes(search.toLowerCase()) ||
      trader.toLowerCase().includes(search.toLowerCase()) ||
      a.users?.email?.toLowerCase().includes(search.toLowerCase())
    const matchPhase = phaseFilter === 'All' || a.phase === phaseFilter
    return matchSearch && matchPhase
  })

  const riskLevel = (a: any) => {
    if ((a.daily_dd_used ?? 0) >= 4 || (a.max_dd_used ?? 0) >= 8) return 'critical'
    if ((a.daily_dd_used ?? 0) >= 2.5 || (a.max_dd_used ?? 0) >= 5) return 'warning'
    return 'low'
  }
  const riskColor: Record<string,string> = {
    low: 'text-[#16A34A]', warning: 'text-[#D97706]', critical: 'text-[#DC2626]'
  }

  // Compute risk alerts whenever trades change
  const riskAlerts = useMemo(() =>
    selected && trades.length >= 0 ? detectRiskAlerts(trades, selected) : [],
    [trades, selected]
  )
  const criticalCount = riskAlerts.filter(a => a.level === 'critical').length
  const warningCount  = riskAlerts.filter(a => a.level === 'warning').length

  const mono = { fontFamily: "'JetBrains Mono',monospace" } as const

  const TABS: {id:'trades'|'risk'|'breach'|'notify'; label: string}[] = [
    { id: 'trades', label: '📋 Trades' },
    { id: 'risk',   label: `⚠️ Risk${riskAlerts.length > 0 ? ` (${riskAlerts.length})` : ''}` },
    { id: 'breach', label: '⛔ Breach' },
    { id: 'notify', label: '📨 Notify' },
  ]

  return (
    <>
      <DashboardLayout title="All Accounts" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-1 gap-[14px]">
          <Card>
            <CardHeader title={`All Accounts (${filtered.length})`}/>
            <div className="flex gap-3 mb-3 flex-wrap">
              <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] flex-1 max-w-[300px] transition-colors">
                <span className="px-3 flex items-center text-[#8FA3BF] text-[11px]">🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, trader or email…"
                  className="flex-1 py-[8px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans"/>
              </div>
              <div className="flex gap-[3px] flex-wrap">
                {phases.map(p=>(
                  <button key={p} onClick={()=>setPhaseFilter(p)}
                    className={`px-[10px] py-[6px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all capitalize ${
                      phaseFilter===p
                        ? 'bg-[rgba(220,38,38,.1)] border-[rgba(220,38,38,.25)] text-[#DC2626]'
                        : 'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF] hover:text-[#5C7A9E]'
                    }`}>{p}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-[11px] text-[#8FA3BF]">No accounts found</div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[#F0F4FB]">
                    {['Account ID','Trader','Product','Phase','Balance','Daily DD','Max DD','Risk'].map(h=>(
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const risk = riskLevel(a)
                    const profitPct = a.starting_balance > 0 ? ((a.balance - a.starting_balance) / a.starting_balance) * 100 : 0
                    const isSelected = selected?.id === a.id
                    return (
                      <tr key={a.id}
                        onClick={() => isSelected ? setSelected(null) : openAccount(a)}
                        className={`border-b border-[rgba(34,85,204,.03)] cursor-pointer transition-all ${
                          isSelected ? 'bg-[rgba(34,85,204,.06)]' : 'hover:bg-[rgba(34,85,204,.02)]'
                        }`}>
                        <td className="px-[11px] py-[8px] font-bold text-[#2255CC] text-[10px]">{a.account_number}</td>
                        <td className="px-[11px] py-[8px]">
                          <div className="font-semibold">{a.users ? `${a.users.first_name} ${a.users.last_name}` : '—'}</div>
                          <div className="text-[9px] text-[#8FA3BF]">{a.users?.email}</div>
                        </td>
                        <td className="px-[11px] py-[8px] text-[#5C7A9E]">{a.challenge_products?.name ?? '—'}</td>
                        <td className="px-[11px] py-[8px]"><Badge variant={phaseVariant(a.phase)}>{phaseLabel(a.phase)}</Badge></td>
                        <td className="px-[11px] py-[8px]">
                          <div className="font-mono font-semibold">${Number(a.balance).toLocaleString()}</div>
                          <div className={`text-[9px] font-mono ${profitPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {profitPct >= 0 ? '+' : ''}{(Number(profitPct)||0).toFixed(2)}%
                          </div>
                        </td>
                        <td className={`px-[11px] py-[8px] font-mono ${riskColor[risk]}`}>{(a.daily_dd_used ?? 0).toFixed(2)}%</td>
                        <td className={`px-[11px] py-[8px] font-mono ${riskColor[risk]}`}>{(a.max_dd_used ?? 0).toFixed(2)}%</td>
                        <td className={`px-[11px] py-[8px] font-semibold capitalize text-[10px] ${riskColor[risk]}`}>{risk}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {/* ── Account detail MODAL ── */}
          {selected && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-white border border-[#E8EEF8] w-full max-w-[1100px] max-h-[90vh] flex flex-col rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EEF8] flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.2)] flex items-center justify-center font-bold text-[#DC2626] text-[13px]">
                    {selected.users?.first_name?.[0]}{selected.users?.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-[#2255CC] text-[15px]">{selected.account_number}</div>
                    <div className="text-[11px] text-[#5C7A9E]">{selected.users?.first_name} {selected.users?.last_name} · {selected.users?.email}</div>
                  </div>
                </div>
                {/* Risk summary in header */}
                {(criticalCount > 0 || warningCount > 0) && (
                  <div className="flex items-center gap-2 mr-4">
                    {criticalCount > 0 && (
                      <span className="flex items-center gap-1 bg-[rgba(220,38,38,.08)] border border-[rgba(220,38,38,.2)] px-3 py-1 rounded-full text-[#DC2626] text-[10px] font-bold">
                        🔴 {criticalCount} Critical
                      </span>
                    )}
                    {warningCount > 0 && (
                      <span className="flex items-center gap-1 bg-[rgba(245,158,11,.08)] border border-[rgba(245,158,11,.2)] px-3 py-1 rounded-full text-[#D97706] text-[10px] font-bold">
                        🟡 {warningCount} Warning
                      </span>
                    )}
                  </div>
                )}
                <button onClick={() => setSelected(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] cursor-pointer bg-transparent border-none text-[20px]">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    ['Balance', fmt(selected.balance), '#1A3A6B'],
                    ['Phase', phaseLabel(selected.phase), '#2255CC'],
                    ['Status', selected.status ?? 'active', selected.status === 'breached' ? '#DC2626' : '#16A34A'],
                  ].map(([l,v,c]) => (
                    <div key={l} className="bg-[#F4F7FD] border border-[#E8EEF8] p-[8px]">
                      <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-1">{l}</div>
                      <div className="font-mono text-[11px] font-bold" style={{color:c}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E8EEF8] mb-4">
                  {TABS.map(({ id, label }) => (
                    <button key={id} onClick={() => setPanelTab(id)}
                      className={`px-4 py-2 text-[10px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent ${
                        panelTab === id
                          ? id === 'risk' && criticalCount > 0
                            ? 'border-[#DC2626] text-[#DC2626]'
                            : 'border-[#DC2626] text-[#DC2626]'
                          : 'border-transparent text-[#8FA3BF] hover:text-[#1A3A6B]'
                      }`}>{label}</button>
                  ))}
                </div>

                {/* TRADES TAB */}
                {panelTab === 'trades' && (
                  <div>
                    {tradesLoading ? (
                      <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
                    ) : trades.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No trades on this account</div>
                    ) : (
                      <div className="overflow-auto max-h-[500px]">
                        <table className="w-full border-collapse text-[10px] min-w-[600px]">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-[#F0F4FB]">
                              {['IP','Symbol','Dir','Lots','Open','SL','TP','Open Time','Close Time','Duration','P&L'].map(h => (
                                <th key={h} className="px-[7px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[#8FA3BF] font-semibold text-left bg-[#FAFBFF] whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {trades.map(t => (
                              <tr key={t.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                                <td className="px-[7px] py-[6px]">
                                  <span className="text-[8px] font-mono text-[#8FA3BF] bg-[#F4F7FD] px-1 py-[1px] border border-[#E8EEF8]">{t.ip_address ?? '—'}</span>
                                </td>
                                <td className="px-[7px] py-[6px] font-semibold text-[#2255CC]">{t.symbol}</td>
                                <td className="px-[7px] py-[6px] font-bold" style={{color: t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction?.toUpperCase()}</td>
                                <td className="px-[7px] py-[6px] font-mono">{t.lots}</td>
                                <td className="px-[7px] py-[6px] font-mono text-[#5C7A9E]">{(Number(t.open_price)||0).toFixed(5)}</td>
                                <td className="px-[7px] py-[6px] font-mono text-[#DC2626]">{t.sl ?? '—'}</td>
                                <td className="px-[7px] py-[6px] font-mono text-[#16A34A]">{t.tp ?? '—'}</td>
                                <td className="px-[7px] py-[6px] text-[#8FA3BF] whitespace-nowrap">{t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}</td>
                                <td className="px-[7px] py-[6px] text-[#8FA3BF] whitespace-nowrap">{t.closed_at ? new Date(t.closed_at).toLocaleString() : <span className="text-[#16A34A] font-semibold">Open</span>}</td>
                                <td className="px-[7px] py-[6px] font-mono text-[#5C7A9E]">{duration(t.opened_at, t.closed_at)}</td>
                                <td className="px-[7px] py-[6px] font-mono font-bold" style={{color: (t.net_pnl ?? 0) >= 0 ? '#16A34A' : '#DC2626'}}>
                                  {t.status === 'open' ? <span className="text-[#8FA3BF]">Open</span> : `${(t.net_pnl ?? 0) >= 0 ? '+' : ''}$${(Number(t.net_pnl)||0).toFixed(2)}`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* RISK TAB */}
                {panelTab === 'risk' && (
                  <div>
                    {tradesLoading ? (
                      <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
                    ) : riskAlerts.length === 0 ? (
                      <div className="py-10 text-center">
                        <div className="text-[32px] mb-3">✅</div>
                        <div className="text-[13px] font-semibold text-[#16A34A]">No Risk Alerts Detected</div>
                        <div className="text-[11px] text-[#8FA3BF] mt-1">This account appears to be trading normally.</div>
                      </div>
                    ) : (
                      <div>
                        {/* Summary bar */}
                        <div className="flex gap-3 mb-4 p-3 bg-[#F4F7FD] border border-[#E8EEF8] rounded-lg">
                          <div className="text-center px-3 border-r border-[#E8EEF8]">
                            <div className="text-[20px] font-bold text-[#DC2626]">{criticalCount}</div>
                            <div className="text-[8px] text-[#8FA3BF] uppercase tracking-wider">Critical</div>
                          </div>
                          <div className="text-center px-3 border-r border-[#E8EEF8]">
                            <div className="text-[20px] font-bold text-[#D97706]">{warningCount}</div>
                            <div className="text-[8px] text-[#8FA3BF] uppercase tracking-wider">Warning</div>
                          </div>
                          <div className="text-center px-3">
                            <div className="text-[20px] font-bold text-[#2255CC]">{riskAlerts.filter(a=>a.level==='info').length}</div>
                            <div className="text-[8px] text-[#8FA3BF] uppercase tracking-wider">Info</div>
                          </div>
                          <div className="ml-auto text-[10px] text-[#8FA3BF] self-center">
                            Analyzed {trades.length} trades
                          </div>
                        </div>

                        {/* Alert cards */}
                        <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                          {riskAlerts.map((alert, i) => {
                            const borderColor = alert.level === 'critical' ? 'rgba(220,38,38,.25)' : alert.level === 'warning' ? 'rgba(245,158,11,.25)' : 'rgba(34,85,204,.2)'
                            const bgColor = alert.level === 'critical' ? 'rgba(220,38,38,.04)' : alert.level === 'warning' ? 'rgba(245,158,11,.04)' : 'rgba(34,85,204,.03)'
                            return (
                              <div key={i} style={{ border: `1px solid ${borderColor}`, background: bgColor, borderRadius: 8, padding: '12px 16px' }}>
                                <div className="flex items-center gap-3 mb-2">
                                  <AlertBadge level={alert.level} />
                                  <span className="text-[11px] font-bold text-[#1A3A6B]">{alert.category}</span>
                                </div>
                                <div className="text-[11px] text-[#1A3A6B] font-semibold mb-1">{alert.message}</div>
                                {alert.detail && <div className="text-[10px] text-[#5C7A9E]">{alert.detail}</div>}
                                {/* Flagged trades */}
                                {alert.trades && alert.trades.length > 0 && (
                                  <div className="mt-2 overflow-x-auto">
                                    <table className="w-full text-[9px] border-collapse">
                                      <thead>
                                        <tr className="border-b border-[#E8EEF8]">
                                          {['Symbol','Dir','Lots','Open','Opened At','Closed At','P&L'].map(h=>(
                                            <th key={h} className="px-2 py-1 text-left text-[#8FA3BF] font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {alert.trades.map((t:any) => (
                                          <tr key={t.id} className="border-b border-[#F4F7FD]">
                                            <td className="px-2 py-1 font-semibold text-[#2255CC]">{t.symbol}</td>
                                            <td className="px-2 py-1 font-bold" style={{color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction?.toUpperCase()}</td>
                                            <td className="px-2 py-1 font-mono">{t.lots}</td>
                                            <td className="px-2 py-1 font-mono text-[#5C7A9E]">{(Number(t.open_price)||0).toFixed(5)}</td>
                                            <td className="px-2 py-1 text-[#8FA3BF] whitespace-nowrap">{t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}</td>
                                            <td className="px-2 py-1 text-[#8FA3BF] whitespace-nowrap">{t.closed_at ? new Date(t.closed_at).toLocaleString() : 'Open'}</td>
                                            <td className="px-2 py-1 font-mono font-bold" style={{color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>
                                              {(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BREACH TAB */}
                {panelTab === 'breach' && (
                  <div>
                    <div className="p-4 bg-[rgba(220,38,38,.05)] border border-[rgba(220,38,38,.2)] mb-4">
                      <div className="font-semibold text-[#DC2626] text-[12px] mb-2">⚠️ Breach Account</div>
                      <p className="text-[11px] text-[#5C7A9E] mb-3">This will permanently mark the account as breached, lock trading, and notify the trader by email and notification.</p>
                      <div className="grid grid-cols-2 gap-2 mb-4 text-[10px]">
                        {[
                          ['Account', selected.account_number],
                          ['Trader', `${selected.users?.first_name} ${selected.users?.last_name}`],
                          ['Balance', fmt(selected.balance)],
                          ['Current Status', selected.status ?? 'active'],
                        ].map(([l,v]) => (
                          <div key={l} className="flex justify-between py-1 border-b border-[#F0F4FB]">
                            <span className="text-[#8FA3BF]">{l}</span>
                            <span className="font-semibold">{v}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={breachAccount}
                        disabled={selected.status === 'breached'}
                        className="w-full py-[10px] text-[10px] uppercase font-bold bg-[#DC2626] text-white border-none cursor-pointer hover:bg-[#b91c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {selected.status === 'breached' ? '✓ Already Breached' : '⛔ Breach This Account'}
                      </button>
                    </div>
                  </div>
                )}

                {/* NOTIFY TAB */}
                {panelTab === 'notify' && (
                  <div>
                    <div className="mb-3">
                      <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Message to {selected.users?.first_name}</label>
                      <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={5}
                        placeholder="Write your message to the trader…"
                        className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors resize-y"/>
                    </div>
                    <div className="text-[9px] text-[#8FA3BF] mb-3">Sends as: in-app notification + email to {selected.users?.email}</div>
                    <button onClick={sendNotification} disabled={notifying || !notifyMsg.trim()}
                      className="w-full py-[10px] text-[10px] uppercase font-bold bg-[#2255CC] text-white border-none cursor-pointer hover:bg-[#1A44B0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {notifying ? 'Sending…' : '📨 Send Notification'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
