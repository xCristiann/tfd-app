import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = 'March 21, 2026'

const sections = [
  {
    title: '1. Introduction & Acceptance',
    body: `These Terms and Conditions ("Terms") govern your access to and use of the services provided by The Funded Diaries ("TFD", "we", "us", or "our"), including our website at thefundeddiaries.com, our trading platform, and all related services (collectively, the "Services").

By registering an account, purchasing a challenge, or using any part of our Services, you confirm that you have read, understood, and agree to be legally bound by these Terms in their entirety.

If you do not agree with any part of these Terms, you must not use our Services. We reserve the right to update or amend these Terms at any time. Continued use of the Services following notification of changes constitutes your acceptance of the revised Terms.

You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that you meet this age requirement.`,
  },
  {
    title: '2. Nature of the Services',
    body: `The Funded Diaries is a proprietary trading firm. We provide traders with access to simulated trading capital through an evaluation programme. All trading activity on TFD accounts is conducted on simulated (demo) accounts using real market data.

**Important clarifications:**
- TFD does not manage client funds or investments
- Traders are not investing their own money in financial markets through TFD
- Payouts to successful traders are made from TFD's own proprietary funds, based on simulated trading performance
- TFD is not a regulated investment firm, broker, or financial advisor
- Nothing on our platform constitutes investment advice or a financial recommendation

The evaluation programme is designed to identify skilled traders. Passing the evaluation does not guarantee a funded account or any income. Performance targets and rules may change at our discretion.`,
  },
  {
    title: '3. Account Registration',
    body: `To access our Services, you must register an account by providing accurate, current, and complete information. You are responsible for maintaining the confidentiality of your login credentials.

You agree to:
- Provide truthful and accurate information during registration and KYC verification
- Maintain one (1) account per individual — multi-accounting is strictly prohibited
- Not share your account credentials with any third party
- Notify us immediately of any unauthorised access to your account at support@thefundeddiaries.com

We reserve the right to suspend or terminate accounts that contain false information, are created for fraudulent purposes, or violate these Terms.`,
  },
  {
    title: '4. Challenge Purchase & Payment',
    body: `Challenge fees are charged at the point of purchase and are non-refundable once a trading account has been activated and credentials issued.

**Refund policy:**
- You are entitled to a full refund if requested before your account credentials are issued
- Once trading credentials are delivered, no refunds are provided
- Failed payments do not result in account activation

**Pay After You Pass model:** The upfront fee is charged at purchase. The activation fee is charged separately only upon successfully passing the evaluation. Failure to pay the activation fee within 14 days of passing will result in the account offer lapsing.

All prices are displayed in USD. We are not responsible for currency conversion fees charged by your payment provider. Chargebacks or payment disputes filed after credential delivery will result in immediate account termination and may be escalated to fraud prevention agencies.`,
  },
  {
    title: '5. Trading Rules & Evaluation Criteria',
    body: `By accepting a challenge, you agree to trade strictly within the rules applicable to your account. These rules include but are not limited to:

**Drawdown limits:** You must not breach the daily drawdown limit or maximum drawdown limit applicable to your account type. Breaching either limit results in immediate account termination.

**Trailing drawdown:** On 1-Step and applicable accounts, the drawdown floor rises with your peak equity. The floor is calculated as: Peak Equity − Trailing DD%. Trades that cause equity to breach the floor will terminate the account.

**Profit targets:** You must reach the stated profit target for each phase before advancing.

**Prohibited strategies:** The following are strictly prohibited and will result in immediate termination and forfeiture of all gains:
- Cross-account hedging (opposite positions across different TFD accounts)
- Copy trading or mirror trading across multiple TFD accounts
- High-frequency trading exceeding 15 trades per hour
- Latency arbitrage or tick data exploitation
- News window sniping (where restricted by your plan)
- Multi-accounting under different identities
- Any strategy designed to exploit platform vulnerabilities or pricing errors

Full details of prohibited practices are available in our Help Centre.`,
  },
  {
    title: '6. Funded Accounts & Payouts',
    body: `Upon successfully completing the evaluation, you will receive a funded account subject to compliance review. TFD reserves the right to review all trading activity before issuing a funded account.

**Payout eligibility:**
- First payout may be requested no earlier than 14 days after the first trade on the funded account
- Subsequent payouts may be requested every 14 days
- Payout amounts are subject to your account's profit split (typically 80–90%)
- Payouts are calculated on net profits above the starting balance
- KYC verification must be complete before any payout is processed

**Payout processing:**
- Approved payouts are processed within 3–5 business days
- TFD reserves the right to withhold or reverse payouts if fraudulent activity is subsequently discovered
- Payouts are made to the verified payment method associated with your account

TFD reserves the right to modify payout terms, profit splits, and eligibility criteria at any time with reasonable notice.`,
  },
  {
    title: '7. Risk Management & Account Termination',
    body: `TFD operates a 24/7 automated risk monitoring system. Accounts may be frozen, soft-locked, or terminated based on the following:

**Automatic termination triggers:**
- Drawdown limit breach (daily or maximum)
- Confirmed prohibited trading activity
- Identity fraud or KYC misrepresentation
- Chargeback or payment dispute filed after credential delivery

**Investigation process:** If your account is frozen pending review, you will be notified by email. Investigations are typically resolved within 48–72 hours. You may submit evidence or a trading rationale to risk@thefundeddiaries.com.

**Appeals:** Account termination decisions may be appealed within 14 days of the termination notice. Appeals must be submitted to risk@thefundeddiaries.com with supporting documentation. TFD's decision on appeal is final.

Upon termination, all unfulfilled payout requests are cancelled and any pending profits are forfeited.`,
  },
  {
    title: '8. Intellectual Property',
    body: `All content, software, design, text, graphics, logos, and materials on the TFD platform and website are the exclusive property of The Funded Diaries and are protected by applicable intellectual property laws.

You are granted a limited, non-exclusive, non-transferable licence to access and use the Services for personal, non-commercial purposes only.

You may not:
- Copy, reproduce, or distribute any TFD content without prior written consent
- Reverse engineer, decompile, or attempt to extract the source code of our platform
- Use TFD's branding, logos, or trademarks without express written authorisation
- Create derivative works based on TFD's proprietary materials`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, TFD and its directors, employees, and agents shall not be liable for:

- Any loss of profits, revenue, or anticipated savings
- Any indirect, incidental, special, or consequential damages
- Any loss of data or interruption of service
- Any actions taken by third-party payment providers or service partners

TFD's total liability to you for any claim arising out of or relating to these Terms or the Services shall not exceed the amount paid by you for your challenge in the 12 months preceding the claim.

Nothing in these Terms limits liability for fraud, death, or personal injury caused by our negligence, or any other liability that cannot be excluded under applicable law.`,
  },
  {
    title: '10. Governing Law & Jurisdiction',
    body: `These Terms are governed by and construed in accordance with applicable commercial law. Any disputes arising from these Terms or your use of the Services shall first be subject to good-faith negotiation. If unresolved, disputes shall be submitted to binding arbitration.

If you are a consumer in a jurisdiction with mandatory consumer protection laws, nothing in these Terms limits your statutory rights under those laws.

For all legal matters, please contact us at legal@thefundeddiaries.com.`,
  },
  {
    title: '11. Contact Information',
    body: `For questions regarding these Terms, please contact us:

**The Funded Diaries**
Email: support@thefundeddiaries.com
Risk & Compliance: risk@thefundeddiaries.com
Legal: legal@thefundeddiaries.com
Website: thefundeddiaries.com

We aim to respond to all enquiries within 2 business days.`,
  },
]

export function TermsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FC', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(135deg, #1A3A8B 0%, #2255CC 100%)', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
          The Funded <span style={{ fontStyle: 'italic', color: '#93C5FD' }}>Diaries</span>
        </a>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/privacy')} style={{ fontSize: '12px', color: 'rgba(255,255,255,.75)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px' }}>Privacy Policy</button>
          <button onClick={() => navigate('/')} style={{ fontSize: '12px', fontWeight: 600, color: '#1A3A8B', background: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '8px 18px' }}>Home</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1A3A8B 0%, #2255CC 100%)', padding: '48px 48px 56px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px' }}>Legal</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '40px', fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Terms & Conditions</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.65)', margin: 0 }}>Last updated: {LAST_UPDATED}</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Intro box */}
        <div style={{ background: '#fff', border: '1px solid #E8EEF8', borderRadius: '12px', padding: '24px 28px', marginBottom: '32px', borderLeft: '4px solid #2255CC' }}>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.8, color: '#374151' }}>
            Please read these Terms and Conditions carefully before using The Funded Diaries platform. These Terms constitute a legally binding agreement between you and The Funded Diaries. By creating an account or purchasing a challenge, you agree to all terms herein.
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
                // Bold inline
                const parts = line.split(/\*\*(.*?)\*\*/g)
                return <p key={li} style={{ margin: '6px 0' }}>
                  {parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi} style={{ color: '#1A3A6B' }}>{p}</strong> : p)}
                </p>
              })}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '12px', color: '#8FA3BF', lineHeight: 1.8 }}>
          <p>© {new Date().getFullYear()} The Funded Diaries. All rights reserved.</p>
          <p>
            <a href="/privacy" style={{ color: '#2255CC', textDecoration: 'none', marginRight: '16px' }}>Privacy Policy</a>
            <a href="mailto:support@thefundeddiaries.com" style={{ color: '#2255CC', textDecoration: 'none' }}>Contact Us</a>
          </p>
        </div>
      </div>
    </div>
  )
}
