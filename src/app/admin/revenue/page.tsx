import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminRevenuePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    // Sales revenue
    totalSalesRevenue:  0,
    totalAccountsSold:  0,
    avgChallengePrice:  0,
    // Payouts
    totalPaidOut:       0,
    totalPending:       0,
    paidCount:          0,
    pendingCount:       0,
    // Net
    netProfit:          0,
  })
  const [byProduct, setByProduct] = useState<{
    name: string; count: number; revenue: number; avgPrice: number
  }[]>([])
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<{month:string; sales:number; payouts:number; net:number}[]>([])

  useEffect(() => {
    async function load() {
      const [
        { data: accounts },
        { data: paidPayouts },
        { data: pendingPayouts },
        { data: products },
      ] = await Promise.all([
        // Accounts with purchase price + product info
        supabase.from('accounts')
          .select('id, purchase_price, purchased_at, starting_balance, phase, status, challenge_products(id, name, price_usd, account_size)')
          .order('purchased_at', { ascending: false }),
        // Paid payouts
        supabase.from('payouts').select('requested_usd, net_usd, paid_at, created_at').eq('status','paid'),
        // Pending payouts
        supabase.from('payouts').select('requested_usd, created_at').in('status',['pending','approved']),
        // All products for reference
        supabase.from('challenge_products').select('id, name, price_usd, account_size, is_active'),
      ])

      const accs     = accounts     ?? []
      const paid     = paidPayouts  ?? []
      const pending  = pendingPayouts ?? []

      // ── Sales Revenue ──────────────────────────────────────────────────────
      // Use purchase_price if set, else fall back to challenge_products.price_usd
      const totalSalesRevenue = accs.reduce((s, a: any) => {
        const price = a.purchase_price ?? a.challenge_products?.price_usd ?? 0
        return s + price
      }, 0)
      const totalAccountsSold = accs.length
      const avgChallengePrice = totalAccountsSold > 0 ? totalSalesRevenue / totalAccountsSold : 0

      // ── Payouts ────────────────────────────────────────────────────────────
      const totalPaidOut = paid.reduce((s, p: any) => s + (p.net_usd ?? p.requested_usd ?? 0), 0)
      const totalPending = pending.reduce((s, p: any) => s + (p.requested_usd ?? 0), 0)

      // ── Net Profit ─────────────────────────────────────────────────────────
      const netProfit = totalSalesRevenue - totalPaidOut

      // ── By Product ─────────────────────────────────────────────────────────
      const productMap: Record<string, { name:string; count:number; revenue:number; prices:number[] }> = {}
      accs.forEach((a: any) => {
        const name  = a.challenge_products?.name ?? 'Unknown'
        const price = a.purchase_price ?? a.challenge_products?.price_usd ?? 0
        if (!productMap[name]) productMap[name] = { name, count:0, revenue:0, prices:[] }
        productMap[name].count++
        productMap[name].revenue += price
        productMap[name].prices.push(price)
      })
      const byProd = Object.values(productMap)
        .map(p => ({ ...p, avgPrice: p.prices.length > 0 ? p.revenue / p.prices.length : 0 }))
        .sort((a,b) => b.revenue - a.revenue)

      // ── Recent sales (last 10) ─────────────────────────────────────────────
      const recent = accs.slice(0, 10).map((a: any) => ({
        product:    a.challenge_products?.name ?? '—',
        size:       a.challenge_products?.account_size ?? a.starting_balance,
        price:      a.purchase_price ?? a.challenge_products?.price_usd ?? 0,
        date:       a.purchased_at,
        phase:      a.phase,
        status:     a.status,
      }))

      // ── Monthly revenue (last 6 months) ───────────────────────────────────
      const months: Record<string, {sales:number; payouts:number}> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString('en', { month:'short', year:'2-digit' })
        months[key] = { sales:0, payouts:0 }
      }
      accs.forEach((a: any) => {
        if (!a.purchased_at) return
        const d   = new Date(a.purchased_at)
        const key = d.toLocaleString('en', { month:'short', year:'2-digit' })
        if (months[key]) months[key].sales += a.purchase_price ?? a.challenge_products?.price_usd ?? 0
      })
      paid.forEach((p: any) => {
        if (!p.paid_at) return
        const d   = new Date(p.paid_at)
        const key = d.toLocaleString('en', { month:'short', year:'2-digit' })
        if (months[key]) months[key].payouts += p.net_usd ?? p.requested_usd ?? 0
      })
      const monthly = Object.entries(months).map(([month, v]) => ({
        month, ...v, net: v.sales - v.payouts,
      }))

      setData({ totalSalesRevenue, totalAccountsSold, avgChallengePrice, totalPaidOut, totalPending, paidCount:paid.length, pendingCount:pending.length, netProfit })
      setByProduct(byProd)
      setRecentSales(recent)
      setMonthlyRevenue(monthly)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  const maxMonthSales = Math.max(...monthlyRevenue.map(m => m.sales), 1)
  const maxProductRev = byProduct[0]?.revenue || 1
  const profitMargin  = data.totalSalesRevenue > 0
    ? ((data.netProfit / data.totalSalesRevenue) * 100).toFixed(1)
    : '0'

  return (
    <DashboardLayout title="Revenue" nav={ADMIN_NAV} accentColor="red">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* ── Row 1: KPIs ── */}
          <div className="grid grid-cols-4 gap-[11px]">
            <KPICard
              label="My Revenue"
              value={fmt(data.totalSalesRevenue)}
              sub={`${data.totalAccountsSold} challenges sold`}
              subColor="text-[var(--green)]"
            />
            <KPICard
              label="Total Paid Out"
              value={fmt(data.totalPaidOut)}
              sub={`${data.paidCount} payouts completed`}
              subColor="text-[var(--red)]"
            />
            <KPICard
              label="Net Profit"
              value={fmt(data.netProfit)}
              sub={`${profitMargin}% margin`}
              subColor={data.netProfit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}
            />
            <KPICard
              label="Pending Payouts"
              value={fmt(data.totalPending)}
              sub={`${data.pendingCount} awaiting approval`}
              subColor="text-[var(--gold)]"
            />
          </div>

          {/* ── Row 2: Revenue breakdown + Monthly chart ── */}
          <div className="grid grid-cols-2 gap-[14px]">

            {/* Revenue vs Payouts summary */}
            <Card>
              <CardHeader title="Revenue Breakdown"/>
              <div className="flex flex-col gap-0">
                {[
                  { l:'Total Sales Revenue',  v:fmt(data.totalSalesRevenue),  c:'text-[var(--green)]',  bar:100,                                            barC:'var(--green)' },
                  { l:'Total Paid to Traders', v:fmt(data.totalPaidOut),      c:'text-[var(--red)]',    bar: data.totalSalesRevenue > 0 ? (data.totalPaidOut/data.totalSalesRevenue)*100 : 0, barC:'var(--red)' },
                  { l:'Pending Payouts',       v:fmt(data.totalPending),      c:'text-[var(--gold)]',   bar: data.totalSalesRevenue > 0 ? (data.totalPending/data.totalSalesRevenue)*100 : 0, barC:'var(--gold)' },
                  { l:'Net Profit',            v:fmt(data.netProfit),         c:data.netProfit>=0?'text-[var(--green)]':'text-[var(--red)]', bar: data.totalSalesRevenue > 0 ? Math.abs(data.netProfit/data.totalSalesRevenue)*100 : 0, barC: data.netProfit>=0?'var(--green)':'var(--red)' },
                ].map(({l,v,c,bar,barC}) => (
                  <div key={l} className="py-[10px] border-b border-[var(--dim)]">
                    <div className="flex justify-between items-center mb-[6px]">
                      <span className="text-[11px] text-[var(--text2)]">{l}</span>
                      <span className={`font-mono text-[14px] font-bold ${c}`}>{v}</span>
                    </div>
                    <div className="h-[3px] bg-white/5 rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-500" style={{ width:`${Math.min(100,bar)}%`, background:barC }}/>
                    </div>
                  </div>
                ))}
                <div className="pt-[10px] flex justify-between">
                  <span className="text-[10px] text-[var(--text3)]">Avg challenge price</span>
                  <span className="font-mono text-[12px] text-[var(--gold)]">{fmt(data.avgChallengePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-[var(--text3)]">Accounts sold</span>
                  <span className="font-mono text-[12px] text-[var(--text)]">{data.totalAccountsSold}</span>
                </div>
              </div>
            </Card>

            {/* Monthly bar chart */}
            <Card>
              <CardHeader title="Monthly Revenue vs Payouts"/>
              {monthlyRevenue.every(m => m.sales === 0 && m.payouts === 0) ? (
                <div className="py-8 text-center text-[11px] text-[var(--text3)]">No monthly data yet</div>
              ) : (
                <>
                  <div className="flex items-end gap-[6px] h-[130px] mt-2 mb-3">
                    {monthlyRevenue.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-[3px]">
                        <div className="w-full flex gap-[2px] items-end" style={{ height:120 }}>
                          {/* Sales bar */}
                          <div className="flex-1 rounded-t transition-all duration-500"
                            style={{ height:`${maxMonthSales > 0 ? (m.sales/maxMonthSales)*100 : 0}%`, background:'rgba(0,217,126,0.6)', minHeight: m.sales>0?4:0 }}
                            title={`Sales: ${fmt(m.sales)}`}
                          />
                          {/* Payouts bar */}
                          <div className="flex-1 rounded-t transition-all duration-500"
                            style={{ height:`${maxMonthSales > 0 ? (m.payouts/maxMonthSales)*100 : 0}%`, background:'rgba(255,51,82,0.6)', minHeight: m.payouts>0?4:0 }}
                            title={`Payouts: ${fmt(m.payouts)}`}
                          />
                        </div>
                        <span className="text-[8px] text-[var(--text3)] font-mono">{m.month}</span>
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background:'rgba(0,217,126,0.6)' }}/>
                      <span className="text-[9px] text-[var(--text3)]">Sales Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background:'rgba(255,51,82,0.6)' }}/>
                      <span className="text-[9px] text-[var(--text3)]">Payouts</span>
                    </div>
                  </div>
                  {/* Net per month */}
                  <div className="mt-3 flex gap-[6px]">
                    {monthlyRevenue.map(m => (
                      <div key={m.month} className="flex-1 text-center">
                        <div className={`text-[8px] font-mono font-bold ${m.net>=0?'text-[var(--green)]':'text-[var(--red)]'}`}>
                          {m.net>=0?'+':''}{m.net>=1000?`${(m.net/1000).toFixed(1)}k`:m.net.toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── Row 3: By Product + Recent Sales ── */}
          <div className="grid grid-cols-2 gap-[14px]">

            {/* Revenue by product */}
            <Card>
              <CardHeader title="Revenue by Product"/>
              {byProduct.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text3)]">No data yet</div>
              ) : byProduct.map((p, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-start mb-[6px]">
                    <div>
                      <div className="text-[12px] font-semibold">{p.name}</div>
                      <div className="text-[9px] text-[var(--text3)] mt-[2px]">
                        {p.count} account{p.count!==1?'s':''} · avg {fmt(p.avgPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[14px] font-bold text-[var(--green)]">{fmt(p.revenue)}</div>
                      <div className="text-[9px] text-[var(--text3)]">{((p.revenue/maxProductRev)*100).toFixed(0)}% of sales</div>
                    </div>
                  </div>
                  <div className="h-[4px] bg-white/5 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width:`${(p.revenue/maxProductRev)*100}%`, background:'var(--gold)' }}/>
                  </div>
                </div>
              ))}

              {/* Totals footer */}
              <div className="mt-4 pt-4 border-t border-[var(--dim)] grid grid-cols-3 gap-3">
                {[
                  ['Total Revenue', fmt(data.totalSalesRevenue), 'var(--green)'],
                  ['Total Payouts', fmt(data.totalPaidOut), 'var(--red)'],
                  ['Net Profit', fmt(data.netProfit), data.netProfit>=0?'var(--green)':'var(--red)'],
                ].map(([l,v,c])=>(
                  <div key={l} className="text-center p-2 bg-[var(--bg3)] border border-[var(--dim)]">
                    <div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div>
                    <div className="font-mono text-[12px] font-bold" style={{ color:c }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent sales */}
            <Card>
              <CardHeader title="Recent Sales"/>
              {recentSales.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text3)]">No sales yet</div>
              ) : (
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-[var(--dim)]">
                      {['Product','Size','Price','Phase','Date'].map(h=>(
                        <th key={h} className="px-[8px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s, i) => (
                      <tr key={i} className="border-b border-[rgba(255,51,82,.04)]">
                        <td className="px-[8px] py-[6px] font-semibold text-[10px]" style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.product}</td>
                        <td className="px-[8px] py-[6px] font-mono text-[var(--text2)]">${(s.size/1000).toFixed(0)}K</td>
                        <td className="px-[8px] py-[6px] font-mono font-bold text-[var(--green)]">{fmt(s.price)}</td>
                        <td className="px-[8px] py-[6px]">
                          <span className="text-[8px] uppercase tracking-[1px] font-bold px-[5px] py-[2px]"
                            style={{ background:s.phase==='funded'?'rgba(212,168,67,.15)':'rgba(100,100,200,.1)', color:s.phase==='funded'?'var(--gold)':'var(--text3)', border:`1px solid ${s.phase==='funded'?'var(--bdr2)':'transparent'}` }}>
                            {s.phase??'—'}
                          </span>
                        </td>
                        <td className="px-[8px] py-[6px] text-[9px] text-[var(--text3)] font-mono">
                          {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                        </td>
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
