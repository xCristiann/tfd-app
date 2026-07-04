import { createAdminClient } from '@/lib/supabase/server'
import EmailComposer from '@/components/admin/EmailComposer'

export default async function AdminEmailPage() {
  const supabase = await createAdminClient()
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('email', 'is', null)
  const { data: logs } = await supabase.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(10)

  const FIRM_CONTACTS = [
    { firm: 'FTMO', type: 'Affiliate Portal', contact: 'https://ftmo.com/en/affiliate-programme/', note: 'Apply via portal' },
    { firm: 'The5ers', type: 'Affiliate Email', contact: 'affiliates@the5ers.com', note: '10% commission' },
    { firm: 'FundedNext', type: 'Affiliate Email', contact: 'affiliate@fundednext.com', note: 'Up to 15% commission' },
    { firm: 'FundingPips', type: 'Partnerships Email', contact: 'partners@fundingpips.com', note: '20% commission' },
    { firm: 'Alpha Capital', type: 'Support Email', contact: 'support@alphacapitalgroup.uk', note: 'Ask about affiliate' },
    { firm: 'Topstep', type: 'Affiliate Portal', contact: 'https://www.topstep.com/affiliates/', note: 'Apply via portal' },
    { firm: 'Apex Trader Funding', type: 'Affiliate Email', contact: 'affiliates@apextraderfunding.com', note: 'Strong promo program' },
    { firm: 'E8 Markets', type: 'Affiliate Email', contact: 'affiliate@e8markets.com', note: 'Good commission rates' },
    { firm: 'FXIFY', type: 'Partnerships Email', contact: 'partners@fxify.com', note: 'Active affiliate program' },
    { firm: 'Maven Trading', type: 'Support Email', contact: 'support@maventrading.com', note: 'Ask about affiliate' },
    { firm: 'Smart Prop Trader', type: 'Affiliate Email', contact: 'affiliate@smartproptrader.com', note: '25% commission' },
    { firm: 'Goat Funded Trader', type: 'Affiliate Email', contact: 'affiliates@goatfundedtrader.com', note: 'Frequent big promos' },
    { firm: 'Funded Trading Plus', type: 'Affiliate Email', contact: 'affiliates@fundedtradingplus.com', note: 'Up to 20% commission' },
    { firm: 'Hola Prime', type: 'Support Email', contact: 'support@holaprime.com', note: 'Ask about partnerships' },
    { firm: 'Blueberry Funded', type: 'Affiliate Email', contact: 'affiliate@blueberryfunded.com', note: 'Regulated broker backed' },
    { firm: 'BrightFunded', type: 'Partnerships Email', contact: 'partners@brightfunded.com', note: 'New firm, open to deals' },
    { firm: 'For Traders', type: 'Support Email', contact: 'support@fortraders.com', note: 'EU-regulated firm' },
    { firm: 'Moneta Funded', type: 'Affiliate Email', contact: 'affiliate@monetafunded.com', note: 'New firm, active' },
    { firm: 'The Trading Pit', type: 'Partnerships Email', contact: 'partners@thetradingpit.com', note: 'Liechtenstein-licensed' },
    { firm: 'Traders With Edge', type: 'Support Email', contact: 'support@traderswithededge.com', note: 'UK firm' },
    { firm: 'Audacity Capital', type: 'Support Email', contact: 'support@audacitycapital.co.uk', note: 'UK-based' },
    { firm: 'City Traders Imperium', type: 'Affiliate Email', contact: 'affiliates@citytraders.com', note: '20% commission' },
    { firm: 'DNA Funded', type: 'Affiliate Email', contact: 'affiliate@dnafunded.com', note: 'AU-based' },
    { firm: 'My Funded Futures', type: 'Support Email', contact: 'support@myfutures.com', note: 'Ask about partnerships' },
    // Unlisted / inactive
    { firm: 'True Forex Funds', type: 'N/A', contact: '—', note: 'Ceased operations' },
    { firm: 'My Forex Funds', type: 'N/A', contact: '—', note: 'CFTC lawsuit' },
  ]

  const typeColor = (type: string) => {
    if (type.includes('Affiliate Email')) return { bg: 'rgba(0,229,160,0.1)', color: 'var(--teal)', border: 'rgba(0,229,160,0.2)' }
    if (type.includes('Partnerships')) return { bg: 'rgba(167,139,250,0.1)', color: 'var(--violet)', border: 'rgba(167,139,250,0.2)' }
    if (type.includes('Portal')) return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    if (type === 'N/A') return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t3)', border: 'rgba(139,146,168,0.2)' }
    return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t2)', border: 'rgba(139,146,168,0.2)' }
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Email Manager</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Compose emails to users or reach out to prop firms for affiliates.</p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {['Compose', 'Firm Contacts', 'Sent History'].map((tab, i) => (
          <a key={tab} href={`?tab=${i}`} style={{
            padding: '10px 18px', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
            color: i === 0 ? 'var(--teal)' : 'var(--t2)',
            borderBottom: i === 0 ? '2px solid var(--teal)' : '2px solid transparent',
            marginBottom: '-1px'
          }}>
            {tab}
          </a>
        ))}
      </div>

      {/* COMPOSE */}
      <EmailComposer userCount={count || 0} />

      {/* FIRM CONTACTS TABLE */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800 }}>Firm Affiliate Contacts</h2>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{FIRM_CONTACTS.length} firms · click email to copy</div>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* HEADER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1.2fr', padding: '12px 20px', background: 'var(--bg2)', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
            <div>Firm</div>
            <div>Contact Type</div>
            <div>Email / Link</div>
            <div>Note</div>
          </div>

          {FIRM_CONTACTS.map((c, i) => {
            const tc = typeColor(c.type)
            const isEmail = c.contact.includes('@')
            const isUrl = c.contact.startsWith('http')
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr 1.2fr', padding: '13px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{c.firm}</div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                    {c.type}
                  </span>
                </div>
                <div>
                  {isEmail ? (
                    <a href={`mailto:${c.contact}`} style={{ color: 'var(--teal)', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: '12.5px', fontWeight: 600 }}>
                      {c.contact}
                    </a>
                  ) : isUrl ? (
                    <a href={c.contact} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--violet)', textDecoration: 'none', fontSize: '12.5px' }}>
                      Open portal →
                    </a>
                  ) : (
                    <span style={{ color: 'var(--t3)', fontSize: '12.5px' }}>{c.contact}</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{c.note}</div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--t3)', display: 'flex', gap: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--teal)' }} /> Affiliate Email — direct partnership
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--violet)' }} /> Partnerships — business contact
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--amber)' }} /> Portal — apply online
          </span>
        </div>
      </div>

      {/* SENT HISTORY */}
      {logs && logs.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Recent Sends</h2>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
              <div>Subject</div><div>Recipients</div><div>Status</div><div>Date</div>
            </div>
            {logs.map((log: any) => (
              <div key={log.id} style={{ padding: '13px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderTop: '1px solid var(--border)', fontSize: '13.5px', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</div>
                <div style={{ color: 'var(--t2)' }}>{log.recipients_count} sent</div>
                <div>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: log.status === 'sent' ? 'rgba(0,229,160,0.1)' : 'rgba(251,191,36,0.1)', color: log.status === 'sent' ? 'var(--teal)' : 'var(--amber)', border: `1px solid ${log.status === 'sent' ? 'rgba(0,229,160,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                    {log.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {new Date(log.sent_at).toLocaleDateString('en-GB')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
