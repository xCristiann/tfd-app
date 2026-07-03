'use client'
import { useState, useEffect } from 'react'

const TEMPLATES = [
  {
    id: 'affiliate_outreach',
    name: '🤝 Affiliate Outreach',
    subject: 'Partnership Opportunity — TheFundedDiaries.com',
    heading: 'Partnership & Affiliate Program Invitation',
    body: `Dear [Firm Name] Team,

My name is Cristian, founder of TheFundedDiaries.com — an independent prop firm comparison platform helping traders find the best prop firm for their style.

We are building our affiliate partnership network and would love to feature [Firm Name] as a verified partner.

What we offer you:
• A dedicated, fully-verified firm page with all challenge details, rules, and payout conditions
• Featured placement in our "Top Offers" section visible to all visitors
• A unique discount code for our trader community
• Affiliate tracking link to measure every referral we send you

What we ask:
• An affiliate commission for every funded challenge purchased via our link
• A discount code for our audience (even 10–15% significantly boosts conversion)

Our platform is 100% independent — we never accept payment for rankings. Firms are ranked purely by trust score based on verified payout data, years active, and real trader reviews.

To get started, please reply with:
1. Your affiliate program details (commission %, cookie duration, platform used)
2. A discount code for our community
3. Your preferred affiliate tracking link

We look forward to a mutually beneficial partnership.

Best regards,
Cristian
Founder, TheFundedDiaries.com
hello@thefundeddiaries.com`,
    cta_text: 'View Our Platform',
    cta_url: 'https://thefundeddiaries.com',
    from_email: 'partners@thefundeddiaries.com',
  },
  {
    id: 'welcome',
    name: '👋 Welcome',
    subject: 'Welcome to TheFundedDiaries!',
    heading: 'Welcome to TheFundedDiaries',
    body: `We're excited to have you on board!\n\nTheFundedDiaries is the most transparent prop firm comparison platform — verified rules, real reviews, and honest data so you can make the best decision for your trading career.\n\nHere's what you can do:\n• Compare all major prop firms side by side\n• Read verified reviews from real traders\n• Use our matching calculator to find your perfect firm\n• Get exclusive discount codes on challenge fees\n\nStart exploring and find your perfect prop firm today.`,
    cta_text: 'Explore Firms',
    cta_url: 'https://thefundeddiaries.com',
    from_email: 'hello@thefundeddiaries.com',
  },
  {
    id: 'new_firm',
    name: '🏦 New Firm Added',
    subject: 'New prop firm just added to TheFundedDiaries',
    heading: 'We just added a new verified firm',
    body: `A new prop trading firm has been verified and added to our platform.\n\nWe've manually verified all their rules, challenge conditions, and payout history before listing them.\n\nCheck it out and see if it fits your trading style.`,
    cta_text: 'View New Firm',
    cta_url: 'https://thefundeddiaries.com/firms',
    from_email: 'hello@thefundeddiaries.com',
  },
  {
    id: 'offer',
    name: '🎁 Special Offer',
    subject: 'Exclusive discount — limited time',
    heading: 'Exclusive offer for TheFundedDiaries members',
    body: `We've secured an exclusive discount code for our community.\n\nThis offer is time-limited and only available through TheFundedDiaries.\n\nDon't miss out — grab your discount before it expires.`,
    cta_text: 'Get Discount',
    cta_url: 'https://thefundeddiaries.com/offers',
    from_email: 'hello@thefundeddiaries.com',
  },
  {
    id: 'newsletter',
    name: '📰 Newsletter',
    subject: 'TheFundedDiaries — Latest Updates',
    heading: "What's new this week",
    body: `Here are the latest updates from TheFundedDiaries:\n\n• New firms added and verified\n• Updated challenge rules\n• Community reviews and insights\n\nStay informed and trade smart.`,
    cta_text: 'Read More',
    cta_url: 'https://thefundeddiaries.com',
    from_email: 'hello@thefundeddiaries.com',
  },
  {
    id: 'custom',
    name: '✏️ Custom',
    subject: '',
    heading: '',
    body: '',
    cta_text: '',
    cta_url: '',
    from_email: 'hello@thefundeddiaries.com',
  },
]

const SENDERS = [
  { label: 'hello@ — Main', value: 'hello@thefundeddiaries.com' },
  { label: 'support@ — Support', value: 'support@thefundeddiaries.com' },
  { label: 'partners@ — Partnerships', value: 'partners@thefundeddiaries.com' },
  { label: 'noreply@ — No Reply', value: 'noreply@thefundeddiaries.com' },
]

export default function EmailComposer({ userCount }: { userCount: number }) {
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [subject, setSubject] = useState(TEMPLATES[0].subject)
  const [heading, setHeading] = useState(TEMPLATES[0].heading)
  const [body, setBody] = useState(TEMPLATES[0].body)
  const [ctaText, setCtaText] = useState(TEMPLATES[0].cta_text)
  const [ctaUrl, setCtaUrl] = useState(TEMPLATES[0].cta_url)
  const [fromEmail, setFromEmail] = useState(TEMPLATES[0].from_email)
  const [recipients, setRecipients] = useState<'all' | 'custom'>('all')
  const [customEmails, setCustomEmails] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent?: number; failed?: number; error?: string } | null>(null)
  const [preview, setPreview] = useState(false)

  const selectTemplate = (t: typeof TEMPLATES[0]) => {
    setTemplate(t)
    setSubject(t.subject)
    setHeading(t.heading)
    setBody(t.body)
    setCtaText(t.cta_text)
    setCtaUrl(t.cta_url)
    setFromEmail(t.from_email)
  }

  const send = async () => {
    setSending(true); setResult(null)
    let recipientData: any = 'all'
    if (recipients === 'custom') {
      recipientData = customEmails
        .split('\n')
        .filter(e => e.includes('@'))
        .map(e => ({ email: e.trim(), name: 'Trader' }))
    }
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, heading, emailBody: body, cta_text: ctaText, cta_url: ctaUrl, from_email: fromEmail, recipients: recipientData })
      })
      const data = await res.json()
      setResult(data)
    } catch (e: any) { setResult({ error: e.message }) }
    setSending(false)
  }

  const panelStyle = { background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700 as const, color: 'var(--t2)' as const, display: 'block' as const, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '.04em' as const }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

      {/* LEFT — COMPOSE */}
      <div>
        {/* TEMPLATES */}
        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '14px' }}>Template</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t)} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${template.id === t.id ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: template.id === t.id ? 'rgba(0,229,160,0.08)' : 'transparent', color: template.id === t.id ? 'var(--teal)' : 'var(--t2)' }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* FROM EMAIL SELECTOR */}
        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '14px' }}>Send From</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SENDERS.map(s => (
              <button key={s.value} onClick={() => setFromEmail(s.value)} style={{ padding: '9px 14px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${fromEmail === s.value ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: fromEmail === s.value ? 'rgba(0,229,160,0.08)' : 'var(--bg2)', color: fromEmail === s.value ? 'var(--teal)' : 'var(--t2)', textAlign: 'left' as const }}>
                <div style={{ fontSize: '11px', color: fromEmail === s.value ? 'var(--teal)' : 'var(--t3)', marginBottom: '2px' }}>{s.label.split('—')[1]?.trim()}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11.5px' }}>{s.value.split('@')[0]}@</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
            From: <span style={{ color: 'var(--teal)' }}>{fromEmail}</span>
          </div>
        </div>

        {/* EMAIL FIELDS */}
        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '16px' }}>Email Content</h3>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Subject line</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Heading (inside email)</label>
            <input value={heading} onChange={e => setHeading(e.target.value)} placeholder="Heading..." style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Body text</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email content here..." rows={10} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>CTA Button text (optional)</label>
              <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Explore Firms" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CTA URL (optional)</label>
              <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
          </div>
        </div>

        {/* RECIPIENTS */}
        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '14px' }}>Recipients</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            {[{ key: 'all', label: `All users (${userCount})` }, { key: 'custom', label: 'Custom list' }].map(r => (
              <button key={r.key} onClick={() => setRecipients(r.key as any)} style={{ flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${recipients === r.key ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: recipients === r.key ? 'rgba(0,229,160,0.08)' : 'transparent', color: recipients === r.key ? 'var(--teal)' : 'var(--t2)' }}>
                {r.label}
              </button>
            ))}
          </div>
          {recipients === 'custom' && (
            <div>
              <label style={labelStyle}>Email addresses (one per line)</label>
              <textarea value={customEmails} onChange={e => setCustomEmails(e.target.value)} placeholder={'user@example.com\ntrader@example.com\nfirm@example.com'} rows={5} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          )}
        </div>

        {/* RESULT */}
        {result && (
          <div style={{ background: result.error ? 'rgba(248,113,113,0.1)' : 'rgba(0,229,160,0.1)', border: `1px solid ${result.error ? 'rgba(248,113,113,0.2)' : 'rgba(0,229,160,0.2)'}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontSize: '14px', color: result.error ? 'var(--coral)' : 'var(--teal)', fontWeight: 600 }}>
            {result.error ? `❌ Error: ${result.error}` : `✓ Sent to ${result.sent} recipient${(result.sent||0) > 1 ? 's' : ''}${result.failed ? ` (${result.failed} failed)` : ''}`}
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setPreview(p => !p)} style={{ padding: '11px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', flex: 1 }}>
            {preview ? 'Hide Preview' : 'Preview Email'}
          </button>
          <button onClick={send} disabled={sending || !subject || !heading || !body} style={{ padding: '11px 24px', borderRadius: '9px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', color: '#04120c', background: 'var(--teal)', boxShadow: '0 0 20px var(--teal-glow)', flex: 2, opacity: (!subject || !heading || !body || sending) ? 0.6 : 1 }}>
            {sending ? 'Sending...' : 'Send Email →'}
          </button>
        </div>
      </div>

      {/* RIGHT — PREVIEW */}
      <div style={{ position: 'sticky', top: '80px' }}>
        {preview ? (
          <div style={panelStyle}>
            <h3 style={{ ...labelStyle, marginBottom: '16px' }}>Preview</h3>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
              From: {fromEmail} · To: {recipients === 'all' ? `All users (${userCount})` : 'Custom list'}
            </div>
            <div style={{ background: '#07090f', borderRadius: '10px', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', background: 'linear-gradient(135deg,#00e5a0,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#04120c', fontSize: '11px', fontWeight: 900 }}>T</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#eef0f6' }}>TheFunded<span style={{ color: '#00e5a0' }}>Diaries</span></span>
              </div>
              <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '11px', color: '#4e5568', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>
                  Subject: {subject || '(no subject)'}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#eef0f6', margin: '0 0 4px' }}>{heading || 'Email Heading'}</h2>
                <div style={{ height: '2px', background: 'linear-gradient(90deg,#00e5a0,#a78bfa)', borderRadius: '2px', margin: '14px 0' }} />
                <p style={{ fontSize: '13px', color: '#8b92a8', margin: '0 0 12px' }}>Hi [Name],</p>
                <div style={{ fontSize: '13px', color: '#8b92a8', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                  {body || 'Email body...'}
                </div>
                {ctaText && (
                  <div style={{ display: 'inline-block', background: '#00e5a0', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, color: '#04120c', marginBottom: '16px' }}>
                    {ctaText} →
                  </div>
                )}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />
                <p style={{ fontSize: '11px', color: '#4e5568', margin: 0 }}>© 2026 TheFundedDiaries</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...panelStyle, textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Email Preview</div>
            <div style={{ fontSize: '13px', color: 'var(--t2)' }}>Click "Preview Email" to see how your email will look in the inbox.</div>
          </div>
        )}

        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '12px' }}>Tips</h3>
          <ul style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.8, paddingLeft: '16px', margin: 0 }}>
            <li>Use <b style={{ color: 'var(--t1)' }}>Affiliate Outreach</b> when contacting firms</li>
            <li>Replace <b style={{ color: 'var(--teal)' }}>[Firm Name]</b> with the actual firm name</li>
            <li>Send from <b style={{ color: 'var(--t1)' }}>partners@</b> for business emails</li>
            <li>CTA button is optional — leave blank to omit</li>
            <li>Custom list: one email address per line</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
