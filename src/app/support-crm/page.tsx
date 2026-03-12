import { useEffect, useState, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { SUPPORT_NAV } from '@/lib/nav'

const PRI_COLOR: Record<string,string> = {
  urgent:'text-[var(--red)]', high:'text-[var(--orange,#ff8c42)]',
  medium:'text-[var(--gold)]', low:'text-[var(--text2)]',
}
const STATUS_VARIANT: Record<string,any> = {
  open:'open', pending:'warning', resolved:'funded', closed:'breached'
}

export function SupportCRMPage() {
  const { toasts, toast, dismiss } = useToast()
  const { profile } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [allTickets, setAllTickets] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('open')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const msgEnd = useRef<HTMLDivElement>(null)

  // Load ALL tickets without join first
  useEffect(() => {
    setLoading(true)
    supabase.from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('tickets error:', error); setLoading(false); return }
        const all = data ?? []
        setAllTickets(all)
        const filtered = filter === 'all' ? all : all.filter(t => t.status === filter)
        setTickets(filtered)
        if (filtered.length > 0) setSelected(filtered[0])
        setLoading(false)
      })
  }, [])

  // Apply filter locally - no new DB call needed
  useEffect(() => {
    const filtered = filter === 'all' ? allTickets : allTickets.filter(t => t.status === filter)
    const searched = search
      ? filtered.filter(t => t.subject?.toLowerCase().includes(search.toLowerCase()))
      : filtered
    setTickets(searched)
    if (searched.length > 0 && (!selected || !searched.find(t => t.id === selected?.id))) {
      setSelected(searched[0])
    }
  }, [filter, search, allTickets])

  // Load messages - without join to avoid RLS issues
  useEffect(() => {
    if (!selected) return
    supabase.from('ticket_messages')
      .select('*')
      .eq('ticket_id', selected.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('messages error:', error)
        setMessages(data ?? [])
      })

    const sub = supabase.channel(`crm-ticket-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ticket_messages',
        filter: `ticket_id=eq.${selected.id}`
      }, (payload) => {
        setMessages(m => [...m, payload.new])
      }).subscribe()
    return () => { sub.unsubscribe() }
  }, [selected?.id])

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendReply(internal = false) {
    if (!reply.trim() || !selected || !profile) return
    setSending(true)
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selected.id,
      sender_id: profile.id,
      body: reply,
      is_internal: internal,
    })
    if (error) { toast('error','❌','Error', error.message); setSending(false); return }
    setReply('')
    if (!internal) {
      await supabase.from('support_tickets').update({
        status: 'pending', updated_at: new Date().toISOString()
      }).eq('id', selected.id)
      const updated = allTickets.map(t => t.id === selected.id ? { ...t, status: 'pending' } : t)
      setAllTickets(updated)
      setSelected((s: any) => ({ ...s, status: 'pending' }))
    }
    setSending(false)
  }

  async function updateStatus(status: string) {
    if (!selected) return
    await supabase.from('support_tickets').update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
    }).eq('id', selected.id)
    const updated = allTickets.map(t => t.id === selected.id ? { ...t, status } : t)
    setAllTickets(updated)
    setSelected((s: any) => ({ ...s, status }))
    toast('success','✅','Updated', `Ticket marked ${status}.`)
  }

  const CANNED = [
    "Thank you for reaching out. I'm looking into this now.",
    "Your payout is being processed and will arrive within 24 business hours.",
    "Could you please provide your account number so I can investigate further?",
    "This has been escalated to our senior team. You'll hear back within 2 hours.",
  ]

  return (
    <>
      <DashboardLayout title="Support Inbox" nav={SUPPORT_NAV} accentColor="blue">
        <div className="flex gap-[14px] h-[calc(100vh-88px)]">

          {/* Ticket list */}
          <div className="w-[280px] flex-shrink-0 bg-[var(--bg2)] border border-[var(--bdr)] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[var(--bdr)]">
              <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] mb-2">
                <span className="px-2 flex items-center text-[var(--text3)] text-[11px]">🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tickets…"
                  className="flex-1 py-[7px] bg-transparent outline-none text-[var(--text)] text-[11px] placeholder-[rgba(230,226,248,.25)]"/>
              </div>
              <div className="flex gap-[2px]">
                {['open','pending','resolved','all'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex-1 py-[4px] text-[7px] tracking-[1px] uppercase font-bold cursor-pointer border transition-all ${
                      filter === f
                        ? 'bg-[rgba(59,158,255,.15)] border-[rgba(59,158,255,.3)] text-[#3b9eff]'
                        : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                    }`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#3b9eff] border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-[var(--text3)]">
                  No {filter} tickets
                </div>
              ) : tickets.map(t => (
                <div key={t.id} onClick={() => setSelected(t)}
                  className={`p-3 border-b border-[rgba(212,168,67,.04)] cursor-pointer transition-colors ${
                    selected?.id === t.id
                      ? 'bg-[rgba(59,158,255,.07)] border-l-2 border-l-[#3b9eff]'
                      : 'hover:bg-[rgba(255,255,255,.02)]'
                  }`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[10px] text-[#3b9eff]">
                      {t.ticket_number ?? `#${t.id.slice(0,6)}`}
                    </span>
                    <span className={`text-[9px] font-bold capitalize ${PRI_COLOR[t.priority] ?? ''}`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold mb-[2px] truncate">{t.subject}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-[var(--text3)]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant={STATUS_VARIANT[t.status] ?? 'open'} className="text-[7px]">{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-[var(--bdr)] text-center text-[9px] text-[var(--text3)]">
              {allTickets.length} total tickets
            </div>
          </div>

          {/* Thread */}
          {!selected ? (
            <div className="flex-1 flex items-center justify-center bg-[var(--bg2)] border border-[var(--bdr)] text-[var(--text3)] text-[12px]">
              Select a ticket to view
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-[var(--bg2)] border border-[var(--bdr)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bdr)]">
                <div>
                  <div className="font-serif text-[15px] font-semibold">{selected.subject}</div>
                  <div className="text-[10px] text-[var(--text3)]">
                    {selected.ticket_number ?? `#${selected.id.slice(0,8)}`} · {selected.department} · {selected.priority}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={STATUS_VARIANT[selected.status] ?? 'open'}>{selected.status}</Badge>
                  {selected.status !== 'resolved' && (
                    <Button variant="success" size="sm" onClick={() => updateStatus('resolved')}>✓ Resolve</Button>
                  )}
                  {selected.status !== 'closed' && (
                    <Button variant="danger" size="sm" onClick={() => updateStatus('closed')}>Close</Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="text-center text-[11px] text-[var(--text3)] py-8">No messages yet</div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.sender_id === profile?.id
                  return (
                    <div key={i} className={`max-w-[75%] ${isMe ? 'self-end' : ''}`}>
                      <div className="text-[9px] text-[var(--text3)] mb-1">
                        {isMe ? 'You' : 'Trader'} · {new Date(m.created_at).toLocaleTimeString()}
                        {m.is_internal && <span className="ml-1 text-[var(--gold)]">· Internal Note</span>}
                      </div>
                      <div className={`px-3 py-[10px] text-[12px] leading-[1.6] ${
                        m.is_internal
                          ? 'bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.2)] text-[var(--text2)]'
                          : isMe
                            ? 'bg-[rgba(59,158,255,.1)] border border-[rgba(59,158,255,.2)] text-[var(--text)]'
                            : 'bg-[var(--bg3)] border border-[var(--bdr)] text-[var(--text2)]'
                      }`}>{m.body}</div>
                    </div>
                  )
                })}
                <div ref={msgEnd}/>
              </div>

              {/* Reply box */}
              <div className="border-t border-[var(--bdr)] p-3">
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  {CANNED.map((c, i) => (
                    <button key={i} onClick={() => setReply(c)}
                      className="flex-shrink-0 text-[9px] px-[8px] py-[4px] bg-[rgba(59,158,255,.08)] border border-[rgba(59,158,255,.18)] text-[#3b9eff] cursor-pointer hover:bg-[rgba(59,158,255,.15)] transition-colors">
                      Canned {i + 1}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                    <textarea value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendReply() }}
                      placeholder="Type reply… (Ctrl+Enter to send)"
                      className="w-full px-3 py-[8px] bg-transparent outline-none text-[var(--text)] text-[12px] resize-none min-h-[60px] placeholder-[rgba(230,226,248,.25)]"/>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="blue" onClick={() => sendReply(false)} loading={sending}>Send</Button>
                    <Button variant="ghost" size="sm" onClick={() => sendReply(true)}>Note</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ticket info sidebar */}
          {selected && (
            <div className="w-[200px] flex-shrink-0 bg-[var(--bg2)] border border-[var(--bdr)] p-[14px] overflow-y-auto">
              <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-3">Ticket Info</div>
              {[
                ['ID', selected.ticket_number ?? selected.id.slice(0,8)],
                ['Department', selected.department],
                ['Priority', selected.priority],
                ['Status', selected.status],
                ['Messages', String(messages.length)],
                ['Opened', new Date(selected.created_at).toLocaleDateString()],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-[5px] border-b border-[var(--dim)] last:border-0">
                  <span className="text-[9px] text-[var(--text3)]">{l}</span>
                  <span className="font-mono text-[10px] text-[var(--text2)] capitalize">{v}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-[var(--bdr)] flex flex-col gap-2">
                {selected.status !== 'resolved' && (
                  <Button variant="success" size="sm" className="w-full" onClick={() => updateStatus('resolved')}>
                    ✓ Resolve
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => updateStatus('closed')}>
                  Close Ticket
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
