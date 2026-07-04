'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Main', items: [
    { href: '/admin', label: 'Dashboard', icon: '▣' },
  ]},
  { label: 'Content', items: [
    { href: '/admin/firms', label: 'Manage Firms', icon: '🏦' },
    { href: '/admin/firms/new', label: 'Add New Firm', icon: '＋' },
    { href: '/admin/challenges', label: 'Challenges Builder', icon: '✦' },
    { href: '/admin/rules', label: 'Rules Manager', icon: '≡' },
  ]},
  { label: 'Community', items: [
    { href: '/admin/reviews', label: 'Reviews & Comments', icon: '💬' },
    { href: '/admin/coins', label: 'Coins & Prizes', icon: '🪙' },
  ]},
  { label: 'Marketing', items: [
    { href: '/admin/email', label: 'Email Manager', icon: '📧' },
  ]},
  { label: 'System', items: [
    { href: '/admin/scraper', label: 'Firm Data Monitor', icon: '🔍' },
  ]},
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <div style={{ background: 'var(--bg1)', borderRight: '1px solid var(--border)', padding: '24px 0', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/><path d="M9 12h6M12 9v6" stroke="#04120c" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-.02em' }}>TFD <span style={{ color: 'var(--teal)' }}>Admin</span></span>
      </div>
      {navItems.map(section => (
        <div key={section.label}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '12px 20px 6px' }}>{section.label}</div>
          {section.items.map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', fontSize: '13.5px', color: isActive(item.href) ? 'var(--teal)' : 'var(--t2)', background: isActive(item.href) ? 'rgba(0,229,160,0.07)' : 'transparent', textDecoration: 'none', transition: 'all .15s' }}>
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '16px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', fontSize: '13.5px', color: 'var(--t2)', textDecoration: 'none' }}>
          ← Back to Site
        </Link>
      </div>
    </div>
  )
}