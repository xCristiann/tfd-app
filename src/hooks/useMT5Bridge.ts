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

type CandleCb = (candles: Candle[]) => void

export function useMT5Bridge() {
  const wsRef = useRef<WebSocket | null>(null)
  const deadRef = useRef(false)
  const pendingRef = useRef<Map<string, CandleCb>>(new Map())

  const [prices, setPrices] = useState<Record<string, number>>({})
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting')

  const waitForOpen = useCallback((timeoutMs = 10000) => {
    return new Promise<WebSocket>((resolve, reject) => {
      const started = Date.now()

      const check = () => {
        const ws = wsRef.current

        if (ws && ws.readyState === WebSocket.OPEN) {
          resolve(ws)
          return
        }

        if (Date.now() - started >= timeoutMs) {
          reject(new Error('Bridge deconectat'))
          return
        }

        setTimeout(check, 150)
      }

      check()
    })
  }, [])

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
          console.log('[Bridge] conectat la MT5')
          return
        }

        if (msg.type === 'prices') {
          setPrices(msg.data || {})
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
      if (!deadRef.current) {
        setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
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

  const requestCandles = useCallback(async (sym: string, tf: string): Promise<Candle[]> => {
    const ws = await waitForOpen(10000)

    return new Promise((resolve, reject) => {
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
  }, [waitForOpen])

  return { prices, requestCandles, wsStatus }
}
