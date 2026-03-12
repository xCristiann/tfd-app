import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

const STATUS_VARIANT: Record<string,any> = { open:'open', pending:'warning', resolved:'funded', closed:'breached' }

export function DashboardSupportPage() {
  const { toasts, toast, dismiss } = useToast()
  const { profile } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [subject, setSubject] = useState('')
  const [dept, setDept] = useState('general')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase.from('support_tickets').select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setTickets(data ?? []))
  }, [profile?.id])

  async function submit() {
    if (!subject || !msg) { toast('warning','⚠️','Missing Info','Fill in subject and message.'); return }
    if (!profile) return
    setLoading(true)

    // Step 1: create ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets').insert({
        user_id: profile.id,
        subject,
        department: dept,
        priority: 'medium',
        status: 'open',
      }).select().single()

    if (ticketErr) { toast('error','❌','Error', ticketErr.message); setLoading(false); return }

    // Step 2: insert first message into ticket_messages
    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: profile.id,
      body: msg,
      is_internal: false,
    })

    setTickets(t => [ticket, ...t])
    setSubject(''); setMsg('')
    setLoading(false)
    toast('success','✅','Ticket Created','We will reply within 4 hours.')
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
              <div className="flex flex-col gap-1">
                <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Subject</label>
                <div className={wrap}><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Payout not received" className={inp}/></div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Department</label>
                <div className={wrap}>
                  <select value={dept} onChange={e=>setDept(e.target.value)} style={{background:'transparent'}} className={inp + " cursor-pointer"}>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing / Payouts</option>
                    <option value="account">Account Issues</option>
                    <option value="rules">Challenge Rules</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Message</label>
                <div className={wrap}><textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Describe your issue…" className={inp + " resize-y min-h-[90px]"}/></div>
              </div>
              <Button loading={loading} onClick={submit} className="w-full">Submit Ticket</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title={`My Tickets (${tickets.length})`}/>
            {tickets.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[var(--text3)]">No tickets yet</div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--dim)]">
                    {['Ticket #','Subject','Status','Date'].map(h=>(
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t=>(
                    <tr key={t.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                      <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{t.ticket_number ?? t.id.slice(0,8)}</td>
                      <td className="px-[11px] py-[8px] max-w-[140px] truncate">{t.subject}</td>
                      <td className="px-[11px] py-[8px]"><Badge variant={STATUS_VARIANT[t.status]??'open'}>{t.status}</Badge></td>
                      <td className="px-[11px] py-[8px] text-[10px] text-[var(--text3)]">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
