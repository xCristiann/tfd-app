import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminSettingsPage() {
  const { toasts, toast, dismiss } = useToast()
  return (
    <>
      <DashboardLayout title="Admin Settings" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="Platform Settings"/>
            <div className="flex flex-col gap-3">
              {[['Platform Name','The Funded Diaries'],['Support Email','support@funkeddiaries.com'],['Max Payout (per request)','$50,000'],['Min Payout','$100'],['Payout Processing Days','24']].map(([l,v])=>(
                <div key={l} className="flex flex-col gap-1">
                  <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{l}</label>
                  <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                    <input defaultValue={v} className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans"/>
                  </div>
                </div>
              ))}
              <Button onClick={()=>toast('success','✅','Saved','Platform settings updated.')} className="w-full">Save Settings</Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Risk Settings"/>
            <div className="flex flex-col gap-3">
              {[['Auto-breach on DD limit','Enabled'],['Breach notification email','risk@funkeddiaries.com'],['Max open positions (funded)','10'],['Weekend position holding','Enabled'],['News trading window (mins)','30']].map(([l,v])=>(
                <div key={l} className="flex flex-col gap-1">
                  <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{l}</label>
                  <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                    <input defaultValue={v} className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans"/>
                  </div>
                </div>
              ))}
              <Button onClick={()=>toast('success','✅','Saved','Risk settings updated.')} className="w-full">Save Risk Settings</Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
