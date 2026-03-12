import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { TRADER_NAV } from '@/lib/nav'

const TICKETS = [
  { id:'#4821', subject:'Payout delay — Mar 3', status:'open',     ago:'2h ago' },
  { id:'#4780', subject:'Password reset issue', status:'paid',     ago:'3 days ago' },
]

export function DashboardSupportPage() {
  const { toasts, toast, dismiss } = useToast()
  const [subject, setSubject] = useState('')
  const [dept, setDept]       = useState('Technical Support')
  const [msg, setMsg]         = useState('')

  function submit() {
    if (!subject || !msg) { toast('warning','⚠️','Missing Info','Fill in subject and message.'); return }
    toast('success','✅','Ticket Created','We will reply within 4 hours.')
    setSubject(''); setMsg('')
  }

  const wrap = "flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors"
  const inp = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[rgba(230,226,248,.25)] text-[12px] font-sans"

  return (
    <>
      <DashboardLayout title="Support" nav={TRADER_NAV} accentColor="gold">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="Open Ticket"/>
            <div className="flex flex-col gap-3">
              {[['Subject','text',subject,setSubject,'e.g. Payout not received']].map(([l,t,v,set,ph]:any)=>(
                <div key={l} className="flex flex-col gap-1">
                  <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{l}</label>
                  <div className={wrap}><input type={t} value={v} onChange={e=>set(e.target.value)} placeholder={ph} className={inp}/></div>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Department</label>
                <div className={wrap}>
                  <select value={dept} onChange={e=>setDept(e.target.value)} style={{background:'transparent'}} className={inp + " cursor-pointer"}>
                    <option>Technical Support</option><option>Billing / Payouts</option>
                    <option>Account Issues</option><option>Challenge Rules</option><option>General</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Message</label>
                <div className={wrap}><textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Describe your issue…" className={inp + " resize-y min-h-[90px]"}/></div>
              </div>
              <Button onClick={submit} className="w-full">Submit Ticket</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="My Tickets"/>
            <table className="w-full border-collapse text-[11px] mb-3">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['ID','Subject','Status','Updated'].map(h=><th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {TICKETS.map(t=>(
                  <tr key={t.id} onClick={()=>toast('info','💬',t.id,'Agent reviewing. ETA: 2 hours.')}
                    className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)] cursor-pointer">
                    <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{t.id}</td>
                    <td className="px-[11px] py-[8px]">{t.subject}</td>
                    <td className="px-[11px] py-[8px]"><Badge variant={t.status==='open'?'open':'paid'}>{t.status}</Badge></td>
                    <td className="px-[11px] py-[8px] text-[10px] text-[var(--text3)]">{t.ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-[var(--bg3)] border border-[var(--dim)] p-[11px]">
              <div className="text-[9px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-2">Quick Links</div>
              {[['Challenge Rules FAQ','📚'],['Payout Processing Times','💸'],['Live Chat','💬']].map(([l,ico])=>(
                <div key={l} onClick={()=>toast('info',ico,l,'Loading...')}
                  className="text-[11px] text-[var(--gold)] cursor-pointer mb-[5px] hover:underline">→ {l}</div>
              ))}
            </div>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
