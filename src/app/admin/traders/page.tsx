import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { phaseLabel } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

function generateLogin() { return `TFD${Math.floor(100000 + Math.random() * 900000)}` }
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function AdminTradersPage() {
  const { toasts, toast, dismiss } = useToast()
  const [traders, setTraders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTrader, setSelectedTrader] = useState<any>(null)
  const [traderAccounts, setTraderAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [ipTrader, setIpTrader] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  // Add account modal
  const [addAccModal, setAddAccModal] = useState(false)
  const [addAccProduct, setAddAccProduct] = useState('')
  const [addAccPhase, setAddAccPhase] = useState('phase1')
  const [addAccLoading, setAddAccLoading] = useState(false)
  // Edit balance modal
  const [editBalAcc, setEditBalAcc] = useState<any>(null)
  const [editBalValue, setEditBalValue] = useState('')

  const location = useLocation()

  // Auto-open trader when navigating from a notification
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const accountNumber = params.get('account')
    if (!accountNumber || traders.length === 0) return

    // Find trader that owns this account number
    supabase.from('accounts')
      .select('user_id')
      .eq('account_number', accountNumber)
      .single()
      .then(({ data }) => {
        if (!data) return
        const trader = traders.find(t => t.id === data.user_id)
        if (trader) openTrader(trader)
      })
  }, [location.search, traders.length])

  useEffect(() => {
    supabase.from('users')
      .select('*, accounts(id, phase, balance, starting_balance)')
      .eq('role', 'trader')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTraders(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
    supabase.from('challenge_products').select('*').eq('is_active', true)
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  const filtered = traders.filter(t =>
    !search ||
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    (t.last_login_ip ?? '').includes(search)
  )

  async function openTrader(trader: any) {
    setSelectedTrader(trader)
    setLoadingAccounts(true)
    const { data } = await supabase.from('accounts')
      .select('*, challenge_products(*)')
      .eq('user_id', trader.id)
      .order('created_at', { ascending: false })
    setTraderAccounts(data ?? [])
    setLoadingAccounts(false)
  }

  async function setRole(id: string, role: string) {
    await supabase.from('users').update({ role }).eq('id', id)
    setTraders(ts => ts.map(t => t.id === id ? { ...t, role } : t))
    if (selectedTrader?.id === id) setSelectedTrader((t: any) => ({ ...t, role }))
    toast('success', '✅', 'Updated', `Role set to ${role}.`)
  }

  async function banTrader(id: string, banned: boolean) {
    await supabase.from('users').update({ is_banned: !banned }).eq('id', id)
    setTraders(ts => ts.map(t => t.id === id ? { ...t, is_banned: !banned } : t))
    if (selectedTrader?.id === id) setSelectedTrader((t: any) => ({ ...t, is_banned: !banned }))
    toast(!banned ? 'error' : 'success', !banned ? '🚫' : '✅', !banned ? 'Banned' : 'Unbanned', `Trader ${!banned ? 'banned' : 'unbanned'}.`)
  }

  async function advancePhase(account: any) {
    const nextPhase = account.phase === 'phase1' ? 'phase2' : account.phase === 'phase2' ? 'funded' : null
    if (!nextPhase) return
    const prod = account.challenge_products
    const login = generateLogin()
    const password = generatePassword()
    const size = prod?.account_size ?? account.starting_balance
    const accountNumber = `TFD-${Number(size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`

    // Close current account
    await supabase.from('accounts').update({ status: 'inactive', phase: nextPhase === 'phase2' ? 'passed' : 'passed' }).eq('id', account.id)

    // Create new account
    const now = new Date().toISOString()
    const { error } = await supabase.from('accounts').insert({
      user_id: selectedTrader.id,
      product_id: account.product_id,
      account_number: accountNumber,
      phase: nextPhase,
      balance: size,
      equity: size,
      starting_balance: size,
      daily_dd_used: 0,
      max_dd_used: 0,
      trading_days: 0,
      platform_login: login,
      server: 'TFD-Live-01',
      status: 'active',
      purchased_at: now,
      // Set funded_at when advancing to funded — needed for certificate generation
      funded_at: nextPhase === 'funded' ? now : null,
    })
    if (error) { toast('error', '❌', 'Error', error.message); return }
    toast('success', '✅', 'Advanced', `Account moved to ${nextPhase}.`)

    // Send phase advance email to trader
    try {
      const { data: trader } = await supabase
        .from('users').select('email, first_name').eq('id', selectedTrader.id).single()
      if (trader?.email) {
        await sendEmail('phase_advanced', trader.email, {
          first_name:     trader.first_name ?? 'Trader',
          account_number: accountNumber,
          from_phase:     account.phase,
          to_phase:       nextPhase,
          login,
          server:         'TFD-Live-01',
        })
      }
    } catch (e) { console.error('[email]', e) }

    openTrader(selectedTrader)
  }

  async function editBalance(account: any, newBal: number) {
    const { error } = await supabase.from('accounts').update({ balance: newBal, equity: newBal }).eq('id', account.id)
    if (error) { toast('error', '❌', 'Error', error.message); return }

    const prod = account.challenge_products ?? account.product
    if (prod && (account.phase === 'phase1' || account.phase === 'phase2')) {
      const dailyLimit = account.phase === 'phase2' ? (prod.ph2_daily_dd ?? prod.ph1_daily_dd ?? 5) : (prod.ph1_daily_dd ?? 5)
      const maxLimit   = account.phase === 'phase2' ? (prod.ph2_max_dd ?? prod.ph1_max_dd ?? 10) : (prod.ph1_max_dd ?? 10)
      const targetPct  = account.phase === 'phase2' ? (prod.ph2_profit_target ?? 5) : (prod.ph1_profit_target ?? 8)
      const profitPct  = account.starting_balance > 0 ? ((newBal - account.starting_balance) / account.starting_balance) * 100 : 0

      if ((account.daily_dd_used ?? 0) >= dailyLimit || (account.max_dd_used ?? 0) >= maxLimit) {
        if (account.status !== 'breached') {
          await supabase.from('accounts').update({ status: 'breached', phase: 'breached' }).eq('id', account.id)
          await supabase.from('notifications').insert([
            { user_id: account.user_id, type: 'breach', title: 'Account Breached',
              body: `Account ${account.account_number} breached due to drawdown limits.`, is_read: false },
            { user_id: null, type: 'admin_breach', title: `Account Breached — ${account.account_number}`,
              body: `${selectedTrader?.first_name} ${selectedTrader?.last_name} breached ${account.account_number}.`, is_read: false }
          ])
          toast('warning', '🚨', 'Account Breached', `${account.account_number} breached.`)
          // Email trader
          try {
            const { data: trader } = await supabase.from('users').select('email,first_name').eq('id', account.user_id).single()
            if (trader?.email) sendEmail('account_breached', trader.email, { first_name: trader.first_name ?? 'Trader', account_number: account.account_number, reason: 'Drawdown limit exceeded.', balance: `$${newBal.toLocaleString()}` })
          } catch(e) {}
        }
      } else if (profitPct >= targetPct && account.status !== 'passed' && account.status !== 'breached') {
        await supabase.from('accounts').update({ status: 'passed' }).eq('id', account.id)
        await supabase.from('notifications').insert([
          { user_id: account.user_id, type: 'target_reached', title: 'Profit Target Reached!',
            body: `Account ${account.account_number} hit the ${targetPct}% target. Awaiting review.`, is_read: false },
          { user_id: null, type: 'admin_target_reached', title: `Trader Target Reached — ${account.account_number}`,
            body: `${selectedTrader?.first_name} ${selectedTrader?.last_name} reached ${(Number(profitPct) || 0).toFixed(2)}% on ${account.account_number}. Review and advance phase.`, is_read: false }
        ])
        toast('success', '🎯', 'Target Reached', `${account.account_number} hit profit target.`)
        // Email trader
        try {
          const { data: trader } = await supabase.from('users').select('email,first_name').eq('id', account.user_id).single()
          if (trader?.email) sendEmail('phase_advanced', trader.email, { first_name: trader.first_name ?? 'Trader', account_number: account.account_number, from_phase: account.phase, to_phase: 'review', login: account.platform_login ?? '', server: account.server ?? 'TFD-Live-01' })
        } catch(e) {}
      }
    }

    toast('success', '✅', 'Balance Updated', `Set to $${newBal.toLocaleString()}`)
    setEditBalAcc(null)
    openTrader(selectedTrader)
  }

  async function addAccountManually() {
    if (!addAccProduct) { toast('warning', '⚠️', 'Required', 'Select a product.'); return }
    setAddAccLoading(true)
    const prod = products.find(p => p.id === addAccProduct)
    if (!prod) { setAddAccLoading(false); return }
    const login = generateLogin()
    const password = generatePassword()
    const size = prod.account_size
    const accountNumber = `TFD-${Number(size)/1000}K-${Math.floor(1000 + Math.random() * 9000)}`
    const { error } = await supabase.from('accounts').insert({
      user_id: selectedTrader.id,
      product_id: prod.id,
      account_number: accountNumber,
      phase: addAccPhase,
      balance: size,
      equity: size,
      starting_balance: size,
      daily_dd_used: 0,
      max_dd_used: 0,
      trading_days: 0,
      platform_login: login,
      server: 'TFD-Live-01',
      status: 'active',
    })
    setAddAccLoading(false)
    if (error) { toast('error', '❌', 'Error', error.message); return }
    toast('success', '✅', 'Account Added', `${accountNumber} created.`)
    // Email trader about new account
    try {
      const { data: trader } = await supabase.from('users').select('email,first_name').eq('id', selectedTrader.id).single()
      if (trader?.email) {
        sendEmail('order_confirmation', trader.email, {
          first_name:     trader.first_name ?? 'Trader',
          order_number:   accountNumber,
          product_name:   prod.name,
          account_size:   Number(prod.account_size).toLocaleString(),
          account_number: accountNumber,
          login,
          password,
          server:         'TFD-Live-01',
          amount:         '0.00',
          phase:          addAccPhase,
        })
      }
    } catch(e) {}
    setAddAccModal(false)
    openTrader(selectedTrader)
  }

  const inp = "flex-1 px-3 py-[9px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans placeholder-[rgba(230,226,248,.3)]"

  return (
    <>
      <DashboardLayout title="Trader Management" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`All Traders (${filtered.length})`} action={
            <span className="text-[10px] text-[#8FA3BF]">{traders.length} total registered</span>
          }/>
          <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] mb-3 transition-colors">
            <span className="px-3 flex items-center text-[#8FA3BF]">🔍</span>
            <input className={inp} placeholder="Search name, email or IP…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[#8FA3BF]">No traders found</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#F0F4FB]">
                  {['Name','Email','Country','Last IP','Last Login','Accounts','Best Phase','Status','Role','Joined','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(220,38,38,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const accounts = t.accounts ?? []
                  const bestPhase = accounts.find((a:any)=>a.phase==='funded')?.phase
                    ?? accounts.find((a:any)=>a.phase==='phase2')?.phase
                    ?? accounts[0]?.phase ?? '—'
                  return (
                    <tr key={t.id} className={`border-b border-[rgba(220,38,38,.04)] hover:bg-[rgba(220,38,38,.03)] cursor-pointer ${t.is_banned ? 'opacity-50' : ''}`}>
                      <td className="px-[11px] py-[8px] font-semibold" onClick={()=>openTrader(t)}>
                        <span className="hover:text-[#2255CC] transition-colors">{t.first_name} {t.last_name}</span>
                      </td>
                      <td className="px-[11px] py-[8px] text-[#5C7A9E]">{t.email}</td>
                      <td className="px-[11px] py-[8px] text-[#8FA3BF]">{t.country ?? '—'}</td>
                      <td className="px-[11px] py-[8px]">
                        {t.last_login_ip ? (
                          <button onClick={e=>{e.stopPropagation();setIpTrader(t)}}
                            className=" text-[10px] text-[#2255CC] bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] px-[6px] py-[2px] cursor-pointer hover:bg-[rgba(34,85,204,.15)] transition-all">
                            {t.last_login_ip}
                          </button>
                        ) : <span className="text-[#8FA3BF]">—</span>}
                      </td>
                      <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">
                        {t.last_login_at ? new Date(t.last_login_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-[11px] py-[8px] ">{accounts.length}</td>
                      <td className="px-[11px] py-[8px]">
                        {bestPhase !== '—' ? <Badge variant={bestPhase as any}>{bestPhase}</Badge> : <span className="text-[#8FA3BF]">—</span>}
                      </td>
                      <td className="px-[11px] py-[8px]">
                        {t.is_banned
                          ? <span className="text-[8px] uppercase font-bold text-[#DC2626] bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.2)] px-[6px] py-[2px]">Banned</span>
                          : <span className="text-[8px] uppercase font-bold text-[#16A34A]">Active</span>
                        }
                      </td>
                      <td className="px-[11px] py-[8px]"><Badge variant={t.role==='admin'?'warning':'open'}>{t.role}</Badge></td>
                      <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-[11px] py-[8px]" onClick={e=>e.stopPropagation()}>
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={()=>openTrader(t)}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[#C5D5EA]">
                            View
                          </button>
                          <button onClick={()=>banTrader(t.id, t.is_banned)}
                            className={`px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer border ${t.is_banned ? 'bg-[rgba(0,200,100,.1)] text-[#16A34A] border-[rgba(0,200,100,.2)]' : 'bg-[rgba(220,38,38,.1)] text-[#DC2626] border-[rgba(220,38,38,.2)]'}`}>
                            {t.is_banned ? 'Unban' : 'Ban'}
                          </button>
                          {t.role !== 'admin' && (
                            <button onClick={()=>setRole(t.id,'admin')}
                              className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(220,38,38,.1)] text-[#DC2626] border border-[rgba(220,38,38,.2)]">
                              Admin
                            </button>
                          )}
                          {t.role !== 'trader' && (
                            <button onClick={()=>setRole(t.id,'trader')}
                              className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[#C5D5EA]">
                              Trader
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* ── Trader Detail Modal ── */}
        {selectedTrader && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-6 overflow-y-auto" onClick={()=>setSelectedTrader(null)}>
            <div className="bg-white border border-[#E8EEF8] w-full max-w-[760px] my-6" onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EEF8]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.2)] flex items-center justify-center font-bold text-[#DC2626] text-[13px]">
                    {selectedTrader.first_name?.[0]}{selectedTrader.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-sans text-[16px] font-bold">{selectedTrader.first_name} {selectedTrader.last_name}</div>
                    <div className="text-[10px] text-[#8FA3BF]">{selectedTrader.email} · {selectedTrader.country ?? '—'}</div>
                  </div>
                  {selectedTrader.is_banned && <span className="text-[8px] uppercase font-bold text-[#DC2626] bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.2)] px-[8px] py-[3px]">Banned</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setAddAccModal(true)}
                    className="px-[12px] py-[6px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[#C5D5EA]">
                    + Add Account
                  </button>
                  <button onClick={()=>banTrader(selectedTrader.id, selectedTrader.is_banned)}
                    className={`px-[12px] py-[6px] text-[8px] uppercase font-bold cursor-pointer border ${selectedTrader.is_banned ? 'bg-[rgba(0,200,100,.1)] text-[#16A34A] border-[rgba(0,200,100,.2)]' : 'bg-[rgba(220,38,38,.1)] text-[#DC2626] border-[rgba(220,38,38,.2)]'}`}>
                    {selectedTrader.is_banned ? '✓ Unban' : '🚫 Ban Trader'}
                  </button>
                  <button onClick={()=>setSelectedTrader(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] text-[18px] cursor-pointer bg-none border-none ml-2">✕</button>
                </div>
              </div>

              {/* Info row */}
              <div className="grid grid-cols-4 gap-0 border-b border-[#E8EEF8]">
                {[
                  ['Last IP', selectedTrader.last_login_ip ?? '—'],
                  ['Last Login', selectedTrader.last_login_at ? new Date(selectedTrader.last_login_at).toLocaleString() : '—'],
                  ['Joined', new Date(selectedTrader.created_at).toLocaleDateString()],
                  ['Role', selectedTrader.role],
                ].map(([l,v])=>(
                  <div key={l} className="px-5 py-3 border-r border-[#E8EEF8] last:border-0">
                    <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-1">{l}</div>
                    <div className=" text-[11px] text-[#2255CC]">{v}</div>
                  </div>
                ))}
              </div>

              {/* Accounts */}
              <div className="px-6 py-5">
                <div className="text-[9px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-4">Accounts ({traderAccounts.length})</div>
                {loadingAccounts ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
                ) : traderAccounts.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No accounts yet</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {traderAccounts.map(acc => {
                      const prod = acc.challenge_products
                      const profitPct = acc.starting_balance > 0
                        ? ((acc.balance - acc.starting_balance) / acc.starting_balance) * 100 : 0
                      const canAdvance = acc.phase === 'phase1' || acc.phase === 'phase2'
                      const nextPhase = acc.phase === 'phase1' ? 'Phase 2' : acc.phase === 'phase2' ? 'Funded' : null
                      return (
                        <div key={acc.id} className={`border p-4 ${acc.status === 'inactive' ? 'opacity-50 border-[#F0F4FB]' : 'border-[#C5D5EA]'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className=" text-[#2255CC] text-[11px]">{acc.account_number}</div>
                              <div className="text-[10px] text-[#8FA3BF]">{prod?.name ?? '—'} · Server: {acc.server}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={phaseVariant(acc.phase)}>{phaseLabel(acc.phase)}</Badge>
                              {acc.status === 'inactive' && <span className="text-[8px] text-[#8FA3BF] uppercase">Inactive</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 mb-3 text-[10px]">
                            {[
                              ['Balance', `$${Number(acc.balance).toLocaleString()}`],
                              ['Starting', `$${Number(acc.starting_balance).toLocaleString()}`],
                              ['Daily DD', `${acc.daily_dd_used ?? 0}%`],
                              ['Max DD', `${acc.max_dd_used ?? 0}%`],
                            ].map(([l,v])=>(
                              <div key={l} className="bg-[#F4F7FD] border border-[#F0F4FB] px-3 py-2">
                                <div className="text-[8px] uppercase tracking-[1px] text-[#8FA3BF] mb-1">{l}</div>
                                <div className=" font-bold">{v}</div>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-[#8FA3BF] mb-3">
                            Login: <span className=" text-[#1A3A6B]">{acc.platform_login}</span>
                            &nbsp;·&nbsp;P&L: <span className={profitPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}>{profitPct >= 0 ? '+' : ''}{(Number(profitPct) || 0).toFixed(2)}%</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {canAdvance && acc.status !== 'inactive' && acc.phase !== 'breached' && (
                              <button onClick={()=>advancePhase(acc)}
                                className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[#C5D5EA]">
                                → Move to {nextPhase}
                              </button>
                            )}
                            {acc.status !== 'inactive' && (
                              <button onClick={()=>{ setEditBalAcc(acc); setEditBalValue(String(acc.balance)) }}
                                className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(59,130,246,.1)] text-blue-400 border border-[rgba(59,130,246,.2)]">
                                Edit Balance
                              </button>
                            )}
                            {acc.phase !== 'breached' && acc.status !== 'inactive' && (
                              <button onClick={async ()=>{
                                await supabase.from('accounts').update({ status: 'breached', phase: 'breached' }).eq('id', acc.id)
                                toast('warning','⛔','Breached',`${acc.account_number} marked as breached.`)
                                // Email trader
                                try {
                                  const { data: trader } = await supabase.from('users').select('email,first_name').eq('id', acc.user_id).single()
                                  if (trader?.email) {
                                    sendEmail('account_breached', trader.email, {
                                      first_name: trader.first_name ?? 'Trader',
                                      account_number: acc.account_number,
                                      reason: 'Account marked as breached by risk management.',
                                      balance: `$${Number(acc.balance).toLocaleString()}`,
                                    })
                                  }
                                } catch(e) {}
                                openTrader(selectedTrader)
                              }}
                                className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-amber-50 text-[#2255CC] border border-amber-200">
                                Mark Breached
                              </button>
                            )}
                            <button onClick={async ()=>{
                              if (!window.confirm(`Delete account ${acc.account_number}? This will also delete all trades, payouts and related data. Cannot be undone.`)) return
                              try {
                                // Delete in FK order to avoid constraint violations
                                await supabase.from('trades').delete().eq('account_id', acc.id)
                                await supabase.from('payouts').delete().eq('account_id', acc.id)
                                await supabase.from('daily_snapshots').delete().eq('account_id', acc.id)
                                await supabase.from('bogo_rewards').delete().eq('primary_account_id', acc.id)
                                await supabase.from('bogo_rewards').delete().eq('bogo_account_id', acc.id)
                                const { error } = await supabase.from('accounts').delete().eq('id', acc.id)
                                if (error) throw error
                                toast('error','🗑','Deleted',`${acc.account_number} deleted.`)
                                openTrader(selectedTrader)
                              } catch (e: any) {
                                toast('error','❌','Delete Failed', e?.message ?? 'Could not delete account. Check for related records.')
                              }
                            }}
                              className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(220,38,38,.1)] text-[#DC2626] border border-[rgba(220,38,38,.2)]">
                              Delete
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── IP History Modal ── */}
        {ipTrader && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={()=>setIpTrader(null)}>
            <div className="bg-white border border-[#E8EEF8] w-full max-w-[440px] p-6" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-sans text-[15px] font-bold">{ipTrader.first_name} {ipTrader.last_name} — IP History</div>
                  <div className="text-[10px] text-[#8FA3BF]">{ipTrader.email}</div>
                </div>
                <button onClick={()=>setIpTrader(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] text-[18px] cursor-pointer bg-none border-none">✕</button>
              </div>
              <div className="p-3 bg-[#F4F7FD] border border-[#F0F4FB] mb-4">
                <div className="text-[8px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-1">Last Login</div>
                <div className="flex justify-between">
                  <span className=" text-[#2255CC]">{ipTrader.last_login_ip ?? '—'}</span>
                  <span className="text-[10px] text-[#8FA3BF]">{ipTrader.last_login_at ? new Date(ipTrader.last_login_at).toLocaleString() : '—'}</span>
                </div>
              </div>
              <div className="text-[8px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-2">History</div>
              {ipTrader.login_history?.length > 0 ? (
                <div className="flex flex-col gap-[3px] max-h-[240px] overflow-y-auto">
                  {[...ipTrader.login_history].reverse().map((e: any, i: number) => (
                    <div key={i} className="flex justify-between items-center px-3 py-[5px] bg-[#F4F7FD] border border-[#F0F4FB] text-[11px]">
                      <span className=" text-[#2255CC]">{e.ip}</span>
                      <span className="text-[#8FA3BF] text-[10px]">{new Date(e.at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[#8FA3BF] py-4 text-center">No history yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── Add Account Modal ── */}
        {addAccModal && selectedTrader && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6" onClick={()=>setAddAccModal(false)}>
            <div className="bg-white border border-[#E8EEF8] w-full max-w-[400px] p-6" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="font-sans text-[15px] font-bold">Add Account Manually</div>
                <button onClick={()=>setAddAccModal(false)} className="text-[#8FA3BF] hover:text-[#1A3A6B] text-[18px] cursor-pointer bg-none border-none">✕</button>
              </div>
              <div className="mb-4">
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Challenge Product</label>
                <select value={addAccProduct} onChange={e=>setAddAccProduct(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none">
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price_usd})</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Starting Phase</label>
                <select value={addAccPhase} onChange={e=>setAddAccPhase(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none">
                  {['phase1','phase2','funded'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button onClick={addAccountManually} disabled={addAccLoading}
                className="w-full py-[12px] text-[9px] tracking-[2px] uppercase font-bold bg-[#2255CC] text-[#F0F4FB] border-none cursor-pointer hover:bg-[#1A44B0] transition-all disabled:opacity-50">
                {addAccLoading ? 'Creating…' : 'Create Account →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Edit Balance Modal ── */}
        {editBalAcc && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6" onClick={()=>setEditBalAcc(null)}>
            <div className="bg-white border border-[#E8EEF8] w-full max-w-[360px] p-6" onClick={e=>e.stopPropagation()}>
              <div className="font-sans text-[15px] font-bold mb-1">Edit Balance</div>
              <div className="text-[10px] text-[#8FA3BF] mb-5">{editBalAcc.account_number}</div>
              <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">New Balance (USD)</label>
              <input type="number" value={editBalValue} onChange={e=>setEditBalValue(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[13px]  outline-none focus:border-[#2255CC] mb-5"/>
              <div className="flex gap-3">
                <button onClick={()=>setEditBalAcc(null)}
                  className="flex-1 py-[10px] text-[9px] uppercase font-bold bg-[#F4F7FD] border border-[#F0F4FB] text-[#5C7A9E] cursor-pointer">
                  Cancel
                </button>
                <button onClick={()=>editBalance(editBalAcc, Number(editBalValue))}
                  className="flex-1 py-[10px] text-[9px] uppercase font-bold bg-[#2255CC] text-[#F0F4FB] border-none cursor-pointer">
                  Save →
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}