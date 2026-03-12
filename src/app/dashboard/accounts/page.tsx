import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { TRADER_NAV } from '@/lib/nav'

const ACCTS = [
  { id:'TFD-100K-4821', type:'$100K Challenge', balance:'$108,420', phase:'funded', dd:'3.21%', profit:'+$8,420', pos:true },
  { id:'TFD-25K-3104',  type:'$25K Challenge',  balance:'$25,800',  phase:'phase2', dd:'1.8%',  profit:'+$800',   pos:true },
]

export function AccountsPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  return (
    <>
      <DashboardLayout title="Accounts" nav={TRADER_NAV} accentColor="gold">
        <Card>
          <CardHeader title="All Accounts" action={
            <Button size="sm" onClick={()=>toast('info','🎯','Challenge','Redirecting to purchase…')}>+ Buy Challenge</Button>
          }/>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--dim)]">
                {['Account ID','Type','Balance','Status','DD Used','Profit','Actions'].map(h=>(
                  <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACCTS.map((a,i)=>(
                <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                  <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{a.id}</td>
                  <td className="px-[11px] py-[8px]">{a.type}</td>
                  <td className="px-[11px] py-[8px] font-mono">{a.balance}</td>
                  <td className="px-[11px] py-[8px]"><Badge variant={a.phase as any}>{a.phase}</Badge></td>
                  <td className={`px-[11px] py-[8px] font-mono ${a.pos?'text-[var(--green)]':''}`}>{a.dd}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${a.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{a.profit}</td>
                  <td className="px-[11px] py-[8px]">
                    <Button variant="ghost" size="sm" onClick={()=>navigate('/platform')}>Trade</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
