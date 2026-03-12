import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, DrawdownBar } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

const CRITICAL = [
  { acct:'TFD-100K-8831', name:'Sofia Kowalski',  daily:4.82, maxDD:8.21,  balance:'$104,180', open:3 },
  { acct:'TFD-200K-2241', name:'Marcus Thompson', daily:2.14, maxDD:9.41,  balance:'$181,800', open:5 },
]
const WARNINGS = [
  { acct:'TFD-25K-7712',  name:'Yuki Chen',       daily:3.90, maxDD:5.20,  balance:'$23,700',  open:2 },
  { acct:'TFD-100K-5531', name:'Lucia Romero',    daily:3.21, maxDD:7.80,  balance:'$96,800',  open:1 },
]

function RiskCard({ r, lvl, onAction }: { r:any; lvl:'critical'|'warning'; onAction:(msg:string)=>void }) {
  const isCrit = lvl === 'critical'
  return (
    <div className={`border p-[14px] mb-2 ${isCrit?'bg-[rgba(255,51,82,.04)] border-[rgba(255,51,82,.15)]':'bg-[rgba(255,140,66,.04)] border-[rgba(255,140,66,.12)]'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-mono text-[var(--gold)] text-[11px] mb-[1px]">{r.acct}</div>
          <div className="font-semibold text-[13px]">{r.name}</div>
          <div className="text-[10px] text-[var(--text3)]">Balance: {r.balance} · {r.open} open trades</div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>onAction('Breach alert sent to trader.')}
            className={`px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer border ${isCrit?'bg-[rgba(255,51,82,.15)] text-[var(--red)] border-[rgba(255,51,82,.25)]':'bg-[rgba(255,140,66,.15)] text-[var(--orange)] border-[rgba(255,140,66,.25)]'}`}>
            Notify
          </button>
          <button onClick={()=>onAction('Positions force-closed.')}
            className="px-[10px] py-[4px] text-[8px] uppercase font-bold cursor-pointer border bg-[rgba(255,51,82,.1)] text-[var(--red)] border-[rgba(255,51,82,.2)]">
            Force Close
          </button>
        </div>
      </div>
      <DrawdownBar label="Daily DD" value={r.daily} max={isCrit?5:4}/>
      <DrawdownBar label="Max DD"   value={r.maxDD}  max={10} warn={70} danger={90}/>
    </div>
  )
}

export function AdminRiskPage() {
  const { toasts, toast, dismiss } = useToast()
  return (
    <>
      <DashboardLayout title="Risk Monitor" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="🔴 Critical Accounts" action={<span className="text-[var(--red)] text-[11px] font-semibold">{CRITICAL.length} accounts</span>}/>
            {CRITICAL.map((r,i)=><RiskCard key={i} r={r} lvl="critical" onAction={msg=>toast('error','🚨','Action',msg)}/>)}
          </Card>
          <Card>
            <CardHeader title="🟡 Warning Accounts" action={<span className="text-[var(--gold)] text-[11px] font-semibold">{WARNINGS.length} accounts</span>}/>
            {WARNINGS.map((r,i)=><RiskCard key={i} r={r} lvl="warning" onAction={msg=>toast('warning','⚠️','Action',msg)}/>)}
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
