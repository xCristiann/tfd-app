import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ═══════════════════════════════════════════════════════════════════
   DATA STRATEGY
   ─────────────────────────────────────────────────────────────────
   Live prices: Polygon.io WebSocket (forex real-time)
                + Polygon REST snapshot (indices + metals)
   Candles:     Polygon.io REST /v2/aggs (real OHLC, up to date, free)
   API key:     G6lKjTXfN4R1XHY6DoFAsIvDymYQ7fNO
   ═══════════════════════════════════════════════════════════════════ */
const POLY = 'G6lKjTXfN4R1XHY6DoFAsIvDymYQ7fNO'

/* ── All instruments ─────────────────────────────────────────────── */
const ALL_INSTRUMENTS = [
  // ── Forex major ───────────────────────────────────────────────────
  { sym:'EUR/USD', poly:'C:EURUSD', market:'forex', spread:0.00010, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', poly:'C:GBPUSD', market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', poly:'C:USDJPY', market:'forex', spread:0.010,   dec:3, pip:0.01,   cat:'forex', lotUSD:(_:number)=>LOT_SIZE   },
  { sym:'USD/CHF', poly:'C:USDCHF', market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', poly:'C:AUDUSD', market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', poly:'C:USDCAD', market:'forex', spread:0.00020, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>1/p*LOT_SIZE },
  { sym:'NZD/USD', poly:'C:NZDUSD', market:'forex', spread:0.00020, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  // ── Forex minor ───────────────────────────────────────────────────
  { sym:'GBP/JPY', poly:'C:GBPJPY', market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/JPY', poly:'C:EURJPY', market:'forex', spread:0.025,   dec:3, pip:0.01,   cat:'forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', poly:'C:EURGBP', market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*1.29*LOT_SIZE },
  { sym:'AUD/JPY', poly:'C:AUDJPY', market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/CHF', poly:'C:EURCHF', market:'forex', spread:0.00020, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'EUR/AUD', poly:'C:EURAUD', market:'forex', spread:0.00030, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*0.65*LOT_SIZE },
  { sym:'EUR/CAD', poly:'C:EURCAD', market:'forex', spread:0.00030, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*0.74*LOT_SIZE },
  { sym:'GBP/CHF', poly:'C:GBPCHF', market:'forex', spread:0.00025, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/AUD', poly:'C:GBPAUD', market:'forex', spread:0.00030, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*0.65*LOT_SIZE },
  { sym:'GBP/CAD', poly:'C:GBPCAD', market:'forex', spread:0.00030, dec:5, pip:0.0001, cat:'forex', lotUSD:(p:number)=>p*0.74*LOT_SIZE },
  { sym:'CAD/JPY', poly:'C:CADJPY', market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'CHF/JPY', poly:'C:CHFJPY', market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'USD/MXN', poly:'C:USDMXN', market:'forex', spread:0.050,   dec:4, pip:0.0001, cat:'forex', lotUSD:(_:number)=>LOT_SIZE*0.055 },
  // ── Metals ────────────────────────────────────────────────────────
  { sym:'XAU/USD', poly:'C:XAUUSD', market:'forex', spread:0.30,    dec:2, pip:0.10,   cat:'metals',lotUSD:(p:number)=>p*100   },
  { sym:'XAG/USD', poly:'C:XAGUSD', market:'forex', spread:0.030,   dec:4, pip:0.001,  cat:'metals',lotUSD:(p:number)=>p*5000  },
  // ── US Indices ────────────────────────────────────────────────────
  // Indices: Polygon free supports stocks not indices
  // Use ETF proxies: QQQ=NDX/40, SPY=SPX/10, DIA=DJI/100, IWM=RUT/10
  // EWG=DAX/740, EWU=FTSE/240, EWQ=CAC/70
  { sym:'NAS100',  poly:'QQQ',   idxMult:40,   market:'us',  spread:1.5,  dec:1, pip:1.0,  cat:'index', lotUSD:(p:number)=>p*400  },
  { sym:'US500',   poly:'SPY',   idxMult:10,   market:'us',  spread:0.50, dec:2, pip:0.10, cat:'index', lotUSD:(p:number)=>p*500  },
  { sym:'US30',    poly:'DIA',   idxMult:100,  market:'us',  spread:2.0,  dec:1, pip:1.0,  cat:'index', lotUSD:(p:number)=>p*5000 },
  { sym:'US2000',  poly:'IWM',   idxMult:10,   market:'us',  spread:1.0,  dec:2, pip:0.10, cat:'index', lotUSD:(p:number)=>p*500  },
  { sym:'VIX',     poly:'VIXY',  idxMult:1,    market:'us',  spread:0.10, dec:2, pip:0.01, cat:'index', lotUSD:(p:number)=>p*100  },
  // ── EU Indices ────────────────────────────────────────────────────
  { sym:'GER40',   poly:'EWG',   idxMult:740,  market:'eu',  spread:1.0,  dec:1, pip:1.0,  cat:'index', lotUSD:(p:number)=>p*18500},
  { sym:'UK100',   poly:'EWU',   idxMult:240,  market:'uk',  spread:1.0,  dec:1, pip:1.0,  cat:'index', lotUSD:(p:number)=>p*2400 },
  { sym:'FRA40',   poly:'EWQ',   idxMult:70,   market:'eu',  spread:1.0,  dec:1, pip:1.0,  cat:'index', lotUSD:(p:number)=>p*1400 },
]

const SEED: Record<string,number> = {
  'EUR/USD':1.0853,'GBP/USD':1.2940,'USD/JPY':148.50,'USD/CHF':0.8820,
  'AUD/USD':0.6350,'USD/CAD':1.3580,'NZD/USD':0.5780,'GBP/JPY':192.50,
  'EUR/JPY':170.20,'EUR/GBP':0.8380,'AUD/JPY':94.30,'EUR/CHF':0.9560,
  'EUR/AUD':1.7080,'EUR/CAD':1.5640,'GBP/CHF':1.1250,'GBP/AUD':2.0450,
  'GBP/CAD':1.8720,'CAD/JPY':109.30,'CHF/JPY':168.50,'USD/MXN':20.050,
  'XAU/USD':2980.0,'XAG/USD':33.50,
  'NAS100':21700,'US500':5750,'US30':42800,'US2000':2080,'VIX':18.5,
  'GER40':22500,'UK100':8700,'FRA40':8200,
}

const TF_CONFIG: Record<string,{mult:number;span:string;daysBack:number;sec:number}> = {
  M1:  {mult:1,  span:'minute',daysBack:3,   sec:60    },
  M5:  {mult:5,  span:'minute',daysBack:14,  sec:300   },
  M15: {mult:15, span:'minute',daysBack:30,  sec:900   },
  M30: {mult:30, span:'minute',daysBack:60,  sec:1800  },
  H1:  {mult:1,  span:'hour',  daysBack:180, sec:3600  },
  H4:  {mult:4,  span:'hour',  daysBack:365, sec:14400 },
  D1:  {mult:1,  span:'day',   daysBack:1825,sec:86400 },
}

type Candle = {time:number;open:number;high:number;low:number;close:number}

/* ══════════════════════════════════════════════════════════════════
   MARKET HOURS (CFD hours, source: tradermade.com/cfd-opening-times)
   ══════════════════════════════════════════════════════════════════ */
function getMarketStatus(market:string):{open:boolean;label:string;nextOpen:string} {
  const now=new Date()
  const day=now.getUTCDay(), hm=now.getUTCHours()*60+now.getUTCMinutes()
  const month=now.getUTCMonth()+1, summer=month>=3&&month<=10
  const fmtD=(d:Date)=>d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'})
  const nextDay=(dd:number,hh:number,mm:number)=>{const d=new Date(now);let add=(dd-day+7)%7;if(add===0&&hm>=hh*60+mm)add=7;d.setUTCDate(d.getUTCDate()+add);d.setUTCHours(hh,mm,0,0);return fmtD(d)}

  if(market==='forex'){
    const closed=day===6||(day===0&&hm<22*60)||(day===5&&hm>=21*60+45)
    const brk=!closed&&hm>=21*60+45&&hm<22*60
    if(!closed&&!brk) return {open:true,label:'Forex Open 24/5',nextOpen:''}
    if(brk) return {open:false,label:'Daily Break 21:45–22:00 UTC',nextOpen:'Reopens 22:00 UTC'}
    const d=new Date(now)
    if(day===6){d.setUTCDate(d.getUTCDate()+1);d.setUTCHours(22,0,0,0)}
    else if(day===0)d.setUTCHours(22,0,0,0)
    else{d.setUTCDate(d.getUTCDate()+2);d.setUTCHours(22,0,0,0)}
    return {open:false,label:'Forex Closed — Weekend',nextOpen:fmtD(d)}
  }
  if(market==='us'){
    const openH=summer?22:23
    const b1s=summer?20*60+15:21*60+15, b1e=summer?20*60+30:21*60+30
    const b2s=summer?21*60:22*60,       b2e=summer?22*60:23*60
    if(day===6||(day===0&&hm<openH*60)||(day===5&&hm>=b1s))
      return {open:false,label:'US Indices Closed — Weekend',nextOpen:nextDay(0,openH,0)}
    if(hm>=b1s&&hm<b1e) return {open:false,label:'US Indices — Daily Break',nextOpen:`Reopens ${summer?'20:30':'21:30'} UTC`}
    if(hm>=b2s&&hm<b2e) return {open:false,label:'US Indices — Daily Break',nextOpen:`Reopens ${summer?'22:00':'23:00'} UTC`}
    return {open:true,label:'US Indices Open (CFD 24/5)',nextOpen:''}
  }
  if(market==='eu'||market==='uk'){
    const name=market==='eu'?'EU Indices':'UK100'
    if(day===0||day===6) return {open:false,label:`${name} Closed — Weekend`,nextOpen:nextDay(1,7,0)}
    if(hm>=7*60&&hm<21*60) return {open:true,label:`${name} Open`,nextOpen:''}
    const d=new Date(now)
    if(hm>=21*60){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()+2);else if(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()+1)}
    d.setUTCHours(7,0,0,0)
    return {open:false,label:hm<7*60?`${name} Pre-Market`:`${name} After Hours`,nextOpen:fmtD(d)}
  }
  return {open:true,label:'Open',nextOpen:''}
}

/* ── LWC loader ──────────────────────────────────────────────────── */
let _lwcReady=false;const _lwcQ:Array<()=>void>=[]
function loadLWC():Promise<void>{
  return new Promise(res=>{
    if(_lwcReady){res();return}_lwcQ.push(res)
    if(document.getElementById('lwc-s'))return
    const s=document.createElement('script')
    s.id='lwc-s';s.src='https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload=()=>{_lwcReady=true;_lwcQ.forEach(f=>f());_lwcQ.length=0}
    document.head.appendChild(s)
  })
}

/* ── Polygon candles ─────────────────────────────────────────────── */
async function fetchCandles(polyTicker:string, tf:string, idxMult=1):Promise<Candle[]>{
  const {mult,span,daysBack}=TF_CONFIG[tf]??TF_CONFIG.H1
  const to=new Date(), from=new Date(Date.now()-daysBack*86400*1000)
  const fmtDate=(d:Date)=>d.toISOString().split('T')[0]
  const url=`https://api.polygon.io/v2/aggs/ticker/${polyTicker}/range/${mult}/${span}/${fmtDate(from)}/${fmtDate(to)}?adjusted=true&sort=asc&limit=50000&apiKey=${POLY}`
  try{
    const r=await fetch(url)
    if(!r.ok) throw new Error(`HTTP ${r.status}`)
    const d=await r.json()
    if(!d.results?.length){
      console.warn('[Polygon candles] no results for',polyTicker,tf,'status:',d.status,'message:',d.message)
      return []
    }
    return (d.results as any[]).map((b:any)=>({
      time:  Math.floor(b.t/1000),
      open:  +(b.o*idxMult).toFixed(idxMult>1?1:6),
      high:  +(b.h*idxMult).toFixed(idxMult>1?1:6),
      low:   +(b.l*idxMult).toFixed(idxMult>1?1:6),
      close: +(b.c*idxMult).toFixed(idxMult>1?1:6),
    }))
  }catch(e){
    console.warn('[Polygon candles]',polyTicker,tf,e)
    return []
  }
}

/* ── Chart with SL/TP lines ─────────────────────────────────────── */
interface ChartProps {
  sym:string; tf:string; livePrice:number
  onLastClose:(p:number)=>void
  openTrades:any[]
  onUpdateSLTP:(tradeId:string, sl:number|null, tp:number|null)=>void
}

function CandleChart({sym,tf,livePrice,onLastClose,openTrades,onUpdateSLTP}:ChartProps){
  const divRef  =useRef<HTMLDivElement>(null)
  const chartRef=useRef<any>(null)
  const serRef  =useRef<any>(null)
  const lastRef =useRef<Candle|null>(null)
  const linesRef=useRef<Map<string,{entry:any;sl:any;tp:any}>>(new Map())

  // Build/destroy chart when sym or tf changes
  useEffect(()=>{
    const el=divRef.current;if(!el)return
    let dead=false
    loadLWC().then(async()=>{
      if(dead||!divRef.current)return
      try{chartRef.current?.remove()}catch{}
      linesRef.current.clear()
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
      chartRef.current=chart;serRef.current=series
      const ro=new ResizeObserver(()=>{if(chartRef.current&&divRef.current)chartRef.current.resize(divRef.current.clientWidth,divRef.current.clientHeight)})
      ro.observe(el)
      const inst=ALL_INSTRUMENTS.find(i=>i.sym===sym)! as any
      const candles=await fetchCandles(inst.poly, tf, inst.idxMult??1)
      if(dead){ro.disconnect();return}
      if(candles.length>0){
        series.setData(candles)
        lastRef.current=candles[candles.length-1]
        chart.timeScale().fitContent()
        onLastClose(candles[candles.length-1].close)
      } else {
        const seed:Candle={time:Math.floor(Date.now()/1000),open:livePrice,high:livePrice,low:livePrice,close:livePrice}
        lastRef.current=seed;series.setData([seed])
      }
      return ()=>ro.disconnect()
    })
    return ()=>{dead=true}
  },[sym,tf])

  // Update live candle
  useEffect(()=>{
    if(!serRef.current||livePrice<=0)return
    const sec=TF_CONFIG[tf].sec
    const now=Math.floor(Date.now()/1000)
    const cTime=Math.floor(now/sec)*sec
    const prev=lastRef.current
    const c:Candle=(!prev||cTime>prev.time)
      ?{time:cTime,open:livePrice,high:livePrice,low:livePrice,close:livePrice}
      :{time:prev.time,open:prev.open,high:Math.max(prev.high,livePrice),low:Math.min(prev.low,livePrice),close:livePrice}
    lastRef.current=c
    try{serRef.current.update(c)}catch{}
  },[livePrice,tf])

  // Draw/update SL TP Entry lines for open trades on this symbol
  useEffect(()=>{
    const chart=chartRef.current;const series=serRef.current
    if(!chart||!series)return
    const inst=ALL_INSTRUMENTS.find(i=>i.sym===sym)
    const trades=openTrades.filter(t=>t.symbol===sym)
    const existingIds=new Set(linesRef.current.keys())

    // Remove lines for closed trades
    existingIds.forEach(id=>{
      if(!trades.find(t=>t.id===id)){
        const lines=linesRef.current.get(id)
        if(lines){
          try{series.removePriceLine(lines.entry)}catch{}
          try{if(lines.sl)series.removePriceLine(lines.sl)}catch{}
          try{if(lines.tp)series.removePriceLine(lines.tp)}catch{}
        }
        linesRef.current.delete(id)
      }
    })

    // Add/update lines for open trades
    trades.forEach(t=>{
      const existing=linesRef.current.get(t.id)
      const dec=inst?.dec??5

      if(!existing){
        // Create entry line
        const entryLine=series.createPriceLine({
          price:t.open_price,
          color:t.direction==='buy'?'rgba(0,217,126,0.8)':'rgba(255,51,82,0.8)',
          lineWidth:1,lineStyle:2,axisLabelVisible:true,
          title:`${t.direction.toUpperCase()} ${t.lots}`,
        })
        // Create SL line
        const slLine=t.sl?series.createPriceLine({
          price:t.sl,color:'rgba(255,51,82,0.9)',lineWidth:1,lineStyle:1,
          axisLabelVisible:true,title:'SL',draggable:true,
        }):null
        // Create TP line
        const tpLine=t.tp?series.createPriceLine({
          price:t.tp,color:'rgba(0,217,126,0.9)',lineWidth:1,lineStyle:1,
          axisLabelVisible:true,title:'TP',draggable:true,
        }):null
        linesRef.current.set(t.id,{entry:entryLine,sl:slLine,tp:tpLine})
      } else {
        // Update prices if changed
        try{existing.entry.applyOptions({price:t.open_price})}catch{}
        if(existing.sl&&t.sl) try{existing.sl.applyOptions({price:t.sl})}catch{}
        if(existing.tp&&t.tp) try{existing.tp.applyOptions({price:t.tp})}catch{}
      }
    })
  },[openTrades,sym])

  return <div ref={divRef} style={{width:'100%',height:'100%'}}/>
}

/* ── Margin calculation ──────────────────────────────────────────── */
/*
  Correct formula:
  Required Margin = (Lots × Contract Size) / Leverage
  For EUR/USD: 1 lot = 100,000 EUR, margin = 100,000 / 50 = $2,000 per lot
  For XAU/USD: 1 lot = 100 oz, price ~$3000, notional = $300,000, margin = $300,000/50 = $6,000
  For NAS100:  1 lot = index×10, price ~21700, notional = $217,000, margin = $217,000/50 = $4,340

  lotUSD(price) returns the USD notional value of 1 lot at current price
  reqMargin = lotUSD(execPrice) * lots / LEVERAGE
*/

/* ── P&L ─────────────────────────────────────────────────────────── */
function calcPnl(trade:any,price:number):number{
  const inst=ALL_INSTRUMENTS.find(i=>i.sym===trade.symbol)
  if(!inst)return 0
  const diff=trade.direction==='buy'?price-trade.open_price:trade.open_price-price
  // For JPY pairs: pip value in USD needs /price conversion
  const isJpy=trade.symbol.includes('JPY')
  const units=isJpy?LOT_SIZE/price:inst.lotUSD(1)
  return diff*units*trade.lots
}

/* ── Price feed ──────────────────────────────────────────────────── */
function usePriceFeed(){
  const [prices,setPrices]=useState<Record<string,number>>({...SEED})
  const refPrev  =useRef<Record<string,number>>({...SEED})
  const refPrices=useRef<Record<string,number>>({...SEED})

  const push=useCallback((sym:string,price:number)=>{
    if(!price||isNaN(price)||price<=0)return
    refPrev.current[sym]=refPrices.current[sym]||price
    refPrices.current[sym]=price
    setPrices(p=>p[sym]===price?p:{...p,[sym]:price})
  },[])

  useEffect(()=>{
    let dead=false,ws:WebSocket,wsTimer:ReturnType<typeof setTimeout>,pollTimer:ReturnType<typeof setInterval>

    // Polygon Forex WebSocket
    const connectWS=()=>{
      if(dead)return
      try{
        ws=new WebSocket('wss://socket.polygon.io/forex')
        ws.onopen=()=>ws.send(JSON.stringify({action:'auth',params:POLY}))
        ws.onmessage=({data})=>{
          try{
            const msgs:any[]=JSON.parse(data)
            for(const msg of msgs){
              if(msg.ev==='status'&&msg.status==='auth_success'){
                const subs=ALL_INSTRUMENTS.filter(i=>i.poly.startsWith('C:')).map(i=>`C.${i.sym}`).join(',')
                ws.send(JSON.stringify({action:'subscribe',params:subs}))
              }
              if(msg.ev==='C'&&msg.p){
                const mid=((msg.bp||0)+(msg.ap||0))/2||msg.l||0
                const inst=ALL_INSTRUMENTS.find(i=>i.sym===msg.p)
                if(inst&&mid>0)push(inst.sym,mid)
              }
            }
          }catch{}
        }
        ws.onclose=()=>{if(!dead)wsTimer=setTimeout(connectWS,2000)}
        ws.onerror=()=>{try{ws.close()}catch{}}
      }catch{if(!dead)wsTimer=setTimeout(connectWS,3000)}
    }

    // REST poll — indices (Polygon prev day) + all instruments as backup
    const pollAll=async()=>{
      if(dead)return

      // 1. Forex + Metals snapshot (C: tickers)
      const forexTickers=ALL_INSTRUMENTS.filter(i=>i.poly.startsWith('C:')).map(i=>i.poly).join(',')
      try{
        const r=await fetch(`https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?tickers=${forexTickers}&apiKey=${POLY}`)
        const d=await r.json()
        if(d.tickers){for(const t of d.tickers){
          const inst=ALL_INSTRUMENTS.find(i=>i.poly===t.ticker)
          if(!inst)continue
          // Try multiple price fields in order of preference
          const price=t.lastQuote?.mp // midpoint
            ||((t.lastQuote?.ap||0)+(t.lastQuote?.bp||0))/2
            ||t.day?.c||t.lastTrade?.p||0
          if(price>0)push(inst.sym,price)
        }}
      }catch{}

      // 2. ETF stocks snapshot for indices (Polygon free supports stocks)
      const idxInsts=(ALL_INSTRUMENTS as any[]).filter(i=>i.idxMult)
      const etfTickers=idxInsts.map((i:any)=>i.poly).join(',')
      try{
        const r=await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${etfTickers}&apiKey=${POLY}`)
        const d=await r.json()
        if(d.tickers){for(const t of d.tickers){
          const inst=idxInsts.find((i:any)=>i.poly===t.ticker)
          if(!inst)continue
          const etfPrice=t.day?.c||t.lastTrade?.p||t.prevDay?.c||0
          if(etfPrice>0)push(inst.sym, Math.round(etfPrice*(inst as any).idxMult*10)/10)
        }}
      }catch{}
    }

    connectWS()
    pollAll()
    pollTimer=setInterval(pollAll,5000)
    return ()=>{
      dead=true;clearTimeout(wsTimer);clearInterval(pollTimer)
      try{ws?.close()}catch{}
    }
  },[push])

  return {prices,refPrev,refPrices,push}
}

/* ── Risk Monitor ─────────────────────────────────────────────────── */
function useRiskMonitor(
  tradesRef:{current:any[]},pricesRef:{current:Record<string,number>},
  primaryRef:{current:any},accountId:string|null|undefined,
  onBreach:(reason:string,trades:any[])=>void
){
  const firedRef=useRef(false)
  const cbRef=useRef(onBreach);cbRef.current=onBreach
  useEffect(()=>{
    const iv=setInterval(()=>{
      const primary=primaryRef.current,trades=tradesRef.current,prices=pricesRef.current
      if(!primary||!trades.length||firedRef.current)return
      if(primary.status==='breached'||primary.status==='passed')return
      const balance=primary.balance??0,startBal=primary.starting_balance??balance
      if(balance<=0||startBal<=0)return
      const cp=(primary as any).challenge_products,phase=primary.phase??'phase1'
      const maxDDPct  =phase==='funded'?(cp?.funded_max_dd??10):phase==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10)
      const dailyDDPct=phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)
      const maxDDFloor=startBal-startBal*(maxDDPct/100)
      const dailyHigh=primary.daily_high_balance??startBal
      const dailyFloor=dailyHigh-dailyHigh*(dailyDDPct/100)
      const floatPnl=trades.reduce((s:number,t:any)=>s+calcPnl(t,prices[t.symbol]||SEED[t.symbol]||t.open_price),0)
      const equity=balance+floatPnl
      if(equity<=maxDDFloor){firedRef.current=true;cbRef.current(`Max drawdown breached — equity $${equity.toFixed(2)} ≤ floor $${maxDDFloor.toFixed(2)} (${maxDDPct}%)`,trades);return}
      if(equity<=dailyFloor){firedRef.current=true;cbRef.current(`Daily drawdown breached — equity $${equity.toFixed(2)} ≤ floor $${dailyFloor.toFixed(2)} (${dailyDDPct}% daily)`,trades);return}
      for(const t of trades){
        const cur=prices[t.symbol]||SEED[t.symbol]||t.open_price
        const pct=(calcPnl(t,cur)/startBal)*100
        if(pct<=-5){firedRef.current=true;cbRef.current(`${t.symbol} loss ${pct.toFixed(2)}% of account (limit -5%)`,trades);return}
      }
    },500)
    return ()=>clearInterval(iv)
  },[])
  useEffect(()=>{firedRef.current=false},[accountId])
}

/* ══════════════════════════════════════════════════════════════════
   PLATFORM PAGE
   ══════════════════════════════════════════════════════════════════ */
export function PlatformPage(){
  const navigate=useNavigate()
  const {toasts,toast,dismiss}=useToast()
  const {accounts,primary:defPrimary}=useAccount()
  const [selAccId,setSelAccId]=useState<string|null>(null)
  const primary=accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,    setSym]   =useState('EUR/USD')
  const [tf,     setTf]    =useState('H1')
  const [dir,    setDir]   =useState<'buy'|'sell'>('buy')
  const [lots,   setLots]  =useState('0.10')
  const [sl,     setSl]    =useState('')
  const [tp,     setTp]    =useState('')
  const [ordType,setOrdType]=useState('Market')
  const [tab,    setTab]   =useState('positions')
  const [confirm,setConfirm]=useState(false)
  const [placing,setPlacing]=useState(false)
  const [openTrades,   setOpenTrades]  =useState<any[]>([])
  const [closedTrades, setClosedTrades]=useState<any[]>([])

  // Watchlist state
  const [search,     setSearch]    =useState('')
  const [favorites,  setFavorites] =useState<Set<string>>(()=>{
    try{return new Set(JSON.parse(localStorage.getItem('tfd_favs')||'[]'))}catch{return new Set(['EUR/USD','GBP/USD','XAU/USD','NAS100','US30'])}
  })
  const [editSLTP,   setEditSLTP]  =useState<{id:string;sl:string;tp:string}|null>(null)

  const {prices,refPrev,refPrices,push}=usePriceFeed()
  const tradesRef =useRef(openTrades);tradesRef.current=openTrades
  const primaryRef=useRef(primary);   primaryRef.current=primary

  const inst=ALL_INSTRUMENTS.find(i=>i.sym===sym)!
  const ms=getMarketStatus(inst.market)
  const livePrice=prices[sym]||SEED[sym]
  const prevPrice=refPrev.current[sym]||livePrice
  const up=livePrice>=prevPrice
  const execPrice=+(dir==='buy'?livePrice+inst.spread:livePrice).toFixed(inst.dec)
  const lotsNum=Math.max(0.01,parseFloat(lots)||0.01)

  const balance    =primary?.balance??0
  const openPnl    =openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEED[t.symbol]),0)
  const equity     =balance+openPnl
  const usedMargin =openTrades.reduce((s,t)=>{
    const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol)
    const cur=prices[t.symbol]||SEED[t.symbol]
    if(!i)return s
    // Correct: notional value / leverage
    const isJpy=t.symbol.includes('JPY')
    const notional=isJpy?LOT_SIZE:i.lotUSD(cur)
    return s+(notional*t.lots/LEVERAGE)
  },0)
  const freeMargin =equity-usedMargin
  const marginLvl  =usedMargin>0?(equity/usedMargin)*100:Infinity

  // Correct margin for order panel
  const isJpySym    =sym.includes('JPY')
  const notionalPerLot=isJpySym?LOT_SIZE:inst.lotUSD(execPrice)
  const reqMargin  =notionalPerLot*lotsNum/LEVERAGE
  const maxLots    =Math.max(0,Math.floor(freeMargin*LEVERAGE/notionalPerLot*100)/100)
  const canTrade   =ms.open&&!((primary as any)?.payout_locked)&&primary?.status==='active'

  // Filtered + sorted watchlist
  const watchlist=useMemo(()=>{
    const q=search.toLowerCase()
    const filtered=ALL_INSTRUMENTS.filter(i=>!q||i.sym.toLowerCase().includes(q)||i.cat.includes(q))
    // Favorites always on top, regardless of category
    const favs=filtered.filter(i=>favorites.has(i.sym))
    const rest=filtered.filter(i=>!favorites.has(i.sym))
    return {favs, rest}
  },[search,favorites])

  const toggleFav=(s:string)=>{
    setFavorites(prev=>{
      const next=new Set(prev)
      if(next.has(s))next.delete(s);else next.add(s)
      localStorage.setItem('tfd_favs',JSON.stringify([...next]))
      return next
    })
  }

  useEffect(()=>{
    if(!primary?.id)return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open')
      .order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed')
      .order('closed_at',{ascending:false}).limit(50).then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  const handleBreach=useCallback(async(reason:string,trades:any[])=>{
    if(!primary)return
    toast('error','🚨','Account Breached',reason)
    const closed=await Promise.all(trades.map(async t=>{
      const ti=ALL_INSTRUMENTS.find(i=>i.sym===t.symbol)!
      const cur=refPrices.current[t.symbol]||SEED[t.symbol]
      const closeP=+(t.direction==='buy'?cur:cur+ti.spread).toFixed(ti.dec)
      const diff=t.direction==='buy'?closeP-t.open_price:t.open_price-closeP
      const isJpy=t.symbol.includes('JPY')
      const units=isJpy?LOT_SIZE/closeP:ti.lotUSD(1)
      const netPnl=+(diff*units*t.lots).toFixed(2)
      const pips=+(diff/ti.pip).toFixed(1)
      await supabase.from('trades').update({status:'closed',close_price:closeP,closed_at:new Date().toISOString(),pips,net_pnl:netPnl,gross_pnl:netPnl,close_reason:'breach'}).eq('id',t.id)
      return {...t,status:'closed',close_price:closeP,net_pnl:netPnl,pips}
    }))
    const newBal=+(balance+closed.reduce((s,t)=>s+(t.net_pnl||0),0)).toFixed(2)
    await supabase.from('accounts').update({status:'breached',phase:'breached',balance:newBal,equity:newBal,breached_at:new Date().toISOString(),breach_reason:reason}).eq('id',primary.id)
    await supabase.from('notifications').insert([
      {user_id:primary.user_id,type:'breach',title:'🚨 Account Breached',body:`Account ${primary.account_number} auto-breached. ${reason}`,is_read:false,metadata:{account_id:primary.id,reason,balance:newBal}},
      {user_id:null,type:'breach',title:`🚨 Breach — ${primary.account_number}`,body:`Auto-breached. ${reason}. Final balance: $${newBal}`,is_read:false,metadata:{account_id:primary.id,account_number:primary.account_number,reason}},
    ])
    setOpenTrades([]);setClosedTrades(p=>[...closed,...p])
  },[primary,refPrices,balance])

  useRiskMonitor(tradesRef,refPrices,primaryRef,primary?.id,handleBreach)

  const handleUpdateSLTP=useCallback(async(tradeId:string,newSl:number|null,newTp:number|null)=>{
    const {error}=await supabase.from('trades').update({sl:newSl,tp:newTp}).eq('id',tradeId)
    if(!error) setOpenTrades(t=>t.map(x=>x.id===tradeId?{...x,sl:newSl,tp:newTp}:x))
  },[])

  async function placeOrder(){
    if(!primary)                                                      {toast('error','❌','No Account','No active account');return}
    if(!ms.open)                                                      {toast('error','🔴','Market Closed',`${ms.label}. Next: ${ms.nextOpen}`);return}
    if((primary as any).payout_locked||primary.status==='suspended') {toast('error','⛔','Locked','Payout pending');return}
    if(primary.status==='breached'||primary.status==='passed')       {toast('error','⛔','Locked','Account not active');return}
    if(reqMargin>freeMargin)                                          {toast('error','⛔','Margin',`Need $${reqMargin.toFixed(2)}, free: $${freeMargin.toFixed(2)}`);return}
    setPlacing(true);setConfirm(false)
    const {data,error}=await supabase.from('trades').insert({
      account_id:primary.id,user_id:primary.user_id,symbol:sym,direction:dir,lots:lotsNum,
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
    const ti=ALL_INSTRUMENTS.find(i=>i.sym===trade.symbol)!
    const cur=refPrices.current[trade.symbol]||SEED[trade.symbol]
    const closeP=+(trade.direction==='buy'?cur:cur+ti.spread).toFixed(ti.dec)
    const diff=trade.direction==='buy'?closeP-trade.open_price:trade.open_price-closeP
    const isJpy=trade.symbol.includes('JPY')
    const units=isJpy?LOT_SIZE/closeP:ti.lotUSD(1)
    const netPnl=+(diff*units*trade.lots).toFixed(2)
    const pips=+(diff/ti.pip).toFixed(1)
    await supabase.from('trades').update({status:'closed',close_price:closeP,closed_at:new Date().toISOString(),pips,net_pnl:netPnl,gross_pnl:netPnl}).eq('id',trade.id)
    const newBal=+(balance+netPnl).toFixed(2)
    await supabase.from('accounts').update({balance:newBal,equity:newBal}).eq('id',primary!.id)
    setOpenTrades(t=>t.filter(x=>x.id!==trade.id))
    setClosedTrades(t=>[{...trade,status:'closed',close_price:closeP,net_pnl:netPnl,pips},...t])
    toast(netPnl>=0?'success':'warning',netPnl>=0?'💰':'🔴','Closed',`${trade.symbol} ${netPnl>=0?'+':''}${fmt(netPnl)}`)
  }

  async function saveEditSLTP(){
    if(!editSLTP)return
    const newSl=editSLTP.sl?parseFloat(editSLTP.sl):null
    const newTp=editSLTP.tp?parseFloat(editSLTP.tp):null
    await handleUpdateSLTP(editSLTP.id,newSl,newTp)
    setEditSLTP(null)
  }

  // Cat labels
  const CAT_LABELS:Record<string,string>={forex:'Forex',metals:'Metals',index:'Indices'}

  return(
  <>
  <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0A0A0F',color:'var(--text)',fontSize:12}}>

    {/* ── Watchlist ── */}
    <div style={{width:192,flexShrink:0,background:'var(--bg2)',borderRight:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:20,height:20,border:'1px solid var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--gold)'}}>✦</div>
        <span style={{fontFamily:'serif',fontSize:11,fontWeight:'bold',lineHeight:1.3}}>TFD<br/>Terminal</span>
      </div>
      {/* Search */}
      <div style={{padding:'6px 10px',borderBottom:'1px solid var(--bdr)'}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search..."
          style={{width:'100%',padding:'5px 8px',background:'var(--bg3)',border:'1px solid var(--dim)',color:'var(--text)',fontSize:10,outline:'none',boxSizing:'border-box' as const}}
        />
      </div>
      {/* Instrument list */}
      <div style={{flex:1,overflowY:'auto'}}>
        {(()=>{
          const renderItem=(i:typeof ALL_INSTRUMENTS[0])=>{
            const cur=prices[i.sym]||SEED[i.sym]
            const prv=refPrev.current[i.sym]||cur
            const isUp=cur>=prv
            const isFav=favorites.has(i.sym)
            const iMs=getMarketStatus(i.market)
            return(
              <div key={i.sym} onClick={()=>setSym(i.sym)} style={{
                padding:'6px 10px 5px',cursor:'pointer',borderBottom:'1px solid rgba(212,168,67,.03)',
                background:sym===i.sym?'rgba(212,168,67,.07)':'transparent',
                borderLeft:sym===i.sym?'2px solid var(--gold)':'2px solid transparent',
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:10}}>{i.sym}</span>
                  <div style={{display:'flex',gap:5,alignItems:'center'}}>
                    <span
                      onClick={e=>{e.stopPropagation();toggleFav(i.sym)}}
                      style={{fontSize:15,cursor:'pointer',color:isFav?'var(--gold)':'rgba(255,255,255,.2)',lineHeight:1,userSelect:'none' as const}}
                      title={isFav?'Remove from favorites':'Add to favorites'}
                    >{isFav?'★':'☆'}</span>
                    <span style={{width:5,height:5,borderRadius:'50%',background:!iMs.open?'var(--red)':prices[i.sym]>0?'var(--green)':'#444'}}/>
                  </div>
                </div>
                <div style={{fontFamily:'monospace',fontSize:12,marginTop:1,fontWeight:700,color:isUp?'var(--green)':'var(--red)',opacity:iMs.open?1:0.55}}>
                  {cur.toFixed(i.dec)}
                </div>
                <div style={{fontSize:8,color:iMs.open?(isUp?'var(--green)':'var(--red)'):'var(--text3)'}}>
                  {iMs.open?`${isUp?'▲':'▼'} ${Math.abs(cur-prv).toFixed(i.dec)}`:'CLOSED'}
                </div>
              </div>
            )
          }
          return(
            <>
              {/* Favorites section — always first, any category */}
              {watchlist.favs.length>0&&(
                <div>
                  <div style={{padding:'4px 10px',fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--gold)',fontWeight:700,background:'rgba(212,168,67,.06)',borderBottom:'1px solid var(--bdr)',display:'flex',alignItems:'center',gap:5}}>
                    <span>★</span> Favorites
                  </div>
                  {watchlist.favs.map(renderItem)}
                </div>
              )}
              {/* Rest grouped by category */}
              {['forex','metals','index'].map(cat=>{
                const items=watchlist.rest.filter(i=>i.cat===cat)
                if(!items.length)return null
                return(
                  <div key={cat}>
                    <div style={{padding:'4px 10px',fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:700,background:'rgba(0,0,0,.3)',borderBottom:'1px solid var(--bdr)'}}>
                      {CAT_LABELS[cat]}
                    </div>
                    {items.map(renderItem)}
                  </div>
                )
              })}
            </>
          )
        })()}
      </div>
      <div style={{padding:'8px 10px',borderTop:'1px solid var(--bdr)'}}>
        {accounts.length>1
          ?<select value={selAccId??primary?.id??''} onChange={e=>setSelAccId(e.target.value)} style={{width:'100%',padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',color:'var(--text)',fontSize:9,fontFamily:'monospace',outline:'none',marginBottom:6}}>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          :<div style={{marginBottom:6,padding:'4px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',fontSize:9,fontFamily:'monospace',color:'var(--gold)',textAlign:'center' as const}}>{primary?.account_number??'—'}</div>
        }
        <button onClick={()=>navigate('/dashboard')} style={{width:'100%',fontSize:9,letterSpacing:1,textTransform:'uppercase' as const,color:'var(--text3)',background:'none',border:'none',cursor:'pointer'}}>← Dashboard</button>
      </div>
    </div>

    {/* ── Main ── */}
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {!ms.open&&(
        <div style={{background:'rgba(255,51,82,.1)',borderBottom:'1px solid rgba(255,51,82,.25)',padding:'6px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{fontSize:11,color:'var(--red)',fontWeight:600}}>🔴 {ms.label}</span>
          {ms.nextOpen&&<span style={{fontSize:10,color:'var(--text3)'}}>Next open: {ms.nextOpen}</span>}
        </div>
      )}

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
          {Object.keys(TF_CONFIG).map(t=>(
            <button key={t} onClick={()=>setTf(t)} style={{padding:'3px 7px',fontSize:9,fontFamily:'monospace',fontWeight:'bold',cursor:'pointer',background:tf===t?'rgba(212,168,67,.15)':'transparent',border:tf===t?'1px solid var(--bdr2)':'1px solid transparent',color:tf===t?'var(--gold)':'var(--text3)'}}>{t}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:ms.open?'var(--green)':'var(--red)',boxShadow:ms.open?'0 0 6px var(--green)':'none'}}/>
          <span style={{fontSize:9,color:ms.open?'var(--green)':'var(--red)',letterSpacing:1.5,textTransform:'uppercase' as const,fontWeight:600}}>{ms.open?'Live':'Closed'}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{flex:1,overflow:'hidden'}}>
        <div key={`${sym}_${tf}`} style={{width:'100%',height:'100%'}}>
          <CandleChart
            sym={sym} tf={tf} livePrice={livePrice}
            onLastClose={p=>push(sym,p)}
            openTrades={openTrades}
            onUpdateSLTP={handleUpdateSLTP}
          />
        </div>
      </div>

      {/* Bottom tabs */}
      <div style={{height:220,flexShrink:0,background:'var(--bg2)',borderTop:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
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
                   <th key={h} style={{padding:'5px 8px',fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',textAlign:'left' as const,fontWeight:600}}>{h}</th>
                 ))}
               </tr></thead>
               <tbody>{openTrades.map(t=>{
                 const cur=prices[t.symbol]||SEED[t.symbol]
                 const ti=ALL_INSTRUMENTS.find(i=>i.sym===t.symbol)!
                 const pnl=calcPnl(t,cur)
                 const ddPct=balance>0?(pnl/balance)*100:0
                 const warn=ddPct<=-4
                 const isEditing=editSLTP?.id===t.id
                 return(
                   <tr key={t.id} style={{borderBottom:'1px solid rgba(212,168,67,.04)',background:warn?'rgba(255,51,82,.05)':'transparent'}}>
                     <td style={{padding:'5px 8px',fontWeight:700}}>{t.symbol}</td>
                     <td style={{padding:'5px 8px'}}><span style={{fontSize:8,fontWeight:'bold',color:t.direction==='buy'?'var(--green)':'var(--red)'}}>{t.direction.toUpperCase()}</span></td>
                     <td style={{padding:'5px 8px',fontFamily:'monospace'}}>{t.lots}</td>
                     <td style={{padding:'5px 8px',fontFamily:'monospace',color:'var(--text2)'}}>{t.open_price}</td>
                     <td style={{padding:'5px 8px',fontFamily:'monospace',fontWeight:600,color:cur>=t.open_price?'var(--green)':'var(--red)'}}>{cur.toFixed(ti?.dec??5)}</td>
                     <td style={{padding:'5px 8px',fontFamily:'monospace',fontWeight:700,fontSize:11,color:pnl>=0?'var(--green)':'var(--red)'}}>{pnl>=0?'+':''}{fmt(pnl)}</td>
                     <td style={{padding:'5px 8px',fontFamily:'monospace',fontSize:10,fontWeight:600,color:warn?'var(--red)':ddPct<0?'rgba(255,51,82,.7)':'var(--green)'}}>{ddPct>=0?'+':''}{ddPct.toFixed(2)}%</td>
                     {/* SL editable */}
                     <td style={{padding:'5px 8px'}}>
                       {isEditing
                         ?<input value={editSLTP!.sl} onChange={e=>setEditSLTP(x=>x?{...x,sl:e.target.value}:null)}
                             style={{width:70,padding:'2px 4px',background:'rgba(255,51,82,.1)',border:'1px solid rgba(255,51,82,.4)',color:'var(--red)',fontFamily:'monospace',fontSize:9,outline:'none'}}
                             type="number" placeholder="SL"/>
                         :<span style={{fontFamily:'monospace',color:'var(--red)',fontSize:9,cursor:'pointer',textDecoration:'underline',textDecorationStyle:'dotted' as const}}
                             onClick={()=>setEditSLTP({id:t.id,sl:t.sl?.toString()||'',tp:t.tp?.toString()||''})}>
                             {t.sl??'—'}
                           </span>
                       }
                     </td>
                     {/* TP editable */}
                     <td style={{padding:'5px 8px'}}>
                       {isEditing
                         ?<input value={editSLTP!.tp} onChange={e=>setEditSLTP(x=>x?{...x,tp:e.target.value}:null)}
                             style={{width:70,padding:'2px 4px',background:'rgba(0,217,126,.1)',border:'1px solid rgba(0,217,126,.4)',color:'var(--green)',fontFamily:'monospace',fontSize:9,outline:'none'}}
                             type="number" placeholder="TP"/>
                         :<span style={{fontFamily:'monospace',color:'var(--green)',fontSize:9,cursor:'pointer',textDecoration:'underline',textDecorationStyle:'dotted' as const}}
                             onClick={()=>setEditSLTP({id:t.id,sl:t.sl?.toString()||'',tp:t.tp?.toString()||''})}>
                             {t.tp??'—'}
                           </span>
                       }
                     </td>
                     <td style={{padding:'5px 8px',fontFamily:'monospace',fontSize:9,color:'var(--text3)'}}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                     <td style={{padding:'5px 8px',display:'flex',gap:4}}>
                       {isEditing
                         ?<>
                            <button onClick={saveEditSLTP} style={{padding:'2px 6px',fontSize:8,cursor:'pointer',background:'rgba(0,217,126,.15)',color:'var(--green)',border:'1px solid rgba(0,217,126,.3)',fontWeight:'bold'}}>✓</button>
                            <button onClick={()=>setEditSLTP(null)} style={{padding:'2px 6px',fontSize:8,cursor:'pointer',background:'transparent',color:'var(--text3)',border:'1px solid var(--dim)'}}>✕</button>
                          </>
                         :<button onClick={()=>closeTrade(t)} style={{padding:'3px 8px',fontSize:8,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',background:'rgba(255,51,82,.1)',color:'var(--red)',border:'1px solid rgba(255,51,82,.25)'}}>Close</button>
                       }
                     </td>
                   </tr>
                 )
               })}</tbody>
             </table>
          )}

          {tab==='history'&&(closedTrades.length===0
            ?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:11}}>No history</div>
            :<table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
               <thead><tr style={{borderBottom:'1px solid var(--dim)'}}>
                 {['Symbol','Dir','Lots','Open','Close','Pips','P&L','Reason','Date'].map(h=>(
                   <th key={h} style={{padding:'5px 8px',fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',textAlign:'left' as const,fontWeight:600}}>{h}</th>
                 ))}
               </tr></thead>
               <tbody>{closedTrades.map(t=>(
                 <tr key={t.id} style={{borderBottom:'1px solid rgba(212,168,67,.04)'}}>
                   <td style={{padding:'5px 8px',fontWeight:700}}>{t.symbol}</td>
                   <td style={{padding:'5px 8px'}}><span style={{fontSize:8,fontWeight:'bold',color:t.direction==='buy'?'var(--green)':'var(--red)'}}>{t.direction.toUpperCase()}</span></td>
                   <td style={{padding:'5px 8px',fontFamily:'monospace'}}>{t.lots}</td>
                   <td style={{padding:'5px 8px',fontFamily:'monospace'}}>{t.open_price}</td>
                   <td style={{padding:'5px 8px',fontFamily:'monospace'}}>{t.close_price??'—'}</td>
                   <td style={{padding:'5px 8px',fontFamily:'monospace',color:(t.pips??0)>=0?'var(--green)':'var(--red)'}}>{t.pips!=null?`${t.pips>0?'+':''}${t.pips}`:'—'}</td>
                   <td style={{padding:'5px 8px',fontFamily:'monospace',fontWeight:700,color:(t.net_pnl??0)>=0?'var(--green)':'var(--red)'}}>{t.net_pnl!=null?`${t.net_pnl>=0?'+':''}${fmt(t.net_pnl)}`:'—'}</td>
                   <td style={{padding:'5px 8px',fontSize:9,color:t.close_reason==='breach'?'var(--red)':'var(--text3)'}}>{t.close_reason==='breach'?'🚨 Breach':'Manual'}</td>
                   <td style={{padding:'5px 8px',fontFamily:'monospace',fontSize:9,color:'var(--text3)'}}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                 </tr>
               ))}</tbody>
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
                ['Margin Lvl', usedMargin>0?`${marginLvl.toFixed(0)}%`:'∞', marginLvl<150&&usedMargin>0?'var(--red)':'var(--green)'],
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

    {/* ── Order Panel ── */}
    <div style={{width:215,flexShrink:0,background:'var(--bg2)',borderLeft:'1px solid var(--bdr)',display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
        <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:8}}>Order Panel</div>
        <div style={{marginBottom:8,padding:'5px 8px',background:ms.open?'rgba(0,217,126,.07)':'rgba(255,51,82,.07)',border:`1px solid ${ms.open?'rgba(0,217,126,.2)':'rgba(255,51,82,.2)'}`,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:ms.open?'var(--green)':'var(--red)',flexShrink:0}}/>
          <span style={{fontSize:8,color:ms.open?'var(--green)':'var(--red)',fontWeight:600}}>{ms.label}</span>
        </div>
        <div style={{display:'flex'}}>
          <button onClick={()=>setDir('buy')}  disabled={!canTrade} style={{flex:1,padding:'9px 0',fontSize:10,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:'bold',cursor:canTrade?'pointer':'not-allowed',border:'none',opacity:canTrade?1:0.4,background:dir==='buy'?'var(--green)':'rgba(0,217,126,.08)',color:dir==='buy'?'#000':'var(--green)'}}>Buy</button>
          <button onClick={()=>setDir('sell')} disabled={!canTrade} style={{flex:1,padding:'9px 0',fontSize:10,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:'bold',cursor:canTrade?'pointer':'not-allowed',border:'none',opacity:canTrade?1:0.4,background:dir==='sell'?'var(--red)':'rgba(255,51,82,.08)',color:dir==='sell'?'#fff':'var(--red)'}}>Sell</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
        {/* Price */}
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
        {/* SL / TP */}
        {['Stop Loss','Take Profit'].map((l,i)=>{
          const v=i===0?sl:tp;const sv=i===0?setSl:setTp
          return(
            <div key={l}>
              <div style={{fontSize:7,letterSpacing:2,textTransform:'uppercase' as const,color:'var(--text3)',fontWeight:600,marginBottom:4}}>{l}</div>
              <input value={v} onChange={e=>sv(e.target.value)} placeholder="Optional" type="number" style={{width:'100%',padding:'8px',background:'var(--bg3)',border:'1px solid var(--dim)',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:12,boxSizing:'border-box' as const}}/>
            </div>
          )
        })}
        {/* Margin info */}
        <div style={{background:'var(--bg3)',border:'1px solid var(--dim)',padding:'8px 10px'}}>
          {([
            ['Notional',    `$${(notionalPerLot*lotsNum).toLocaleString('en',{maximumFractionDigits:0})}`, 'var(--text2)'],
            ['Req. Margin', `$${reqMargin.toLocaleString('en',{maximumFractionDigits:2})}`,               reqMargin>freeMargin?'var(--red)':'var(--text)'],
            ['Free Margin', `$${freeMargin.toLocaleString('en',{maximumFractionDigits:2})}`,              freeMargin<reqMargin?'var(--red)':'var(--green)'],
            ['Leverage',    `1:${LEVERAGE}`,                                                               'var(--text3)'],
          ] as [string,string,string][]).map(([l,v,c])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:8,color:'var(--text3)'}}>{l}</span>
              <span style={{fontSize:9,fontFamily:'monospace',fontWeight:600,color:c}}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>setConfirm(true)} disabled={!canTrade||placing||reqMargin>freeMargin} style={{width:'100%',padding:'12px 0',fontSize:11,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',cursor:canTrade&&!placing&&reqMargin<=freeMargin?'pointer':'not-allowed',border:'none',opacity:canTrade&&!placing&&reqMargin<=freeMargin?1:0.35,background:dir==='buy'?'var(--green)':'var(--red)',color:dir==='buy'?'#000':'#fff'}}>
          {!ms.open?'Market Closed':placing?'Placing…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
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
          {([
            ['Symbol',sym],['Direction',dir.toUpperCase()],['Type',ordType],
            ['Lots',String(lotsNum)],['Price',execPrice.toFixed(inst.dec)],
            ['Notional',`$${(notionalPerLot*lotsNum).toLocaleString('en',{maximumFractionDigits:0})}`],
            ['Req. Margin',`$${reqMargin.toLocaleString('en',{maximumFractionDigits:2})}`],
            ['Account',primary?.account_number??'—'],
          ] as [string,string][]).map(([l,v])=>(
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
