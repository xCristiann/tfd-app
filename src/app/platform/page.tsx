import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ── Instruments ─────────────────────────────────────────────────── */
const ALL_INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',        market:'forex', spread:0.00010, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', tv:'FX:GBPUSD',        market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', tv:'FX:USDJPY',        market:'forex', spread:0.010,   dec:3, pip:0.01,   cat:'forex',  lotUSD:(_:number)=>LOT_SIZE   },
  { sym:'USD/CHF', tv:'FX:USDCHF',        market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', tv:'FX:AUDUSD',        market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', tv:'FX:USDCAD',        market:'forex', spread:0.00020, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>1/p*LOT_SIZE },
  { sym:'NZD/USD', tv:'FX:NZDUSD',        market:'forex', spread:0.00020, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/JPY', tv:'FX:GBPJPY',        market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex',  lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/JPY', tv:'FX:EURJPY',        market:'forex', spread:0.025,   dec:3, pip:0.01,   cat:'forex',  lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', tv:'FX:EURGBP',        market:'forex', spread:0.00015, dec:5, pip:0.0001, cat:'forex',  lotUSD:(p:number)=>p*1.29*LOT_SIZE },
  { sym:'AUD/JPY', tv:'FX:AUDJPY',        market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex',  lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'CAD/JPY', tv:'FX:CADJPY',        market:'forex', spread:0.030,   dec:3, pip:0.01,   cat:'forex',  lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'XAU/USD', tv:'CAPITALCOM:XAUUSD',         market:'forex', spread:0.30,    dec:2, pip:0.10,   cat:'metals', lotUSD:(p:number)=>p*100   },
  { sym:'XAG/USD', tv:'CAPITALCOM:XAGUSD',       market:'forex', spread:0.030,   dec:4, pip:0.001,  cat:'metals', lotUSD:(p:number)=>p*5000  },
  { sym:'NAS100',  tv:'CAPITALCOM:US100', market:'us',    spread:1.5,     dec:1, pip:1.0,    cat:'index',  lotUSD:(p:number)=>p*400  },
  { sym:'US500',   tv:'CAPITALCOM:US500', market:'us',    spread:0.50,    dec:2, pip:0.10,   cat:'index',  lotUSD:(p:number)=>p*500  },
  { sym:'US30',    tv:'CAPITALCOM:US30',  market:'us',    spread:2.0,     dec:1, pip:1.0,    cat:'index',  lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   tv:'CAPITALCOM:DE40',  market:'eu',    spread:1.0,     dec:1, pip:1.0,    cat:'index',  lotUSD:(p:number)=>p*25   },
  { sym:'WTI',     tv:'CAPITALCOM:OIL_CRUDE',        market:'forex', spread:0.030,   dec:2, pip:0.01,   cat:'energy', lotUSD:(p:number)=>p*1000 },
] as const

type Inst = typeof ALL_INSTRUMENTS[number]

const SEED: Record<string,number> = {
  'EUR/USD':1.0820,'GBP/USD':1.2960,'USD/JPY':149.20,'USD/CHF':0.8850,
  'AUD/USD':0.6280,'USD/CAD':1.4380,'NZD/USD':0.5720,'GBP/JPY':193.20,
  'EUR/JPY':161.50,'EUR/GBP':0.8350,'AUD/JPY':93.70,'CAD/JPY':103.80,
  'XAU/USD':4700.0,'XAG/USD':47.50,
  'NAS100':19800,'US500':5580,'US30':41700,'GER40':22500,'WTI':68.50,
}

const TF_LIST = ['1','5','15','30','60','240','D','W']
const TF_LABEL: Record<string,string> = {'1':'1m','5':'5m','15':'15m','30':'30m','60':'1h','240':'4h','D':'1D','W':'1W'}

function lsGet(k:string,fb:string){try{return localStorage.getItem(k)||fb}catch{return fb}}
function lsSet(k:string,v:string){try{localStorage.setItem(k,v)}catch{}}

/* ── TradingView Widget ───────────────────────────────────────────── */
function TVChart({tvSym, interval}: {tvSym:string; interval:string}) {
  const ref    = useRef<HTMLDivElement>(null)
  const keyRef = useRef('')

  useEffect(()=>{
    const el = ref.current; if(!el) return
    const key = `${tvSym}:${interval}`
    if(keyRef.current === key) return
    keyRef.current = key
    el.innerHTML = ''

    const wrap = document.createElement('div')
    wrap.className = 'tradingview-widget-container'
    wrap.style.cssText = 'width:100%;height:100%'
    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.cssText = 'width:100%;height:calc(100% - 32px)'
    const script = document.createElement('script')
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:true, symbol:tvSym, interval,
      timezone:'Etc/UTC', theme:'light', style:'1', locale:'en',
      enable_publishing:false, hide_top_toolbar:false, save_image:false,
      backgroundColor:'rgba(250,251,255,1)', gridColor:'rgba(34,85,204,0.05)',
      hide_volume:false, support_host:'https://www.tradingview.com',
    })
    wrap.appendChild(inner)
    wrap.appendChild(script)
    el.appendChild(wrap)
  },[tvSym, interval])

  return <div ref={ref} style={{width:'100%',height:'100%'}}/>
}

/* ── Price feed — Twelve Data WebSocket only (no REST, no credits) ── */
const TD_KEY = 'c6158908260647989323da44b23f5f97'

// TD free plan: 8 symbols via WebSocket, unlimited messages, zero credits
// Priority: most traded instruments first
const TD_WS_SYMS = [
  {our:'EUR/USD', td:'EUR/USD', dec:5},
  {our:'GBP/USD', td:'GBP/USD', dec:5},
  {our:'USD/JPY', td:'USD/JPY', dec:3},
  {our:'XAU/USD', td:'XAU/USD', dec:2},
  {our:'USD/CHF', td:'USD/CHF', dec:5},
  {our:'AUD/USD', td:'AUD/USD', dec:5},
  {our:'GBP/JPY', td:'GBP/JPY', dec:3},
  {our:'EUR/JPY', td:'EUR/JPY', dec:3},
]

// Remaining symbols use TD WS too — send as second subscription
// TD actually allows more than 8 symbols on WS even on free plan
const TD_WS_EXTRA = [
  {our:'USD/CAD', td:'USD/CAD', dec:5},
  {our:'NZD/USD', td:'NZD/USD', dec:5},
  {our:'EUR/GBP', td:'EUR/GBP', dec:5},
  {our:'AUD/JPY', td:'AUD/JPY', dec:3},
  {our:'CAD/JPY', td:'CAD/JPY', dec:3},
  {our:'XAG/USD', td:'XAG/USD', dec:4},
  {our:'NAS100',  td:'NDX',     dec:2},
  {our:'US500',   td:'SPX',     dec:2},
  {our:'US30',    td:'DJI',     dec:1},
  {our:'GER40',   td:'DAX',     dec:1},
  {our:'WTI',     td:'WTI/USD', dec:2},
]

const ALL_TD = [...TD_WS_SYMS, ...TD_WS_EXTRA]

function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({...SEED})
  const refPrev   = useRef<Record<string,number>>({...SEED})
  const refPrices = useRef<Record<string,number>>({...SEED})

  const push = useCallback((sym:string, price:number)=>{
    if(!price||isNaN(price)||price<=0) return
    refPrev.current[sym]   = refPrices.current[sym] || price
    refPrices.current[sym] = price
    setPrices(p => p[sym]===price ? p : {...p,[sym]:price})
  },[])

  useEffect(()=>{
    let dead=false, ws:WebSocket, wsTimer:any

    const connect = () => {
      if (dead) return
      try {
        ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${TD_KEY}`)
        ws.onopen = () => {
          // Subscribe primary 8 symbols
          ws.send(JSON.stringify({
            action: 'subscribe',
            params: { symbols: TD_WS_SYMS.map(m=>m.td).join(',') }
          }))
          // After 1s subscribe extras
          setTimeout(()=>{
            if (ws.readyState===WebSocket.OPEN) {
              ws.send(JSON.stringify({
                action: 'subscribe',
                params: { symbols: TD_WS_EXTRA.map(m=>m.td).join(',') }
              }))
            }
          }, 1000)
        }
        ws.onmessage = ({data}) => {
          try {
            const d = JSON.parse(data)
            if (d.event==='price' && d.symbol && d.price) {
              const m = ALL_TD.find(x=>x.td===d.symbol)
              if (m) push(m.our, +parseFloat(d.price).toFixed(m.dec))
            }
          } catch {}
        }
        ws.onclose = () => { if (!dead) wsTimer=setTimeout(connect,2000) }
        ws.onerror = () => { try{ws.close()}catch{} }
      } catch { if (!dead) wsTimer=setTimeout(connect,3000) }
    }

    connect()
    
    // Heartbeat: re-push current prices every 1s so P&L always recalculates
    const hb = setInterval(()=>{
      Object.entries(refPrices.current).forEach(([sym,price])=>{
        if(price>0) {
          // tiny random tick to force re-render even when WS is slow
          const inst = ALL_INSTRUMENTS.find(i=>i.sym===sym) as any
          const tick = inst ? Math.random()*inst.spread*0.1 : 0
          setPrices(p => ({...p,[sym]:+(price+tick-tick).toFixed(inst?.dec??5)}))
        }
      })
    }, 1000)

    return () => {
      dead=true; clearTimeout(wsTimer); clearInterval(hb)
      try{ws?.close()}catch{}
    }
  },[push])

  return { prices, refPrev, refPrices, push }
}


/* ── P&L ──────────────────────────────────────────────────────────── */
function calcPnl(trade:any, price:number): number {
  const inst = ALL_INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if(!inst||!price) return 0
  const diff = trade.direction==='buy' ? price-trade.open_price : trade.open_price-price
  const isJpy = trade.symbol.includes('JPY')
  return diff * (isJpy ? LOT_SIZE/price : inst.lotUSD(1)) * trade.lots
}

/* ── Risk monitor ────────────────────────────────────────────────── */
function useRiskMonitor(tradesRef:any,refPrices:any,primaryRef:any,accountId:any,onBreach:any){
  const fired=useRef(false)
  const cb=useRef(onBreach); cb.current=onBreach
  useEffect(()=>{
    const iv=setInterval(()=>{
      const pr=primaryRef.current,trades=tradesRef.current
      if(!pr||!trades.length||fired.current) return
      if(pr.status==='breached'||pr.status==='passed') return
      const bal=pr.balance??0,start=pr.starting_balance??bal
      if(bal<=0||start<=0) return
      const cp=(pr as any).challenge_products,ph=pr.phase??'phase1'
      const maxDD  =ph==='funded'?(cp?.funded_max_dd??10):(ph==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10))
      const dailyDD=ph==='funded'?(cp?.funded_daily_dd??5):(ph==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5))
      const floor =start-start*(maxDD/100)
      const dFloor=(pr.daily_high_balance??start)-(pr.daily_high_balance??start)*(dailyDD/100)
      const equity=bal+trades.reduce((s:number,t:any)=>s+calcPnl(t,refPrices.current[t.symbol]||SEED[t.symbol]),0)
      if(equity<=floor){fired.current=true;cb.current(`Max DD breached`,trades)}
      else if(equity<=dFloor){fired.current=true;cb.current(`Daily DD breached`,trades)}
    },500)
    return()=>clearInterval(iv)
  },[])
  useEffect(()=>{fired.current=false},[accountId])
}

/* ── Platform Page ───────────────────────────────────────────────── */
export function PlatformPage() {
  const navigate  = useNavigate()
  const {toasts,toast,dismiss} = useToast()
  const {accounts,primary:defPrimary} = useAccount()
  const [selAccId,setSelAccId] = useState<string|null>(null)
  const primary = accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,    setSym]   = useState(()=>{ const s=lsGet('tfd_sym','EUR/USD'); return ALL_INSTRUMENTS.find(i=>i.sym===s)?s:'EUR/USD' })
  const [tf,     setTf]    = useState(()=>lsGet('tfd_tf','60'))
  const [dir,    setDir]   = useState<'buy'|'sell'>('buy')
  const [lots,   setLots]  = useState('0.10')
  const [sl,     setSl]    = useState('')
  const [tp,     setTp]    = useState('')
  const [tab,    setTab]   = useState<'positions'|'history'>('positions')
  const [search, setSearch]= useState('')
  const [placing,setPlacing]=useState(false)
  const [editSLTP,setEditSLTP]=useState<any>(null)
  const [openTrades,   setOpenTrades]  =useState<any[]>([])
  const [closedTrades, setClosedTrades]=useState<any[]>([])
  const [favorites,setFavorites]=useState<Set<string>>(()=>{
    try{return new Set(JSON.parse(localStorage.getItem('tfd_favs')||'[]'))}catch{return new Set(['EUR/USD','XAU/USD','NAS100'])}
  })

  const {prices,refPrev,refPrices,push}=usePriceFeed()
  const tradesRef =useRef(openTrades); tradesRef.current=openTrades
  const primaryRef=useRef(primary);    primaryRef.current=primary
  const closingRef=useRef<Set<string>>(new Set())

  // Force P&L re-render every 500ms using latest prices from ref
  const [tick,setTick]=useState(0)
  useEffect(()=>{
    const iv=setInterval(()=>{
      setTick(n=>n+1)
      // Also force price state update from ref in case WS is slow
      const updates: Record<string,number> = {}
      Object.entries(refPrices.current).forEach(([sym,price])=>{
        if (price > 0) updates[sym] = price
      })
    },500)
    return()=>clearInterval(iv)
  },[])

  const inst      = (ALL_INSTRUMENTS.find(i=>i.sym===sym)??ALL_INSTRUMENTS[0]) as any
  const livePrice = refPrices.current[sym]||prices[sym]||SEED[sym]
  const prevPrice = refPrev.current[sym]||livePrice
  const up        = livePrice>=prevPrice
  const execPrice = +(dir==='buy'?livePrice+inst.spread:livePrice).toFixed(inst.dec)
  const lotsNum   = Math.max(0.01,parseFloat(lots)||0.01)
  const balance   = primary?.balance??0
  const openPnl   = openTrades.reduce((s,t)=>{ const p=refPrices.current[t.symbol]||prices[t.symbol]||SEED[t.symbol]; return s+calcPnl(t,p) },0)
  const equity    = balance+openPnl
  const usedMgn   = openTrades.reduce((s,t)=>{
    const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    const cur=refPrices.current[t.symbol]||SEED[t.symbol]
    return s+(i?.lotUSD(cur)*t.lots/LEVERAGE||0)
  },0)
  const freeMgn   = equity-usedMgn
  const mgnLvl    = usedMgn>0?(equity/usedMgn)*100:Infinity
  const reqMgn    = inst.lotUSD(execPrice)*lotsNum/LEVERAGE
  const maxLots   = freeMgn>0?Math.floor(freeMgn*LEVERAGE/inst.lotUSD(execPrice)*100)/100:0

  useEffect(()=>lsSet('tfd_sym',sym),[sym])
  useEffect(()=>lsSet('tfd_tf',tf),[tf])

  useEffect(()=>{
    if(!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open')
      .order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed')
      .order('closed_at',{ascending:false}).limit(50).then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  useRiskMonitor(tradesRef,refPrices,primaryRef,primary?.id,async(reason:string,trades:any[])=>{
    toast('error','🚨','Account Breached',reason)
    if(!primary?.id) return
    for(const t of trades){
      const cur=refPrices.current[t.symbol]||SEED[t.symbol]
      const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const cp=+(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
      const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
      const isJpy=t.symbol.includes('JPY')
      const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i?.lotUSD(1))*t.lots).toFixed(2)
      await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,closed_at:new Date().toISOString()}).eq('id',t.id)
    }
    const nb=+(balance+trades.reduce((s,t)=>{
      const cur=refPrices.current[t.symbol]||t.open_price
      const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const isJpy=t.symbol.includes('JPY')
      return s+(t.direction==='buy'?cur-t.open_price:t.open_price-cur)*(isJpy?LOT_SIZE/cur:i?.lotUSD(1))*t.lots
    },0)).toFixed(2)
    await supabase.from('accounts').update({status:'breached',phase:'breached',balance:nb,equity:nb}).eq('id',primary.id)
    setOpenTrades([])
  })

  // Auto-close SL/TP
  useEffect(()=>{
    if(!primary?.id) return
    const iv=setInterval(async()=>{
      const trades=tradesRef.current,pr=primaryRef.current
      if(!trades.length||!pr) return
      for(const t of trades){
        if(closingRef.current.has(t.id)||(!t.sl&&!t.tp)) continue
        const cur=refPrices.current[t.symbol]
        if(!cur||cur<=0) continue
        const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
        if(!i) continue
        let hit=''
        if(t.sl){const sl=Number(t.sl);if(sl>0){const h=t.direction==='buy'?cur<=sl:cur>=sl;if(h)hit=`SL @ ${cur.toFixed(i.dec)}`}}
        if(!hit&&t.tp){const tp=Number(t.tp);if(tp>0){const h=t.direction==='buy'?cur>=tp:cur<=tp;if(h)hit=`TP @ ${cur.toFixed(i.dec)}`}}
        if(!hit) continue
        closingRef.current.add(t.id)
        try{
          const cp=+(t.direction==='buy'?cur:cur+i.spread).toFixed(i.dec)
          const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
          const isJpy=t.symbol.includes('JPY')
          const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i.lotUSD(1))*t.lots).toFixed(2)
          const pips=+(diff/i.pip).toFixed(1)
          if(Math.abs(netPnl)>(pr.balance??0)*2){closingRef.current.delete(t.id);continue}
          const now=new Date().toISOString()
          await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
          await supabase.from('accounts').update({balance:+((pr.balance??0)+netPnl).toFixed(2)}).eq('id',pr.id)
          setOpenTrades(p=>p.filter(x=>x.id!==t.id))
          setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
          toast(netPnl>=0?'success':'error',netPnl>=0?'🎯':'🛑',`${hit} — ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)}`)
        }catch{closingRef.current.delete(t.id)}
      }
    },1000)
    return()=>clearInterval(iv)
  },[primary?.id])

  const toggleFav=(s:string)=>{
    setFavorites(prev=>{const n=new Set(prev);n.has(s)?n.delete(s):n.add(s);localStorage.setItem('tfd_favs',JSON.stringify([...n]));return n})
  }

  async function placeOrder(){
    if(!primary?.id){toast('error','❌','No Account','Select an account');return}
    if(primary.status==='breached'){toast('error','❌','Breached','Account is breached');return}
    if(reqMgn>freeMgn){toast('error','❌','Insufficient Margin',`Max ${maxLots} lots`);return}
    setPlacing(true)
    const {data,error}=await supabase.from('trades').insert({
      account_id:primary.id,user_id:primary.user_id,
      symbol:sym,direction:dir,lots:lotsNum,
      open_price:execPrice,status:'open',
      sl:sl?parseFloat(sl):null,tp:tp?parseFloat(tp):null,
      opened_at:new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if(error){toast('error','❌','Error',error.message);return}
    setOpenTrades(p=>[data,...p])
    toast('success','✅',`${dir.toUpperCase()} ${sym}`,`${lotsNum} lots @ ${execPrice}`)
    setSl('');setTp('')
  }

  async function closeTrade(t:any){
    const cur=refPrices.current[t.symbol]||prices[t.symbol]||SEED[t.symbol]
    const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    const cp=+(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
    const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
    const isJpy=t.symbol.includes('JPY')
    const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i?.lotUSD(1))*t.lots).toFixed(2)
    const pips=+(diff/(i?.pip??0.0001)).toFixed(1)
    const now=new Date().toISOString()
    await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
    await supabase.from('accounts').update({balance:+(balance+netPnl).toFixed(2),equity:+(equity+netPnl-openPnl).toFixed(2)}).eq('id',primary!.id)
    setOpenTrades(p=>p.filter(x=>x.id!==t.id))
    setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
    toast(netPnl>=0?'success':'error',netPnl>=0?'💰':'📉',`Closed ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)}`)
  }

  async function saveEditSLTP(){
    if(!editSLTP) return
    const updates={sl:editSLTP.sl?parseFloat(editSLTP.sl):null,tp:editSLTP.tp?parseFloat(editSLTP.tp):null}
    await supabase.from('trades').update(updates).eq('id',editSLTP.id)
    setOpenTrades(p=>p.map(t=>t.id===editSLTP.id?{...t,...updates}:t))
    setEditSLTP(null)
    toast('success','✅','SL/TP Updated','')
  }

  const watchlist = useMemo(()=>{
    const q=search.toLowerCase()
    const filtered=ALL_INSTRUMENTS.filter(i=>!q||i.sym.toLowerCase().includes(q))
    return [...filtered].sort((a,b)=>{
      const af=favorites.has(a.sym)?0:1, bf=favorites.has(b.sym)?0:1
      return af-bf
    })
  },[search,favorites])

  const mono={fontFamily:"'JetBrains Mono',monospace"} as const
  const prod=(primary as any)?.challenge_products

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#F0F4FB',color:'#1A3A6B',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{height:'48px',background:'#1A3A6B',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'5px 10px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>← Dashboard</button>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:700,color:'#fff'}}>The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span></div>
        <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ADE80',boxShadow:'0 0 8px #4ADE80',marginLeft:'4px'}}/>
        <span style={{fontSize:'9px',color:'#4ADE80',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase'}}>Live</span>
        <div style={{marginLeft:'auto',display:'flex',gap:'4px'}}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>setSelAccId(a.id)} style={{padding:'3px 8px',background:a.id===primary?.id?'rgba(96,165,250,.2)':'rgba(255,255,255,.06)',border:a.id===primary?.id?'1px solid rgba(96,165,250,.4)':'1px solid rgba(255,255,255,.1)',borderRadius:'4px',color:a.id===primary?.id?'#60A5FA':'rgba(255,255,255,.4)',fontSize:'9px',...mono,cursor:'pointer'}}>
              {(a as any).account_number}
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
        <div style={{width:'180px',background:'#fff',borderRight:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0}}>
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
              return(
                <div key={i.sym} style={{padding:'5px 7px',borderBottom:'1px solid #F0F4FB',display:'flex',alignItems:'center',background:active?'#EEF3FF':'transparent',borderLeft:active?'3px solid #2255CC':'3px solid transparent',cursor:'pointer'}}
                  onClick={()=>setSym(i.sym)}>
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
        </div>

        {/* CHART AREA */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Chart topbar */}
          <div style={{height:'38px',background:'#fff',borderBottom:'1px solid #E8EEF8',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
            <div style={{...mono,fontSize:'18px',fontWeight:700,color:up?'#16A34A':'#DC2626'}}>{livePrice.toFixed(inst.dec)}</div>
            <div style={{fontSize:'10px',color:up?'#16A34A':'#DC2626'}}>{up?'▲':'▼'} {Math.abs(livePrice-prevPrice).toFixed(inst.dec)}</div>
            <div style={{fontSize:'13px',fontWeight:700,color:'#1A3A6B'}}>{sym}</div>
            <button onClick={()=>toggleFav(sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:favorites.has(sym)?'#F59E0B':'#D1D5DB',padding:'0'}}>{favorites.has(sym)?'★':'☆'}</button>
            <div style={{display:'flex',gap:'2px',marginLeft:'8px'}}>
              {TF_LIST.map(t=>(
                <button key={t} onClick={()=>setTf(t)} style={{padding:'3px 8px',fontSize:'9px',fontWeight:700,border:'none',borderRadius:'4px',cursor:'pointer',background:tf===t?'#2255CC':'#F4F7FD',color:tf===t?'#fff':'#5C7A9E'}}>{TF_LABEL[t]}</button>
              ))}
            </div>
            <div style={{marginLeft:'auto',fontSize:'9px',color:'#16A34A',background:'rgba(22,163,74,.08)',padding:'2px 8px',borderRadius:'20px',fontWeight:600}}>● TradingView Live</div>
          </div>
          {/* Chart */}
          <div style={{flex:1}}>
            <TVChart tvSym={inst.tv} interval={tf}/>
          </div>
        </div>

        {/* ORDER PANEL */}
        <div style={{width:'230px',background:'#fff',borderLeft:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'10px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:'9px',fontWeight:700,color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'8px'}}>New Order — {sym}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginBottom:'8px'}}>
              <button onClick={()=>setDir('buy')}  style={{padding:'9px',border:'none',borderRadius:'7px',cursor:'pointer',fontWeight:700,fontSize:'12px',background:dir==='buy'?'#16A34A':'#F4F7FD',color:dir==='buy'?'#fff':'#5C7A9E'}}>BUY</button>
              <button onClick={()=>setDir('sell')} style={{padding:'9px',border:'none',borderRadius:'7px',cursor:'pointer',fontWeight:700,fontSize:'12px',background:dir==='sell'?'#DC2626':'#F4F7FD',color:dir==='sell'?'#fff':'#5C7A9E'}}>SELL</button>
            </div>
            <div style={{background:dir==='buy'?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)',border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`,borderRadius:'8px',padding:'8px',marginBottom:'8px',textAlign:'center'}}>
              <div style={{fontSize:'8px',color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'2px'}}>Execution Price · Live</div>
              <div style={{...mono,fontSize:'20px',fontWeight:700,color:dir==='buy'?'#16A34A':'#DC2626'}}>{execPrice.toFixed(inst.dec)}</div>
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
              {lotsNum>maxLots&&<div style={{marginTop:'4px',fontSize:'9px',color:'#DC2626',fontWeight:600}}>⚠ Max {maxLots} lots at 1:{LEVERAGE}</div>}
            </div>
            <button onClick={placeOrder} disabled={placing||!primary||primary.status==='breached'||lotsNum>maxLots}
              style={{width:'100%',padding:'10px',fontSize:'12px',fontWeight:700,border:'none',borderRadius:'7px',cursor:lotsNum>maxLots?'not-allowed':'pointer',background:lotsNum>maxLots?'#9CA3AF':dir==='buy'?'#16A34A':'#DC2626',color:'#fff',opacity:placing||!primary?0.6:1,textTransform:'uppercase'}}>
              {placing?'…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
            </button>
          </div>
          <div style={{padding:'8px 10px',borderTop:'1px solid #E8EEF8',flexShrink:0}}>
            {[['Account',(primary as any)?.account_number??'—','#1A3A6B'],['Phase',primary?.phase??'—','#2255CC'],['Status',primary?.status??'—',primary?.status==='active'?'#16A34A':'#DC2626']].map(([l,v,c])=>(
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
              {t}{t==='positions'&&openTrades.length>0?` (${openTrades.length})`:''}
            </button>
          ))}
          <div style={{marginLeft:'auto',...mono,fontSize:'11px',fontWeight:600,color:openPnl>=0?'#16A34A':'#DC2626'}}>
            Float: {openPnl>=0?'+':''}${(openPnl||0).toFixed(2)}
          </div>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {tab==='positions'?(
            openTrades.length===0
              ?<div style={{padding:'16px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>No open positions</div>
              :<table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
                <thead><tr>{['Symbol','Dir','Lots','Entry','Live','P&L','Pips','SL','TP','Margin','Actions'].map(h=>(
                  <th key={h} style={{padding:'3px 7px',fontSize:'8px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB',whiteSpace:'nowrap'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{openTrades.map(t=>{
                  const cur=refPrices.current[t.symbol]||prices[t.symbol]||SEED[t.symbol]
                  const pnl=calcPnl(t,cur)
                  const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                  const pipD=i?(t.direction==='buy'?cur-t.open_price:t.open_price-cur)/(i.pip??0.0001):0
                  const tMgn=i?(i.lotUSD(cur)*t.lots/LEVERAGE):0
                  return(
                    <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                      <td style={{padding:'4px 7px',fontWeight:600}}>
                        <button onClick={()=>setSym(t.symbol)} style={{background:'none',border:'none',cursor:'pointer',fontWeight:600,color:'#2255CC',fontSize:'10px',padding:0}}>{t.symbol}</button>
                      </td>
                      <td style={{padding:'4px 7px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                      <td style={{padding:'4px 7px',...mono}}>{t.lots}</td>
                      <td style={{padding:'4px 7px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'4px 7px',...mono,color:cur>=t.open_price?'#16A34A':'#DC2626'}}>{cur.toFixed(i?.dec??5)}</td>
                      <td style={{padding:'4px 7px',...mono,fontWeight:700,color:pnl>=0?'#16A34A':'#DC2626'}}>{pnl>=0?'+':''}${(pnl||0).toFixed(2)}</td>
                      <td style={{padding:'4px 7px',...mono,color:pipD>=0?'#16A34A':'#DC2626'}}>{pipD>=0?'+':''}{(pipD||0).toFixed(1)}</td>
                      <td style={{padding:'4px 7px',...mono,color:'#DC2626',fontSize:'9px'}}>{t.sl??'—'}</td>
                      <td style={{padding:'4px 7px',...mono,color:'#16A34A',fontSize:'9px'}}>{t.tp??'—'}</td>
                      <td style={{padding:'4px 7px',...mono,color:'#5C7A9E',fontSize:'9px'}}>${(tMgn||0).toFixed(2)}</td>
                      <td style={{padding:'4px 7px'}}>
                        <div style={{display:'flex',gap:'3px'}}>
                          <button onClick={()=>setEditSLTP({id:t.id,sl:t.sl?String(t.sl):'',tp:t.tp?String(t.tp):''})} style={{padding:'2px 7px',fontSize:'9px',fontWeight:600,background:'#EEF3FF',border:'1px solid rgba(34,85,204,.2)',borderRadius:'4px',cursor:'pointer',color:'#2255CC'}}>Edit</button>
                          <button onClick={()=>closeTrade(t)} style={{padding:'2px 7px',fontSize:'9px',fontWeight:600,background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'4px',cursor:'pointer',color:'#DC2626'}}>Close</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
          ):(
            closedTrades.length===0
              ?<div style={{padding:'16px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>No closed trades</div>
              :<table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
                <thead><tr>{['Symbol','Dir','Lots','Open','Close','P&L','Pips','Closed'].map(h=>(
                  <th key={h} style={{padding:'3px 7px',fontSize:'8px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{closedTrades.map(t=>{
                  const i=ALL_INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                  return(
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

      {/* Edit SL/TP Modal */}
      {editSLTP&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setEditSLTP(null)}>
          <div style={{background:'#fff',borderRadius:'12px',padding:'20px',width:'280px',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'13px',fontWeight:700,color:'#1A3A6B',marginBottom:'14px'}}>Edit SL / TP</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
              <div>
                <div style={{fontSize:'9px',color:'#DC2626',fontWeight:700,textTransform:'uppercase',marginBottom:'3px'}}>Stop Loss</div>
                <input value={editSLTP.sl} onChange={e=>setEditSLTP((p:any)=>({...p,sl:e.target.value}))} placeholder="—" type="number"
                  style={{width:'100%',padding:'7px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.3)',borderRadius:'7px',fontSize:'12px',...mono,color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:'9px',color:'#16A34A',fontWeight:700,textTransform:'uppercase',marginBottom:'3px'}}>Take Profit</div>
                <input value={editSLTP.tp} onChange={e=>setEditSLTP((p:any)=>({...p,tp:e.target.value}))} placeholder="—" type="number"
                  style={{width:'100%',padding:'7px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.3)',borderRadius:'7px',fontSize:'12px',...mono,color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
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
    </div>
  )
}
