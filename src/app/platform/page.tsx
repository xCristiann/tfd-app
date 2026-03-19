import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const FINNHUB  = (import.meta as any).env?.VITE_FINNHUB_KEY ?? ''
const LEVERAGE = 50
const LOT_SIZE = 100_000

function lsGet<T>(key: string, fb: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb } catch { return fb } }
function lsSet(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

/* ══ INSTRUMENTS ══════════════════════════════════════════════════ */
const INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',        fh:'OANDA:EUR_USD',  dec:5, pip:0.0001, spread:0.00010, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', tv:'FX:GBPUSD',        fh:'OANDA:GBP_USD',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', tv:'FX:USDJPY',        fh:'OANDA:USD_JPY',  dec:3, pip:0.01,   spread:0.010,   cat:'Forex',       lotUSD:(_:number)=>LOT_SIZE },
  { sym:'USD/CHF', tv:'FX:USDCHF',        fh:'OANDA:USD_CHF',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', tv:'FX:AUDUSD',        fh:'OANDA:AUD_USD',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', tv:'FX:USDCAD',        fh:'OANDA:USD_CAD',  dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>LOT_SIZE/p },
  { sym:'NZD/USD', tv:'FX:NZDUSD',        fh:'OANDA:NZD_USD',  dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'EUR/JPY', tv:'FX:EURJPY',        fh:'OANDA:EUR_JPY',  dec:3, pip:0.01,   spread:0.025,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'GBP/JPY', tv:'FX:GBPJPY',        fh:'OANDA:GBP_JPY',  dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', tv:'FX:EURGBP',        fh:'OANDA:EUR_GBP',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*1.27*LOT_SIZE },
  { sym:'AUD/JPY', tv:'FX:AUDJPY',        fh:'OANDA:AUD_JPY',  dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'CAD/JPY', tv:'FX:CADJPY',        fh:'OANDA:CAD_JPY',  dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'XAU/USD', tv:'TVC:GOLD',         fh:'OANDA:XAU_USD',  dec:2, pip:0.10,   spread:0.30,    cat:'Metals',      lotUSD:(p:number)=>p*100 },
  { sym:'XAG/USD', tv:'TVC:SILVER',       fh:'OANDA:XAG_USD',  dec:4, pip:0.001,  spread:0.030,   cat:'Metals',      lotUSD:(p:number)=>p*5000 },
  { sym:'NAS100',  tv:'CAPITALCOM:US100', fh:'NASDAQ:QQQ',     dec:2, pip:1.0,    spread:1.5,     cat:'Indices', idxMult:40,  lotUSD:(p:number)=>p*400 },
  { sym:'US500',   tv:'CAPITALCOM:US500', fh:'AMEX:SPY',       dec:2, pip:0.10,   spread:0.50,    cat:'Indices', idxMult:10,  lotUSD:(p:number)=>p*500 },
  { sym:'US30',    tv:'CAPITALCOM:US30',  fh:'AMEX:DIA',       dec:1, pip:1.0,    spread:2.0,     cat:'Indices', idxMult:100, lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   tv:'CAPITALCOM:DE40',  fh:'XETRA:EXS1',    dec:1, pip:1.0,    spread:1.0,     cat:'Indices', idxMult:1,   lotUSD:(p:number)=>p*25 },
  { sym:'WTI',     tv:'TVC:USOIL',        fh:'OANDA:BCO_USD',  dec:2, pip:0.01,   spread:0.03,    cat:'Commodities', lotUSD:(p:number)=>p*1000 },
] as const

const SEEDS: Record<string,number> = {
  'EUR/USD':1.0853,'GBP/USD':1.2940,'USD/JPY':148.50,'USD/CHF':0.8820,
  'AUD/USD':0.6350,'USD/CAD':1.3580,'NZD/USD':0.5780,'EUR/JPY':170.20,
  'GBP/JPY':192.50,'EUR/GBP':0.8380,'AUD/JPY':94.30,'CAD/JPY':109.30,
  'XAU/USD':2980.0,'XAG/USD':33.50,
  'NAS100':21700,'US500':5750,'US30':42800,'GER40':22500,'WTI':71.50,
}

/* ══ TIMEFRAMES ═══════════════════════════════════════════════════ */
const TF_LIST = [
  { label:'1m',  sec:60,    res:'1',   daysBack:2   },
  { label:'5m',  sec:300,   res:'5',   daysBack:7   },
  { label:'15m', sec:900,   res:'15',  daysBack:14  },
  { label:'30m', sec:1800,  res:'30',  daysBack:30  },
  { label:'1h',  sec:3600,  res:'60',  daysBack:90  },
  { label:'4h',  sec:14400, res:'240', daysBack:365 },
  { label:'1d',  sec:86400, res:'D',   daysBack:1000},
]

type Candle = { time:number; open:number; high:number; low:number; close:number }

/* ══ LWC LOADER ═══════════════════════════════════════════════════ */
let _lwcReady = false
const _lwcQ: Array<()=>void> = []
function loadLWC(): Promise<void> {
  return new Promise(res => {
    if (_lwcReady) { res(); return }
    _lwcQ.push(res)
    if (document.getElementById('lwc-script')) return
    const s = document.createElement('script')
    s.id  = 'lwc-script'
    s.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload = () => { _lwcReady = true; _lwcQ.forEach(f => f()); _lwcQ.length = 0 }
    document.head.appendChild(s)
  })
}

/* ══ CANDLE FETCH (Finnhub) ════════════════════════════════════════ */
async function fetchCandles(inst: any, tf: typeof TF_LIST[number]): Promise<Candle[]> {
  if (!FINNHUB) return generateDemoCandles(inst, tf)
  const to   = Math.floor(Date.now() / 1000)
  const from = to - tf.daysBack * 86400
  const mult = (inst as any).idxMult ?? 1
  const isStock = inst.cat === 'Indices'
  const url  = isStock
    ? `https://finnhub.io/api/v1/stock/candle?symbol=${inst.fh}&resolution=${tf.res}&from=${from}&to=${to}&token=${FINNHUB}`
    : `https://finnhub.io/api/v1/forex/candle?symbol=${inst.fh}&resolution=${tf.res}&from=${from}&to=${to}&token=${FINNHUB}`
  try {
    const r = await fetch(url)
    const d = await r.json()
    if (d.s !== 'ok' || !d.t?.length) return generateDemoCandles(inst, tf)
    return d.t.map((t:number,i:number) => ({
      time:  t,
      open:  +((d.o[i]??0)*mult).toFixed(inst.dec),
      high:  +((d.h[i]??0)*mult).toFixed(inst.dec),
      low:   +((d.l[i]??0)*mult).toFixed(inst.dec),
      close: +((d.c[i]??0)*mult).toFixed(inst.dec),
    }))
  } catch { return generateDemoCandles(inst, tf) }
}

function generateDemoCandles(inst: any, tf: typeof TF_LIST[number]): Candle[] {
  const count = Math.min(300, tf.daysBack * 86400 / tf.sec)
  const now   = Math.floor(Date.now() / 1000)
  const seed  = SEEDS[inst.sym] ?? 1
  const candles: Candle[] = []
  let price = seed
  const vol = seed * 0.0006
  for (let i = count; i >= 0; i--) {
    const time  = Math.floor((now - i*tf.sec) / tf.sec) * tf.sec
    const open  = price
    const move  = (Math.random() - 0.49) * vol * 2
    const close = Math.max(seed*0.93, Math.min(seed*1.07, open+move))
    const high  = Math.max(open,close) + Math.random()*vol*0.5
    const low   = Math.min(open,close) - Math.random()*vol*0.5
    candles.push({ time, open:+open.toFixed(inst.dec), high:+high.toFixed(inst.dec), low:+low.toFixed(inst.dec), close:+close.toFixed(inst.dec) })
    price = close
  }
  return candles
}

/* ══ CHART COMPONENT ══════════════════════════════════════════════ */
function CandleChart({ inst, tf, livePrice, openTrades, onSLTP }: {
  inst:       any
  tf:         typeof TF_LIST[number]
  livePrice:  number
  openTrades: any[]
  onSLTP:     (id:string, sl:number|null, tp:number|null) => void
}) {
  const divRef    = useRef<HTMLDivElement>(null)
  const chartRef  = useRef<any>(null)
  const serRef    = useRef<any>(null)
  const lastRef   = useRef<Candle|null>(null)
  const linesRef  = useRef<Map<string,{entry:any;sl:any;tp:any}>>(new Map())
  const dragging  = useRef<{tradeId:string;type:'sl'|'tp'}|null>(null)

  // Build chart when sym or tf changes
  useEffect(() => {
    const el = divRef.current; if (!el) return
    let dead = false
    loadLWC().then(async () => {
      if (dead || !divRef.current) return
      try { chartRef.current?.remove() } catch {}
      linesRef.current.clear()
      const LWC = (window as any).LightweightCharts
      const chart = LWC.createChart(el, {
        width:  el.clientWidth,
        height: el.clientHeight,
        layout: { background:{ type:'solid', color:'#FAFBFF' }, textColor:'#5C7A9E' },
        grid:   { vertLines:{ color:'rgba(34,85,204,.05)' }, horzLines:{ color:'rgba(34,85,204,.05)' } },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor:'#E8EEF8' },
        timeScale:       { borderColor:'#E8EEF8', timeVisible:true, secondsVisible:tf.sec < 3600 },
      })
      const series = chart.addCandlestickSeries({
        upColor:'#16A34A', downColor:'#DC2626',
        borderUpColor:'#16A34A', borderDownColor:'#DC2626',
        wickUpColor:'#16A34A', wickDownColor:'#DC2626',
      })
      chartRef.current = chart; serRef.current = series
      const ro = new ResizeObserver(() => {
        if (chartRef.current && divRef.current)
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

  // Live candle tick
  useEffect(() => {
    if (!serRef.current || livePrice <= 0) return
    const now  = Math.floor(Date.now()/1000)
    const cTime = Math.floor(now/tf.sec)*tf.sec
    const prev  = lastRef.current
    const c: Candle = (!prev || cTime > prev.time)
      ? { time:cTime, open:livePrice, high:livePrice, low:livePrice, close:livePrice }
      : { time:prev.time, open:prev.open, high:Math.max(prev.high,livePrice), low:Math.min(prev.low,livePrice), close:livePrice }
    lastRef.current = c
    try { serRef.current.update(c) } catch {}
  }, [livePrice, tf.sec])

  // Draw SL/TP/Entry lines — draggable
  useEffect(() => {
    const series = serRef.current; if (!series) return
    const trades = openTrades.filter(t => t.symbol === inst.sym)
    const existingIds = new Set(linesRef.current.keys())

    // Remove lines for closed trades
    existingIds.forEach(id => {
      if (!trades.find(t => t.id === id)) {
        const l = linesRef.current.get(id)
        try { series.removePriceLine(l?.entry) } catch {}
        try { if (l?.sl) series.removePriceLine(l.sl) } catch {}
        try { if (l?.tp) series.removePriceLine(l.tp) } catch {}
        linesRef.current.delete(id)
      }
    })

    trades.forEach(t => {
      const isBuy = t.direction === 'buy'
      const existing = linesRef.current.get(t.id)

      if (!existing) {
        // Entry line
        const entry = series.createPriceLine({
          price: t.open_price,
          color: isBuy ? 'rgba(34,85,204,.9)' : 'rgba(180,50,50,.9)',
          lineWidth: 2, lineStyle: 0,
          axisLabelVisible: true,
          title: `${t.direction.toUpperCase()} ${t.lots}`,
        })
        // SL line — draggable
        const sl = t.sl ? series.createPriceLine({
          price: Number(t.sl),
          color: 'rgba(220,38,38,.9)',
          lineWidth: 1, lineStyle: 1,
          axisLabelVisible: true,
          title: '— SL',
          draggable: true,
        }) : null
        // TP line — draggable
        const tp = t.tp ? series.createPriceLine({
          price: Number(t.tp),
          color: 'rgba(22,163,74,.9)',
          lineWidth: 1, lineStyle: 1,
          axisLabelVisible: true,
          title: '— TP',
          draggable: true,
        }) : null

        // Listen for drag events
        if (sl) {
          sl.onDragEnd((params: any) => {
            const newPrice = params?.customValues?.price ?? params?.price
            if (newPrice) onSLTP(t.id, newPrice, t.tp ? Number(t.tp) : null)
          })
        }
        if (tp) {
          tp.onDragEnd((params: any) => {
            const newPrice = params?.customValues?.price ?? params?.price
            if (newPrice) onSLTP(t.id, t.sl ? Number(t.sl) : null, newPrice)
          })
        }
        linesRef.current.set(t.id, { entry, sl, tp })
      } else {
        // Update existing lines if SL/TP changed
        try { existing.entry.applyOptions({ price: t.open_price }) } catch {}
        if (existing.sl && t.sl) {
          try { existing.sl.applyOptions({ price: Number(t.sl) }) } catch {}
        }
        if (existing.tp && t.tp) {
          try { existing.tp.applyOptions({ price: Number(t.tp) }) } catch {}
        }
        // Add SL line if it was set after trade opened
        if (!existing.sl && t.sl) {
          const sl = series.createPriceLine({
            price: Number(t.sl), color:'rgba(220,38,38,.9)',
            lineWidth:1, lineStyle:1, axisLabelVisible:true, title:'— SL', draggable:true,
          })
          sl.onDragEnd((params:any)=>{
            const p = params?.customValues?.price ?? params?.price
            if (p) onSLTP(t.id, p, t.tp?Number(t.tp):null)
          })
          linesRef.current.set(t.id, { ...existing, sl })
        }
        if (!existing.tp && t.tp) {
          const tp = series.createPriceLine({
            price: Number(t.tp), color:'rgba(22,163,74,.9)',
            lineWidth:1, lineStyle:1, axisLabelVisible:true, title:'— TP', draggable:true,
          })
          tp.onDragEnd((params:any)=>{
            const p = params?.customValues?.price ?? params?.price
            if (p) onSLTP(t.id, t.sl?Number(t.sl):null, p)
          })
          linesRef.current.set(t.id, { ...existing, tp })
        }
      }
    })
  }, [openTrades, inst.sym])

  return <div ref={divRef} style={{ width:'100%', height:'100%' }} />
}

/* ══ PRICE FEED ═══════════════════════════════════════════════════ */
function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({ ...SEEDS })
  const prevRef  = useRef<Record<string,number>>({ ...SEEDS })
  const priceRef = useRef<Record<string,number>>({ ...SEEDS })

  const push = useCallback((sym:string, price:number) => {
    if (!price||isNaN(price)||price<=0) return
    prevRef.current[sym]  = priceRef.current[sym] || price
    priceRef.current[sym] = price
    setPrices(p => p[sym]===price ? p : { ...p, [sym]:price })
  }, [])

  useEffect(() => {
    let dead=false, ws:WebSocket, wsT:any, pollT:any
    const connect = () => {
      if (dead||!FINNHUB) return
      try {
        ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB}`)
        ws.onopen = () => INSTRUMENTS.forEach(i => ws.send(JSON.stringify({type:'subscribe',symbol:(i as any).fh})))
        ws.onmessage = ({data}) => {
          try {
            const msg = JSON.parse(data)
            if (msg.type==='trade'&&msg.data) {
              for (const t of msg.data) {
                const inst = INSTRUMENTS.find(i=>(i as any).fh===t.s) as any
                if (!inst||!t.p) continue
                push(inst.sym, inst.idxMult ? +(t.p*inst.idxMult).toFixed(inst.dec) : +t.p.toFixed(inst.dec))
              }
            }
          } catch {}
        }
        ws.onclose = () => { if (!dead) wsT=setTimeout(connect,2000) }
        ws.onerror = () => { try{ws.close()}catch{} }
      } catch { if (!dead) wsT=setTimeout(connect,3000) }
    }
    const poll = async () => {
      if (dead||!FINNHUB) return
      try {
        const r = await fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${FINNHUB}`)
        const d = await r.json()
        if (d.quote) {
          const q = d.quote
          const pairs:[string,string,boolean][] = [
            ['EUR/USD','EUR',false],['GBP/USD','GBP',false],['AUD/USD','AUD',false],
            ['NZD/USD','NZD',false],['USD/JPY','JPY',true],['USD/CHF','CHF',true],['USD/CAD','CAD',true],
          ]
          for (const [sym,base,inv] of pairs) {
            const rate=q[base]; if (!rate) continue
            const inst=INSTRUMENTS.find(i=>i.sym===sym) as any
            push(sym, inv ? +((1/rate).toFixed(inst?.dec??5)) : +(rate.toFixed(inst?.dec??5)))
          }
          if (q.EUR&&q.JPY) push('EUR/JPY',+((q.JPY/q.EUR).toFixed(3)))
          if (q.GBP&&q.JPY) push('GBP/JPY',+((q.JPY/q.GBP).toFixed(3)))
          if (q.EUR&&q.GBP) push('EUR/GBP',+((q.GBP/q.EUR).toFixed(5)))
          if (q.AUD&&q.JPY) push('AUD/JPY',+((q.JPY/q.AUD).toFixed(3)))
          if (q.CAD&&q.JPY) push('CAD/JPY',+((q.JPY/q.CAD).toFixed(3)))
          if (q.XAU) push('XAU/USD',+((1/q.XAU).toFixed(2)))
          if (q.XAG) push('XAG/USD',+((1/q.XAG).toFixed(4)))
        }
      } catch {}
      for (const inst of INSTRUMENTS.filter(i=>i.cat==='Indices') as any[]) {
        try {
          const r=await fetch(`https://finnhub.io/api/v1/quote?symbol=${inst.fh}&token=${FINNHUB}`)
          const d=await r.json()
          if (d.c>0) push(inst.sym, inst.idxMult?+(d.c*inst.idxMult).toFixed(inst.dec):+d.c.toFixed(inst.dec))
        } catch {}
        await new Promise(r=>setTimeout(r,200))
      }
    }
    connect(); poll()
    pollT = setInterval(poll, 5000)
    return () => { dead=true; clearTimeout(wsT); clearInterval(pollT); try{ws?.close()}catch{} }
  }, [push])

  return { prices, prevRef, priceRef, push }
}

/* ══ P&L ══════════════════════════════════════════════════════════ */
function calcPnl(trade:any, price:number): number {
  const inst = INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if (!inst||!price) return 0
  const diff = trade.direction==='buy' ? price-trade.open_price : trade.open_price-price
  return diff * (trade.symbol.includes('JPY') ? LOT_SIZE/price : inst.lotUSD(1)) * trade.lots
}

/* ══ RISK MONITOR ═════════════════════════════════════════════════ */
function useRiskMonitor(tradesRef:any,priceRef:any,primaryRef:any,accountId:any,onBreach:any) {
  const firedRef=useRef(false)
  const cbRef=useRef(onBreach); cbRef.current=onBreach
  useEffect(()=>{
    const iv=setInterval(()=>{
      const pr=primaryRef.current,trades=tradesRef.current,prices=priceRef.current
      if(!pr||!trades.length||firedRef.current) return
      if(pr.status==='breached'||pr.status==='passed') return
      const bal=pr.balance??0,startBal=pr.starting_balance??bal
      if(bal<=0||startBal<=0) return
      const cp=(pr as any).challenge_products,phase=pr.phase??'phase1'
      const maxDD  =phase==='funded'?(cp?.funded_max_dd??10):phase==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10)
      const dailyDD=phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)
      const floor =startBal-startBal*(maxDD/100)
      const dFloor=(pr.daily_high_balance??startBal)-(pr.daily_high_balance??startBal)*(dailyDD/100)
      const equity=bal+trades.reduce((s:number,t:any)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]||t.open_price),0)
      if(equity<=floor)  {firedRef.current=true;cbRef.current(`Max drawdown breached — equity $${equity.toFixed(2)} (limit:${maxDD}%)`,trades);return}
      if(equity<=dFloor) {firedRef.current=true;cbRef.current(`Daily drawdown breached — equity $${equity.toFixed(2)} (limit:${dailyDD}%)`,trades);return}
    },500)
    return ()=>clearInterval(iv)
  },[])
  useEffect(()=>{firedRef.current=false},[accountId])
}

/* ══ EDIT SL/TP MODAL ═════════════════════════════════════════════ */
function EditSLTPModal({trade,inst,onSave,onClose}:{trade:any;inst:any;onSave:(sl:string,tp:string)=>void;onClose:()=>void}) {
  const [sl,setSl]=useState(trade.sl?String(trade.sl):'')
  const [tp,setTp]=useState(trade.tp?String(trade.tp):'')
  return (
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
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
            <span style={{color:'#8FA3BF'}}>Entry</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:'#1A3A6B'}}>{(Number(trade.open_price)||0).toFixed(inst?.dec??5)}</span>
          </div>
          {sl&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{color:'#DC2626'}}>SL distance</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:'#DC2626'}}>{(Math.abs(trade.open_price-parseFloat(sl))/(inst?.pip??0.0001)).toFixed(0)} pips</span></div>}
          {tp&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#16A34A'}}>TP distance</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:'#16A34A'}}>{(Math.abs(trade.open_price-parseFloat(tp))/(inst?.pip??0.0001)).toFixed(0)} pips</span></div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'10px',color:'#DC2626',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>Stop Loss</div>
            <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst?.pip??0.0001}
              style={{width:'100%',padding:'8px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.3)',borderRadius:'8px',fontSize:'13px',fontFamily:"'JetBrains Mono',monospace",color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'10px',color:'#16A34A',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>Take Profit</div>
            <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst?.pip??0.0001}
              style={{width:'100%',padding:'8px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.3)',borderRadius:'8px',fontSize:'13px',fontFamily:"'JetBrains Mono',monospace",color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',background:'#F4F7FD',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:600,color:'#5C7A9E'}}>Cancel</button>
          <button onClick={()=>onSave(sl,tp)} style={{flex:2,padding:'10px',background:'#2255CC',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:700,color:'#fff'}}>Save & Update Lines</button>
        </div>
        <div style={{fontSize:'10px',color:'#8FA3BF',textAlign:'center',marginTop:'8px'}}>💡 You can also drag SL/TP lines directly on the chart</div>
      </div>
    </div>
  )
}

/* ══ PLATFORM PAGE ════════════════════════════════════════════════ */
export function PlatformPage() {
  const navigate = useNavigate()
  const {toasts,toast,dismiss} = useToast()
  const {accounts,primary:defPrimary} = useAccount()
  const [selAccId,setSelAccId] = useState<string|null>(null)
  const primary = accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,       setSym]      = useState<string>(()=>lsGet('tfd_sym','EUR/USD'))
  const [tfLabel,   setTfLabel]  = useState<string>(()=>lsGet('tfd_tf','1h'))
  const [favorites, setFavs]     = useState<string[]>(()=>lsGet('tfd_favs',['EUR/USD','GBP/USD','XAU/USD','NAS100']))
  const [catFilter, setCatFilter] = useState<string>(()=>lsGet('tfd_cat','All'))
  const [dir,       setDir]      = useState<'buy'|'sell'>('buy')
  const [lots,      setLots]     = useState('0.10')
  const [sl,        setSl]       = useState('')
  const [tp,        setTp]       = useState('')
  const [tab,       setTab]      = useState<'positions'|'history'>('positions')
  const [search,    setSearch]   = useState('')
  const [placing,   setPlacing]  = useState(false)
  const [editTrade, setEditTrade]= useState<any>(null)
  const [openTrades,    setOpenTrades]    = useState<any[]>([])
  const [closedTrades,  setClosedTrades]  = useState<any[]>([])

  const {prices,prevRef,priceRef,push} = usePriceFeed()
  const tradesRef  = useRef<any[]>([]);  tradesRef.current  = openTrades
  const primaryRef = useRef<any>(null);  primaryRef.current = primary
  const closingRef = useRef<Set<string>>(new Set())

  const tf      = TF_LIST.find(t=>t.label===tfLabel) ?? TF_LIST[4]
  const inst    = (INSTRUMENTS.find(i=>i.sym===sym) ?? INSTRUMENTS[0]) as any
  const live    = prices[sym]||SEEDS[sym]
  const prev    = prevRef.current[sym]||live
  const up      = live>=prev
  const exec    = +(dir==='buy'?live+inst.spread:live).toFixed(inst.dec)
  const lotsNum = Math.max(0.01,parseFloat(lots)||0.01)
  const balance = primary?.balance??0
  const openPnl = openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]),0)
  const equity  = balance+openPnl
  const usedMgn = openTrades.reduce((s,t)=>{
    const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    return s+(i?.lotUSD(prices[t.symbol]||SEEDS[t.symbol])*t.lots/LEVERAGE||0)
  },0)
  const freeMgn  = equity-usedMgn
  const mgnLvl   = usedMgn>0?(equity/usedMgn)*100:999
  const reqMgn   = inst.lotUSD(exec)*lotsNum/LEVERAGE
  const notional = inst.lotUSD(exec)*lotsNum
  const maxLots  = freeMgn>0?Math.floor((freeMgn*LEVERAGE/inst.lotUSD(exec))*100)/100:0

  useEffect(()=>lsSet('tfd_sym',sym),[sym])
  useEffect(()=>lsSet('tfd_tf',tfLabel),[tfLabel])
  useEffect(()=>lsSet('tfd_favs',favorites),[favorites])
  useEffect(()=>lsSet('tfd_cat',catFilter),[catFilter])

  useEffect(()=>{
    if (!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open').order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed').order('closed_at',{ascending:false}).limit(100).then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  useRiskMonitor(tradesRef,priceRef,primaryRef,primary?.id,async(reason:string,trades:any[])=>{
    toast('error','🚨','Account Breached',reason)
    if(!primary?.id) return
    for (const t of trades) {
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

  /* ── Auto-close SL/TP ── */
  useEffect(()=>{
    if(!primary?.id) return
    const iv=setInterval(async()=>{
      const trades=tradesRef.current
      const pr=primaryRef.current
      if(!trades.length||!pr) return
      for (const t of trades) {
        if(closingRef.current.has(t.id)) continue
        if(!t.sl&&!t.tp) continue
        const realPrice=priceRef.current[t.symbol]
        if(!realPrice||realPrice<=0) continue
        const cur=realPrice
        const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
        if(!i) continue
        let hitReason=''
        if(t.sl){const sl=Number(t.sl);if(sl>0){const hit=t.direction==='buy'?cur<=sl:cur>=sl;if(hit)hitReason=`SL @ ${cur.toFixed(i.dec)}`}}
        if(!hitReason&&t.tp){const tp=Number(t.tp);if(tp>0){const hit=t.direction==='buy'?cur>=tp:cur<=tp;if(hit)hitReason=`TP @ ${cur.toFixed(i.dec)}`}}
        if(!hitReason) continue
        closingRef.current.add(t.id)
        try {
          const cp=+(t.direction==='buy'?cur:cur+i.spread).toFixed(i.dec)
          const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
          const isJpy=t.symbol.includes('JPY')
          const units=isJpy?LOT_SIZE/cp:i.lotUSD(1)
          const netPnl=+(diff*units*t.lots).toFixed(2)
          const pips=+(diff/i.pip).toFixed(1)
          if(Math.abs(netPnl)>( pr.balance??0)*2){closingRef.current.delete(t.id);continue}
          const now=new Date().toISOString()
          await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
          await supabase.from('accounts').update({balance:+((pr.balance??0)+netPnl).toFixed(2),equity:+((pr.balance??0)+netPnl).toFixed(2)}).eq('id',pr.id)
          setOpenTrades(p=>p.filter(x=>x.id!==t.id))
          setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
          toast(netPnl>=0?'success':'error',netPnl>=0?'🎯':'🛑',`${hitReason} — ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)} | ${pips>=0?'+':''}${pips}p`)
        } catch(e){closingRef.current.delete(t.id)}
      }
    },1000)
    return ()=>clearInterval(iv)
  },[primary?.id])

  function toggleFav(s:string){ setFavs(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]) }

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
    toast('success','✅','SL/TP Updated',`${editTrade.symbol}`)
  }

  async function handleChartSLTP(tradeId:string,newSl:number|null,newTp:number|null){
    await supabase.from('trades').update({sl:newSl,tp:newTp}).eq('id',tradeId)
    setOpenTrades(p=>p.map(t=>t.id===tradeId?{...t,sl:newSl,tp:newTp}:t))
    toast('info','📍','SL/TP moved',`Updated via chart drag`)
  }

  const CATS=['All','Favourites','Forex','Metals','Indices','Commodities']
  const visible=INSTRUMENTS.filter(i=>{
    if(catFilter==='Favourites') return favorites.includes(i.sym)
    if(catFilter!=='All'&&i.cat!==catFilter) return false
    if(search&&!i.sym.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const mono={fontFamily:"'JetBrains Mono',monospace"} as const

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#F0F4FB',color:'#1A3A6B',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{height:'48px',background:'#1A3A6B',display:'flex',alignItems:'center',padding:'0 12px',gap:'10px',flexShrink:0}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>← Dashboard</button>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:700,color:'#fff'}}>
          The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span>
        </div>
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

      {/* MAIN ROW */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* WATCHLIST */}
        <div style={{width:'185px',background:'#fff',borderRight:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
          <div style={{padding:'8px',borderBottom:'1px solid #E8EEF8',flexShrink:0}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:'100%',padding:'5px 8px',background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:'2px',marginTop:'5px',flexWrap:'wrap'}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{padding:'2px 5px',fontSize:'8px',fontWeight:700,border:'none',borderRadius:'4px',cursor:'pointer',background:catFilter===c?'#2255CC':'#F4F7FD',color:catFilter===c?'#fff':'#8FA3BF',textTransform:'uppercase'}}>
                  {c==='Favourites'?'★ Favs':c==='Commodities'?'Comm':c}
                </button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {visible.length===0&&catFilter==='Favourites'&&(
              <div style={{padding:'20px 12px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>Click ★ to add pairs here</div>
            )}
            {visible.map(i=>{
              const price=prices[i.sym]||SEEDS[i.sym]
              const pv=prevRef.current[i.sym]||price
              const isUp=price>=pv
              const active=sym===i.sym
              const isFav=favorites.includes(i.sym)
              return (
                <div key={i.sym} style={{padding:'6px 8px',borderBottom:'1px solid #F0F4FB',display:'flex',alignItems:'center',background:active?'#EEF3FF':'transparent',borderLeft:active?'3px solid #2255CC':'3px solid transparent'}}>
                  <button onClick={()=>toggleFav(i.sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:isFav?'#F59E0B':'#D1D5DB',padding:'0 4px 0 0',flexShrink:0}}>
                    {isFav?'★':'☆'}
                  </button>
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

        {/* CHART AREA */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Chart topbar */}
          <div style={{height:'40px',background:'#fff',borderBottom:'1px solid #E8EEF8',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
            <div style={{...mono,fontSize:'20px',fontWeight:700,color:up?'#16A34A':'#DC2626'}}>{live.toFixed(inst.dec)}</div>
            <div style={{fontSize:'11px',color:up?'#16A34A':'#DC2626'}}>{up?'▲':'▼'} {Math.abs(live-prev).toFixed(inst.dec)}</div>
            <div style={{fontSize:'14px',fontWeight:700,color:'#1A3A6B'}}>{sym}</div>
            <button onClick={()=>toggleFav(sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:favorites.includes(sym)?'#F59E0B':'#D1D5DB',padding:'0'}}>
              {favorites.includes(sym)?'★':'☆'}
            </button>
            {/* TF selector */}
            <div style={{display:'flex',gap:'3px',marginLeft:'8px'}}>
              {TF_LIST.map(t=>(
                <button key={t.label} onClick={()=>setTfLabel(t.label)} style={{padding:'3px 9px',fontSize:'10px',fontWeight:600,border:'none',borderRadius:'5px',cursor:'pointer',background:tfLabel===t.label?'#2255CC':'#F4F7FD',color:tfLabel===t.label?'#fff':'#5C7A9E'}}>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{marginLeft:'auto',fontSize:'10px',color:'#2255CC',background:'#EEF3FF',padding:'3px 10px',borderRadius:'20px',fontWeight:600}}>
              Lightweight Charts · Real-time
            </div>
          </div>
          {/* Chart */}
          <div style={{flex:1,position:'relative'}}>
            <CandleChart
              inst={inst}
              tf={tf}
              livePrice={live}
              openTrades={openTrades}
              onSLTP={handleChartSLTP}
            />
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
                <span style={{fontSize:'9px',color:'#8FA3BF'}}>Max 1:{LEVERAGE}: <span style={{color:lotsNum>maxLots?'#DC2626':'#16A34A',fontWeight:600}}>{maxLots}</span></span>
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
              {lotsNum>maxLots&&<div style={{marginTop:'6px',fontSize:'10px',color:'#DC2626',fontWeight:600,background:'rgba(220,38,38,.06)',padding:'4px 8px',borderRadius:'4px'}}>⚠ Exceeds 1:{LEVERAGE}. Max: {maxLots} lots</div>}
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
                  return (
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
                  return (
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

      {editTrade&&<EditSLTPModal trade={editTrade} inst={INSTRUMENTS.find(i=>i.sym===editTrade.symbol)} onSave={saveSLTP} onClose={()=>setEditTrade(null)}/>}
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </div>
  )
}
