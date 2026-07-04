import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminScraperPage() {
  const admin = await createAdminClient()
  const { data: jobs } = await admin.from('scraper_jobs').select('*').order('last_checked_at', { ascending: false, nullsFirst: false })
  const { data: changes } = await admin.from('scraper_changes').select('*').eq('applied', false).order('detected_at', { ascending: false }).limit(20)

  const statusColor = (s: string) => {
    if (s === 'ok') return { bg: 'rgba(0,229,160,0.1)', color: 'var(--teal)', border: 'rgba(0,229,160,0.2)' }
    if (s === 'changed') return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    if (s === 'error') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)' }
    return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t3)', border: 'rgba(139,146,168,0.2)' }
  }

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Firm Data Monitor</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Auto-scraper checks all firm websites daily at 6:00 AM UTC.</p>
        </div>
        <form action="/api/scraper" method="POST">
          <button type="submit" style={{ padding: '9px 18px', borderRadius: '9px', background: 'var(--teal)', color: '#04120c', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Trigger Manual Check
          </button>
        </form>
      </div>

      {(changes?.length || 0) > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: '10px' }}>⚠️ {changes?.length} pending changes detected — review and apply manually</div>
          {changes?.map(c => (
            <div key={c.id} style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '4px' }}>
              <b style={{ color: 'var(--t1)' }}>{c.firm_slug}</b> — {c.field_changed} changed on {new Date(c.detected_at).toLocaleDateString('en-GB')}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
          <div>Firm</div><div>URL</div><div>Status</div><div>Last Checked</div><div>Last Changed</div>
        </div>
        {(jobs || []).map(job => {
          const sc = statusColor(job.status)
          return (
            <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr', padding: '13px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', gap: '12px', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{job.firm_slug}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.check_url}</div>
              <div><span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{job.status}</span></div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                {job.last_checked_at ? new Date(job.last_checked_at).toLocaleDateString('en-GB') : 'Never'}
              </div>
              <div style={{ fontSize: '11.5px', color: job.last_changed_at ? 'var(--amber)' : 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                {job.last_changed_at ? new Date(job.last_changed_at).toLocaleDateString('en-GB') : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}