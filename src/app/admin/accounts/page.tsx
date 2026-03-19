import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { phaseLabel } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminAccountsPage() {
  const { toasts, dismiss } = useToast()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')

  useEffect(() => {
    supabase.from('accounts')
      .select('*, users(first_name, last_name, email), challenge_products(name, account_size)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAccounts(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const phases = ['All','phase1','phase2','funded','breached','passed']
  const filtered = accounts.filter(a => {
    const trader = a.users ? `${a.users.first_name} ${a.users.last_name}` : ''
    const matchSearch = !search ||
      a.account_number?.toLowerCase().includes(search.toLowerCase()) ||
      trader.toLowerCase().includes(search.toLowerCase()) ||
      a.users?.email?.toLowerCase().includes(search.toLowerCase())
    const matchPhase = phaseFilter === 'All' || a.phase === phaseFilter
    return matchSearch && matchPhase
  })

  const riskLevel = (a: any) => {
    if ((a.daily_dd_used ?? 0) >= 4 || (a.max_dd_used ?? 0) >= 8) return 'critical'
    if ((a.daily_dd_used ?? 0) >= 2.5 || (a.max_dd_used ?? 0) >= 5) return 'warning'
    return 'low'
  }
  const riskColor: Record<string,string> = {
    low: 'text-[#16A34A]', warning: 'text-[#2255CC]', critical: 'text-[#DC2626]'
  }

  return (
    <>
      <DashboardLayout title="All Accounts" nav={ADMIN_NAV} accentColor="red">
        <Card>
          <CardHeader title={`All Accounts (${filtered.length})`}/>
          <div className="flex gap-3 mb-3 flex-wrap">
            <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] flex-1 max-w-[300px] transition-colors">
              <span className="px-3 flex items-center text-[#8FA3BF] text-[11px]">🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, trader or email…"
                className="flex-1 py-[8px] bg-transparent outline-none text-[#1A3A6B] text-[12px] font-sans placeholder-[rgba(230,226,248,.25)]"/>
            </div>
            <div className="flex gap-[3px] flex-wrap">
              {phases.map(p=>(
                <button key={p} onClick={()=>setPhaseFilter(p)}
                  className={`px-[10px] py-[6px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all capitalize ${
                    phaseFilter===p
                      ? 'bg-[rgba(220,38,38,.1)] border-[rgba(220,38,38,.25)] text-[#DC2626]'
                      : 'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF] hover:text-[#5C7A9E]'
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[11px] text-[#8FA3BF]">No accounts found</div>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[#F0F4FB]">
                  {['Account ID','Trader','Product','Phase','Balance','Daily DD','Max DD','Status','Risk'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const risk = riskLevel(a)
                  const profitPct = a.starting_balance > 0
                    ? ((a.balance - a.starting_balance) / a.starting_balance) * 100 : 0
                  return (
                    <tr key={a.id} className="border-b border-[rgba(34,85,204,.03)] hover:bg-[rgba(34,85,204,.02)]">
                      <td className="px-[11px] py-[8px]  text-[#2255CC] text-[10px]">{a.account_number}</td>
                      <td className="px-[11px] py-[8px]">
                        <div className="font-semibold">{a.users ? `${a.users.first_name} ${a.users.last_name}` : '—'}</div>
                        <div className="text-[9px] text-[#8FA3BF]">{a.users?.email}</div>
                      </td>
                      <td className="px-[11px] py-[8px] text-[#5C7A9E]">{a.challenge_products?.name ?? '—'}</td>
                      <td className="px-[11px] py-[8px]"><Badge variant={phaseVariant(a.phase)}>{phaseLabel(a.phase)}</Badge></td>
                      <td className="px-[11px] py-[8px]">
                        <div className="">${Number(a.balance).toLocaleString()}</div>
                        <div className={`text-[9px] ${profitPct >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                          {profitPct >= 0 ? '+' : ''}{(Number(profitPct) || 0).toFixed(2)}%
                        </div>
                      </td>
                      <td className={`px-[11px] py-[8px]  ${riskColor[risk]}`}>{(a.daily_dd_used ?? 0).toFixed(2)}%</td>
                      <td className={`px-[11px] py-[8px]  ${riskColor[risk]}`}>{(a.max_dd_used ?? 0).toFixed(2)}%</td>
                      <td className="px-[11px] py-[8px]">
                        <span className={`text-[8px] uppercase font-bold px-[6px] py-[2px] border ${
                          a.status === 'active'
                            ? 'text-[#16A34A] bg-[rgba(0,200,100,.08)] border-[rgba(0,200,100,.2)]'
                            : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#F0F4FB]'
                        }`}>{a.status ?? 'active'}</span>
                      </td>
                      <td className={`px-[11px] py-[8px] font-semibold capitalize text-[10px] ${riskColor[risk]}`}>{risk}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
