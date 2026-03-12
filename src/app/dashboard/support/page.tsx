import { useEffect, useState, useRef } from 'react'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

const STATUS_VARIANT: Record<string,any> = {
  open:'open', pending:'warning', resolved:'funded', closed:'breached'
}

export function DashboardSupportPage() {
  const { toasts, toast, dismiss } = useToast()
  const { profile } = useAuth()

  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [view, setView] = useState<'list'|'thread'|'new'>('list')
  const msgEnd = useRef<HTMLDivElement>(null)

  // New ticket form
  const [subject, setSubject] = useState('')
  const [dept, setDept] = useState('general')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!profile) return
    loadTickets()
  }, [profile?.id])

  async function loadTickets() {
    if (!profile) return
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
  }

  async function openTicket(ticket: any) {
    setSelectedTicket(ticket)
    setView('thread')

    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])

    // Realtime
    const sub = supabase.channel(`trader-ticket-${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticket.id}`
      }, (payload) => {
        if (!payload.new.is_internal) {
          setMessages(m => [...m, payload.new])
        }
      }).subscribe()

    return () => sub.unsubscribe()
  }

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendReply() {
    if (!reply.trim() || !selectedTicket || !profile) return
    setSendingReply(true)
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: profile.id,
      body: reply,
      is_internal: false,
    })
    if (error) { toast('error','❌','Error', error.message) }
    else {
      setMessages(m => [...m, {
        id: Date.now(),
        ticket_id: selectedTicket.id,
        sender_id: profile.id,
        body: reply,
        is_internal: false,
        created_at: new Date().toISOString(),
      }])
      setReply('')
      await supabase.from('support_tickets')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id)
    }
    setSendingReply(false)
  }

  async function submitNewTicket() {
    if (!subject || !msg) { toast('warning','⚠️','Missing','Fill in subject and message.'); return }
    if (!profile) return
    setSubmitting(true)

    const { data: ticket, error } = await supabase
      .from('support_tickets').insert({
        user_id: profile.id,
        subject,
        department: dept,
        priority: 'medium',
        status: 'open',
      }).select().single()

    if (error) { toast('error','❌','Error', error.message); setSubmitting(false); return }

    await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: profile.id,
      body: msg,
      is_internal: false,
    })

    setTickets(t => [ticket, ...t])
    setSubject(''); setMsg('')
    setSubmitting(false)
    toast('success','✅','Ticket Created','We will reply within 4 hours.')
    setView('list')
  }

  const wrap = "flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors"
  const inp = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[rgba(230,226,248,.25)] text-[12px]"

  return (
    <>
      <DashboardLayout title="Support" nav={TRADER_NAV} accentColor="gold">

        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-[3px]">
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setSelectedTicket(null) }}
                className="px-3 py-[5px] text-[9px] tracking-[1px] uppercase font-bold border border-[var(--dim)] text-[var(--text3)] bg-transparent cursor-pointer">
                ← Back
              </button>
            )}
          </div>
          {view === 'list' && (
            <Button onClick={() => setView('new')}>+ New Ticket</Button>
          )}
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <Card>
            <CardHeader title={`My Tickets (${tickets.length})`}/>
            {tickets.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-[32px] mb-3">🎫</div>
                <p className="text-[12px] text-[var(--text2)] mb-4">No support tickets yet.</p>
                <Button onClick={() => setView('new')}>Open a Ticket</Button>
              </div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--dim)]">
                    {['Ticket #','Subject','Department','Status','Date',''].map(h => (
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)] cursor-pointer" onClick={() => openTicket(t)}>
                      <td className="px-[11px] py-[9px] font-mono text-[var(--gold)]">{t.ticket_number ?? `#${t.id.slice(0,6)}`}</td>
                      <td className="px-[11px] py-[9px] font-medium max-w-[200px] truncate">{t.subject}</td>
                      <td className="px-[11px] py-[9px] text-[var(--text3)] capitalize">{t.department}</td>
                      <td className="px-[11px] py-[9px]"><Badge variant={STATUS_VARIANT[t.status]??'open'}>{t.status}</Badge></td>
                      <td className="px-[11px] py-[9px] text-[10px] text-[var(--text3)]">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-[11px] py-[9px] text-[var(--gold)] text-[10px]">View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}

        {/* NEW TICKET VIEW */}
        {view === 'new' && (
          <Card>
            <CardHeader title="Open New Ticket"/>
            <div className="flex flex-col gap-4 max-w-[600px]">
              <div>
                <label className="block text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1">Subject</label>
                <div className={wrap}><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Payout not received" className={inp}/></div>
              </div>
              <div>
                <label className="block text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1">Department</label>
                <div className={wrap}>
                  <select value={dept} onChange={e => setDept(e.target.value)} style={{background:'transparent'}} className={inp + " cursor-pointer"}>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing / Payouts</option>
                    <option value="account">Account Issues</option>
                    <option value="rules">Challenge Rules</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1">Message</label>
                <div className={wrap}><textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Describe your issue in detail…" className={inp + " resize-y min-h-[120px]"}/></div>
              </div>
              <Button loading={submitting} onClick={submitNewTicket} className="w-full">Submit Ticket</Button>
            </div>
          </Card>
        )}

        {/* THREAD VIEW */}
        {view === 'thread' && selectedTicket && (
          <div className="flex flex-col gap-[14px]">
            {/* Ticket info */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-[16px] font-semibold">{selectedTicket.subject}</div>
                  <div className="text-[10px] text-[var(--text3)] mt-1">
                    {selectedTicket.ticket_number ?? `#${selectedTicket.id.slice(0,8)}`} · {selectedTicket.department} · Opened {new Date(selectedTicket.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[selectedTicket.status]??'open'}>{selectedTicket.status}</Badge>
              </div>
            </Card>

            {/* Messages thread */}
            <Card>
              <div className="flex flex-col gap-3 min-h-[300px] max-h-[500px] overflow-y-auto mb-4 pr-1">
                {messages.length === 0 && (
                  <div className="text-center text-[11px] text-[var(--text3)] py-8">No messages yet</div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.sender_id === profile?.id
                  return (
                    <div key={i} className={`max-w-[75%] ${isMe ? 'self-end ml-auto' : 'self-start'}`}>
                      <div className="text-[9px] text-[var(--text3)] mb-1">
                        {isMe ? 'You' : 'TFD Support'} · {new Date(m.created_at).toLocaleString()}
                      </div>
                      <div className={`px-4 py-3 text-[12px] leading-[1.7] ${
                        isMe
                          ? 'bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.2)] text-[var(--text)]'
                          : 'bg-[rgba(59,158,255,.08)] border border-[rgba(59,158,255,.2)] text-[var(--text)]'
                      }`}>
                        {m.body}
                      </div>
                    </div>
                  )
                })}
                <div ref={msgEnd}/>
              </div>

              {/* Reply box */}
              {selectedTicket.status !== 'closed' && (
                <div className="border-t border-[var(--bdr)] pt-4 flex gap-3">
                  <div className="flex-1 flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendReply() }}
                      placeholder="Reply to this ticket… (Ctrl+Enter to send)"
                      className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] text-[12px] resize-none min-h-[70px] placeholder-[rgba(230,226,248,.25)]"
                    />
                  </div>
                  <Button variant="gold" onClick={sendReply} loading={sendingReply} className="self-end">Send</Button>
                </div>
              )}
              {selectedTicket.status === 'closed' && (
                <div className="border-t border-[var(--bdr)] pt-4 text-center text-[11px] text-[var(--text3)]">
                  This ticket is closed. <button onClick={() => setView('new')} className="text-[var(--gold)] cursor-pointer bg-transparent border-none underline">Open a new ticket</button>
                </div>
              )}
            </Card>
          </div>
        )}

      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
