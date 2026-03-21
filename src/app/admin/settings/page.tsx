import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

function SocialLinksCard({ toast }: { toast: any }) {
  const FIELDS = [
    { key: 'discord_url',   label: 'Discord Invite URL',  placeholder: 'https://discord.gg/...' },
    { key: 'twitter_url',   label: 'Twitter/X Profile',   placeholder: 'https://twitter.com/...' },
    { key: 'instagram_url', label: 'Instagram Profile',   placeholder: 'https://instagram.com/...' },
  ]
  const [vals, setVals] = useState<Record<string,string>>({
    discord_url:   '',
    twitter_url:   '',
    instagram_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.from('site_settings')
      .select('key,value')
      .in('key', FIELDS.map(f => f.key))
      .then(({ data }) => {
        const map: Record<string,string> = {}
        for (const row of data ?? []) map[row.key] = row.value
        setVals(v => ({ ...v, ...map }))
        setLoaded(true)
      })
  }, [])

  async function save() {
    setSaving(true)
    for (const [key, value] of Object.entries(vals)) {
      await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
    }
    setSaving(false)
    toast('success', '✅', 'Saved', 'Social links updated. Changes apply immediately on homepage.')
  }

  return (
    <Card>
      <CardHeader title="Community & Social Links"/>
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-[#8FA3BF]">
          Discord link appears in the navbar, community section, and footer. Changes apply immediately — no redeploy needed.
        </p>
        {!loaded ? (
          <div className="py-4 text-center text-[#8FA3BF] text-[11px]">Loading...</div>
        ) : FIELDS.map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold">{f.label}</label>
            <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#2255CC] transition-colors rounded">
              <input
                value={vals[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                className="flex-1 px-3 py-[10px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans"
              />
            </div>
            {f.key === 'discord_url' && vals[f.key] && (
              <a href={vals[f.key]} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[#2255CC] hover:underline mt-0.5">
                Test link →
              </a>
            )}
          </div>
        ))}
        <Button onClick={save} disabled={saving || !loaded}>
          {saving ? 'Saving...' : 'Save Social Links'}
        </Button>
      </div>
    </Card>
  )
}

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
        <SocialLinksCard toast={toast}/>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}