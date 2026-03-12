import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

const PRI_COLOR: Record<string,string> = {
  urgent:'text-[var(--red)]', high:'text-[var(--orange,#ff8c42)]',
  medium:'text-[var(--gold)]', low:'text-[var(--text2)]'
}
const STATUS_VARIANT: Record<string,any> = {
  open:'open', pending:'warning', resolved:'funded', closed:'breached'
}

export function AdminSupportPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])
  const [allTickets, setAllTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [filter, setFilter] = useState('open')
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const all = data ?? []
    setAllTickets(all)
    setTotalCount(all.length)
    setTickets(all.filter(t => t.status === 'open'))
    setLoading(false)
  }

  function applyFilter(f: string) {
    setFilter(f)
    if (f === 'all') setTickets(allTickets)
    else setTickets(allTickets.filter(t => t.status === f))
  }

  async function updateStatus(id: string, status: string) {
    const { error: err } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) { toast('error','❌','Error', err.message); return }
    const updated = allTickets.map(t => t.id === id ? { ...t, status } : t)
    setAllTickets(updated)
    if (filter === 'all') setTickets(updated)
    else setTickets(updated.filter(t => t.status === filter))
    toast('success','✅','Updated', `Ticket marked ${status}.`)
  }

  return (
    <>
      <DashboardLayout title="Support Tickets" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader
            title={`Tickets (${tickets.length} ${filter} / ${totalCount} total)`}
            action={
              <div className="flex gap-2">
                <button onClick={load}
                  className="px-3 py-[5px] text-[9px] tracking-[1px] uppercase font-bold border border-[var(--bdr2)] text-[var(--gold)] cursor-pointer bg-transparent hover:bg-[rgba(212,168,67,.08)]">
                  ↻ Refresh
                </button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/support-crm')}>
                  Open CRM →
                </Button>
              </div>
            }
          />

          {/* Error display */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-[rgba(255,51,82,.08)] border border-[rgba(255,51,82,.25)] text-[var(--red)] text-[11px] font-mono">
              ❌ {error}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-[3px] mb-4">
            {['open','pending','resolved','closed','all'].map(s => (
              <button key={s} onClick={() => applyFilter(s)}
                className={`px-[10px] py-[5px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                  filter === s
                    ? 'bg-[rgba(212,168,67,.1)] border-[var(--bdr2)] text-[var(--gold)]'
                    : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                }`}>
                {s} ({s === 'all' ? allTickets.length : allTickets.filter(t => t.status === s).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-[28px] mb-2">📭</div>
              <div className="text-[11px] text-[var(--text3)]">
                No {filter === 'all' ? '' : filter} tickets
                {totalCount > 0 && filter !== 'all' && (
                  <span> — <button onClick={() => applyFilter('all')} className="text-[var(--gold)] underline cursor-pointer bg-transparent border-none">view all {totalCount}</button></span>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Ticket #','Subject','User ID','Department','Priority','Status','Created','Actions'].map(h => (
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(255,51,82,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id} className="border-b border-[rgba(255,51,82,.04)] hover:bg-[rgba(255,51,82,.02)]">
                    <td className="px-[11px] py-[8px] font-mono text-[var(--gold)] text-[10px]">
                      {t.ticket_number ?? `#${t.id.slice(0,6)}`}
                    </td>
                    <td className="px-[11px] py-[8px] max-w-[160px] truncate font-medium">{t.subject}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[9px] text-[var(--text3)]">{t.user_id?.slice(0,12)}…</td>
                    <td className="px-[11px] py-[8px] text-[var(--text2)] capitalize">{t.department}</td>
                    <td className={`px-[11px] py-[8px] capitalize font-semibold text-[10px] ${PRI_COLOR[t.priority] ?? ''}`}>{t.priority}</td>
                    <td className="px-[11px] py-[8px]">
                      <Badge variant={STATUS_VARIANT[t.status] ?? 'open'}>{t.status}</Badge>
                    </td>
                    <td className="px-[11px] py-[8px] text-[10px] text-[var(--text3)]">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-[11px] py-[8px]">
                      <div className="flex gap-1">
                        {t.status !== 'resolved' && (
                          <button onClick={() => updateStatus(t.id, 'resolved')}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(0,217,126,.1)] text-[var(--green)] border border-[rgba(0,217,126,.2)]">
                            Resolve
                          </button>
                        )}
                        {t.status !== 'closed' && (
                          <button onClick={() => updateStatus(t.id, 'closed')}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
