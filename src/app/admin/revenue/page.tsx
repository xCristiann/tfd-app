import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { PnLBars } from '@/components/charts/PnLBars'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminRevenuePage() {
  return (
    <DashboardLayout title="Revenue" nav={ADMIN_NAV} accentColor="red">
      <div className="grid grid-cols-4 gap-[11px]">
        <KPICard label="MRR"           value="$42,180" sub="+18% vs last month" subColor="text-[var(--green)]"/>
        <KPICard label="Total Revenue"  value="$481K"   sub="All time"           subColor="text-[var(--gold)]"/>
        <KPICard label="Avg Order"      value="$492"    sub="Per challenge sale"  subColor="text-[var(--text2)]"/>
        <KPICard label="Refund Rate"    value="2.1%"    sub="Last 30 days"       subColor="text-[var(--green)]"/>
      </div>
      <div className="grid grid-cols-2 gap-[14px]">
        <Card>
          <CardHeader title="Monthly Revenue"/>
          <PnLBars data={[28400,31200,29800,35600,42180,38900,44200,41800,39400,42180,45600,42180]}/>
        </Card>
        <Card>
          <CardHeader title="Revenue by Product"/>
          {[['$25K Challenge','4,821 sales','$959K','65%'],['$100K Challenge','7,204 sales','$3.95M','80%'],['$200K Challenge','2,256 sales','$2.25M','90%']].map(([n,s,r,pct])=>(
            <div key={n} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[12px] font-semibold">{n}</span>
                <span className="font-mono text-[var(--gold)]">{r}</span>
              </div>
              <div className="text-[9px] text-[var(--text3)] mb-[5px]">{s}</div>
              <div className="h-[4px] bg-white/5 rounded overflow-hidden">
                <div className="h-full bg-[var(--gold)] rounded" style={{width:pct}}/>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  )
}
