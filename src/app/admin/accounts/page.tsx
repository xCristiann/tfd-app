import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, DrawdownBar } from '@/components/ui/Card'
import { Badge, phaseVariant } from '@/components/ui/Badge'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { phaseLabel, fmt } from '@/lib/utils'
import { ADMIN_NAV } from '@/lib/nav'
import { sendEmail } from '@/lib/email'

const mono = { fontFamily:"'JetBrains Mono',monospace" } as const

// IP → country cache (session-level)
const ipCountryCache: Record<string, string> = {}
async function getCountry(ip: string): Promise<string> {
  if (!ip || ip === '—') return ''
  if (ipCountryCache[ip] !== undefined) return ipCountryCache[ip]
  try {
    // Try multiple free geo APIs (no key needed, CORS-safe)
    const r = await fetch(`https://freeipapi.com/api/json/${ip}`, { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    const result = d.countryCode && d.countryCode !== '-' ? d.countryCode : ''
    ipCountryCache[ip] = result
    return result
  } catch {
    try {
      // Fallback: ipwho.is
      const r2 = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(4000) })
      const d2 = await r2.json()
      const result2 = d2.country_code || ''
      ipCountryCache[ip] = result2
      return result2
    } catch { ipCountryCache[ip] = ''; return '' }
  }
}

// Flag emoji from 2-letter country code
function countryFlag(code: string): string {
  if (!code || code.length < 2) return ''
  const cc = code.slice(0,2).toUpperCase()
  try { return cc.replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0))) }
  catch { return '' }
}
function timeDiff(a: string, b: string) { return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000 }
function timeAgo(dt: string) {
  const s = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

function duration(open: string, close: string | null): string {
  if (!close) return '—'
  const ms = new Date(close).getTime() - new Date(open).getTime()
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24)
  if (d > 0) return `${d}d ${h%24}h`
  if (h > 0) return `${h}h ${m%60}m`
  return `${m}m ${s%60}s`
}

export function AdminAccountsPage() {
  const { toasts, toast, dismiss } = useToast()
  const [accounts, setAccounts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')

  const [selected, setSelected]   = useState<any>(null)
  const [panelTab, setPanelTab]   = useState<'trades'|'risk'|'breach'|'notify'>('trades')
  const [trades, setTrades]       = useState<any[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [ipCountries, setIpCountries] = useState<Record<string,string>>({})
  const [riskLoading, setRiskLoading] = useState(false)

  // Risk tab state (mirrors Risk Monitor tool data per account)
  const [riskTab, setRiskTab]     = useState('summary')
  const [sameAccHedge, setSameAccHedge] = useState<any[]>([])
  const [mirrorGroups, setMirrorGroups] = useState<any[]>([])
  const [tradeIps, setTradeIps]   = useState<any[]>([])
  const [newsViolations, setNewsViolations] = useState<any[]>([])
  const [velocityCount, setVelocityCount] = useState(0)
  const [winRateData, setWinRateData] = useState<any>(null)
  const [consistentProfit, setConsistentProfit] = useState<any>(null)
  const [flags, setFlags]         = useState<any[]>([])
  const [flagNotes, setFlagNotes] = useState<Record<string,string>>({})

  const [notifyMsg, setNotifyMsg] = useState('')
  const [notifying, setNotifying] = useState(false)

  useEffect(() => {
    supabase.from('accounts')
      .select('*, users(id, first_name, last_name, email), challenge_products(name, account_size, ph1_daily_dd, ph1_max_dd, ph2_daily_dd, ph2_max_dd, funded_daily_dd, funded_max_dd)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAccounts(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const openAccount = useCallback(async (acc: any) => {
    setSelected(acc); setPanelTab('trades'); setTrades([]); setTradesLoading(true)
    setSameAccHedge([]); setMirrorGroups([]); setTradeIps([]); setNewsViolations([])
    setVelocityCount(0); setWinRateData(null); setConsistentProfit(null); setFlags([])
    const { data } = await supabase.from('trades').select('*').eq('account_id', acc.id).order('opened_at', { ascending: false })
    const tradeData = data ?? []
    setTrades(tradeData)
    setTradesLoading(false)
    // Fetch countries for unique IPs in background
    const uniqueIps = [...new Set(tradeData.map((t:any) => t.ip_address).filter(Boolean))] as string[]
    const countries: Record<string,string> = {}
    // Load in batches of 5 to avoid rate limits
    for (let i = 0; i < uniqueIps.length; i += 5) {
      const batch = uniqueIps.slice(i, i + 5)
      await Promise.allSettled(batch.map(async (ip) => {
        countries[ip] = await getCountry(ip)
      }))
      setIpCountries(prev => ({...prev, ...countries}))
    }
  }, [])

  // Load full risk data for selected account
  const loadRiskData = useCallback(async (acc: any, allTrades: any[]) => {
    if (!acc) return
    setRiskLoading(true)
    try {
      const open   = allTrades.filter(t => t.status === 'open')
      const closed = allTrades.filter(t => t.status === 'closed')

      // 1. Same-account hedging
      const bySymbol: Record<string,any[]> = {}
      open.forEach(t => { if (!bySymbol[t.symbol]) bySymbol[t.symbol]=[]; bySymbol[t.symbol].push(t) })
      const sah: any[] = []
      for (const [sym, ts] of Object.entries(bySymbol)) {
        const buys = ts.filter(t => t.direction==='buy'), sells = ts.filter(t => t.direction==='sell')
        if (buys.length && sells.length) sah.push({ symbol:sym, buys, sells,
          total_buy_lots: buys.reduce((s,t)=>s+Number(t.lots),0),
          total_sell_lots: sells.reduce((s,t)=>s+Number(t.lots),0) })
      }
      setSameAccHedge(sah)

      // 2. Mirror trading (same symbol+direction+lots within 60s from OTHER accounts)
      const { data: recentClosed } = await supabase.from('trades')
        .select('id,account_id,symbol,direction,lots,opened_at,net_pnl,accounts(account_number,user_id,users(first_name,last_name,email))')
        .eq('status','closed').gte('opened_at', new Date(Date.now()-48*3600000).toISOString())
        .order('opened_at',{ascending:true}).limit(3000)
      const closedArr = recentClosed ?? []
      const mirrorMap: Record<string,any> = {}
      // Find this account's trades in the mirror pool
      const accTrades = closedArr.filter(t => t.account_id === acc.id)
      for (const myTrade of accTrades) {
        for (const other of closedArr) {
          if (other.account_id === acc.id) continue
          if (myTrade.symbol !== other.symbol || myTrade.direction !== other.direction) continue
          const lotDiff = Math.abs(myTrade.lots - other.lots) / Math.max(myTrade.lots, other.lots, 0.01)
          if (lotDiff > 0.1) continue
          const diff = timeDiff(myTrade.opened_at, other.opened_at)
          if (diff > 60) continue
          const bucket = Math.floor(new Date(myTrade.opened_at).getTime() / 60000)
          const key = `${myTrade.symbol}_${myTrade.direction}_${bucket}`
          if (!mirrorMap[key]) mirrorMap[key] = { symbol:myTrade.symbol, direction:myTrade.direction, bucket_time:myTrade.opened_at, trades:[] }
          for (const t of [myTrade, other]) {
            const a = t.accounts as any
            if (!a) continue
            if (!mirrorMap[key].trades.find((x:any)=>x.account===a.account_number))
              mirrorMap[key].trades.push({ account:a.account_number, name:`${a.users?.first_name} ${a.users?.last_name}`, email:a.users?.email, lots:t.lots, opened_at:t.opened_at, pnl:t.net_pnl })
          }
        }
      }
      // Only show mirror groups that include THIS account
      setMirrorGroups(Object.values(mirrorMap).filter((g:any)=>
        g.trades.length>=2 && g.trades.some((t:any)=>t.account===acc.account_number)
      ))

      // 3. Trade IPs — other accounts with same trade IP
      const myIps = [...new Set(allTrades.map(t=>t.ip_address).filter(Boolean))]
      if (myIps.length > 0) {
        const { data: ipTrades } = await supabase.from('trades')
          .select('ip_address,account_id,accounts(account_number,user_id,users(first_name,last_name,email))')
          .in('ip_address', myIps).neq('account_id', acc.id).eq('status','open')
        const ipMap: Record<string,any[]> = {}
        for (const t of ipTrades??[]) {
          if (!t.ip_address || !t.accounts) continue
          const a = t.accounts as any
          if (!ipMap[t.ip_address]) ipMap[t.ip_address] = []
          if (!ipMap[t.ip_address].find((x:any)=>x.account===a.account_number))
            ipMap[t.ip_address].push({ account:a.account_number, name:`${a.users?.first_name} ${a.users?.last_name}`, email:a.users?.email, user_id:a.user_id })
        }
        setTradeIps(Object.entries(ipMap).map(([ip,accs])=>({ip,accounts:accs})).filter(x=>x.accounts.length>0))
      }

      // 4. News window trading
      const newsHours = [8,9,10,13,14,15,16,21]
      const newsVio = closed.filter(t => {
        const h = new Date(t.opened_at).getUTCHours(), m = new Date(t.opened_at).getUTCMinutes()
        return newsHours.includes(h) && m <= 2
      })
      setNewsViolations(newsVio)

      // 5. Velocity — trades in last hour
      const hourAgo = Date.now() - 3600000
      setVelocityCount(allTrades.filter(t => new Date(t.opened_at).getTime() > hourAgo).length)

      // 6. Win rate
      if (closed.length >= 5) {
        const wins = closed.filter(t => (t.net_pnl??0) > 0)
        const wr = Math.round(wins.length / closed.length * 100)
        const totalPnl = closed.reduce((s,t)=>s+(t.net_pnl??0),0)
        setWinRateData({ win_rate:wr, total:closed.length, wins:wins.length, pnl:totalPnl })
      }

      // 7. Consistent profit / bot pattern (from daily_snapshots)
      const { data: snaps } = await supabase.from('daily_snapshots')
        .select('daily_pnl,snapshot_date').eq('account_id', acc.id)
        .gte('snapshot_date', new Date(Date.now()-14*86400000).toISOString().split('T')[0])
        .order('snapshot_date',{ascending:false})
      if (snaps && snaps.length >= 5) {
        const pnls = snaps.map(s=>Math.abs(s.daily_pnl??0)).filter(p=>p>0)
        if (pnls.length >= 5) {
          const avg = pnls.reduce((a,b)=>a+b,0)/pnls.length
          const variance = pnls.reduce((a,b)=>a+Math.pow(b-avg,2),0)/pnls.length
          const cv = avg > 0 ? Math.sqrt(variance)/avg : 0
          if (cv < 0.1) setConsistentProfit({ avg_daily:avg.toFixed(2), cv:(cv*100).toFixed(1), days:pnls.length })
        }
      }

      // 8. Existing flags — filter by THIS account only
      const { data: fl } = await supabase.from('risk_flags').select('*')
        .eq('user_id', acc.users?.id)
        .eq('account_number', acc.account_number)
        .order('flagged_at',{ascending:false})
      setFlags(fl??[])

    } catch(e) { console.error('[Risk tab]', e) }
    setRiskLoading(false)
  }, [])

  // Load risk data when tab switches to risk
  useEffect(() => {
    if (panelTab === 'risk' && selected && trades.length >= 0 && !riskLoading) {
      loadRiskData(selected, trades)
    }
  }, [panelTab, selected?.id, trades.length])

  // Risk actions
  async function flagAcc(userId: string, account: string, reason: string) {
    const {error} = await supabase.from('risk_flags').insert({user_id:userId,account_number:account,reason,notes:'',flagged_at:new Date().toISOString(),status:'open',flagged_by:'admin'})
    if (error) { toast('error','❌','Error',error.message); return }
    await supabase.from('accounts').update({status:'soft_locked'}).eq('user_id',userId).eq('status','active')
    await supabase.from('notifications').insert({user_id:userId,type:'risk_warning',title:'🔒 Account Frozen — Under Investigation',body:`Your account ${account} has been frozen pending a risk investigation.`,is_read:false})
    try {
      const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
      if (u?.email) await sendEmail('account_frozen', u.email, {first_name:u.first_name??'Trader',account_number:account,reason,flag_id:'—'}, 'risk')
    } catch {}
    toast('warning','🔒','Flagged + Frozen',`${account} frozen.`)
    if (selected) loadRiskData(selected, trades)
  }

  async function warnTrader(userId: string, email: string, account: string, reason: string) {
    await supabase.from('notifications').insert({user_id:userId,type:'risk_warning',title:'⚠️ Risk Management Alert',body:`Account ${account}: ${reason}`,is_read:false})
    try {
      const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
      if (u?.email) await sendEmail('risk_warning', u.email, {first_name:u.first_name??'Trader',account_number:account,reason}, 'risk')
      toast('warning','📨','Warning Sent',`Email sent to ${u?.email}`)
    } catch { toast('error','❌','Email Failed','Could not send email') }
  }

  async function resolveFlag(flagId: string, userId: string, account: string, notes: string) {
    await supabase.from('risk_flags').update({status:'resolved',resolved_at:new Date().toISOString(),notes}).eq('id',flagId)
    // Check remaining open flags for THIS account only
    const {data:open} = await supabase.from('risk_flags').select('id')
      .eq('user_id',userId).eq('account_number',account).eq('status','open').neq('id',flagId)
    if (!open?.length) {
      await supabase.from('accounts').update({status:'active'}).eq('user_id',userId).eq('status','soft_locked')
      await supabase.from('notifications').insert({user_id:userId,type:'info',title:'✅ Account Unfrozen',body:`Your account ${account} has been cleared. Trading restored.`,is_read:false})
      try {
        const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
        if (u?.email) await sendEmail('investigation_resolved', u.email, {first_name:u.first_name??'Trader',account_number:account,notes:notes||'No violations found.'}, 'risk')
      } catch {}
      toast('success','✅','Resolved + Unfrozen','Account restored.')
    } else {
      toast('success','✓','Flag Resolved','Account remains frozen (other flags open).')
    }
    if (selected) loadRiskData(selected, trades)
  }

  async function breachAccount() {
    if (!selected) return
    if (!confirm(`Breach account ${selected.account_number}? This cannot be undone.`)) return
    await supabase.from('accounts').update({ status:'breached', phase:'breached' }).eq('id', selected.id)
    setAccounts(prev => prev.map(a => a.id === selected.id ? {...a, status:'breached', phase:'breached'} : a))
    setSelected((s:any) => ({...s, status:'breached', phase:'breached'}))
    try {
      if (selected.users?.email) await sendEmail('account_breached', selected.users.email, {
        first_name: selected.users.first_name ?? 'Trader', account_number: selected.account_number,
        reason: 'Account breached by risk management.', balance: `$${Number(selected.balance).toLocaleString()}` })
    } catch {}
    await supabase.from('notifications').insert({user_id:selected.users?.id, type:'breach', title:'Account Breached', body:`Your account ${selected.account_number} has been breached by risk management.`, is_read:false})
    toast('warning','⛔','Breached',`${selected.account_number} marked as breached.`)
  }

  async function sendNotification() {
    if (!selected || !notifyMsg.trim()) return
    setNotifying(true)
    await supabase.from('notifications').insert({user_id:selected.users?.id, type:'admin_message', title:'Message from Risk Management', body:notifyMsg.trim(), is_read:false})
    if (selected.users?.email) await sendEmail('custom', selected.users.email, {first_name:selected.users.first_name??'Trader', subject:'Message from The Funded Diaries', body:notifyMsg.trim()}).catch(()=>{})
    setNotifyMsg(''); setNotifying(false)
    toast('success','📨','Sent','Notification delivered.')
  }

  const phases = ['All','phase1','phase2','funded','breached','passed']
  const filtered = accounts.filter(a => {
    const trader = a.users ? `${a.users.first_name} ${a.users.last_name}` : ''
    const matchSearch = !search || a.account_number?.toLowerCase().includes(search.toLowerCase()) || trader.toLowerCase().includes(search.toLowerCase()) || a.users?.email?.toLowerCase().includes(search.toLowerCase())
    const matchPhase = phaseFilter==='All' || a.phase===phaseFilter
    return matchSearch && matchPhase
  })

  const riskLevel = (a:any) => {
    if ((a.daily_dd_used??0)>=4||(a.max_dd_used??0)>=8) return 'critical'
    if ((a.daily_dd_used??0)>=2.5||(a.max_dd_used??0)>=5) return 'warning'
    return 'low'
  }
  const riskColor: Record<string,string> = { low:'text-[#16A34A]', warning:'text-[#D97706]', critical:'text-[#DC2626]' }

  // Summary counts for risk tab badge
  const riskAlertCount = sameAccHedge.length + mirrorGroups.length + tradeIps.length + newsViolations.length +
    (velocityCount >= 15 ? 1 : 0) + (winRateData?.win_rate >= 90 ? 1 : 0) + (consistentProfit ? 1 : 0) +
    flags.filter(f=>f.status==='open').length

  const TABS = [
    { id:'trades' as const,  label:'📋 Trades' },
    { id:'risk'   as const,  label:`⚠️ Risk${riskAlertCount > 0 ? ` (${riskAlertCount})` : ''}` },
    { id:'breach' as const,  label:'⛔ Breach' },
    { id:'notify' as const,  label:'📨 Notify' },
  ]

  const prod = selected?.challenge_products
  const dailyLimit = prod?.ph1_daily_dd ?? 5
  const maxLimit   = prod?.ph1_max_dd ?? 10

  return (
    <>
      <DashboardLayout title="All Accounts" nav={ADMIN_NAV} accentColor="red">
        <div className="grid grid-cols-1 gap-[14px]">
          <Card>
            <CardHeader title={`All Accounts (${filtered.length})`}/>
            <div className="flex gap-3 mb-3 flex-wrap">
              <div className="flex bg-[#F4F7FD] border border-[#F0F4FB] focus-within:border-[#C5D5EA] flex-1 max-w-[300px] transition-colors">
                <span className="px-3 flex items-center text-[#8FA3BF] text-[11px]">🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, trader or email…"
                  className="flex-1 py-[8px] bg-transparent outline-none text-[#1A3A6B] text-[12px]"/>
              </div>
              <div className="flex gap-[3px] flex-wrap">
                {phases.map(p=>(
                  <button key={p} onClick={()=>setPhaseFilter(p)}
                    className={`px-[10px] py-[6px] text-[8px] tracking-[1.5px] uppercase font-semibold cursor-pointer border transition-all capitalize ${
                      phaseFilter===p ? 'bg-[rgba(220,38,38,.1)] border-[rgba(220,38,38,.25)] text-[#DC2626]' : 'bg-[#F4F7FD] border-[#F0F4FB] text-[#8FA3BF] hover:text-[#5C7A9E]'
                    }`}>{p}</button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead><tr className="border-b border-[#F0F4FB]">
                  {['Account ID','Trader','Product','Phase','Balance','Daily DD','Max DD','Risk'].map(h=>(
                    <th key={h} className="px-[11px] py-[6px] text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(a => {
                    const risk = riskLevel(a)
                    const profitPct = a.starting_balance > 0 ? ((a.balance-a.starting_balance)/a.starting_balance)*100 : 0
                    const isSelected = selected?.id===a.id
                    return (
                      <tr key={a.id} onClick={()=>isSelected?setSelected(null):openAccount(a)}
                        className={`border-b border-[rgba(34,85,204,.03)] cursor-pointer transition-all ${isSelected?'bg-[rgba(34,85,204,.06)]':'hover:bg-[rgba(34,85,204,.02)]'}`}>
                        <td className="px-[11px] py-[8px] font-bold text-[#2255CC] text-[10px]">{a.account_number}</td>
                        <td className="px-[11px] py-[8px]">
                          <div className="font-semibold">{a.users?`${a.users.first_name} ${a.users.last_name}`:'—'}</div>
                          <div className="text-[9px] text-[#8FA3BF]">{a.users?.email}</div>
                        </td>
                        <td className="px-[11px] py-[8px] text-[#5C7A9E]">{a.challenge_products?.name??'—'}</td>
                        <td className="px-[11px] py-[8px]"><Badge variant={phaseVariant(a.phase)}>{phaseLabel(a.phase)}</Badge></td>
                        <td className="px-[11px] py-[8px]">
                          <div className="font-mono font-semibold">${Number(a.balance).toLocaleString()}</div>
                          <div className={`text-[9px] font-mono ${profitPct>=0?'text-[#16A34A]':'text-[#DC2626]'}`}>{profitPct>=0?'+':''}{(Number(profitPct)||0).toFixed(2)}%</div>
                        </td>
                        <td className={`px-[11px] py-[8px] font-mono ${riskColor[risk]}`}>{(a.daily_dd_used??0).toFixed(2)}%</td>
                        <td className={`px-[11px] py-[8px] font-mono ${riskColor[risk]}`}>{(a.max_dd_used??0).toFixed(2)}%</td>
                        <td className={`px-[11px] py-[8px] font-semibold capitalize text-[10px] ${riskColor[risk]}`}>{risk}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {/* MODAL */}
          {selected && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={()=>setSelected(null)}>
            <div className="bg-white border border-[#E8EEF8] w-full max-w-[1100px] max-h-[90vh] flex flex-col rounded-xl shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EEF8] flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.2)] flex items-center justify-center font-bold text-[#DC2626] text-[13px]">
                    {selected.users?.first_name?.[0]}{selected.users?.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-[#2255CC] text-[15px]">{selected.account_number}</div>
                    <div className="text-[11px] text-[#5C7A9E]">{selected.users?.first_name} {selected.users?.last_name} · {selected.users?.email}</div>
                  </div>
                </div>
                {riskAlertCount > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <span className="flex items-center gap-1 bg-[rgba(220,38,38,.08)] border border-[rgba(220,38,38,.2)] px-3 py-1 rounded-full text-[#DC2626] text-[10px] font-bold">
                      ⚠️ {riskAlertCount} Risk Alert{riskAlertCount!==1?'s':''}
                    </span>
                  </div>
                )}
                <button onClick={()=>setSelected(null)} className="text-[#8FA3BF] hover:text-[#1A3A6B] cursor-pointer bg-transparent border-none text-[20px]">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[['Balance',fmt(selected.balance),'#1A3A6B'],['Phase',phaseLabel(selected.phase),'#2255CC'],['Status',selected.status??'active',selected.status==='breached'?'#DC2626':'#16A34A']].map(([l,v,c])=>(
                    <div key={l} className="bg-[#F4F7FD] border border-[#E8EEF8] p-[8px]">
                      <div className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold mb-1">{l}</div>
                      <div className="font-mono text-[11px] font-bold" style={{color:c}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E8EEF8] mb-4">
                  {TABS.map(({id,label})=>(
                    <button key={id} onClick={()=>setPanelTab(id)}
                      className={`px-4 py-2 text-[10px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent ${
                        panelTab===id ? 'border-[#DC2626] text-[#DC2626]' : 'border-transparent text-[#8FA3BF] hover:text-[#1A3A6B]'
                      }`}>{label}</button>
                  ))}
                </div>

                {/* TRADES */}
                {panelTab==='trades' && (
                  tradesLoading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
                  : trades.length===0 ? <div className="py-8 text-center text-[11px] text-[#8FA3BF]">No trades on this account</div>
                  : <div className="overflow-auto max-h-[500px]">
                    <table className="w-full border-collapse text-[10px] min-w-[600px]">
                      <thead className="sticky top-0 bg-white z-10"><tr className="border-b border-[#F0F4FB]">
                        {['IP','Symbol','Dir','Lots','Open','SL','TP','Open Time','Close Time','Duration','P&L'].map(h=>(
                          <th key={h} className="px-[7px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[#8FA3BF] font-semibold text-left bg-[#FAFBFF] whitespace-nowrap">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {trades.map(t=>(
                          <tr key={t.id} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                            <td className="px-[7px] py-[6px]">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-mono text-[#8FA3BF] bg-[#F4F7FD] px-1 py-[1px] border border-[#E8EEF8]">{t.ip_address??'—'}</span>
                                {t.ip_address && ipCountries[t.ip_address] && (
                                  <span className="text-[9px] text-[#5C7A9E] font-semibold whitespace-nowrap">
                                    {countryFlag(ipCountries[t.ip_address])} {ipCountries[t.ip_address]}
                                  </span>
                                )}
                                {t.ip_address && !ipCountries[t.ip_address] && (
                                  <span className="text-[8px] text-[#BCC9DA]">loading…</span>
                                )}
                              </div>
                            </td>
                            <td className="px-[7px] py-[6px] font-semibold text-[#2255CC]">{t.symbol}</td>
                            <td className="px-[7px] py-[6px] font-bold" style={{color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction?.toUpperCase()}</td>
                            <td className="px-[7px] py-[6px] font-mono">{t.lots}</td>
                            <td className="px-[7px] py-[6px] font-mono text-[#5C7A9E]">{(Number(t.open_price)||0).toFixed(5)}</td>
                            <td className="px-[7px] py-[6px] font-mono text-[#DC2626]">{t.sl??'—'}</td>
                            <td className="px-[7px] py-[6px] font-mono text-[#16A34A]">{t.tp??'—'}</td>
                            <td className="px-[7px] py-[6px] text-[#8FA3BF] whitespace-nowrap">{t.opened_at?new Date(t.opened_at).toLocaleString():'—'}</td>
                            <td className="px-[7px] py-[6px] text-[#8FA3BF] whitespace-nowrap">{t.closed_at?new Date(t.closed_at).toLocaleString():<span className="text-[#16A34A] font-semibold">Open</span>}</td>
                            <td className="px-[7px] py-[6px] font-mono text-[#5C7A9E]">{duration(t.opened_at,t.closed_at)}</td>
                            <td className="px-[7px] py-[6px] font-mono font-bold" style={{color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>
                              {t.status==='open'?<span className="text-[#8FA3BF]">Open</span>:`${(t.net_pnl??0)>=0?'+':''}$${(Number(t.net_pnl)||0).toFixed(2)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* RISK TAB — full Risk Monitor data for this account */}
                {panelTab==='risk' && (
                  riskLoading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
                  : <div>
                    {/* Risk sub-tabs */}
                    <div className="flex gap-1 flex-wrap mb-4 border-b border-[#E8EEF8] pb-2">
                      {[
                        {id:'summary',     label:'📊 Summary'},
                        {id:'sameacc',     label:`🚨 Same-Acc Hedge${sameAccHedge.length>0?` (${sameAccHedge.length})`:''}`},
                        {id:'mirror',      label:`🪞 Mirror${mirrorGroups.length>0?` (${mirrorGroups.length})`:''}`},
                        {id:'ip',          label:`📡 Trade IPs${tradeIps.length>0?` (${tradeIps.length})`:''}`},
                        {id:'news',        label:`📰 News${newsViolations.length>0?` (${newsViolations.length})`:''}`},
                        {id:'velocity',    label:`⚡ Velocity${velocityCount>=15?` (${velocityCount}!)`:''}`},
                        {id:'winrate',     label:`📊 Win Rate${winRateData?.win_rate>=90?' ⚠️':''}`},
                        {id:'bot',         label:`🤖 Bot Pattern${consistentProfit?' ⚠️':''}`},
                        {id:'dd',          label:'📉 Drawdown'},
                        {id:'flags',       label:`🚩 Flags${flags.filter(f=>f.status==='open').length>0?` (${flags.filter(f=>f.status==='open').length})`:''}`},
                      ].map(t=>(
                        <button key={t.id} onClick={()=>setRiskTab(t.id)}
                          className={`px-3 py-1.5 text-[9px] font-semibold rounded cursor-pointer border transition-all whitespace-nowrap ${
                            riskTab===t.id ? 'bg-[rgba(220,38,38,.1)] border-[rgba(220,38,38,.3)] text-[#DC2626]' : 'bg-[#F4F7FD] border-[#E8EEF8] text-[#8FA3BF] hover:text-[#5C7A9E]'
                          }`}>{t.label}</button>
                      ))}
                    </div>

                    {/* SUMMARY */}
                    {riskTab==='summary' && (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {label:'Same-Acc Hedging', value:sameAccHedge.length, color:sameAccHedge.length>0?'#DC2626':'#16A34A', icon:'🚨'},
                          {label:'Mirror Trading Groups', value:mirrorGroups.length, color:mirrorGroups.length>0?'#DC2626':'#16A34A', icon:'🪞'},
                          {label:'Shared Trade IPs', value:tradeIps.length, color:tradeIps.length>0?'#DC2626':'#16A34A', icon:'📡'},
                          {label:'News Window Trades', value:newsViolations.length, color:newsViolations.length>=2?'#D97706':'#16A34A', icon:'📰'},
                          {label:'Trades Last Hour', value:velocityCount, color:velocityCount>=15?'#DC2626':'#16A34A', icon:'⚡'},
                          {label:'Win Rate', value:winRateData?`${winRateData.win_rate}%`:'—', color:winRateData?.win_rate>=90?'#DC2626':'#16A34A', icon:'📊'},
                          {label:'Bot Pattern', value:consistentProfit?`${consistentProfit.cv}% var`:'None', color:consistentProfit?'#D97706':'#16A34A', icon:'🤖'},
                          {label:'Open Flags', value:flags.filter(f=>f.status==='open').length, color:flags.filter(f=>f.status==='open').length>0?'#DC2626':'#16A34A', icon:'🚩'},
                        ].map(({label,value,color,icon})=>(
                          <div key={label} className="bg-[#F4F7FD] border border-[#E8EEF8] rounded-lg p-3 flex items-center gap-3">
                            <span className="text-[18px]">{icon}</span>
                            <div>
                              <div className="text-[8px] uppercase tracking-wider text-[#8FA3BF] font-semibold">{label}</div>
                              <div className="text-[16px] font-bold" style={{...mono,color}}>{value}</div>
                            </div>
                          </div>
                        ))}
                        {riskAlertCount === 0 && (
                          <div className="col-span-2 py-6 text-center text-[#16A34A] text-[12px]">✓ No risk alerts detected for this account</div>
                        )}
                      </div>
                    )}

                    {/* SAME-ACCOUNT HEDGING */}
                    {riskTab==='sameacc' && (
                      sameAccHedge.length===0
                        ? <div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No same-account hedging detected</div>
                        : sameAccHedge.map((s,i)=>(
                          <div key={i} className="border border-[rgba(220,38,38,.3)] bg-[rgba(220,38,38,.04)] rounded-lg p-4 mb-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px] font-bold px-3 py-1 bg-[#DC2626] text-white rounded">{s.symbol}</span>
                              <div className="flex gap-2">
                                <button onClick={()=>flagAcc(selected.users?.id,selected.account_number,`Same-account hedging on ${s.symbol}`)}
                                  className="px-3 py-1.5 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                                <button onClick={()=>warnTrader(selected.users?.id,selected.users?.email,selected.account_number,`Same-account hedging detected on ${s.symbol}`)}
                                  className="px-3 py-1.5 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {[{side:'BUY',trades:s.buys,lots:s.total_buy_lots,color:'#16A34A'},{side:'SELL',trades:s.sells,lots:s.total_sell_lots,color:'#DC2626'}].map(({side,trades,lots,color})=>(
                                <div key={side} className="border rounded-lg p-3" style={{borderColor:`${color}33`,background:`${color}08`}}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[9px] font-bold px-2 py-0.5 text-white rounded" style={{background:color}}>{side}</span>
                                    <span className="text-[10px] font-semibold" style={{color}}>{trades.length} position{trades.length>1?'s':''}</span>
                                    <span className="text-[9px] text-[#8FA3BF] ml-auto" style={mono}>{lots.toFixed(2)} lots</span>
                                  </div>
                                  {trades.map((t:any,ti:number)=>(
                                    <div key={ti} className="flex justify-between text-[9px] text-[#5C7A9E] py-0.5 border-b border-[#F4F7FD] last:border-0">
                                      <span style={mono}>{Number(t.lots).toFixed(2)} lots</span>
                                      <span style={mono}>@ {Number(t.open_price||0).toFixed(5)}</span>
                                      <span>{timeAgo(t.opened_at)}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                    )}

                    {/* MIRROR TRADING */}
                    {riskTab==='mirror' && (
                      mirrorGroups.length===0
                        ? <div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No mirror trading patterns detected</div>
                        : mirrorGroups.map((g,i)=>(
                          <div key={i} className="border border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.03)] rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="text-[11px] font-bold px-3 py-1 bg-[#DC2626] text-white rounded" style={mono}>{g.symbol}</span>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded text-white ${g.direction==='buy'?'bg-[#16A34A]':'bg-[#DC2626]'}`}>{g.direction?.toUpperCase()}</span>
                              <span className="text-[9px] text-[#DC2626] font-bold">🪞 {g.trades.length} accounts · {timeAgo(g.bucket_time)}</span>
                            </div>
                            <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${Math.min(g.trades.length,3)},1fr)`}}>
                              {g.trades.map((t:any,ti:number)=>(
                                <div key={ti} className="bg-white border border-[#E8EEF8] rounded p-3">
                                  <div className="font-semibold text-[11px] mb-1">{t.name}</div>
                                  <div className="text-[9px] text-[#8FA3BF]">{t.email}</div>
                                  <div className="text-[9px] font-mono text-[#2255CC]">{t.account} · {t.lots} lots</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                    )}

                    {/* TRADE IPs */}
                    {riskTab==='ip' && (
                      tradeIps.length===0
                        ? <div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No matching trade IPs on other accounts</div>
                        : tradeIps.map(({ip,accounts:accs},i)=>(
                          <div key={i} className="border border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.03)] rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-3 mb-3">
                              <span style={mono} className="text-[13px] font-bold text-[#DC2626]">{ip}</span>
                              <span className="text-[9px] bg-[rgba(220,38,38,.1)] text-[#DC2626] border border-[rgba(220,38,38,.2)] px-2 py-0.5 font-bold rounded">🔴 Also used by {accs.length} other account{accs.length>1?'s':''}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {accs.map((a:any,ai:number)=>(
                                <div key={ai} className="bg-white border border-[rgba(220,38,38,.15)] rounded p-3">
                                  <div className="font-semibold text-[11px]">{a.name}</div>
                                  <div style={mono} className="text-[9px] text-[#2255CC]">{a.account}</div>
                                  <div className="text-[9px] text-[#8FA3BF]">{a.email}</div>
                                  <button onClick={()=>flagAcc(a.user_id,a.account,'Trade IP match: '+ip)}
                                    className="mt-2 w-full px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                    )}

                    {/* NEWS TRADING */}
                    {riskTab==='news' && (
                      newsViolations.length===0
                        ? <div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No news window trading detected</div>
                        : <div>
                          <div className="text-[10px] text-[#8FA3BF] mb-3">Trades opened within 2min of major news hours (08:00, 09:00, 10:00, 13:00, 14:00, 15:00, 16:00, 21:00 UTC)</div>
                          <div className="overflow-auto">
                            <table className="w-full border-collapse text-[10px]">
                              <thead><tr className="border-b border-[#F0F4FB]">
                                {['Symbol','Dir','Open Time (UTC)','Lots','P&L'].map(h=>(
                                  <th key={h} className="px-3 py-2 text-[7px] uppercase tracking-wider text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {newsViolations.map((t,i)=>(
                                  <tr key={i} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                                    <td className="px-3 py-2 font-bold text-[#2255CC]">{t.symbol}</td>
                                    <td className="px-3 py-2 font-bold" style={{color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction?.toUpperCase()}</td>
                                    <td className="px-3 py-2 text-[#8FA3BF]" style={mono}>{new Date(t.opened_at).toUTCString().slice(0,25)}</td>
                                    <td className="px-3 py-2" style={mono}>{t.lots}</td>
                                    <td className="px-3 py-2 font-bold" style={{...mono,color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>${(Number(t.net_pnl)||0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {newsViolations.length >= 2 && (
                            <div className="mt-3 flex gap-2">
                              <button onClick={()=>flagAcc(selected.users?.id,selected.account_number,`News window trading: ${newsViolations.length} violations`)}
                                className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag Account</button>
                              <button onClick={()=>warnTrader(selected.users?.id,selected.users?.email,selected.account_number,'News window trading detected — not permitted under challenge rules')}
                                className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn Trader</button>
                            </div>
                          )}
                        </div>
                    )}

                    {/* VELOCITY */}
                    {riskTab==='velocity' && (
                      <div>
                        <div className="text-center py-6">
                          <div className="text-[48px] font-bold" style={{...mono,color:velocityCount>=15?'#DC2626':velocityCount>=10?'#D97706':'#16A34A'}}>{velocityCount}</div>
                          <div className="text-[12px] text-[#8FA3BF] mt-2">trades in the last hour</div>
                          {velocityCount >= 15 && (
                            <div className="mt-4 p-3 bg-[rgba(220,38,38,.05)] border border-[rgba(220,38,38,.2)] rounded-lg text-[11px] text-[#DC2626] max-w-sm mx-auto">
                              ⚡ High frequency trading detected. {velocityCount}+ trades/hr may indicate HFT, bots or scalping abuse.
                            </div>
                          )}
                          {velocityCount < 15 && <div className="text-[12px] text-[#16A34A] mt-3">✓ Normal trade velocity</div>}
                        </div>
                        {velocityCount >= 15 && (
                          <div className="flex gap-2 justify-center">
                            <button onClick={()=>flagAcc(selected.users?.id,selected.account_number,`High velocity: ${velocityCount} trades/hr`)}
                              className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                            <button onClick={()=>warnTrader(selected.users?.id,selected.users?.email,selected.account_number,'Abnormally high trade frequency detected')}
                              className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* WIN RATE */}
                    {riskTab==='winrate' && (
                      !winRateData
                        ? <div className="py-8 text-center text-[#8FA3BF] text-[12px]">Need at least 5 closed trades for analysis</div>
                        : <div className="text-center py-6">
                          <div className="text-[48px] font-bold" style={{...mono,color:winRateData.win_rate>=90?'#DC2626':winRateData.win_rate>=75?'#D97706':'#16A34A'}}>{winRateData.win_rate}%</div>
                          <div className="text-[12px] text-[#8FA3BF] mt-1">Win rate over {winRateData.total} trades</div>
                          <div className="text-[11px] text-[#5C7A9E] mt-1">{winRateData.wins} wins / {winRateData.total-winRateData.wins} losses</div>
                          <div className={`text-[13px] font-bold mt-1 ${winRateData.pnl>=0?'text-[#16A34A]':'text-[#DC2626]'}`} style={mono}>Total P&L: ${winRateData.pnl.toFixed(2)}</div>
                          {winRateData.win_rate >= 90 && (
                            <div className="mt-4 p-3 bg-[rgba(220,38,38,.05)] border border-[rgba(220,38,38,.2)] rounded-lg text-[11px] text-[#DC2626] max-w-sm mx-auto">
                              ⚠️ Win rate ≥90% is statistically improbable. May indicate latency arbitrage or coordinated abuse.
                            </div>
                          )}
                          {winRateData.win_rate >= 90 && (
                            <div className="flex gap-2 justify-center mt-4">
                              <button onClick={()=>flagAcc(selected.users?.id,selected.account_number,`Win rate ${winRateData.win_rate}% over ${winRateData.total} trades`)}
                                className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                              <button onClick={()=>warnTrader(selected.users?.id,selected.users?.email,selected.account_number,'Abnormal win rate flagged for review')}
                                className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                            </div>
                          )}
                        </div>
                    )}

                    {/* BOT PATTERN */}
                    {riskTab==='bot' && (
                      !consistentProfit
                        ? <div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No bot-like profit patterns detected</div>
                        : <div className="text-center py-6">
                          <div className="text-[32px] font-bold text-[#D97706]" style={mono}>{consistentProfit.cv}% variance</div>
                          <div className="text-[12px] text-[#8FA3BF] mt-1">Average daily P&L: ${consistentProfit.avg_daily}</div>
                          <div className="text-[11px] text-[#5C7A9E]">Sampled over {consistentProfit.days} days</div>
                          <div className="mt-4 p-3 bg-[rgba(217,119,6,.05)] border border-[rgba(217,119,6,.2)] rounded-lg text-[11px] text-[#D97706] max-w-sm mx-auto">
                            🤖 Coefficient of variation &lt;5% is statistically impossible for human traders. Indicates algorithmic execution or copy bot.
                          </div>
                          <div className="flex gap-2 justify-center mt-4">
                            <button onClick={()=>flagAcc(selected.users?.id,selected.account_number,`Bot-like profit pattern: ${consistentProfit.cv}% variance`)}
                              className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                          </div>
                        </div>
                    )}

                    {/* DRAWDOWN */}
                    {riskTab==='dd' && (
                      <div>
                        <DrawdownBar label={`Daily DD — ${(selected.daily_dd_used??0).toFixed(2)}%`} used={selected.daily_dd_used??0} max={dailyLimit}/>
                        <DrawdownBar label={`Max DD — ${(selected.max_dd_used??0).toFixed(2)}%`} used={selected.max_dd_used??0} max={maxLimit}/>
                        <div className="flex gap-2 mt-4">
                          {(selected.daily_dd_used??0)>=4||(selected.max_dd_used??0)>=8 ? (<>
                            <button onClick={()=>warnTrader(selected.users?.id,selected.users?.email,selected.account_number,'Approaching drawdown limits')}
                              className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">📨 Warn</button>
                            <button onClick={()=>flagAcc(selected.users?.id,selected.account_number,'Critical drawdown level')}
                              className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">🚩 Flag</button>
                          </>) : <div className="text-[11px] text-[#16A34A]">✓ Drawdown within safe limits</div>}
                        </div>
                      </div>
                    )}

                    {/* FLAGS CRM */}
                    {riskTab==='flags' && (
                      flags.length===0
                        ? <div className="py-8 text-center text-[#8FA3BF] text-[12px]">No flags for this trader</div>
                        : <div className="flex flex-col gap-3">
                          {flags.map(f=>(
                            <div key={f.id} className={`border rounded-lg p-4 ${f.status==='banned'?'border-[rgba(220,38,38,.3)] bg-[rgba(220,38,38,.04)]':f.status==='resolved'?'border-[rgba(22,163,74,.2)] bg-[rgba(22,163,74,.02)]':'border-[rgba(217,119,6,.25)] bg-[rgba(217,119,6,.03)]'}`}>
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[8px] font-bold px-2 py-0.5 border rounded uppercase ${f.status==='banned'?'text-[#DC2626] bg-[rgba(220,38,38,.08)] border-[rgba(220,38,38,.2)]':f.status==='resolved'?'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]':'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]'}`}>
                                  {f.status==='banned'?'⛔ Banned':f.status==='resolved'?'✅ Resolved':'🔒 Open'}
                                </span>
                                <span className="text-[9px] text-[#8FA3BF]">{timeAgo(f.flagged_at)}</span>
                              </div>
                              <div className="text-[11px] text-[#DC2626] font-semibold mb-2">{f.reason}</div>
                              <textarea value={flagNotes[f.id]??f.notes??''} onChange={e=>setFlagNotes(n=>({...n,[f.id]:e.target.value}))}
                                onBlur={async()=>{if(flagNotes[f.id]!==undefined) await supabase.from('risk_flags').update({notes:flagNotes[f.id]}).eq('id',f.id)}}
                                placeholder="Investigation notes…" rows={2} disabled={f.status!=='open'}
                                className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#E8EEF8] text-[10px] outline-none rounded resize-none disabled:opacity-50"/>
                              {f.status==='open' && (
                                <div className="flex gap-2 mt-2">
                                  <button onClick={()=>resolveFlag(f.id,f.user_id,f.account_number,flagNotes[f.id]??f.notes??'')}
                                    className="px-3 py-1.5 text-[9px] font-bold uppercase bg-[rgba(22,163,74,.08)] text-[#16A34A] border border-[rgba(22,163,74,.2)] rounded cursor-pointer">✅ Resolve</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                    )}
                  </div>
                )}

                {/* BREACH */}
                {panelTab==='breach' && (
                  <div>
                    <div className="p-4 bg-[rgba(220,38,38,.05)] border border-[rgba(220,38,38,.2)] mb-4">
                      <div className="font-semibold text-[#DC2626] text-[12px] mb-2">⚠️ Breach Account</div>
                      <p className="text-[11px] text-[#5C7A9E] mb-3">This will permanently mark the account as breached, lock trading, and notify the trader by email and notification.</p>
                      <div className="grid grid-cols-2 gap-2 mb-4 text-[10px]">
                        {[['Account',selected.account_number],['Trader',`${selected.users?.first_name} ${selected.users?.last_name}`],['Balance',fmt(selected.balance)],['Status',selected.status??'active']].map(([l,v])=>(
                          <div key={l} className="flex justify-between py-1 border-b border-[#F0F4FB]">
                            <span className="text-[#8FA3BF]">{l}</span><span className="font-semibold">{v}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={breachAccount} disabled={selected.status==='breached'}
                        className="w-full py-[10px] text-[10px] uppercase font-bold bg-[#DC2626] text-white border-none cursor-pointer hover:bg-[#b91c1c] disabled:opacity-40 disabled:cursor-not-allowed">
                        {selected.status==='breached'?'✓ Already Breached':'⛔ Breach This Account'}
                      </button>
                    </div>
                  </div>
                )}

                {/* NOTIFY */}
                {panelTab==='notify' && (
                  <div>
                    <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Message to {selected.users?.first_name}</label>
                    <textarea value={notifyMsg} onChange={e=>setNotifyMsg(e.target.value)} rows={5}
                      placeholder="Write your message to the trader…"
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[11px] outline-none focus:border-[#2255CC] transition-colors resize-y mb-3"/>
                    <div className="text-[9px] text-[#8FA3BF] mb-3">Sends as: in-app notification + email to {selected.users?.email}</div>
                    <button onClick={sendNotification} disabled={notifying||!notifyMsg.trim()}
                      className="w-full py-[10px] text-[10px] uppercase font-bold bg-[#2255CC] text-white border-none cursor-pointer hover:bg-[#1A44B0] disabled:opacity-40">
                      {notifying?'Sending…':'📨 Send Notification'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
