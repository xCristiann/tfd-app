import { supabase } from '@/lib/supabase'

// Supabase project config - needed for direct fetch
const SUPABASE_URL     = (import.meta as any).env?.VITE_SUPABASE_URL     ?? ''
const SUPABASE_ANON    = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? ''

type EmailType =
  | 'welcome' | 'order_confirmation' | 'kyc_approved' | 'kyc_declined'
  | 'payout_approved' | 'payout_paid' | 'payout_rejected' | 'account_breached'
  | 'phase_advanced' | 'ticket_reply' | 'password_reset' | 'custom' | string

export async function sendEmail(
  type: EmailType,
  to: string,
  data: Record<string, any>
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Use direct fetch instead of supabase.functions.invoke to avoid CORS issues
    const url = `${SUPABASE_URL}/functions/v1/send-email`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ type, to, data }),
    })

    if (!res.ok) {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text)?.error ?? text } catch {}
      console.error('[sendEmail]', type, res.status, msg)
      return { ok: false, error: msg }
    }

    const result = await res.json()
    if (result?.error) {
      console.error('[sendEmail] function error:', result.error)
      return { ok: false, error: result.error }
    }

    return { ok: true }
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    console.error('[sendEmail] exception:', type, msg)
    return { ok: false, error: msg }
  }
}
