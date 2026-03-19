import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

const STATUS_COLORS: Record<string, string> = {
  pending:      'bg-[rgba(34,85,204,.08)] text-[#2255CC]',
  approved:     'bg-[rgba(22,163,74,.1)] text-[#16A34A]',
  declined:     'bg-[rgba(220,38,38,.1)] text-[#DC2626]',
  needs_review: 'bg-[rgba(34,85,204,.08)] text-[#2255CC]',
  not_started:  'bg-[rgba(255,255,255,.05)] text-[#8FA3BF]',
}

export function AdminKycPage() {
  const { toasts, toast, dismiss } = useToast()
  const [records, setRecords] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: kycs }, { data: usrs }] = await Promise.all([
      supabase.from('kyc_verifications').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, first_name, last_name, email, country, kyc_status').eq('role', 'trader'),
    ])
    const kycMap = Object.fromEntries((kycs ?? []).map(k => [k.user_id, k]))
    const merged = (usrs ?? []).map(u => ({ ...u, kyc: kycMap[u.id] ?? null }))
    setRecords(merged)
    setLoading(false)
  }

  async function updateStatus(userId: string, kycId: string | null, status: string) {
    setUpdating(true)
    await supabase.from('users').update({ kyc_status: status }).eq('id', userId)
    if (kycId) await supabase.from('kyc_verifications').update({ status }).eq('id', kycId)
    setRecords(prev => prev.map(r => r.id === userId ? { ...r, kyc_status: status, kyc: r.kyc ? { ...r.kyc, status } : null } : r))
    if (selected?.id === userId) setSelected((s: any) => ({ ...s, kyc_status: status }))
    toast('success', '✅', 'Updated', `KYC status set to ${status}.`)

    // Email notification
    try {
      const trader = records.find(r => r.id === userId)
      if (trader?.email) {
        if (status === 'approved') {
          await sendEmail('kyc_approved', trader.email, { first_name: trader.first_name ?? 'Trader' })
        } else if (status === 'declined') {
          await sendEmail('kyc_declined', trader.email, { first_name: trader.first_name ?? 'Trader' })
        }
      }
    } catch (e) { console.error('[email]', e) }
    setUpdating(false)
  }

  const filtered = records.filter(r => {
    if (filter === 'all') return true
    return (r.kyc?.status ?? r.kyc_status ?? 'not_started') === filter
  })

  const counts = {
    pending:   records.filter(r => (r.kyc?.status ?? r.kyc_status) === 'pending').length,
    approved:  records.filter(r => (r.kyc?.status ?? r.kyc_status) === 'approved').length,
    declined:  records.filter(r => (r.kyc?.status ?? r.kyc_status) === 'declined').length,
    none:      records.filter(r => !(r.kyc?.status ?? r.kyc_status) || (r.kyc?.status ?? r.kyc_status) === 'not_started').length,
  }

  return (
    <>
      <DashboardLayout title="KYC Verification" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Pending Review" value={String(counts.pending)}  sub="Awaiting decision" subColor="text-[#2255CC]"/>
          <KPICard label="Approved"       value={String(counts.approved)} sub="Verified" subColor="text-[#16A34A]"/>
          <KPICard label="Declined"       value={String(counts.declined)} sub="Rejected" subColor="text-[#DC2626]"/>
          <KPICard label="Not Started"    value={String(counts.none)}     sub="No submission"/>
        </div>

        <div className={`grid gap-[14px] ${selected ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
          <Card>
            <CardHeader title={`Traders (${filtered.length})`}>
              <div className="flex gap-[3px]">
                {['all','pending','approved','declined','not_started'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-[9px] py-[4px] text-[7px] tracking-[1px] uppercase font-semibold cursor-pointer border transition-all ${filter===f ? 'bg-[rgba(220,38,38,.1)] border-[rgba(255,51,82,.3)] text-[#DC2626]' : 'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF]'}`}>
                    {f.replace('_',' ')}
                  </button>
                ))}
              </div>
            </CardHeader>

            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[#F0F4FB]">
                    {['Trader','Email','Country','Provider','Inquiry ID','Status','Actions'].map(h => (
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(220,38,38,.02)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const kycStatus = r.kyc?.status ?? r.kyc_status ?? 'not_started'
                    return (
                      <tr key={r.id}
                        onClick={() => setSelected(r)}
                        className={`border-b border-[rgba(220,38,38,.04)] cursor-pointer transition-all ${selected?.id===r.id?'bg-[rgba(34,85,204,.05)]':'hover:bg-[rgba(220,38,38,.02)]'}`}>
                        <td className="px-[11px] py-[9px] font-semibold">{r.first_name} {r.last_name}</td>
                        <td className="px-[11px] py-[9px] text-[#8FA3BF] text-[10px]">{r.email}</td>
                        <td className="px-[11px] py-[9px] text-[#8FA3BF] text-[10px]">{r.country ?? '—'}</td>
                        <td className="px-[11px] py-[9px] text-[10px]">{r.kyc?.provider ?? '—'}</td>
                        <td className="px-[11px] py-[9px] font-['JetBrains_Mono',monospace] text-[9px] text-[#8FA3BF]">{r.kyc?.inquiry_id?.slice(0,20) ?? '—'}</td>
                        <td className="px-[11px] py-[9px]">
                          <span className={`text-[8px] px-2 py-1 font-bold uppercase ${STATUS_COLORS[kycStatus] ?? STATUS_COLORS.not_started}`}>
                            {kycStatus.replace('_',' ')}
                          </span>
                        </td>
                        <td className="px-[11px] py-[9px]">
                          {kycStatus === 'pending' && (
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => updateStatus(r.id, r.kyc?.id, 'approved')} disabled={updating}
                                className="px-[7px] py-[3px] text-[8px] font-bold uppercase cursor-pointer bg-[rgba(22,163,74,.1)] text-[#16A34A] border border-[rgba(0,217,126,.2)] hover:bg-[rgba(0,217,126,.2)] transition-colors">
                                Approve
                              </button>
                              <button onClick={() => updateStatus(r.id, r.kyc?.id, 'declined')} disabled={updating}
                                className="px-[7px] py-[3px] text-[8px] font-bold uppercase cursor-pointer bg-[rgba(220,38,38,.1)] text-[#DC2626] border border-[rgba(255,51,82,.2)] hover:bg-[rgba(255,51,82,.2)] transition-colors">
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {selected && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-semibold text-[14px]">{selected.first_name} {selected.last_name}</div>
                  <div className="text-[10px] text-[#8FA3BF]">{selected.email}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] cursor-pointer bg-transparent border-none text-[16px]">✕</button>
              </div>

              <div className="flex flex-col gap-2 mb-4">
                {[
                  ['Country', selected.country ?? '—'],
                  ['KYC Status', <span className={`text-[8px] px-2 py-1 font-bold uppercase ${STATUS_COLORS[selected.kyc?.status ?? selected.kyc_status ?? 'not_started']}`}>{(selected.kyc?.status ?? selected.kyc_status ?? 'not_started').replace('_',' ')}</span>],
                  ['Provider', selected.kyc?.provider ?? 'Not submitted'],
                  ['Inquiry ID', selected.kyc?.inquiry_id ?? '—'],
                  ['Submitted', selected.kyc?.created_at ? formatDate(selected.kyc.created_at) : '—'],
                  ['Last Update', selected.kyc?.updated_at ? formatDate(selected.kyc.updated_at) : '—'],
                ].map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between items-center py-[6px] border-b border-[#F0F4FB] text-[11px] last:border-0">
                    <span className="text-[#8FA3BF]">{l}</span>
                    <span className="font-['JetBrains_Mono',monospace]">{v as any}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {['approved','pending','declined','needs_review'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, selected.kyc?.id, s)} disabled={updating}
                    className={`py-2 text-[9px] uppercase font-bold cursor-pointer border transition-all ${
                      s === 'approved' ? 'bg-[rgba(22,163,74,.1)] text-[#16A34A] border-[rgba(0,217,126,.2)] hover:bg-[rgba(0,217,126,.2)]' :
                      s === 'declined' ? 'bg-[rgba(220,38,38,.1)] text-[#DC2626] border-[rgba(255,51,82,.2)] hover:bg-[rgba(255,51,82,.2)]' :
                      'bg-[#F4F7FD] text-[#5C7A9E] border-[#F0F4FB] hover:border-[#C5D5EA]'
                    }`}>
                    Set {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
