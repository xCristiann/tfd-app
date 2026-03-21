import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

export function AdminCertificatesPage() {
  const { toasts, dismiss } = useToast()
  const [fundedCerts,  setFundedCerts]  = useState<any[]>([])
  const [payoutCerts,  setPayoutCerts]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: funded }, { data: payouts }] = await Promise.all([
      supabase.from('accounts')
        .select('*, users(first_name,last_name,email), challenge_products(name,account_size,funded_profit_split,challenge_type)')
        .in('phase', ['funded','passed'])
        .not('funded_at', 'is', null)
        .order('funded_at', { ascending: false }),
      supabase.from('payouts')
        .select('*, users(first_name,last_name,email), accounts(account_number)')
        .eq('status', 'paid')
        .order('updated_at', { ascending: false }),
    ])
    setFundedCerts(funded ?? [])
    setPayoutCerts(payouts ?? [])
    setLoading(false)
  }

  const mono = { fontFamily:"'JetBrains Mono',monospace" } as const

  return (
    <>
      <DashboardLayout title="Certificates" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-3 gap-[11px]">
          <KPICard label="Funded Certificates" value={String(fundedCerts.length)}  sub="Total issued" subColor="text-[#2255CC]"/>
          <KPICard label="Payout Certificates" value={String(payoutCerts.length)}  sub="Total issued" subColor="text-[#16A34A]"/>
          <KPICard label="Total Issued"         value={String(fundedCerts.length + payoutCerts.length)} sub="All time"/>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <>
            {/* Funded certificates */}
            <Card>
              <CardHeader title={`Funded Trader Certificates (${fundedCerts.length})`}/>
              {fundedCerts.length === 0 ? (
                <div className="py-10 text-center text-[11px] text-[#8FA3BF]">No funded certificates yet</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead><tr className="border-b border-[#F0F4FB]">
                    {['Certificate ID','Trader','Email','Account','Size','Type','Split','Funded Date'].map(h=>(
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {fundedCerts.map((a, i) => {
                      const prod = a.challenge_products
                      const year = new Date(a.funded_at).getFullYear()
                      const certId = `TFD-F-${year}-${a.account_number?.replace('TFD-','').replace(/-/g,'').slice(-4)}`
                      return (
                        <tr key={a.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                          <td className="px-[11px] py-[8px]"><span style={{...mono,fontSize:'9px',color:'#D4A843',background:'rgba(212,168,67,.08)',padding:'2px 6px',border:'1px solid rgba(212,168,67,.2)',borderRadius:'4px'}}>{certId}</span></td>
                          <td className="px-[11px] py-[8px] font-semibold">{a.users?.first_name} {a.users?.last_name}</td>
                          <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">{a.users?.email}</td>
                          <td className="px-[11px] py-[8px]"><span style={{...mono,fontSize:'10px',color:'#2255CC'}}>{a.account_number}</span></td>
                          <td className="px-[11px] py-[8px]" style={mono}>${Number(a.starting_balance).toLocaleString()}</td>
                          <td className="px-[11px] py-[8px] text-[#5C7A9E]">{prod?.challenge_type === '1step' ? '1-Step' : '2-Step'}</td>
                          <td className="px-[11px] py-[8px]" style={mono}>{prod?.funded_profit_split ?? 80}%</td>
                          <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">{new Date(a.funded_at).toLocaleDateString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Payout certificates */}
            <Card>
              <CardHeader title={`Profit Withdrawal Certificates (${payoutCerts.length})`}/>
              {payoutCerts.length === 0 ? (
                <div className="py-10 text-center text-[11px] text-[#8FA3BF]">No payout certificates yet</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead><tr className="border-b border-[#F0F4FB]">
                    {['Certificate ID','Trader','Email','Account','Amount','Method','Date Paid'].map(h=>(
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {payoutCerts.map((p, i) => {
                      const year = new Date(p.updated_at ?? p.created_at).getFullYear()
                      const certId = `TFD-P-${year}-${String(i+1).padStart(4,'0')}`
                      return (
                        <tr key={p.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                          <td className="px-[11px] py-[8px]"><span style={{...mono,fontSize:'9px',color:'#16A34A',background:'rgba(22,163,74,.08)',padding:'2px 6px',border:'1px solid rgba(22,163,74,.2)',borderRadius:'4px'}}>{certId}</span></td>
                          <td className="px-[11px] py-[8px] font-semibold">{p.users?.first_name} {p.users?.last_name}</td>
                          <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">{p.users?.email}</td>
                          <td className="px-[11px] py-[8px]"><span style={{...mono,fontSize:'10px',color:'#2255CC'}}>{p.accounts?.account_number}</span></td>
                          <td className="px-[11px] py-[8px] font-semibold" style={{...mono,color:'#16A34A'}}>${Number(p.requested_usd).toFixed(2)}</td>
                          <td className="px-[11px] py-[8px] text-[#5C7A9E] capitalize">{p.method}</td>
                          <td className="px-[11px] py-[8px] text-[#8FA3BF] text-[10px]">{new Date(p.updated_at ?? p.created_at).toLocaleDateString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
