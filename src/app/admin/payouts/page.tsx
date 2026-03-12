import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

const STATUS_VARIANT: Record<string,any> = { pending:'warning', approved:'blue', processing:'blue', paid:'funded', rejected:'breached', cancelled:'breached' }

export function AdminPayoutsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    let q = supabase.from('payouts')
      .select('*, users(first_name,last_name,email), accounts(account_number)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    q.then(({ data }) => { setPayouts(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [filter])

  async function updateStatus(id: string, status: string, traderName: string) {
    const { error } = await supabase.from('payouts').update({
      status,
      ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}),
      ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    if (error) { toast('error','❌','Error', error.message); return }
    setPayouts(ps => ps.map(p => p.id === id ? { ...p, status } : p))
    toast('success','✅',status === 'paid' ? 'Paid' : 'Updated', `${traderName} payout marked as ${status}.`)
  }

  return (
    <>
      <DashboardLayout title="Payout Management" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`Payouts (${payouts.length})`}/>
          <div className="flex gap-[3px] mb-4">
            {['pending','approved','paid','rejected','all'].map(s=>(
              <button key={s} onClick={()=>{ setFilter(s); setLoading(true) }}
                className={`px-[10px] py-[5px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                  filter===s ? 'bg-[rgba(212,168,67,.1)] border-[var(--bdr2)] text-[var(--gold)]' : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                }`}>{s}</button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
          ) : payouts.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[var(--text3)]">No {filter} payouts</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Trader','Account','Amount','Method','Wallet','Status','Date','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(255,51,82,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p=>(
                  <tr key={p.id} className="border-b border-[rgba(255,51,82,.04)] hover:bg-[rgba(255,51,82,.02)]">
                    <td className="px-[11px] py-[8px] font-semibold">{p.users?.first_name} {p.users?.last_name}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--gold)] text-[10px]">{p.accounts?.account_number}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--green)]">{fmt(p.requested_usd)}</td>
                    <td className="px-[11px] py-[8px] text-[var(--text2)]">{p.method}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--text3)] text-[10px] max-w-[100px] truncate">{p.wallet_address}</td>
                    <td className="px-[11px] py-[8px]"><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></td>
                    <td className="px-[11px] py-[8px] text-[10px] text-[var(--text3)]">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-[11px] py-[8px]">
                      <div className="flex gap-1">
                        {p.status === 'pending' && (<>
                          <button onClick={()=>updateStatus(p.id,'approved',`${p.users?.first_name}`)}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(0,217,126,.1)] text-[var(--green)] border border-[rgba(0,217,126,.2)]">Approve</button>
                          <button onClick={()=>updateStatus(p.id,'rejected',`${p.users?.first_name}`)}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">Reject</button>
                        </>)}
                        {p.status === 'approved' && (
                          <button onClick={()=>updateStatus(p.id,'paid',`${p.users?.first_name}`)}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">Mark Paid</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
