import type { VercelRequest, VercelResponse } from '@vercel/node'

// Yahoo Finance interval mapping
const INTERVALS: Record<string, string> = {
  '1':'1m', '5':'5m', '15':'15m', '30':'30m',
  '60':'1h', '240':'4h', 'D':'1d', 'W':'1wk',
}
const RANGES: Record<string, string> = {
  '1':'1d', '5':'5d', '15':'1mo', '30':'3mo',
  '60':'6mo', '240':'1y', 'D':'5y', 'W':'5y',
}

// Our symbol → Yahoo Finance symbol
const YAHOO_MAP: Record<string,string> = {
  'EUR/USD':'EURUSD=X','GBP/USD':'GBPUSD=X','USD/JPY':'USDJPY=X',
  'USD/CHF':'USDCHF=X','AUD/USD':'AUDUSD=X','USD/CAD':'USDCAD=X',
  'NZD/USD':'NZDUSD=X','GBP/JPY':'GBPJPY=X','EUR/JPY':'EURJPY=X',
  'EUR/GBP':'EURGBP=X','AUD/JPY':'AUDJPY=X','CAD/JPY':'CADJPY=X',
  'XAU/USD':'GC=F','XAG/USD':'SI=F',
  'NAS100':'NQ=F','US500':'ES=F','US30':'YM=F','GER40':'DAX=F','WTI':'CL=F',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  const { sym, tf = '60' } = req.query
  if (!sym || typeof sym !== 'string') return res.status(400).json({ error: 'sym required' })

  const yTicker = YAHOO_MAP[sym]
  if (!yTicker) return res.status(400).json({ error: 'unknown symbol' })

  const interval = INTERVALS[tf as string] ?? '1h'
  const range    = RANGES[tf as string]    ?? '6mo'

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yTicker)}?interval=${interval}&range=${range}`
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://finance.yahoo.com',
        'Referer': 'https://finance.yahoo.com/',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`Yahoo ${r.status}`)
    const d = await r.json()
    const result = d?.chart?.result?.[0]
    if (!result) throw new Error('No data')

    const timestamps: number[] = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0] ?? {}
    const opens:   (number|null)[] = quote.open   ?? []
    const highs:   (number|null)[] = quote.high   ?? []
    const lows:    (number|null)[] = quote.low    ?? []
    const closes:  (number|null)[] = quote.close  ?? []

    const candles = timestamps
      .map((t, i) => ({
        time: t,
        open:  opens[i]  ?? null,
        high:  highs[i]  ?? null,
        low:   lows[i]   ?? null,
        close: closes[i] ?? null,
      }))
      .filter(c => c.open && c.high && c.low && c.close && c.open > 0)

    // Also return latest price from meta
    const meta = result.meta ?? {}
    const latestPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0

    return res.json({ candles, latestPrice, count: candles.length })
  } catch (e: any) {
    return res.status(502).json({ error: e.message })
  }
}
