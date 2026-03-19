import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

type KycStatus = 'not_started' | 'pending' | 'approved' | 'declined' | 'needs_review' | 'in_review' | 'expired' | 'abandoned'

const STATUS_CFG: Record<KycStatus, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  not_started:  { label: 'Not Verified',  color: '#8FA3BF', bg: '#F4F7FD',                     border: '#E8EEF8',   icon: '○', desc: 'Complete identity verification to unlock payouts and higher limits.' },
  pending:      { label: 'Under Review',  color: '#D97706', bg: 'rgba(217,119,6,.06)',           border: 'rgba(217,119,6,.3)',  icon: '⏳', desc: 'Your documents are being reviewed. Usually takes 1–2 business days.' },
  in_review:    { label: 'In Progress',   color: '#2255CC', bg: 'rgba(34,85,204,.06)',            border: 'rgba(34,85,204,.3)',  icon: '→',  desc: 'Verification session is open. Complete it in the Didit window to continue.' },
  approved:     { label: 'Verified',      color: '#16A34A', bg: 'rgba(22,163,74,.06)',           border: 'rgba(22,163,74,.3)', icon: '✓',  desc: 'Your identity has been verified. All features are unlocked.' },
  declined:     { label: 'Declined',      color: '#DC2626', bg: 'rgba(220,38,38,.06)',           border: 'rgba(220,38,38,.3)', icon: '✕',  desc: 'Your verification was declined. Please re-submit with valid documents.' },
  needs_review: { label: 'Needs Review',  color: '#D97706', bg: 'rgba(217,119,6,.06)',           border: 'rgba(217,119,6,.3)',  icon: '⚠', desc: 'Additional information required. Please contact support.' },
  expired:      { label: 'Expired',       color: '#DC2626', bg: 'rgba(220,38,38,.06)',           border: 'rgba(220,38,38,.3)', icon: '✕',  desc: 'Your verification session expired. Please start a new verification.' },
  abandoned:    { label: 'Incomplete',    color: '#8FA3BF', bg: '#F4F7FD',                     border: '#E8EEF8',   icon: '○', desc: 'Verification was not completed. Click below to start again.' },
}

// Didit API config

export function KycPage() {
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [searchParams] = useSearchParams()
  const [kycRecord, setKycRecord] = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [starting, setStarting]   = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    loadAndSync()
  }, [profile?.id])

  async function loadAndSync() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('kyc_verifications').select('*').eq('user_id', profile!.id).limit(1)
      const record = data?.[0] ?? null

      // Check if Didit returned status in URL params (after redirect back)
      const urlSessionId = searchParams.get('verificationSessionId')
      const urlStatus    = searchParams.get('status')

      if (urlSessionId && urlStatus) {
        // Didit redirected back with status in URL
        const normalized = urlStatus.toLowerCase()
        let mapped = 'pending'
        if (normalized.includes('approv'))  mapped = 'approved'
        else if (normalized.includes('declin') || normalized.includes('fail')) mapped = 'declined'
        else if (normalized.includes('abandon')) mapped = 'abandoned'

        // Update DB with URL status
        if (record) {
          await supabase.from('kyc_verifications')
            .update({ status: mapped, updated_at: new Date().toISOString() })
            .eq('user_id', profile!.id)
          await supabase.from('users').update({ kyc_status: mapped }).eq('id', profile!.id)
          const updated = { ...record, status: mapped }
          setKycRecord(updated)
          if (mapped === 'approved') toast('success', '✅', 'Verified!', 'Your identity has been confirmed. Payouts unlocked.')
          else if (mapped === 'declined') toast('error', '❌', 'Declined', 'Please re-submit with valid documents.')
          else toast('info', '⏳', 'Under Review', 'Your documents are being reviewed.')
        } else {
          // No record yet - create one
          const newRecord = {
            user_id: profile!.id,
            provider: 'didit',
            inquiry_id: urlSessionId,
            status: mapped,
          }
          await supabase.from('kyc_verifications').upsert(newRecord, { onConflict: 'user_id' })
          await supabase.from('users').update({ kyc_status: mapped }).eq('id', profile!.id)
          setKycRecord(newRecord)
        }
        setLoading(false)
        return
      }

      setKycRecord(record)

      // If pending/in_review, sync from Didit API
      if (record?.inquiry_id && ['pending','in_review','in_progress'].includes(record.status)) {
        await syncFromDidit(record.inquiry_id, record)
      }
    } catch (e) {
      console.error('[KYC loadAndSync]', e)
    }
    setLoading(false)
  }

  async function syncFromDidit(sessionId: string, currentRecord: any) {
    try {
      const res = await fetch(`/api/kyc-status?sessionId=${sessionId}`)
      if (!res.ok) return
      const { status: newStatus, raw } = await res.json()
      console.log('[KYC sync] Didit status:', raw, '→', newStatus)

      if (newStatus && newStatus !== currentRecord.status) {
        // Update DB
        await supabase.from('kyc_verifications')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('user_id', profile!.id)
        await supabase.from('users')
          .update({ kyc_status: newStatus })
          .eq('id', profile!.id)
        setKycRecord((prev: any) => ({ ...prev, status: newStatus }))
        if (newStatus === 'approved') toast('success', '✅', 'Verified!', 'Your identity has been confirmed. Payouts unlocked.')
        else if (newStatus === 'declined') toast('error', '❌', 'Declined', 'Please re-submit with valid documents.')
      }
    } catch (e) {
      console.error('[KYC sync error]', e)
    }
  }

  async function startVerification() {
    if (!profile) return
    setStarting(true)

    try {
      const res = await fetch('/api/kyc-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      })

      const data = await res.json()
      console.log('[KYC] API response:', data)
      if (!res.ok) throw new Error(data.error ?? 'Could not create session')

      const { verification_url, session_id, _raw } = data
      if (_raw) console.log('[KYC] Didit raw:', _raw)
      if (!verification_url) throw new Error(`No verification URL from Didit. Raw: ${JSON.stringify(_raw ?? data)}`)

      // Save to DB as in_review (session open, not yet submitted)
      try {
        await supabase.from('kyc_verifications').upsert({
          user_id:    profile.id,
          provider:   'didit',
          inquiry_id: session_id,
          status:     'in_review',
        }, { onConflict: 'user_id' })
        await supabase.from('users').update({ kyc_status: 'pending' }).eq('id', profile.id)
      } catch {}

      setKycRecord({ provider: 'didit', inquiry_id: session_id, status: 'in_review', created_at: new Date().toISOString() })

      // Redirect current tab to Didit — most reliable, no popup blocker issues
      window.location.href = verification_url

    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('not configured')) {
        toast('info', '📋', 'Manual KYC', 'Please open a support ticket and attach your government ID + selfie.')
      } else {
        toast('error', '❌', 'Error', msg || 'Could not start verification.')
      }
      setStarting(false)
    }
  }


  const status: KycStatus = (kycRecord?.status ?? 'not_started') as KycStatus
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.not_started
  const canStart = ['not_started', 'declined', 'expired', 'abandoned', 'in_review'].includes(status)

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
        <div className="max-w-[640px]">

          {/* Status Banner */}
          <div className="flex items-center gap-4 p-4 mb-4 rounded-xl border" style={{background:cfg.bg, borderColor:cfg.border}}>
            <div className="w-11 h-11 rounded-xl border-2 flex items-center justify-center text-xl font-bold flex-shrink-0" style={{color:cfg.color, borderColor:cfg.border}}>
              {cfg.icon}
            </div>
            <div>
              <div className="text-[15px] font-semibold mb-0.5" style={{color:cfg.color}}>{cfg.label}</div>
              <p className="text-[12px] text-[#5C7A9E] leading-relaxed">{cfg.desc}</p>
            </div>
          </div>

          {/* Progress steps */}
          <Card className="mb-4">
            <CardHeader title="Verification Steps"/>
            <div className="flex items-center gap-0 mt-1">
              {[
                { label: 'Personal Info',  done: status !== 'not_started' && status !== 'abandoned' },
                { label: 'Documents',      done: ['approved','pending','in_review','needs_review'].includes(status) },
                { label: 'Admin Review',   done: status === 'approved' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center flex-1">
                  {i > 0 && <div className="flex-1 h-[2px]" style={{background: step.done ? '#2255CC' : '#E8EEF8'}}/>}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all"
                      style={{background: step.done ? '#2255CC' : '#fff', borderColor: step.done ? '#2255CC' : '#E8EEF8', color: step.done ? '#fff' : '#8FA3BF'}}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    <span className="text-[9px] uppercase tracking-[1px] font-semibold whitespace-nowrap" style={{color: step.done ? '#2255CC' : '#8FA3BF'}}>{step.label}</span>
                  </div>
                  {i < 2 && <div className="flex-1 h-[2px]" style={{background: status === 'approved' && i === 1 ? '#2255CC' : '#E8EEF8'}}/>}
                </div>
              ))}
            </div>
          </Card>

          {/* Why verify */}
          {canStart && (
            <Card className="mb-4">
              <CardHeader title="Why Verify?"/>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  ['💰', 'Unlock Payouts', 'Required to withdraw profits from funded accounts'],
                  ['🔒', 'Secure Account', 'Protect from unauthorized access and fraud'],
                  ['⚡', '5 Minutes', 'Fast guided process — just your ID + selfie'],
                ].map(([ico, t, d]) => (
                  <div key={t} className="p-3 bg-[#F4F7FD] border border-[#E8EEF8] rounded-xl text-center">
                    <div className="text-xl mb-2">{ico}</div>
                    <div className="text-[12px] font-semibold text-[#1A3A6B] mb-1">{t}</div>
                    <div className="text-[11px] text-[#8FA3BF] leading-relaxed">{d}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#F4F7FD] border border-[#E8EEF8] rounded-xl">
                <div className="text-[10px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-3">What You Need</div>
                {[
                  ['🪪', 'Government-issued photo ID', "Passport, national ID card, or driver's licence"],
                  ['🤳', 'Selfie / Liveness check', 'A live photo for identity matching — no printed photos'],
                ].map(([ico, t, d]) => (
                  <div key={t} className="flex items-start gap-3 mb-3 last:mb-0">
                    <span className="text-lg flex-shrink-0">{ico}</span>
                    <div>
                      <div className="text-[12px] font-semibold text-[#1A3A6B] mb-0.5">{t}</div>
                      <div className="text-[11px] text-[#8FA3BF]">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Submission record */}
          {kycRecord && !canStart && (
            <Card className="mb-4">
              <CardHeader title="Submission Details"/>
              {[
                ['Provider', kycRecord.provider === 'didit' ? 'Didit Identity' : kycRecord.provider ?? 'Didit'],
                ['Session ID', kycRecord.inquiry_id ?? '—'],
                ['Submitted', kycRecord.created_at ? new Date(kycRecord.created_at).toLocaleString() : '—'],
                ['Last Updated', kycRecord.updated_at ? new Date(kycRecord.updated_at).toLocaleString() : '—'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center py-2 border-b border-[#F4F7FD] last:border-0 text-[12px]">
                  <span className="text-[#8FA3BF]">{l}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'11px'}} className="text-[#1A3A6B]">{v}</span>
                </div>
              ))}
            </Card>
          )}

          {/* CTA */}
          <Card>
            {canStart ? (
              <>
                <p className="text-[12px] text-[#5C7A9E] mb-4 leading-relaxed">
                  {status === 'declined' || status === 'expired'
                    ? 'Please re-submit with a valid, unexpired government-issued photo ID.'
                    : "Click below to start the identity verification process. You'll be guided through each step in a new window."}
                </p>
                <Button onClick={startVerification} loading={starting} className="w-full py-3">
                  {starting ? 'Starting…' : canStart && status !== 'not_started' ? 'Re-submit Verification →' : 'Start Identity Verification →'}
                </Button>
                <p className="text-[10px] text-[#8FA3BF] mt-2 text-center">Powered by Didit — secure identity verification</p>
              </>
            ) : status === 'approved' ? (
              <div className="flex items-center gap-3 py-2">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-semibold text-[#16A34A] mb-0.5">Fully Verified</div>
                  <div className="text-[12px] text-[#5C7A9E]">Your identity has been confirmed. All platform features are available.</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <div className="font-semibold text-[#D97706] mb-0.5">Review In Progress</div>
                    <div className="text-[12px] text-[#5C7A9E]">We'll notify you once the review is complete. Usually 1–2 business days.</div>
                  </div>
                </div>
                <button
                  onClick={() => kycRecord?.inquiry_id && syncFromDidit(kycRecord.inquiry_id, kycRecord)}
                  className="text-[11px] text-[#2255CC] bg-[#EEF3FF] border border-[#C5D5FA] rounded-lg px-4 py-2 cursor-pointer font-medium hover:bg-[#E0EAFF] transition-colors"
                >
                  🔄 Check Status Now
                </button>
              </div>
            )}
          </Card>

          {/* Privacy */}
          <Card className="mt-4">
            <CardHeader title="Privacy & Security"/>
            {[
              ['🔒', 'AES-256 encryption at rest and in transit'],
              ['🇪🇺', 'GDPR compliant — data processed per EU regulations'],
              ['🗑️', 'Documents deleted automatically after verification'],
              ['👁️', 'Powered by Didit — trusted KYC provider, 500 free verifications/month'],
            ].map(([ico, t]) => (
              <div key={t} className="flex items-center gap-3 py-2 border-b border-[#F4F7FD] last:border-0 text-[12px] text-[#5C7A9E]">
                <span className="text-sm">{ico}</span>{t}
              </div>
            ))}
          </Card>

        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
