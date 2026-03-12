import { useAccount } from '@/hooks/useAccount'
import { useToast } from '@/hooks/useToast'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard, DrawdownBar } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { EquityCurve } from '@/components/charts/EquityCurve'
import { ToastContainer } from '@/components/ui/Toast'
import { fmt, pct, phaseLabel } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { NavItem } from '@/types/database'

const NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Trading', items: [
    { label: 'Overview',         icon: '◈', path: '/dashboard' },
    { label: 'Trading Platform', icon: '📈', path: '/platform' },
    { label: 'Trade Journal',    icon: '📓', path: '/dashboard/journal' },
    { label: 'Trade History',    icon: '🕐', path: '/dashboard/history' },
  ]},
  { section: 'Account', items: [
    { label: 'Payouts',    icon: '💰', path: '/dashboard/payouts',    badge: 'Ready', badgeType: 'gold' },
    { label: 'Analytics',  icon: '📊', path: '/dashboard/analytics' },
    { label: 'Challenges', icon: '🎯', path: '/dashboard/challenges' },
    { label: 'Accounts',   icon: '🗂', path: '/dashboard/accounts' },
  ]},
  { section: 'Help', items: [
    { label: 'Support',  icon: '💬', path: '/dashboard/support',  badge: 2, badgeType: 'red' },
    { label: 'Settings', icon: '⚙',  path: '/dashboard/settings' },
  ]},
]

export function DashboardPage() {
  const { primary, loading } = useAccount()
  const { toasts, toast, dismiss } = useToast()
  const navigate = useNavigate()

  const prod = primary?.challenge_products

  return (
    <>
      <DashboardLayout
        title="Overview"
        nav={NAV}
        accentColor="gold"
        accountBox={primary ? { id: primary.account_number, label: `${phaseLabel(primary.phase)} · ${prod?.funded_profit_split ?? 85}% Split` } : undefined}
        topbarRight={
          <>
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green)] animate-[livePulse_1.5s_infinite]" />
            <span className="text-[9px] text-[var(--green)] tracking-[1.5px] uppercase font-semibold">Live</span>
            <Button variant="gold" size="sm" onClick={() => navigate('/platform')}>⚡ Open Platform</Button>
          </>
        }
      >
        {loading ? (
          <div className="text-[var(--text3)] text-center py-12">Loading account…</div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-5 gap-[11px]">
              <KPICard label="Balance"      value={fmt(primary?.balance ?? 108420)} sub="+$8,420 profit"      subColor="text-[var(--green)]" />
              <KPICard label="Equity"       value={fmt(primary?.equity  ?? 108797)} sub="Float +$377"         subColor="text-[var(--green)]" />
              <KPICard label="Withdrawable" value={fmt(7157)}                       sub="85% split"            subColor="text-[var(--gold)]"  />
              <KPICard label="Win Rate"     value="67%"                             sub="34/51 trades"         subColor="text-[var(--green)]" />
              <KPICard label="Profit Factor" value="2.41"                           sub="Target: 1.5"          subColor="text-[var(--green)]" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-[14px]">
              <Card>
                <CardHeader title="Equity Curve" action={<span className="text-[9px] text-[var(--text3)]">30 days</span>} />
                <EquityCurve data={[]} />
              </Card>
              <Card>
                <CardHeader title="Risk Dashboard" />
                <DrawdownBar label="Daily Drawdown" value={primary?.daily_dd_used ?? 0.84} max={prod?.funded_daily_dd ?? 5} />
                <DrawdownBar label="Max Drawdown"   value={primary?.max_dd_used   ?? 3.21} max={prod?.funded_max_dd   ?? 10} warn={60} danger={80} />
                <div className="mb-[11px]">
                  <div className="flex justify-between mb-[4px]">
                    <span className="text-[9px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold">Profit Target</span>
                    <span className="mono text-[11px] text-[var(--green)]">8.42% ✓ Reached</span>
                  </div>
                  <div className="h-[4px] bg-white/5 rounded-[2px] overflow-hidden">
                    <div className="h-full rounded-[2px] bg-[var(--green)]" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[['Best Trade','+$1,116','var(--green)'],['Worst Trade','-$230','var(--red)'],['Avg R:R','1:2.41','var(--gold)'],['Avg Hold','4h 22m','var(--text2)']].map(([l,v,c])=>(
                    <div key={l} className="bg-[var(--bg3)] border border-[var(--dim)] p-[9px]">
                      <div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div>
                      <div className="mono text-[11px]" style={{ color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Open Positions */}
            <Card>
              <CardHeader title="Open Positions" action={<Button variant="ghost" size="sm" onClick={() => navigate('/platform')}>Open Platform →</Button>} />
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--dim)]">
                    {['Symbol','Dir','Lots','Open','Current','SL','TP','Pips','Float P&L','Time'].map(h=>(
                      <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold text-left bg-[rgba(212,168,67,.03)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {sym:'EUR/USD',dir:'BUY',lots:'0.50',open:'1.08420',cur:'1.08742',sl:'1.08100',tp:'1.09200',pips:'+32.2',pnl:'+$161',t:'09:42',pos:true},
                    {sym:'XAU/USD',dir:'SELL',lots:'0.20',open:'2348.40',cur:'2341.80',sl:'2360.00',tp:'2320.00',pips:'+66.0',pnl:'+$264',t:'13:08',pos:true},
                    {sym:'NAS100',dir:'BUY',lots:'0.10',open:'17890',cur:'17842',sl:'17700',tp:'18200',pips:'-48',pnl:'-$48',t:'14:10',pos:false},
                  ].map(r=>(
                    <tr key={r.sym} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.03)]">
                      <td className="px-[11px] py-[8px] font-semibold">{r.sym}</td>
                      <td className="px-[11px] py-[8px]"><span className={`text-[9px] font-bold tracking-[1px] ${r.dir==='BUY'?'text-[var(--green)]':'text-[var(--red)]'}`}>{r.dir}</span></td>
                      <td className="px-[11px] py-[8px] mono">{r.lots}</td>
                      <td className="px-[11px] py-[8px] mono">{r.open}</td>
                      <td className={`px-[11px] py-[8px] mono ${r.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{r.cur}</td>
                      <td className="px-[11px] py-[8px] mono text-[var(--red)]">{r.sl}</td>
                      <td className="px-[11px] py-[8px] mono text-[var(--green)]">{r.tp}</td>
                      <td className={`px-[11px] py-[8px] mono ${r.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{r.pips}</td>
                      <td className={`px-[11px] py-[8px] mono ${r.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{r.pnl}</td>
                      <td className="px-[11px] py-[8px] mono text-[var(--text3)] text-[10px]">{r.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Account Phase badge */}
            {primary && (
              <div className="flex items-center gap-2">
                <Badge variant={phaseVariant(primary.phase)}>{phaseLabel(primary.phase)}</Badge>
                <span className="text-[10px] text-[var(--text3)]">{primary.account_number}</span>
              </div>
            )}
          </>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
