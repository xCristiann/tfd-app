import { supabase } from '@/lib/supabase'

type EmailType =
  | 'welcome'
  | 'order_confirmation'
  | 'kyc_approved'
  | 'kyc_declined'
  | 'payout_approved'
  | 'payout_paid'
  | 'payout_rejected'
  | 'account_breached'
  | 'phase_advanced'
  | 'ticket_reply'
  | 'password_reset'
  | 'custom'

export async function sendEmail(
  type: EmailType | string,
  to: string,
  data: Record<string, any>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: { type, to, data },
    })
    if (error) {
      const msg = error.message ?? JSON.stringify(error)
      console.error('[sendEmail]', type, 'to', to, '→', msg)
      return { ok: false, error: msg }
    }
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
