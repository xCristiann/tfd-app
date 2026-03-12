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

const PRI_COLOR: Record<string,string> = { urgent:'text-[var(--red)]', high:'text-[var(--orange,#ff8c42)]', medium:'text-[var(--gold)]', low:'text-[var(--text2)]' }
const STATUS_VARIANT: Record<string,any> = { open:'open', pending:'warning', resolved:'funded', closed:'breached' }

export function AdminSupportPage() {
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    loadTickets()
  }, [filter])

  async function loadTickets() {
    setLoading(true)
    setDebugInfo('')

    // Step 1: check session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setDebugInfo('❌ No session found')
      setLoading(false)
      return
    }

    // Step 2: check role
    const { data: roleData, error: roleError } = await supabase
      .from('users').select('role').eq('id', session.user.id).single()
    
    if (roleError) {
      setDebugInfo(`❌ Role fetch error: ${roleError.message}`)
      setLoading(false)
      return
    }

    // Step 3: try fetching tickets WITHOUT join first
    const { data: simpleData, error: simpleError } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (simpleError) {
      setDebugInfo(`❌ Tickets error: ${simpleError.message} | Role: ${roleData?.role}`)
      setLoading(false)
      return
    }

    // Step 4: try with filter
    let finalData = simpleData ?? []
    if (filter !== 'all') {
      finalData = finalData.filter(t => t.status === filter)
    }

    setDebugInfo(`✅ Role: ${roleData?.role} | Total tickets: ${simpleData?.length} | Filtered: ${finalData.length}`)
    setTickets(finalData)
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setTickets(ts => ts.map(t => t.id === id ? { ...t, status } : t))
    toast('success','✅','Updated',`Ticket marked ${status}.`)
  }

  return (
    <>
      <DashboardLayout title="Support Tickets" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`Tickets (${tickets.length})`} action={
            <div className="flex gap-2 items-center">
              <button onClick={loadTickets} className="px-3 py-1 text-[9px] uppercase font-bold border border-[var(--bdr2)] text-[var(--gold)] cursor-pointer bg-transparent">↻ Refresh</button>
              <Button variant="ghost" size="sm" onClick={()=>navigate('/support-crm')}>Open CRM →</Button>
            </div>
          }/>

          {/* Debug bar */}
          {debugInfo && (
            <div className={`mb-3 px-3 py-2 text-[10px] font-mono border ${
              debugInfo.startsWith('✅') 
                ? 'bg-[rgba(0,217,126,.05)] border-[rgba(0,217,126,.2)] text-[var(--green)]' 
                : 'bg-[rgba(255,51,82,.05)] border-[rgba(255,51,82,.2)] text-[var(--red)]'
            }`}>{debugInfo}</div>
          )}

          <div className="flex gap-[3px] mb-4">
            {['open','pending','resolved','closed','all'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)}
                className={`px-[10px] py-[5px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                  filter===s ? 'bg-[rgba(212,168,67,.1)] border-[var(--bdr2)] text-[var(--gold)]' : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                }`}>{s}</button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
          ) : tickets.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[var(--text3)]">No {filter} tickets found</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Ticket','Subject','Trader','Dept','Priority','Status','Date','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map(t=>(
                  <tr key={t.id} className="border-b border-[rgba(255,51,82,.04)] hover:bg-[rgba(255,51,82,.02)]">
                    <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{t.ticket_number ?? t.id.slice(0,8)}</td>
                    <td className="px-[11px] py-[8px] max-w-[140px] truncate">{t.subject}</td>
                    <td className="px-[11px] py-[8px]">{t.user_id?.slice(0,8)}</td>
                    <td className="px-[11px] py-[8px] text-[var(--text3)] capitalize">{t.department}</td>
                    <td className={`px-[11px] py-[8px] capitalize font-semibold text-[10px] ${PRI_COLOR[t.priority]??''}`}>{t.priority}</td>
                    <td className="px-[11px] py-[8px]"><Badge variant={STATUS_VARIANT[t.status]??'open'}>{t.status}</Badge></td>
                    <td className="px-[11px] py-[8px] text-[10px] text-[var(--text3)]">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-[11px] py-[8px]">
                      <div className="flex gap-1">
                        {t.status !== 'resolved' && (
                          <button onClick={()=>updateStatus(t.id,'resolved')}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(0,217,126,.1)] text-[var(--green)] border border-[rgba(0,217,126,.2)]">Resolve</button>
                        )}
                        {t.status !== 'closed' && (
                          <button onClick={()=>updateStatus(t.id,'closed')}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">Close</button>
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
