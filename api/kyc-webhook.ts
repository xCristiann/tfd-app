import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const WEBHOOK_SECRET   = process.env.DIDIT_WEBHOOK_SECRET ?? ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return }

  // Verify Didit signature
  const signature = req.headers['x-signature-v2'] as string
  const timestamp  = req.headers['x-timestamp'] as string

  if (WEBHOOK_SECRET && signature && timestamp) {
    const body = JSON.stringify(req.body)
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      res.status(401).json({ error: 'Invalid signature' }); return
    }
  }

  const { session_id, status, vendor_data: userId } = req.body

  // Map Didit status to our status
  const statusMap: Record<string, string> = {
    'Approved':   'approved',
    'Declined':   'declined',
    'In Review':  'pending',
    'In Progress':'pending',
    'Abandoned':  'abandoned',
    'Expired':    'expired',
  }
  const kycStatus = statusMap[status] ?? 'pending'

  try {
    // Update kyc_verifications
    await fetch(`${SUPABASE_URL}/rest/v1/kyc_verifications?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey':        SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ status: kycStatus, updated_at: new Date().toISOString() }),
    })

    // Update users.kyc_status
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey':        SUPABASE_SERVICE,
        'Authorization': `Bearer ${SUPABASE_SERVICE}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ kyc_status: kycStatus }),
    })

    res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('[kyc-webhook]', err)
    res.status(500).json({ error: err.message })
  }
}
