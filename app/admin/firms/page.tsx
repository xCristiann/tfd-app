import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminFirmsPage() {
  const admin = await createAdminClient()
  
  const { data: firms, error } = await admin
    .from('firms')
    .select('id, name, slug, is_published, trust_score, country_code, promo_discount, logo_url, markets_forex, markets_futures, markets_crypto')
    .order('name', { ascending: true })

  if (error) {
    return <div style={{ padding: '20px', color: 'var(--coral)' }}>Error loading firms: {error.message}</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Manage Firms</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>{firms?.length || 0} firms total in database</p>
        </div>
        <Link href="/admin/firms/new" style={{ padding: '10px 20px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 16px var(--teal-glow)' }}>
          + Add New Firm
        </Link>
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '40px 2fr 80px 80px 80px 100px 120px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px', alignItems: 'center' }}>
          <div>Logo</div>
          <div>Firm</div>
          <div>Status</div>
          <div>Trust</div>
          <div>Markets</div>
          <div>Promo</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {(firms || []).map(firm => (
          <div key={firm.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 80px 80px 80px 100px 120px', padding: '14px 20px', borderTop: '1px solid var(--border)', gap: '12px', alignItems: 'center' }}>
            
            {/* LOGO */}
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
              {firm.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firm.logo_url} alt={firm.name} width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {firm.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* NAME */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{firm.name}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>{firm.slug}</div>
            </div>

            {/* STATUS */}
            <div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: firm.is_published ? 'rgba(0,229,160,0.1)' : 'rgba(139,146,168,0.1)', color: firm.is_published ? 'var(--teal)' : 'var(--t3)', border: `1px solid ${firm.is_published ? 'rgba(0,229,160,0.2)' : 'rgba(139,146,168,0.2)'}` }}>
                {firm.is_published ? 'Live' : 'Draft'}
              </span>
            </div>

            {/* TRUST SCORE */}
            <div style={{ fontSize: '14px', fontWeight: 800, color: (firm.trust_score || 0) >= 80 ? 'var(--green)' : (firm.trust_score || 0) >= 60 ? 'var(--amber)' : 'var(--t3)' }}>
              {firm.trust_score || 0}<span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 400 }}>/100</span>
            </div>

            {/* MARKETS */}
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
              {firm.markets_forex && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: 'rgba(0,229,160,0.1)', color: 'var(--teal)' }}>FX</span>}
              {firm.markets_futures && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>FUT</span>}
              {firm.markets_crypto && <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: 'rgba(167,139,250,0.1)', color: 'var(--violet)' }}>CRYPTO</span>}
            </div>

            {/* PROMO */}
            <div style={{ fontSize: '12px', color: firm.promo_discount ? 'var(--amber)' : 'var(--t3)', fontWeight: firm.promo_discount ? 700 : 400 }}>
              {firm.promo_discount || '—'}
            </div>

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <Link href={`/admin/firms/${firm.id}`} style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', border: '1px solid var(--border2)', color: 'var(--t1)', background: 'var(--bg2)' }}>
                Edit
              </Link>
              <Link href={`/firms/${firm.slug}`} target="_blank" style={{ padding: '6px 14px', borderRadius: '7px', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(0,229,160,0.2)', color: 'var(--teal)', background: 'rgba(0,229,160,0.06)' }}>
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}