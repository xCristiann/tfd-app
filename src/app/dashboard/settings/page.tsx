import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { TRADER_NAV } from '@/lib/nav'

export function SettingsPage() {
  const { toasts, toast, dismiss } = useToast()
  const { profile } = useAuth()
  const [fn, setFn]     = useState(profile?.first_name ?? 'James')
  const [ln, setLn]     = useState(profile?.last_name  ?? 'Mitchell')
  const [email, setEmail] = useState(profile?.email    ?? 'james@tfd.com')
  const [phone, setPhone] = useState('+44 7700 900123')
  const [country, setCountry] = useState(profile?.country ?? 'United Kingdom')
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confPw, setConfPw] = useState('')

  const wrap = "flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors"
  const inp = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans"
  const Ico = ({c}:{c:string})=><span className="px-[10px] flex items-center text-[var(--text3)] border-r border-[var(--dim)]">{c}</span>
  const Label = ({l}:{l:string})=><label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{l}</label>

  return (
    <>
      <DashboardLayout title="Settings" nav={TRADER_NAV} accentColor="gold">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="Profile"/>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1"><Label l="First Name"/><div className={wrap}><input value={fn} onChange={e=>setFn(e.target.value)} className={inp}/></div></div>
                <div className="flex flex-col gap-1"><Label l="Last Name"/><div className={wrap}><input value={ln} onChange={e=>setLn(e.target.value)} className={inp}/></div></div>
              </div>
              <div className="flex flex-col gap-1"><Label l="Email"/><div className={wrap}><Ico c="✉"/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" className={inp}/></div></div>
              <div className="flex flex-col gap-1"><Label l="Phone"/><div className={wrap}><Ico c="📱"/><input value={phone} onChange={e=>setPhone(e.target.value)} className={inp}/></div></div>
              <div className="flex flex-col gap-1"><Label l="Country"/><div className={wrap}><input value={country} onChange={e=>setCountry(e.target.value)} className={inp}/></div></div>
              <Button onClick={()=>toast('success','✅','Saved','Profile updated.')} className="w-full">Save Profile</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Security"/>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1"><Label l="Current Password"/><div className={wrap}><Ico c="🔒"/><input value={curPw} onChange={e=>setCurPw(e.target.value)} type="password" placeholder="••••••••" className={inp}/></div></div>
              <div className="flex flex-col gap-1"><Label l="New Password"/><div className={wrap}><Ico c="🔒"/><input value={newPw} onChange={e=>setNewPw(e.target.value)} type="password" placeholder="Min 8 chars" className={inp}/></div></div>
              <div className="flex flex-col gap-1"><Label l="Confirm"/><div className={wrap}><Ico c="🔒"/><input value={confPw} onChange={e=>setConfPw(e.target.value)} type="password" placeholder="Repeat" className={inp}/></div></div>
              <Button onClick={()=>toast('success','🔐','Password Updated','Changed successfully.')} className="w-full">Change Password</Button>
              <div className="h-[1px] bg-[var(--dim)]"/>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[12px] font-semibold">Two-Factor Auth</div>
                  <div className="text-[10px] text-[var(--text3)] mt-[2px]">Protect your account</div>
                </div>
                <Button variant="ghost" size="sm" onClick={()=>toast('info','📱','2FA','Download Google Authenticator and scan the QR code.')}>Enable 2FA</Button>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
