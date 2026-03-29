import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { accountTypeLabel } from '@/lib/utils'

const LEVERAGE = 50
const LOT_SIZE = 100_000

const ALL_INSTRUMENTS = [
  // lotUSD(price) = USD notional per 1 standard lot → margin = lotUSD(price)*lots/LEVERAGE
  // pnlMult = profit multiplier per 1 lot per 1 unit price move in USD
  // Forex pairs: 1 lot = 100,000 base currency units
  //   EUR/USD: diff * 100,000 → already in USD
  //   USD/JPY: diff in JPY → convert: diff * 100,000 / price
  //   Cross JPY (GBP/JPY): 1 lot = 100,000 GBP, P&L in JPY → convert: diff * 100,000 / jpyRate
  //   For simplicity use approximate: diff * 100,000 / price (price ≈ JPY per USD)
  { sym:'EUR/USD', tv:'OANDA:EURUSD',   spread:0.00010, dec:5, pip:0.0001, cat:'forex',
    // notional = price * 100k USD; P&L = diff * 100k
    lotUSD:(p:number)=>Math.max(p,0.5)*LOT_SIZE, pnlMult:LOT_SIZE },
  { sym:'GBP/USD', tv:'OANDA:GBPUSD',   spread:0.00015, dec:5, pip:0.0001, cat:'forex',
    lotUSD:(p:number)=>Math.max(p,0.5)*LOT_SIZE, pnlMult:LOT_SIZE },
  { sym:'USD/JPY', tv:'OANDA:USDJPY',   spread:0.010,   dec:3, pip:0.01,   cat:'forex',
    // notional = 100k USD; P&L in JPY → /price to get USD
    lotUSD:(_:number)=>LOT_SIZE, pnlMult:0 }, // pnlMult=0 → use JPY formula
  { sym:'USD/CHF', tv:'OANDA:USDCHF',   spread:0.00015, dec:5, pip:0.0001, cat:'forex',
    lotUSD:(_:number)=>LOT_SIZE, pnlMult:LOT_SIZE },
  { sym:'AUD/USD', tv:'OANDA:AUDUSD',   spread:0.00015, dec:5, pip:0.0001, cat:'forex',
    lotUSD:(p:number)=>Math.max(p,0.5)*LOT_SIZE, pnlMult:LOT_SIZE },
  { sym:'USD/CAD', tv:'OANDA:USDCAD',   spread:0.00020, dec:5, pip:0.0001, cat:'forex',
    // USD base: notional = 100k USD; P&L in CAD → /price
    lotUSD:(_:number)=>LOT_SIZE, pnlMult:0 }, // use CAD formula: diff*100k/price
  { sym:'NZD/USD', tv:'OANDA:NZDUSD',   spread:0.00020, dec:5, pip:0.0001, cat:'forex',
    lotUSD:(p:number)=>Math.max(p,0.5)*LOT_SIZE, pnlMult:LOT_SIZE },
  { sym:'GBP/JPY', tv:'OANDA:GBPJPY',   spread:0.030,   dec:3, pip:0.01,   cat:'forex',
    lotUSD:(p:number)=>Math.max(p/150,0.5)*LOT_SIZE, pnlMult:0 },
  { sym:'EUR/JPY', tv:'OANDA:EURJPY',   spread:0.025,   dec:3, pip:0.01,   cat:'forex',
    lotUSD:(p:number)=>Math.max(p/150,0.5)*LOT_SIZE, pnlMult:0 },
  { sym:'EUR/GBP', tv:'OANDA:EURGBP',   spread:0.00015, dec:5, pip:0.0001, cat:'forex',
    lotUSD:(p:number)=>Math.max(p*1.27,0.5)*LOT_SIZE, pnlMult:LOT_SIZE*1.27 },
  { sym:'AUD/JPY', tv:'OANDA:AUDJPY',   spread:0.030,   dec:3, pip:0.01,   cat:'forex',
    lotUSD:(p:number)=>Math.max(p/150,0.5)*LOT_SIZE, pnlMult:0 },
  { sym:'CAD/JPY', tv:'OANDA:CADJPY',   spread:0.030,   dec:3, pip:0.01,   cat:'forex',
    lotUSD:(p:number)=>Math.max(p/150,0.5)*LOT_SIZE, pnlMult:0 },
  // Metals: 1 lot = 100 oz (gold), 5000 oz (silver)
  { sym:'XAU/USD', tv:'OANDA:XAUUSD',   spread:0.30,    dec:2, pip:0.10,   cat:'metals',
    lotUSD:(p:number)=>Math.max(p,100)*100, pnlMult:100 },
  { sym:'XAG/USD', tv:'OANDA:XAGUSD',   spread:0.030,   dec:4, pip:0.001,  cat:'metals',
    lotUSD:(p:number)=>Math.max(p,1)*5000, pnlMult:5000 },
  // Indices: contract values (approximate)
  { sym:'NAS100',  tv:'OANDA:NAS100USD', spread:1.5,     dec:1, pip:1.0,    cat:'index',
    // 1 lot NAS100 = $20 per point (industry standard mini contract)
    lotUSD:(p:number)=>Math.max(p,100)*20, pnlMult:20 },
  { sym:'US500',   tv:'OANDA:SPX500USD', spread:0.50,    dec:2, pip:0.10,   cat:'index',
    // 1 lot US500 = $50 per point
    lotUSD:(p:number)=>Math.max(p,100)*50, pnlMult:50 },
  { sym:'US30',    tv:'OANDA:US30USD',   spread:2.0,     dec:1, pip:1.0,    cat:'index',
    // 1 lot US30 = $5 per point
    lotUSD:(p:number)=>Math.max(p,1000)*5, pnlMult:5 },
  { sym:'GER40',   tv:'OANDA:DE30EUR',   spread:1.0,     dec:1, pip:1.0,    cat:'index',
    // 1 lot GER40 = €25 per point ≈ $27
    lotUSD:(p:number)=>Math.max(p,100)*25, pnlMult:25 },
  { sym:'WTI',     tv:'OANDA:WTICOUSD',  spread:0.030,   dec:2, pip:0.01,   cat:'energy',
    // 1 lot WTI = 1000 barrels
    lotUSD:(p:number)=>Math.max(p,10)*1000, pnlMult:1000 },
] as const

const SEED: Record<string,number> = {
  'EUR/USD':1.0850,'GBP/USD':1.2940,'USD/JPY':149.50,'USD/CHF':0.8840,
  'AUD/USD':0.6290,'USD/CAD':1.4390,'NZD/USD':0.5720,'GBP/JPY':193.50,
  'EUR/JPY':162.20,'EUR/GBP':0.8380,'AUD/JPY':94.00,'CAD/JPY':104.20,
  'XAU/USD':3300.0,'XAG/USD':34.00,
  'NAS100':21800,'US500':5750,'US30':43500,'GER40':22800,'WTI':71.50,
}

const TF_LIST = ['1','5','15','30','60','240','D','W'] as const
const TF_LABEL: Record<string,string> = {'1':'1m','5':'5m','15':'15m','30':'30m','60':'1h','240':'4h','D':'1D','W':'1W'}

function lsGet(k:string,fb:string){try{return localStorage.getItem(k)||fb}catch{return fb}}
function lsSet(k:string,v:string){try{localStorage.setItem(k,v)}catch{}}

/* ── TradingView Chart ───────────────────────────────────────────── */
function TVChart({ tvSym, interval }: { tvSym:string; interval:string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current; if (!el) return
    el.innerHTML = ''

    // TV Advanced Chart requires a fresh script injection each time
    // Use a stable container id so TV can attach
    const id = 'tv_chart_main'
    el.id = id

    const script = document.createElement('script')
    script.type  = 'text/javascript'
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:          true,
      symbol:            tvSym,
      interval,
      timezone:          'Etc/UTC',
      theme:             'light',
      style:             '1',
      locale:            'en',
      enable_publishing: false,
      allow_symbol_change: true,
      save_image:        false,
      hide_volume:       false,
      support_host:      'https://www.tradingview.com',
    })
    el.appendChild(script)
  }, [tvSym, interval])

  return <div ref={ref} className="tradingview-widget-container" style={{width:'100%',height:'100%'}}/>
}

/* ── P&L ─────────────────────────────────────────────────────────── */
function calcPnl(trade:any, price:number): number {
  const inst = ALL_INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if (!inst || !price || price <= 0 || !trade.open_price || trade.open_price <= 0) return 0
  const diff = trade.direction==='buy' ? price-trade.open_price : trade.open_price-price
  const sym  = trade.symbol as string
  const lots = Number(trade.lots) || 0
  // Cap diff sanity: never more than 30% of open price (catches stale/bad prices)
  if (Math.abs(diff) > trade.open_price * 0.30) return 0
  let pnl = 0
  // JPY pairs: P&L in JPY → convert to USD
  if (sym.endsWith('/JPY')) {
    pnl = diff * LOT_SIZE / price * lots
  } else if (sym === 'USD/CHF') {
    pnl = diff * LOT_SIZE / price * lots
  } else if (sym === 'USD/CAD') {
    pnl = diff * LOT_SIZE / price * lots
  } else {
    // All others use pnlMult directly
    const mult = (inst as any).pnlMult ?? LOT_SIZE
    pnl = diff * mult * lots
  }
  return +pnl.toFixed(2)
}

/* ── Margin calc helper ──────────────────────────────────────────── */
function calcMargin(sym: string, price: number, lots: number): number {
  const inst = ALL_INSTRUMENTS.find(i=>i.sym===sym) as any
  if (!inst || !price || price <= 0) return 0
  return (inst.lotUSD(price) * lots) / LEVERAGE
}

/* ── Price feed ─────────────────────────────────────────────────────
   Priority 1: TFD MT5 Bridge (ws://VPS:8081) — real MT5 prices
   Priority 2: Deriv WebSocket fallback (if bridge offline)
   Priority 3: Cached localStorage prices (market closed / offline)
   ─────────────────────────────────────────────────────────────── */

// MT5 bridge symbol map: our internal sym -> MT5 sym
const MT5_SYM: Record<string,string> = {
  'EUR/USD':'EURUSD','GBP/USD':'GBPUSD','USD/JPY':'USDJPY',
  'USD/CHF':'USDCHF','AUD/USD':'AUDUSD','USD/CAD':'USDCAD',
  'NZD/USD':'NZDUSD','GBP/JPY':'GBPJPY','EUR/JPY':'EURJPY',
  'EUR/GBP':'EURGBP','AUD/JPY':'AUDJPY','CAD/JPY':'CADJPY',
  'XAU/USD':'XAUUSD','XAG/USD':'XAGUSD',
  'NAS100':'US100','US500':'US500','US30':'US30',
  'GER40':'GER40','WTI':'USOIL',
}
const MT5_REV: Record<string,string> = Object.fromEntries(
  Object.entries(MT5_SYM).map(([k,v])=>[v,k])
)

// Deriv fallback map
const DERIV_SYM: Record<string,string> = {
  'EUR/USD':'frxEURUSD','GBP/USD':'frxGBPUSD','USD/JPY':'frxUSDJPY',
  'USD/CHF':'frxUSDCHF','AUD/USD':'frxAUDUSD','USD/CAD':'frxUSDCAD',
  'NZD/USD':'frxNZDUSD','GBP/JPY':'frxGBPJPY','EUR/JPY':'frxEURJPY',
  'EUR/GBP':'frxEURGBP','XAU/USD':'frxXAUUSD',
  'NAS100':'OTC_NDX','US500':'OTC_SPX','US30':'OTC_DJI',
}
const DERIV_REV: Record<string,string> = Object.fromEntries(
  Object.entries(DERIV_SYM).map(([k,v])=>[v,k])
)

// Bridge URL — set VITE_WS_BRIDGE in .env, e.g. ws://YOUR_VPS_IP:8081
const BRIDGE_WS   = (import.meta as any).env?.VITE_WS_BRIDGE   || ''
const BRIDGE_REST = (import.meta as any).env?.VITE_REST_BRIDGE  || ''

const LS_PRICES_KEY = 'tfd_last_prices'
const LS_BRIDGE_KEY = 'tfd_bridge_ok'

function loadCachedPrices(): Record<string,number> {
  try {
    const raw = localStorage.getItem(LS_PRICES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed._ts ?? 0) > 72 * 60 * 60 * 1000) return {}
    const { _ts, ...prices } = parsed
    return prices
  } catch { return {} }
}

function saveCachedPrices(prices: Record<string,number>) {
  try {
    localStorage.setItem(LS_PRICES_KEY, JSON.stringify({ ...prices, _ts: Date.now() }))
  } catch {}
}

function usePriceFeed() {
  const cached = useMemo(() => ({ ...SEED, ...loadCachedPrices() }), [])
  const [prices, setPrices]       = useState<Record<string,number>>(cached)
  const [bridgeOnline, setBridge] = useState<boolean|null>(null) // null=unknown, true=live, false=offline
  const refPrev    = useRef<Record<string,number>>({...cached})
  const refPrices  = useRef<Record<string,number>>({...cached})
  const wsRef      = useRef<WebSocket|null>(null)
  const wsLive     = useRef<Set<string>>(new Set())
  const deadRef    = useRef(false)
  const saveTimer  = useRef<ReturnType<typeof setTimeout>|null>(null)
  const usedBridge = useRef(false)

  const push = useCallback((sym: string, bid: number, ask?: number) => {
    const price = ask ? (bid + ask) / 2 : bid
    if (!price || isNaN(price) || price <= 0) return
    refPrev.current[sym]   = refPrices.current[sym] || price
    refPrices.current[sym] = price
    setPrices(p => p[sym] === price ? p : {...p, [sym]: price})
    wsLive.current.add(sym)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveCachedPrices(refPrices.current), 5000)
  }, [])

  useEffect(() => {
    deadRef.current = false

    // ── 1. MT5 Bridge WebSocket (primary) ─────────────────────────
    const connectBridge = () => {
      if (!BRIDGE_WS || deadRef.current) return false
      try {
        const ws = new WebSocket(BRIDGE_WS)
        wsRef.current = ws
        let timeout = setTimeout(() => {
          ws.close() // if no message in 5s, bridge is offline
        }, 5000)

        ws.onopen = () => {
          clearTimeout(timeout)
          setBridge(true)
          usedBridge.current = true
          localStorage.setItem(LS_BRIDGE_KEY, '1')
        }

        ws.onmessage = (e) => {
          clearTimeout(timeout)
          try {
            const d = JSON.parse(e.data)
            if (d.type === 'tick' && d.sym) {
              const ourSym = MT5_REV[d.sym] || d.sym
              push(ourSym, d.bid ?? d.mid, d.ask)
            }
            if (d.type === 'snapshot') {
              // Initial price dump from bridge
              for (const [mt5sym, tick] of Object.entries(d.prices ?? {})) {
                const ourSym = MT5_REV[mt5sym] || mt5sym
                const t = tick as any
                push(ourSym, t.bid ?? t.mid, t.ask)
              }
            }
          } catch {}
        }

        ws.onclose = () => {
          if (!deadRef.current) {
            setBridge(false)
            connectDeriv() // fallback to Deriv
            setTimeout(connectBridge, 10000) // retry bridge every 10s
          }
        }

        ws.onerror = () => { try { ws.close() } catch {} }
        return true
      } catch { return false }
    }

    const derivWsRef: { current: WebSocket|null } = { current: null }
    // ── 2. Deriv fallback WebSocket ────────────────────────────────
    const connectDeriv = () => {
      if (usedBridge.current || deadRef.current) return
      const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089')
      derivWsRef.current = ws
      ws.onopen = () => {
        Object.values(DERIV_SYM).forEach(dsym =>
          ws.send(JSON.stringify({ ticks: dsym, subscribe: 1 }))
        )
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          if (d.msg_type === 'tick' && d.tick) {
            const sym = DERIV_REV[d.tick.symbol]
            if (sym && d.tick.quote > 0) push(sym, d.tick.quote)
          }
        } catch {}
      }
      ws.onclose = () => {
        if (!deadRef.current && !usedBridge.current)
          setTimeout(connectDeriv, 3000)
      }
      ws.onerror = () => { try { ws.close() } catch {} }
    }

    // Start bridge if configured, otherwise Deriv
    if (BRIDGE_WS) {
      connectBridge()
    } else {
      setBridge(false)
      connectDeriv()
    }

    return () => {
      deadRef.current = true
      try { wsRef.current?.close() } catch {}
      try { derivWsRef.current?.close() } catch {}
    }
  }, [push])

  // Heartbeat 100ms
  useEffect(() => {
    const iv = setInterval(() => setPrices(p => ({...p})), 100)
    return () => clearInterval(iv)
  }, [])

  return { prices, refPrev, refPrices, push, wsLive, bridgeOnline }
}


/* ── Risk monitor ────────────────────────────────────────────────── */
function useRiskMonitor(tradesRef:any, refPrices:any, primaryRef:any, accountId:any, onBreach:any) {
  const fired    = useRef(false)
  const cb       = useRef(onBreach); cb.current = onBreach
  const peakEqRef = useRef(0)  // tracks highest equity this session for trailing DD

  useEffect(() => {
    const iv = setInterval(async () => {
      const pr=primaryRef.current, trades=tradesRef.current
      if (!pr||fired.current) return
      if (pr.status==='breached'||pr.status==='passed') return
      const bal=pr.balance??0, start=pr.starting_balance??bal
      if (bal<=0||start<=0) return

      const cp=(pr as any).challenge_products, ph=pr.phase??'phase1'
      const dailyDD  = ph==='funded'?(cp?.funded_daily_dd??5):(ph==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5))
      const isTrailing = (cp?.drawdown_type ?? pr.drawdown_type ?? 'static') === 'trailing'
      const trailingPct = cp?.trailing_drawdown ?? pr.trailing_drawdown ?? 8

      // Current equity = balance + open P&L
      const equity = bal + trades.reduce((s:number,t:any)=>s+calcPnl(t,refPrices.current[t.symbol]||SEED[t.symbol]),0)

      // Update peak equity (only goes up, never down)
      if (equity > peakEqRef.current) {
        peakEqRef.current = equity
        // Persist peak_balance to DB so it survives page refresh
        if (pr.id && equity > (pr.peak_balance ?? 0)) {
          supabase.from('accounts').update({ peak_balance: +equity.toFixed(2) }).eq('id', pr.id).then(() => {})
        }
      }

      // Calculate drawdown floor
      let floor: number
      if (isTrailing) {
        // Trailing DD: floor = highest equity ever − trailing%
        // Uses peak_balance from DB (persisted) as source of truth
        const peakFromDB = pr.peak_balance ?? bal
        const sessionPeak = peakEqRef.current || peakFromDB
        const truePeak = Math.max(sessionPeak, peakFromDB)
        floor = truePeak * (1 - trailingPct / 100)
      } else {
        // Static DD: floor = starting_balance − max_dd%
        const maxDD = ph==='funded'?(cp?.funded_max_dd??10):(ph==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10))
        floor = start - start * (maxDD / 100)
      }

      // Daily DD floor
      const dFloor = (pr.daily_high_balance ?? bal) - (pr.daily_high_balance ?? bal) * (dailyDD / 100)

      if (equity <= floor) {
        fired.current = true
        cb.current(`${isTrailing ? 'Trailing' : 'Max'} DD breached — equity $${equity.toFixed(2)} reached floor $${floor.toFixed(2)}`, trades)
      } else if (equity <= dFloor) {
        fired.current = true
        cb.current(`Daily DD breached`, trades)
      }
    }, 500)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fired.current = false
    // Reset peak tracking on account change — will re-sync from DB
    peakEqRef.current = primaryRef.current?.peak_balance ?? 0
  }, [accountId])
}

/* ── Platform Page ───────────────────────────────────────────────── */
export function PlatformPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary:defPrimary } = useAccount()
  const [selAccId, setSelAccId] = useState<string|null>(null)
  const primary = accounts.find(a=>a.id===selAccId) ?? defPrimary

  const [sym,    setSym]    = useState(()=>{ const s=lsGet('tfd_sym','EUR/USD'); return ALL_INSTRUMENTS.find(i=>i.sym===s)?s:'EUR/USD' })
  const [tf,     setTf]     = useState(()=>lsGet('tfd_tf','60'))
  const [dir,    setDir]    = useState<'buy'|'sell'>('buy')
  const [lots,   setLots]   = useState('0.10')
  const [sl,     setSl]     = useState('')
  const [tp,     setTp]     = useState('')
  const [tab,    setTab]    = useState<'positions'|'history'>('positions')
  const [search, setSearch] = useState('')
  const [placing,setPlacing]= useState(false)
  const [editSLTP, setEditSLTP] = useState<any>(null)
  const [openTrades,   setOpenTrades]   = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(()=>{
    try { return new Set(JSON.parse(localStorage.getItem('tfd_favs')||'[]')) }
    catch { return new Set(['EUR/USD','XAU/USD','NAS100']) }
  })

  useEffect(() => { lsSet('tfd_sym',sym) }, [sym])
  useEffect(() => { lsSet('tfd_tf',tf)   }, [tf])

  const { prices, refPrev, refPrices, push, wsLive: wsLiveRef, bridgeOnline } = usePriceFeed()
  const tradesRef  = useRef(openTrades);  tradesRef.current  = openTrades
  const primaryRef = useRef(primary);     primaryRef.current = primary
  const closingRef = useRef<Set<string>>(new Set())

  const inst      = (ALL_INSTRUMENTS.find(i=>i.sym===sym) ?? ALL_INSTRUMENTS[0]) as any
  const livePrice = refPrices.current[sym] || SEED[sym]
  const prevPrice = refPrev.current[sym]   || livePrice
  const up        = livePrice >= prevPrice
  const execPrice = +(dir==='buy' ? livePrice+inst.spread : livePrice).toFixed(inst.dec)
  const lotsNum   = Math.max(0.01, parseFloat(lots)||0.01)
  const balance   = primary?.balance ?? 0
  const openPnl   = openTrades.reduce((s,t) => s+calcPnl(t, refPrices.current[t.symbol]||SEED[t.symbol]), 0)
  const equity    = balance + openPnl
  const usedMgn   = openTrades.reduce((s,t) => {
    const price = refPrices.current[t.symbol] || SEED[t.symbol]
    return s + calcMargin(t.symbol, price, Number(t.lots)||0)
  }, 0)
  const freeMgn   = Math.max(0, equity - usedMgn)
  const reqMgn    = calcMargin(sym, execPrice, lotsNum)
  const maxLots   = reqMgn > 0 ? Math.floor((freeMgn / reqMgn) * lotsNum * 100) / 100 : 0
  // Market hours check (UTC) — must be declared BEFORE isLive
  const marketStatus = (() => {
    const now = new Date()
    const day = now.getUTCDay() // 0=Sun, 6=Sat
    const h   = now.getUTCHours()
    // Forex closed: Fri 22:00 UTC → Sun 22:00 UTC
    if (day === 6) return 'closed'                          // Saturday all day
    if (day === 0 && h < 22) return 'closed'               // Sunday before 22:00 UTC
    if (day === 5 && h >= 22) return 'closed'              // Friday after 22:00 UTC
    return 'open'
  })()

  // isLive = true only when market is open AND Deriv WS sent a tick this session
  const isLive = marketStatus === 'open' && wsLiveRef.current.has(sym)

  useEffect(() => {
    if (!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open')
      .order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed')
      .order('closed_at',{ascending:false}).limit(50).then(({data})=>setClosedTrades(data??[]))
  }, [primary?.id])

  useRiskMonitor(tradesRef, refPrices, primaryRef, primary?.id, async(reason:string, trades:any[]) => {
    toast('error','🚨','Account Breached',reason)
    if (!primary?.id) return
    for (const t of trades) {
      const cur = refPrices.current[t.symbol] || SEED[t.symbol]
      const i   = ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const cp  = +(t.direction==='buy' ? cur : cur+(i?.spread??0)).toFixed(i?.dec??5)
      const netPnl = calcPnl({...t, open_price:t.open_price}, cp)
      await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,closed_at:new Date().toISOString()}).eq('id',t.id)
    }
    const nb=+(balance+trades.reduce((s,t)=>{
      const cur=refPrices.current[t.symbol]||t.open_price
      const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      return s + calcPnl(t, cur)
    },0)).toFixed(2)
    await supabase.from('accounts').update({status:'breached',phase:'breached',balance:nb,equity:nb}).eq('id',primary.id)
    setOpenTrades([])
  })

  // Auto SL/TP
  useEffect(() => {
    if (!primary?.id) return
    const iv = setInterval(async () => {
      const trades=tradesRef.current, pr=primaryRef.current
      if (!trades.length||!pr) return
      for (const t of trades) {
        if (closingRef.current.has(t.id)||(!t.sl&&!t.tp)) continue
        const cur=refPrices.current[t.symbol]; if (!cur||cur<=0) continue
        const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any; if (!i) continue
        let hit=''
        if (t.sl){const sl=Number(t.sl);if(sl>0&&(t.direction==='buy'?cur<=sl:cur>=sl))hit=`SL @ ${cur.toFixed(i.dec)}`}
        if (!hit&&t.tp){const tp=Number(t.tp);if(tp>0&&(t.direction==='buy'?cur>=tp:cur<=tp))hit=`TP @ ${cur.toFixed(i.dec)}`}
        if (!hit) continue
        closingRef.current.add(t.id)
        try {
          const cp     = +(t.direction==='buy' ? cur : cur+i.spread).toFixed(i.dec)
          const netPnl = calcPnl({...t, open_price:t.open_price}, cp)
          const diff   = t.direction==='buy' ? cp-t.open_price : t.open_price-cp
          const pips   = +(diff/i.pip).toFixed(1)
          const now=new Date().toISOString()
          await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
          await supabase.from('accounts').update({balance:+((pr.balance??0)+netPnl).toFixed(2)}).eq('id',pr.id)
          setOpenTrades(p=>p.filter(x=>x.id!==t.id))
          setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
          toast(netPnl>=0?'success':'error',netPnl>=0?'🎯':'🛑',`${hit} — ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)}`)
        } catch { closingRef.current.delete(t.id) }
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [primary?.id])

  const toggleFav = (s:string) => {
    setFavorites(prev=>{const n=new Set(prev);n.has(s)?n.delete(s):n.add(s);localStorage.setItem('tfd_favs',JSON.stringify([...n]));return n})
  }

  async function placeOrder() {
    if (marketStatus === 'closed')  { toast('error','🔒','Market Closed','Trading is only available when the market is open.'); return }
    if (!primary?.id)              { toast('error','❌','No Account','Select an account'); return }
    if (primary.status==='breached'){ toast('error','❌','Breached','Account is breached'); return }
    if (primary.status==='soft_locked'){ toast('error','🔒','Frozen','Account is frozen pending risk investigation. Trading suspended.'); return }
    if (reqMgn>freeMgn)            { toast('error','❌','Margin',`Max ${maxLots} lots`); return }
    setPlacing(true)
    // Capture trader IP at moment of trade
    let traderIp: string | null = null
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipRes.json()
      traderIp = ipData.ip ?? null
    } catch {}
    const {data,error} = await supabase.from('trades').insert({
      account_id:primary.id, user_id:primary.user_id,
      symbol:sym, direction:dir, lots:lotsNum,
      open_price:execPrice, status:'open',
      sl:sl?parseFloat(sl):null, tp:tp?parseFloat(tp):null,
      opened_at:new Date().toISOString(),
      ip_address: traderIp,
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error',error.message); return }
    setOpenTrades(p=>[data,...p])
    toast('success','✅',`${dir.toUpperCase()} ${sym}`,`${lotsNum} lots @ ${execPrice}`)
    setSl(''); setTp('')
  }

  async function closeTrade(t:any) {
    const cur=refPrices.current[t.symbol]||SEED[t.symbol]
    const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    const cp=+(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
    const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
    const netPnl = calcPnl({...t, open_price:t.open_price}, cp)
    const pips=+(diff/(i?.pip??0.0001)).toFixed(1)
    const now=new Date().toISOString()
    await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
    await supabase.from('accounts').update({balance:+(balance+netPnl).toFixed(2),equity:+(equity+netPnl-openPnl).toFixed(2)}).eq('id',primary!.id)
    setOpenTrades(p=>p.filter(x=>x.id!==t.id))
    setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
    toast(netPnl>=0?'success':'error',netPnl>=0?'💰':'📉',`Closed ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)}`)
  }

  async function saveEditSLTP() {
    if (!editSLTP) return
    const newSl=editSLTP.sl?parseFloat(editSLTP.sl):null
    const newTp=editSLTP.tp?parseFloat(editSLTP.tp):null
    await supabase.from('trades').update({sl:newSl,tp:newTp}).eq('id',editSLTP.id)
    setOpenTrades(t=>t.map(x=>x.id===editSLTP.id?{...x,sl:newSl,tp:newTp}:x))
    setEditSLTP(null)
    toast('success','✅','SL/TP Updated','')
  }

  const watchlist = useMemo(() => {
    const q=search.toLowerCase()
    const filtered=ALL_INSTRUMENTS.filter(i=>!q||i.sym.toLowerCase().includes(q))
    return [...filtered].sort((a,b)=>(favorites.has(a.sym)?0:1)-(favorites.has(b.sym)?0:1))
  }, [search, favorites])

  const isMobile = useIsMobile()
  const [mobilePanel, setMobilePanel] = useState<'chart'|'trade'|'positions'>('chart')
  const mono = {fontFamily:"'JetBrains Mono',monospace"} as const

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#F0F4FB',color:'#1A3A6B',height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{height:'48px',background:'#1A3A6B',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>← Dashboard</button>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:700,color:'#fff'}}>The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span></div>
        {/* Bridge source indicator */}
        {bridgeOnline !== null && (
          <div style={{fontSize:'8px',fontWeight:700,padding:'2px 6px',borderRadius:'4px',
            background: bridgeOnline ? 'rgba(88,101,242,.3)' : 'rgba(255,255,255,.1)',
            color: bridgeOnline ? '#A5B4FC' : 'rgba(255,255,255,.4)',
            border: `1px solid ${bridgeOnline ? 'rgba(88,101,242,.5)' : 'rgba(255,255,255,.15)'}`,
            letterSpacing:'0.5px'}}>
            {bridgeOnline ? 'MT5 LIVE' : 'DERIV'}
          </div>
        )}
        <div style={{width:'6px',height:'6px',borderRadius:'50%',
          background: isLive?'#4ADE80': marketStatus==='closed'?'#9CA3AF':'#F59E0B',
          boxShadow: isLive?'0 0 8px #4ADE80':'none'}}/>
        <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',
          color: isLive?'#4ADE80': marketStatus==='closed'?'#9CA3AF':'#F59E0B'}}>
          {isLive?'Live': marketStatus==='closed'?'Closed':'Connecting'}
        </span>
        <div style={{marginLeft:'auto',display:'flex',gap:'4px'}}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>setSelAccId(a.id)} style={{padding:'3px 8px',background:a.id===primary?.id?'rgba(96,165,250,.2)':'rgba(255,255,255,.06)',border:a.id===primary?.id?'1px solid rgba(96,165,250,.4)':'1px solid rgba(255,255,255,.1)',borderRadius:'4px',color:a.id===primary?.id?'#60A5FA':'rgba(255,255,255,.4)',fontSize:'9px',...mono,cursor:'pointer'}}>
              {(a as any).account_number}
              <span style={{marginLeft:'4px',fontSize:'8px',opacity:0.7}}>
                {accountTypeLabel(a.phase, (a as any).challenge_products?.challenge_type)}
              </span>
            </button>
          ))}
        </div>
        {[['Bal',`$${(balance||0).toFixed(2)}`,'#fff'],['Equity',`$${(equity||0).toFixed(2)}`,equity>=balance?'#4ADE80':'#F87171'],['Float',`${openPnl>=0?'+':''}$${(openPnl||0).toFixed(2)}`,openPnl>=0?'#4ADE80':'#F87171'],['Free',`$${(freeMgn||0).toFixed(2)}`,'#60A5FA']].map(([l,v,c])=>(
          <div key={String(l)} style={{padding:'0 8px',borderLeft:'1px solid rgba(255,255,255,.1)',textAlign:'right'}}>
            <div style={{fontSize:'7px',color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'1px'}}>{l}</div>
            <div style={{...mono,fontSize:'10px',fontWeight:600,color:String(c)}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* WATCHLIST */}
        {!isMobile && <div style={{width:'180px',background:'#fff',borderRight:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'7px',borderBottom:'1px solid #E8EEF8',flexShrink:0}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:'100%',padding:'5px 8px',background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {watchlist.map(i=>{
              const price=prices[i.sym]||SEED[i.sym]
              const pv=refPrev.current[i.sym]||price
              const isUp=price>=pv
              const active=sym===i.sym
              const isFav=favorites.has(i.sym)
              return (
                <div key={i.sym} onClick={()=>setSym(i.sym)}
                  style={{padding:'5px 7px',borderBottom:'1px solid #F0F4FB',display:'flex',alignItems:'center',background:active?'#EEF3FF':'transparent',borderLeft:active?'3px solid #2255CC':'3px solid transparent',cursor:'pointer'}}>
                  <button onClick={e=>{e.stopPropagation();toggleFav(i.sym)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',color:isFav?'#F59E0B':'#D1D5DB',padding:'0 3px 0 0',flexShrink:0}}>{isFav?'★':'☆'}</button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'10px',fontWeight:600,color:active?'#2255CC':'#1A3A6B'}}>{i.sym}</div>
                    <div style={{fontSize:'8px',color:'#8FA3BF',textTransform:'uppercase'}}>{i.cat}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{...mono,fontSize:'10px',color:isUp?'#16A34A':'#DC2626'}}>{price.toFixed(i.dec)}</div>
                    <div style={{fontSize:'8px',color:isUp?'#16A34A':'#DC2626'}}>{isUp?'▲':'▼'}{Math.abs(price-pv).toFixed(i.dec)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>}

        {/* CHART AREA - show on mobile when chart tab active */}
        <div style={{flex:1,display:isMobile&&mobilePanel!=='chart'?'none':'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{height:'38px',background:'#fff',borderBottom:'1px solid #E8EEF8',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
            <div style={{...mono,fontSize:'20px',fontWeight:700,color:up?'#16A34A':'#DC2626'}}>{livePrice.toFixed(inst.dec)}</div>
            <div style={{fontSize:'10px',color:up?'#16A34A':'#DC2626'}}>{up?'▲':'▼'} {Math.abs(livePrice-prevPrice).toFixed(inst.dec)}</div>
            <div style={{fontSize:'13px',fontWeight:700,color:'#1A3A6B'}}>{sym}</div>
            <button onClick={()=>toggleFav(sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:favorites.has(sym)?'#F59E0B':'#D1D5DB'}}>{favorites.has(sym)?'★':'☆'}</button>
            <div style={{display:'flex',gap:'2px',marginLeft:'8px'}}>
              {TF_LIST.map(t=>(
                <button key={t} onClick={()=>setTf(t)} style={{padding:'3px 8px',fontSize:'9px',fontWeight:700,border:'none',borderRadius:'4px',cursor:'pointer',background:tf===t?'#2255CC':'#F4F7FD',color:tf===t?'#fff':'#5C7A9E'}}>{TF_LABEL[t]}</button>
              ))}
            </div>
            <div style={{marginLeft:'auto',fontSize:'9px',
              color: isLive?'#16A34A': marketStatus==='closed'?'#9CA3AF':'#F59E0B',
              background: isLive?'rgba(22,163,74,.08)': marketStatus==='closed'?'rgba(156,163,175,.08)':'rgba(245,158,11,.08)',
              padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>
              {isLive ? '● Live' : marketStatus==='closed' ? '○ Market Closed' : '○ Connecting…'}
            </div>
          </div>
          <div style={{flex:1}} key={`${sym}_${tf}`}>
            <TVChart tvSym={inst.tv} interval={tf}/>
          </div>
        </div>

        {/* ORDER PANEL */}
        <div style={{width:isMobile?'100%':'230px',background:'#fff',borderLeft:'1px solid #E8EEF8',display:isMobile&&mobilePanel!=='trade'?'none':'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'10px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:'9px',fontWeight:700,color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'8px'}}>New Order — {sym}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginBottom:'8px'}}>
              <button onClick={()=>marketStatus!=='closed'&&setDir('buy')}
                style={{padding:'9px',border:'none',borderRadius:'7px',cursor:marketStatus==='closed'?'not-allowed':'pointer',fontWeight:700,fontSize:'12px',
                  background:marketStatus==='closed'?'#F4F7FD':dir==='buy'?'#16A34A':'#F4F7FD',
                  color:marketStatus==='closed'?'#D1D5DB':dir==='buy'?'#fff':'#5C7A9E',
                  opacity:marketStatus==='closed'?0.5:1}}>BUY</button>
              <button onClick={()=>marketStatus!=='closed'&&setDir('sell')}
                style={{padding:'9px',border:'none',borderRadius:'7px',cursor:marketStatus==='closed'?'not-allowed':'pointer',fontWeight:700,fontSize:'12px',
                  background:marketStatus==='closed'?'#F4F7FD':dir==='sell'?'#DC2626':'#F4F7FD',
                  color:marketStatus==='closed'?'#D1D5DB':dir==='sell'?'#fff':'#5C7A9E',
                  opacity:marketStatus==='closed'?0.5:1}}>SELL</button>
            </div>
            <div style={{background:dir==='buy'?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)',border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`,borderRadius:'8px',padding:'8px',marginBottom:'8px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'2px'}}>{dir==='buy'?'Ask':'Bid'}</div>
              <div style={{...mono,fontSize:'22px',fontWeight:700,color:dir==='buy'?'#16A34A':'#DC2626'}}>{execPrice.toFixed(inst.dec)}</div>
              <div style={{fontSize:'8px',color:'#8FA3BF'}}>spread {inst.spread.toFixed(inst.dec)}</div>
            </div>
            <div style={{marginBottom:'7px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                <span style={{fontSize:'8px',color:'#8FA3BF',fontWeight:600,textTransform:'uppercase'}}>Lots</span>
                <span style={{fontSize:'8px',color:'#8FA3BF'}}>Max: <span style={{color:lotsNum>maxLots?'#DC2626':'#16A34A',fontWeight:600}}>{maxLots}</span></span>
              </div>
              <div style={{display:'flex',border:'1px solid #E8EEF8',borderRadius:'7px',overflow:'hidden'}}>
                <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 12px',background:'#F4F7FD',border:'none',borderRight:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'18px',lineHeight:1}}>−</button>
                <input value={lots} onChange={e=>setLots(e.target.value)} type="number" min="0.01" step="0.01"
                  style={{flex:1,padding:'7px',background:'#fff',border:'none',textAlign:'center',...mono,fontSize:'13px',fontWeight:600,color:lotsNum>maxLots?'#DC2626':'#1A3A6B',outline:'none'}}/>
                <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 12px',background:'#F4F7FD',border:'none',borderLeft:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'18px',lineHeight:1}}>+</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginBottom:'8px'}}>
              <div>
                <div style={{fontSize:'8px',color:'#DC2626',fontWeight:600,textTransform:'uppercase',marginBottom:'2px'}}>Stop Loss</div>
                <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number"
                  style={{width:'100%',padding:'5px 7px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'5px',fontSize:'10px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:'8px',color:'#16A34A',fontWeight:600,textTransform:'uppercase',marginBottom:'2px'}}>Take Profit</div>
                <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number"
                  style={{width:'100%',padding:'5px 7px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.2)',borderRadius:'5px',fontSize:'10px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{background:'#F4F7FD',borderRadius:'7px',padding:'8px',marginBottom:'8px'}}>
              <div style={{fontSize:'8px',color:'#8FA3BF',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'5px'}}>Leverage 1:{LEVERAGE}</div>
              {[['Notional',`$${(inst.lotUSD(execPrice)*lotsNum||0).toFixed(0)}`,'#5C7A9E'],['Req. Margin',`$${(reqMgn||0).toFixed(2)}`,lotsNum>maxLots?'#DC2626':'#1A3A6B'],['Free Margin',`$${(freeMgn||0).toFixed(2)}`,freeMgn>reqMgn?'#16A34A':'#DC2626']].map(([l,v,c])=>(
                <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',fontSize:'10px'}}>
                  <span style={{color:'#8FA3BF'}}>{l}</span>
                  <span style={{...mono,color:String(c),fontWeight:500}}>{v}</span>
                </div>
              ))}
              {lotsNum>maxLots && <div style={{marginTop:'4px',fontSize:'9px',color:'#DC2626',fontWeight:600}}>⚠ Max {maxLots} lots</div>}
            </div>
            {marketStatus === 'closed' ? (
              <div style={{width:'100%',padding:'10px',fontSize:'11px',fontWeight:700,border:'none',borderRadius:'7px',background:'#F4F7FD',color:'#9CA3AF',textAlign:'center'}}>
                🔒 Market Closed
              </div>
            ) : (
              <button onClick={placeOrder} disabled={placing||!primary||primary.status==='breached'||lotsNum>maxLots}
                style={{width:'100%',padding:'10px',fontSize:'12px',fontWeight:700,border:'none',borderRadius:'7px',cursor:lotsNum>maxLots?'not-allowed':'pointer',background:lotsNum>maxLots?'#9CA3AF':dir==='buy'?'#16A34A':'#DC2626',color:'#fff',opacity:placing||!primary?0.6:1,textTransform:'uppercase'}}>
                {placing?'…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
              </button>
            )}
          </div>
          <div style={{padding:'8px 10px',borderTop:'1px solid #E8EEF8',flexShrink:0}}>
            {[
                ['Account',(primary as any)?.account_number??'—','#1A3A6B'],
                ['Type', accountTypeLabel(primary?.phase??'phase1', (primary as any)?.challenge_products?.challenge_type), '#2255CC'],
                ['Status',primary?.status??'—',primary?.status==='active'?'#16A34A':'#DC2626']
              ].map(([l,v,c])=>(
              <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',fontSize:'9px'}}>
                <span style={{color:'#8FA3BF'}}>{l}</span>
                <span style={{...mono,color:String(c),fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{height:'175px',background:'#fff',borderTop:'1px solid #E8EEF8',flexShrink:0,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',borderBottom:'1px solid #E8EEF8',height:'32px',padding:'0 12px',flexShrink:0}}>
          {(['positions','history'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'0 12px',height:'32px',fontSize:'10px',fontWeight:600,border:'none',borderBottom:tab===t?'2px solid #2255CC':'2px solid transparent',background:'transparent',color:tab===t?'#2255CC':'#8FA3BF',cursor:'pointer',textTransform:'capitalize'}}>
              {t}{t==='positions'&&openTrades.length>0?` (${openTrades.length})`:''}</button>
          ))}
          <div style={{marginLeft:'auto',...mono,fontSize:'11px',fontWeight:600,color:openPnl>=0?'#16A34A':'#DC2626'}}>
            Float: {openPnl>=0?'+':''}${(openPnl||0).toFixed(2)}
          </div>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {tab==='positions' ? (
            openTrades.length===0
              ? <div style={{padding:'16px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>No open positions</div>
              : <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
                  <thead><tr>{['Symbol','Dir','Lots','Entry','Live','P&L','Pips','SL','TP','Margin','Actions'].map(h=>(
                    <th key={h} style={{padding:'3px 7px',fontSize:'8px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB',whiteSpace:'nowrap'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{openTrades.map(t=>{
                    const cur=refPrices.current[t.symbol]||SEED[t.symbol]
                    const pnl=calcPnl(t,cur)
                    const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                    const pipD=i?(t.direction==='buy'?cur-t.open_price:t.open_price-cur)/(i.pip??0.0001):0
                    const tMgn = calcMargin(t.symbol, cur, Number(t.lots)||0)
                    const isEdit=editSLTP?.id===t.id
                    return (
                      <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                        <td style={{padding:'4px 7px',fontWeight:600}}><button onClick={()=>setSym(t.symbol)} style={{background:'none',border:'none',cursor:'pointer',fontWeight:600,color:'#2255CC',fontSize:'10px',padding:0}}>{t.symbol}</button></td>
                        <td style={{padding:'4px 7px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                        <td style={{padding:'4px 7px',...mono}}>{t.lots}</td>
                        <td style={{padding:'4px 7px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                        <td style={{padding:'4px 7px',...mono,color:cur>=t.open_price?'#16A34A':'#DC2626'}}>{cur.toFixed(i?.dec??5)}</td>
                        <td style={{padding:'4px 7px',...mono,fontWeight:700,color:pnl>=0?'#16A34A':'#DC2626'}}>{pnl>=0?'+':''}${(pnl||0).toFixed(2)}</td>
                        <td style={{padding:'4px 7px',...mono,color:pipD>=0?'#16A34A':'#DC2626'}}>{pipD>=0?'+':''}{(pipD||0).toFixed(1)}</td>
                        <td style={{padding:'4px 7px'}}>
                          {isEdit
                            ? <input value={editSLTP.sl} onChange={e=>setEditSLTP((p:any)=>({...p,sl:e.target.value}))} type="number" style={{width:'65px',padding:'2px 4px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.3)',borderRadius:'4px',fontSize:'9px',...mono,outline:'none'}}/>
                            : <span style={{...mono,color:'#DC2626',fontSize:'9px',cursor:'pointer',textDecoration:'underline dotted'}} onClick={()=>setEditSLTP({id:t.id,sl:t.sl?String(t.sl):'',tp:t.tp?String(t.tp):''})}>{t.sl??'—'}</span>}
                        </td>
                        <td style={{padding:'4px 7px'}}>
                          {isEdit
                            ? <input value={editSLTP.tp} onChange={e=>setEditSLTP((p:any)=>({...p,tp:e.target.value}))} type="number" style={{width:'65px',padding:'2px 4px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.3)',borderRadius:'4px',fontSize:'9px',...mono,outline:'none'}}/>
                            : <span style={{...mono,color:'#16A34A',fontSize:'9px',cursor:'pointer',textDecoration:'underline dotted'}} onClick={()=>setEditSLTP({id:t.id,sl:t.sl?String(t.sl):'',tp:t.tp?String(t.tp):''})}>{t.tp??'—'}</span>}
                        </td>
                        <td style={{padding:'4px 7px',...mono,color:'#5C7A9E',fontSize:'9px'}}>${(tMgn||0).toFixed(2)}</td>
                        <td style={{padding:'4px 7px'}}>
                          <div style={{display:'flex',gap:'3px'}}>
                            {isEdit
                              ? <><button onClick={saveEditSLTP} style={{padding:'2px 7px',fontSize:'9px',fontWeight:600,background:'#EEF3FF',border:'1px solid rgba(34,85,204,.2)',borderRadius:'4px',cursor:'pointer',color:'#2255CC'}}>✓</button>
                                  <button onClick={()=>setEditSLTP(null)} style={{padding:'2px 7px',fontSize:'9px',fontWeight:600,background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'4px',cursor:'pointer',color:'#5C7A9E'}}>✕</button></>
                              : <><button onClick={()=>setEditSLTP({id:t.id,sl:t.sl?String(t.sl):'',tp:t.tp?String(t.tp):''})} style={{padding:'2px 7px',fontSize:'9px',fontWeight:600,background:'#EEF3FF',border:'1px solid rgba(34,85,204,.2)',borderRadius:'4px',cursor:'pointer',color:'#2255CC'}}>Edit</button>
                                  <button onClick={()=>closeTrade(t)} style={{padding:'2px 7px',fontSize:'9px',fontWeight:600,background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'4px',cursor:'pointer',color:'#DC2626'}}>Close</button></>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}</tbody>
                </table>
          ) : (
            closedTrades.length===0
              ? <div style={{padding:'16px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>No closed trades</div>
              : <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
                  <thead><tr>{['Symbol','Dir','Lots','Open','Close','P&L','Pips','Closed'].map(h=>(
                    <th key={h} style={{padding:'3px 7px',fontSize:'8px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB'}}>{h}</th>
                  ))}</tr></thead>
                  <tbody>{closedTrades.map(t=>{
                    const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                    return (
                      <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                        <td style={{padding:'4px 7px',fontWeight:600}}>{t.symbol}</td>
                        <td style={{padding:'4px 7px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                        <td style={{padding:'4px 7px',...mono}}>{t.lots}</td>
                        <td style={{padding:'4px 7px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                        <td style={{padding:'4px 7px',...mono,color:'#5C7A9E'}}>{(Number(t.close_price)||0).toFixed(i?.dec??5)}</td>
                        <td style={{padding:'4px 7px',...mono,fontWeight:700,color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>{(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}</td>
                        <td style={{padding:'4px 7px',...mono,color:(t.pips??0)>=0?'#16A34A':'#DC2626'}}>{(t.pips??0)>=0?'+':''}{(Number(t.pips)||0).toFixed(1)}</td>
                        <td style={{padding:'4px 7px',color:'#8FA3BF',fontSize:'9px'}}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
          )}
        </div>
      </div>

      {editSLTP && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setEditSLTP(null)}>
          <div style={{background:'#fff',borderRadius:'12px',padding:'20px',width:'280px',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'13px',fontWeight:700,color:'#1A3A6B',marginBottom:'14px'}}>Edit SL / TP</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
              <div>
                <div style={{fontSize:'9px',color:'#DC2626',fontWeight:700,textTransform:'uppercase',marginBottom:'3px'}}>Stop Loss</div>
                <input value={editSLTP.sl} onChange={e=>setEditSLTP((p:any)=>({...p,sl:e.target.value}))} placeholder="—" type="number"
                  style={{width:'100%',padding:'7px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.3)',borderRadius:'7px',fontSize:'12px',...mono,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:'9px',color:'#16A34A',fontWeight:700,textTransform:'uppercase',marginBottom:'3px'}}>Take Profit</div>
                <input value={editSLTP.tp} onChange={e=>setEditSLTP((p:any)=>({...p,tp:e.target.value}))} placeholder="—" type="number"
                  style={{width:'100%',padding:'7px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.3)',borderRadius:'7px',fontSize:'12px',...mono,outline:'none',boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'7px'}}>
              <button onClick={()=>setEditSLTP(null)} style={{flex:1,padding:'8px',background:'#F4F7FD',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'11px',fontWeight:600,color:'#5C7A9E'}}>Cancel</button>
              <button onClick={saveEditSLTP} style={{flex:2,padding:'8px',background:'#2255CC',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#fff'}}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
      {/* Mobile bottom tabs for platform */}
      {isMobile && (
        <div style={{display:'flex',background:'#1A3A6B',borderTop:'1px solid rgba(255,255,255,.1)',flexShrink:0}}>
          {([['chart','📈','Chart'],['trade','🎯','Trade'],['positions','📋','Positions']] as const).map(([id,icon,label])=>(
            <button key={id} onClick={()=>setMobilePanel(id)}
              style={{flex:1,padding:'10px 4px',background:mobilePanel===id?'rgba(255,255,255,.15)':'transparent',
                border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',
                borderTop:mobilePanel===id?'2px solid #60A5FA':'2px solid transparent',color:'#fff'}}>
              <span style={{fontSize:'16px'}}>{icon}</span>
              <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.5px'}}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

