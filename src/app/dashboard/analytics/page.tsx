import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { PnLBars } from '@/components/charts/PnLBars'
import { TRADER_NAV } from '@/lib/nav'

const SYMBOLS = [
  { sym:'EUR/USD', trades:18, win:'72%', pnl:'+$4,210', pos:true },
  { sym:'XAU/USD', trades:12, win:'67%', pnl:'+$2,840', pos:true },
  { sym:'NAS100',  trades:9,  win:'56%', pnl:'+$960',   pos:true },
  { sym:'GBP/USD', trades:7,  win:'71%', pnl:'+$1,240', pos:true },
  { sym:'BTC/USD', trades:5,  win:'40%', pnl:'-$840',   pos:false },
]

export function AnalyticsPage() {
  return (
    <DashboardLayout title="Analytics" nav={TRADER_NAV} accentColor="gold">
      <div className="grid grid-cols-5 gap-[11px]">
        <KPICard label="Profit Factor" value="2.41" sub="Excellent"   subColor="text-[var(--gold)]"/>
        <KPICard label="Sharpe Ratio"  value="1.84" sub="Above avg"   subColor="text-[var(--green)]"/>
        <KPICard label="Avg Win"       value="$486" sub="Per win"     subColor="text-[var(--green)]"/>
        <KPICard label="Avg Loss"      value="$201" sub="Per loss"    subColor="text-[var(--red)]"/>
        <KPICard label="Win Streak"    value="5"    sub="Current"     subColor="text-[var(--green)]"/>
      </div>
      <div className="grid grid-cols-2 gap-[14px]">
        <Card>
          <CardHeader title="Symbol Breakdown"/>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--dim)]">
                {['Symbol','Trades','Win%','P&L'].map(h=>(
                  <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYMBOLS.map((s,i)=>(
                <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                  <td className="px-[11px] py-[8px] font-semibold">{s.sym}</td>
                  <td className="px-[11px] py-[8px] font-mono">{s.trades}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${parseInt(s.win)>=60?'text-[var(--green)]':parseInt(s.win)>=50?'text-[var(--gold)]':'text-[var(--red)]'}`}>{s.win}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${s.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{s.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Daily P&L"/>
          <PnLBars data={[420,-180,800,320,-230,1116,240,-80,612,440,-180,260,320,180]}/>
        </Card>
      </div>
    </DashboardLayout>
  )
}
