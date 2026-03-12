import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { SUPPORT_NAV } from '@/lib/nav'

const CANNED = [
  { cat:'Greeting',  title:'Welcome greeting',         body:"Thank you for contacting The Funded Diaries support. I'm here to help — let me look into this for you right away." },
  { cat:'Payouts',   title:'Payout processing info',   body:"Your payout request is being processed. Standard processing time is 24 business hours from approval. Crypto payouts typically arrive within 1–2 hours of dispatch." },
  { cat:'Payouts',   title:'Payout approved',          body:"Great news! Your payout has been approved and dispatched. Please allow 1–4 hours for the transaction to appear in your wallet." },
  { cat:'Technical', title:'Request account number',   body:"To investigate this further, could you please provide your TFD account number (format: TFD-XXXK-XXXX)? You can find it in your dashboard." },
  { cat:'Rules',     title:'Challenge rules reminder', body:"As a reminder, the challenge rules require maintaining daily drawdown below the limit and trading for the minimum required days. Full rules are in your dashboard." },
  { cat:'Closing',   title:'Closing — resolved',       body:"I'm glad we could resolve this for you! Is there anything else I can help you with? We aim to respond within 4 hours on business days." },
]

const cats = [...new Set(CANNED.map(c=>c.cat))]

export function CannedResponsesPage() {
  const { toasts, toast, dismiss } = useToast()
  const [filter, setFilter] = useState('All')

  const filtered = filter==='All' ? CANNED : CANNED.filter(c=>c.cat===filter)

  return (
    <>
      <DashboardLayout title="Canned Responses" nav={SUPPORT_NAV} accentColor="blue">
        <Card>
          <div className="flex justify-between items-center mb-3">
            <div className="font-serif text-[15px] font-semibold">Canned Responses</div>
            <Button size="sm" onClick={()=>toast('info','➕','New','Create new canned response.')}>+ New Response</Button>
          </div>
          <div className="flex gap-[3px] mb-4">
            {['All',...cats].map(c=>(
              <button key={c} onClick={()=>setFilter(c)}
                className={`px-[13px] py-[5px] text-[9px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                  filter===c
                    ? 'bg-[rgba(59,158,255,.1)] border-[rgba(59,158,255,.25)] text-[var(--blue)]'
                    : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)] hover:text-[var(--text2)]'
                }`}>{c}</button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {filtered.map((c,i)=>(
              <div key={i} className="bg-[var(--bg3)] border border-[var(--bdr)] p-[13px]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-[12px]">{c.title}</div>
                    <div className="text-[9px] text-[var(--blue)] mt-[1px]">{c.cat}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={()=>{navigator.clipboard.writeText(c.body);toast('success','📋','Copied','Response copied.')}}>Copy</Button>
                    <Button variant="ghost" size="sm" onClick={()=>toast('info','✏️','Edit','Editing response.')}>Edit</Button>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text2)] leading-[1.6] italic">"{c.body}"</p>
              </div>
            ))}
          </div>
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
