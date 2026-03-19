import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { TRADER_NAV } from '@/lib/nav'

function generateCode(name: string) {
  const base = name.toUpperCase().replace(/[^A-Z]/g,'').slice(0,4)
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${base}${rand}`
}

export function AffiliatePage() {
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [affiliate, setAffiliate] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!profile) return
    load()
  }, [profile?.id])

  async function load() {
    if (!profile) return
    setLoading(true)
    const { data: aff } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', profile.id)
      .single()
    setAffiliate(aff ?? null)

    if (aff) {
      const { data: refs } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', aff.id)
        .order('created_at', { ascending: false })
      setReferrals(refs ?? [])
    }
    setLoading(false)
  }

  async function joinProgram() {
    if (!profile) return
    setJoining(true)
    const code = generateCode(profile.first_name ?? profile.email ?? 'TFD')
    const { data, error } = await supabase.from('affiliates').insert({
      user_id: profile.id,
      code,
      commission_pct: 20,
      total_referrals: 0,
      total_revenue_usd: 0,
      total_earned_usd: 0,
      total_paid_usd: 0,
      is_active: true,
    }).select().single()
    if (error) { toast('error','❌','Error', error.message); setJoining(false); return }
    setAffiliate(data)
    toast('success','🎉','Welcome!','Your affiliate account is active.')
    setJoining(false)
  }

  function copyLink() {
    const link = `${window.location.origin}?ref=${affiliate?.code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast('success','📋','Copied!','Referral link copied to clipboard.')
    setTimeout(() => setCopied(false), 2000)
  }

  function copyCode() {
    navigator.clipboard.writeText(affiliate?.code)
    toast('success','📋','Copied!','Code copied.')
  }

  const refLink = `${window.location.origin}?ref=${affiliate?.code ?? ''}`
  const owed = (affiliate?.total_earned_usd ?? 0) - (affiliate?.total_paid_usd ?? 0)

  return (
    <>
      <DashboardLayout title="Affiliate Program" nav={TRADER_NAV} accentColor="gold">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : !affiliate ? (
          /* Not enrolled */
          <div className="max-w-[620px] mx-auto">
            <Card>
              <div className="text-center py-6">
                <div className="text-[40px] mb-4">🔗</div>
                <div className="font-sans text-[22px] font-bold mb-2">Join the Affiliate Program</div>
                <p className="text-[12px] text-[#5C7A9E] mb-8 leading-[1.7]">
                  Earn <strong className="text-[#2255CC]">20% commission</strong> on every challenge purchase made through your referral link. Get paid monthly via crypto or bank transfer.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    ['20%','Commission per sale'],
                    ['Monthly','Payout schedule'],
                    ['Unlimited','Referral earnings'],
                  ].map(([v,l]) => (
                    <div key={l} className="bg-[#F4F7FD] border border-[#F0F4FB] p-4">
                      <div className="font-sans text-[24px] font-bold text-[#2255CC] mb-1">{v}</div>
                      <div className="text-[9px] text-[#8FA3BF] uppercase tracking-[1px]">{l}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 mb-8 text-left">
                  {[
                    ['🔗','Share your unique link','Post it on social media, YouTube, Discord, or anywhere traders hang out.'],
                    ['💰','Earn on every purchase','When someone buys a challenge through your link, you earn 20% instantly.'],
                    ['💳','Get paid monthly','Withdraw via USDT, BTC, or bank transfer — no minimum threshold.'],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="flex gap-3 p-3 bg-[#F4F7FD] border border-[#F0F4FB]">
                      <span className="text-[20px]">{icon}</span>
                      <div>
                        <div className="text-[12px] font-semibold mb-[2px]">{title}</div>
                        <div className="text-[10px] text-[#8FA3BF]">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={joinProgram} loading={joining} className="w-full py-[14px] text-[12px]">
                  Join Affiliate Program →
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* Enrolled */
          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-[11px] mb-4">
              <KPICard label="Total Referrals" value={String(affiliate.total_referrals ?? 0)} sub="All time" subColor="text-[#2255CC]"/>
              <KPICard label="Total Earned" value={fmt(affiliate.total_earned_usd ?? 0)} sub="Gross commissions" subColor="text-[#16A34A]"/>
              <KPICard label="Amount Owed" value={fmt(owed)} sub="Pending payout" subColor="text-[#2255CC]"/>
              <KPICard label="Total Paid" value={fmt(affiliate.total_paid_usd ?? 0)} sub="Lifetime payouts" subColor="text-[#16A34A]"/>
            </div>

            <div className="grid grid-cols-2 gap-[14px]">
              {/* Your links */}
              <Card>
                <CardHeader title="Your Referral Details"/>
                <div className="flex flex-col gap-4">
                  {/* Code */}
                  <div>
                    <div className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold mb-2">Referral Code</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA]  text-[18px] font-bold text-[#2255CC] tracking-[3px]">
                        {affiliate.code}
                      </div>
                      <button onClick={copyCode}
                        className="px-3 py-2 bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] text-[#2255CC] text-[9px] uppercase font-bold cursor-pointer hover:bg-[rgba(34,85,204,.2)] transition-colors">
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Link */}
                  <div>
                    <div className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold mb-2">Referral Link</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-[#F4F7FD] border border-[#F0F4FB]  text-[10px] text-[#5C7A9E] truncate">
                        {refLink}
                      </div>
                      <button onClick={copyLink}
                        className="px-3 py-2 bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] text-[#2255CC] text-[9px] uppercase font-bold cursor-pointer hover:bg-[rgba(34,85,204,.2)] transition-colors flex-shrink-0">
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center py-3 border-t border-[#E8EEF8]">
                    <span className="text-[10px] text-[#8FA3BF]">Status</span>
                    <span className={`text-[9px] px-2 py-1 font-bold uppercase ${affiliate.is_active ? 'bg-[rgba(22,163,74,.1)] text-[#16A34A]' : 'bg-[rgba(220,38,38,.1)] text-[#DC2626]'}`}>
                      {affiliate.is_active ? '● Active' : '○ Suspended'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#8FA3BF]">Commission Rate</span>
                    <span className=" text-[14px] font-bold text-[#2255CC]">{affiliate.commission_pct ?? 20}%</span>
                  </div>

                  {/* Share buttons */}
                  <div className="pt-3 border-t border-[#E8EEF8]">
                    <div className="text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold mb-2">Share On</div>
                    <div className="flex gap-2">
                      {[
                        ['Twitter/X', `https://twitter.com/intent/tweet?text=I'm trading with The Funded Diaries — get up to $200K funded account! Use my code ${affiliate.code}&url=${refLink}`],
                        ['Telegram', `https://t.me/share/url?url=${refLink}&text=Get a funded trading account with TFD — use my code ${affiliate.code}`],
                      ].map(([name, url]) => (
                        <a key={name} href={url} target="_blank" rel="noreferrer"
                          className="flex-1 text-center py-2 text-[9px] uppercase font-bold bg-[#F4F7FD] border border-[#F0F4FB] text-[#5C7A9E] hover:text-[#2255CC] hover:border-[#C5D5EA] transition-all cursor-pointer no-underline">
                          {name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats & referrals */}
              <div className="flex flex-col gap-[14px]">
                {/* Progress */}
                <Card>
                  <CardHeader title="Performance"/>
                  <div className="flex flex-col gap-4">
                    {[
                      ['Conversion Rate', referrals.length > 0 ? `${((referrals.filter(r=>r.status==='converted').length/referrals.length)*100).toFixed(0)}%` : '—', '#2255CC'],
                      ['Avg Commission', affiliate.total_referrals > 0 ? fmt(affiliate.total_earned_usd/affiliate.total_referrals) : '—', '#16A34A'],
                      ['This Month', fmt(referrals.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).reduce((s:number,r:any)=>s+(r.commission_usd??0),0)), '#2255CC'],
                    ].map(([l,v,c]) => (
                      <div key={l} className="flex justify-between items-center py-2 border-b border-[#F0F4FB] last:border-0">
                        <span className="text-[10px] text-[#8FA3BF]">{l}</span>
                        <span className=" text-[13px] font-bold" style={{color:c}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Payout request */}
                {owed > 0 && (
                  <Card>
                    <div className="text-center py-2">
                      <div className="text-[11px] text-[#5C7A9E] mb-1">Available to withdraw</div>
                      <div className="font-sans text-[28px] font-bold text-[#2255CC] mb-3">{fmt(owed)}</div>
                      <Button className="w-full" onClick={() => toast('info','💰','Coming Soon','Payout requests coming soon.')}>
                        Request Payout
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Referrals table */}
            <Card className="mt-[14px]">
              <CardHeader title={`Referrals (${referrals.length})`}/>
              {referrals.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-[24px] mb-2">📭</div>
                  <p className="text-[11px] text-[#8FA3BF]">No referrals yet. Share your link to start earning!</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#F0F4FB]">
                      {['Date','Referred User','Product','Status','Commission'].map(h => (
                        <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r,i) => (
                      <tr key={i} className="border-b border-[rgba(34,85,204,.03)]">
                        <td className="px-[11px] py-[8px] text-[10px] text-[#8FA3BF]">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-[11px] py-[8px]">{r.referred_email ?? r.referred_user_id?.slice(0,12) ?? '—'}</td>
                        <td className="px-[11px] py-[8px] text-[#5C7A9E]">{r.product_name ?? '—'}</td>
                        <td className="px-[11px] py-[8px]">
                          <span className={`text-[8px] px-2 py-1 font-bold uppercase ${r.status === 'converted' ? 'bg-[rgba(22,163,74,.1)] text-[#16A34A]' : 'bg-[rgba(34,85,204,.08)] text-[#2255CC]'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-[11px] py-[8px]  font-semibold text-[#2255CC]">{r.commission_usd ? fmt(r.commission_usd) : '—'}</td>
                      </tr>
                    ))}
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
