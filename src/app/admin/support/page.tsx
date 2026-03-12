import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { ADMIN_NAV } from '@/lib/nav'

const TICKETS = [
  { id:'#4821', subject:'Payout delay — Mar 3',   trader:'James Mitchell', dept:'Billing',   pri:'high',   status:'open',   ago:'2h' },
  { id:'#4800', subject:'Platform login issue',    trader:'Yuki Chen',      dept:'Technical', pri:'urgent', status:'open',   ago:'4h' },
  { id:'#4780', subject:'Challenge rules query',   trader:'Lucia Romero',   dept:'General',   pri:'medium', status:'open',   ago:'1d' },
  { id:'#4760', subject:'KYC document reupload',   trader:'Daniel Moreira', dept:'Account',   pri:'low',    status:'open',   ago:'2d' },
]

const priColor: Record<string,string> = {
  urgent:'text-[var(--red)]', high:'text-[var(--orange)]',
  medium:'text-[var(--gold)]', low:'text-[var(--text2)]',
}

export function AdminSupportPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  return (
    <>
      <DashboardLayout title="Support Tickets" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title="All Open Tickets" action={
            <Button variant="ghost" size="sm" onClick={()=>navigate('/support-crm')}>Open CRM →</Button>
          }/>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--dim)]">
                {['ID','Subject','Trader','Dept','Priority','Status','Time','Actions'].map(h=>(
                  <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TICKETS.map(t=>(
                <tr key={t.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)] cursor-pointer">
                  <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{t.id}</td>
                  <td className="px-[11px] py-[8px] font-semibold">{t.subject}</td>
                  <td className="px-[11px] py-[8px] text-[var(--text2)]">{t.trader}</td>
                  <td className="px-[11px] py-[8px] text-[var(--text2)]">{t.dept}</td>
                  <td className={`px-[11px] py-[8px] font-semibold capitalize ${priColor[t.pri]}`}>{t.pri}</td>
                  <td className="px-[11px] py-[8px]"><Badge variant="open">{t.status}</Badge></td>
                  <td className="px-[11px] py-[8px] text-[10px] text-[var(--text3)]">{t.ago} ago</td>
                  <td className="px-[11px] py-[8px]">
                    <Button variant="ghost" size="sm" onClick={()=>toast('info','💬','Reply',`Opening ${t.id}`)}>Reply</Button>
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
