import { useEffect, useRef, useState, useCallback } from 'react'

const BRIDGE_URL = import.meta.env.VITE_MT5_BRIDGE_URL as string
const BRIDGE_SECRET = import.meta.env.VITE_BRIDGE_SECRET as string

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface Quote {
  bid: number
  ask: number
}

export interface BridgeSymbol {
  sym: string
  raw: string
  cat: string
  dec: number
}

type CandleCb = (candles: Candle[]) => void

export function useMT5Bridge() {
  const wsRef = useRef<WebSocket | null>(null)
  const deadRef = useRef(false)
  const pendingRef = useRef<Map<string, CandleCb>>(new Map())

  const [prices, setPrices] = useState<Record<string, number>>({})
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [bridgeSymbols, setBridgeSymbols] = useState<BridgeSymbol[]>([])
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting')

  const connect = useCallback(() => {
    if (deadRef.current || !BRIDGE_URL || !BRIDGE_SECRET) return

    setWsStatus('connecting')
    const ws = new WebSocket(BRIDGE_URL)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ secret: BRIDGE_SECRET }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        if (msg.type === 'ok') {
          setWsStatus('connected')
          console.log('[Bridge] conectat')
          return
        }

        if (msg.type === 'symbols') {
          setBridgeSymbols(Array.isArray(msg.data) ? msg.data : [])
          return
        }

        if (msg.type === 'quotes') {
          const nextQuotes = msg.data || {}
          setQuotes(nextQuotes)

          const nextPrices: Record<string, number> = {}
          for (const [sym, q] of Object.entries(nextQuotes)) {
            const qq = q as Quote
            nextPrices[sym] = qq?.bid ?? 0
          }
          setPrices(nextPrices)
          return
        }

        if (msg.type === 'candles') {
          const key = `${msg.sym}_${msg.tf}`
          const cb = pendingRef.current.get(key)
          if (cb) {
            cb(msg.data || [])
            pendingRef.current.delete(key)
          }
        }
      } catch {}
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
      if (!deadRef.current) setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    deadRef.current = false
    connect()
    return () => {
      deadRef.current = true
      wsRef.current?.close()
    }
  }, [connect])

  useEffect(() => {
    const iv = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 15000)
    return () => clearInterval(iv)
  }, [])

  const requestCandles = useCallback((sym: string, tf: string): Promise<Candle[]> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Bridge deconectat'))
        return
      }

      const key = `${sym}_${tf}`
      const timeout = setTimeout(() => {
        pendingRef.current.delete(key)
        reject(new Error('Timeout'))
      }, 15000)

      pendingRef.current.set(key, (candles) => {
        clearTimeout(timeout)
        resolve(candles)
      })

      ws.send(JSON.stringify({ type: 'candles', sym, tf }))
    })
  }, [])

  return { prices, quotes, bridgeSymbols, requestCandles, wsStatus }
}
