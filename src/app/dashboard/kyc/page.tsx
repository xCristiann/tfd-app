import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

const PERSONA_TEMPLATE = (import.meta as any).env?.VITE_PERSONA_TEMPLATE_ID ?? ''

type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined' | 'needs_review'

const STATUS_CFG: Record<KycStatus, { label: string; color: string; icon: string; desc: string }> = {
  not_started:  { label: 'Not Verified',  color: 'text-[var(--text3)]', icon: '○', desc: 'Complete identity verification to unlock payouts and higher limits.' },
  pending:      { label: 'Under Review',  color: 'text-[var(--gold)]',  icon: '⏳', desc: 'Your documents are being reviewed. Usually takes 1-2 business days.' },
  approved:     { label: 'Verified ✓',    color: 'text-[var(--green)]', icon: '✓', desc: 'Your identity has been verified. All features are unlocked.' },
  declined:     { label: 'Declined',      color: 'text-[var(--red)]',   icon: '✕', desc: 'Your verification was declined. Please re-submit with valid documents.' },
  needs_review: { label: 'Needs Review',  color: 'text-[var(--gold)]',  icon: '⚠', desc: 'Additional information required. Please contact support.' },
}

export function KycPage() {
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [kycRecord, setKycRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase.from('kyc_verifications').select('*').eq('user_id', profile.id)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { setKycRecord(data?.[0] ?? null); setLoading(false) })
  }, [profile?.id])

  function startPersonaVerification() {
    if (!PERSONA_TEMPLATE) {
      toast('info', '📋', 'Manual KYC', 'Persona not configured. Please submit documents via a support ticket.')
      return
    }
    setStarting(true)
    const script = document.createElement('script')
    script.src = 'https://cdn.withpersona.com/dist/persona-v4-latest.js'
    script.onload = () => {
      const client = new (window as any).Persona.Client({
        templateId: PERSONA_TEMPLATE,
        referenceId: profile!.id,
        environmentId: (import.meta as any).env?.VITE_PERSONA_ENV_ID ?? 'sandbox',
        onReady: () => { client.open(); setStarting(false) },
        onComplete: async ({ inquiryId, status }: any) => {
          const kycStatus = status === 'completed' ? 'pending' : 'declined'
          const { data } = await supabase.from('kyc_verifications').upsert({
            user_id: profile!.id, provider: 'persona',
            inquiry_id: inquiryId, status: kycStatus,
          }, { onConflict: 'user_id' }).select().single()
          if (data) {
            setKycRecord(data)
            await supabase.from('users').update({ kyc_status: kycStatus }).eq('id', profile!.id)
            toast('success', '✅', 'Submitted', 'KYC submitted. Under review.')
          }
        },
        onCancel: () => { setStarting(false) },
        onError: (e: any) => { setStarting(false); toast('error', '❌', 'Error', e.message) },
      })
    }
    document.head.appendChild(script)
  }

  const status: KycStatus = (kycRecord?.status ?? profile?.kyc_status ?? 'not_started') as KycStatus
  const cfg = STATUS_CFG[status]

  return (
    <>
      <DashboardLayout title="Identity Verification (KYC)" nav={TRADER_NAV} accentColor="gold">
        <div className="max-w-[660px] mx-auto flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-4 mb-5">
              <div className={`w-[52px] h-[52px] border-2 flex items-center justify-center text-[22px] font-bold flex-shrink-0 ${status==='approved'?'border-[var(--green)] text-[var(--green)]':status==='declined'?'border-[var(--red)] text-[var(--red)]':status==='not_started'?'border-[var(--dim)] text-[var(--text3)]':'border-[var(--gold)] text-[var(--gold)]'}`}>
                {cfg.icon}
              </div>
              <div>
                <div className={`text-[16px] font-bold mb-1 ${cfg.color}`}>{cfg.label}</div>
                <p className="text-[11px] text-[var(--text2)] leading-[1.6]">{cfg.desc}</p>
              </div>
            </div>

            {status === 'not_started' && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[['💰','Unlock Payouts','Required to withdraw profits'],['🔒','Secure Account','Protect from unauthorized access'],['⚡','5 Minutes','Fast, guided process']].map(([ico,t,d])=>(
                    <div key={t} className="p-3 bg-[var(--bg3)] border border-[var(--dim)] text-center">
                      <div className="text-[20px] mb-2">{ico}</div>
                      <div className="text-[11px] font-semibold mb-1">{t}</div>
                      <div className="text-[9px] text-[var(--text3)] leading-[1.5]">{d}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-[var(--bg3)] border border-[var(--dim)] mb-5">
                  <div className="text-[8px] uppercase tracking-[2px] text-[var(--text3)] font-semibold mb-3">Documents Needed</div>
                  {[['🪪','Photo ID','Passport, national ID, or driver licence'],['🤳','Selfie','Live photo for identity matching']].map(([ico,t,d])=>(
                    <div key={t} className="flex items-center gap-3 mb-2 last:mb-0">
                      <span className="text-[16px]">{ico}</span>
                      <div><div className="text-[11px] font-semibold">{t}</div><div className="text-[9px] text-[var(--text3)]">{d}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {kycRecord && (
              <div className="flex flex-col gap-2 mb-4 p-3 bg-[var(--bg3)] border border-[var(--dim)] text-[10px]">
                {[['Provider','Persona'],['Inquiry ID', kycRecord.inquiry_id??'—'],['Submitted', kycRecord.created_at?new Date(kycRecord.created_at).toLocaleString():'—']].map(([l,v])=>(
                  <div key={l} className="flex justify-between"><span className="text-[var(--text3)]">{l}</span><span className="font-mono">{v}</span></div>
                ))}
              </div>
            )}

            {(status === 'not_started' || status === 'declined') && (
              <Button onClick={startPersonaVerification} loading={starting} className="w-full">
                {status === 'declined' ? 'Re-submit Verification' : 'Start Verification →'}
              </Button>
            )}
            {status === 'approved' && <div className="p-3 bg-[rgba(0,217,126,.06)] border border-[rgba(0,217,126,.2)] text-[11px] text-[var(--green)]">✅ Identity fully verified. All features unlocked.</div>}
            {(status === 'pending' || status === 'needs_review') && <div className="p-3 bg-[rgba(212,168,67,.06)] border border-[rgba(212,168,67,.2)] text-[11px] text-[var(--gold)]">⏳ Review in progress. You will be notified once complete.</div>}
          </Card>

          <Card>
            <CardHeader title="Privacy & Security"/>
            <div className="flex flex-col gap-3">
              {[['🔒','AES-256 Encryption','All documents encrypted at rest and in transit'],['🇪🇺','GDPR Compliant','Data processed per EU privacy regulations'],['🗑️','Auto-Deletion','Documents deleted after verification completes'],['👁️','Powered by Persona','Industry-leading KYC trusted by thousands of fintechs']].map(([ico,t,d])=>(
                <div key={t} className="flex gap-3 p-3 bg-[var(--bg3)] border border-[var(--dim)]">
                  <span className="text-[16px] flex-shrink-0">{ico}</span>
                  <div><div className="font-semibold text-[11px] mb-[2px]">{t}</div><div className="text-[10px] text-[var(--text3)]">{d}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
