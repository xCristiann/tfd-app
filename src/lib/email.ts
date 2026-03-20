type EmailType =
  | 'welcome' | 'order_confirmation' | 'kyc_approved' | 'kyc_declined'
  | 'payout_approved' | 'payout_paid' | 'payout_rejected' | 'account_breached'
  | 'phase_advanced' | 'ticket_reply' | 'password_reset' | 'custom' | string

export async function sendEmail(
  type: EmailType,
  to: string,
  data: Record<string, any>,
  from_alias?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Use Vercel API route — same domain, no CORS issues
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data, from_alias }),
    })

    if (!res.ok) {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text)?.error ?? text } catch {}
      console.error('[sendEmail]', type, res.status, msg)
      return { ok: false, error: msg }
    }

    const result = await res.json()
    if (result?.error) return { ok: false, error: result.error }
    return { ok: true }

  } catch (err: any) {
    const msg = err?.message ?? String(err)
    console.error('[sendEmail] exception:', type, msg)
    return { ok: false, error: msg }
  }
}