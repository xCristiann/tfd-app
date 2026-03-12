import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { TRADER_NAV } from '@/lib/nav'

const TRADES = [
  { sym:'GBP/USD', dir:'BUY',  lots:'0.30', open:'1.26100', close:'1.26780', pips:'+68.0', swap:'-$0.60', pnl:'+$612', pos:true,  from:'10 Mar 08:14', to:'10 Mar 16:42' },
  { sym:'BTC/USD', dir:'SELL', lots:'0.02', open:'68,200',  close:'67,100',  pips:'+1100', swap:'-$1.00', pnl:'+$440', pos:true,  from:'9 Mar 10:20',  to:'9 Mar 11:15' },
  { sym:'NAS100',  dir:'BUY',  lots:'0.10', open:'17,650',  close:'17,420',  pips:'-230',  swap:'-$0.30', pnl:'-$230', pos:false, from:'8 Mar 14:05',  to:'8 Mar 18:22' },
  { sym:'XAU/USD', dir:'BUY',  lots:'0.30', open:'2,318.00',close:'2,330.40',pips:'+124',  swap:'-$1.10', pnl:'+$1,116',pos:true, from:'7 Mar 09:30', to:'7 Mar 14:55' },
  { sym:'USD/JPY', dir:'SELL', lots:'0.40', open:'151.84',  close:'151.20',  pips:'+64.0', swap:'-$0.80', pnl:'+$256', pos:true,  from:'6 Mar 08:50',  to:'6 Mar 12:18' },
]

const FILTERS = ['All Time','This Week','This Month']

export function HistoryPage() {
  const { toasts, toast, dismiss } = useToast()
  const [filter, setFilter] = useState('All Time')

  return (
    <>
      <DashboardLayout title="Trade History" nav={TRADER_NAV} accentColor="gold">
        <Card>
          <CardHeader title="Trade History" action={
            <Button variant="ghost" size="sm" onClick={()=>toast('info','📥','Export','CSV download started.')}>Export CSV</Button>
          }/>
          {/* Filter pills */}
          <div className="flex gap-[3px] mb-[14px]">
            {FILTERS.map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-[13px] py-[5px] text-[9px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                  filter===f
                    ? 'bg-[rgba(212,168,67,.1)] border-[var(--bdr2)] text-[var(--gold)]'
                    : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)] hover:text-[var(--text2)]'
                }`}>{f}</button>
            ))}
          </div>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--dim)]">
                {['Symbol','Dir','Lots','Open','Close','Pips','Swap','P&L','Opened','Closed'].map(h=>(
                  <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRADES.map((t,i)=>(
                <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)] cursor-pointer">
                  <td className="px-[11px] py-[8px] font-semibold">{t.sym}</td>
                  <td className="px-[11px] py-[8px]"><span className={`text-[9px] font-bold tracking-[1px] ${t.dir==='BUY'?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.dir}</span></td>
                  <td className="px-[11px] py-[8px] font-mono">{t.lots}</td>
                  <td className="px-[11px] py-[8px] font-mono">{t.open}</td>
                  <td className="px-[11px] py-[8px] font-mono">{t.close}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${t.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.pips}</td>
                  <td className="px-[11px] py-[8px] font-mono text-[var(--text3)]">{t.swap}</td>
                  <td className={`px-[11px] py-[8px] font-mono font-semibold ${t.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.pnl}</td>
                  <td className="px-[11px] py-[8px] font-mono text-[10px] text-[var(--text3)]">{t.from}</td>
                  <td className="px-[11px] py-[8px] font-mono text-[10px] text-[var(--text3)]">{t.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
