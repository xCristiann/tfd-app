import { createAdminClient } from '@/lib/supabase/server'
import EmailComposer from '@/components/admin/EmailComposer'

export default async function AdminEmailPage() {
  const supabase = await createAdminClient()
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('email', 'is', null)
  const { data: logs } = await supabase.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(10)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Email Manager</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--t2)' }}>Compose and send emails to your users using custom templates.</p>
      </div>

      <EmailComposer userCount={count || 0} />

      {/* EMAIL HISTORY */}
      {logs && logs.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Recent Sends</h3>
          <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
              <div>Subject</div><div>Recipients</div><div>Status</div><div>Date</div>
            </div>
            {logs.map((log: any) => (
              <div key={log.id} style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', borderTop: '1px solid var(--border)', fontSize: '13.5px', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>{log.subject}</div>
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
