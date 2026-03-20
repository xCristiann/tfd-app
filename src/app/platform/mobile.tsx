import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const LOT_SIZE = 100_000
const LEVERAGE = 50
const SEEDS: Record<string,number> = {
  'EUR/USD':1.0820,'GBP/USD':1.2960,'USD/JPY':149.20,'XAU/USD':3320.0,
  'NAS100':19800,'US500':5580,'US30':41700,'GER40':22500,
}

const INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',        dec:5, pip:0.0001, spread:0.00010, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', tv:'FX:GBPUSD',        dec:5, pip:0.0001, spread:0.00015, cat:'Forex', lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', tv:'FX:USDJPY',        dec:3, pip:0.01,   spread:0.010,   cat:'Forex', lotUSD:(_:number)=>LOT_SIZE },
  { sym:'XAU/USD', tv:'TVC:GOLD',         dec:2, pip:0.10,   spread:0.30,    cat:'Metals', lotUSD:(p:number)=>p*100 },
  { sym:'NAS100',  tv:'CAPITALCOM:US100', dec:2, pip:1.0,    spread:1.5,     cat:'Indices', lotUSD:(p:number)=>p*400 },
  { sym:'US500',   tv:'CAPITALCOM:US500', dec:2, pip:0.10,   spread:0.50,    cat:'Indices', lotUSD:(p:number)=>p*500 },
  { sym:'US30',    tv:'CAPITALCOM:US30',  dec:1, pip:1.0,    spread:2.0,     cat:'Indices', lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   tv:'CAPITALCOM:DE40',  dec:1, pip:1.0,    spread:1.0,     cat:'Indices', lotUSD:(p:number)=>p*25 },
] as const

function calcPnl(trade:any, price:number): number {
  const inst = INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if (!inst||!price) return 0
  const diff = trade.direction==='buy'?price-trade.open_price:trade.open_price-price
  return diff*(trade.symbol.includes('JPY')?LOT_SIZE/price:inst.lotUSD(1))*trade.lots
}

export function MobilePlatform() {
  const navigate = useNavigate()
  const {toasts,toast,dismiss} = useToast()
  const {accounts,primary:defPrimary} = useAccount()
  const [sym, setSym] = useState('EUR/USD')
  const [dir, setDir] = useState<'buy'|'sell'>('buy')
  const [lots, setLots] = useState('0.10')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [tab, setTab] = useState<'chart'|'order'|'positions'>('chart')
  const [placing, setPlacing] = useState(false)
  const [openTrades, setOpenTrades] = useState<any[]>([])
  const [prices] = useState<Record<string,number>>({...SEEDS})
  const primary = defPrimary
  const chartRef = useRef<HTMLDivElement>(null)
  const builtRef = useRef('')

  const inst  = (INSTRUMENTS.find(i=>i.sym===sym)??INSTRUMENTS[0]) as any
  const live  = prices[sym]||SEEDS[sym]
  const exec  = +(dir==='buy'?live+inst.spread:live).toFixed(inst.dec)
  const lotsNum = Math.max(0.01,parseFloat(lots)||0.01)
  const balance = primary?.balance??0
  const openPnl = openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]),0)

  useEffect(()=>{
    if(!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open').order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
  },[primary?.id])

  // Build TV chart
  useEffect(()=>{
    const el = chartRef.current; if (!el||tab!=='chart') return
    const key = sym
    if (builtRef.current===key) return
    builtRef.current = key
    el.innerHTML = ''
    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.cssText = 'width:100%;height:100%'
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.cssText = 'width:100%;height:calc(100% - 32px)'
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:true, symbol:inst.tv, interval:'60', timezone:'Etc/UTC',
      theme:'light', style:'1', locale:'en', enable_publishing:false,
      hide_top_toolbar:false, save_image:false,
      backgroundColor:'rgba(250,251,255,1)', hide_volume:false,
      support_host:'https://www.tradingview.com',
    })
    container.appendChild(inner)
    container.appendChild(script)
    el.appendChild(container)
  },[sym, tab])

  async function placeOrder(){
    if(!primary?.id){toast('error','❌','No Account','Select a funded account.');return}
    if(primary.status==='breached'){toast('error','❌','Breached','Account is breached.');return}
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
    toast('success','✅',`${dir.toUpperCase()} ${sym}`,`${lotsNum} lots @ ${exec}`)
    setSl('');setTp('');setTab('positions')
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
    await supabase.from('accounts').update({balance:+(balance+netPnl).toFixed(2)}).eq('id',primary!.id)
    setOpenTrades(p=>p.filter(x=>x.id!==t.id))
    toast(netPnl>=0?'success':'error',netPnl>=0?'💰':'📉',`Closed ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)}`)
  }

  const mono = {fontFamily:"'JetBrains Mono',monospace"} as const

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',background:'#F0F4FB',fontFamily:"'Inter',system-ui,sans-serif",color:'#1A3A6B'}}>

      {/* TOPBAR */}
      <div style={{height:'52px',background:'#1A3A6B',display:'flex',alignItems:'center',padding:'0 16px',gap:'12px',flexShrink:0}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>←</button>
        {/* Symbol selector */}
        <div style={{display:'flex',gap:'6px',overflowX:'auto',flex:1}}>
          {INSTRUMENTS.slice(0,5).map(i=>(
            <button key={i.sym} onClick={()=>{setSym(i.sym);builtRef.current='';setTab('chart')}}
              style={{padding:'4px 10px',borderRadius:'16px',border:'none',cursor:'pointer',whiteSpace:'nowrap',background:sym===i.sym?'rgba(255,255,255,.2)':'rgba(255,255,255,.08)',color:sym===i.sym?'#fff':'rgba(255,255,255,.5)',fontSize:'11px',fontWeight:600,...mono}}>
              {i.sym}
            </button>
          ))}
        </div>
      </div>

      {/* PRICE BAR */}
      <div style={{background:'#fff',borderBottom:'1px solid #E8EEF8',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div>
          <div style={{...mono,fontSize:'22px',fontWeight:700,color:'#1A3A6B'}}>{live.toFixed(inst.dec)}</div>
          <div style={{fontSize:'11px',color:'#8FA3BF'}}>{sym} · {inst.cat}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'12px',color:'#8FA3BF'}}>Balance</div>
          <div style={{...mono,fontSize:'16px',fontWeight:600,color:'#1A3A6B'}}>${(Number(balance)||0).toFixed(2)}</div>
          <div style={{fontSize:'11px',color:openPnl>=0?'#16A34A':'#DC2626',...mono}}>{openPnl>=0?'+':''}${(Number(openPnl)||0).toFixed(2)}</div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>

        {tab==='chart' && (
          <div ref={chartRef} style={{flex:1}}/>
        )}

        {tab==='order' && (
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:700,color:'#1A3A6B',marginBottom:'16px'}}>New Order — {sym}</div>

            {/* Buy / Sell */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
              <button onClick={()=>setDir('buy')} style={{padding:'14px',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:700,fontSize:'15px',background:dir==='buy'?'#16A34A':'#F4F7FD',color:dir==='buy'?'#fff':'#5C7A9E'}}>BUY</button>
              <button onClick={()=>setDir('sell')} style={{padding:'14px',border:'none',borderRadius:'12px',cursor:'pointer',fontWeight:700,fontSize:'15px',background:dir==='sell'?'#DC2626':'#F4F7FD',color:dir==='sell'?'#fff':'#5C7A9E'}}>SELL</button>
            </div>

            {/* Exec price */}
            <div style={{background:dir==='buy'?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)',border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`,borderRadius:'12px',padding:'16px',marginBottom:'16px',textAlign:'center'}}>
              <div style={{fontSize:'11px',color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>Execution Price</div>
              <div style={{...mono,fontSize:'28px',fontWeight:700,color:dir==='buy'?'#16A34A':'#DC2626'}}>{exec.toFixed(inst.dec)}</div>
            </div>

            {/* Lots */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:600,color:'#5C7A9E',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Lots</div>
              <div style={{display:'flex',border:'1px solid #E8EEF8',borderRadius:'12px',overflow:'hidden',height:'52px'}}>
                <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 20px',background:'#F4F7FD',border:'none',borderRight:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'24px'}}>−</button>
                <input value={lots} onChange={e=>setLots(e.target.value)} type="number" min="0.01" step="0.01"
                  style={{flex:1,padding:'0 12px',background:'#fff',border:'none',textAlign:'center',...mono,fontSize:'18px',fontWeight:600,color:'#1A3A6B',outline:'none'}}/>
                <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 20px',background:'#F4F7FD',border:'none',borderLeft:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'24px'}}>+</button>
              </div>
            </div>

            {/* SL/TP */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px'}}>
              <div>
                <div style={{fontSize:'12px',color:'#DC2626',fontWeight:600,marginBottom:'6px'}}>Stop Loss</div>
                <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number"
                  style={{width:'100%',padding:'12px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'10px',fontSize:'14px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:'12px',color:'#16A34A',fontWeight:600,marginBottom:'6px'}}>Take Profit</div>
                <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number"
                  style={{width:'100%',padding:'12px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.2)',borderRadius:'10px',fontSize:'14px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
            </div>

            <button onClick={placeOrder} disabled={placing||!primary}
              style={{width:'100%',padding:'16px',fontSize:'15px',fontWeight:700,border:'none',borderRadius:'12px',cursor:'pointer',background:dir==='buy'?'#16A34A':'#DC2626',color:'#fff',opacity:placing||!primary?0.6:1,letterSpacing:'0.5px',textTransform:'uppercase'}}>
              {placing?'…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
            </button>
          </div>
        )}

        {tab==='positions' && (
          <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:700,color:'#1A3A6B',marginBottom:'16px'}}>
              Open Positions ({openTrades.length})
              <span style={{marginLeft:'8px',fontSize:'12px',fontWeight:600,color:openPnl>=0?'#16A34A':'#DC2626',...mono}}>
                {openPnl>=0?'+':''}${(Number(openPnl)||0).toFixed(2)}
              </span>
            </div>
            {openTrades.length===0
              ? <div style={{textAlign:'center',padding:'40px 0',fontSize:'14px',color:'#8FA3BF'}}>No open positions</div>
              : openTrades.map(t=>{
                const cur=prices[t.symbol]||SEEDS[t.symbol]||t.open_price
                const pnl=calcPnl(t,cur)
                const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                return (
                  <div key={t.id} style={{background:'#fff',borderRadius:'12px',padding:'16px',marginBottom:'10px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',borderLeft:`4px solid ${t.direction==='buy'?'#16A34A':'#DC2626'}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                      <div>
                        <div style={{fontSize:'15px',fontWeight:700}}>{t.symbol}</div>
                        <div style={{fontSize:'12px',color:t.direction==='buy'?'#16A34A':'#DC2626',fontWeight:600}}>{t.direction.toUpperCase()} · {t.lots} lots</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{...mono,fontSize:'18px',fontWeight:700,color:pnl>=0?'#16A34A':'#DC2626'}}>{pnl>=0?'+':''}${(Number(pnl)||0).toFixed(2)}</div>
                        <div style={{fontSize:'11px',color:'#8FA3BF',...mono}}>@ {(Number(t.open_price)||0).toFixed(i?.dec??5)}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#8FA3BF',marginBottom:'12px'}}>
                      <span>SL: <span style={{color:'#DC2626',...mono}}>{t.sl??'—'}</span></span>
                      <span>TP: <span style={{color:'#16A34A',...mono}}>{t.tp??'—'}</span></span>
                      <span>Live: <span style={{...mono,color:'#1A3A6B'}}>{cur.toFixed(i?.dec??5)}</span></span>
                    </div>
                    <button onClick={()=>closeTrade(t)}
                      style={{width:'100%',padding:'10px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'8px',cursor:'pointer',color:'#DC2626',fontWeight:600,fontSize:'13px'}}>
                      Close Position
                    </button>
                  </div>
                )
              })
            }
          </div>
        )}
      </div>

      {/* BOTTOM TAB BAR */}
      <div style={{height:'64px',background:'#fff',borderTop:'1px solid #E8EEF8',display:'flex',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom)'}}>
        {[
          {id:'chart',     icon:'📊', label:'Chart'},
          {id:'order',     icon:'⚡', label:'Order'},
          {id:'positions', icon:'📋', label:`Positions${openTrades.length>0?` (${openTrades.length})`:''}` },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',background:'none',border:'none',cursor:'pointer',color:tab===t.id?'#2255CC':'#8FA3BF',borderTop:tab===t.id?'2px solid #2255CC':'2px solid transparent',transition:'color .15s'}}>
            <span style={{fontSize:'20px'}}>{t.icon}</span>
            <span style={{fontSize:'9px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.3px'}}>{t.label}</span>
          </button>
        ))}
      </div>

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </div>
  )
}
