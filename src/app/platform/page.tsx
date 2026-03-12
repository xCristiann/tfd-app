import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { DrawdownBar } from '@/components/ui/Card'

const INSTRUMENTS = [
  { sym:'EUR/USD', bid:'1.08742', ask:'1.08744', chg:'+0.0032', pos:true },
  { sym:'GBP/USD', bid:'1.26712', ask:'1.26715', chg:'+0.0018', pos:true },
  { sym:'XAU/USD', bid:'2341.80', ask:'2342.10', chg:'+8.40',   pos:true },
  { sym:'NAS100',  bid:'17842',   ask:'17843',   chg:'-48',     pos:false },
  { sym:'BTC/USD', bid:'67180',   ask:'67190',   chg:'+820',    pos:true },
  { sym:'USD/JPY', bid:'151.42',  ask:'151.44',  chg:'-0.42',   pos:false },
  { sym:'WTI/USD', bid:'82.14',   ask:'82.16',   chg:'+0.84',   pos:true },
]

const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1']
const OPEN_POS = [
  { sym:'EUR/USD', dir:'BUY',  lots:'0.50', open:'1.08420', cur:'1.08742', sl:'1.08100', tp:'1.09200', pnl:'+$161', pos:true  },
  { sym:'XAU/USD', dir:'SELL', lots:'0.20', open:'2348.40', cur:'2341.80', sl:'2360.00', tp:'2320.00', pnl:'+$264', pos:true  },
  { sym:'NAS100',  dir:'BUY',  lots:'0.10', open:'17890',   cur:'17842',   sl:'17700',   tp:'18200',   pnl:'-$48',  pos:false },
]

function CandleChart({ symbol, tf }: { symbol: string; tf: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const parent = c.parentElement!
    const W = parent.clientWidth, H = parent.clientHeight
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    const candles: number[][] = []
    let base = 1.0850
    for (let i = 0; i < 60; i++) {
      const o = base, move = (Math.random() - 0.48) * 0.003
      const cl = o + move, h = Math.max(o,cl) + Math.random()*0.0015, l = Math.min(o,cl) - Math.random()*0.0015
      candles.push([o,h,l,cl]); base = cl
    }
    const prices = candles.flat(), mn = Math.min(...prices), mx = Math.max(...prices)
    const pad = { t:20, b:30, l:8, r:60 }
    const cW = W-pad.l-pad.r, cH = H-pad.t-pad.b
    const toY = (v:number) => pad.t + cH - ((v-mn)/(mx-mn))*cH
    const cw = Math.max(3, Math.floor(cW/candles.length)-1)
    ctx.fillStyle='#06060F'; ctx.fillRect(0,0,W,H)
    ctx.strokeStyle='rgba(212,168,67,.04)'; ctx.lineWidth=1
    for(let i=0;i<=6;i++){const y=pad.t+(cH/6)*i;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke()}
    for(let i=0;i<=8;i++){const x=pad.l+(cW/8)*i;ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+cH);ctx.stroke()}
    ctx.fillStyle='rgba(230,226,248,.25)'; ctx.font='10px DM Mono'; ctx.textAlign='left'
    for(let i=0;i<=4;i++){const v=mn+((mx-mn)/4)*(4-i);ctx.fillText(v.toFixed(5),W-pad.r+4,pad.t+(cH/4)*i+4)}
    candles.forEach((cd,i)=>{
      const [o,h,l,cl]=cd, x=pad.l+i*(cw+1), bull=cl>=o, color=bull?'#00D97E':'#FF3352'
      ctx.strokeStyle=color; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+cw/2,toY(h)); ctx.lineTo(x+cw/2,toY(l)); ctx.stroke()
      ctx.fillStyle=color; ctx.fillRect(x,Math.min(toY(o),toY(cl)),cw,Math.max(1,Math.abs(toY(o)-toY(cl))))
    })
    const last=candles[candles.length-1][3]
    ctx.strokeStyle='rgba(212,168,67,.6)'; ctx.lineWidth=1; ctx.setLineDash([4,4])
    ctx.beginPath(); ctx.moveTo(pad.l,toY(last)); ctx.lineTo(W-pad.r,toY(last)); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle='#D4A843'; ctx.fillRect(W-pad.r,toY(last)-9,pad.r,18)
    ctx.fillStyle='#06060F'; ctx.font='bold 10px DM Mono'; ctx.fillText(last.toFixed(5),W-pad.r+2,toY(last)+4)
  }, [symbol,tf])
  return <canvas ref={ref} style={{width:'100%',height:'100%'}}/>
}

export function PlatformPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [sym, setSym] = useState('EUR/USD')
  const [tf, setTf] = useState('H1')
  const [dir, setDir] = useState<'BUY'|'SELL'>('BUY')
  const [lots, setLots] = useState('0.10')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [orderType, setOrderType] = useState('Market')
  const [activeTab, setActiveTab] = useState('positions')
  const [prices, setPrices] = useState(INSTRUMENTS)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const inst = prices.find(p=>p.sym===sym) ?? prices[0]

  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(p=>p.map(i=>{
        const base = parseFloat(i.bid.replace(/,/g,''))
        const move = (Math.random()-0.49)*0.0005
        const nb = base + move
        const bid = i.sym.includes('JPY') ? nb.toFixed(3) :
          (i.sym==='XAU/USD'||i.sym==='NAS100') ? nb.toFixed(2) :
          i.sym==='BTC/USD' ? Math.round(nb).toLocaleString() : nb.toFixed(5)
        return {...i, bid, pos: move>=0}
      }))
    }, 700)
    return () => clearInterval(iv)
  }, [])

  function placeOrder() { setConfirmOpen(false); toast('success','⚡','Order Placed',`${dir} ${lots} ${sym} executed`) }

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
          {prices.map(p=>(
            <div key={p.sym} onClick={()=>setSym(p.sym)}
              className={`px-3 py-[8px] cursor-pointer border-b border-[rgba(212,168,67,.04)] transition-colors ${sym===p.sym?'bg-[rgba(212,168,67,.07)] border-l-2 border-l-[var(--gold)]':'hover:bg-[rgba(212,168,67,.03)]'}`}>
              <div className="font-semibold text-[11px] mb-[1px]">{p.sym}</div>
              <div className={`font-mono text-[10px] ${p.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{p.bid}</div>
              <div className={`text-[8px] ${p.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{p.chg}</div>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-[var(--bdr)]">
          <button onClick={()=>navigate('/dashboard')} className="w-full text-[9px] tracking-[1px] uppercase text-[var(--text3)] hover:text-[var(--gold)] transition-colors cursor-pointer bg-none border-none text-center">← Dashboard</button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-[44px] bg-[var(--bg2)] border-b border-[var(--bdr)] flex items-center px-4 gap-4 flex-shrink-0">
          <span className="font-serif text-[16px] font-bold">{sym}</span>
          <span className={`font-mono text-[20px] font-medium ${inst.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{inst.bid}</span>
          <span className={`text-[11px] ${inst.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{inst.chg}</span>
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

        {/* Chart */}
        <div className="flex-1 relative"><CandleChart symbol={sym} tf={tf}/></div>

        {/* Bottom panel */}
        <div className="h-[200px] bg-[var(--bg2)] border-t border-[var(--bdr)] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[var(--bdr)]">
            {[['positions','Positions (3)'],['pending','Pending'],['history','History'],['account','Account']].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`px-[14px] py-[7px] text-[9px] tracking-[1px] uppercase font-semibold cursor-pointer border-none border-b-2 -mb-[1px] transition-all ${activeTab===k?'text-[var(--gold)] border-b-[var(--gold)] bg-[rgba(212,168,67,.04)]':'text-[var(--text3)] border-b-transparent bg-transparent hover:text-[var(--text2)]'}`}>{l}</button>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {activeTab==='positions'&&(
              <table className="w-full border-collapse text-[10px]">
                <thead><tr className="border-b border-[var(--dim)]">{['Symbol','Dir','Lots','Open','Current','SL','TP','Float P&L','Close'].map(h=><th key={h} className="px-[10px] py-[5px] text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {OPEN_POS.map((p,i)=>(
                    <tr key={i} className="border-b border-[rgba(212,168,67,.04)] hover:bg-[rgba(212,168,67,.02)]">
                      <td className="px-[10px] py-[6px] font-semibold">{p.sym}</td>
                      <td className="px-[10px] py-[6px]"><span className={`text-[8px] font-bold ${p.dir==='BUY'?'text-[var(--green)]':'text-[var(--red)]'}`}>{p.dir}</span></td>
                      <td className="px-[10px] py-[6px] font-mono">{p.lots}</td>
                      <td className="px-[10px] py-[6px] font-mono">{p.open}</td>
                      <td className={`px-[10px] py-[6px] font-mono ${p.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{p.cur}</td>
                      <td className="px-[10px] py-[6px] font-mono text-[var(--red)]">{p.sl}</td>
                      <td className="px-[10px] py-[6px] font-mono text-[var(--green)]">{p.tp}</td>
                      <td className={`px-[10px] py-[6px] font-mono font-semibold ${p.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{p.pnl}</td>
                      <td className="px-[10px] py-[6px]">
                        <button onClick={()=>toast('warning','🔴','Closed',`${p.sym} closed`)}
                          className="px-[8px] py-[3px] text-[8px] uppercase font-bold cursor-pointer bg-[rgba(255,51,82,.1)] text-[var(--red)] border border-[rgba(255,51,82,.2)]">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab==='account'&&(
              <div className="grid grid-cols-4 gap-4 p-4">
                {[['Balance','$108,420'],['Equity','$108,877'],['Margin Used','$215.00'],['Free Margin','$108,662']].map(([l,v])=>(
                  <div key={l}><div className="text-[7px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">{l}</div><div className="font-mono text-[13px] text-[var(--gold)]">{v}</div></div>
                ))}
                <div className="col-span-2"><DrawdownBar label="Daily DD" value={0.84} max={5}/></div>
                <div className="col-span-2"><DrawdownBar label="Max DD" value={3.21} max={10} warn={60} danger={80}/></div>
              </div>
            )}
            {['pending','history'].includes(activeTab)&&<div className="flex items-center justify-center h-full text-[var(--text3)] text-[11px]">No data</div>}
          </div>
        </div>
      </div>

      {/* Order Panel */}
      <div className="w-[198px] flex-shrink-0 bg-[var(--bg2)] border-l border-[var(--bdr)] flex flex-col">
        <div className="px-3 py-3 border-b border-[var(--bdr)]">
          <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-2">Order Panel</div>
          <div className="flex">
            <button onClick={()=>setDir('BUY')} className={`flex-1 py-[8px] text-[10px] tracking-[1px] uppercase font-bold cursor-pointer border-none transition-all ${dir==='BUY'?'bg-[var(--green)] text-[var(--bg)]':'bg-[rgba(0,217,126,.08)] text-[var(--green)]'}`}>Buy</button>
            <button onClick={()=>setDir('SELL')} className={`flex-1 py-[8px] text-[10px] tracking-[1px] uppercase font-bold cursor-pointer border-none transition-all ${dir==='SELL'?'bg-[var(--red)] text-white':'bg-[rgba(255,51,82,.08)] text-[var(--red)]'}`}>Sell</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
          <div className="text-center py-2 border border-[var(--bdr)] bg-[var(--bg3)]">
            <div className="text-[8px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold mb-1">Ask</div>
            <div className={`font-mono text-[18px] font-semibold ${inst.pos?'text-[var(--green)]':'text-[var(--red)]'}`}>{inst.ask}</div>
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
              <button onClick={()=>setLots(l=>String(Math.max(0.01,parseFloat(l)-0.01).toFixed(2)))} className="px-2 text-[var(--text3)] hover:text-[var(--gold)] cursor-pointer bg-transparent border-r border-[var(--dim)] font-bold text-[14px] leading-none">−</button>
              <input value={lots} onChange={e=>setLots(e.target.value)} type="number" step="0.01" min="0.01" className="flex-1 text-center py-[8px] bg-transparent outline-none text-[var(--text)] font-mono text-[13px]"/>
              <button onClick={()=>setLots(l=>String((parseFloat(l)+0.01).toFixed(2)))} className="px-2 text-[var(--text3)] hover:text-[var(--gold)] cursor-pointer bg-transparent border-l border-[var(--dim)] font-bold text-[14px] leading-none">+</button>
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
          <div className="bg-[var(--bg3)] border border-[var(--dim)] p-[8px] text-[9px]">
            <div className="flex justify-between text-[var(--text3)] mb-1"><span>Est. Margin</span><span className="font-mono text-[var(--text2)]">$108.00</span></div>
            <div className="flex justify-between text-[var(--text3)]"><span>Pip value</span><span className="font-mono text-[var(--text2)]">$5.00</span></div>
          </div>
          <button onClick={()=>setConfirmOpen(true)}
            className={`w-full py-[11px] text-[11px] tracking-[2px] uppercase font-bold cursor-pointer border-none transition-all ${dir==='BUY'?'bg-[var(--green)] text-[var(--bg)]':'bg-[var(--red)] text-white'}`}>
            {dir} {lots} {sym}
          </button>
        </div>
      </div>
    </div>

    {/* Confirm modal */}
    {confirmOpen&&(
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[8000] flex items-center justify-center">
        <div className="bg-[var(--bg2)] border border-[var(--bdr2)] p-[22px] min-w-[320px]">
          <div className="font-serif text-[19px] font-bold mb-1">Confirm Order</div>
          <div className="text-[11px] text-[var(--text2)] mb-4">Review before executing</div>
          <div className="flex flex-col gap-2 mb-4">
            {[['Symbol',sym],['Direction',dir],['Type',orderType],['Lots',lots],['Price (Market)',inst.ask]].map(([l,v])=>(
              <div key={l} className="flex justify-between py-[6px] px-[10px] bg-[var(--bg3)] border border-[var(--dim)]">
                <span className="text-[8px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold">{l}</span>
                <span className={`font-mono text-[12px] ${v==='BUY'?'text-[var(--green)]':v==='SELL'?'text-[var(--red)]':'text-[var(--text)]'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setConfirmOpen(false)} className="px-[18px] py-[8px] bg-transparent border border-[var(--bdr2)] text-[var(--text2)] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer">Cancel</button>
            <button onClick={placeOrder} className={`px-[22px] py-[8px] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer border-none ${dir==='BUY'?'bg-[var(--green)] text-[var(--bg)]':'bg-[var(--red)] text-white'}`}>Confirm {dir}</button>
          </div>
        </div>
      </div>
    )}
    <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}
