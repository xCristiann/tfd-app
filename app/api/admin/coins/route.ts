import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, amount, note } = await req.json()
  if (!user_id || amount === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Update balance
  const { data: currentProfile } = await admin.from('profiles').select('coins, coins_lifetime').eq('id', user_id).single()
  if (!currentProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const newCoins = Math.max(0, (currentProfile.coins || 0) + amount)
  const newLifetime = amount > 0 ? (currentProfile.coins_lifetime || 0) + amount : currentProfile.coins_lifetime

  await admin.from('profiles').update({ coins: newCoins, coins_lifetime: newLifetime }).eq('id', user_id)

  // Log transaction
  await admin.from('coin_transactions').insert({
    user_id,
    amount,
    type: 'admin_grant',
    description: note || (amount > 0 ? 'Admin grant' : 'Admin deduction'),
  })

  return NextResponse.json({ success: true })
}