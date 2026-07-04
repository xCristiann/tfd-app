import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// This endpoint is called daily by Vercel Cron
// Vercel cron config in vercel.json

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'tfd-cron-secret'
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const { data: jobs } = await admin
    .from('scraper_jobs')
    .select('*, firms(name, website)')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(10) // Process 10 firms per run to avoid timeouts

  if (!jobs?.length) return NextResponse.json({ message: 'No jobs to process' })

  const results = []
  for (const job of jobs) {
    try {
      const res = await fetch(job.check_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheFundedDiaries bot; +https://thefundeddiaries.com)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()
      // Take first 50KB for hashing (enough to detect changes)
      const excerpt = html.slice(0, 50000)
      const hash = crypto.createHash('md5').update(excerpt).digest('hex')
      const changed = job.last_content_hash && job.last_content_hash !== hash

      await admin.from('scraper_jobs').update({
        last_checked_at: new Date().toISOString(),
        last_content_hash: hash,
        status: changed ? 'changed' : 'ok',
        ...(changed ? { last_changed_at: new Date().toISOString(), changes_detected: { hash_diff: true, url: job.check_url } } : {}),
        error_message: null,
      }).eq('id', job.id)

      if (changed) {
        await admin.from('scraper_changes').insert({
          firm_id: job.firm_id,
          firm_slug: job.firm_slug,
          field_changed: 'website_content',
          old_value: job.last_content_hash,
          new_value: hash,
        })
      }
      results.push({ slug: job.firm_slug, status: changed ? 'CHANGED' : 'ok' })
    } catch (err: any) {
      await admin.from('scraper_jobs').update({ last_checked_at: new Date().toISOString(), status: 'error', error_message: err.message }).eq('id', job.id)
      results.push({ slug: job.firm_slug, status: 'error', error: err.message })
    }
  }
  return NextResponse.json({ processed: results.length, results })
}

// Admin can trigger manual scrape
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: p } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!p?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Reset all jobs to pending for fresh check
  await admin.from('scraper_jobs').update({ last_checked_at: null, status: 'pending' })
  return NextResponse.json({ message: 'All jobs reset. Next cron run will check all firms.' })
}