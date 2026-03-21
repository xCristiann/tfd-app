import { useEffect, useState } from 'react'
import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Card, CardHeader, KPICard, DrawdownBar } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { EquityCurve } from '@/components/charts/EquityCurve'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt, phaseLabel, accountTypeLabel, accountBadgeLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { analyticsApi } from '@/lib/api/analytics'
import { TRADER_NAV } from '@/lib/nav'
import type { TraderStats, DailySnapshot, Account } from '@/types/database'


/* ── Trade History Card ────────────────────────────────────────────── */
function TradeHistoryCard({ accountId }: { accountId: string }) {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    supabase.from('trades')
      .select('*')
      .eq('account_id', accountId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setTrades(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [accountId])

  const totalPnl = trades.reduce((s, t) => s + (t.net_pnl ?? 0), 0)

  return (
    <div className="bg-white border border-[#E8EEF8] rounded-xl p-[18px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-[#8FA3BF] uppercase tracking-wide">Trade History ({trades.length})</h3>
        <span className={`font-mono text-[12px] font-bold ${totalPnl >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          Total P&L: {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
        </span>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin"/></div>
      ) : trades.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-[#8FA3BF]">No closed trades yet</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[#E8EEF8]">
                {['Symbol','Dir','Lots','Open','Close','SL','TP','Open Time','Close Time','Duration','Pips','P&L'].map(h=>(
                  <th key={h} className="px-[9px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map(t => {
                const dur = (() => {
                  if (!t.closed_at || !t.opened_at) return '—'
                  const ms = new Date(t.closed_at).getTime() - new Date(t.opened_at).getTime()
                  const m = Math.floor(ms / 60000)
                  const h = Math.floor(m / 60)
                  const d = Math.floor(h / 24)
                  if (d > 0) return `${d}d ${h % 24}h`
                  if (h > 0) return `${h}h ${m % 60}m`
                  return `${m}m`
                })()
                return (
                  <tr key={t.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                    <td className="px-[9px] py-[7px] font-semibold">{t.symbol}</td>
                    <td className="px-[9px] py-[7px]">
                      <span className={`text-[9px] font-bold ${t.direction==='buy'?'text-[#16A34A]':'text-[#DC2626]'}`}>{t.direction?.toUpperCase()}</span>
                    </td>
                    <td className="px-[9px] py-[7px] font-mono">{t.lots}</td>
                    <td className="px-[9px] py-[7px] font-mono text-[#5C7A9E]">{(Number(t.open_price)||0).toFixed(5)}</td>
                    <td className="px-[9px] py-[7px] font-mono text-[#5C7A9E]">{(Number(t.close_price)||0).toFixed(5)}</td>
                    <td className="px-[9px] py-[7px] font-mono text-[#DC2626]">{t.sl ?? '—'}</td>
                    <td className="px-[9px] py-[7px] font-mono text-[#16A34A]">{t.tp ?? '—'}</td>
                    <td className="px-[9px] py-[7px] text-[#8FA3BF] text-[10px] whitespace-nowrap">{t.opened_at ? new Date(t.opened_at).toLocaleString() : '—'}</td>
                    <td className="px-[9px] py-[7px] text-[#8FA3BF] text-[10px] whitespace-nowrap">{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                    <td className="px-[9px] py-[7px] font-mono text-[#5C7A9E]">{dur}</td>
                    <td className="px-[9px] py-[7px] font-mono" style={{color:(t.pips??0)>=0?'#16A34A':'#DC2626'}}>{(t.pips??0)>=0?'+':''}{(Number(t.pips)||0).toFixed(1)}</td>
                    <td className="px-[9px] py-[7px] font-mono font-bold" style={{color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>
                      {(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { accounts, loading } = useAccount()
  const { profile } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stats, setStats] = useState<TraderStats | null>(null)
  const [curve, setCurve] = useState<DailySnapshot[]>([])
  const [openTrades, setOpenTrades] = useState<any[]>([])

  const account: Account | null = (selectedId ? accounts.find(a => a.id === selectedId) : null) ?? accounts[0] ?? null
  const prod = (account as any)?.challenge_products

  useEffect(() => {
    if (accounts.length > 0 && !selectedId) setSelectedId(accounts[0].id)
  }, [accounts.length])

  useEffect(() => {
    if (!account) return
    setStats(null); setCurve([]); setOpenTrades([])
    analyticsApi.getStats(account.id).then(setStats).catch(() => {})
    analyticsApi.getEquityCurve(account.id, 30).then(setCurve).catch(() => {})
    supabase.from('trades').select('*').eq('account_id', account.id).eq('status', 'open')
      .order('opened_at', { ascending: false })
      .then(({ data }) => setOpenTrades(data ?? []))
  }, [account?.id])

  useEffect(() => {
    if (!account || !prod) return
    if (account.phase === 'phase1' || account.phase === 'phase2') {
      checkRuleViolations(account, prod)
    }
  }, [account?.balance, account?.daily_dd_used, account?.max_dd_used])

  async function checkRuleViolations(acc: Account, product: any) {
    if (!product) return
    const dailyLimit = acc.phase === 'phase2' ? (product.ph2_daily_dd ?? product.ph1_daily_dd ?? 5) : (product.ph1_daily_dd ?? 5)
    const maxLimit   = acc.phase === 'phase2' ? (product.ph2_max_dd ?? product.ph1_max_dd ?? 10) : (product.ph1_max_dd ?? 10)
    const targetPct  = acc.phase === 'phase2' ? (product.ph2_profit_target ?? 5) : (product.ph1_profit_target ?? 8)
    const profitPct  = acc.starting_balance > 0 ? ((acc.balance - acc.starting_balance) / acc.starting_balance) * 100 : 0

    if ((acc.daily_dd_used ?? 0) >= dailyLimit || (acc.max_dd_used ?? 0) >= maxLimit) {
      if (acc.status !== 'breached') {
        await supabase.from('accounts').update({ status: 'breached', phase: 'breached' }).eq('id', acc.id)
        toast('error', '🚨', 'Account Breached', 'Your drawdown limit was exceeded. Account locked.')
        if (profile?.email) {
          sendEmail('account_breached', profile.email, {
            first_name: profile.first_name ?? 'Trader',
            account_number: acc.account_number,
            reason: `Daily DD: ${acc.daily_dd_used}% / Max DD: ${acc.max_dd_used}%`,
            balance: `$${(Number(acc.balance) || 0).toFixed(2)}`,
          }).catch(() => {})
        }
      }
      return
    }
    if (profitPct >= targetPct && acc.status === 'active') {
      await supabase.from('accounts').update({ status: 'passed' }).eq('id', acc.id)
      toast('success', '🎯', 'Target Reached!', 'Profit target hit! Account locked pending admin review.')
    }
  }

  const profit      = account ? ((Number(account.balance) || 0) - (Number(account.starting_balance) || 0)) : 0
  const profitPct   = account && (Number(account.starting_balance) || 0) > 0 ? ((profit / Number(account.starting_balance)) * 100).toFixed(2) : '0.00'
  const withdrawable = profit > 0 ? profit * ((prod?.funded_profit_split ?? 85) / 100) : 0
  const dailyLimit  = prod?.ph1_daily_dd ?? 5
  const maxLimit    = prod?.ph1_max_dd   ?? 10
  const targetPct   = account?.phase === 'phase2' ? (prod?.ph2_profit_target ?? 5) : (prod?.ph1_profit_target ?? 8)
  const isFunded    = account?.phase === 'funded'
  const isLocked    = account?.status === 'breached' || account?.status === 'passed' || account?.status === 'soft_locked' || (account?.status === 'suspended' && !account?.payout_locked)
  const isFrozen    = account?.status === 'soft_locked'

  /* ── MOBILE VERSION ── */
  if (isMobile) {
    return (
      <>
        <MobileLayout nav="trader">
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
              <div style={{ width:'32px', height:'32px', border:'2px solid #2255CC', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎯</div>
              <div style={{ fontSize:'18px', fontWeight:700, fontFamily:"'Playfair Display',serif", marginBottom:'8px' }}>No Active Account</div>
              <p style={{ fontSize:'13px', color:'#5C7A9E', marginBottom:'24px' }}>Purchase a challenge to start your funded trading journey.</p>
              <button onClick={() => navigate('/dashboard/challenges')}
                style={{ background:'#2255CC', color:'#fff', border:'none', padding:'12px 28px', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                Buy a Challenge →
              </button>
            </div>
          ) : (
            <div style={{ padding:'16px' }}>
              {/* Account selector */}
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px' }}>
                {accounts.map(a => (
                  <button key={a.id} onClick={() => setSelectedId(a.id)}
                    style={{ padding:'8px 14px', borderRadius:'20px', border:'none', cursor:'pointer', whiteSpace:'nowrap', background: a.id === account?.id ? '#2255CC' : '#fff', color: a.id === account?.id ? '#fff' : '#5C7A9E', fontSize:'12px', fontWeight:600, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
                    {a.account_number} · {accountTypeLabel(a.phase, (a as any).challenge_products?.challenge_type)}
                  </button>
                ))}
              </div>

              {/* Status banner */}
              {isFrozen && (
                <div style={{ background:'rgba(220,38,38,.08)', border:'1px solid rgba(220,38,38,.3)', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px' }}>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#DC2626', marginBottom:'4px' }}>🔒 Account Frozen — Under Investigation</div>
                  <div style={{ fontSize:'11px', color:'#DC2626', opacity:0.8 }}>Your account has been frozen by Risk Management pending an investigation. Trading is suspended. You will receive an email once the review is complete. Contact <a href="mailto:risk@thefundeddiaries.com" style={{color:'#DC2626'}}>risk@thefundeddiaries.com</a> for details.</div>
                </div>
              )}
              {isLocked && !isFrozen && (
                <div style={{ background: account?.status==='breached'?'rgba(220,38,38,.08)':'rgba(34,85,204,.08)', border:`1px solid ${account?.status==='breached'?'rgba(220,38,38,.3)':'rgba(34,85,204,.3)'}`, borderRadius:'12px', padding:'12px 16px', marginBottom:'16px' }}>
                  <div style={{ fontWeight:600, fontSize:'13px', color: account?.status==='breached'?'#DC2626':'#2255CC', marginBottom:'4px' }}>
                    {account?.status==='breached' ? '🚨 Account Breached' : '🎯 Target Reached'}
                  </div>
                  <div style={{ fontSize:'12px', color:'#5C7A9E' }}>
                    {account?.status==='breached' ? 'Drawdown limit exceeded. Account locked.' : 'Pending admin review to advance phase.'}
                  </div>
                </div>
              )}

              {/* KPI cards — 2 cols */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
                {[
                  { label:'Balance',      value: fmt(account!.balance),      color:'#1A3A6B' },
                  { label:'Profit',       value: `${profit>=0?'+':''}${fmt(profit)}`, color: profit>=0?'#16A34A':'#DC2626' },
                  { label:'Withdrawable', value: fmt(withdrawable),           color:'#2255CC' },
                  { label:'Win Rate',     value: stats ? `${stats.win_rate_pct ?? 0}%` : '—', color:'#16A34A' },
                ].map(kpi => (
                  <div key={kpi.label} style={{ background:'#fff', borderRadius:'12px', padding:'14px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                    <div style={{ fontSize:'10px', color:'#8FA3BF', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>{kpi.label}</div>
                    <div style={{ fontSize:'18px', fontWeight:700, color:kpi.color, fontFamily:"'JetBrains Mono',monospace" }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Drawdown bars */}
              <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', marginBottom:'16px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#1A3A6B', marginBottom:'14px' }}>Risk Dashboard</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <DrawdownBar label="Daily Drawdown" used={account!.daily_dd_used ?? 0} max={dailyLimit}/>
                  <DrawdownBar label="Max Drawdown"   used={account!.max_dd_used ?? 0}   max={maxLimit}/>
                  {!isFunded && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'11px', color:'#8FA3BF', fontWeight:600 }}>Profit Progress</span>
                        <span style={{ fontSize:'11px', color: parseFloat(profitPct)>=targetPct?'#16A34A':'#2255CC', fontFamily:"'JetBrains Mono',monospace", fontWeight:500 }}>{profitPct}% / {targetPct}%</span>
                      </div>
                      <div style={{ height:'5px', background:'#EEF3FF', borderRadius:'3px', overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'#16A34A', borderRadius:'3px', width:`${Math.min((parseFloat(profitPct)/targetPct)*100,100)}%`, transition:'width .5s' }}/>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Equity curve */}
              <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', marginBottom:'16px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#1A3A6B', marginBottom:'12px' }}>Equity Curve · 30 days</div>
                <EquityCurve data={curve.map(s => s.balance)}/>
                {curve.length===0 && <div style={{ textAlign:'center', fontSize:'12px', color:'#8FA3BF', padding:'8px 0' }}>No trading history yet</div>}
              </div>

              {/* Quick actions */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
                <button onClick={()=>navigate('/platform')}
                  style={{ background:'#2255CC', color:'#fff', border:'none', padding:'14px', borderRadius:'12px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  ⚡ Open Platform
                </button>
                <button onClick={()=>navigate('/dashboard/payouts')}
                  style={{ background:'#F0FDF4', color:'#16A34A', border:'1px solid rgba(22,163,74,.2)', padding:'14px', borderRadius:'12px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  💰 Request Payout
                </button>
              </div>

              {/* Open trades */}
              {openTrades.length > 0 && (
                <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#1A3A6B', marginBottom:'12px' }}>Open Positions ({openTrades.length})</div>
                  {openTrades.map(t => (
                    <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #F4F7FD' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:600 }}>{t.symbol}</div>
                        <div style={{ fontSize:'11px', color: t.direction==='buy'?'#16A34A':'#DC2626', fontWeight:600 }}>{t.direction.toUpperCase()} · {t.lots} lots</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'12px', fontFamily:"'JetBrains Mono',monospace", color:'#5C7A9E' }}>{(Number(t.open_price)||0).toFixed(5)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </MobileLayout>
        <ToastContainer toasts={toasts} dismiss={dismiss}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </>
    )
  }

  /* ── DESKTOP VERSION (original) ── */
  return (
    <>
      <DashboardLayout
        title={`Welcome back, ${profile?.first_name ?? ''}!`}
        nav={TRADER_NAV} accentColor="gold"
        accountBox={account ? { id: account.account_number, label: `${accountTypeLabel(account.phase, prod?.challenge_type)} · ${prod?.funded_profit_split ?? 85}% Split` } : undefined}
        topbarRight={
          <>
            <span className="w-[5px] h-[5px] rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[9px] text-[#16A34A] tracking-[1.5px] uppercase font-semibold">Live</span>
            <Button variant="gold" size="sm" onClick={() => navigate('/platform')}>⚡ Open Platform</Button>
          </>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2255CC] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <div className="py-16 text-center">
              <div className="text-[32px] mb-3">🎯</div>
              <div className="font-serif text-[18px] font-bold mb-2">No Active Account</div>
              <p className="text-[12px] text-[#5C7A9E] mb-6">Purchase a challenge to start your funded trading journey.</p>
              <Button onClick={() => navigate('/dashboard/challenges')}>Buy a Challenge →</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-white border border-[#E8EEF8] mb-1">
              <span className="text-[8px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold whitespace-nowrap">Select Account</span>
              <div className="flex gap-2 flex-wrap">
                {accounts.map(a => {
                  const isActive = a.id === account?.id
                  return (
                    <button key={a.id} onClick={() => setSelectedId(a.id)}
                      className={`px-3 py-[5px] text-[10px] font-mono font-semibold cursor-pointer border transition-all ${isActive ? 'bg-[rgba(34,85,204,.1)] border-[#C5D5FA] text-[#2255CC]' : 'bg-[#F4F7FD] border-[#E8EEF8] text-[#8FA3BF] hover:text-[#5C7A9E]'}`}>
                      {a.account_number}
                      <span className={`ml-2 text-[8px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>{accountBadgeLabel(a.phase, (a as any).challenge_products?.challenge_type)}</span>
                    {a.status==='soft_locked'&&<span className="ml-1 text-[7px] text-[#DC2626] font-bold bg-[rgba(220,38,38,.15)] px-1 py-0.5 rounded">🔒 FROZEN</span>}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => navigate('/dashboard/challenges')}
                className="ml-auto text-[8px] tracking-[1px] uppercase text-[#8FA3BF] hover:text-[#2255CC] cursor-pointer bg-transparent border-none transition-colors whitespace-nowrap">
                + New Challenge
              </button>
            </div>

            {account?.payout_locked && account?.status === 'suspended' && (
              <div className="flex items-center gap-3 px-5 py-3 border border-[rgba(34,85,204,.3)] bg-[rgba(34,85,204,.05)] text-[#2255CC]">
                <span className="text-[16px]">⏳</span>
                <div>
                  <div className="font-semibold text-[12px]">Payout Pending — Account Locked</div>
                  <div className="text-[10px] opacity-80">Your payout request is under review.</div>
                </div>
              </div>
            )}

            {isLocked && (
              <div className={`flex items-center gap-3 px-5 py-3 border ${account?.status==='breached' ? 'border-[rgba(220,38,38,.3)] bg-[rgba(220,38,38,.06)] text-[#DC2626]' : 'border-[rgba(34,85,204,.3)] bg-[rgba(34,85,204,.06)] text-[#2255CC]'}`}>
                <span className="text-[16px]">{account?.status==='breached' ? '🚨' : '🎯'}</span>
                <div>
                  <div className="font-semibold text-[12px]">{account?.status==='breached' ? 'Account Breached — Trading Locked' : 'Profit Target Reached — Pending Admin Review'}</div>
                  <div className="text-[10px] opacity-80">{account?.status==='breached' ? 'Your drawdown limit was exceeded.' : 'Admin will review and advance you to the next phase.'}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-[11px]">
              <KPICard label="Balance"       value={fmt(account!.balance)}  sub={`${profit>=0?'+':''}${fmt(profit)}`}      subColor={profit>=0?'text-[#16A34A]':'text-[#DC2626]'} />
              <KPICard label="Equity"        value={fmt(account!.equity)}   sub="Current equity"                           subColor="text-[#5C7A9E]" />
              <KPICard label="Withdrawable"  value={fmt(withdrawable)}      sub={`${prod?.funded_profit_split??85}% split`} subColor="text-[#2255CC]" />
              <KPICard label="Win Rate"      value={stats ? `${stats.win_rate_pct??0}%` : '—'} sub={stats?`${stats.winning_trades}/${stats.total_trades} trades`:'No trades yet'} subColor="text-[#16A34A]" />
              <KPICard label="Profit Factor" value={stats?.profit_factor ? String(stats.profit_factor) : '—'} sub="Target: 1.5+" subColor="text-[#16A34A]" />
            </div>

            <div className="grid grid-cols-2 gap-[14px]">
              <Card>
                <CardHeader title="Equity Curve" action={<span className="text-[9px] text-[#8FA3BF]">30 days</span>} />
                <EquityCurve data={curve.map(s => s.balance)} />
                {curve.length===0 && <div className="text-center text-[11px] text-[#8FA3BF] py-4">No trading history yet</div>}
              </Card>
              <Card>
                <CardHeader title="Risk Dashboard" />
                <DrawdownBar label="Daily Drawdown" used={account!.daily_dd_used ?? 0} max={dailyLimit} />
                <DrawdownBar label="Max Drawdown"   used={account!.max_dd_used ?? 0}   max={maxLimit} />
                {!isFunded && (
                  <div className="mb-[11px]">
                    <div className="flex justify-between mb-[4px]">
                      <span className="text-[9px] tracking-[1.5px] uppercase text-[#8FA3BF] font-semibold">Profit Progress</span>
                      <span className={`font-mono text-[11px] ${parseFloat(profitPct)>=targetPct?'text-[#16A34A]':'text-[#2255CC]'}`}>{profitPct}% / {targetPct}% target</span>
                    </div>
                    <div className="h-[4px] bg-[#EEF3FF] rounded-[2px] overflow-hidden">
                      <div className="h-full rounded-[2px] bg-[#16A34A] transition-all" style={{width:`${Math.min((parseFloat(profitPct)/targetPct)*100,100)}%`}}/>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[['Best Trade',stats?.best_trade!=null?fmt(stats.best_trade):'—','#16A34A'],['Worst Trade',stats?.worst_trade!=null?fmt(stats.worst_trade):'—','#DC2626'],['Total Trades',String(stats?.total_trades??0),'#1A3A6B'],['Total P&L',stats?.total_pnl!=null?fmt(stats.total_pnl):'—',(stats?.total_pnl??0)>=0?'#16A34A':'#DC2626']].map(([l,v,c])=>(
                    <div key={l} className="bg-[#F4F7FD] border border-[#E8EEF8] p-[9px]">
                      <div className="text-[7px] tracking-[1.5px] uppercase text-[#8FA3BF] font-semibold mb-1">{l}</div>
                      <div className="font-mono text-[11px]" style={{color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <CardHeader title={`Open Positions (${openTrades.length})`} action={<Button variant="ghost" size="sm" onClick={()=>navigate('/platform')}>Open Platform →</Button>}/>
              {openTrades.length===0 ? (
                <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No open positions</div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-[#E8EEF8]">
                      {['Symbol','Dir','Lots','Open Price','SL','TP','Open Time','P&L'].map(h=>(
                        <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(r=>(
                      <tr key={r.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                        <td className="px-[11px] py-[8px] font-semibold">{r.symbol}</td>
                        <td className="px-[11px] py-[8px]"><span className={`text-[9px] font-bold ${r.direction==='buy'?'text-[#16A34A]':'text-[#DC2626]'}`}>{r.direction?.toUpperCase()}</span></td>
                        <td className="px-[11px] py-[8px] font-mono">{r.lots}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[#5C7A9E]">{(Number(r.open_price)||0).toFixed(5)}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[#DC2626]">{r.sl??'—'}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[#16A34A]">{r.tp??'—'}</td>
                        <td className="px-[11px] py-[8px] font-mono text-[#8FA3BF] text-[10px]">{new Date(r.opened_at).toLocaleString()}</td>
                        <td className="px-[11px] py-[8px] font-mono font-bold text-[#8FA3BF] text-[10px]">Open</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Trade History */}
            <TradeHistoryCard accountId={account!.id}/>

            <div className="flex items-center gap-2">
              <Badge variant={phaseVariant(account!.phase)}>{phaseLabel(account!.phase)}</Badge>
              <span className="text-[10px] text-[#8FA3BF]">{account!.account_number}</span>
            </div>
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}