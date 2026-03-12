import { supabase } from '@/lib/supabase'
import type { Account } from '@/types/database'

export const accountsApi = {
  async getMine(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*, challenge_products(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*, challenge_products(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async adminGetAll({ page = 1, limit = 50, phase, search }: {
    page?: number; limit?: number; phase?: string; search?: string
  } = {}) {
    let q = supabase
      .from('accounts')
      .select('*, users(first_name,last_name,email,country)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    if (phase)  q = q.eq('phase', phase)
    if (search) q = q.ilike('account_number', `%${search}%`)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  },

  async adminUpdate(id: string, fields: Partial<Account>) {
    const { data, error } = await supabase
      .from('accounts').update(fields).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  subscribeToAccount(accountId: string, cb: (row: Account) => void) {
    return supabase
      .channel(`account-${accountId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'accounts',
        filter: `id=eq.${accountId}`,
      }, (payload) => cb(payload.new as Account))
      .subscribe()
  },
}
