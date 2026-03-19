import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminDashboardPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalTraders: 0, fundedAccounts: 0, pendingPayouts: 0, pendingCount: 0,
    openTickets: 0, phase1: 0, phase2: 0, breached: 0
  })
  const [riskAlerts, setRiskAlerts] = useState<any[]>([])
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [
        { count: traders },
        { count: funded },
        { count: phase1 },
        { count: phase2 },
        { count: breached },
        { data: payouts, count: payoutCount },
        { count: tickets },
        alerts,
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role','trader'),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('phase','funded'),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('phase','phase1'),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('phase','phase2'),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('phase','breached'),
        supabase.from('payouts').select('*, users(first_name,last_name), accounts(account_number)', { count: 'exact' }).eq('status','pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status','open'),
        analyticsApi.adminRiskAlerts(),
      ])
      setStats({
        totalTraders: traders ?? 0, fundedAccounts: funded ?? 0,
        pendingCount: payoutCount ?? 0, openTickets: tickets ?? 0,
        phase1: phase1 ?? 0, phase2: phase2 ?? 0, breached: breached ?? 0, pendingPayouts: 0
      })
      setPendingPayouts(payouts ?? [])
      setRiskAlerts(alerts.slice(0, 5))
    }
    load().catch(console.error)
  }, [])

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
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Total Traders"   value={String(stats.totalTraders)}   sub="Registered" subColor="text-[#16A34A]"/>
          <KPICard label="Funded Accounts" value={String(stats.fundedAccounts)} sub="Active funded" subColor="text-[#16A34A]"/>
          <KPICard label="Pending Payouts" value={String(stats.pendingCount)}   sub="Awaiting approval" subColor="text-[#2255CC]"/>
          <KPICard label="Open Tickets"    value={String(stats.openTickets)}    sub="Support queue" subColor="text-[#DC2626]"/>
        </div>
        <div className="grid grid-cols-5 gap-[11px]">
          <KPICard label="Phase 1 Active" value={String(stats.phase1)} sub="" />
          <KPICard label="Phase 2 Active" value={String(stats.phase2)} sub="" />
          <KPICard label="Breached"       value={String(stats.breached)} sub="" subColor="text-[#DC2626]"/>
          <KPICard label="Risk Alerts"    value={String(riskAlerts.length)} sub="" subColor={riskAlerts.length > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}/>
          <KPICard label="Accounts Total" value={String(stats.phase1 + stats.phase2 + stats.fundedAccounts)} sub=""/>
        </div>

        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="Risk Alerts" action={<Button variant="ghost" size="sm" onClick={()=>navigate('/admin/risk')}>View all →</Button>}/>
            {riskAlerts.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[#16A34A]">✓ No risk alerts</div>
            ) : riskAlerts.slice(0,5).map((a,i)=>(
              <div key={i} className="flex items-center justify-between px-[14px] py-[12px] border border-[rgba(255,51,82,.15)] bg-[rgba(220,38,38,.04)] mb-2">
                <div>
                  <div className="text-[12px] font-semibold">{a.account_number}</div>
                  <div className="text-[10px] text-[#8FA3BF]">Daily DD: {a.daily_dd_used}% · Max DD: {a.max_dd_used}%</div>
                </div>
                <button onClick={()=>toast('error','🚨','Alert','Notification sent.')}
                  className="px-[10px] py-[4px] text-[8px] tracking-[1px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.15)] text-[#DC2626] border border-[rgba(255,51,82,.25)]">Notify</button>
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader title="Pending Payouts" action={<Button variant="ghost" size="sm" onClick={()=>navigate('/admin/payouts')}>View all →</Button>}/>
            {pendingPayouts.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No pending payouts</div>
            ) : pendingPayouts.map(p=>(
              <div key={p.id} className="flex items-center justify-between px-[14px] py-[10px] border-b border-[#F0F4FB]">
                <div>
                  <div className="text-[12px] font-semibold">{p.users?.first_name} {p.users?.last_name}</div>
                  <div className="text-[10px] text-[#8FA3BF]">{p.accounts?.account_number} · {p.method}</div>
                </div>
                <div className=" text-[#2255CC] text-[13px]">{fmt(p.requested_usd)}</div>
              </div>
            ))}
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
