import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard, Input, Select } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { TRADER_NAV } from '@/lib/nav'

const METHODS = ['usdt_trc20','usdt_erc20','bitcoin','wise','bank']
const METHOD_LABELS: Record<string,string> = {
  usdt_trc20:'USDT TRC20', usdt_erc20:'USDT ERC20', bitcoin:'Bitcoin', wise:'Wise', bank:'Bank Transfer'
}
const STATUS_COLORS: Record<string,string> = {
  pending:'warning', approved:'blue', processing:'blue', paid:'funded', rejected:'breached', cancelled:'breached'
}

export function PayoutsPage() {
  const { accounts } = useAccount()
  const { profile, session } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('usdt_trc20')
  const [wallet, setWallet] = useState('')
  const [notes, setNotes] = useState('')

  // Only funded accounts
  const fundedAccounts = accounts.filter(a => a.phase === 'funded' && a.status === 'active')
  const selectedAccount = fundedAccounts.find(a => a.id === selectedAccountId) ?? fundedAccounts[0] ?? null
  const prod = (selectedAccount as any)?.challenge_products
  const splitPct = prod?.funded_profit_split ?? 85

  const profit = selectedAccount ? selectedAccount.balance - selectedAccount.starting_balance : 0
  const withdrawable = profit > 0 ? profit * (splitPct / 100) : 0

  useEffect(() => {
    if (fundedAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(fundedAccounts[0].id)
    }
  }, [fundedAccounts.length])

  useEffect(() => {
    supabase.from('payouts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setPayouts(data ?? []))
  }, [])

  async function requestPayout() {
    if (!selectedAccount) { toast('warning','⚠️','No Funded Account','You need a funded account to request a payout.'); return }
    if (!amount || !wallet) { toast('warning','⚠️','Missing Info','Fill in amount and wallet.'); return }
    const amt = parseFloat(amount)
    if (amt < 100) { toast('warning','⚠️','Min $100','Minimum payout is $100.'); return }
    if (amt > withdrawable) { toast('warning','⚠️','Exceeds Withdrawable',`Max withdrawable is ${fmt(withdrawable)}.`); return }
    setLoading(true)
    const { data, error } = await supabase.from('payouts').insert({
      account_id: selectedAccount.id,
      user_id: profile?.id ?? session?.user?.id,
      requested_usd: amt,
      method,
      wallet_address: wallet,
      trader_notes: notes || null,
      status: 'pending'
    }).select().single()
    setLoading(false)
    if (error) { toast('error','❌','Error', error.message); return }
    setPayouts(p => [data, ...p])
    setAmount(''); setWallet(''); setNotes('')
    toast('success','💰','Payout Requested', `$${amount} submitted. Processing within 24h.`)
  }

  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (p.net_usd ?? p.requested_usd), 0)

  return (
    <>
      <DashboardLayout title="Payouts" nav={TRADER_NAV} accentColor="gold">
        {fundedAccounts.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <div className="text-[32px] mb-3">💰</div>
              <div className="font-serif text-[18px] font-bold mb-2">No Funded Accounts</div>
              <p className="text-[12px] text-[var(--text2)] mb-2">You can only request payouts from funded accounts.</p>
              <p className="text-[11px] text-[var(--text3)]">Pass Phase 1 and Phase 2 to get funded and start withdrawing profits.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-[14px]">
            <div className="col-span-2 flex flex-col gap-[14px]">

              {/* Account selector */}
              {fundedAccounts.length > 1 && (
                <Card>
                  <CardHeader title="Select Funded Account"/>
                  <div className="flex gap-2 flex-wrap">
                    {fundedAccounts.map(a => {
                      const p = (a as any).challenge_products
                      const prof = a.balance - a.starting_balance
                      const w = prof > 0 ? prof * ((p?.funded_profit_split ?? 85) / 100) : 0
                      return (
                        <button key={a.id} onClick={()=>setSelectedAccountId(a.id)}
                          className={`flex flex-col px-4 py-3 border text-left transition-all cursor-pointer ${
                            a.id === selectedAccount?.id
                              ? 'border-[var(--gold)] bg-[rgba(212,168,67,.06)]'
                              : 'border-[var(--bdr)] bg-[var(--bg3)] hover:border-[var(--bdr2)]'
                          }`}>
                          <span className="font-mono text-[11px] text-[var(--gold)]">{a.account_number}</span>
                          <span className="text-[9px] text-[var(--text3)]">{p?.name} · {p?.funded_profit_split ?? 85}% split</span>
                          <span className="text-[10px] text-[var(--green)] mt-1">Withdrawable: {fmt(w)}</span>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* Request form */}
              <Card>
                <CardHeader title="Request Payout" action={
                  <span className="text-[10px] text-[var(--text3)]">
                    Account: <span className="text-[var(--gold)] font-mono">{selectedAccount?.account_number}</span>
                  </span>
                }/>

                {/* Withdrawable info */}
                <div className="flex gap-3 mb-5">
                  <div className="flex-1 p-3 bg-[rgba(212,168,67,.05)] border border-[rgba(212,168,67,.15)]">
                    <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold mb-1">Profit</div>
                    <div className={`font-mono text-[15px] font-bold ${profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {profit >= 0 ? '+' : ''}{fmt(profit)}
                    </div>
                  </div>
                  <div className="flex-1 p-3 bg-[rgba(212,168,67,.05)] border border-[rgba(212,168,67,.15)]">
                    <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold mb-1">Your {splitPct}% Split</div>
                    <div className="font-mono text-[15px] font-bold text-[var(--gold)]">{fmt(withdrawable)}</div>
                  </div>
                  <div className="flex-1 p-3 bg-[rgba(212,168,67,.05)] border border-[rgba(212,168,67,.15)]">
                    <div className="text-[8px] uppercase tracking-[1.5px] text-[var(--text3)] font-semibold mb-1">Profit Split</div>
                    <div className="font-mono text-[15px] font-bold text-[var(--gold)]">{splitPct}%</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Select label="Payment Method" value={method} onChange={e=>setMethod(e.target.value)}>
                    {METHODS.map(m=><option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                  </Select>
                  <Input label="Wallet / Account" placeholder="Your wallet address or bank details" value={wallet} onChange={e=>setWallet(e.target.value)} />
                  <Input label={`Amount (USD) — max ${fmt(withdrawable)}`} type="number" placeholder="Min $100" value={amount} onChange={e=>setAmount(e.target.value)} />
                  <Input label="Notes (optional)" placeholder="Any notes for the finance team" value={notes} onChange={e=>setNotes(e.target.value)} />
                  <Button loading={loading} onClick={requestPayout} className="w-full" disabled={withdrawable <= 0}>
                    {withdrawable <= 0 ? 'No Profit to Withdraw' : 'Request Payout →'}
                  </Button>
                </div>
              </Card>

              <Card>
                <CardHeader title={`Payout History (${payouts.length})`} />
                {payouts.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[var(--text3)]">No payouts yet</div>
                ) : (
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-[var(--dim)]">
                        {['Date','Amount','Method','Status'].map(h=>(
                          <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map(p=>(
                        <tr key={p.id} className="border-b border-[rgba(212,168,67,.04)]">
                          <td className="px-[11px] py-[8px] text-[var(--text2)]">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="px-[11px] py-[8px] font-mono text-[var(--green)]">{fmt(p.requested_usd)}</td>
                          <td className="px-[11px] py-[8px] text-[var(--text2)]">{METHOD_LABELS[p.method] ?? p.method}</td>
                          <td className="px-[11px] py-[8px]"><Badge variant={(STATUS_COLORS[p.status] ?? 'pending') as any}>{p.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            <div className="flex flex-col gap-[14px]">
              <KPICard label="Total Withdrawn" value={fmt(totalPaid)} sub="All time" subColor="text-[var(--green)]" />
              <KPICard label="Payouts Count" value={String(payouts.filter(p=>p.status==='paid').length)} sub="Completed" />
              <KPICard label="Withdrawable Now" value={fmt(withdrawable)} sub={`${splitPct}% of profit`} subColor="text-[var(--gold)]" />
              <Card>
                <CardHeader title="Payout Info" />
                <div className="flex flex-col gap-2 text-[11px] text-[var(--text2)]">
                  {[['Processing Time','24 hours'],['Minimum','$100'],['Crypto','Same day'],['Wire','2-3 days'],['Split',`${splitPct}% yours`]].map(([l,v])=>(
                    <div key={l} className="flex justify-between border-b border-[var(--dim)] pb-2">
                      <span className="text-[var(--text3)]">{l}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
