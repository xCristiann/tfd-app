import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Cache 2s — fast refresh
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=2')

  const result: Record<string, number> = {}

  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,AUD,CAD,NZD', {
      headers: { 'User-Agent': 'TFD-Platform/1.0' },
      signal: AbortSignal.timeout(3000),
    })
    const d = await r.json()
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
  } catch {}

  res.json({ prices: result })
}
