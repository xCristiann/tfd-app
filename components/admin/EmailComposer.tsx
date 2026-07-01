'use client'
import { useState } from 'react'

const TEMPLATES = [
  {
    id: 'welcome',
    name: '👋 Welcome',
    subject: 'Welcome to TheFundedDiaries!',
    heading: 'Welcome to TheFundedDiaries',
    body: `We're excited to have you on board!\n\nTheFundedDiaries is the most transparent prop firm comparison platform — we show you verified rules, real reviews, and honest data so you can make the best decision for your trading career.\n\nHere's what you can do:\n• Compare all major prop firms side by side\n• Read verified reviews from real traders\n• Use our matching calculator to find your perfect firm\n• Get exclusive discount codes on challenge fees\n\nStart exploring and find your perfect prop firm today.`,
    cta_text: 'Explore Firms',
    cta_url: 'https://thefundeddiaries.com',
  },
  {
    id: 'new_firm',
    name: '🏦 New Firm Added',
    subject: 'New prop firm just added to TheFundedDiaries',
    heading: 'We just added a new firm',
    body: `A new prop trading firm has been verified and added to our platform.\n\nWe've manually verified all their rules, challenge conditions, and payout history before listing them.\n\nCheck it out and see if it fits your trading style.`,
    cta_text: 'View New Firm',
    cta_url: 'https://thefundeddiaries.com/firms',
  },
  {
    id: 'offer',
    name: '🎁 Special Offer',
    subject: 'Exclusive discount — limited time',
    heading: 'Exclusive offer for TheFundedDiaries members',
    body: `We've secured an exclusive discount code for our community.\n\nThis offer is time-limited and only available through TheFundedDiaries.\n\nDon't miss out — grab your discount before it expires.`,
    cta_text: 'Get Discount',
    cta_url: 'https://thefundeddiaries.com/offers',
  },
  {
    id: 'newsletter',
    name: '📰 Newsletter',
    subject: 'TheFundedDiaries — Latest Updates',
    heading: 'What\'s new this week',
    body: `Here are the latest updates from TheFundedDiaries:\n\n• New firms added and verified\n• Updated challenge rules\n• Community reviews and insights\n\nStay informed and trade smart.`,
    cta_text: 'Read More',
    cta_url: 'https://thefundeddiaries.com',
  },
  {
    id: 'custom',
    name: '✏️ Custom',
    subject: '',
    heading: '',
    body: '',
    cta_text: '',
    cta_url: '',
  },
]

const inp = (label: string, value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
  </div>
)

export default function EmailComposer({ userCount }: { userCount: number }) {
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [subject, setSubject] = useState(TEMPLATES[0].subject)
  const [heading, setHeading] = useState(TEMPLATES[0].heading)
  const [body, setBody] = useState(TEMPLATES[0].body)
  const [ctaText, setCtaText] = useState(TEMPLATES[0].cta_text)
  const [ctaUrl, setCtaUrl] = useState(TEMPLATES[0].cta_url)
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
  }

  const send = async () => {
    setSending(true); setResult(null)
    let recipientData: any = 'all'
    if (recipients === 'custom') {
      recipientData = customEmails.split('\n').filter(e => e.includes('@')).map(e => ({ email: e.trim(), name: 'Trader' }))
    }
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, heading, emailBody: body, cta_text: ctaText, cta_url: ctaUrl, recipients: recipientData })
      })
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setResult({ error: e.message })
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

      {/* LEFT: COMPOSE */}
      <div>
        {/* TEMPLATE PICKER */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>Template</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t)} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${template.id === t.id ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: template.id === t.id ? 'rgba(0,229,160,0.08)' : 'transparent', color: template.id === t.id ? 'var(--teal)' : 'var(--t2)', transition: 'all .15s' }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* EMAIL FIELDS */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>Email Content</h3>
          {inp('Subject line', subject, setSubject, 'e.g. Exclusive offer for TheFundedDiaries members')}
          {inp('Heading (inside email)', heading, setHeading, 'e.g. Welcome to TheFundedDiaries')}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Body text</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email content here..." rows={8}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', lineHeight: 1.65 }} />
          </div>
          {inp('CTA Button text (optional)', ctaText, setCtaText, 'e.g. Explore Firms')}
          {inp('CTA Button URL (optional)', ctaUrl, setCtaUrl, 'https://thefundeddiaries.com/...')}
        </div>

        {/* RECIPIENTS */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '14px' }}>Recipients</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <button onClick={() => setRecipients('all')} style={{ flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${recipients === 'all' ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: recipients === 'all' ? 'rgba(0,229,160,0.08)' : 'transparent', color: recipients === 'all' ? 'var(--teal)' : 'var(--t2)' }}>
              All users ({userCount})
            </button>
            <button onClick={() => setRecipients('custom')} style={{ flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${recipients === 'custom' ? 'rgba(0,229,160,0.4)' : 'var(--border2)'}`, background: recipients === 'custom' ? 'rgba(0,229,160,0.08)' : 'transparent', color: recipients === 'custom' ? 'var(--teal)' : 'var(--t2)' }}>
              Custom list
            </button>
          </div>
          {recipients === 'custom' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Email addresses (one per line)</label>
              <textarea value={customEmails} onChange={e => setCustomEmails(e.target.value)} placeholder="user@example.com&#10;trader@example.com" rows={4}
                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '9px', color: 'var(--t1)', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', outline: 'none', resize: 'vertical' }} />
            </div>
          )}
        </div>

        {/* RESULT */}
        {result && (
          <div style={{ background: result.error ? 'rgba(248,113,113,0.1)' : 'rgba(0,229,160,0.1)', border: `1px solid ${result.error ? 'rgba(248,113,113,0.2)' : 'rgba(0,229,160,0.2)'}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontSize: '14px', color: result.error ? 'var(--coral)' : 'var(--teal)', fontWeight: 600 }}>
            {result.error ? `❌ Error: ${result.error}` : `✓ Sent to ${result.sent} recipients${result.failed ? ` (${result.failed} failed)` : ''}`}
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setPreview(p => !p)} style={{ padding: '11px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'transparent', flex: 1 }}>
            {preview ? 'Hide Preview' : 'Preview Email'}
          </button>
          <button onClick={send} disabled={sending || !subject || !heading || !body} style={{ padding: '11px 24px', borderRadius: '9px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: 'none', color: '#04120c', background: 'var(--teal)', boxShadow: '0 0 20px var(--teal-glow)', flex: 2, opacity: (!subject || !heading || !body || sending) ? 0.6 : 1 }}>
            {sending ? 'Sending...' : `Send Email →`}
          </button>
        </div>
      </div>

      {/* RIGHT: PREVIEW */}
      <div>
        {preview ? (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>Email Preview</h3>
            <div style={{ background: '#07090f', borderRadius: '10px', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '7px', background: 'linear-gradient(135deg,#00e5a0,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#04120c', fontSize: '11px', fontWeight: 900 }}>T</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#eef0f6' }}>TheFunded<span style={{ color: '#00e5a0' }}>Diaries</span></span>
              </div>
              <div style={{ background: '#0c0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#eef0f6', marginBottom: '4px' }}>{heading || 'Email Heading'}</h2>
                <div style={{ height: '2px', background: 'linear-gradient(90deg,#00e5a0,#a78bfa)', borderRadius: '2px', margin: '14px 0' }} />
                <p style={{ fontSize: '13px', color: '#8b92a8', marginBottom: '12px' }}>Hi [Name],</p>
                <div style={{ fontSize: '13px', color: '#8b92a8', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '16px' }}>{body || 'Email body will appear here...'}</div>
                {ctaText && (
                  <div style={{ display: 'inline-block', background: '#00e5a0', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, color: '#04120c', marginBottom: '16px' }}>
                    {ctaText} →
                  </div>
                )}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />
                <p style={{ fontSize: '11px', color: '#4e5568' }}>© 2026 TheFundedDiaries · Independent prop firm comparison</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Email Preview</div>
            <div style={{ fontSize: '13px', color: 'var(--t2)' }}>Click "Preview Email" to see how your email will look in the inbox.</div>
          </div>
        )}

        {/* EMAIL HISTORY placeholder */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Tips</h3>
          <ul style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.8, paddingLeft: '16px', marginTop: '10px' }}>
            <li>Use <b style={{ color: 'var(--t1)' }}>templates</b> as starting points, then customize</li>
            <li>The <b style={{ color: 'var(--t1)' }}>CTA button</b> is optional — leave blank to omit</li>
            <li>Custom list: one email per line</li>
            <li>Emails send from <b style={{ color: 'var(--teal)' }}>hello@thefundeddiaries.com</b></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
