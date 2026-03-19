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

export async function sendEmail(type: EmailType, to: string, data: Record<string, any>) {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { type, to, data },
    })
    if (error) console.error('[sendEmail]', type, error)
    return !error
  } catch (err) {
    console.error('[sendEmail] failed', type, err)
    return false
  }
}
