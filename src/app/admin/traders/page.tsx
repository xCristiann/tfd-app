import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
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
      server: 'CFT-Live-01',
      status: 'active',
    })
    if (error) { toast('error', '❌', 'Error', error.message); return }
    toast('success', '✅', 'Advanced', `Account moved to ${nextPhase}.`)
    openTrader(selectedTrader)
  }

  async function editBalance(account: any, newBal: number) {
    await supabase.from('accounts').update({ balance: newBal, equity: newBal }).eq('id', account.id)
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
      server: 'CFT-Live-01',
      status: 'active',
    })
    setAddAccLoading(false)
    if (error) { toast('error', '❌', 'Error', error.message); return }
    toast('success', '✅', 'Account Added', `${accountNumber} created.`)
    setAddAccModal(false)
    openTrader(selectedTrader)
  }

  const inp = "flex-1 px-3 py-[9px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans placeholder-[rgba(230,226,248,.3)]"

  return (
    <>
      <DashboardLayout title="Trader Management" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`All Traders (${filtered.length})`} action={
            <span className="text-[10px] text-[var(--text3)]">{traders.length} total registered</span>
          }/>
          <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] mb-3 transition-colors">
            <span className="px-3 flex items-center text-[var(--text3)]">🔍</span>
            <input className={inp} placeholder="Search name, email or IP…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[var(--text3)]">No traders found</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Name','Email','Country','Last IP','Last Login','Accounts','Best Phase','Status','Role','Joined','Actions'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(255,51,82,.02)]">{h}</th>
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
                    <tr key={t.id} className={`border-b border-[rgba(255,51,82,.04)] hover:bg-[rgba(255,51,82,.03)] cursor-pointer ${t.is_banned ? 'opacity-50' : ''}`}>
                      <td className="px-[11px] py-[8px] font-semibold" onClick={()=>openTrader(t)}>
                        <span className="hover:text-[var(--gold)] transition-colors">{t.first_name} {t.last_name}</span>
                      </td>
                      <td className="px-[11px] py-[8px] text-[var(--text2)]">{t.email}</td>
                      <td className="px-[11px] py-[8px] text-[var(--text3)]">{t.country ?? '—'}</td>
                      <td className="px-[11px] py-[8px]">
                        {t.last_login_ip ? (
                          <button onClick={e=>{e.stopPropagation();setIpTrader(t)}}
                            className="font-mono text-[10px] text-[var(--gold)] bg-[rgba(212,168,67,.08)] border border-[var(--bdr2)] px-[6px] py-[2px] cursor-pointer hover:bg-[rgba(212,168,67,.15)] transition-all">
                            {t.last_login_ip}
                          </button>
                        ) : <span className="text-[var(--text3)]">—</span>}
                      </td>
                      <td className="px-[11px] py-[8px] text-[var(--text3)] text-[10px]">
                        {t.last_login_at ? new Date(t.last_login_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-[11px] py-[8px] font-mono">{accounts.length}</td>
                      <td className="px-[11px] py-[8px]">
                        {bestPhase !== '—' ? <Badge variant={bestPhase as any}>{bestPhase}</Badge> : <span className="text-[var(--text3)]">—</span>}
                      </td>
                      <td className="px-[11px] py-[8px]">
                        {t.is_banned
                          ? <span className="text-[8px] uppercase font-bold text-[var(--red)] bg-[rgba(255,51,82,.1)] border border-[rgba(255,51,82,.2)] px-[6px] py-[2px]">Banned</span>
                          : <span className="text-[8px] uppercase font-bold text-[var(--green)]">Active</span>
                        }
                      </td>
                      <td className="px-[11px] py-[8px]"><Badge variant={t.role==='admin'?'warning':'open'}>{t.role}</Badge></td>
                      <td className="px-[11px] py-[8px] text-[var(--text3)] text-[10px]">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-[11px] py-[8px]" onClick={e=>e.stopPropagation()}>
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={()=>openTrader(t)}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">
                            View
                          </button>
                          <button onClick={()=>banTrader(t.id, t.is_banned)}
                            className={`px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer border ${t.is_banned ? 'bg-[rgba(0,200,100,.1)] text-[var(--green)] border-[rgba(0,200,100,.2)]' : 'bg-[rgba(255,51,82,.1)] text-[var(--red)] border-[rgba(255,51,82,.2)]'}`}>
                            {t.is_banned ? 'Unban' : 'Ban'}
                          </button>
                          {t.role !== 'admin' && (
                            <button onClick={()=>setRole(t.id,'admin')}
                              className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">
                              Admin
                            </button>
                          )}
                          {t.role !== 'trader' && (
                            <button onClick={()=>setRole(t.id,'trader')}
                              className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">
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
            <div className="bg-[var(--bg2)] border border-[var(--bdr)] w-full max-w-[760px] my-6" onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bdr)]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(255,51,82,.1)] border border-[rgba(255,51,82,.2)] flex items-center justify-center font-bold text-[var(--red)] text-[13px]">
                    {selectedTrader.first_name?.[0]}{selectedTrader.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-serif text-[16px] font-bold">{selectedTrader.first_name} {selectedTrader.last_name}</div>
                    <div className="text-[10px] text-[var(--text3)]">{selectedTrader.email} · {selectedTrader.country ?? '—'}</div>
                  </div>
                  {selectedTrader.is_banned && <span className="text-[8px] uppercase font-bold text-[var(--red)] bg-[rgba(255,51,82,.1)] border border-[rgba(255,51,82,.2)] px-[8px] py-[3px]">Banned</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setAddAccModal(true)}
                    className="px-[12px] py-[6px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">
                    + Add Account
                  </button>
                  <button onClick={()=>banTrader(selectedTrader.id, selectedTrader.is_banned)}
                    className={`px-[12px] py-[6px] text-[8px] uppercase font-bold cursor-pointer border ${selectedTrader.is_banned ? 'bg-[rgba(0,200,100,.1)] text-[var(--green)] border-[rgba(0,200,100,.2)]' : 'bg-[rgba(255,51,82,.1)] text-[var(--red)] border-[rgba(255,51,82,.2)]'}`}>
                    {selectedTrader.is_banned ? '✓ Unban' : '🚫 Ban Trader'}
                  </button>
                  <button onClick={()=>setSelectedTrader(null)} className="text-[var(--text3)] hover:text-[var(--text)] text-[18px] cursor-pointer bg-none border-none ml-2">✕</button>
                </div>
              </div>

              {/* Info row */}
              <div className="grid grid-cols-4 gap-0 border-b border-[var(--bdr)]">
                {[
                  ['Last IP', selectedTrader.last_login_ip ?? '—'],
                  ['Last Login', selectedTrader.last_login_at ? new Date(selectedTrader.last_login_at).toLocaleString() : '—'],
                  ['Joined', new Date(selectedTrader.created_at).toLocaleDateString()],
                  ['Role', selectedTrader.role],
                ].map(([l,v])=>(
                  <div key={l} className="px-5 py-3 border-r border-[var(--bdr)] last:border-0">
                    <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold mb-1">{l}</div>
                    <div className="font-mono text-[11px] text-[var(--gold)]">{v}</div>
                  </div>
                ))}
              </div>

              {/* Accounts */}
              <div className="px-6 py-5">
                <div className="text-[9px] uppercase tracking-[2px] text-[var(--text3)] font-semibold mb-4">Accounts ({traderAccounts.length})</div>
                {loadingAccounts ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--red)] border-t-transparent rounded-full animate-spin"/></div>
                ) : traderAccounts.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[var(--text3)]">No accounts yet</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {traderAccounts.map(acc => {
                      const prod = acc.challenge_products
                      const profitPct = acc.starting_balance > 0
                        ? ((acc.balance - acc.starting_balance) / acc.starting_balance) * 100 : 0
                      const canAdvance = acc.phase === 'phase1' || acc.phase === 'phase2'
                      const nextPhase = acc.phase === 'phase1' ? 'Phase 2' : acc.phase === 'phase2' ? 'Funded' : null
                      return (
                        <div key={acc.id} className={`border p-4 ${acc.status === 'inactive' ? 'opacity-50 border-[var(--dim)]' : 'border-[var(--bdr2)]'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-mono text-[var(--gold)] text-[11px]">{acc.account_number}</div>
                              <div className="text-[10px] text-[var(--text3)]">{prod?.name ?? '—'} · Server: {acc.server}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={phaseVariant(acc.phase)}>{phaseLabel(acc.phase)}</Badge>
                              {acc.status === 'inactive' && <span className="text-[8px] text-[var(--text3)] uppercase">Inactive</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 mb-3 text-[10px]">
                            {[
                              ['Balance', `$${Number(acc.balance).toLocaleString()}`],
                              ['Starting', `$${Number(acc.starting_balance).toLocaleString()}`],
                              ['Daily DD', `${acc.daily_dd_used ?? 0}%`],
                              ['Max DD', `${acc.max_dd_used ?? 0}%`],
                            ].map(([l,v])=>(
                              <div key={l} className="bg-[var(--bg3)] border border-[var(--dim)] px-3 py-2">
                                <div className="text-[8px] uppercase tracking-[1px] text-[var(--text3)] mb-1">{l}</div>
                                <div className="font-mono font-bold">{v}</div>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-[var(--text3)] mb-3">
                            Login: <span className="font-mono text-[var(--text)]">{acc.platform_login}</span>
                            &nbsp;·&nbsp;P&L: <span className={profitPct >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {canAdvance && acc.status !== 'inactive' && acc.phase !== 'breached' && (
                              <button onClick={()=>advancePhase(acc)}
                                className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(212,168,67,.1)] text-[var(--gold)] border border-[var(--bdr2)]">
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
                                openTrader(selectedTrader)
                              }}
                                className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,140,0,.1)] text-[var(--gold)] border border-[rgba(255,140,0,.2)]">
                                Mark Breached
                              </button>
                            )}
                            <button onClick={async ()=>{
                              if (!window.confirm(`Delete account ${acc.account_number}? This cannot be undone.`)) return
                              await supabase.from('accounts').delete().eq('id', acc.id)
                              toast('error','🗑','Deleted',`${acc.account_number} deleted.`)
                              openTrader(selectedTrader)
                            }}
                              className="px-[10px] py-[5px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">
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
            <div className="bg-[var(--bg2)] border border-[var(--bdr)] w-full max-w-[440px] p-6" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-serif text-[15px] font-bold">{ipTrader.first_name} {ipTrader.last_name} — IP History</div>
                  <div className="text-[10px] text-[var(--text3)]">{ipTrader.email}</div>
                </div>
                <button onClick={()=>setIpTrader(null)} className="text-[var(--text3)] hover:text-[var(--text)] text-[18px] cursor-pointer bg-none border-none">✕</button>
              </div>
              <div className="p-3 bg-[var(--bg3)] border border-[var(--dim)] mb-4">
                <div className="text-[8px] uppercase tracking-[2px] text-[var(--text3)] font-semibold mb-1">Last Login</div>
                <div className="flex justify-between">
                  <span className="font-mono text-[var(--gold)]">{ipTrader.last_login_ip ?? '—'}</span>
                  <span className="text-[10px] text-[var(--text3)]">{ipTrader.last_login_at ? new Date(ipTrader.last_login_at).toLocaleString() : '—'}</span>
                </div>
              </div>
              <div className="text-[8px] uppercase tracking-[2px] text-[var(--text3)] font-semibold mb-2">History</div>
              {ipTrader.login_history?.length > 0 ? (
                <div className="flex flex-col gap-[3px] max-h-[240px] overflow-y-auto">
                  {[...ipTrader.login_history].reverse().map((e: any, i: number) => (
                    <div key={i} className="flex justify-between items-center px-3 py-[5px] bg-[var(--bg3)] border border-[var(--dim)] text-[11px]">
                      <span className="font-mono text-[var(--gold)]">{e.ip}</span>
                      <span className="text-[var(--text3)] text-[10px]">{new Date(e.at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text3)] py-4 text-center">No history yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── Add Account Modal ── */}
        {addAccModal && selectedTrader && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6" onClick={()=>setAddAccModal(false)}>
            <div className="bg-[var(--bg2)] border border-[var(--bdr)] w-full max-w-[400px] p-6" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="font-serif text-[15px] font-bold">Add Account Manually</div>
                <button onClick={()=>setAddAccModal(false)} className="text-[var(--text3)] hover:text-[var(--text)] text-[18px] cursor-pointer bg-none border-none">✕</button>
              </div>
              <div className="mb-4">
                <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Challenge Product</label>
                <select value={addAccProduct} onChange={e=>setAddAccProduct(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] text-[12px] outline-none">
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price_usd})</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">Starting Phase</label>
                <select value={addAccPhase} onChange={e=>setAddAccPhase(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] text-[12px] outline-none">
                  {['phase1','phase2','funded'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button onClick={addAccountManually} disabled={addAccLoading}
                className="w-full py-[12px] text-[9px] tracking-[2px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer hover:bg-[var(--gold2)] transition-all disabled:opacity-50">
                {addAccLoading ? 'Creating…' : 'Create Account →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Edit Balance Modal ── */}
        {editBalAcc && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6" onClick={()=>setEditBalAcc(null)}>
            <div className="bg-[var(--bg2)] border border-[var(--bdr)] w-full max-w-[360px] p-6" onClick={e=>e.stopPropagation()}>
              <div className="font-serif text-[15px] font-bold mb-1">Edit Balance</div>
              <div className="text-[10px] text-[var(--text3)] mb-5">{editBalAcc.account_number}</div>
              <label className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold block mb-2">New Balance (USD)</label>
              <input type="number" value={editBalValue} onChange={e=>setEditBalValue(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg3)] border border-[var(--bdr2)] text-[var(--text)] text-[13px] font-mono outline-none focus:border-[var(--gold)] mb-5"/>
              <div className="flex gap-3">
                <button onClick={()=>setEditBalAcc(null)}
                  className="flex-1 py-[10px] text-[9px] uppercase font-bold bg-[var(--bg3)] border border-[var(--dim)] text-[var(--text2)] cursor-pointer">
                  Cancel
                </button>
                <button onClick={()=>editBalance(editBalAcc, Number(editBalValue))}
                  className="flex-1 py-[10px] text-[9px] uppercase font-bold bg-[var(--gold)] text-[var(--bg)] border-none cursor-pointer">
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
