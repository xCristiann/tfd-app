import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, Modal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { TRADER_NAV } from '@/lib/nav'

const ENTRIES = [
  { date:'11 Mar · EUR/USD', pnl:'+$161', pos:true,  note:'"EUR/USD long playing out. DXY weakening into CPI. Clean setup."',     tags:['Macro','Win'] },
  { date:'10 Mar · GBP/USD', pnl:'+$612', pos:true,  note:'"Breakout retest. Perfect 1:3. Patient entry, no FOMO. Best trade this week."', tags:['Breakout','Win'] },
  { date:'8 Mar · NAS100',   pnl:'-$230', pos:false, note:'"FOMO entry before confirmation. Process over impulse. No revenge trading."',   tags:['FOMO','Loss'] },
]

export function JournalPage() {
  const { toasts, toast, dismiss } = useToast()
  const [modal, setModal] = useState(false)
  const [sym, setSym] = useState('')
  const [pnl, setPnl] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')

  function save() {
    setModal(false)
    toast('success','📓','Saved','Trade entry recorded.')
    setSym(''); setPnl(''); setNote(''); setTags('')
  }

  const inputCls = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[rgba(230,226,248,.25)] text-[12px] font-sans"
  const wrap = "flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors"

  return (
    <>
      <DashboardLayout title="Trade Journal" nav={TRADER_NAV} accentColor="gold">
        <Card>
          <CardHeader title="Trade Journal" action={
            <Button size="sm" onClick={()=>setModal(true)}>+ New Entry</Button>
          }/>
          <div className="grid grid-cols-3 gap-[11px]">
            {ENTRIES.map((e,i)=>(
              <div key={i} className="bg-[var(--bg3)] border border-[var(--bdr)] p-[13px] cursor-pointer hover:border-[var(--bdr2)] transition-colors">
                <div className="flex justify-between mb-[5px]">
                  <span className="font-mono text-[9px] text-[var(--text3)]">{e.date}</span>
                  <span className={e.pos ? 'text-[var(--green)] text-[11px]' : 'text-[var(--red)] text-[11px]'}>{e.pnl}</span>
                </div>
                <div className="text-[11px] text-[var(--text2)] italic leading-[1.6] mb-[7px]">{e.note}</div>
                <div className="flex gap-[3px]">
                  {e.tags.map(t=>(
                    <span key={t} className={`text-[8px] px-[6px] py-[1px] border ${
                      t==='Win' ? 'bg-[rgba(0,217,126,.08)] border-[rgba(0,217,126,.2)] text-[var(--green)]' :
                      t==='Loss'? 'bg-[rgba(255,51,82,.08)] border-[rgba(255,51,82,.2)] text-[var(--red)]' :
                      'border-[var(--dim)] text-[var(--text3)]'
                    }`}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </DashboardLayout>

      <Modal open={modal} onClose={()=>setModal(false)} title="New Journal Entry" subtitle="Record your trade reasoning and outcome">
        <div className="flex flex-col gap-[9px]">
          {[['Trade / Symbol','text',sym,setSym,'EUR/USD BUY'],['P&L','text',pnl,setPnl,'+$250 or -$100'],['Tags','text',tags,setTags,'Macro, Breakout…']].map(([l,t,v,set,ph]:any)=>(
            <div key={l} className="flex flex-col gap-1">
              <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{l}</label>
              <div className={wrap}><input type={t} value={v} onChange={e=>set(e.target.value)} placeholder={ph} className={inputCls}/></div>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Notes</label>
            <div className={wrap}><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What went well? What to improve?" className={inputCls + " resize-y min-h-[70px]"}/></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={()=>setModal(false)} className="px-[18px] py-[8px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer">Cancel</button>
          <button onClick={save} className="px-[22px] py-[8px] bg-[var(--gold)] text-[var(--bg)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none">Save Entry</button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
