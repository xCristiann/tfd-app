import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await createAdminClient()
  const [p, tx, prizes, rewards] = await Promise.all([
    admin.from('profiles').select('coins,coins_lifetime,referral_code,badges,full_name').eq('id', user.id).single(),
    admin.from('coin_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    admin.from('coin_prizes').select('*').eq('is_active', true).order('coins_required'),
    admin.from('coin_rewards').select('*').eq('is_active', true),
  ])
  return NextResponse.json({ profile: p.data, transactions: tx.data||[], prizes: prizes.data||[], rewards: rewards.data||[] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { action, prize_id, firm_slug } = body

  if (action === 'redeem' && prize_id) {
    const { data: prize } = await admin.from('coin_prizes').select('*').eq('id', prize_id).eq('is_active', true).single()
    if (!prize) return NextResponse.json({ error: 'Prize not found' }, { status: 404 })
    if (prize.stock === 0) return NextResponse.json({ error: 'Sold out' }, { status: 400 })
    const { data: profile } = await admin.from('profiles').select('coins,badges').eq('id', user.id).single()
    if (!profile || profile.coins < prize.coins_required)
      return NextResponse.json({ error: `Need ${prize.coins_required} coins, you have ${profile?.coins||0}` }, { status: 400 })

    // Deduct coins
    const updates: any = { coins: profile.coins - prize.coins_required }
    // If badge — add to profile immediately
    if (prize.prize_type === 'badge') {
      const current = profile.badges || []
      if (!current.includes(prize.title)) updates.badges = [...current, prize.title]
    }
    await admin.from('profiles').update(updates).eq('id', user.id)

    await admin.from('coin_transactions').insert({ user_id: user.id, amount: -prize.coins_required, type: 'redemption', description: `Redeemed: ${prize.title}` })
    await admin.from('coin_redemptions').insert({ user_id: user.id, prize_id, coins_spent: prize.coins_required, status: prize.prize_type==='badge'?'fulfilled':'pending' })
    if (prize.stock > 0) await admin.from('coin_prizes').update({ stock: prize.stock - 1 }).eq('id', prize_id)

    return NextResponse.json({
      success: true,
      message: prize.prize_type==='badge' ? `✓ Badge "${prize.title}" unlocked! Visible on your profile.` : `✓ "${prize.title}" redeemed! We will process it within 48h.`
    })
  }

  if (action) {
    const { data: reward } = await admin.from('coin_rewards').select('*').eq('action', action).eq('is_active', true).single()
    if (!reward) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    const { data: profile } = await admin.from('profiles').select('coins,coins_lifetime').eq('id', user.id).single()
    await admin.from('profiles').update({ coins:(profile?.coins||0)+reward.coins, coins_lifetime:(profile?.coins_lifetime||0)+reward.coins }).eq('id', user.id)
    await admin.from('coin_transactions').insert({ user_id: user.id, amount: reward.coins, type: action, description: reward.description, firm_slug: firm_slug||null })
    return NextResponse.json({ success: true, coins_awarded: reward.coins, message: reward.description })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}