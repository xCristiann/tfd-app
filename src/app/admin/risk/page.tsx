import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, DrawdownBar } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { analyticsApi } from '@/lib/api/analytics'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminRiskPage() {
  const { toasts, toast, dismiss } = useToast()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.adminRiskAlerts()
      .then(setAlerts).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const critical = alerts.filter(a => a.daily_dd_used >= 4 || a.max_dd_used >= 8)
  const warning  = alerts.filter(a => a.daily_dd_used < 4 && a.max_dd_used < 8)

  return (
    <>
      <DashboardLayout title="Risk Management" nav={ADMIN_NAV} accentColor="red">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
        ) : alerts.length === 0 ? (
          <Card><div className="py-16 text-center text-[var(--green)] text-[14px]">✓ No risk alerts — all accounts within safe limits</div></Card>
        ) : (
          <>
            {critical.length > 0 && (
              <Card>
                <CardHeader title={`Critical Risk (${critical.length})`}/>
                {critical.map((a,i)=>(
                  <div key={i} className="border border-[rgba(255,51,82,.15)] bg-[rgba(255,51,82,.04)] p-[14px] mb-2">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono text-[var(--gold)] text-[11px] mb-[1px]">{a.account_number}</div>
                        <div className="font-semibold text-[13px]">{a.trader_name ?? '—'}</div>
                        <div className="text-[10px] text-[var(--text3)]">Balance: ${Number(a.balance ?? 0).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>toast('error','🚨','Alert','Breach notification sent to trader.')}
                          className="px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.15)] text-[var(--red)] border border-[rgba(255,51,82,.25)]">Notify</button>
                        <button onClick={()=>toast('warning','⛔','Suspended','Account suspended.')}
                          className="px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,140,66,.1)] text-[var(--orange,#ff8c42)] border border-[rgba(255,140,66,.25)]">Suspend</button>
                      </div>
                    </div>
                    <DrawdownBar label={`Daily DD — ${a.daily_dd_used}%`} value={Number(a.daily_dd_used)} max={5} warn={60} danger={80}/>
                    <DrawdownBar label={`Max DD — ${a.max_dd_used}%`}   value={Number(a.max_dd_used)}   max={10} warn={60} danger={80}/>
                  </div>
                ))}
              </Card>
            )}
            {warning.length > 0 && (
              <Card>
                <CardHeader title={`Warning Level (${warning.length})`}/>
                {warning.map((a,i)=>(
                  <div key={i} className="border border-[rgba(255,140,66,.12)] bg-[rgba(255,140,66,.03)] p-[14px] mb-2">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-mono text-[var(--gold)] text-[11px] mb-[1px]">{a.account_number}</div>
                        <div className="font-semibold">{a.trader_name ?? '—'}</div>
                      </div>
                      <button onClick={()=>toast('warning','👁','Flagged','Account marked for monitoring.')}
                        className="px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">Watch</button>
                    </div>
                    <DrawdownBar label={`Daily DD — ${a.daily_dd_used}%`} value={Number(a.daily_dd_used)} max={5}/>
                    <DrawdownBar label={`Max DD — ${a.max_dd_used}%`}     value={Number(a.max_dd_used)}   max={10}/>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
