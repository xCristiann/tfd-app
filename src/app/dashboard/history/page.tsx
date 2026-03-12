import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

const FILTERS = ['All Time','This Week','This Month']

export function HistoryPage() {
  const { primary } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const [trades, setTrades] = useState<any[]>([])
  const [filter, setFilter] = useState('All Time')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!primary) return
    setLoading(true)
    let q = supabase.from('trades').select('*').eq('account_id', primary.id).eq('status', 'closed').order('closed_at', { ascending: false })
    const now = new Date()
    if (filter === 'This Week') {
      const start = new Date(now); start.setDate(now.getDate() - 7)
      q = q.gte('closed_at', start.toISOString())
    } else if (filter === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      q = q.gte('closed_at', start.toISOString())
    }
    q.then(({ data }) => { setTrades(data ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [primary?.id, filter])

  return (
    <>
      <DashboardLayout title="Trade History" nav={TRADER_NAV} accentColor="gold">
        <Card>
          <CardHeader title={`Closed Trades (${trades.length})`}
            action={<Button variant="ghost" size="sm" onClick={() => toast('info','📥','Export','CSV download started.')}>Export CSV</Button>} />
          <div className="flex gap-[3px] mb-4">
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-[10px] py-[5px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                  filter===f ? 'bg-[rgba(212,168,67,.1)] border-[var(--bdr2)] text-[var(--gold)]' : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)] hover:text-[var(--text2)]'
                }`}>{f}</button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/></div>
          ) : trades.length === 0 ? (
            <div className="py-12 text-center text-[11px] text-[var(--text3)]">No closed trades in this period</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Symbol','Dir','Lots','Open','Close','Pips','Swap','Net P&L','Opened','Closed'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map(t=>(
                  <tr key={t.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                    <td className="px-[11px] py-[8px] font-semibold">{t.symbol}</td>
                    <td className="px-[11px] py-[8px]"><span className={`text-[9px] font-bold ${t.direction==='buy'?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.direction?.toUpperCase()}</span></td>
                    <td className="px-[11px] py-[8px] font-mono">{t.lots}</td>
                    <td className="px-[11px] py-[8px] font-mono">{t.open_price}</td>
                    <td className="px-[11px] py-[8px] font-mono">{t.close_price ?? '—'}</td>
                    <td className={`px-[11px] py-[8px] font-mono ${(t.pips??0)>=0?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.pips != null ? `${t.pips > 0?'+':''}${t.pips}` : '—'}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--text3)]">{t.swap != null ? fmt(t.swap) : '—'}</td>
                    <td className={`px-[11px] py-[8px] font-mono font-semibold ${(t.net_pnl??0)>=0?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.net_pnl != null ? `${t.net_pnl>=0?'+':''}${fmt(t.net_pnl)}` : '—'}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--text3)] text-[10px]">{t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--text3)] text-[10px]">{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
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
