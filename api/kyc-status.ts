import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).end(); return }

  const DIDIT_API_KEY = process.env.DIDIT_API_KEY ?? ''
  const { sessionId }  = req.query

  if (!sessionId || !DIDIT_API_KEY) {
    res.status(400).json({ error: 'Missing params' }); return
  }

  try {
    const r = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
      headers: { 'x-api-key': DIDIT_API_KEY }
    })

    if (!r.ok) { res.status(r.status).json({ error: 'Didit error' }); return }

    const data = await r.json()
    console.log('[kyc-status] Didit decision response:', JSON.stringify(data))

    // Normalize to lowercase for comparison
    const raw = (data.status ?? data.decision ?? data.verification_status ?? '').toLowerCase().trim()

    let status = 'pending'
    if (raw.includes('approv')) status = 'approved'
    else if (raw.includes('declin') || raw.includes('reject') || raw.includes('fail')) status = 'declined'
    else if (raw.includes('review') || raw.includes('progress') || raw.includes('pending')) status = 'pending'
    else if (raw.includes('abandon')) status = 'abandoned'
    else if (raw.includes('expir')) status = 'expired'

    res.status(200).json({ status, raw: data.status ?? data })

  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
