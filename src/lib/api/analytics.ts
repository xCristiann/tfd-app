import { supabase } from '@/lib/supabase'
import type { DailySnapshot, TraderStats, JournalEntry, Notification, TradeSentiment } from '@/types/database'

export const analyticsApi = {
  async getStats(accountId: string): Promise<TraderStats | null> {
    const { data, error } = await supabase
      .from('v_trader_stats').select('*').eq('account_id', accountId).single()
    if (error) return null
    return data
  },

  async getEquityCurve(accountId: string, days = 30): Promise<DailySnapshot[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    const { data, error } = await supabase
      .from('daily_snapshots')
      .select('snapshot_date,balance,equity,daily_pnl')
      .eq('account_id', accountId)
      .gte('snapshot_date', since.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getSymbolBreakdown(accountId: string) {
    const { data, error } = await supabase
      .from('trades').select('symbol,net_pnl,status')
      .eq('account_id', accountId).eq('status', 'closed')
    if (error) throw error
    const map: Record<string, { trades: number; wins: number; pnl: number }> = {}
    ;(data ?? []).forEach((t) => {
      if (!map[t.symbol]) map[t.symbol] = { trades: 0, wins: 0, pnl: 0 }
      map[t.symbol].trades++
      if (t.net_pnl > 0) map[t.symbol].wins++
      map[t.symbol].pnl += t.net_pnl
    })
    return Object.entries(map).map(([symbol, s]) => ({
      symbol, trades: s.trades,
      win_pct: Math.round((s.wins / s.trades) * 100),
      total_pnl: Math.round(s.pnl * 100) / 100,
    })).sort((a, b) => b.total_pnl - a.total_pnl)
  },

  async adminRiskAlerts() {
    const { data, error } = await supabase.from('v_risk_alerts').select('*')
    if (error) throw error
    return data ?? []
  },
}

export const journalApi = {
  async getEntries(accountId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries').select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async addEntry(entry: {
    account_id: string; trade_id?: string; title?: string
    body: string; tags?: string[]; pnl?: number; sentiment?: TradeSentiment
  }): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries').insert(entry).select().single()
    if (error) throw error
    return data
  },

  async deleteEntry(id: string) {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)
    if (error) throw error
  },
}

export const notificationsApi = {
  async getUnread(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications').select('*').eq('is_read', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  },

  async markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  },

  subscribe(cb: (n: Notification) => void) {
    return supabase.channel('my-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
      }, (p) => cb(p.new as Notification))
      .subscribe()
  },
}
