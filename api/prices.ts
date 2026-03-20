import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const result: Record<string, number> = {}

  await Promise.allSettled([

    // FOREX — Frankfurter API (ECB data, free, no key, real-time daily)
    fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,AUD,CAD,NZD')
      .then(r => r.json())
      .then(d => {
        const q = d?.rates || {}
        if (q.EUR) result['EUR/USD'] = +((1/q.EUR)).toFixed(5)
        if (q.GBP) result['GBP/USD'] = +((1/q.GBP)).toFixed(5)
        if (q.JPY) result['USD/JPY'] = +(q.JPY).toFixed(3)
        if (q.CHF) result['USD/CHF'] = +(q.CHF).toFixed(5)
        if (q.AUD) result['AUD/USD'] = +((1/q.AUD)).toFixed(5)
        if (q.CAD) result['USD/CAD'] = +(q.CAD).toFixed(5)
        if (q.NZD) result['NZD/USD'] = +((1/q.NZD)).toFixed(5)
        if (q.JPY && q.GBP) result['GBP/JPY'] = +((q.JPY/q.GBP)).toFixed(3)
        if (q.JPY && q.EUR) result['EUR/JPY'] = +((q.JPY/q.EUR)).toFixed(3)
        if (q.GBP && q.EUR) result['EUR/GBP'] = +((q.GBP/q.EUR)).toFixed(5)
        if (q.JPY && q.AUD) result['AUD/JPY'] = +((q.JPY/q.AUD)).toFixed(3)
        if (q.JPY && q.CAD) result['CAD/JPY'] = +((q.JPY/q.CAD)).toFixed(3)
      }).catch(() => {}),

    // METALS + INDICES + OIL — Yahoo Finance futures (real-time)
    fetch(
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=GC%3DF%2CSI%3DF%2CNQ%3DF%2CES%3DF%2CYM%3DF%2CDAX%3DF%2CCL%3DF',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {
          'GC=F': 'XAU/USD',
          'SI=F': 'XAG/USD',
          'NQ=F': 'NAS100',
          'ES=F': 'US500',
          'YM=F': 'US30',
          'DAX=F': 'GER40',
          'CL=F': 'WTI',
        }
        for (const q of d?.quoteResponse?.result ?? []) {
          const sym = map[q.symbol]
          if (sym && q.regularMarketPrice > 0) result[sym] = q.regularMarketPrice
        }
      }).catch(() => {})

  ])

  res.json({ ok: true, prices: result, count: Object.keys(result).length })
}
