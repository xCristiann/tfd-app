import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { fmt } from '@/lib/utils'
import { TRADER_NAV } from '@/lib/nav'

const HISTORY = [
  { date: '3 Mar 2026',  amount: 3400, method: 'USDT' },
  { date: '14 Feb 2026', amount: 2807, method: 'Bitcoin' },
  { date: '28 Jan 2026', amount: 4200, method: 'Wise' },
  { date: '10 Jan 2026', amount: 4200, method: 'USDT' },
]

export function PayoutsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [method, setMethod] = useState('USDT (TRC20)')
  const [wallet, setWallet] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!amount || !wallet) { toast('warning','⚠️','Missing Info','Fill in amount and wallet.'); return }
    if (parseFloat(amount) < 100) { toast('warning','⚠️','Min $100','Minimum payout is $100.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    toast('success','💰','Payout Requested',`$${amount} submitted. Processing in 24h.`)
    setAmount(''); setWallet(''); setNotes(''); setLoading(false)
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{label}</label>
      {children}
    </div>
  )
  const InputWrap = ({ children }: { children: React.ReactNode }) => (
    <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">{children}</div>
  )
  const Ico = ({ c }: { c: string }) => (
    <span className="px-[10px] flex items-center text-[var(--text3)] border-r border-[var(--dim)] text-[12px]">{c}</span>
  )
  const inputCls = "flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[rgba(230,226,248,.25)] text-[12px] font-sans"

  return (
    <>
      <DashboardLayout title="Payouts" nav={TRADER_NAV} accentColor="gold">
        <div className="grid grid-cols-2 gap-[14px]">
          <Card>
            <CardHeader title="Request Payout" />
            <div className="flex flex-col gap-3">
              <div className="bg-[rgba(212,168,67,.04)] border border-[var(--bdr)] px-[13px] py-[11px]">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--text2)]">Available</span>
                  <span className="font-mono text-[18px] font-medium text-[var(--gold)]">$7,157</span>
                </div>
                <div className="text-[10px] text-[var(--text3)]">85% split · Min $100 · Processed in 24h</div>
              </div>

              <Field label="Method">
                <InputWrap>
                  <select value={method} onChange={e=>setMethod(e.target.value)} style={{background:'transparent'}}
                    className={inputCls + " cursor-pointer"}>
                    <option>USDT (TRC20)</option><option>Bitcoin (BTC)</option>
                    <option>Wise Transfer</option><option>Bank Transfer</option>
                  </select>
                </InputWrap>
              </Field>
              <Field label="Wallet / Account">
                <InputWrap><Ico c="🔑"/><input value={wallet} onChange={e=>setWallet(e.target.value)} placeholder="Wallet address or account number" className={inputCls}/></InputWrap>
              </Field>
              <Field label="Amount (USD)">
                <InputWrap><Ico c="$"/><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" placeholder="500" min={100} max={7157} className={inputCls}/></InputWrap>
              </Field>
              <Field label="Notes">
                <InputWrap><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes…" className={inputCls + " resize-y min-h-[60px]"}/></InputWrap>
              </Field>
              <Button loading={loading} onClick={submit} className="w-full">Request Payout</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Payout History" />
            <div className="flex gap-2 mb-3">
              {[['Total Withdrawn','$14,607','var(--green)'],['Payouts Count','8','var(--text)']].map(([l,v,c])=>(
                <div key={l} className="flex-1 bg-[var(--bg3)] border border-[var(--dim)] px-[11px] py-[10px]">
                  <div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-[3px]">{l}</div>
                  <div className="font-mono text-[16px]" style={{color:c}}>{v}</div>
                </div>
              ))}
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--dim)]">
                  {['Date','Amount','Method','Status'].map(h=><th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {HISTORY.map((p,i)=>(
                  <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                    <td className="px-[11px] py-[8px] font-mono text-[10px] text-[var(--text3)]">{p.date}</td>
                    <td className="px-[11px] py-[8px] font-mono text-[var(--green)]">+{fmt(p.amount)}</td>
                    <td className="px-[11px] py-[8px] text-[var(--text2)]">{p.method}</td>
                    <td className="px-[11px] py-[8px]"><Badge variant="paid">Paid</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
