import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminDashboardPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalTraders:   0,
    fundedAccounts: 0,
    pendingCount:   0,
    openTickets:    0,
    phase1:         0,
    phase2:         0,
    breached:       0,
    totalAccounts:  0,
    revenueToday:   0,
    revenueMonth:   0,
    pendingKyc:     0,
  })
  const [riskAlerts,    setRiskAlerts]    = useState<any[]>([])
  const [pendingPayouts,setPendingPayouts]= useState<any[]>([])
  const [recentTrades,  setRecentTrades]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      // Run each query independently so one failure doesn't kill the rest
      const [
        tradersRes, fundedRes, phase1Res, phase2Res, breachedRes,
        payoutsRes, ticketsRes, kycRes, ordersRes, ordersMonthRes,
        riskRes, recentTradesRes,
      ] = await Promise.allSettled([
        supabase.from('users').select('*', { count:'exact', head:true }).eq('role','trader'),
        supabase.from('accounts').select('*', { count:'exact', head:true }).eq('phase','funded').eq('status','active'),
        supabase.from('accounts').select('*', { count:'exact', head:true }).eq('phase','phase1'),
        supabase.from('accounts').select('*', { count:'exact', head:true }).eq('phase','phase2'),
        supabase.from('accounts').select('*', { count:'exact', head:true }).eq('phase','breached'),
        supabase.from('payouts')
          .select('*, users(first_name,last_name), accounts(account_number)', { count:'exact' })
          .eq('status','pending')
          .order('created_at', { ascending:false })
          .limit(8),
        supabase.from('support_tickets').select('*', { count:'exact', head:true }).eq('status','open'),
        supabase.from('kyc_verifications').select('*', { count:'exact', head:true }).eq('status','pending'),
        // Revenue today
        supabase.from('orders')
          .select('amount_usd')
          .eq('status','paid')
          .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
        // Revenue this month
        supabase.from('orders')
          .select('amount_usd')
          .eq('status','paid')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        // Risk alerts — accounts with high DD usage
        supabase.from('accounts')
          .select('account_number, daily_dd_used, max_dd_used, phase, users(first_name,last_name)')
          .eq('status','active')
          .or('daily_dd_used.gte.3,max_dd_used.gte.7')
          .order('max_dd_used', { ascending:false })
          .limit(5),
        // Recent trades
        supabase.from('trades')
          .select('*, accounts(account_number), users(first_name,last_name)')
          .order('opened_at', { ascending:false })
          .limit(6),
      ])

      const get = (res: any) => res.status === 'fulfilled' ? res.value : { data: null, count: 0, error: null }

      const traders    = get(tradersRes)
      const funded     = get(fundedRes)
      const phase1     = get(phase1Res)
      const phase2     = get(phase2Res)
      const breached   = get(breachedRes)
      const payouts    = get(payoutsRes)
      const tickets    = get(ticketsRes)
      const kyc        = get(kycRes)
      const ordToday   = get(ordersRes)
      const ordMonth   = get(ordersMonthRes)
      const risk       = get(riskRes)
      const trades     = get(recentTradesRes)

      const revToday = (ordToday.data ?? []).reduce((s:number, o:any) => s + (o.amount_usd ?? 0), 0)
      const revMonth = (ordMonth.data ?? []).reduce((s:number, o:any) => s + (o.amount_usd ?? 0), 0)

      setStats({
        totalTraders:   traders.count   ?? 0,
        fundedAccounts: funded.count    ?? 0,
        pendingCount:   payouts.count   ?? 0,
        openTickets:    tickets.count   ?? 0,
        phase1:         phase1.count    ?? 0,
        phase2:         phase2.count    ?? 0,
        breached:       breached.count  ?? 0,
        totalAccounts:  (phase1.count ?? 0) + (phase2.count ?? 0) + (funded.count ?? 0) + (breached.count ?? 0),
        revenueToday:   revToday,
        revenueMonth:   revMonth,
        pendingKyc:     kyc.count       ?? 0,
      })

      setPendingPayouts(payouts.data ?? [])
      setRiskAlerts(risk.data ?? [])
      setRecentTrades(trades.data ?? [])

    } catch (e) {
      console.error('Admin dashboard load error:', e)
    }
    setLoading(false)
  }

  return (
    <>
      <DashboardLayout title="Admin Dashboard" nav={ADMIN_NAV} accentColor="red"
        topbarRight={
          <>
            <div className="w-[5px] h-[5px] rounded-full bg-[#DC2626] shadow-[0_0_5px_#DC2626] animate-pulse"/>
            <span className="text-[9px] text-[#DC2626] tracking-[1.5px] uppercase font-semibold">Admin</span>
            {riskAlerts.length > 0 && <Button variant="danger" size="sm" onClick={()=>navigate('/admin/risk')}>⚠ {riskAlerts.length} Risk Alerts</Button>}
            {stats.pendingCount > 0 && <Button variant="ghost" size="sm" onClick={()=>navigate('/admin/payouts')}>💰 {stats.pendingCount} Pending</Button>}
          </>
        }
      >
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <>
            {/* Row 1 — Main KPIs */}
            <div className="grid grid-cols-4 gap-[11px]">
              <KPICard label="Total Traders"   value={String(stats.totalTraders)}
                sub="Registered" subColor="text-[#16A34A]"/>
              <KPICard label="Funded Accounts" value={String(stats.fundedAccounts)}
                sub="Active funded" subColor="text-[#16A34A]"/>
              <KPICard label="Pending Payouts" value={String(stats.pendingCount)}
                sub="Awaiting approval" subColor={stats.pendingCount > 0 ? 'text-[#D97706]' : 'text-[#8FA3BF]'}/>
              <KPICard label="Open Tickets"    value={String(stats.openTickets)}
                sub="Support queue" subColor={stats.openTickets > 0 ? 'text-[#DC2626]' : 'text-[#8FA3BF]'}/>
            </div>

            {/* Row 2 — Secondary KPIs */}
            <div className="grid grid-cols-6 gap-[11px]">
              <KPICard label="Phase 1"      value={String(stats.phase1)}    sub="Active"/>
              <KPICard label="Phase 2"      value={String(stats.phase2)}    sub="Active"/>
              <KPICard label="Funded"       value={String(stats.fundedAccounts)} sub="Active" subColor="text-[#16A34A]"/>
              <KPICard label="Breached"     value={String(stats.breached)}  sub="Locked" subColor={stats.breached > 0 ? 'text-[#DC2626]' : 'text-[#8FA3BF]'}/>
              <KPICard label="Revenue Today" value={fmt(stats.revenueToday)} sub="Orders paid" subColor="text-[#2255CC]"/>
              <KPICard label="Rev. Month"   value={fmt(stats.revenueMonth)} sub="This month" subColor="text-[#2255CC]"/>
            </div>

            {/* Row 3 — Alerts row */}
            {(stats.pendingKyc > 0 || riskAlerts.length > 0 || stats.openTickets > 0) && (
              <div className="flex gap-3 flex-wrap">
                {stats.pendingKyc > 0 && (
                  <button onClick={() => navigate('/admin/kyc')}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgba(217,119,6,.08)] border border-[rgba(217,119,6,.25)] text-[#D97706] text-[11px] font-semibold cursor-pointer rounded-lg hover:bg-[rgba(217,119,6,.14)] transition-colors">
                    🪪 {stats.pendingKyc} KYC pending review
                  </button>
                )}
                {riskAlerts.length > 0 && (
                  <button onClick={() => navigate('/admin/risk')}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgba(220,38,38,.08)] border border-[rgba(220,38,38,.25)] text-[#DC2626] text-[11px] font-semibold cursor-pointer rounded-lg hover:bg-[rgba(220,38,38,.14)] transition-colors">
                    ⚠️ {riskAlerts.length} accounts at risk
                  </button>
                )}
                {stats.openTickets > 0 && (
                  <button onClick={() => navigate('/admin/support')}
                    className="flex items-center gap-2 px-4 py-2 bg-[rgba(34,85,204,.08)] border border-[rgba(34,85,204,.25)] text-[#2255CC] text-[11px] font-semibold cursor-pointer rounded-lg hover:bg-[rgba(34,85,204,.14)] transition-colors">
                    💬 {stats.openTickets} open support tickets
                  </button>
                )}
              </div>
            )}

            {/* Row 4 — Pending payouts + Risk alerts */}
            <div className="grid grid-cols-2 gap-[14px]">
              <Card>
                <CardHeader title={`Pending Payouts (${stats.pendingCount})`}
                  action={<Button variant="ghost" size="sm" onClick={()=>navigate('/admin/payouts')}>View all →</Button>}/>
                {pendingPayouts.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No pending payouts</div>
                ) : pendingPayouts.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-[14px] py-[10px] border-b border-[#F0F4FB] hover:bg-[rgba(34,85,204,.02)] cursor-pointer"
                    onClick={() => navigate('/admin/payouts')}>
                    <div>
                      <div className="text-[12px] font-semibold">{p.users?.first_name} {p.users?.last_name}</div>
                      <div className="text-[10px] text-[#8FA3BF]">{p.accounts?.account_number} · {p.method}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold text-[#2255CC] text-[13px]">{fmt(p.requested_usd)}</div>
                      <span className="text-[8px] uppercase font-bold px-2 py-1 border text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]">Pending</span>
                    </div>
                  </div>
                ))}
              </Card>

              <Card>
                <CardHeader title={`Risk Alerts (${riskAlerts.length})`}
                  action={<Button variant="ghost" size="sm" onClick={()=>navigate('/admin/risk')}>View all →</Button>}/>
                {riskAlerts.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#16A34A]">✓ No risk alerts</div>
                ) : riskAlerts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-[14px] py-[10px] border border-[rgba(220,38,38,.12)] bg-[rgba(220,38,38,.03)] mb-2 rounded">
                    <div>
                      <div className="text-[12px] font-semibold">{a.account_number}</div>
                      <div className="text-[10px] text-[#8FA3BF]">{a.users?.first_name} {a.users?.last_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#DC2626] font-mono font-semibold">Daily: {(a.daily_dd_used??0).toFixed(1)}%</div>
                      <div className="text-[10px] text-[#DC2626] font-mono font-semibold">Max: {(a.max_dd_used??0).toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Row 5 — Recent trades */}
            <Card>
              <CardHeader title="Recent Trades"
                action={<Button variant="ghost" size="sm" onClick={()=>navigate('/admin/accounts')}>View accounts →</Button>}/>
              {recentTrades.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[#8FA3BF]">No recent trades</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#F0F4FB]">
                      {['Trader','Account','Symbol','Dir','Lots','Open Price','Status','Opened'].map(h => (
                        <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map(t => (
                      <tr key={t.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                        <td className="px-[11px] py-[8px] font-semibold">{t.users?.first_name} {t.users?.last_name}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[#2255CC] text-[10px]">{t.accounts?.account_number}</td>
                        <td className="px-[11px] py-[8px] font-semibold">{t.symbol}</td>
                        <td className="px-[11px] py-[8px]">
                          <span className={`text-[9px] font-bold ${t.direction==='buy'?'text-[#16A34A]':'text-[#DC2626]'}`}>{t.direction?.toUpperCase()}</span>
                        </td>
                        <td className="px-[11px] py-[8px] font-mono">{t.lots}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[#5C7A9E]">{(Number(t.open_price)||0).toFixed(5)}</td>
                        <td className="px-[11px] py-[8px]">
                          <span className={`text-[8px] uppercase font-bold px-2 py-1 border ${
                            t.status==='open'
                              ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]'
                              : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'
                          }`}>{t.status}</span>
                        </td>
                        <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">
                          {t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}