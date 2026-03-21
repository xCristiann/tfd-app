import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { phaseLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { TRADER_NAV } from '@/lib/nav'

function ProgressBar({ label, value, max, color, done }: { label:string; value:number; max:number; color:string; done:boolean }) {
  const pct = done ? 100 : Math.min((value / max) * 100, 100)
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[#5C7A9E]">{label}</span>
        <span className=" text-[11px]" style={{color}}>{(Number(value) || 0).toFixed(2)}%{done?' ✓':` / ${max}%`}</span>
      </div>
      <div className="h-[5px] bg-white/5 rounded-[3px] overflow-hidden">
        <div className="h-full rounded-[3px] transition-all duration-500" style={{width:`${pct}%`,background:color}}/>
      </div>
    </div>
  )
}

export function ChallengesPage() {
  const { accounts, loading: accLoading } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [tab, setTab] = useState<'my'|'buy'>('my')

  useEffect(() => {
    supabase.from('challenge_products').select('*').eq('is_active', true).order('account_size', { ascending: true })
      .then(({ data }) => setAvailableProducts(data ?? []))
  }, [])

  return (
    <>
      <DashboardLayout title="Challenges" nav={TRADER_NAV} accentColor="gold">
        <div className="flex gap-[3px] mb-4">
          {[['my','My Challenges'],['buy','Available Challenges']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k as any)}
              className={`px-[14px] py-[7px] text-[9px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all ${
                tab===k ? 'bg-[rgba(34,85,204,.08)] border-[#C5D5EA] text-[#2255CC]' : 'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF]'
              }`}>{l}</button>
          ))}
        </div>

        {tab === 'my' && (
          accLoading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin"/></div>
          ) : accounts.length === 0 ? (
            <Card>
              <div className="py-16 text-center">
                <div className="text-[32px] mb-3">🎯</div>
                <div className="font-sans text-[18px] font-bold mb-2">No challenges yet</div>
                <p className="text-[12px] text-[#5C7A9E] mb-6">Purchase a challenge to start trading our capital.</p>
                <Button onClick={()=>setTab('buy')}>Browse Challenges →</Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-[14px]">
              {accounts.map(account => {
                const prod = (account as any).challenge_products
                const profitPct = account.starting_balance > 0
                  ? ((account.balance - account.starting_balance) / account.starting_balance) * 100 : 0
                const targetPct = account.phase === 'phase2' ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)
                const dailyMax = account.phase === 'funded' ? (prod?.funded_daily_dd ?? 5) : (prod?.ph1_daily_dd ?? 5)
                const maxMax   = account.phase === 'funded' ? (prod?.funded_max_dd ?? 10) : (prod?.ph1_max_dd ?? 10)
                return (
                  <Card key={account.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-sans text-[15px] font-semibold">{account.account_number}</div>
                      <Badge variant={phaseVariant(account.phase)}>{phaseLabel(account.phase)}</Badge>
                    </div>
                    <p className="text-[11px] text-[#5C7A9E] mb-4">
                      ${account.starting_balance.toLocaleString()} · {prod?.name ?? 'TFD Challenge'}
                    </p>
                    <ProgressBar label={`Profit Target (${targetPct}%)`} value={profitPct} max={targetPct}
                      color={profitPct >= targetPct ? '#16A34A' : '#2255CC'} done={profitPct >= targetPct}/>
                    <ProgressBar label={`Daily DD (${dailyMax}% max)`} value={account.daily_dd_used ?? 0} max={dailyMax}
                      color={(account.daily_dd_used ?? 0) > dailyMax*0.8 ? '#DC2626' : '#16A34A'} done={false}/>
                    <ProgressBar label={`Max DD (${maxMax}% max)`} value={account.max_dd_used ?? 0} max={maxMax}
                      color={(account.max_dd_used ?? 0) > maxMax*0.7 ? '#DC2626' : '#2255CC'} done={false}/>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={()=>navigate('/platform')} className="flex-1 text-[9px]">Trade Now →</Button>
                      <Button variant="ghost" onClick={()=>navigate('/dashboard/analytics')} className="flex-1 text-[9px]">Analytics</Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        )}

        {tab === 'buy' && (
          availableProducts.length === 0 ? (
            <Card><div className="py-12 text-center text-[11px] text-[#8FA3BF]">No challenges available at the moment</div></Card>
          ) : (
            <div className="grid grid-cols-3 gap-[14px]">
              {availableProducts.map(p=>(
                <Card key={p.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-sans text-[20px] font-bold text-[#2255CC]">${Number(p.account_size).toLocaleString()}</div>
                      <div className="text-[11px] text-[#5C7A9E]">{p.name}</div>
                    </div>
                    <div className="font-sans text-[22px] font-bold">${p.price_usd}</div>
                  </div>
                  {/* Type badge */}
                  <div className="mb-3 flex gap-2 flex-wrap">
                    <span className={`text-[8px] uppercase tracking-[1.5px] font-bold px-2 py-1 border ${
                      p.challenge_type==='instant' ? 'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]' :
                      p.challenge_type==='payafter' ? 'text-[#7C3AED] bg-[rgba(124,58,237,.08)] border-[rgba(124,58,237,.2)]' :
                      p.challenge_type==='1step' ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' :
                      'text-[#2255CC] bg-[rgba(34,85,204,.08)] border-[rgba(34,85,204,.2)]'
                    }`}>
                      {p.challenge_type==='2step'?'2-Step':p.challenge_type==='1step'?'1-Step':p.challenge_type==='instant'?'⚡ Instant':p.challenge_type==='payafter'?'💜 Pay After Pass':p.challenge_type}
                    </span>
                    {(p.drawdown_type==='trailing') && (
                      <span className="text-[8px] uppercase tracking-[1.5px] font-bold px-2 py-1 border text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]">
                        ⟳ Trailing DD
                      </span>
                    )}
                  </div>

                  {/* Trailing DD explanation */}
                  {p.drawdown_type==='trailing' && (
                    <div className="mb-3 p-2 bg-[rgba(217,119,6,.05)] border border-[rgba(217,119,6,.2)] text-[9px] text-[#D97706] rounded">
                      ⟳ Trailing Drawdown — your floor rises as your balance grows. Max loss: {p.trailing_drawdown}% from peak balance.
                    </div>
                  )}

                  {/* Instant/PayAfter notice */}
                  {p.challenge_type==='instant' && (
                    <div className="mb-3 p-2 bg-[rgba(217,119,6,.05)] border border-[rgba(217,119,6,.2)] text-[9px] text-[#D97706] rounded">
                      ⚡ Get funded immediately — no evaluation required.
                    </div>
                  )}
                  {p.challenge_type==='payafter' && (
                    <div className="mb-3 p-2 bg-[rgba(124,58,237,.05)] border border-[rgba(124,58,237,.2)] text-[9px] text-[#7C3AED] rounded">
                      💜 Pay after you pass — complete the evaluation first, then pay the activation fee to get funded.
                    </div>
                  )}

                  {/* Phase 1 */}
                  {p.challenge_type !== 'instant' && (
                    <div className="mb-2">
                      <div className="text-[8px] uppercase tracking-[1.5px] font-bold text-[#8FA3BF] mb-1">Phase 1</div>
                      {[
                        ['Profit Target', `${p.ph1_profit_target}%`],
                        ['Daily Drawdown', `${p.ph1_daily_dd}%`],
                        ...(p.drawdown_type==='trailing'
                          ? [['Trailing Drawdown', `${p.trailing_drawdown}% from peak`]]
                          : [['Max Drawdown', `${p.ph1_max_dd}%`]]),
                        ['Min Days', p.ph1_min_days ? `${p.ph1_min_days} days` : 'None'],
                      ].map(([l,v])=>(
                        <div key={l} className="flex justify-between py-[4px] border-b border-[#F0F4FB]">
                          <span className="text-[9px] text-[#8FA3BF]">{l}</span>
                          <span className={`font-mono text-[10px] font-semibold ${String(l).includes('Trailing')?'text-[#D97706]':'text-[#1A3A6B]'}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Phase 2 */}
                  {p.challenge_type === '2step' && (
                    <div className="mb-2">
                      <div className="text-[8px] uppercase tracking-[1.5px] font-bold text-[#8FA3BF] mb-1">Phase 2</div>
                      {[
                        ['Profit Target', `${p.ph2_profit_target}%`],
                        ['Daily Drawdown', `${p.ph2_daily_dd}%`],
                        ...(p.drawdown_type==='trailing'
                          ? [['Trailing Drawdown', `${p.trailing_drawdown}% from peak`]]
                          : [['Max Drawdown', `${p.ph2_max_dd}%`]]),
                      ].map(([l,v])=>(
                        <div key={l} className="flex justify-between py-[4px] border-b border-[#F0F4FB]">
                          <span className="text-[9px] text-[#8FA3BF]">{l}</span>
                          <span className={`font-mono text-[10px] font-semibold ${String(l).includes('Trailing')?'text-[#D97706]':'text-[#1A3A6B]'}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Funded */}
                  <div className="mb-2">
                    <div className="text-[8px] uppercase tracking-[1.5px] font-bold text-[#8FA3BF] mb-1">Funded Account</div>
                    {[
                      ['Profit Split', `${p.funded_profit_split}%`],
                      ['Daily Drawdown', `${p.funded_daily_dd}%`],
                      ...(p.drawdown_type==='trailing'
                        ? [['Trailing Drawdown', `${p.trailing_drawdown}% from peak`]]
                        : [['Max Drawdown', `${p.funded_max_dd}%`]]),
                    ].map(([l,v])=>(
                      <div key={l} className="flex justify-between py-[4px] border-b border-[#F0F4FB]">
                        <span className="text-[9px] text-[#8FA3BF]">{l}</span>
                        <span className={`font-mono text-[10px] font-semibold ${String(l).includes('Trailing')?'text-[#D97706]':String(l).includes('Split')?'text-[#16A34A]':'text-[#1A3A6B]'}`}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Rules */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className={`text-[8px] px-2 py-1 border font-semibold ${p.news_trading ? 'text-[#16A34A] bg-[rgba(22,163,74,.06)] border-[rgba(22,163,74,.2)]' : 'text-[#9CA3AF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                      {p.news_trading ? '✓' : '✕'} News Trading
                    </span>
                    <span className={`text-[8px] px-2 py-1 border font-semibold ${p.weekend_holding ? 'text-[#16A34A] bg-[rgba(22,163,74,.06)] border-[rgba(22,163,74,.2)]' : 'text-[#9CA3AF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                      {p.weekend_holding ? '✓' : '✕'} Weekend Hold
                    </span>
                  </div>

                  {p.activation_fee > 0 && (
                    <div className="mt-3 p-2 bg-[rgba(124,58,237,.06)] border border-[rgba(124,58,237,.2)] rounded text-[10px] text-[#7C3AED]">
                      💜 After passing: pay <strong>${p.activation_fee}</strong> activation fee to receive your funded account.
                    </div>
                  )}
                  <Button className="w-full mt-3"
                    onClick={()=>navigate('/checkout?product='+p.id)}>
                    {p.challenge_type==='payafter' ? `💜 Start Evaluation →` : p.challenge_type==='instant' ? '⚡ Get Funded →' : `Buy for $${p.price_usd} →`}
                  </Button>
                </Card>
              ))}
            </div>
          )
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}