import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const FINNHUB = (import.meta as any).env?.VITE_FINNHUB_KEY ?? ''
const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ══ INSTRUMENTS ══════════════════════════════════════════════════ */
const INSTRUMENTS = [
  // Forex
  { sym:'EUR/USD', fh:'OANDA:EUR_USD', dec:5, pip:0.0001, spread:0.00010, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', fh:'OANDA:GBP_USD', dec:5, pip:0.0001, spread:0.00015, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', fh:'OANDA:USD_JPY', dec:3, pip:0.01,   spread:0.010,   cat:'Forex', lotUSD:(_:number)=>LOT_SIZE },
  { sym:'USD/CHF', fh:'OANDA:USD_CHF', dec:5, pip:0.0001, spread:0.00015, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', fh:'OANDA:AUD_USD', dec:5, pip:0.0001, spread:0.00015, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', fh:'OANDA:USD_CAD', dec:5, pip:0.0001, spread:0.00020, cat:'Forex', lotUSD:(p:number)=>LOT_SIZE/p },
  { sym:'NZD/USD', fh:'OANDA:NZD_USD', dec:5, pip:0.0001, spread:0.00020, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'EUR/JPY', fh:'OANDA:EUR_JPY', dec:3, pip:0.01,   spread:0.025,   cat:'Forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'GBP/JPY', fh:'OANDA:GBP_JPY', dec:3, pip:0.01,   spread:0.030,   cat:'Forex', lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', fh:'OANDA:EUR_GBP', dec:5, pip:0.0001, spread:0.00015, cat:'Forex', lotUSD:(p:number)=>p*1.27*LOT_SIZE },
  // Metals
  { sym:'XAU/USD', fh:'OANDA:XAU_USD', dec:2, pip:0.10,   spread:0.30,    cat:'Metals', lotUSD:(p:number)=>p*100 },
  { sym:'XAG/USD', fh:'OANDA:XAG_USD', dec:4, pip:0.001,  spread:0.030,   cat:'Metals', lotUSD:(p:number)=>p*5000 },
  // Indices - Finnhub real-time symbols
  { sym:'NAS100',  fh:'NASDAQ:QQQ',    dec:2, pip:1.0,     spread:1.5,     cat:'Indices', idxMult:40,  lotUSD:(p:number)=>p*400 },
  { sym:'US500',   fh:'AMEX:SPY',      dec:2, pip:0.10,    spread:0.50,    cat:'Indices', idxMult:10,  lotUSD:(p:number)=>p*500 },
  { sym:'US30',    fh:'AMEX:DIA',      dec:1, pip:1.0,     spread:2.0,     cat:'Indices', idxMult:100, lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   fh:'XETRA:EXS1',   dec:1, pip:1.0,     spread:1.0,     cat:'Indices', idxMult:1,   lotUSD:(p:number)=>p*25 },
] as const

type InstrumentType = typeof INSTRUMENTS[number]

const SEEDS: Record<string,number> = {
  'EUR/USD':1.0853,'GBP/USD':1.2940,'USD/JPY':148.50,'USD/CHF':0.8820,
  'AUD/USD':0.6350,'USD/CAD':1.3580,'NZD/USD':0.5780,'EUR/JPY':170.20,
  'GBP/JPY':192.50,'EUR/GBP':0.8380,'XAU/USD':2980.0,'XAG/USD':33.50,
  'NAS100':21700,'US500':5750,'US30':42800,'GER40':22500,
}

/* ══ LWC LOADER ══════════════════════════════════════════════════ */
let _lwcReady = false; const _lwcQ: Array<()=>void> = []
function loadLWC(): Promise<void> {
  return new Promise(res => {
    if (_lwcReady) { res(); return }
    _lwcQ.push(res)
    if (document.getElementById('lwc-s')) return
    const s = document.createElement('script')
    s.id = 'lwc-s'
    s.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload = () => { _lwcReady = true; _lwcQ.forEach(f => f()); _lwcQ.length = 0 }
    document.head.appendChild(s)
  })
}

/* ══ CANDLES via Finnhub REST ════════════════════════════════════ */
type Candle = { time: number; open: number; high: number; low: number; close: number }

const TF: Record<string,{res:string;daysBack:number;sec:number}> = {
  M1:  { res:'1',  daysBack:2,   sec:60    },
  M5:  { res:'5',  daysBack:7,   sec:300   },
  M15: { res:'15', daysBack:14,  sec:900   },
  M30: { res:'30', daysBack:30,  sec:1800  },
  H1:  { res:'60', daysBack:90,  sec:3600  },
  H4:  { res:'240',daysBack:365, sec:14400 },
  D1:  { res:'D',  daysBack:1000,sec:86400 },
}

async function fetchCandles(inst: any, tf: string): Promise<Candle[]> {
  if (!FINNHUB) return []
  const { res, daysBack } = TF[tf] ?? TF.H1
  const to   = Math.floor(Date.now() / 1000)
  const from = to - daysBack * 86400
  const mult = inst.idxMult ?? 1

  // Forex & metals: use Finnhub forex candles
  // Indices: use stock candles
  const isForex = inst.cat === 'Forex' || inst.cat === 'Metals'
  const url = isForex
    ? `https://finnhub.io/api/v1/forex/candle?symbol=${inst.fh}&resolution=${res}&from=${from}&to=${to}&token=${FINNHUB}`
    : `https://finnhub.io/api/v1/stock/candle?symbol=${inst.fh}&resolution=${res}&from=${from}&to=${to}&token=${FINNHUB}`

  try {
    const r = await fetch(url)
    const d = await r.json()
    if (d.s !== 'ok' || !d.t?.length) return []
    return d.t.map((t: number, i: number) => ({
      time:  t,
      open:  +((d.o[i] ?? 0) * mult).toFixed(inst.dec),
      high:  +((d.h[i] ?? 0) * mult).toFixed(inst.dec),
      low:   +((d.l[i] ?? 0) * mult).toFixed(inst.dec),
      close: +((d.c[i] ?? 0) * mult).toFixed(inst.dec),
    }))
  } catch {
    return []
  }
}

/* ══ CHART ════════════════════════════════════════════════════════ */
function CandleChart({ inst, tf, livePrice, openTrades }: {
  inst: any; tf: string; livePrice: number; openTrades: any[]
}) {
  const divRef   = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const serRef   = useRef<any>(null)
  const lastRef  = useRef<Candle | null>(null)

  useEffect(() => {
    const el = divRef.current; if (!el) return
    let dead = false
    loadLWC().then(async () => {
      if (dead || !divRef.current) return
      try { chartRef.current?.remove() } catch {}
      const LWC = (window as any).LightweightCharts
      const chart = LWC.createChart(el, {
        width: el.clientWidth, height: el.clientHeight,
        layout: { background: { type: 'solid', color: '#FAFBFF' }, textColor: '#5C7A9E' },
        grid: { vertLines: { color: 'rgba(34,85,204,.06)' }, horzLines: { color: 'rgba(34,85,204,.06)' } },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: '#E8EEF8' },
        timeScale: { borderColor: '#E8EEF8', timeVisible: true, secondsVisible: false },
      })
      const series = chart.addCandlestickSeries({
        upColor: '#16A34A', downColor: '#DC2626',
        borderUpColor: '#16A34A', borderDownColor: '#DC2626',
        wickUpColor: '#16A34A', wickDownColor: '#DC2626',
      })
      chartRef.current = chart; serRef.current = series
      const ro = new ResizeObserver(() => {
        if (chartRef.current && divRef.current)
          chartRef.current.resize(divRef.current.clientWidth, divRef.current.clientHeight)
      })
      ro.observe(el)
      const candles = await fetchCandles(inst, tf)
      if (dead) { ro.disconnect(); return }
      if (candles.length > 0) {
        series.setData(candles)
        lastRef.current = candles[candles.length - 1]
        chart.timeScale().fitContent()
      }
      return () => ro.disconnect()
    })
    return () => { dead = true }
  }, [inst.sym, tf])

  // Live candle update
  useEffect(() => {
    if (!serRef.current || livePrice <= 0) return
    const sec = TF[tf].sec
    const now = Math.floor(Date.now() / 1000)
    const cTime = Math.floor(now / sec) * sec
    const prev = lastRef.current
    const c: Candle = (!prev || cTime > prev.time)
      ? { time: cTime, open: livePrice, high: livePrice, low: livePrice, close: livePrice }
      : { time: prev.time, open: prev.open, high: Math.max(prev.high, livePrice), low: Math.min(prev.low, livePrice), close: livePrice }
    lastRef.current = c
    try { serRef.current.update(c) } catch {}
  }, [livePrice, tf])

  // SL/TP lines for open trades
  const linesRef = useRef<Map<string,{e:any;sl:any;tp:any}>>(new Map())
  useEffect(() => {
    const series = serRef.current; if (!series) return
    const trades = openTrades.filter(t => t.symbol === inst.sym)
    const ids = new Set(linesRef.current.keys())
    ids.forEach(id => {
      if (!trades.find(t => t.id === id)) {
        const l = linesRef.current.get(id)
        try { series.removePriceLine(l?.e) } catch {}
        try { if (l?.sl) series.removePriceLine(l.sl) } catch {}
        try { if (l?.tp) series.removePriceLine(l.tp) } catch {}
        linesRef.current.delete(id)
      }
    })
    trades.forEach(t => {
      if (linesRef.current.has(t.id)) return
      const e = series.createPriceLine({ price: t.open_price, color: t.direction==='buy'?'rgba(22,163,74,.9)':'rgba(220,38,38,.9)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `${t.direction.toUpperCase()} ${t.lots}` })
      const sl = t.sl ? series.createPriceLine({ price: t.sl, color: 'rgba(220,38,38,.8)', lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: 'SL' }) : null
      const tp = t.tp ? series.createPriceLine({ price: t.tp, color: 'rgba(22,163,74,.8)', lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: 'TP' }) : null
      linesRef.current.set(t.id, { e, sl, tp })
    })
  }, [openTrades, inst.sym])

  return <div ref={divRef} style={{ width: '100%', height: '100%' }} />
}

/* ══ PRICE FEED ══════════════════════════════════════════════════ */
function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({ ...SEEDS })
  const prevRef  = useRef<Record<string,number>>({ ...SEEDS })
  const priceRef = useRef<Record<string,number>>({ ...SEEDS })

  const push = useCallback((sym: string, price: number) => {
    if (!price || isNaN(price) || price <= 0) return
    prevRef.current[sym] = priceRef.current[sym] || price
    priceRef.current[sym] = price
    setPrices(p => p[sym] === price ? p : { ...p, [sym]: price })
  }, [])

  useEffect(() => {
    if (!FINNHUB) return
    let dead = false
    let ws: WebSocket
    let wsTimer: any
    let pollTimer: any

    // WebSocket for forex real-time
    const connect = () => {
      if (dead) return
      try {
        ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB}`)
        ws.onopen = () => {
          // Subscribe to forex pairs
          const forexInsts = INSTRUMENTS.filter(i => i.cat === 'Forex' || i.cat === 'Metals')
          forexInsts.forEach(i => ws.send(JSON.stringify({ type: 'subscribe', symbol: i.fh })))
          // Subscribe to indices via stock symbols
          const idxInsts = INSTRUMENTS.filter(i => i.cat === 'Indices')
          idxInsts.forEach(i => ws.send(JSON.stringify({ type: 'subscribe', symbol: i.fh })))
        }
        ws.onmessage = ({ data }) => {
          try {
            const msg = JSON.parse(data)
            if (msg.type === 'trade' && msg.data) {
              for (const t of msg.data) {
                const inst = INSTRUMENTS.find(i => i.fh === t.s) as any
                if (!inst || !t.p) continue
                const price = inst.idxMult ? +(t.p * inst.idxMult).toFixed(inst.dec) : t.p
                push(inst.sym, price)
              }
            }
          } catch {}
        }
        ws.onclose = () => { if (!dead) wsTimer = setTimeout(connect, 2000) }
        ws.onerror = () => { try { ws.close() } catch {} }
      } catch { if (!dead) wsTimer = setTimeout(connect, 3000) }
    }

    // REST poll as backup + for symbols not in WS
    const poll = async () => {
      if (dead) return
      for (const inst of INSTRUMENTS as any[]) {
        try {
          const isForex = inst.cat === 'Forex' || inst.cat === 'Metals'
          const url = isForex
            ? `https://finnhub.io/api/v1/forex/rates?base=USD&token=${FINNHUB}`
            : `https://finnhub.io/api/v1/quote?symbol=${inst.fh}&token=${FINNHUB}`

          if (!isForex) {
            const r = await fetch(url)
            const d = await r.json()
            if (d.c && d.c > 0) {
              const price = inst.idxMult ? +(d.c * inst.idxMult).toFixed(inst.dec) : d.c
              push(inst.sym, price)
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 100)) // rate limit
      }

      // Forex rates batch
      try {
        const r = await fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${FINNHUB}`)
        const d = await r.json()
        if (d.quote) {
          const q = d.quote
          const map: Record<string,string> = {
            'EUR/USD':'EUR','GBP/USD':'GBP','AUD/USD':'AUD','NZD/USD':'NZD',
            'USD/JPY':'JPY','USD/CHF':'CHF','USD/CAD':'CAD',
          }
          for (const [sym, base] of Object.entries(map)) {
            const rate = q[base]
            if (!rate) continue
            if (sym.startsWith('USD/')) push(sym, +(1/rate).toFixed(sym==='USD/JPY'?3:5))
            else push(sym, +rate.toFixed(5))
          }
          // XAU & XAG
          if (q['XAU']) push('XAU/USD', +(1/q['XAU']).toFixed(2))
          if (q['XAG']) push('XAG/USD', +(1/q['XAG']).toFixed(4))
        }
      } catch {}
    }

    connect()
    poll()
    pollTimer = setInterval(poll, 5000)

    return () => {
      dead = true
      clearTimeout(wsTimer)
      clearInterval(pollTimer)
      try {
        INSTRUMENTS.forEach(i => ws?.readyState === 1 && ws.send(JSON.stringify({ type: 'unsubscribe', symbol: i.fh })))
        ws?.close()
      } catch {}
    }
  }, [push])

  return { prices, prevRef, priceRef, push }
}

/* ══ P&L CALC ════════════════════════════════════════════════════ */
function calcPnl(trade: any, price: number): number {
  const inst = INSTRUMENTS.find(i => i.sym === trade.symbol) as any
  if (!inst || !price) return 0
  const diff = trade.direction === 'buy' ? price - trade.open_price : trade.open_price - price
  const isJpy = trade.symbol.includes('JPY')
  const units = isJpy ? LOT_SIZE / price : inst.lotUSD(1)
  return diff * units * trade.lots
}

/* ══ RISK MONITOR ════════════════════════════════════════════════ */
function useRiskMonitor(tradesRef: any, pricesRef: any, primaryRef: any, accountId: any, onBreach: any) {
  const firedRef = useRef(false)
  const cbRef = useRef(onBreach); cbRef.current = onBreach
  useEffect(() => {
    const iv = setInterval(() => {
      const primary = primaryRef.current, trades = tradesRef.current, prices = pricesRef.current
      if (!primary || !trades.length || firedRef.current) return
      if (primary.status === 'breached' || primary.status === 'passed') return
      const balance = primary.balance ?? 0, startBal = primary.starting_balance ?? balance
      if (balance <= 0 || startBal <= 0) return
      const cp = (primary as any).challenge_products, phase = primary.phase ?? 'phase1'
      const maxDDPct   = phase==='funded'?(cp?.funded_max_dd??10):phase==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10)
      const dailyDDPct = phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)
      const maxDDFloor  = startBal - startBal * (maxDDPct / 100)
      const dailyHigh   = primary.daily_high_balance ?? startBal
      const dailyFloor  = dailyHigh - dailyHigh * (dailyDDPct / 100)
      const floatPnl    = trades.reduce((s: number, t: any) => s + calcPnl(t, prices[t.symbol] || SEEDS[t.symbol] || t.open_price), 0)
      const equity      = balance + floatPnl
      if (equity <= maxDDFloor) { firedRef.current = true; cbRef.current(`Max drawdown breached — equity $${equity.toFixed(2)} ≤ floor $${maxDDFloor.toFixed(2)} (${maxDDPct}%)`, trades); return }
      if (equity <= dailyFloor) { firedRef.current = true; cbRef.current(`Daily drawdown breached — equity $${equity.toFixed(2)} ≤ floor $${dailyFloor.toFixed(2)} (${dailyDDPct}% daily)`, trades); return }
    }, 500)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => { firedRef.current = false }, [accountId])
}

/* ══ MARKET STATUS ═══════════════════════════════════════════════ */
function mktOpen(cat: string): boolean {
  const now = new Date(), d = now.getUTCDay(), hm = now.getUTCHours() * 60 + now.getUTCMinutes()
  if (cat === 'Forex' || cat === 'Metals') return !(d === 6 || (d === 0 && hm < 22*60) || (d === 5 && hm >= 21*60+45))
  if (cat === 'Indices') return !(d === 0 || d === 6) && (hm >= 13*60+30 && hm < 20*60)
  return true
}

/* ══ PLATFORM PAGE ═══════════════════════════════════════════════ */
export function PlatformPage() {
  const navigate    = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary: defPrimary } = useAccount()
  const [selAccId, setSelAccId] = useState<string|null>(null)
  const primary = accounts.find(a => a.id === selAccId) ?? defPrimary

  const [sym,      setSym]     = useState('EUR/USD')
  const [tf,       setTf]      = useState('H1')
  const [dir,      setDir]     = useState<'buy'|'sell'>('buy')
  const [lots,     setLots]    = useState('0.10')
  const [sl,       setSl]      = useState('')
  const [tp,       setTp]      = useState('')
  const [tab,      setTab]     = useState<'positions'|'history'>('positions')
  const [catFilter,setCatFilter] = useState('All')
  const [search,   setSearch]  = useState('')
  const [placing,  setPlacing] = useState(false)

  const { prices, prevRef, priceRef, push } = usePriceFeed()
  const tradesRef  = useRef<any[]>([])
  const primaryRef = useRef<any>(null); primaryRef.current = primary

  const [openTrades,   setOpenTrades]   = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])

  const inst     = INSTRUMENTS.find(i => i.sym === sym)! as any
  const live     = prices[sym] || SEEDS[sym]
  const prev     = prevRef.current[sym] || live
  const up       = live >= prev
  const exec     = +(dir === 'buy' ? live + inst.spread : live).toFixed(inst.dec)
  const lotsNum  = Math.max(0.01, parseFloat(lots) || 0.01)
  const balance  = primary?.balance ?? 0
  const openPnl  = openTrades.reduce((s, t) => s + calcPnl(t, prices[t.symbol] || SEEDS[t.symbol]), 0)
  const equity   = balance + openPnl
  const usedMargin = openTrades.reduce((s, t) => {
    const i = INSTRUMENTS.find(x => x.sym === t.symbol) as any
    const cur = prices[t.symbol] || SEEDS[t.symbol]
    if (!i) return s
    return s + (i.lotUSD(cur) * t.lots / LEVERAGE)
  }, 0)
  const freeMargin = equity - usedMargin
  const marginLvl  = usedMargin > 0 ? (equity / usedMargin) * 100 : 999
  const reqMargin  = inst.lotUSD(exec) * lotsNum / LEVERAGE

  tradesRef.current = openTrades

  // Load trades
  useEffect(() => {
    if (!primary?.id) return
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status', 'open').order('opened_at', { ascending: false })
      .then(({ data }) => setOpenTrades(data ?? []))
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status', 'closed').order('closed_at', { ascending: false }).limit(50)
      .then(({ data }) => setClosedTrades(data ?? []))
  }, [primary?.id])

  // Risk monitor
  useRiskMonitor(tradesRef, priceRef, primaryRef, primary?.id, async (reason: string, trades: any[]) => {
    toast('error', '🚨', 'Account Breached', reason)
    if (!primary?.id) return
    for (const t of trades) {
      const cur = priceRef.current[t.symbol] || SEEDS[t.symbol] || t.open_price
      const closeP = +(t.direction === 'buy' ? cur : cur + inst.spread).toFixed(inst.dec)
      const diff = t.direction === 'buy' ? closeP - t.open_price : t.open_price - closeP
      const isJpy = t.symbol.includes('JPY')
      const i = INSTRUMENTS.find(x => x.sym === t.symbol) as any
      const units = isJpy ? LOT_SIZE / closeP : i?.lotUSD(1) ?? LOT_SIZE
      const netPnl = +(diff * units * t.lots).toFixed(2)
      await supabase.from('trades').update({ status: 'closed', close_price: closeP, net_pnl: netPnl, closed_at: new Date().toISOString() }).eq('id', t.id)
    }
    const newBal = +(balance + trades.reduce((s, t) => { const cur = priceRef.current[t.symbol] || t.open_price; const i = INSTRUMENTS.find(x => x.sym === t.symbol) as any; const diff = t.direction==='buy'?cur-t.open_price:t.open_price-cur; const isJpy=t.symbol.includes('JPY'); const units=isJpy?LOT_SIZE/cur:i?.lotUSD(1)??LOT_SIZE; return s+diff*units*t.lots }, 0)).toFixed(2)
    await supabase.from('accounts').update({ status: 'breached', phase: 'breached', balance: newBal, equity: newBal }).eq('id', primary.id)
    await supabase.from('notifications').insert([
      { user_id: primary.user_id, type: 'breach', title: 'Account Breached', body: reason, is_read: false },
      { user_id: null, type: 'admin_breach', title: `Breach — ${primary.account_number}`, body: reason, is_read: false },
    ])
    setOpenTrades([])
  })

  // Place order
  async function placeOrder() {
    if (!primary?.id) { toast('error', '❌', 'No Account', 'Select a funded account.'); return }
    if (primary.status === 'breached') { toast('error', '❌', 'Breached', 'Account is breached.'); return }
    if (reqMargin > freeMargin) { toast('error', '❌', 'Margin', `Need $${reqMargin.toFixed(2)}, free: $${freeMargin.toFixed(2)}`); return }
    setPlacing(true)
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('trades').insert({
      account_id: primary.id, user_id: primary.user_id,
      symbol: sym, direction: dir, lots: lotsNum,
      open_price: exec, status: 'open',
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      opened_at: now,
    }).select().single()
    setPlacing(false)
    if (error) { toast('error', '❌', 'Error', error.message); return }
    setOpenTrades(prev => [data, ...prev])
    toast('success', '✅', `${dir.toUpperCase()} ${sym}`, `${lotsNum} lots @ ${exec}`)
    setSl(''); setTp('')
  }

  // Close trade
  async function closeTrade(t: any) {
    const cur = prices[t.symbol] || SEEDS[t.symbol] || t.open_price
    const i = INSTRUMENTS.find(x => x.sym === t.symbol) as any
    const closeP = +(t.direction === 'buy' ? cur : cur + (i?.spread ?? 0)).toFixed(i?.dec ?? 5)
    const diff = t.direction === 'buy' ? closeP - t.open_price : t.open_price - closeP
    const isJpy = t.symbol.includes('JPY')
    const units = isJpy ? LOT_SIZE / closeP : i?.lotUSD(1) ?? LOT_SIZE
    const netPnl = +(diff * units * t.lots).toFixed(2)
    const pips   = +(diff / (i?.pip ?? 0.0001)).toFixed(1)
    const now = new Date().toISOString()
    await supabase.from('trades').update({ status: 'closed', close_price: closeP, net_pnl: netPnl, pips, closed_at: now }).eq('id', t.id)
    const newBal = +(balance + netPnl).toFixed(2)
    await supabase.from('accounts').update({ balance: newBal, equity: newBal }).eq('id', primary!.id)
    setOpenTrades(prev => prev.filter(x => x.id !== t.id))
    setClosedTrades(prev => [{ ...t, status: 'closed', close_price: closeP, net_pnl: netPnl, closed_at: now }, ...prev])
    toast(netPnl >= 0 ? 'success' : 'error', netPnl >= 0 ? '💰' : '📉', `Closed ${t.symbol}`, `${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)} | ${pips >= 0 ? '+' : ''}${pips} pips`)
  }

  /* ══ UI ══════════════════════════════════════════════════════════ */
  const S = {
    page:   { fontFamily:"'Inter',system-ui,sans-serif", background:'#F0F4FB', color:'#1A3A6B', height:'100vh', display:'flex', flexDirection:'column' as const, overflow:'hidden' },
    topbar: { height:'48px', background:'#1A3A6B', display:'flex', alignItems:'center', padding:'0 16px', gap:'12px', flexShrink:0 },
    row:    { flex:1, display:'flex', overflow:'hidden' },
    // Left watchlist
    watch:  { width:'200px', background:'#fff', borderRight:'1px solid #E8EEF8', display:'flex', flexDirection:'column' as const, flexShrink:0, overflow:'hidden' },
    // Center chart + orderbook
    center: { flex:1, display:'flex', flexDirection:'column' as const, overflow:'hidden' },
    chart:  { flex:1, background:'#FAFBFF', position:'relative' as const },
    // Right order panel
    right:  { width:'240px', background:'#fff', borderLeft:'1px solid #E8EEF8', display:'flex', flexDirection:'column' as const, flexShrink:0 },
    // Bottom positions
    bottom: { height:'180px', background:'#fff', borderTop:'1px solid #E8EEF8', flexShrink:0, overflow:'hidden' },
  }

  const CATS = ['All', 'Forex', 'Metals', 'Indices']
  const filtered = INSTRUMENTS.filter(i => {
    if (catFilter !== 'All' && (i as any).cat !== catFilter) return false
    if (search && !i.sym.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div style={S.page}>
      {/* ── TOPBAR ── */}
      <div style={S.topbar}>
        <button onClick={() => navigate('/dashboard')} style={{ background:'rgba(255,255,255,.1)', border:'none', color:'#fff', padding:'5px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:600 }}>
          ← Dashboard
        </button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'14px', fontWeight:700, color:'#fff' }}>
          The Funded <span style={{ color:'#60A5FA', fontStyle:'italic' }}>Diaries</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginLeft:'8px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ADE80' }}/>
          <span style={{ fontSize:'10px', color:'#4ADE80', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' }}>Live</span>
        </div>

        {/* Account selector */}
        <div style={{ marginLeft:'auto', display:'flex', gap:'6px', alignItems:'center' }}>
          {accounts.map(a => (
            <button key={a.id} onClick={() => setSelAccId(a.id)}
              style={{ padding:'4px 10px', background: a.id===primary?.id ? 'rgba(96,165,250,.2)':'rgba(255,255,255,.08)', border: a.id===primary?.id ? '1px solid rgba(96,165,250,.4)':'1px solid rgba(255,255,255,.1)', borderRadius:'5px', color: a.id===primary?.id ? '#60A5FA':'rgba(255,255,255,.5)', fontSize:'10px', fontFamily:"'JetBrains Mono',monospace", cursor:'pointer' }}>
              {a.account_number}
            </button>
          ))}
        </div>

        {/* Account stats */}
        <div style={{ display:'flex', gap:'0', marginLeft:'12px' }}>
          {[
            ['Balance',   `$${(Number(balance)||0).toFixed(2)}`,   '#fff'],
            ['Equity',    `$${(Number(equity)||0).toFixed(2)}`,    equity >= balance ? '#4ADE80' : '#F87171'],
            ['P&L',       `${openPnl>=0?'+':''}$${(Number(openPnl)||0).toFixed(2)}`, openPnl>=0?'#4ADE80':'#F87171'],
            ['Free Margin',`$${(Number(freeMargin)||0).toFixed(2)}`, '#60A5FA'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ padding:'0 12px', borderLeft:'1px solid rgba(255,255,255,.1)', textAlign:'right' }}>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'1px' }}>{l}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:500, color:c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.row}>
        {/* ── WATCHLIST ── */}
        <div style={S.watch}>
          <div style={{ padding:'8px', borderBottom:'1px solid #E8EEF8', flexShrink:0 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{ width:'100%', padding:'5px 8px', background:'#F4F7FD', border:'1px solid #E8EEF8', borderRadius:'6px', fontSize:'11px', color:'#1A3A6B', outline:'none' }}/>
            <div style={{ display:'flex', gap:'3px', marginTop:'6px' }}>
              {CATS.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  style={{ flex:1, padding:'3px 0', fontSize:'8px', fontWeight:700, border:'none', borderRadius:'4px', cursor:'pointer', background: catFilter===c ? '#2255CC':'#F4F7FD', color: catFilter===c ? '#fff':'#8FA3BF', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filtered.map(i => {
              const price = prices[i.sym] || SEEDS[i.sym]
              const pv    = prevRef.current[i.sym] || price
              const isUp  = price >= pv
              const active = sym === i.sym
              return (
                <div key={i.sym} onClick={() => setSym(i.sym)}
                  style={{ padding:'8px 10px', borderBottom:'1px solid #F0F4FB', cursor:'pointer', background: active ? '#EEF3FF':'transparent', borderLeft: active ? '3px solid #2255CC':'3px solid transparent', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:'11px', fontWeight:600, color: active ? '#2255CC':'#1A3A6B' }}>{i.sym}</div>
                    <div style={{ fontSize:'9px', color:'#8FA3BF', marginTop:'1px' }}>{(i as any).cat}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', fontWeight:500, color: isUp ? '#16A34A':'#DC2626' }}>
                      {price.toFixed(i.dec)}
                    </div>
                    <div style={{ fontSize:'9px', color: isUp ? '#16A34A':'#DC2626' }}>
                      {isUp ? '▲' : '▼'} {Math.abs(price - pv).toFixed(i.dec)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── CENTER: Chart ── */}
        <div style={S.center}>
          {/* Chart topbar */}
          <div style={{ height:'40px', background:'#fff', borderBottom:'1px solid #E8EEF8', display:'flex', alignItems:'center', padding:'0 12px', gap:'8px', flexShrink:0 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'18px', fontWeight:700, color: up ? '#16A34A':'#DC2626' }}>
              {live.toFixed(inst.dec)}
            </div>
            <div style={{ fontSize:'11px', color: up ? '#16A34A':'#DC2626' }}>
              {up ? '▲' : '▼'} {Math.abs(live - prev).toFixed(inst.dec)}
            </div>
            <div style={{ marginLeft:'8px', fontSize:'12px', fontWeight:600, color:'#1A3A6B' }}>{sym}</div>
            {!FINNHUB && <div style={{ fontSize:'10px', color:'#DC2626', background:'#FEF2F2', padding:'2px 8px', borderRadius:'4px' }}>⚠ Add VITE_FINNHUB_KEY</div>}
            <div style={{ marginLeft:'auto', display:'flex', gap:'3px' }}>
              {Object.keys(TF).map(t => (
                <button key={t} onClick={() => setTf(t)}
                  style={{ padding:'3px 8px', fontSize:'10px', fontWeight:600, border:'none', borderRadius:'4px', cursor:'pointer', background: tf===t ? '#2255CC':'#F4F7FD', color: tf===t ? '#fff':'#5C7A9E' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div style={S.chart}>
            <CandleChart inst={inst} tf={tf} livePrice={live} openTrades={openTrades}/>
          </div>
        </div>

        {/* ── RIGHT: Order panel ── */}
        <div style={S.right}>
          <div style={{ padding:'12px', borderBottom:'1px solid #E8EEF8', flexShrink:0 }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#1A3A6B', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>New Order</div>

            {/* Symbol */}
            <div style={{ marginBottom:'8px' }}>
              <div style={{ fontSize:'9px', color:'#8FA3BF', marginBottom:'3px', fontWeight:600, textTransform:'uppercase' }}>Symbol</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'13px', fontWeight:600, color:'#1A3A6B' }}>{sym}</div>
            </div>

            {/* Buy/Sell */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
              <button onClick={() => setDir('buy')}
                style={{ padding:'10px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'12px', background: dir==='buy' ? '#16A34A':'#F4F7FD', color: dir==='buy' ? '#fff':'#5C7A9E', transition:'all .15s' }}>
                BUY
              </button>
              <button onClick={() => setDir('sell')}
                style={{ padding:'10px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'12px', background: dir==='sell' ? '#DC2626':'#F4F7FD', color: dir==='sell' ? '#fff':'#5C7A9E', transition:'all .15s' }}>
                SELL
              </button>
            </div>

            {/* Exec price */}
            <div style={{ background: dir==='buy' ? 'rgba(22,163,74,.08)':'rgba(220,38,38,.08)', border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`, borderRadius:'6px', padding:'8px', marginBottom:'10px', textAlign:'center' }}>
              <div style={{ fontSize:'9px', color:'#8FA3BF', textTransform:'uppercase', letterSpacing:'1px' }}>Execution Price</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'18px', fontWeight:700, color: dir==='buy' ? '#16A34A':'#DC2626' }}>{exec.toFixed(inst.dec)}</div>
            </div>

            {/* Lots */}
            <div style={{ marginBottom:'8px' }}>
              <div style={{ fontSize:'9px', color:'#8FA3BF', marginBottom:'3px', fontWeight:600, textTransform:'uppercase' }}>Lots</div>
              <div style={{ display:'flex', border:'1px solid #E8EEF8', borderRadius:'6px', overflow:'hidden' }}>
                <button onClick={() => setLots(l => String(Math.max(0.01, +l - 0.01).toFixed(2)))}
                  style={{ padding:'0 12px', background:'#F4F7FD', border:'none', borderRight:'1px solid #E8EEF8', cursor:'pointer', color:'#5C7A9E', fontSize:'16px', fontWeight:300 }}>−</button>
                <input value={lots} onChange={e => setLots(e.target.value)} type="number" min="0.01" step="0.01"
                  style={{ flex:1, padding:'6px', background:'#fff', border:'none', textAlign:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'13px', fontWeight:500, color:'#1A3A6B', outline:'none' }}/>
                <button onClick={() => setLots(l => String((+l + 0.01).toFixed(2)))}
                  style={{ padding:'0 12px', background:'#F4F7FD', border:'none', borderLeft:'1px solid #E8EEF8', cursor:'pointer', color:'#5C7A9E', fontSize:'16px', fontWeight:300 }}>+</button>
              </div>
            </div>

            {/* SL / TP */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
              <div>
                <div style={{ fontSize:'9px', color:'#DC2626', marginBottom:'3px', fontWeight:600, textTransform:'uppercase' }}>Stop Loss</div>
                <input value={sl} onChange={e => setSl(e.target.value)} placeholder={`e.g. ${(exec - inst.pip * 20).toFixed(inst.dec)}`}
                  style={{ width:'100%', padding:'6px 8px', background:'#FEF2F2', border:'1px solid rgba(220,38,38,.2)', borderRadius:'6px', fontSize:'11px', color:'#1A3A6B', outline:'none', fontFamily:"'JetBrains Mono',monospace" }}/>
              </div>
              <div>
                <div style={{ fontSize:'9px', color:'#16A34A', marginBottom:'3px', fontWeight:600, textTransform:'uppercase' }}>Take Profit</div>
                <input value={tp} onChange={e => setTp(e.target.value)} placeholder={`e.g. ${(exec + inst.pip * 20).toFixed(inst.dec)}`}
                  style={{ width:'100%', padding:'6px 8px', background:'#F0FDF4', border:'1px solid rgba(22,163,74,.2)', borderRadius:'6px', fontSize:'11px', color:'#1A3A6B', outline:'none', fontFamily:"'JetBrains Mono',monospace" }}/>
              </div>
            </div>

            {/* Margin info */}
            <div style={{ background:'#F4F7FD', borderRadius:'6px', padding:'8px', marginBottom:'10px', fontSize:'11px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                <span style={{ color:'#8FA3BF' }}>Req. margin</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:'#1A3A6B', fontWeight:500 }}>${(Number(reqMargin)||0).toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#8FA3BF' }}>Free margin</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color: freeMargin > reqMargin ? '#16A34A':'#DC2626', fontWeight:500 }}>${(Number(freeMargin)||0).toFixed(2)}</span>
              </div>
            </div>

            {/* Place button */}
            <button onClick={placeOrder} disabled={placing || !primary || primary.status==='breached'}
              style={{ width:'100%', padding:'11px', fontSize:'12px', fontWeight:700, border:'none', borderRadius:'8px', cursor:'pointer', background: dir==='buy'?'#16A34A':'#DC2626', color:'#fff', opacity: placing || !primary || primary.status==='breached' ? 0.5 : 1, transition:'all .15s', letterSpacing:'.5px', textTransform:'uppercase' }}>
              {placing ? '…' : `${dir.toUpperCase()} ${lotsNum} ${sym}`}
            </button>
          </div>

          {/* Account summary */}
          <div style={{ padding:'10px 12px', flex:1, overflowY:'auto' }}>
            <div style={{ fontSize:'9px', color:'#8FA3BF', textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:600, marginBottom:'8px' }}>Account</div>
            {[
              ['Account', primary?.account_number ?? '—', '#1A3A6B'],
              ['Phase',   primary?.phase ?? '—', '#2255CC'],
              ['Margin Lvl', usedMargin > 0 ? `${(Number(marginLvl)||0).toFixed(0)}%` : '∞', marginLvl < 150 && usedMargin > 0 ? '#DC2626' : '#16A34A'],
              ['Open Trades', String(openTrades.length), '#1A3A6B'],
            ].map(([l,v,c]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #F4F7FD', fontSize:'11px' }}>
                <span style={{ color:'#8FA3BF' }}>{l}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:c, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Positions ── */}
      <div style={S.bottom}>
        <div style={{ display:'flex', alignItems:'center', gap:'0', borderBottom:'1px solid #E8EEF8', height:'36px', padding:'0 12px' }}>
          {(['positions','history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'0 16px', height:'36px', fontSize:'11px', fontWeight:600, border:'none', borderBottom: tab===t ? '2px solid #2255CC':'2px solid transparent', background:'transparent', color: tab===t ? '#2255CC':'#8FA3BF', cursor:'pointer', textTransform:'capitalize' }}>
              {t} {t==='positions' && openTrades.length > 0 && `(${openTrades.length})`}
            </button>
          ))}
          <div style={{ marginLeft:'auto', fontSize:'11px', color: openPnl >= 0 ? '#16A34A':'#DC2626', fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>
            Float: {openPnl >= 0 ? '+' : ''}${(Number(openPnl)||0).toFixed(2)}
          </div>
        </div>

        <div style={{ overflowY:'auto', height:'calc(100% - 36px)' }}>
          {tab === 'positions' ? (
            openTrades.length === 0
              ? <div style={{ padding:'16px', textAlign:'center', fontSize:'12px', color:'#8FA3BF' }}>No open positions</div>
              : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #F0F4FB' }}>
                      {['Symbol','Dir','Lots','Open','Current','P&L','Pips','SL','TP',''].map(h => (
                        <th key={h} style={{ padding:'4px 10px', fontSize:'9px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#8FA3BF', fontWeight:600, textAlign:'left', background:'#FAFBFF' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(t => {
                      const cur = prices[t.symbol] || SEEDS[t.symbol] || t.open_price
                      const pnl = calcPnl(t, cur)
                      const i   = INSTRUMENTS.find(x => x.sym === t.symbol) as any
                      const pipDiff = i ? (t.direction==='buy' ? cur - t.open_price : t.open_price - cur) / (i.pip ?? 0.0001) : 0
                      return (
                        <tr key={t.id} style={{ borderBottom:'1px solid #F0F4FB' }}>
                          <td style={{ padding:'5px 10px', fontWeight:600, color:'#1A3A6B' }}>{t.symbol}</td>
                          <td style={{ padding:'5px 10px', fontWeight:700, color: t.direction==='buy'?'#16A34A':'#DC2626' }}>{t.direction.toUpperCase()}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace" }}>{t.lots}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color:'#5C7A9E' }}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color: cur>=t.open_price?'#16A34A':'#DC2626' }}>{cur.toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color: pnl>=0?'#16A34A':'#DC2626' }}>{pnl>=0?'+':''}${(Number(pnl)||0).toFixed(2)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color: pipDiff>=0?'#16A34A':'#DC2626' }}>{pipDiff>=0?'+':''}{(Number(pipDiff)||0).toFixed(1)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color:'#DC2626', fontSize:'10px' }}>{t.sl ?? '—'}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color:'#16A34A', fontSize:'10px' }}>{t.tp ?? '—'}</td>
                          <td style={{ padding:'5px 10px' }}>
                            <button onClick={() => closeTrade(t)} style={{ padding:'3px 10px', fontSize:'10px', fontWeight:600, background:'#FEF2F2', border:'1px solid rgba(220,38,38,.2)', borderRadius:'5px', cursor:'pointer', color:'#DC2626' }}>Close</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          ) : (
            closedTrades.length === 0
              ? <div style={{ padding:'16px', textAlign:'center', fontSize:'12px', color:'#8FA3BF' }}>No closed trades</div>
              : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #F0F4FB' }}>
                      {['Symbol','Dir','Lots','Open','Close','P&L','Pips','Closed'].map(h => (
                        <th key={h} style={{ padding:'4px 10px', fontSize:'9px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#8FA3BF', fontWeight:600, textAlign:'left', background:'#FAFBFF' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map(t => {
                      const i = INSTRUMENTS.find(x => x.sym === t.symbol) as any
                      return (
                        <tr key={t.id} style={{ borderBottom:'1px solid #F0F4FB' }}>
                          <td style={{ padding:'5px 10px', fontWeight:600, color:'#1A3A6B' }}>{t.symbol}</td>
                          <td style={{ padding:'5px 10px', fontWeight:700, color: t.direction==='buy'?'#16A34A':'#DC2626' }}>{t.direction.toUpperCase()}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace" }}>{t.lots}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color:'#5C7A9E' }}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color:'#5C7A9E' }}>{(Number(t.close_price)||0).toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color: (t.net_pnl??0)>=0?'#16A34A':'#DC2626' }}>{(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}</td>
                          <td style={{ padding:'5px 10px', fontFamily:"'JetBrains Mono',monospace", color: (t.pips??0)>=0?'#16A34A':'#DC2626' }}>{(t.pips??0)>=0?'+':''}{(Number(t.pips)||0).toFixed(1)}</td>
                          <td style={{ padding:'5px 10px', color:'#8FA3BF', fontSize:'10px' }}>{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          )}
        </div>
      </div>
    </div>
  )
}
