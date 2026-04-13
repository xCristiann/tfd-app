import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')

  const { ip } = req.query
  if (!ip || typeof ip !== 'string') return res.json({ code: '', name: '' })

  // ipapi.co — HTTPS, free, no key needed, 1000 req/day
  try {
    const r = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'TFD-RiskMonitor/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    const d = await r.json()
    if (d.country_code && !d.error) {
      return res.json({ code: d.country_code, name: d.country_name || d.country_code })
    }
  } catch {}

  // ipwho.is — HTTPS, free, no key needed
  try {
    const r = await fetch(`https://ipwho.is/${ip}`, {
      headers: { 'User-Agent': 'TFD-RiskMonitor/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    const d = await r.json()
    if (d.success && d.country_code) {
      return res.json({ code: d.country_code, name: d.country || d.country_code })
    }
  } catch {}

  // ip-api.com — HTTPS on paid, but JSON endpoint works
  try {
    const r = await fetch(`https://ip-api.com/json/${ip}?fields=status,countryCode,country`, {
      signal: AbortSignal.timeout(5000),
    })
    const d = await r.json()
    if (d.status === 'success') {
      return res.json({ code: d.countryCode, name: d.country })
    }
  } catch {}

  return res.json({ code: '', name: '' })
}
