import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useAccount } from '@/hooks/useAccount'
import { ToastContainer } from '@/components/ui/Toast'
import { DrawdownBar } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'

type Instrument = {
  sym: string
  bid: number
  spread: number
  dec: number
  pip: number
  live?: boolean
  feed?: 'binance'
  feedSymbol?: string
}

type PriceRow = Instrument & {
  prev: number
  cur: number
  source: 'live' | 'simulated'
}

type Candle = {
  time: number
  o: number
  h: number
  l: number
  c: number
}

type TradeRow = {
  id: string
  symbol: string
  direction: 'buy' | 'sell'
  lots: number
  open_price: number
  close_price?: number | null
  sl?: number | null
  tp?: number | null
  pips?: number | null
  net_pnl?: number | null
  opened_at: string
  closed_at?: string | null
  comment?: string | null
}

const INSTRUMENTS: Instrument[] = [
  { sym: 'EUR/USD', bid: 1.08742, spread: 0.0002, dec: 5, pip: 0.0001 },
  { sym: 'GBP/USD', bid: 1.26712, spread: 0.0002, dec: 5, pip: 0.0001 },
  { sym: 'XAU/USD', bid: 2341.8, spread: 0.3, dec: 2, pip: 0.1 },
  { sym: 'NAS100', bid: 17842.0, spread: 1.0, dec: 1, pip: 1.0 },
  { sym: 'BTC/USD', bid: 67180.0, spread: 10.0, dec: 1, pip: 1.0, live: true, feed: 'binance', feedSymbol: 'btcusdt' },
  { sym: 'USD/JPY', bid: 151.42, spread: 0.02, dec: 3, pip: 0.01 },
  { sym: 'WTI/USD', bid: 82.14, spread: 0.04, dec: 3, pip: 0.01 },
]

const TFS = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as const
const TF_TO_MINUTES: Record<(typeof TFS)[number], number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
}
const TF_TO_BINANCE: Partial<Record<(typeof TFS)[number], string>> = {
  M1: '1m',
  M5: '5m',
  M15: '15m',
  M30: '30m',
  H1: '1h',
  H4: '4h',
  D1: '1d',
}

function roundTo(value: number, dec: number) {
  return Number(value.toFixed(dec))
}

function makeSeededGenerator(seedInput: string) {
  let seed = 0
  for (let i = 0; i < seedInput.length; i++) seed = (seed * 31 + seedInput.charCodeAt(i)) >>> 0
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function buildSimulatedCandles(inst: Instrument, tf: keyof typeof TF_TO_MINUTES, count = 120): Candle[] {
  const intervalMs = TF_TO_MINUTES[tf] * 60_000
  const rand = makeSeededGenerator(`${inst.sym}-${tf}`)
  const volBase = Math.max(inst.pip * 10, inst.bid * 0.0008)
  const end = Math.floor(Date.now() / intervalMs) * intervalMs
  const candles: Candle[] = []
  let price = inst.bid * (0.995 + rand() * 0.01)

  for (let i = count - 1; i >= 0; i--) {
    const time = end - i * intervalMs
    const o = price
    const drift = (rand() - 0.49) * volBase
    const c = roundTo(o + drift, inst.dec)
    const h = roundTo(Math.max(o, c) + rand() * volBase * 0.45, inst.dec)
    const l = roundTo(Math.min(o, c) - rand() * volBase * 0.45, inst.dec)
    candles.push({ time, o: roundTo(o, inst.dec), h, l, c })
    price = c
  }

  return candles
}

function mergeLivePriceIntoCandles(candles: Candle[], livePrice: number, tfMs: number, dec: number) {
  const nowBucket = Math.floor(Date.now() / tfMs) * tfMs
  const next = [...candles]
  const last = next[next.length - 1]

  if (!last || last.time < nowBucket) {
    const base = last?.c ?? livePrice
    next.push({ time: nowBucket, o: base, h: livePrice, l: livePrice, c: livePrice })
    while (next.length > 220) next.shift()
    return next
  }

  last.c = roundTo(livePrice, dec)
  last.h = roundTo(Math.max(last.h, livePrice), dec)
  last.l = roundTo(Math.min(last.l, livePrice), dec)
  return next
}

function CandleChart({
  symbol,
  tf,
  livePrice,
  candles,
  decimals,
  isLive,
}: {
  symbol: string
  tf: keyof typeof TF_TO_MINUTES
  livePrice: number
  candles: Candle[]
  decimals: number
  isLive: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = ref.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const W = parent.clientWidth
    const H = parent.clientHeight
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pad = { t: 20, r: 76, b: 34, l: 8 }
    const chartW = Math.max(1, W - pad.l - pad.r)
    const chartH = Math.max(1, H - pad.t - pad.b)
    const series = candles.length ? candles : [{ time: Date.now(), o: livePrice, h: livePrice, l: livePrice, c: livePrice }]

    const values = series.flatMap((c) => [c.o, c.h, c.l, c.c])
    let min = Math.min(...values)
    let max = Math.max(...values)

    if (min === max) {
      min -= 1
      max += 1
    }

    const pricePadding = (max - min) * 0.08
    min -= pricePadding
    max += pricePadding

    const toY = (value: number) => pad.t + chartH - ((value - min) / (max - min)) * chartH

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#06060F'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(212,168,67,.06)'
    ctx.lineWidth = 1

    for (let i = 0; i <= 5; i++) {
      const y = pad.t + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(pad.l, y)
      ctx.lineTo(W - pad.r, y)
      ctx.stroke()
    }

    for (let i = 0; i <= 7; i++) {
      const x = pad.l + (chartW / 7) * i
      ctx.beginPath()
      ctx.moveTo(x, pad.t)
      ctx.lineTo(x, pad.t + chartH)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(230,226,248,.35)'
    ctx.font = '10px monospace'

    for (let i = 0; i <= 4; i++) {
      const value = max - ((max - min) / 4) * i
      ctx.fillText(value.toFixed(decimals), W - pad.r + 4, pad.t + (chartH / 4) * i + 4)
    }

    const candleGap = 2
    const candleWidth = Math.max(3, Math.floor(chartW / Math.max(series.length, 1)) - candleGap)

    series.forEach((candle, idx) => {
      const x = pad.l + idx * (candleWidth + candleGap)
      const bull = candle.c >= candle.o
      const color = bull ? '#00D97E' : '#FF3352'
      const bodyTop = Math.min(toY(candle.o), toY(candle.c))
      const bodyBottom = Math.max(toY(candle.o), toY(candle.c))
      const bodyHeight = Math.max(1, bodyBottom - bodyTop)
      const wickX = x + candleWidth / 2

      ctx.strokeStyle = color
      ctx.beginPath()
      ctx.moveTo(wickX, toY(candle.h))
      ctx.lineTo(wickX, toY(candle.l))
      ctx.stroke()

      ctx.fillStyle = color
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight)
    })

    const currentY = toY(livePrice)
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(212,168,67,.8)'
    ctx.beginPath()
    ctx.moveTo(pad.l, currentY)
    ctx.lineTo(W - pad.r, currentY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#D4A843'
    ctx.fillRect(W - pad.r, currentY - 10, pad.r, 20)
    ctx.fillStyle = '#06060F'
    ctx.font = 'bold 10px monospace'
    ctx.fillText(livePrice.toFixed(decimals), W - pad.r + 4, currentY + 4)

    ctx.fillStyle = isLive ? 'rgba(0,217,126,.95)' : 'rgba(230,226,248,.45)'
    ctx.font = 'bold 10px monospace'
    ctx.fillText(isLive ? `${symbol} • LIVE` : `${symbol} • SIM`, pad.l + 2, 14)

    ctx.fillStyle = 'rgba(230,226,248,.28)'
    ctx.font = '10px monospace'
    const bucketCount = Math.min(5, series.length)
    for (let i = 0; i < bucketCount; i++) {
      const idx = Math.floor((series.length - 1) * (i / Math.max(bucketCount - 1, 1)))
      const candle = series[idx]
      const x = pad.l + idx * (candleWidth + candleGap)
      const label = new Date(candle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ctx.fillText(label, x, H - 10)
    }
  }, [candles, decimals, isLive, livePrice, symbol, tf])

  useEffect(() => {
    draw()
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}

export function PlatformPage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { accounts, primary: defaultPrimary } = useAccount()

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const primary = accounts.find((a) => a.id === selectedAccountId) ?? defaultPrimary

  const [sym, setSym] = useState('EUR/USD')
  const [tf, setTf] = useState<keyof typeof TF_TO_MINUTES>('H1')
  const [dir, setDir] = useState<'buy' | 'sell'>('buy')
  const [lots, setLots] = useState('0.10')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Stop'>('Market')
  const [tab, setTab] = useState<'positions' | 'history' | 'account'>('positions')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [openTrades, setOpenTrades] = useState<TradeRow[]>([])
  const [closedTrades, setClosedTrades] = useState<TradeRow[]>([])
  const [prices, setPrices] = useState<PriceRow[]>(() =>
    INSTRUMENTS.map((i) => ({ ...i, prev: i.bid, cur: i.bid, source: i.live ? 'live' : 'simulated' })),
  )
  const [candlesByKey, setCandlesByKey] = useState<Record<string, Candle[]>>({})

  const selectedInst = useMemo(() => prices.find((p) => p.sym === sym) ?? prices[0], [prices, sym])
  const execPrice = dir === 'buy' ? selectedInst.cur + selectedInst.spread : selectedInst.cur
  const chartKey = `${sym}-${tf}`
  const visibleCandles = useMemo(() => candlesByKey[chartKey] ?? [], [candlesByKey, chartKey])

  useEffect(() => {
    const seeded: Record<string, Candle[]> = {}
    for (const inst of INSTRUMENTS) {
      for (const frame of TFS) seeded[`${inst.sym}-${frame}`] = buildSimulatedCandles(inst, frame)
    }
    setCandlesByKey(seeded)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPrices((current) =>
        current.map((row) => {
          if (row.live && row.feed === 'binance') return row
          const magnitude = row.sym.includes('USD/') || row.sym.includes('/USD') ? row.bid * 0.00018 : row.bid * 0.0005
          const move = (Math.random() - 0.49) * magnitude
          const next = roundTo(Math.max(row.pip, row.cur + move), row.dec)
          return { ...row, prev: row.cur, cur: next, source: 'simulated' }
        }),
      )
    }, 900)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const btc = INSTRUMENTS.find((i) => i.sym === 'BTC/USD')
    if (!btc?.feedSymbol) return

    let alive = true
    const controller = new AbortController()
    const sockets: WebSocket[] = []

    async function loadInitialCandles() {
      try {
        await Promise.all(
          TFS.map(async (frame) => {
            const interval = TF_TO_BINANCE[frame]
            if (!interval) return
            const url = `https://api.binance.com/api/v3/klines?symbol=${btc.feedSymbol?.toUpperCase()}&interval=${interval}&limit=220`
            const res = await fetch(url, { signal: controller.signal })
            if (!res.ok) return
            const rows = await res.json()
            if (!alive) return
            const mapped: Candle[] = rows.map((row: any[]) => ({
              time: Number(row[0]),
              o: Number(row[1]),
              h: Number(row[2]),
              l: Number(row[3]),
              c: Number(row[4]),
            }))
            setCandlesByKey((prev) => ({ ...prev, [`BTC/USD-${frame}`]: mapped }))
          }),
        )
      } catch {
        // fallback to simulated candles
      }
    }

    void loadInitialCandles()

    const tickerWs = new WebSocket(`wss://stream.binance.com:9443/ws/${btc.feedSymbol}@trade`)
    tickerWs.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const px = Number(payload.p)
        if (!Number.isFinite(px)) return
        setPrices((current) =>
          current.map((row) => (row.sym === 'BTC/USD' ? { ...row, prev: row.cur, cur: roundTo(px, row.dec), source: 'live' } : row)),
        )
      } catch {
        // ignore malformed packet
      }
    }
    sockets.push(tickerWs)

    TFS.forEach((frame) => {
      const interval = TF_TO_BINANCE[frame]
      if (!interval) return
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${btc.feedSymbol}@kline_${interval}`)
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          const k = payload?.k
          if (!k) return
          const candle: Candle = {
            time: Number(k.t),
            o: Number(k.o),
            h: Number(k.h),
            l: Number(k.l),
            c: Number(k.c),
          }
          setCandlesByKey((prev) => {
            const key = `BTC/USD-${frame}`
            const current = prev[key] ? [...prev[key]] : []
            const last = current[current.length - 1]
            if (!last || last.time !== candle.time) current.push(candle)
            else current[current.length - 1] = candle
            while (current.length > 220) current.shift()
            return { ...prev, [key]: current }
          })
        } catch {
          // ignore malformed packet
        }
      }
      sockets.push(ws)
    })

    return () => {
      alive = false
      controller.abort()
      sockets.forEach((ws) => {
        try {
          ws.close()
        } catch {}
      })
    }
  }, [])

  useEffect(() => {
    if (selectedInst.live && sym === 'BTC/USD') return
    const tfMs = TF_TO_MINUTES[tf] * 60_000
    setCandlesByKey((prev) => ({
      ...prev,
      [chartKey]: mergeLivePriceIntoCandles(prev[chartKey] ?? buildSimulatedCandles(selectedInst, tf), selectedInst.cur, tfMs, selectedInst.dec),
    }))
  }, [chartKey, selectedInst, sym, tf])

  useEffect(() => {
    if (!primary) return

    supabase
      .from('trades')
      .select('*')
      .eq('account_id', primary.id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .then(({ data }) => setOpenTrades((data ?? []) as TradeRow[]))

    supabase
      .from('trades')
      .select('*')
      .eq('account_id', primary.id)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setClosedTrades((data ?? []) as TradeRow[]))
  }, [primary?.id])

  useEffect(() => {
    if (!primary) return

    const openChannel = supabase
      .channel(`platform-open-${primary.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades', filter: `account_id=eq.${primary.id}` },
        (payload) => {
          const row = (payload.new || payload.old) as TradeRow | undefined
          if (!row) return
          if ((row as any).status === 'open') {
            setOpenTrades((current) => {
              const filtered = current.filter((t) => t.id !== row.id)
              return [row, ...filtered].sort((a, b) => +new Date(b.opened_at) - +new Date(a.opened_at))
            })
          } else if ((row as any).status === 'closed') {
            setOpenTrades((current) => current.filter((t) => t.id !== row.id))
            setClosedTrades((current) => [row, ...current.filter((t) => t.id !== row.id)].slice(0, 50))
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(openChannel)
    }
  }, [primary?.id])

  const calcFloatingPnl = useCallback(
    (trade: TradeRow) => {
      const row = prices.find((p) => p.sym === trade.symbol)
      if (!row) return 0
      const mark = trade.direction === 'buy' ? row.cur : row.cur + row.spread
      const priceDiff = trade.direction === 'buy' ? mark - trade.open_price : trade.open_price - mark
      const pips = priceDiff / row.pip
      return Number((pips * row.pip * trade.lots * 100000 * 0.1).toFixed(2))
    },
    [prices],
  )

  const totalFloatingPnl = useMemo(() => openTrades.reduce((sum, trade) => sum + calcFloatingPnl(trade), 0), [calcFloatingPnl, openTrades])

  async function placeOrder() {
    if (!primary) {
      toast('error', '❌', 'No Account', 'No active trading account found.')
      return
    }

    const size = Number(lots)
    if (!Number.isFinite(size) || size <= 0) {
      toast('error', '❌', 'Invalid Size', 'Lot size must be greater than 0.')
      return
    }

    setPlacing(true)
    setConfirmOpen(false)

    const { data, error } = await supabase
      .from('trades')
      .insert({
        account_id: primary.id,
        user_id: primary.user_id,
        symbol: sym,
        direction: dir,
        lots: size,
        order_type: orderType.toLowerCase(),
        open_price: roundTo(execPrice, selectedInst.dec),
        sl: sl ? Number(sl) : null,
        tp: tp ? Number(tp) : null,
        status: 'open',
        opened_at: new Date().toISOString(),
      })
      .select()
      .single()

    setPlacing(false)

    if (error) {
      toast('error', '❌', 'Error', error.message)
      return
    }

    setOpenTrades((current) => [data as unknown as TradeRow, ...current])
    toast('success', '⚡', 'Order Placed', `${dir.toUpperCase()} ${size.toFixed(2)} ${sym} @ ${execPrice.toFixed(selectedInst.dec)}`)
    setSl('')
    setTp('')
  }

  async function closeTrade(trade: TradeRow, reason: 'manual' | 'sl' | 'tp' = 'manual') {
    const row = prices.find((p) => p.sym === trade.symbol) ?? selectedInst
    const closePrice = trade.direction === 'buy' ? row.cur : row.cur + row.spread
    const priceDiff = trade.direction === 'buy' ? closePrice - trade.open_price : trade.open_price - closePrice
    const pips = Number((priceDiff / row.pip).toFixed(1))
    const netPnl = Number((pips * row.pip * trade.lots * 100000 * 0.1).toFixed(2))

    const { error } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        close_price: roundTo(closePrice, row.dec),
        closed_at: new Date().toISOString(),
        pips,
        net_pnl: netPnl,
        gross_pnl: netPnl,
        comment: reason === 'manual' ? trade.comment : `auto-${reason}`,
      })
      .eq('id', trade.id)

    if (error) {
      toast('error', '❌', 'Error', error.message)
      return
    }

    setOpenTrades((current) => current.filter((x) => x.id !== trade.id))
    setClosedTrades((current) => [{ ...trade, close_price: closePrice, net_pnl: netPnl, pips, closed_at: new Date().toISOString() }, ...current].slice(0, 50))
    toast(netPnl >= 0 ? 'success' : 'warning', reason === 'manual' ? '🔴' : '🎯', reason === 'manual' ? 'Closed' : `${reason.toUpperCase()} Hit`, `${trade.symbol} ${netPnl >= 0 ? '+' : ''}${fmt(netPnl)}`)
  }

  useEffect(() => {
    if (!openTrades.length) return

    const jobs = openTrades.map(async (trade) => {
      const row = prices.find((p) => p.sym === trade.symbol)
      if (!row) return

      const bid = row.cur
      const ask = row.cur + row.spread
      const shouldStop =
        trade.sl != null && ((trade.direction === 'buy' && bid <= trade.sl) || (trade.direction === 'sell' && ask >= trade.sl))
      const shouldTake =
        trade.tp != null && ((trade.direction === 'buy' && bid >= trade.tp) || (trade.direction === 'sell' && ask <= trade.tp))

      if (shouldStop) await closeTrade(trade, 'sl')
      else if (shouldTake) await closeTrade(trade, 'tp')
    })

    void Promise.all(jobs)
  }, [openTrades, prices])

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', fontFamily: 'var(--font-sans,sans-serif)' }}>
        <div style={{ width: 158, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--gold)' }}>✦</div>
            <span style={{ fontFamily: 'serif', fontSize: 11, fontWeight: 'bold', lineHeight: 1.3 }}>TFD<br />Terminal</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {prices.map((p) => (
              <div
                key={p.sym}
                onClick={() => setSym(p.sym)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(212,168,67,.04)',
                  background: sym === p.sym ? 'rgba(212,168,67,.07)' : 'transparent',
                  borderLeft: sym === p.sym ? '2px solid var(--gold)' : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2 }}>{p.sym}</div>
                  <span style={{ fontSize: 7, letterSpacing: 1.2, color: p.source === 'live' ? 'var(--green)' : 'var(--text3)', textTransform: 'uppercase' }}>{p.source === 'live' ? 'Live' : 'Sim'}</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: p.cur >= p.prev ? 'var(--green)' : 'var(--red)' }}>{p.cur.toFixed(p.dec)}</div>
                <div style={{ fontSize: 8, color: p.cur >= p.prev ? 'var(--green)' : 'var(--red)' }}>{p.cur >= p.prev ? '▲' : '▼'} {Math.abs(p.cur - p.prev).toFixed(p.dec)}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--bdr)' }}>
            {accounts.length > 1 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>Account</div>
                <select
                  value={selectedAccountId ?? primary?.id ?? ''}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  style={{ width: '100%', padding: '5px 6px', background: 'var(--bg3)', border: '1px solid var(--dim)', color: 'var(--text)', fontSize: 9, fontFamily: 'monospace', outline: 'none', cursor: 'pointer' }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_number}</option>
                  ))}
                </select>
              </div>
            )}

            {accounts.length === 1 && <div style={{ marginBottom: 8, padding: '5px 6px', background: 'var(--bg3)', border: '1px solid var(--dim)', fontSize: 9, fontFamily: 'monospace', color: 'var(--gold)' }}>{primary?.account_number ?? 'No account'}</div>}

            <button onClick={() => navigate('/dashboard')} style={{ width: '100%', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>← Dashboard</button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 44, background: 'var(--bg2)', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>
            <span style={{ fontFamily: 'serif', fontSize: 16, fontWeight: 'bold' }}>{sym}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 500, color: selectedInst.cur >= selectedInst.prev ? 'var(--green)' : 'var(--red)' }}>{selectedInst.cur.toFixed(selectedInst.dec)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: selectedInst.source === 'live' ? 'var(--green)' : 'var(--text3)', boxShadow: selectedInst.source === 'live' ? '0 0 5px var(--green)' : 'none' }} />
              <span style={{ fontSize: 9, color: selectedInst.source === 'live' ? 'var(--green)' : 'var(--text3)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>{selectedInst.source}</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              {TFS.map((t) => (
                <button key={t} onClick={() => setTf(t)} style={{ padding: '3px 7px', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', background: tf === t ? 'rgba(212,168,67,.15)' : 'transparent', border: tf === t ? '1px solid var(--bdr2)' : '1px solid transparent', color: tf === t ? 'var(--gold)' : 'var(--text3)' }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <CandleChart symbol={sym} tf={tf} livePrice={selectedInst.cur} candles={visibleCandles} decimals={selectedInst.dec} isLive={selectedInst.source === 'live'} />
          </div>

          <div style={{ height: 220, background: 'var(--bg2)', borderTop: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)' }}>
              {[
                ['positions', `Positions (${openTrades.length})`],
                ['history', `History (${closedTrades.length})`],
                ['account', 'Account'],
              ].map(([k, label]) => (
                <button key={k} onClick={() => setTab(k as 'positions' | 'history' | 'account')} style={{ padding: '7px 14px', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer', border: 'none', borderBottom: tab === k ? '2px solid var(--gold)' : '2px solid transparent', background: tab === k ? 'rgba(212,168,67,.04)' : 'transparent', color: tab === k ? 'var(--gold)' : 'var(--text3)', marginBottom: -1 }}>{label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {tab === 'positions' && (
                openTrades.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 11 }}>No open positions</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--dim)' }}>
                        {['Symbol', 'Dir', 'Lots', 'Open', 'Mark', 'Float P&L', 'SL', 'TP', 'Opened', 'Close'].map((h) => (
                          <th key={h} style={{ padding: '5px 10px', fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map((t) => {
                        const row = prices.find((p) => p.sym === t.symbol)
                        const mark = row ? (t.direction === 'buy' ? row.cur : row.cur + row.spread) : t.open_price
                        const pnl = calcFloatingPnl(t)
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid rgba(212,168,67,.04)' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.symbol}</td>
                            <td style={{ padding: '6px 10px' }}><span style={{ fontSize: 8, fontWeight: 'bold', color: t.direction === 'buy' ? 'var(--green)' : 'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{t.lots}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{t.open_price}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{row ? mark.toFixed(row.dec) : '—'}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--red)' }}>{t.sl ?? '—'}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: 'var(--green)' }}>{t.tp ?? '—'}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 9, color: 'var(--text3)' }}>{new Date(t.opened_at).toLocaleTimeString()}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <button onClick={() => closeTrade(t)} style={{ padding: '3px 8px', fontSize: 8, textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', background: 'rgba(255,51,82,.1)', color: 'var(--red)', border: '1px solid rgba(255,51,82,.2)' }}>✕ Close</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              )}

              {tab === 'history' && (
                closedTrades.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: 11 }}>No history</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--dim)' }}>
                        {['Symbol', 'Dir', 'Lots', 'Open', 'Close', 'Pips', 'Net P&L', 'Date'].map((h) => (
                          <th key={h} style={{ padding: '5px 10px', fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid rgba(212,168,67,.04)' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.symbol}</td>
                          <td style={{ padding: '6px 10px' }}><span style={{ fontSize: 8, fontWeight: 'bold', color: t.direction === 'buy' ? 'var(--green)' : 'var(--red)' }}>{t.direction.toUpperCase()}</span></td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{t.lots}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{t.open_price}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{t.close_price ?? '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: (t.pips ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{t.pips != null ? `${t.pips > 0 ? '+' : ''}${t.pips}` : '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, color: (t.net_pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{t.net_pnl != null ? `${t.net_pnl >= 0 ? '+' : ''}${fmt(t.net_pnl)}` : '—'}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 9, color: 'var(--text3)' }}>{t.closed_at ? new Date(t.closed_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {tab === 'account' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, padding: 16 }}>
                  {[
                    ['Balance', fmt((primary as any)?.balance ?? 0)],
                    ['Equity', fmt((((primary as any)?.equity ?? (primary as any)?.balance ?? 0) as number) + totalFloatingPnl)],
                    ['Open', String(openTrades.length)],
                    ['Account', (primary as any)?.account_number ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--gold)' }}>{value}</div>
                    </div>
                  ))}
                  <div style={{ gridColumn: 'span 2' }}><DrawdownBar label="Daily DD" value={(primary as any)?.daily_dd_used ?? 0} max={5} /></div>
                  <div style={{ gridColumn: 'span 2' }}><DrawdownBar label="Max DD" value={(primary as any)?.max_dd_used ?? 0} max={10} warn={60} danger={80} /></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ width: 220, flexShrink: 0, background: 'var(--bg2)', borderLeft: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>Order Panel</div>
            <div style={{ display: 'flex' }}>
              <button onClick={() => setDir('buy')} style={{ flex: 1, padding: '8px 0', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: dir === 'buy' ? 'var(--green)' : 'rgba(0,217,126,.08)', color: dir === 'buy' ? 'var(--bg)' : 'var(--green)' }}>Buy</button>
              <button onClick={() => setDir('sell')} style={{ flex: 1, padding: '8px 0', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: dir === 'sell' ? 'var(--red)' : 'rgba(255,51,82,.08)', color: dir === 'sell' ? 'white' : 'var(--red)' }}>Sell</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', padding: '8px', border: '1px solid var(--bdr)', background: 'var(--bg3)' }}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{dir === 'buy' ? 'Ask' : 'Bid'}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 500, color: selectedInst.cur >= selectedInst.prev ? 'var(--green)' : 'var(--red)' }}>{execPrice.toFixed(selectedInst.dec)}</div>
            </div>

            <div style={{ fontSize: 9, color: 'var(--text3)', border: '1px solid var(--dim)', background: 'var(--bg3)', padding: '8px 10px', lineHeight: 1.5 }}>
              Feed: <span style={{ color: selectedInst.source === 'live' ? 'var(--green)' : 'var(--gold)' }}>{selectedInst.source}</span><br />
              {selectedInst.source === 'live' ? 'BTC/USD uses live Binance market data.' : 'This symbol uses simulator pricing until you add a live forex/CFD data provider.'}
            </div>

            <div>
              <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>Order Type</div>
              <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--dim)' }}>
                {(['Market', 'Limit', 'Stop'] as const).map((t) => (
                  <button key={t} onClick={() => setOrderType(t)} style={{ flex: 1, padding: '6px 0', fontSize: 8, textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: orderType === t ? 'rgba(212,168,67,.12)' : 'transparent', color: orderType === t ? 'var(--gold)' : 'var(--text3)' }}>{t}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>Lot Size</div>
              <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--dim)' }}>
                <button onClick={() => setLots((l) => String(Math.max(0.01, Number(l || 0) - 0.01).toFixed(2)))} style={{ padding: '0 8px', background: 'transparent', border: 'none', borderRight: '1px solid var(--dim)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, fontWeight: 'bold' }}>−</button>
                <input value={lots} onChange={(e) => setLots(e.target.value)} type="number" step="0.01" min="0.01" style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'monospace', fontSize: 13 }} />
                <button onClick={() => setLots((l) => String((Number(l || 0) + 0.01).toFixed(2)))} style={{ padding: '0 8px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--dim)', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, fontWeight: 'bold' }}>+</button>
              </div>
            </div>

            {[
              ['Stop Loss', sl, setSl],
              ['Take Profit', tp, setTp],
            ].map((item) => {
              const label = item[0] as string
              const value = item[1] as string
              const setter = item[2] as React.Dispatch<React.SetStateAction<string>>
              return (
                <div key={label}>
                  <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                  <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--dim)' }}>
                    <input value={value} onChange={(e) => setter(e.target.value)} placeholder="Optional" type="number" style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }} />
                  </div>
                </div>
              )
            })}

            {!primary && <div style={{ fontSize: 9, color: 'var(--red)', textAlign: 'center', border: '1px solid rgba(255,51,82,.2)', padding: 8 }}>No active account</div>}

            <button onClick={() => setConfirmOpen(true)} disabled={placing || !primary} style={{ width: '100%', padding: '11px 0', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 'bold', cursor: placing || !primary ? 'not-allowed' : 'pointer', border: 'none', opacity: placing || !primary ? 0.4 : 1, background: dir === 'buy' ? 'var(--green)' : 'var(--red)', color: dir === 'buy' ? 'var(--bg)' : 'white' }}>{placing ? 'Placing…' : `${dir.toUpperCase()} ${lots} ${sym}`}</button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--bdr2)', padding: 24, minWidth: 320 }}>
            <div style={{ fontFamily: 'serif', fontSize: 19, fontWeight: 'bold', marginBottom: 4 }}>Confirm Order</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 16 }}>Review before executing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                ['Symbol', sym],
                ['Direction', dir.toUpperCase()],
                ['Type', orderType],
                ['Lots', lots],
                ['Price', execPrice.toFixed(selectedInst.dec)],
                ['Account', (primary as any)?.account_number ?? '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--dim)' }}>
                  <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: value === 'BUY' ? 'var(--green)' : value === 'SELL' ? 'var(--red)' : 'var(--text)' }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bdr2)', color: 'var(--text2)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button onClick={placeOrder} style={{ padding: '8px 22px', border: 'none', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 'bold', cursor: 'pointer', background: dir === 'buy' ? 'var(--green)' : 'var(--red)', color: dir === 'buy' ? 'var(--bg)' : 'white' }}>Confirm {dir.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
