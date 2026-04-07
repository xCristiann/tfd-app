import { useEffect, useRef, useCallback, useState } from 'react'
import type { Candle } from '@/hooks/useMT5Bridge'

type ToolMode = 'cursor' | 'hline' | 'rectangle' | 'long' | 'short'

interface ChartTrade {
  id: string | number
  symbol: string
  direction: 'buy' | 'sell' | string
  lots: number | string
  open_price: number
  sl?: number | null
  tp?: number | null
}

type HLineDrawing = {
  id: string
  type: 'hline'
  price: number
}

type RectDrawing = {
  id: string
  type: 'rectangle'
  i1: number
  i2: number
  p1: number
  p2: number
}

type PositionDrawing = {
  id: string
  type: 'long' | 'short'
  i1: number
  i2: number
  entry: number
  tp: number
  sl: number
}

type Drawing = HLineDrawing | RectDrawing | PositionDrawing

type Selection =
  | { kind: 'drawing'; id: string; handle?: string | null }
  | { kind: 'trade'; tradeId: string | number; field: 'sl' | 'tp' }
  | null

interface Props {
  sym: string
  tf: string
  requestCandles: (sym: string, tf: string) => Promise<Candle[]>
  livePrice?: number
  spread?: number
  priceDecimals?: number
  priceStep?: number
  shiftBars?: number
  openTrades?: ChartTrade[]
  onTradeSLTPChange?: (tradeId: string | number, newSl: number | null, newTp: number | null) => void | Promise<void>
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
  entryLine: '#64748B',
  slLine: '#DC2626',
  tpLine: '#16A34A',
  rectStroke: '#2255CC',
  rectFill: 'rgba(34,85,204,0.08)',
  longFill: 'rgba(22,163,74,0.14)',
  longStop: 'rgba(220,38,38,0.12)',
  shortFill: 'rgba(220,38,38,0.14)',
  shortStop: 'rgba(22,163,74,0.12)',
  selected: '#111827',
  handle: '#2255CC',
}

const PAD = { top: 20, right: 72, bottom: 28, left: 4 }
const HANDLE_R = 5

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

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2)
}

export function MT5Chart({
  sym,
  tf,
  requestCandles,
  livePrice,
  spread = 0,
  priceDecimals,
  priceStep,
  shiftBars = 0,
  openTrades = [],
  onTradeSLTPChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const candlesRef = useRef<Candle[]>([])
  const livePriceRef = useRef<number | undefined>(livePrice)
  const tfRef = useRef(tf)
  const drawingsRef = useRef<Drawing[]>([])
  const draftDrawingRef = useRef<Drawing | null>(null)
  const openTradesRef = useRef<ChartTrade[]>(openTrades)
  const selectionRef = useRef<Selection>(null)

  const viewRef = useRef({ offset: 0, cw: 10 })
  const mouseRef = useRef<{ x: number; y: number } | null>(null)

  const dragRef = useRef<{
    active: boolean
    mode: 'pan' | 'scale' | 'trade-line' | 'draw' | 'move-drawing' | 'resize-drawing'
    startX: number
    startY: number
    startOff: number
    startPricePan: number
    startPriceZoom: number

    tradeId: string | number | null
    tradeField: 'sl' | 'tp' | null
    draftPrice: number | null

    drawStartIndex: number | null
    drawStartPrice: number | null

    drawingId: string | null
    handle: string | null
    snapshot: Drawing | null
    startIndex: number | null
    startPrice: number | null
  }>({
    active: false,
    mode: 'pan',
    startX: 0,
    startY: 0,
    startOff: 0,
    startPricePan: 0,
    startPriceZoom: 1,
    tradeId: null,
    tradeField: null,
    draftPrice: null,
    drawStartIndex: null,
    drawStartPrice: null,
    drawingId: null,
    handle: null,
    snapshot: null,
    startIndex: null,
    startPrice: null,
  })

  const pricePanRef = useRef(0)
  const priceZoomRef = useRef(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ohlc, setOhlc] = useState<Candle | null>(null)
  const [tool, setTool] = useState<ToolMode>('cursor')
  const [, forceTick] = useState(0)

  const redraw = useCallback(() => {
    forceTick(v => v + 1)
  }, [])

  useEffect(() => {
    livePriceRef.current = livePrice
  }, [livePrice])

  useEffect(() => {
    tfRef.current = tf
  }, [tf])

  useEffect(() => {
    openTradesRef.current = openTrades
  }, [openTrades])

  const snapPrice = useCallback((value: number) => {
    const dec = typeof priceDecimals === 'number' ? priceDecimals : decimals(Math.abs(value || 1))
    if (!priceStep || priceStep <= 0) return +value.toFixed(dec)
    return +(Math.round(value / priceStep) * priceStep).toFixed(dec)
  }, [priceDecimals, priceStep])

  const getVisibleMeta = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { slice: [] as Candle[], cw: 10, shiftPx: 0, off: 0 }

    const W = canvas.width
    const cW = W - PAD.left - PAD.right
    const all = candlesRef.current
    const cw = viewRef.current.cw
    const shiftPx = Math.max(0, shiftBars) * (cw + 2)
    const usableW = Math.max(20, cW - shiftPx)
    const off = Math.max(0, Math.min(viewRef.current.offset, Math.max(0, all.length - 1)))
    const vis = Math.floor(usableW / (cw + 2))
    const slice = all.slice(off, off + vis + 1)

    return { slice, cw, shiftPx, off }
  }, [shiftBars])

  const getScaleState = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const { slice, cw, off } = getVisibleMeta()
    if (!slice.length) return null

    const W = canvas.width
    const H = canvas.height
    const cH = H - PAD.top - PAD.bottom
    const rightAxisStart = W - PAD.right

    const rawMin = Math.min(...slice.map(c => c.low))
    const rawMax = Math.max(...slice.map(c => c.high))
    const rawRange = Math.max(rawMax - rawMin, 0.0001)

    const paddedRange = rawRange * 1.15
    const center = (rawMin + rawMax) / 2 + pricePanRef.current
    const visibleRange = paddedRange * priceZoomRef.current

    const minP = center - visibleRange / 2
    const maxP = center + visibleRange / 2
    const rng = Math.max(maxP - minP, 0.0001)

    const toY = (p: number) => PAD.top + cH - ((p - minP) / rng) * cH
    const toPrice = (y: number) => minP + ((PAD.top + cH - y) / cH) * rng
    const indexToX = (index: number) => PAD.left + (index - off) * (cw + 2) + cw / 2
    const xToIndex = (x: number) => Math.round((x - PAD.left) / (cw + 2)) + off
    const dec = typeof priceDecimals === 'number' ? priceDecimals : decimals(slice[0].close)

    return { canvas, W, H, cH, rightAxisStart, slice, cw, off, minP, maxP, rng, toY, toPrice, indexToX, xToIndex, dec }
  }, [getVisibleMeta, priceDecimals])

  const drawHandle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    selected: boolean
  ) => {
    ctx.beginPath()
    ctx.arc(x, y, HANDLE_R, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = selected ? COLORS.selected : COLORS.handle
    ctx.stroke()
  }

  const drawLineWithLabel = useCallback((
    ctx: CanvasRenderingContext2D,
    price: number | null | undefined,
    color: string,
    label: string,
    dec: number,
    toY: (p: number) => number,
    minP: number,
    maxP: number,
    W: number,
    selected = false
  ) => {
    if (typeof price !== 'number') return
    if (price < minP || price > maxP) return

    const y = toY(price)

    ctx.strokeStyle = selected ? COLORS.selected : color
    ctx.lineWidth = selected ? 2 : 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(PAD.left, y)
    ctx.lineTo(W - PAD.right, y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = selected ? COLORS.selected : color
    ctx.fillRect(W - PAD.right, y - 8, PAD.right - 2, 16)

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(price.toFixed(dec), W - PAD.right + (PAD.right - 2) / 2, y + 3)

    ctx.fillStyle = selected ? COLORS.selected : color
    ctx.font = 'bold 8px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(label, PAD.left + 8, y - 4)
  }, [])

  const draw = useCallback(() => {
    const scale = getScaleState()
    const canvas = canvasRef.current
    if (!scale || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { W, H, cH, rightAxisStart, slice, cw, minP, maxP, toY, toPrice, indexToX, dec } = scale

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, W, H)

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
      ctx.fillText(toPrice(y).toFixed(dec), W - PAD.right + 3, y + 3)
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

    const bid = livePriceRef.current
    const ask = typeof bid === 'number' ? bid + spread : undefined

    drawLineWithLabel(ctx, ask, COLORS.askLine, 'ASK', dec, toY, minP, maxP, W)
    drawLineWithLabel(ctx, bid, COLORS.bidLine, 'BID', dec, toY, minP, maxP, W)

    const tradeDraft = dragRef.current.active && dragRef.current.mode === 'trade-line' ? dragRef.current : null

    openTradesRef.current
      .filter(t => t.symbol === sym)
      .forEach(t => {
        drawLineWithLabel(ctx, Number(t.open_price), COLORS.entryLine, 'ENTRY', dec, toY, minP, maxP, W)

        const slValue =
          tradeDraft && tradeDraft.tradeId === t.id && tradeDraft.tradeField === 'sl'
            ? tradeDraft.draftPrice
            : (t.sl ?? null)

        const tpValue =
          tradeDraft && tradeDraft.tradeId === t.id && tradeDraft.tradeField === 'tp'
            ? tradeDraft.draftPrice
            : (t.tp ?? null)

        const sel = selectionRef.current?.kind === 'trade' && selectionRef.current.tradeId === t.id
        drawLineWithLabel(ctx, typeof slValue === 'number' ? slValue : null, COLORS.slLine, 'SL', dec, toY, minP, maxP, W, !!sel && selectionRef.current?.field === 'sl')
        drawLineWithLabel(ctx, typeof tpValue === 'number' ? tpValue : null, COLORS.tpLine, 'TP', dec, toY, minP, maxP, W, !!sel && selectionRef.current?.field === 'tp')
      })

    const drawingsToRender = draftDrawingRef.current ? [...drawingsRef.current, draftDrawingRef.current] : drawingsRef.current

    drawingsToRender.forEach(d => {
      const isSelected = selectionRef.current?.kind === 'drawing' && selectionRef.current.id === d.id

      if (d.type === 'hline') {
        drawLineWithLabel(ctx, d.price, COLORS.rectStroke, 'LINE', dec, toY, minP, maxP, W, isSelected)
        if (isSelected) {
          drawHandle(ctx, W - PAD.right - 22, toY(d.price), true)
        }
      }

      if (d.type === 'rectangle') {
        const x1 = indexToX(d.i1)
        const x2 = indexToX(d.i2)
        const y1 = toY(d.p1)
        const y2 = toY(d.p2)
        const left = Math.min(x1, x2)
        const top = Math.min(y1, y2)
        const width = Math.max(1, Math.abs(x2 - x1))
        const height = Math.max(1, Math.abs(y2 - y1))

        ctx.fillStyle = COLORS.rectFill
        ctx.fillRect(left, top, width, height)
        ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.rectStroke
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.strokeRect(left, top, width, height)

        if (isSelected) {
          drawHandle(ctx, left, top, true)
          drawHandle(ctx, left + width, top, true)
          drawHandle(ctx, left, top + height, true)
          drawHandle(ctx, left + width, top + height, true)
        }
      }

      if (d.type === 'long' || d.type === 'short') {
        const x1 = indexToX(d.i1)
        const x2 = indexToX(d.i2)
        const left = Math.min(x1, x2)
        const right = Math.max(x1, x2)
        const width = Math.max(1, right - left)

        const entryY = toY(d.entry)
        const tpY = toY(d.tp)
        const slY = toY(d.sl)

        if (d.type === 'long') {
          ctx.fillStyle = COLORS.longFill
          ctx.fillRect(left, Math.min(entryY, tpY), width, Math.max(1, Math.abs(entryY - tpY)))
          ctx.fillStyle = COLORS.longStop
          ctx.fillRect(left, Math.min(entryY, slY), width, Math.max(1, Math.abs(entryY - slY)))
        } else {
          ctx.fillStyle = COLORS.shortFill
          ctx.fillRect(left, Math.min(entryY, tpY), width, Math.max(1, Math.abs(entryY - tpY)))
          ctx.fillStyle = COLORS.shortStop
          ctx.fillRect(left, Math.min(entryY, slY), width, Math.max(1, Math.abs(entryY - slY)))
        }

        ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.rectStroke
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.strokeRect(left, Math.min(tpY, slY), width, Math.max(1, Math.abs(tpY - slY)))

        drawLineWithLabel(ctx, d.entry, COLORS.entryLine, 'ENTRY', dec, toY, minP, maxP, W, isSelected && selectionRef.current?.handle === 'entry')
        drawLineWithLabel(ctx, d.tp, COLORS.tpLine, 'TP', dec, toY, minP, maxP, W, isSelected && selectionRef.current?.handle === 'tp')
        drawLineWithLabel(ctx, d.sl, COLORS.slLine, 'SL', dec, toY, minP, maxP, W, isSelected && selectionRef.current?.handle === 'sl')

        if (isSelected) {
          drawHandle(ctx, right, entryY, selectionRef.current?.handle === 'right')
          drawHandle(ctx, left + width / 2, entryY, selectionRef.current?.handle === 'entry')
          drawHandle(ctx, left + width / 2, tpY, selectionRef.current?.handle === 'tp')
          drawHandle(ctx, left + width / 2, slY, selectionRef.current?.handle === 'sl')
        }
      }
    })

    const m = mouseRef.current
    if (m && m.x > PAD.left && m.x < rightAxisStart && m.y > PAD.top && m.y < H - PAD.bottom) {
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

      const cp = toPrice(m.y)
      ctx.fillStyle = '#1A3A6B'
      ctx.fillRect(W - PAD.right, m.y - 8, PAD.right - 2, 16)

      ctx.fillStyle = '#fff'
      ctx.font = '9px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(cp.toFixed(dec), W - PAD.right + (PAD.right - 2) / 2, m.y + 3)
    }
  }, [getScaleState, spread, drawLineWithLabel, sym])

  useEffect(() => {
    draw()
  }, [draw, tool])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await requestCandles(sym, tf)
      if (!data?.length) throw new Error('Fara date')

      candlesRef.current = data
      pricePanRef.current = 0
      priceZoomRef.current = 1
      drawingsRef.current = []
      draftDrawingRef.current = null
      selectionRef.current = null

      const w = canvasRef.current?.parentElement?.clientWidth ?? 800
      const cw = viewRef.current.cw
      const shiftPx = Math.max(0, shiftBars) * (cw + 2)
      const usableW = Math.max(20, (w - PAD.left - PAD.right) - shiftPx)
      const vis = Math.floor(usableW / (cw + 2))
      viewRef.current.offset = Math.max(0, data.length - vis)

      draw()
    } catch (e: any) {
      setError(e.message || 'Eroare')
    }

    setLoading(false)
  }, [sym, tf, requestCandles, shiftBars, draw])

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

  const getHitTradeLine = useCallback((mouseY: number) => {
    const scale = getScaleState()
    if (!scale) return null

    const candidates: Array<{ tradeId: string | number, field: 'sl' | 'tp', price: number, dist: number }> = []

    openTradesRef.current
      .filter(t => t.symbol === sym)
      .forEach(t => {
        if (typeof t.sl === 'number') {
          const d = Math.abs(scale.toY(t.sl) - mouseY)
          if (d <= 6) candidates.push({ tradeId: t.id, field: 'sl', price: t.sl, dist: d })
        }
        if (typeof t.tp === 'number') {
          const d = Math.abs(scale.toY(t.tp) - mouseY)
          if (d <= 6) candidates.push({ tradeId: t.id, field: 'tp', price: t.tp, dist: d })
        }
      })

    if (!candidates.length) return null
    candidates.sort((a, b) => a.dist - b.dist)
    return candidates[0]
  }, [getScaleState, sym])

  const getDrawingHit = useCallback((mx: number, my: number) => {
    const scale = getScaleState()
    if (!scale) return null

    for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
      const d = drawingsRef.current[i]

      if (d.type === 'hline') {
        const y = scale.toY(d.price)
        if (Math.abs(my - y) <= 6) return { id: d.id, handle: 'line' }
      }

      if (d.type === 'rectangle') {
        const x1 = scale.indexToX(d.i1)
        const x2 = scale.indexToX(d.i2)
        const y1 = scale.toY(d.p1)
        const y2 = scale.toY(d.p2)
        const left = Math.min(x1, x2)
        const right = Math.max(x1, x2)
        const top = Math.min(y1, y2)
        const bottom = Math.max(y1, y2)

        const corners = [
          { name: 'tl', x: left, y: top },
          { name: 'tr', x: right, y: top },
          { name: 'bl', x: left, y: bottom },
          { name: 'br', x: right, y: bottom },
        ]

        for (const c of corners) {
          if (dist(mx, my, c.x, c.y) <= 8) return { id: d.id, handle: c.name }
        }

        if (mx >= left && mx <= right && my >= top && my <= bottom) {
          return { id: d.id, handle: 'move' }
        }
      }

      if (d.type === 'long' || d.type === 'short') {
        const x1 = scale.indexToX(d.i1)
        const x2 = scale.indexToX(d.i2)
        const left = Math.min(x1, x2)
        const right = Math.max(x1, x2)
        const entryY = scale.toY(d.entry)
        const tpY = scale.toY(d.tp)
        const slY = scale.toY(d.sl)

        const handles = [
          { name: 'right', x: right, y: entryY },
          { name: 'entry', x: left + (right - left) / 2, y: entryY },
          { name: 'tp', x: left + (right - left) / 2, y: tpY },
          { name: 'sl', x: left + (right - left) / 2, y: slY },
        ]

        for (const h of handles) {
          if (dist(mx, my, h.x, h.y) <= 8) return { id: d.id, handle: h.name }
        }

        const top = Math.min(tpY, slY)
        const bottom = Math.max(tpY, slY)
        if (mx >= left && mx <= right && my >= top && my <= bottom) {
          return { id: d.id, handle: 'move' }
        }
      }
    }

    return null
  }, [getScaleState])

  const replaceDrawing = (id: string, updater: (d: Drawing) => Drawing) => {
    drawingsRef.current = drawingsRef.current.map(d => d.id === id ? updater(d) : d)
  }

  const onMove = (e: React.MouseEvent) => {
    const scale = getScaleState()
    const canvas = canvasRef.current
    if (!canvas || !scale) return

    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    mouseRef.current = { x, y }

    const cH = canvas.height - PAD.top - PAD.bottom

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const dIndex = Math.round(dx / (viewRef.current.cw + 2))
      const dPrice = snapPrice(scale.toPrice(y) - (dragRef.current.startPrice ?? snapPrice(scale.toPrice(y))))

      if (dragRef.current.mode === 'pan') {
        viewRef.current.offset = Math.max(0, dragRef.current.startOff - Math.round(dx / (viewRef.current.cw + 2)))
        const visibleRange = scale.rng * priceZoomRef.current
        pricePanRef.current = dragRef.current.startPricePan + (dy / cH) * visibleRange
      }

      if (dragRef.current.mode === 'scale') {
        const factor = 1 + dy * 0.01
        priceZoomRef.current = Math.max(0.25, Math.min(6, dragRef.current.startPriceZoom * factor))
      }

      if (dragRef.current.mode === 'trade-line') {
        dragRef.current.draftPrice = snapPrice(scale.toPrice(y))
      }

      if (dragRef.current.mode === 'draw') {
        const idx2 = scale.xToIndex(x)
        const p2 = snapPrice(scale.toPrice(y))

        if (tool === 'rectangle' && dragRef.current.drawStartIndex !== null && dragRef.current.drawStartPrice !== null) {
          draftDrawingRef.current = {
            id: 'draft_rect',
            type: 'rectangle',
            i1: dragRef.current.drawStartIndex,
            i2: idx2,
            p1: dragRef.current.drawStartPrice,
            p2,
          }
        }

        if ((tool === 'long' || tool === 'short') && dragRef.current.drawStartIndex !== null && dragRef.current.drawStartPrice !== null) {
          const entry = dragRef.current.drawStartPrice
          const distance = Math.abs(p2 - entry) || (priceStep || 0.0001) * 10
          const tp = tool === 'long' ? entry + distance : entry - distance
          const sl = tool === 'long' ? entry - distance : entry + distance

          draftDrawingRef.current = {
            id: 'draft_pos',
            type: tool,
            i1: dragRef.current.drawStartIndex,
            i2: idx2,
            entry,
            tp: snapPrice(tp),
            sl: snapPrice(sl),
          }
        }
      }

      if ((dragRef.current.mode === 'move-drawing' || dragRef.current.mode === 'resize-drawing') && dragRef.current.drawingId && dragRef.current.snapshot) {
        const drawingId = dragRef.current.drawingId
        const snap = dragRef.current.snapshot
        const handle = dragRef.current.handle

        if (snap.type === 'hline') {
          replaceDrawing(drawingId, d => ({ ...(d as HLineDrawing), price: snapPrice(scale.toPrice(y)) }))
        }

        if (snap.type === 'rectangle') {
          replaceDrawing(drawingId, d => {
            let next = { ...(snap as RectDrawing) }

            if (handle === 'move') {
              next.i1 = snap.i1 + dIndex
              next.i2 = snap.i2 + dIndex
              next.p1 = snapPrice(snap.p1 + dPrice)
              next.p2 = snapPrice(snap.p2 + dPrice)
            }
            if (handle === 'tl') {
              next.i1 = scale.xToIndex(x)
              next.p1 = snapPrice(scale.toPrice(y))
            }
            if (handle === 'tr') {
              next.i2 = scale.xToIndex(x)
              next.p1 = snapPrice(scale.toPrice(y))
            }
            if (handle === 'bl') {
              next.i1 = scale.xToIndex(x)
              next.p2 = snapPrice(scale.toPrice(y))
            }
            if (handle === 'br') {
              next.i2 = scale.xToIndex(x)
              next.p2 = snapPrice(scale.toPrice(y))
            }

            return next
          })
        }

        if (snap.type === 'long' || snap.type === 'short') {
          replaceDrawing(drawingId, d => {
            let next = { ...(snap as PositionDrawing) }

            if (handle === 'move') {
              next.i1 = snap.i1 + dIndex
              next.i2 = snap.i2 + dIndex
              next.entry = snapPrice(snap.entry + dPrice)
              next.tp = snapPrice(snap.tp + dPrice)
              next.sl = snapPrice(snap.sl + dPrice)
            }

            if (handle === 'right') {
              next.i2 = scale.xToIndex(x)
            }

            if (handle === 'entry') {
              const newEntry = snapPrice(scale.toPrice(y))
              const tpOffset = snap.tp - snap.entry
              const slOffset = snap.sl - snap.entry
              next.entry = newEntry
              next.tp = snapPrice(newEntry + tpOffset)
              next.sl = snapPrice(newEntry + slOffset)
            }

            if (handle === 'tp') next.tp = snapPrice(scale.toPrice(y))
            if (handle === 'sl') next.sl = snapPrice(scale.toPrice(y))

            return next
          })
        }
      }
    }

    const ci = Math.floor((x - PAD.left) / (scale.cw + 2))
    if (x < scale.rightAxisStart && ci >= 0 && ci < scale.slice.length) {
      setOhlc(prev => {
        const next = scale.slice[ci]
        if (
          prev &&
          prev.time === next.time &&
          prev.open === next.open &&
          prev.high === next.high &&
          prev.low === next.low &&
          prev.close === next.close
        ) return prev
        return next
      })
    } else {
      setOhlc(prev => (prev === null ? prev : null))
    }

    draw()
  }

  const onLeave = () => {
    mouseRef.current = null
    dragRef.current.active = false
    draftDrawingRef.current = null
    setOhlc(null)
    draw()
  }

  const onDown = (e: React.MouseEvent) => {
    const scale = getScaleState()
    const canvas = canvasRef.current
    if (!canvas || !scale) return

    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top

    if (tool === 'hline') {
      const price = snapPrice(scale.toPrice(y))
      const id = makeId('hline')
      drawingsRef.current = [...drawingsRef.current, { id, type: 'hline', price }]
      selectionRef.current = { kind: 'drawing', id, handle: 'line' }
      setTool('cursor')
      draw()
      return
    }

    if (tool === 'rectangle' || tool === 'long' || tool === 'short') {
      dragRef.current.active = true
      dragRef.current.mode = 'draw'
      dragRef.current.drawStartIndex = scale.xToIndex(x)
      dragRef.current.drawStartPrice = snapPrice(scale.toPrice(y))
      draftDrawingRef.current = null
      selectionRef.current = null
      draw()
      return
    }

    const tradeHit = getHitTradeLine(y)
    if (tradeHit && x < scale.rightAxisStart) {
      selectionRef.current = { kind: 'trade', tradeId: tradeHit.tradeId, field: tradeHit.field }
      dragRef.current.active = true
      dragRef.current.mode = 'trade-line'
      dragRef.current.tradeId = tradeHit.tradeId
      dragRef.current.tradeField = tradeHit.field
      dragRef.current.draftPrice = tradeHit.price
      draw()
      return
    }

    const drawingHit = getDrawingHit(x, y)
    if (drawingHit) {
      selectionRef.current = { kind: 'drawing', id: drawingHit.id, handle: drawingHit.handle }
      const snap = drawingsRef.current.find(d => d.id === drawingHit.id) || null
      dragRef.current.active = true
      dragRef.current.mode = drawingHit.handle === 'move' || drawingHit.handle === 'line' ? 'move-drawing' : 'resize-drawing'
      dragRef.current.drawingId = drawingHit.id
      dragRef.current.handle = drawingHit.handle
      dragRef.current.snapshot = snap
      dragRef.current.startX = e.clientX
      dragRef.current.startY = e.clientY
      dragRef.current.startIndex = scale.xToIndex(x)
      dragRef.current.startPrice = snapPrice(scale.toPrice(y))
      draw()
      return
    }

    selectionRef.current = null
    dragRef.current.active = true
    dragRef.current.mode = x >= scale.rightAxisStart ? 'scale' : 'pan'
    dragRef.current.startX = e.clientX
    dragRef.current.startY = e.clientY
    dragRef.current.startOff = viewRef.current.offset
    dragRef.current.startPricePan = pricePanRef.current
    dragRef.current.startPriceZoom = priceZoomRef.current
    draw()
  }

  const onUp = async () => {
    if (dragRef.current.active && dragRef.current.mode === 'trade-line' && dragRef.current.tradeId != null && dragRef.current.tradeField && onTradeSLTPChange) {
      const t = openTradesRef.current.find(x => x.id === dragRef.current.tradeId)
      if (t && typeof dragRef.current.draftPrice === 'number') {
        const newSl = dragRef.current.tradeField === 'sl' ? dragRef.current.draftPrice : (t.sl ?? null)
        const newTp = dragRef.current.tradeField === 'tp' ? dragRef.current.draftPrice : (t.tp ?? null)
        await onTradeSLTPChange(dragRef.current.tradeId, newSl, newTp)
      }
    }

    if (dragRef.current.active && dragRef.current.mode === 'draw' && draftDrawingRef.current) {
      const finalId = makeId(draftDrawingRef.current.type)
      drawingsRef.current = [...drawingsRef.current, { ...draftDrawingRef.current, id: finalId } as Drawing]
      selectionRef.current = { kind: 'drawing', id: finalId, handle: 'move' }
      draftDrawingRef.current = null
      setTool('cursor')
    }

    dragRef.current.active = false
    dragRef.current.tradeId = null
    dragRef.current.tradeField = null
    dragRef.current.draftPrice = null
    dragRef.current.drawStartIndex = null
    dragRef.current.drawStartPrice = null
    dragRef.current.drawingId = null
    dragRef.current.handle = null
    dragRef.current.snapshot = null
    dragRef.current.startIndex = null
    dragRef.current.startPrice = null

    draw()
  }

  const onWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -1 : 1
    viewRef.current.cw = Math.max(3, Math.min(40, viewRef.current.cw + delta))
    draw()
  }

  const dec = ohlc ? (typeof priceDecimals === 'number' ? priceDecimals : decimals(ohlc.close)) : (priceDecimals ?? 5)

  const toolBtn = (id: ToolMode, label: string) => (
    <button
      onClick={() => setTool(id)}
      style={{
        padding: '3px 7px',
        fontSize: '9px',
        fontWeight: 700,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        background: tool === id ? '#2255CC' : 'rgba(244,247,253,.95)',
        color: tool === id ? '#fff' : '#5C7A9E',
      }}
    >
      {label}
    </button>
  )

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#fff' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: dragRef.current.active ? 'grabbing' : 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseDown={onDown}
        onMouseUp={onUp}
        onWheel={onWheel}
      />

      <div style={{ position: 'absolute', top: 8, left: 10, display: 'flex', gap: 4, zIndex: 3, alignItems: 'center' }}>
        {toolBtn('cursor', 'Cursor')}
        {toolBtn('hline', 'HLine')}
        {toolBtn('rectangle', 'Rect')}
        {toolBtn('long', 'Long')}
        {toolBtn('short', 'Short')}
        <button
          onClick={() => {
            drawingsRef.current = []
            draftDrawingRef.current = null
            selectionRef.current = null
            draw()
          }}
          style={{
            padding: '3px 7px',
            fontSize: '9px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: 'rgba(244,247,253,.95)',
            color: '#DC2626',
          }}
        >
          Clear
        </button>
      </div>

      {ohlc && (
        <div
          style={{
            position: 'absolute',
            top: 36,
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
          <div>C <span style={{ color: ohlc.close >= ohlc.open ? '#4ADE80' : '#F87171' }}>{ohlc.close.toFixed(dec)}</span></div>
        </div>
      )}

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.9)', gap: 8 }}>
          <div style={{ width: 22, height: 22, border: '2px solid #2255CC', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          <div style={{ fontSize: 11, color: '#8FA3BF' }}>Se incarca {sym}…</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.9)', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#DC2626' }}>⚠ {error}</div>
          <button onClick={load} style={{ padding: '5px 14px', background: '#2255CC', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
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
