import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return await runScraper(true)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (body.reset) {
    await admin.from('scraper_jobs').update({ last_checked_at: null, status: 'pending', last_content_hash: null })
    return NextResponse.json({ message: 'All jobs reset to pending' })
  }
  return await runScraper(false)
}

async function extractDataWithAI(html: string, firmSlug: string, firmName: string): Promise<any> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return null

  // Extract relevant text only (pricing/rules sections)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 8000) // First 8000 chars for pricing info

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are a data extractor for prop trading firm websites. Extract ONLY the following data if found on the page. Return ONLY valid JSON, nothing else. If a value is not found, use null.`
          },
          {
            role: 'user',
            content: `Extract from this prop firm (${firmName}) website text:
{
  "challenges": [
    {
      "name": "challenge name",
      "account_size": number (in USD),
      "price_usd": number,
      "profit_target_phase1": number (percentage),
      "max_drawdown": number (percentage),
      "daily_drawdown": number (percentage),
      "profit_split": "e.g. 80% or 80-90%"
    }
  ],
  "promo_discount": "e.g. 25% OFF or null",
  "discount_code": "promo code or null",
  "payout_frequency": "e.g. Weekly, Bi-weekly, On demand or null",
  "news_trading_allowed": true/false/null,
  "weekend_holding_allowed": true/false/null,
  "ea_allowed": true/false/null
}

Website text:
${textContent}`
          }
        ]
      })
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) return null

    const clean = content.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return null
  }
}

async function sendAlertEmail(firmSlug: string, firmName: string, changes: any, aiData: any) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const aiSection = aiData ? `
    <h3 style="color:#00e5a0;margin:20px 0 10px;">🤖 AI Extracted Data</h3>
    <pre style="background:#0c0f1a;padding:16px;border-radius:8px;color:#8b92a8;font-size:12px;overflow:auto;">${JSON.stringify(aiData, null, 2)}</pre>
    <p style="color:#8b92a8;font-size:13px;">⚠️ AI data may not be 100% accurate. Always verify on the firm's website before updating.</p>
  ` : '<p style="color:#8b92a8;">AI parsing unavailable (no OpenAI key or parsing failed).</p>'

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#07090f;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07090f;padding:40px 20px;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 28px;text-align:center;font-size:17px;font-weight:800;color:#eef0f6;">
  TheFunded<span style="color:#00e5a0;">Diaries</span> &mdash; Scraper Alert
</td></tr>
<tr><td style="background:#0c0f1a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#eef0f6;">⚠️ Website Change Detected</h1>
  <div style="height:2px;background:linear-gradient(90deg,#f59e0b,#ec4899);border-radius:2px;margin:16px 0;"></div>
  <p style="font-size:15px;color:#8b92a8;line-height:1.7;">
    The website for <strong style="color:#eef0f6;">${firmName}</strong> has changed since the last check.
    This may indicate updated challenge prices, new promotions, or rule changes.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr><td style="background:#00e5a0;border-radius:9px;padding:12px 24px;">
      <a href="https://www.thefundeddiaries.com/admin/firms" style="color:#04120c;font-size:14px;font-weight:800;text-decoration:none;">
        Update ${firmName} in Admin CRM &rarr;
      </a>
    </td></tr>
  </table>
  <p style="font-size:13px;color:#8b92a8;">
    Or check their website directly: <a href="${changes.url || '#'}" style="color:#00e5a0;">${changes.url || firmSlug}</a>
  </p>
  ${aiSection}
  <div style="height:1px;background:rgba(255,255,255,0.07);margin:24px 0;"></div>
  <p style="margin:0;font-size:12px;color:#4e5568;">TheFundedDiaries Scraper &middot; Automated alert</p>
</td></tr>
</table></td></tr>
</table>
</body></html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TheFundedDiaries Scraper <noreply@thefundeddiaries.com>',
      to: ['cristian@thefundeddiaries.com'],
      subject: `⚠️ ${firmName} website changed &mdash; review needed`,
      html,
    }),
  })
}

async function applyAIDataToFirm(admin: any, firmId: string, aiData: any) {
  if (!aiData || !firmId) return

  const updates: any = {}

  // Apply promo/discount if found
  if (aiData.promo_discount) updates.promo_discount = aiData.promo_discount
  if (aiData.discount_code) updates.discount_code = aiData.discount_code

  // Apply payout frequency
  if (aiData.payout_frequency) updates.payout_frequency = aiData.payout_frequency

  if (Object.keys(updates).length > 0) {
    await admin.from('firms').update(updates).eq('id', firmId)
  }

  // Update challenges prices if found
  if (aiData.challenges?.length > 0) {
    for (const ch of aiData.challenges) {
      if (!ch.account_size || !ch.price_usd) continue
      // Find matching challenge by account size
      const { data: existing } = await admin
        .from('challenges')
        .select('id, price_usd')
        .eq('firm_id', firmId)
        .eq('account_size', ch.account_size)
        .single()

      if (existing && existing.price_usd !== ch.price_usd) {
        await admin.from('challenges').update({
          price_usd: ch.price_usd,
          ...(ch.profit_target_phase1 ? { phase1_target: ch.profit_target_phase1 } : {}),
          ...(ch.max_drawdown ? { phase1_max_dd: ch.max_drawdown } : {}),
          ...(ch.daily_drawdown ? { phase1_daily_dd: ch.daily_drawdown } : {}),
          ...(ch.profit_split ? { profit_split: ch.profit_split } : {}),
        }).eq('id', existing.id)
      }
    }
  }
}

async function runScraper(isCron: boolean) {
  const admin = await createAdminClient()

  const { data: jobs } = await admin
    .from('scraper_jobs')
    .select('*, firms(id, name)')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(5)

  if (!jobs?.length) return NextResponse.json({ message: 'No jobs to process' })

  const results = []

  for (const job of jobs) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const res = await fetch(job.check_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const html = await res.text()
      const excerpt = html.slice(0, 80000)
      const hash = crypto.createHash('sha256').update(excerpt).digest('hex')
      const changed = job.last_content_hash && job.last_content_hash !== hash
      const firmName = (job.firms as any)?.name || job.firm_slug
      const firmId = (job.firms as any)?.id

      let aiData = null

      if (changed) {
        // Run AI extraction on changed content
        aiData = await extractDataWithAI(html, job.firm_slug, firmName)

        // Apply AI data to DB automatically
        if (aiData && firmId) {
          await applyAIDataToFirm(admin, firmId, aiData)
        }

        // Send email alert
        await sendAlertEmail(job.firm_slug, firmName, { url: job.check_url }, aiData)

        // Log the change
        await admin.from('scraper_changes').insert({
          firm_id: firmId,
          firm_slug: job.firm_slug,
          field_changed: 'website_content',
          old_value: job.last_content_hash || '',
          new_value: hash,
          changes_detected: aiData ? { ai_extracted: aiData } : null,
        })
      }

      await admin.from('scraper_jobs').update({
        last_checked_at: new Date().toISOString(),
        last_content_hash: hash,
        status: changed ? 'changed' : 'ok',
        error_message: null,
        ...(changed ? { last_changed_at: new Date().toISOString() } : {}),
      }).eq('id', job.id)

      results.push({
        slug: job.firm_slug,
        status: changed ? 'CHANGED' : 'ok',
        ai_extracted: changed ? !!aiData : undefined,
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

  return NextResponse.json({ processed: results.length, results, timestamp: new Date().toISOString() })
}