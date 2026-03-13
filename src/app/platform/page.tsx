import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { DrawdownBar } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

// Map display symbols to TradingView & Binance WS symbols
const INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',  ws:'ethusdt',    spread:0.00020, dec:5, pip:0.0001,  fallback:1.08742 },
  { sym:'GBP/USD', tv:'FX:GBPUSD',  ws:'btcusdt',    spread:0.00020, dec:5, pip:0.0001,  fallback:1.26712 },
  { sym:'XAU/USD', tv:'TVC:GOLD',   ws:'xrpusdt',    spread:0.30,    dec:2, pip:0.10,    fallback:2341.80 },
  { sym:'NAS100',  tv:'NASDAQ:NDX', ws:'solusdt',     spread:1.0,     dec:1, pip:1.0,     fallback:17842.0 },
  { sym:'BTC/USD', tv:'BINANCE:BTCUSDT', ws:'btcusdt', spread:10.0,  dec:1, pip:1.0,     fallback:67180.0 },
  { sym:'USD/JPY', tv:'FX:USDJPY',  ws:'bnbusdt',    spread:0.020,   dec:3, pip:0.01,    fallback:151.420 },
  { sym:'ETH/USD', tv:'BINANCE:ETHUSDT', ws:'ethusdt', spread:1.0,   dec:2, pip:1.0,     fallback:3180.0  },
]
const TFS: Record<string,string> = {
  'M1':'1', 'M5':'5', 'M15':'15', 'M30':'30', 'H1':'60', 'H4':'240', 'D1':'D'
}

// TradingView Advanced Chart Widget
function TVChart({ tvSymbol, tf }: { tvSymbol: string; tf: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (!(window as any).TradingView) return
      widgetRef.current = new (window as any).TradingView.widget({
        container_id: 'tv_chart_container',
        symbol: tvSymbol,
        interval: TFS[tf] ?? '60',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#06060F',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        backgroundColor: '#06060F',
        gridColor: 'rgba(212,168,67,0.05)',
        width: '100%',
        height: '100%',
        allow_symbol_change: false,
        studies: [],
        disabled_features: [
          'use_localstorage_for_settings',
          'header_symbol_search',
          'header_compare',
          'header_undo_redo',
          'header_screenshot',
        ],
        enabled_features: ['hide_left_toolbar_by_default'],
        overrides: {
          'paneProperties.background': '#06060F',
          'paneProperties.backgroundType': 'solid',
          'scalesProperties.textColor': 'rgba(230,226,248,0.5)',
          'mainSeriesProperties.candleStyle.upColor': '#00D97E',
          'mainSeriesProperties.candleStyle.downColor': '#FF3352',
          'mainSeriesProperties.candleStyle.borderUpColor': '#00D97E',
          'mainSeriesProperties.candleStyle.borderDownColor': '#FF3352',
          'mainSeriesProperties.candleStyle.wickUpColor': '#00D97E',
          'mainSeriesProperties.candleStyle.wickDownColor': '#FF3352',
        },
      })
    }
    document.head.appendChild(script)

    return () => {
      if (widgetRef.current?.remove) widgetRef.current.remove()
    }
  }, [tvSymbol, tf])

  return <div id="tv_chart_container" ref={ref} style={{ width:'100%', height:'100%' }} />
}

// Live price via Binance WebSocket
function useLivePrice(wsSymbol: string, fallback: number) {
  const [price, setPrice] = useState(fallback)
  const [prev, setPrev] = useState(fallback)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    setPrice(fallback)
    setPrev(fallback)
    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@trade`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      const p = parseFloat(data.p)
      if (!isNaN(p)) {
        setPrice(prev => { setPrev(prev); return p })
      }
    }
    ws.onerror = () => {} // silently ignore errors
    return () => ws.close()
  }, [wsSymbol, fallback])

  return { price, prev }
}

export function PlatformPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary: defaultPrimary } = useAccount()
  const [selectedAccountId, setSelectedAccountId] = useState<string|null>(null)
  const primary = accounts.find(a => a.id === selectedAccountId) ?? defaultPrimary

  const [sym, setSym] = useState('BTC/USD')
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

  // Per-instrument prices via Binance WS — only active symbol connects
  const inst = INSTRUMENTS.find(i => i.sym === sym)!
  const { price: livePrice, prev: prevPrice } = useLivePrice(inst.ws, inst.fallback)

  // Watchlist prices — poll REST for non-active instruments
  const [watchPrices, setWatchPrices] = useState<Record<string,number>>(
    Object.fromEntries(INSTRUMENTS.map(i => [i.sym, i.fallback]))
  )

  useEffect(() => {
    // Update watchlist price for active symbol from WS
    setWatchPrices(p => ({ ...p, [sym]: livePrice }))
  }, [livePrice, sym])

  useEffect(() => {
    // Poll Binance REST for all other symbols every 3s
    const iv = setInterval(async () => {
      try {
        const symbols = INSTRUMENTS.filter(i => i.sym !== sym)
        const prices = await Promise.all(
          symbols.map(i =>
            fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${i.ws.toUpperCase()}`)
              .then(r => r.json())
              .then(d => ({ sym: i.sym, price: parseFloat(d.price) }))
              .catch(() => null)
          )
        )
        const updates: Record<string,number> = {}
        prices.forEach(p => { if (p && !isNaN(p.price)) updates[p.sym] = p.price })
        setWatchPrices(prev => ({ ...prev, ...updates }))
      } catch {}
    }, 3000)
    return () => clearInterval(iv)
  }, [sym])

  const [prevWatchPrices, setPrevWatchPrices] = useState<Record<string,number>>({})
  useEffect(() => {
    const timer = setTimeout(() => setPrevWatchPrices(watchPrices), 800)
    return () => clearTimeout(timer)
  }, [watchPrices])

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

  const execPrice = dir === 'buy' ? livePrice + inst.spread : livePrice

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
    const ti = INSTRUMENTS.find(p => p.sym === trade.symbol) ?? inst
    const cp = watchPrices[trade.symbol] ?? ti.fallback
    const closePrice = trade.direction === 'buy' ? cp : cp + ti.spread
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
    toast(netPnl >= 0 ? 'success':'warning','🔴','Closed', `${trade.symbol} ${netPnl>=0?'+':''}${fmt(netPnl)}`)
  }

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
          {INSTRUMENTS.map(i => {
            const cur = sym === i.sym ? livePrice : (watchPrices[i.sym] ?? i.fallback)
            const prv = sym === i.sym ? prevPrice : (prevWatchPrices[i.sym] ?? i.fallback)
            const up = cur >= prv
            return (
              <div key={i.sym} onClick={() => setSym(i.sym)}
                style={{
                  padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid rgba(212,168,67,.04)',
                  background: sym===i.sym ? 'rgba(212,168,67,.07)' : 'transparent',
                  borderLeft: sym===i.sym ? '2px solid var(--gold)' : '2px solid transparent',
                }}>
                <div style={{ fontWeight:600, fontSize:11, marginBottom:2 }}>{i.sym}</div>
                <div style={{ fontFamily:'monospace', fontSize:10, color: up ? 'var(--green)' : 'var(--red)' }}>
                  {cur.toFixed(i.dec)}
                </div>
                <div style={{ fontSize:8, color: up ? 'var(--green)' : 'var(--red)' }}>
                  {up?'▲':'▼'} {Math.abs(cur - prv).toFixed(i.dec)}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid var(--bdr)' }}>
          {accounts.length > 1 && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Account</div>
              <select
                value={selectedAccountId ?? primary?.id ?? ''}
                onChange={e => setSelectedAccountId(e.target.value)}
                style={{ width:'100%', padding:'5px 6px', background:'var(--bg3)', border:'1px solid var(--dim)', color:'var(--text)', fontSize:9, fontFamily:'monospace', outline:'none', cursor:'pointer' }}>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_number}</option>
                ))}
              </select>
            </div>
          )}
          {accounts.length === 1 && (
            <div style={{ marginBottom:8, padding:'5px 6px', background:'var(--bg3)', border:'1px solid var(--dim)', fontSize:9, fontFamily:'monospace', color:'var(--gold)' }}>
              {primary?.account_number ?? 'No account'}
            </div>
          )}
          <button onClick={() => navigate('/dashboard')}
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
          <span style={{ fontFamily:'monospace', fontSize:20, fontWeight:500, color: livePrice >= prevPrice ? 'var(--green)' : 'var(--red)' }}>
            {livePrice.toFixed(inst.dec)}
          </span>
          <span style={{ fontSize:10, color: livePrice >= prevPrice ? 'var(--green)' : 'var(--red)' }}>
            {livePrice >= prevPrice ? '▲' : '▼'} {Math.abs(livePrice - prevPrice).toFixed(inst.dec)}
          </span>
          <div style={{ marginLeft:'auto', display:'flex', gap:2 }}>
            {Object.keys(TFS).map(t => (
              <button key={t} onClick={() => setTf(t)}
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
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 5px var(--green)', animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:9, color:'var(--green)', letterSpacing:1.5, textTransform:'uppercase', fontWeight:600 }}>Live</span>
          </div>
        </div>

        {/* TradingView Chart */}
        <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
          <TVChart tvSymbol={inst.tv} tf={tf} />
        </div>

        {/* Bottom panel */}
        <div style={{ height:200, background:'var(--bg2)', borderTop:'1px solid var(--bdr)', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ display:'flex', borderBottom:'1px solid var(--bdr)' }}>
            {[['positions',`Positions (${openTrades.length})`],['history',`History (${closedTrades.length})`],['account','Account']].map(([k,l])=>(
              <button key={k} onClick={() => setTab(k)}
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
                      {['Symbol','Dir','Lots','Open Price','Current','P&L','SL','TP','Opened','Close'].map(h=>(
                        <th key={h} style={{ padding:'5px 10px', fontSize:7, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', textAlign:'left', fontWeight:600 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {openTrades.map(t => {
                        const ti = INSTRUMENTS.find(p => p.sym === t.symbol) ?? inst
                        const cur = t.symbol === sym ? livePrice : (watchPrices[t.symbol] ?? ti.fallback)
                        const diff = t.direction === 'buy' ? cur - t.open_price : t.open_price - cur
                        const pnl = parseFloat((diff / ti.pip * ti.pip * t.lots * 100000 * 0.1).toFixed(2))
                        return (
                          <tr key={t.id} style={{ borderBottom:'1px solid rgba(212,168,67,.04)' }}>
                            <td style={{ padding:'6px 10px', fontWeight:600 }}>{t.symbol}</td>
                            <td style={{ padding:'6px 10px' }}><span style={{ fontSize:8, fontWeight:'bold', color: t.direction==='buy'?'var(--green)':'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.lots}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace' }}>{t.open_price}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color: cur >= t.open_price ? 'var(--green)' : 'var(--red)' }}>{cur.toFixed(ti.dec)}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:600, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--red)' }}>{t.sl ?? '—'}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', color:'var(--green)' }}>{t.tp ?? '—'}</td>
                            <td style={{ padding:'6px 10px', fontFamily:'monospace', fontSize:9, color:'var(--text3)' }}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                            <td style={{ padding:'6px 10px' }}>
                              <button onClick={() => closeTrade(t)}
                                style={{ padding:'3px 8px', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', background:'rgba(255,51,82,.1)', color:'var(--red)', border:'1px solid rgba(255,51,82,.2)' }}>
                                ✕ Close
                              </button>
                            </td>
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
                {[['Balance',fmt(primary?.balance??0)],['Equity',fmt(primary?.equity??0)],['Open P&L',fmt(openTrades.reduce((s,t)=>{
                  const ti = INSTRUMENTS.find(p=>p.sym===t.symbol)??inst
                  const cur = watchPrices[t.symbol]??ti.fallback
                  const diff = t.direction==='buy'?cur-t.open_price:t.open_price-cur
                  return s + parseFloat((diff/ti.pip*ti.pip*t.lots*100000*0.1).toFixed(2))
                },0))],['Account',primary?.account_number??'—']].map(([l,v])=>(
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
            <button onClick={() => setDir('buy')}
              style={{ flex:1, padding:'8px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', border:'none',
                background: dir==='buy' ? 'var(--green)' : 'rgba(0,217,126,.08)',
                color: dir==='buy' ? 'var(--bg)' : 'var(--green)' }}>Buy</button>
            <button onClick={() => setDir('sell')}
              style={{ flex:1, padding:'8px 0', fontSize:10, letterSpacing:1, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', border:'none',
                background: dir==='sell' ? 'var(--red)' : 'rgba(255,51,82,.08)',
                color: dir==='sell' ? 'white' : 'var(--red)' }}>Sell</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ textAlign:'center', padding:'8px', border:'1px solid var(--bdr)', background:'var(--bg3)' }}>
            <div style={{ fontSize:8, letterSpacing:1.5, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{dir==='buy'?'Ask':'Bid'}</div>
            <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:500, color: livePrice>=prevPrice?'var(--green)':'var(--red)' }}>
              {execPrice.toFixed(inst.dec)}
            </div>
          </div>

          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Order Type</div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              {['Market','Limit','Stop'].map(t=>(
                <button key={t} onClick={() => setOrderType(t)}
                  style={{ flex:1, padding:'6px 0', fontSize:8, textTransform:'uppercase', fontWeight:'bold', cursor:'pointer', border:'none',
                    background: orderType===t ? 'rgba(212,168,67,.12)' : 'transparent',
                    color: orderType===t ? 'var(--gold)' : 'var(--text3)' }}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>Lot Size</div>
            <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
              <button onClick={() => setLots(l => String(Math.max(0.01, parseFloat(l)-0.01).toFixed(2)))}
                style={{ padding:'0 8px', background:'transparent', border:'none', borderRight:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:14, fontWeight:'bold' }}>−</button>
              <input value={lots} onChange={e => setLots(e.target.value)} type="number" step="0.01" min="0.01"
                style={{ flex:1, textAlign:'center', padding:'8px 0', background:'transparent', border:'none', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:13 }}/>
              <button onClick={() => setLots(l => String((parseFloat(l)+0.01).toFixed(2)))}
                style={{ padding:'0 8px', background:'transparent', border:'none', borderLeft:'1px solid var(--dim)', cursor:'pointer', color:'var(--text3)', fontSize:14, fontWeight:'bold' }}>+</button>
            </div>
          </div>

          {[['Stop Loss',sl,setSl],['Take Profit',tp,setTp]].map(([l,v,set]:any)=>(
            <div key={l}>
              <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase', color:'var(--text3)', fontWeight:600, marginBottom:4 }}>{l}</div>
              <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--dim)' }}>
                <input value={v} onChange={e => set(e.target.value)} placeholder="Optional" type="number"
                  style={{ flex:1, padding:'8px', background:'transparent', border:'none', outline:'none', color:'var(--text)', fontFamily:'monospace', fontSize:12 }}/>
              </div>
            </div>
          ))}

          {!primary && (
            <div style={{ fontSize:9, color:'var(--red)', textAlign:'center', border:'1px solid rgba(255,51,82,.2)', padding:8 }}>No active account</div>
          )}

          <button onClick={() => setConfirmOpen(true)} disabled={placing||!primary}
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
            <button onClick={() => setConfirmOpen(false)}
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
