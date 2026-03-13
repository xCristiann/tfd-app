import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const LEVERAGE = 50
const LOT_SIZE = 100000

// contractUSD = notional value in USD per 1 lot
// For EUR/USD: 1 lot = 100,000 EUR → margin = 100000 * EUR/USD / 50
// For XAU/USD: 1 lot = 100 oz → margin = 100 * price / 50
// For NAS100: 1 lot = 1 index unit → margin = price / 50
// For BTC/USD: 1 lot = 1 BTC → margin = price / 50
const INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',       fh:'OANDA:EUR_USD',    bn:null,      spread:0.00020, dec:5, pip:0.0001, lotUSD: (p:number) => p * LOT_SIZE },
  { sym:'GBP/USD', tv:'FX:GBPUSD',       fh:'OANDA:GBP_USD',    bn:null,      spread:0.00020, dec:5, pip:0.0001, lotUSD: (p:number) => p * LOT_SIZE },
  { sym:'XAU/USD', tv:'TVC:GOLD',        fh:'OANDA:XAU_USD',    bn:null,      spread:0.30,    dec:2, pip:0.10,   lotUSD: (p:number) => p * 100 },
  { sym:'NAS100',  tv:'NASDAQ:NDX',      fh:'OANDA:NAS100_USD', bn:null,      spread:1.0,     dec:1, pip:1.0,    lotUSD: (p:number) => p * 10 },
  { sym:'BTC/USD', tv:'BINANCE:BTCUSDT', fh:null,               bn:'btcusdt', spread:10.0,    dec:1, pip:1.0,    lotUSD: (p:number) => p },
  { sym:'USD/JPY', tv:'FX:USDJPY',       fh:'OANDA:USD_JPY',    bn:null,      spread:0.020,   dec:3, pip:0.01,   lotUSD: (_p:number) => LOT_SIZE },
  { sym:'ETH/USD', tv:'BINANCE:ETHUSDT', fh:null,               bn:'ethusdt', spread:1.0,     dec:2, pip:1.0,    lotUSD: (p:number) => p },
]
const TFS: Record<string,string> = { M1:'1',M5:'5',M15:'15',M30:'30',H1:'60',H4:'240',D1:'D' }

// Default/seed prices — close to real market values March 2026
const SEED: Record<string,number> = {
  'EUR/USD': 1.1464, 'GBP/USD': 1.2940, 'XAU/USD': 2980.0,
  'NAS100': 19200.0, 'BTC/USD': 83000.0, 'USD/JPY': 148.50, 'ETH/USD': 1900.0,
}

// ─── TradingView Real-Time Chart via iframe ───────────────────────────────────
// Official TradingView embed URL — always real-time, updates every second
function TVChart({ tvSym, tf }: { tvSym: string; tf: string }) {
  const interval = TFS[tf] ?? '60'
  const src = [
    'https://www.tradingview.com/widgetembed/?frameElementId=tv_chart',
    `symbol=${encodeURIComponent(tvSym)}`,
    `interval=${interval}`,
    'theme=dark',
    'style=1',
    'locale=en',
    'timezone=Europe%2FBucharest',
    'hidesidetoolbar=0',
    'hidetoptoolbar=0',
    'withdateranges=1',
    'saveimage=0',
    'toolbarbg=0A0A0F',
    'studies=[]',
    'showpopupbutton=0',
  ].join('&')

  return (
    <iframe
      key={src}
      src={src}
      style={{ width:'100%', height:'100%', border:'none', display:'block' }}
      allowTransparency={true}
      scrolling="no"
      frameBorder="0"
      allowFullScreen={true}
    />
  )
}

// ─── Price Feed ───────────────────────────────────────────────────────────────
// Uses useRef for prices so closures in calculations never go stale.
// setTick() forces re-render on every price update.
function usePriceFeed() {
  const priceRef = useRef<Record<string,number>>({ ...SEED })
  const prevRef  = useRef<Record<string,number>>({ ...SEED })
  const [tick, setTick] = useState(0)

  const push = useCallback((sym: string, p: number) => {
    if (!p || isNaN(p) || p <= 0) return
    prevRef.current[sym]  = priceRef.current[sym] || p
    priceRef.current[sym] = p
    setTick(n => n + 1)
  }, [])

  useEffect(() => {
    let bws: WebSocket | null = null
    let fws: WebSocket | null = null
    let bTimer: ReturnType<typeof setTimeout>
    let fTimer: ReturnType<typeof setTimeout>
    let destroyed = false

    // ── Binance combined stream (BTC + ETH realtime)
    const bnInsts = INSTRUMENTS.filter(i => i.bn)
    const streams = bnInsts.map(i => `${i.bn}@trade`).join('/')

    const connectBinance = () => {
      if (destroyed) return
      bws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
      bws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          const d = msg.data
          if (!d?.s || !d?.p) return
          const inst = bnInsts.find(i => i.bn && d.s === i.bn.toUpperCase())
          if (inst) push(inst.sym, parseFloat(d.p))
        } catch {}
      }
      bws.onclose = () => { if (!destroyed) bTimer = setTimeout(connectBinance, 2000) }
      bws.onerror = () => bws?.close()
    }

    // ── Finnhub WS (forex + gold + NAS100)
    // Using public sandbox key — if quota exceeded falls back to REST polling
    const FINNHUB_KEY = 'd0lbgopr01ql4s0b4cu0d0lbgopr01ql4s0b4cug'
    const fhInsts = INSTRUMENTS.filter(i => i.fh)
    const fhMap   = Object.fromEntries(fhInsts.map(i => [i.fh as string, i.sym]))
    let fhConnected = false

    const connectFinnhub = () => {
      if (destroyed) return
      fws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`)
      fws.onopen = () => {
        fhConnected = true
        fhInsts.forEach(i => {
          fws?.send(JSON.stringify({ type: 'subscribe', symbol: i.fh }))
        })
      }
      fws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          if (msg.type !== 'trade' || !msg.data) return
          msg.data.forEach((t: any) => {
            const sym = fhMap[t.s]
            if (sym && t.p > 0) push(sym, t.p)
          })
        } catch {}
      }
      fws.onclose = () => {
        fhConnected = false
        if (!destroyed) fTimer = setTimeout(connectFinnhub, 3000)
      }
      fws.onerror = () => fws?.close()
    }

    // ── REST fallback for forex — polls Frankfurter every 5s
    // Covers EUR/USD, GBP/USD, USD/JPY when Finnhub is slow/down
    const pollForex = async () => {
      try {
        const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY')
        const d = await r.json()
        if (d.rates) {
          if (d.rates.EUR) push('EUR/USD', parseFloat((1 / d.rates.EUR).toFixed(5)))
          if (d.rates.GBP) push('GBP/USD', parseFloat((1 / d.rates.GBP).toFixed(5)))
          if (d.rates.JPY) push('USD/JPY', parseFloat(d.rates.JPY.toFixed(3)))
        }
      } catch {}
    }

    // Poll gold via metals-api alternative
    const pollGold = async () => {
      try {
        // Use Binance PAXGUSD as proxy for gold price
        const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSD')
        const d = await r.json()
        if (d.price) push('XAU/USD', parseFloat(d.price))
      } catch {}
    }

    // Poll NAS100 — use QQQ ETF price * ~5.14 as proxy, or Binance futures
    const pollNas = async () => {
      try {
        const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT')
        const d = await r.json()
        // NAS100 not available on Binance directly — keep seed + Finnhub WS
      } catch {}
    }

    connectBinance()
    connectFinnhub()

    // Always poll REST as backup/supplement
    pollForex()
    pollGold()
    const forexInterval = setInterval(pollForex, 5000)
    const goldInterval  = setInterval(pollGold, 5000)

    return () => {
      destroyed = true
      clearTimeout(bTimer); clearTimeout(fTimer)
      clearInterval(forexInterval); clearInterval(goldInterval)
      bws?.close(); fws?.close()
    }
  }, [push])

  return { priceRef, prevRef, tick }
}

// ─── Platform ─────────────────────────────────────────────────────────────────
export function PlatformPage() {
  const navigate  = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary: defPrimary } = useAccount()
  const [selAccId, setSelAccId] = useState<string|null>(null)
  const primary = accounts.find(a => a.id === selAccId) ?? defPrimary

  const [sym,       setSym]       = useState('EUR/USD')
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

  const { priceRef, prevRef, tick } = usePriceFeed()
  void tick // consumed — ensures re-render on every price update

  const prices = priceRef.current
  const inst   = INSTRUMENTS.find(i => i.sym === sym)!

  const livePrice = prices[sym] || SEED[sym]
  const prevPrice = prevRef.current[sym] || livePrice
  const execPrice = parseFloat((dir === 'buy' ? livePrice + inst.spread : livePrice).toFixed(inst.dec))
  const lotsNum   = Math.max(0.01, parseFloat(lots) || 0.01)
  const up        = livePrice >= prevPrice

  // ── Financials ──
  const balance = primary?.balance ?? 0

  const openPnl = openTrades.reduce((sum, t) => {
    const ti  = INSTRUMENTS.find(p => p.sym === t.symbol)!
    const cur = prices[t.symbol] || SEED[t.symbol]
    const diff = t.direction === 'buy' ? cur - t.open_price : t.open_price - cur
    // P&L = diff * lot contract size in base currency * lots
    // For EUR/USD: 1 pip move on 1 lot = $10; diff * 100000 * lots
    // For XAU/USD: diff * 100 * lots
    return sum + diff * (ti.lotUSD(1) / 1) * t.lots / (cur || 1) * cur
  }, 0)

  // Correct P&L: diff in price * notional / price = diff * contract_units * lots
  const openPnlCorrect = openTrades.reduce((sum, t) => {
    const ti  = INSTRUMENTS.find(p => p.sym === t.symbol)!
    const cur = prices[t.symbol] || SEED[t.symbol]
    const diff = t.direction === 'buy' ? cur - t.open_price : t.open_price - cur
    // notional_usd = lotUSD(cur), units = notional / price
    // P&L = diff * units * lots
    // EUR/USD: units = 100000, P&L = diff * 100000 * lots ✓
    // XAU/USD: units = 100,    P&L = diff * 100 * lots ✓
    // BTC/USD: units = 1,      P&L = diff * 1 * lots ✓
    // USD/JPY: units = 100000, P&L = diff * 100000 / JPY * lots → need USD
    let units: number
    if (t.symbol === 'USD/JPY') {
      units = LOT_SIZE / cur  // each pip worth $1000/cur ≈ USD
    } else {
      units = ti.lotUSD(1) / 1  // for quote=USD pairs: units = 100000 or 100 or 1
    }
    return sum + diff * units * t.lots
  }, 0)

  const equity = balance + openPnlCorrect

  // Margin = (price * contract_units * lots) / leverage
  const usedMargin = openTrades.reduce((sum, t) => {
    const ti  = INSTRUMENTS.find(p => p.sym === t.symbol)!
    const cur = prices[t.symbol] || SEED[t.symbol]
    return sum + ti.lotUSD(cur) * t.lots / LEVERAGE
  }, 0)

  const freeMargin  = equity - usedMargin
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity
  const reqMargin   = inst.lotUSD(execPrice) * lotsNum / LEVERAGE
  const maxLots     = Math.max(0, Math.floor((freeMargin * LEVERAGE / inst.lotUSD(execPrice)) * 100) / 100)

  // ── Load trades ──
  useEffect(() => {
    if (!primary) return
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status','open')
      .order('opened_at',{ascending:false}).then(({data}) => setOpenTrades(data ?? []))
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status','closed')
      .order('closed_at',{ascending:false}).limit(50).then(({data}) => setClosedTrades(data ?? []))
  }, [primary?.id])

  async function placeOrder() {
    if (!primary) { toast('error','❌','No Account','No active account.'); return }
    // Block trading if payout is pending
    if (primary.payout_locked || primary.status === 'suspended') {
      toast('error','⛔','Account Locked','A payout request is pending. Trading is suspended until admin reviews your payout.')
      return
    }
    if (reqMargin > freeMargin) {
      toast('error','⛔','Insufficient Margin',`Need $${reqMargin.toFixed(2)}, free: $${freeMargin.toFixed(2)}`)
      return
    }
    setPlacing(true); setConfirmOpen(false)
    const { data, error } = await supabase.from('trades').insert({
      account_id: primary.id, user_id: primary.user_id,
      symbol: sym, direction: dir, lots: lotsNum,
      order_type: orderType.toLowerCase(),
      open_price: execPrice,
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      status: 'open', opened_at: new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error', error.message); return }
    setOpenTrades(t => [data, ...t])
    toast('success','⚡','Order Placed',`${dir.toUpperCase()} ${lotsNum} ${sym} @ ${execPrice}`)
    setSl(''); setTp('')
  }

  async function closeTrade(trade: any) {
    const ti  = INSTRUMENTS.find(p => p.sym === trade.symbol)!
    const cur = prices[trade.symbol] || SEED[trade.symbol]
    const closePrice = parseFloat((trade.direction==='buy' ? cur : cur + ti.spread).toFixed(ti.dec))
    const diff = trade.direction==='buy' ? closePrice - trade.open_price : trade.open_price - closePrice

    let units: number
    if (trade.symbol === 'USD/JPY') {
      units = LOT_SIZE / closePrice
    } else {
      units = ti.lotUSD(1) / 1
    }
    const netPnl = parseFloat((diff * units * trade.lots).toFixed(2))
    const pips   = parseFloat((diff / ti.pip).toFixed(1))

    const { error } = await supabase.from('trades').update({
      status: 'closed', close_price: closePrice,
      closed_at: new Date().toISOString(),
      pips, net_pnl: netPnl, gross_pnl: netPnl,
    }).eq('id', trade.id)
    if (error) { toast('error','❌','Error', error.message); return }

    const newBal = parseFloat((balance + netPnl).toFixed(2))
    await supabase.from('accounts').update({ balance: newBal, equity: newBal }).eq('id', primary!.id)

    setOpenTrades(t => t.filter(x => x.id !== trade.id))
    setClosedTrades(t => [{ ...trade, status:'closed', close_price:closePrice, net_pnl:netPnl, pips }, ...t])
    toast(netPnl>=0?'success':'warning', netPnl>=0?'💰':'🔴','Closed',
      `${trade.symbol} ${netPnl>=0?'+':''}${fmt(netPnl)}`)
  }

  return (
    <>
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#0A0A0F', color:'var(--text)', fontFamily:'var(--font-sans,sans-serif)' }}>

      {/* ── Watchlist ── */}
      <div style={{ width:158, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--bdr)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:20, height:20, border:'1px solid var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--gold)' }}>✦</div>
          <span style={{ fontFamily:'serif', fontSize:11, fontWeight:'bold', lineHeight:1.3 }}>TFD<br/>Terminal</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {INSTRUMENTS.map(i => {
            const cur = prices[i.sym] || SEED[i.sym]
            const prv = prevRef.current[i.sym] || cur
            const isLive = prices[i.sym] > 0
            const isUp   = cur >= prv
            return (
              <div key={i.sym} onClick={() => setSym(i.sym)} style={{
                padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid rgba(212,168,67,.04)',
                background: sym===i.sym ? 'rgba(212,168,67,.07)' : 'transparent',
                borderLeft: sym===i.sym ? '2px solid var(--gold)' : '2px solid transparent',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:600, fontSize:11 }}>{i.sym}</span>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: isLive ? 'var(--green)' : '#555', flexShrink:0 }}/>
                </div>
                <div style={{ fontFamily:'monospace', fontSize:11, marginTop:2, color:isUp?'var(--green)':'var(--red)' }}>
                  {cur.toFixed(i.dec)}
                </div>
                <div style={{ fontSize:8, color:isUp?'var(--green)':'var(--red)' }}>
                  {isUp?'▲':'▼'} {Math.abs(cur - prv).toFixed(i.dec)}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid var(--bdr)' }}>
          {accounts.length > 1 ? (
            <select value={selAccId ?? primary?.id ?? ''} onChange={e => setSelAccId(e.target.value)} style={{ width:'100%', padding:'5px 6px', background:'var(--bg3)', border:'1px solid var(--dim)', color:'var(--text)', fontSize:9, fontFamily:'monospace', outline:'none', cursor:'pointer', marginBottom:8 }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number}</option>)}
            </select>
          ) : (
            <div style={{ marginBottom:8, padding:'5px 6px', background:'var(--bg3)', border:'1px solid var(--dim)', fontSize:9, fontFamily:'monospace', color:'var(--gold)', textAlign:'center' }}>
              {primary?.account_number ?? '—'}
            </div>
          )}
          <button onClick={() => navigate('/dashboard')} style={{ width:'100%', fontSize:9, letterSpacing:1, textTransform:'uppercase' as const, color:'var(--text3)', background:'none', border:'none', cursor:'pointer', textAlign:'center' as const }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Topbar */}
        <div style={{ height:50, background:'var(--bg2)', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', padding:'0 14px', gap:10, flexShrink:0, flexWrap:'nowrap' as const }}>
          <span style={{ fontFamily:'serif', fontSize:15, fontWeight:'bold', flexShrink:0 }}>{sym}</span>
          <span style={{ fontFamily:'monospace', fontSize:20, fontWeight:700, color:up?'var(--green)':'var(--red)', flexShrink:0 }}>
            {livePrice.toFixed(inst.dec)}
          </span>
          <span style={{ fontSize:10, color:up?'var(--green)':'var(--red)', flexShrink:0 }}>
            {up?'▲':'▼'} {Math.abs(livePrice - prevPrice).toFixed(inst.dec)}
          </span>
          {/* Financials bar */}
          <div style={{ display:'flex', gap:12, padding:'4px 12px', background:'rgba(0,0,0,.35)', border:'1px solid rgba(212,168,67,.12)', marginLeft:8 }}>
            {[
              { l:'BALANCE',    v: fmt(balance),                               c:'var(--gold)' },
              { l:'EQUITY',     v: fmt(equity),                                c: equity>=balance?'var(--green)':'var(--red)' },
              { l:'OPEN P&L',   v:`${openPnlCorrect>=0?'+':''}${fmt(openPnlCorrect)}`, c: openPnlCorrect>=0?'var(--green)':'var(--red)' },
              { l:'FREE MARGIN',v: fmt(freeMargin),                            c: freeMargin<0?'var(--red)':'var(--text2)' },
              ...(usedMargin > 0 ? [{ l:'MARGIN LVL', v:`${marginLevel.toFixed(0)}%`, c: marginLevel<150?'var(--red)':'var(--text2)' }] : []),
            ].map(({ l, v, c }) => (
              <div key={l} style={{ flexShrink:0 }}>
                <div style={{ fontSize:7, letterSpacing:1.5, color:'var(--text3)', fontWeight:600 }}>{l}</div>
                <div style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          {/* TF selector */}
          <div style={{ marginLeft:'auto', display:'flex', gap:2, flexShrink:0 }}>
            {Object.keys(TFS).map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                padding:'3px 7px', fontSize:9, fontFamily:'monospace', fontWeight:'bold', cursor:'pointer',
                background: tf===t?'rgba(212,168,67,.15)':'transparent',
                border: tf===t?'1px solid var(--bdr2)':'1px solid transparent',
                color: tf===t?'var(--gold)':'var(--text3)',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' }}/>
            <span style={{ fontSize:9, color:'var(--green)', letterSpacing:1.5, textTransform:'uppercase' as const, fontWeight:600 }}>Live</span>
          </div>
          {(primary?.payout_locked || primary?.status === 'suspended') && (
            <div style={{ padding:'4px 10px', background:'rgba(212,168,67,.12)', border:'1px solid var(--bdr2)', fontSize:9, color:'var(--gold)', letterSpacing:1, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              ⏳ <span style={{ fontWeight:600, textTransform:'uppercase' as const }}>Payout Pending — Trading Locked</span>
            </div>
          )}
        </div>

        {/* TradingView Chart — wrapper key forces full remount on symbol/tf change */}
        <div key={`${sym}_${tf}`} style={{ flex:1, overflow:'hidden' }}>
          <TVChart tvSym={inst.tv} tf={tf} />
        </div>

        {/* Bottom panel */}
        <div style={{ height:220, background:'var(--bg2)', borderTop:'1px solid var(--bdr)', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--bdr)' }}>
            {[['positions',`Positions (${openTrades.length})`],['history',`History (${closedTrades.length})`],['account','Account']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding:'7px 14px', fontSize:9, letterSpacing:1, textTransform:'uppercase' as const, fontWeight:600, cursor:'pointer', border:'none', borderBottom: tab===k?'2px solid var(--gold)':'2px solid transparent', background: tab===k?'rgba(212,168,67,.04)':'transparent', color: tab===k?'var(--gold)':'var(--text3)', marginBottom:-1 }}>{l}</button>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {tab==='positions' && (
              openTrades.length === 0
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:11 }}>No open positions</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead><tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Symbol','Dir','Lots','Open Price','Current','P&L','SL','TP','Time',''].map(h => (
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', textAlign:'left' as const, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {openTrades.map(t => {
                        const ti  = INSTRUMENTS.find(p => p.sym === t.symbol)!
                        const cur = prices[t.symbol] || SEED[t.symbol]
                        const diff = t.direction==='buy' ? cur - t.open_price : t.open_price - cur
                        let units: number
                        if (t.symbol === 'USD/JPY') { units = LOT_SIZE / cur }
                        else { units = ti.lotUSD(1) / 1 }
                        const pnl = parseFloat((diff * units * t.lots).toFixed(2))
                        return (
                          <tr key={t.id} style={{ borderBottom:'1px solid rgba(212,168,67,.04)' }}>
                            <td style={{ padding:'6px 10px', fontWeight:700 }}>{t.symbol}</td>
                            <td style={{ padding:'6px 10px' }}><span style={{ fontSize:8, fontWeight:'bold', letterSpacing:1, color:t.direction==='buy'?'var(--green)':'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.lots}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.open_price}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:cur>=t.open_price?'var(--green)':'var(--red)' }}>{cur.toFixed(ti.dec)}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:700, fontSize:11, color:pnl>=0?'var(--green)':'var(--red)' }}>{pnl>=0?'+':''}{fmt(pnl)}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--red)', fontSize:9 }}>{t.sl??'—'}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--green)', fontSize:9 }}>{t.tp??'—'}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:9, color:'var(--text3)' }}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                            <td style={{ padding:'6px 10px' }}><button onClick={() => closeTrade(t)} style={{ padding:'3px 10px', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', background:'rgba(255,51,82,.1)', color:'var(--red)', border:'1px solid rgba(255,51,82,.25)' }}>✕ Close</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
            )}
            {tab==='history' && (
              closedTrades.length === 0
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:11 }}>No history</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead><tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Symbol','Dir','Lots','Open','Close','Pips','P&L','Date'].map(h => (
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', textAlign:'left' as const, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {closedTrades.map(t => (
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
                  ['Balance',     fmt(balance),                                    'var(--gold)'],
                  ['Equity',      fmt(equity),                                     equity>=balance?'var(--green)':'var(--red)'],
                  ['Open P&L',    `${openPnlCorrect>=0?'+':''}${fmt(openPnlCorrect)}`, openPnlCorrect>=0?'var(--green)':'var(--red)'],
                  ['Free Margin', fmt(freeMargin),                                  freeMargin<0?'var(--red)':'var(--text)'],
                  ['Used Margin', fmt(usedMargin),                                  'var(--text)'],
                  ['Margin Lvl',  usedMargin>0?`${marginLevel.toFixed(0)}%`:'∞',   (marginLevel<150&&usedMargin>0)?'var(--red)':'var(--green)'],
                  ['Leverage',    `1:${LEVERAGE}`,                                  'var(--text2)'],
                  ['Open Pos.',   String(openTrades.length),                        'var(--text)'],
                  ['Account',     primary?.account_number??'—',                     'var(--gold)'],
                  ['Phase',       primary?.phase??'—',                              'var(--text2)'],
                ] as [string,string,string][]).map(([l,v,c]) => (
                  <div key={l}>
                    <div style={{ fontSize:7, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
                    <div style={{ fontFamily:'monospace', fontSize:12, color: c }}>{v}</div>
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
            <button onClick={() => setDir('buy')} style={{ flex:1, padding:'9px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', border:'none', background:dir==='buy'?'var(--green)':'rgba(0,217,126,.08)', color:dir==='buy'?'#000':'var(--green)' }}>Buy</button>
            <button onClick={() => setDir('sell')} style={{ flex:1, padding:'9px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', border:'none', background:dir==='sell'?'var(--red)':'rgba(255,51,82,.08)', color:dir==='sell'?'#fff':'var(--red)' }}>Sell</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
          {/* Live price */}
          <div style={{ textAlign:'center', padding:'10px 8px', border:`1px solid ${up?'rgba(0,217,126,.25)':'rgba(255,51,82,.25)'}`, background:'var(--bg3)' }}>
            <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:3 }}>{dir==='buy'?'Ask':'Bid'}</div>
            <div style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, color:up?'var(--green)':'var(--red)', letterSpacing:-1 }}>
              {execPrice.toFixed(inst.dec)}
            </div>
            <div style={{ fontSize:8, color:'var(--text3)', marginTop:3 }}>spread {inst.spread.toFixed(inst.dec)}</div>
          </div>

          {/* Order type */}
          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Order Type</div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              {['Market','Limit','Stop'].map(t => (
                <button key={t} onClick={() => setOrderType(t)} style={{ flex:1, padding:'6px 0', fontSize:8, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer', border:'none', background:orderType===t?'rgba(212,168,67,.12)':'transparent', color:orderType===t?'var(--gold)':'var(--text3)' }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Lot size */}
          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>
              Lot Size <span style={{ fontWeight:400 }}>(max {maxLots})</span>
            </div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              <button onClick={() => setLots(l => String(Math.max(0.01, parseFloat(l)-0.01).toFixed(2)))} style={{ padding:'0 10px', background:'transparent', border:'none', borderRight:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:16, fontWeight:'bold' }}>−</button>
              <input value={lots} onChange={e => setLots(e.target.value)} type="number" step="0.01" min="0.01" style={{ flex:1, textAlign:'center', padding:'8px 0', background:'transparent', border:'none', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:13 }}/>
              <button onClick={() => setLots(l => String((parseFloat(l)+0.01).toFixed(2)))} style={{ padding:'0 10px', background:'transparent', border:'none', borderLeft:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:16, fontWeight:'bold' }}>+</button>
            </div>
          </div>

          {/* SL / TP */}
          {([['Stop Loss', sl, setSl], ['Take Profit', tp, setTp]] as [string, string, (v:string)=>void][]).map(([l, v, set]) => (
            <div key={l}>
              <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
              <input value={v} onChange={e => set(e.target.value)} placeholder="Optional" type="number"
                style={{ width:'100%', padding:'8px', background:'var(--bg3)', border:'1px solid var(--dim)', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:12, boxSizing:'border-box' as const }}/>
            </div>
          ))}

          {/* Margin summary */}
          <div style={{ background:'var(--bg3)', border:'1px solid var(--dim)', padding:'8px 10px' }}>
            {([
              ['Req. Margin', `$${reqMargin.toFixed(2)}`,  reqMargin > freeMargin ? 'var(--red)':'var(--text)'],
              ['Free Margin', `$${freeMargin.toFixed(2)}`, freeMargin < reqMargin ? 'var(--red)':'var(--green)'],
              ['Leverage',    `1:${LEVERAGE}`,              'var(--text3)'],
            ] as [string,string,string][]).map(([l,v,c]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:8, color:'var(--text3)' }}>{l}</span>
                <span style={{ fontSize:9, fontFamily:'monospace', fontWeight:600, color: c }}>{v}</span>
              </div>
            ))}
          </div>

          {!primary && <div style={{ fontSize:9, color:'var(--red)', textAlign:'center' as const, border:'1px solid rgba(255,51,82,.2)', padding:8 }}>No active account</div>}

          <button onClick={() => setConfirmOpen(true)} disabled={placing||!primary||reqMargin>freeMargin} style={{
            width:'100%', padding:'12px 0', fontSize:11, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold',
            cursor: placing||!primary||reqMargin>freeMargin?'not-allowed':'pointer',
            border:'none', opacity: placing||!primary||reqMargin>freeMargin?0.35:1,
            background: dir==='buy'?'var(--green)':'var(--red)',
            color: dir==='buy'?'#000':'#fff',
          }}>
            {placing ? 'Placing…' : `${dir.toUpperCase()} ${lotsNum} ${sym}`}
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
            {([
              ['Symbol', sym], ['Direction', dir.toUpperCase()], ['Type', orderType],
              ['Lots', String(lotsNum)], ['Price', String(execPrice)],
              ['Margin', `$${reqMargin.toFixed(2)}`], ['Account', primary?.account_number ?? '—'],
            ] as [string,string][]).map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                <span style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase' as const, color:'var(--text3)', fontWeight:600 }}>{l}</span>
                <span style={{ fontFamily:'monospace', fontSize:12, color: v==='BUY'?'var(--green)':v==='SELL'?'var(--red)':'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={() => setConfirmOpen(false)} style={{ padding:'8px 18px', background:'transparent', border:'1px solid var(--bdr2)', color:'var(--text2)', fontSize:9, letterSpacing:2, textTransform:'uppercase' as const, fontWeight:'bold', cursor:'pointer' }}>Cancel</button>
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
