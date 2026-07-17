import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

export default function AffiliatePage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Partnership</div>
          <h1 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '14px' }}>Affiliate Program</h1>
          <p style={{ fontSize: '16px', color: 'var(--t2)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}>
            Are you a content creator, trader educator, or trading community owner? Partner with TheFundedDiaries and earn commissions for every trader you refer.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '48px' }}>
          {[
            { title: 'Up to 30%', sub: 'Commission on referrals', desc: 'Earn up to 30% on every challenge purchase made through your referral link.' },
            { title: '90 Days', sub: 'Cookie duration', desc: 'Long cookie window means you earn even if the trader takes time to decide.' },
            { title: 'Monthly', sub: 'Payouts', desc: 'Reliable monthly payouts via bank transfer, PayPal, or crypto.' },
          ].map(c => (
            <div key={c.title} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--teal)', marginBottom: '4px' }}>{c.title}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', marginBottom: '10px' }}>{c.sub}</div>
              <div style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>How It Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { step: '1', title: 'Apply', desc: 'Contact us at partners@thefundeddiaries.com with your platform details and audience size.' },
              { step: '2', title: 'Get Your Link', desc: 'We set you up with a unique tracking link and dashboard to monitor your referrals.' },
              { step: '3', title: 'Promote', desc: 'Share our platform with your audience. We have banners, comparison tools, and content you can use.' },
              { step: '4', title: 'Earn', desc: 'Get paid monthly for every trader who signs up and purchases a challenge through your link.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal)', color: '#04120c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,rgba(0,229,160,0.08),rgba(124,58,237,0.08))', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '10px' }}>Ready to Partner?</h2>
          <p style={{ fontSize: '15px', color: 'var(--t2)', marginBottom: '24px' }}>Send us an email and we will get back to you within 24 hours.</p>
          <a href="mailto:partners@thefundeddiaries.com" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: '10px', background: 'var(--teal)', color: '#04120c', fontSize: '15px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 0 24px var(--teal-glow)' }}>
            Apply Now &rarr;
          </a>
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--t3)' }}>partners@thefundeddiaries.com</div>
        </div>
      </main>
      <Footer />
    </>
  )
}