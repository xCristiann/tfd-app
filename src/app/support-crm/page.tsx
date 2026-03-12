import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { SUPPORT_NAV } from '@/lib/nav'

const TICKETS = [
  { id:'#4821', subject:'Payout delay — Mar 3',  trader:'James Mitchell', email:'james@tfd.com',   dept:'Billing',   pri:'high',   acct:'TFD-100K-4821', sla:'1h 20m', open:true },
  { id:'#4800', subject:'Platform login issue',   trader:'Yuki Chen',      email:'yuki@email.com',  dept:'Technical', pri:'urgent', acct:'TFD-25K-7712',  sla:'0h 15m', open:true },
  { id:'#4780', subject:'Challenge rules query',  trader:'Lucia Romero',   email:'lucia@email.com', dept:'General',   pri:'medium', acct:'TFD-25K-9910',  sla:'3h 00m', open:false },
]

const MESSAGES = [
  { from:'James Mitchell', role:'trader',  time:'09:41', text:"Hi, I submitted a payout on March 3rd for $3,400 USDT and it's been 48 hours. Can you help?" },
  { from:'Mike Agent',     role:'support', time:'09:55', text:"Hi James! I can see your request in the queue. It got flagged for additional verification. I'll escalate this for you right now." },
  { from:'James Mitchell', role:'trader',  time:'10:02', text:"Thanks. Is there anything I need to do on my end?" },
]

const CANNED = ['Thank you for contacting TFD support. I'm looking into this now.','Your payout is being processed and should arrive within 24 business hours.','Could you please provide your account number so I can investigate further?']

export function SupportCRMPage() {
  const { toasts, toast, dismiss } = useToast()
  const [selected, setSelected] = useState(TICKETS[0])
  const [reply, setReply] = useState('')
  const [msgs, setMsgs] = useState(MESSAGES)

  function sendReply() {
    if (!reply.trim()) return
    setMsgs(m=>[...m,{ from:'Mike Agent', role:'support', time:'Now', text:reply }])
    setReply('')
  }

  function resolve() {
    toast('success','✅','Resolved',`Ticket ${selected.id} resolved.`)
  }

  const priColor: Record<string,string> = {
    urgent:'text-[var(--red)]', high:'text-[var(--orange)]',
    medium:'text-[var(--gold)]', low:'text-[var(--text2)]',
  }

  return (
    <>
      <DashboardLayout title="Support Inbox" nav={SUPPORT_NAV} accentColor="blue">
        <div className="flex gap-[14px] h-[calc(100vh-88px)]">

          {/* Ticket list */}
          <div className="w-[280px] flex-shrink-0 bg-[var(--bg2)] border border-[var(--bdr)] overflow-y-auto">
            <div className="p-3 border-b border-[var(--bdr)]">
              <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                <span className="px-2 flex items-center text-[var(--text3)] text-[11px]">🔍</span>
                <input placeholder="Search tickets…" className="flex-1 py-[7px] bg-transparent outline-none text-[var(--text)] text-[11px] font-sans placeholder-[rgba(230,226,248,.25)]"/>
              </div>
            </div>
            {TICKETS.map(t=>(
              <div key={t.id} onClick={()=>setSelected(t)}
                className={`p-3 border-b border-[rgba(212,168,67,.04)] cursor-pointer transition-colors ${selected.id===t.id?'bg-[rgba(59,158,255,.07)] border-l-2 border-l-[var(--blue)]':'hover:bg-[rgba(255,255,255,.02)]'}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[10px] text-[var(--blue)]">{t.id}</span>
                  <span className={`text-[9px] font-bold capitalize ${priColor[t.pri]}`}>{t.pri}</span>
                </div>
                <div className="text-[11px] font-semibold mb-[2px] truncate">{t.subject}</div>
                <div className="text-[9px] text-[var(--text3)]">{t.trader} · SLA {t.sla}</div>
              </div>
            ))}
          </div>

          {/* Thread */}
          <div className="flex-1 flex flex-col bg-[var(--bg2)] border border-[var(--bdr)] overflow-hidden">
            {/* Thread header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bdr)]">
              <div>
                <div className="font-serif text-[15px] font-semibold">{selected.subject}</div>
                <div className="text-[10px] text-[var(--text3)]">{selected.id} · {selected.trader} · {selected.dept}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="blue" size="sm" onClick={()=>toast('info','👤','Assigned','Ticket assigned to you.')}>Assign to Me</Button>
                <Button variant="success" size="sm" onClick={resolve}>✓ Resolve</Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {msgs.map((m,i)=>(
                <div key={i} className={`max-w-[75%] ${m.role==='support'?'self-end':''}`}>
                  <div className="text-[9px] text-[var(--text3)] mb-1">
                    {m.from} · {m.time}
                  </div>
                  <div className={`px-3 py-[10px] text-[12px] leading-[1.6] ${
                    m.role==='support'
                      ? 'bg-[rgba(59,158,255,.1)] border border-[rgba(59,158,255,.2)] text-[var(--text)]'
                      : 'bg-[var(--bg3)] border border-[var(--bdr)] text-[var(--text2)]'
                  }`}>{m.text}</div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div className="border-t border-[var(--bdr)] p-3">
              {/* Canned responses */}
              <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                {CANNED.map((c,i)=>(
                  <button key={i} onClick={()=>setReply(c)}
                    className="flex-shrink-0 text-[9px] px-[8px] py-[4px] bg-[rgba(59,158,255,.08)] border border-[rgba(59,158,255,.18)] text-[var(--blue)] cursor-pointer hover:bg-[rgba(59,158,255,.15)] transition-colors">
                    Canned {i+1}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                  <textarea value={reply} onChange={e=>setReply(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)sendReply()}}
                    placeholder="Type reply… (Ctrl+Enter to send)"
                    className="flex-1 px-3 py-[8px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans resize-none min-h-[60px] placeholder-[rgba(230,226,248,.25)]"/>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="blue" onClick={sendReply}>Send</Button>
                  <Button variant="ghost" size="sm" onClick={()=>toast('info','📋','Internal','Note saved internally.')}>Note</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Trader profile sidebar */}
          <div className="w-[220px] flex-shrink-0 bg-[var(--bg2)] border border-[var(--bdr)] p-[14px] overflow-y-auto">
            <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-3">Trader Profile</div>
            <div className="text-[13px] font-semibold mb-[2px]">{selected.trader}</div>
            <div className="text-[10px] text-[var(--text3)] mb-3">{selected.email}</div>
            {[['Account',selected.acct],['Department',selected.dept],['SLA Remaining',selected.sla],['Status',selected.open?'Open':'Resolved']].map(([l,v])=>(
              <div key={l} className="flex justify-between py-[5px] border-b border-[var(--dim)] last:border-0">
                <span className="text-[9px] text-[var(--text3)]">{l}</span>
                <span className="font-mono text-[10px] text-[var(--text2)]">{v}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-[var(--bdr)]">
              <Button variant="success" size="sm" className="w-full"
                onClick={()=>toast('success','💰','Payout','Payout approved from here.')}>Approve Payout</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
