import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { SUPPORT_NAV } from '@/lib/nav'

export function SupportAnalyticsPage() {
  return (
    <DashboardLayout title="Support Analytics" nav={SUPPORT_NAV} accentColor="blue">
      <div className="grid grid-cols-4 gap-[11px]">
        <KPICard label="CSAT Score"      value="94%"    sub="Last 30 days"        subColor="text-[var(--green)]"/>
        <KPICard label="Avg Response"    value="2.4h"   sub="First reply time"    subColor="text-[var(--gold)]"/>
        <KPICard label="Resolved Today"  value="18"     sub="+3 vs yesterday"     subColor="text-[var(--green)]"/>
        <KPICard label="Tickets Open"    value="28"     sub="4 critical"          subColor="text-[var(--red)]"/>
      </div>
      <div className="grid grid-cols-2 gap-[14px]">
        <Card>
          <CardHeader title="By Department"/>
          {[['Billing / Payouts',42,'var(--gold)'],['Technical Support',31,'var(--blue)'],['Account Issues',15,'var(--green)'],['Challenge Rules',9,'var(--text2)'],['General',3,'var(--text3)']].map(([l,v,c])=>(
            <div key={l} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[12px]">{l}</span>
                <span className="font-mono text-[11px]" style={{color:c}}>{v}%</span>
              </div>
              <div className="h-[4px] bg-white/5 rounded overflow-hidden">
                <div className="h-full rounded transition-all" style={{width:`${v}%`,background:c}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader title="By Priority"/>
          {[['Urgent',4,'var(--red)'],['High',11,'var(--orange)'],['Medium',8,'var(--gold)'],['Low',5,'var(--text2)']].map(([l,v,c])=>(
            <div key={l} className="flex justify-between items-center py-[8px] border-b border-[var(--dim)] last:border-0">
              <span className="text-[12px]">{l}</span>
              <div className="flex items-center gap-3">
                <div className="w-[80px] h-[4px] bg-white/5 rounded overflow-hidden">
                  <div className="h-full rounded" style={{width:`${(v as number)/28*100}%`,background:c}}/>
                </div>
                <span className="font-mono text-[11px] w-[20px] text-right" style={{color:c}}>{v}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  )
}
