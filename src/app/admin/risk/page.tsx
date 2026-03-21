import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, DrawdownBar } from '@/components/ui/Card'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { analyticsApi } from '@/lib/api/analytics'
import { ADMIN_NAV } from '@/lib/nav'
import { sendEmail } from '@/lib/email'

const mono = { fontFamily:"'JetBrains Mono',monospace" } as const
function timeDiff(a: string, b: string) { return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000 }
function timeAgo(dt: string) {
  const s = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export function AdminRiskPage() {
  const { toasts, toast, dismiss } = useToast()
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('hedging')
  const [hedgePairs, setHedgePairs] = useState<any[]>([])
  const [dupIps, setDupIps]         = useState<any[]>([])
  const [tradeIps, setTradeIps]     = useState<any[]>([])
  const [ddAlerts, setDdAlerts]     = useState<{ critical: any[]; warning: any[] }>({ critical: [], warning: [] })
  const [velocity, setVelocity]     = useState<any[]>([])
  const [winRate, setWinRate]       = useState<any[]>([])
  const [flagged, setFlagged]       = useState<any[]>([])
  const [notes, setNotes]           = useState<Record<string,string>>({})
  const [sameDevice, setSameDevice] = useState<any[]>([])  // Same name/email diff accounts
  const [newsViolations, setNewsViolations] = useState<any[]>([])  // Trades opened during news
  const [consistentProfit, setConsistentProfit] = useState<any[]>([]) // Suspiciously consistent daily P&L

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [riskData, users] = await Promise.all([
        analyticsApi.adminRiskAlerts().catch(() => []),
        supabase.from('users').select('id,first_name,last_name,email,last_login_ip,last_login_at,country').not('last_login_ip','is',null).then(r=>r.data??[]),
      ])

      // ── 1. Hedging: open trades same symbol opposite direction different users ──
      const { data: openTrades } = await supabase
        .from('trades')
        .select('id,account_id,symbol,direction,lots,opened_at,accounts(account_number,user_id,users(first_name,last_name,email))')
        .eq('status','open')
        .order('opened_at',{ascending:false})
        .limit(1000)
      const pairs: any[] = []
      const ot = openTrades ?? []
      for (let i=0;i<ot.length;i++) for (let j=i+1;j<ot.length;j++) {
        const a=ot[i],b=ot[j]
        if (!a.accounts||!b.accounts) continue
        if (a.symbol!==b.symbol) continue
        if (a.direction===b.direction) continue
        if (a.accounts.user_id===b.accounts.user_id) continue
        const diff = timeDiff(a.opened_at,b.opened_at)
        if (diff>300) continue
        pairs.push({ symbol:a.symbol, diff, t1:{...a.accounts,direction:a.direction,lots:a.lots,opened_at:a.opened_at,trade_id:a.id,name:`${a.accounts.users?.first_name} ${a.accounts.users?.last_name}`,email:a.accounts.users?.email}, t2:{...b.accounts,direction:b.direction,lots:b.lots,opened_at:b.opened_at,trade_id:b.id,name:`${b.accounts.users?.first_name} ${b.accounts.users?.last_name}`,email:b.accounts.users?.email} })
      }
      const seen=new Set<string>()
      setHedgePairs(pairs.filter(p=>{const k=[p.symbol,p.t1.account_number,p.t2.account_number].sort().join('|');if(seen.has(k))return false;seen.add(k);return true}))

      // ── 2. Duplicate login IPs ──
      const ipMap: Record<string,any[]> = {}
      for (const u of users as any[]) { if(!ipMap[u.last_login_ip])ipMap[u.last_login_ip]=[]; ipMap[u.last_login_ip].push(u) }
      setDupIps(Object.entries(ipMap).filter(([,t])=>t.length>=2).map(([ip,traders])=>({ip,traders})))

      // ── 3. Trade IPs ──
      const { data: tIpData } = await supabase.from('trades').select('ip_address,accounts(account_number,user_id,users(first_name,last_name,email))').not('ip_address','is',null).eq('status','open')
      const tipMap: Record<string,any[]> = {}
      for (const t of tIpData??[]) {
        if(!t.ip_address||!t.accounts) continue
        if(!tipMap[t.ip_address]) tipMap[t.ip_address]=[]
        const acc=t.accounts as any
        if(!tipMap[t.ip_address].find((x:any)=>x.user_id===acc.user_id))
          tipMap[t.ip_address].push({...acc.users, account:acc.account_number, user_id:acc.user_id})
      }
      setTradeIps(Object.entries(tipMap).filter(([,t])=>t.length>=2).map(([ip,traders])=>({ip,traders})))

      // ── 4. DD Alerts ──
      const al=riskData as any[]
      setDdAlerts({critical:al.filter(a=>a.daily_dd_used>=4||a.max_dd_used>=8),warning:al.filter(a=>a.daily_dd_used<4&&a.max_dd_used<8)})

      // ── 5. Velocity: >15 trades in last hour ──
      const { data: recent } = await supabase.from('trades').select('account_id,opened_at,accounts(account_number,user_id,users(first_name,last_name,email))').gte('opened_at',new Date(Date.now()-3600000).toISOString()).order('opened_at',{ascending:false})
      const vMap: Record<string,any> = {}
      for (const t of recent??[]) { const acc=t.accounts as any; if(!acc) continue; if(!vMap[t.account_id]) vMap[t.account_id]={count:0,last:t.opened_at,acc}; vMap[t.account_id].count++ }
      setVelocity(Object.values(vMap).filter((v:any)=>v.count>=15).map((v:any)=>({account_number:v.acc.account_number,name:`${v.acc.users?.first_name} ${v.acc.users?.last_name}`,email:v.acc.users?.email,user_id:v.acc.user_id,count:v.count,last:v.last})))

      // ── 6. Win Rate ≥90% over 20+ trades ──
      const { data: closed } = await supabase.from('trades').select('account_id,net_pnl,accounts(account_number,user_id,users(first_name,last_name,email))').eq('status','closed').not('net_pnl','is',null).limit(5000)
      const wMap: Record<string,any> = {}
      for (const t of closed??[]) { const acc=t.accounts as any; if(!acc) continue; if(!wMap[t.account_id]) wMap[t.account_id]={wins:0,total:0,pnl:0,acc}; wMap[t.account_id].total++; if((t.net_pnl??0)>0) wMap[t.account_id].wins++; wMap[t.account_id].pnl+=t.net_pnl??0 }
      setWinRate(Object.values(wMap).filter((v:any)=>v.total>=20&&v.wins/v.total>=0.9).map((v:any)=>({account_number:v.acc.account_number,name:`${v.acc.users?.first_name} ${v.acc.users?.last_name}`,email:v.acc.users?.email,user_id:v.acc.user_id,win_rate:Math.round(v.wins/v.total*100),total:v.total,pnl:v.pnl})))

      // ── 7. Same-name/email multi-accounting ──
      const { data: allUsers } = await supabase.from('users').select('id,first_name,last_name,email,created_at').order('created_at',{ascending:false}).limit(500)
      // Group by last name (simple heuristic) — same surname different email
      const nameMap: Record<string,any[]> = {}
      for (const u of allUsers??[]) {
        const ln = u.last_name?.toLowerCase().trim()
        if(!ln||ln.length<3) continue
        if(!nameMap[ln]) nameMap[ln]=[]
        nameMap[ln].push(u)
      }
      setSameDevice(Object.entries(nameMap).filter(([,u])=>u.length>=2&&new Set(u.map((x:any)=>x.email)).size===u.length).map(([name,users])=>({name,users})))

      // ── 8. News window trading (trades opened within ±2min of round hours on weekdays) ──
      // Round-number hour trades: 08:00, 09:00, 10:00, 13:00, 14:00, 15:00, 16:00 UTC = typical news times
      const { data: allOpenTrades } = await supabase.from('trades').select('id,symbol,direction,lots,opened_at,accounts(account_number,user_id,users(first_name,last_name,email))').eq('status','closed').gte('opened_at',new Date(Date.now()-7*86400000).toISOString()).not('net_pnl','is',null).limit(2000)
      const newsHours = [8,9,10,13,14,15,16,21]
      const newsVio: any[] = []
      for (const t of allOpenTrades??[]) {
        const dt = new Date(t.opened_at)
        const h = dt.getUTCHours(), m = dt.getUTCMinutes()
        if(newsHours.includes(h) && m<=2) {
          const acc = t.accounts as any
          if(!acc) continue
          newsVio.push({account_number:acc.account_number,name:`${acc.users?.first_name} ${acc.users?.last_name}`,email:acc.users?.email,user_id:acc.user_id,symbol:t.symbol,direction:t.direction,opened_at:t.opened_at,trade_id:t.id})
        }
      }
      // Deduplicate by account
      const nv: Record<string,any> = {}
      for(const n of newsVio){if(!nv[n.account_number])nv[n.account_number]={...n,count:0};nv[n.account_number].count++}
      setNewsViolations(Object.values(nv).filter((n:any)=>n.count>=2))

      // ── 9. Suspiciously consistent P&L (every day almost exactly same profit = bot) ──
      const { data: snapshots } = await supabase.from('daily_snapshots').select('account_id,daily_pnl,snapshot_date,accounts(account_number,user_id,users(first_name,last_name,email))').gte('snapshot_date',new Date(Date.now()-14*86400000).toISOString().split('T')[0]).order('snapshot_date',{ascending:false}).limit(2000)
      const snapMap: Record<string,any> = {}
      for (const s of snapshots??[]) {
        const acc = s.accounts as any; if(!acc) continue
        if(!snapMap[s.account_id]) snapMap[s.account_id]={pnls:[],acc}
        snapMap[s.account_id].pnls.push(Math.abs(s.daily_pnl??0))
      }
      const consistent: any[] = []
      for(const [,v] of Object.entries(snapMap) as any) {
        if(v.pnls.length<5) continue
        const avg = v.pnls.reduce((a:number,b:number)=>a+b,0)/v.pnls.length
        const variance = v.pnls.reduce((a:number,b:number)=>a+Math.pow(b-avg,2),0)/v.pnls.length
        const cv = avg>0?Math.sqrt(variance)/avg:0
        if(cv<0.05&&avg>50) consistent.push({account_number:v.acc.account_number,name:`${v.acc.users?.first_name} ${v.acc.users?.last_name}`,email:v.acc.users?.email,user_id:v.acc.user_id,avg_daily:avg.toFixed(2),cv:(cv*100).toFixed(1),days:v.pnls.length})
      }
      setConsistentProfit(consistent)

      // ── 10. Flagged accounts ──
      const { data: fl } = await supabase.from('risk_flags').select('*').order('flagged_at',{ascending:false}).limit(200)
      setFlagged(fl??[])
    } catch(e) { console.error('[Risk]',e) }
    setLoading(false)
  }, [])

  useEffect(()=>{load()},[load])

  async function flagAcc(userId:string,account:string,reason:string) {
    // Insert flag
    const {data:flag,error} = await supabase.from('risk_flags').insert({user_id:userId,account_number:account,reason,notes:'',flagged_at:new Date().toISOString(),status:'open',flagged_by:'admin'}).select().single()
    if(error){toast('error','❌','Error',error.message);return}
    // AUTO-FREEZE all accounts for this user
    await supabase.from('accounts').update({status:'soft_locked'}).eq('user_id',userId).eq('status','active')
    // Notify in-app
    await supabase.from('notifications').insert({user_id:userId,type:'risk_warning',title:'🔒 Account Frozen — Under Investigation',body:`Your account ${account} has been frozen pending a risk investigation. Trading has been suspended. Check your email for details.`,is_read:false})
    // Send freeze email
    try {
      const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
      if(u?.email) await sendEmail('account_frozen', u.email, {first_name:u.first_name??'Trader',account_number:account,reason,flag_id:flag?.id?.slice(0,8).toUpperCase()??'—'}, 'risk')
    } catch(e){console.error('[flag email]',e)}
    toast('warning','🔒','Flagged + Frozen',`${account} frozen. Email sent to trader.`)
    load()
  }

  async function banTrader(userId:string,account:string,reason:string,notes:string) {
    // Ban user
    await supabase.from('users').update({is_banned:true}).eq('id',userId)
    // Breach + lock all accounts
    await supabase.from('accounts').update({status:'breached',phase:'breached',breached_at:new Date().toISOString(),breach_reason:'Account banned: '+reason}).eq('user_id',userId)
    // Update all open flags to resolved
    await supabase.from('risk_flags').update({status:'banned',resolved_at:new Date().toISOString(),notes}).eq('user_id',userId).eq('status','open')
    // In-app notification
    await supabase.from('notifications').insert({user_id:userId,type:'breach_warning',title:'⛔ Account Permanently Banned',body:`Your account has been permanently suspended for: ${reason}. Check your email for the full notice.`,is_read:false})
    // Send ban email
    try {
      const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
      if(u?.email) await sendEmail('account_banned', u.email, {first_name:u.first_name??'Trader',account_number:account,reason,notes}, 'risk')
    } catch(e){console.error('[ban email]',e)}
    toast('error','⛔','Banned',`${account} — trader banned. Email sent.`)
    load()
  }
  async function warnTrader(userId:string,emailParam:string,account:string,reason:string) {
    await supabase.from('notifications').insert({user_id:userId,type:'risk_warning',title:'⚠️ Risk Management Alert',body:`Account ${account}: ${reason}. Check your email for details.`,is_read:false})
    try {
      // Always fetch fresh email+name from DB to avoid stale/empty params
      const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
      const toEmail = u?.email ?? emailParam
      if(!toEmail) { toast('error','❌','No Email','Could not find trader email.'); return }
      await sendEmail('risk_warning', toEmail, {first_name:u?.first_name??'Trader',account_number:account,reason}, 'risk')
      toast('warning','📨','Warning Sent',`Email + notification sent to ${toEmail}`)
    } catch(e){
      console.error('[warn email]',e)
      toast('error','❌','Email Failed', String(e))
    }
  }
  async function softLockAcc(accId:string,account:string,userId:string,reason:string) {
    await supabase.from('accounts').update({status:'soft_locked'}).eq('id',accId)
    await supabase.from('notifications').insert({user_id:userId,type:'breach_warning',title:'🔒 Account Restricted',body:`Account ${account} has been temporarily restricted. Reason: ${reason}. Check your email.`,is_read:false})
    try {
      const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
      if(u?.email) await sendEmail('account_soft_locked', u.email, {first_name:u.first_name??'Trader',account_number:account,reason}, 'risk')
    } catch(e){console.error('[softlock email]',e)}
    toast('warning','🔒','Locked',`${account} soft locked + email sent.`)
    load()
  }
  async function resolveFlag(id:string,userId:string,account:string,resolveNotes:string) {
    // 1. Mark flag resolved
    await supabase.from('risk_flags').update({status:'resolved',resolved_at:new Date().toISOString(),notes:resolveNotes||''}).eq('id',id)
    // 2. Check remaining open flags for this user
    const {data:openFlags} = await supabase.from('risk_flags').select('id').eq('user_id',userId).eq('status','open').neq('id',id)
    // 3. Fetch user
    const {data:u} = await supabase.from('users').select('email,first_name').eq('id',userId).single()
    if(!openFlags?.length) {
      // Unfreeze all soft-locked accounts
      await supabase.from('accounts').update({status:'active'}).eq('user_id',userId).eq('status','soft_locked')
      // In-app notification
      await supabase.from('notifications').insert({user_id:userId,type:'info',title:'✅ Account Unfrozen — Investigation Resolved',body:`Your account ${account} has been cleared. Trading access is fully restored.`,is_read:false})
      // Email
      if(u?.email) {
        try {
          await sendEmail('investigation_resolved', u.email, {first_name:u.first_name??'Trader',account_number:account,notes:resolveNotes||'No violations found.'}, 'risk')
          toast('success','✅','Resolved + Unfrozen',`Account restored. Email sent to ${u.email}.`)
        } catch(e) {
          console.error('[resolve email]',e)
          toast('success','✅','Resolved + Unfrozen','Account restored but email failed — check logs.')
        }
      } else {
        toast('success','✅','Resolved + Unfrozen','Account restored. (No email on file)')
      }
    } else {
      toast('success','✓','Flag Resolved',`${openFlags.length} other flag(s) still open — account remains frozen.`)
    }
    load()
  }

  const tabs = [
    {id:'hedging',   label:'🔄 Hedging',          count:hedgePairs.length},
    {id:'copyip',    label:'🔗 Duplicate IPs',     count:dupIps.length},
    {id:'tradeip',   label:'📡 Trade IP Match',    count:tradeIps.length},
    {id:'drawdown',  label:'📉 Drawdown',          count:ddAlerts.critical.length+ddAlerts.warning.length},
    {id:'velocity',  label:'⚡ Velocity',          count:velocity.length},
    {id:'winrate',   label:'📊 Win Rate',          count:winRate.length},
    {id:'samename',  label:'👤 Same Name',         count:sameDevice.length},
    {id:'newstrade', label:'📰 News Trading',      count:newsViolations.length},
    {id:'botprofit', label:'🤖 Bot Pattern',       count:consistentProfit.length},
    {id:'flagged',   label:'🚩 Flagged CRM',       count:flagged.filter(f=>f.status==='open').length},
  ]
  const totalAlerts = hedgePairs.length+dupIps.length+tradeIps.length+ddAlerts.critical.length+velocity.length+winRate.length+sameDevice.length+newsViolations.length+consistentProfit.length

  return (
    <>
      <DashboardLayout title="Risk Management" nav={ADMIN_NAV} accentColor="red">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-[11px]">
          {[
            {label:'Total Alerts',value:totalAlerts,color:totalAlerts>0?'#DC2626':'#16A34A'},
            {label:'Hedge Pairs',value:hedgePairs.length,color:hedgePairs.length>0?'#DC2626':'#16A34A'},
            {label:'DD Critical',value:ddAlerts.critical.length,color:ddAlerts.critical.length>0?'#DC2626':'#16A34A'},
            {label:'Open Flags',value:flagged.filter(f=>f.status==='open').length,color:flagged.filter(f=>f.status==='open').length>0?'#DC2626':'#16A34A'},
          ].map(k=>(
            <div key={k.label} className="bg-white border border-[#E8EEF8] rounded-xl p-4">
              <div className="text-[8px] uppercase tracking-[2px] text-[#8FA3BF] font-semibold mb-1">{k.label}</div>
              <div className="text-[28px] font-bold" style={{color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#E8EEF8] flex-wrap">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={`px-4 py-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer bg-transparent whitespace-nowrap flex items-center gap-1.5 ${activeTab===t.id?'border-[#DC2626] text-[#DC2626]':'border-transparent text-[#8FA3BF] hover:text-[#5C7A9E]'}`}>
              {t.label}
              {t.count>0&&<span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(220,38,38,.1)] text-[#DC2626] border border-[rgba(220,38,38,.2)]">{t.count}</span>}
            </button>
          ))}
          <button onClick={load} className="ml-auto px-3 py-2 text-[10px] text-[#8FA3BF] hover:text-[#2255CC] cursor-pointer bg-transparent border-none">↺ Refresh</button>
        </div>

        {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div> : <>

          {/* ═══ HEDGING ═══ */}
          {activeTab==='hedging'&&<Card>
            <CardHeader title={`Cross-Account Hedging (${hedgePairs.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Two different traders with opposite positions (BUY/SELL) on the same symbol within 5 minutes — classic prop fraud pattern.</div>
            {hedgePairs.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No cross-account hedging detected</div>:
            hedgePairs.map((p,i)=>(
              <div key={i} className="border border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.03)] rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#DC2626] text-white rounded">{p.symbol}</span>
                    <span className="text-[9px] text-[#DC2626] font-bold">⚠ HEDGE DETECTED</span>
                    <span className="text-[9px] text-[#8FA3BF]">{p.diff<60?`${Math.round(p.diff)}s apart`:`${Math.round(p.diff/60)}m apart`}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>flagAcc(p.t1.user_id,p.t1.account_number,'Cross-account hedging')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag T1</button>
                    <button onClick={()=>flagAcc(p.t2.user_id,p.t2.account_number,'Cross-account hedging')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag T2</button>
                    <button onClick={async()=>{await warnTrader(p.t1.user_id,p.t1.email,p.t1.account_number,'Suspected coordinated hedging');await warnTrader(p.t2.user_id,p.t2.email,p.t2.account_number,'Suspected coordinated hedging')}} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn Both</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[p.t1,p.t2].map((t:any,ti:number)=>(
                    <div key={ti} className={`p-3 rounded border ${t.direction==='buy'?'bg-[rgba(22,163,74,.04)] border-[rgba(22,163,74,.2)]':'bg-[rgba(220,38,38,.04)] border-[rgba(220,38,38,.2)]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${t.direction==='buy'?'bg-[#16A34A]':'bg-[#DC2626]'}`}>{t.direction.toUpperCase()}</span>
                        <span className="text-[11px] font-semibold">{t.name}</span>
                      </div>
                      <div className="text-[9px] text-[#8FA3BF] space-y-0.5">
                        <div style={mono}>{t.account_number}</div>
                        <div>{t.email}</div>
                        <div>{t.lots} lots · {timeAgo(t.opened_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>}

          {/* ═══ DUPLICATE LOGIN IPs ═══ */}
          {activeTab==='copyip'&&<Card>
            <CardHeader title={`Duplicate Login IPs (${dupIps.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Multiple accounts logging in from the same IP — possible multi-accounting or household/VPN sharing.</div>
            {dupIps.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No duplicate login IPs</div>:
            dupIps.map(({ip,traders}:any)=>(
              <div key={ip} className="border border-[rgba(217,119,6,.2)] bg-[rgba(217,119,6,.03)] rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span style={mono} className="text-[13px] font-bold text-[#D97706]">{ip}</span>
                    <span className="text-[9px] bg-[rgba(217,119,6,.1)] text-[#D97706] border border-[rgba(217,119,6,.2)] px-2 py-0.5 font-bold rounded">{traders.length} accounts</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {traders.map((t:any,i:number)=><button key={i} onClick={()=>flagAcc(t.id,t.email,'Duplicate login IP: '+ip)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 {t.first_name}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {traders.map((t:any)=>(
                    <div key={t.id} className="bg-white border border-[#E8EEF8] rounded p-3">
                      <div className="font-semibold text-[11px]">{t.first_name} {t.last_name}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{t.email}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{t.country} · {t.last_login_at?timeAgo(t.last_login_at):'—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>}

          {/* ═══ TRADE IP MATCH ═══ */}
          {activeTab==='tradeip'&&<Card>
            <CardHeader title={`Trade IP Matches (${tradeIps.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Multiple accounts placing live trades from the same IP — stronger fraud signal than login IP alone.</div>
            {tradeIps.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No matching trade IPs</div>:
            tradeIps.map(({ip,traders}:any)=>(
              <div key={ip} className="border border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.03)] rounded-lg p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <span style={mono} className="text-[13px] font-bold text-[#DC2626]">{ip}</span>
                  <span className="text-[9px] bg-[rgba(220,38,38,.1)] text-[#DC2626] border border-[rgba(220,38,38,.2)] px-2 py-0.5 font-bold rounded">{traders.length} accounts trading</span>
                  <span className="text-[9px] text-[#DC2626] font-bold">🔴 HIGH RISK</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {traders.map((t:any,i:number)=>(
                    <div key={i} className="bg-white border border-[rgba(220,38,38,.15)] rounded p-3">
                      <div className="font-semibold text-[11px]">{t.first_name} {t.last_name}</div>
                      <div style={mono} className="text-[9px] text-[#2255CC]">{t.account}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{t.email}</div>
                      <button onClick={()=>flagAcc(t.user_id,t.account,'Trade IP match: '+ip)} className="mt-2 w-full px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>}

          {/* ═══ DRAWDOWN ═══ */}
          {activeTab==='drawdown'&&<>
            {ddAlerts.critical.length===0&&ddAlerts.warning.length===0?<Card><div className="py-8 text-center text-[#16A34A] text-[12px]">✓ All accounts within safe drawdown limits</div></Card>:<>
              {ddAlerts.critical.length>0&&<Card>
                <CardHeader title={`🔴 Critical Risk (${ddAlerts.critical.length})`}/>
                {ddAlerts.critical.map((a:any,i:number)=>(
                  <div key={i} className="border border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.04)] rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div style={mono} className="text-[#2255CC] text-[11px]">{a.account_number}</div>
                        <div className="font-semibold text-[13px]">{a.trader_name??'—'}</div>
                        <div className="text-[10px] text-[#8FA3BF]">Balance: ${Number(a.balance??0).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>warnTrader(a.user_id,a.email,a.account_number,'Approaching drawdown limits')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">📨 Warn</button>
                        <button onClick={()=>softLockAcc(a.id,a.account_number,a.user_id,'Approaching drawdown limit')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">🔒 Lock</button>
                        <button onClick={()=>flagAcc(a.user_id,a.account_number,'Critical drawdown level')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                      </div>
                    </div>
                    <DrawdownBar label={`Daily DD — ${a.daily_dd_used}%`} used={Number(a.daily_dd_used)} max={5}/>
                    <DrawdownBar label={`Max DD — ${a.max_dd_used}%`} used={Number(a.max_dd_used)} max={10}/>
                  </div>
                ))}
              </Card>}
              {ddAlerts.warning.length>0&&<Card>
                <CardHeader title={`⚠️ Warning Level (${ddAlerts.warning.length})`}/>
                {ddAlerts.warning.map((a:any,i:number)=>(
                  <div key={i} className="border border-[rgba(217,119,6,.15)] bg-[rgba(217,119,6,.03)] rounded-lg p-4 mb-2">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div style={mono} className="text-[#2255CC] text-[11px]">{a.account_number}</div>
                        <div className="font-semibold">{a.trader_name??'—'}</div>
                      </div>
                      <button onClick={()=>flagAcc(a.user_id,a.account_number,'Drawdown warning level')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[rgba(34,85,204,.2)] rounded cursor-pointer">🚩 Flag</button>
                    </div>
                    <DrawdownBar label={`Daily DD — ${a.daily_dd_used}%`} used={Number(a.daily_dd_used)} max={5}/>
                    <DrawdownBar label={`Max DD — ${a.max_dd_used}%`} used={Number(a.max_dd_used)} max={10}/>
                  </div>
                ))}
              </Card>}
            </>}
          </>}

          {/* ═══ VELOCITY ═══ */}
          {activeTab==='velocity'&&<Card>
            <CardHeader title={`High Trade Velocity ≥15/hr (${velocity.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Accounts with 15+ trades in the last hour — may indicate HFT bots, scalping, tick arbitrage or latency abuse.</div>
            {velocity.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No abnormal trade velocity</div>:
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-[#F0F4FB]">
                {['Account','Trader','Trades/hr','Last Trade','Actions'].map(h=><th key={h} className="px-3 py-2 text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>)}
              </tr></thead>
              <tbody>
                {velocity.map((v:any,i:number)=>(
                  <tr key={i} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                    <td className="px-3 py-2" style={mono}>{v.account_number}</td>
                    <td className="px-3 py-2"><div className="font-semibold">{v.name}</div><div className="text-[9px] text-[#8FA3BF]">{v.email}</div></td>
                    <td className="px-3 py-2"><span className="text-[#DC2626] font-bold text-[14px]" style={mono}>{v.count}</span></td>
                    <td className="px-3 py-2 text-[9px] text-[#8FA3BF]">{timeAgo(v.last)}</td>
                    <td className="px-3 py-2"><div className="flex gap-1">
                      <button onClick={()=>flagAcc(v.user_id,v.account_number,`High velocity: ${v.count} trades/hr`)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                      <button onClick={()=>warnTrader(v.user_id,v.email,v.account_number,'Abnormally high trade frequency')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </Card>}

          {/* ═══ WIN RATE ═══ */}
          {activeTab==='winrate'&&<Card>
            <CardHeader title={`Abnormal Win Rate ≥90% (${winRate.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Win rate ≥90% over 20+ trades is statistically improbable — may indicate latency arbitrage, toxic flow exploitation, or coordinated account abuse.</div>
            {winRate.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No abnormal win rates</div>:
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-[#F0F4FB]">
                {['Account','Trader','Win Rate','Trades','P&L','Actions'].map(h=><th key={h} className="px-3 py-2 text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>)}
              </tr></thead>
              <tbody>
                {winRate.map((w:any,i:number)=>(
                  <tr key={i} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                    <td className="px-3 py-2" style={mono}>{w.account_number}</td>
                    <td className="px-3 py-2"><div className="font-semibold">{w.name}</div><div className="text-[9px] text-[#8FA3BF]">{w.email}</div></td>
                    <td className="px-3 py-2"><span className="text-[#DC2626] font-bold text-[14px]" style={mono}>{w.win_rate}%</span></td>
                    <td className="px-3 py-2" style={mono}>{w.total}</td>
                    <td className="px-3 py-2 font-semibold" style={{...mono,color:w.pnl>=0?'#16A34A':'#DC2626'}}>${w.pnl.toFixed(2)}</td>
                    <td className="px-3 py-2"><div className="flex gap-1">
                      <button onClick={()=>flagAcc(w.user_id,w.account_number,`Win rate ${w.win_rate}% over ${w.total} trades`)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                      <button onClick={()=>warnTrader(w.user_id,w.email,w.account_number,'Abnormal win rate flagged for review')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </Card>}

          {/* ═══ SAME NAME MULTI-ACCOUNTING ═══ */}
          {activeTab==='samename'&&<Card>
            <CardHeader title={`Same Surname / Possible Multi-Account (${sameDevice.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Multiple accounts sharing the same last name but different emails. May indicate family accounts or multi-accounting under different identities.</div>
            {sameDevice.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No same-name multi-accounts detected</div>:
            sameDevice.map((g:any,i:number)=>(
              <div key={i} className="border border-[rgba(217,119,6,.2)] bg-[rgba(217,119,6,.03)] rounded-lg p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[12px] font-bold text-[#D97706] capitalize">{g.name}</span>
                  <span className="text-[9px] bg-[rgba(217,119,6,.1)] text-[#D97706] border border-[rgba(217,119,6,.2)] px-2 py-0.5 font-bold rounded">{g.users.length} accounts</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {g.users.map((u:any)=>(
                    <div key={u.id} className="bg-white border border-[#E8EEF8] rounded p-3">
                      <div className="font-semibold text-[11px]">{u.first_name} {u.last_name}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{u.email}</div>
                      <div className="text-[9px] text-[#8FA3BF]">{new Date(u.created_at).toLocaleDateString()}</div>
                      <button onClick={()=>flagAcc(u.id,u.email,'Suspected multi-accounting — same surname')} className="mt-2 w-full px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>}

          {/* ═══ NEWS WINDOW TRADING ═══ */}
          {activeTab==='newstrade'&&<Card>
            <CardHeader title={`News Window Trading (${newsViolations.length} accounts)`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Accounts repeatedly opening trades within 2 minutes of major news hours (08:00, 09:00, 10:00, 13:00, 14:00, 15:00, 16:00, 21:00 UTC) — news sniping detection.</div>
            {newsViolations.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No news window violations detected</div>:
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-[#F0F4FB]">
                {['Account','Trader','Symbol','Direction','Time','Violations','Actions'].map(h=><th key={h} className="px-3 py-2 text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>)}
              </tr></thead>
              <tbody>
                {newsViolations.map((n:any,i:number)=>(
                  <tr key={i} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                    <td className="px-3 py-2" style={mono}>{n.account_number}</td>
                    <td className="px-3 py-2"><div className="font-semibold">{n.name}</div><div className="text-[9px] text-[#8FA3BF]">{n.email}</div></td>
                    <td className="px-3 py-2 font-bold" style={mono}>{n.symbol}</td>
                    <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${n.direction==='buy'?'bg-[#16A34A]':'bg-[#DC2626]'}`}>{n.direction?.toUpperCase()}</span></td>
                    <td className="px-3 py-2 text-[9px] text-[#8FA3BF]" style={mono}>{new Date(n.opened_at).toUTCString().slice(0,25)}</td>
                    <td className="px-3 py-2"><span className="text-[#D97706] font-bold" style={mono}>{n.count}x</span></td>
                    <td className="px-3 py-2"><div className="flex gap-1">
                      <button onClick={()=>flagAcc(n.user_id,n.account_number,`News window trading: ${n.count} violations on ${n.symbol}`)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                      <button onClick={()=>warnTrader(n.user_id,n.email,n.account_number,'News window trading detected — not permitted under challenge rules')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </Card>}

          {/* ═══ BOT / CONSISTENT PROFIT PATTERN ═══ */}
          {activeTab==='botprofit'&&<Card>
            <CardHeader title={`Suspiciously Consistent Daily P&L — Bot Pattern (${consistentProfit.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">Accounts with coefficient of variation &lt;5% on daily P&L over 5+ days — statistically impossible for human traders. Indicates algorithmic execution, copy bots or tick manipulation.</div>
            {consistentProfit.length===0?<div className="py-8 text-center text-[#16A34A] text-[12px]">✓ No bot-like profit patterns detected</div>:
            <table className="w-full border-collapse text-[11px]">
              <thead><tr className="border-b border-[#F0F4FB]">
                {['Account','Trader','Avg Daily P&L','Consistency','Days Sampled','Actions'].map(h=><th key={h} className="px-3 py-2 text-[7px] tracking-[2px] uppercase text-[#8FA3BF] font-semibold text-left bg-[rgba(34,85,204,.02)]">{h}</th>)}
              </tr></thead>
              <tbody>
                {consistentProfit.map((c:any,i:number)=>(
                  <tr key={i} className="border-b border-[#F4F7FD] hover:bg-[rgba(34,85,204,.02)]">
                    <td className="px-3 py-2" style={mono}>{c.account_number}</td>
                    <td className="px-3 py-2"><div className="font-semibold">{c.name}</div><div className="text-[9px] text-[#8FA3BF]">{c.email}</div></td>
                    <td className="px-3 py-2 text-[#16A34A] font-bold" style={mono}>${c.avg_daily}/day</td>
                    <td className="px-3 py-2">
                      <span className="text-[#DC2626] font-bold" style={mono}>{c.cv}% variance</span>
                      <div className="text-[9px] text-[#8FA3BF]">{"<5% = bot-like"}</div>
                    </td>
                    <td className="px-3 py-2" style={mono}>{c.days}</td>
                    <td className="px-3 py-2"><div className="flex gap-1">
                      <button onClick={()=>flagAcc(c.user_id,c.account_number,`Bot-like profit pattern: ${c.cv}% variance over ${c.days} days`)} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer">🚩 Flag</button>
                      <button onClick={()=>warnTrader(c.user_id,c.email,c.account_number,'Abnormally consistent daily profit pattern flagged for manual review')} className="px-2 py-1 text-[8px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">📨 Warn</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </Card>}

          {/* ═══ FLAGGED CRM ═══ */}
          {activeTab==='flagged'&&<Card>
            <CardHeader title={`Flagged Accounts CRM (${flagged.length})`}/>
            <div className="text-[10px] text-[#8FA3BF] px-4 pb-3">All risk flags across all tools. Add notes, track investigation status, resolve when cleared.</div>
            {flagged.length===0?<div className="py-8 text-center text-[#8FA3BF] text-[12px]">No flagged accounts yet</div>:
            <div className="flex flex-col gap-3 p-1">
              {flagged.map((f:any)=>(
                <div key={f.id} className={`border rounded-lg p-4 ${
                  f.status==='banned' ? 'border-[rgba(220,38,38,.3)] bg-[rgba(220,38,38,.04)]' :
                  f.status==='resolved' ? 'border-[rgba(22,163,74,.2)] bg-[rgba(22,163,74,.02)]' :
                  'border-[rgba(217,119,6,.25)] bg-[rgba(217,119,6,.03)]'
                }`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span style={mono} className="text-[#2255CC] text-[11px] font-bold">{f.account_number}</span>
                        <span className={`text-[8px] font-bold px-2 py-0.5 border rounded uppercase ${
                          f.status==='banned' ? 'text-[#DC2626] bg-[rgba(220,38,38,.08)] border-[rgba(220,38,38,.2)]' :
                          f.status==='resolved' ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' :
                          'text-[#D97706] bg-[rgba(217,119,6,.08)] border-[rgba(217,119,6,.2)]'
                        }`}>
                          {f.status==='banned'?'⛔ Banned':f.status==='resolved'?'✅ Resolved':'🔒 Frozen — Open'}
                        </span>
                        <span className="text-[9px] text-[#8FA3BF]">{timeAgo(f.flagged_at)}</span>
                      </div>
                      <div className="text-[11px] text-[#DC2626] font-semibold">{f.reason}</div>
                    </div>
                  </div>

                  {/* Investigation notes */}
                  <div className="mb-3">
                    <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-1">Investigation Notes</label>
                    <textarea
                      value={notes[f.id]??f.notes??''}
                      onChange={e=>setNotes(n=>({...n,[f.id]:e.target.value}))}
                      onBlur={async()=>{ if(notes[f.id]!==undefined) await supabase.from('risk_flags').update({notes:notes[f.id]}).eq('id',f.id) }}
                      placeholder="Document your investigation findings, evidence, trader response…"
                      rows={2}
                      disabled={f.status!=='open'}
                      className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#E8EEF8] text-[10px] text-[#1A3A6B] outline-none focus:border-[#2255CC] rounded resize-none disabled:opacity-50"
                    />
                  </div>

                  {/* Actions */}
                  {f.status==='open' && (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>resolveFlag(f.id,f.user_id,f.account_number,notes[f.id]??f.notes??'')}
                        className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(22,163,74,.08)] text-[#16A34A] border border-[rgba(22,163,74,.2)] rounded cursor-pointer flex items-center gap-1">
                        ✅ Resolve & Unfreeze
                        <span className="text-[8px] opacity-60 normal-case font-normal">— send clearance email</span>
                      </button>
                      <button onClick={()=>{
                        if(!window.confirm(`BAN trader for account ${f.account_number}?

Reason: ${f.reason}
Notes: ${notes[f.id]??f.notes??'(none)'}

This will:
• Permanently ban the trader
• Breach all their accounts
• Send ban notice email

This cannot be undone.`)) return
                        banTrader(f.user_id,f.account_number,f.reason,notes[f.id]??f.notes??'')
                      }}
                        className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded cursor-pointer flex items-center gap-1">
                        ⛔ Ban Trader
                        <span className="text-[8px] opacity-60 normal-case font-normal">— send ban notice email</span>
                      </button>
                      <button onClick={()=>warnTrader(f.user_id,'',f.account_number,f.reason)}
                        className="px-3 py-2 text-[9px] font-bold uppercase bg-[rgba(217,119,6,.08)] text-[#D97706] border border-[rgba(217,119,6,.2)] rounded cursor-pointer">
                        📨 Re-send Warning
                      </button>
                    </div>
                  )}
                  {f.status==='resolved' && f.notes && (
                    <div className="text-[10px] text-[#16A34A] bg-[rgba(22,163,74,.06)] border border-[rgba(22,163,74,.2)] rounded px-3 py-2">
                      ✅ Resolution notes: {f.notes}
                    </div>
                  )}
                  {f.status==='banned' && (
                    <div className="text-[10px] text-[#DC2626] bg-[rgba(220,38,38,.06)] border border-[rgba(220,38,38,.2)] rounded px-3 py-2">
                      ⛔ Trader banned. All accounts breached. Ban email sent.
                    </div>
                  )}
                </div>
              ))}
            </div>}
          </Card>}

        </>}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}