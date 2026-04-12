import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=86400') // cache 24h per IP

  const ip = req.query.ip as string
  if (!ip) return res.status(400).json({ error: 'ip required' })

  try {
    const r = await fetch(`https://ip-api.com/json/${ip}?fields=countryCode,country`, {
      headers: { 'User-Agent': 'TFD-Platform/1.0' },
      signal: AbortSignal.timeout(4000),
    })
    const d = await r.json()
    if (d.countryCode) return res.json({ code: d.countryCode, name: d.country })
    return res.json({ code: '', name: '' })
  } catch {
    try {
      const r2 = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(4000) })
      const d2 = await r2.json()
      return res.json({ code: d2.country_code || '', name: d2.country || '' })
    } catch {
      return res.json({ code: '', name: '' })
    }
  }
}
