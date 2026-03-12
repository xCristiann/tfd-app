import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { ADMIN_NAV } from '@/lib/nav'

const RISK_ALERTS = [
  { lvl:'red',  ico:'🔴', name:'TFD-100K-8831 — Sofia K.',   sub:'DD at 4.82% / 5.00% daily limit — critical' },
  { lvl:'red',  ico:'🔴', name:'TFD-200K-2241 — Marcus T.',  sub:'Max DD at 9.41% / 10.00% — near breach' },
  { lvl:'gold', ico:'🟡', name:'TFD-25K-7712 — Yuki C.',     sub:'Daily DD at 3.9% / 4.0% — warning level' },
]

const PENDING = [
  { trader:'James Mitchell', acct:'TFD-100K-4821', amt:'$7,157', method:'USDT', ago:'2h ago' },
  { trader:'Sofia Kowalski', acct:'TFD-200K-2241', amt:'$31,500',method:'Bitcoin','ago':'4h ago' },
  { trader:'Marcus Thompson',acct:'TFD-100K-8831', amt:'$12,840',method:'Wise',  ago:'6h ago' },
]

export function AdminDashboardPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  return (
    <>
      <DashboardLayout title="Dashboard" nav={ADMIN_NAV} accentColor="red"
        topbarRight={
          <>
            <div className="w-[5px] h-[5px] rounded-full bg-[var(--red)] shadow-[0_0_5px_var(--red)] animate-pulse"/>
            <span className="text-[9px] text-[var(--red)] tracking-[1.5px] uppercase font-semibold">Admin</span>
            <Button variant="danger" size="sm" onClick={()=>navigate('/admin/risk')}>⚠ 3 Risk Alerts</Button>
            <Button variant="ghost" size="sm" onClick={()=>navigate('/admin/payouts')}>💰 12 Pending</Button>
          </>
        }
      >
        {/* KPI Row 1 */}
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Total Traders"   value="14,281" sub="+124 this week"   subColor="text-[var(--green)]"/>
          <KPICard label="Funded Accounts" value="4,219"  sub="29.5% of total"  subColor="text-[var(--green)]"/>
          <KPICard label="Total Revenue"   value="$481K"  sub="+$42K this month" subColor="text-[var(--gold)]"/>
          <KPICard label="Total Payouts"   value="$4.8M"  sub="+$284K pending"  subColor="text-[var(--green)]"/>
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-5 gap-[11px]">
          <KPICard label="Phase 1 Active"  value="6,840" sub="47.9%"     subColor="text-[var(--gold)]"/>
          <KPICard label="Phase 2 Active"  value="2,180" sub="15.3%"     subColor="text-[var(--gold)]"/>
          <KPICard label="Breached Today"  value="42"    sub="0.29% rate" subColor="text-[var(--red)]"/>
          <KPICard label="Open Tickets"    value="28"    sub="4 critical" subColor="text-[var(--red)]"/>
          <KPICard label="CSAT Score"      value="94%"   sub="Last 30d"  subColor="text-[var(--green)]"/>
        </div>

        <div className="grid grid-cols-2 gap-[14px]">
          {/* Risk alerts */}
          <Card>
            <CardHeader title="Risk Alerts" action={
              <Button variant="ghost" size="sm" onClick={()=>navigate('/admin/risk')}>View all →</Button>
            }/>
            <div className="flex flex-col gap-2">
              {RISK_ALERTS.map((a,i)=>(
                <div key={i} className={`flex items-center justify-between px-[14px] py-[12px] border ${
                  a.lvl==='red'
                    ? 'bg-[rgba(255,51,82,.06)] border-[rgba(255,51,82,.15)]'
                    : 'bg-[rgba(255,140,66,.06)] border-[rgba(255,140,66,.15)]'
                }`}>
                  <div className="flex items-center gap-[10px]">
                    <span className="text-[16px]">{a.ico}</span>
                    <div>
                      <div className="text-[12px] font-semibold">{a.name}</div>
                      <div className="text-[10px] text-[var(--text3)] mt-[1px]">{a.sub}</div>
                    </div>
                  </div>
                  <div className="flex gap-[6px]">
                    <button onClick={()=>toast('error','🚨','Alert','Breach notification sent.')}
                      className="px-[10px] py-[4px] text-[8px] tracking-[1px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.15)] text-[var(--red)] border border-[rgba(255,51,82,.25)]">Notify</button>
                    <button onClick={()=>toast('warning','👁','Monitoring','Account flagged.')}
                      className="px-[10px] py-[4px] text-[8px] tracking-[1px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">Watch</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pending payouts */}
          <Card>
            <CardHeader title="Pending Payouts" action={
              <Button variant="ghost" size="sm" onClick={()=>navigate('/admin/payouts')}>Queue →</Button>
            }/>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Trader','Account','Amount','Method',''].map((h,i)=>(
                    <th key={i} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PENDING.map((p,i)=>(
                  <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                    <td className="px-[11px] py-[8px] font-semibold">{p.trader}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{p.acct}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--green)]">{p.amt}</td>
                    <td className="px-[11px] py-[8px] text-[var(--text2)]">{p.method}</td>
                    <td className="px-[11px] py-[8px]">
                      <div className="flex gap-1">
                        <button onClick={()=>toast('success','✅','Approved',`${p.trader} payout approved.`)}
                          className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(0,217,126,.1)] text-[var(--green)] border border-[rgba(0,217,126,.2)]">✓</button>
                        <button onClick={()=>toast('error','✕','Rejected','Payout rejected.')}
                          className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
