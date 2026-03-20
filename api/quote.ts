import type { VercelRequest, VercelResponse } from '@vercel/node'

// Fast single-symbol price via TradingView scanner API
// Called by frontend every 500ms for the currently viewed symbol
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const { sym } = req.query
  if (!sym || typeof sym !== 'string') {
    return res.status(400).json({ error: 'sym required' })
  }

  // Map our symbol to TradingView scanner format
  const TV_MAP: Record<string,{market:string; ticker:string}> = {
    'EUR/USD': { market:'forex', ticker:'OANDA:EURUSD' },
    'GBP/USD': { market:'forex', ticker:'OANDA:GBPUSD' },
    'USD/JPY': { market:'forex', ticker:'OANDA:USDJPY' },
    'USD/CHF': { market:'forex', ticker:'OANDA:USDCHF' },
    'AUD/USD': { market:'forex', ticker:'OANDA:AUDUSD' },
    'USD/CAD': { market:'forex', ticker:'OANDA:USDCAD' },
    'NZD/USD': { market:'forex', ticker:'OANDA:NZDUSD' },
    'GBP/JPY': { market:'forex', ticker:'OANDA:GBPJPY' },
    'EUR/JPY': { market:'forex', ticker:'OANDA:EURJPY' },
    'EUR/GBP': { market:'forex', ticker:'OANDA:EURGBP' },
    'AUD/JPY': { market:'forex', ticker:'OANDA:AUDJPY' },
    'CAD/JPY': { market:'forex', ticker:'OANDA:CADJPY' },
    'XAU/USD': { market:'forex', ticker:'OANDA:XAUUSD' },
    'XAG/USD': { market:'forex', ticker:'OANDA:XAGUSD' },
    'NAS100':  { market:'america', ticker:'NASDAQ:NDX' },
    'US500':   { market:'america', ticker:'SP:SPX' },
    'US30':    { market:'america', ticker:'DJ:DJI' },
    'GER40':   { market:'germany', ticker:'XETR:DAX' },
    'WTI':     { market:'america', ticker:'NYMEX:CL1!' },
  }

  const entry = TV_MAP[sym as string]
  if (!entry) return res.status(400).json({ error: 'unknown symbol' })

  try {
    // TradingView scanner — free, no auth, real-time
    const body = JSON.stringify({
      symbols: { tickers: [entry.ticker], query: { types: [] } },
      columns: ['close','bid','ask','last_price','price','Recommend.All'],
    })

    const r = await fetch(`https://scanner.tradingview.com/${entry.market}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
      },
      body,
      signal: AbortSignal.timeout(3000),
    })

    if (!r.ok) throw new Error(`Scanner ${r.status}`)
    const d = await r.json()
    const row = d?.data?.[0]?.d
    if (!row) throw new Error('No data')

    // row = [close, bid, ask, last_price, price, recommend]
    const price = row[3] ?? row[4] ?? row[0] ?? 0
    if (price <= 0) throw new Error('Invalid price')

    return res.json({ price: +Number(price).toFixed(8), sym })
  } catch (e: any) {
    return res.status(502).json({ error: e.message })
  }
}
