import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json()
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

    const admin = await createAdminClient()

    // Store in newsletter_subscribers table
    const { error } = await admin.from('newsletter_subscribers').upsert({
      email: email.toLowerCase().trim(),
      source: source || 'website',
      subscribed_at: new Date().toISOString(),
    }, { onConflict: 'email' })

    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}