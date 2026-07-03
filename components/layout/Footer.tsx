import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function Footer() {
  const sections = [
    {
      title: 'Prop Firms',
      links: [
        { label: 'All Prop Firms', href: '/firms' },
        { label: 'Compare Challenges', href: '/firms' },
        { label: 'Offers & Discounts', href: '/offers' },
        { label: 'Prop Firm Rules', href: '/firms' },
        { label: 'Reviews', href: '/firms' },
        { label: 'Unlisted Firms', href: '/unlisted-firms' },
      ]
    },
    {
      title: 'Tools',
      links: [
        { label: 'Matching Calculator', href: '/calculator' },
        { label: 'Forex Firms', href: '/firms?market=forex' },
        { label: 'Futures Firms', href: '/firms?market=futures' },
        { label: 'Crypto Firms', href: '/firms?market=crypto' },
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'How Trust Score Works', href: '/trust-score' },
        { label: 'Offers & Promo Codes', href: '/offers' },
        { label: 'Calculator', href: '/calculator' },
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Affiliate Program', href: '/affiliate' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
      ]
    },
  ]

  return (
    <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '56px', marginTop: '80px', background: 'var(--bg1)' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px repeat(4, 1fr)', gap: '40px', marginBottom: '48px' }}>

          {/* BRAND */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <TFDLogo size={28} />
              <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)' }}>
                TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.7, marginBottom: '20px' }}>
              Independent prop firm comparison. Verified rules, transparent data, real trader reviews.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['X', 'TG', 'DC'].map(s => (
                <div key={s} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--t3)', cursor: 'pointer' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* LINK SECTIONS */}
          {sections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '16px' }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.links.map(link => (
                  <Link key={link.label} href={link.href} style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none', transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border)', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
            © 2026 TheFundedDiaries · Independent prop firm comparison · Not financial advice
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/privacy" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Terms</Link>
            <Link href="/contact" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}