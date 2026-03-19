import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const LEVERAGE = 50
const LOT_SIZE = 100_000

function lsGet<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb } catch { return fb }
}
function lsSet(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }

const INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',        dec:5, pip:0.0001, spread:0.00010, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', tv:'FX:GBPUSD',        dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', tv:'FX:USDJPY',        dec:3, pip:0.01,   spread:0.010,   cat:'Forex',       lotUSD:(_:number)=>LOT_SIZE },
  { sym:'USD/CHF', tv:'FX:USDCHF',        dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', tv:'FX:AUDUSD',        dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', tv:'FX:USDCAD',        dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>LOT_SIZE/p },
  { sym:'NZD/USD', tv:'FX:NZDUSD',        dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'EUR/JPY', tv:'FX:EURJPY',        dec:3, pip:0.01,   spread:0.025,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'GBP/JPY', tv:'FX:GBPJPY',        dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', tv:'FX:EURGBP',        dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*1.27*LOT_SIZE },
  { sym:'AUD/JPY', tv:'FX:AUDJPY',        dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'CAD/JPY', tv:'FX:CADJPY',        dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'XAU/USD', tv:'TVC:GOLD',         dec:2, pip:0.10,   spread:0.30,    cat:'Metals',      lotUSD:(p:number)=>p*100 },
  { sym:'XAG/USD', tv:'TVC:SILVER',       dec:4, pip:0.001,  spread:0.030,   cat:'Metals',      lotUSD:(p:number)=>p*5000 },
  { sym:'NAS100',  tv:'CAPITALCOM:US100', dec:2, pip:1.0,    spread:1.5,     cat:'Indices',     lotUSD:(p:number)=>p*400 },
  { sym:'US500',   tv:'CAPITALCOM:US500', dec:2, pip:0.10,   spread:0.50,    cat:'Indices',     lotUSD:(p:number)=>p*500 },
  { sym:'US30',    tv:'CAPITALCOM:US30',  dec:1, pip:1.0,    spread:2.0,     cat:'Indices',     lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   tv:'CAPITALCOM:DE40',  dec:1, pip:1.0,    spread:1.0,     cat:'Indices',     lotUSD:(p:number)=>p*25 },
  { sym:'WTI',     tv:'TVC:USOIL',        dec:2, pip:0.01,   spread:0.03,    cat:'Commodities', lotUSD:(p:number)=>p*1000 },
] as const

const SEEDS: Record<string,number> = {
  'EUR/USD':1.0820,'GBP/USD':1.2960,'USD/JPY':149.20,'USD/CHF':0.8850,
  'AUD/USD':0.6280,'USD/CAD':1.4380,'NZD/USD':0.5720,'EUR/JPY':161.50,
  'GBP/JPY':193.20,'EUR/GBP':0.8350,'AUD/JPY':93.70,'CAD/JPY':103.80,
  'XAU/USD':3320.0,'XAG/USD':33.80,
  'NAS100':19800,'US500':5580,'US30':41700,'GER40':22500,'WTI':68.50,
}

/* ══ TV TIMEFRAMES ════════════════════════════════════════════════ */
const TF_LIST = [
  { label:'1m',  tv:'1'   },
  { label:'5m',  tv:'5'   },
  { label:'15m', tv:'15'  },
  { label:'30m', tv:'30'  },
  { label:'1h',  tv:'60'  },
  { label:'4h',  tv:'240' },
  { label:'1d',  tv:'D'   },
  { label:'1w',  tv:'W'   },
]

/* ══ TRADINGVIEW WIDGET ═══════════════════════════════════════════ */
// Keep one widget per symbol alive — don't destroy on TF change
const tvContainers: Map<string, HTMLDivElement> = new Map()

function TVChart({ tvSym, tfTv }: { tvSym: string; tfTv: string }) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const builtRef = useRef<string>('')  // 'sym:tf' that was built

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const key = `${tvSym}:${tfTv}`
    if (builtRef.current === key) return  // already built with this exact sym+tf
    builtRef.current = key
    wrap.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.cssText = 'width:100%;height:100%'

    const inner = document.createElement('div')
    inner.className = 'tradingview-widget-container__widget'
    inner.style.cssText = 'width:100%;height:calc(100% - 32px)'

    const script = document.createElement('script')
    script.type  = 'text/javascript'
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:           true,
      symbol:             tvSym,
      interval:           tfTv,
      timezone:           'Etc/UTC',
      theme:              'light',
      style:              '1',
      locale:             'en',
      enable_publishing:  false,
      hide_top_toolbar:   false,
      save_image:         false,
      backgroundColor:    'rgba(250,251,255,1)',
      gridColor:          'rgba(34,85,204,0.05)',
      hide_volume:        false,
      support_host:       'https://www.tradingview.com',
    })

    container.appendChild(inner)
    container.appendChild(script)
    wrap.appendChild(container)
  }, [tvSym, tfTv])

  return <div ref={wrapRef} style={{ width:'100%', height:'100%' }} />
}

/* ══ PRICE FEED — polling via TV ticker widget ═════════════════════ */
// We scrape prices by embedding hidden TV ticker and reading DOM
// Fallback: just use SEEDS and update via a simple interval simulation
function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({...SEEDS})
  const prevRef  = useRef<Record<string,number>>({...SEEDS})
  const priceRef = useRef<Record<string,number>>({...SEEDS})

  const push = useCallback((sym:string, price:number) => {
    if (!price||isNaN(price)||price<=0) return
    prevRef.current[sym]  = priceRef.current[sym] || price
    priceRef.current[sym] = price
    setPrices(p => p[sym]===price ? p : {...p,[sym]:price})
  }, [])

  // Poll via Polygon free snapshot (delayed but directionally correct)
  useEffect(() => {
    const POLY = 'G6lKjTXfN4R1XHY6DoFAsIvDymYQ7fNO'
    let dead = false
    let pollT: any

    const poll = async () => {
      if (dead) return
      // Forex snapshot
      try {
        const forexTickers = 'C:EURUSD,C:GBPUSD,C:USDJPY,C:USDCHF,C:AUDUSD,C:USDCAD,C:NZDUSD,C:EURJPY,C:GBPJPY,C:EURGBP,C:AUDJPY,C:CADJPY,C:XAUUSD,C:XAGUSD'
        const r = await fetch(`https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers?tickers=${forexTickers}&apiKey=${POLY}`)
        const d = await r.json()
        if (d.tickers) {
          for (const t of d.tickers) {
            const symMap: Record<string,string> = {
              'C:EURUSD':'EUR/USD','C:GBPUSD':'GBP/USD','C:USDJPY':'USD/JPY',
              'C:USDCHF':'USD/CHF','C:AUDUSD':'AUD/USD','C:USDCAD':'USD/CAD',
              'C:NZDUSD':'NZD/USD','C:EURJPY':'EUR/JPY','C:GBPJPY':'GBP/JPY',
              'C:EURGBP':'EUR/GBP','C:AUDJPY':'AUD/JPY','C:CADJPY':'CAD/JPY',
              'C:XAUUSD':'XAU/USD','C:XAGUSD':'XAG/USD',
            }
            const sym = symMap[t.ticker]
            if (!sym) continue
            const inst = INSTRUMENTS.find(i=>i.sym===sym) as any
            const price = t.lastQuote?.mp || ((t.lastQuote?.ap||0)+(t.lastQuote?.bp||0))/2 || t.day?.c || 0
            if (price > 0) push(sym, +price.toFixed(inst?.dec??5))
          }
        }
      } catch {}

      // Indices via ETF proxies
      try {
        const etfMap: Record<string,[string,number]> = {
          'QQQ':['NAS100',40], 'SPY':['US500',10], 'DIA':['US30',100], 'EWG':['GER40',740]
        }
        const tickers = Object.keys(etfMap).join(',')
        const r = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers}&apiKey=${POLY}`)
        const d = await r.json()
        if (d.tickers) {
          for (const t of d.tickers) {
            const mapping = etfMap[t.ticker]
            if (!mapping) continue
            const [sym, mult] = mapping
            const price = t.day?.c || t.lastTrade?.p || t.prevDay?.c || 0
            if (price > 0) push(sym, Math.round(price * mult * 10) / 10)
          }
        }
      } catch {}
    }

    poll()
    pollT = setInterval(poll, 10000)
    return () => { dead = true; clearInterval(pollT) }
  }, [push])

  return { prices, prevRef, priceRef, push }
}

/* ══ P&L ══════════════════════════════════════════════════════════ */
function calcPnl(trade:any, price:number): number {
  const inst = INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if (!inst||!price) return 0
  const diff = trade.direction==='buy' ? price-trade.open_price : trade.open_price-price
  return diff * (trade.symbol.includes('JPY') ? LOT_SIZE/price : inst.lotUSD(1)) * trade.lots
}

/* ══ RISK MONITOR ═════════════════════════════════════════════════ */
function useRiskMonitor(tradesRef:any,priceRef:any,primaryRef:any,accountId:any,onBreach:any) {
  const firedRef=useRef(false)
  const cbRef=useRef(onBreach); cbRef.current=onBreach
  useEffect(()=>{
    const iv=setInterval(()=>{
      const pr=primaryRef.current,trades=tradesRef.current,prices=priceRef.current
      if(!pr||!trades.length||firedRef.current) return
      if(pr.status==='breached'||pr.status==='passed') return
      const bal=pr.balance??0,startBal=pr.starting_balance??bal
      if(bal<=0||startBal<=0) return
      const cp=(pr as any).challenge_products,phase=pr.phase??'phase1'
      const maxDD  =phase==='funded'?(cp?.funded_max_dd??10):phase==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10)
      const dailyDD=phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)
      const floor =startBal-startBal*(maxDD/100)
      const dFloor=(pr.daily_high_balance??startBal)-(pr.daily_high_balance??startBal)*(dailyDD/100)
      const equity=bal+trades.reduce((s:number,t:any)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]||t.open_price),0)
      if(equity<=floor){firedRef.current=true;cbRef.current(`Max DD breached — equity $${equity.toFixed(2)} (limit:${maxDD}%)`,trades);return}
      if(equity<=dFloor){firedRef.current=true;cbRef.current(`Daily DD breached — equity $${equity.toFixed(2)} (limit:${dailyDD}%)`,trades);return}
    },500)
    return()=>clearInterval(iv)
  },[])
  useEffect(()=>{firedRef.current=false},[accountId])
}

/* ══ EDIT SL/TP MODAL ═════════════════════════════════════════════ */
function EditModal({trade,inst,onSave,onClose}:{trade:any;inst:any;onSave:(sl:string,tp:string)=>void;onClose:()=>void}) {
  const [sl,setSl]=useState(trade.sl?String(trade.sl):'')
  const [tp,setTp]=useState(trade.tp?String(trade.tp):'')
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:'12px',padding:'24px',width:'320px',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'14px',fontWeight:700,color:'#1A3A6B'}}>Edit SL / TP</div>
            <div style={{fontSize:'11px',color:'#8FA3BF',marginTop:'2px'}}>
              <span style={{color:trade.direction==='buy'?'#16A34A':'#DC2626',fontWeight:600}}>{trade.direction.toUpperCase()}</span>
              {' '}{trade.lots} {trade.symbol} @ {(Number(trade.open_price)||0).toFixed(inst?.dec??5)}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:'#8FA3BF'}}>✕</button>
        </div>
        <div style={{background:'#F4F7FD',borderRadius:'8px',padding:'10px',marginBottom:'14px',fontSize:'11px'}}>
          {sl&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}><span style={{color:'#DC2626'}}>SL distance</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:'#DC2626'}}>{(Math.abs((trade.open_price||0)-parseFloat(sl))/(inst?.pip??0.0001)).toFixed(0)} pips</span></div>}
          {tp&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#16A34A'}}>TP distance</span><span style={{fontFamily:"'JetBrains Mono',monospace",color:'#16A34A'}}>{(Math.abs((trade.open_price||0)-parseFloat(tp))/(inst?.pip??0.0001)).toFixed(0)} pips</span></div>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          <div>
            <div style={{fontSize:'10px',color:'#DC2626',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>Stop Loss</div>
            <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst?.pip}
              style={{width:'100%',padding:'8px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.3)',borderRadius:'8px',fontSize:'13px',fontFamily:"'JetBrains Mono',monospace",color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{fontSize:'10px',color:'#16A34A',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>Take Profit</div>
            <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst?.pip}
              style={{width:'100%',padding:'8px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.3)',borderRadius:'8px',fontSize:'13px',fontFamily:"'JetBrains Mono',monospace",color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={onClose} style={{flex:1,padding:'10px',background:'#F4F7FD',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:600,color:'#5C7A9E'}}>Cancel</button>
          <button onClick={()=>onSave(sl,tp)} style={{flex:2,padding:'10px',background:'#2255CC',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:700,color:'#fff'}}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

/* ══ PLATFORM PAGE ════════════════════════════════════════════════ */
export function PlatformPage() {
  const navigate=useNavigate()
  const {toasts,toast,dismiss}=useToast()
  const {accounts,primary:defPrimary}=useAccount()
  const [selAccId,setSelAccId]=useState<string|null>(null)
  const primary=accounts.find(a=>a.id===selAccId)??defPrimary

  const [sym,      setSym]      =useState<string>(()=>lsGet('tfd_sym','EUR/USD'))
  const [tfLabel,  setTfLabel]  =useState<string>(()=>lsGet('tfd_tf','1h'))
  const [favorites,setFavs]     =useState<string[]>(()=>lsGet('tfd_favs',['EUR/USD','GBP/USD','XAU/USD','NAS100']))
  const [catFilter,setCatFilter]=useState<string>(()=>lsGet('tfd_cat','All'))
  const [dir,      setDir]      =useState<'buy'|'sell'>('buy')
  const [lots,     setLots]     =useState('0.10')
  const [sl,       setSl]       =useState('')
  const [tp,       setTp]       =useState('')
  const [tab,      setTab]      =useState<'positions'|'history'>('positions')
  const [search,   setSearch]   =useState('')
  const [placing,  setPlacing]  =useState(false)
  const [editTrade,setEditTrade]=useState<any>(null)
  const [openTrades,    setOpenTrades]   =useState<any[]>([])
  const [closedTrades,  setClosedTrades] =useState<any[]>([])

  const {prices,prevRef,priceRef,push}=usePriceFeed()
  const tradesRef =useRef<any[]>([]);  tradesRef.current =openTrades
  const primaryRef=useRef<any>(null);  primaryRef.current=primary
  const closingRef=useRef<Set<string>>(new Set())

  const tf      =TF_LIST.find(t=>t.label===tfLabel)??TF_LIST[4]
  const inst    =(INSTRUMENTS.find(i=>i.sym===sym)??INSTRUMENTS[0]) as any
  const live    =prices[sym]||SEEDS[sym]
  const prev    =prevRef.current[sym]||live
  const up      =live>=prev
  const exec    =+(dir==='buy'?live+inst.spread:live).toFixed(inst.dec)
  const lotsNum =Math.max(0.01,parseFloat(lots)||0.01)
  const balance =primary?.balance??0
  const openPnl =openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]),0)
  const equity  =balance+openPnl
  const usedMgn =openTrades.reduce((s,t)=>{
    const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    return s+(i?.lotUSD(prices[t.symbol]||SEEDS[t.symbol])*t.lots/LEVERAGE||0)
  },0)
  const freeMgn =equity-usedMgn
  const mgnLvl  =usedMgn>0?(equity/usedMgn)*100:999
  const reqMgn  =inst.lotUSD(exec)*lotsNum/LEVERAGE
  const notional=inst.lotUSD(exec)*lotsNum
  const maxLots =freeMgn>0?Math.floor((freeMgn*LEVERAGE/inst.lotUSD(exec))*100)/100:0

  useEffect(()=>lsSet('tfd_sym',sym),[sym])
  useEffect(()=>lsSet('tfd_tf',tfLabel),[tfLabel])
  useEffect(()=>lsSet('tfd_favs',favorites),[favorites])
  useEffect(()=>lsSet('tfd_cat',catFilter),[catFilter])

  useEffect(()=>{
    if(!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open').order('opened_at',{ascending:false}).then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed').order('closed_at',{ascending:false}).limit(100).then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  useRiskMonitor(tradesRef,priceRef,primaryRef,primary?.id,async(reason:string,trades:any[])=>{
    toast('error','🚨','Account Breached',reason)
    if(!primary?.id) return
    for(const t of trades){
      const cur=priceRef.current[t.symbol]||SEEDS[t.symbol]||t.open_price
      const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const cp=+(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
      const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
      const isJpy=t.symbol.includes('JPY')
      const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i?.lotUSD(1)??LOT_SIZE)*t.lots).toFixed(2)
      await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,closed_at:new Date().toISOString()}).eq('id',t.id)
    }
    const newBal=+(balance+trades.reduce((s,t)=>{
      const cur=priceRef.current[t.symbol]||t.open_price
      const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
      const isJpy=t.symbol.includes('JPY')
      return s+(t.direction==='buy'?cur-t.open_price:t.open_price-cur)*(isJpy?LOT_SIZE/cur:i?.lotUSD(1)??LOT_SIZE)*t.lots
    },0)).toFixed(2)
    await supabase.from('accounts').update({status:'breached',phase:'breached',balance:newBal,equity:newBal}).eq('id',primary.id)
    setOpenTrades([])
  })

  useEffect(()=>{
    if(!primary?.id) return
    const iv=setInterval(async()=>{
      const trades=tradesRef.current,pr=primaryRef.current
      if(!trades.length||!pr) return
      for(const t of trades){
        if(closingRef.current.has(t.id)||(!t.sl&&!t.tp)) continue
        const realPrice=priceRef.current[t.symbol]
        if(!realPrice||realPrice<=0) continue
        const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
        if(!i) continue
        let hit=''
        if(t.sl){const sl=Number(t.sl);if(sl>0){const h=t.direction==='buy'?realPrice<=sl:realPrice>=sl;if(h)hit=`SL @ ${realPrice.toFixed(i.dec)}`}}
        if(!hit&&t.tp){const tp=Number(t.tp);if(tp>0){const h=t.direction==='buy'?realPrice>=tp:realPrice<=tp;if(h)hit=`TP @ ${realPrice.toFixed(i.dec)}`}}
        if(!hit) continue
        closingRef.current.add(t.id)
        try{
          const cp=+(t.direction==='buy'?realPrice:realPrice+i.spread).toFixed(i.dec)
          const diff=t.direction==='buy'?cp-t.open_price:t.open_price-cp
          const isJpy=t.symbol.includes('JPY')
          const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i.lotUSD(1))*t.lots).toFixed(2)
          const pips=+(diff/i.pip).toFixed(1)
          if(Math.abs(netPnl)>(pr.balance??0)*2){closingRef.current.delete(t.id);continue}
          const now=new Date().toISOString()
          await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
          await supabase.from('accounts').update({balance:+((pr.balance??0)+netPnl).toFixed(2),equity:+((pr.balance??0)+netPnl).toFixed(2)}).eq('id',pr.id)
          setOpenTrades(p=>p.filter(x=>x.id!==t.id))
          setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
          toast(netPnl>=0?'success':'error',netPnl>=0?'🎯':'🛑',`${hit} — ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)} | ${pips>=0?'+':''}${pips}p`)
        }catch(e){closingRef.current.delete(t.id)}
      }
    },1000)
    return()=>clearInterval(iv)
  },[primary?.id])

  function toggleFav(s:string){setFavs(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])}

  async function placeOrder(){
    if(!primary?.id){toast('error','❌','No Account','Select a funded account.');return}
    if(primary.status==='breached'){toast('error','❌','Breached','Account is breached.');return}
    if(reqMgn>freeMgn){toast('error','❌','Insufficient Margin',`Required: $${reqMgn.toFixed(2)} | Free: $${freeMgn.toFixed(2)} | Max: ${maxLots} lots`);return}
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
    toast('success','✅',`${dir.toUpperCase()} ${sym}`,`${lotsNum} lots @ ${exec} | Margin: $${reqMgn.toFixed(2)}`)
    setSl('');setTp('')
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
    await supabase.from('accounts').update({balance:+(balance+netPnl).toFixed(2),equity:+(equity+netPnl-openPnl).toFixed(2)}).eq('id',primary!.id)
    setOpenTrades(p=>p.filter(x=>x.id!==t.id))
    setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
    toast(netPnl>=0?'success':'error',netPnl>=0?'💰':'📉',`Closed ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)} | ${pips>=0?'+':''}${pips}p`)
  }

  async function saveSLTP(newSl:string,newTp:string){
    if(!editTrade) return
    const updates={sl:newSl?parseFloat(newSl):null,tp:newTp?parseFloat(newTp):null}
    await supabase.from('trades').update(updates).eq('id',editTrade.id)
    setOpenTrades(p=>p.map(t=>t.id===editTrade.id?{...t,...updates}:t))
    setEditTrade(null)
    toast('success','✅','SL/TP Updated',editTrade.symbol)
  }

  const CATS=['All','Favourites','Forex','Metals','Indices','Commodities']
  const visible=INSTRUMENTS.filter(i=>{
    if(catFilter==='Favourites') return favorites.includes(i.sym)
    if(catFilter!=='All'&&i.cat!==catFilter) return false
    if(search&&!i.sym.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const mono={fontFamily:"'JetBrains Mono',monospace"} as const

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#F0F4FB',color:'#1A3A6B',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* TOPBAR */}
      <div style={{height:'48px',background:'#1A3A6B',display:'flex',alignItems:'center',padding:'0 12px',gap:'10px',flexShrink:0}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:600}}>← Dashboard</button>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:'14px',fontWeight:700,color:'#fff'}}>The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ADE80',boxShadow:'0 0 8px #4ADE80'}}/>
          <span style={{fontSize:'10px',color:'#4ADE80',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase'}}>Live</span>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:'6px',alignItems:'center'}}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>setSelAccId(a.id)} style={{padding:'4px 10px',background:a.id===primary?.id?'rgba(96,165,250,.2)':'rgba(255,255,255,.08)',border:a.id===primary?.id?'1px solid rgba(96,165,250,.4)':'1px solid rgba(255,255,255,.1)',borderRadius:'5px',color:a.id===primary?.id?'#60A5FA':'rgba(255,255,255,.5)',fontSize:'10px',...mono,cursor:'pointer'}}>
              {(a as any).account_number}
            </button>
          ))}
        </div>
        <div style={{display:'flex'}}>
          {[['Bal',`$${(Number(balance)||0).toFixed(2)}`,'#fff'],['Equity',`$${(Number(equity)||0).toFixed(2)}`,equity>=balance?'#4ADE80':'#F87171'],['Float',`${openPnl>=0?'+':''}$${(Number(openPnl)||0).toFixed(2)}`,openPnl>=0?'#4ADE80':'#F87171'],['Margin',`$${(Number(usedMgn)||0).toFixed(2)}`,'#FCD34D'],['Free',`$${(Number(freeMgn)||0).toFixed(2)}`,'#60A5FA']].map(([l,v,c])=>(
            <div key={String(l)} style={{padding:'0 9px',borderLeft:'1px solid rgba(255,255,255,.1)',textAlign:'right'}}>
              <div style={{fontSize:'8px',color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'1px'}}>{l}</div>
              <div style={{...mono,fontSize:'11px',fontWeight:600,color:String(c)}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* WATCHLIST */}
        <div style={{width:'185px',background:'#fff',borderRight:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0,overflow:'hidden'}}>
          <div style={{padding:'8px',borderBottom:'1px solid #E8EEF8',flexShrink:0}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{width:'100%',padding:'5px 8px',background:'#F4F7FD',border:'1px solid #E8EEF8',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:'2px',marginTop:'5px',flexWrap:'wrap'}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{padding:'2px 5px',fontSize:'8px',fontWeight:700,border:'none',borderRadius:'4px',cursor:'pointer',background:catFilter===c?'#2255CC':'#F4F7FD',color:catFilter===c?'#fff':'#8FA3BF',textTransform:'uppercase'}}>
                  {c==='Favourites'?'★':c==='Commodities'?'Comm':c}
                </button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {visible.length===0&&catFilter==='Favourites'&&<div style={{padding:'20px 12px',textAlign:'center',fontSize:'11px',color:'#8FA3BF'}}>★ Click star to add pairs</div>}
            {visible.map(i=>{
              const price=prices[i.sym]||SEEDS[i.sym]
              const pv=prevRef.current[i.sym]||price
              const isUp=price>=pv
              const active=sym===i.sym
              const isFav=favorites.includes(i.sym)
              return (
                <div key={i.sym} style={{padding:'6px 8px',borderBottom:'1px solid #F0F4FB',display:'flex',alignItems:'center',background:active?'#EEF3FF':'transparent',borderLeft:active?'3px solid #2255CC':'3px solid transparent'}}>
                  <button onClick={()=>toggleFav(i.sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:isFav?'#F59E0B':'#D1D5DB',padding:'0 4px 0 0',flexShrink:0}}>{isFav?'★':'☆'}</button>
                  <div style={{flex:1,cursor:'pointer'}} onClick={()=>setSym(i.sym)}>
                    <div style={{fontSize:'11px',fontWeight:600,color:active?'#2255CC':'#1A3A6B'}}>{i.sym}</div>
                    <div style={{fontSize:'9px',color:'#8FA3BF'}}>{i.cat}</div>
                  </div>
                  <div style={{textAlign:'right',cursor:'pointer'}} onClick={()=>setSym(i.sym)}>
                    <div style={{...mono,fontSize:'11px',fontWeight:500,color:isUp?'#16A34A':'#DC2626'}}>{price.toFixed(i.dec)}</div>
                    <div style={{fontSize:'9px',color:isUp?'#16A34A':'#DC2626'}}>{isUp?'▲':'▼'}{Math.abs(price-pv).toFixed(i.dec)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CHART */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{height:'40px',background:'#fff',borderBottom:'1px solid #E8EEF8',display:'flex',alignItems:'center',padding:'0 12px',gap:'8px',flexShrink:0}}>
            <div style={{...mono,fontSize:'20px',fontWeight:700,color:up?'#16A34A':'#DC2626'}}>{live.toFixed(inst.dec)}</div>
            <div style={{fontSize:'11px',color:up?'#16A34A':'#DC2626'}}>{up?'▲':'▼'} {Math.abs(live-prev).toFixed(inst.dec)}</div>
            <div style={{fontSize:'14px',fontWeight:700,color:'#1A3A6B'}}>{sym}</div>
            <button onClick={()=>toggleFav(sym)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:favorites.includes(sym)?'#F59E0B':'#D1D5DB',padding:'0'}}>{favorites.includes(sym)?'★':'☆'}</button>
            <div style={{display:'flex',gap:'3px',marginLeft:'8px'}}>
              {TF_LIST.map(t=>(
                <button key={t.label} onClick={()=>setTfLabel(t.label)} style={{padding:'3px 9px',fontSize:'10px',fontWeight:600,border:'none',borderRadius:'5px',cursor:'pointer',background:tfLabel===t.label?'#2255CC':'#F4F7FD',color:tfLabel===t.label?'#fff':'#5C7A9E'}}>{t.label}</button>
              ))}
            </div>
            <div style={{marginLeft:'auto',fontSize:'10px',color:'#16A34A',background:'rgba(22,163,74,.08)',padding:'3px 10px',borderRadius:'20px',fontWeight:600}}>● TradingView Live</div>
          </div>
          <div style={{flex:1}}>
            <TVChart tvSym={inst.tv} tfTv={tf.tv} />
          </div>
        </div>

        {/* ORDER PANEL */}
        <div style={{width:'235px',background:'#fff',borderLeft:'1px solid #E8EEF8',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'12px',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'10px'}}>New Order — {sym}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'10px'}}>
              <button onClick={()=>setDir('buy')}  style={{padding:'10px',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,fontSize:'13px',background:dir==='buy'?'#16A34A':'#F4F7FD',color:dir==='buy'?'#fff':'#5C7A9E'}}>BUY</button>
              <button onClick={()=>setDir('sell')} style={{padding:'10px',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,fontSize:'13px',background:dir==='sell'?'#DC2626':'#F4F7FD',color:dir==='sell'?'#fff':'#5C7A9E'}}>SELL</button>
            </div>
            <div style={{background:dir==='buy'?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)',border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`,borderRadius:'8px',padding:'10px',marginBottom:'10px',textAlign:'center'}}>
              <div style={{fontSize:'9px',color:'#8FA3BF',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'3px'}}>Execution Price · Live</div>
              <div style={{...mono,fontSize:'22px',fontWeight:700,color:dir==='buy'?'#16A34A':'#DC2626'}}>{exec.toFixed(inst.dec)}</div>
              <div style={{fontSize:'9px',color:'#8FA3BF',marginTop:'2px'}}>spread {inst.spread.toFixed(inst.dec)}</div>
            </div>
            <div style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                <span style={{fontSize:'9px',color:'#8FA3BF',fontWeight:600,textTransform:'uppercase'}}>Lots</span>
                <span style={{fontSize:'9px',color:'#8FA3BF'}}>Max: <span style={{color:lotsNum>maxLots?'#DC2626':'#16A34A',fontWeight:600}}>{maxLots}</span></span>
              </div>
              <div style={{display:'flex',border:'1px solid #E8EEF8',borderRadius:'8px',overflow:'hidden'}}>
                <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{padding:'0 14px',background:'#F4F7FD',border:'none',borderRight:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'20px',lineHeight:1}}>−</button>
                <input value={lots} onChange={e=>setLots(e.target.value)} type="number" min="0.01" step="0.01"
                  style={{flex:1,padding:'8px',background:'#fff',border:'none',textAlign:'center',...mono,fontSize:'14px',fontWeight:600,color:lotsNum>maxLots?'#DC2626':'#1A3A6B',outline:'none'}}/>
                <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{padding:'0 14px',background:'#F4F7FD',border:'none',borderLeft:'1px solid #E8EEF8',cursor:'pointer',color:'#5C7A9E',fontSize:'20px',lineHeight:1}}>+</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'10px'}}>
              <div>
                <div style={{fontSize:'9px',color:'#DC2626',fontWeight:600,textTransform:'uppercase',marginBottom:'3px'}}>Stop Loss</div>
                <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst.pip}
                  style={{width:'100%',padding:'6px 8px',background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
              <div>
                <div style={{fontSize:'9px',color:'#16A34A',fontWeight:600,textTransform:'uppercase',marginBottom:'3px'}}>Take Profit</div>
                <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst.pip}
                  style={{width:'100%',padding:'6px 8px',background:'#F0FDF4',border:'1px solid rgba(22,163,74,.2)',borderRadius:'6px',fontSize:'11px',color:'#1A3A6B',outline:'none',...mono,boxSizing:'border-box'}}/>
              </div>
            </div>
            <div style={{background:'#F4F7FD',borderRadius:'8px',padding:'10px',marginBottom:'10px',border:lotsNum>maxLots?'1px solid rgba(220,38,38,.3)':'1px solid transparent'}}>
              <div style={{fontSize:'9px',color:'#8FA3BF',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px'}}>Leverage 1:{LEVERAGE}</div>
              {[['Notional',`$${(Number(notional)||0).toFixed(0)}`,'#5C7A9E'],['Req. Margin',`$${(Number(reqMgn)||0).toFixed(2)}`,lotsNum>maxLots?'#DC2626':'#1A3A6B'],['Free Margin',`$${(Number(freeMgn)||0).toFixed(2)}`,freeMgn>reqMgn?'#16A34A':'#DC2626'],['Margin Lvl',usedMgn>0?`${(Number(mgnLvl)||0).toFixed(0)}%`:'∞',mgnLvl<150&&usedMgn>0?'#DC2626':'#16A34A']].map(([l,v,c])=>(
                <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',fontSize:'11px'}}>
                  <span style={{color:'#8FA3BF'}}>{l}</span>
                  <span style={{...mono,color:String(c),fontWeight:500}}>{v}</span>
                </div>
              ))}
              {lotsNum>maxLots&&<div style={{marginTop:'6px',fontSize:'10px',color:'#DC2626',fontWeight:600,background:'rgba(220,38,38,.06)',padding:'4px 8px',borderRadius:'4px'}}>⚠ Max {maxLots} lots at 1:{LEVERAGE}</div>}
            </div>
            <button onClick={placeOrder} disabled={placing||!primary||primary.status==='breached'||lotsNum>maxLots}
              style={{width:'100%',padding:'12px',fontSize:'13px',fontWeight:700,border:'none',borderRadius:'8px',cursor:lotsNum>maxLots?'not-allowed':'pointer',background:lotsNum>maxLots?'#9CA3AF':dir==='buy'?'#16A34A':'#DC2626',color:'#fff',opacity:placing||!primary||primary.status==='breached'?0.5:1,letterSpacing:'.5px',textTransform:'uppercase'}}>
              {placing?'…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
            </button>
          </div>
          <div style={{padding:'10px 12px',borderTop:'1px solid #E8EEF8',flexShrink:0}}>
            {[['Account',(primary as any)?.account_number??'—','#1A3A6B'],['Phase',primary?.phase??'—','#2255CC'],['Status',primary?.status??'—',primary?.status==='active'?'#16A34A':'#DC2626']].map(([l,v,c])=>(
              <div key={String(l)} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'10px'}}>
                <span style={{color:'#8FA3BF'}}>{l}</span>
                <span style={{...mono,color:String(c),fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{height:'180px',background:'#fff',borderTop:'1px solid #E8EEF8',flexShrink:0,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',borderBottom:'1px solid #E8EEF8',height:'34px',padding:'0 12px',flexShrink:0}}>
          {(['positions','history'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'0 14px',height:'34px',fontSize:'11px',fontWeight:600,border:'none',borderBottom:tab===t?'2px solid #2255CC':'2px solid transparent',background:'transparent',color:tab===t?'#2255CC':'#8FA3BF',cursor:'pointer',textTransform:'capitalize'}}>
              {t}{t==='positions'&&openTrades.length>0?` (${openTrades.length})`:''}
            </button>
          ))}
          <div style={{marginLeft:'auto',...mono,fontSize:'12px',fontWeight:600,color:openPnl>=0?'#16A34A':'#DC2626'}}>
            Float: {openPnl>=0?'+':''}${(Number(openPnl)||0).toFixed(2)}
          </div>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {tab==='positions'?(
            openTrades.length===0
              ?<div style={{padding:'18px',textAlign:'center',fontSize:'12px',color:'#8FA3BF'}}>No open positions</div>
              :<table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr>{['Symbol','Dir','Lots','Entry','Live','P&L','Pips','SL','TP','Margin','Actions'].map(h=>(
                  <th key={h} style={{padding:'4px 8px',fontSize:'9px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB',whiteSpace:'nowrap'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{openTrades.map(t=>{
                  const cur=prices[t.symbol]||SEEDS[t.symbol]||t.open_price
                  const pnl=calcPnl(t,cur)
                  const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                  const pipD=i?(t.direction==='buy'?cur-t.open_price:t.open_price-cur)/(i.pip??0.0001):0
                  const tMgn=i?(i.lotUSD(cur)*t.lots/LEVERAGE):0
                  return (
                    <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                      <td style={{padding:'5px 8px',fontWeight:600}}>
                        <button onClick={()=>setSym(t.symbol)} style={{background:'none',border:'none',cursor:'pointer',fontWeight:600,color:'#2255CC',fontSize:'11px',padding:0}}>{t.symbol}</button>
                      </td>
                      <td style={{padding:'5px 8px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                      <td style={{padding:'5px 8px',...mono}}>{t.lots}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,color:cur>=t.open_price?'#16A34A':'#DC2626',fontWeight:500}}>{cur.toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,fontWeight:700,color:pnl>=0?'#16A34A':'#DC2626'}}>{pnl>=0?'+':''}${(Number(pnl)||0).toFixed(2)}</td>
                      <td style={{padding:'5px 8px',...mono,color:pipD>=0?'#16A34A':'#DC2626'}}>{pipD>=0?'+':''}{(Number(pipD)||0).toFixed(1)}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#DC2626',fontSize:'10px'}}>{t.sl??'—'}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#16A34A',fontSize:'10px'}}>{t.tp??'—'}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E',fontSize:'10px'}}>${(Number(tMgn)||0).toFixed(2)}</td>
                      <td style={{padding:'5px 8px'}}>
                        <div style={{display:'flex',gap:'4px'}}>
                          <button onClick={()=>setEditTrade(t)} style={{padding:'3px 8px',fontSize:'10px',fontWeight:600,background:'#EEF3FF',border:'1px solid rgba(34,85,204,.2)',borderRadius:'5px',cursor:'pointer',color:'#2255CC',whiteSpace:'nowrap'}}>Edit</button>
                          <button onClick={()=>closeTrade(t)} style={{padding:'3px 8px',fontSize:'10px',fontWeight:600,background:'#FEF2F2',border:'1px solid rgba(220,38,38,.2)',borderRadius:'5px',cursor:'pointer',color:'#DC2626',whiteSpace:'nowrap'}}>Close</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
          ):(
            closedTrades.length===0
              ?<div style={{padding:'18px',textAlign:'center',fontSize:'12px',color:'#8FA3BF'}}>No closed trades</div>
              :<table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr>{['Symbol','Dir','Lots','Open','Close','P&L','Pips','Closed'].map(h=>(
                  <th key={h} style={{padding:'4px 8px',fontSize:'9px',textTransform:'uppercase',letterSpacing:'1px',color:'#8FA3BF',fontWeight:600,textAlign:'left',background:'#FAFBFF',borderBottom:'1px solid #F0F4FB'}}>{h}</th>
                ))}</tr></thead>
                <tbody>{closedTrades.map(t=>{
                  const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                  return (
                    <tr key={t.id} style={{borderBottom:'1px solid #F4F7FD'}}>
                      <td style={{padding:'5px 8px',fontWeight:600}}>{t.symbol}</td>
                      <td style={{padding:'5px 8px',fontWeight:700,color:t.direction==='buy'?'#16A34A':'#DC2626'}}>{t.direction.toUpperCase()}</td>
                      <td style={{padding:'5px 8px',...mono}}>{t.lots}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E'}}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,color:'#5C7A9E'}}>{(Number(t.close_price)||0).toFixed(i?.dec??5)}</td>
                      <td style={{padding:'5px 8px',...mono,fontWeight:700,color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626'}}>{(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}</td>
                      <td style={{padding:'5px 8px',...mono,color:(t.pips??0)>=0?'#16A34A':'#DC2626'}}>{(t.pips??0)>=0?'+':''}{(Number(t.pips)||0).toFixed(1)}</td>
                      <td style={{padding:'5px 8px',color:'#8FA3BF',fontSize:'10px'}}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
          )}
        </div>
      </div>

      {editTrade&&<EditModal trade={editTrade} inst={INSTRUMENTS.find(i=>i.sym===editTrade.symbol)} onSave={saveSLTP} onClose={()=>setEditTrade(null)}/>}
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </div>
  )
}
