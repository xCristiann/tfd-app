import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

const PERSONA_TEMPLATE = typeof import.meta !== 'undefined'
  ? (import.meta as any).env?.VITE_PERSONA_TEMPLATE_ID ?? ''
  : ''

type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined' | 'needs_review'

const STATUS_CFG: Record<KycStatus, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  not_started:  { label: 'Not Verified',  color: 'text-[#8FA3BF]', bg: 'bg-[#F4F7FD]',               border: 'border-[#F0F4FB]',               icon: '○', desc: 'Complete identity verification to unlock payouts and higher limits.' },
  pending:      { label: 'Under Review',  color: 'text-[#2255CC]',  bg: 'bg-[rgba(34,85,204,.05)]',     border: 'border-[rgba(34,85,204,.3)]',     icon: '⏳', desc: 'Your documents are being reviewed. Usually takes 1–2 business days.' },
  approved:     { label: 'Verified',      color: 'text-[#16A34A]', bg: 'bg-[rgba(22,163,74,.06)]',      border: 'border-[rgba(0,217,126,.3)]',      icon: '✓',  desc: 'Your identity has been verified. All features are unlocked.' },
  declined:     { label: 'Declined',      color: 'text-[#DC2626]',   bg: 'bg-[rgba(220,38,38,.06)]',      border: 'border-[rgba(255,51,82,.3)]',      icon: '✕',  desc: 'Your verification was declined. Please re-submit with valid documents.' },
  needs_review: { label: 'Needs Review',  color: 'text-[#2255CC]',  bg: 'bg-[rgba(34,85,204,.05)]',     border: 'border-[rgba(34,85,204,.3)]',     icon: '⚠', desc: 'Additional information required. Please contact support.' },
}

export function KycPage() {
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [kycRecord, setKycRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!profile) return
    // Load KYC record from DB — source of truth
    supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', profile.id)
      .limit(1)
      .then(({ data }) => {
        setKycRecord(data && data.length > 0 ? data[0] : null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [profile?.id])

  function startPersonaVerification() {
    if (!PERSONA_TEMPLATE) {
      // No Persona configured — show manual fallback
      toast('info', '📋', 'Manual KYC',
        'Persona is not yet configured. Please open a support ticket and attach a photo of your government ID + selfie.')
      return
    }
    setStarting(true)
    const script = document.createElement('script')
    script.src = 'https://cdn.withpersona.com/dist/persona-v4-latest.js'
    script.onload = async () => {
      const client = new (window as any).Persona.Client({
        templateId: PERSONA_TEMPLATE,
        referenceId: profile!.id,
        environmentId: (import.meta as any).env?.VITE_PERSONA_ENV_ID ?? 'sandbox',
        onReady: () => { client.open(); setStarting(false) },
        onComplete: async ({ inquiryId, status }: any) => {
          const kycStatus = status === 'completed' ? 'pending' : 'declined'
          const { data, error } = await supabase
            .from('kyc_verifications')
            .upsert({ user_id: profile!.id, provider: 'persona', inquiry_id: inquiryId, status: kycStatus }, { onConflict: 'user_id' })
            .select().single()
          if (!error && data) {
            setKycRecord(data)
            await supabase.from('users').update({ kyc_status: kycStatus }).eq('id', profile!.id)
            toast('success', '✅', 'Submitted', 'KYC submitted successfully. Under review.')
          }
        },
        onCancel: () => setStarting(false),
        onError: (e: any) => { setStarting(false); toast('error', '❌', 'Error', e?.message ?? 'Verification failed') },
      })
    }
    script.onerror = () => { setStarting(false); toast('error', '❌', 'Load Error', 'Could not load Persona SDK.') }
    document.head.appendChild(script)
  }

  // Determine status purely from DB record, not from profile.kyc_status
  // to avoid stale data
  const status: KycStatus = (kycRecord?.status ?? 'not_started') as KycStatus
  const cfg = STATUS_CFG[status]
  const canStart = status === 'not_started' || status === 'declined'

  if (loading) return (
    <DashboardLayout title="Identity Verification (KYC)" nav={TRADER_NAV} accentColor="gold">
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin"/>
      </div>
    </DashboardLayout>
  )

  return (
    <>
      <DashboardLayout title="Identity Verification (KYC)" nav={TRADER_NAV} accentColor="gold">
        <div className="max-w-[660px]">

          {/* Status Banner */}
          <div className={`flex items-center gap-4 p-4 mb-4 border ${cfg.bg} ${cfg.border}`}>
            <div className={`w-[44px] h-[44px] border-2 flex items-center justify-center text-[20px] font-bold flex-shrink-0 ${cfg.color} ${cfg.border}`}>
              {cfg.icon}
            </div>
            <div>
              <div className={`text-[15px] font-bold mb-[2px] ${cfg.color}`}>{cfg.label}</div>
              <p className="text-[11px] text-[#5C7A9E] leading-[1.5]">{cfg.desc}</p>
            </div>
          </div>

          {/* Steps progress */}
          <Card className="mb-4">
            <CardHeader title="Verification Steps"/>
            <div className="flex items-center gap-0 mb-2">
              {[
                { label: 'Personal Info',  done: status !== 'not_started' },
                { label: 'Documents',      done: ['approved','pending','needs_review'].includes(status) },
                { label: 'Admin Review',   done: status === 'approved' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center flex-1">
                  {i > 0 && <div className={`flex-1 h-[1px] ${step.done ? 'bg-[#2255CC]' : 'bg-[rgba(26,58,107,.06)]'}`}/>}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center text-[9px] font-bold border ${step.done ? 'bg-[#2255CC] border-[#2255CC] text-[#F0F4FB]' : 'border-[#F0F4FB] text-[#8FA3BF]'}`}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[8px] uppercase tracking-[1px] font-semibold whitespace-nowrap ${step.done ? 'text-[#2255CC]' : 'text-[#8FA3BF]'}`}>{step.label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-[1px] ${['approved','pending','needs_review'].includes(status) && i === 1 ? 'bg-[#2255CC]' : 'bg-[rgba(26,58,107,.06)]'}`}/>}
                </div>
              ))}
            </div>
          </Card>

          {/* Why verify — shown only if not started */}
          {status === 'not_started' && (
            <Card className="mb-4">
              <CardHeader title="Why Verify?"/>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  ['💰', 'Unlock Payouts', 'Required to withdraw profits from funded accounts'],
                  ['🔒', 'Secure Account', 'Protect from unauthorized access and fraud'],
                  ['⚡', '5 Minutes', 'Fast guided process — just your ID + selfie'],
                ].map(([ico, t, d]) => (
                  <div key={t} className="p-3 bg-[#F4F7FD] border border-[#F0F4FB] text-center">
                    <div className="text-[20px] mb-2">{ico}</div>
                    <div className="text-[11px] font-semibold mb-1">{t}</div>
                    <div className="text-[9px] text-[#8FA3BF] leading-[1.5]">{d}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#F4F7FD] border border-[#F0F4FB]">
                <div className="text-[8px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-3">What You Need</div>
                {[
                  ['🪪', 'Government-Issued Photo ID', 'Passport, national ID card, or driver\'s licence'],
                  ['🤳', 'Selfie / Liveness Check', 'A live photo for identity matching — no printed photos'],
                ].map(([ico, t, d]) => (
                  <div key={t} className="flex items-start gap-3 mb-3 last:mb-0">
                    <span className="text-[18px] flex-shrink-0">{ico}</span>
                    <div>
                      <div className="text-[11px] font-semibold mb-[2px]">{t}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Submission record — shown if submitted */}
          {kycRecord && (
            <Card className="mb-4">
              <CardHeader title="Submission Details"/>
              <div className="flex flex-col gap-0">
                {[
                  ['Provider', kycRecord.provider ?? 'Persona'],
                  ['Inquiry ID', kycRecord.inquiry_id ?? '—'],
                  ['Submitted', kycRecord.created_at ? new Date(kycRecord.created_at).toLocaleString() : '—'],
                  ['Last Updated', kycRecord.updated_at ? new Date(kycRecord.updated_at).toLocaleString() : '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center py-[8px] border-b border-[#F0F4FB] last:border-0 text-[11px]">
                    <span className="text-[#8FA3BF]">{l}</span>
                    <span className=" text-[10px]">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* CTA */}
          <Card>
            {canStart ? (
              <>
                <div className="text-[11px] text-[#5C7A9E] mb-4 leading-[1.6]">
                  {status === 'declined'
                    ? 'Your previous submission was declined. Please re-submit with a valid, unexpired government-issued photo ID.'
                    : 'Click below to start the identity verification process. You\'ll be guided through each step.'}
                </div>
                <Button onClick={startPersonaVerification} loading={starting} className="w-full">
                  {starting ? 'Loading…' : status === 'declined' ? 'Re-submit Verification →' : 'Start Identity Verification →'}
                </Button>
                {!PERSONA_TEMPLATE && (
                  <p className="text-[9px] text-[#8FA3BF] mt-2 text-center">
                    Persona not configured — clicking will open a support ticket request.
                  </p>
                )}
              </>
            ) : status === 'approved' ? (
              <div className="flex items-center gap-3 py-2">
                <span className="text-[22px]">✅</span>
                <div>
                  <div className="font-semibold text-[#16A34A] mb-[2px]">Fully Verified</div>
                  <div className="text-[11px] text-[#5C7A9E]">Your identity has been confirmed. All platform features are available.</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <span className="text-[22px]">⏳</span>
                <div>
                  <div className="font-semibold text-[#2255CC] mb-[2px]">Review In Progress</div>
                  <div className="text-[11px] text-[#5C7A9E]">We'll notify you once the review is complete. Usually 1–2 business days.</div>
                </div>
              </div>
            )}
          </Card>

          {/* Privacy */}
          <Card className="mt-4">
            <CardHeader title="Privacy & Security"/>
            <div className="flex flex-col gap-2">
              {[
                ['🔒', 'AES-256 encryption at rest and in transit'],
                ['🇪🇺', 'GDPR compliant — data processed per EU regulations'],
                ['🗑️', 'Documents deleted automatically after verification'],
                ['👁️', 'Powered by Persona — trusted KYC provider'],
              ].map(([ico, t]) => (
                <div key={t} className="flex items-center gap-3 py-2 border-b border-[#F0F4FB] last:border-0 text-[11px] text-[#5C7A9E]">
                  <span className="text-[14px]">{ico}</span>{t}
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
