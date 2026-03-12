import { supabase } from '@/lib/supabase'
import type { Trade } from '@/types/database'

export const tradesApi = {
  async getOpen(accountId: string): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades').select('*')
      .eq('account_id', accountId).eq('status', 'open')
      .order('opened_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getHistory(accountId: string, { page = 1, limit = 50 } = {}) {
    const { data, count, error } = await supabase
      .from('trades').select('*', { count: 'exact' })
      .eq('account_id', accountId).eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  },

  async open(order: {
    account_id: string; symbol: string; direction: 'buy' | 'sell'
    lots: number; sl?: number; tp?: number; order_type?: string
  }): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades').insert({ ...order, open_price: 0, status: 'open' })
      .select().single()
    if (error) throw error
    return data
  },

  async close(tradeId: string, closePrice: number): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .update({ close_price: closePrice, status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', tradeId).select().single()
    if (error) throw error
    return data
  },

  async adminGetAllOpen(): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*, accounts(account_number,phase), users(first_name,last_name)')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  subscribeToOpenTrades(accountId: string, cb: (payload: unknown) => void) {
    return supabase
      .channel(`trades-${accountId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trades',
        filter: `account_id=eq.${accountId}`,
      }, cb)
      .subscribe()
  },
}
