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

    // Map Didit status to our status
    const map: Record<string, string> = {
      'Approved':    'approved',
      'Declined':    'declined',
      'In Review':   'pending',
      'In Progress': 'pending',
      'Abandoned':   'abandoned',
      'Expired':     'expired',
    }

    const status = map[data.status] ?? 'pending'
    res.status(200).json({ status, raw: data.status })

  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
