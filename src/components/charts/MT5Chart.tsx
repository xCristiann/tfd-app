import { useEffect, useRef, useCallback, useState } from 'react'
import type { Candle } from '@/hooks/useMT5Bridge'

interface Props {
  sym: string
  tf: string
  requestCandles: (sym: string, tf: string) => Promise<Candle[]>
  livePrice?: number
  spread?: number
  shiftBars?: number
}

const COLORS = {
  bg: '#FFFFFF',
  grid: 'rgba(26,58,107,0.06)',
  axisText: '#8FA3BF',
  bull: '#16A34A',
  bear: '#DC2626',
  cross: 'rgba(34,85,204,0.35)',
  bidLine: '#2255CC',
  askLine: '#0F766E',
}

const PAD = { top: 20, right: 72, bottom: 28, left: 4 }

function decimals(p: number) {
  if (p >= 1000) return 2
  if (p >= 100) return 2
  if (p >= 10) return 3
  return 5
}

function fmtTime(ts: number, tf: string) {
  const d = new Date(ts * 1000)
  if (tf === 'D' || tf === 'W') {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function MT5Chart({ sym, tf, requestCandles, livePrice, spread = 0, shiftBars = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const candlesRef = useRef<Candle[]>([])
  const livePriceRef = useRef<number | undefined>(livePrice)
  const tfRef = useRef(tf)
  const spreadRef = useRef(spread)
  const shiftBarsRef = useRef(shiftBars)

  const viewRef = useRef({ offset: 0, cw: 10 })
  const mouseRef = useRef<{ x: number; y: number } | null>(null)

  const dragStateRef = useRef<{
    active: boolean
    mode: 'pan' | 'scale' | null
    startX: number
    startY: number
    startOff: number
    startPricePan: number
    startPriceZoom: number
  }>({
    active: false,
    mode: null,
    startX: 0,
    startY: 0,
    startOff: 0,
    startPricePan: 0,
    startPriceZoom: 1,
  })

  const pricePanRef = useRef(0)
  const priceZoomRef = useRef(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ohlc, setOhlc] = useState<Candle | null>(null)

  useEffect(() => {
    livePriceRef.current = livePrice
  }, [livePrice])

  useEffect(() => {
    tfRef.current = tf
  }, [tf])

  useEffect(() => {
    spreadRef.current = spread
  }, [spread])

  useEffect(() => {
    shiftBarsRef.current = shiftBars
  }, [shiftBars])

  const getVisibleMeta = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { slice: [] as Candle[], cw: 10, shiftPx: 0 }
    }

    const W = canvas.width
    const cW = W - PAD.left - PAD.right
    const all = candlesRef.current
    const cw = viewRef.current.cw
    const shiftPx = Math.max(0, shiftBarsRef.current) * (cw + 2)
    const usableW = Math.max(20, cW - shiftPx)
    const off = Math.max(0, Math.min(viewRef.current.offset, Math.max(0, all.length - 1)))
    const vis = Math.floor(usableW / (cw + 2))
    const slice = all.slice(off, off + vis + 1)

    return { slice, cw, shiftPx }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cW = W - PAD.left - PAD.right
    const cH = H - PAD.top - PAD.bottom

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, W, H)

    const { slice, cw } = getVisibleMeta()
    if (!slice.length) return

    const rawMin = Math.min(...slice.map(c => c.low))
    const rawMax = Math.max(...slice.map(c => c.high))
    const rawRange = Math.max(rawMax - rawMin, 0.0001)

    const paddedRange = rawRange * 1.15
    const center = (rawMin + rawMax) / 2 + pricePanRef.current
    const visibleRange = paddedRange * priceZoomRef.current

    const minP = center - visibleRange / 2
    const maxP = center + visibleRange / 2
    const rng = Math.max(maxP - minP, 0.0001)

    const bid = livePriceRef.current
    const ask = typeof bid === 'number' ? bid + (spreadRef.current || 0) : undefined
    const dec = decimals(slice[0].close)

    const toY = (p: number) => PAD.top + cH - ((p - minP) / rng) * cH
    const toP = (y: number) => minP + ((PAD.top + cH - y) / cH) * rng

    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1

    for (let i = 0; i <= 5; i++) {
      const y = PAD.top + (cH / 5) * i
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(W - PAD.right, y)
      ctx.stroke()

      ctx.fillStyle = COLORS.axisText
      ctx.font = '9px "JetBrains Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(toP(y).toFixed(dec), W - PAD.right + 3, y + 3)
    }

    ctx.fillStyle = COLORS.axisText
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'center'

    const every = Math.max(1, Math.floor(slice.length / 6))
    slice.forEach((c, i) => {
      if (i % every === 0) {
        const x = PAD.left + i * (cw + 2) + cw / 2
        ctx.fillText(fmtTime(c.time, tfRef.current), x, H - PAD.bottom + 12)
      }
    })

    slice.forEach((c, i) => {
      const x = PAD.left + i * (cw + 2)
      const cx = x + cw / 2
      const bull = c.close >= c.open
      const col = bull ? COLORS.bull : COLORS.bear
      const bTop = toY(Math.max(c.open, c.close))
      const bBot = toY(Math.min(c.open, c.close))
      const bH = Math.max(1, bBot - bTop)

      ctx.strokeStyle = col
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, toY(c.high))
      ctx.lineTo(cx, toY(c.low))
      ctx.stroke()

      ctx.fillStyle = col
      ctx.fillRect(x, bTop, cw, bH)
    })

    const drawPriceLine = (price: number | undefined, color: string, label: string) => {
      if (typeof price !== 'number') return
      if (price < minP || price > maxP) return

      const y = toY(price)

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(PAD.left, y)
      ctx.lineTo(W - PAD.right, y)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = color
      ctx.fillRect(W - PAD.right, y - 8, PAD.right - 2, 16)

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(price.toFixed(dec), W - PAD.right + (PAD.right - 2) / 2, y + 3)

      ctx.fillStyle = color
      ctx.font = 'bold 8px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(label, W - PAD.right - 6, y - 4)
    }

    drawPriceLine(ask, COLORS.askLine, 'ASK')
    drawPriceLine(bid, COLORS.bidLine, 'BID')

    const m = mouseRef.current
    if (m && m.x > PAD.left && m.x < W - PAD.right && m.y > PAD.top && m.y < H - PAD.bottom) {
      ctx.strokeStyle = COLORS.cross
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])

      ctx.beginPath()
      ctx.moveTo(m.x, PAD.top)
      ctx.lineTo(m.x, H - PAD.bottom)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(PAD.left, m.y)
      ctx.lineTo(W - PAD.right, m.y)
      ctx.stroke()

      ctx.setLineDash([])

      const cp = toP(m.y)
      ctx.fillStyle = '#1A3A6B'
      ctx.fillRect(W - PAD.right, m.y - 8, PAD.right - 2, 16)

      ctx.fillStyle = '#fff'
      ctx.font = '9px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(cp.toFixed(dec), W - PAD.right + (PAD.right - 2) / 2, m.y + 3)
    }
  }, [getVisibleMeta])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await requestCandles(sym, tf)
      if (!data?.length) throw new Error('Fara date')

      candlesRef.current = data
      pricePanRef.current = 0
      priceZoomRef.current = 1

      const w = canvasRef.current?.parentElement?.clientWidth ?? 800
      const cw = viewRef.current.cw
      const shiftPx = Math.max(0, shiftBarsRef.current) * (cw + 2)
      const usableW = Math.max(20, (w - PAD.left - PAD.right) - shiftPx)
      const vis = Math.floor(usableW / (cw + 2))
      viewRef.current.offset = Math.max(0, data.length - vis)

      draw()
    } catch (e: any) {
      setError(e.message || 'Eroare')
    }

    setLoading(false)
  }, [sym, tf, requestCandles, draw])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!livePrice || !candlesRef.current.length) return

    const last = candlesRef.current[candlesRef.current.length - 1]
    last.close = livePrice
    if (livePrice > last.high) last.high = livePrice
    if (livePrice < last.low) last.low = livePrice

    draw()
  }, [livePrice, draw])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = el.clientWidth
      canvas.height = el.clientHeight
      draw()
    }

    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => {
    draw()
  }, [shiftBars, spread, draw])

  const onMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top

    mouseRef.current = { x, y }

    const W = canvas.width
    const cH = canvas.height - PAD.top - PAD.bottom
    const rightAxisStart = W - PAD.right

    if (dragStateRef.current.active) {
      const dx = e.clientX - dragStateRef.current.startX
      const dy = e.clientY - dragStateRef.current.startY

      if (dragStateRef.current.mode === 'pan') {
        viewRef.current.offset = Math.max(
          0,
          dragStateRef.current.startOff - Math.round(dx / (viewRef.current.cw + 2))
        )

        const { slice } = getVisibleMeta()
        if (slice.length) {
          const rawMin = Math.min(...slice.map(c => c.low))
          const rawMax = Math.max(...slice.map(c => c.high))
          const rawRange = Math.max(rawMax - rawMin, 0.0001)
          const visibleRange = rawRange * 1.15 * priceZoomRef.current
          pricePanRef.current = dragStateRef.current.startPricePan + (dy / cH) * visibleRange
        }
      }

      if (dragStateRef.current.mode === 'scale') {
        const factor = 1 + dy * 0.01
        priceZoomRef.current = Math.max(0.2, Math.min(8, dragStateRef.current.startPriceZoom * factor))
      }
    }

    const { slice, cw } = getVisibleMeta()
    const ci = Math.floor((x - PAD.left) / (cw + 2))

    if (x < rightAxisStart && ci >= 0 && ci < slice.length) {
      setOhlc(prev => {
        const next = slice[ci]
        if (
          prev &&
          prev.time === next.time &&
          prev.open === next.open &&
          prev.high === next.high &&
          prev.low === next.low &&
          prev.close === next.close
        ) {
          return prev
        }
        return next
      })
    } else {
      setOhlc(prev => (prev === null ? prev : null))
    }

    draw()
  }

  const onLeave = () => {
    mouseRef.current = null
    dragStateRef.current.active = false
    dragStateRef.current.mode = null
    setOhlc(null)
    draw()
  }

  const onDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const rightAxisStart = canvas.width - PAD.right

    dragStateRef.current.active = true
    dragStateRef.current.mode = x >= rightAxisStart ? 'scale' : 'pan'
    dragStateRef.current.startX = e.clientX
    dragStateRef.current.startY = e.clientY
    dragStateRef.current.startOff = viewRef.current.offset
    dragStateRef.current.startPricePan = pricePanRef.current
    dragStateRef.current.startPriceZoom = priceZoomRef.current
  }

  const onUp = () => {
    dragStateRef.current.active = false
    dragStateRef.current.mode = null
  }

  const onWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -1 : 1
    viewRef.current.cw = Math.max(3, Math.min(40, viewRef.current.cw + delta))
    draw()
  }

  const dec = ohlc ? decimals(ohlc.close) : 5

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#fff' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: dragStateRef.current.active ? 'grabbing' : 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseDown={onDown}
        onMouseUp={onUp}
        onWheel={onWheel}
      />

      {ohlc && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 10,
            background: 'rgba(26,58,107,.9)',
            color: '#fff',
            fontSize: '10px',
            padding: '5px 9px',
            borderRadius: '6px',
            fontFamily: "'JetBrains Mono',monospace",
            lineHeight: 1.9,
            pointerEvents: 'none',
          }}
        >
          <div style={{ opacity: 0.6, fontSize: '9px', marginBottom: 1 }}>{fmtTime(ohlc.time, tf)}</div>
          <div>O <span style={{ color: '#93C5FD' }}>{ohlc.open.toFixed(dec)}</span></div>
          <div>H <span style={{ color: '#4ADE80' }}>{ohlc.high.toFixed(dec)}</span></div>
          <div>L <span style={{ color: '#F87171' }}>{ohlc.low.toFixed(dec)}</span></div>
          <div>
            C{' '}
            <span style={{ color: ohlc.close >= ohlc.open ? '#4ADE80' : '#F87171' }}>
              {ohlc.close.toFixed(dec)}
            </span>
          </div>
        </div>
      )}

      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,.9)',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              border: '2px solid #2255CC',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin .8s linear infinite',
            }}
          />
          <div style={{ fontSize: 11, color: '#8FA3BF' }}>Se incarca {sym}…</div>
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,.9)',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: '#DC2626' }}>? {error}</div>
          <button
            onClick={load}
            style={{
              padding: '5px 14px',
              background: '#2255CC',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Incearca din nou
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 80,
          fontSize: 9,
          color: '#8FA3BF',
          background: 'rgba(244,247,253,.9)',
          padding: '2px 7px',
          borderRadius: 10,
          border: '1px solid #E8EEF8',
          fontFamily: 'Inter,sans-serif',
        }}
      >
        {sym}
      </div>
    </div>
  )
}
