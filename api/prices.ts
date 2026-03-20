import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=4, stale-while-revalidate=8')

  const result: Record<string, number> = {}

  await Promise.allSettled([

    // ── FOREX — Frankfurter (ECB, free, reliable from server) ──────
    fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,AUD,CAD,NZD', {
      headers: { 'User-Agent': 'TFD-Platform/1.0' },
      signal: AbortSignal.timeout(5000),
    })
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

    // ── GOLD — gold-api.com (free, no key needed) ───────────────────
    fetch('https://api.gold-api.com/price/XAU', {
      headers: { 'User-Agent': 'TFD-Platform/1.0' },
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.json())
      .then(d => { if (d?.price > 0) result['XAU/USD'] = +Number(d.price).toFixed(2) })
      .catch(() => {}),

    // ── SILVER — gold-api.com ───────────────────────────────────────
    fetch('https://api.gold-api.com/price/XAG', {
      headers: { 'User-Agent': 'TFD-Platform/1.0' },
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.json())
      .then(d => { if (d?.price > 0) result['XAG/USD'] = +Number(d.price).toFixed(3) })
      .catch(() => {}),

    // ── INDICES + OIL — Yahoo Finance v8 chart (server-side, works from Node) ──
    ...((['NQ=F','ES=F','YM=F','DAX=F','CL=F']) as string[]).map(ticker =>
      fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com/',
        },
        signal: AbortSignal.timeout(7000),
      })
        .then(r => r.json())
        .then(d => {
          const MAP: Record<string,string> = {
            'NQ=F':'NAS100','ES=F':'US500','YM=F':'US30','DAX=F':'GER40','CL=F':'WTI'
          }
          const sym = MAP[ticker]; if (!sym) return
          const meta = d?.chart?.result?.[0]?.meta ?? {}
          const price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0
          if (price > 0) { result[sym] = +Number(price).toFixed(2); return }
          // fallback: last close in 1m series
          const closes: (number|null)[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
          for (let i = closes.length-1; i >= 0; i--) {
            if (closes[i] != null && (closes[i] as number) > 0) {
              result[sym] = +Number(closes[i]).toFixed(2); return
            }
          }
        }).catch(() => {})
    ),

  ])

  // ── Backup for metals if gold-api failed ───────────────────────────
  if (!result['XAU/USD'] || !result['XAG/USD']) {
    try {
      const r = await fetch('https://api.metals.live/v1/spot', {
        headers: { 'User-Agent': 'TFD-Platform/1.0' },
        signal: AbortSignal.timeout(4000),
      })
      const d = await r.json()
      // metals.live: [{"gold":3058.5,"silver":34.2,...}]
      const spot = Array.isArray(d) ? d[0] : d
      if (!result['XAU/USD'] && spot?.gold   > 0) result['XAU/USD'] = +Number(spot.gold).toFixed(2)
      if (!result['XAG/USD'] && spot?.silver > 0) result['XAG/USD'] = +Number(spot.silver).toFixed(3)
    } catch {}
  }

  res.json({ ok: true, prices: result, count: Object.keys(result).length, ts: Date.now() })
}