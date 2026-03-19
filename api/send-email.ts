// Vercel API Route — proxy pentru Resend
// Nu are probleme CORS pentru că e pe același domeniu (vercel)
import type { VercelRequest, VercelResponse } from '@vercel/node'

const RESEND_API = 'https://api.resend.com/emails'

const SITE = 'https://tfd-app-wqgt.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const RESEND_KEY = process.env.RESEND_API_KEY ?? ''
  if (!RESEND_KEY) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured in Vercel env vars' })
    return
  }

  try {
    const { type, to, data } = req.body
    if (!type || !to) {
      res.status(400).json({ error: 'Missing type or to' })
      return
    }

    const fn = data?.first_name || 'Trader'
    const email = buildEmail(type, to, data ?? {}, fn)

    if (!email) {
      res.status(400).json({ error: `Unknown email type: ${type}` })
      return
    }

    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    })

    const result = await response.json()

    if (!response.ok) {
      res.status(response.status).json({ error: result.message ?? 'Resend error' })
      return
    }

    res.status(200).json({ ok: true, id: result.id })

  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) })
  }
}

function row(label: string, value: string, color = '#fff') {
  return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="color:#888;font-size:12px">${label}</span><span style="color:${color};font-family:monospace;font-weight:600;font-size:12px">${value}</span></div>`
}

function card(rows: string) {
  return `<div style="background:#0A0A0F;border:1px solid rgba(212,168,67,.18);padding:14px;margin:14px 0">${rows}</div>`
}

function wrap(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0F">
<div style="font-family:Arial,sans-serif;background:#0A0A0F;color:#E8E4F0;padding:32px 16px;max-width:560px;margin:0 auto">
  <div style="text-align:center;border-bottom:1px solid rgba(212,168,67,.25);padding-bottom:18px;margin-bottom:24px">
    <div style="font-size:18px;font-weight:800;color:#fff">The Funded <span style="color:#D4A843">Diaries</span></div>
    <div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#D4A843;margin-top:3px;opacity:.7">Write Your Trading Story</div>
  </div>
  ${content}
  <div style="margin-top:28px;padding-top:18px;border-top:1px solid rgba(212,168,67,.1);text-align:center;font-size:10px;color:#444;line-height:1.8">
    &copy; ${new Date().getFullYear()} The Funded Diaries &mdash;
    <a href="${SITE}" style="color:#666;text-decoration:none">thefundeddiaries.com</a> &middot;
    <a href="mailto:support@thefundeddiaries.com" style="color:#666;text-decoration:none">support@thefundeddiaries.com</a>
  </div>
</div>
</body></html>`
}

function buildEmail(type: string, to: string, d: Record<string, any>, fn: string) {
  switch (type) {
    case 'welcome': return {
      from: 'The Funded Diaries <noreply@thefundeddiaries.com>', to,
      subject: 'Welcome to The Funded Diaries 🎯',
      html: wrap(`
        <div style="display:inline-block;background:rgba(212,168,67,.1);border:1px solid rgba(212,168,67,.25);color:#D4A843;padding:3px 10px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px">Account Active</div>
        <h1 style="color:#D4A843;margin:0 0 10px;font-size:22px">Welcome, ${fn}!</h1>
        <p style="color:#B0ACC4;line-height:1.7;margin-bottom:16px">Your account is ready. Trade our capital and keep up to 90% of your profits.</p>
        ${card(row('Step 1','Choose a Challenge','#D4A843') + row('Step 2','Verify Identity (KYC)') + row('Step 3','Start Trading','#00D97E'))}
        <a href="${SITE}/dashboard/challenges" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">Browse Challenges &rarr;</a>
      `),
    }
    case 'order_confirmation': return {
      from: 'The Funded Diaries <noreply@thefundeddiaries.com>', to, reply_to: 'support@thefundeddiaries.com',
      subject: `Order Confirmed — ${d.product_name || 'Challenge'} #${d.order_number || ''}`,
      html: wrap(`
        <div style="display:inline-block;background:rgba(0,217,126,.08);border:1px solid rgba(0,217,126,.2);color:#00D97E;padding:3px 10px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px">✓ Payment Confirmed</div>
        <h1 style="color:#fff;margin:0 0 10px;font-size:22px">Your Challenge is Active!</h1>
        <p style="color:#B0ACC4;line-height:1.7;margin-bottom:4px">Congratulations ${fn}! Your payment was processed and your account is ready.</p>
        ${card(row('Order','#' + (d.order_number||'—'),'#D4A843') + row('Product', d.product_name||'—') + row('Account Size','$'+(d.account_size||'—'),'#D4A843') + row('Amount Paid','$'+(d.amount||'—')))}
        <div style="background:rgba(212,168,67,.08);border:1px solid rgba(212,168,67,.3);padding:10px 14px;font-size:11px;color:#D4A843;font-weight:700;margin:12px 0">⚠ Save credentials now — password shown only once</div>
        ${card(row('Account Number', d.account_number||'—','#D4A843') + row('Login ID', d.login||'—','#D4A843') + row('Password', d.password||'—','#D4A843') + row('Server', d.server||'CFT-Live-01'))}
        <a href="${SITE}/platform" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">Open Trading Platform &rarr;</a>
      `),
    }
    case 'kyc_approved': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: 'Identity Verified ✅ — The Funded Diaries',
      html: wrap(`<h1 style="color:#00D97E;margin:0 0 12px">Identity Verified!</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, your identity verification has been approved. Payouts are now unlocked.</p><a href="${SITE}/dashboard/payouts" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:16px">Request a Payout &rarr;</a>`),
    }
    case 'kyc_declined': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: 'KYC Verification — Action Required',
      html: wrap(`<h1 style="color:#FF3352;margin:0 0 12px">Verification Needs Attention</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, we could not verify your identity. Please re-submit with a valid government-issued photo ID.</p>${d.reason ? `<div style="border-left:3px solid #FF3352;background:rgba(255,51,82,.05);padding:12px;margin:12px 0;color:#FF3352">${d.reason}</div>` : ''}<a href="${SITE}/dashboard/kyc" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:16px">Re-submit Verification &rarr;</a>`),
    }
    case 'payout_requested': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: `Payout Request Received — ${d.amount||''}`,
      html: wrap(`
        <div style="display:inline-block;background:rgba(212,168,67,.1);border:1px solid rgba(212,168,67,.25);color:#D4A843;padding:3px 10px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px">Request Received</div>
        <h1 style="color:#D4A843;margin:0 0 10px;font-size:22px">Payout Request Submitted</h1>
        <p style="color:#B0ACC4;line-height:1.7;margin-bottom:4px">Hi ${fn}, your payout request has been received and is pending admin review. You will be notified once it's processed.</p>
        ${card(row('Amount Requested', d.amount||'—','#D4A843') + row('Method', d.method||'—') + row('Account', d.account_number||'—') + row('Status','Pending Review','#D4A843'))}
        <p style="color:#B0ACC4;font-size:12px;margin-top:4px">Trading on this account is suspended until your request is reviewed. This typically takes 1–2 business days.</p>
      `),
    }
    case 'payout_approved': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: `Payout Approved 💰 — ${d.amount||''}`,
      html: wrap(`<h1 style="color:#D4A843;margin:0 0 12px">Payout Approved!</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, your payout has been approved and is being processed.</p>${card(row('Amount',d.amount||'—','#D4A843')+row('Method',d.method||'—')+row('Account',d.account_number||'—'))}<a href="${SITE}/dashboard/payouts" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">View Status &rarr;</a>`),
    }
    case 'payout_paid': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: `Payout Sent ✅ — ${d.amount||''}`,
      html: wrap(`<h1 style="color:#00D97E;margin:0 0 12px">${d.amount||'Your payout'} Sent!</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, your payout has been sent successfully.</p>${d.tx_hash?`<div style="background:#0A0A0F;border:1px solid rgba(0,217,126,.2);padding:14px;margin:12px 0"><div style="color:#888;font-size:10px;margin-bottom:4px">TX HASH</div><div style="color:#00D97E;font-family:monospace;font-size:11px;word-break:break-all">${d.tx_hash}</div></div>`:''}<a href="${SITE}/dashboard/payouts" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">View History &rarr;</a>`),
    }
    case 'payout_rejected': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: 'Payout Request Update',
      html: wrap(`<h1 style="color:#FF3352;margin:0 0 12px">Payout Not Processed</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, your payout for ${d.amount||''} could not be processed.</p>${d.reason?`<div style="border-left:3px solid #FF3352;background:rgba(255,51,82,.05);padding:12px;margin:12px 0;color:#FF3352">${d.reason}</div>`:''}<a href="${SITE}/dashboard/support" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">Contact Support &rarr;</a>`),
    }
    case 'account_breached': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: `Account Breached 🚨 — ${d.account_number||''}`,
      html: wrap(`<h1 style="color:#FF3352;margin:0 0 12px">Account Breached</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, account <strong style="color:#fff">${d.account_number||''}</strong> has been breached.</p><div style="border-left:3px solid #FF3352;background:rgba(255,51,82,.05);padding:12px;margin:12px 0;color:#FF3352">${d.reason||'Drawdown limit exceeded'}</div><a href="${SITE}/dashboard/challenges" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">Buy New Challenge &rarr;</a>`),
    }
    case 'phase_advanced': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to,
      subject: d.to_phase === 'funded' ? `You're Funded! 🎉` : `Phase Advanced 🎯 — ${d.account_number||''}`,
      html: wrap(`<h1 style="color:#D4A843;margin:0 0 12px">${d.to_phase==='funded'?"You're Funded!":'Phase Advanced!'}</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, account <strong style="color:#fff">${d.account_number||''}</strong> has been ${d.to_phase==='funded'?'fully funded!':'advanced to '+d.to_phase+'.'}</p>${d.login?card(row('Login',d.login,'#D4A843')+row('Server',d.server||'CFT-Live-01')):''}<a href="${SITE}/dashboard" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">View Dashboard &rarr;</a>`),
    }
    case 'ticket_reply': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to, reply_to: 'support@thefundeddiaries.com',
      subject: `Re: [#${d.ticket_number||''}] ${d.subject||'Support Ticket'}`,
      html: wrap(`<h1 style="color:#fff;margin:0 0 12px">New Reply on Your Ticket</h1><p style="color:#B0ACC4;line-height:1.7">Hi ${fn}, ${d.agent_name?`<strong style="color:#fff">${d.agent_name}</strong> from our support team`:'our support team'} has replied.</p><div style="border-left:3px solid #D4A843;background:rgba(212,168,67,.04);padding:14px;font-size:13px;line-height:1.7;color:#B0ACC4;margin:14px 0">${(d.reply_body||'').replace(/\n/g,'<br>')}</div><a href="${SITE}/dashboard/support" style="display:inline-block;background:#D4A843;color:#0A0A0F;padding:12px 24px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;margin-top:8px">View Conversation &rarr;</a>`),
    }
    case 'custom': return {
      from: 'The Funded Diaries <support@thefundeddiaries.com>', to, reply_to: 'support@thefundeddiaries.com',
      subject: d.subject || 'Message from The Funded Diaries',
      html: wrap(`${d.first_name?`<p style="color:#B0ACC4">Hi ${d.first_name},</p>`:''}<div style="font-size:13px;line-height:1.75;color:#B0ACC4;margin-top:10px">${(d.body||'').replace(/\n/g,'<br>')}</div>`),
    }
    default: return null
  }
}
