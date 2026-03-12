import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { TRADER_NAV } from '@/lib/nav'

function ProgressBar({ label, value, target, color, done }: { label:string; value:string; target:string; color:string; done:boolean }) {
  const pct = done ? 100 : parseFloat(value) / parseFloat(target) * 100
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[var(--text2)]">{label}</span>
        <span className="font-mono text-[11px]" style={{color}}>{value}{done?' ✓':` / ${target}`}</span>
      </div>
      <div className="h-[5px] bg-white/5 rounded-[3px] overflow-hidden">
        <div className="h-full rounded-[3px] transition-all duration-500" style={{width:`${Math.min(pct,100)}%`,background:color}}/>
      </div>
    </div>
  )
}

export function ChallengesPage() {
  const { toasts, toast, dismiss } = useToast()
  return (
    <>
      <DashboardLayout title="Challenges" nav={TRADER_NAV} accentColor="gold">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <div className="flex items-center justify-between mb-1">
              <div className="font-serif text-[15px] font-semibold">TFD-100K-4821</div>
              <Badge variant="funded">Funded</Badge>
            </div>
            <p className="text-[11px] text-[var(--text2)] mb-3">$100,000 Funded Account · 2-Step Passed</p>
            <ProgressBar label="Profit Target (8%)"   value="8.42%" target="8%"  color="var(--green)" done/>
            <ProgressBar label="Daily DD (5% max)"    value="0.84%" target="5%"  color="var(--green)" done={false}/>
            <ProgressBar label="Max DD (10% max)"     value="3.21%" target="10%" color="var(--gold)"  done={false}/>
            <ProgressBar label="Min Trading Days"     value="18"    target="5"   color="var(--green)" done/>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-1">
              <div className="font-serif text-[15px] font-semibold">TFD-25K-3104</div>
              <Badge variant="phase2">Phase 2</Badge>
            </div>
            <p className="text-[11px] text-[var(--text2)] mb-3">$25,000 Challenge · Phase 2 Active</p>
            <ProgressBar label="Profit Target (5%)"  value="3.2%"  target="5%"  color="var(--gold)"  done={false}/>
            <ProgressBar label="Daily DD (4% max)"   value="0.4%"  target="4%"  color="var(--green)" done={false}/>
            <ProgressBar label="Max DD (8% max)"     value="1.8%"  target="8%"  color="var(--green)" done={false}/>
            <ProgressBar label="Min Trading Days"    value="7"     target="5"   color="var(--green)" done/>
            <Button onClick={()=>toast('info','📈','Phase 2','Need 1.8% more profit to pass!')} className="w-full mt-2 text-[9px]">View Objectives</Button>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
