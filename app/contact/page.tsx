import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '56px 40px 80px', textAlign: 'center' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Get in touch</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Contact Us</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>We respond within 24 hours on business days.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px', textAlign: 'left' }}>
          {[
            { icon: '📧', label: 'General Enquiries', email: 'hello@thefundeddiaries.com', desc: 'Questions about the platform' },
            { icon: '🤝', label: 'Partnerships & Affiliates', email: 'partners@thefundeddiaries.com', desc: 'Firm partnerships and affiliate programs' },
            { icon: '🛠', label: 'Support', email: 'support@thefundeddiaries.com', desc: 'Account or technical issues' },
            { icon: '⚠️', label: 'Report an Error', email: 'hello@thefundeddiaries.com', desc: 'Incorrect firm data or rules' },
          ].map(c => (
            <a key={c.email} href={`mailto:${c.email}`} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textDecoration: 'none', transition: 'border-color .15s', display: 'block' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>{c.label}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--teal)', marginBottom: '6px', fontFamily: 'JetBrains Mono, monospace' }}>{c.email}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{c.desc}</div>
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}