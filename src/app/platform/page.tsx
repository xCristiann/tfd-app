import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ─────────────────────────────────────────────────────────────────────────────
   INSTRUMENTS
   wsSymbol   = Kraken WebSocket v2 symbol  (live price feed)
   restPair   = Kraken REST API pair name   (candle history)
   yahoo      = Yahoo Finance symbol        (NAS100 only)
   ───────────────────────────────────────────────────────────────────────────── */
const INSTRUMENTS = [
  { sym:'EUR/USD', wsSymbol:'EUR/USD', restPair:'EURUSD',  yahoo:null,    spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', wsSymbol:'GBP/USD', restPair:'GBPUSD',  yahoo:null,    spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'XAU/USD', wsSymbol:'XAU/USD', restPair:'XAUUSD',  yahoo:null,    spread:0.30,    dec:2, pip:0.10,   lotUSD:(p:number)=>p*100      },
  { sym:'NAS100',  wsSymbol:null,       restPair:null,       yahoo:'^NDX',  spread:1.0,     dec:1, pip:1.0,    lotUSD:(p:number)=>p*10       },
  { sym:'BTC/USD', wsSymbol:'BTC/USD', restPair:'XBTUSD',  yahoo:null,    spread:10.0,    dec:1, pip:1.0,    lotUSD:(p:number)=>p          },
  { sym:'USD/JPY', wsSymbol:'USD/JPY', restPair:'USDJPY',  yahoo:null,    spread:0.020,   dec:3, pip:0.01,   lotUSD:(_:number)=>LOT_SIZE   },
  { sym:'ETH/USD', wsSymbol:'ETH/USD', restPair:'ETHUSD',  yahoo:null,    spread:1.0,     dec:2, pip:1.0,    lotUSD:(p:number)=>p          },
]

const SEED: Record<string,number> = {
  'EUR/USD':1.1464,'GBP/USD':1.2940,'XAU/USD':2980.0,
  'NAS100':19200.0,'BTC/USD':83000.0,'USD/JPY':148.50,'ETH/USD':1900.0,
}

/*
  Kraken REST intervals (minutes): 1,5,15,30,60,240,1440,10080,21600
  Max 720 candles per call. We paginate with 'since' to get more.
  TF_CONFIG maps our TF labels → Kraken interval + how many pages to fetch
*/
const TF_CONFIG: Record<string,{interval:number; pages:number; sec:number}> = {
  M1:  { interval:1,    pages:3,  sec:60      },  // ~2160 candles  (~36h)
  M5:  { interval:5,    pages:3,  sec:300     },  // ~2160 candles  (~7.5d)
  M15: { interval:15,   pages:3,  sec:900     },  // ~2160 candles  (~22d)
  M30: { interval:30,   pages:3,  sec:1800    },  // ~2160 candles  (~45d)
  H1:  { interval:60,   pages:4,  sec:3600    },  // ~2880 candles  (~120d)
  H4:  { interval:240,  pages:4,  sec:14400   },  // ~2880 candles  (~480d)
  D1:  { interval:1440, pages:5,  sec:86400   },  // ~3600 candles  (~10y)
}

/* ── LWC loader ──────────────────────────────────────────────────────────────── */
let _lwcReady = false; let _lwcQ: (()=>void)[] = []
function loadLWC(): Promise<void> {
  return new Promise(res => {
    if (_lwcReady) { res(); return }
    _lwcQ.push(res)
    if (document.getElementById('lwc-script')) return
    const s = document.createElement('script')
    s.id  = 'lwc-script'
    s.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload = () => { _lwcReady=true; _lwcQ.forEach(f=>f()); _lwcQ=[] }
    document.head.appendChild(s)
  })
}

/* ── Fetch candles — Kraken REST (paginated) ─────────────────────────────────── */
async function fetchKrakenCandles(restPair: string, tf: string): Promise<{time:number;open:number;high:number;low:number;close:number}[]> {
  const { interval, pages } = TF_CONFIG[tf]
  const allCandles: {time:number;open:number;high:number;low:number;close:number}[] = []

  // Work backwards: start far enough in history
  // Each page = 720 candles. Start from (pages * 720 * interval * 60) seconds ago
  const totalSeconds = pages * 720 * interval * 60
  let since = Math.floor(Date.now()/1000) - totalSeconds

  for (let page = 0; page < pages; page++) {
    try {
      const url = `https://api.kraken.com/0/public/OHLC?pair=${restPair}&interval=${interval}&since=${since}`
      const r   = await fetch(url)
      if (!r.ok) break
      const d   = await r.json()
      if (d.error?.length) break

      const result = d.result
      if (!result) break
      // Result key is the pair name (may differ from input, e.g. XXBTZUSD for XBTUSD)
      const pairKey = Object.keys(result).find(k => k !== 'last')
      if (!pairKey) break

      const candles = result[pairKey] as any[]
      if (!candles?.length) break

      // Kraken OHLC format: [time, open, high, low, close, vwap, volume, count]
      const parsed = candles.map((c:any) => ({
        time:  c[0] as number,
        open:  parseFloat(c[1]),
        high:  parseFloat(c[2]),
        low:   parseFloat(c[3]),
        close: parseFloat(c[4]),
      }))

      allCandles.push(...parsed)

      // Next page: start from after the last candle
      const last = candles[candles.length-1]
      since = last[0] + 1
      if (candles.length < 700) break // No more data
    } catch { break }
  }

  // Deduplicate + sort
  const seen = new Set<number>()
  return allCandles
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })
    .sort((a,b) => a.time - b.time)
}

/* ── Fetch NAS100 candles from Yahoo Finance ─────────────────────────────────── */
async function fetchNasCandles(tf: string): Promise<{time:number;open:number;high:number;low:number;close:number}[]> {
  const yahooIntervalMap: Record<string,{interval:string;range:string}> = {
    M1:  { interval:'1m',  range:'7d'  },
    M5:  { interval:'5m',  range:'60d' },
    M15: { interval:'15m', range:'60d' },
    M30: { interval:'30m', range:'60d' },
    H1:  { interval:'1h',  range:'2y'  },
    H4:  { interval:'1h',  range:'2y'  }, // aggregate
    D1:  { interval:'1d',  range:'10y' },
  }
  const { interval, range } = yahooIntervalMap[tf]
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5ENDX?interval=${interval}&range=${range}&includePrePost=false`
    const r   = await fetch(url, { headers:{ 'Accept':'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d      = await r.json()
    const result = d?.chart?.result?.[0]
    if (!result?.timestamp) return []

    const timestamps = result.timestamp as number[]
    const q          = result.indicators?.quote?.[0]
    if (!q) return []

    let candles = timestamps
      .map((t:number, i:number) => ({
        time: t, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i],
      }))
      .filter(c => c.open && c.high && c.low && c.close) as {time:number;open:number;high:number;low:number;close:number}[]

    // Aggregate H1→H4
    if (tf === 'H4') {
      const agg: typeof candles = []
      for (let i = 0; i+3 < candles.length; i += 4) {
        agg.push({
          time:  candles[i].time,
          open:  candles[i].open,
          high:  Math.max(candles[i].high, candles[i+1].high, candles[i+2].high, candles[i+3].high),
          low:   Math.min(candles[i].low,  candles[i+1].low,  candles[i+2].low,  candles[i+3].low),
          close: candles[i+3].close,
        })
      }
      return agg
    }
    return candles
  } catch { return [] }
}

/* ── CandleChart component ───────────────────────────────────────────────────── */
function CandleChart({ sym, tf, livePrice }:{ sym:string; tf:string; livePrice:number }) {
  const divRef   = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const serRef   = useRef<any>(null)
  const lastRef  = useRef<any>(null)

  useEffect(() => {
    const el = divRef.current; if (!el) return
    let dead = false

    loadLWC().then(async () => {
      if (dead || !divRef.current) return
      try { chartRef.current?.remove() } catch {}

      const LWC   = (window as any).LightweightCharts
      const chart = LWC.createChart(el, {
        width: el.clientWidth, height: el.clientHeight,
        layout:{ background:{ type:'solid', color:'#0A0A0F' }, textColor:'rgba(200,190,240,0.5)' },
        grid:{ vertLines:{ color:'rgba(212,168,67,0.05)' }, horzLines:{ color:'rgba(212,168,67,0.05)' } },
        crosshair:{ mode:1 },
        rightPriceScale:{ borderColor:'rgba(212,168,67,0.15)' },
        timeScale:{ borderColor:'rgba(212,168,67,0.15)', timeVisible:true, secondsVisible:false },
      })
      const series = chart.addCandlestickSeries({
        upColor:'#00D97E', downColor:'#FF3352',
        borderUpColor:'#00D97E', borderDownColor:'#FF3352',
        wickUpColor:'#00D97E', wickDownColor:'#FF3352',
      })
      chartRef.current = chart; serRef.current = series

      const ro = new ResizeObserver(() => {
        if (chartRef.current && divRef.current)
          chartRef.current.resize(divRef.current.clientWidth, divRef.current.clientHeight)
      })
      ro.observe(el)

      // Fetch history
      const inst    = INSTRUMENTS.find(i => i.sym === sym)!
      const candles = sym === 'NAS100'
        ? await fetchNasCandles(tf)
        : await fetchKrakenCandles(inst.restPair!, tf)

      if (dead) { ro.disconnect(); return }

      if (candles.length > 0) {
        series.setData(candles)
        lastRef.current = candles[candles.length-1]
        chart.timeScale().fitContent()
      } else {
        // Fallback seed
        const now  = Math.floor(Date.now()/1000)
        const seed = { time:now, open:livePrice, high:livePrice, low:livePrice, close:livePrice }
        lastRef.current = seed
        series.setData([seed])
      }

      return () => ro.disconnect()
    })
    return () => { dead = true }
  }, [sym, tf])

  // Update live candle on every tick
  useEffect(() => {
    if (!serRef.current || livePrice <= 0) return
    const { sec } = TF_CONFIG[tf]
    const now    = Math.floor(Date.now()/1000)
    const cTime  = Math.floor(now/sec)*sec
    const prev   = lastRef.current

    const c = (!prev || cTime > prev.time)
      ? { time:cTime, open:livePrice, high:livePrice, low:livePrice, close:livePrice }
      : { time:prev.time, open:prev.open, high:Math.max(prev.high,livePrice), low:Math.min(prev.low,livePrice), close:livePrice }

    lastRef.current = c
    try { serRef.current.update(c) } catch {}
  }, [livePrice, tf])

  return <div ref={divRef} style={{ width:'100%', height:'100%' }} />
}

/* ── Price feed ──────────────────────────────────────────────────────────────── */
/*
  LIVE PRICES:
    Kraken WebSocket v2 (wss://ws.kraken.com/v2)
    - EUR/USD, GBP/USD, XAU/USD, BTC/USD, ETH/USD, USD/JPY
    - Public feed, no auth, real-time ticker updates
  
  NAS100:
    Yahoo Finance v8 polled every 3s
    (^NDX - free, CORS enabled)
*/
function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({...SEED})
  const refPrev = useRef<Record<string,number>>({...SEED})

  const push = useCallback((sym: string, price: number) => {
    if (!price || isNaN(price) || price <= 0) return
    setPrices(prev => {
      if (prev[sym] === price) return prev
      refPrev.current[sym] = prev[sym] || price
      return { ...prev, [sym]: price }
    })
  }, [])

  useEffect(() => {
    let dead = false
    let ws:    WebSocket
    let wsTimer: ReturnType<typeof setTimeout>
    let nasTimer: ReturnType<typeof setInterval>

    /* ── Kraken WebSocket v2 ─────────────────────────────────────────────────── */
    const krakenInsts = INSTRUMENTS.filter(i => i.wsSymbol)
    // Map "BTC/USD" → "BTC/USD" (our internal sym matches Kraken WS sym)
    const wsMap = Object.fromEntries(krakenInsts.map(i => [i.wsSymbol!, i.sym]))

    const connectKraken = () => {
      if (dead) return
      try {
        ws = new WebSocket('wss://ws.kraken.com/v2')

        ws.onopen = () => {
          ws.send(JSON.stringify({
            method: 'subscribe',
            params: {
              channel: 'ticker',
              symbol:  krakenInsts.map(i => i.wsSymbol),
            }
          }))
        }

        ws.onmessage = ({ data }) => {
          try {
            const msg = JSON.parse(data)
            // Kraken v2: { channel:'ticker', type:'snapshot'|'update', data:[{symbol, last, bid, ask}] }
            if (msg.channel !== 'ticker' || !Array.isArray(msg.data)) return
            for (const tick of msg.data) {
              const sym = wsMap[tick.symbol]
              if (!sym) continue
              // 'last' = last trade price; fallback to mid bid/ask
              const price = tick.last ?? (tick.bid + tick.ask) / 2
              if (price > 0) push(sym, price)
            }
          } catch {}
        }

        ws.onclose = () => { if (!dead) wsTimer = setTimeout(connectKraken, 2000) }
        ws.onerror = () => { try { ws.close() } catch {} }
      } catch {
        if (!dead) wsTimer = setTimeout(connectKraken, 3000)
      }
    }

    /* ── NAS100 — Yahoo Finance polling ─────────────────────────────────────── */
    const pollNas = async () => {
      if (dead) return
      try {
        const r = await fetch(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5ENDX?interval=1m&range=1d',
          { headers: { 'Accept': 'application/json' } }
        )
        const d      = await r.json()
        const result = d?.chart?.result?.[0]
        const closes = result?.indicators?.quote?.[0]?.close as (number|null)[]
        if (!closes) return
        // Last non-null close price
        for (let i = closes.length-1; i >= 0; i--) {
          if (closes[i] != null && closes[i]! > 0) { push('NAS100', closes[i]!); break }
        }
      } catch {}
    }

    connectKraken()
    pollNas()
    nasTimer = setInterval(pollNas, 3000)

    return () => {
      dead = true
      clearTimeout(wsTimer)
      clearInterval(nasTimer)
      try { ws?.close() } catch {}
    }
  }, [push])

  return { prices, refPrev }
}

/* ── P&L ─────────────────────────────────────────────────────────────────────── */
function tradePnl(t: any, prices: Record<string,number>): number {
  const inst  = INSTRUMENTS.find(i => i.sym === t.symbol)
  const cur   = prices[t.symbol] || SEED[t.symbol] || t.open_price
  const diff  = t.direction === 'buy' ? cur - t.open_price : t.open_price - cur
  const units = t.symbol === 'USD/JPY' ? LOT_SIZE / cur : (inst?.lotUSD(1) ?? LOT_SIZE)
  return diff * units * t.lots
}

/* ── Risk Monitor — auto-breach on -5% trade or max DD ──────────────────────── */
function useRiskMonitor(
  openTrades: any[], prices: Record<string,number>,
  primary: any, onBreach: (reason:string, trades:any[]) => void
) {
  const breachedRef = useRef(false)

  useEffect(() => {
    if (!primary || !openTrades.length || breachedRef.current) return
    if (primary.status === 'breached' || primary.status === 'passed') return

    const balance     = primary.balance ?? 0
    const startBal    = primary.starting_balance ?? balance
    const maxDDPct    = primary.max_dd ?? 10
    const maxDDAmount = startBal * (maxDDPct / 100)

    // Per-trade -5% stop
    for (const t of openTrades) {
      const pnl    = tradePnl(t, prices)
      const pnlPct = balance > 0 ? (pnl / balance) * 100 : 0
      if (pnlPct <= -5) {
        breachedRef.current = true
        onBreach(`${t.symbol} trade hit -5% loss (${pnlPct.toFixed(2)}%)`, openTrades)
        return
      }
    }

    // Max drawdown
    const totalPnl = openTrades.reduce((s,t) => s + tradePnl(t, prices), 0)
    const equity   = balance + totalPnl
    const floatDD  = balance - equity
    if (floatDD >= maxDDAmount) {
      breachedRef.current = true
      onBreach(`Max drawdown exceeded: -${((floatDD/startBal)*100).toFixed(2)}% (limit: ${maxDDPct}%)`, openTrades)
    }
  }, [prices, openTrades.length])

  useEffect(() => { breachedRef.current = false }, [primary?.id])
}

/* ── Platform page ───────────────────────────────────────────────────────────── */
export function PlatformPage() {
  const navigate  = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary: defPrimary } = useAccount()
  const [selAccId, setSelAccId] = useState<string|null>(null)
  const primary = accounts.find(a => a.id === selAccId) ?? defPrimary

  const [sym,       setSym]       = useState('BTC/USD')
  const [tf,        setTf]        = useState('H1')
  const [dir,       setDir]       = useState<'buy'|'sell'>('buy')
  const [lots,      setLots]      = useState('0.10')
  const [sl,        setSl]        = useState('')
  const [tp,        setTp]        = useState('')
  const [orderType, setOrderType] = useState('Market')
  const [tab,       setTab]       = useState('positions')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [placing,     setPlacing]    = useState(false)
  const [openTrades,   setOpenTrades]   = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])

  const { prices, refPrev } = usePriceFeed()

  const inst      = INSTRUMENTS.find(i => i.sym === sym)!
  const livePrice = prices[sym] || SEED[sym]
  const prevPrice = refPrev.current[sym] || livePrice
  const up        = livePrice >= prevPrice
  const execPrice = +(dir === 'buy' ? livePrice + inst.spread : livePrice).toFixed(inst.dec)
  const lotsNum   = Math.max(0.01, parseFloat(lots) || 0.01)

  const balance    = primary?.balance ?? 0
  const openPnl    = openTrades.reduce((s, t) => s + tradePnl(t, prices), 0)
  const equity     = balance + openPnl
  const usedMargin = openTrades.reduce((s, t) => {
    const cur = prices[t.symbol] || SEED[t.symbol]
    const i   = INSTRUMENTS.find(x => x.sym === t.symbol)
    return s + (i?.lotUSD(cur) ?? LOT_SIZE) * t.lots / LEVERAGE
  }, 0)
  const freeMargin  = equity - usedMargin
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity
  const reqMargin   = inst.lotUSD(execPrice) * lotsNum / LEVERAGE
  const maxLots     = Math.max(0, Math.floor(freeMargin * LEVERAGE / inst.lotUSD(execPrice) * 100) / 100)

  useEffect(() => {
    if (!primary?.id) return
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status','open')
      .order('opened_at', {ascending:false}).then(({data}) => setOpenTrades(data ?? []))
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status','closed')
      .order('closed_at', {ascending:false}).limit(50).then(({data}) => setClosedTrades(data ?? []))
  }, [primary?.id])

  /* ── Auto-breach ─────────────────────────────────────────────────────────── */
  const handleBreach = useCallback(async (reason: string, trades: any[]) => {
    if (!primary) return
    toast('error', '🚨', 'Account Breached', reason)

    const closed = await Promise.all(trades.map(async t => {
      const ti     = INSTRUMENTS.find(i => i.sym === t.symbol)!
      const cur    = prices[t.symbol] || SEED[t.symbol]
      const closeP = +(t.direction==='buy' ? cur : cur + ti.spread).toFixed(ti.dec)
      const diff   = t.direction==='buy' ? closeP - t.open_price : t.open_price - closeP
      const units  = t.symbol==='USD/JPY' ? LOT_SIZE/closeP : ti.lotUSD(1)
      const netPnl = +(diff * units * t.lots).toFixed(2)
      const pips   = +(diff / ti.pip).toFixed(1)
      await supabase.from('trades').update({
        status:'closed', close_price:closeP, closed_at:new Date().toISOString(),
        pips, net_pnl:netPnl, gross_pnl:netPnl, close_reason:'breach',
      }).eq('id', t.id)
      return { ...t, status:'closed', close_price:closeP, net_pnl:netPnl, pips }
    }))

    const totalPnl = closed.reduce((s,t) => s+(t.net_pnl||0), 0)
    const newBal   = +(balance + totalPnl).toFixed(2)

    await supabase.from('accounts').update({
      status:'breached', phase:'breached', balance:newBal, equity:newBal,
      breached_at:new Date().toISOString(), breach_reason:reason,
    }).eq('id', primary.id)

    await supabase.from('notifications').insert([
      {
        user_id:primary.user_id, type:'breach',
        title:'🚨 Account Breached',
        body:`Your account ${primary.account_number} was auto-breached. ${reason}`,
        is_read:false, metadata:{ account_id:primary.id, reason, balance:newBal },
      },
      {
        user_id:null, type:'breach',
        title:`🚨 Breach — ${primary.account_number}`,
        body:`Auto-breached. ${reason}. Final balance: $${newBal}`,
        is_read:false, metadata:{ account_id:primary.id, account_number:primary.account_number, reason },
      },
    ])

    setOpenTrades([])
    setClosedTrades(p => [...closed, ...p])
  }, [primary, prices, balance])

  useRiskMonitor(openTrades, prices, primary, handleBreach)

  async function placeOrder() {
    if (!primary)                                                       { toast('error','❌','No Account','No active account'); return }
    if ((primary as any).payout_locked||primary.status==='suspended')  { toast('error','⛔','Locked','Payout pending'); return }
    if (primary.status==='breached'||primary.status==='passed')        { toast('error','⛔','Locked','Account not active'); return }
    if (reqMargin > freeMargin)                                         { toast('error','⛔','Margin',`Need $${reqMargin.toFixed(2)}`); return }
    setPlacing(true); setConfirmOpen(false)
    const { data, error } = await supabase.from('trades').insert({
      account_id:primary.id, user_id:primary.user_id,
      symbol:sym, direction:dir, lots:lotsNum,
      order_type:orderType.toLowerCase(), open_price:execPrice,
      sl:sl?+sl:null, tp:tp?+tp:null,
      status:'open', opened_at:new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error',error.message); return }
    setOpenTrades(t => [data, ...t])
    toast('success','⚡','Placed',`${dir.toUpperCase()} ${lotsNum} ${sym} @ ${execPrice}`)
    setSl(''); setTp('')
  }

  async function closeTrade(trade: any) {
    const ti     = INSTRUMENTS.find(i => i.sym === trade.symbol)!
    const cur    = prices[trade.symbol] || SEED[trade.symbol]
    const closeP = +(trade.direction==='buy' ? cur : cur + ti.spread).toFixed(ti.dec)
    const diff   = trade.direction==='buy' ? closeP - trade.open_price : trade.open_price - closeP
    const units  = trade.symbol==='USD/JPY' ? LOT_SIZE/closeP : ti.lotUSD(1)
    const netPnl = +(diff * units * trade.lots).toFixed(2)
    const pips   = +(diff / ti.pip).toFixed(1)
    await supabase.from('trades').update({
      status:'closed', close_price:closeP, closed_at:new Date().toISOString(),
      pips, net_pnl:netPnl, gross_pnl:netPnl,
    }).eq('id', trade.id)
    const newBal = +(balance + netPnl).toFixed(2)
    await supabase.from('accounts').update({ balance:newBal, equity:newBal }).eq('id', primary!.id)
    setOpenTrades(t => t.filter(x => x.id !== trade.id))
    setClosedTrades(t => [{ ...trade, status:'closed', close_price:closeP, net_pnl:netPnl, pips }, ...t])
    toast(netPnl>=0?'success':'warning', netPnl>=0?'💰':'🔴', 'Closed', `${trade.symbol} ${netPnl>=0?'+':''}${fmt(netPnl)}`)
  }

  // ── Styles helpers ─────────────────────────────────────────────────────────
  const S = {
    col:    { display:'flex', flexDirection:'column' as const },
    row:    { display:'flex', flexDirection:'row' as const, alignItems:'center' as const },
    label:  { fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600 },
    mono12: { fontFamily:'monospace', fontSize:12 },
    btn:    (active:boolean, color:string) => ({
      flex:1, padding:'9px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase' as const,
      fontWeight:'bold' as const, cursor:'pointer', border:'none',
      background:active?color:`${color}14`, color:active?(color==='var(--green)'?'#000':'#fff'):color,
    }),
  }

  return (
    <>
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#0A0A0F',color:'var(--text)',fontSize:12}}>

      {/* ─── Watchlist ─── */}
      <div style={{width:158,flexShrink:0,background:'var(--bg2)',borderRight:'1px solid var(--bdr)',...S.col}}>
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)',...S.row,gap:8}}>
          <div style={{width:20,height:20,border:'1px solid var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--gold)'}}>✦</div>
          <span style={{fontFamily:'serif',fontSize:11,fontWeight:'bold',lineHeight:1.3}}>TFD<br/>Terminal</span>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {INSTRUMENTS.map(i => {
            const cur  = prices[i.sym] || SEED[i.sym]
            const prv  = refPrev.current[i.sym] || cur
            const isUp = cur >= prv
            const live = prices[i.sym] > 0 && prices[i.sym] !== SEED[i.sym]
            return (
              <div key={i.sym} onClick={()=>setSym(i.sym)} style={{
                padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid rgba(212,168,67,.04)',
                background:sym===i.sym?'rgba(212,168,67,.07)':'transparent',
                borderLeft:sym===i.sym?'2px solid var(--gold)':'2px solid transparent',
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:11}}>{i.sym}</span>
                  <span style={{width:5,height:5,borderRadius:'50%',background:live?'var(--green)':'#555',transition:'background .3s'}}/>
                </div>
                <div style={{fontFamily:'monospace',fontSize:13,marginTop:2,fontWeight:700,color:isUp?'var(--green)':'var(--red)'}}>
                  {cur.toFixed(i.dec)}
                </div>
                <div style={{fontSize:8,color:isUp?'var(--green)':'var(--red)',marginTop:1}}>
                  {isUp?'▲':'▼'} {Math.abs(cur-prv).toFixed(i.dec)}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{padding:'8px 12px',borderTop:'1px solid var(--bdr)'}}>
          {accounts.length > 1
            ? <select value={selAccId??primary?.id??''} onChange={e=>setSelAccId(e.target.value)} style={{width:'100%',padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',color:'var(--text)',fontSize:9,fontFamily:'monospace',outline:'none',marginBottom:8}}>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.account_number}</option>)}
              </select>
            : <div style={{marginBottom:8,padding:'5px 6px',background:'var(--bg3)',border:'1px solid var(--dim)',fontSize:9,fontFamily:'monospace',color:'var(--gold)',textAlign:'center' as const}}>
                {primary?.account_number??'—'}
              </div>
          }
          <button onClick={()=>navigate('/dashboard')} style={{width:'100%',fontSize:9,letterSpacing:1,textTransform:'uppercase' as const,color:'var(--text3)',background:'none',border:'none',cursor:'pointer'}}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div style={{flex:1,...S.col,overflow:'hidden'}}>

        {/* Topbar */}
        <div style={{height:50,flexShrink:0,background:'var(--bg2)',borderBottom:'1px solid var(--bdr)',...S.row,padding:'0 14px',gap:10}}>
          <span style={{fontFamily:'serif',fontSize:16,fontWeight:'bold',flexShrink:0}}>{sym}</span>
          <span style={{fontFamily:'monospace',fontSize:22,fontWeight:700,flexShrink:0,minWidth:100,letterSpacing:-0.5,color:up?'var(--green)':'var(--red)'}}>
            {livePrice.toFixed(inst.dec)}
          </span>
          <span style={{fontSize:10,flexShrink:0,color:up?'var(--green)':'var(--red)'}}>
            {up?'▲':'▼'} {Math.abs(livePrice-prevPrice).toFixed(inst.dec)}
          </span>

          {/* Account stats */}
          <div style={{...S.row,gap:14,padding:'4px 14px',background:'rgba(0,0,0,.4)',border:'1px solid rgba(212,168,67,.1)',marginLeft:6,flexShrink:0}}>
            {[
              {l:'BALANCE',    v:fmt(balance),                           c:'var(--gold)'},
              {l:'EQUITY',     v:fmt(equity),                            c:equity>=balance?'var(--green)':'var(--red)'},
              {l:'P&L',        v:`${openPnl>=0?'+':''}${fmt(openPnl)}`,  c:openPnl>=0?'var(--green)':'var(--red)'},
              {l:'FREE MARGIN',v:fmt(freeMargin),                         c:freeMargin<0?'var(--red)':'var(--text2)'},
              ...(usedMargin>0?[{l:'MARGIN LVL',v:`${marginLevel.toFixed(0)}%`,c:marginLevel<150?'var(--red)':'var(--text2)'}]:[]),
            ].map(({l,v,c})=>(
              <div key={l} style={{flexShrink:0}}>
                <div style={{...S.label,marginBottom:1}}>{l}</div>
                <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          {(primary as any)?.payout_locked && (
            <div style={{padding:'4px 10px',background:'rgba(212,168,67,.1)',border:'1px solid var(--bdr2)',fontSize:9,color:'var(--gold)',letterSpacing:1,fontWeight:600,textTransform:'uppercase' as const,flexShrink:0}}>
              ⏳ Payout Pending
            </div>
          )}

          {/* TF selector */}
          <div style={{marginLeft:'auto',...S.row,gap:2}}>
            {Object.keys(TF_CONFIG).map(t=>(
              <button key={t} onClick={()=>setTf(t)} style={{
                padding:'3px 7px',fontSize:9,fontFamily:'monospace',fontWeight:'bold',cursor:'pointer',
                background:tf===t?'rgba(212,168,67,.15)':'transparent',
                border:tf===t?'1px solid var(--bdr2)':'1px solid transparent',
                color:tf===t?'var(--gold)':'var(--text3)',
              }}>{t}</button>
            ))}
          </div>
          <div style={{...S.row,gap:5,flexShrink:0}}>
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

        {/* Bottom panel */}
        <div style={{height:215,flexShrink:0,background:'var(--bg2)',borderTop:'1px solid var(--bdr)',...S.col}}>
          <div style={{display:'flex',borderBottom:'1px solid var(--bdr)'}}>
            {[['positions',`Positions (${openTrades.length})`],['history',`History (${closedTrades.length})`],['account','Account']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{
                padding:'7px 14px',fontSize:9,letterSpacing:1,textTransform:'uppercase' as const,fontWeight:600,cursor:'pointer',border:'none',marginBottom:-1,
                borderBottom:tab===k?'2px solid var(--gold)':'2px solid transparent',
                background:tab===k?'rgba(212,168,67,.04)':'transparent',
                color:tab===k?'var(--gold)':'var(--text3)',
              }}>{l}</button>
            ))}
          </div>
          <div style={{flex:1,overflow:'auto'}}>

            {tab==='positions' && (openTrades.length===0
              ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:11}}>No open positions</div>
              : <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead><tr style={{borderBottom:'1px solid var(--dim)'}}>
                    {['Symbol','Dir','Lots','Open','Current','P&L','DD%','SL','TP','Time',''].map(h=>(
                      <th key={h} style={{padding:'5px 10px',fontSize:7,letterSpacing:1.5,textTransform:'uppercase' as const,color:'var(--text3)',textAlign:'left' as const,fontWeight:600}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {openTrades.map(t=>{
                      const cur    = prices[t.symbol]||SEED[t.symbol]
                      const ti     = INSTRUMENTS.find(i=>i.sym===t.symbol)!
                      const pnl    = tradePnl(t,prices)
                      const ddPct  = balance>0?(pnl/balance)*100:0
                      const danger = ddPct<=-4
                      return (
                        <tr key={t.id} style={{borderBottom:'1px solid rgba(212,168,67,.04)',background:danger?'rgba(255,51,82,.05)':'transparent'}}>
                          <td style={{padding:'6px 10px',fontWeight:700}}>{t.symbol}</td>
                          <td style={{padding:'6px 10px'}}><span style={{fontSize:8,fontWeight:'bold',letterSpacing:1,color:t.direction==='buy'?'var(--green)':'var(--red)'}}>{t.direction.toUpperCase()}</span></td>
                          <td style={{padding:'6px 10px',fontFamily:'monospace'}}>{t.lots}</td>
                          <td style={{padding:'6px 10px',fontFamily:'monospace',color:'var(--text2)'}}>{t.open_price}</td>
                          <td style={{padding:'6px 10px',fontFamily:'monospace',fontWeight:600,color:cur>=t.open_price?'var(--green)':'var(--red)'}}>{cur.toFixed(ti.dec)}</td>
                          <td style={{padding:'6px 10px',fontFamily:'monospace',fontWeight:700,fontSize:11,color:pnl>=0?'var(--green)':'var(--red)'}}>{pnl>=0?'+':''}{fmt(pnl)}</td>
                          <td style={{padding:'6px 10px',fontFamily:'monospace',fontSize:10,fontWeight:600,color:danger?'var(--red)':ddPct<0?'rgba(255,51,82,.7)':'var(--green)'}}>{ddPct>=0?'+':''}{ddPct.toFixed(2)}%</td>
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

            {tab==='history' && (closedTrades.length===0
              ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:11}}>No history</div>
              : <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
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

            {tab==='account' && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,padding:16}}>
                {([
                  ['Balance',    fmt(balance),                            'var(--gold)'],
                  ['Equity',     fmt(equity),                             equity>=balance?'var(--green)':'var(--red)'],
                  ['Open P&L',   `${openPnl>=0?'+':''}${fmt(openPnl)}`,  openPnl>=0?'var(--green)':'var(--red)'],
                  ['Free Margin',fmt(freeMargin),                          freeMargin<0?'var(--red)':'var(--text)'],
                  ['Used Margin',fmt(usedMargin),                          'var(--text)'],
                  ['Margin Lvl', usedMargin>0?`${marginLevel.toFixed(0)}%`:'∞', marginLevel<150&&usedMargin>0?'var(--red)':'var(--green)'],
                  ['Leverage',   `1:${LEVERAGE}`,                          'var(--text2)'],
                  ['Open Pos.',  String(openTrades.length),                'var(--text)'],
                  ['Account',    primary?.account_number??'—',             'var(--gold)'],
                  ['Phase',      primary?.phase??'—',                      'var(--text2)'],
                ] as [string,string,string][]).map(([l,v,c])=>(
                  <div key={l}>
                    <div style={{...S.label,marginBottom:4}}>{l}</div>
                    <div style={{...S.mono12,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Order Panel ─── */}
      <div style={{width:210,flexShrink:0,background:'var(--bg2)',borderLeft:'1px solid var(--bdr)',...S.col}}>
        <div style={{padding:'10px 12px',borderBottom:'1px solid var(--bdr)'}}>
          <div style={{...S.label,marginBottom:8}}>Order Panel</div>
          <div style={{display:'flex'}}>
            <button onClick={()=>setDir('buy')}  style={S.btn(dir==='buy',  'var(--green)')}>Buy</button>
            <button onClick={()=>setDir('sell')} style={S.btn(dir==='sell', 'var(--red)')}>Sell</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:12,...S.col,gap:8}}>
          {/* Price display */}
          <div style={{textAlign:'center' as const,padding:'10px 8px',border:`1px solid ${up?'rgba(0,217,126,.25)':'rgba(255,51,82,.25)'}`,background:'var(--bg3)'}}>
            <div style={{...S.label,marginBottom:3}}>{dir==='buy'?'Ask':'Bid'}</div>
            <div style={{fontFamily:'monospace',fontSize:22,fontWeight:700,letterSpacing:-1,color:up?'var(--green)':'var(--red)'}}>{execPrice.toFixed(inst.dec)}</div>
            <div style={{fontSize:8,color:'var(--text3)',marginTop:3}}>spread {inst.spread.toFixed(inst.dec)}</div>
          </div>
          {/* Order type */}
          <div>
            <div style={{...S.label,marginBottom:4}}>Order Type</div>
            <div style={{display:'flex',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
              {['Market','Limit','Stop'].map(t=>(
                <button key={t} onClick={()=>setOrderType(t)} style={{flex:1,padding:'6px 0',fontSize:8,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',border:'none',background:orderType===t?'rgba(212,168,67,.12)':'transparent',color:orderType===t?'var(--gold)':'var(--text3)'}}>{t}</button>
              ))}
            </div>
          </div>
          {/* Lots */}
          <div>
            <div style={{...S.label,marginBottom:4}}>Lot Size <span style={{fontWeight:400,textTransform:'none' as const}}>max {maxLots}</span></div>
            <div style={{display:'flex',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
              <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 10px',background:'transparent',border:'none',borderRight:'1px solid var(--dim)',cursor:'pointer',color:'var(--text3)',fontSize:16}}>−</button>
              <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01" style={{flex:1,textAlign:'center' as const,padding:'8px 0',background:'transparent',border:'none',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:13}}/>
              <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 10px',background:'transparent',border:'none',borderLeft:'1px solid var(--dim)',cursor:'pointer',color:'var(--text3)',fontSize:16}}>+</button>
            </div>
          </div>
          {/* SL / TP */}
          {['Stop Loss','Take Profit'].map((l,i)=>{
            const val=i===0?sl:tp; const setV=i===0?setSl:setTp
            return (
              <div key={l}>
                <div style={{...S.label,marginBottom:4}}>{l}</div>
                <input value={val} onChange={e=>setV(e.target.value)} placeholder="Optional" type="number"
                  style={{width:'100%',padding:'8px',background:'var(--bg3)',border:'1px solid var(--dim)',outline:'none',color:'var(--text)',fontFamily:'monospace',fontSize:12,boxSizing:'border-box' as const}}/>
              </div>
            )
          })}
          {/* Margin info */}
          <div style={{background:'var(--bg3)',border:'1px solid var(--dim)',padding:'8px 10px'}}>
            {([
              ['Req. Margin',`$${reqMargin.toFixed(2)}`,reqMargin>freeMargin?'var(--red)':'var(--text)'],
              ['Free Margin',`$${freeMargin.toFixed(2)}`,freeMargin<reqMargin?'var(--red)':'var(--green)'],
              ['Leverage',   `1:${LEVERAGE}`,            'var(--text3)'],
            ] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:8,color:'var(--text3)'}}>{l}</span>
                <span style={{fontSize:9,fontFamily:'monospace',fontWeight:600,color:c}}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setConfirmOpen(true)} disabled={placing||!primary||reqMargin>freeMargin} style={{
            width:'100%',padding:'12px 0',fontSize:11,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',
            cursor:placing||!primary||reqMargin>freeMargin?'not-allowed':'pointer',
            border:'none',opacity:placing||!primary||reqMargin>freeMargin?0.35:1,
            background:dir==='buy'?'var(--green)':'var(--red)',
            color:dir==='buy'?'#000':'#fff',
          }}>
            {placing?'Placing…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
          </button>
        </div>
      </div>
    </div>

    {/* Confirm modal */}
    {confirmOpen && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(4px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'var(--bg2)',border:'1px solid var(--bdr2)',padding:24,minWidth:300}}>
          <div style={{fontFamily:'serif',fontSize:19,fontWeight:'bold',marginBottom:4}}>Confirm Order</div>
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:16}}>Review before executing</div>
          <div style={{...S.col,gap:6,marginBottom:16}}>
            {([['Symbol',sym],['Direction',dir.toUpperCase()],['Type',orderType],['Lots',String(lotsNum)],['Price',String(execPrice)],['Margin',`$${reqMargin.toFixed(2)}`],['Account',primary?.account_number??'—']] as [string,string][]).map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:'var(--bg3)',border:'1px solid var(--dim)'}}>
                <span style={{...S.label}}>{l}</span>
                <span style={{fontFamily:'monospace',fontSize:12,color:v==='BUY'?'var(--green)':v==='SELL'?'var(--red)':'var(--text)'}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button onClick={()=>setConfirmOpen(false)} style={{padding:'8px 18px',background:'transparent',border:'1px solid var(--bdr2)',color:'var(--text2)',fontSize:9,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer'}}>Cancel</button>
            <button onClick={placeOrder} style={{padding:'8px 22px',border:'none',fontSize:9,letterSpacing:2,textTransform:'uppercase' as const,fontWeight:'bold',cursor:'pointer',background:dir==='buy'?'var(--green)':'var(--red)',color:dir==='buy'?'#000':'#fff'}}>
              Confirm {dir.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    )}
    <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
