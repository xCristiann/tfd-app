import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Our Story</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '16px' }}>About TheFundedDiaries</h1>
          <p style={{ fontSize: '16px', color: 'var(--t2)', lineHeight: 1.8 }}>
            TheFundedDiaries was built by a trader who was tired of biased prop firm comparison sites. Every other platform seemed to promote whoever paid the most &mdash; making it impossible to know which firm was genuinely the best.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {[
            { title: 'Our Mission', content: `To be the most transparent and trustworthy prop firm comparison platform. We verify every rule, every challenge, and every payout claim &mdash; and we show you exactly what commission we earn from each firm. No hidden agendas.` },
            { title: 'How We Work', content: `Every firm on TheFundedDiaries is manually reviewed. We check their official terms, cross-reference community reports, and calculate a Trust Score based on objective criteria: payout reliability, response speed, years active, and delayed payout reports. Firms cannot pay to improve their rankings.` },
            { title: 'Transparency First', content: `We earn affiliate commissions when you buy a challenge through our links. We publish these commissions openly. Our rankings are calculated independently of any commercial relationship. If a firm pays us 10% and scores 70/100, a firm paying us 5% but scoring 95/100 will rank higher. Always.` },
            { title: 'Contact', content: `Built and maintained by Cristian &middot; hello@thefundeddiaries.com &middot; thefundeddiaries.com` },
          ].map(s => (
            <div key={s.title} style={{ borderLeft: '3px solid var(--teal)', paddingLeft: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px' }}>{s.title}</h2>
              <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.8 }}>{s.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}