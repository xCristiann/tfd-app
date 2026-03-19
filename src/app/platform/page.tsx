import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const FCS_KEY  = (import.meta as any).env?.VITE_FCS_KEY ?? 'wE4n2JGyRpoSReYfXS3UlA8DxP9z3tTM'
const LEVERAGE = 50
const LOT_SIZE = 100_000

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb } catch { return fb }
}
function lsSet(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

/* ══ INSTRUMENTS ══════════════════════════════════════════════════ */
const INSTRUMENTS = [
  { sym:'EUR/USD', fcs:'EUR/USD', dec:5, pip:0.0001, spread:0.00010, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', fcs:'GBP/USD', dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', fcs:'USD/JPY', dec:3, pip:0.01,   spread:0.010,   cat:'Forex',       lotUSD:(_:number)=>LOT_SIZE },
  { sym:'USD/CHF', fcs:'USD/CHF', dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', fcs:'AUD/USD', dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', fcs:'USD/CAD', dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>LOT_SIZE/p },
  { sym:'NZD/USD', fcs:'NZD/USD', dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'EUR/JPY', fcs:'EUR/JPY', dec:3, pip:0.01,   spread:0.025,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'GBP/JPY', fcs:'GBP/JPY', dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', fcs:'EUR/GBP', dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*1.27*LOT_SIZE },
  { sym:'AUD/JPY', fcs:'AUD/JPY', dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'CAD/JPY', fcs:'CAD/JPY', dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'XAU/USD', fcs:'XAU/USD', dec:2, pip:0.10,   spread:0.30,    cat:'Metals',      lotUSD:(p:number)=>p*100 },
  { sym:'XAG/USD', fcs:'XAG/USD', dec:4, pip:0.001,  spread:0.030,   cat:'Metals',      lotUSD:(p:number)=>p*5000 },
  { sym:'NAS100',  fcs:'NAS100',  dec:2, pip:1.0,    spread:1.5,     cat:'Indices',     lotUSD:(p:number)=>p*400 },
  { sym:'US500',   fcs:'US500',   dec:2, pip:0.10,   spread:0.50,    cat:'Indices',     lotUSD:(p:number)=>p*500 },
  { sym:'US30',    fcs:'US30',    dec:1, pip:1.0,    spread:2.0,     cat:'Indices',     lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   fcs:'GER40',   dec:1, pip:1.0,    spread:1.0,     cat:'Indices',     lotUSD:(p:number)=>p*25 },
  { sym:'WTI',     fcs:'USOIL',   dec:2, pip:0.01,   spread:0.03,    cat:'Commodities', lotUSD:(p:number)=>p*1000 },
] as const

const SEEDS: Record<string,number> = {
  'EUR/USD':1.0820,'GBP/USD':1.2960,'USD/JPY':149.20,'USD/CHF':0.8850,
  'AUD/USD':0.6280,'USD/CAD':1.4380,'NZD/USD':0.5720,'EUR/JPY':161.50,
  'GBP/JPY':193.20,'EUR/GBP':0.8350,'AUD/JPY':93.70,'CAD/JPY':103.80,
  'XAU/USD':3320.0,'XAG/USD':33.80,
  'NAS100':19800,'US500':5580,'US30':41700,'GER40':22500,'WTI':68.50,
}

/* ══ TIMEFRAMES ═══════════════════════════════════════════════════ */
const TF_LIST = [
  { label:'1m',  fcs:'1m',  sec:60     },
  { label:'5m',  fcs:'5m',  sec:300    },
  { label:'15m', fcs:'15m', sec:900    },
  { label:'30m', fcs:'30m', sec:1800   },
  { label:'1h',  fcs:'1h',  sec:3600   },
  { label:'4h',  fcs:'4h',  sec:14400  },
  { label:'1d',  fcs:'1d',  sec:86400  },
]
type TF = typeof TF_LIST[number]
type Candle = { time:number; open:number; high:number; low:number; close:number }

/* ══ LWC LOADER ═══════════════════════════════════════════════════ */
let _lwcReady = false
const _lwcQ: Array<()=>void> = []
function loadLWC(): Promise<void> {
  return new Promise(res => {
    if (_lwcReady) { res(); return }
    _lwcQ.push(res)
    if (document.getElementById('lwc-s')) return
    const s = document.createElement('script')
    s.id = 'lwc-s'
    s.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload = () => { _lwcReady = true; _lwcQ.forEach(f=>f()); _lwcQ.length=0 }
    document.head.appendChild(s)
  })
}

/* ══ FCS API — fetch candles ══════════════════════════════════════ */
async function fetchCandles(inst: any, tf: TF): Promise<Candle[]> {
  const length = 500
  // FCS API v4 - correct endpoint with type param
  const fcsType = inst.fcsType ?? 'forex'
  const url = `https://api-v4.fcsapi.com/forex/history?symbol=${inst.fcs}&period=${tf.fcs}&number=${length}&type=${fcsType}&access_key=${FCS_KEY}`
  try {
    const r = await fetch(url)
    const d = await r.json()
    // FCS returns { status:true, response: [ {tm, o, h, l, c}, ... ] }
    if (!d.status) { console.warn('[FCS candle]', inst.fcs, d.msg||d.message); return generateDemo(inst, tf) }
    const arr = Array.isArray(d.response) ? d.response : Object.values(d.response||{})
    if (!arr.length) return generateDemo(inst, tf)
    const candles: Candle[] = arr.map((e: any) => {
      // FCS history: each item has {o,h,l,c,t} or nested active:{o,h,l,c,t}
      const data  = e.active ?? e
      const time  = parseInt(data.t || data.tm || data.date || e.t || e.tm || 0)
      const open  = parseFloat(data.o || data.open  || 0)
      const high  = parseFloat(data.h || data.high  || 0)
      const low   = parseFloat(data.l || data.low   || 0)
      const close = parseFloat(data.c || data.close || 0)
      return { time, open, high, low, close }
    }).filter((c:Candle) => c.time>0 && c.open>0)
    candles.sort((a,b) => a.time - b.time)
    if (candles.length < 5) return generateDemo(inst, tf)
    console.log(`[FCS] ${inst.sym} ${tf.label}: ${candles.length} candles, last close: ${candles[candles.length-1].close}`)
    return candles
  } catch(e) {
    console.error('[FCS candle error]', inst.fcs, e)
    return generateDemo(inst, tf)
  }
}

function generateDemo(inst: any, tf: TF): Candle[] {
  const count = 200
  const now   = Math.floor(Date.now()/1000)
  const seed  = SEEDS[inst.sym] ?? 1
  const candles: Candle[] = []
  let price = seed * 0.97
  const vol = seed * 0.0005
  for (let i = count; i >= 0; i--) {
    const time  = Math.floor((now - i*tf.sec)/tf.sec)*tf.sec
    const open  = price
    const move  = (Math.random()-0.49)*vol*2
    const close = Math.max(seed*0.93, Math.min(seed*1.07, open+move))
    const high  = Math.max(open,close)+Math.random()*vol*0.5
    const low   = Math.min(open,close)-Math.random()*vol*0.5
    candles.push({ time, open:+open.toFixed(inst.dec), high:+high.toFixed(inst.dec), low:+low.toFixed(inst.dec), close:+close.toFixed(inst.dec) })
    price = close
  }
  return candles
}

/* ══ CHART ════════════════════════════════════════════════════════ */
function CandleChart({ inst, tf, livePrice, openTrades, onSLTP }: {
  inst: any; tf: TF; livePrice: number; openTrades: any[]
  onSLTP: (id:string, sl:number|null, tp:number|null)=>void
}) {
  const divRef   = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const serRef   = useRef<any>(null)
  const lastRef  = useRef<Candle|null>(null)
  const linesRef = useRef<Map<string,{entry:any;sl:any;tp:any}>>(new Map())

  // Build chart
  useEffect(() => {
    const el = divRef.current; if (!el) return
    let dead = false
    loadLWC().then(async () => {
      if (dead||!divRef.current) return
      try { chartRef.current?.remove() } catch {}
      linesRef.current.clear()
      const LWC = (window as any).LightweightCharts
      const chart = LWC.createChart(el, {
        width: el.clientWidth, height: el.clientHeight,
        layout: { background:{type:'solid',color:'#FAFBFF'}, textColor:'#5C7A9E' },
        grid:   { vertLines:{color:'rgba(34,85,204,.05)'}, horzLines:{color:'rgba(34,85,204,.05)'} },
        crosshair: { mode:1 },
        rightPriceScale: { borderColor:'#E8EEF8' },
        timeScale: { borderColor:'#E8EEF8', timeVisible:true, secondsVisible:tf.sec<3600 },
      })
      const series = chart.addCandlestickSeries({
        upColor:'#16A34A', downColor:'#DC2626',
        borderUpColor:'#16A34A', borderDownColor:'#DC2626',
        wickUpColor:'#16A34A', wickDownColor:'#DC2626',
      })
      chartRef.current = chart; serRef.current = series
      const ro = new ResizeObserver(() => {
        if (chartRef.current&&divRef.current)
          chartRef.current.resize(divRef.current.clientWidth, divRef.current.clientHeight)
      })
      ro.observe(el)
      const candles = await fetchCandles(inst, tf)
      if (dead) { ro.disconnect(); return }
      if (candles.length) {
        series.setData(candles)
        lastRef.current = candles[candles.length-1]
        chart.timeScale().fitContent()
      }
    })
    return () => { dead = true }
  }, [inst.sym, tf.label])

  // Live tick
  useEffect(() => {
    if (!serRef.current||livePrice<=0) return
    const now   = Math.floor(Date.now()/1000)
    const cTime = Math.floor(now/tf.sec)*tf.sec
    const prev  = lastRef.current
    const c: Candle = (!prev||cTime>prev.time)
      ? {time:cTime, open:livePrice, high:livePrice, low:livePrice, close:livePrice}
      : {time:prev.time, open:prev.open, high:Math.max(prev.high,livePrice), low:Math.min(prev.low,livePrice), close:livePrice}
    lastRef.current = c
    try { serRef.current.update(c) } catch {}
  }, [livePrice, tf.sec])

  // SL/TP/Entry lines — draggable
  useEffect(() => {
    const series = serRef.current; if (!series) return
    const trades = openTrades.filter(t=>t.symbol===inst.sym)
    const existing = new Set(linesRef.current.keys())

    // Remove lines for closed trades
    existing.forEach(id => {
      if (!trades.find(t=>t.id===id)) {
        const l = linesRef.current.get(id)
        try{series.removePriceLine(l?.entry)}catch{}
        try{if(l?.sl)series.removePriceLine(l.sl)}catch{}
        try{if(l?.tp)series.removePriceLine(l.tp)}catch{}
        linesRef.current.delete(id)
      }
    })

    trades.forEach(t => {
      const isBuy = t.direction==='buy'
      const ex    = linesRef.current.get(t.id)
      if (!ex) {
        const entry = series.createPriceLine({
          price: t.open_price,
          color: isBuy?'rgba(34,85,204,.9)':'rgba(180,50,50,.9)',
          lineWidth:2, lineStyle:0, axisLabelVisible:true,
          title: `${t.direction.toUpperCase()} ${t.lots}`,
        })
        const sl = t.sl ? series.createPriceLine({
          price:Number(t.sl), color:'rgba(220,38,38,.9)',
          lineWidth:1, lineStyle:2, axisLabelVisible:true, title:'SL', draggable:true,
        }) : null
        const tp = t.tp ? series.createPriceLine({
          price:Number(t.tp), color:'rgba(22,163,74,.9)',
          lineWidth:1, lineStyle:2, axisLabelVisible:true, title:'TP', draggable:true,
        }) : null
        if (sl) sl.onDragEnd?.((p:any)=>{ const np=p?.customValues?.price??p?.price; if(np) onSLTP(t.id,np,t.tp?Number(t.tp):null) })
        if (tp) tp.onDragEnd?.((p:any)=>{ const np=p?.customValues?.price??p?.price; if(np) onSLTP(t.id,t.sl?Number(t.sl):null,np) })
        linesRef.current.set(t.id, {entry,sl,tp})
      } else {
        try{ex.entry.applyOptions({price:t.open_price})}catch{}
        if(ex.sl&&t.sl) try{ex.sl.applyOptions({price:Number(t.sl)})}catch{}
        if(ex.tp&&t.tp) try{ex.tp.applyOptions({price:Number(t.tp)})}catch{}
        // Add SL if newly set
        if(!ex.sl&&t.sl) {
          const sl=series.createPriceLine({price:Number(t.sl),color:'rgba(220,38,38,.9)',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:'SL',draggable:true})
          sl.onDragEnd?.((p:any)=>{ const np=p?.customValues?.price??p?.price; if(np) onSLTP(t.id,np,t.tp?Number(t.tp):null) })
          linesRef.current.set(t.id,{...ex,sl})
        }
        if(!ex.tp&&t.tp) {
          const tp=series.createPriceLine({price:Number(t.tp),color:'rgba(22,163,74,.9)',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:'TP',draggable:true})
          tp.onDragEnd?.((p:any)=>{ const np=p?.customValues?.price??p?.price; if(np) onSLTP(t.id,t.sl?Number(t.sl):null,np) })
          linesRef.current.set(t.id,{...ex,tp})
        }
      }
    })
  }, [openTrades, inst.sym])

  return <div ref={divRef} style={{width:'100%',height:'100%'}}/>
}

/* ══ PRICE FEED ═══════════════════════════════════════════════════ */
function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({...SEEDS})
  const prevRef  = useRef<Record<string,number>>({...SEEDS})
  const priceRef = useRef<Record<string,number>>({...SEEDS})
  const push = useCallback((sym:string,price:number)=>{
    if(!price||isNaN(price)||price<=0) return
    prevRef.current[sym]=priceRef.current[sym]||price
    priceRef.current[sym]=price
    setPrices(p=>p[sym]===price?p:{...p,[sym]:price})
  },[])
  useEffect(()=>{
    let dead=false,ws:WebSocket,wsT:any,pollT:any
    // Finnhub removed - using FCS only
    // FCS latest prices poll
    const poll=async()=>{
      if(dead) return
      // FCS latest prices - fetch in small batches to avoid URL length limits
      try {
        // Fetch each type separately - FCS requires type param
        const groups = [
          { type:'forex',     syms: INSTRUMENTS.filter(i=>i.cat==='Forex').map(i=>(i as any).fcs) },
          { type:'commodity', syms: INSTRUMENTS.filter(i=>i.cat==='Metals'||i.cat==='Commodities').map(i=>(i as any).fcs) },
          { type:'indices',   syms: INSTRUMENTS.filter(i=>i.cat==='Indices').map(i=>(i as any).fcs) },
        ]
        for (const grp of groups) {
          if (!grp.syms.length) continue
          try {
            const r=await fetch(`https://api-v4.fcsapi.com/forex/latest?symbol=${grp.syms.join(',')}&type=${grp.type}&access_key=${FCS_KEY}`)
            const d=await r.json()
            if(!d.status||!d.response) continue
            const arr=Array.isArray(d.response)?d.response:Object.values(d.response)
            for(const item of arr as any[]){
              const s=item.s||item.id||item.symbol||item.ticker
              const inst=INSTRUMENTS.find(i=>(i as any).fcs===s) as any
              if(!inst) continue
              // FCS latest: active.c = close price
              const price=parseFloat((item.active?.c)||item.c||item.price||item.last||0)
              if(price>0) push(inst.sym,+price.toFixed(inst.dec))
            }
          } catch{}
          await new Promise(r=>setTimeout(r,150))
        }
      } catch(e){ console.warn('[FCS latest]',e) }
      // Finnhub removed
    }
    poll()
    pollT=setInterval(poll,5000)
    return()=>{dead=true;clearInterval(pollT)}
  },[push])
  return {prices,prevRef,priceRef,push}
}

/* ══ P&L ══════════════════════════════════════════════════════════ */
function calcPnl(trade:any,price:number):number{
  const inst=INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if(!inst||!price) return 0
  const diff=trade.direction==='buy'?price-trade.open_price:trade.open_price-price
  return diff*(trade.symbol.includes('JPY')?LOT_SIZE/price:inst.lotUSD(1))*trade.lots
}

/* ══ RISK MONITOR ═════════════════════════════════════════════════ */
function useRiskMonitor(tradesRef:any,priceRef:any,primaryRef:any,accountId:any,onBreach:any){
  const firedRef=useRef(false)
  const cbRef=useRef(onBreach);cbRef.current=onBreach
  useEffect(()=>{
    const iv=setInterval(()=>{
      const pr=primaryRef.current,trades=tradesRef.current,prices=priceRef.current
      if(!pr||!trades.length||firedRef.current) return
      if(pr.status==='breached'||pr.status==='passed') return
      const bal=pr.balance??0,startBal=pr.starting_balance??bal
      if(bal<=0||startBal<=0) return
      const cp=(pr as any).challenge_products,phase=pr.phase??'phase1'
      const maxDD=phase==='funded'?(cp?.funded_max_dd??10):phase==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10)
      const dailyDD=phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)
      const floor=startBal-startBal*(maxDD/100)
      const dFloor=(pr.daily_high_balance??startBal)-(pr.daily_high_balance??startBal)*(dailyDD/100)
      const equity=bal+trades.reduce((s:number,t:any)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]||t.open_price),0)
      if(equity<=floor){firedRef.current=true;cbRef.current(`Max DD breached — equity $${equity.toFixed(2)} (limit:${maxDD}%)`,trades);return}
      if(equity<=dFloor){firedRef.current=true;cbRef.current(`Daily DD breached — equity $${equity.toFixed(2)} (limit:${dailyDD}%)`,trades);return}
    },500)
    return()=>clearInterval(iv)
  },[])
  useEffect(()=>{firedRef.current=false},[accountId])
}

/* ══ EDIT SL/TP ═══════════════════════════════════════════════════ */
function EditModal({trade,inst,onSave,onClose}:{trade:any;inst:any;onSave:(sl:string,tp:string)=>void;onClose:()=>void}){
  const [sl,setSl]=useState(trade.sl?String(trade.sl):'')
  const [tp,setTp]=useState(trade.tp?String(trade.tp):'')
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:'12px',padding:'24px',width:'320px',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'14px',fontWeight:700,color:'#1A3A6B'}}>Edit SL / TP</div>
            <div style={{fontSize:'11px',color:'#8FA3BF',marginTop:'2px'}}>
              <span style={{color:trade.direction==='buy'?'#16A34A':'#DC2626',fontWeight:600}}>{trade.direction.toUpperCase()}</span>
              {' '}{trade.lots} {trade.symbol} @ {(Number(trade.open_price)||0).toFixed(inst?.dec??5)}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:'#8FA3BF'}}>✕</button>
        </div>
        <div style={{background:'#F4F7FD',borderRadius:'8px',padding:'10px',marginBottom:'14px',fontSize:'11px'}}>
          {sl&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{color:'#DC2626'}}>SL distance</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:'#DC2626'}}>{(Math.abs((trade.open_price||0)-parseFloat(sl))/(inst?.pip??0.0001)).toFixed(0)} pips</span></div>}
          {tp&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#16A34A'}}>TP distance</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:'#16A34A'}}>{(Math.abs((trade.open_price||0)-parseFloat(tp))/(inst?.pip??0.0001)).toFixed(0)} pips</span></div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'10px',color:'#DC2626',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>Stop Loss</div>
            <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst?.pip}
              style={{width:'100%',padding:'8px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.3)',borderRadius:'8px',fontSize:'13px',fontFamily:"'JetBrains Mono',monospace",color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'10px',color:'#16A34A',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>Take Profit</div>
            <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst?.pip}
              style={{width:'100%',padding:'8px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.3)',borderRadius:'8px',fontSize:'13px',fontFamily:"'JetBrains Mono',monospace",color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>
        <div style={{fontSize:'10px',color:'#8FA3BF',textAlign:'center',marginBottom:'12px'}}>💡 Drag SL/TP lines directly on the chart</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',background:'#F4F7FD',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:600,color:'#5C7A9E'}}>Cancel</button>
          <button onClick={()=>onSave(sl,tp)} style={{flex:2,padding:'10px',background:'#2255CC',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:700,color:'#fff'}}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

/* ══ PLATFORM PAGE ════════════════════════════════════════════════ */
export function PlatformPage(){
  const navigate=useNavigate()
  const {toasts,toast,dismiss}=useToast()
  const {accounts,primary:defPrimary}=useAccount()
  const [selAccId,setSelAccId]=useState<string|null>(null)
  const primary=accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,      setSym]      =useState<string>(()=>lsGet('tfd_sym','EUR/USD'))
  const [tfLabel,  setTfLabel]  =useState<string>(()=>lsGet('tfd_tf','1h'))
  const [favorites,setFavs]     =useState<string[]>(()=>lsGet('tfd_favs',['EUR/USD','GBP/USD','XAU/USD','NAS100']))
  const [catFilter,setCatFilter]=useState<string>(()=>lsGet('tfd_cat','All'))
  const [dir,      setDir]      =useState<'buy'|'sell'>('buy')
  const [lots,     setLots]     =useState('0.10')
  const [sl,       setSl]       =useState('')
  const [tp,       setTp]       =useState('')
  const [tab,      setTab]      =useState<'positions'|'history'>('positions')
  const [search,   setSearch]   =useState('')
  const [placing,  setPlacing]  =useState(false)
  const [editTrade,setEditTrade]=useState<any>(null)
  const [openTrades,setOpenTrades]=useState<any[]>([])
  const [closedTrades,setClosedTrades]=useState<any[]>([])

  const {prices,prevRef,priceRef,push}=usePriceFeed()
  const tradesRef =useRef<any[]>([]);  tradesRef.current =openTrades
  const primaryRef=useRef<any>(null);  primaryRef.current=primary
  const closingRef=useRef<Set<string>>(new Set())

  const tf     =TF_LIST.find(t=>t.label===tfLabel)??TF_LIST[4]
  const inst   =(INSTRUMENTS.find(i=>i.sym===sym)??INSTRUMENTS[0]) as any
  const live   =prices[sym]||SEEDS[sym]
  const prev   =prevRef.current[sym]||live
  const up     =live>=prev
  const exec   =+(dir==='buy'?live+inst.spread:live).toFixed(inst.dec)
  const lotsNum=Math.max(0.01,parseFloat(lots)||0.01)
  const balance=primary?.balance??0
  const openPnl=openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]),0)
  const equity =balance+openPnl
  const usedMgn=openTrades.reduce((s,t)=>{
    const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    return s+(i?.lotUSD(prices[t.symbol]||SEEDS[t.symbol])*t.lots/LEVERAGE||0)
  },0)
  const freeMgn=equity-usedMgn
  const mgnLvl =usedMgn>0?(equity/usedMgn)*100:999
  const reqMgn =inst.lotUSD(exec)*lotsNum/LEVERAGE
  const notional=inst.lotUSD(exec)*lotsNum
  const maxLots=freeMgn>0?Math.floor((freeMgn*LEVERAGE/inst.lotUSD(exec))*100)/100:0

  // One-time FCS API test on mount
  useEffect(()=>{
    // Test FCS candle endpoint and log raw response
    fetch(`https://api-v4.fcsapi.com/forex/history?symbol=XAUUSD&period=1h&number=5&type=commodity&access_key=${FCS_KEY}`)
      .then(r=>r.json())
      .then(d=>console.log('[FCS test] XAUUSD 1h:', JSON.stringify(d).slice(0,500)))
      .catch(e=>console.error('[FCS test error]',e))
    fetch(`https://api-v4.fcsapi.com/forex/latest?symbol=EURUSD&type=forex&access_key=${FCS_KEY}`)
      .then(r=>r.json())
      .then(d=>console.log('[FCS latest] EURUSD:', JSON.stringify(d).slice(0,300)))
      .catch(e=>console.error('[FCS latest error]',e))
  },[])

  useEffect(()=>lsSet('tfd_sym',sym),[sym])
  useEffect(()=>lsSet('tfd_tf',tfLabel),[tfLabel])
  useEffect(()=>lsSet('tfd_favs',favorites),[favorites])
  useEffect(()=>lsSet('tfd_cat',catFilter),[catFilter])

  useEffect(()=>{
    if(!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open').order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed').order('closed_at',{ascending:false}).limit(100).then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  useRiskMonitor(tradesRef,priceRef,primaryRef,primary?.id,async(reason:string,trades:any[])=>{
    toast('error','🚨','Account Breached',reason)
    if(!primary?.id) return
    for(const t of trades){
      const cur=priceRef.current[t.symbol]||SEEDS[t.symbol]||t.open_price
      const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const cp=+(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
      const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
      const isJpy=t.symbol.includes('JPY')
      const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i?.lotUSD(1)??LOT_SIZE)*t.lots).toFixed(2)
      await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,closed_at:new Date().toISOString()}).eq('id',t.id)
    }
    const newBal=+(balance+trades.reduce((s,t)=>{
      const cur=priceRef.current[t.symbol]||t.open_price
      const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const isJpy=t.symbol.includes('JPY')
      return s+(t.direction==='buy'?cur-t.open_price:t.open_price-cur)*(isJpy?LOT_SIZE/cur:i?.lotUSD(1)??LOT_SIZE)*t.lots
    },0)).toFixed(2)
    await supabase.from('accounts').update({status:'breached',phase:'breached',balance:newBal,equity:newBal}).eq('id',primary.id)
    setOpenTrades([])
  })

  // Auto-close SL/TP
  useEffect(()=>{
    if(!primary?.id) return
    const iv=setInterval(async()=>{
      const trades=tradesRef.current,pr=primaryRef.current
      if(!trades.length||!pr) return
      for(const t of trades){
        if(closingRef.current.has(t.id)) continue
        if(!t.sl&&!t.tp) continue
        const realPrice=priceRef.current[t.symbol]
        if(!realPrice||realPrice<=0) continue
        const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
        if(!i) continue
        let hit=''
        if(t.sl){const sl=Number(t.sl);if(sl>0){const h=t.direction==='buy'?realPrice<=sl:realPrice>=sl;if(h)hit=`SL @ ${realPrice.toFixed(i.dec)}`}}
        if(!hit&&t.tp){const tp=Number(t.tp);if(tp>0){const h=t.direction==='buy'?realPrice>=tp:realPrice<=tp;if(h)hit=`TP @ ${realPrice.toFixed(i.dec)}`}}
        if(!hit) continue
        closingRef.current.add(t.id)
        try{
          const cp=+(t.direction==='buy'?realPrice:realPrice+i.spread).toFixed(i.dec)
          const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
          const isJpy=t.symbol.includes('JPY')
          const units=isJpy?LOT_SIZE/cp:i.lotUSD(1)
          const netPnl=+(diff*units*t.lots).toFixed(2)
          const pips=+(diff/i.pip).toFixed(1)
          if(Math.abs(netPnl)>(pr.balance??0)*2){closingRef.current.delete(t.id);continue}
          const now=new Date().toISOString()
          await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
          await supabase.from('accounts').update({balance:+((pr.balance??0)+netPnl).toFixed(2),equity:+((pr.balance??0)+netPnl).toFixed(2)}).eq('id',pr.id)
          setOpenTrades(p=>p.filter(x=>x.id!==t.id))
          setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
          toast(netPnl>=0?'success':'error',netPnl>=0?'🎯':'🛑',`${hit} — ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)} | ${pips>=0?'+':''}${pips}p`)
        }catch(e){closingRef.current.delete(t.id)}
      }
    },1000)
    return()=>clearInterval(iv)
  },[primary?.id])

  function toggleFav(s:string){setFavs(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])}

  async function placeOrder(){
    if(!primary?.id){toast('error','❌','No Account','Select a funded account.');return}
    if(primary.status==='breached'){toast('error','❌','Breached','Account is breached.');return}
    if(reqMgn>freeMgn){toast('error','❌','Insufficient Margin',`Required: $${reqMgn.toFixed(2)} | Free: $${freeMgn.toFixed(2)} | Max lots: ${maxLots}`);return}
    setPlacing(true)
    const {data,error}=await supabase.from('trades').insert({
      account_id:primary.id,user_id:primary.user_id,
      symbol:sym,direction:dir,lots:lotsNum,
      open_price:exec,status:'open',
      sl:sl?parseFloat(sl):null,
      tp:tp?parseFloat(tp):null,
      opened_at:new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if(error){toast('error','❌','Error',error.message);return}
    setOpenTrades(p=>[data,...p])
    toast('success','✅',`${dir.toUpperCase()} ${sym}`,`${lotsNum} lots @ ${exec} | Margin: $${reqMgn.toFixed(2)}`)
    setSl('');setTp('')
  }

  async function closeTrade(t:any){
    const cur=prices[t.symbol]||SEEDS[t.symbol]||t.open_price
    const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    const cp=+(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
    const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
    const isJpy=t.symbol.includes('JPY')
    const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i?.lotUSD(1)??LOT_SIZE)*t.lots).toFixed(2)
    const pips=+(diff/(i?.pip??0.0001)).toFixed(1)
    const now=new Date().toISOString()
    await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
    await supabase.from('accounts').update({balance:+(balance+netPnl).toFixed(2),equity:+(equity+netPnl-openPnl).toFixed(2)}).eq('id',primary!.id)
    setOpenTrades(p=>p.filter(x=>x.id!==t.id))
    setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
    toast(netPnl>=0?'success':'error',netPnl>=0?'💰':'📉',`Closed ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)} | ${pips>=0?'+':''}${pips}p`)
  }

  async function saveSLTP(newSl:string,newTp:string){
    if(!editTrade) return
    const updates={sl:newSl?parseFloat(newSl):null,tp:newTp?parseFloat(newTp):null}
    await supabase.from('trades').update(updates).eq('id',editTrade.id)
    setOpenTrades(p=>p.map(t=>t.id===editTrade.id?{...t,...updates}:t))
    setEditTrade(null)
    toast('success','✅','SL/TP Updated',editTrade.symbol)
  }

  async function handleChartSLTP(tradeId:string,newSl:number|null,newTp:number|null){
    await supabase.from('trades').update({sl:newSl,tp:newTp}).eq('id',tradeId)
    setOpenTrades(p=>p.map(t=>t.id===tradeId?{...t,sl:newSl,tp:newTp}:t))
    toast('info','📍','Updated','SL/TP moved on chart')
  }

  const CATS=['All','Favourites','Forex','Metals','Indices','Commodities']
  const visible=INSTRUMENTS.filter(i=>{
    if(catFilter==='Favourites') return favorites.includes(i.sym)
    if(catFilter!=='All'&&i.cat!==catFilter) return false
    if(search&&!i.sym.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const mono={fontFamily:"'JetBrains Mono',monospace"} as const

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#F0F4FB',color:'#1A3A6B',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{height:'48px',background:'#1A3A6B',display:'flex',alignItems:'center',padding:'0 12px',gap:'10px',flexShrink:0}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>← Dashboard</button>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:700,color:'#fff'}}>The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ADE80',boxShadow:'0 0 8px #4ADE80'}}/>
          <span style={{fontSize:'10px',color:'#4ADE80',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase'}}>Live</span>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:'6px',alignItems:'center'}}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>setSelAccId(a.id)} style={{padding:'4px 10px',background:a.id===primary?.id?'rgba(96,165,250,.2)':'rgba(255,255,255,.08)',border:a.id===primary?.id?'1px solid rgba(96,165,250,.4)':'1px solid rgba(255,255,255,.1)',borderRadius:'5px',color:a.id===primary?.id?'#60A5FA':'rgba(255,255,255,.5)',fontSize:'10px',...mono,cursor:'pointer'}}>
              {(a as any).account_number}
            </button>
          ))}
        </div>
        <div style={{display:'flex'}}>
          {[['Bal',`$${(Number(balance)||0).toFixed(2)}`,'#fff'],['Equity',`$${(Number(equity)||0).toFixed(2)}`,equity>=balance?'#4ADE80':'#F87171'],['Float',`${openPnl>=0?'+':''}$${(Number(openPnl)||0).toFixed(2)}`,openPnl>=0?'#4ADE80':'#F87171'],['Margin',`$${(Number(usedMgn)||0).toFixed(2)}`,'#FCD34D'],['Free',`$${(Number(freeMgn)||0).toFixed(2)}`,'#60A5FA']].map(([l,v,c])=>(
            <div key={String(l)} style={{padding:'0 9px',borderLeft:'1px solid rgba(255,255,255,.1)',textAlign:'right'}}>
              <div style={{fontSize:'8px',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'1px'}}>{l}</div>
              <div style={{...mono,fontSize:'11px',fontWeight:600,color:String(c)}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* WATCHLIST */}
        <div style={{width:'185px',background:'#fff',borderRight:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
          <div style={{padding:'8px',borderBottom:'1px solid #E8EEF8',flexShrink:0}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:'100%',padding:'5px 8px',background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:'2px',marginTop:'5px',flexWrap:'wrap'}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{padding:'2px 5px',fontSize:'8px',fontWeight:700,border:'none',borderRadius:'4px',cursor:'pointer',background:catFilter===c?'#2255CC':'#F4F7FD',color:catFilter===c?'#fff':'#8FA3BF',textTransform:'uppercase'}}>
                  {c==='Favourites'?'★':c==='Commodities'?'Comm':c}
                </button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {visible.length===0&&catFilter==='Favourites'&&<div style={{padding:'20px 12px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>★ Click star to add pairs</div>}
            {visible.map(i=>{
              const price=prices[i.sym]||SEEDS[i.sym]
              const pv=prevRef.current[i.sym]||price
              const isUp=price>=pv
              const active=sym===i.sym
              const isFav=favorites.includes(i.sym)
              return(
                <div key={i.sym} style={{padding:'6px 8px',borderBottom:'1px solid #F0F4FB',display:'flex',alignItems:'center',background:active?'#EEF3FF':'transparent',borderLeft:active?'3px solid #2255CC':'3px solid transparent'}}>
                  <button onClick={()=>toggleFav(i.sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:isFav?'#F59E0B':'#D1D5DB',padding:'0 4px 0 0',flexShrink:0}}>{isFav?'★':'☆'}</button>
                  <div style={{flex:1,cursor:'pointer'}} onClick={()=>setSym(i.sym)}>
                    <div style={{fontSize:'11px',fontWeight:600,color:active?'#2255CC':'#1A3A6B'}}>{i.sym}</div>
                    <div style={{fontSize:'9px',color:'#8FA3BF'}}>{i.cat}</div>
                  </div>
                  <div style={{textAlign:'right',cursor:'pointer'}} onClick={()=>setSym(i.sym)}>
                    <div style={{...mono,fontSize:'11px',fontWeight:500,color:isUp?'#16A34A':'#DC2626'}}>{price.toFixed(i.dec)}</div>
                    <div style={{fontSize:'9px',color:isUp?'#16A34A':'#DC2626'}}>{isUp?'▲':'▼'}{Math.abs(price-pv).toFixed(i.dec)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CHART */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{height:'40px',background:'#fff',borderBottom:'1px solid #E8EEF8',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
            <div style={{...mono,fontSize:'20px',fontWeight:700,color:up?'#16A34A':'#DC2626'}}>{live.toFixed(inst.dec)}</div>
            <div style={{fontSize:'11px',color:up?'#16A34A':'#DC2626'}}>{up?'▲':'▼'} {Math.abs(live-prev).toFixed(inst.dec)}</div>
            <div style={{fontSize:'14px',fontWeight:700,color:'#1A3A6B'}}>{sym}</div>
            <button onClick={()=>toggleFav(sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:favorites.includes(sym)?'#F59E0B':'#D1D5DB',padding:'0'}}>{favorites.includes(sym)?'★':'☆'}</button>
            <div style={{display:'flex',gap:'3px',marginLeft:'8px'}}>
              {TF_LIST.map(t=>(
                <button key={t.label} onClick={()=>setTfLabel(t.label)} style={{padding:'3px 9px',fontSize:'10px',fontWeight:600,border:'none',borderRadius:'5px',cursor:'pointer',background:tfLabel===t.label?'#2255CC':'#F4F7FD',color:tfLabel===t.label?'#fff':'#5C7A9E'}}>{t.label}</button>
              ))}
            </div>
            <div style={{marginLeft:'auto',fontSize:'10px',color:'#2255CC',background:'#EEF3FF',padding:'3px 10px',borderRadius:'20px',fontWeight:600}}>● Live</div>
          </div>
          <div style={{flex:1}}>
            <CandleChart inst={inst} tf={tf} livePrice={live} openTrades={openTrades} onSLTP={handleChartSLTP}/>
          </div>
        </div>

        {/* ORDER PANEL */}
        <div style={{width:'235px',background:'#fff',borderLeft:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'12px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'10px'}}>New Order — {sym}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'10px'}}>
              <button onClick={()=>setDir('buy')}  style={{padding:'10px',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,fontSize:'13px',background:dir==='buy'?'#16A34A':'#F4F7FD',color:dir==='buy'?'#fff':'#5C7A9E'}}>BUY</button>
              <button onClick={()=>setDir('sell')} style={{padding:'10px',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,fontSize:'13px',background:dir==='sell'?'#DC2626':'#F4F7FD',color:dir==='sell'?'#fff':'#5C7A9E'}}>SELL</button>
            </div>
            <div style={{background:dir==='buy'?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)',border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`,borderRadius:'8px',padding:'10px',marginBottom:'10px',textAlign:'center'}}>
              <div style={{fontSize:'9px',color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'3px'}}>Execution Price · Live</div>
              <div style={{...mono,fontSize:'22px',fontWeight:700,color:dir==='buy'?'#16A34A':'#DC2626'}}>{exec.toFixed(inst.dec)}</div>
              <div style={{fontSize:'9px',color:'#8FA3BF',marginTop:'2px'}}>spread {inst.spread.toFixed(inst.dec)}</div>
            </div>
            <div style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontSize:'9px',color:'#8FA3BF',fontWeight:600,textTransform:'uppercase'}}>Lots</span>
                <span style={{fontSize:'9px',color:'#8FA3BF'}}>Max: <span style={{color:lotsNum>maxLots?'#DC2626':'#16A34A',fontWeight:600}}>{maxLots}</span></span>
              </div>
              <div style={{display:'flex',border:'1px solid #E8EEF8',borderRadius:'8px',overflow:'hidden'}}>
                <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 14px',background:'#F4F7FD',border:'none',borderRight:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'20px',lineHeight:1}}>−</button>
                <input value={lots} onChange={e=>setLots(e.target.value)} type="number" min="0.01" step="0.01"
                  style={{flex:1,padding:'8px',background:'#fff',border:'none',textAlign:'center',...mono,fontSize:'14px',fontWeight:600,color:lotsNum>maxLots?'#DC2626':'#1A3A6B',outline:'none'}}/>
                <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 14px',background:'#F4F7FD',border:'none',borderLeft:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'20px',lineHeight:1}}>+</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'10px'}}>
              <div>
                <div style={{fontSize:'9px',color:'#DC2626',fontWeight:600,textTransform:'uppercase',marginBottom:'3px'}}>Stop Loss</div>
                <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst.pip}
                  style={{width:'100%',padding:'6px 8px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:'9px',color:'#16A34A',fontWeight:600,textTransform:'uppercase',marginBottom:'3px'}}>Take Profit</div>
                <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst.pip}
                  style={{width:'100%',padding:'6px 8px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.2)',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{background:'#F4F7FD',borderRadius:'8px',padding:'10px',marginBottom:'10px',border:lotsNum>maxLots?'1px solid rgba(220,38,38,.3)':'1px solid transparent'}}>
              <div style={{fontSize:'9px',color:'#8FA3BF',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>Leverage 1:{LEVERAGE}</div>
              {[['Notional',`$${(Number(notional)||0).toFixed(0)}`,'#5C7A9E'],['Req. Margin',`$${(Number(reqMgn)||0).toFixed(2)}`,lotsNum>maxLots?'#DC2626':'#1A3A6B'],['Free Margin',`$${(Number(freeMgn)||0).toFixed(2)}`,freeMgn>reqMgn?'#16A34A':'#DC2626'],['Margin Lvl',usedMgn>0?`${(Number(mgnLvl)||0).toFixed(0)}%`:'∞',mgnLvl<150&&usedMgn>0?'#DC2626':'#16A34A']].map(([l,v,c])=>(
                <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',fontSize:'11px'}}>
                  <span style={{color:'#8FA3BF'}}>{l}</span>
                  <span style={{...mono,color:String(c),fontWeight:500}}>{v}</span>
                </div>
              ))}
              {lotsNum>maxLots&&<div style={{marginTop:'6px',fontSize:'10px',color:'#DC2626',fontWeight:600,background:'rgba(220,38,38,.06)',padding:'4px 8px',borderRadius:'4px'}}>⚠ Max {maxLots} lots at 1:{LEVERAGE}</div>}
            </div>
            <button onClick={placeOrder} disabled={placing||!primary||primary.status==='breached'||lotsNum>maxLots}
              style={{width:'100%',padding:'12px',fontSize:'13px',fontWeight:700,border:'none',borderRadius:'8px',cursor:lotsNum>maxLots?'not-allowed':'pointer',background:lotsNum>maxLots?'#9CA3AF':dir==='buy'?'#16A34A':'#DC2626',color:'#fff',opacity:placing||!primary||primary.status==='breached'?0.5:1,letterSpacing:'.5px',textTransform:'uppercase'}}>
              {placing?'…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
            </button>
          </div>
          <div style={{padding:'10px 12px',borderTop:'1px solid #E8EEF8',flexShrink:0}}>
            {[['Account',(primary as any)?.account_number??'—','#1A3A6B'],['Phase',primary?.phase??'—','#2255CC'],['Status',primary?.status??'—',primary?.status==='active'?'#16A34A':'#DC2626']].map(([l,v,c])=>(
              <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'10px'}}>
                <span style={{color:'#8FA3BF'}}>{l}</span>
                <span style={{...mono,color:String(c),fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{height:'180px',background:'#fff',borderTop:'1px solid #E8EEF8',flexShrink:0,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',borderBottom:'1px solid #E8EEF8',height:'34px',padding:'0 12px',flexShrink:0}}>
          {(['positions','history'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'0 14px',height:'34px',fontSize:'11px',fontWeight:600,border:'none',borderBottom:tab===t?'2px solid #2255CC':'2px solid transparent',background:'transparent',color:tab===t?'#2255CC':'#8FA3BF',cursor:'pointer',textTransform:'capitalize'}}>
              {t}{t==='positions'&&openTrades.length>0?` (${openTrades.length})`:''}
            </button>
          ))}
          <div style={{marginLeft:'auto',...mono,fontSize:'12px',fontWeight:600,color:openPnl>=0?'#16A34A':'#DC2626'}}>
            Float: {openPnl>=0?'+':''}${(Number(openPnl)||0).toFixed(2)}
          </div>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {tab==='positions'?(
            openTrades.length===0
              ?<div style={{padding:'18px',textAlign:'center',fontSize:'12px',color:'#8FA3BF'}}>No open positions</div>
              :<table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr>{['Symbol','Dir','Lots','Entry','Live','P&L','Pips','SL','TP','Margin','Actions'].map(h=>(
                  <th key={h} style={{padding:'4px 8px',fontSize:'9px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB',whiteSpace:'nowrap'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{openTrades.map(t=>{
                  const cur=prices[t.symbol]||SEEDS[t.symbol]||t.open_price
                  const pnl=calcPnl(t,cur)
                  const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                  const pipD=i?(t.direction==='buy'?cur-t.open_price:t.open_price-cur)/(i.pip??0.0001):0
                  const tMgn=i?(i.lotUSD(cur)*t.lots/LEVERAGE):0
                  return(
                    <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                      <td style={{padding:'5px 8px',fontWeight:600}}>
                        <button onClick={()=>setSym(t.symbol)} style={{background:'none',border:'none',cursor:'pointer',fontWeight:600,color:'#2255CC',fontSize:'11px',padding:0}}>{t.symbol}</button>
                      </td>
                      <td style={{padding:'5px 8px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                      <td style={{padding:'5px 8px',...mono}}>{t.lots}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,color:cur>=t.open_price?'#16A34A':'#DC2626',fontWeight:500}}>{cur.toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,fontWeight:700,color:pnl>=0?'#16A34A':'#DC2626'}}>{pnl>=0?'+':''}${(Number(pnl)||0).toFixed(2)}</td>
                      <td style={{padding:'5px 8px',...mono,color:pipD>=0?'#16A34A':'#DC2626'}}>{pipD>=0?'+':''}{(Number(pipD)||0).toFixed(1)}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#DC2626',fontSize:'10px'}}>{t.sl??'—'}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#16A34A',fontSize:'10px'}}>{t.tp??'—'}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E',fontSize:'10px'}}>${(Number(tMgn)||0).toFixed(2)}</td>
                      <td style={{padding:'5px 8px'}}>
                        <div style={{display:'flex',gap:'4px'}}>
                          <button onClick={()=>setEditTrade(t)} style={{padding:'3px 8px',fontSize:'10px',fontWeight:600,background:'#EEF3FF',border:'1px solid rgba(34,85,204,.2)',borderRadius:'5px',cursor:'pointer',color:'#2255CC',whiteSpace:'nowrap'}}>Edit</button>
                          <button onClick={()=>closeTrade(t)} style={{padding:'3px 8px',fontSize:'10px',fontWeight:600,background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'5px',cursor:'pointer',color:'#DC2626',whiteSpace:'nowrap'}}>Close</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
          ):(
            closedTrades.length===0
              ?<div style={{padding:'18px',textAlign:'center',fontSize:'12px',color:'#8FA3BF'}}>No closed trades</div>
              :<table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr>{['Symbol','Dir','Lots','Open','Close','P&L','Pips','Closed'].map(h=>(
                  <th key={h} style={{padding:'4px 8px',fontSize:'9px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{closedTrades.map(t=>{
                  const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                  return(
                    <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                      <td style={{padding:'5px 8px',fontWeight:600}}>{t.symbol}</td>
                      <td style={{padding:'5px 8px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                      <td style={{padding:'5px 8px',...mono}}>{t.lots}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E'}}>{(Number(t.close_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,fontWeight:700,color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>{(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}</td>
                      <td style={{padding:'5px 8px',...mono,color:(t.pips??0)>=0?'#16A34A':'#DC2626'}}>{(t.pips??0)>=0?'+':''}{(Number(t.pips)||0).toFixed(1)}</td>
                      <td style={{padding:'5px 8px',color:'#8FA3BF',fontSize:'10px'}}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
          )}
        </div>
      </div>

      {editTrade&&<EditModal trade={editTrade} inst={INSTRUMENTS.find(i=>i.sym===editTrade.symbol)} onSave={saveSLTP} onClose={()=>setEditTrade(null)}/>}
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </div>
  )
}
