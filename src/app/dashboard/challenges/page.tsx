import { useAccount } from '@/hooks/useAccount'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { phaseLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { TRADER_NAV } from '@/lib/nav'

function ProgressBar({ label, value, max, color, done }: { label:string; value:number; max:number; color:string; done:boolean }) {
  const pct = done ? 100 : Math.min((value / max) * 100, 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[var(--text2)]">{label}</span>
        <span className="font-mono text-[11px]" style={{color}}>
          {value.toFixed(2)}%{done ? ' ✓' : ` / ${max}%`}
        </span>
      </div>
      <div className="h-[5px] bg-white/5 rounded-[3px] overflow-hidden">
        <div className="h-full rounded-[3px] transition-all duration-500" style={{width:`${pct}%`, background:color}}/>
      </div>
    </div>
  )
}

export function ChallengesPage() {
  const { accounts, loading } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  return (
    <>
      <DashboardLayout title="Challenges" nav={TRADER_NAV} accentColor="gold">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/></div>
        ) : accounts.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <div className="text-[32px] mb-3">🎯</div>
              <div className="font-serif text-[18px] font-bold mb-2">No challenges yet</div>
              <p className="text-[12px] text-[var(--text2)] mb-6">Purchase your first challenge to start trading our capital.</p>
              <Button onClick={()=>toast('info','🎯','Coming Soon','Stripe checkout coming soon!')}>Buy a Challenge →</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-[14px]">
            {accounts.map(account => {
              const prod = (account as any).challenge_products
              const profitPct = account.starting_balance > 0
                ? ((account.balance - account.starting_balance) / account.starting_balance) * 100 : 0
              const targetPct = account.phase === 'phase2'
                ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)
              const dailyMax = account.phase === 'funded'
                ? (prod?.funded_daily_dd ?? 5) : (prod?.ph1_daily_dd ?? 5)
              const maxMax = account.phase === 'funded'
                ? (prod?.funded_max_dd ?? 10) : (prod?.ph1_max_dd ?? 10)

              return (
                <Card key={account.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-serif text-[15px] font-semibold">{account.account_number}</div>
                    <Badge variant={phaseVariant(account.phase)}>{phaseLabel(account.phase)}</Badge>
                  </div>
                  <p className="text-[11px] text-[var(--text2)] mb-4">
                    ${account.starting_balance.toLocaleString()} Account · {prod?.name ?? 'TFD Challenge'}
                  </p>
                  <ProgressBar
                    label={`Profit Target (${targetPct}%)`}
                    value={profitPct} max={targetPct}
                    color={profitPct >= targetPct ? 'var(--green)' : 'var(--gold)'}
                    done={profitPct >= targetPct}
                  />
                  <ProgressBar
                    label={`Daily DD (${dailyMax}% max)`}
                    value={account.daily_dd_used ?? 0} max={dailyMax}
                    color={(account.daily_dd_used ?? 0) > dailyMax * 0.8 ? 'var(--red)' : 'var(--green)'}
                    done={false}
                  />
                  <ProgressBar
                    label={`Max DD (${maxMax}% max)`}
                    value={account.max_dd_used ?? 0} max={maxMax}
                    color={(account.max_dd_used ?? 0) > maxMax * 0.7 ? 'var(--red)' : 'var(--gold)'}
                    done={false}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={()=>navigate('/platform')} className="flex-1 text-[9px]">Trade Now →</Button>
                    <Button variant="ghost" onClick={()=>navigate('/dashboard/analytics')} className="flex-1 text-[9px]">Analytics</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
