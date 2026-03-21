import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'
import { sendEmail } from '@/lib/email'

function generateLogin()    { return `TFD${Math.floor(100000 + Math.random() * 900000)}` }
function generatePassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

const mono = { fontFamily:"'JetBrains Mono',monospace" } as const

export function AdminPendingReviewPage() {
  const { toasts, toast, dismiss } = useToast()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [notes, setNotes]       = useState<Record<string, string>>({})
  const [filter, setFilter]     = useState<'all' | 'phase1' | 'phase2' | 'funded'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('accounts')
      .select('*, users(id,first_name,last_name,email,country), challenge_products(*)')
      .eq('status', 'passed')
      .eq('phase', 'phase2')  // Only phase2 waits for admin review — phase1 auto-advances
      .order('phase_started_at', { ascending: true })
    setAccounts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function profitPct(acc: any) {
    if (!acc.starting_balance) return 0
    return ((acc.balance - acc.starting_balance) / acc.starting_balance) * 100
  }

  function targetPct(acc: any) {
    const p = acc.challenge_products
    if (acc.phase === 'phase2') return p?.ph2_profit_target ?? 5
    return p?.ph1_profit_target ?? 8
  }

  function nextPhase(acc: any) {
    if (acc.phase === 'phase1') return acc.challenge_products?.challenge_type === '1step' ? 'funded' : 'phase2'
    if (acc.phase === 'phase2') return 'funded'
    return null
  }

  function phaseLabel(phase: string) {
    if (phase === 'phase1') return 'Phase 1'
    if (phase === 'phase2') return 'Phase 2'
    return phase
  }

  async function advanceAccount(acc: any) {
    const next = nextPhase(acc)
    if (!next) return
    setAdvancing(acc.id)

    const prod   = acc.challenge_products
    const login  = generateLogin()
    const pass   = generatePassword()
    const size   = prod?.account_size ?? acc.starting_balance
    const accNum = `TFD-${Number(size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`
    const now    = new Date().toISOString()

    // Mark current account inactive
    await supabase.from('accounts').update({ status: 'inactive', phase_passed_at: now }).eq('id', acc.id)

    // Create new account
    const { data: newAcc, error } = await supabase.from('accounts').insert({
      user_id:          acc.user_id,
      product_id:       acc.product_id,
      account_number:   accNum,
      phase:            next,
      balance:          size,
      equity:           size,
      starting_balance: size,
      daily_dd_used:    0,
      max_dd_used:      0,
      trading_days:     0,
      platform_login:   login,
      server:           'TFD-Live-01',
      status:           'active',
      purchased_at:     now,
      funded_at:        next === 'funded' ? now : null,
      drawdown_type:    prod?.drawdown_type ?? 'static',
      trailing_drawdown:prod?.trailing_drawdown ?? 8,
    }).select().single()

    if (error) { toast('error','❌','Error', error.message); setAdvancing(null); return }

    // In-app notification
    await supabase.from('notifications').insert({
      user_id: acc.user_id,
      type:    'phase_advanced',
      title:   next === 'funded' ? '🎉 Congratulations — You Are Funded!' : `🎯 Advanced to ${next === 'phase2' ? 'Phase 2' : next}`,
      body:    next === 'funded'
        ? `Your account has been approved and funded! Login: ${login} | Server: TFD-Live-01`
        : `You have been advanced to Phase 2. New account: ${accNum} | Login: ${login}`,
      is_read: false,
    })

    // Send email
    try {
      await sendEmail('phase_advanced', acc.users?.email, {
        first_name:     acc.users?.first_name ?? 'Trader',
        account_number: accNum,
        from_phase:     acc.phase,
        to_phase:       next,
        login,
        password:       pass,
        server:         'TFD-Live-01',
      }, 'accounts')
    } catch (e) { console.error('[email]', e) }

    toast('success', '✅', next === 'funded' ? 'Funded!' : 'Advanced',
      `${acc.users?.first_name} advanced to ${next}. Account: ${accNum}`)
    setAdvancing(null)
    load()
  }

  async function rejectAccount(acc: any) {
    const reason = notes[acc.id]?.trim()
    if (!reason) { toast('warning','⚠️','Required','Add a rejection reason in the notes field.'); return }

    // Close the account — mark as breached with rejection reason (NOT reset to active)
    await supabase.from('accounts').update({
      status:        'breached',
      phase:         'breached',
      breached_at:   new Date().toISOString(),
      breach_reason: `Funding review rejected: ${reason}`,
    }).eq('id', acc.id)

    // In-app notification
    await supabase.from('notifications').insert({
      user_id: acc.user_id,
      type:    'risk_warning',
      title:   '❌ Funding Review Not Approved — Account Closed',
      body:    `Your ${phaseLabel(acc.phase)} review was not approved and your account has been closed. Reason: ${reason}. You may purchase a new challenge to try again.`,
      is_read: false,
    })

    // Send rejection email
    try {
      const { data: u } = await supabase.from('users').select('email,first_name').eq('id', acc.user_id).single()
      if (u?.email) {
        await sendEmail('phase_rejected', u.email, {
          first_name:     u.first_name ?? 'Trader',
          account_number: acc.account_number,
          phase:          phaseLabel(acc.phase),
          reason,
        }, 'accounts')
      }
    } catch (e) { console.error('[reject email]', e) }

    toast('warning','❌','Rejected & Closed', `${acc.account_number} closed. Rejection email sent.`)
    load()
  }

  const filtered = accounts.filter(a => filter === 'all' || a.phase === filter)
  const phase1Count  = 0 // Phase1 auto-advances to phase2 — no manual review needed
  const phase2Count  = accounts.filter(a => a.phase === 'phase2').length

  return (
    <>
      <DashboardLayout title="Pending Phase Review" nav={ADMIN_NAV} accentColor="red">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Total Pending"   value={String(accounts.length)} sub="Awaiting review" subColor={accounts.length>0?"text-[#D97706]":"text-[#16A34A]"}/>
          <KPICard label="Phase 1 → Next"  value={String(phase1Count)}     sub="1-Step or 2-Step" subColor="text-[#2255CC]"/>
          <KPICard label="Phase 2 → Funded" value={String(phase2Count)}    sub="Ready to fund" subColor="text-[#16A34A]"/>
          <KPICard label="Oldest Pending"   value={accounts.length > 0 ? (() => { const d = Math.floor((Date.now() - new Date(accounts[0].phase_started_at).getTime()) / 86400000); return `${d}d` })() : '—'} sub="Days waiting"/>
        </div>

        <Card>
          <CardHeader
            title={`Accounts Pending Review (${filtered.length})`}
            action={
              <div className="flex gap-2">
                {[['all','All'],['phase1','Phase 1'],['phase2','Phase 2']].map(([v,l])=>(
                  <button key={v} onClick={()=>setFilter(v as any)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase border cursor-pointer transition-all ${filter===v?'bg-[#2255CC] text-white border-[#2255CC]':'bg-[#F4F7FD] text-[#5C7A9E] border-[#E8EEF8]'}`}>
                    {l}
                  </button>
                ))}
                <button onClick={load} className="px-3 py-1 text-[9px] text-[#8FA3BF] border border-[#E8EEF8] bg-[#F4F7FD] cursor-pointer">↺</button>
              </div>
            }
          />

          <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">
            These accounts have hit their profit target and are awaiting your review to be advanced. Check trading stats, verify compliance, then approve or reject.
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-3xl mb-3">✅</div>
              <div className="text-[14px] font-semibold text-[#1A3A6B] mb-2">No pending reviews</div>
              <div className="text-[11px] text-[#8FA3BF]">All accounts are up to date. Check back when traders hit their targets.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {filtered.map(acc => {
                const prod    = acc.challenge_products
                const user    = acc.users
                const profit  = profitPct(acc)
                const target  = targetPct(acc)
                const next    = nextPhase(acc)
                const days    = Math.floor((Date.now() - new Date(acc.phase_started_at).getTime()) / 86400000)
                const waitDays= acc.phase_passed_at ? 0 : Math.floor((Date.now() - new Date(acc.phase_started_at).getTime()) / 86400000)
                const isAdv   = advancing === acc.id

                return (
                  <div key={acc.id} className="border border-[#E8EEF8] rounded-xl overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-[rgba(34,85,204,.03)] border-b border-[#E8EEF8]">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span style={mono} className="text-[#2255CC] text-[12px] font-bold">{acc.account_number}</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 border rounded uppercase ${
                              acc.phase === 'phase2'
                                ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]'
                                : 'text-[#2255CC] bg-[rgba(34,85,204,.08)] border-[rgba(34,85,204,.2)]'
                            }`}>
                              {phaseLabel(acc.phase)} → {next === 'funded' ? '🏆 Funded' : 'Phase 2'}
                            </span>
                            <span className="text-[9px] text-[#D97706] bg-[rgba(217,119,6,.08)] border border-[rgba(217,119,6,.2)] px-2 py-0.5 rounded font-bold animate-pulse">
                              ⏳ PENDING REVIEW
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-[#1A3A6B]">
                            {user?.first_name} {user?.last_name}
                            <span className="text-[#8FA3BF] font-normal ml-2">{user?.email}</span>
                            <span className="text-[#8FA3BF] font-normal ml-2">· {user?.country}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-[#8FA3BF]">
                        Waiting <span className="font-bold text-[#D97706]">{days} day{days !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-6 gap-0 border-b border-[#E8EEF8]">
                      {[
                        { label: 'Account Size',   value: `$${Number(acc.starting_balance).toLocaleString()}` },
                        { label: 'Current Balance', value: `$${Number(acc.balance).toLocaleString()}`,        color: acc.balance >= acc.starting_balance ? '#16A34A' : '#DC2626' },
                        { label: 'Profit %',        value: `${profit >= 0 ? '+' : ''}${profit.toFixed(2)}%`, color: profit >= target ? '#16A34A' : '#D97706' },
                        { label: 'Target',          value: `${target}%` },
                        { label: 'Trading Days',    value: String(acc.trading_days ?? 0) },
                        { label: 'Challenge Type',  value: prod?.challenge_type === '1step' ? '1-Step' : prod?.challenge_type === 'instant' ? 'Instant' : '2-Step' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="px-4 py-3 border-r border-[#E8EEF8] last:border-0">
                          <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-1">{label}</div>
                          <div className="text-[13px] font-bold" style={{ ...mono, color: color ?? '#1A3A6B' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Drawdown info */}
                    <div className="grid grid-cols-3 gap-0 border-b border-[#E8EEF8]">
                      <div className="px-4 py-2 border-r border-[#E8EEF8]">
                        <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-0.5">Daily DD Used</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#F0F4FB] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((acc.daily_dd_used / (prod?.ph1_daily_dd ?? 5)) * 100, 100)}%`, background: acc.daily_dd_used >= (prod?.ph1_daily_dd ?? 5) * 0.8 ? '#DC2626' : '#2255CC' }}/>
                          </div>
                          <span style={mono} className="text-[10px] text-[#1A3A6B]">{(acc.daily_dd_used ?? 0).toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-r border-[#E8EEF8]">
                        <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-0.5">Max DD Used</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#F0F4FB] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min((acc.max_dd_used / (prod?.ph1_max_dd ?? 10)) * 100, 100)}%`, background: acc.max_dd_used >= (prod?.ph1_max_dd ?? 10) * 0.8 ? '#DC2626' : '#16A34A' }}/>
                          </div>
                          <span style={mono} className="text-[10px] text-[#1A3A6B]">{(acc.max_dd_used ?? 0).toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="px-4 py-2">
                        <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-0.5">DD Type</div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 border rounded ${acc.drawdown_type === 'trailing' ? 'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]' : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                          {acc.drawdown_type === 'trailing' ? `⟳ Trailing ${acc.trailing_drawdown ?? prod?.trailing_drawdown ?? 8}%` : '— Static'}
                        </span>
                      </div>
                    </div>

                    {/* CRM actions */}
                    <div className="px-5 py-4 flex items-end gap-4">
                      <div className="flex-1">
                        <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-1">
                          Review Notes (required for rejection)
                        </label>
                        <textarea
                          value={notes[acc.id] ?? ''}
                          onChange={e => setNotes(n => ({ ...n, [acc.id]: e.target.value }))}
                          placeholder="Add compliance notes, reason for approval or rejection…"
                          rows={2}
                          className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#E8EEF8] text-[11px] text-[#1A3A6B] outline-none focus:border-[#2255CC] rounded resize-none"
                        />
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => advanceAccount(acc)}
                          disabled={isAdv}
                          className={`px-5 py-2.5 text-[10px] font-bold uppercase border-none rounded cursor-pointer flex items-center gap-2 transition-all ${
                            next === 'funded'
                              ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                              : 'bg-[#2255CC] text-white hover:bg-[#1A44B0]'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}>
                          {isAdv ? (
                            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Processing…</span></>
                          ) : (
                            <>{next === 'funded' ? '🏆 Fund Account' : '✅ Advance to Phase 2'}</>
                          )}
                        </button>
                        <button
                          onClick={() => rejectAccount(acc)}
                          disabled={isAdv}
                          className="px-5 py-2 text-[10px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer hover:bg-[rgba(220,38,38,.15)] disabled:opacity-50">
                          ❌ Reject & Return
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}