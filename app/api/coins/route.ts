import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createAdminClient()
  const { data: profile } = await admin.from('profiles').select('coins, coins_lifetime, referral_code').eq('id', user.id).single()
  const { data: transactions } = await admin.from('coin_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
  const { data: prizes } = await admin.from('coin_prizes').select('*').eq('is_active', true).order('coins_required', { ascending: true })
  const { data: rewards } = await admin.from('coin_rewards').select('*').eq('is_active', true)

  return NextResponse.json({ profile, transactions, prizes, rewards })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, prize_id, firm_slug, reference_id } = body

  if (action === 'redeem' && prize_id) {
    const { data: prize } = await admin.from('coin_prizes').select('*').eq('id', prize_id).single()
    if (!prize) return NextResponse.json({ error: 'Prize not found' }, { status: 404 })
    const { data: result } = await admin.rpc('spend_coins', { p_user_id: user.id, p_amount: prize.coins_required, p_prize_id: prize_id })
    if (!result) return NextResponse.json({ error: 'Insufficient coins or prize unavailable' }, { status: 400 })
    return NextResponse.json({ success: true, message: `Redeemed: ${prize.title}` })
  }

  // Award coins for an action (called from other parts of the app)
  if (action) {
    const { data: reward } = await admin.from('coin_rewards').select('*').eq('action', action).eq('is_active', true).single()
    if (!reward) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    await admin.rpc('add_coins', {
      p_user_id: user.id,
      p_amount: reward.coins,
      p_type: action,
      p_description: reward.description,
      p_firm_slug: firm_slug || null,
      p_reference_id: reference_id || null,
    })
    return NextResponse.json({ success: true, coins_awarded: reward.coins, message: reward.description })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}