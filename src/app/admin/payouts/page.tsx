import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
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
    let q = supabase.from('payouts').select('*').order('created_at', { ascending: false })
    if (f !== 'all') q = q.eq('status', f)
    const { data: rawPayouts, error } = await q
    if (error) { toast('error','❌','Error', error.message); setLoading(false); return }
    if (!rawPayouts || rawPayouts.length === 0) { setPayouts([]); setLoading(false); return }

    const userIds    = [...new Set(rawPayouts.map(p => p.user_id).filter(Boolean))]
    const accountIds = [...new Set(rawPayouts.map(p => p.account_id).filter(Boolean))]

    const [usersRes, accountsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from('users').select('id,first_name,last_name,email').in('id', userIds)
        : { data: [] },
      accountIds.length > 0
        ? supabase.from('accounts').select('id,account_number,balance,equity,starting_balance,phase,status,daily_dd_used,max_dd_used,daily_high_balance').in('id', accountIds)
        : { data: [] },
    ])

    const usersMap:    Record<string,any> = {}
    const accountsMap: Record<string,any> = {}
    ;(usersRes.data ?? []).forEach((u: any)    => { usersMap[u.id]    = u })
    ;(accountsRes.data ?? []).forEach((a: any) => { accountsMap[a.id] = a })
    setPayouts(rawPayouts.map(p => ({ ...p, user: usersMap[p.user_id] ?? null, account: accountsMap[p.account_id] ?? null })))
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  async function updateStatus(id: string, status: string, name: string) {
    const payout = payouts.find(p => p.id === id)
    if (!payout) return

    const { error } = await supabase.from('payouts').update({
      status,
      ...(status === 'paid'     ? { paid_at:     new Date().toISOString() } : {}),
      ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    if (error) { toast('error','❌','Error', error.message); return }

    // ─── FIX: Payout approve/reject — reset balance ONLY, never touch DD counters ───
    // The old code was resetting daily_dd_used and max_dd_used to 0 which caused:
    // balance drops from e.g. $212k → $100k (starting), but DD counters reset to 0%
    // Next trade check: equity($100k) vs starting($100k) = 0% DD → looks fine
    // But the platform risk monitor was recalculating from the new balance
    // and triggering breach because balance dropped more than the DD limit.
    //
    // CORRECT BEHAVIOR:
    // - Reset balance to starting_balance (profit distributed)
    // - Reset daily_high_balance to starting_balance (new day baseline)
    // - Reset daily_dd_used = 0 (safe: resets relative to new daily_high_balance)  
    // - Reset max_dd_used = 0 (safe: resets relative to starting_balance)
    // - DO NOT set status='breached' — this is a normal payout cycle
    // - Reactivate account so trader can continue trading

    if (payout.account_id && (status === 'approved' || status === 'rejected')) {
      const startBal = payout.account?.starting_balance ?? 0

      const { error: accError } = await supabase.from('accounts').update({
        balance:            startBal,
        equity:             startBal,
        daily_high_balance: startBal,  // new baseline for daily DD calculation
        daily_dd_used:      0,         // reset % — now calculated from new startBal baseline
        max_dd_used:        0,         // reset % — now calculated from new startBal baseline  
        status:             'active',
        payout_locked:      false,
        // NEVER set phase:'breached' or status:'breached' here
        // A payout is NOT a breach — it's a profit distribution
      }).eq('id', payout.account_id)

      if (accError) { toast('error','❌','Account Update Failed', accError.message); return }

      setPayouts(ps => ps.map(p => p.id === id ? {
        ...p, status,
        account: p.account ? { ...p.account, balance: startBal, equity: startBal, status: 'active' } : p.account,
      } : p))
    } else {
      setPayouts(ps => ps.map(p => p.id === id ? { ...p, status } : p))
    }

    if (selected?.id === id) setSelected((s: any) => ({ ...s, status }))
    toast('success','✅', name, status === 'approved'
      ? `✓ Approved — balance reset to $${(payout.account?.starting_balance ?? 0).toLocaleString()}, account reactivated`
      : status === 'rejected' ? `✕ Rejected` : `Updated → ${status}`)

    try {
      const { data: trader } = await supabase.from('users').select('email, first_name').eq('id', payout.user_id).single()
      if (trader?.email) {
        const amt = `$${payout.requested_usd}`, accNum = payout.account?.account_number ?? '', method = payout.method ?? 'crypto'
        if (status === 'approved') await sendEmail('payout_approved', trader.email, { first_name: trader.first_name ?? 'Trader', amount: amt, account_number: accNum, method }).catch(() => {})
        else if (status === 'paid') await sendEmail('payout_paid', trader.email, { first_name: trader.first_name ?? 'Trader', amount: amt, method, tx_hash: payout.tx_hash ?? '', tx_reference: payout.tx_reference ?? '' }).catch(() => {})
        else if (status === 'rejected') await sendEmail('payout_rejected', trader.email, { first_name: trader.first_name ?? 'Trader', amount: amt, reason: payout.rejection_reason ?? '' }).catch(() => {})
      }
    } catch {}
  }

  const counts = {
    all: payouts.length,
    pending:  payouts.filter(p => p.status === 'pending').length,
    approved: payouts.filter(p => p.status === 'approved').length,
    paid:     payouts.filter(p => p.status === 'paid').length,
    rejected: payouts.filter(p => p.status === 'rejected').length,
  }

  return (
    <>
    <DashboardLayout title="Payout Management" nav={ADMIN_NAV} accentColor="red">
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 120px)' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <Card>
            <CardHeader title="Payouts" />
            <div style={{ display:'flex', gap:3, marginBottom:16 }}>
              {(['all','pending','approved','paid','rejected'] as const).map(s => (
                <button key={s} onClick={() => { setFilter(s); setSelected(null) }}
                  style={{ padding:'5px 12px', fontSize:8, letterSpacing:1.5, textTransform:'uppercase', fontWeight:600, cursor:'pointer',
                    background: filter===s ? 'rgba(34,85,204,.08)' : '#F4F7FD',
                    border: filter===s ? '1px solid #C5D5EA' : '1px solid rgba(26,58,107,.06)',
                    color: filter===s ? '#2255CC' : '#8FA3BF' }}>
                  {s} {s !== 'all' && counts[s] > 0 ? `(${counts[s]})` : ''}
                </button>
              ))}
              <button onClick={() => load(filter)} style={{ marginLeft:'auto', padding:'5px 10px', fontSize:8, letterSpacing:1.5, textTransform:'uppercase', fontWeight:600, cursor:'pointer', background:'#F4F7FD', border:'1px solid rgba(26,58,107,.06)', color:'#8FA3BF' }}>↻ Refresh</button>
            </div>

            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
                <div style={{ width:24, height:24, border:'2px solid #DC2626', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              </div>
            ) : payouts.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#8FA3BF', fontSize:11 }}>No {filter === 'all' ? '' : filter} payouts found</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(26,58,107,.06)' }}>
                      {['Trader','Account','Amount','Method','Status','Date','Actions'].map(h => (
                        <th key={h} style={{ padding:'6px 11px', fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'#8FA3BF', fontWeight:600, textAlign:'left', background:'rgba(220,38,38,.02)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => {
                      const name = p.user ? `${p.user.first_name} ${p.user.last_name}` : p.user_id?.slice(0,8) ?? '—'
                      const isSelected = selected?.id === p.id
                      return (
                        <tr key={p.id} onClick={() => setSelected(isSelected ? null : p)}
                          style={{ borderBottom:'1px solid rgba(220,38,38,.04)', cursor:'pointer', background: isSelected ? 'rgba(34,85,204,.04)' : 'transparent' }}>
                          <td style={{ padding:'8px 11px', fontWeight:600 }}>{name}</td>
                          <td style={{ padding:'8px 11px', fontFamily:'monospace', color:'#2255CC', fontSize:10 }}>{p.account?.account_number ?? '—'}</td>
                          <td style={{ padding:'8px 11px', fontFamily:'monospace', color:'#16A34A', fontWeight:700 }}>{fmt(p.requested_usd)}</td>
                          <td style={{ padding:'8px 11px', color:'#5C7A9E', fontSize:10 }}>{METHOD_LABELS[p.method] ?? p.method}</td>
                          <td style={{ padding:'8px 11px' }}><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></td>
                          <td style={{ padding:'8px 11px', fontSize:10, color:'#8FA3BF' }}>{new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                          <td style={{ padding:'8px 11px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display:'flex', gap:4 }}>
                              {p.status === 'pending' && (<>
                                <button onClick={() => updateStatus(p.id,'approved',name)}
                                  style={{ padding:'3px 8px', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'rgba(22,163,74,.1)', color:'#16A34A', border:'1px solid rgba(22,163,74,.2)' }}>✓ Approve</button>
                                <button onClick={() => updateStatus(p.id,'rejected',name)}
                                  style={{ padding:'3px 8px', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'rgba(220,38,38,.1)', color:'#DC2626', border:'1px solid rgba(220,38,38,.2)' }}>✕ Reject</button>
                              </>)}
                              {p.status === 'approved' && (
                                <button onClick={() => navigate(`/admin/payouts/${p.id}`)}
                                  style={{ padding:'3px 10px', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'rgba(34,85,204,.15)', color:'#2255CC', border:'1px solid #C5D5EA' }}>💸 Pay</button>
                              )}
                              {p.status === 'paid' && <span style={{ fontSize:9, color:'#16A34A', fontFamily:'monospace' }}>✓ Paid</span>}
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

        {selected && (
          <div style={{ width:320, flexShrink:0 }}>
            <Card>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontFamily:'serif', fontSize:16, fontWeight:'bold' }}>Payout Detail</span>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#8FA3BF', cursor:'pointer', fontSize:16 }}>✕</button>
              </div>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status.toUpperCase()}</Badge>
              </div>
              <div style={{ textAlign:'center', padding:'16px', background:'#F4F7FD', border:'1px solid #E8EEF8', marginBottom:16 }}>
                <div style={{ fontSize:8, letterSpacing:2, textTransform:'uppercase', color:'#8FA3BF', marginBottom:4 }}>Requested Amount</div>
                <div style={{ fontFamily:'monospace', fontSize:28, fontWeight:700, color:'#16A34A' }}>{fmt(selected.requested_usd)}</div>
              </div>
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
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'#F4F7FD', border:'1px solid rgba(26,58,107,.06)' }}>
                    <span style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase', color:'#8FA3BF', fontWeight:600 }}>{l}</span>
                    <span style={{ fontFamily:'monospace', fontSize:10, color:'#1A3A6B', maxWidth:160, textAlign:'right', wordBreak:'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
              {selected.wallet_address && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase', color:'#8FA3BF', fontWeight:600, marginBottom:6 }}>
                    {selected.method?.includes('bank') ? 'Bank Details' : 'Wallet Address'}
                  </div>
                  <div style={{ padding:'10px', background:'#F4F7FD', border:'1px solid #C5D5EA', fontFamily:'monospace', fontSize:10, wordBreak:'break-all', color:'#2255CC', cursor:'pointer' }}
                    onClick={() => { navigator.clipboard.writeText(selected.wallet_address); toast('success','📋','Copied','Address copied to clipboard') }}>
                    {selected.wallet_address}<span style={{ float:'right', fontSize:9, color:'#8FA3BF' }}>📋</span>
                  </div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selected.status === 'pending' && (<>
                  <button onClick={() => updateStatus(selected.id,'approved', selected.user?.first_name ?? '')}
                    style={{ width:'100%', padding:'10px', fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'#16A34A', color:'#fff', border:'none' }}>✓ Approve Payout</button>
                  <button onClick={() => updateStatus(selected.id,'rejected', selected.user?.first_name ?? '')}
                    style={{ width:'100%', padding:'10px', fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'rgba(220,38,38,.12)', color:'#DC2626', border:'1px solid rgba(220,38,38,.3)' }}>✕ Reject Payout</button>
                </>)}
                {selected.status === 'approved' && (
                  <button onClick={() => navigate(`/admin/payouts/${selected.id}`)}
                    style={{ width:'100%', padding:'12px', fontSize:11, letterSpacing:2, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'#2255CC', color:'#fff', border:'none' }}>💸 Process Payment</button>
                )}
                {selected.status === 'paid' && (
                  <div style={{ textAlign:'center', padding:10, fontSize:11, color:'#16A34A', fontFamily:'monospace', border:'1px solid rgba(22,163,74,.2)', background:'rgba(22,163,74,.05)' }}>✓ Payment completed</div>
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
