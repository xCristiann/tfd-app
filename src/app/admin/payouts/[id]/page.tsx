import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

const METHOD_LABELS: Record<string,string> = {
  usdt_trc20:'USDT TRC20', usdt_erc20:'USDT ERC20',
  bitcoin:'Bitcoin', wise:'Wise', bank:'Bank Transfer'
}
const METHOD_ICONS: Record<string,string> = {
  usdt_trc20:'₮', usdt_erc20:'₮', bitcoin:'₿', wise:'🌍', bank:'🏦'
}

export function AdminPayoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [payout,  setPayout]  = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [txHash,  setTxHash]  = useState('')
  const [adminNote, setAdminNote] = useState('')

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      const { data, error } = await supabase.from('payouts').select('*').eq('id', id).single()
      if (error || !data) { toast('error','❌','Not Found','Payout not found'); setLoading(false); return }

      // Fetch user and account separately
      const [userRes, accRes] = await Promise.all([
        data.user_id    ? supabase.from('users').select('*').eq('id', data.user_id).single() : { data: null },
        data.account_id ? supabase.from('accounts').select('*').eq('id', data.account_id).single() : { data: null },
      ])

      setPayout({ ...data, user: userRes.data, account: accRes.data })
      setAdminNote(data.admin_notes ?? '')
      setLoading(false)
    }
    fetch()
  }, [id])

  async function markPaid() {
    if (!payout) return
    setMarking(true)

    // 1. Update payout to paid
    const { error } = await supabase.from('payouts').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      tx_hash: txHash || null,
      admin_notes: adminNote || null,
    }).eq('id', payout.id)
    if (error) { toast('error','❌','Error', error.message); setMarking(false); return }

    // 2. If not yet deducted (status was 'approved', deduction already happened)
    // Just ensure account is active — balance was already deducted on approve
    if (payout.account_id) {
      await supabase.from('accounts').update({
        status: 'active',
        payout_locked: false,
      }).eq('id', payout.account_id)
    }

    setPayout((p: any) => ({ ...p, status: 'paid', tx_hash: txHash, admin_notes: adminNote }))
    toast('success','💰','Payment Complete','Payout marked as paid.')
    setMarking(false)
  }

  async function saveNote() {
    if (!payout) return
    const { error } = await supabase.from('payouts').update({ admin_notes: adminNote }).eq('id', payout.id)
    if (error) { toast('error','❌','Error', error.message); return }
    toast('success','✅','Saved','Note saved.')
  }

  const name = payout?.user ? `${payout.user.first_name} ${payout.user.last_name}` : '—'

  return (
    <>
    <DashboardLayout title="Process Payment" nav={ADMIN_NAV} accentColor="red">
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Back */}
        <button onClick={() => navigate('/admin/payouts')}
          style={{ marginBottom:20, background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
          ← Back to Payouts
        </button>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
            <div style={{ width:28, height:28, border:'2px solid var(--gold)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : !payout ? (
          <div style={{ textAlign:'center' as const, padding:60, color:'var(--text3)' }}>Payout not found.</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* ── Left column: Payout info ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Card>
                <div style={{ fontSize:8, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:8 }}>Payout Request</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ fontFamily:'monospace', fontSize:32, fontWeight:700, color:'var(--green)' }}>
                    {fmt(payout.requested_usd)}
                  </div>
                  <Badge variant={payout.status === 'paid' ? 'funded' : 'warning'}>
                    {payout.status}
                  </Badge>
                </div>

                {[
                  ['Trader',   name],
                  ['Email',    payout.user?.email ?? '—'],
                  ['Account',  payout.account?.account_number ?? '—'],
                  ['Phase',    payout.account?.phase ?? '—'],
                  ['Balance',  payout.account ? fmt(payout.account.balance) : '—'],
                  ['Submitted',new Date(payout.created_at).toLocaleString()],
                  ...(payout.approved_at ? [['Approved', new Date(payout.approved_at).toLocaleString()]] : []),
                ].map(([l, v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', borderBottom:'1px solid rgba(212,168,67,.04)', alignItems:'center' }}>
                    <span style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600 }}>{l}</span>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </Card>

              {/* Payment method */}
              <Card>
                <div style={{ fontSize:8, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:12 }}>Payment Method</div>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--bg3)', border:'1px solid var(--bdr2)', marginBottom:12 }}>
                  <span style={{ fontSize:24 }}>{METHOD_ICONS[payout.method] ?? '💳'}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{METHOD_LABELS[payout.method] ?? payout.method}</div>
                    <div style={{ fontSize:9, color:'var(--text3)', marginTop:2 }}>Send exactly {fmt(payout.requested_usd)} USD equivalent</div>
                  </div>
                </div>

                {payout.wallet_address && (
                  <>
                    <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:6 }}>
                      {payout.method?.includes('bank') ? 'Bank Details' : 'Wallet / Destination'}
                    </div>
                    <div
                      onClick={() => { navigator.clipboard.writeText(payout.wallet_address); toast('success','📋','Copied','Address copied!') }}
                      style={{ padding:'12px 14px', background:'rgba(212,168,67,.05)', border:'1px solid var(--bdr2)', fontFamily:'monospace', fontSize:11, wordBreak:'break-all' as const, color:'var(--gold)', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <span>{payout.wallet_address}</span>
                      <span style={{ fontSize:14, flexShrink:0 }}>📋</span>
                    </div>
                    <div style={{ fontSize:9, color:'var(--text3)', marginTop:6 }}>Click to copy address</div>
                  </>
                )}

                {payout.trader_notes && (
                  <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg3)', border:'1px solid var(--dim)', borderLeft:'3px solid var(--gold)' }}>
                    <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--gold)', fontWeight:600, marginBottom:4 }}>Trader Note</div>
                    <div style={{ fontSize:11, color:'var(--text2)', fontStyle:'italic' as const }}>"{payout.trader_notes}"</div>
                  </div>
                )}
              </Card>
            </div>

            {/* ── Right column: Action ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {payout.status === 'paid' ? (
                <Card>
                  <div style={{ textAlign:'center' as const, padding:24 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                    <div style={{ fontFamily:'serif', fontSize:20, fontWeight:'bold', color:'var(--green)', marginBottom:8 }}>Payment Completed</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:16 }}>
                      Paid on {payout.paid_at ? new Date(payout.paid_at).toLocaleString() : '—'}
                    </div>
                    {payout.tx_hash && (
                      <div style={{ padding:'8px 12px', background:'var(--bg3)', border:'1px solid var(--dim)', fontFamily:'monospace', fontSize:10, wordBreak:'break-all' as const, color:'var(--gold)' }}>
                        TX: {payout.tx_hash}
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card>
                  <div style={{ fontSize:8, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', marginBottom:16 }}>Mark as Paid</div>

                  {/* Checklist */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                    {[
                      'Verify wallet address is correct',
                      'Send correct amount in correct network',
                      'Screenshot or save transaction ID',
                      'Paste TX hash below before confirming',
                    ].map((step, i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 10px', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                        <span style={{ width:18, height:18, borderRadius:'50%', background:'rgba(212,168,67,.15)', border:'1px solid var(--bdr2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'var(--gold)', fontWeight:700, flexShrink:0 }}>{i+1}</span>
                        <span style={{ fontSize:11, color:'var(--text2)' }}>{step}</span>
                      </div>
                    ))}
                  </div>

                  {/* TX Hash */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:6 }}>
                      Transaction Hash / Reference <span style={{ color:'var(--text3)', fontWeight:400 }}>(optional)</span>
                    </div>
                    <input
                      value={txHash}
                      onChange={e => setTxHash(e.target.value)}
                      placeholder="e.g. 0x1a2b3c... or bank reference"
                      style={{ width:'100%', padding:'10px', background:'var(--bg3)', border:'1px solid var(--dim)', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:11, boxSizing:'border-box' as const }}
                    />
                  </div>

                  {/* Admin note */}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:6 }}>Admin Note</div>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Internal note (not visible to trader)"
                      rows={3}
                      style={{ width:'100%', padding:'10px', background:'var(--bg3)', border:'1px solid var(--dim)', outline:'none', color:'var(--text)', fontSize:11, resize:'vertical' as const, boxSizing:'border-box' as const, fontFamily:'inherit' }}
                    />
                  </div>

                  <button
                    onClick={markPaid}
                    disabled={marking}
                    style={{ width:'100%', padding:'14px', fontSize:12, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor: marking?'not-allowed':'pointer', border:'none', opacity: marking?0.6:1, background:'var(--gold)', color:'#000' }}>
                    {marking ? 'Marking…' : `💸 Confirm Payment — ${fmt(payout.requested_usd)}`}
                  </button>

                  <div style={{ marginTop:8, textAlign:'center' as const, fontSize:9, color:'var(--text3)' }}>
                    This will mark the payout as paid and notify the trader.
                  </div>
                </Card>
              )}

              {/* Admin note (if already paid) */}
              {payout.status !== 'paid' && (
                <Card>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:8, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)' }}>Quick Save Note</span>
                    <button onClick={saveNote} style={{ padding:'4px 10px', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--dim)' }}>Save</button>
                  </div>
                  <textarea
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder="Notes about this payout..."
                    rows={4}
                    style={{ width:'100%', padding:10, background:'var(--bg3)', border:'1px solid var(--dim)', outline:'none', color:'var(--text)', fontSize:11, resize:'vertical' as const, boxSizing:'border-box' as const, fontFamily:'inherit' }}
                  />
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
    <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
