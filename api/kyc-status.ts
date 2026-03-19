import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).end(); return }

  const DIDIT_API_KEY = process.env.DIDIT_API_KEY ?? ''
  const { sessionId } = req.query

  if (!sessionId || !DIDIT_API_KEY) {
    res.status(400).json({ error: 'Missing sessionId or API key' }); return
  }

  try {
    const r = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
      headers: { 'x-api-key': DIDIT_API_KEY }
    })

    const data = await r.json()
    console.log('[kyc-status] sessionId:', sessionId, 'response:', JSON.stringify(data))

    if (!r.ok) {
      res.status(r.status).json({ error: data?.detail ?? data?.message ?? 'Didit error', raw: data })
      return
    }

    // Normalize - check every possible field Didit might use
    const rawStatus = (
      data.status ??
      data.decision ??
      data.verification_status ??
      data.kyc_status ??
      data.result ??
      ''
    ).toLowerCase().trim()

    let status = 'pending'
    if (rawStatus.includes('approv'))  status = 'approved'
    else if (rawStatus.includes('declin') || rawStatus.includes('reject') || rawStatus.includes('fail')) status = 'declined'
    else if (rawStatus.includes('review') || rawStatus.includes('progress') || rawStatus.includes('pending')) status = 'pending'
    else if (rawStatus.includes('abandon')) status = 'abandoned'
    else if (rawStatus.includes('expir'))   status = 'expired'

    res.status(200).json({ status, raw: rawStatus, full: data })

  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
