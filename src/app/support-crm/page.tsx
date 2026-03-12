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

export function SupportCRMPage() {
  const { toasts, toast, dismiss } = useToast()
  const { profile } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('open')
  const [sending, setSending] = useState(false)
  const msgEnd = useRef<HTMLDivElement>(null)

  // Load tickets
  useEffect(() => {
    let q = supabase.from('support_tickets')
      .select('*, users(first_name, last_name, email, country)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    q.then(({ data, error }) => {
      if (error) { console.error(error); return }
      setTickets(data ?? [])
      if (data && data.length > 0 && !selected) setSelected(data[0])
    })
  }, [filter])

  // Load messages for selected ticket
  useEffect(() => {
    if (!selected) return
    supabase.from('ticket_messages')
      .select('*, users(first_name, last_name, role)')
      .eq('ticket_id', selected.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))

    // Realtime subscription
    const sub = supabase.channel(`ticket-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ticket_messages',
        filter: `ticket_id=eq.${selected.id}`
      }, async (payload) => {
        const { data } = await supabase.from('ticket_messages')
          .select('*, users(first_name, last_name, role)')
          .eq('id', payload.new.id).single()
        if (data) setMessages(m => [...m, data])
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
    if (error) toast('error','❌','Error', error.message)
    else {
      setReply('')
      if (!internal) {
        await supabase.from('support_tickets').update({
          status: 'pending', updated_at: new Date().toISOString()
        }).eq('id', selected.id)
        setSelected((s: any) => ({ ...s, status: 'pending' }))
        setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status: 'pending' } : t))
      }
    }
    setSending(false)
  }

  async function updateStatus(status: string) {
    if (!selected) return
    await supabase.from('support_tickets').update({
      status, updated_at: new Date().toISOString(),
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
    }).eq('id', selected.id)
    setSelected((s: any) => ({ ...s, status }))
    setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status } : t))
    toast('success','✅','Updated',`Ticket marked ${status}.`)
  }

  const filtered = tickets.filter(t =>
    !search ||
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    `${t.users?.first_name} ${t.users?.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <DashboardLayout title="Support Inbox" nav={SUPPORT_NAV} accentColor="blue">
        <div className="flex gap-[14px] h-[calc(100vh-88px)]">

          {/* Ticket list */}
          <div className="w-[280px] flex-shrink-0 bg-[var(--bg2)] border border-[var(--bdr)] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[var(--bdr)]">
              <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors mb-2">
                <span className="px-2 flex items-center text-[var(--text3)] text-[11px]">🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tickets…"
                  className="flex-1 py-[7px] bg-transparent outline-none text-[var(--text)] text-[11px] font-sans placeholder-[rgba(230,226,248,.25)]"/>
              </div>
              <div className="flex gap-[2px]">
                {['open','pending','resolved','all'].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    className={`flex-1 py-[4px] text-[7px] tracking-[1px] uppercase font-bold cursor-pointer border transition-all ${
                      filter===f ? 'bg-[rgba(59,158,255,.15)] border-[rgba(59,158,255,.3)] text-[var(--blue,#3b9eff)]' : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                    }`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-[var(--text3)]">No tickets</div>
              ) : filtered.map(t=>(
                <div key={t.id} onClick={()=>setSelected(t)}
                  className={`p-3 border-b border-[rgba(212,168,67,.04)] cursor-pointer transition-colors ${
                    selected?.id===t.id ? 'bg-[rgba(59,158,255,.07)] border-l-2 border-l-[var(--blue,#3b9eff)]' : 'hover:bg-[rgba(255,255,255,.02)]'
                  }`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-[10px] text-[var(--blue,#3b9eff)]">{t.ticket_number ?? t.id.slice(0,8)}</span>
                    <span className={`text-[9px] font-bold capitalize ${PRI_COLOR[t.priority]??''}`}>{t.priority}</span>
                  </div>
                  <div className="text-[11px] font-semibold mb-[2px] truncate">{t.subject}</div>
                  <div className="text-[9px] text-[var(--text3)]">
                    {t.users?.first_name} {t.users?.last_name} · {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thread */}
          {!selected ? (
            <div className="flex-1 flex items-center justify-center bg-[var(--bg2)] border border-[var(--bdr)] text-[var(--text3)]">
              Select a ticket to view
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-[var(--bg2)] border border-[var(--bdr)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bdr)]">
                <div>
                  <div className="font-serif text-[15px] font-semibold">{selected.subject}</div>
                  <div className="text-[10px] text-[var(--text3)]">
                    {selected.ticket_number ?? selected.id.slice(0,8)} · {selected.users?.first_name} {selected.users?.last_name} · {selected.department}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={selected.status==='open'?'open':selected.status==='resolved'?'funded':'warning'}>{selected.status}</Badge>
                  {selected.status !== 'resolved' && (
                    <Button variant="success" size="sm" onClick={()=>updateStatus('resolved')}>✓ Resolve</Button>
                  )}
                  {selected.status !== 'closed' && (
                    <Button variant="danger" size="sm" onClick={()=>updateStatus('closed')}>Close</Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="text-center text-[11px] text-[var(--text3)]">No messages yet</div>
                )}
                {messages.map((m,i)=>{
                  const isSupport = m.users?.role === 'support' || m.users?.role === 'admin'
                  return (
                    <div key={i} className={`max-w-[75%] ${isSupport ? 'self-end' : ''}`}>
                      <div className="text-[9px] text-[var(--text3)] mb-1">
                        {m.users?.first_name} {m.users?.last_name} · {new Date(m.created_at).toLocaleTimeString()}
                        {m.is_internal && <span className="ml-1 text-[var(--gold)]">· Internal Note</span>}
                      </div>
                      <div className={`px-3 py-[10px] text-[12px] leading-[1.6] ${
                        m.is_internal
                          ? 'bg-[rgba(212,168,67,.08)] border border-[rgba(212,168,67,.2)] text-[var(--text2)]'
                          : isSupport
                            ? 'bg-[rgba(59,158,255,.1)] border border-[rgba(59,158,255,.2)] text-[var(--text)]'
                            : 'bg-[var(--bg3)] border border-[var(--bdr)] text-[var(--text2)]'
                      }`}>{m.body}</div>
                    </div>
                  )
                })}
                <div ref={msgEnd}/>
              </div>

              <div className="border-t border-[var(--bdr)] p-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                    <textarea value={reply} onChange={e=>setReply(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter' && e.ctrlKey) sendReply() }}
                      placeholder="Type reply… (Ctrl+Enter to send)"
                      className="flex-1 px-3 py-[8px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans resize-none min-h-[60px] placeholder-[rgba(230,226,248,.25)]"/>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="blue" onClick={()=>sendReply(false)} loading={sending}>Send</Button>
                    <Button variant="ghost" size="sm" onClick={()=>sendReply(true)}>Note</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trader sidebar */}
          {selected && (
            <div className="w-[220px] flex-shrink-0 bg-[var(--bg2)] border border-[var(--bdr)] p-[14px] overflow-y-auto">
              <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-3">Trader Profile</div>
              <div className="text-[13px] font-semibold mb-[2px]">{selected.users?.first_name} {selected.users?.last_name}</div>
              <div className="text-[10px] text-[var(--text3)] mb-3">{selected.users?.email}</div>
              {[
                ['Country', selected.users?.country ?? '—'],
                ['Department', selected.department],
                ['Priority', selected.priority],
                ['Status', selected.status],
                ['Opened', new Date(selected.created_at).toLocaleDateString()],
              ].map(([l,v])=>(
                <div key={l} className="flex justify-between py-[5px] border-b border-[var(--dim)] last:border-0">
                  <span className="text-[9px] text-[var(--text3)]">{l}</span>
                  <span className="font-mono text-[10px] text-[var(--text2)] capitalize">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
