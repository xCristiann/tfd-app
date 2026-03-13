import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const LEVERAGE  = 50
const LOT_SIZE  = 100_000
const POLY_KEY  = 'G6lKjTXfN4R1XHY6DoFAsIvDymYQ7fNO'

/* ═══════════════════════════════════════════════════════════════════
   ALL DATA: Polygon.io (free tier, real OHLC, CORS enabled)
   Live prices : wss://socket.polygon.io/forex  (WebSocket, real-time)
   Candle hist : /v2/aggs/ticker/…              (REST, unlimited history)

   Tickers:
     EUR/USD → C:EURUSD     GBP/USD → C:GBPUSD
     XAU/USD → C:XAUUSD     USD/JPY → C:USDJPY
     NAS100  → I:NDX        UK100   → I:FTSE
     GER40   → I:DAX
   ═══════════════════════════════════════════════════════════════════ */

const INSTRUMENTS = [
  { sym:'EUR/USD', poly:'C:EURUSD', wsSub:'C.EUR/USD', spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', poly:'C:GBPUSD', wsSub:'C.GBP/USD', spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'XAU/USD', poly:'C:XAUUSD', wsSub:'C.XAU/USD', spread:0.30,    dec:2, pip:0.10,   lotUSD:(p:number)=>p*100      },
  { sym:'USD/JPY', poly:'C:USDJPY', wsSub:'C.USD/JPY', spread:0.020,   dec:3, pip:0.01,   lotUSD:(_:number)=>LOT_SIZE   },
  { sym:'GBP/JPY', poly:'C:GBPJPY', wsSub:'C.GBP/JPY', spread:0.030,   dec:3, pip:0.01,   lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/JPY', poly:'C:EURJPY', wsSub:'C.EUR/JPY', spread:0.025,   dec:3, pip:0.01,   lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'NAS100',  poly:'I:NDX',    wsSub:'T.NDX',      spread:1.0,     dec:1, pip:1.0,    lotUSD:(p:number)=>p*10       },
  { sym:'US500',   poly:'I:SPX',    wsSub:'T.SPX',      spread:0.50,    dec:2, pip:0.10,   lotUSD:(p:number)=>p*50       },
  { sym:'GER40',   poly:'I:DAX',    wsSub:'T.DAX',      spread:1.0,     dec:1, pip:1.0,    lotUSD:(p:number)=>p*25       },
  { sym:'UK100',   poly:'I:FTSE',   wsSub:'T.FTSE',     spread:1.0,     dec:1, pip:1.0,    lotUSD:(p:number)=>p*10       },
]

const SEED: Record<string,number> = {
  'EUR/USD':1.1464,'GBP/USD':1.2940,'XAU/USD':2980,
  'USD/JPY':148.50,'GBP/JPY':192.50,'EUR/JPY':170.20,
  'NAS100':19200,'US500':5800,'GER40':22500,'UK100':8700,
}

/* Polygon timespan mapping + date range for enough history */
const TF_POLY: Record<string,{mult:number; span:string; daysBack:number}> = {
  M1:  { mult:1,  span:'minute', daysBack:5    },
  M5:  { mult:5,  span:'minute', daysBack:30   },
  M15: { mult:15, span:'minute', daysBack:60   },
  M30: { mult:30, span:'minute', daysBack:90   },
  H1:  { mult:1,  span:'hour',   daysBack:365  },
  H4:  { mult:4,  span:'hour',   daysBack:730  },
  D1:  { mult:1,  span:'day',    daysBack:3650 },
}
const TF_SEC: Record<string,number> = {
  M1:60,M5:300,M15:900,M30:1800,H1:3600,H4:14400,D1:86400,
}

type Candle = {time:number;open:number;high:number;low:number;close:number}

/* ── LWC loader ────────────────────────────────────────────────── */
let _lwcReady=false; const _lwcQ:Array<()=>void>=[]
function loadLWC():Promise<void>{
  return new Promise(res=>{
    if(_lwcReady){res();return}
    _lwcQ.push(res)
    if(document.getElementById('lwc-s'))return
    const s=document.createElement('script')
    s.id='lwc-s'
    s.src='https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload=()=>{_lwcReady=true;_lwcQ.forEach(f=>f());_lwcQ.length=0}
    document.head.appendChild(s)
  })
}

/* ── Polygon REST candles ──────────────────────────────────────── */
async function fetchPolyCandles(polyTicker:string, tf:string):Promise<Candle[]>{
  const {mult,span,daysBack}=TF_POLY[tf]??TF_POLY.H1
  const to   = new Date()
  const from = new Date(Date.now() - daysBack*86400*1000)
  const fmt2 = (d:Date)=>d.toISOString().split('T')[0]

  // Polygon allows up to 50000 results per call
  const url = `https://api.polygon.io/v2/aggs/ticker/${polyTicker}/range/${mult}/${span}/${fmt2(from)}/${fmt2(to)}` +
    `?adjusted=true&sort=asc&limit=50000&apiKey=${POLY_KEY}`

  try{
    const r = await fetch(url)
    if(!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()
    if(d.status==='ERROR') throw new Error(d.error||'Polygon error')
    if(!d.results?.length) return []

    return (d.results as any[]).map(b=>({
      time:  Math.floor(b.t/1000),
      open:  b.o,
      high:  b.h,
      low:   b.l,
      close: b.c,
    }))
  }catch(e){
    console.warn(`[Polygon] ${polyTicker} ${tf}:`, e)
    return []
  }
}

/* ── Chart component ───────────────────────────────────────────── */
function CandleChart({sym,tf,livePrice}:{sym:string;tf:string;livePrice:number}){
  const divRef  = useRef<HTMLDivElement>(null)
  const chartRef= useRef<any>(null)
  const serRef  = useRef<any>(null)
  const lastRef = useRef<Candle|null>(null)

  useEffect(()=>{
    const el=divRef.current; if(!el) return
    let dead=false
    loadLWC().then(async()=>{
      if(dead||!divRef.current) return
      try{chartRef.current?.remove()}catch{}
      const LWC=(window as any).LightweightCharts
      const chart=LWC.createChart(el,{
        width:el.clientWidth,height:el.clientHeight,
        layout:{background:{type:'solid',color:'#0A0A0F'},textColor:'rgba(200,190,240,0.5)'},
        grid:{vertLines:{color:'rgba(212,168,67,0.05)'},horzLines:{color:'rgba(212,168,67,0.05)'}},
        crosshair:{mode:1},
        rightPriceScale:{borderColor:'rgba(212,168,67,0.15)'},
        timeScale:{borderColor:'rgba(212,168,67,0.15)',timeVisible:true,secondsVisible:false},
      })
      const series=chart.addCandlestickSeries({
        upColor:'#00D97E',downColor:'#FF3352',
        borderUpColor:'#00D97E',borderDownColor:'#FF3352',
        wickUpColor:'#00D97E',wickDownColor:'#FF3352',
      })
      chartRef.current=chart; serRef.current=series
      const ro=new ResizeObserver(()=>{
        if(chartRef.current&&divRef.current)
          chartRef.current.resize(divRef.current.clientWidth,divRef.current.clientHeight)
      })
      ro.observe(el)

      const inst=INSTRUMENTS.find(i=>i.sym===sym)!
      const candles=await fetchPolyCandles(inst.poly, tf)
      if(dead){ro.disconnect();return}
      if(candles.length>0){
        series.setData(candles)
        lastRef.current=candles[candles.length-1]
        chart.timeScale().fitContent()
      } else {
        const now=Math.floor(Date.now()/1000)
        const seed:Candle={time:now,open:livePrice,high:livePrice,low:livePrice,close:livePrice}
        lastRef.current=seed; series.setData([seed])
      }
      return ()=>ro.disconnect()
    })
    return ()=>{dead=true}
  },[sym,tf])

  useEffect(()=>{
    if(!serRef.current||livePrice<=0) return
    const sec=TF_SEC[tf]
    const now=Math.floor(Date.now()/1000)
    const cTime=Math.floor(now/sec)*sec
    const prev=lastRef.current
    const c:Candle=(!prev||cTime>prev.time)
      ?{time:cTime,open:livePrice,high:livePrice,low:livePrice,close:livePrice}
      :{time:prev.time,open:prev.open,high:Math.max(prev.high,livePrice),low:Math.min(prev.low,livePrice),close:livePrice}
    lastRef.current=c
    try{serRef.current.update(c)}catch{}
  },[livePrice,tf])

  return <div ref={divRef} style={{width:'100%',height:'100%'}}/>
}

/* ── Price feed — Polygon WebSocket ────────────────────────────── */
/*
  Polygon forex WS: wss://socket.polygon.io/forex
  Auth → subscribe to C.EUR/USD etc.
  Event: { ev:'C', p:'EUR/USD', bp:bid, ap:ask, s:symbol, t:ts }
  
  For indices (NAS100 etc): Polygon free doesn't stream indices live
  → use REST snapshot /v2/snapshot/locale/global/markets/forex/tickers
  → poll every 3s for indices
*/
function usePriceFeed(){
  const [prices,setPrices]=useState<Record<string,number>>({...SEED})
  const refPrev  =useRef<Record<string,number>>({...SEED})
  const refPrices=useRef<Record<string,number>>({...SEED})

  const push=useCallback((sym:string,price:number)=>{
    if(!price||isNaN(price)||price<=0) return
    refPrev.current[sym]=refPrices.current[sym]||price
    refPrices.current[sym]=price
    setPrices(p=>p[sym]===price?p:{...p,[sym]:price})
  },[])

  useEffect(()=>{
    let dead=false
    let ws:WebSocket
    let wsTimer:ReturnType<typeof setTimeout>
    let pollTimer:ReturnType<typeof setInterval>
    let authenticated=false

    /* ── Polygon Forex WebSocket ── */
    const connectWS=()=>{
      if(dead) return
      try{
        ws=new WebSocket('wss://socket.polygon.io/forex')
        ws.onopen=()=>{
          ws.send(JSON.stringify({action:'auth',params:POLY_KEY}))
        }
        ws.onmessage=({data})=>{
          try{
            const msgs:any[]=JSON.parse(data)
            for(const msg of msgs){
              // Auth response
              if(msg.ev==='status'&&msg.status==='auth_success'){
                authenticated=true
                // Subscribe to all forex pairs
                const forexSubs=INSTRUMENTS
                  .filter(i=>i.sym.includes('/')||i.sym.includes('USD'))
                  .map(i=>i.wsSub).join(',')
                ws.send(JSON.stringify({action:'subscribe',params:forexSubs}))
              }
              // Forex currency update
              if(msg.ev==='C'){
                // Polygon sends bid (bp) and ask (ap) — use midpoint
                const mid=((msg.bp||0)+(msg.ap||0))/2||msg.l||0
                if(mid>0){
                  const inst=INSTRUMENTS.find(i=>i.wsSub===`C.${msg.p}`)
                  if(inst) push(inst.sym, mid)
                }
              }
            }
          }catch{}
        }
        ws.onclose=()=>{ authenticated=false; if(!dead) wsTimer=setTimeout(connectWS,2000) }
        ws.onerror=()=>{try{ws.close()}catch{}}
      }catch{
        if(!dead) wsTimer=setTimeout(connectWS,3000)
      }
    }

    /* ── Poll Polygon REST for latest prices (all instruments) ── */
    /* This covers: indices (not on WS free), and fills any WS gaps */
    const pollPrices=async()=>{
      if(dead) return
      // Snapshot endpoint for forex
      const forexTickers=INSTRUMENTS
        .filter(i=>i.poly.startsWith('C:'))
        .map(i=>i.poly).join(',')
      // Index tickers
      const idxTickers=INSTRUMENTS
        .filter(i=>i.poly.startsWith('I:'))
        .map(i=>i.poly).join(',')

      // Forex snapshot
      try{
        const r=await fetch(
          `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?tickers=${forexTickers}&apiKey=${POLY_KEY}`
        )
        const d=await r.json()
        if(d.tickers){
          for(const t of d.tickers){
            const inst=INSTRUMENTS.find(i=>i.poly===t.ticker)
            if(!inst) continue
            const price=t.day?.c||t.lastQuote?.ap||t.lastTrade?.p||0
            if(price>0) push(inst.sym, price)
          }
        }
      }catch{}

      // Index prices — use /v2/aggs/ticker/{ticker}/prev
      await Promise.allSettled(
        INSTRUMENTS.filter(i=>i.poly.startsWith('I:')).map(async inst=>{
          try{
            const r=await fetch(
              `https://api.polygon.io/v2/aggs/ticker/${inst.poly}/prev?adjusted=true&apiKey=${POLY_KEY}`
            )
            const d=await r.json()
            const price=d.results?.[0]?.c||0
            if(price>0) push(inst.sym,price)
          }catch{}
        })
      )
    }

    connectWS()
    pollPrices()
    pollTimer=setInterval(pollPrices, 3000)

    return ()=>{
      dead=true
      clearTimeout(wsTimer); clearInterval(pollTimer)
      try{ws?.close()}catch{}
    }
  },[push])

  return {prices,refPrev,refPrices}
}

/* ── P&L ────────────────────────────────────────────────────────── */
function calcPnl(trade:any,price:number):number{
  const inst=INSTRUMENTS.find(i=>i.sym===trade.symbol)
  const diff=trade.direction==='buy'?price-trade.open_price:trade.open_price-price
  const units=['USD/JPY','GBP/JPY','EUR/JPY'].includes(trade.symbol)
    ?LOT_SIZE/price:(inst?.lotUSD(1)??LOT_SIZE)
  return diff*units*trade.lots
}

/* ── Risk Monitor — interval-based, ref-only ────────────────────── */
function useRiskMonitor(
  tradesRef:{current:any[]},
  pricesRef:{current:Record<string,number>},
  primaryRef:{current:any},
  accountId:string|null|undefined,
  onBreach:(reason:string,trades:any[])=>void
){
  const firedRef   =useRef(false)
  const callbackRef=useRef(onBreach)
  callbackRef.current=onBreach

  useEffect(()=>{
    const iv=setInterval(()=>{
      const primary=primaryRef.current
      const trades =tradesRef.current
      const prices =pricesRef.current
      if(!primary||!trades.length||firedRef.current) return
      if(primary.status==='breached'||primary.status==='passed') return

      const balance  =primary.balance??0
      const startBal =primary.starting_balance??balance
      if(balance<=0||startBal<=0) return

      const cp   =(primary as any).challenge_products
      const phase=primary.phase??'phase1'
      const maxDDPct  =phase==='funded'?(cp?.funded_max_dd??10) :phase==='phase2'?(cp?.ph2_max_dd??10) :(cp?.ph1_max_dd??10)
      const dailyDDPct=phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)

      const maxDDFloor  =startBal-startBal*(maxDDPct/100)
      const dailyHigh   =primary.daily_high_balance??startBal
      const dailyFloor  =dailyHigh-dailyHigh*(dailyDDPct/100)

      const floatPnl=trades.reduce((s:number,t:any)=>{
        const cur=prices[t.symbol]||SEED[t.symbol]||t.open_price
        return s+calcPnl(t,cur)
      },0)
      const equity=balance+floatPnl

      if(equity<=maxDDFloor){
        firedRef.current=true
        callbackRef.current(`Max drawdown breached — equity $${equity.toFixed(2)} ≤ floor $${maxDDFloor.toFixed(2)} (${maxDDPct}% max DD)`,trades)
        return
      }
      if(equity<=dailyFloor){
        firedRef.current=true
        callbackRef.current(`Daily drawdown breached — equity $${equity.toFixed(2)} ≤ daily floor $${dailyFloor.toFixed(2)} (${dailyDDPct}% daily DD)`,trades)
        return
      }
      for(const t of trades){
        const cur=prices[t.symbol]||SEED[t.symbol]||t.open_price
        const pnl=calcPnl(t,cur)
        const pct=(pnl/startBal)*100
        if(pct<=-5){
          firedRef.current=true
          callbackRef.current(`${t.symbol} trade loss ${pct.toFixed(2)}% of account (limit -5%)`,trades)
          return
        }
      }
    },500)
    return ()=>clearInterval(iv)
  },[])

  useEffect(()=>{firedRef.current=false},[accountId])
}

/* ── Platform Page ──────────────────────────────────────────────── */
export function PlatformPage(){
  const navigate =useNavigate()
  const {toasts,toast,dismiss}=useToast()
  const {accounts,primary:defPrimary}=useAccount()
  const [selAccId,setSelAccId]=useState<string|null>(null)
  const primary=accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,     setSym]    =useState('EUR/USD')
  const [tf,      setTf]     =useState('H1')
  const [dir,     setDir]    =useState<'buy'|'sell'>('buy')
  const [lots,    setLots]   =useState('0.10')
  const [sl,      setSl]     =useState('')
  const [tp,      setTp]     =useState('')
  const [ordType, setOrdType]=useState('Market')
  const [tab,     setTab]    =useState('positions')
  const [confirm, setConfirm]=useState(false)
  const [placing, setPlacing]=useState(false)
  const [openTrades,   setOpenTrades]  =useState<any[]>([])
  const [closedTrades, setClosedTrades]=useState<any[]>([])

  const {prices,refPrev,refPrices}=usePriceFeed()

  const tradesRef =useRef(openTrades);  tradesRef.current=openTrades
  const primaryRef=useRef(primary);     primaryRef.current=primary

  const inst      =INSTRUMENTS.find(i=>i.sym===sym)!
  const livePrice =prices[sym]||SEED[sym]
  const prevPrice =refPrev.current[sym]||livePrice
  const up        =livePrice>=prevPrice
  const execPrice =+(dir==='buy'?livePrice+inst.spread:livePrice).toFixed(inst.dec)
  const lotsNum   =Math.max(0.01,parseFloat(lots)||0.01)

  const balance    =primary?.balance??0
  const openPnl    =openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEED[t.symbol]),0)
  const equity     =balance+openPnl
  const usedMargin =openTrades.reduce((s,t)=>{
    const cur=prices[t.symbol]||SEED[t.symbol]
    const i=INSTRUMENTS.find(x=>x.sym===t.symbol)
    return s+(i?.lotUSD(cur)??LOT_SIZE)*t.lots/LEVERAGE
  },0)
  const freeMargin =equity-usedMargin
  const marginLvl  =usedMargin>0?(equity/usedMargin)*100:Infinity
  const reqMargin  =inst.lotUSD(execPrice)*lotsNum/LEVERAGE
  const maxLots    =Math.max(0,Math.floor(freeMargin*LEVERAGE/inst.lotUSD(execPrice)*100)/100)

  useEffect(()=>{
    if(!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open')
      .order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed')
      .order('closed_at',{ascending:false}).limit(50).then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  const handleBreach=useCallback(async(reason:string,trades:any[])=>{
    if(!primary) return
    toast('error','🚨','Account Breached',reason)
    const closed=await Promise.all(trades.map(async t=>{
      const ti   =INSTRUMENTS.find(i=>i.sym===t.symbol)!
      const cur  =refPrices.current[t.symbol]||SEED[t.symbol]
      const closeP=+(t.direction==='buy'?cur:cur+ti.spread).toFixed(ti.dec)
      const diff =t.direction==='buy'?closeP-t.open_price:t.open_price-closeP
      const units=['USD/JPY','GBP/JPY','EUR/JPY'].includes(t.symbol)?LOT_SIZE/closeP:ti.lotUSD(1)
      const netPnl=+(diff*units*t.lots).toFixed(2)
      const pips  =+(diff/ti.pip).toFixed(1)
      await supabase.from('trades').update({
        status:'closed',close_price:closeP,closed_at:new Date().toISOString(),
        pips,net_pnl:netPnl,gross_pnl:netPnl,close_reason:'breach',
      }).eq('id',t.id)
      return {...t,status:'closed',close_price:closeP,net_pnl:netPnl,pips}
    }))
    const newBal=+(balance+closed.reduce((s,t)=>s+(t.net_pnl||0),0)).toFixed(2)
    await supabase.from('accounts').update({
      status:'breached',phase:'breached',balance:newBal,equity:newBal,
      breached_at:new Date().toISOString(),breach_reason:reason,
    }).eq('id',primary.id)
    await supabase.from('notifications').insert([
      {user_id:primary.user_id,type:'breach',title:'🚨 Account Breached',
       body:`Account ${primary.account_number} auto-breached. ${reason}`,is_read:false,
       metadata:{account_id:primary.id,reason,balance:newBal}},
      {user_id:null,type:'breach',title:`🚨 Breach — ${primary.account_number}`,
       body:`Auto-breached. ${reason}. Final balance: $${newBal}`,is_read:false,
       metadata:{account_id:primary.id,account_number:primary.account_number,reason}},
    ])
    setOpenTrades([])
    setClosedTrades(p=>[...closed,...p])
  },[primary,refPrices,balance])

  useRiskMonitor(tradesRef,refPrices,primaryRef,primary?.id,handleBreach)

  async function placeOrder(){
    if(!primary)                                                       {toast('error','❌','No Account','No active account');return}
    if((primary as any).payout_locked||primary.status==='suspended')  {toast('error','⛔','Locked','Payout pending');return}
    if(primary.status==='breached'||primary.status==='passed')        {toast('error','⛔','Locked','Account not active');return}
    if(reqMargin>freeMargin)                                           {toast('error','⛔','Margin',`Need $${reqMargin.toFixed(2)}`);return}
    setPlacing(true);setConfirm(false)
    const {data,error}=await supabase.from('trades').insert({
      account_id:primary.id,user_id:primary.user_id,
      symbol:sym,direction:dir,lots:lotsNum,
      order_type:ordType.toLowerCase(),open_price:execPrice,
      sl:sl?+sl:null,tp:tp?+tp:null,
      status:'open',opened_at:new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if(error){toast('error','❌','Error',error.message);return}
    setOpenTrades(t=>[data,...t])
    toast('success','⚡','Placed',`${dir.toUpperCase()} ${lotsNum} ${sym} @ ${execPrice}`)
    setSl('');setTp('')
  }

  async function closeTrade(trade:any){
    const ti   =INSTRUMENTS.find(i=>i.sym===trade.symbol)!
    const cur  =refPrices.current[trade.symbol]||SEED[trade.symbol]
    const closeP=+(trade.direction==='buy'?cur:cur+ti.spread).toFixed(ti.dec)
    const diff =trade.direction==='buy'?closeP-trade.open_price:trade.open_price-closeP
    const units=['USD/JPY','GBP/JPY','EUR/JPY'].includes(trade.symbol)?LOT_SIZE/closeP:ti.lotUSD(1)
    const netPnl=+(diff*units*trade.lots).toFixed(2)
    const pips  =+(diff/ti.pip).toFixed(1)
    await supabase.from('trades').update({
      status:'closed',close_price:closeP,closed_at:new Date().toISOString(),
      pips,net_pnl:netPnl,gross_pnl:netPnl,
    }).eq('id',trade.id)
    const newBal=+(balance+netPnl).toFixed(2)
    await supabase.from('accounts').update({balance:newBal,equity:newBal}).eq('id',primary!.id)
    setOpenTrades(t=>t.filter(x=>x.id!==trade.id))
    setClosedTrades(t=>[{...trade,status:'closed',close_price:closeP,net_pnl:netPnl,pips},...t])
    toast(netPnl>=0?'success':'warning',netPnl>=0?'💰':'🔴','Closed',`${trade.symbol} ${netPnl>=0?'+':''}${fmt(netPnl)}`)
  }

  return(
  <>
  <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0A0A0F',color:'var(--text)',fontSize:12}}>

    {/* Watchlist */}
    <div style={{width:158,flexShrink:0,background:'var(--bg2)',borderRight:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:20,height:20,border:'1px solid var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--gold)'}}>✦</div>
        <span style={{fontFamily:'serif',fontSize:11,fontWeight:'bold',lineHeight:1.3}}>TFD<br/>Terminal</span>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {INSTRUMENTS.map(i=>{
          const cur =prices[i.sym]||SEED[i.sym]
          const prv =refPrev.current[i.sym]||cur
          const isUp=cur>=prv
          const live=prices[i.sym]>0&&Math.abs(prices[i.sym]-SEED[i.sym])>0.00001
          return(
            <div key={i.sym} onClick={()=>setSym(i.sym)} style={{
              padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid rgba(212,168,67,.04)',
              background:sym===i.sym?'rgba(212,168,67,.07)':'transparent',
              borderLeft:sym===i.sym?'2px solid var(--gold)':'2px solid transparent',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontWeight:600,fontSize:11}}>{i.sym}</span>
                <span style={{width:5,height:5,borderRadius:'50%',background:live?'var(--green)':'#444',transition:'background .5s'}}/>
              </div>
              <div style={{fontFamily:'monospace',fontSize:13,marginTop:2,fontWeight:700,color:isUp?'var(--green)':'var(--red)'}}>{cur.toFixed(i.dec)}</div>
              <div style={{fontSize:8,color:isUp?'var(--green)':'var(--red)',marginTop:1}}>{isUp?'▲':'▼'} {Math.abs(cur-prv).toFixed(i.dec)}</div>
            </div>
          )
        })}
      </div>
      <div style={{padding:'8px 12px',borderTop:'1px solid var(--bdr)'}}>
        {accounts.length>1
          ?<select value={selAccId??primary?.id??''} onChange={e=>setSelAccId(e.target.value)} style={{width:'100%',padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',color:'var(--text)',fontSize:9,fontFamily:'monospace',outline:'none',marginBottom:8}}>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          :<div style={{marginBottom:8,padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',fontSize:9,fontFamily:'monospace',color:'var(--gold)',textAlign:'center' as const}}>{primary?.account_number??'—'}</div>
        }
        <button onClick={()=>navigate('/dashboard')} style={{width:'100%',fontSize:9,letterSpacing:1,textTransform:'uppercase' as const,color:'var(--text3)',background:'none',border:'none',cursor:'pointer'}}>← Dashboard</button>
      </div>
    </div>

    {/* Main */}
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* Topbar */}
      <div style={{height:50,flexShrink:0,background:'var(--bg2)',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',padding:'0 14px',gap:10}}>
        <span style={{fontFamily:'serif',fontSize:16,fontWeight:'bold',flexShrink:0}}>{sym}</span>
        <span style={{fontFamily:'monospace',fontSize:22,fontWeight:700,flexShrink:0,minWidth:100,letterSpacing:-0.5,color:up?'var(--green)':'var(--red)'}}>{livePrice.toFixed(inst.dec)}</span>
        <span style={{fontSize:10,flexShrink:0,color:up?'var(--green)':'var(--red)'}}>{up?'▲':'▼'} {Math.abs(livePrice-prevPrice).toFixed(inst.dec)}</span>
        <div style={{display:'flex',gap:14,padding:'4px 14px',background:'rgba(0,0,0,.4)',border:'1px solid rgba(212,168,67,.1)',marginLeft:6,flexShrink:0}}>
          {[
            {l:'BALANCE',v:fmt(balance),c:'var(--gold)'},
            {l:'EQUITY', v:fmt(equity), c:equity>=balance?'var(--green)':'var(--red)'},
            {l:'P&L',    v:`${openPnl>=0?'+':''}${fmt(openPnl)}`,c:openPnl>=0?'var(--green)':'var(--red)'},
            {l:'FREE MARGIN',v:fmt(freeMargin),c:freeMargin<0?'var(--red)':'var(--text2)'},
            ...(usedMargin>0?[{l:'MARGIN',v:`${marginLvl.toFixed(0)}%`,c:marginLvl<150?'var(--red)':'var(--text2)'}]:[]),
          ].map(({l,v,c})=>(
            <div key={l} style={{flexShrink:0}}>
              <div style={{fontSize:7,letterSpacing:1.5,color:'var(--text3)',fontWeight:600,textTransform:'uppercase' as const}}>{l}</div>
              <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:c,marginTop:1}}>{v}</div>
            </div>
          ))}
        </div>
        {(primary as any)?.payout_locked&&<div style={{padding:'4px 10px',background:'rgba(212,168,67,.1)',border:'1px solid var(--bdr2)',fontSize:9,color:'var(--gold)',letterSpacing:1,fontWeight:600,textTransform:'uppercase' as const,flexShrink:0}}>⏳ Payout Pending</div>}
        <div style={{marginLeft:'auto',display:'flex',gap:2}}>
          {Object.keys(TF_POLY).map(t=>(
            <button key={t} onClick={()=>setTf(t)} style={{padding:'3px 7px',fontSize:9,fontFamily:'monospace',fontWeight:'bold',cursor:'pointer',background:tf===t?'rgba(212,168,67,.15)':'transparent',border:tf===t?'1px solid var(--bdr2)':'1px solid transparent',color:tf===t?'var(--gold)':'var(--text3)'}}>{t}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 6px var(--green)'}}/>
          <span style={{fontSize:9,color:'var(--green)',letterSpacing:1.5,textTransform:'uppercase' as const,fontWeight:600}}>Live</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{flex:1,overflow:'hidden'}}>
        <div key={`${sym}_${tf}`} style={{width:'100%',height:'100%'}}>
          <CandleChart sym={sym} tf={tf} livePrice={livePrice}/>
        </div>
      </div>

      {/* Bottom tabs */}
      <div style={{height:215,flexShrink:0,background:'var(--bg2)',borderTop:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',borderBottom:'1px solid var(--bdr)'}}>
          {[['positions',`Positions (${openTrades.length})`],['history',`History (${closedTrades.length})`],['account','Account']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{padding:'7px 14px',fontSize:9,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:600,cursor:'pointer',border:'none',marginBottom:-1,borderBottom:tab===k?'2px solid var(--gold)':'2px solid transparent',background:tab===k?'rgba(212,168,67,.04)':'transparent',color:tab===k?'var(--gold)':'var(--text3)'}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,overflow:'auto'}}>
          {tab==='positions'&&(openTrades.length===0
            ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:11}}>No open positions</div>
            :<table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
               <thead><tr style={{borderBottom:'1px solid var(--dim)'}}>
                 {['Symbol','Dir','Lots','Open','Current','P&L','DD%','SL','TP','Time',''].map(h=>(
                   <th key={h} style={{padding:'5px 10px',fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',textAlign:'left' as const,fontWeight:600}}>{h}</th>
                 ))}
               </tr></thead>
               <tbody>
                 {openTrades.map(t=>{
                   const cur =prices[t.symbol]||SEED[t.symbol]
                   const ti  =INSTRUMENTS.find(i=>i.sym===t.symbol)!
                   const pnl =calcPnl(t,cur)
                   const ddPct=balance>0?(pnl/balance)*100:0
                   const warn=ddPct<=-4
                   return(
                     <tr key={t.id} style={{borderBottom:'1px solid rgba(212,168,67,.04)',background:warn?'rgba(255,51,82,.05)':'transparent'}}>
                       <td style={{padding:'6px 10px',fontWeight:700}}>{t.symbol}</td>
                       <td style={{padding:'6px 10px'}}><span style={{fontSize:8,fontWeight:'bold',letterSpacing:1,color:t.direction==='buy'?'var(--green)':'var(--red)'}}>{t.direction.toUpperCase()}</span></td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace'}}>{t.lots}</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',color:'var(--text2)'}}>{t.open_price}</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',fontWeight:600,color:cur>=t.open_price?'var(--green)':'var(--red)'}}>{cur.toFixed(ti.dec)}</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',fontWeight:700,fontSize:11,color:pnl>=0?'var(--green)':'var(--red)'}}>{pnl>=0?'+':''}{fmt(pnl)}</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',fontSize:10,fontWeight:600,color:warn?'var(--red)':ddPct<0?'rgba(255,51,82,.7)':'var(--green)'}}>{ddPct>=0?'+':''}{ddPct.toFixed(2)}%</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',color:'var(--red)',fontSize:9}}>{t.sl??'—'}</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',color:'var(--green)',fontSize:9}}>{t.tp??'—'}</td>
                       <td style={{padding:'6px 10px',fontFamily:'monospace',fontSize:9,color:'var(--text3)'}}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                       <td style={{padding:'6px 10px'}}><button onClick={()=>closeTrade(t)} style={{padding:'3px 10px',fontSize:8,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',background:'rgba(255,51,82,.1)',color:'var(--red)',border:'1px solid rgba(255,51,82,.25)'}}>✕</button></td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
          )}
          {tab==='history'&&(closedTrades.length===0
            ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:11}}>No history</div>
            :<table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
               <thead><tr style={{borderBottom:'1px solid var(--dim)'}}>
                 {['Symbol','Dir','Lots','Open','Close','Pips','P&L','Reason','Date'].map(h=>(
                   <th key={h} style={{padding:'5px 10px',fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',textAlign:'left' as const,fontWeight:600}}>{h}</th>
                 ))}
               </tr></thead>
               <tbody>
                 {closedTrades.map(t=>(
                   <tr key={t.id} style={{borderBottom:'1px solid rgba(212,168,67,.04)'}}>
                     <td style={{padding:'6px 10px',fontWeight:700}}>{t.symbol}</td>
                     <td style={{padding:'6px 10px'}}><span style={{fontSize:8,fontWeight:'bold',color:t.direction==='buy'?'var(--green)':'var(--red)'}}>{t.direction.toUpperCase()}</span></td>
                     <td style={{padding:'6px 10px',fontFamily:'monospace'}}>{t.lots}</td>
                     <td style={{padding:'6px 10px',fontFamily:'monospace'}}>{t.open_price}</td>
                     <td style={{padding:'6px 10px',fontFamily:'monospace'}}>{t.close_price??'—'}</td>
                     <td style={{padding:'6px 10px',fontFamily:'monospace',color:(t.pips??0)>=0?'var(--green)':'var(--red)'}}>{t.pips!=null?`${t.pips>0?'+':''}${t.pips}`:'—'}</td>
                     <td style={{padding:'6px 10px',fontFamily:'monospace',fontWeight:700,color:(t.net_pnl??0)>=0?'var(--green)':'var(--red)'}}>{t.net_pnl!=null?`${t.net_pnl>=0?'+':''}${fmt(t.net_pnl)}`:'—'}</td>
                     <td style={{padding:'6px 10px',fontSize:9,color:t.close_reason==='breach'?'var(--red)':'var(--text3)'}}>{t.close_reason==='breach'?'🚨 Breach':'Manual'}</td>
                     <td style={{padding:'6px 10px',fontFamily:'monospace',fontSize:9,color:'var(--text3)'}}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
          {tab==='account'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,padding:16}}>
              {([
                ['Balance',    fmt(balance),                           'var(--gold)'],
                ['Equity',     fmt(equity),                            equity>=balance?'var(--green)':'var(--red)'],
                ['Open P&L',   `${openPnl>=0?'+':''}${fmt(openPnl)}`, openPnl>=0?'var(--green)':'var(--red)'],
                ['Free Margin',fmt(freeMargin),                         freeMargin<0?'var(--red)':'var(--text)'],
                ['Used Margin',fmt(usedMargin),                         'var(--text)'],
                ['Margin Lvl', usedMargin>0?`${marginLvl.toFixed(0)}%`:'∞',marginLvl<150&&usedMargin>0?'var(--red)':'var(--green)'],
                ['Leverage',   `1:${LEVERAGE}`,                         'var(--text2)'],
                ['Open Pos.',  String(openTrades.length),               'var(--text)'],
                ['Account',    primary?.account_number??'—',            'var(--gold)'],
                ['Phase',      primary?.phase??'—',                     'var(--text2)'],
              ] as [string,string,string][]).map(([l,v,c])=>(
                <div key={l}>
                  <div style={{fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:'monospace',fontSize:12,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Order Panel */}
    <div style={{width:210,flexShrink:0,background:'var(--bg2)',borderLeft:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
        <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:8}}>Order Panel</div>
        <div style={{display:'flex'}}>
          <button onClick={()=>setDir('buy')}  style={{flex:1,padding:'9px 0',fontSize:10,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:dir==='buy'?'var(--green)':'rgba(0,217,126,.08)',color:dir==='buy'?'#000':'var(--green)'}}>Buy</button>
          <button onClick={()=>setDir('sell')} style={{flex:1,padding:'9px 0',fontSize:10,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:dir==='sell'?'var(--red)':'rgba(255,51,82,.08)',color:dir==='sell'?'#fff':'var(--red)'}}>Sell</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
        <div style={{textAlign:'center' as const,padding:'10px 8px',border:`1px solid ${up?'rgba(0,217,126,.25)':'rgba(255,51,82,.25)'}`,background:'var(--bg3)'}}>
          <div style={{fontSize:8,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:3}}>{dir==='buy'?'Ask':'Bid'}</div>
          <div style={{fontFamily:'monospace',fontSize:22,fontWeight:700,letterSpacing:-1,color:up?'var(--green)':'var(--red)'}}>{execPrice.toFixed(inst.dec)}</div>
          <div style={{fontSize:8,color:'var(--text3)',marginTop:3}}>spread {inst.spread.toFixed(inst.dec)}</div>
        </div>
        <div>
          <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>Order Type</div>
          <div style={{display:'flex',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
            {['Market','Limit','Stop'].map(t=><button key={t} onClick={()=>setOrdType(t)} style={{flex:1,padding:'6px 0',fontSize:8,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:ordType===t?'rgba(212,168,67,.12)':'transparent',color:ordType===t?'var(--gold)':'var(--text3)'}}>{t}</button>)}
          </div>
        </div>
        <div>
          <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>Lot Size <span style={{fontWeight:400}}>max {maxLots}</span></div>
          <div style={{display:'flex',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
            <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 10px',background:'transparent',border:'none',borderRight:'1px solid var(--dim)',cursor:'pointer',color:'var(--text3)',fontSize:16}}>−</button>
            <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01" style={{flex:1,textAlign:'center' as const,padding:'8px 0',background:'transparent',border:'none',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:13}}/>
            <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 10px',background:'transparent',border:'none',borderLeft:'1px solid var(--dim)',cursor:'pointer',color:'var(--text3)',fontSize:16}}>+</button>
          </div>
        </div>
        {['Stop Loss','Take Profit'].map((l,i)=>{
          const v=i===0?sl:tp; const sv=i===0?setSl:setTp
          return(
            <div key={l}>
              <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>{l}</div>
              <input value={v} onChange={e=>sv(e.target.value)} placeholder="Optional" type="number" style={{width:'100%',padding:'8px',background:'var(--bg3)',border:'1px solid var(--dim)',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:12,boxSizing:'border-box' as const}}/>
            </div>
          )
        })}
        <div style={{background:'var(--bg3)',border:'1px solid var(--dim)',padding:'8px 10px'}}>
          {([['Req. Margin',`$${reqMargin.toFixed(2)}`,reqMargin>freeMargin?'var(--red)':'var(--text)'],['Free Margin',`$${freeMargin.toFixed(2)}`,freeMargin<reqMargin?'var(--red)':'var(--green)'],['Leverage',`1:${LEVERAGE}`,'var(--text3)']] as [string,string,string][]).map(([l,v,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:8,color:'var(--text3)'}}>{l}</span>
              <span style={{fontSize:9,fontFamily:'monospace',fontWeight:600,color:c}}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>setConfirm(true)} disabled={placing||!primary||reqMargin>freeMargin} style={{width:'100%',padding:'12px 0',fontSize:11,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',cursor:placing||!primary||reqMargin>freeMargin?'not-allowed':'pointer',border:'none',opacity:placing||!primary||reqMargin>freeMargin?0.35:1,background:dir==='buy'?'var(--green)':'var(--red)',color:dir==='buy'?'#000':'#fff'}}>
          {placing?'Placing…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
        </button>
      </div>
    </div>
  </div>

  {confirm&&(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(4px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'var(--bg2)',border:'1px solid var(--bdr2)',padding:24,minWidth:300}}>
        <div style={{fontFamily:'serif',fontSize:19,fontWeight:'bold',marginBottom:4}}>Confirm Order</div>
        <div style={{fontSize:11,color:'var(--text2)',marginBottom:16}}>Review before executing</div>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
          {([['Symbol',sym],['Direction',dir.toUpperCase()],['Type',ordType],['Lots',String(lotsNum)],['Price',String(execPrice)],['Margin',`$${reqMargin.toFixed(2)}`],['Account',primary?.account_number??'—']] as [string,string][]).map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
              <span style={{fontSize:8,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600}}>{l}</span>
              <span style={{fontFamily:'monospace',fontSize:12,color:v==='BUY'?'var(--green)':v==='SELL'?'var(--red)':'var(--text)'}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={()=>setConfirm(false)} style={{padding:'8px 18px',background:'transparent',border:'1px solid var(--bdr2)',color:'var(--text2)',fontSize:9,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer'}}>Cancel</button>
          <button onClick={placeOrder} style={{padding:'8px 22px',border:'none',fontSize:9,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',background:dir==='buy'?'var(--green)':'var(--red)',color:dir==='buy'?'#000':'#fff'}}>Confirm {dir.toUpperCase()}</button>
        </div>
      </div>
    </div>
  )}
  <ToastContainer toasts={toasts} dismiss={dismiss}/>
  </>
  )
}
