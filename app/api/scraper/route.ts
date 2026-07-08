import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const maxDuration = 60

// GET = Vercel Cron calls this daily
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return await runScraper()
}

// POST = Admin manual trigger or reset
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))

  if (body.reset) {
    await admin.from('scraper_jobs').update({
      last_checked_at: null,
      status: 'pending',
      last_content_hash: null
    })
    return NextResponse.json({ message: 'All jobs reset to pending' })
  }

  // Default: run scraper now
  return await runScraper()
}

async function runScraper() {
  const admin = await createAdminClient()

  const { data: jobs } = await admin
    .from('scraper_jobs')
    .select('*')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(5)

  if (!jobs?.length) {
    return NextResponse.json({ message: 'No jobs to process' })
  }

  const results = []

  for (const job of jobs) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const res = await fetch(job.check_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const html = await res.text()
      const excerpt = html.slice(0, 80000)
      const hash = crypto.createHash('sha256').update(excerpt).digest('hex')
      const changed = job.last_content_hash && job.last_content_hash !== hash

      await admin.from('scraper_jobs').update({
        last_checked_at: new Date().toISOString(),
        last_content_hash: hash,
        status: changed ? 'changed' : 'ok',
        error_message: null,
        ...(changed ? { last_changed_at: new Date().toISOString() } : {}),
      }).eq('id', job.id)

      if (changed) {
        await admin.from('scraper_changes').insert({
          firm_id: job.firm_id,
          firm_slug: job.firm_slug,
          field_changed: 'website_content',
          old_value: job.last_content_hash || '',
          new_value: hash,
        })
      }

      results.push({
        slug: job.firm_slug,
        status: changed ? 'CHANGED' : 'ok',
        http_status: res.status,
      })
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? 'Timeout (12s)' : err.message
      await admin.from('scraper_jobs').update({
        last_checked_at: new Date().toISOString(),
        status: 'error',
        error_message: msg,
      }).eq('id', job.id)
      results.push({ slug: job.firm_slug, status: 'error', error: msg })
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString()
  })
}