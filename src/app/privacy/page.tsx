import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = 'March 21, 2026'

const sections = [
  {
    title: '1. Introduction',
    body: `The Funded Diaries ("TFD", "we", "us", "our") is committed to protecting your personal data and respecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website at thefundeddiaries.com and our Services.

We are the data controller responsible for your personal data. If you have any questions about this Policy, please contact us at privacy@thefundeddiaries.com.

This Policy applies to all data we collect from you directly, through your use of our platform, or via third-party services we use to operate our business. By using our Services, you acknowledge this Policy.`,
  },
  {
    title: '2. Data We Collect',
    body: `**2.1 Information you provide directly:**
- Full name, email address, phone number
- Date of birth, nationality, country of residence
- Billing address and postal code
- Government-issued identity documents (for KYC verification)
- Payment information (processed securely via Stripe — we do not store card numbers)
- Trading preferences and account settings
- Support correspondence and feedback

**2.2 Information collected automatically:**
- IP addresses (collected at login and at the time of each trade placement)
- Device type, browser, and operating system
- Session timestamps and platform usage patterns
- Trading activity data (positions, symbols, lot sizes, open/close times, P&L)
- Referral codes and affiliate attribution

**2.3 Information from third parties:**
- Identity verification data from our KYC provider (Didit)
- Payment verification data from Stripe
- Fraud detection signals from compliance partners`,
  },
  {
    title: '3. How We Use Your Data',
    body: `We process your personal data for the following purposes:

**Service delivery:**
- Creating and managing your trader account
- Processing challenge purchases and payouts
- Issuing trading account credentials
- Sending transactional emails (order confirmations, account credentials, payout notifications)

**Risk management & fraud prevention:**
- Monitoring trading activity for rule violations and prohibited practices
- Cross-referencing IP addresses and device data to detect multi-accounting
- Investigating reports of coordinated account abuse or copy trading rings
- Complying with anti-money laundering (AML) obligations

**Legal compliance:**
- Identity verification (KYC) as required by applicable regulations
- Responding to lawful requests from regulatory authorities
- Maintaining records as required by law

**Communications:**
- Sending service updates, policy changes, and account notifications
- Responding to support enquiries
- Sending promotional emails (only with your consent — you may opt out at any time)

**Analytics & improvement:**
- Understanding how traders use our platform to improve the service
- Monitoring performance, uptime, and technical issues`,
  },
  {
    title: '4. Legal Basis for Processing (GDPR)',
    body: `For users in the European Economic Area (EEA) and United Kingdom, we process your data under the following legal bases:

**Contractual necessity** — Processing required to fulfil our agreement with you (account management, payouts, credential delivery).

**Legitimate interests** — Fraud detection, risk monitoring, and protecting the integrity of our programme. We balance these interests against your rights.

**Legal obligation** — KYC/AML compliance, tax reporting, and responding to regulatory requests.

**Consent** — Marketing communications and non-essential cookies. You may withdraw consent at any time.

You have the right to object to processing based on legitimate interests. Contact us at privacy@thefundeddiaries.com to exercise this right.`,
  },
  {
    title: '5. IP Address Collection & Trade Monitoring',
    body: `We collect IP addresses at the following points:
- When you log in to your account
- When you place or close a trade on the TFD Platform

**Why we collect trade IPs:** IP addresses are used exclusively for fraud detection — specifically to identify cross-account hedging rings, copy trading groups, and multi-accounting. This data is accessed only by our risk management team and is not shared with third parties for commercial purposes.

**Retention:** Trade IP data is retained for 24 months from the date of collection, after which it is permanently deleted.

**Legal basis:** Legitimate interest in protecting our business and the integrity of the evaluation programme.

If you believe IP data has been used incorrectly in an account review, you may raise this with our risk team at risk@thefundeddiaries.com.`,
  },
  {
    title: '6. Data Sharing & Third Parties',
    body: `We share your data only in the following circumstances:

**Service providers (processors acting on our behalf):**
- **Stripe** — payment processing (PCI-DSS compliant)
- **Didit** — KYC identity verification (documents deleted after verification)
- **Resend** — transactional email delivery
- **Supabase** — secure database hosting (EU/US data centres)
- **Vercel** — platform hosting (global CDN)

**Legal requirements:**
- We may disclose your data to regulatory authorities, law enforcement, or courts when required by applicable law

**Business transfers:**
- In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity under equivalent privacy protections

**We will never:**
- Sell your personal data to third parties
- Share your data with advertisers for targeting purposes
- Provide your trading performance data to brokers or financial institutions without your explicit consent`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your data for the following periods:

| Data Type | Retention Period |
|---|---|
| Account information | Duration of account + 5 years |
| KYC documents | 14 days post-verification (then deleted) |
| Trade data & IP logs | 24 months from collection |
| Payment records | 7 years (legal/tax requirement) |
| Support correspondence | 3 years |
| Marketing preferences | Until you withdraw consent |

When retention periods expire, data is securely deleted or anonymised. You may request early deletion in certain circumstances (see Your Rights below).`,
  },
  {
    title: '8. Your Rights',
    body: `Depending on your jurisdiction, you have the following rights regarding your personal data:

**Right of access** — Request a copy of the personal data we hold about you.

**Right to rectification** — Request correction of inaccurate or incomplete data.

**Right to erasure** — Request deletion of your data where we no longer have a legal basis to retain it (subject to legal obligations such as tax record retention).

**Right to restriction** — Request that we limit processing of your data in certain circumstances.

**Right to portability** — Receive your data in a structured, machine-readable format.

**Right to object** — Object to processing based on legitimate interests, including fraud monitoring.

**Right to withdraw consent** — For any processing based on consent (e.g., marketing emails), you may withdraw at any time by clicking "unsubscribe" or contacting privacy@thefundeddiaries.com.

To exercise any of these rights, contact us at **privacy@thefundeddiaries.com**. We will respond within 30 days. We may ask you to verify your identity before processing your request.`,
  },
  {
    title: '9. Cookies & Tracking',
    body: `We use the following types of cookies and tracking technologies:

**Strictly necessary cookies:** Required for the platform to function (authentication sessions, security tokens). These cannot be disabled.

**Analytics cookies:** Used to understand how traders use our platform (page views, navigation patterns). You may opt out via your browser settings.

**Preference cookies:** Remember your settings and preferences (language, dark mode, etc.).

We do not use third-party advertising cookies or behavioural tracking for ad targeting.

You can manage cookie preferences in your browser settings. Note that disabling certain cookies may affect platform functionality.`,
  },
  {
    title: '10. Data Security',
    body: `We implement industry-standard security measures to protect your data:

- **Encryption in transit:** All data transmitted between your browser and our servers is encrypted using TLS 1.3
- **Encryption at rest:** Database storage is encrypted using AES-256
- **Access controls:** Personal data is accessible only to authorised personnel on a need-to-know basis
- **Security monitoring:** Our infrastructure is monitored 24/7 for unauthorised access
- **Password security:** Passwords are hashed using bcrypt — we cannot read your password

Despite these measures, no system is 100% secure. In the event of a data breach that poses a risk to your rights, we will notify you and relevant authorities within 72 hours as required by applicable law.

To report a security vulnerability, contact us at security@thefundeddiaries.com.`,
  },
  {
    title: '11. International Data Transfers',
    body: `Our servers are located in the European Union and United States. If you access our Services from outside these regions, your data may be transferred internationally.

For transfers of EEA/UK data to countries without an adequacy decision, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission to ensure adequate protection of your data.`,
  },
  {
    title: '12. Contact & Complaints',
    body: `**Data Controller:**
The Funded Diaries
Email: privacy@thefundeddiaries.com
Website: thefundeddiaries.com

**For complaints:** If you believe we have not handled your data lawfully, you have the right to lodge a complaint with the supervisory authority in your country of residence.

**EU/EEA users:** Contact your national data protection authority.
**UK users:** Contact the Information Commissioner's Office (ICO) at ico.org.uk.

We take all privacy concerns seriously and will investigate any complaint promptly. We encourage you to contact us directly first so we can resolve concerns before escalating to a regulator.`,
  },
]

export function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FC', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(135deg, #1A3A8B 0%, #2255CC 100%)', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          The Funded <span style={{ fontStyle: 'italic', color: '#93C5FD' }}>Diaries</span>
        </a>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/terms')} style={{ fontSize: '12px', color: 'rgba(255,255,255,.75)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px' }}>Terms & Conditions</button>
          <button onClick={() => navigate('/')} style={{ fontSize: '12px', fontWeight: 600, color: '#1A3A8B', background: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '8px 18px' }}>Home</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1A3A8B 0%, #2255CC 100%)', padding: '48px 48px 56px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '40px', fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.65)', margin: 0 }}>Last updated: {LAST_UPDATED}</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Intro box */}
        <div style={{ background: '#fff', border: '1px solid #E8EEF8', borderRadius: '12px', padding: '24px 28px', marginBottom: '32px', borderLeft: '4px solid #16A34A' }}>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.8, color: '#374151' }}>
            Your privacy matters to us. This Policy explains exactly what data we collect, why we collect it, how long we keep it, and your rights. We never sell your personal data. We are GDPR-compliant and committed to data minimisation.
          </p>
        </div>

        {/* Sections */}
        {sections.map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E8EEF8', borderRadius: '12px', padding: '28px 32px', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, color: '#1A3A6B', marginTop: 0, marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F0F4FB' }}>
              {s.title}
            </h2>
            <div style={{ fontSize: '14px', lineHeight: 1.85, color: '#374151' }}>
              {s.body.split('\n').map((line, li) => {
                if (!line.trim()) return <br key={li} />
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={li} style={{ fontWeight: 700, color: '#1A3A6B', margin: '12px 0 4px' }}>{line.replace(/\*\*/g, '')}</p>
                }
                if (line.startsWith('- ')) {
                  return <p key={li} style={{ margin: '4px 0', paddingLeft: '16px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#2255CC' }}>·</span>
                    {line.slice(2).replace(/\*\*(.*?)\*\*/g, (_, m) => m)}
                  </p>
                }
                if (line.startsWith('| ')) {
                  const cells = line.split('|').filter(c => c.trim() && c.trim() !== '---')
                  if (cells.length === 0) return null
                  return (
                    <div key={li} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #F0F4FB', padding: '6px 0' }}>
                      {cells.map((c, ci) => (
                        <span key={ci} style={{ fontSize: '13px', color: ci === 0 ? '#5C7A9E' : '#1A3A6B', fontWeight: ci === 1 ? 500 : 400 }}>{c.trim()}</span>
                      ))}
                    </div>
                  )
                }
                const parts = line.split(/\*\*(.*?)\*\*/g)
                return <p key={li} style={{ margin: '6px 0' }}>
                  {parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi} style={{ color: '#1A3A6B' }}>{p}</strong> : p)}
                </p>
              })}
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#8FA3BF', lineHeight: 1.8 }}>
          <p>© {new Date().getFullYear()} The Funded Diaries. All rights reserved.</p>
          <p>
            <a href="/terms" style={{ color: '#2255CC', textDecoration: 'none', marginRight: '16px' }}>Terms & Conditions</a>
            <a href="mailto:privacy@thefundeddiaries.com" style={{ color: '#2255CC', textDecoration: 'none' }}>privacy@thefundeddiaries.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
