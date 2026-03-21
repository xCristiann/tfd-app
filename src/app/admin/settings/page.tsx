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
                  <label className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold">{l}</label>
                  <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] transition-colors">
                    <input defaultValue={v} className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans"/>
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
                  <label className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold">{l}</label>
                  <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] transition-colors">
                    <input defaultValue={v} className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans"/>
                  </div>
                </div>
              ))}
              <Button onClick={()=>toast('success','✅','Saved','Risk settings updated.')} className="w-full">Save Risk Settings</Button>
            </div>
          </Card>
        </div>
        <Card>
            <CardHeader title="Community & Social Links"/>
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#8FA3BF]">Configure your Discord invite link. This appears in the navbar, community section, and footer of the homepage.</p>
              {[
                ['Discord Invite URL','https://discord.gg/thefundeddiaries','The full invite link to your Discord server'],
                ['Twitter/X Profile','https://twitter.com/thefundeddiaries','Your Twitter profile URL'],
                ['Instagram Profile','https://instagram.com/thefundeddiaries','Your Instagram profile URL'],
              ].map(([l,v,hint])=>(
                <div key={l as string} className="flex flex-col gap-1">
                  <label className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold">{l as string}</label>
                  <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] transition-colors rounded">
                    <input defaultValue={v as string} placeholder={hint as string}
                      onChange={async(e)=>{
                        const key = (l as string).toLowerCase().replace(/[^a-z]/g,'_').replace(/_+/g,'_')
                        const {supabase} = await import('@/lib/supabase')
                        await supabase.from('site_settings').upsert({key, value: e.target.value},{onConflict:'key'})
                      }}
                      className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans"/>
                  </div>
                  <span className="text-[9px] text-[#8FA3BF]">{hint as string}</span>
                </div>
              ))}
              <Button onClick={()=>toast('success','✅','Saved','Social links updated.')} className="w-full">Save Social Links</Button>
            </div>
          </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}