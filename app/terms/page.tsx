import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function TermsPage() {
  const sections = [
    { title: '1. Acceptance of Terms', content: `By accessing TheFundedDiaries.com, you agree to these Terms of Service. If you do not agree, please do not use our platform. We reserve the right to update these terms at any time &mdash; continued use constitutes acceptance.` },
    { title: '2. Platform Purpose', content: `TheFundedDiaries is an independent comparison and review platform for proprietary trading firms. We provide information, reviews, and tools to help traders make informed decisions. We are not a prop trading firm and do not offer financial services or trading accounts.` },
    { title: '3. Not Financial Advice', content: `All content on TheFundedDiaries is for informational purposes only and does not constitute financial, investment, or trading advice. We do not guarantee the accuracy of prop firm data and encourage users to verify information directly with each firm before making purchasing decisions.` },
    { title: '4. Affiliate Relationships', content: `TheFundedDiaries has affiliate relationships with some prop firms listed on our platform. We may earn a commission when you purchase through our links. This does not influence our trust scores or rankings, which are calculated using objective criteria.` },
    { title: '5. User Accounts', content: `You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials. You may not use another user's account or share your account with others.` },
    { title: '6. User Reviews', content: `Reviews submitted to TheFundedDiaries must be based on genuine personal experience. You may not submit false, misleading, or defamatory reviews. We reserve the right to remove reviews that violate our guidelines or these terms.` },
    { title: '7. Intellectual Property', content: `All content on TheFundedDiaries &mdash; including text, graphics, logos, and code &mdash; is owned by TheFundedDiaries or its licensors and protected by copyright law. You may not reproduce or distribute our content without written permission.` },
    { title: '8. Limitation of Liability', content: `TheFundedDiaries is not liable for any losses arising from your use of this platform or reliance on prop firm information. We are not responsible for the actions, policies, or financial stability of any prop firm listed on our platform.` },
    { title: '9. Governing Law', content: `These terms are governed by Romanian law. Any disputes shall be resolved in the courts of Romania. If you are an EU consumer, you retain any rights granted by the laws of your country of residence.` },
    { title: '10. Contact', content: `For questions about these terms, contact us at hello@thefundeddiaries.com.` },
  ]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Terms of Service</h1>
          <p style={{ fontSize: '14px', color: 'var(--t3)' }}>Last updated: July 2026 &middot; TheFundedDiaries.com</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {sections.map(s => (
            <div key={s.title}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>{s.title}</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}