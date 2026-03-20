import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const result: Record<string, number> = {}

  // Fetch from multiple sources in parallel
  await Promise.allSettled([

    // 1. Forex + Metals via exchangerate.host (free, no key, real-time)
    fetch('https://api.exchangerate.host/live?access_key=free&source=USD&currencies=EUR,GBP,JPY,CHF,AUD,CAD,NZD,XAU,XAG')
      .then(r => r.json())
      .then(d => {
        if (!d?.quotes) return
        const q = d.quotes
        const safe = (v: number) => v && isFinite(v) && v > 0 ? v : 0
        if (safe(q.USDEUR)) result['EUR/USD'] = +((1/q.USDEUR)).toFixed(5)
        if (safe(q.USDGBP)) result['GBP/USD'] = +((1/q.USDGBP)).toFixed(5)
        if (safe(q.USDJPY)) result['USD/JPY'] = +(q.USDJPY).toFixed(3)
        if (safe(q.USDCHF)) result['USD/CHF'] = +(q.USDCHF).toFixed(5)
        if (safe(q.USDAUD)) result['AUD/USD'] = +((1/q.USDAUD)).toFixed(5)
        if (safe(q.USDCAD)) result['USD/CAD'] = +(q.USDCAD).toFixed(5)
        if (safe(q.USDNZD)) result['NZD/USD'] = +((1/q.USDNZD)).toFixed(5)
        if (safe(q.USDJPY) && safe(q.USDGBP)) result['GBP/JPY'] = +((q.USDJPY/q.USDGBP)).toFixed(3)
        if (safe(q.USDJPY) && safe(q.USDEUR)) result['EUR/JPY'] = +((q.USDJPY/q.USDEUR)).toFixed(3)
        if (safe(q.USDGBP) && safe(q.USDEUR)) result['EUR/GBP'] = +((q.USDGBP/q.USDEUR)).toFixed(5)
        if (safe(q.USDJPY) && safe(q.USDAUD)) result['AUD/JPY'] = +((q.USDJPY/q.USDAUD)).toFixed(3)
        if (safe(q.USDJPY) && safe(q.USDCAD)) result['CAD/JPY'] = +((q.USDJPY/q.USDCAD)).toFixed(3)
        if (safe(q.USDXAU)) result['XAU/USD'] = +((1/q.USDXAU)).toFixed(2)
        if (safe(q.USDXAG)) result['XAG/USD'] = +((1/q.USDXAG)).toFixed(4)
      }).catch(() => {}),

    // 2. Indices via Yahoo Finance (real-time, free)
    fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=NQ%3DF%2CES%3DF%2CYM%3DF%2CDAX%3DF%2CCL%3DF', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {
          'NQ=F': 'NAS100', 'ES=F': 'US500', 'YM=F': 'US30',
          'DAX=F': 'GER40', 'CL=F': 'WTI'
        }
        for (const q of d?.quoteResponse?.result ?? []) {
          const sym = map[q.symbol]
          if (sym && q.regularMarketPrice > 0) result[sym] = q.regularMarketPrice
        }
      }).catch(() => {}),

    // 3. Gold/Silver via Yahoo as backup
    fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=GC%3DF%2CSI%3DF', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
      .then(r => r.json())
      .then(d => {
        for (const q of d?.quoteResponse?.result ?? []) {
          if (q.symbol === 'GC=F' && q.regularMarketPrice > 0) result['XAU/USD'] = q.regularMarketPrice
          if (q.symbol === 'SI=F' && q.regularMarketPrice > 0) result['XAG/USD'] = q.regularMarketPrice
        }
      }).catch(() => {})

  ])

  res.json({ ok: true, prices: result, t: Date.now(), count: Object.keys(result).length })
}
