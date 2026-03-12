import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminAffiliatePage() {
  const { toasts, toast, dismiss } = useToast()
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refLoading, setRefLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [payingId, setPayingId] = useState<string|null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [showPayModal, setShowPayModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    // Load affiliates without join first
    const { data: affs } = await supabase
      .from('affiliates')
      .select('*')
      .order('total_earned_usd', { ascending: false })

    if (!affs) { setLoading(false); return }

    // Load user profiles separately
    const userIds = [...new Set(affs.map(a => a.user_id))]
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds)

    const usersMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))
    const merged = affs.map(a => ({ ...a, user: usersMap[a.user_id] ?? null }))
    setAffiliates(merged)
    setLoading(false)
  }

  async function loadReferrals(affId: string) {
    setRefLoading(true)
    const { data } = await supabase
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affId)
      .order('created_at', { ascending: false })
    setReferrals(data ?? [])
    setRefLoading(false)
  }

  function selectAffiliate(aff: any) {
    setSelected(aff)
    loadReferrals(aff.id)
  }

  async function toggleStatus(aff: any) {
    const is_active = !aff.is_active
    const { error } = await supabase.from('affiliates').update({ is_active }).eq('id', aff.id)
    if (error) { toast('error','❌','Error', error.message); return }
    setAffiliates(a => a.map(x => x.id === aff.id ? { ...x, is_active } : x))
    if (selected?.id === aff.id) setSelected((s: any) => ({ ...s, is_active }))
    toast('success','✅','Updated', `${aff.code} ${is_active ? 'activated' : 'suspended'}.`)
  }

  async function updateRate(aff: any, commission_pct: number) {
    await supabase.from('affiliates').update({ commission_pct }).eq('id', aff.id)
    setAffiliates(a => a.map(x => x.id === aff.id ? { ...x, commission_pct } : x))
    if (selected?.id === aff.id) setSelected((s: any) => ({ ...s, commission_pct }))
    toast('success','✅','Updated', `Commission rate set to ${commission_pct}%.`)
  }

  async function processPayout() {
    if (!selected) return
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) { toast('error','❌','Invalid', 'Enter a valid amount.'); return }
    const owed = (selected.total_earned_usd ?? 0) - (selected.total_paid_usd ?? 0)
    if (amount > owed) { toast('error','❌','Error', `Max payable: ${fmt(owed)}`); return }

    const { error } = await supabase.from('affiliates')
      .update({ total_paid_usd: (selected.total_paid_usd ?? 0) + amount })
      .eq('id', selected.id)

    if (error) { toast('error','❌','Error', error.message); return }

    const updated = { ...selected, total_paid_usd: (selected.total_paid_usd ?? 0) + amount }
    setAffiliate(updated)
    setAffiliates(a => a.map(x => x.id === selected.id ? updated : x))
    setShowPayModal(false)
    setPayAmount('')
    toast('success','💰','Payout Recorded', `${fmt(amount)} marked as paid to ${selected.code}.`)
  }

  function setAffiliate(aff: any) {
    setSelected(aff)
  }

  const filtered = filter === 'all' ? affiliates : affiliates.filter(a =>
    filter === 'active' ? a.is_active : !a.is_active
  )

  const totalReferrals = affiliates.reduce((s, a) => s + (a.total_referrals ?? 0), 0)
  const totalEarned    = affiliates.reduce((s, a) => s + (a.total_earned_usd ?? 0), 0)
  const totalPaid      = affiliates.reduce((s, a) => s + (a.total_paid_usd ?? 0), 0)
  const totalOwed      = totalEarned - totalPaid

  return (
    <>
      <DashboardLayout title="Affiliate Management" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-4 gap-[11px] mb-4">
          <KPICard label="Total Affiliates"   value={String(affiliates.length)}       sub={`${affiliates.filter(a=>a.is_active).length} active`}/>
          <KPICard label="Total Referrals"    value={String(totalReferrals)}           sub="All time" subColor="text-[var(--gold)]"/>
          <KPICard label="Commissions Owed"   value={fmt(totalOwed)}                   sub="Unpaid balance" subColor="text-[var(--red)]"/>
          <KPICard label="Commissions Paid"   value={fmt(totalPaid)}                   sub="All time" subColor="text-[var(--green)]"/>
        </div>

        <div className={`grid gap-[14px] ${selected ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
          {/* Left: list */}
          <Card>
            <CardHeader title={`Affiliates (${filtered.length})`}>
              <div className="flex gap-[3px]">
                {['all','active','inactive'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-[10px] py-[5px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                      filter === f ? 'bg-[rgba(255,51,82,.1)] border-[rgba(255,51,82,.3)] text-[var(--red)]' : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)]'
                    }`}>{f}</button>
                ))}
              </div>
            </CardHeader>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-[11px] text-[var(--text3)]">No affiliates yet</div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--dim)]">
                    {['Affiliate','Code','Referrals','Earned','Owed','Rate','Status',''].map(h => (
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(255,51,82,.02)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const owed = (a.total_earned_usd ?? 0) - (a.total_paid_usd ?? 0)
                    return (
                      <tr key={a.id}
                        onClick={() => selectAffiliate(a)}
                        className={`border-b border-[rgba(255,51,82,.04)] cursor-pointer transition-all ${
                          selected?.id === a.id
                            ? 'bg-[rgba(212,168,67,.06)] border-[rgba(212,168,67,.1)]'
                            : 'hover:bg-[rgba(255,51,82,.02)]'
                        }`}>
                        <td className="px-[11px] py-[8px]">
                          <div className="font-semibold">{a.user?.first_name} {a.user?.last_name}</div>
                          <div className="text-[9px] text-[var(--text3)]">{a.user?.email}</div>
                        </td>
                        <td className="px-[11px] py-[8px] font-mono text-[var(--gold)] font-bold">{a.code}</td>
                        <td className="px-[11px] py-[8px] font-mono">{a.total_referrals ?? 0}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{fmt(a.total_earned_usd ?? 0)}</td>
                        <td className="px-[11px] py-[8px] font-mono" style={{color: owed > 0 ? 'var(--red)' : 'var(--text3)'}}>{fmt(owed)}</td>
                        <td className="px-[11px] py-[8px]">
                          <select value={a.commission_pct ?? 20}
                            onChange={e => { e.stopPropagation(); updateRate(a, parseInt(e.target.value)) }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text)] font-mono text-[10px] px-2 py-1 cursor-pointer outline-none">
                            {[5,8,10,12,15,20,25,30].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-[11px] py-[8px]">
                          <span className={`text-[8px] px-2 py-1 font-bold uppercase ${a.is_active ? 'bg-[rgba(0,217,126,.1)] text-[var(--green)]' : 'bg-[rgba(255,51,82,.1)] text-[var(--red)]'}`}>
                            {a.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td className="px-[11px] py-[8px]">
                          <button onClick={e => { e.stopPropagation(); toggleStatus(a) }}
                            className={`px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer border transition-all ${
                              a.is_active
                                ? 'bg-[rgba(255,51,82,.1)] text-[var(--red)] border-[rgba(255,51,82,.2)]'
                                : 'bg-[rgba(0,217,126,.1)] text-[var(--green)] border-[rgba(0,217,126,.2)]'
                            }`}>
                            {a.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {/* Right: detail panel */}
          {selected && (
            <div className="flex flex-col gap-[14px]">
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-[14px]">{selected.user?.first_name} {selected.user?.last_name}</div>
                    <div className="text-[10px] text-[var(--text3)]">{selected.user?.email}</div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="text-[var(--text3)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none text-[16px]">✕</button>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {[
                    ['Code', <span className="font-mono font-bold text-[var(--gold)]">{selected.code}</span>],
                    ['Referrals', selected.total_referrals ?? 0],
                    ['Total Earned', fmt(selected.total_earned_usd ?? 0)],
                    ['Total Paid', fmt(selected.total_paid_usd ?? 0)],
                    ['Amount Owed', <span style={{color:(selected.total_earned_usd??0)-(selected.total_paid_usd??0)>0?'var(--red)':'var(--green)'}}>{fmt((selected.total_earned_usd??0)-(selected.total_paid_usd??0))}</span>],
                    ['Commission', `${selected.commission_pct ?? 20}%`],
                    ['Status', <span className={`text-[8px] px-2 py-1 font-bold uppercase ${selected.is_active?'bg-[rgba(0,217,126,.1)] text-[var(--green)]':'bg-[rgba(255,51,82,.1)] text-[var(--red)]'}`}>{selected.is_active?'Active':'Inactive'}</span>],
                    ['Joined', new Date(selected.created_at).toLocaleDateString()],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between items-center py-[6px] border-b border-[var(--dim)] text-[11px] last:border-0">
                      <span className="text-[var(--text3)]">{l}</span>
                      <span className="font-mono">{v as any}</span>
                    </div>
                  ))}
                </div>

                {((selected.total_earned_usd ?? 0) - (selected.total_paid_usd ?? 0)) > 0 && (
                  <Button className="w-full"
                    onClick={() => { setPayAmount(String(((selected.total_earned_usd??0)-(selected.total_paid_usd??0)).toFixed(2))); setShowPayModal(true) }}>
                    💰 Mark Payout as Paid
                  </Button>
                )}
              </Card>

              {/* Referrals for selected */}
              <Card>
                <CardHeader title={`Referrals (${referrals.length})`}/>
                {refLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="py-6 text-center text-[10px] text-[var(--text3)]">No referrals yet</div>
                ) : (
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-[var(--dim)]">
                        {['Date','Email','Status','Commission'].map(h => (
                          <th key={h} className="px-2 py-[5px] text-[7px] uppercase text-[var(--text3)] text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((r,i) => (
                        <tr key={i} className="border-b border-[var(--dim)]">
                          <td className="px-2 py-[6px] text-[9px] text-[var(--text3)]">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-2 py-[6px]">{r.referred_email ?? r.referred_user_id?.slice(0,8) ?? '—'}</td>
                          <td className="px-2 py-[6px]">
                            <span className={`text-[7px] px-1 py-[2px] font-bold uppercase ${r.status==='converted'?'bg-[rgba(0,217,126,.1)] text-[var(--green)]':'bg-[rgba(212,168,67,.08)] text-[var(--gold)]'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-2 py-[6px] font-mono text-[var(--gold)]">{r.commission_usd ? fmt(r.commission_usd) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>

      {/* Pay modal */}
      {showPayModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.7)]">
          <div className="bg-[var(--bg)] border border-[var(--bdr2)] p-6 w-[380px]">
            <div className="font-serif text-[17px] font-bold mb-1">Record Payout</div>
            <div className="text-[10px] text-[var(--text3)] mb-5">
              Marking payout for <strong>{selected.code}</strong> — owed {fmt((selected.total_earned_usd??0)-(selected.total_paid_usd??0))}
            </div>
            <div className="mb-4">
              <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Amount (USD)</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] font-mono text-[14px] outline-none"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPayModal(false)}
                className="flex-1 py-2 bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text2)] text-[10px] uppercase font-bold cursor-pointer">
                Cancel
              </button>
              <button onClick={processPayout}
                className="flex-1 py-2 bg-[var(--gold)] text-[var(--bg)] text-[10px] uppercase font-bold cursor-pointer border-none">
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
