import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { DrawdownBar } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const INSTRUMENTS = [
  { sym:'EUR/USD', bid:1.08742, spread:0.00020, dec:5, pip:0.0001 },
  { sym:'GBP/USD', bid:1.26712, spread:0.00020, dec:5, pip:0.0001 },
  { sym:'XAU/USD', bid:2341.80, spread:0.30,    dec:2, pip:0.10 },
  { sym:'NAS100',  bid:17842.0, spread:1.0,     dec:1, pip:1.0 },
  { sym:'BTC/USD', bid:67180.0, spread:10.0,    dec:1, pip:1.0 },
  { sym:'USD/JPY', bid:151.420, spread:0.020,   dec:3, pip:0.01 },
  { sym:'WTI/USD', bid:82.140,  spread:0.040,   dec:3, pip:0.01 },
]
const TFS = ['M1','M5','M15','M30','H1','H4','D1']

type Candle = { o:number; h:number; l:number; c:number }

function buildCandles(base: number, count: number, volatility: number): Candle[] {
  const candles: Candle[] = []
  let price = base
  for (let i = 0; i < count; i++) {
    const o = price
    const move = (Math.random() - 0.48) * volatility
    const c = o + move
    const h = Math.max(o, c) + Math.random() * volatility * 0.5
    const l = Math.min(o, c) - Math.random() * volatility * 0.5
    candles.push({ o, h, l, c })
    price = c
  }
  return candles
}

function CandleChart({ symbol, tf, livePrice }: { symbol: string; tf: string; livePrice: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const candlesRef = useRef<Candle[]>([])
  const animRef = useRef<number>(0)

  // Build initial candles when symbol/tf changes
  useEffect(() => {
    const inst = INSTRUMENTS.find(i => i.sym === symbol)!
    const vol = inst.bid * 0.0008
    candlesRef.current = buildCandles(inst.bid * 0.995, 80, vol)
  }, [symbol, tf])

  // Draw function
  const draw = useCallback(() => {
    const c = ref.current
    if (!c) return
    const parent = c.parentElement
    if (!parent) return
    const W = parent.clientWidth
    const H = parent.clientHeight
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
    const ctx = c.getContext('2d')!
    const inst = INSTRUMENTS.find(i => i.sym === symbol)!

    // Update last candle with live price
    const candles = candlesRef.current
    if (candles.length > 0) {
      const last = candles[candles.length - 1]
      last.c = livePrice
      last.h = Math.max(last.h, livePrice)
      last.l = Math.min(last.l, livePrice)
    }

    const all = candles.flatMap(cd => [cd.o, cd.h, cd.l, cd.c])
    const mn = Math.min(...all)
    const mx = Math.max(...all)
    const pad = { t: 20, b: 32, l: 4, r: 75 }
    const cW = W - pad.l - pad.r
    const cH = H - pad.t - pad.b
    const toY = (v: number) => pad.t + cH - ((v - mn) / (mx - mn || 1)) * cH
    const cw = Math.max(4, Math.floor(cW / candles.length) - 1)

    // Background
    ctx.fillStyle = '#06060F'
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(212,168,67,.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + (cH / 5) * i
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
    }
    for (let i = 0; i <= 6; i++) {
      const x = pad.l + (cW / 6) * i
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + cH); ctx.stroke()
    }

    // Price labels
    ctx.fillStyle = 'rgba(230,226,248,.25)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    for (let i = 0; i <= 4; i++) {
      const v = mn + ((mx - mn) / 4) * (4 - i)
      ctx.fillText(v.toFixed(inst.dec), W - pad.r + 4, pad.t + (cH / 4) * i + 4)
    }

    // Candles
    candles.forEach((cd, i) => {
      const x = pad.l + i * (cw + 1)
      const bull = cd.c >= cd.o
      const color = bull ? '#00D97E' : '#FF3352'
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + cw / 2, toY(cd.h))
      ctx.lineTo(x + cw / 2, toY(cd.l))
      ctx.stroke()
      ctx.fillStyle = color
      const top = Math.min(toY(cd.o), toY(cd.c))
      const ht = Math.max(1, Math.abs(toY(cd.o) - toY(cd.c)))
      ctx.fillRect(x, top, cw, ht)
    })

    // Current price line
    const cur = livePrice
    ctx.strokeStyle = 'rgba(212,168,67,.7)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad.l, toY(cur))
    ctx.lineTo(W - pad.r, toY(cur))
    ctx.stroke()
    ctx.setLineDash([])

    // Price label box
    ctx.fillStyle = '#D4A843'
    ctx.fillRect(W - pad.r, toY(cur) - 10, pad.r, 20)
    ctx.fillStyle = '#06060F'
    ctx.font = 'bold 10px monospace'
    ctx.fillText(cur.toFixed(inst.dec), W - pad.r + 3, toY(cur) + 4)
  }, [symbol, livePrice])

  // Animation loop — new candle every ~10s
  useEffect(() => {
    let lastCandle = Date.now()
    const inst = INSTRUMENTS.find(i => i.sym === symbol)!

    const loop = () => {
      draw()
      const now = Date.now()
      if (now - lastCandle > 10000) {
        const candles = candlesRef.current
        const lastC = candles[candles.length - 1]?.c ?? inst.bid
        const vol = inst.bid * 0.0008
        const o = lastC
        candles.push({ o, h: o, l: o, c: o })
        if (candles.length > 80) candles.shift()
        lastCandle = now
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [symbol, draw])

  return <canvas ref={ref} style={{ width:'100%', height:'100%', display:'block' }}/>
}

export function PlatformPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { primary } = useAccount()

  const [sym, setSym] = useState('EUR/USD')
  const [tf, setTf] = useState('H1')
  const [dir, setDir] = useState<'buy'|'sell'>('buy')
  const [lots, setLots] = useState('0.10')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [orderType, setOrderType] = useState('Market')
  const [tab, setTab] = useState('positions')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [openTrades, setOpenTrades] = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])

  // Live prices state
  const [prices, setPrices] = useState(INSTRUMENTS.map(i => ({ ...i, prev: i.bid, cur: i.bid })))

  // Animate prices
  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(p => p.map(i => {
        const move = (Math.random() - 0.49) * i.bid * 0.00025
        return { ...i, prev: i.cur, cur: i.cur + move }
      }))
    }, 800)
    return () => clearInterval(iv)
  }, [])

  // Load trades
  useEffect(() => {
    if (!primary) return
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status','open')
      .order('opened_at', { ascending: false })
      .then(({ data }) => setOpenTrades(data ?? []))
    supabase.from('trades').select('*').eq('account_id', primary.id).eq('status','closed')
      .order('closed_at', { ascending: false }).limit(50)
      .then(({ data }) => setClosedTrades(data ?? []))
  }, [primary?.id])

  const inst = prices.find(p => p.sym === sym) ?? prices[0]
  const execPrice = dir === 'buy' ? inst.cur + inst.spread : inst.cur

  async function placeOrder() {
    if (!primary) { toast('error','❌','No Account','No active trading account found.'); return }
    setPlacing(true); setConfirmOpen(false)
    const { data, error } = await supabase.from('trades').insert({
      account_id: primary.id,
      user_id: primary.user_id,
      symbol: sym,
      direction: dir,
      lots: parseFloat(lots),
      order_type: orderType.toLowerCase(),
      open_price: parseFloat(execPrice.toFixed(inst.dec)),
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      status: 'open',
      opened_at: new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error', error.message); return }
    setOpenTrades(t => [data, ...t])
    toast('success','⚡','Order Placed', `${dir.toUpperCase()} ${lots} ${sym} @ ${execPrice.toFixed(inst.dec)}`)
    setSl(''); setTp('')
  }

  async function closeTrade(trade: any) {
    const ti = prices.find(p => p.sym === trade.symbol) ?? prices[0]
    const closePrice = trade.direction === 'buy' ? ti.cur : ti.cur + ti.spread
    const priceDiff = trade.direction === 'buy' ? closePrice - trade.open_price : trade.open_price - closePrice
    const pips = parseFloat((priceDiff / ti.pip).toFixed(1))
    const netPnl = parseFloat((pips * ti.pip * trade.lots * 100000 * 0.1).toFixed(2))
    const { error } = await supabase.from('trades').update({
      status: 'closed',
      close_price: parseFloat(closePrice.toFixed(ti.dec)),
      closed_at: new Date().toISOString(),
      pips, net_pnl: netPnl, gross_pnl: netPnl,
    }).eq('id', trade.id)
    if (error) { toast('error','❌','Error', error.message); return }
    setOpenTrades(t => t.filter(x => x.id !== trade.id))
    setClosedTrades(t => [{ ...trade, status:'closed', close_price: closePrice, net_pnl: netPnl, pips }, ...t])
    toast(netPnl >= 0 ? 'success':'warning','🔴','Closed',
      `${trade.symbol} ${netPnl >= 0 ? '+' : ''}${fmt(netPnl)}`)
  }

  const inp = "flex-1 px-2 py-[8px] bg-transparent outline-none text-[var(--text)] font-mono text-[12px] placeholder-[rgba(230,226,248,.25)]"

  return (
    <>
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)', fontFamily:'var(--font-sans,sans-serif)' }}>

      {/* Watchlist */}
      <div style={{ width:158, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--bdr)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:20, height:20, border:'1px solid var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--gold)' }}>✦</div>
          <span style={{ fontFamily:'serif', fontSize:11, fontWeight:'bold', lineHeight:1.3 }}>TFD<br/>Terminal</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {prices.map(p=>(
            <div key={p.sym} onClick={()=>setSym(p.sym)}
              style={{
                padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid rgba(212,168,67,.04)',
                background: sym===p.sym ? 'rgba(212,168,67,.07)' : 'transparent',
                borderLeft: sym===p.sym ? '2px solid var(--gold)' : '2px solid transparent',
              }}>
              <div style={{ fontWeight:600, fontSize:11, marginBottom:2 }}>{p.sym}</div>
              <div style={{ fontFamily:'monospace', fontSize:10, color: p.cur>=p.prev ? 'var(--green)' : 'var(--red)' }}>
                {p.cur.toFixed(p.dec)}
              </div>
              <div style={{ fontSize:8, color: p.cur>=p.prev ? 'var(--green)' : 'var(--red)' }}>
                {p.cur>=p.prev?'▲':'▼'} {Math.abs(p.cur-p.prev).toFixed(p.dec)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid var(--bdr)' }}>
          <button onClick={()=>navigate('/dashboard')}
            style={{ width:'100%', fontSize:9, letterSpacing:1, textTransform:'uppercase', color:'var(--text3)', background:'none', border:'none', cursor:'pointer', textAlign:'center' }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <div style={{ height:44, background:'var(--bg2)', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 }}>
          <span style={{ fontFamily:'serif', fontSize:16, fontWeight:'bold' }}>{sym}</span>
          <span style={{ fontFamily:'monospace', fontSize:20, fontWeight:500, color: inst.cur>=inst.prev ? 'var(--green)' : 'var(--red)' }}>
            {inst.cur.toFixed(inst.dec)}
          </span>
          <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
            {TFS.map(t=>(
              <button key={t} onClick={()=>setTf(t)}
                style={{
                  padding:'3px 7px', fontSize:9, fontFamily:'monospace', fontWeight:'bold', cursor:'pointer',
                  background: tf===t ? 'rgba(212,168,67,.15)' : 'transparent',
                  border: tf===t ? '1px solid var(--bdr2)' : '1px solid transparent',
                  color: tf===t ? 'var(--gold)' : 'var(--text3)',
                }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 5px var(--green)' }}/>
            <span style={{ fontSize:9, color:'var(--green)', letterSpacing:1.5, textTransform:'uppercase', fontWeight:600 }}>Live</span>
          </div>
        </div>

        {/* Chart — takes all remaining space above bottom panel */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          <CandleChart symbol={sym} tf={tf} livePrice={inst.cur}/>
        </div>

        {/* Bottom panel */}
        <div style={{ height:200, background:'var(--bg2)', borderTop:'1px solid var(--bdr)', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--bdr)' }}>
            {[['positions',`Positions (${openTrades.length})`],['history',`History (${closedTrades.length})`],['account','Account']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                style={{
                  padding:'7px 14px', fontSize:9, letterSpacing:1, textTransform:'uppercase', fontWeight:600,
                  cursor:'pointer', border:'none', borderBottom: tab===k ? '2px solid var(--gold)' : '2px solid transparent',
                  background: tab===k ? 'rgba(212,168,67,.04)' : 'transparent',
                  color: tab===k ? 'var(--gold)' : 'var(--text3)',
                  marginBottom:-1,
                }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {tab==='positions' && (
              openTrades.length === 0
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:11 }}>No open positions</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead><tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Symbol','Dir','Lots','Open Price','SL','TP','Opened','Close'].map(h=>(
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', textAlign:'left', fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {openTrades.map(t=>(
                        <tr key={t.id} style={{ borderBottom:'1px solid rgba(212,168,67,.04)' }}>
                          <td style={{ padding:'6px 10px', fontWeight:600 }}>{t.symbol}</td>
                          <td style={{ padding:'6px 10px' }}><span style={{ fontSize:8, fontWeight:'bold', color: t.direction==='buy'?'var(--green)':'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.lots}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.open_price}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--red)' }}>{t.sl ?? '—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--green)' }}>{t.tp ?? '—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:9, color:'var(--text3)' }}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                          <td style={{ padding:'6px 10px' }}>
                            <button onClick={()=>closeTrade(t)}
                              style={{ padding:'3px 8px', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'rgba(255,51,82,.1)', color:'var(--red)', border:'1px solid rgba(255,51,82,.2)' }}>
                              ✕ Close
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            )}
            {tab==='history' && (
              closedTrades.length === 0
                ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text3)', fontSize:11 }}>No history</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                    <thead><tr style={{ borderBottom:'1px solid var(--dim)' }}>
                      {['Symbol','Dir','Lots','Open','Close','Pips','Net P&L','Date'].map(h=>(
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', textAlign:'left', fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {closedTrades.map(t=>(
                        <tr key={t.id} style={{ borderBottom:'1px solid rgba(212,168,67,.04)' }}>
                          <td style={{ padding:'6px 10px', fontWeight:600 }}>{t.symbol}</td>
                          <td style={{ padding:'6px 10px' }}><span style={{ fontSize:8, fontWeight:'bold', color: t.direction==='buy'?'var(--green)':'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.lots}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.open_price}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.close_price ?? '—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', color:(t.pips??0)>=0?'var(--green)':'var(--red)' }}>{t.pips != null ? `${t.pips>0?'+':''}${t.pips}` : '—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:600, color:(t.net_pnl??0)>=0?'var(--green)':'var(--red)' }}>{t.net_pnl != null ? `${t.net_pnl>=0?'+':''}${fmt(t.net_pnl)}` : '—'}</td>
                          <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:9, color:'var(--text3)' }}>{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            )}
            {tab==='account' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, padding:16 }}>
                {[['Balance',fmt(primary?.balance??0)],['Equity',fmt(primary?.equity??0)],['Open',String(openTrades.length)],['Account',primary?.account_number??'—']].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ fontSize:7, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
                    <div style={{ fontFamily:'monospace', fontSize:13, color:'var(--gold)' }}>{v}</div>
                  </div>
                ))}
                <div style={{ gridColumn:'span 2' }}><DrawdownBar label="Daily DD" value={primary?.daily_dd_used??0} max={5}/></div>
                <div style={{ gridColumn:'span 2' }}><DrawdownBar label="Max DD" value={primary?.max_dd_used??0} max={10} warn={60} danger={80}/></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order panel */}
      <div style={{ width:200, flexShrink:0, background:'var(--bg2)', borderLeft:'1px solid var(--bdr)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'12px', borderBottom:'1px solid var(--bdr)' }}>
          <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Order Panel</div>
          <div style={{ display:'flex' }}>
            <button onClick={()=>setDir('buy')}
              style={{ flex:1, padding:'8px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', border:'none',
                background: dir==='buy' ? 'var(--green)' : 'rgba(0,217,126,.08)',
                color: dir==='buy' ? 'var(--bg)' : 'var(--green)' }}>Buy</button>
            <button onClick={()=>setDir('sell')}
              style={{ flex:1, padding:'8px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', border:'none',
                background: dir==='sell' ? 'var(--red)' : 'rgba(255,51,82,.08)',
                color: dir==='sell' ? 'white' : 'var(--red)' }}>Sell</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ textAlign:'center', padding:'8px', border:'1px solid var(--bdr)', background:'var(--bg3)' }}>
            <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{dir==='buy'?'Ask':'Bid'}</div>
            <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:500, color: inst.cur>=inst.prev?'var(--green)':'var(--red)' }}>
              {execPrice.toFixed(inst.dec)}
            </div>
          </div>

          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Order Type</div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              {['Market','Limit','Stop'].map(t=>(
                <button key={t} onClick={()=>setOrderType(t)}
                  style={{ flex:1, padding:'6px 0', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', border:'none',
                    background: orderType===t ? 'rgba(212,168,67,.12)' : 'transparent',
                    color: orderType===t ? 'var(--gold)' : 'var(--text3)' }}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Lot Size</div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              <button onClick={()=>setLots(l=>String(Math.max(0.01,parseFloat(l)-0.01).toFixed(2)))}
                style={{ padding:'0 8px', background:'transparent', border:'none', borderRight:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:14, fontWeight:'bold' }}>−</button>
              <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01"
                style={{ flex:1, textAlign:'center', padding:'8px 0', background:'transparent', border:'none', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:13 }}/>
              <button onClick={()=>setLots(l=>String((parseFloat(l)+0.01).toFixed(2)))}
                style={{ padding:'0 8px', background:'transparent', border:'none', borderLeft:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:14, fontWeight:'bold' }}>+</button>
            </div>
          </div>

          {[['Stop Loss',sl,setSl],['Take Profit',tp,setTp]].map(([l,v,set]:any)=>(
            <div key={l}>
              <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
              <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                <input value={v} onChange={e=>set(e.target.value)} placeholder="Optional" type="number"
                  style={{ flex:1, padding:'8px', background:'transparent', border:'none', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:12 }}/>
              </div>
            </div>
          ))}

          {!primary && (
            <div style={{ fontSize:9, color:'var(--red)', textAlign:'center', border:'1px solid rgba(255,51,82,.2)', padding:8 }}>No active account</div>
          )}

          <button onClick={()=>setConfirmOpen(true)} disabled={placing||!primary}
            style={{
              width:'100%', padding:'11px 0', fontSize:11, letterSpacing:2, textTransform:'uppercase', fontWeight:'bold',
              cursor: placing||!primary ? 'not-allowed' : 'pointer', border:'none', opacity: placing||!primary ? 0.4 : 1,
              background: dir==='buy' ? 'var(--green)' : 'var(--red)',
              color: dir==='buy' ? 'var(--bg)' : 'white',
            }}>
            {placing ? 'Placing…' : `${dir.toUpperCase()} ${lots} ${sym}`}
          </button>
        </div>
      </div>
    </div>

    {/* Confirm modal */}
    {confirmOpen && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:8000, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--bdr2)', padding:24, minWidth:320 }}>
          <div style={{ fontFamily:'serif', fontSize:19, fontWeight:'bold', marginBottom:4 }}>Confirm Order</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:16 }}>Review before executing</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {[['Symbol',sym],['Direction',dir.toUpperCase()],['Type',orderType],['Lots',lots],['Price',execPrice.toFixed(inst.dec)],['Account',primary?.account_number??'—']].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                <span style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', fontWeight:600 }}>{l}</span>
                <span style={{ fontFamily:'monospace', fontSize:12, color: v==='BUY'?'var(--green)':v==='SELL'?'var(--red)':'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={()=>setConfirmOpen(false)}
              style={{ padding:'8px 18px', background:'transparent', border:'1px solid var(--bdr2)', color:'var(--text2)', fontSize:9, letterSpacing:2, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer' }}>Cancel</button>
            <button onClick={placeOrder}
              style={{ padding:'8px 22px', border:'none', fontSize:9, letterSpacing:2, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer',
                background: dir==='buy' ? 'var(--green)' : 'var(--red)',
                color: dir==='buy' ? 'var(--bg)' : 'white' }}>
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
