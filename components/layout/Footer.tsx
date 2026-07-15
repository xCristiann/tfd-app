import Link from 'next/link'
import { TFDLogo } from '@/components/ui/TFDLogo'

export default function Footer() {
  const sections = [
    {
      title: 'Prop Firms',
      links: [
        { label: 'All Prop Firms', href: '/' },
        { label: 'Best Sellers', href: '/best-sellers' },
        { label: 'Compare Firms (vs)', href: '/compare' },
        { label: 'Offers & Discounts', href: '/offers' },
        { label: 'Unlisted Firms', href: '/unlisted-firms' },
      ]
    },
    {
      title: 'Research',
      links: [
        { label: 'Prop Firm Rules', href: '/prop-firm-rules' },
        { label: 'Spreads & Instruments', href: '/spreads' },
        { label: 'Payout Tracker', href: '/payouts' },
        { label: 'Trader Reviews', href: '/reviews' },
        { label: 'Trust Score Explained', href: '/trust-score' },
      ]
    },
    {
      title: 'Tools',
      links: [
        { label: 'Matching Calculator', href: '/calculator' },
        { label: 'Forex Firms', href: '/?market=forex' },
        { label: 'Futures Firms', href: '/?market=futures' },
        { label: 'Crypto Firms', href: '/?market=crypto' },
        { label: 'TFD Coins & Prizes', href: '/coins' },
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
        <div style={{ display: 'grid', gridTemplateColumns: '260px repeat(4, 1fr)', gap: '40px', marginBottom: '48px' }}>

          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
              <TFDLogo size={40} />
              <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)' }}>
                TheFunded<span style={{ color: 'var(--teal)' }}>Diaries</span>
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.7, marginBottom: '16px' }}>
              Independent prop firm comparison. Verified rules, transparent data, real trader reviews.
            </p>
            <div style={{ fontSize: '11px', color: 'var(--t3)', padding: '8px 12px', background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px', lineHeight: 1.5 }}>
              🔒 100% Independent · No paid rankings
            </div>
          </div>

          {sections.map(section => (
            <div key={section.title}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '16px' }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.links.map(link => (
                  <Link key={link.label} href={link.href} style={{ fontSize: '13px', color: 'var(--t3)', textDecoration: 'none' }}>
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
            <Link href="/affiliate" style={{ fontSize: '12px', color: 'var(--t3)', textDecoration: 'none' }}>Affiliate</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}