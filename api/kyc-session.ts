import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') { res.status(200).json({ ok: true }); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const DIDIT_API_KEY  = process.env.DIDIT_API_KEY ?? ''
  const DIDIT_WORKFLOW = process.env.DIDIT_WORKFLOW_ID ?? ''
  const APP_URL        = process.env.VITE_APP_URL ?? 'https://www.thefundeddiaries.com'

  if (!DIDIT_API_KEY || !DIDIT_WORKFLOW) {
    res.status(500).json({ error: 'Didit not configured' })
    return
  }

  try {
    const { userId } = req.body
    if (!userId) { res.status(400).json({ error: 'Missing userId' }); return }

    const response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'x-api-key':    DIDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: DIDIT_WORKFLOW,
        callback:    `${APP_URL}/dashboard/kyc`,
        vendor_data: userId,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      res.status(response.status).json({ error: err })
      return
    }

    const session = await response.json()
    console.log('[kyc-session] Didit response:', JSON.stringify(session))
    
    // Didit may use different field names - try all variants
    const session_id = session.session_id ?? session.id ?? session.sessionId ?? ''
    const verification_url = session.verification_url 
      ?? session.url 
      ?? session.redirect_url 
      ?? session.link
      ?? session.session_url
      ?? `https://verification.didit.me/session/${session_id}`
    
    res.status(200).json({ session_id, verification_url, _raw: session })
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) })
  }
}
