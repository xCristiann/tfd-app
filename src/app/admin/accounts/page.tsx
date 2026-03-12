import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

const ACCOUNTS = [
  { id:'TFD-100K-4821', trader:'James Mitchell',  type:'$100K', phase:'funded',  balance:'$108,420', dd:'3.21%',  profit:'+$8,420',  trades:51, risk:'low' },
  { id:'TFD-200K-2241', trader:'Marcus Thompson', type:'$200K', phase:'funded',  balance:'$181,800', dd:'9.41%',  profit:'+$31,800', trades:42, risk:'critical' },
  { id:'TFD-100K-8831', trader:'Sofia Kowalski',  type:'$100K', phase:'funded',  balance:'$104,180', dd:'4.82%',  profit:'+$4,180',  trades:38, risk:'critical' },
  { id:'TFD-25K-3104',  trader:'James Mitchell',  type:'$25K',  phase:'phase2',  balance:'$25,800',  dd:'1.80%',  profit:'+$800',    trades:14, risk:'low' },
  { id:'TFD-25K-7712',  trader:'Yuki Chen',       type:'$25K',  phase:'phase2',  balance:'$23,700',  dd:'3.90%',  profit:'+$3,700',  trades:22, risk:'warning' },
  { id:'TFD-100K-5531', trader:'Lucia Romero',    type:'$100K', phase:'phase1',  balance:'$98,800',  dd:'7.80%',  profit:'-$1,200',  trades:18, risk:'warning' },
  { id:'TFD-25K-9910',  trader:'Lucia Romero',    type:'$25K',  phase:'phase1',  balance:'$24,400',  dd:'0.40%',  profit:'-$600',    trades:6,  risk:'low' },
  { id:'TFD-200K-3310', trader:'Daniel Moreira',  type:'$200K', phase:'funded',  balance:'$219,000', dd:'2.10%',  profit:'+$19,000', trades:31, risk:'low' },
]

const riskColor: Record<string,string> = {
  low:'text-[var(--green)]', warning:'text-[var(--gold)]', critical:'text-[var(--red)]'
}

export function AdminAccountsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')

  const phases = ['All','funded','phase2','phase1','breached']
  const filtered = ACCOUNTS.filter(a => {
    const matchSearch = !search || a.id.toLowerCase().includes(search.toLowerCase()) || a.trader.toLowerCase().includes(search.toLowerCase())
    const matchPhase = phaseFilter === 'All' || a.phase === phaseFilter
    return matchSearch && matchPhase
  })

  return (
    <>
      <DashboardLayout title="All Accounts" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`All Accounts (${filtered.length})`}/>

          {/* Filters */}
          <div className="flex gap-3 mb-3">
            <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] flex-1 max-w-[300px] transition-colors">
              <span className="px-3 flex items-center text-[var(--text3)] text-[11px]">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID or trader…"
                className="flex-1 py-[8px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans placeholder-[rgba(230,226,248,.25)]"/>
            </div>
            <div className="flex gap-[3px]">
              {phases.map(p=>(
                <button key={p} onClick={()=>setPhaseFilter(p)}
                  className={`px-[10px] py-[6px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all capitalize ${
                    phaseFilter===p
                      ? 'bg-[rgba(255,51,82,.1)] border-[rgba(255,51,82,.25)] text-[var(--red)]'
                      : 'bg-[var(--bg3)] border-[var(--dim)] text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--dim)]">
                {['Account ID','Trader','Type','Phase','Balance','Max DD','Profit','Trades','Risk','Actions'].map(h=>(
                  <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a=>(
                <tr key={a.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)] cursor-pointer">
                  <td className="px-[11px] py-[8px] font-mono text-[var(--gold)]">{a.id}</td>
                  <td className="px-[11px] py-[8px] font-semibold">{a.trader}</td>
                  <td className="px-[11px] py-[8px] text-[var(--text2)]">{a.type}</td>
                  <td className="px-[11px] py-[8px]"><Badge variant={phaseVariant(a.phase)}>{a.phase}</Badge></td>
                  <td className="px-[11px] py-[8px] font-mono">{a.balance}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${riskColor[a.risk]}`}>{a.dd}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${a.profit.startsWith('+') ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{a.profit}</td>
                  <td className="px-[11px] py-[8px] font-mono text-[var(--text2)]">{a.trades}</td>
                  <td className={`px-[11px] py-[8px] font-semibold capitalize ${riskColor[a.risk]}`}>{a.risk}</td>
                  <td className="px-[11px] py-[8px]">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={()=>toast('info','🗂','Account',`Viewing ${a.id}`)}>View</Button>
                      {a.risk==='critical' && (
                        <Button variant="danger" size="sm" onClick={()=>toast('error','🚨','Alert',`${a.id} notified.`)}>Notify</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
