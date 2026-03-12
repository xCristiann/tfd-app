import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminRevenuePage() {
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0, paidCount: 0, pendingCount: 0 })
  const [byProduct, setByProduct] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: paid }, { data: pending }, { data: products }] = await Promise.all([
        supabase.from('payouts').select('net_usd, requested_usd').eq('status','paid'),
        supabase.from('payouts').select('requested_usd').eq('status','pending'),
        supabase.from('accounts').select('starting_balance, challenge_products(name)'),
      ])
      const totalPaid = (paid ?? []).reduce((s, p) => s + (p.net_usd ?? p.requested_usd), 0)
      const totalPending = (pending ?? []).reduce((s, p) => s + p.requested_usd, 0)

      // Group accounts by product
      const map: Record<string, { name: string; count: number; revenue: number }> = {}
      ;(products ?? []).forEach((a: any) => {
        const name = a.challenge_products?.name ?? 'Unknown'
        if (!map[name]) map[name] = { name, count: 0, revenue: 0 }
        map[name].count++
        // Revenue = starting_balance * average_fee_pct (approx)
        map[name].revenue += a.starting_balance * 0.005
      })

      setStats({ totalPaid, totalPending, paidCount: (paid ?? []).length, pendingCount: (pending ?? []).length })
      setByProduct(Object.values(map).sort((a,b) => b.count - a.count))
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout title="Revenue" nav={ADMIN_NAV} accentColor="red">
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-[11px]">
            <KPICard label="Total Paid Out"   value={fmt(stats.totalPaid)}    sub={`${stats.paidCount} payouts completed`}   subColor="text-[var(--green)]"/>
            <KPICard label="Pending Payouts"  value={fmt(stats.totalPending)} sub={`${stats.pendingCount} awaiting approval`} subColor="text-[var(--gold)]"/>
            <KPICard label="Accounts Sold"    value={String(byProduct.reduce((s,p)=>s+p.count,0))} sub="Total challenges" />
            <KPICard label="Active Products"  value={String(byProduct.length)} sub="Challenge types"/>
          </div>
          <div className="grid grid-cols-2 gap-[14px]">
            <Card>
              <CardHeader title="Accounts by Product"/>
              {byProduct.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[var(--text3)]">No data yet</div>
              ) : byProduct.map((p,i) => {
                const maxCount = byProduct[0].count || 1
                return (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-semibold">{p.name}</span>
                      <span className="font-mono text-[var(--gold)]">{p.count} accounts</span>
                    </div>
                    <div className="h-[5px] bg-white/5 rounded overflow-hidden">
                      <div className="h-full bg-[var(--gold)] rounded" style={{width:`${(p.count/maxCount)*100}%`}}/>
                    </div>
                  </div>
                )
              })}
            </Card>
            <Card>
              <CardHeader title="Payout Summary"/>
              <div className="flex flex-col gap-3">
                {[
                  ['Total Paid Out', fmt(stats.totalPaid), 'text-[var(--green)]'],
                  ['Pending Approval', fmt(stats.totalPending), 'text-[var(--gold)]'],
                  ['Paid Transactions', String(stats.paidCount), 'text-[var(--text)]'],
                  ['Pending Count', String(stats.pendingCount), 'text-[var(--text)]'],
                ].map(([l,v,c]) => (
                  <div key={l} className="flex justify-between items-center border-b border-[var(--dim)] pb-3">
                    <span className="text-[11px] text-[var(--text2)]">{l}</span>
                    <span className={`font-mono text-[13px] ${c}`}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
