import type { VercelRequest, VercelResponse } from '@vercel/node'

// Yahoo Finance symbols
const YAHOO_MAP: Record<string,string> = {
  'EUR/USD':'EURUSD=X','GBP/USD':'GBPUSD=X','USD/JPY':'USDJPY=X',
  'USD/CHF':'USDCHF=X','AUD/USD':'AUDUSD=X','USD/CAD':'USDCAD=X',
  'NZD/USD':'NZDUSD=X','GBP/JPY':'GBPJPY=X','EUR/JPY':'EURJPY=X',
  'EUR/GBP':'EURGBP=X','AUD/JPY':'AUDJPY=X','CAD/JPY':'CADJPY=X',
  'XAU/USD':'GC=F','XAG/USD':'SI=F',
  'NAS100':'NQ=F','US500':'ES=F','US30':'YM=F','GER40':'DAX=F','WTI':'CL=F',
}

// tf → {interval, range} that Yahoo Finance actually supports correctly
// Yahoo supported intervals: 1m(7d), 2m(60d), 5m(60d), 15m(60d), 30m(60d),
//   60m/1h(730d), 1d, 1wk, 1mo
const TF_CONFIG: Record<string,{interval:string;range:string}> = {
  '1':   { interval:'1m',  range:'1d'  },
  '5':   { interval:'5m',  range:'5d'  },
  '15':  { interval:'15m', range:'5d'  },
  '30':  { interval:'30m', range:'30d' },
  '60':  { interval:'60m', range:'60d' },
  '240': { interval:'60m', range:'60d' },  // Yahoo has no 4h — use 1h, chart aggregates
  'D':   { interval:'1d',  range:'2y'  },
  'W':   { interval:'1wk', range:'5y'  },
}

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')

  const sym = req.query.sym as string
  const tf  = (req.query.tf as string) || '60'

  if (!sym) return res.status(400).json({ error: 'sym required' })
  const yTicker = YAHOO_MAP[sym]
  if (!yTicker) return res.status(400).json({ error: `unknown: ${sym}` })

  const cfg = TF_CONFIG[tf] ?? TF_CONFIG['60']

  // Try query2 first, then query1 as fallback
  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yTicker)}?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yTicker)}?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`,
  ]

  let data: any = null
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: YAHOO_HEADERS, signal: AbortSignal.timeout(8000) })
      if (!r.ok) continue
      const d = await r.json()
      if (d?.chart?.result?.[0]?.timestamp?.length > 0) { data = d; break }
    } catch {}
  }

  if (!data) return res.status(502).json({ error: 'no data from Yahoo', sym, tf })

  const result    = data.chart.result[0]
  const meta      = result.meta ?? {}
  const timestamps: number[] = result.timestamp ?? []
  const quote     = result.indicators?.quote?.[0] ?? {}
  const opens:  (number|null)[] = quote.open  ?? []
  const highs:  (number|null)[] = quote.high  ?? []
  const lows:   (number|null)[] = quote.low   ?? []
  const closes: (number|null)[] = quote.close ?? []

  // Build valid candles — filter nulls and zero/negative prices
  let candles = timestamps
    .map((t, i) => ({
      time:  t,
      open:  opens[i]  ?? 0,
      high:  highs[i]  ?? 0,
      low:   lows[i]   ?? 0,
      close: closes[i] ?? 0,
    }))
    .filter(c => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
              && c.high >= c.low  // sanity check
              && c.high >= c.open && c.high >= c.close
              && c.low  <= c.open && c.low  <= c.close)

  // Aggregate 1h candles → 4h when tf='240'
  if (tf === '240' && candles.length > 0) {
    const agg: typeof candles = []
    const STEP = 4 * 3600 // 4 hours in seconds
    let bucket: typeof candles[0] | null = null
    let bucketStart = 0

    for (const c of candles) {
      const bs = Math.floor(c.time / STEP) * STEP
      if (!bucket || bs !== bucketStart) {
        if (bucket) agg.push(bucket)
        bucket = { time: bs, open: c.open, high: c.high, low: c.low, close: c.close }
        bucketStart = bs
      } else {
        bucket.high  = Math.max(bucket.high, c.high)
        bucket.low   = Math.min(bucket.low,  c.low)
        bucket.close = c.close
      }
    }
    if (bucket) agg.push(bucket)
    candles = agg
  }

  // Remove duplicate timestamps (Yahoo sometimes sends dupes)
  const seen = new Set<number>()
  candles = candles.filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })

  // Sort ascending
  candles.sort((a, b) => a.time - b.time)

  const latestPrice = meta.regularMarketPrice ?? meta.chartPreviousClose
    ?? (candles.length > 0 ? candles[candles.length-1].close : 0)

  return res.json({
    candles,
    latestPrice: +Number(latestPrice).toFixed(8),
    count: candles.length,
    interval: cfg.interval,
    sym,
    tf,
  })
}