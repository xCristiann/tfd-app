import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ═══════════════════════════════════════════════════════════════════════════
   DATA SOURCES
   ───────────────────────────────────────────────────────────────────────────
   LIVE PRICES  → Binance aggTrade WebSocket (tick-by-tick, free, no key)
                  + Binance REST ticker/price poll every 1s (gap filler)
                  + Yahoo Finance REST poll 3s for NAS100

   INTRADAY     → Binance /api/v3/klines paginated
                  5 requests × 1000 candles = 5000 candles per symbol
                  EUR/USD=EURUSDT, GBP/USD=GBPUSDT, XAU=PAXGUSDT,
                  USD/JPY=USDTJPY, BTC=BTCUSDT, ETH=ETHUSDT
                  NAS100 intraday = Yahoo Finance /v8/finance/chart/^NDX

   DAILY (D1)   → Stooq.com CSV (free, no key, years of data, CORS open)
                  eurusd, gbpusd, xauusd, usdjpy, btcusd, %5endx
   ═══════════════════════════════════════════════════════════════════════════ */

const INSTRUMENTS = [
  { sym:'EUR/USD', bin:'EURUSDT',  stooq:'eurusd',  nasdaq:null,   spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', bin:'GBPUSDT',  stooq:'gbpusd',  nasdaq:null,   spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'XAU/USD', bin:'PAXGUSDT', stooq:'xauusd',  nasdaq:null,   spread:0.30,    dec:2, pip:0.10,   lotUSD:(p:number)=>p*100      },
  { sym:'NAS100',  bin:null,        stooq:'%5endx',  nasdaq:'^NDX', spread:1.0,     dec:1, pip:1.0,    lotUSD:(p:number)=>p*10       },
  { sym:'BTC/USD', bin:'BTCUSDT',  stooq:'btcusd',  nasdaq:null,   spread:10.0,    dec:1, pip:1.0,    lotUSD:(p:number)=>p          },
  { sym:'USD/JPY', bin:'USDTJPY',  stooq:'usdjpy',  nasdaq:null,   spread:0.020,   dec:3, pip:0.01,   lotUSD:(_:number)=>LOT_SIZE   },
  { sym:'ETH/USD', bin:'ETHUSDT',  stooq:'ethusd',  nasdaq:null,   spread:1.0,     dec:2, pip:1.0,    lotUSD:(p:number)=>p          },
]

const SEED: Record<string,number> = {
  'EUR/USD':1.1464,'GBP/USD':1.2940,'XAU/USD':2980,
  'NAS100':19200,'BTC/USD':83000,'USD/JPY':148.50,'ETH/USD':1900,
}

const BIN_INTERVAL: Record<string,string>  = { M1:'1m',M5:'5m',M15:'15m',M30:'30m',H1:'1h',H4:'4h',D1:'1d' }
const TF_SEC:       Record<string,number>  = { M1:60,M5:300,M15:900,M30:1800,H1:3600,H4:14400,D1:86400 }

type Candle = {time:number;open:number;high:number;low:number;close:number}

/* ─── LWC loader ─────────────────────────────────────────────────────────── */
let _lwcReady=false; const _lwcQ: Array<()=>void>=[]
function loadLWC(): Promise<void> {
  return new Promise(res=>{
    if(_lwcReady){res();return}
    _lwcQ.push(res)
    if(document.getElementById('lwc-s')) return
    const s=document.createElement('script')
    s.id='lwc-s'
    s.src='https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload=()=>{_lwcReady=true;_lwcQ.forEach(f=>f());_lwcQ.length=0}
    document.head.appendChild(s)
  })
}

/* ─── Binance klines — paginated to get 5000 candles ────────────────────── */
async function fetchBinanceCandles(binSym: string, tf: string): Promise<Candle[]> {
  if(tf==='D1') return []  // D1 uses Stooq
  const interval   = BIN_INTERVAL[tf]
  const secPerBar  = TF_SEC[tf]
  const pagesWanted = 5
  const limit       = 1000
  const all: Candle[] = []

  // Start from far enough back
  let endTime = Date.now()
  const startFrom = endTime - pagesWanted * limit * secPerBar * 1000

  // Fetch from oldest to newest using startTime progression
  let startTime = startFrom
  for(let page=0; page<pagesWanted; page++){
    try{
      const url = `https://api.binance.com/api/v3/klines` +
        `?symbol=${binSym}&interval=${interval}&startTime=${Math.floor(startTime)}&limit=${limit}`
      const r = await fetch(url)
      if(!r.ok) break
      const d: any[] = await r.json()
      if(!Array.isArray(d)||d.length===0) break
      for(const k of d){
        all.push({
          time:  Math.floor(k[0]/1000),
          open:  parseFloat(k[1]),
          high:  parseFloat(k[2]),
          low:   parseFloat(k[3]),
          close: parseFloat(k[4]),
        })
      }
      startTime = d[d.length-1][0] + 1  // next page starts after last candle
      if(d.length < limit) break          // no more data
    } catch{ break }
  }

  // Dedup + sort
  const seen=new Set<number>()
  return all
    .filter(c=>{if(seen.has(c.time))return false;seen.add(c.time);return true})
    .sort((a,b)=>a.time-b.time)
}

/* ─── Stooq CSV — daily history, years of data ──────────────────────────── */
async function fetchStooqCandles(stooqSym: string): Promise<Candle[]> {
  try{
    // Stooq returns CSV: Date,Open,High,Low,Close,Volume
    // ?e=csv forces CSV, &d1=yyyymmdd&d2=yyyymmdd for date range
    // Without date range = all history
    const url = `https://stooq.com/q/d/l/?s=${stooqSym}&i=d`
    const r = await fetch(url)
    if(!r.ok) throw new Error('stooq http')
    const text = await r.text()
    const lines = text.trim().split('\n')
    if(lines.length < 2) return []

    const candles: Candle[] = []
    // Skip header line
    for(let i=1; i<lines.length; i++){
      const parts = lines[i].split(',')
      if(parts.length < 5) continue
      const [dateStr, o, h, l, c] = parts
      // Date format: YYYY-MM-DD
      const ts = Math.floor(new Date(dateStr).getTime()/1000)
      if(!ts||isNaN(ts)) continue
      const open=parseFloat(o), high=parseFloat(h), low=parseFloat(l), close=parseFloat(c)
      if(!open||!high||!low||!close) continue
      candles.push({time:ts, open, high, low, close})
    }
    return candles.sort((a,b)=>a.time-b.time)
  }catch{ return [] }
}

/* ─── Yahoo Finance — NAS100 intraday ───────────────────────────────────── */
async function fetchYahooNas(tf: string): Promise<Candle[]> {
  const MAP: Record<string,{interval:string;range:string}> = {
    M1: {interval:'1m', range:'7d'},   M5: {interval:'5m',  range:'60d'},
    M15:{interval:'15m',range:'60d'},  M30:{interval:'30m', range:'60d'},
    H1: {interval:'1h', range:'2y'},   H4: {interval:'1h',  range:'2y'},
    D1: {interval:'1d', range:'10y'},
  }
  const {interval,range}=MAP[tf]??MAP.H1
  try{
    const r=await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/%5ENDX?interval=${interval}&range=${range}&includePrePost=false`,
      {headers:{'Accept':'application/json'}}
    )
    if(!r.ok) throw new Error('yahoo http')
    const d=await r.json()
    const res=d?.chart?.result?.[0]
    if(!res?.timestamp) return []
    const ts=res.timestamp as number[]
    const q=res.indicators?.quote?.[0]
    if(!q) return []
    let candles: Candle[] = ts
      .map((t:number,i:number)=>({time:t,open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i]}))
      .filter((c:any)=>c.open&&c.high&&c.low&&c.close) as Candle[]
    if(tf==='H4'){
      const agg: Candle[]=[]
      for(let i=0;i+3<candles.length;i+=4)
        agg.push({time:candles[i].time,open:candles[i].open,
          high:Math.max(candles[i].high,candles[i+1].high,candles[i+2].high,candles[i+3].high),
          low:Math.min(candles[i].low,candles[i+1].low,candles[i+2].low,candles[i+3].low),
          close:candles[i+3].close})
      return agg
    }
    return candles
  }catch{return []}
}

/* ─── Main candle fetcher ────────────────────────────────────────────────── */
async function fetchCandles(sym: string, tf: string): Promise<Candle[]> {
  const inst = INSTRUMENTS.find(i=>i.sym===sym)!

  if(tf==='D1'){
    // D1: Stooq for ALL symbols (years of daily data)
    if(sym==='NAS100') return fetchYahooNas('D1')   // Stooq ^NDX sometimes fails
    return fetchStooqCandles(inst.stooq)
  }

  if(sym==='NAS100'){
    return fetchYahooNas(tf)
  }

  // Intraday: Binance (5000 candles paginated)
  return fetchBinanceCandles(inst.bin!, tf)
}

/* ─── Chart component ────────────────────────────────────────────────────── */
function CandleChart({sym,tf,livePrice}:{sym:string;tf:string;livePrice:number}){
  const divRef  = useRef<HTMLDivElement>(null)
  const chartRef= useRef<any>(null)
  const serRef  = useRef<any>(null)
  const lastRef = useRef<Candle|null>(null)

  // Build chart + load history
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

      const candles=await fetchCandles(sym,tf)
      if(dead){ro.disconnect();return}

      if(candles.length>0){
        series.setData(candles)
        lastRef.current=candles[candles.length-1]
        chart.timeScale().fitContent()
      } else {
        // Seed with current price if no data
        const now=Math.floor(Date.now()/1000)
        const seed:Candle={time:now,open:livePrice,high:livePrice,low:livePrice,close:livePrice}
        lastRef.current=seed
        series.setData([seed])
      }
      return ()=>ro.disconnect()
    })
    return ()=>{dead=true}
  },[sym,tf])  // intentionally not re-running on livePrice change

  // Update last candle on every live tick
  useEffect(()=>{
    if(!serRef.current||livePrice<=0) return
    const sec=TF_SEC[tf]
    const now=Math.floor(Date.now()/1000)
    const cTime=Math.floor(now/sec)*sec
    const prev=lastRef.current
    const c:Candle=(!prev||cTime>prev.time)
      ? {time:cTime,open:livePrice,high:livePrice,low:livePrice,close:livePrice}
      : {time:prev.time,open:prev.open,high:Math.max(prev.high,livePrice),low:Math.min(prev.low,livePrice),close:livePrice}
    lastRef.current=c
    try{serRef.current.update(c)}catch{}
  },[livePrice,tf])

  return <div ref={divRef} style={{width:'100%',height:'100%'}}/>
}

/* ─── Price feed ─────────────────────────────────────────────────────────── */
function usePriceFeed(){
  const [prices,setPrices]=useState<Record<string,number>>({...SEED})
  const refPrev  =useRef<Record<string,number>>({...SEED})
  // refPrices always holds the LATEST price — used by risk monitor to avoid stale closure
  const refPrices=useRef<Record<string,number>>({...SEED})

  const push=useCallback((sym:string,price:number)=>{
    if(!price||isNaN(price)||price<=0) return
    const prev=refPrices.current[sym]||price
    refPrev.current[sym]=prev
    refPrices.current[sym]=price
    setPrices(p=>p[sym]===price?p:{...p,[sym]:price})
  },[])

  useEffect(()=>{
    let dead=false, ws:WebSocket, wsTimer:ReturnType<typeof setTimeout>
    let pollInterval:ReturnType<typeof setInterval>

    const binInsts=INSTRUMENTS.filter(i=>i.bin)
    const streams =binInsts.map(i=>`${i.bin!.toLowerCase()}@aggTrade`).join('/')
    const binMap  =Object.fromEntries(binInsts.map(i=>[i.bin!,i.sym]))

    // WebSocket — aggTrade = every single trade, real-time
    const connect=()=>{
      if(dead) return
      try{
        ws=new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
        ws.onmessage=({data})=>{
          try{
            const d=JSON.parse(data).data
            if(d?.s&&d?.p){const sym=binMap[d.s];if(sym)push(sym,parseFloat(d.p))}
          }catch{}
        }
        ws.onclose=()=>{if(!dead)wsTimer=setTimeout(connect,1500)}
        ws.onerror=()=>{try{ws.close()}catch{}}
      }catch{if(!dead)wsTimer=setTimeout(connect,3000)}
    }

    // REST ticker — fills gaps and updates NAS100
    const pollAll=async()=>{
      if(dead) return
      // Binance batch price
      try{
        const syms=binInsts.map(i=>`"${i.bin}"`).join(',')
        const arr:any[]=await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=[${syms}]`).then(r=>r.json())
        arr.forEach(x=>{const sym=binMap[x.symbol];if(sym)push(sym,parseFloat(x.price))})
      }catch{}
      // NAS100
      try{
        const d=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENDX?interval=1m&range=1d',
          {headers:{'Accept':'application/json'}}).then(r=>r.json())
        const closes=d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as (number|null)[]
        if(closes){for(let i=closes.length-1;i>=0;i--)if(closes[i]!=null&&closes[i]!>0){push('NAS100',closes[i]!);break}}
      }catch{}
    }

    connect()
    pollAll()
    pollInterval=setInterval(pollAll,1000)  // 1s REST sync for smooth prices

    return ()=>{
      dead=true;clearTimeout(wsTimer);clearInterval(pollInterval)
      try{ws?.close()}catch{}
    }
  },[push])

  return {prices,refPrev,refPrices}
}

/* ─── P&L ────────────────────────────────────────────────────────────────── */
function calcPnl(trade:any, price:number):number{
  const inst=INSTRUMENTS.find(i=>i.sym===trade.symbol)
  const diff=trade.direction==='buy'?price-trade.open_price:trade.open_price-price
  const units=trade.symbol==='USD/JPY'?LOT_SIZE/price:(inst?.lotUSD(1)??LOT_SIZE)
  return diff*units*trade.lots
}

/* ─── Risk monitor — interval-based, ref-only, NO stale closure ──────────── */
/*
  THE FIX: instead of useEffect([prices]) which has stale closure issues,
  we run setInterval(500ms) and read everything from refs.
  This guarantees breach triggers with the LATEST balance, prices, trades.
*/
function useRiskMonitor(
  tradesRef:   {current:any[]},
  pricesRef:   {current:Record<string,number>},
  primaryRef:  {current:any},
  onBreach:    (reason:string, trades:any[])=>void
){
  const firedRef   = useRef(false)
  const callbackRef= useRef(onBreach)
  callbackRef.current=onBreach

  useEffect(()=>{
    const iv=setInterval(()=>{
      const primary=primaryRef.current
      const trades =tradesRef.current
      const prices =pricesRef.current
      if(!primary||!trades.length||firedRef.current) return
      if(primary.status==='breached'||primary.status==='passed') return

      const balance   =primary.balance??0
      const startBal  =primary.starting_balance??balance
      if(balance<=0||startBal<=0) return

      // Get DD limits from challenge_products
      const cp   =(primary as any).challenge_products
      const phase=primary.phase??'phase1'
      const maxDDPct   = phase==='funded'?cp?.funded_max_dd??10  : phase==='phase2'?cp?.ph2_max_dd??10  : cp?.ph1_max_dd??10
      const dailyDDPct = phase==='funded'?cp?.funded_daily_dd??5 : phase==='phase2'?cp?.ph2_daily_dd??5 : cp?.ph1_daily_dd??5

      const maxDDFloor  = startBal*(1-maxDDPct/100)    // equity must stay above this
      const dailyHigh   = primary.daily_high_balance??balance
      const dailyFloor  = dailyHigh*(1-dailyDDPct/100) // equity must stay above this today

      // Compute current equity
      const floatPnl=trades.reduce((s,t)=>{
        const cur=prices[t.symbol]||SEED[t.symbol]||t.open_price
        return s+calcPnl(t,cur)
      },0)
      const equity=balance+floatPnl

      // Check 1: absolute max drawdown (equity below floor from starting balance)
      if(equity<=maxDDFloor){
        firedRef.current=true
        callbackRef.current(
          `Max drawdown breached — equity $${equity.toFixed(2)} below floor $${maxDDFloor.toFixed(2)} (${maxDDPct}% max DD)`,
          trades
        )
        return
      }

      // Check 2: daily drawdown (equity below daily floor)
      if(equity<dailyFloor){
        firedRef.current=true
        callbackRef.current(
          `Daily drawdown breached — equity $${equity.toFixed(2)} below daily floor $${dailyFloor.toFixed(2)} (${dailyDDPct}% daily DD)`,
          trades
        )
        return
      }

      // Check 3: single trade -5% of balance
      for(const t of trades){
        const cur   =prices[t.symbol]||SEED[t.symbol]||t.open_price
        const pnl   =calcPnl(t,cur)
        const pct   =(pnl/balance)*100
        if(pct<=-5){
          firedRef.current=true
          callbackRef.current(
            `Single trade ${t.symbol} hit ${pct.toFixed(2)}% loss (max -5% per trade)`,
            trades
          )
          return
        }
      }
    },500)
    return ()=>clearInterval(iv)
  },[])  // empty deps — interval runs forever, reads from refs

  // Reset when account changes
  useEffect(()=>{firedRef.current=false},[primaryRef.current?.id])
}

/* ─── Platform Page ──────────────────────────────────────────────────────── */
export function PlatformPage(){
  const navigate =useNavigate()
  const {toasts,toast,dismiss}=useToast()
  const {accounts,primary:defPrimary}=useAccount()
  const [selAccId,setSelAccId]=useState<string|null>(null)
  const primary=accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,      setSym]      =useState('BTC/USD')
  const [tf,       setTf]       =useState('H1')
  const [dir,      setDir]      =useState<'buy'|'sell'>('buy')
  const [lots,     setLots]     =useState('0.10')
  const [sl,       setSl]       =useState('')
  const [tp,       setTp]       =useState('')
  const [ordType,  setOrdType]  =useState('Market')
  const [tab,      setTab]      =useState('positions')
  const [confirm,  setConfirm]  =useState(false)
  const [placing,  setPlacing]  =useState(false)
  const [openTrades,  setOpenTrades]  =useState<any[]>([])
  const [closedTrades,setClosedTrades]=useState<any[]>([])

  const {prices,refPrev,refPrices}=usePriceFeed()

  // Refs for risk monitor — always latest values
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

  // Auto-breach handler
  const handleBreach=useCallback(async(reason:string,trades:any[])=>{
    if(!primary) return
    toast('error','🚨','Account Breached',reason)

    const closed=await Promise.all(trades.map(async t=>{
      const ti   =INSTRUMENTS.find(i=>i.sym===t.symbol)!
      const cur  =refPrices.current[t.symbol]||SEED[t.symbol]
      const closeP=+(t.direction==='buy'?cur:cur+ti.spread).toFixed(ti.dec)
      const diff =t.direction==='buy'?closeP-t.open_price:t.open_price-closeP
      const units=t.symbol==='USD/JPY'?LOT_SIZE/closeP:ti.lotUSD(1)
      const netPnl=+(diff*units*t.lots).toFixed(2)
      const pips  =+(diff/ti.pip).toFixed(1)
      await supabase.from('trades').update({
        status:'closed',close_price:closeP,closed_at:new Date().toISOString(),
        pips,net_pnl:netPnl,gross_pnl:netPnl,close_reason:'breach',
      }).eq('id',t.id)
      return {...t,status:'closed',close_price:closeP,net_pnl:netPnl,pips}
    }))

    const totalPnl=closed.reduce((s,t)=>s+(t.net_pnl||0),0)
    const newBal  =+(balance+totalPnl).toFixed(2)

    await supabase.from('accounts').update({
      status:'breached',phase:'breached',balance:newBal,equity:newBal,
      breached_at:new Date().toISOString(),breach_reason:reason,
    }).eq('id',primary.id)

    await supabase.from('notifications').insert([
      {user_id:primary.user_id,type:'breach',title:'🚨 Account Breached',
       body:`Account ${primary.account_number} was auto-breached. ${reason}`,
       is_read:false,metadata:{account_id:primary.id,reason,balance:newBal}},
      {user_id:null,type:'breach',title:`🚨 Breach — ${primary.account_number}`,
       body:`Auto-breached. ${reason}. Final balance: $${newBal}`,
       is_read:false,metadata:{account_id:primary.id,account_number:primary.account_number,reason}},
    ])

    setOpenTrades([])
    setClosedTrades(p=>[...closed,...p])
  },[primary,refPrices,balance])

  useRiskMonitor(tradesRef,refPrices,primaryRef,handleBreach)

  async function placeOrder(){
    if(!primary)                                                          {toast('error','❌','No Account','No active account');return}
    if((primary as any).payout_locked||primary.status==='suspended')     {toast('error','⛔','Locked','Payout pending');return}
    if(primary.status==='breached'||primary.status==='passed')           {toast('error','⛔','Locked','Account not active');return}
    if(reqMargin>freeMargin)                                              {toast('error','⛔','Margin',`Need $${reqMargin.toFixed(2)}`);return}
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
    const units=trade.symbol==='USD/JPY'?LOT_SIZE/closeP:ti.lotUSD(1)
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

  // UI helpers
  const L=(s:string)=>({fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4} as const)
  const mono=(color='var(--text)')=>({fontFamily:'monospace',fontSize:12,color} as const)

  return(
  <>
  <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0A0A0F',color:'var(--text)',fontSize:12}}>

    {/* ── Watchlist ── */}
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
          const live=prices[i.sym]>0&&Math.abs(prices[i.sym]-SEED[i.sym])>0.0001
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
          ?<select value={selAccId??primary?.id??''} onChange={e=>setSelAccId(e.target.value)}
              style={{width:'100%',padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',color:'var(--text)',fontSize:9,fontFamily:'monospace',outline:'none',marginBottom:8}}>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          :<div style={{marginBottom:8,padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',fontSize:9,fontFamily:'monospace',color:'var(--gold)',textAlign:'center' as const}}>{primary?.account_number??'—'}</div>
        }
        <button onClick={()=>navigate('/dashboard')} style={{width:'100%',fontSize:9,letterSpacing:1,textTransform:'uppercase' as const,color:'var(--text3)',background:'none',border:'none',cursor:'pointer'}}>← Dashboard</button>
      </div>
    </div>

    {/* ── Main ── */}
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* Topbar */}
      <div style={{height:50,flexShrink:0,background:'var(--bg2)',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',padding:'0 14px',gap:10}}>
        <span style={{fontFamily:'serif',fontSize:16,fontWeight:'bold',flexShrink:0}}>{sym}</span>
        <span style={{fontFamily:'monospace',fontSize:22,fontWeight:700,flexShrink:0,minWidth:100,letterSpacing:-0.5,color:up?'var(--green)':'var(--red)'}}>{livePrice.toFixed(inst.dec)}</span>
        <span style={{fontSize:10,flexShrink:0,color:up?'var(--green)':'var(--red)'}}>{up?'▲':'▼'} {Math.abs(livePrice-prevPrice).toFixed(inst.dec)}</span>
        <div style={{display:'flex',gap:14,padding:'4px 14px',background:'rgba(0,0,0,.4)',border:'1px solid rgba(212,168,67,.1)',marginLeft:6,flexShrink:0}}>
          {[
            {l:'BALANCE',    v:fmt(balance),                           c:'var(--gold)'},
            {l:'EQUITY',     v:fmt(equity),                            c:equity>=balance?'var(--green)':'var(--red)'},
            {l:'P&L',        v:`${openPnl>=0?'+':''}${fmt(openPnl)}`,  c:openPnl>=0?'var(--green)':'var(--red)'},
            {l:'FREE MARGIN',v:fmt(freeMargin),                         c:freeMargin<0?'var(--red)':'var(--text2)'},
            ...(usedMargin>0?[{l:'MARGIN LVL',v:`${marginLvl.toFixed(0)}%`,c:marginLvl<150?'var(--red)':'var(--text2)'}]:[]),
          ].map(({l,v,c})=>(
            <div key={l} style={{flexShrink:0}}>
              <div style={{fontSize:7,letterSpacing:1.5,color:'var(--text3)',fontWeight:600,textTransform:'uppercase' as const}}>{l}</div>
              <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:c,marginTop:1}}>{v}</div>
            </div>
          ))}
        </div>
        {(primary as any)?.payout_locked&&<div style={{padding:'4px 10px',background:'rgba(212,168,67,.1)',border:'1px solid var(--bdr2)',fontSize:9,color:'var(--gold)',letterSpacing:1,fontWeight:600,textTransform:'uppercase' as const,flexShrink:0}}>⏳ Payout Pending</div>}
        <div style={{marginLeft:'auto',display:'flex',gap:2}}>
          {Object.keys(BIN_INTERVAL).map(t=>(
            <button key={t} onClick={()=>setTf(t)} style={{padding:'3px 7px',fontSize:9,fontFamily:'monospace',fontWeight:'bold',cursor:'pointer',background:tf===t?'rgba(212,168,67,.15)':'transparent',border:tf===t?'1px solid var(--bdr2)':'1px solid transparent',color:tf===t?'var(--gold)':'var(--text3)'}}>{t}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 6px var(--green)'}}/>
          <span style={{fontSize:9,color:'var(--green)',letterSpacing:1.5,textTransform:'uppercase' as const,fontWeight:600}}>Live</span>
        </div>
      </div>

      {/* Chart — key forces full remount on sym/tf change */}
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
                    const cur  =prices[t.symbol]||SEED[t.symbol]
                    const ti   =INSTRUMENTS.find(i=>i.sym===t.symbol)!
                    const pnl  =calcPnl(t,cur)
                    const ddPct=balance>0?(pnl/balance)*100:0
                    const warn =ddPct<=-4
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
                        <td style={{padding:'6px 10px'}}>
                          <button onClick={()=>closeTrade(t)} style={{padding:'3px 10px',fontSize:8,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',background:'rgba(255,51,82,.1)',color:'var(--red)',border:'1px solid rgba(255,51,82,.25)'}}>✕</button>
                        </td>
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
                ['Balance',    fmt(balance),                            'var(--gold)'],
                ['Equity',     fmt(equity),                             equity>=balance?'var(--green)':'var(--red)'],
                ['Open P&L',   `${openPnl>=0?'+':''}${fmt(openPnl)}`,  openPnl>=0?'var(--green)':'var(--red)'],
                ['Free Margin',fmt(freeMargin),                          freeMargin<0?'var(--red)':'var(--text)'],
                ['Used Margin',fmt(usedMargin),                          'var(--text)'],
                ['Margin Lvl', usedMargin>0?`${marginLvl.toFixed(0)}%`:'∞', marginLvl<150&&usedMargin>0?'var(--red)':'var(--green)'],
                ['Leverage',   `1:${LEVERAGE}`,                          'var(--text2)'],
                ['Open Pos.',  String(openTrades.length),                'var(--text)'],
                ['Account',    primary?.account_number??'—',             'var(--gold)'],
                ['Phase',      primary?.phase??'—',                      'var(--text2)'],
              ] as [string,string,string][]).map(([l,v,c])=>(
                <div key={l}>
                  <div style={{...L(l)}}>{l}</div>
                  <div style={{...mono(c)}}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── Order Panel ── */}
    <div style={{width:210,flexShrink:0,background:'var(--bg2)',borderLeft:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
        <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:8}}>Order Panel</div>
        <div style={{display:'flex'}}>
          <button onClick={()=>setDir('buy')}  style={{flex:1,padding:'9px 0',fontSize:10,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:dir==='buy'?'var(--green)':'rgba(0,217,126,.08)',color:dir==='buy'?'#000':'var(--green)'}}>Buy</button>
          <button onClick={()=>setDir('sell')} style={{flex:1,padding:'9px 0',fontSize:10,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:dir==='sell'?'var(--red)':'rgba(255,51,82,.08)',color:dir==='sell'?'#fff':'var(--red)'}}>Sell</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
        {/* Price display */}
        <div style={{textAlign:'center' as const,padding:'10px 8px',border:`1px solid ${up?'rgba(0,217,126,.25)':'rgba(255,51,82,.25)'}`,background:'var(--bg3)'}}>
          <div style={{fontSize:8,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:3}}>{dir==='buy'?'Ask':'Bid'}</div>
          <div style={{fontFamily:'monospace',fontSize:22,fontWeight:700,letterSpacing:-1,color:up?'var(--green)':'var(--red)'}}>{execPrice.toFixed(inst.dec)}</div>
          <div style={{fontSize:8,color:'var(--text3)',marginTop:3}}>spread {inst.spread.toFixed(inst.dec)}</div>
        </div>
        {/* Order type */}
        <div>
          <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>Order Type</div>
          <div style={{display:'flex',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
            {['Market','Limit','Stop'].map(t=><button key={t} onClick={()=>setOrdType(t)} style={{flex:1,padding:'6px 0',fontSize:8,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:ordType===t?'rgba(212,168,67,.12)':'transparent',color:ordType===t?'var(--gold)':'var(--text3)'}}>{t}</button>)}
          </div>
        </div>
        {/* Lot size */}
        <div>
          <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>Lot Size <span style={{fontWeight:400}}>max {maxLots}</span></div>
          <div style={{display:'flex',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
            <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 10px',background:'transparent',border:'none',borderRight:'1px solid var(--dim)',cursor:'pointer',color:'var(--text3)',fontSize:16}}>−</button>
            <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01" style={{flex:1,textAlign:'center' as const,padding:'8px 0',background:'transparent',border:'none',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:13}}/>
            <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 10px',background:'transparent',border:'none',borderLeft:'1px solid var(--dim)',cursor:'pointer',color:'var(--text3)',fontSize:16}}>+</button>
          </div>
        </div>
        {/* SL/TP */}
        {(['Stop Loss','Take Profit'] as const).map((l,i)=>{
          const v=i===0?sl:tp; const sv=i===0?setSl:setTp
          return(
            <div key={l}>
              <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>{l}</div>
              <input value={v} onChange={e=>sv(e.target.value)} placeholder="Optional" type="number" style={{width:'100%',padding:'8px',background:'var(--bg3)',border:'1px solid var(--dim)',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:12,boxSizing:'border-box' as const}}/>
            </div>
          )
        })}
        {/* Margin info */}
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

  {/* Confirm modal */}
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
