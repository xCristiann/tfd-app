'use client'
import { useState } from 'react'

const TEMPLATES = [
  {
    id: 'affiliate_outreach',
    name: '🤝 Affiliate Outreach',
    subject: 'Partnership Opportunity — TheFundedDiaries.com',
    heading: 'Partnership & Affiliate Program Invitation',
    body: `Dear Team,

My name is Cristian, founder of TheFundedDiaries.com — an independent prop firm comparison and review platform helping traders find the right firm based on verified data, real reviews, and transparent rankings.

We are building our affiliate partnership network and would love to include your firm as a featured partner on our platform.

What we offer you:
• A dedicated, verified firm page with all challenge details, rules, and payout conditions
• Featured placement in our "Active Offers" section, visible to all visitors
• A unique discount code promoted to our trader community
• Affiliate tracking link so you can measure every referral we send you

What we ask:
• An affiliate commission for every challenge purchased via our referral link
• A discount code for our community (even 10-15% significantly increases conversion)

Our platform ranks firms purely by trust score — based on verified payout data, years active, and real trader reviews. No firm can pay for better rankings.

To get started, please reply with:
1. Your affiliate program details (commission rate, cookie duration, tracking platform)
2. A discount code for the TheFundedDiaries community
3. Your preferred tracking link or affiliate portal

We look forward to a mutually beneficial partnership.

Best regards,
Cristian
Founder, TheFundedDiaries.com
hello@thefundeddiaries.com
https://www.thefundeddiaries.com`,
    cta_text: 'View Our Platform',
    cta_url: 'https://www.thefundeddiaries.com',
    from_email: 'partners@thefundeddiaries.com',
  },
  {
    id: 'welcome',
    name: '👋 Welcome',
    subject: 'Welcome to TheFundedDiaries!',
    heading: 'Welcome to TheFundedDiaries',
    body: `Hi there,

Welcome to TheFundedDiaries — the most transparent prop firm comparison platform!

Here is what you can do:
• Compare all major prop firms side by side with verified data
• Read real trader reviews
• Use our matching calculator to find your perfect firm
• Get exclusive discount codes on challenge fees
• Earn TFD Coins on every purchase via our links

Start exploring and find your perfect prop firm today.

Best,
The TheFundedDiaries Team`,
    cta_text: 'Explore Firms',
    cta_url: 'https://www.thefundeddiaries.com',
    from_email: 'hello@thefundeddiaries.com',
  },
  {
    id: 'offer',
    name: '🎁 Special Offer',
    subject: 'Exclusive discount — limited time',
    heading: 'Exclusive offer for TheFundedDiaries members',
    body: `Hi there,

We have secured an exclusive discount code for our community.

This offer is time-limited and only available through TheFundedDiaries.

Use the code at checkout to get your discount.`,
    cta_text: 'Get Discount',
    cta_url: 'https://www.thefundeddiaries.com/offers',
    from_email: 'hello@thefundeddiaries.com',
  },
  {
    id: 'newsletter',
    name: '📰 Newsletter',
    subject: 'TheFundedDiaries — Latest Updates',
    heading: 'What is new this week',
    body: `Hi there,

Here are the latest updates from TheFundedDiaries:

• New firms added and verified
• Updated challenge rules and conditions
• Community reviews and insights
• Latest discount codes available

Stay informed and trade smart.`,
    cta_text: 'Read More',
    cta_url: 'https://www.thefundeddiaries.com',
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
  { label: 'cristian@ — Personal', value: 'cristian@thefundeddiaries.com' },
  { label: 'support@ — Support', value: 'support@thefundeddiaries.com' },
  { label: 'partners@ — Partnerships', value: 'partners@thefundeddiaries.com' },
  { label: 'noreply@ — No Reply', value: 'noreply@thefundeddiaries.com' },
]

const FIRM_CONTACTS = [
  'affiliates@the5ers.com',
  'affiliate@fundednext.com',
  'partners@fundingpips.com',
  'support@alphacapitalgroup.uk',
  'affiliates@apextraderfunding.com',
  'affiliate@e8markets.com',
  'partners@fxify.com',
  'support@maventrading.com',
  'affiliate@smartproptrader.com',
  'affiliates@goatfundedtrader.com',
  'affiliates@fundedtradingplus.com',
  'support@holaprime.com',
  'affiliate@blueberryfunded.com',
  'partners@brightfunded.com',
  'support@fortraders.com',
  'affiliate@monetafunded.com',
  'partners@thetradingpit.com',
  'support@traderswithededge.com',
  'support@audacitycapital.co.uk',
  'affiliates@citytraders.com',
  'affiliate@dnafunded.com',
  'support@myfutures.com',
]

export default function EmailComposer({ userCount }: { userCount: number }) {
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [subject, setSubject] = useState(TEMPLATES[0].subject)
  const [heading, setHeading] = useState(TEMPLATES[0].heading)
  const [body, setBody] = useState(TEMPLATES[0].body)
  const [ctaText, setCtaText] = useState(TEMPLATES[0].cta_text)
  const [ctaUrl, setCtaUrl] = useState(TEMPLATES[0].cta_url)
  const [fromEmail, setFromEmail] = useState(TEMPLATES[0].from_email)
  const [recipients, setRecipients] = useState<'all' | 'custom'>('custom')
  const [customEmails, setCustomEmails] = useState(FIRM_CONTACTS.join('\n'))
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent?: number; failed?: number; total?: number; error?: string } | null>(null)
  const [preview, setPreview] = useState(false)

  const selectTemplate = (t: typeof TEMPLATES[0]) => {
    setTemplate(t)
    setSubject(t.subject)
    setHeading(t.heading)
    setBody(t.body)
    setCtaText(t.cta_text)
    setCtaUrl(t.cta_url)
    setFromEmail(t.from_email)
    if (t.id !== 'affiliate_outreach') setCustomEmails('')
    else setCustomEmails(FIRM_CONTACTS.join('\n'))
  }

  const send = async () => {
    if (!subject || !heading || !body) return
    setSending(true); setResult(null)
    let recipientData: any = 'all'
    if (recipients === 'custom') {
      recipientData = customEmails.split('\n').map(e => e.trim()).filter(e => e.includes('@')).map(e => ({ email: e, name: 'Team' }))
      if (!recipientData.length) { setResult({ error: 'No valid email addresses' }); setSending(false); return }
    }
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, heading, emailBody: body, cta_text: ctaText, cta_url: ctaUrl, from_email: fromEmail, recipients: recipientData })
      })
      setResult(await res.json())
    } catch (e: any) { setResult({ error: e.message }) }
    setSending(false)
  }

  const panelStyle = { background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }

  const validCount = customEmails.split('\n').filter(e => e.trim().includes('@')).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
      <div>
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

        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '14px' }}>Send From</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SENDERS.map(s => (
              <button key={s.value} onClick={() => setFromEmail(s.value)} style={{ padding: '9px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${fromEmail === s.value ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: fromEmail === s.value ? 'rgba(0,229,160,0.08)' : 'var(--bg2)', color: fromEmail === s.value ? 'var(--teal)' : 'var(--t2)', textAlign: 'left' }}>
                <div style={{ fontSize: '10px', marginBottom: '2px', color: fromEmail === s.value ? 'var(--teal)' : 'var(--t3)' }}>{s.label.split('—')[1]?.trim()}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>{s.value}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '16px' }}>Email Content</h3>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Heading</label>
            <input value={heading} onChange={e => setHeading(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Body</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>CTA Button (optional)</label><input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. View Platform" style={inputStyle} /></div>
            <div><label style={labelStyle}>CTA URL</label><input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." style={inputStyle} /></div>
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ ...labelStyle, marginBottom: '14px' }}>Recipients</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            {[{ key: 'custom', label: `Custom (${validCount} addresses)` }, { key: 'all', label: `All users (${userCount})` }].map(r => (
              <button key={r.key} onClick={() => setRecipients(r.key as any)} style={{ flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${recipients === r.key ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: recipients === r.key ? 'rgba(0,229,160,0.08)' : 'transparent', color: recipients === r.key ? 'var(--teal)' : 'var(--t2)' }}>
                {r.label}
              </button>
            ))}
          </div>
          <label style={labelStyle}>Email addresses — one per line</label>
          <textarea value={customEmails} onChange={e => setCustomEmails(e.target.value)} rows={8}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }} />
        </div>

        {result && (
          <div style={{ background: result.error ? 'rgba(248,113,113,0.1)' : 'rgba(0,229,160,0.1)', border: `1px solid ${result.error ? 'rgba(248,113,113,0.2)' : 'rgba(0,229,160,0.2)'}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontSize: '14px', color: result.error ? 'var(--coral)' : 'var(--teal)', fontWeight: 600 }}>
            {result.error ? `❌ ${result.error}` : `✓ Sent to ${result.sent}/${result.total} recipients${result.failed ? ` (${result.failed} failed)` : ''}`}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setPreview(p => !p)} style={{ padding: '11px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', flex: 1 }}>
            {preview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={send} disabled={sending || !subject || !heading || !body}
            style={{ padding: '11px 24px', borderRadius: '9px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', color: '#04120c', background: 'var(--teal)', boxShadow: '0 0 20px var(--teal-glow)', flex: 2, opacity: (!subject || !heading || !body || sending) ? 0.6 : 1 }}>
            {sending ? `Sending to ${validCount} firms...` : `Send to ${recipients === 'all' ? userCount + ' users' : validCount + ' addresses'} →`}
          </button>
        </div>
      </div>

      <div style={{ position: 'sticky', top: '80px' }}>
        {preview && (
          <div style={{ ...panelStyle, marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Preview — From: {fromEmail}</div>
            <div style={{ background: '#07090f', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#eef0f6', marginBottom: '16px' }}>TheFunded<span style={{ color: '#00e5a0' }}>Diaries</span></div>
              <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '10px', color: '#4e5568', marginBottom: '10px', fontFamily: 'monospace' }}>Subject: {subject}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#eef0f6', margin: '0 0 4px' }}>{heading}</h3>
                <div style={{ height: '2px', background: 'linear-gradient(90deg,#00e5a0,#a78bfa)', borderRadius: '2px', margin: '12px 0' }} />
                <div style={{ fontSize: '12.5px', color: '#8b92a8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{body}</div>
                {ctaText && <div style={{ display: 'inline-block', background: '#00e5a0', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: 800, color: '#04120c', marginTop: '12px' }}>{ctaText} →</div>}
              </div>
            </div>
          </div>
        )}
        <div style={panelStyle}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>Firm Contacts ({FIRM_CONTACTS.length})</h3>
          <div style={{ fontSize: '11.5px', color: 'var(--t3)', lineHeight: 1.9, fontFamily: 'JetBrains Mono, monospace', maxHeight: '300px', overflowY: 'auto' }}>
            {FIRM_CONTACTS.map(e => <div key={e}>{e}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}