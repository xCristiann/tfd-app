import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

export function SettingsPage() {
  const { toasts, toast, dismiss } = useToast()
  const { profile } = useAuth()
  const [fn, setFn]     = useState(profile?.first_name ?? '')
  const [ln, setLn]     = useState(profile?.last_name  ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [newPw, setNewPw] = useState('')
  const [confPw, setConfPw] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('users').update({
      first_name: fn, last_name: ln, country: country || null
    }).eq('id', profile.id)
    setSaving(false)
    if (error) toast('error','❌','Error', error.message)
    else toast('success','✅','Saved','Profile updated.')
  }

  async function changePassword() {
    if (!newPw || newPw !== confPw) { toast('warning','⚠️','Mismatch','Passwords do not match.'); return }
    if (newPw.length < 8) { toast('warning','⚠️','Too Short','Min 8 characters.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) toast('error','❌','Error', error.message)
    else { toast('success','🔐','Updated','Password changed.'); setNewPw(''); setConfPw('') }
  }

  const wrap = "flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] transition-colors"
  const inp  = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans"
  const Ico  = ({c}:{c:string})=><span className="px-[10px] flex items-center text-[#8FA3BF] border-r border-[#F0F4FB]">{c}</span>
  const Label = ({l}:{l:string})=><label className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold">{l}</label>

  return (
    <>
      <DashboardLayout title="Settings" nav={TRADER_NAV} accentColor="gold">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="Profile"/>
            <div className="flex flex-col gap-3">
              <div className="bg-[#F4F7FD] border border-[#F0F4FB] p-3 mb-1">
                <div className="text-[9px] text-[#8FA3BF] mb-1">Email (cannot be changed)</div>
                <div className="text-[12px]  text-[#5C7A9E]">{profile?.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1"><Label l="First Name"/><div className={wrap}><input value={fn} onChange={e=>setFn(e.target.value)} className={inp}/></div></div>
                <div className="flex flex-col gap-1"><Label l="Last Name"/><div className={wrap}><input value={ln} onChange={e=>setLn(e.target.value)} className={inp}/></div></div>
              </div>
              <div className="flex flex-col gap-1"><Label l="Country"/><div className={wrap}><input value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. Romania" className={inp}/></div></div>
              <Button loading={saving} onClick={saveProfile} className="w-full">Save Profile</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Security"/>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1"><Label l="New Password"/><div className={wrap}><Ico c="🔒"/><input value={newPw} onChange={e=>setNewPw(e.target.value)} type="password" placeholder="Min 8 chars" className={inp}/></div></div>
              <div className="flex flex-col gap-1"><Label l="Confirm Password"/><div className={wrap}><Ico c="🔒"/><input value={confPw} onChange={e=>setConfPw(e.target.value)} type="password" placeholder="Repeat" className={inp}/></div></div>
              <Button onClick={changePassword} className="w-full">Change Password</Button>
              <div className="h-[1px] bg-[rgba(26,58,107,.06)]"/>
              <div className="bg-[#F4F7FD] border border-[#F0F4FB] p-3">
                <div className="text-[9px] text-[#8FA3BF] mb-1">Account Role</div>
                <div className="text-[12px]  text-[#2255CC] capitalize">{profile?.role ?? 'trader'}</div>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
