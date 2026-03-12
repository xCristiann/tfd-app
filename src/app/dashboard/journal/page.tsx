import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, Modal } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { journalApi } from '@/lib/api/analytics'
import { TRADER_NAV } from '@/lib/nav'
import type { JournalEntry } from '@/types/database'

export function JournalPage() {
  const { primary } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [sym, setSym] = useState('')
  const [pnl, setPnl] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!primary) return
    journalApi.getEntries(primary.id)
      .then(setEntries).catch(() => {}).finally(() => setLoading(false))
  }, [primary?.id])

  async function save() {
    if (!primary || !note) { toast('warning','⚠️','Missing','Write a note first.'); return }
    setSaving(true)
    try {
      const entry = await journalApi.addEntry({
        account_id: primary.id,
        title: sym || undefined,
        body: note,
        tags: tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : undefined,
        pnl: pnl ? parseFloat(pnl) : undefined,
        sentiment: pnl ? (parseFloat(pnl) >= 0 ? 'win' : 'loss') : 'neutral',
      })
      setEntries(e => [entry, ...e])
      setModal(false)
      setSym(''); setPnl(''); setNote(''); setTags('')
      toast('success','📓','Saved','Journal entry recorded.')
    } catch(e: any) {
      toast('error','❌','Error', e.message)
    } finally { setSaving(false) }
  }

  async function deleteEntry(id: string) {
    await journalApi.deleteEntry(id)
    setEntries(e => e.filter(x => x.id !== id))
    toast('info','🗑','Deleted','Entry removed.')
  }

  const inputCls = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[rgba(230,226,248,.25)] text-[12px] font-sans"
  const wrap = "flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors"

  return (
    <>
      <DashboardLayout title="Trade Journal" nav={TRADER_NAV} accentColor="gold">
        <Card>
          <CardHeader title={`Trade Journal (${entries.length})`} action={
            <Button size="sm" onClick={()=>setModal(true)}>+ New Entry</Button>
          }/>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/></div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-[32px] mb-3">📓</div>
              <div className="font-serif text-[18px] font-bold mb-2">No entries yet</div>
              <p className="text-[12px] text-[var(--text2)] mb-6">Start journaling your trades to track your psychology and growth.</p>
              <Button onClick={()=>setModal(true)}>Write First Entry</Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[11px]">
              {entries.map(e=>(
                <div key={e.id} className="bg-[var(--bg3)] border border-[var(--bdr)] p-[13px] hover:border-[var(--bdr2)] transition-colors">
                  <div className="flex justify-between mb-[5px]">
                    <span className="font-mono text-[9px] text-[var(--text3)]">
                      {new Date(e.created_at).toLocaleDateString()} {e.title ? `· ${e.title}` : ''}
                    </span>
                    {e.pnl != null && (
                      <span className={e.pnl >= 0 ? 'text-[var(--green)] text-[11px]' : 'text-[var(--red)] text-[11px]'}>
                        {e.pnl >= 0 ? '+' : ''}${e.pnl}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text2)] italic leading-[1.6] mb-[7px] line-clamp-3">{e.body}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-[3px] flex-wrap">
                      {(e.tags ?? []).map(t=>(
                        <span key={t} className={`text-[8px] px-[6px] py-[1px] border ${
                          t.toLowerCase()==='win'  ? 'bg-[rgba(0,217,126,.08)] border-[rgba(0,217,126,.2)] text-[var(--green)]' :
                          t.toLowerCase()==='loss' ? 'bg-[rgba(255,51,82,.08)] border-[rgba(255,51,82,.2)] text-[var(--red)]' :
                          'border-[var(--dim)] text-[var(--text3)]'
                        }`}>{t}</span>
                      ))}
                    </div>
                    <button onClick={()=>deleteEntry(e.id)} className="text-[9px] text-[var(--text3)] hover:text-[var(--red)] cursor-pointer bg-transparent border-none">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </DashboardLayout>

      <Modal open={modal} onClose={()=>setModal(false)} title="New Journal Entry" subtitle="Record your trade reasoning and outcome">
        <div className="flex flex-col gap-[9px]">
          {[['Trade / Symbol','text',sym,setSym,'EUR/USD BUY'],['P&L (number)','number',pnl,setPnl,'+250 or -100'],['Tags (comma separated)','text',tags,setTags,'Macro, Breakout, Win…']].map(([l,t,v,set,ph]:any)=>(
            <div key={l} className="flex flex-col gap-1">
              <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{l}</label>
              <div className={wrap}><input type={t} value={v} onChange={e=>set(e.target.value)} placeholder={ph} className={inputCls}/></div>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">Notes *</label>
            <div className={wrap}><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="What went well? What to improve?" className={inputCls + " resize-y min-h-[70px]"}/></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={()=>setModal(false)} className="px-[18px] py-[8px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving} className="px-[22px] py-[8px] bg-[var(--gold)] text-[var(--bg)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
