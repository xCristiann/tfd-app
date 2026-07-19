'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface FirmFormProps {
  firm?: any
  isEdit?: boolean
}

export default function FirmForm({ firm, isEdit = false }: FirmFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [data, setData] = useState({
    name: firm?.name || '',
    slug: firm?.slug || '',
    website: firm?.website || '',
    affiliate_link: firm?.affiliate_link || '',
    discount_code: firm?.discount_code || '',
    short_description: firm?.short_description || '',
    founded_year: firm?.founded_year?.toString() || '',
    headquarters: firm?.headquarters || '',
    country_code: firm?.country_code || '',
    max_allocation: firm?.max_allocation?.toString() || '',
    promo_discount: firm?.promo_discount || '',
    promo_label: firm?.promo_label || '',
    years_active: firm?.years_active?.toString() || '',
    platforms: (firm?.platforms || []).join(', '),
    payout_reliability: firm?.payout_reliability || 'Confirmed',
    avg_payout_days: firm?.avg_payout_days?.toString() || '',
    support_quality: firm?.support_quality || 'Medium',
    delayed_payout_reports: firm?.delayed_payout_reports?.toString() || '0',
    rules_clarity: firm?.rules_clarity || 'Clear',
    markets_forex: firm?.markets_forex ?? true,
    markets_futures: firm?.markets_futures ?? false,
    markets_crypto: firm?.markets_crypto ?? false,
    markets_indices: firm?.markets_indices ?? false,
    markets_metals: firm?.markets_metals ?? false,
    markets_commodities: firm?.markets_commodities ?? false,
    accepts_eu: firm?.accepts_eu ?? true,
    is_published: firm?.is_published ?? false,
    is_featured: firm?.is_featured ?? false,
    logo_url: firm?.logo_url || '',
  })

  const set = (k: string, v: any) => setData(d => ({ ...d, [k]: v }))

  const handleSubmit = async () => {
    if (!data.name || !data.slug) { setMsg('Name and slug are required'); return }
    setLoading(true); setMsg('')

    const payload = {
      name: data.name,
      slug: data.slug,
      website: data.website || null,
      affiliate_link: data.affiliate_link || null,
      discount_code: data.discount_code || null,
      short_description: data.short_description || null,
      founded_year: data.founded_year ? parseInt(data.founded_year) : null,
      headquarters: data.headquarters || null,
      country_code: data.country_code || null,
      max_allocation: data.max_allocation ? parseInt(data.max_allocation) : null,
      promo_discount: data.promo_discount || null,
      promo_label: data.promo_label || null,
      years_active: data.years_active ? parseInt(data.years_active) : null,
      platforms: data.platforms ? data.platforms.split(',').map((p: string) => p.trim()).filter(Boolean) : [],
      payout_reliability: data.payout_reliability,
      avg_payout_days: data.avg_payout_days ? parseInt(data.avg_payout_days) : null,
      support_quality: data.support_quality,
      delayed_payout_reports: data.delayed_payout_reports ? parseInt(data.delayed_payout_reports) : 0,
      rules_clarity: data.rules_clarity,
      markets_forex: data.markets_forex,
      markets_futures: data.markets_futures,
      markets_crypto: data.markets_crypto,
      markets_indices: data.markets_indices,
      markets_metals: data.markets_metals,
      markets_commodities: data.markets_commodities,
      accepts_eu: data.accepts_eu,
      is_published: data.is_published,
      is_featured: data.is_featured,
      logo_url: data.logo_url || null,
      // promo_discount_value extracted from promo_discount
      promo_discount_value: data.promo_discount ? parseInt(data.promo_discount.replace(/[^0-9]/g, '')) || 0 : 0,
    }

    let error
    if (isEdit && firm?.id) {
      const res = await supabase.from('firms').update(payload).eq('id', firm.id)
      error = res.error
    } else {
      const res = await supabase.from('firms').insert(payload)
      error = res.error
    }

    if (error) {
      setMsg(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    setMsg(isEdit ? '&#10003; Firm updated successfully' : '&#10003; Firm created successfully')
    setLoading(false)
    setTimeout(() => router.push('/admin/firms'), 1000)
  }

  const inp = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      <input type={type} value={(data as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )

  const sel = (label: string, key: string, options: string[]) => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      <select value={(data as any)[key]} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  const chk = (label: string, key: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--t1)' }}>
      <input type="checkbox" checked={(data as any)[key]} onChange={e => set(key, e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: 'var(--teal)', cursor: 'pointer' }} />
      {label}
    </label>
  )

  const panel = (title: string, children: React.ReactNode) => (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>{title}</h3>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: '800px' }}>
      {msg && (
        <div style={{ background: msg.startsWith('&#10003;') ? 'rgba(0,229,160,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${msg.startsWith('&#10003;') ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '9px', padding: '12px 16px', marginBottom: '16px', fontSize: '13.5px', color: msg.startsWith('&#10003;') ? 'var(--teal)' : 'var(--coral)', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* TRUST SCORE &mdash; read only from DB */}
      {isEdit && (
        <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Trust Score (Auto-calculated)</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)' }}>Calculated from: payout reliability, speed, years active, delayed reports, support quality, rules clarity, rating</div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>
            {firm?.trust_score || 0}<span style={{ fontSize: '14px', color: 'var(--t3)' }}>/100</span>
          </div>
        </div>
      )}

      {panel('Basic Info', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {inp('Firm Name *', 'name', 'text', 'e.g. FTMO')}
          {inp('Slug *', 'slug', 'text', 'e.g. ftmo')}
          {inp('Website', 'website', 'url', 'https://...')}
          {inp('Affiliate Link', 'affiliate_link', 'url', 'https://...')}
          {inp('Discount Code', 'discount_code', 'text', 'e.g. DIARIES')}
          {inp('Country Code', 'country_code', 'text', 'e.g. CZ, GB, US')}
          {inp('Founded Year', 'founded_year', 'number', '2020')}
          {inp('Headquarters', 'headquarters', 'text', 'e.g. Prague, CZ')}
          {inp('Logo URL', 'logo_url', 'url', 'https://...')}
          {inp('Max Allocation ($)', 'max_allocation', 'number', '2000000')}
        </div>
      ))}

      {panel('Description & Promo', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Short Description</label>
            <textarea value={data.short_description} onChange={e => set('short_description', e.target.value)} rows={2}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--t1)', fontSize: '13.5px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          {inp('Promo Discount', 'promo_discount', 'text', 'e.g. 25% OFF')}
          {inp('Promo Label', 'promo_label', 'text', 'e.g. HOT, NEW, LIMITED')}
        </div>
      ))}

      {panel('Trust Score Factors (affect auto-calculation)', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {sel('Payout Reliability', 'payout_reliability', ['Confirmed', 'Unknown', 'Reported issues'])}
          {inp('Avg Payout Days', 'avg_payout_days', 'number', '3')}
          {sel('Support Quality', 'support_quality', ['Fast', 'Medium', 'Slow'])}
          {sel('Rules Clarity', 'rules_clarity', ['Clear', 'Ambiguous', 'Unclear'])}
          {inp('Years Active', 'years_active', 'number', '3')}
          {inp('Delayed Payout Reports', 'delayed_payout_reports', 'number', '0')}
        </div>
      ))}

      {panel('Markets', (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
          {chk('Forex', 'markets_forex')}
          {chk('Futures', 'markets_futures')}
          {chk('Crypto', 'markets_crypto')}
          {chk('Indices', 'markets_indices')}
          {chk('Metals', 'markets_metals')}
          {chk('Commodities', 'markets_commodities')}
        </div>
      ))}

      {panel('Settings', (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chk('Published (visible on site)', 'is_published')}
            {chk('Featured firm', 'is_featured')}
            {chk('Accepts EU traders', 'accepts_eu')}
          </div>
          <div>
            {inp('Platforms (comma separated)', 'platforms', 'text', 'MT4, MT5, cTrader')}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => router.push('/admin/firms')} style={{ padding: '11px 20px', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border2)', color: 'var(--t2)', background: 'transparent', fontFamily: 'Inter, sans-serif' }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '11px 24px', borderRadius: '9px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', border: 'none', color: '#04120c', background: 'var(--teal)', boxShadow: '0 0 20px var(--teal-glow)', fontFamily: 'Inter, sans-serif', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving...' : isEdit ? 'Update Firm &rarr;' : 'Create Firm &rarr;'}
        </button>
      </div>
    </div>
  )
}