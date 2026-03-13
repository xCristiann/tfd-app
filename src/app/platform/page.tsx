import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ── Instruments ─────────────────────────────────────────────────────────────── */
const INSTRUMENTS = [
  { sym:'EUR/USD', binance:null,      fh:'OANDA:EUR_USD',    spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE  },
  { sym:'GBP/USD', binance:null,      fh:'OANDA:GBP_USD',    spread:0.00020, dec:5, pip:0.0001, lotUSD:(p:number)=>p*LOT_SIZE  },
  { sym:'XAU/USD', binance:null,      fh:'OANDA:XAU_USD',    spread:0.30,    dec:2, pip:0.10,   lotUSD:(p:number)=>p*100        },
  { sym:'NAS100',  binance:null,      fh:'OANDA:NAS100_USD', spread:1.0,     dec:1, pip:1.0,    lotUSD:(p:number)=>p*10         },
  { sym:'BTC/USD', binance:'BTCUSDT', fh:null,               spread:10.0,    dec:1, pip:1.0,    lotUSD:(p:number)=>p            },
  { sym:'USD/JPY', binance:null,      fh:'OANDA:USD_JPY',    spread:0.020,   dec:3, pip:0.01,   lotUSD:(_:number)=>LOT_SIZE     },
  { sym:'ETH/USD', binance:'ETHUSDT', fh:null,               spread:1.0,     dec:2, pip:1.0,    lotUSD:(p:number)=>p            },
]
type Inst = typeof INSTRUMENTS[0]

const SEED: Record<string,number> = {
  'EUR/USD':1.1464,'GBP/USD':1.2940,'XAU/USD':2980.0,
  'NAS100':19200.0,'BTC/USD':83000.0,'USD/JPY':148.50,'ETH/USD':1900.0,
}

const TF_BINS: Record<string,{bin:string;sec:number}> = {
  M1:{bin:'1m',sec:60}, M5:{bin:'5m',sec:300}, M15:{bin:'15m',sec:900},
  M30:{bin:'30m',sec:1800}, H1:{bin:'1h',sec:3600}, H4:{bin:'4h',sec:14400}, D1:{bin:'1d',sec:86400},
}

/* ── Lightweight Charts loader ───────────────────────────────────────────────── */
let lwcReady = false
let lwcCallbacks: (()=>void)[] = []
function loadLWC(): Promise<void> {
  return new Promise(resolve => {
    if (lwcReady) { resolve(); return }
    lwcCallbacks.push(resolve)
    if (document.getElementById('lwc-script')) return
    const s = document.createElement('script')
    s.id  = 'lwc-script'
    s.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'
    s.onload = () => { lwcReady = true; lwcCallbacks.forEach(cb => cb()); lwcCallbacks = [] }
    document.head.appendChild(s)
  })
}

/* ── Candle chart component ──────────────────────────────────────────────────── */
function CandleChart({ sym, tf, livePrice }: { sym:string; tf:string; livePrice:number }) {
  const divRef    = useRef<HTMLDivElement>(null)
  const chartRef  = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const lastRef   = useRef<{time:number;open:number;high:number;low:number;close:number}|null>(null)

  /* build chart + fetch history */
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    let dead = false

    loadLWC().then(async () => {
      if (dead) return
      if (chartRef.current) { try { chartRef.current.remove() } catch {} }

      const LWC   = (window as any).LightweightCharts
      const chart = LWC.createChart(el, {
        width:el.clientWidth, height:el.clientHeight,
        layout:{ background:{type:'solid',color:'#0A0A0F'}, textColor:'rgba(200,190,240,0.55)' },
        grid:{ vertLines:{color:'rgba(212,168,67,0.05)'}, horzLines:{color:'rgba(212,168,67,0.05)'} },
        crosshair:{ mode:1 },
        rightPriceScale:{ borderColor:'rgba(212,168,67,0.15)' },
        timeScale:{ borderColor:'rgba(212,168,67,0.15)', timeVisible:true, secondsVisible:false },
      })
      const series = chart.addCandlestickSeries({
        upColor:'#00D97E', downColor:'#FF3352',
        borderUpColor:'#00D97E', borderDownColor:'#FF3352',
        wickUpColor:'#00D97E', wickDownColor:'#FF3352',
      })
      chartRef.current  = chart
      seriesRef.current = series

      const ro = new ResizeObserver(() => chart.resize(el.clientWidth, el.clientHeight))
      ro.observe(el)

      /* fetch candles */
      const inst = INSTRUMENTS.find(i=>i.sym===sym)!
      const tfInfo = TF_BINS[tf]
      let candles: any[] = []

      if (inst.binance) {
        try {
          const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${inst.binance}&interval=${tfInfo.bin}&limit=300`)
          const d = await r.json()
          candles = d.map((k:any) => ({
            time:Math.floor(k[0]/1000), open:+k[1], high:+k[2], low:+k[3], close:+k[4],
          }))
        } catch {}
      } else {
        /* Finnhub candles for forex/gold */
        const FINNHUB_KEY = 'd0lbgopr01ql4s0b4cu0d0lbgopr01ql4s0b4cug'
        try {
          const now  = Math.floor(Date.now()/1000)
          const from = now - tfInfo.sec * 300
          const res  = TF_BINS[tf].bin.replace('m','').replace('h','60').replace('d','D')
          const r = await fetch(`https://finnhub.io/api/v1/forex/candle?symbol=${inst.fh}&resolution=${res}&from=${from}&to=${now}&token=${FINNHUB_KEY}`)
          const d = await r.json()
          if (d.t && d.s !== 'no_data') {
            candles = d.t.map((t:number, i:number) => ({
              time:t, open:d.o[i], high:d.h[i], low:d.l[i], close:d.c[i],
            }))
          }
        } catch {}
      }

      if (dead) { ro.disconnect(); return }

      if (candles.length) {
        series.setData(candles)
        lastRef.current = candles[candles.length - 1]
        chart.timeScale().fitContent()
      }

      return () => ro.disconnect()
    })

    return () => { dead = true }
  }, [sym, tf])

  /* update last candle on every price tick */
  useEffect(() => {
    if (!seriesRef.current || livePrice <= 0) return
    const tfInfo = TF_BINS[tf]
    const now    = Math.floor(Date.now()/1000)
    const cTime  = Math.floor(now / tfInfo.sec) * tfInfo.sec
    const prev   = lastRef.current

    if (!prev) {
      const c = { time:cTime, open:livePrice, high:livePrice, low:livePrice, close:livePrice }
      lastRef.current = c
      seriesRef.current.update(c)
      return
    }

    if (cTime > prev.time) {
      /* new candle */
      const c = { time:cTime, open:livePrice, high:livePrice, low:livePrice, close:livePrice }
      lastRef.current = c
      seriesRef.current.update(c)
    } else {
      /* update current */
      const c = { time:prev.time, open:prev.open, high:Math.max(prev.high,livePrice), low:Math.min(prev.low,livePrice), close:livePrice }
      lastRef.current = c
      seriesRef.current.update(c)
    }
  }, [livePrice, tf])

  return <div ref={divRef} style={{ width:'100%', height:'100%' }} />
}

/* ── Price feed hook — KEY FIX: prices stored BOTH in ref AND in state ───────── */
/*    ref → used in chart/PnL calcs without stale closures                        */
/*    state → triggers React re-render so positions table + equity update          */
function usePriceFeed() {
  const refPrices  = useRef<Record<string,number>>({ ...SEED })
  const refPrev    = useRef<Record<string,number>>({ ...SEED })
  /* ← This is the KEY: prices also in STATE so components actually re-render */
  const [prices, setPrices] = useState<Record<string,number>>({ ...SEED })

  const push = useCallback((sym: string, p: number) => {
    if (!p || isNaN(p) || p <= 0) return
    const cur = refPrices.current[sym]
    if (cur === p) return                       // skip no-change
    refPrev.current[sym]  = cur || p
    refPrices.current[sym] = p
    /* update state — this re-renders the whole platform with fresh prices */
    setPrices(prev => ({ ...prev, [sym]: p }))
  }, [])

  useEffect(() => {
    let dead = false
    let bWs: WebSocket, fWs: WebSocket
    let bTimer: ReturnType<typeof setTimeout>
    let fTimer: ReturnType<typeof setTimeout>

    /* Binance — BTC + ETH real-time trades */
    const bnInsts = INSTRUMENTS.filter(i => i.binance)
    const streams = bnInsts.map(i => `${i.binance!.toLowerCase()}@aggTrade`).join('/')

    const connectBinance = () => {
      if (dead) return
      bWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
      bWs.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          const d   = msg.data
          if (!d?.s || !d?.p) return
          const inst = bnInsts.find(i => d.s === i.binance)
          if (inst) push(inst.sym, parseFloat(d.p))
        } catch {}
      }
      bWs.onclose = () => { if (!dead) bTimer = setTimeout(connectBinance, 2000) }
      bWs.onerror = () => { try { bWs.close() } catch {} }
    }

    /* Finnhub — forex + gold + NAS100 */
    const FINNHUB_KEY = 'd0lbgopr01ql4s0b4cu0d0lbgopr01ql4s0b4cug'
    const fhInsts = INSTRUMENTS.filter(i => i.fh)
    const fhMap   = Object.fromEntries(fhInsts.map(i => [i.fh!, i.sym]))

    const connectFinnhub = () => {
      if (dead) return
      fWs = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`)
      fWs.onopen = () => {
        fhInsts.forEach(i => fWs.send(JSON.stringify({ type:'subscribe', symbol:i.fh })))
      }
      fWs.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          if (msg.type !== 'trade' || !msg.data) return
          msg.data.forEach((t: any) => {
            const sym = fhMap[t.s]
            if (sym && t.p > 0) push(sym, t.p)
          })
        } catch {}
      }
      fWs.onclose = () => { if (!dead) fTimer = setTimeout(connectFinnhub, 3000) }
      fWs.onerror = () => { try { fWs.close() } catch {} }
    }

    /* REST fallback — Frankfurter for EUR/USD GBP/USD USD/JPY every 5s */
    const pollForex = async () => {
      if (dead) return
      try {
        const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY')
        const d = await r.json()
        if (d.rates?.EUR) push('EUR/USD', +(1/d.rates.EUR).toFixed(5))
        if (d.rates?.GBP) push('GBP/USD', +(1/d.rates.GBP).toFixed(5))
        if (d.rates?.JPY) push('USD/JPY', +d.rates.JPY.toFixed(3))
      } catch {}
    }

    /* REST fallback — gold via Binance PAXGUSD every 5s */
    const pollGold = async () => {
      if (dead) return
      try {
        const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSD')
        const d = await r.json()
        if (d.price) push('XAU/USD', parseFloat(d.price))
      } catch {}
    }

    connectBinance()
    connectFinnhub()
    pollForex()
    pollGold()
    const interval = setInterval(() => { pollForex(); pollGold() }, 5000)

    return () => {
      dead = true
      clearTimeout(bTimer); clearTimeout(fTimer)
      clearInterval(interval)
      try { bWs?.close() } catch {}
      try { fWs?.close() } catch {}
    }
  }, [push])

  return { prices, refPrev }
}

/* ── P&L helpers ─────────────────────────────────────────────────────────────── */
function tradePnl(t: any, prices: Record<string,number>): number {
  const inst  = INSTRUMENTS.find(i => i.sym === t.symbol)
  const cur   = prices[t.symbol] || SEED[t.symbol] || t.open_price
  const diff  = t.direction === 'buy' ? cur - t.open_price : t.open_price - cur
  const units = t.symbol === 'USD/JPY' ? LOT_SIZE / cur : (inst?.lotUSD(1) ?? LOT_SIZE)
  return diff * units * t.lots
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

  /* prices is in STATE → every price update triggers re-render → P&L / equity live */
  const { prices, refPrev } = usePriceFeed()

  const inst      = INSTRUMENTS.find(i => i.sym === sym)!
  const livePrice = prices[sym] || SEED[sym]
  const prevPrice = refPrev.current[sym] || livePrice
  const up        = livePrice >= prevPrice
  const execPrice = +(dir === 'buy' ? livePrice + inst.spread : livePrice).toFixed(inst.dec)
  const lotsNum   = Math.max(0.01, parseFloat(lots) || 0.01)

  /* ── Live financials ── */
  const balance    = primary?.balance ?? 0
  const openPnl    = openTrades.reduce((s, t) => s + tradePnl(t, prices), 0)
  const equity     = balance + openPnl
  const usedMargin = openTrades.reduce((s, t) => {
    const cur  = prices[t.symbol] || SEED[t.symbol]
    const inst = INSTRUMENTS.find(i => i.sym === t.symbol)
    return s + (inst?.lotUSD(cur) ?? LOT_SIZE) * t.lots / LEVERAGE
  }, 0)
  const freeMargin  = equity - usedMargin
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity
  const reqMargin   = inst.lotUSD(execPrice) * lotsNum / LEVERAGE
  const maxLots     = Math.max(0, Math.floor(freeMargin * LEVERAGE / inst.lotUSD(execPrice) * 100) / 100)

  /* ── Load trades ── */
  useEffect(() => {
    if (!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open')
      .order('opened_at',{ascending:false}).then(({data}) => setOpenTrades(data ?? []))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed')
      .order('closed_at',{ascending:false}).limit(50).then(({data}) => setClosedTrades(data ?? []))
  }, [primary?.id])

  /* ── Place order ── */
  async function placeOrder() {
    if (!primary) { toast('error','❌','No Account','No active account.'); return }
    if ((primary as any).payout_locked || primary.status === 'suspended') {
      toast('error','⛔','Locked','Payout pending — trading suspended.'); return
    }
    if (reqMargin > freeMargin) {
      toast('error','⛔','Margin','Insufficient free margin.'); return
    }
    setPlacing(true); setConfirmOpen(false)
    const { data, error } = await supabase.from('trades').insert({
      account_id:primary.id, user_id:primary.user_id,
      symbol:sym, direction:dir, lots:lotsNum,
      order_type:orderType.toLowerCase(), open_price:execPrice,
      sl:sl ? +sl : null, tp:tp ? +tp : null,
      status:'open', opened_at:new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error',error.message); return }
    setOpenTrades(t => [data,...t])
    toast('success','⚡','Placed',`${dir.toUpperCase()} ${lotsNum} ${sym} @ ${execPrice}`)
    setSl(''); setTp('')
  }

  /* ── Close trade ── */
  async function closeTrade(trade: any) {
    const ti       = INSTRUMENTS.find(i => i.sym === trade.symbol)!
    const cur      = prices[trade.symbol] || SEED[trade.symbol]
    const closeP   = +(trade.direction==='buy' ? cur : cur + ti.spread).toFixed(ti.dec)
    const diff     = trade.direction==='buy' ? closeP - trade.open_price : trade.open_price - closeP
    const units    = trade.symbol==='USD/JPY' ? LOT_SIZE/closeP : ti.lotUSD(1)
    const netPnl   = +(diff * units * trade.lots).toFixed(2)
    const pips     = +(diff / ti.pip).toFixed(1)

    const { error } = await supabase.from('trades').update({
      status:'closed', close_price:closeP, closed_at:new Date().toISOString(),
      pips, net_pnl:netPnl, gross_pnl:netPnl,
    }).eq('id',trade.id)
    if (error) { toast('error','❌','Error',error.message); return }

    const newBal = +(balance + netPnl).toFixed(2)
    await supabase.from('accounts').update({ balance:newBal, equity:newBal }).eq('id',primary!.id)
    setOpenTrades(t => t.filter(x => x.id !== trade.id))
    setClosedTrades(t => [{ ...trade, status:'closed', close_price:closeP, net_pnl:netPnl, pips },...t])
    toast(netPnl>=0?'success':'warning', netPnl>=0?'💰':'🔴','Closed',
      `${trade.symbol} ${netPnl>=0?'+':''}${fmt(netPnl)}`)
  }

  /* ── Styles shorthand ── */
  const S = { /* reused inline style fragments */ }

  return (
    <>
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#0A0A0F', color:'var(--text)', fontSize:12 }}>

      {/* ── Watchlist ── */}
      <div style={{ width:155, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--bdr)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:20, height:20, border:'1px solid var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--gold)' }}>✦</div>
          <span style={{ fontFamily:'serif', fontSize:11, fontWeight:'bold', lineHeight:1.3 }}>TFD<br/>Terminal</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {INSTRUMENTS.map(i => {
            const cur  = prices[i.sym] || SEED[i.sym]
            const prv  = refPrev.current[i.sym] || cur
            const isUp = cur >= prv
            const live = prices[i.sym] > 0
            return (
              <div key={i.sym} onClick={() => setSym(i.sym)} style={{
                padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid rgba(212,168,67,.04)',
                background:sym===i.sym?'rgba(212,168,67,.07)':'transparent',
                borderLeft:sym===i.sym?'2px solid var(--gold)':'2px solid transparent',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:600, fontSize:11 }}>{i.sym}</span>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:live?'var(--green)':'#444' }}/>
                </div>
                <div style={{ fontFamily:'monospace', fontSize:12, marginTop:2, color:isUp?'var(--green)':'var(--red)', fontWeight:700 }}>
                  {cur.toFixed(i.dec)}
                </div>
                <div style={{ fontSize:8, color:isUp?'var(--green)':'var(--red)' }}>
                  {isUp?'▲':'▼'} {Math.abs(cur-prv).toFixed(i.dec)}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid var(--bdr)' }}>
          {accounts.length > 1
            ? <select value={selAccId??primary?.id??''} onChange={e=>setSelAccId(e.target.value)}
                style={{ width:'100%', padding:'5px 6px', background:'var(--bg3)', border:'1px solid var(--dim)', color:'var(--text)', fontSize:9, fontFamily:'monospace', outline:'none', marginBottom:8 }}>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.account_number}</option>)}
              </select>
            : <div style={{ marginBottom:8, padding:'5px 6px', background:'var(--bg3)', border:'1px solid var(--dim)', fontSize:9, fontFamily:'monospace', color:'var(--gold)', textAlign:'center' as const }}>
                {primary?.account_number??'—'}
              </div>
          }
          <button onClick={()=>navigate('/dashboard')} style={{ width:'100%', fontSize:9, letterSpacing:1, textTransform:'uppercase' as const, color:'var(--text3)', background:'none', border:'none', cursor:'pointer' }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Topbar */}
        <div style={{ height:50, background:'var(--bg2)', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', padding:'0 14px', gap:10, flexShrink:0 }}>
          <span style={{ fontFamily:'serif', fontSize:16, fontWeight:'bold', flexShrink:0 }}>{sym}</span>
          <span style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, color:up?'var(--green)':'var(--red)', flexShrink:0, minWidth:100, letterSpacing:-0.5 }}>
            {livePrice.toFixed(inst.dec)}
          </span>
          <span style={{ fontSize:10, color:up?'var(--green)':'var(--red)', flexShrink:0 }}>
            {up?'▲':'▼'} {Math.abs(livePrice-prevPrice).toFixed(inst.dec)}
          </span>

          {/* Financial bar — updates on every price tick because prices is in state */}
          <div style={{ display:'flex', gap:14, padding:'4px 14px', background:'rgba(0,0,0,.4)', border:'1px solid rgba(212,168,67,.1)', marginLeft:6, flexShrink:0 }}>
            {[
              { l:'BALANCE',    v:fmt(balance),                              c:'var(--gold)' },
              { l:'EQUITY',     v:fmt(equity),                               c:equity>=balance?'var(--green)':'var(--red)' },
              { l:'P&L',        v:`${openPnl>=0?'+':''}${fmt(openPnl)}`,     c:openPnl>=0?'var(--green)':'var(--red)' },
              { l:'FREE MARGIN',v:fmt(freeMargin),                            c:freeMargin<0?'var(--red)':'var(--text2)' },
              ...(usedMargin>0?[{ l:'MARGIN', v:`${marginLevel.toFixed(0)}%`, c:marginLevel<150?'var(--red)':'var(--text2)' }]:[]),
            ].map(({l,v,c})=>(
              <div key={l} style={{ flexShrink:0 }}>
                <div style={{ fontSize:7, letterSpacing:1.5, color:'var(--text3)', fontWeight:600, textTransform:'uppercase' as const }}>{l}</div>
                <div style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:c, marginTop:1 }}>{v}</div>
              </div>
            ))}
          </div>

          {(primary as any)?.payout_locked && (
            <div style={{ padding:'4px 10px', background:'rgba(212,168,67,.1)', border:'1px solid var(--bdr2)', fontSize:9, color:'var(--gold)', letterSpacing:1, fontWeight:600, textTransform:'uppercase' as const }}>
              ⏳ Payout Pending — Locked
            </div>
          )}

          {/* TF buttons */}
          <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
            {Object.keys(TF_BINS).map(t=>(
              <button key={t} onClick={()=>setTf(t)} style={{
                padding:'3px 7px', fontSize:9, fontFamily:'monospace', fontWeight:'bold', cursor:'pointer',
                background:tf===t?'rgba(212,168,67,.15)':'transparent',
                border:tf===t?'1px solid var(--bdr2)':'1px solid transparent',
                color:tf===t?'var(--gold)':'var(--text3)',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)', animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:9, color:'var(--green)', letterSpacing:1.5, textTransform:'uppercase' as const, fontWeight:600 }}>Live</span>
          </div>
        </div>

        {/* Chart — key on sym+tf forces remount = refetch candles */}
        <div style={{ flex:1, overflow:'hidden' }}>
          <CandleChart key={`${sym}_${tf}`} sym={sym} tf={tf} livePrice={livePrice} />
        </div>

        {/* Bottom panel */}
        <div style={{ height:215, background:'var(--bg2)', borderTop:'1px solid var(--bdr)', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--bdr)' }}>
            {[['positions',`Positions (${openTrades.length})`],['history',`History (${closedTrades.length})`],['account','Account']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{
                padding:'7px 14px', fontSize:9, letterSpacing:1, textTransform:'uppercase' as const,
                fontWeight:600, cursor:'pointer', border:'none', marginBottom:-1,
                borderBottom:tab===k?'2px solid var(--gold)':'2px solid transparent',
                background:tab===k?'rgba(212,168,67,.04)':'transparent',
                color:tab===k?'var(--gold)':'var(--text3)',
              }}>{l}</button>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>

            {/* ── POSITIONS — P&L and Current re-render on every price update ── */}
            {tab==='positions' && (
              openTrades.length===0
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:11 }}>No open positions</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead><tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Symbol','Dir','Lots','Open','Current','P&L','SL','TP','Time',''].map(h=>(
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', textAlign:'left' as const, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {openTrades.map(t => {
                        /* prices is from STATE → these values update live */
                        const cur  = prices[t.symbol] || SEED[t.symbol]
                        const ti   = INSTRUMENTS.find(i=>i.sym===t.symbol)!
                        const pnl  = tradePnl(t, prices)
                        return (
                          <tr key={t.id} style={{ borderBottom:'1px solid rgba(212,168,67,.04)' }}>
                            <td style={{ padding:'6px 10px', fontWeight:700 }}>{t.symbol}</td>
                            <td style={{ padding:'6px 10px' }}><span style={{ fontSize:8, fontWeight:'bold', letterSpacing:1, color:t.direction==='buy'?'var(--green)':'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.lots}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--text2)' }}>{t.open_price}</td>
                            {/* current price — updates every tick */}
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:600, color:cur>=t.open_price?'var(--green)':'var(--red)' }}>
                              {cur.toFixed(ti.dec)}
                            </td>
                            {/* P&L — updates every tick because prices is in state */}
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:700, fontSize:11, color:pnl>=0?'var(--green)':'var(--red)' }}>
                              {pnl>=0?'+':''}{fmt(pnl)}
                            </td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--red)', fontSize:9 }}>{t.sl??'—'}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--green)', fontSize:9 }}>{t.tp??'—'}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:9, color:'var(--text3)' }}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                            <td style={{ padding:'6px 10px' }}>
                              <button onClick={()=>closeTrade(t)} style={{ padding:'3px 10px', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'rgba(255,51,82,.1)', color:'var(--red)', border:'1px solid rgba(255,51,82,.25)' }}>✕ Close</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
            )}

            {tab==='history' && (
              closedTrades.length===0
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:11 }}>No history yet</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead><tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Symbol','Dir','Lots','Open','Close','Pips','P&L','Date'].map(h=>(
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', textAlign:'left' as const, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {closedTrades.map(t=>(
                        <tr key={t.id} style={{ borderBottom:'1px solid rgba(212,168,67,.04)' }}>
                          <td style={{ padding:'6px 10px', fontWeight:700 }}>{t.symbol}</td>
                          <td style={{ padding:'6px 10px' }}><span style={{ fontSize:8, fontWeight:'bold', color:t.direction==='buy'?'var(--green)':'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.lots}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.open_price}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.close_price??'—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', color:(t.pips??0)>=0?'var(--green)':'var(--red)' }}>{t.pips!=null?`${t.pips>0?'+':''}${t.pips}`:'—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:700, color:(t.net_pnl??0)>=0?'var(--green)':'var(--red)' }}>{t.net_pnl!=null?`${t.net_pnl>=0?'+':''}${fmt(t.net_pnl)}`:'—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:9, color:'var(--text3)' }}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            )}

            {tab==='account' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, padding:16 }}>
                {([
                  ['Balance',    fmt(balance),                              'var(--gold)'],
                  ['Equity',     fmt(equity),                               equity>=balance?'var(--green)':'var(--red)'],
                  ['Open P&L',   `${openPnl>=0?'+':''}${fmt(openPnl)}`,    openPnl>=0?'var(--green)':'var(--red)'],
                  ['Free Margin',fmt(freeMargin),                            freeMargin<0?'var(--red)':'var(--text)'],
                  ['Used Margin',fmt(usedMargin),                            'var(--text)'],
                  ['Margin Lvl', usedMargin>0?`${marginLevel.toFixed(0)}%`:'∞', marginLevel<150&&usedMargin>0?'var(--red)':'var(--green)'],
                  ['Leverage',   `1:${LEVERAGE}`,                            'var(--text2)'],
                  ['Open Pos.',  String(openTrades.length),                  'var(--text)'],
                  ['Account',    primary?.account_number??'—',               'var(--gold)'],
                  ['Phase',      primary?.phase??'—',                        'var(--text2)'],
                ] as [string,string,string][]).map(([l,v,c])=>(
                  <div key={l}>
                    <div style={{ fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
                    <div style={{ fontFamily:'monospace', fontSize:12, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Order Panel ── */}
      <div style={{ width:210, flexShrink:0, background:'var(--bg2)', borderLeft:'1px solid var(--bdr)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--bdr)' }}>
          <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Order Panel</div>
          <div style={{ display:'flex' }}>
            <button onClick={()=>setDir('buy')} style={{ flex:1, padding:'9px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', border:'none', background:dir==='buy'?'var(--green)':'rgba(0,217,126,.08)', color:dir==='buy'?'#000':'var(--green)' }}>Buy</button>
            <button onClick={()=>setDir('sell')} style={{ flex:1, padding:'9px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', border:'none', background:dir==='sell'?'var(--red)':'rgba(255,51,82,.08)', color:dir==='sell'?'#fff':'var(--red)' }}>Sell</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ textAlign:'center' as const, padding:'10px 8px', border:`1px solid ${up?'rgba(0,217,126,.25)':'rgba(255,51,82,.25)'}`, background:'var(--bg3)' }}>
            <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:3 }}>{dir==='buy'?'Ask':'Bid'}</div>
            <div style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, color:up?'var(--green)':'var(--red)', letterSpacing:-1 }}>
              {execPrice.toFixed(inst.dec)}
            </div>
            <div style={{ fontSize:8, color:'var(--text3)', marginTop:3 }}>spread {inst.spread.toFixed(inst.dec)}</div>
          </div>
          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Order Type</div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              {['Market','Limit','Stop'].map(t=>(
                <button key={t} onClick={()=>setOrderType(t)} style={{ flex:1, padding:'6px 0', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', border:'none', background:orderType===t?'rgba(212,168,67,.12)':'transparent', color:orderType===t?'var(--gold)':'var(--text3)' }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Lot Size <span style={{ fontWeight:400 }}>(max {maxLots})</span></div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{ padding:'0 10px', background:'transparent', border:'none', borderRight:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:16 }}>−</button>
              <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01" style={{ flex:1, textAlign:'center' as const, padding:'8px 0', background:'transparent', border:'none', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:13 }}/>
              <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{ padding:'0 10px', background:'transparent', border:'none', borderLeft:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:16 }}>+</button>
            </div>
          </div>
          {(['Stop Loss','Take Profit'] as const).map((l,i)=>{
            const val  = i===0?sl:tp
            const setV = i===0?setSl:setTp
            return (
              <div key={l}>
                <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
                <input value={val} onChange={e=>setV(e.target.value)} placeholder="Optional" type="number"
                  style={{ width:'100%', padding:'8px', background:'var(--bg3)', border:'1px solid var(--dim)', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:12, boxSizing:'border-box' as const }}/>
              </div>
            )
          })}
          <div style={{ background:'var(--bg3)', border:'1px solid var(--dim)', padding:'8px 10px' }}>
            {([
              ['Req. Margin',`$${reqMargin.toFixed(2)}`,reqMargin>freeMargin?'var(--red)':'var(--text)'],
              ['Free Margin',`$${freeMargin.toFixed(2)}`,freeMargin<reqMargin?'var(--red)':'var(--green)'],
              ['Leverage',   `1:${LEVERAGE}`,            'var(--text3)'],
            ] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:8, color:'var(--text3)' }}>{l}</span>
                <span style={{ fontSize:9, fontFamily:'monospace', fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setConfirmOpen(true)} disabled={placing||!primary||reqMargin>freeMargin} style={{
            width:'100%', padding:'12px 0', fontSize:11, letterSpacing:2, textTransform:'uppercase' as const,
            fontWeight:'bold', cursor:placing||!primary||reqMargin>freeMargin?'not-allowed':'pointer',
            border:'none', opacity:placing||!primary||reqMargin>freeMargin?0.35:1,
            background:dir==='buy'?'var(--green)':'var(--red)', color:dir==='buy'?'#000':'#fff',
          }}>
            {placing?'Placing…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
          </button>
        </div>
      </div>
    </div>

    {/* Confirm modal */}
    {confirmOpen && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(4px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--bdr2)', padding:24, minWidth:300 }}>
          <div style={{ fontFamily:'serif', fontSize:19, fontWeight:'bold', marginBottom:4 }}>Confirm Order</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:16 }}>Review before executing</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
            {([['Symbol',sym],['Direction',dir.toUpperCase()],['Type',orderType],['Lots',String(lotsNum)],['Price',String(execPrice)],['Margin',`$${reqMargin.toFixed(2)}`],['Account',primary?.account_number??'—']] as [string,string][]).map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                <span style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600 }}>{l}</span>
                <span style={{ fontFamily:'monospace', fontSize:12, color:v==='BUY'?'var(--green)':v==='SELL'?'var(--red)':'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={()=>setConfirmOpen(false)} style={{ padding:'8px 18px', background:'transparent', border:'1px solid var(--bdr2)', color:'var(--text2)', fontSize:9, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer' }}>Cancel</button>
            <button onClick={placeOrder} style={{ padding:'8px 22px', border:'none', fontSize:9, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:dir==='buy'?'var(--green)':'var(--red)', color:dir==='buy'?'#000':'#fff' }}>
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
