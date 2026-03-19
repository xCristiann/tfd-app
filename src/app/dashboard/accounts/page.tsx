import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt, phaseLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { TRADER_NAV } from '@/lib/nav'

export function AccountsPage() {
  const { accounts, loading } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  return (
    <>
      <DashboardLayout title="My Accounts" nav={TRADER_NAV} accentColor="gold">
        <Card>
          <CardHeader title={`My Accounts (${accounts.length})`}
            action={<Button size="sm" onClick={() => toast('info','🎯','Challenge','Redirecting to purchase…')}>+ Buy Challenge</Button>} />
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin"/></div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-[32px] mb-3">🗂</div>
              <div className="font-sans text-[18px] font-bold mb-2">No accounts yet</div>
              <p className="text-[12px] text-[#5C7A9E] mb-6">Purchase your first challenge to get started.</p>
              <Button onClick={() => navigate('/dashboard/challenges')}>Browse Challenges →</Button>
            </div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#F0F4FB]">
                  {['Account ID','Type','Balance','Status','Daily DD','Max DD','Profit','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => {
                  const profit = a.balance - a.starting_balance
                  return (
                    <tr key={a.id} className="border-b border-[rgba(34,85,204,.03)] hover:bg-[rgba(34,85,204,.02)]">
                      <td className="px-[11px] py-[8px]  text-[#2255CC]">{a.account_number}</td>
                      <td className="px-[11px] py-[8px] text-[#5C7A9E]">{fmt(a.starting_balance)}</td>
                      <td className="px-[11px] py-[8px] ">{fmt(a.balance)}</td>
                      <td className="px-[11px] py-[8px]"><Badge variant={phaseVariant(a.phase)}>{phaseLabel(a.phase)}</Badge></td>
                      <td className="px-[11px] py-[8px]  text-[#5C7A9E]">{(a.daily_dd_used ?? 0).toFixed(2)}%</td>
                      <td className="px-[11px] py-[8px]  text-[#5C7A9E]">{(a.max_dd_used ?? 0).toFixed(2)}%</td>
                      <td className={`px-[11px] py-[8px]  ${profit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                        {profit >= 0 ? '+' : ''}{fmt(profit)}
                      </td>
                      <td className="px-[11px] py-[8px]">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/platform')}>Trade →</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
