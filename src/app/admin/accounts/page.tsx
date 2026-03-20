import { useEffect, useState, useCallback } from 'react'
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
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m ${s % 60}s`
}

export function AdminAccountsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [accounts, setAccounts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')

  // Selected account panel
  const [selected, setSelected]   = useState<any>(null)
  const [panelTab, setPanelTab]   = useState<'trades'|'breach'|'notify'>('trades')
  const [trades, setTrades]       = useState<any[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)

  // Notify form
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
      .from('trades')
      .select('*')
      .eq('account_id', acc.id)
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
    // Email trader
    try {
      if (selected.users?.email) {
        await sendEmail('account_breached', selected.users.email, {
          first_name:     selected.users.first_name ?? 'Trader',
          account_number: selected.account_number,
          reason:         'Account breached by risk management.',
          balance:        `$${Number(selected.balance).toLocaleString()}`,
        })
      }
    } catch {}
    // Notification
    await supabase.from('notifications').insert({
      user_id: selected.users?.id,
      type: 'breach',
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
      user_id: selected.users?.id,
      type:    'admin_message',
      title:   `Message from Risk Management`,
      body:    notifyMsg.trim(),
      is_read: false,
    })
    if (selected.users?.email) {
      await sendEmail('custom', selected.users.email, {
        first_name: selected.users.first_name ?? 'Trader',
        subject:    'Message from The Funded Diaries',
        body:       notifyMsg.trim(),
      }).catch(() => {})
    }
    setNotifyMsg('')
    setNotifying(false)
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
    low: 'text-[#16A34A]', warning: 'text-[#2255CC]', critical: 'text-[#DC2626]'
  }

  const mono = { fontFamily: "'JetBrains Mono',monospace" } as const

  return (
    <>
      <DashboardLayout title="All Accounts" nav={ADMIN_NAV} accentColor="red">
        <div className={`grid gap-[14px] ${selected ? 'grid-cols-[1fr_480px]' : 'grid-cols-1'}`}>

          {/* ── Left: Accounts table ── */}
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
                    const profitPct = a.starting_balance > 0
                      ? ((a.balance - a.starting_balance) / a.starting_balance) * 100 : 0
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
                            {profitPct >= 0 ? '+' : ''}{(Number(profitPct) || 0).toFixed(2)}%
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

          {/* ── Right: Account detail panel ── */}
          {selected && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-mono font-bold text-[#2255CC] text-[13px]">{selected.account_number}</div>
                  <div className="text-[11px] text-[#5C7A9E]">{selected.users?.first_name} {selected.users?.last_name}</div>
                  <div className="text-[10px] text-[#8FA3BF]">{selected.users?.email}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] cursor-pointer bg-transparent border-none text-[18px]">✕</button>
              </div>

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
                {([['trades','📋 Trades'],['breach','⛔ Breach'],['notify','📨 Notify']] as const).map(([t,l]) => (
                  <button key={t} onClick={() => setPanelTab(t)}
                    className={`px-4 py-2 text-[10px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent ${
                      panelTab === t ? 'border-[#DC2626] text-[#DC2626]' : 'border-transparent text-[#8FA3BF] hover:text-[#1A3A6B]'
                    }`}>{l}</button>
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
                                <span className="text-[8px] font-mono text-[#8FA3BF] bg-[#F4F7FD] px-1 py-[1px] border border-[#E8EEF8]">
                                  {t.ip_address ?? '—'}
                                </span>
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

              {/* BREACH TAB */}
              {panelTab === 'breach' && (
                <div>
                  <div className="p-4 bg-[rgba(220,38,38,.05)] border border-[rgba(220,38,38,.2)] mb-4">
                    <div className="font-semibold text-[#DC2626] text-[12px] mb-2">⚠️ Breach Account</div>
                    <p className="text-[11px] text-[#5C7A9E] mb-3">
                      This will permanently mark the account as breached, lock trading, and notify the trader by email and notification.
                    </p>
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
                    <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">
                      Message to {selected.users?.first_name}
                    </label>
                    <textarea
                      value={notifyMsg}
                      onChange={e => setNotifyMsg(e.target.value)}
                      rows={5}
                      placeholder="Write your message to the trader…"
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors resize-y"
                    />
                  </div>
                  <div className="text-[9px] text-[#8FA3BF] mb-3">
                    Sends as: in-app notification + email to {selected.users?.email}
                  </div>
                  <button onClick={sendNotification} disabled={notifying || !notifyMsg.trim()}
                    className="w-full py-[10px] text-[10px] uppercase font-bold bg-[#2255CC] text-white border-none cursor-pointer hover:bg-[#1A44B0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {notifying ? 'Sending…' : '📨 Send Notification'}
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}