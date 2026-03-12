import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { ADMIN_NAV } from '@/lib/nav'

const TRADERS = [
  { name:'James Mitchell',  email:'james@tfd.com',   country:'GB', accts:2, funded:1, pnl:'+$8,420', kyc:'approved', phase:'funded' },
  { name:'Sofia Kowalski',  email:'sofia@email.com',  country:'PL', accts:1, funded:1, pnl:'+$31,500',kyc:'approved', phase:'funded' },
  { name:'Marcus Thompson', email:'marcus@email.com', country:'US', accts:3, funded:2, pnl:'+$24,174',kyc:'approved', phase:'funded' },
  { name:'Yuki Chen',       email:'yuki@email.com',   country:'JP', accts:1, funded:0, pnl:'+$800',   kyc:'pending',  phase:'phase2' },
  { name:'Lucia Romero',    email:'lucia@email.com',  country:'ES', accts:1, funded:0, pnl:'-$120',   kyc:'approved', phase:'phase1' },
]

export function AdminTradersPage() {
  const { toasts, toast, dismiss } = useToast()
  const [search, setSearch] = useState('')
  const filtered = TRADERS.filter(t=>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.includes(search.toLowerCase())
  )

  return (
    <>
      <DashboardLayout title="Trader Management" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title="All Traders" action={<span className="text-[10px] text-[var(--text3)]">14,281 total</span>}/>
          <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] mb-3 transition-colors">
            <span className="px-3 flex items-center text-[var(--text3)]">🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
              className="flex-1 px-3 py-[9px] bg-transparent outline-none text-[var(--text)] text-[12px] font-sans placeholder-[rgba(230,226,248,.25)]"/>
          </div>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--dim)]">
                {['Trader','Country','Accounts','Funded','P&L','KYC','Status','Actions'].map(h=>(
                  <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t,i)=>(
                <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)] cursor-pointer">
                  <td className="px-[11px] py-[8px]">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[9px] text-[var(--text3)]">{t.email}</div>
                  </td>
                  <td className="px-[11px] py-[8px] font-mono text-[var(--text3)]">{t.country}</td>
                  <td className="px-[11px] py-[8px] font-mono">{t.accts}</td>
                  <td className="px-[11px] py-[8px] font-mono text-[var(--green)]">{t.funded}</td>
                  <td className={`px-[11px] py-[8px] font-mono ${t.pnl.startsWith('+') ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{t.pnl}</td>
                  <td className="px-[11px] py-[8px]">
                    <Badge variant={t.kyc==='approved'?'funded':'warning'}>{t.kyc}</Badge>
                  </td>
                  <td className="px-[11px] py-[8px]">
                    <Badge variant={phaseVariant(t.phase)}>{t.phase}</Badge>
                  </td>
                  <td className="px-[11px] py-[8px]">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={()=>toast('info','👤','Trader',`Viewing ${t.name}`)}>View</Button>
                      <Button variant="danger" size="sm" onClick={()=>toast('error','🚫','Suspended',`${t.name} suspended.`)}>Suspend</Button>
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
