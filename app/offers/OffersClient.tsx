'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import type { Firm } from '@/types'

function FirmLogo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <div style={{
      width: '48px', height: '48px', borderRadius: '12px',
      background: '#fff', border: '1px solid var(--border2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, position: 'relative', overflow: 'hidden'
    }}>
      <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 800, color: '#222', fontFamily: 'JetBrains Mono, monospace' }}>
        {name.slice(0, 2).toUpperCase()}
      </span>
      {logoUrl && (
        <img src={logoUrl} alt={name} width={32} height={32}
          style={{ width: '32px', height: '32px', objectFit: 'contain', position: 'relative', zIndex: 1, background: '#fff' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }} />
      )}
    </div>
  )
}

export default function OffersClient() {
  const [firms, setFirms] = useState<(Firm & { logo_url?: string; promo_discount?: string; promo_label?: string; review_count?: number; rating?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('firms')
      .select('*')
      .eq('is_published', true)
      .not('promo_discount', 'is', null)
      .order('trust_score', { ascending: false })
      .then(({ data }) => {
        setFirms(data || [])
        setLoading(false)
      })
  }, [])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 32px 80px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>
            Discount Codes
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>
            Active Offers
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
            {firms.length} verified discount codes · updated regularly · apply directly at checkout
          </p>
        </div>

        {/* OFFERS LIST */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)' }}>Loading offers...</div>
        ) : firms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)' }}>No active offers right now — check back soon.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {firms.map(firm => (
              <div
                key={firm.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto',
                  alignItems: 'stretch',
                  background: 'var(--bg1)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(167,139,250,0.05)',
                }}
              >
                {/* DISCOUNT BADGE */}
                <div style={{
                  background: 'linear-gradient(135deg,#ec4899,var(--violet))',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '16px', position: 'relative'
                }}>
                  {firm.promo_label && (
                    <div style={{
                      position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
                      fontSize: '8px', fontWeight: 800, color: '#fff',
                      background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: '100px',
                      letterSpacing: '.04em', whiteSpace: 'nowrap'
                    }}>
                      ✦ {firm.promo_label}
                    </div>
                  )}
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#fff', marginTop: firm.promo_label ? '14px' : '0', lineHeight: 1 }}>
                    {firm.promo_discount?.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                    {firm.promo_discount?.split(' ').slice(1).join(' ')}
                  </div>
                </div>

                {/* MAIN INFO */}
                <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '1px solid var(--border)', minWidth: 0 }}>
                  <FirmLogo name={firm.name} logoUrl={firm.logo_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{firm.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(167,139,250,0.3)', fontSize: '11.5px', fontWeight: 700, color: 'var(--violet)' }}>
                        {(firm.rating || 4).toFixed(1)} <span style={{ color: 'var(--amber)' }}>★</span>
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--t3)' }}>{(firm.review_count || 0).toLocaleString()} reviews</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.5 }}>
                      {firm.short_description || `${firm.promo_discount} on all accounts — first order only`}
                    </div>
                  </div>
                </div>

                {/* CODE + APPLY */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', borderLeft: '1px solid var(--border)', minWidth: '180px' }}>
                  {firm.discount_code && (
                    <button
                      onClick={() => copyCode(firm.discount_code!)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 14px', borderRadius: '100px',
                        border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>Code</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--violet)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {copiedCode === firm.discount_code ? 'Copied!' : firm.discount_code}
                      </span>
                    </button>
                  )}
                  <a
                    href={firm.affiliate_link || firm.website || '#'}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'block', textAlign: 'center', width: '100%',
                      padding: '10px 24px', borderRadius: '100px',
                      background: 'linear-gradient(135deg,#ec4899,var(--violet))',
                      color: '#fff', fontSize: '13.5px', fontWeight: 800, textDecoration: 'none',
                      boxShadow: '0 4px 16px rgba(167,139,250,0.25)'
                    }}
                  >
                    Apply →
                  </a>
                  <Link href={`/firms/${firm.slug}`} style={{ fontSize: '11.5px', color: 'var(--t3)', textDecoration: 'none' }}>
                    View firm details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
