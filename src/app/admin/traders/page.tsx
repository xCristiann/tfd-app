import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminTradersPage() {
  const { toasts, toast, dismiss } = useToast()
  const [traders, setTraders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('users')
      .select('*, accounts(id, phase, balance, starting_balance)')
      .eq('role', 'trader')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTraders(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = traders.filter(t =>
    !search ||
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  async function setRole(id: string, role: string) {
    await supabase.from('users').update({ role }).eq('id', id)
    setTraders(ts => ts.map(t => t.id === id ? { ...t, role } : t))
    toast('success','✅','Updated',`Role set to ${role}.`)
  }

  const inp = "flex-1 px-3 py-[9px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans placeholder-[rgba(230,226,248,.3)]"

  return (
    <>
      <DashboardLayout title="Trader Management" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`All Traders (${filtered.length})`} action={
            <span className="text-[10px] text-[var(--text3)]">{traders.length} total registered</span>
          }/>
          <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] mb-3 transition-colors">
            <span className="px-3 flex items-center text-[var(--text3)]">🔍</span>
            <input className={inp} placeholder="Search name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[var(--text3)]">No traders found</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Name','Email','Country','Accounts','Best Phase','Role','Joined','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(255,51,82,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const accounts = t.accounts ?? []
                  const bestPhase = accounts.find((a:any)=>a.phase==='funded')?.phase
                    ?? accounts.find((a:any)=>a.phase==='phase2')?.phase
                    ?? accounts[0]?.phase ?? '—'
                  return (
                    <tr key={t.id} className="border-b border-[rgba(255,51,82,.04)] hover:bg-[rgba(255,51,82,.02)]">
                      <td className="px-[11px] py-[8px] font-semibold">{t.first_name} {t.last_name}</td>
                      <td className="px-[11px] py-[8px] text-[var(--text2)]">{t.email}</td>
                      <td className="px-[11px] py-[8px] text-[var(--text3)]">{t.country ?? '—'}</td>
                      <td className="px-[11px] py-[8px] font-mono">{accounts.length}</td>
                      <td className="px-[11px] py-[8px]">
                        {bestPhase !== '—' ? <Badge variant={bestPhase as any}>{bestPhase}</Badge> : <span className="text-[var(--text3)]">—</span>}
                      </td>
                      <td className="px-[11px] py-[8px]"><Badge variant={t.role==='admin'?'warning':'open'}>{t.role}</Badge></td>
                      <td className="px-[11px] py-[8px] text-[var(--text3)] text-[10px]">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-[11px] py-[8px]">
                        <div className="flex gap-1">
                          {t.role !== 'admin' && (
                            <button onClick={()=>setRole(t.id,'admin')}
                              className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">
                              Make Admin
                            </button>
                          )}
                          {t.role !== 'trader' && (
                            <button onClick={()=>setRole(t.id,'trader')}
                              className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">
                              Make Trader
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
