import type { VercelRequest, VercelResponse } from '@vercel/node'

const RESEND_API = 'https://api.resend.com/emails'
const SITE = 'https://www.thefundeddiaries.com'

const FROM_ADDRESSES: Record<string, string> = {
  'support':  'TFD Support <support@thefundeddiaries.com>',
  'accounts': 'TFD Accounts <accounts@thefundeddiaries.com>',
  'risk':     'TFD Risk Management <risk@thefundeddiaries.com>',
  'noreply':  'The Funded Diaries <noreply@thefundeddiaries.com>',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const RESEND_KEY = process.env.RESEND_API_KEY ?? ''
  if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })

  try {
    const { type, to, data, from_alias } = req.body
    if (!type || !to) return res.status(400).json({ error: 'Missing type or to' })

    const fn    = data?.first_name ?? 'Trader'
    const fromAddr = FROM_ADDRESSES[from_alias ?? ''] ?? FROM_ADDRESSES['noreply']
    const email = buildEmail(type, to, data ?? {}, fn, fromAddr)
    if (!email) return res.status(400).json({ error: `Unknown email type: ${type}` })

    const r = await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    })
    const result = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: result.message ?? 'Resend error' })
    return res.status(200).json({ ok: true, id: result.id })
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? String(err) })
  }
}

/* ── Design system ────────────────────────────────────────────────── */
const C = {
  bg:       '#F8F9FC',
  card:     '#FFFFFF',
  navy:     '#1A3A6B',
  blue:     '#2255CC',
  gold:     '#C9A84C',
  green:    '#16A34A',
  red:      '#DC2626',
  amber:    '#D97706',
  text:     '#374151',
  muted:    '#6B7280',
  border:   '#E5E7EB',
}

function wrap(content: string, from: string) {
  const senderName = from.match(/^(.+?)\s*</)?.[1] ?? 'The Funded Diaries'
  const senderEmail = from.match(/<(.+?)>/)?.[1] ?? 'support@thefundeddiaries.com'
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Funded Diaries</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="text-align:center;padding-bottom:28px;margin-bottom:4px">
    <div style="display:inline-block;padding:0">
      <div style="font-size:26px;font-weight:800;color:${C.navy};letter-spacing:-0.5px;font-family:Georgia,'Times New Roman',serif">
        The Funded <span style="color:${C.blue};font-style:italic">Diaries</span>
      </div>
      <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:${C.muted};margin-top:4px">
        Proprietary Trading Firm
      </div>
      <div style="height:2px;background:linear-gradient(to right,transparent,${C.blue},transparent);margin-top:10px;opacity:0.3"></div>
    </div>
  </div>

  <!-- Content card -->
  <div style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:36px 32px;margin-bottom:16px">
    ${content}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px;font-size:11px;color:${C.muted};line-height:1.8">
    <div style="margin-bottom:6px">
      Sent by <strong>${senderName}</strong> &lt;${senderEmail}&gt;
    </div>
    <div>
      &copy; ${new Date().getFullYear()} The Funded Diaries &nbsp;&middot;&nbsp;
      <a href="${SITE}" style="color:${C.blue};text-decoration:none">thefundeddiaries.com</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:support@thefundeddiaries.com" style="color:${C.blue};text-decoration:none">support@thefundeddiaries.com</a>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#9CA3AF">
      This is an automated message from The Funded Diaries platform.
    </div>
  </div>
</div>
</body></html>`
}

function badge(text: string, color: string, bg: string) {
  return `<div style="display:inline-block;background:${bg};border:1px solid ${color};color:${color};padding:3px 12px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-radius:20px;margin-bottom:20px">${text}</div>`
}

function h1(text: string, color = C.navy) {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:${color};letter-spacing:-0.3px">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.75;color:${C.text}">${text}</p>`
}

function infoTable(rows: [string, string, string?][]) {
  const cells = rows.map(([l, v, c]) =>
    `<tr>
      <td style="padding:10px 14px;font-size:12px;color:${C.muted};border-bottom:1px solid ${C.border};white-space:nowrap">${l}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:600;color:${c ?? C.navy};font-family:monospace;border-bottom:1px solid ${C.border};text-align:right">${v}</td>
    </tr>`
  ).join('')
  return `<table style="width:100%;border-collapse:collapse;background:#F8F9FC;border:1px solid ${C.border};border-radius:8px;margin:16px 0;overflow:hidden">${cells}</table>`
}

function cta(text: string, url: string, color = C.blue) {
  return `<div style="text-align:center;margin-top:24px">
    <a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:14px 32px;font-weight:700;font-size:13px;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;border-radius:8px">${text} &rarr;</a>
  </div>`
}

function alertBox(text: string, color: string, bg: string) {
  return `<div style="border-left:4px solid ${color};background:${bg};padding:14px 16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:13px;color:${color};line-height:1.6">${text}</div>`
}

function credBox(rows: [string, string][]) {
  const cells = rows.map(([l, v]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(34,85,204,.1)">
      <span style="font-size:11px;color:${C.muted};text-transform:uppercase;letter-spacing:1px">${l}</span>
      <span style="font-size:13px;font-weight:700;color:${C.blue};font-family:monospace">${v}</span>
    </div>`
  ).join('')
  return `<div style="background:#EEF3FF;border:1px solid rgba(34,85,204,.2);border-radius:8px;padding:16px;margin:16px 0">${cells}</div>`
}

/* ── Email templates ──────────────────────────────────────────────── */
function buildEmail(type: string, to: string, d: Record<string, any>, fn: string, from: string) {
  switch (type) {

    case 'welcome': return {
      from, to,
      subject: 'Welcome to The Funded Diaries — Your Journey Starts Here',
      html: wrap(`
        ${badge('Account Created', C.blue, '#EEF3FF')}
        ${h1(`Welcome aboard, ${fn}!`)}
        ${p(`Thank you for joining The Funded Diaries. You're now part of a community of funded traders who trade our capital and keep up to 90% of their profits.`)}
        ${p(`Here's how to get started:`)}
        ${infoTable([
          ['Step 1', 'Browse & purchase a challenge', C.blue],
          ['Step 2', 'Complete identity verification (KYC)', C.muted],
          ['Step 3', 'Pass the evaluation phase', C.muted],
          ['Step 4', 'Get funded & request payouts', C.green],
        ])}
        ${p(`If you have any questions, our support team is available 24/7.`)}
        ${cta('Browse Challenges', `${SITE}/dashboard/challenges`)}
      `, from),
    }

    case 'order_confirmation': return {
      from, to,
      reply_to: 'accounts@thefundeddiaries.com',
      subject: `Order Confirmed #${d.order_number ?? ''} — ${d.product_name ?? 'Challenge'} Activated`,
      html: wrap(`
        ${badge('✓ Payment Confirmed', C.green, 'rgba(22,163,74,.08)')}
        ${h1(`Your Challenge is Live, ${fn}!`)}
        ${p(`Your payment has been processed and your trading account is now active. Below are your account credentials — <strong>please save your password immediately</strong> as it cannot be recovered.`)}
        ${infoTable([
          ['Order Number', `#${d.order_number ?? '—'}`, C.blue],
          ['Product', d.product_name ?? '—'],
          ['Account Size', `$${Number(String(d.account_size ?? '0').replace(/,/g,'')).toLocaleString()}`, C.blue],
          ['Amount Paid', `$${d.amount ?? '—'}`],
          ['Phase', d.phase ?? 'Phase 1', C.blue],
        ])}
        ${alertBox('⚠️ Your password is shown only once. Copy and store it securely before continuing.', C.amber, 'rgba(217,119,6,.06)')}
        ${credBox([
          ['Account Number', d.account_number ?? '—'],
          ['Login ID', d.login ?? '—'],
          ['Password', d.password ?? '—'],
          ['Server', d.server ?? 'TFD-Live-01'],
        ])}
        ${p(`Log in to the platform using these credentials and begin trading. Hit your profit target while respecting the drawdown rules to advance to the funded phase.`)}
        ${cta('Open Trading Platform', `${SITE}/platform`)}
      `, from),
    }

    case 'bogo_account': return {
      from, to,
      reply_to: 'accounts@thefundeddiaries.com',
      subject: `🎁 Your BOGO Bonus Account is Ready — ${d.product_name ?? 'Challenge'}`,
      html: wrap(`
        ${badge('🎁 BOGO Bonus', '#D97706', 'rgba(217,119,6,.08)')}
        ${h1(`Your Free Account is Ready, ${fn}!`)}
        ${p(`Great news — your BOGO bonus has been activated. A second trading account has been created for you as part of your promotion. Your credentials are below.`)}
        ${infoTable([
          ['Account Type', 'BOGO Bonus Account'],
          ['Product', d.product_name ?? '—'],
          ['Account Size', `$${Number(String(d.account_size ?? '0').replace(/,/g,'')).toLocaleString()}`, C.blue],
          ['Phase', d.phase ?? 'Phase 1', C.blue],
          ['Promo Code', d.promo_code ?? '—', '#D97706'],
        ])}
        ${alertBox('⚠️ Your password is shown only once. Copy and store it securely before continuing.', C.amber, 'rgba(217,119,6,.06)')}
        ${credBox([
          ['Account Number', d.account_number ?? '—'],
          ['Login ID', d.login ?? '—'],
          ['Password', d.password ?? '—'],
          ['Server', d.server ?? 'TFD-Live-01'],
        ])}
        ${p(`Log in to the platform using these credentials and start trading. Good luck!`)}
        ${cta('Open Trading Platform', SITE + '/platform')}
      `, from),
    }

    case 'kyc_approved': return {
      from, to,
      subject: 'Identity Verified — Payouts Unlocked',
      html: wrap(`
        ${badge('✓ Verified', C.green, 'rgba(22,163,74,.08)')}
        ${h1(`Identity Confirmed, ${fn}!`)}
        ${p(`Your identity verification has been successfully completed. Your account is now fully verified and all platform features — including payouts — are unlocked.`)}
        ${infoTable([
          ['KYC Status', 'Approved ✓', C.green],
          ['Payouts', 'Unlocked', C.green],
          ['Verified By', 'The Funded Diaries Compliance Team'],
        ])}
        ${p(`You can now request your first payout from your funded account at any time.`)}
        ${cta('Request a Payout', `${SITE}/dashboard/payouts`, C.green)}
      `, from),
    }

    case 'kyc_declined': return {
      from, to,
      subject: 'Identity Verification — Action Required',
      html: wrap(`
        ${badge('Action Required', C.red, 'rgba(220,38,38,.06)')}
        ${h1('Verification Unsuccessful')}
        ${p(`Hi ${fn}, we were unable to verify your identity at this time. Please review the reason below and re-submit with the correct documentation.`)}
        ${d.reason ? alertBox(d.reason, C.red, 'rgba(220,38,38,.05)') : ''}
        ${infoTable([
          ['Accepted Documents', 'Passport, National ID, Driver\'s Licence'],
          ['Requirement', 'Clear, unexpired, government-issued photo ID'],
          ['Liveness Check', 'A live selfie — no printed photos'],
        ])}
        ${p(`If you believe this decision is incorrect, please contact our support team and we will review your case.`)}
        ${cta('Re-submit Verification', `${SITE}/dashboard/kyc`)}
      `, from),
    }

    case 'payout_requested': return {
      from, to,
      subject: `Payout Request Received — ${d.amount ?? ''}`,
      html: wrap(`
        ${badge('Under Review', C.amber, 'rgba(217,119,6,.08)')}
        ${h1(`Payout Request Received, ${fn}`)}
        ${p(`We have received your payout request and it is now pending review by our finance team. You will be notified by email once a decision has been made.`)}
        ${infoTable([
          ['Requested Amount', d.amount ?? '—', C.blue],
          ['Payment Method', d.method ?? '—'],
          ['Account', d.account_number ?? '—'],
          ['Status', 'Pending Review', C.amber],
          ['Processing Time', '1–2 Business Days'],
        ])}
        ${alertBox('Your account has been temporarily suspended during review to protect the integrity of your withdrawal. Trading will resume automatically once the request is processed.', C.amber, 'rgba(217,119,6,.05)')}
        ${cta('View Payout Status', `${SITE}/dashboard/payouts`, C.blue)}
      `, from),
    }

    case 'payout_approved': return {
      from, to,
      subject: `Payout Approved — ${d.amount ?? ''} Being Processed`,
      html: wrap(`
        ${badge('✓ Approved', C.green, 'rgba(22,163,74,.08)')}
        ${h1(`Your Payout is Approved, ${fn}!`)}
        ${p(`Great news — your payout request has been reviewed and approved by our finance team. Your funds are now being processed for transfer.`)}
        ${infoTable([
          ['Approved Amount', d.amount ?? '—', C.green],
          ['Payment Method', d.method ?? '—'],
          ['Account', d.account_number ?? '—'],
          ['Status', 'Processing', C.green],
          ['Expected Delivery', 'Within 24 hours (crypto) / 1–3 days (bank)'],
        ])}
        ${p(`You will receive a confirmation email with your transaction reference once the payment has been sent.`)}
        ${cta('View Dashboard', `${SITE}/dashboard`, C.green)}
      `, from),
    }

    case 'payout_paid': return {
      from, to,
      subject: `Payment Sent — ${d.amount ?? ''} Dispatched`,
      html: wrap(`
        ${badge('✓ Payment Sent', C.green, 'rgba(22,163,74,.08)')}
        ${h1(`${d.amount ?? 'Your payment'} Has Been Sent!`)}
        ${p(`Hi ${fn}, your payout has been successfully dispatched. Please allow some time for the funds to arrive depending on your chosen payment method.`)}
        ${infoTable([
          ['Amount Sent', d.amount ?? '—', C.green],
          ['Method', d.method ?? '—'],
          ...(d.tx_hash ? [['Transaction Hash', d.tx_hash] as [string,string]] : []),
          ...(d.tx_reference ? [['Reference', d.tx_reference] as [string,string]] : []),
          ['Status', 'Completed ✓', C.green],
        ])}
        ${d.tx_hash ? alertBox(`Transaction Hash: <strong style="font-family:monospace;word-break:break-all">${d.tx_hash}</strong>`, C.green, 'rgba(22,163,74,.05)') : ''}
        ${p(`If you do not receive your funds within the expected timeframe, please contact our support team with your transaction reference.`)}
        ${cta('View Payout History', `${SITE}/dashboard/payouts`, C.green)}
      `, from),
    }

    case 'payout_rejected': return {
      from, to,
      subject: 'Payout Request — Unable to Process',
      html: wrap(`
        ${badge('Request Not Processed', C.red, 'rgba(220,38,38,.06)')}
        ${h1('Payout Could Not Be Processed')}
        ${p(`Hi ${fn}, unfortunately we were unable to process your payout request for ${d.amount ?? 'the requested amount'}.`)}
        ${d.reason ? alertBox(`<strong>Reason:</strong> ${d.reason}`, C.red, 'rgba(220,38,38,.05)') : ''}
        ${p(`Your trading account has been reactivated. If you believe this decision is incorrect or need further clarification, please contact our support team immediately.`)}
        ${infoTable([
          ['Account Status', 'Reactivated', C.green],
          ['Trading', 'Resumed', C.green],
        ])}
        ${cta('Contact Support', `${SITE}/dashboard/support`, C.red)}
      `, from),
    }

    case 'account_breached': return {
      from, to,
      subject: `Account Breach Notice — ${d.account_number ?? ''}`,
      html: wrap(`
        ${badge('Account Breached', C.red, 'rgba(220,38,38,.06)')}
        ${h1('Your Account Has Been Breached')}
        ${p(`Hi ${fn}, we regret to inform you that account <strong>${d.account_number ?? ''}</strong> has breached one or more trading rules and has been locked.`)}
        ${alertBox(d.reason ?? 'A drawdown limit has been exceeded, resulting in an automatic account breach.', C.red, 'rgba(220,38,38,.05)')}
        ${infoTable([
          ['Account', d.account_number ?? '—'],
          ['Final Balance', d.balance ?? '—'],
          ['Status', 'Breached — Locked', C.red],
        ])}
        ${p(`You can purchase a new challenge at any time to continue your trading journey. Our team is here to support you.`)}
        ${cta('Buy New Challenge', `${SITE}/dashboard/challenges`, C.blue)}
      `, from),
    }

    case 'phase_advanced': return {
      from, to,
      subject: d.to_phase === 'funded'
        ? `Congratulations — You Are Now Funded! 🎉`
        : `Phase Advanced — ${d.account_number ?? ''}`,
      html: wrap(`
        ${badge(d.to_phase === 'funded' ? '🎉 Funded Trader' : '🎯 Phase Advanced', C.blue, '#EEF3FF')}
        ${h1(d.to_phase === 'funded'
          ? `You're a Funded Trader, ${fn}!`
          : `Phase Advanced, ${fn}!`
        )}
        ${p(d.to_phase === 'funded'
          ? `Outstanding performance! You have successfully completed the evaluation process and have been awarded a fully funded trading account. You can now trade our capital and withdraw profits.`
          : `Congratulations! You have successfully passed Phase ${d.from_phase?.replace('phase','') ?? ''} and have been advanced to ${d.to_phase?.replace('phase','Phase ') ?? d.to_phase}. Your new account credentials are below.`
        )}
        ${infoTable([
          ['Account', d.account_number ?? '—', C.blue],
          ['Previous Phase', d.from_phase ?? '—'],
          ['New Phase', d.to_phase ?? '—', C.blue],
          ...(d.login ? [['Login ID', d.login] as [string,string]] : []),
          ...(d.server ? [['Server', d.server] as [string,string]] : []),
        ])}
        ${d.to_phase === 'funded'
          ? p(`You are now eligible to request payouts. Simply hit your profit targets and submit a payout request from your dashboard.`)
          : p(`Log in with your new credentials and continue trading. Maintain your performance to advance to the final funded phase.`)
        }
        ${cta('View Dashboard', `${SITE}/dashboard`, C.blue)}
      `, from),
    }

    case 'ticket_reply': return {
      from, to,
      reply_to: 'support@thefundeddiaries.com',
      subject: `Re: [Ticket #${d.ticket_number ?? ''}] ${d.subject ?? 'Support Update'}`,
      html: wrap(`
        ${badge('Support Reply', C.blue, '#EEF3FF')}
        ${h1('New Reply on Your Ticket')}
        ${p(`Hi ${fn}, ${d.agent_name ? `<strong>${d.agent_name}</strong> from our support team` : 'our support team'} has responded to your ticket <strong>#${d.ticket_number ?? ''}</strong>.`)}
        <div style="background:#F8F9FC;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:0 8px 8px 0;padding:20px;margin:16px 0;font-size:14px;line-height:1.75;color:${C.text}">
          ${(d.reply_body ?? '').replace(/\n/g, '<br>')}
        </div>
        ${p(`If you have further questions, please reply to this email or visit your support dashboard.`)}
        ${cta('View Ticket', `${SITE}/dashboard/support`, C.blue)}
      `, from),
    }

    case 'custom': return {
      from, to,
      reply_to: from.match(/<(.+?)>/)?.[1] ?? 'support@thefundeddiaries.com',
      subject: d.subject ?? 'Message from The Funded Diaries',
      html: wrap(`
        ${d.first_name ? p(`Hi ${d.first_name},`) : ''}
        <div style="font-size:14px;line-height:1.75;color:${C.text}">
          ${(d.body ?? '').replace(/\n/g, '<br>')}
        </div>
      `, from),
    }

    default: return null
  }
}