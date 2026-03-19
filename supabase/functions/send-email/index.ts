// TFD — Universal Email Sender via Resend
// Handles all transactional emails

const RESEND_API = 'https://api.resend.com/emails'
const FROM_SUPPORT = 'The Funded Diaries <support@thefundeddiaries.com>'
const FROM_NO_REPLY = 'The Funded Diaries <noreply@thefundeddiaries.com>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })
  }

  try {
    const { type, to, data } = await req.json()
    const email = buildEmail(type, to, data)
    if (!email) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), { status: 400 })
    }

    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.message ?? 'Resend error')

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})

function buildEmail(type: string, to: string, d: any) {
  switch (type) {
    case 'welcome':             return welcome(to, d)
    case 'order_confirmation':  return orderConfirmation(to, d)
    case 'kyc_approved':        return kycApproved(to, d)
    case 'kyc_declined':        return kycDeclined(to, d)
    case 'payout_approved':     return payoutApproved(to, d)
    case 'payout_paid':         return payoutPaid(to, d)
    case 'payout_rejected':     return payoutRejected(to, d)
    case 'account_breached':    return accountBreached(to, d)
    case 'phase_advanced':      return phaseAdvanced(to, d)
    case 'ticket_reply':        return ticketReply(to, d)
    case 'password_reset':      return passwordReset(to, d)
    default: return null
  }
}

// ─── Base template ────────────────────────────────────────────────────────────
function base(content: string, previewText = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>The Funded Diaries</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#E8E4F0;-webkit-font-smoothing:antialiased}
  .wrap{max-width:600px;margin:0 auto;padding:40px 20px}
  .header{text-align:center;padding:32px 0 28px;border-bottom:1px solid rgba(212,168,67,.2)}
  .logo{font-size:20px;font-weight:800;letter-spacing:-.5px;color:#fff}
  .logo span{color:#D4A843}
  .tagline{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#D4A843;margin-top:4px;opacity:.8}
  .body{background:#111118;border:1px solid rgba(212,168,67,.12);padding:36px;margin:28px 0}
  .h1{font-size:24px;font-weight:700;color:#fff;margin-bottom:8px;line-height:1.2}
  .h2{font-size:16px;font-weight:600;color:#D4A843;margin-bottom:16px;margin-top:24px}
  .p{font-size:13px;line-height:1.7;color:#B8B4C8;margin-bottom:14px}
  .btn{display:inline-block;background:#D4A843;color:#0A0A0F !important;padding:13px 28px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;margin:8px 0 20px}
  .btn-ghost{display:inline-block;border:1px solid rgba(212,168,67,.4);color:#D4A843 !important;padding:11px 24px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;margin:8px 0}
  .card{background:#0A0A0F;border:1px solid rgba(212,168,67,.15);padding:20px;margin:16px 0}
  .card-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px}
  .card-row:last-child{border-bottom:none}
  .card-label{color:#888;font-size:11px}
  .card-value{color:#fff;font-weight:600;font-family:monospace}
  .card-value.gold{color:#D4A843}
  .card-value.green{color:#00D97E}
  .card-value.red{color:#FF3352}
  .divider{height:1px;background:rgba(212,168,67,.12);margin:24px 0}
  .badge{display:inline-block;padding:3px 10px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}
  .badge-gold{background:rgba(212,168,67,.12);color:#D4A843;border:1px solid rgba(212,168,67,.25)}
  .badge-green{background:rgba(0,217,126,.1);color:#00D97E;border:1px solid rgba(0,217,126,.2)}
  .badge-red{background:rgba(255,51,82,.1);color:#FF3352;border:1px solid rgba(255,51,82,.2)}
  .alert{padding:14px 18px;margin:16px 0;border-left:3px solid}
  .alert-gold{border-color:#D4A843;background:rgba(212,168,67,.06)}
  .alert-green{border-color:#00D97E;background:rgba(0,217,126,.05)}
  .alert-red{border-color:#FF3352;background:rgba(255,51,82,.05)}
  .footer{text-align:center;padding:24px 0;font-size:10px;color:#444;line-height:1.8}
  .footer a{color:#666;text-decoration:none}
  @media(max-width:600px){.wrap{padding:20px 12px}.body{padding:24px 18px}}
</style>
</head>
<body>
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#0A0A0F">${previewText}</div>` : ''}
<div class="wrap">
  <div class="header">
    <div class="logo">The Funded <span>Diaries</span></div>
    <div class="tagline">Write Your Trading Story</div>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    © ${new Date().getFullYear()} The Funded Diaries. All rights reserved.<br>
    <a href="https://thefundeddiaries.com">thefundeddiaries.com</a> ·
    <a href="mailto:support@thefundeddiaries.com">support@thefundeddiaries.com</a><br>
    <span style="color:#333;font-size:9px">You're receiving this because you have an account at The Funded Diaries.</span>
  </div>
</div>
</body>
</html>`
}

// ─── Email builders ───────────────────────────────────────────────────────────

function welcome(to: string, d: { first_name: string }) {
  return {
    from: FROM_NO_REPLY, to, reply_to: 'support@thefundeddiaries.com',
    subject: 'Welcome to The Funded Diaries 🎯',
    html: base(`
      <div class="h1">Welcome, ${d.first_name}! 🎯</div>
      <p class="p">Your account is ready. You're one step closer to trading with our capital and keeping up to 90% of profits.</p>
      <div class="card">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:12px">What's Next</div>
        <div class="card-row"><span class="card-label">1. Choose a Challenge</span><span class="card-value gold">Browse Plans →</span></div>
        <div class="card-row"><span class="card-label">2. Verify Your Identity</span><span class="card-value">KYC required for payouts</span></div>
        <div class="card-row"><span class="card-label">3. Start Trading</span><span class="card-value">CFT Trade platform</span></div>
      </div>
      <a href="https://tfd-app.vercel.app/dashboard/challenges" class="btn">Browse Challenge Plans →</a>
      <div class="divider"></div>
      <p class="p" style="font-size:11px">Questions? Reply to this email or visit <a href="https://tfd-app.vercel.app/dashboard/support" style="color:#D4A843">our support centre</a>.</p>
    `, `Welcome to TFD, ${d.first_name}! Your account is ready.`),
  }
}

function orderConfirmation(to: string, d: {
  first_name: string; order_number: string; product_name: string
  account_size: string; account_number: string; login: string
  password: string; server: string; amount: string; phase: string
}) {
  return {
    from: FROM_NO_REPLY, to, reply_to: 'support@thefundeddiaries.com',
    subject: `Order Confirmed — ${d.product_name} Challenge #${d.order_number}`,
    html: base(`
      <div class="badge badge-green" style="margin-bottom:16px">✓ Payment Confirmed</div>
      <div class="h1">Your Challenge is Active</div>
      <p class="p">Congratulations ${d.first_name}! Your payment has been processed and your trading account is ready.</p>

      <div class="h2">Order Details</div>
      <div class="card">
        <div class="card-row"><span class="card-label">Order Number</span><span class="card-value gold">#${d.order_number}</span></div>
        <div class="card-row"><span class="card-label">Product</span><span class="card-value">${d.product_name}</span></div>
        <div class="card-row"><span class="card-label">Account Size</span><span class="card-value gold">$${d.account_size}</span></div>
        <div class="card-row"><span class="card-label">Amount Paid</span><span class="card-value">$${d.amount}</span></div>
        <div class="card-row"><span class="card-label">Phase</span><span class="card-value">${d.phase}</span></div>
      </div>

      <div class="h2">CFT Trade Credentials</div>
      <div class="alert alert-gold">
        <span style="font-size:11px;color:#D4A843;font-weight:700">⚠ Save these credentials now — your password is shown only once.</span>
      </div>
      <div class="card">
        <div class="card-row"><span class="card-label">Account Number</span><span class="card-value gold">${d.account_number}</span></div>
        <div class="card-row"><span class="card-label">Login ID</span><span class="card-value gold">${d.login}</span></div>
        <div class="card-row"><span class="card-label">Password</span><span class="card-value gold">${d.password}</span></div>
        <div class="card-row"><span class="card-label">Server</span><span class="card-value">${d.server}</span></div>
      </div>

      <a href="https://tfd-app.vercel.app/platform" class="btn">Open Trading Platform →</a>
      <a href="https://tfd-app.vercel.app/dashboard" class="btn-ghost">View Dashboard</a>
    `, `Your ${d.product_name} challenge is active — CFT Trade credentials inside.`),
  }
}

function kycApproved(to: string, d: { first_name: string }) {
  return {
    from: FROM_SUPPORT, to,
    subject: '✅ Identity Verified — The Funded Diaries',
    html: base(`
      <div class="badge badge-green" style="margin-bottom:16px">✓ Verified</div>
      <div class="h1">Identity Verified!</div>
      <p class="p">Hi ${d.first_name}, your identity verification has been approved. All platform features are now unlocked.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">KYC Status</span><span class="card-value green">Approved ✓</span></div>
        <div class="card-row"><span class="card-label">Payouts</span><span class="card-value green">Unlocked</span></div>
        <div class="card-row"><span class="card-label">Account Limits</span><span class="card-value green">Full Access</span></div>
      </div>
      <a href="https://tfd-app.vercel.app/dashboard/payouts" class="btn">Request a Payout →</a>
    `, 'Your identity has been verified — payouts unlocked.'),
  }
}

function kycDeclined(to: string, d: { first_name: string; reason?: string }) {
  return {
    from: FROM_SUPPORT, to,
    subject: 'KYC Verification Update — Action Required',
    html: base(`
      <div class="badge badge-red" style="margin-bottom:16px">Action Required</div>
      <div class="h1">Verification Needs Attention</div>
      <p class="p">Hi ${d.first_name}, we were unable to verify your identity with the documents submitted.</p>
      ${d.reason ? `<div class="alert alert-red"><span style="font-size:12px;color:#FF3352">${d.reason}</span></div>` : ''}
      <p class="p">Please re-submit with a valid, unexpired government-issued photo ID (passport, national ID, or driver's licence).</p>
      <a href="https://tfd-app.vercel.app/dashboard/kyc" class="btn">Re-submit Verification →</a>
      <p class="p" style="font-size:11px">Need help? Reply to this email and our team will assist you.</p>
    `, 'Your KYC verification needs attention — please re-submit.'),
  }
}

function payoutApproved(to: string, d: { first_name: string; amount: string; method: string; account_number: string }) {
  return {
    from: FROM_SUPPORT, to,
    subject: `💰 Payout Approved — ${d.amount}`,
    html: base(`
      <div class="badge badge-gold" style="margin-bottom:16px">Approved</div>
      <div class="h1">Payout Approved!</div>
      <p class="p">Hi ${d.first_name}, your payout request has been approved and is being processed.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Amount</span><span class="card-value gold">${d.amount}</span></div>
        <div class="card-row"><span class="card-label">Method</span><span class="card-value">${d.method}</span></div>
        <div class="card-row"><span class="card-label">Account</span><span class="card-value">${d.account_number}</span></div>
        <div class="card-row"><span class="card-label">Status</span><span class="card-value gold">Processing</span></div>
      </div>
      <p class="p">Crypto payouts typically arrive within a few hours. Bank transfers may take 1–3 business days.</p>
      <a href="https://tfd-app.vercel.app/dashboard/payouts" class="btn">View Payout Status →</a>
    `, `Your payout of ${d.amount} has been approved and is being processed.`),
  }
}

function payoutPaid(to: string, d: { first_name: string; amount: string; method: string; tx_hash?: string; tx_reference?: string }) {
  return {
    from: FROM_SUPPORT, to,
    subject: `✅ Payout Sent — ${d.amount}`,
    html: base(`
      <div class="badge badge-green" style="margin-bottom:16px">✓ Paid</div>
      <div class="h1">${d.amount} Sent!</div>
      <p class="p">Hi ${d.first_name}, your payout has been sent successfully.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Amount</span><span class="card-value green">${d.amount}</span></div>
        <div class="card-row"><span class="card-label">Method</span><span class="card-value">${d.method}</span></div>
        ${d.tx_hash ? `<div class="card-row"><span class="card-label">TX Hash</span><span class="card-value" style="font-size:10px;word-break:break-all">${d.tx_hash}</span></div>` : ''}
        ${d.tx_reference ? `<div class="card-row"><span class="card-label">Reference</span><span class="card-value">${d.tx_reference}</span></div>` : ''}
      </div>
      <p class="p">If you haven't received your funds within 24 hours, please contact support.</p>
      <a href="https://tfd-app.vercel.app/dashboard/payouts" class="btn">View Payout History →</a>
    `, `Your payout of ${d.amount} has been sent!`),
  }
}

function payoutRejected(to: string, d: { first_name: string; amount: string; reason?: string }) {
  return {
    from: FROM_SUPPORT, to,
    subject: 'Payout Request Update',
    html: base(`
      <div class="badge badge-red" style="margin-bottom:16px">Not Approved</div>
      <div class="h1">Payout Not Processed</div>
      <p class="p">Hi ${d.first_name}, unfortunately your payout request for ${d.amount} could not be processed at this time.</p>
      ${d.reason ? `<div class="alert alert-red"><span style="font-size:12px;color:#FF3352;font-weight:600">Reason: </span><span style="font-size:12px;color:#B8B4C8">${d.reason}</span></div>` : ''}
      <p class="p">Please review the requirements and submit a new request, or contact our support team for assistance.</p>
      <a href="https://tfd-app.vercel.app/dashboard/support" class="btn">Contact Support →</a>
      <a href="https://tfd-app.vercel.app/dashboard/payouts" class="btn-ghost">View Payouts</a>
    `, `Your payout request for ${d.amount} needs attention.`),
  }
}

function accountBreached(to: string, d: { first_name: string; account_number: string; reason: string; balance: string }) {
  return {
    from: FROM_SUPPORT, to,
    subject: `🚨 Account Breached — ${d.account_number}`,
    html: base(`
      <div class="badge badge-red" style="margin-bottom:16px">🚨 Account Breached</div>
      <div class="h1">Drawdown Limit Exceeded</div>
      <p class="p">Hi ${d.first_name}, your account <strong style="color:#fff">${d.account_number}</strong> has been breached due to drawdown limits being exceeded.</p>
      <div class="alert alert-red">
        <span style="font-size:12px;color:#FF3352;font-weight:600">Reason: </span>
        <span style="font-size:12px;color:#B8B4C8">${d.reason}</span>
      </div>
      <div class="card">
        <div class="card-row"><span class="card-label">Account</span><span class="card-value red">${d.account_number}</span></div>
        <div class="card-row"><span class="card-label">Final Balance</span><span class="card-value">${d.balance}</span></div>
        <div class="card-row"><span class="card-label">Status</span><span class="card-value red">Breached — Locked</span></div>
      </div>
      <p class="p">This account can no longer trade. You may purchase a new challenge at any time.</p>
      <a href="https://tfd-app.vercel.app/dashboard/challenges" class="btn">Buy New Challenge →</a>
      <a href="https://tfd-app.vercel.app/dashboard/support" class="btn-ghost">Contact Support</a>
    `, `Your account ${d.account_number} has been breached.`),
  }
}

function phaseAdvanced(to: string, d: { first_name: string; account_number: string; from_phase: string; to_phase: string; login?: string; server?: string }) {
  const isFunded = d.to_phase === 'funded'
  return {
    from: FROM_SUPPORT, to,
    subject: isFunded ? `🎉 You're Funded! — ${d.account_number}` : `🎯 Phase Advanced — ${d.account_number}`,
    html: base(`
      <div class="badge ${isFunded ? 'badge-green' : 'badge-gold'}" style="margin-bottom:16px">${isFunded ? '🎉 Funded!' : '🎯 Advanced'}</div>
      <div class="h1">${isFunded ? "Congratulations — You're Funded!" : 'Phase Advanced!'}</div>
      <p class="p">Hi ${d.first_name}, ${isFunded
        ? `your account <strong style="color:#fff">${d.account_number}</strong> has passed all evaluation phases. You now have a live funded account!`
        : `you've successfully passed and your account <strong style="color:#fff">${d.account_number}</strong> has been advanced.`
      }</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Account</span><span class="card-value gold">${d.account_number}</span></div>
        <div class="card-row"><span class="card-label">Previous Phase</span><span class="card-value">${d.from_phase}</span></div>
        <div class="card-row"><span class="card-label">New Phase</span><span class="card-value ${isFunded ? 'green' : 'gold'}">${d.to_phase}</span></div>
        ${d.login ? `<div class="card-row"><span class="card-label">Login</span><span class="card-value gold">${d.login}</span></div>` : ''}
        ${d.server ? `<div class="card-row"><span class="card-label">Server</span><span class="card-value">${d.server}</span></div>` : ''}
      </div>
      ${isFunded ? '<p class="p">You can now request payouts from your profits. Keep trading and keep winning!</p>' : '<p class="p">Continue trading to reach the next phase. You\'re on your way!</p>'}
      <a href="https://tfd-app.vercel.app/dashboard" class="btn">${isFunded ? 'View Funded Account →' : 'Continue Trading →'}</a>
    `, isFunded ? `Congratulations — you're now fully funded!` : `Your account has been advanced to ${d.to_phase}.`),
  }
}

function ticketReply(to: string, d: { first_name: string; ticket_number: string; subject: string; reply_body: string; agent_name?: string }) {
  return {
    from: FROM_SUPPORT, to, reply_to: 'support@thefundeddiaries.com',
    subject: `Re: [#${d.ticket_number}] ${d.subject}`,
    html: base(`
      <div class="h1">New Reply on Your Ticket</div>
      <p class="p">Hi ${d.first_name}, ${d.agent_name ? `<strong style="color:#fff">${d.agent_name}</strong> from our support team` : 'our support team'} has replied to your ticket.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Ticket</span><span class="card-value gold">#${d.ticket_number}</span></div>
        <div class="card-row"><span class="card-label">Subject</span><span class="card-value">${d.subject}</span></div>
      </div>
      <div class="h2">Reply</div>
      <div style="background:#0A0A0F;border:1px solid rgba(212,168,67,.15);border-left:3px solid #D4A843;padding:18px 20px;margin:12px 0;font-size:13px;line-height:1.7;color:#B8B4C8">
        ${d.reply_body.replace(/\n/g, '<br>')}
      </div>
      <a href="https://tfd-app.vercel.app/dashboard/support" class="btn">View Full Conversation →</a>
      <p class="p" style="font-size:11px">You can reply directly to this email or visit your dashboard to respond.</p>
    `, `New reply on ticket #${d.ticket_number}: ${d.subject}`),
  }
}

function passwordReset(to: string, d: { first_name: string; reset_link: string }) {
  return {
    from: FROM_NO_REPLY, to,
    subject: 'Reset Your Password — The Funded Diaries',
    html: base(`
      <div class="h1">Password Reset</div>
      <p class="p">Hi ${d.first_name}, we received a request to reset your password.</p>
      <a href="${d.reset_link}" class="btn">Reset Password →</a>
      <p class="p" style="font-size:11px;color:#666">This link expires in 30 minutes. If you didn't request a password reset, ignore this email — your account is safe.</p>
    `, 'Reset your The Funded Diaries password.'),
  }
}
