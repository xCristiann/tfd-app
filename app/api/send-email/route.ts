import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thefundeddiaries.com'

const ALLOWED_SENDERS = [
  { label: 'hello@ — Main', value: 'hello@thefundeddiaries.com' },
  { label: 'cristian@ — Personal', value: 'cristian@thefundeddiaries.com' },
  { label: 'support@ — Support', value: 'support@thefundeddiaries.com' },
  { label: 'partners@ — Partnerships', value: 'partners@thefundeddiaries.com' },
  { label: 'noreply@ — No Reply', value: 'noreply@thefundeddiaries.com' },
]

function buildHtml(data: { heading: string; body: string; cta_text?: string; cta_url?: string; name?: string }): string {
  const greeting = data.name ? `Hi ${data.name},` : 'Hi there,'
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090f;font-family:Inter,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07090f;padding:40px 16px;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 32px;text-align:center;">
  <img src="${SITE_URL}/logo.png" alt="TheFundedDiaries" width="80" height="80" style="display:inline-block;border-radius:16px;margin-bottom:12px;"/>
  <div style="font-size:22px;font-weight:800;color:#eef0f6;font-family:Inter,Helvetica,sans-serif;letter-spacing:-0.5px;">
    TheFunded<span style="color:#00e5a0;">Diaries</span>
  </div>
  <div style="font-size:10px;color:#4e5568;letter-spacing:3px;margin-top:4px;">INDEPENDENT PROP FIRM COMPARISON</div>
</td></tr>
<tr><td style="background:#0c0f1a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
  <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#eef0f6;letter-spacing:-0.02em;line-height:1.2;">${data.heading}</h1>
  <div style="height:2px;background:linear-gradient(90deg,#00e5a0,#7c3aed);border-radius:2px;margin:20px 0;"></div>
  <p style="margin:0 0 16px;font-size:15px;color:#8b92a8;line-height:1.6;">${greeting}</p>
  <div style="font-size:15px;color:#8b92a8;line-height:1.7;margin:0 0 28px;">${data.body.replace(/\n/g, '<br>')}</div>
  ${data.cta_text && data.cta_url ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td style="background:#00e5a0;border-radius:10px;padding:13px 28px;"><a href="${data.cta_url}" style="color:#04120c;font-size:14px;font-weight:800;text-decoration:none;">${data.cta_text} &rarr;</a></td></tr></table>` : ''}
  <div style="height:1px;background:rgba(255,255,255,0.07);margin:28px 0;"></div>
  <table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="vertical-align:middle;padding-right:10px;"><img src="${SITE_URL}/logo.png" alt="TFD" width="24" height="24" style="display:block;border-radius:5px;opacity:0.7;"/></td>
    <td style="vertical-align:middle;font-size:12px;color:#4e5568;">&copy; 2026 TheFundedDiaries &middot; Independent prop firm comparison &middot; Not financial advice</td>
  </tr></table>
</td></tr>
</table></td></tr>
</table>
</body></html>`
}

export async function GET() {
  return NextResponse.json({ senders: ALLOWED_SENDERS })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const { subject, heading, emailBody, cta_text, cta_url, recipients, from_email } = body
    if (!subject || !heading || !emailBody) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const fromAddr = ALLOWED_SENDERS.find(s => s.value === from_email)?.value || ALLOWED_SENDERS[0].value
    let emails: { email: string; name: string }[] = []
    if (recipients === 'all') {
      const { data } = await admin.from('profiles').select('email, full_name').not('email', 'is', null)
      emails = (data || []).filter(p => p.email).map(p => ({ email: p.email!, name: p.full_name || '' }))
    } else if (Array.isArray(recipients)) {
      emails = recipients
    }
    if (!emails.length) return NextResponse.json({ error: 'No recipients' }, { status: 400 })
    let sent = 0, failed = 0
    for (const { email, name } of emails) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `TheFundedDiaries <${fromAddr}>`, to: [email], subject, html: buildHtml({ heading, body: emailBody, cta_text, cta_url, name }) }),
      })
      if (res.ok) sent++; else failed++
      await new Promise(r => setTimeout(r, 60))
    }
    await admin.from('email_logs').insert({ subject, template: 'custom', recipients_count: sent, sent_by: user.id, status: failed > 0 ? 'partial' : 'sent' })
    return NextResponse.json({ success: true, sent, failed, total: emails.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}