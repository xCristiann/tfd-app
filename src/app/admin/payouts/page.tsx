import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

const STATUS_VARIANT: Record<string,any> = {
  pending:'warning', approved:'blue', processing:'blue',
  paid:'funded', rejected:'breached', cancelled:'breached'
}
const METHOD_LABELS: Record<string,string> = {
  usdt_trc20:'USDT TRC20', usdt_erc20:'USDT ERC20',
  bitcoin:'Bitcoin', wise:'Wise', bank:'Bank Transfer'
}

export function AdminPayoutsPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [payouts, setPayouts]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter,  setFilter]    = useState('all')
  const [selected, setSelected] = useState<any | null>(null)

  const load = async (f: string) => {
    setLoading(true)
    // Fetch payouts first
    let q = supabase.from('payouts')
      .select('*')
      .order('created_at', { ascending: false })
    if (f !== 'all') q = q.eq('status', f)
    const { data: rawPayouts, error } = await q
    if (error) { toast('error','❌','Error', error.message); setLoading(false); return }
    if (!rawPayouts || rawPayouts.length === 0) { setPayouts([]); setLoading(false); return }

    // Enrich with user and account data separately
    const userIds    = [...new Set(rawPayouts.map(p => p.user_id).filter(Boolean))]
    const accountIds = [...new Set(rawPayouts.map(p => p.account_id).filter(Boolean))]

    const [usersRes, accountsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from('users').select('id,first_name,last_name,email').in('id', userIds)
        : { data: [] },
      accountIds.length > 0
        ? supabase.from('accounts').select('id,account_number,balance,equity,starting_balance,phase,status').in('id', accountIds)
        : { data: [] },
    ])

    const usersMap:    Record<string,any> = {}
    const accountsMap: Record<string,any> = {}
    ;(usersRes.data ?? []).forEach((u: any)    => { usersMap[u.id]    = u })
    ;(accountsRes.data ?? []).forEach((a: any) => { accountsMap[a.id] = a })

    const enriched = rawPayouts.map(p => ({
      ...p,
      user:    usersMap[p.user_id]       ?? null,
      account: accountsMap[p.account_id] ?? null,
    }))

    setPayouts(enriched)
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  async function updateStatus(id: string, status: string, name: string) {
    // Find the payout to get amount + account_id
    const payout = payouts.find(p => p.id === id)
    if (!payout) return

    // 1. Update payout status
    const { error } = await supabase.from('payouts').update({
      status,
      ...(status === 'paid'     ? { paid_at:     new Date().toISOString() } : {}),
      ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    if (error) { toast('error','❌','Error', error.message); return }

    // 2. Update account based on status
    if (payout.account_id && (status === 'approved' || status === 'rejected')) {
      // After payout: balance resets to starting_balance (profit is distributed)
      // We must also reset daily_high_balance and dd_used so the trigger
      // does NOT fire a drawdown violation — the balance drop is intentional.
      const startingBalance = payout.account?.starting_balance ?? payout.account?.balance ?? 0

      const { error: accError } = await supabase.from('accounts').update({
        balance:             startingBalance,   // reset to starting balance
        equity:              startingBalance,
        daily_high_balance:  startingBalance,   // reset high — prevents DD trigger
        daily_dd_used:       0,                 // clear daily DD
        max_dd_used:         0,                 // clear max DD
        status:              'active',           // reactivate account
        payout_locked:       false,
      }).eq('id', payout.account_id)

      if (accError) {
        toast('error','❌','Account Update Failed', accError.message)
        return
      }

      setPayouts(ps => ps.map(p => p.id === id ? {
        ...p, status,
        account: p.account ? {
          ...p.account,
          balance: startingBalance,
          equity: startingBalance,
          status: 'active',
        } : p.account,
      } : p))
    } else {
      setPayouts(ps => ps.map(p => p.id === id ? { ...p, status } : p))
    }

    if (selected?.id === id) setSelected((s: any) => ({ ...s, status }))
    const action = status === 'approved'
      ? `✓ Approved — balance reset to $${(payout.account?.starting_balance ?? 0).toLocaleString()}, account reactivated`
      : status === 'rejected'
      ? `✕ Rejected — balance reset to $${(payout.account?.starting_balance ?? 0).toLocaleString()}, account reactivated`
      : `Updated → ${status}`
    toast('success','✅', name, action)
  }

  const counts = {
    all:      payouts.length,
    pending:  payouts.filter(p => p.status === 'pending').length,
    approved: payouts.filter(p => p.status === 'approved').length,
    paid:     payouts.filter(p => p.status === 'paid').length,
    rejected: payouts.filter(p => p.status === 'rejected').length,
  }

  return (
    <>
    <DashboardLayout title="Payout Management" nav={ADMIN_NAV} accentColor="red">
      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>

        {/* ── Left: Payout list ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Card>
            <CardHeader title={`Payouts`} />

            {/* Filter tabs */}
            <div style={{ display:'flex', gap:3, marginBottom:16 }}>
              {(['all','pending','approved','paid','rejected'] as const).map(s => (
                <button key={s} onClick={() => { setFilter(s); setSelected(null) }}
                  style={{
                    padding:'5px 12px', fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const,
                    fontWeight:600, cursor:'pointer',
                    background: filter===s ? 'rgba(212,168,67,.1)' : 'var(--bg3)',
                    border: filter===s ? '1px solid var(--bdr2)' : '1px solid var(--dim)',
                    color: filter===s ? 'var(--gold)' : 'var(--text3)',
                  }}>
                  {s} {s !== 'all' && counts[s] > 0 ? `(${counts[s]})` : ''}
                </button>
              ))}
              <button onClick={() => load(filter)} style={{ marginLeft:'auto', padding:'5px 10px', fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, fontWeight:600, cursor:'pointer', background:'var(--bg3)', border:'1px solid var(--dim)', color:'var(--text3)' }}>
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
                <div style={{ width:24, height:24, border:'2px solid var(--red)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              </div>
            ) : payouts.length === 0 ? (
              <div style={{ padding:40, textAlign:'center' as const, color:'var(--text3)', fontSize:11 }}>
                No {filter === 'all' ? '' : filter} payouts found
              </div>
            ) : (
              <div style={{ overflowX:'auto' as const }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Trader','Account','Amount','Method','Status','Date','Actions'].map(h => (
                        <th key={h} style={{ padding:'6px 11px', fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, textAlign:'left' as const, background:'rgba(255,51,82,.02)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => {
                      const name = p.user ? `${p.user.first_name} ${p.user.last_name}` : p.user_id?.slice(0,8) ?? '—'
                      const isSelected = selected?.id === p.id
                      return (
                        <tr key={p.id}
                          onClick={() => setSelected(isSelected ? null : p)}
                          style={{ borderBottom:'1px solid rgba(255,51,82,.04)', cursor:'pointer', background: isSelected ? 'rgba(212,168,67,.05)' : 'transparent' }}>
                          <td style={{ padding:'8px 11px', fontWeight:600 }}>{name}</td>
                          <td style={{ padding:'8px 11px', fontFamily:'monospace', color:'var(--gold)', fontSize:10 }}>
                            {p.account?.account_number ?? '—'}
                          </td>
                          <td style={{ padding:'8px 11px', fontFamily:'monospace', color:'var(--green)', fontWeight:700 }}>
                            {fmt(p.requested_usd)}
                          </td>
                          <td style={{ padding:'8px 11px', color:'var(--text2)', fontSize:10 }}>
                            {METHOD_LABELS[p.method] ?? p.method}
                          </td>
                          <td style={{ padding:'8px 11px' }}>
                            <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                          </td>
                          <td style={{ padding:'8px 11px', fontSize:10, color:'var(--text3)' }}>
                            {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td style={{ padding:'8px 11px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display:'flex', gap:4 }}>
                              {p.status === 'pending' && (<>
                                <button onClick={() => updateStatus(p.id,'approved',name)}
                                  style={{ padding:'3px 8px', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'rgba(0,217,126,.1)', color:'var(--green)', border:'1px solid rgba(0,217,126,.2)' }}>
                                  ✓ Approve
                                </button>
                                <button onClick={() => updateStatus(p.id,'rejected',name)}
                                  style={{ padding:'3px 8px', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'rgba(255,51,82,.1)', color:'var(--red)', border:'1px solid rgba(255,51,82,.2)' }}>
                                  ✕ Reject
                                </button>
                              </>)}
                              {p.status === 'approved' && (
                                <button onClick={() => navigate(`/admin/payouts/${p.id}`)}
                                  style={{ padding:'3px 10px', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'rgba(212,168,67,.15)', color:'var(--gold)', border:'1px solid var(--bdr2)' }}>
                                  💸 Pay
                                </button>
                              )}
                              {p.status === 'paid' && (
                                <span style={{ fontSize:9, color:'var(--green)', fontFamily:'monospace' }}>✓ Paid</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Detail panel ── */}
        {selected && (
          <div style={{ width:320, flexShrink:0 }}>
            <Card>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontFamily:'serif', fontSize:16, fontWeight:'bold' }}>Payout Detail</span>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>

              {/* Status badge */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status.toUpperCase()}</Badge>
              </div>

              {/* Amount */}
              <div style={{ textAlign:'center' as const, padding:'16px', background:'var(--bg3)', border:'1px solid var(--bdr)', marginBottom:16 }}>
                <div style={{ fontSize:8, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:4 }}>Requested Amount</div>
                <div style={{ fontFamily:'monospace', fontSize:28, fontWeight:700, color:'var(--green)' }}>{fmt(selected.requested_usd)}</div>
              </div>

              {/* Details */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {[
                  ['Trader',   selected.user ? `${selected.user.first_name} ${selected.user.last_name}` : '—'],
                  ['Email',    selected.user?.email ?? '—'],
                  ['Account',  selected.account?.account_number ?? '—'],
                  ['Phase',    selected.account?.phase ?? '—'],
                  ['Balance',  selected.account ? fmt(selected.account.balance) : '—'],
                  ['Method',   METHOD_LABELS[selected.method] ?? selected.method],
                  ['Submitted',new Date(selected.created_at).toLocaleString()],
                  ...(selected.approved_at ? [['Approved', new Date(selected.approved_at).toLocaleString()]] : []),
                  ...(selected.paid_at     ? [['Paid At',  new Date(selected.paid_at).toLocaleString()]]     : []),
                ].map(([l, v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                    <span style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600 }}>{l}</span>
                    <span style={{ fontFamily:'monospace', fontSize:10, color:'var(--text)', maxWidth:160, textAlign:'right' as const, wordBreak:'break-all' as const }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Wallet address */}
              {selected.wallet_address && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:6 }}>
                    {selected.method?.includes('bank') ? 'Bank Details' : 'Wallet Address'}
                  </div>
                  <div style={{ padding:'10px', background:'var(--bg3)', border:'1px solid var(--bdr2)', fontFamily:'monospace', fontSize:10, wordBreak:'break-all' as const, color:'var(--gold)', cursor:'pointer' }}
                    onClick={() => { navigator.clipboard.writeText(selected.wallet_address); toast('success','📋','Copied','Address copied to clipboard') }}>
                    {selected.wallet_address}
                    <span style={{ float:'right', fontSize:9, color:'var(--text3)' }}>📋</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.trader_notes && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:6 }}>Trader Notes</div>
                  <div style={{ padding:10, background:'var(--bg3)', border:'1px solid var(--dim)', fontSize:11, color:'var(--text2)', fontStyle:'italic' as const }}>
                    "{selected.trader_notes}"
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selected.status === 'pending' && (<>
                  <button onClick={() => updateStatus(selected.id,'approved', selected.user?.first_name ?? '')}
                    style={{ width:'100%', padding:'10px', fontSize:10, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'var(--green)', color:'#000', border:'none' }}>
                    ✓ Approve Payout
                  </button>
                  <button onClick={() => updateStatus(selected.id,'rejected', selected.user?.first_name ?? '')}
                    style={{ width:'100%', padding:'10px', fontSize:10, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'rgba(255,51,82,.12)', color:'var(--red)', border:'1px solid rgba(255,51,82,.3)' }}>
                    ✕ Reject Payout
                  </button>
                </>)}
                {selected.status === 'approved' && (
                  <button onClick={() => navigate(`/admin/payouts/${selected.id}`)}
                    style={{ width:'100%', padding:'12px', fontSize:11, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'var(--gold)', color:'#000', border:'none' }}>
                    💸 Process Payment
                  </button>
                )}
                {selected.status === 'paid' && (
                  <div style={{ textAlign:'center' as const, padding:10, fontSize:11, color:'var(--green)', fontFamily:'monospace', border:'1px solid rgba(0,217,126,.2)', background:'rgba(0,217,126,.05)' }}>
                    ✓ Payment completed
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
    <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
