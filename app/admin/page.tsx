import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const admin = await createAdminClient()

  const [firmsRes, usersRes, reviewsRes, redemptionsRes, changesRes] = await Promise.all([
    admin.from('firms').select('id, is_published'),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('reviews').select('id, status'),
    admin.from('coin_redemptions').select('id, status'),
    admin.from('scraper_changes').select('id').eq('applied', false),
  ])

  const totalFirms = firmsRes.data?.length || 0
  const publishedFirms = (firmsRes.data || []).filter(f => f.is_published).length
  const totalUsers = usersRes.count || 0
  const pendingReviews = (reviewsRes.data || []).filter(r => r.status === 'pending').length
  const pendingRedemptions = (redemptionsRes.data || []).filter(r => r.status === 'pending').length
  const pendingChanges = changesRes.data?.length || 0

  const stats = [
    { label: 'Live Firms', value: publishedFirms, sub: totalFirms + ' total', href: '/admin/firms', color: 'var(--teal)' },
    { label: 'Registered Users', value: totalUsers, sub: 'Total accounts', href: '/admin/firms', color: 'var(--violet)' },
    { label: 'Pending Reviews', value: pendingReviews, sub: 'Need approval', href: '/admin/reviews', color: pendingReviews > 0 ? 'var(--amber)' : 'var(--teal)' },
    { label: 'Pending Redemptions', value: pendingRedemptions, sub: 'Coins shop orders', href: '/admin/coins', color: pendingRedemptions > 0 ? 'var(--amber)' : 'var(--teal)' },
    { label: 'Site Changes', value: pendingChanges, sub: 'From scraper', href: '/admin/scraper', color: pendingChanges > 0 ? 'var(--coral)' : 'var(--teal)' },
  ]

  const quickLinks = [
    { label: 'Add New Firm', href: '/admin/firms/new', desc: 'Create a new prop firm listing' },
    { label: 'Send Email Blast', href: '/admin/email', desc: 'Email all users or affiliate firms' },
    { label: 'Approve Reviews', href: '/admin/reviews', desc: pendingReviews + ' review(s) waiting' },
    { label: 'Grant Coins', href: '/admin/coins', desc: 'Manage user coins and prizes' },
    { label: 'Check Scraper', href: '/admin/scraper', desc: pendingChanges + ' change(s) detected' },
    { label: 'Manage Prizes', href: '/admin/coins', desc: 'Add or edit coin prizes' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Admin Dashboard</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>TheFundedDiaries CRM</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '32px' }}>
        {stats.map(s => (
          <Link key={s.label} href={s.href} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'block' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{s.sub}</div>
          </Link>
        ))}
      </div>
      <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
        {quickLinks.map(l => (
          <Link key={l.label} href={l.href} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{l.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{l.desc}</div>
            </div>
            <span style={{ color: 'var(--teal)', fontSize: '18px' }}>&rarr;</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
