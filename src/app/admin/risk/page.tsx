import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, DrawdownBar } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminRiskPage() {
  const { toasts, toast, dismiss } = useToast()
  const [alerts, setAlerts] = useState<any[]>([])
  const [dupIps, setDupIps] = useState<{ ip: string; traders: any[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsApi.adminRiskAlerts().catch(() => []),
      supabase.from('users')
        .select('id, first_name, last_name, email, last_login_ip, last_login_at')
        .not('last_login_ip', 'is', null)
        .then(({ data }) => data ?? [])
    ]).then(([riskData, users]) => {
      setAlerts(riskData)

      // Group by IP — find duplicates
      const ipMap: Record<string, any[]> = {}
      for (const u of users) {
        if (!u.last_login_ip) continue
        if (!ipMap[u.last_login_ip]) ipMap[u.last_login_ip] = []
        ipMap[u.last_login_ip].push(u)
      }
      const dups = Object.entries(ipMap)
        .filter(([, traders]) => traders.length >= 2)
        .map(([ip, traders]) => ({ ip, traders }))
      setDupIps(dups)
      setLoading(false)
    })
  }, [])

  const critical = alerts.filter(a => a.daily_dd_used >= 4 || a.max_dd_used >= 8)
  const warning  = alerts.filter(a => a.daily_dd_used < 4 && a.max_dd_used < 8)

  return (
    <>
      <DashboardLayout title="Risk Management" nav={ADMIN_NAV} accentColor="red">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <>
            {/* ── Duplicate IP Alerts ── */}
            {dupIps.length > 0 && (
              <Card>
                <CardHeader title={`⚠️ Duplicate IP Alerts (${dupIps.length})`}/>
                <div className="mb-2 text-[10px] text-[var(--text3)]">Multiple traders logging in from the same IP address — possible multi-accounting or shared connection.</div>
                {dupIps.map(({ ip, traders }) => (
                  <div key={ip} className="border border-[rgba(255,180,0,.2)] bg-[rgba(255,180,0,.04)] p-4 mb-3">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[var(--gold)] text-[12px]">🔗</span>
                      <span className="font-mono text-[var(--gold)] font-bold text-[12px]">{ip}</span>
                      <span className="text-[8px] uppercase tracking-[1.5px] text-[var(--gold)] bg-[rgba(212,168,67,.1)] border border-[var(--bdr2)] px-[8px] py-[2px] font-bold">
                        {traders.length} Accounts
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {traders.map(t => (
                        <div key={t.id} className="flex items-center gap-2 bg-[var(--bg3)] border border-[var(--dim)] px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-[rgba(255,180,0,.1)] border border-[var(--bdr2)] flex items-center justify-center text-[8px] font-bold text-[var(--gold)] flex-shrink-0">
                            {t.first_name?.[0]}{t.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-[11px]">{t.first_name} {t.last_name}</div>
                            <div className="text-[9px] text-[var(--text3)]">{t.email}</div>
                          </div>
                          <div className="ml-auto text-[9px] text-[var(--text3)]">
                            {t.last_login_at ? new Date(t.last_login_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {/* ── No IP Dups ── */}
            {dupIps.length === 0 && (
              <Card>
                <div className="py-4 flex items-center gap-2 text-[var(--green)] text-[11px]">
                  <span>✓</span> No duplicate IP addresses detected
                </div>
              </Card>
            )}

            {/* ── DD Alerts ── */}
            {alerts.length === 0 ? (
              <Card><div className="py-10 text-center text-[var(--green)] text-[13px]">✓ No drawdown risk alerts — all accounts within safe limits</div></Card>
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
                            <button onClick={async ()=>{
                                await supabase.from('notifications').insert({
                                  user_id: a.user_id,
                                  type: 'breach_warning',
                                  title: '⚠️ Drawdown Warning',
                                  body: `Account ${a.account_number} is approaching drawdown limits. Daily DD: ${a.daily_dd_used}% / Max DD: ${a.max_dd_used}%. Reduce exposure immediately.`,
                                  is_read: false
                                })
                                toast('error','🚨','Alert Sent','Breach warning sent to trader.')
                              }}
                              className="px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.15)] text-[var(--red)] border border-[rgba(255,51,82,.25)]">Notify</button>
                            <button onClick={async ()=>{
                                if (!window.confirm(`Soft-lock account ${a.account_number}? Trader will see a warning but can still view their account.`)) return
                                await supabase.from('accounts').update({ status: 'soft_locked' }).eq('id', a.id)
                                await supabase.from('notifications').insert({
                                  user_id: a.user_id,
                                  type: 'breach_warning',
                                  title: '⚠️ Drawdown Warning — Soft Locked',
                                  body: `Account ${a.account_number} has been flagged by risk management. You are approaching drawdown limits. Reduce exposure immediately or your account may be breached.`,
                                  is_read: false
                                })
                                toast('warning','⚠️','Soft Locked',`${a.account_number} flagged with warning.`)
                              }}
                              className="px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,140,66,.1)] text-[var(--gold)] border border-[rgba(255,140,66,.25)]">Soft Lock</button>
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
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
