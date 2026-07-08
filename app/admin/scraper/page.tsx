'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminScraperPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [changes, setChanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [lastResult, setLastResult] = useState<any>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [j, c] = await Promise.all([
      supabase.from('scraper_jobs').select('*').order('status').order('firm_slug'),
      supabase.from('scraper_changes').select('*').eq('applied', false).order('detected_at', { ascending: false }).limit(20)
    ])
    setJobs(j.data || [])
    setChanges(c.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const trigger = async () => {
    setTriggering(true); setMsg(null); setLastResult(null)
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run: true }) // NOT reset:true
      })
      const data = await res.json()
      setLastResult(data)
      if (data.error) {
        setMsg({ text: `Error: ${data.error}`, ok: false })
      } else {
        const changed = (data.results || []).filter((r: any) => r.status === 'CHANGED').length
        const errors = (data.results || []).filter((r: any) => r.status === 'error').length
        setMsg({ text: `✓ Checked ${data.processed} firms — ${changed} changed, ${errors} errors`, ok: true })
      }
      await load()
    } catch (e: any) {
      setMsg({ text: `Error: ${e.message}`, ok: false })
    }
    setTriggering(false)
  }

  const reset = async () => {
    if (!confirm('Reset all hash data? Next trigger will re-baseline all firms.')) return
    setResetting(true)
    const res = await fetch('/api/scraper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: true })
    })
    const data = await res.json()
    setMsg({ text: data.message || 'Reset done', ok: true })
    await load()
    setResetting(false)
  }

  const markApplied = async (id: string) => {
    await supabase.from('scraper_changes').update({ applied: true, applied_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const statusColor = (s: string) => {
    if (s === 'ok') return { bg: 'rgba(0,229,160,0.1)', color: 'var(--teal)', border: 'rgba(0,229,160,0.2)' }
    if (s === 'changed') return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    if (s === 'error') return { bg: 'rgba(248,113,113,0.1)', color: 'var(--coral)', border: 'rgba(248,113,113,0.2)' }
    return { bg: 'rgba(139,146,168,0.1)', color: 'var(--t3)', border: 'rgba(139,146,168,0.2)' }
  }

  const stats = {
    ok: jobs.filter(j => j.status === 'ok').length,
    changed: jobs.filter(j => j.status === 'changed').length,
    error: jobs.filter(j => j.status === 'error').length,
    pending: jobs.filter(j => j.status === 'pending').length,
  }

  const totalChecked = jobs.filter(j => j.last_checked_at).length
  const totalJobs = jobs.length

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Firm Data Monitor</h1>
          <p style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.6 }}>
            Checks 5 firms per trigger. Progress: <b style={{ color: 'var(--teal)' }}>{totalChecked}/{totalJobs}</b> firms checked.<br/>
            Click "Check Next 5" repeatedly until all firms show OK status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={reset} disabled={resetting || triggering}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border2)', color: 'var(--t2)', background: 'var(--bg2)', fontFamily: 'Inter, sans-serif' }}>
            {resetting ? 'Resetting...' : 'Reset Hashes'}
          </button>
          <button onClick={trigger} disabled={triggering || resetting}
            style={{ padding: '9px 20px', borderRadius: '9px', background: triggering ? 'var(--bg2)' : 'var(--teal)', color: triggering ? 'var(--t2)' : '#04120c', fontSize: '13.5px', fontWeight: 700, border: 'none', cursor: triggering ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: triggering ? 'none' : '0 0 16px var(--teal-glow)', minWidth: '160px' }}>
            {triggering ? '⏳ Checking...' : '▶ Check Next 5 Firms'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? 'rgba(0,229,160,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${msg.ok ? 'rgba(0,229,160,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: '9px', padding: '10px 16px', marginBottom: '16px', fontSize: '13.5px', color: msg.ok ? 'var(--teal)' : 'var(--coral)', fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Last result detail */}
      {lastResult?.results && (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Last Check Results</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {lastResult.results.map((r: any, i: number) => {
              const sc = statusColor(r.status === 'CHANGED' ? 'changed' : r.status)
              return (
                <div key={i} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontFamily: 'JetBrains Mono, monospace' }}>
                  {r.slug} {r.status === 'error' ? `(${r.error?.slice(0,20)})` : ''}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'OK', count: stats.ok, color: 'var(--teal)' },
          { label: 'Changed ⚠️', count: stats.changed, color: 'var(--amber)' },
          { label: 'Errors', count: stats.error, color: 'var(--coral)' },
          { label: 'Pending', count: stats.pending, color: 'var(--t3)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending changes alert */}
      {changes.length > 0 && (
        <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: '10px' }}>⚠️ {changes.length} website change{changes.length > 1 ? 's' : ''} detected — verify manually in Manage Firms</div>
          {changes.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(251,191,36,0.1)' }}>
              <div style={{ fontSize: '13px' }}>
                <b style={{ color: 'var(--t1)' }}>{c.firm_slug}</b>
                <span style={{ color: 'var(--t3)', marginLeft: '8px' }}>changed on {new Date(c.detected_at).toLocaleDateString('en-GB')}</span>
              </div>
              <button onClick={() => markApplied(c.id)}
                style={{ fontSize: '11.5px', fontWeight: 600, padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(0,229,160,0.1)', color: 'var(--teal)', fontFamily: 'Inter, sans-serif' }}>
                Mark reviewed ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Jobs table */}
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg2)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1.2fr 2.5fr 90px 1fr 1fr', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)', gap: '12px' }}>
          <div>Firm</div><div>URL</div><div>Status</div><div>Last Checked</div><div>Last Changed</div>
        </div>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--t2)' }}>Loading...</div>
        ) : jobs.map(job => {
          const sc = statusColor(job.status)
          return (
            <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.5fr 90px 1fr 1fr', padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '13px', gap: '12px', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>{job.firm_slug}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.check_url}</div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                  {job.status}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
                {job.last_checked_at
                  ? new Date(job.last_checked_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : 'Never'}
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