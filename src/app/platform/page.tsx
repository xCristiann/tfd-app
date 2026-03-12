import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { DrawdownBar } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

const INSTRUMENTS = [
  { sym:'EUR/USD', bid:1.08742, spread:0.0002, decimals:5 },
  { sym:'GBP/USD', bid:1.26712, spread:0.0002, decimals:5 },
  { sym:'XAU/USD', bid:2341.80, spread:0.30,   decimals:2 },
  { sym:'NAS100',  bid:17842,   spread:1.0,    decimals:1 },
  { sym:'BTC/USD', bid:67180,   spread:10,     decimals:1 },
  { sym:'USD/JPY', bid:151.42,  spread:0.02,   decimals:3 },
  { sym:'WTI/USD', bid:82.14,   spread:0.04,   decimals:2 },
]

const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1']

function CandleChart({ symbol, tf }: { symbol: string; tf: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const W = c.parentElement!.clientWidth
    const H = c.parentElement!.clientHeight
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    const inst = INSTRUMENTS.find(i=>i.sym===symbol) ?? INSTRUMENTS[0]
    const candles: number[][] = []
    let base = inst.bid
    for (let i = 0; i < 60; i++) {
      const o = base, move = (Math.random()-0.48)*inst.bid*0.001
      const cl = o+move, h = Math.max(o,cl)+Math.random()*inst.bid*0.0005
      const l = Math.min(o,cl)-Math.random()*inst.bid*0.0005
      candles.push([o,h,l,cl]); base = cl
    }
    const prices = candles.flat(), mn = Math.min(...prices), mx = Math.max(...prices)
    const pad = {t:20,b:30,l:8,r:72}
    const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b
    const toY = (v:number) => pad.t+cH-((v-mn)/(mx-mn))*cH
    const cw = Math.max(3,Math.floor(cW/candles.length)-1)
    ctx.fillStyle='#06060F'; ctx.fillRect(0,0,W,H)
    ctx.strokeStyle='rgba(212,168,67,.05)'; ctx.lineWidth=1
    for(let i=0;i<=6;i++){const y=pad.t+(cH/6)*i;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke()}
    candles.forEach((cd,i)=>{
      const [o,h,l,cl]=cd, x=pad.l+i*(cw+1), bull=cl>=o, color=bull?'#00D97E':'#FF3352'
      ctx.strokeStyle=color; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(x+cw/2,toY(h)); ctx.lineTo(x+cw/2,toY(l)); ctx.stroke()
      ctx.fillStyle=color; ctx.fillRect(x,Math.min(toY(o),toY(cl)),cw,Math.max(1,Math.abs(toY(o)-toY(cl))))
    })
    const last = candles[candles.length-1][3]
    ctx.strokeStyle='rgba(212,168,67,.6)'; ctx.lineWidth=1; ctx.setLineDash([4,4])
    ctx.beginPath(); ctx.moveTo(pad.l,toY(last)); ctx.lineTo(W-pad.r,toY(last)); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle='#D4A843'; ctx.fillRect(W-pad.r,toY(last)-9,pad.r,18)
    ctx.fillStyle='#06060F'; ctx.font='bold 10px monospace'; ctx.textAlign='left'
    ctx.fillText(last.toFixed(inst.decimals),W-pad.r+3,toY(last)+4)
    ctx.fillStyle='rgba(230,226,248,.2)'; ctx.font='9px monospace'; ctx.textAlign='left'
    for(let i=0;i<=4;i++){const v=mn+((mx-mn)/4)*(4-i);ctx.fillText(v.toFixed(inst.decimals),W-pad.r+2,pad.t+(cH/4)*i+4)}
  },[symbol,tf])
  return <canvas ref={ref} style={{width:'100%',height:'100%'}}/>
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
  const [activeTab, setActiveTab] = useState('positions')
  const [prices, setPrices] = useState(INSTRUMENTS.map(i => ({ ...i, prev: i.bid })))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [openTrades, setOpenTrades] = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])
  const [placing, setPlacing] = useState(false)

  // Live price simulation
  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(p => p.map(i => {
        const move = (Math.random()-0.49)*i.bid*0.0003
        return { ...i, prev: i.bid, bid: i.bid + move }
      }))
    }, 800)
    return () => clearInterval(iv)
  }, [])

  // Load trades from DB
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
  const askPrice = inst.bid + inst.spread

  async function placeOrder() {
    if (!primary) { toast('error','❌','No Account','No active trading account.'); return }
    setPlacing(true)
    setConfirmOpen(false)
    const { data, error } = await supabase.from('trades').insert({
      account_id: primary.id,
      user_id: primary.user_id,
      symbol: sym,
      direction: dir,
      lots: parseFloat(lots),
      order_type: orderType.toLowerCase(),
      open_price: parseFloat(askPrice.toFixed(inst.decimals)),
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      status: 'open',
      opened_at: new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error', error.message); return }
    setOpenTrades(t => [data, ...t])
    toast('success','⚡','Order Placed',`${dir.toUpperCase()} ${lots} ${sym} @ ${askPrice.toFixed(inst.decimals)}`)
    setSl(''); setTp('')
  }

  async function closeTrade(trade: any) {
    const closeInst = prices.find(p => p.sym === trade.symbol) ?? prices[0]
    const closePrice = dir === 'buy' ? closeInst.bid : closeInst.bid + closeInst.spread
    const priceDiff = trade.direction === 'buy'
      ? closePrice - trade.open_price
      : trade.open_price - closePrice
    const pips = parseFloat((priceDiff / (trade.symbol.includes('JPY') ? 0.01 : 0.0001)).toFixed(1))
    const netPnl = parseFloat((priceDiff * trade.lots * 100000 * 0.0001).toFixed(2))

    const { error } = await supabase.from('trades').update({
      status: 'closed',
      close_price: parseFloat(closePrice.toFixed(closeInst.decimals)),
      closed_at: new Date().toISOString(),
      pips,
      net_pnl: netPnl,
      gross_pnl: netPnl,
    }).eq('id', trade.id)

    if (error) { toast('error','❌','Error', error.message); return }
    setOpenTrades(t => t.filter(x => x.id !== trade.id))
    setClosedTrades(t => [{ ...trade, status:'closed', close_price: closePrice, net_pnl: netPnl }, ...t])
    toast(netPnl >= 0 ? 'success' : 'warning','🔴','Closed',
      `${trade.symbol} closed ${netPnl >= 0 ? '+' : ''}${fmt(netPnl)}`)
  }

  const inp = "flex-1 px-2 py-[8px] bg-transparent outline-none text-[var(--text)] font-mono text-[12px] placeholder-[rgba(230,226,248,.25)]"

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Watchlist */}
      <div className="w-[158px] flex-shrink-0 bg-[var(--bg2)] border-r border-[var(--bdr)] flex flex-col">
        <div className="flex items-center gap-2 px-3 py-[11px] border-b border-[var(--bdr)]">
          <div className="w-[20px] h-[20px] border border-[var(--gold)] flex items-center justify-center text-[9px] text-[var(--gold)]">✦</div>
          <span className="font-serif text-[11px] font-bold leading-tight">TFD<br/>Terminal</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {prices.map(p => (
            <div key={p.sym} onClick={() => setSym(p.sym)}
              className={`px-3 py-[8px] cursor-pointer border-b border-[rgba(212,168,67,.04)] transition-colors ${sym===p.sym?'bg-[rgba(212,168,67,.07)] border-l-2 border-l-[var(--gold)]':'hover:bg-[rgba(212,168,67,.03)]'}`}>
              <div className="font-semibold text-[11px] mb-[1px]">{p.sym}</div>
              <div className={`font-mono text-[10px] ${p.bid>=p.prev?'text-[var(--green)]':'text-[var(--red)]'}`}>
                {p.bid.toFixed(p.decimals)}
              </div>
              <div className={`text-[8px] ${p.bid>=p.prev?'text-[var(--green)]':'text-[var(--red)]'}`}>
                {p.bid >= p.prev ? '▲' : '▼'} {Math.abs(p.bid-p.prev).toFixed(p.decimals)}
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-[var(--bdr)]">
          <button onClick={() => navigate('/dashboard')} className="w-full text-[9px] tracking-[1px] uppercase text-[var(--text3)] hover:text-[var(--gold)] transition-colors cursor-pointer bg-none border-none text-center">← Dashboard</button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[44px] bg-[var(--bg2)] border-b border-[var(--bdr)] flex items-center px-4 gap-4 flex-shrink-0">
          <span className="font-serif text-[16px] font-bold">{sym}</span>
          <span className={`font-mono text-[20px] font-medium ${inst.bid>=inst.prev?'text-[var(--green)]':'text-[var(--red)]'}`}>
            {inst.bid.toFixed(inst.decimals)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {TIMEFRAMES.map(t=>(
              <button key={t} onClick={()=>setTf(t)}
                className={`px-[7px] py-[3px] text-[9px] font-mono font-bold cursor-pointer border transition-all ${tf===t?'bg-[rgba(212,168,67,.15)] border-[var(--bdr2)] text-[var(--gold)]':'bg-transparent border-transparent text-[var(--text3)] hover:text-[var(--text2)]'}`}>{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-[5px] h-[5px] rounded-full bg-[var(--green)] shadow-[0_0_5px_var(--green)] animate-pulse"/>
            <span className="text-[9px] text-[var(--green)] tracking-[1.5px] uppercase font-semibold">Live</span>
          </div>
        </div>

        <div className="flex-1 relative"><CandleChart symbol={sym} tf={tf}/></div>

        {/* Bottom panel */}
        <div className="h-[200px] bg-[var(--bg2)] border-t border-[var(--bdr)] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[var(--bdr)]">
            {[
              ['positions', `Positions (${openTrades.length})`],
              ['history', `History (${closedTrades.length})`],
              ['account','Account'],
            ].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`px-[14px] py-[7px] text-[9px] tracking-[1px] uppercase font-semibold cursor-pointer border-none border-b-2 -mb-[1px] transition-all ${activeTab===k?'text-[var(--gold)] border-b-[var(--gold)] bg-[rgba(212,168,67,.04)]':'text-[var(--text3)] border-b-transparent bg-transparent hover:text-[var(--text2)]'}`}>{l}</button>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {activeTab==='positions' && (
              openTrades.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[var(--text3)] text-[11px]">No open positions</div>
              ) : (
                <table className="w-full border-collapse text-[10px]">
                  <thead><tr className="border-b border-[var(--dim)]">
                    {['Symbol','Dir','Lots','Open Price','SL','TP','Opened','Close'].map(h=>(
                      <th key={h} className="px-[10px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {openTrades.map(t=>(
                      <tr key={t.id} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.02)]">
                        <td className="px-[10px] py-[6px] font-semibold">{t.symbol}</td>
                        <td className="px-[10px] py-[6px]"><span className={`text-[8px] font-bold ${t.direction==='buy'?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.direction.toUpperCase()}</span></td>
                        <td className="px-[10px] py-[6px] font-mono">{t.lots}</td>
                        <td className="px-[10px] py-[6px] font-mono">{t.open_price}</td>
                        <td className="px-[10px] py-[6px] font-mono text-[var(--red)]">{t.sl ?? '—'}</td>
                        <td className="px-[10px] py-[6px] font-mono text-[var(--green)]">{t.tp ?? '—'}</td>
                        <td className="px-[10px] py-[6px] font-mono text-[var(--text3)] text-[9px]">{new Date(t.opened_at).toLocaleTimeString()}</td>
                        <td className="px-[10px] py-[6px]">
                          <button onClick={() => closeTrade(t)}
                            className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">✕ Close</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
            {activeTab==='history' && (
              closedTrades.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[var(--text3)] text-[11px]">No trade history</div>
              ) : (
                <table className="w-full border-collapse text-[10px]">
                  <thead><tr className="border-b border-[var(--dim)]">
                    {['Symbol','Dir','Lots','Open','Close','Pips','Net P&L','Closed At'].map(h=>(
                      <th key={h} className="px-[10px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {closedTrades.map(t=>(
                      <tr key={t.id} className="border-b border-[rgba(212,168,67,.04)]">
                        <td className="px-[10px] py-[6px] font-semibold">{t.symbol}</td>
                        <td className="px-[10px] py-[6px]"><span className={`text-[8px] font-bold ${t.direction==='buy'?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.direction.toUpperCase()}</span></td>
                        <td className="px-[10px] py-[6px] font-mono">{t.lots}</td>
                        <td className="px-[10px] py-[6px] font-mono">{t.open_price}</td>
                        <td className="px-[10px] py-[6px] font-mono">{t.close_price ?? '—'}</td>
                        <td className={`px-[10px] py-[6px] font-mono ${(t.pips??0)>=0?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.pips != null ? `${t.pips>0?'+':''}${t.pips}` : '—'}</td>
                        <td className={`px-[10px] py-[6px] font-mono font-semibold ${(t.net_pnl??0)>=0?'text-[var(--green)]':'text-[var(--red)]'}`}>{t.net_pnl != null ? `${t.net_pnl>=0?'+':''}${fmt(t.net_pnl)}` : '—'}</td>
                        <td className="px-[10px] py-[6px] font-mono text-[var(--text3)] text-[9px]">{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
            {activeTab==='account' && (
              <div className="grid grid-cols-4 gap-4 p-4">
                {[
                  ['Balance',   fmt(primary?.balance ?? 0)],
                  ['Equity',    fmt(primary?.equity  ?? 0)],
                  ['Open Trades', String(openTrades.length)],
                  ['Account',   primary?.account_number ?? '—'],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div>
                    <div className="font-mono text-[13px] text-[var(--gold)]">{v}</div>
                  </div>
                ))}
                <div className="col-span-2"><DrawdownBar label="Daily DD" value={primary?.daily_dd_used ?? 0} max={5}/></div>
                <div className="col-span-2"><DrawdownBar label="Max DD" value={primary?.max_dd_used ?? 0} max={10} warn={60} danger={80}/></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Panel */}
      <div className="w-[198px] flex-shrink-0 bg-[var(--bg2)] border-l border-[var(--bdr)] flex flex-col">
        <div className="px-3 py-3 border-b border-[var(--bdr)]">
          <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-2">Order Panel</div>
          <div className="flex">
            <button onClick={()=>setDir('buy')} className={`flex-1 py-[8px] text-[10px] tracking-[1px] uppercase font-bold cursor-pointer border-none transition-all ${dir==='buy'?'bg-[var(--green)] text-[var(--bg)]':'bg-[rgba(0,217,126,.08)] text-[var(--green)]'}`}>Buy</button>
            <button onClick={()=>setDir('sell')} className={`flex-1 py-[8px] text-[10px] tracking-[1px] uppercase font-bold cursor-pointer border-none transition-all ${dir==='sell'?'bg-[var(--red)] text-white':'bg-[rgba(255,51,82,.08)] text-[var(--red)]'}`}>Sell</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          <div className="text-center py-2 border border-[var(--bdr)] bg-[var(--bg3)]">
            <div className="text-[8px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{dir==='buy'?'Ask':'Bid'}</div>
            <div className={`font-mono text-[18px] font-semibold ${inst.bid>=inst.prev?'text-[var(--green)]':'text-[var(--red)]'}`}>
              {askPrice.toFixed(inst.decimals)}
            </div>
          </div>
          <div>
            <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1">Order Type</div>
            <div className="flex bg-[var(--bg3)] border border-[var(--dim)]">
              {['Market','Limit','Stop'].map(t=>(
                <button key={t} onClick={()=>setOrderType(t)} className={`flex-1 py-[6px] text-[8px] tracking-[1px] uppercase font-bold cursor-pointer border-none transition-all ${orderType===t?'bg-[rgba(212,168,67,.12)] text-[var(--gold)]':'bg-transparent text-[var(--text3)]'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1">Lot Size</div>
            <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
              <button onClick={()=>setLots(l=>String(Math.max(0.01,parseFloat(l)-0.01).toFixed(2)))} className="px-2 text-[var(--text3)] hover:text-[var(--gold)] cursor-pointer bg-transparent border-r border-[var(--dim)] font-bold text-[14px]">−</button>
              <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01" className="flex-1 text-center py-[8px] bg-transparent outline-none text-[var(--text)] font-mono text-[13px]"/>
              <button onClick={()=>setLots(l=>String((parseFloat(l)+0.01).toFixed(2)))} className="px-2 text-[var(--text3)] hover:text-[var(--gold)] cursor-pointer bg-transparent border-l border-[var(--dim)] font-bold text-[14px]">+</button>
            </div>
          </div>
          {[['Stop Loss',sl,setSl],['Take Profit',tp,setTp]].map(([l,v,set]:any)=>(
            <div key={l}>
              <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div>
              <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
                <input value={v} onChange={e=>set(e.target.value)} placeholder="Optional" type="number" className={inp}/>
              </div>
            </div>
          ))}
          {!primary && (
            <div className="text-[9px] text-[var(--red)] text-center border border-[rgba(255,51,82,.2)] p-2">No active account</div>
          )}
          <button onClick={()=>setConfirmOpen(true)} disabled={placing || !primary}
            className={`w-full py-[11px] text-[11px] tracking-[2px] uppercase font-bold cursor-pointer border-none transition-all disabled:opacity-40 ${dir==='buy'?'bg-[var(--green)] text-[var(--bg)]':'bg-[var(--red)] text-white'}`}>
            {placing ? 'Placing…' : `${dir.toUpperCase()} ${lots} ${sym}`}
          </button>
        </div>
      </div>
    </div>

    {/* Confirm modal */}
    {confirmOpen && (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[8000] flex items-center justify-center">
        <div className="bg-[var(--bg2)] border border-[var(--bdr2)] p-[22px] min-w-[320px]">
          <div className="font-serif text-[19px] font-bold mb-1">Confirm Order</div>
          <div className="text-[11px] text-[var(--text2)] mb-4">Review before executing</div>
          <div className="flex flex-col gap-2 mb-4">
            {[['Symbol',sym],['Direction',dir.toUpperCase()],['Type',orderType],['Lots',lots],['Price',askPrice.toFixed(inst.decimals)],['Account',primary?.account_number ?? '—']].map(([l,v])=>(
              <div key={l} className="flex justify-between py-[6px] px-[10px] bg-[var(--bg3)] border border-[var(--dim)]">
                <span className="text-[8px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold">{l}</span>
                <span className={`font-mono text-[12px] ${v==='BUY'?'text-[var(--green)]':v==='SELL'?'text-[var(--red)]':'text-[var(--text)]'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setConfirmOpen(false)} className="px-[18px] py-[8px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer">Cancel</button>
            <button onClick={placeOrder} className={`px-[22px] py-[8px] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none ${dir==='buy'?'bg-[var(--green)] text-[var(--bg)]':'bg-[var(--red)] text-white'}`}>
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
