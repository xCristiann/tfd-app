import { supabase } from '@/lib/supabase'
import type { Payout, PayoutMethod } from '@/types/database'

export const payoutsApi = {
  async request(params: {
    account_id: string; requested_usd: number
    method: PayoutMethod; wallet_address: string; trader_notes?: string
  }): Promise<Payout> {
    const { data, error } = await supabase
      .from('payouts').insert({ ...params, status: 'pending' }).select().single()
    if (error) throw error
    return data
  },

  async getMine(): Promise<Payout[]> {
    const { data, error } = await supabase
      .from('payouts').select('*, accounts(account_number)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async adminGetPending() {
    const { data, error } = await supabase
      .from('v_payout_summary').select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async adminApprove(id: string, { approved_usd, admin_notes }: { approved_usd?: number; admin_notes?: string } = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('payouts').update({
      status: 'approved', approved_usd, admin_notes,
      approved_by: user?.id, approved_at: new Date().toISOString(),
    }).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async adminReject(id: string, rejection_reason: string) {
    const { data, error } = await supabase.from('payouts')
      .update({ status: 'rejected', rejection_reason }).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async adminMarkPaid(id: string, { tx_hash, tx_reference }: { tx_hash?: string; tx_reference?: string } = {}) {
    const { data, error } = await supabase.from('payouts').update({
      status: 'paid', tx_hash, tx_reference, paid_at: new Date().toISOString(),
    }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}
