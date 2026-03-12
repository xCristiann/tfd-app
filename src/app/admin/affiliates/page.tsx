import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { ADMIN_NAV } from '@/lib/nav'

const AFFS = [
  { name:'TraderTom',  code:'TRADERTOM',  refs:142, rev:'$18,420',earned:'$1,842',paid:'$1,400',rate:'10%' },
  { name:'FXMaster',   code:'FXMASTER22', refs:98,  rev:'$12,100',earned:'$1,210',paid:'$900', rate:'10%' },
  { name:'ProPipHunter',code:'PROPH',     refs:44,  rev:'$7,900', earned:'$790',  paid:'$600', rate:'10%' },
]

export function AdminAffiliatePage() {
  return (
    <DashboardLayout title="Affiliates" nav={ADMIN_NAV} accentColor="red">
      <div className="grid grid-cols-4 gap-[11px]">
        <KPICard label="Total Affiliates"  value="284"    sub="Active"/>
        <KPICard label="Total Referrals"   value="4,812"  sub="+124 this month" subColor="text-[var(--green)]"/>
        <KPICard label="Revenue Referred"  value="$481K"  sub="All time"        subColor="text-[var(--gold)]"/>
        <KPICard label="Commissions Paid"  value="$48,1K" sub="All time"        subColor="text-[var(--green)]"/>
      </div>
      <Card>
        <CardHeader title="Top Affiliates"/>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[var(--dim)]">
              {['Affiliate','Code','Referrals','Revenue','Earned','Paid','Rate'].map(h=>(
                <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AFFS.map(a=>(
              <tr key={a.code} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                <td className="px-[11px] py-[8px] font-semibold">{a.name}</td>
                <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{a.code}</td>
                <td className="px-[11px] py-[8px] font-mono">{a.refs}</td>
                <td className="px-[11px] py-[8px] font-mono text-[var(--green)]">{a.rev}</td>
                <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{a.earned}</td>
                <td className="px-[11px] py-[8px] font-mono text-[var(--text2)]">{a.paid}</td>
                <td className="px-[11px] py-[8px] font-mono">{a.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  )
}
