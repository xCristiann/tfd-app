import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
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
  const { primary } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('usdt_trc20')
  const [wallet, setWallet] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    supabase.from('payouts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setPayouts(data ?? []))
  }, [])

  async function requestPayout() {
    if (!primary) { toast('warning','⚠️','No Account','No active account found.'); return }
    if (!amount || !wallet) { toast('warning','⚠️','Missing Info','Fill in amount and wallet.'); return }
    if (parseFloat(amount) < 100) { toast('warning','⚠️','Min $100','Minimum payout is $100.'); return }
    setLoading(true)
    const { data, error } = await supabase.from('payouts').insert({
      account_id: primary.id, requested_usd: parseFloat(amount),
      method, wallet_address: wallet, trader_notes: notes || null, status: 'pending'
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
        <div className="grid grid-cols-3 gap-[14px]">
          <div className="col-span-2 flex flex-col gap-[14px]">
            <Card>
              <CardHeader title="Request Payout" />
              <div className="flex flex-col gap-3">
                <Select label="Payment Method" value={method} onChange={e=>setMethod(e.target.value)}>
                  {METHODS.map(m=><option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </Select>
                <Input label="Wallet / Account" placeholder="Your wallet address or bank details" value={wallet} onChange={e=>setWallet(e.target.value)} />
                <Input label="Amount (USD)" type="number" placeholder="Min $100" value={amount} onChange={e=>setAmount(e.target.value)} />
                <Input label="Notes (optional)" placeholder="Any notes for the finance team" value={notes} onChange={e=>setNotes(e.target.value)} />
                <Button loading={loading} onClick={requestPayout} className="w-full">Request Payout</Button>
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
            <Card>
              <CardHeader title="Payout Info" />
              <div className="flex flex-col gap-2 text-[11px] text-[var(--text2)]">
                {[['Processing Time','24 hours'],['Minimum','$100'],['Crypto','Same day'],['Wire','2-3 days']].map(([l,v])=>(
                  <div key={l} className="flex justify-between border-b border-[var(--dim)] pb-2">
                    <span className="text-[var(--text3)]">{l}</span><span>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
