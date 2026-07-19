import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: `When you create an account on TheFundedDiaries, we collect your email address, name, and password (encrypted). We also collect usage data such as pages visited, firms viewed, and reviews submitted. We do not collect financial information or payment details.`
    },
    {
      title: '2. How We Use Your Information',
      content: `We use your information to: provide and improve our comparison platform, send you account-related emails (welcome, security notices), send newsletters if you opt in, and personalize your experience. We never sell your personal data to third parties.`
    },
    {
      title: '3. Affiliate Links & Commissions',
      content: `TheFundedDiaries uses affiliate links when directing users to prop firms. We may earn a commission when you purchase a challenge through our links. This does not affect our rankings or reviews, which are based solely on trust score criteria. We are transparent about commissions — see our Trust Score page for details.`
    },
    {
      title: '4. Cookies',
      content: `We use essential cookies to keep you logged in and remember your preferences. We do not use advertising cookies or sell cookie data. You can disable cookies in your browser settings, but this may affect platform functionality.`
    },
    {
      title: '5. Data Storage & Security',
      content: `Your data is stored securely using Supabase (EU region). All connections are encrypted via HTTPS. Passwords are hashed and never stored in plain text. We apply industry-standard security practices to protect your data.`
    },
    {
      title: '6. Third-Party Services',
      content: `We use Supabase for database and authentication, Vercel for hosting, and Resend for email delivery. These providers are GDPR-compliant. We may link to third-party prop firm websites — their privacy policies govern their data practices.`
    },
    {
      title: '7. Your Rights (GDPR)',
      content: `If you are in the EU/EEA, you have the right to: access your personal data, correct inaccurate data, request deletion of your account and data, withdraw consent at any time, and lodge a complaint with your local data protection authority. To exercise these rights, contact us at hello@thefundeddiaries.com.`
    },
    {
      title: '8. Data Retention',
      content: `We retain your account data for as long as your account is active. If you delete your account, we remove your personal data within 30 days. Anonymized usage data may be retained for analytics.`
    },
    {
      title: '9. Contact',
      content: `For privacy-related questions or requests, contact us at: hello@thefundeddiaries.com or through our Contact page.`
    },
  ]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Privacy Policy</h1>
          <p style={{ fontSize: '14px', color: 'var(--t3)' }}>Last updated: July 2026 · TheFundedDiaries.com</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {sections.map(s => (
            <div key={s.title}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px', color: 'var(--t1)' }}>{s.title}</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}