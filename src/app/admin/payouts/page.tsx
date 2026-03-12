import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

const QUEUE = [
  { trader:'James Mitchell',  acct:'TFD-100K-4821', amt:'$7,157',  method:'USDT TRC20', wallet:'TRXabc...xyz', ago:'2h', id:'p1' },
  { trader:'Sofia Kowalski',  acct:'TFD-200K-2241', amt:'$31,500', method:'Bitcoin',     wallet:'1BTC...abc',   ago:'4h', id:'p2' },
  { trader:'Marcus Thompson', acct:'TFD-100K-8831', amt:'$12,840', method:'Wise',        wallet:'marcus@wise',  ago:'6h', id:'p3' },
  { trader:'Daniel Moreira',  acct:'TFD-100K-3310', amt:'$5,100',  method:'USDT ERC20',  wallet:'0xabc...123',  ago:'8h', id:'p4' },
]

export function AdminPayoutsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [queue, setQueue] = useState(QUEUE)

  function approve(id: string, trader: string) {
    setQueue(q=>q.filter(p=>p.id!==id))
    toast('success','💰','Approved',`${trader} payout approved.`)
  }
  function reject(id: string) {
    setQueue(q=>q.filter(p=>p.id!==id))
    toast('error','✕','Rejected','Payout rejected and trader notified.')
  }

  return (
    <>
      <DashboardLayout title="Payout Queue" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`Pending Payouts (${queue.length})`}/>
          {queue.length === 0 ? (
            <div className="py-12 text-center text-[var(--text3)]">✓ All payouts processed</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Trader','Account','Amount','Method','Wallet','Wait','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map(p=>(
                  <tr key={p.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                    <td className="px-[11px] py-[8px] font-semibold">{p.trader}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{p.acct}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--green)] font-semibold">{p.amt}</td>
                    <td className="px-[11px] py-[8px] text-[var(--text2)]">{p.method}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[9px] text-[var(--text3)]">{p.wallet}</td>
                    <td className="px-[11px] py-[8px] text-[var(--text3)]">{p.ago} ago</td>
                    <td className="px-[11px] py-[8px]">
                      <div className="flex gap-1">
                        <Button variant="success" size="sm" onClick={()=>approve(p.id,p.trader)}>✓ Approve</Button>
                        <Button variant="danger"  size="sm" onClick={()=>reject(p.id)}>✕ Reject</Button>
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
