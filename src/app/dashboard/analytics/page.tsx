import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { PnLBars } from '@/components/charts/PnLBars'
import { analyticsApi } from '@/lib/api/analytics'
import { fmt } from '@/lib/utils'
import { TRADER_NAV } from '@/lib/nav'
import type { TraderStats } from '@/types/database'

export function AnalyticsPage() {
  const { primary, loading: accLoading } = useAccount()
  const [stats, setStats] = useState<TraderStats | null>(null)
  const [symbols, setSymbols] = useState<any[]>([])
  const [pnlData, setPnlData] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!primary) { setLoading(false); return }
    Promise.allSettled([
      analyticsApi.getStats(primary.id),
      analyticsApi.getSymbolBreakdown(primary.id),
      analyticsApi.getEquityCurve(primary.id, 30),
    ]).then(([s, sym, curve]) => {
      if (s.status === 'fulfilled') setStats(s.value)
      if (sym.status === 'fulfilled') setSymbols(sym.value)
      if (curve.status === 'fulfilled') setPnlData(curve.value.map((c: any) => c.daily_pnl))
    }).finally(() => setLoading(false))
  }, [primary?.id])

  return (
    <DashboardLayout title="Analytics" nav={TRADER_NAV} accentColor="gold">
      {accLoading || loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/></div>
      ) : !primary ? (
        <Card><div className="py-12 text-center text-[var(--text3)]">No account found</div></Card>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-[11px]">
            <KPICard label="Total Trades"  value={String(stats?.total_trades ?? 0)}   sub="All time" />
            <KPICard label="Win Rate"      value={`${stats?.win_rate_pct ?? 0}%`}      sub={`${stats?.winning_trades ?? 0} wins`} subColor="text-[var(--green)]" />
            <KPICard label="Total P&L"     value={fmt(stats?.total_pnl ?? 0)}          sub="Net profit" subColor={(stats?.total_pnl ?? 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'} />
            <KPICard label="Best Trade"    value={fmt(stats?.best_trade ?? 0)}         sub="Single trade" subColor="text-[var(--green)]" />
            <KPICard label="Profit Factor" value={stats?.profit_factor ? String(stats.profit_factor) : '—'} sub="Target: 1.5+" />
          </div>

          <div className="grid grid-cols-2 gap-[14px]">
            <Card>
              <CardHeader title="Daily P&L" />
              <PnLBars data={pnlData} />
              {pnlData.length === 0 && <div className="py-8 text-center text-[11px] text-[var(--text3)]">No data yet</div>}
            </Card>
            <Card>
              <CardHeader title="Performance by Symbol" />
              {symbols.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text3)]">No closed trades yet</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--dim)]">
                      {['Symbol','Trades','Win%','P&L'].map(h=>(
                        <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map(s=>(
                      <tr key={s.symbol} className="border-b border-[rgba(212,168,67,.04)]">
                        <td className="px-[11px] py-[8px] font-semibold">{s.symbol}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[var(--text2)]">{s.trades}</td>
                        <td className={`px-[11px] py-[8px] font-mono ${s.win_pct>=60?'text-[var(--green)]':s.win_pct>=50?'text-[var(--gold)]':'text-[var(--red)]'}`}>{s.win_pct}%</td>
                        <td className={`px-[11px] py-[8px] font-mono ${s.total_pnl>=0?'text-[var(--green)]':'text-[var(--red)]'}`}>{fmt(s.total_pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
