import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { SUPPORT_NAV } from '@/lib/nav'

export function SupportAnalyticsPage() {
  return (
    <DashboardLayout title="Support Analytics" nav={SUPPORT_NAV} accentColor="blue">
      <div className="grid grid-cols-4 gap-[11px]">
        <KPICard label="CSAT Score"      value="94%"    sub="Last 30 days"        subColor="text-[#16A34A]"/>
        <KPICard label="Avg Response"    value="2.4h"   sub="First reply time"    subColor="text-[#2255CC]"/>
        <KPICard label="Resolved Today"  value="18"     sub="+3 vs yesterday"     subColor="text-[#16A34A]"/>
        <KPICard label="Tickets Open"    value="28"     sub="4 critical"          subColor="text-[#DC2626]"/>
      </div>
      <div className="grid grid-cols-2 gap-[14px]">
        <Card>
          <CardHeader title="By Department"/>
          {[['Billing / Payouts',42,'#2255CC'],['Technical Support',31,'#2255CC'],['Account Issues',15,'#16A34A'],['Challenge Rules',9,'#5C7A9E'],['General',3,'#8FA3BF']].map(([l,v,c])=>(
            <div key={l} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[12px]">{l}</span>
                <span className="font-['JetBrains_Mono',monospace] text-[11px]" style={{color:c}}>{v}%</span>
              </div>
              <div className="h-[4px] bg-white/5 rounded overflow-hidden">
                <div className="h-full rounded transition-all" style={{width:`${v}%`,background:c}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader title="By Priority"/>
          {[['Urgent',4,'#DC2626'],['High',11,'var(--orange)'],['Medium',8,'#2255CC'],['Low',5,'#5C7A9E']].map(([l,v,c])=>(
            <div key={l} className="flex justify-between items-center py-[8px] border-b border-[#F0F4FB] last:border-0">
              <span className="text-[12px]">{l}</span>
              <div className="flex items-center gap-3">
                <div className="w-[80px] h-[4px] bg-white/5 rounded overflow-hidden">
                  <div className="h-full rounded" style={{width:`${(v as number)/28*100}%`,background:c}}/>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[11px] w-[20px] text-right" style={{color:c}}>{v}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  )
}
