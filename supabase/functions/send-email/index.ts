// TFD — Universal Email Sender via Resend
// Deploy this in Supabase Edge Functions as "send-email"

const RESEND_API = 'https://api.resend.com/emails'
const FROM_SUPPORT  = 'The Funded Diaries <support@thefundeddiaries.com>'
const FROM_NOREPLY  = 'The Funded Diaries <noreply@thefundeddiaries.com>'
const SITE_URL      = 'https://tfd-app.vercel.app'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured in Edge Function secrets' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    const body = await req.json()
    const { type, to, data } = body

    if (!type || !to) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, to' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const email = buildEmail(type, to, data ?? {})
    if (!email) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend error:', JSON.stringify(result))
      return new Response(JSON.stringify({ error: result.message ?? result.name ?? 'Resend API error' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('send-email exception:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})

// ─── Base HTML template ───────────────────────────────────────────
function base(content: string, preview = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Funded Diaries</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#E8E4F0}
.wrap{max-width:580px;margin:0 auto;padding:32px 16px}
.hdr{text-align:center;padding:28px 0;border-bottom:1px solid rgba(212,168,67,.2);margin-bottom:0}
.logo{font-size:19px;font-weight:800;color:#fff}
.logo span{color:#D4A843}
.tag{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#D4A843;margin-top:3px;opacity:.7}
.body{background:#111118;border:1px solid rgba(212,168,67,.12);padding:32px;margin:24px 0}
.h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:10px;line-height:1.25}
.h2{font-size:14px;font-weight:600;color:#D4A843;margin:20px 0 10px}
.p{font-size:13px;line-height:1.7;color:#B0ACC4;margin-bottom:12px}
.btn{display:inline-block;background:#D4A843;color:#0A0A0F !important;padding:12px 26px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;margin:6px 0 18px}
.btn2{display:inline-block;border:1px solid rgba(212,168,67,.4);color:#D4A843 !important;padding:10px 22px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;margin:6px 0}
.card{background:#0A0A0F;border:1px solid rgba(212,168,67,.15);padding:16px;margin:14px 0}
.row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px}
.row:last-child{border:none}
.lbl{color:#888;font-size:11px}
.val{color:#fff;font-weight:600;font-family:monospace;font-size:12px}
.gold{color:#D4A843}
.green{color:#00D97E}
.red{color:#FF3352}
.div{height:1px;background:rgba(212,168,67,.1);margin:20px 0}
.badge{display:inline-block;padding:3px 9px;font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px}
.bg{background:rgba(212,168,67,.08);color:#D4A843;border:1px solid rgba(212,168,67,.2)}
.bg-g{background:rgba(0,217,126,.08);color:#00D97E;border:1px solid rgba(0,217,126,.2)}
.bg-r{background:rgba(255,51,82,.08);color:#FF3352;border:1px solid rgba(255,51,82,.2)}
.alert{padding:12px 16px;margin:12px 0;border-left:3px solid}
.ag{border-color:#D4A843;background:rgba(212,168,67,.05)}
.ar{border-color:#FF3352;background:rgba(255,51,82,.05)}
.ft{text-align:center;font-size:10px;color:#444;line-height:1.8;padding:20px 0}
.ft a{color:#666;text-decoration:none}
</style>
</head>
<body>
${preview ? `<div style="display:none;max-height:0;overflow:hidden;color:#0A0A0F;font-size:1px">${preview}</div>` : ''}
<div class="wrap">
  <div class="hdr">
    <div class="logo">The Funded <span>Diaries</span></div>
    <div class="tag">Write Your Trading Story</div>
  </div>
  <div class="body">${content}</div>
  <div class="ft">
    &copy; ${new Date().getFullYear()} The Funded Diaries &mdash; All rights reserved<br>
    <a href="${SITE_URL}">thefundeddiaries.com</a> &middot; <a href="mailto:support@thefundeddiaries.com">support@thefundeddiaries.com</a>
  </div>
</div>
</body>
</html>`
}

// ─── Email builders ───────────────────────────────────────────────
function buildEmail(type: string, to: string, d: Record<string, string>) {
  const fn = d.first_name || 'Trader'
  switch (type) {

    case 'welcome':
      return {
        from: FROM_NOREPLY, to,
        subject: 'Welcome to The Funded Diaries 🎯',
        html: base(`
          <div class="badge bg">🎯 Account Active</div>
          <div class="h1">Welcome, ${fn}!</div>
          <p class="p">Your account is ready. You're one step closer to trading with our capital and keeping up to 90% of your profits.</p>
          <div class="card">
            <div class="h2">What's Next</div>
            <div class="row"><span class="lbl">1. Choose a Challenge</span><span class="val gold">Browse Plans</span></div>
            <div class="row"><span class="lbl">2. Verify Identity (KYC)</span><span class="val">Required for payouts</span></div>
            <div class="row"><span class="lbl">3. Start Trading</span><span class="val">CFT Trade platform</span></div>
          </div>
          <a href="${SITE_URL}/dashboard/challenges" class="btn">Browse Challenge Plans &rarr;</a>
        `, `Welcome to TFD, ${fn}! Your account is ready.`),
      }

    case 'order_confirmation':
      return {
        from: FROM_NOREPLY, to, reply_to: 'support@thefundeddiaries.com',
        subject: `Order Confirmed — ${d.product_name || 'Challenge'} #${d.order_number || ''}`,
        html: base(`
          <div class="badge bg-g">✓ Payment Confirmed</div>
          <div class="h1">Your Challenge is Active!</div>
          <p class="p">Congratulations ${fn}! Your payment was processed and your trading account is ready.</p>
          <div class="h2">Order Details</div>
          <div class="card">
            <div class="row"><span class="lbl">Order</span><span class="val gold">#${d.order_number || '—'}</span></div>
            <div class="row"><span class="lbl">Product</span><span class="val">${d.product_name || '—'}</span></div>
            <div class="row"><span class="lbl">Account Size</span><span class="val gold">$${d.account_size || '—'}</span></div>
            <div class="row"><span class="lbl">Amount Paid</span><span class="val">$${d.amount || '—'}</span></div>
          </div>
          <div class="h2">CFT Trade Credentials</div>
          <div class="alert ag"><b style="color:#D4A843">⚠ Save now — password shown only once</b></div>
          <div class="card">
            <div class="row"><span class="lbl">Account Number</span><span class="val gold">${d.account_number || '—'}</span></div>
            <div class="row"><span class="lbl">Login ID</span><span class="val gold">${d.login || '—'}</span></div>
            <div class="row"><span class="lbl">Password</span><span class="val gold">${d.password || '—'}</span></div>
            <div class="row"><span class="lbl">Server</span><span class="val">${d.server || 'CFT-Live-01'}</span></div>
          </div>
          <a href="${SITE_URL}/platform" class="btn">Open Trading Platform &rarr;</a>
        `, `Your ${d.product_name || 'challenge'} is active — credentials inside.`),
      }

    case 'kyc_approved':
      return {
        from: FROM_SUPPORT, to,
        subject: '✅ Identity Verified — The Funded Diaries',
        html: base(`
          <div class="badge bg-g">✓ Verified</div>
          <div class="h1">Identity Verified!</div>
          <p class="p">Hi ${fn}, your identity verification has been approved. All platform features are now unlocked.</p>
          <div class="card">
            <div class="row"><span class="lbl">KYC Status</span><span class="val green">Approved ✓</span></div>
            <div class="row"><span class="lbl">Payouts</span><span class="val green">Unlocked</span></div>
          </div>
          <a href="${SITE_URL}/dashboard/payouts" class="btn">Request a Payout &rarr;</a>
        `, 'Your identity has been verified — payouts unlocked.'),
      }

    case 'kyc_declined':
      return {
        from: FROM_SUPPORT, to,
        subject: 'KYC Verification — Action Required',
        html: base(`
          <div class="badge bg-r">Action Required</div>
          <div class="h1">Verification Needs Attention</div>
          <p class="p">Hi ${fn}, we were unable to verify your identity with the documents submitted.</p>
          ${d.reason ? `<div class="alert ar"><span style="color:#FF3352">${d.reason}</span></div>` : ''}
          <p class="p">Please re-submit with a valid, unexpired government-issued photo ID.</p>
          <a href="${SITE_URL}/dashboard/kyc" class="btn">Re-submit Verification &rarr;</a>
        `, 'Your KYC verification needs attention.'),
      }

    case 'payout_approved':
      return {
        from: FROM_SUPPORT, to,
        subject: `💰 Payout Approved — ${d.amount || ''}`,
        html: base(`
          <div class="badge bg">Approved</div>
          <div class="h1">Payout Approved!</div>
          <p class="p">Hi ${fn}, your payout request has been approved and is being processed.</p>
          <div class="card">
            <div class="row"><span class="lbl">Amount</span><span class="val gold">${d.amount || '—'}</span></div>
            <div class="row"><span class="lbl">Method</span><span class="val">${d.method || '—'}</span></div>
            <div class="row"><span class="lbl">Account</span><span class="val">${d.account_number || '—'}</span></div>
            <div class="row"><span class="lbl">Status</span><span class="val gold">Processing</span></div>
          </div>
          <p class="p">Crypto payouts typically arrive within a few hours.</p>
          <a href="${SITE_URL}/dashboard/payouts" class="btn">View Payout Status &rarr;</a>
        `, `Your payout of ${d.amount || ''} has been approved.`),
      }

    case 'payout_paid':
      return {
        from: FROM_SUPPORT, to,
        subject: `✅ Payout Sent — ${d.amount || ''}`,
        html: base(`
          <div class="badge bg-g">✓ Paid</div>
          <div class="h1">${d.amount || 'Your payout'} Sent!</div>
          <p class="p">Hi ${fn}, your payout has been sent successfully.</p>
          <div class="card">
            <div class="row"><span class="lbl">Amount</span><span class="val green">${d.amount || '—'}</span></div>
            <div class="row"><span class="lbl">Method</span><span class="val">${d.method || '—'}</span></div>
            ${d.tx_hash ? `<div class="row"><span class="lbl">TX Hash</span><span class="val" style="font-size:10px;word-break:break-all">${d.tx_hash}</span></div>` : ''}
            ${d.tx_reference ? `<div class="row"><span class="lbl">Reference</span><span class="val">${d.tx_reference}</span></div>` : ''}
          </div>
          <a href="${SITE_URL}/dashboard/payouts" class="btn">View Payout History &rarr;</a>
        `, `Your payout of ${d.amount || ''} has been sent!`),
      }

    case 'payout_rejected':
      return {
        from: FROM_SUPPORT, to,
        subject: 'Payout Request Update',
        html: base(`
          <div class="badge bg-r">Not Approved</div>
          <div class="h1">Payout Not Processed</div>
          <p class="p">Hi ${fn}, your payout request for ${d.amount || ''} could not be processed.</p>
          ${d.reason ? `<div class="alert ar"><b style="color:#FF3352">Reason: </b><span>${d.reason}</span></div>` : ''}
          <a href="${SITE_URL}/dashboard/support" class="btn">Contact Support &rarr;</a>
          <a href="${SITE_URL}/dashboard/payouts" class="btn2">View Payouts</a>
        `, 'Your payout request needs attention.'),
      }

    case 'account_breached':
      return {
        from: FROM_SUPPORT, to,
        subject: `🚨 Account Breached — ${d.account_number || ''}`,
        html: base(`
          <div class="badge bg-r">🚨 Breached</div>
          <div class="h1">Drawdown Limit Exceeded</div>
          <p class="p">Hi ${fn}, account <b style="color:#fff">${d.account_number || ''}</b> has been breached.</p>
          <div class="alert ar"><b style="color:#FF3352">Reason: </b><span>${d.reason || 'Drawdown limit exceeded'}</span></div>
          <div class="card">
            <div class="row"><span class="lbl">Account</span><span class="val red">${d.account_number || '—'}</span></div>
            <div class="row"><span class="lbl">Final Balance</span><span class="val">${d.balance || '—'}</span></div>
            <div class="row"><span class="lbl">Status</span><span class="val red">Locked</span></div>
          </div>
          <a href="${SITE_URL}/dashboard/challenges" class="btn">Buy New Challenge &rarr;</a>
        `, `Account ${d.account_number || ''} has been breached.`),
      }

    case 'phase_advanced': {
      const funded = d.to_phase === 'funded'
      return {
        from: FROM_SUPPORT, to,
        subject: funded ? `🎉 You're Funded! — ${d.account_number || ''}` : `🎯 Phase Advanced — ${d.account_number || ''}`,
        html: base(`
          <div class="badge ${funded ? 'bg-g' : 'bg'}">${funded ? '🎉 Funded!' : '🎯 Advanced'}</div>
          <div class="h1">${funded ? "You're Funded!" : 'Phase Advanced!'}</div>
          <p class="p">Hi ${fn}, ${funded ? `account <b style="color:#fff">${d.account_number}</b> has passed all phases. You now have a live funded account!` : `account <b style="color:#fff">${d.account_number}</b> has been advanced to ${d.to_phase}.`}</p>
          <div class="card">
            <div class="row"><span class="lbl">Account</span><span class="val gold">${d.account_number || '—'}</span></div>
            <div class="row"><span class="lbl">Previous Phase</span><span class="val">${d.from_phase || '—'}</span></div>
            <div class="row"><span class="lbl">New Phase</span><span class="val ${funded ? 'green' : 'gold'}">${d.to_phase || '—'}</span></div>
            ${d.login ? `<div class="row"><span class="lbl">Login</span><span class="val gold">${d.login}</span></div>` : ''}
            ${d.server ? `<div class="row"><span class="lbl">Server</span><span class="val">${d.server}</span></div>` : ''}
          </div>
          <a href="${SITE_URL}/dashboard" class="btn">${funded ? 'View Funded Account' : 'Continue Trading'} &rarr;</a>
        `, funded ? "Congratulations — you're now fully funded!" : `Account advanced to ${d.to_phase}.`),
      }
    }

    case 'ticket_reply':
      return {
        from: FROM_SUPPORT, to, reply_to: 'support@thefundeddiaries.com',
        subject: `Re: [#${d.ticket_number || ''}] ${d.subject || 'Support Ticket'}`,
        html: base(`
          <div class="h1">New Reply on Your Ticket</div>
          <p class="p">Hi ${fn}, ${d.agent_name ? `<b style="color:#fff">${d.agent_name}</b> from our support team` : 'our support team'} has replied to your ticket.</p>
          <div class="card">
            <div class="row"><span class="lbl">Ticket</span><span class="val gold">#${d.ticket_number || '—'}</span></div>
            <div class="row"><span class="lbl">Subject</span><span class="val">${d.subject || '—'}</span></div>
          </div>
          <div class="h2">Reply</div>
          <div style="background:#0A0A0F;border:1px solid rgba(212,168,67,.15);border-left:3px solid #D4A843;padding:16px;font-size:13px;line-height:1.7;color:#B0ACC4;margin:10px 0">
            ${(d.reply_body || '').replace(/\n/g, '<br>')}
          </div>
          <a href="${SITE_URL}/dashboard/support" class="btn">View Full Conversation &rarr;</a>
        `, `New reply on ticket #${d.ticket_number || ''}.`),
      }

    case 'password_reset':
      return {
        from: FROM_NOREPLY, to,
        subject: 'Reset Your Password — The Funded Diaries',
        html: base(`
          <div class="h1">Password Reset</div>
          <p class="p">Hi ${fn}, we received a request to reset your password.</p>
          <a href="${d.reset_link || '#'}" class="btn">Reset Password &rarr;</a>
          <p class="p" style="font-size:11px;color:#666;margin-top:12px">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
        `, 'Reset your The Funded Diaries password.'),
      }

    case 'custom':
      return {
        from: FROM_SUPPORT, to, reply_to: 'support@thefundeddiaries.com',
        subject: d.subject || 'Message from The Funded Diaries',
        html: base(`
          ${d.first_name ? `<p class="p">Hi ${d.first_name},</p>` : ''}
          <div style="font-size:13px;line-height:1.75;color:#B0ACC4">${(d.body || '').replace(/\n/g, '<br>')}</div>
          <div class="div"></div>
          <p class="p" style="font-size:11px">Questions? Reply to this email or <a href="${SITE_URL}/dashboard/support" style="color:#D4A843">open a support ticket</a>.</p>
        `),
      }

    default:
      return null
  }
}
