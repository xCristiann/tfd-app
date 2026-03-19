import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const FINNHUB  = (import.meta as any).env?.VITE_FINNHUB_KEY ?? ''
const LEVERAGE = 50
const LOT_SIZE = 100_000

/* ── Persist to localStorage ─────────────────────────────────────── */
function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

/* ══ INSTRUMENTS ═══════════════════════════════════════════════════ */
const INSTRUMENTS = [
  { sym:'EUR/USD', tv:'FX:EURUSD',        fh:'OANDA:EUR_USD',  dec:5, pip:0.0001, spread:0.00010, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'GBP/USD', tv:'FX:GBPUSD',        fh:'OANDA:GBP_USD',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/JPY', tv:'FX:USDJPY',        fh:'OANDA:USD_JPY',  dec:3, pip:0.01,   spread:0.010,   cat:'Forex',       lotUSD:(_:number)=>LOT_SIZE },
  { sym:'USD/CHF', tv:'FX:USDCHF',        fh:'OANDA:USD_CHF',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'AUD/USD', tv:'FX:AUDUSD',        fh:'OANDA:AUD_USD',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'USD/CAD', tv:'FX:USDCAD',        fh:'OANDA:USD_CAD',  dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>LOT_SIZE/p },
  { sym:'NZD/USD', tv:'FX:NZDUSD',        fh:'OANDA:NZD_USD',  dec:5, pip:0.0001, spread:0.00020, cat:'Forex',       lotUSD:(p:number)=>p*LOT_SIZE },
  { sym:'EUR/JPY', tv:'FX:EURJPY',        fh:'OANDA:EUR_JPY',  dec:3, pip:0.01,   spread:0.025,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'GBP/JPY', tv:'FX:GBPJPY',        fh:'OANDA:GBP_JPY',  dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'EUR/GBP', tv:'FX:EURGBP',        fh:'OANDA:EUR_GBP',  dec:5, pip:0.0001, spread:0.00015, cat:'Forex',       lotUSD:(p:number)=>p*1.27*LOT_SIZE },
  { sym:'AUD/JPY', tv:'FX:AUDJPY',        fh:'OANDA:AUD_JPY',  dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'CAD/JPY', tv:'FX:CADJPY',        fh:'OANDA:CAD_JPY',  dec:3, pip:0.01,   spread:0.030,   cat:'Forex',       lotUSD:(p:number)=>p/148*LOT_SIZE },
  { sym:'XAU/USD', tv:'TVC:GOLD',         fh:'OANDA:XAU_USD',  dec:2, pip:0.10,   spread:0.30,    cat:'Metals',      lotUSD:(p:number)=>p*100 },
  { sym:'XAG/USD', tv:'TVC:SILVER',       fh:'OANDA:XAG_USD',  dec:4, pip:0.001,  spread:0.030,   cat:'Metals',      lotUSD:(p:number)=>p*5000 },
  { sym:'NAS100',  tv:'CAPITALCOM:US100', fh:'NASDAQ:QQQ',     dec:2, pip:1.0,    spread:1.5,     cat:'Indices', idxMult:40,  lotUSD:(p:number)=>p*400 },
  { sym:'US500',   tv:'CAPITALCOM:US500', fh:'AMEX:SPY',       dec:2, pip:0.10,   spread:0.50,    cat:'Indices', idxMult:10,  lotUSD:(p:number)=>p*500 },
  { sym:'US30',    tv:'CAPITALCOM:US30',  fh:'AMEX:DIA',       dec:1, pip:1.0,    spread:2.0,     cat:'Indices', idxMult:100, lotUSD:(p:number)=>p*5000 },
  { sym:'GER40',   tv:'CAPITALCOM:DE40',  fh:'XETRA:EXS1',    dec:1, pip:1.0,    spread:1.0,     cat:'Indices', idxMult:1,   lotUSD:(p:number)=>p*25 },
  { sym:'WTI',     tv:'TVC:USOIL',        fh:'OANDA:BCO_USD',  dec:2, pip:0.01,   spread:0.03,    cat:'Commodities', lotUSD:(p:number)=>p*1000 },
] as const
type Inst = typeof INSTRUMENTS[number]

const SEEDS: Record<string,number> = {
  'EUR/USD':1.0853,'GBP/USD':1.2940,'USD/JPY':148.50,'USD/CHF':0.8820,
  'AUD/USD':0.6350,'USD/CAD':1.3580,'NZD/USD':0.5780,'EUR/JPY':170.20,
  'GBP/JPY':192.50,'EUR/GBP':0.8380,'AUD/JPY':94.30,'CAD/JPY':109.30,
  'XAU/USD':2980.0,'XAG/USD':33.50,
  'NAS100':21700,'US500':5750,'US30':42800,'GER40':22500,'WTI':71.50,
}

/* ══ TRADINGVIEW CHART ═════════════════════════════════════════════ */
function TVChart({ tvSym, openTrades, prices }: {
  tvSym: string
  openTrades: any[]
  prices: Record<string,number>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.cssText = 'width:100%;height:100%'

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.cssText = 'width:100%;height:calc(100% - 32px)'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:          true,
      symbol:            tvSym,
      interval:          lsGet('tfd_tf', '60'),
      timezone:          'Etc/UTC',
      theme:             'light',
      style:             '1',
      locale:            'en',
      enable_publishing: false,
      hide_top_toolbar:  false,
      save_image:        false,
      backgroundColor:   'rgba(250,251,255,1)',
      gridColor:         'rgba(34,85,204,0.05)',
      hide_volume:       false,
      studies:           [],
      support_host:      'https://www.tradingview.com',
    })

    container.appendChild(widget)
    container.appendChild(script)
    el.appendChild(container)
    return () => { el.innerHTML = '' }
  }, [tvSym])

  // SL/TP/Entry overlay lines on top of TV iframe
  const sym = INSTRUMENTS.find(i => i.tv === tvSym)?.sym ?? ''
  const tradesHere = openTrades.filter(t => t.symbol === sym)

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={ref} style={{ width:'100%', height:'100%' }} />
      {/* Overlay badge for each open trade on this symbol */}
      {tradesHere.length > 0 && (
        <div style={{ position:'absolute', top:'48px', left:'8px', display:'flex', flexDirection:'column', gap:'4px', zIndex:10, pointerEvents:'none' }}>
          {tradesHere.map(t => {
            const cur = prices[t.symbol] || SEEDS[t.symbol] || t.open_price
            const i   = INSTRUMENTS.find(x => x.sym === t.symbol) as any
            const pnl = calcPnl(t, cur)
            return (
              <div key={t.id} style={{ background:'rgba(255,255,255,.95)', border:`1px solid ${t.direction==='buy'?'#16A34A':'#DC2626'}`, borderLeft:`4px solid ${t.direction==='buy'?'#16A34A':'#DC2626'}`, borderRadius:'6px', padding:'5px 10px', fontSize:'11px', boxShadow:'0 2px 8px rgba(0,0,0,.08)' }}>
                <span style={{ fontWeight:700, color:t.direction==='buy'?'#16A34A':'#DC2626', marginRight:'8px' }}>{t.direction.toUpperCase()} {t.lots}</span>
                <span style={{ color:'#5C7A9E', marginRight:'8px' }}>@ {(Number(t.open_price)||0).toFixed(i?.dec??5)}</span>
                {t.sl && <span style={{ color:'#DC2626', marginRight:'6px' }}>SL: {t.sl}</span>}
                {t.tp && <span style={{ color:'#16A34A', marginRight:'6px' }}>TP: {t.tp}</span>}
                <span style={{ fontWeight:700, color:pnl>=0?'#16A34A':'#DC2626', fontFamily:"'JetBrains Mono',monospace" }}>{pnl>=0?'+':''}${(Number(pnl)||0).toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══ PRICE FEED ════════════════════════════════════════════════════ */
function usePriceFeed() {
  const [prices, setPrices] = useState<Record<string,number>>({ ...SEEDS })
  const prevRef  = useRef<Record<string,number>>({ ...SEEDS })
  const priceRef = useRef<Record<string,number>>({ ...SEEDS })

  const push = useCallback((sym: string, price: number) => {
    if (!price || isNaN(price) || price <= 0) return
    prevRef.current[sym]  = priceRef.current[sym] || price
    priceRef.current[sym] = price
    setPrices(p => p[sym] === price ? p : { ...p, [sym]: price })
  }, [])

  useEffect(() => {
    let dead = false, ws: WebSocket, wsTimer: any, pollTimer: any

    const connect = () => {
      if (dead || !FINNHUB) return
      try {
        ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB}`)
        ws.onopen = () => INSTRUMENTS.forEach(i => ws.send(JSON.stringify({ type:'subscribe', symbol:(i as any).fh })))
        ws.onmessage = ({ data }) => {
          try {
            const msg = JSON.parse(data)
            if (msg.type === 'trade' && msg.data) {
              for (const t of msg.data) {
                const inst = INSTRUMENTS.find(i => (i as any).fh === t.s) as any
                if (!inst || !t.p) continue
                push(inst.sym, inst.idxMult ? +(t.p * inst.idxMult).toFixed(inst.dec) : +t.p.toFixed(inst.dec))
              }
            }
          } catch {}
        }
        ws.onclose = () => { if (!dead) wsTimer = setTimeout(connect, 2000) }
        ws.onerror = () => { try { ws.close() } catch {} }
      } catch { if (!dead) wsTimer = setTimeout(connect, 3000) }
    }

    const poll = async () => {
      if (dead || !FINNHUB) return
      try {
        const r = await fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${FINNHUB}`)
        const d = await r.json()
        if (d.quote) {
          const q = d.quote
          const pairs: [string,string,boolean][] = [
            ['EUR/USD','EUR',false],['GBP/USD','GBP',false],['AUD/USD','AUD',false],
            ['NZD/USD','NZD',false],['USD/JPY','JPY',true], ['USD/CHF','CHF',true],['USD/CAD','CAD',true],
          ]
          for (const [sym,base,inv] of pairs) {
            const rate = q[base]; if (!rate) continue
            const inst = INSTRUMENTS.find(i => i.sym===sym) as any
            push(sym, inv ? +((1/rate).toFixed(inst?.dec??5)) : +(rate.toFixed(inst?.dec??5)))
          }
          if (q.EUR&&q.JPY) push('EUR/JPY', +((q.JPY/q.EUR).toFixed(3)))
          if (q.GBP&&q.JPY) push('GBP/JPY', +((q.JPY/q.GBP).toFixed(3)))
          if (q.EUR&&q.GBP) push('EUR/GBP', +((q.GBP/q.EUR).toFixed(5)))
          if (q.AUD&&q.JPY) push('AUD/JPY', +((q.JPY/q.AUD).toFixed(3)))
          if (q.CAD&&q.JPY) push('CAD/JPY', +((q.JPY/q.CAD).toFixed(3)))
          if (q.XAU) push('XAU/USD', +((1/q.XAU).toFixed(2)))
          if (q.XAG) push('XAG/USD', +((1/q.XAG).toFixed(4)))
        }
      } catch {}
      for (const inst of INSTRUMENTS.filter(i=>i.cat==='Indices') as any[]) {
        try {
          const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${inst.fh}&token=${FINNHUB}`)
          const d = await r.json()
          if (d.c>0) push(inst.sym, inst.idxMult ? +(d.c*inst.idxMult).toFixed(inst.dec) : +d.c.toFixed(inst.dec))
        } catch {}
        await new Promise(r=>setTimeout(r,200))
      }
    }

    connect(); poll()
    pollTimer = setInterval(poll, 5000)
    return () => { dead=true; clearTimeout(wsTimer); clearInterval(pollTimer); try{ws?.close()}catch{} }
  }, [push])

  return { prices, prevRef, priceRef, push }
}

/* ══ P&L ═══════════════════════════════════════════════════════════ */
function calcPnl(trade: any, price: number): number {
  const inst = INSTRUMENTS.find(i=>i.sym===trade.symbol) as any
  if (!inst||!price) return 0
  const diff = trade.direction==='buy' ? price-trade.open_price : trade.open_price-price
  return diff * (trade.symbol.includes('JPY') ? LOT_SIZE/price : inst.lotUSD(1)) * trade.lots
}

/* ══ RISK MONITOR ══════════════════════════════════════════════════ */
function useRiskMonitor(tradesRef:any, priceRef:any, primaryRef:any, accountId:any, onBreach:any) {
  const firedRef=useRef(false)
  const cbRef=useRef(onBreach); cbRef.current=onBreach
  useEffect(()=>{
    const iv=setInterval(()=>{
      const pr=primaryRef.current, trades=tradesRef.current, prices=priceRef.current
      if(!pr||!trades.length||firedRef.current) return
      if(pr.status==='breached'||pr.status==='passed') return
      const bal=pr.balance??0, startBal=pr.starting_balance??bal
      if(bal<=0||startBal<=0) return
      const cp=(pr as any).challenge_products, phase=pr.phase??'phase1'
      const maxDD  =phase==='funded'?(cp?.funded_max_dd??10):phase==='phase2'?(cp?.ph2_max_dd??10):(cp?.ph1_max_dd??10)
      const dailyDD=phase==='funded'?(cp?.funded_daily_dd??5):phase==='phase2'?(cp?.ph2_daily_dd??5):(cp?.ph1_daily_dd??5)
      const floor =startBal-startBal*(maxDD/100)
      const dFloor=(pr.daily_high_balance??startBal)-(pr.daily_high_balance??startBal)*(dailyDD/100)
      const equity=bal+trades.reduce((s:number,t:any)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]||t.open_price),0)
      if(equity<=floor)  {firedRef.current=true; cbRef.current(`Max drawdown breached — equity $${equity.toFixed(2)} (limit: ${maxDD}%)`,trades);return}
      if(equity<=dFloor) {firedRef.current=true; cbRef.current(`Daily drawdown breached — equity $${equity.toFixed(2)} (limit: ${dailyDD}%)`,trades);return}
    },500)
    return ()=>clearInterval(iv)
  },[])
  useEffect(()=>{firedRef.current=false},[accountId])
}

/* ══ EDIT SL/TP MODAL ══════════════════════════════════════════════ */
function EditSLTPModal({ trade, inst, onSave, onClose }: {
  trade: any; inst: any; onSave: (sl:string, tp:string)=>void; onClose: ()=>void
}) {
  const [sl, setSl] = useState(trade.sl ? String(trade.sl) : '')
  const [tp, setTp] = useState(trade.tp ? String(trade.tp) : '')
  const cur = SEEDS[trade.symbol]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'12px', padding:'24px', width:'320px', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:'#1A3A6B' }}>Edit SL / TP</div>
            <div style={{ fontSize:'11px', color:'#8FA3BF', marginTop:'2px' }}>
              <span style={{ color:trade.direction==='buy'?'#16A34A':'#DC2626', fontWeight:600 }}>{trade.direction.toUpperCase()}</span>
              {' '}{trade.lots} {trade.symbol} @ {(Number(trade.open_price)||0).toFixed(inst?.dec??5)}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#8FA3BF' }}>✕</button>
        </div>

        {/* Visual price levels */}
        <div style={{ background:'#F4F7FD', borderRadius:'8px', padding:'12px', marginBottom:'16px', fontSize:'11px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
            <span style={{ color:'#8FA3BF' }}>Entry price</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color:'#1A3A6B' }}>{(Number(trade.open_price)||0).toFixed(inst?.dec??5)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
            <span style={{ color:'#8FA3BF' }}>Current price</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", color:'#5C7A9E' }}>{cur.toFixed(inst?.dec??5)}</span>
          </div>
          {sl && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ color:'#DC2626' }}>SL distance</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:'#DC2626' }}>
                {(Math.abs(trade.open_price - parseFloat(sl)) / (inst?.pip??0.0001)).toFixed(0)} pips
              </span>
            </div>
          )}
          {tp && (
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#16A34A' }}>TP distance</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:'#16A34A' }}>
                {(Math.abs(trade.open_price - parseFloat(tp)) / (inst?.pip??0.0001)).toFixed(0)} pips
              </span>
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'10px', color:'#DC2626', fontWeight:700, textTransform:'uppercase', marginBottom:'4px' }}>Stop Loss</div>
            <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst?.pip??0.0001}
              style={{ width:'100%', padding:'8px', background:'#FEF2F2', border:'1px solid rgba(220,38,38,.3)', borderRadius:'8px', fontSize:'13px', fontFamily:"'JetBrains Mono',monospace", color:'#1A3A6B', outline:'none', boxSizing:'border-box' }}/>
            {sl && trade.direction==='buy' && parseFloat(sl) > trade.open_price && (
              <div style={{ fontSize:'9px', color:'#DC2626', marginTop:'3px' }}>⚠ SL above entry for BUY</div>
            )}
          </div>
          <div>
            <div style={{ fontSize:'10px', color:'#16A34A', fontWeight:700, textTransform:'uppercase', marginBottom:'4px' }}>Take Profit</div>
            <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst?.pip??0.0001}
              style={{ width:'100%', padding:'8px', background:'#F0FDF4', border:'1px solid rgba(22,163,74,.3)', borderRadius:'8px', fontSize:'13px', fontFamily:"'JetBrains Mono',monospace", color:'#1A3A6B', outline:'none', boxSizing:'border-box' }}/>
            {tp && trade.direction==='buy' && parseFloat(tp) < trade.open_price && (
              <div style={{ fontSize:'9px', color:'#DC2626', marginTop:'3px' }}>⚠ TP below entry for BUY</div>
            )}
          </div>
        </div>

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', background:'#F4F7FD', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:600, color:'#5C7A9E' }}>Cancel</button>
          <button onClick={()=>onSave(sl, tp)} style={{ flex:2, padding:'10px', background:'#2255CC', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:700, color:'#fff' }}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

/* ══ PLATFORM PAGE ═════════════════════════════════════════════════ */
export function PlatformPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary: defPrimary } = useAccount()

  /* ── Persisted state ── */
  const [selAccId,  setSelAccId]  = useState<string|null>(null)
  const [sym,       setSym]       = useState<string>(()=>lsGet('tfd_sym','EUR/USD'))
  const [favorites, setFavorites] = useState<string[]>(()=>lsGet('tfd_favs',['EUR/USD','GBP/USD','XAU/USD','NAS100','US30']))
  const [catFilter, setCatFilter] = useState<string>(()=>lsGet('tfd_cat','All'))

  /* ── Local state ── */
  const [dir,        setDir]       = useState<'buy'|'sell'>('buy')
  const [lots,       setLots]      = useState('0.10')
  const [sl,         setSl]        = useState('')
  const [tp,         setTp]        = useState('')
  const [tab,        setTab]       = useState<'positions'|'history'|'favourites'>('positions')
  const [search,     setSearch]    = useState('')
  const [placing,    setPlacing]   = useState(false)
  const [editTrade,  setEditTrade] = useState<any>(null)
  const [openTrades, setOpenTrades]     = useState<any[]>([])
  const [closedTrades, setClosedTrades] = useState<any[]>([])

  const primary = accounts.find(a=>a.id===selAccId) ?? defPrimary

  const { prices, prevRef, priceRef, push } = usePriceFeed()
  const tradesRef  = useRef<any[]>([]);  tradesRef.current  = openTrades
  const primaryRef = useRef<any>(null);  primaryRef.current = primary

  /* ── Derived ── */
  const inst       = (INSTRUMENTS.find(i=>i.sym===sym) ?? INSTRUMENTS[0]) as any
  const live       = prices[sym] || SEEDS[sym]
  const prev       = prevRef.current[sym] || live
  const up         = live >= prev
  const exec       = +(dir==='buy' ? live+inst.spread : live).toFixed(inst.dec)
  const lotsNum    = Math.max(0.01, parseFloat(lots)||0.01)
  const balance    = primary?.balance ?? 0
  const openPnl    = openTrades.reduce((s,t)=>s+calcPnl(t,prices[t.symbol]||SEEDS[t.symbol]),0)
  const equity     = balance + openPnl
  const usedMargin = openTrades.reduce((s,t)=>{
    const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    return s+(i?.lotUSD(prices[t.symbol]||SEEDS[t.symbol])*t.lots/LEVERAGE||0)
  },0)
  const freeMargin  = equity - usedMargin
  const marginLvl   = usedMargin>0 ? (equity/usedMargin)*100 : 999
  const reqMargin   = inst.lotUSD(exec) * lotsNum / LEVERAGE
  const notional    = inst.lotUSD(exec) * lotsNum
  const maxLots     = freeMargin>0 ? Math.floor((freeMargin*LEVERAGE/inst.lotUSD(exec))*100)/100 : 0

  /* ── Persist on change ── */
  useEffect(()=>lsSet('tfd_sym', sym), [sym])
  useEffect(()=>lsSet('tfd_favs', favorites), [favorites])
  useEffect(()=>lsSet('tfd_cat', catFilter), [catFilter])

  /* ── Load trades ── */
  useEffect(()=>{
    if (!primary?.id) return
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','open').order('opened_at',{ascending:false})
      .then(({data})=>setOpenTrades(data??[]))
    supabase.from('trades').select('*').eq('account_id',primary.id).eq('status','closed').order('closed_at',{ascending:false}).limit(100)
      .then(({data})=>setClosedTrades(data??[]))
  },[primary?.id])

  /* ── Risk monitor ── */
  useRiskMonitor(tradesRef,priceRef,primaryRef,primary?.id,async(reason:string,trades:any[])=>{
    toast('error','🚨','Account Breached',reason)
    if (!primary?.id) return
    for (const t of trades) {
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

  /* ── Toggle favourite ── */
  function toggleFav(s: string) {
    setFavorites(prev =>
      prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]
    )
  }

  /* ── Place order ── */
  async function placeOrder() {
    if (!primary?.id)                { toast('error','❌','No Account','Select a funded account.'); return }
    if (primary.status==='breached') { toast('error','❌','Breached','Account is breached.'); return }
    if (reqMargin > freeMargin)      {
      toast('error','❌','Insufficient Margin',
        `Required: $${reqMargin.toFixed(2)} | Free: $${freeMargin.toFixed(2)} | Max lots at 1:${LEVERAGE}: ${maxLots}`)
      return
    }
    setPlacing(true)
    const {data,error} = await supabase.from('trades').insert({
      account_id: primary.id, user_id: primary.user_id,
      symbol: sym, direction: dir, lots: lotsNum,
      open_price: exec, status: 'open',
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      opened_at: new Date().toISOString(),
    }).select().single()
    setPlacing(false)
    if (error) { toast('error','❌','Error',error.message); return }
    setOpenTrades(p=>[data,...p])
    toast('success','✅',`${dir.toUpperCase()} ${sym}`,`${lotsNum} lots @ ${exec} | Margin: $${reqMargin.toFixed(2)}`)
    setSl(''); setTp('')
  }

  /* ── Close trade ── */
  async function closeTrade(t: any) {
    const cur  = prices[t.symbol]||SEEDS[t.symbol]||t.open_price
    const i    = INSTRUMENTS.find(x=>x.sym===t.symbol) as any
    const cp   = +(t.direction==='buy'?cur:cur+(i?.spread??0)).toFixed(i?.dec??5)
    const diff = t.direction==='buy'?cp-t.open_price:t.open_price-cp
    const isJpy= t.symbol.includes('JPY')
    const netPnl=+(diff*(isJpy?LOT_SIZE/cp:i?.lotUSD(1)??LOT_SIZE)*t.lots).toFixed(2)
    const pips  =+(diff/(i?.pip??0.0001)).toFixed(1)
    const now   = new Date().toISOString()
    await supabase.from('trades').update({status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now}).eq('id',t.id)
    await supabase.from('accounts').update({balance:+(balance+netPnl).toFixed(2),equity:+(equity+netPnl-openPnl).toFixed(2)}).eq('id',primary!.id)
    setOpenTrades(p=>p.filter(x=>x.id!==t.id))
    setClosedTrades(p=>[{...t,status:'closed',close_price:cp,net_pnl:netPnl,pips,closed_at:now},...p])
    toast(netPnl>=0?'success':'error',netPnl>=0?'💰':'📉',`Closed ${t.symbol}`,`${netPnl>=0?'+':''}$${netPnl.toFixed(2)} | ${pips>=0?'+':''}${pips} pips`)
  }

  /* ── Save SL/TP edit ── */
  async function saveSLTP(sl: string, tp: string) {
    if (!editTrade) return
    const updates: any = { sl: sl ? parseFloat(sl) : null, tp: tp ? parseFloat(tp) : null }
    await supabase.from('trades').update(updates).eq('id', editTrade.id)
    setOpenTrades(p=>p.map(t=>t.id===editTrade.id?{...t,...updates}:t))
    setEditTrade(null)
    toast('success','✅','SL/TP Updated',`${editTrade.symbol} — SL: ${sl||'—'} | TP: ${tp||'—'}`)
  }

  /* ── Watchlist ── */
  const CATS = ['All','Favourites','Forex','Metals','Indices','Commodities']
  const visible = INSTRUMENTS.filter(i=>{
    if (catFilter==='Favourites') return favorites.includes(i.sym)
    if (catFilter!=='All' && i.cat!==catFilter) return false
    if (search && !i.sym.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const mono = { fontFamily:"'JetBrains Mono',monospace" } as const

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:'#F0F4FB', color:'#1A3A6B', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{ height:'48px', background:'#1A3A6B', display:'flex', alignItems:'center', padding:'0 12px', gap:'10px', flexShrink:0 }}>
        <button onClick={()=>navigate('/dashboard')} style={{ background:'rgba(255,255,255,.1)', border:'none', color:'#fff', padding:'5px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'11px', fontWeight:600 }}>← Dashboard</button>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'14px', fontWeight:700, color:'#fff' }}>
          The Funded <span style={{ color:'#60A5FA', fontStyle:'italic' }}>Diaries</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ADE80', boxShadow:'0 0 8px #4ADE80' }}/>
          <span style={{ fontSize:'10px', color:'#4ADE80', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' }}>Live</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:'6px', alignItems:'center' }}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>setSelAccId(a.id)} style={{ padding:'4px 10px', background:a.id===primary?.id?'rgba(96,165,250,.2)':'rgba(255,255,255,.08)', border:a.id===primary?.id?'1px solid rgba(96,165,250,.4)':'1px solid rgba(255,255,255,.1)', borderRadius:'5px', color:a.id===primary?.id?'#60A5FA':'rgba(255,255,255,.5)', fontSize:'10px', ...mono, cursor:'pointer' }}>
              {(a as any).account_number}
            </button>
          ))}
        </div>
        <div style={{ display:'flex' }}>
          {[
            ['Balance',    `$${(Number(balance)||0).toFixed(2)}`,    '#fff'],
            ['Equity',     `$${(Number(equity)||0).toFixed(2)}`,     equity>=balance?'#4ADE80':'#F87171'],
            ['Float',      `${openPnl>=0?'+':''}$${(Number(openPnl)||0).toFixed(2)}`,openPnl>=0?'#4ADE80':'#F87171'],
            ['Margin',     `$${(Number(usedMargin)||0).toFixed(2)}`, '#FCD34D'],
            ['Free',       `$${(Number(freeMargin)||0).toFixed(2)}`, '#60A5FA'],
          ].map(([l,v,c])=>(
            <div key={String(l)} style={{ padding:'0 9px', borderLeft:'1px solid rgba(255,255,255,.1)', textAlign:'right' }}>
              <div style={{ fontSize:'8px', color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'1px' }}>{l}</div>
              <div style={{ ...mono, fontSize:'11px', fontWeight:600, color:String(c) }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN ROW ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* WATCHLIST */}
        <div style={{ width:'185px', background:'#fff', borderRight:'1px solid #E8EEF8', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
          <div style={{ padding:'8px', borderBottom:'1px solid #E8EEF8', flexShrink:0 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              style={{ width:'100%', padding:'5px 8px', background:'#F4F7FD', border:'1px solid #E8EEF8', borderRadius:'6px', fontSize:'11px', color:'#1A3A6B', outline:'none', boxSizing:'border-box' }}/>
            <div style={{ display:'flex', gap:'2px', marginTop:'5px', flexWrap:'wrap' }}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{ padding:'2px 5px', fontSize:'8px', fontWeight:700, border:'none', borderRadius:'4px', cursor:'pointer', background:catFilter===c?'#2255CC':'#F4F7FD', color:catFilter===c?'#fff':'#8FA3BF', textTransform:'uppercase' }}>
                  {c==='Commodities'?'Comm':c==='Favourites'?'★ Favs':c}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {visible.length===0 && catFilter==='Favourites' && (
              <div style={{ padding:'20px 12px', textAlign:'center', fontSize:'11px', color:'#8FA3BF' }}>
                ★ Click the star next to any pair to add it here
              </div>
            )}
            {visible.map(i=>{
              const price = prices[i.sym]||SEEDS[i.sym]
              const pv    = prevRef.current[i.sym]||price
              const isUp  = price>=pv
              const active = sym===i.sym
              const isFav = favorites.includes(i.sym)
              return (
                <div key={i.sym} style={{ padding:'6px 8px', borderBottom:'1px solid #F0F4FB', display:'flex', alignItems:'center', background:active?'#EEF3FF':'transparent', borderLeft:active?'3px solid #2255CC':'3px solid transparent' }}>
                  {/* Star */}
                  <button onClick={()=>toggleFav(i.sym)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:isFav?'#F59E0B':'#D1D5DB', padding:'0 4px 0 0', flexShrink:0 }} title={isFav?'Remove from favourites':'Add to favourites'}>
                    {isFav?'★':'☆'}
                  </button>
                  {/* Symbol */}
                  <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setSym(i.sym)}>
                    <div style={{ fontSize:'11px', fontWeight:600, color:active?'#2255CC':'#1A3A6B' }}>{i.sym}</div>
                    <div style={{ fontSize:'9px', color:'#8FA3BF' }}>{i.cat}</div>
                  </div>
                  {/* Price */}
                  <div style={{ textAlign:'right', cursor:'pointer' }} onClick={()=>setSym(i.sym)}>
                    <div style={{ ...mono, fontSize:'11px', fontWeight:500, color:isUp?'#16A34A':'#DC2626' }}>{price.toFixed(i.dec)}</div>
                    <div style={{ fontSize:'9px', color:isUp?'#16A34A':'#DC2626' }}>{isUp?'▲':'▼'}{Math.abs(price-pv).toFixed(i.dec)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CHART */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ height:'40px', background:'#fff', borderBottom:'1px solid #E8EEF8', display:'flex', alignItems:'center', padding:'0 12px', gap:'10px', flexShrink:0 }}>
            <div style={{ ...mono, fontSize:'20px', fontWeight:700, color:up?'#16A34A':'#DC2626' }}>{live.toFixed(inst.dec)}</div>
            <div style={{ fontSize:'11px', color:up?'#16A34A':'#DC2626' }}>{up?'▲':'▼'} {Math.abs(live-prev).toFixed(inst.dec)}</div>
            <div style={{ fontSize:'14px', fontWeight:700, color:'#1A3A6B' }}>{sym}</div>
            <span style={{ fontSize:'10px', color:'#8FA3BF' }}>{inst.cat}</span>
            <button onClick={()=>toggleFav(sym)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:favorites.includes(sym)?'#F59E0B':'#D1D5DB', padding:'0 4px' }}>
              {favorites.includes(sym)?'★':'☆'}
            </button>
            <div style={{ marginLeft:'auto', fontSize:'10px', color:'#16A34A', background:'rgba(22,163,74,.08)', padding:'3px 10px', borderRadius:'20px' }}>
              ● TradingView Live
            </div>
          </div>
          <div style={{ flex:1 }}>
            <TVChart tvSym={inst.tv} openTrades={openTrades} prices={prices} />
          </div>
        </div>

        {/* ORDER PANEL */}
        <div style={{ width:'240px', background:'#fff', borderLeft:'1px solid #E8EEF8', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ padding:'12px', flex:1, overflowY:'auto' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#8FA3BF', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'10px' }}>
              New Order — {sym}
            </div>

            {/* Buy / Sell */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
              <button onClick={()=>setDir('buy')}  style={{ padding:'10px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'13px', background:dir==='buy'?'#16A34A':'#F4F7FD', color:dir==='buy'?'#fff':'#5C7A9E' }}>BUY</button>
              <button onClick={()=>setDir('sell')} style={{ padding:'10px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'13px', background:dir==='sell'?'#DC2626':'#F4F7FD', color:dir==='sell'?'#fff':'#5C7A9E' }}>SELL</button>
            </div>

            {/* Exec price */}
            <div style={{ background:dir==='buy'?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)', border:`1px solid ${dir==='buy'?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}`, borderRadius:'8px', padding:'10px', marginBottom:'10px', textAlign:'center' }}>
              <div style={{ fontSize:'9px', color:'#8FA3BF', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'3px' }}>Execution Price · Live</div>
              <div style={{ ...mono, fontSize:'22px', fontWeight:700, color:dir==='buy'?'#16A34A':'#DC2626' }}>{exec.toFixed(inst.dec)}</div>
              <div style={{ fontSize:'9px', color:'#8FA3BF', marginTop:'2px' }}>spread {inst.spread.toFixed(inst.dec)}</div>
            </div>

            {/* Lots */}
            <div style={{ marginBottom:'8px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span style={{ fontSize:'9px', color:'#8FA3BF', fontWeight:600, textTransform:'uppercase' }}>Lots</span>
                <span style={{ fontSize:'9px', color:'#8FA3BF' }}>Max: <span style={{ color:lotsNum>maxLots?'#DC2626':'#16A34A', fontWeight:600 }}>{maxLots}</span></span>
              </div>
              <div style={{ display:'flex', border:'1px solid #E8EEF8', borderRadius:'8px', overflow:'hidden' }}>
                <button onClick={()=>setLots(l=>String(Math.max(0.01,+l-0.01).toFixed(2)))} style={{ padding:'0 14px', background:'#F4F7FD', border:'none', borderRight:'1px solid #E8EEF8', cursor:'pointer', color:'#5C7A9E', fontSize:'20px', lineHeight:1 }}>−</button>
                <input value={lots} onChange={e=>setLots(e.target.value)} type="number" min="0.01" step="0.01"
                  style={{ flex:1, padding:'8px', background:'#fff', border:'none', textAlign:'center', ...mono, fontSize:'14px', fontWeight:600, color:lotsNum>maxLots?'#DC2626':'#1A3A6B', outline:'none' }}/>
                <button onClick={()=>setLots(l=>String((+l+0.01).toFixed(2)))} style={{ padding:'0 14px', background:'#F4F7FD', border:'none', borderLeft:'1px solid #E8EEF8', cursor:'pointer', color:'#5C7A9E', fontSize:'20px', lineHeight:1 }}>+</button>
              </div>
            </div>

            {/* SL / TP */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'10px' }}>
              <div>
                <div style={{ fontSize:'9px', color:'#DC2626', fontWeight:600, textTransform:'uppercase', marginBottom:'3px' }}>Stop Loss</div>
                <input value={sl} onChange={e=>setSl(e.target.value)} placeholder="—" type="number" step={inst.pip}
                  style={{ width:'100%', padding:'6px 8px', background:'#FEF2F2', border:'1px solid rgba(220,38,38,.2)', borderRadius:'6px', fontSize:'11px', color:'#1A3A6B', outline:'none', ...mono, boxSizing:'border-box' }}/>
              </div>
              <div>
                <div style={{ fontSize:'9px', color:'#16A34A', fontWeight:600, textTransform:'uppercase', marginBottom:'3px' }}>Take Profit</div>
                <input value={tp} onChange={e=>setTp(e.target.value)} placeholder="—" type="number" step={inst.pip}
                  style={{ width:'100%', padding:'6px 8px', background:'#F0FDF4', border:'1px solid rgba(22,163,74,.2)', borderRadius:'6px', fontSize:'11px', color:'#1A3A6B', outline:'none', ...mono, boxSizing:'border-box' }}/>
              </div>
            </div>

            {/* Leverage / Margin info */}
            <div style={{ background:'#F4F7FD', borderRadius:'8px', padding:'10px', marginBottom:'10px', border: lotsNum>maxLots ? '1px solid rgba(220,38,38,.3)' : '1px solid transparent' }}>
              <div style={{ fontSize:'9px', color:'#8FA3BF', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px' }}>
                Leverage 1:{LEVERAGE}
              </div>
              {[
                ['Notional',    `$${(Number(notional)||0).toFixed(0)}`,    '#5C7A9E'],
                ['Req. Margin', `$${(Number(reqMargin)||0).toFixed(2)}`,   lotsNum>maxLots?'#DC2626':'#1A3A6B'],
                ['Free Margin', `$${(Number(freeMargin)||0).toFixed(2)}`,  freeMargin>reqMargin?'#16A34A':'#DC2626'],
                ['Margin Lvl',  usedMargin>0?`${(Number(marginLvl)||0).toFixed(0)}%`:'∞', marginLvl<150&&usedMargin>0?'#DC2626':'#16A34A'],
              ].map(([l,v,c])=>(
                <div key={String(l)} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', fontSize:'11px' }}>
                  <span style={{ color:'#8FA3BF' }}>{l}</span>
                  <span style={{ ...mono, color:String(c), fontWeight:500 }}>{v}</span>
                </div>
              ))}
              {lotsNum > maxLots && (
                <div style={{ marginTop:'6px', fontSize:'10px', color:'#DC2626', fontWeight:600, background:'rgba(220,38,38,.06)', padding:'4px 8px', borderRadius:'4px' }}>
                  ⚠ Exceeds 1:{LEVERAGE} leverage. Max: {maxLots} lots
                </div>
              )}
            </div>

            <button onClick={placeOrder} disabled={placing||!primary||primary.status==='breached'||lotsNum>maxLots}
              style={{ width:'100%', padding:'12px', fontSize:'13px', fontWeight:700, border:'none', borderRadius:'8px', cursor:lotsNum>maxLots?'not-allowed':'pointer', background:lotsNum>maxLots?'#9CA3AF':dir==='buy'?'#16A34A':'#DC2626', color:'#fff', opacity:placing||!primary||primary.status==='breached'?0.5:1, letterSpacing:'.5px', textTransform:'uppercase' }}>
              {placing?'…':`${dir.toUpperCase()} ${lotsNum} ${sym}`}
            </button>
          </div>

          {/* Account */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid #E8EEF8', flexShrink:0 }}>
            {[
              ['Account', (primary as any)?.account_number??'—', '#1A3A6B'],
              ['Phase',   primary?.phase??'—', '#2255CC'],
              ['Status',  primary?.status??'—', primary?.status==='active'?'#16A34A':'#DC2626'],
            ].map(([l,v,c])=>(
              <div key={String(l)} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:'10px' }}>
                <span style={{ color:'#8FA3BF' }}>{l}</span>
                <span style={{ ...mono, color:String(c), fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Positions / History / Favourites ── */}
      <div style={{ height:'185px', background:'#fff', borderTop:'1px solid #E8EEF8', flexShrink:0, display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid #E8EEF8', height:'34px', padding:'0 12px', flexShrink:0, gap:'4px' }}>
          {(['positions','history'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'0 14px', height:'34px', fontSize:'11px', fontWeight:600, border:'none', borderBottom:tab===t?'2px solid #2255CC':'2px solid transparent', background:'transparent', color:tab===t?'#2255CC':'#8FA3BF', cursor:'pointer', textTransform:'capitalize' }}>
              {t}{t==='positions'&&openTrades.length>0?` (${openTrades.length})`:''}
            </button>
          ))}
          <div style={{ marginLeft:'auto', ...mono, fontSize:'12px', fontWeight:600, color:openPnl>=0?'#16A34A':'#DC2626' }}>
            Float: {openPnl>=0?'+':''}${(Number(openPnl)||0).toFixed(2)}
          </div>
        </div>

        <div style={{ overflowY:'auto', flex:1 }}>
          {tab==='positions' ? (
            openTrades.length===0
              ? <div style={{ padding:'18px', textAlign:'center', fontSize:'12px', color:'#8FA3BF' }}>No open positions</div>
              : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                  <thead>
                    <tr>
                      {['Symbol','Dir','Lots','Open Price','Live Price','P&L','Pips','SL','TP','Margin','Actions'].map(h=>(
                        <th key={h} style={{ padding:'4px 8px', fontSize:'9px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA3BF', fontWeight:600, textAlign:'left', background:'#FAFBFF', borderBottom:'1px solid #F0F4FB', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(t=>{
                      const cur    = prices[t.symbol]||SEEDS[t.symbol]||t.open_price
                      const pnl    = calcPnl(t,cur)
                      const i      = INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                      const pipD   = i?(t.direction==='buy'?cur-t.open_price:t.open_price-cur)/(i.pip??0.0001):0
                      const tMargin= i?(i.lotUSD(cur)*t.lots/LEVERAGE):0
                      // SL/TP hit detection
                      const slHit = t.sl && (t.direction==='buy' ? cur<=t.sl : cur>=t.sl)
                      const tpHit = t.tp && (t.direction==='buy' ? cur>=t.tp : cur<=t.tp)
                      return (
                        <tr key={t.id} style={{ borderBottom:'1px solid #F4F7FD', background:(slHit||tpHit)?'rgba(220,38,38,.03)':'transparent' }}>
                          <td style={{ padding:'5px 8px', fontWeight:600 }}>
                            <button onClick={()=>setSym(t.symbol)} style={{ background:'none', border:'none', cursor:'pointer', fontWeight:600, color:'#2255CC', fontSize:'11px', padding:0 }}>{t.symbol}</button>
                          </td>
                          <td style={{ padding:'5px 8px', fontWeight:700, color:t.direction==='buy'?'#16A34A':'#DC2626' }}>{t.direction.toUpperCase()}</td>
                          <td style={{ padding:'5px 8px', ...mono }}>{t.lots}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:'#5C7A9E' }}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:cur>=t.open_price?'#16A34A':'#DC2626', fontWeight:500 }}>{cur.toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 8px', ...mono, fontWeight:700, color:pnl>=0?'#16A34A':'#DC2626' }}>{pnl>=0?'+':''}${(Number(pnl)||0).toFixed(2)}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:pipD>=0?'#16A34A':'#DC2626' }}>{pipD>=0?'+':''}{(Number(pipD)||0).toFixed(1)}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:'#DC2626', fontSize:'10px' }}>{t.sl??'—'}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:'#16A34A', fontSize:'10px' }}>{t.tp??'—'}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:'#5C7A9E', fontSize:'10px' }}>${(Number(tMargin)||0).toFixed(2)}</td>
                          <td style={{ padding:'5px 8px' }}>
                            <div style={{ display:'flex', gap:'4px' }}>
                              <button onClick={()=>setEditTrade(t)} style={{ padding:'3px 8px', fontSize:'10px', fontWeight:600, background:'#EEF3FF', border:'1px solid rgba(34,85,204,.2)', borderRadius:'5px', cursor:'pointer', color:'#2255CC', whiteSpace:'nowrap' }}>Edit SL/TP</button>
                              <button onClick={()=>closeTrade(t)} style={{ padding:'3px 8px', fontSize:'10px', fontWeight:600, background:'#FEF2F2', border:'1px solid rgba(220,38,38,.2)', borderRadius:'5px', cursor:'pointer', color:'#DC2626', whiteSpace:'nowrap' }}>Close</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          ) : (
            closedTrades.length===0
              ? <div style={{ padding:'18px', textAlign:'center', fontSize:'12px', color:'#8FA3BF' }}>No closed trades</div>
              : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                  <thead>
                    <tr>
                      {['Symbol','Dir','Lots','Open','Close','P&L','Pips','Closed'].map(h=>(
                        <th key={h} style={{ padding:'4px 8px', fontSize:'9px', textTransform:'uppercase', letterSpacing:'1px', color:'#8FA3BF', fontWeight:600, textAlign:'left', background:'#FAFBFF', borderBottom:'1px solid #F0F4FB' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map(t=>{
                      const i=INSTRUMENTS.find(x=>x.sym===t.symbol) as any
                      return (
                        <tr key={t.id} style={{ borderBottom:'1px solid #F4F7FD' }}>
                          <td style={{ padding:'5px 8px', fontWeight:600 }}>{t.symbol}</td>
                          <td style={{ padding:'5px 8px', fontWeight:700, color:t.direction==='buy'?'#16A34A':'#DC2626' }}>{t.direction.toUpperCase()}</td>
                          <td style={{ padding:'5px 8px', ...mono }}>{t.lots}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:'#5C7A9E' }}>{(Number(t.open_price)||0).toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:'#5C7A9E' }}>{(Number(t.close_price)||0).toFixed(i?.dec??5)}</td>
                          <td style={{ padding:'5px 8px', ...mono, fontWeight:700, color:(t.net_pnl??0)>=0?'#16A34A':'#DC2626' }}>{(t.net_pnl??0)>=0?'+':''}${(Number(t.net_pnl)||0).toFixed(2)}</td>
                          <td style={{ padding:'5px 8px', ...mono, color:(t.pips??0)>=0?'#16A34A':'#DC2626' }}>{(t.pips??0)>=0?'+':''}{(Number(t.pips)||0).toFixed(1)}</td>
                          <td style={{ padding:'5px 8px', color:'#8FA3BF', fontSize:'10px' }}>{t.closed_at?new Date(t.closed_at).toLocaleString():'—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          )}
        </div>
      </div>

      {/* ── Edit SL/TP Modal ── */}
      {editTrade && (
        <EditSLTPModal
          trade={editTrade}
          inst={INSTRUMENTS.find(i=>i.sym===editTrade.symbol)}
          onSave={saveSLTP}
          onClose={()=>setEditTrade(null)}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </div>
  )
}
