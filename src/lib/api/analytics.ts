import { supabase } from '@/lib/supabase'
import type { DailySnapshot, TraderStats, JournalEntry, Notification, TradeSentiment } from '@/types/database'

export const analyticsApi = {
  async getStats(accountId: string): Promise<TraderStats | null> {
    // Calculate stats directly from trades table (v_trader_stats view may not exist)
    const { data: trades, error } = await supabase
      .from('trades')
      .select('net_pnl, status, direction')
      .eq('account_id', accountId)
      .eq('status', 'closed')
    if (error || !trades || trades.length === 0) return null

    const total   = trades.length
    const winners = trades.filter(t => (t.net_pnl ?? 0) > 0)
    const losers  = trades.filter(t => (t.net_pnl ?? 0) <= 0)
    const grossWin  = winners.reduce((s, t) => s + (t.net_pnl ?? 0), 0)
    const grossLoss = Math.abs(losers.reduce((s, t) => s + (t.net_pnl ?? 0), 0))
    const totalPnl  = trades.reduce((s, t) => s + (t.net_pnl ?? 0), 0)
    const allPnl    = trades.map(t => t.net_pnl ?? 0)

    return {
      account_id:      accountId,
      total_trades:    total,
      winning_trades:  winners.length,
      losing_trades:   losers.length,
      win_rate_pct:    total > 0 ? Math.round((winners.length / total) * 100) : 0,
      profit_factor:   grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : grossWin > 0 ? 99 : 0,
      total_pnl:       Math.round(totalPnl * 100) / 100,
      best_trade:      allPnl.length ? Math.max(...allPnl) : 0,
      worst_trade:     allPnl.length ? Math.min(...allPnl) : 0,
      avg_win:         winners.length ? grossWin / winners.length : 0,
      avg_loss:        losers.length  ? grossLoss / losers.length : 0,
    } as TraderStats
  },

  async getEquityCurve(accountId: string, days = 30): Promise<DailySnapshot[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    // First try daily_snapshots
    const { data: snapshots } = await supabase
      .from('daily_snapshots')
      .select('snapshot_date,balance,equity,daily_pnl')
      .eq('account_id', accountId)
      .gte('snapshot_date', since.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })

    if (snapshots && snapshots.length > 1) return snapshots

    // Fallback: build curve from closed trades
    const { data: account } = await supabase
      .from('accounts')
      .select('starting_balance, balance, purchased_at')
      .eq('id', accountId)
      .single()

    const { data: trades } = await supabase
      .from('trades')
      .select('closed_at, net_pnl')
      .eq('account_id', accountId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: true })

    if (!trades || trades.length === 0) return []

    const startBal = account?.starting_balance ?? 0
    let running    = startBal

    // Group P&L by day
    const dayMap: Record<string, number> = {}
    for (const t of trades) {
      if (!t.closed_at) continue
      const day = t.closed_at.split('T')[0]
      dayMap[day] = (dayMap[day] ?? 0) + (t.net_pnl ?? 0)
    }

    // Build cumulative curve
    const curve: DailySnapshot[] = []
    for (const [day, pnl] of Object.entries(dayMap).sort()) {
      running += pnl
      curve.push({
        id: day,
        account_id: accountId,
        snapshot_date: day,
        balance: +running.toFixed(2),
        equity:  +running.toFixed(2),
        daily_pnl: +pnl.toFixed(2),
        daily_dd: 0,
        max_dd: 0,
        trades_count: 0,
        created_at: day,
      })
    }

    return curve
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
    // Calculate risk alerts directly from accounts
    const { data, error } = await supabase
      .from('accounts')
      .select('*, users(first_name, last_name, email)')
      .in('status', ['active', 'suspended'])
      .not('phase', 'in', '("breached","passed","inactive")')
    if (error) return []
    return (data ?? []).filter((a: any) =>
      (a.daily_dd_used ?? 0) > 3 || (a.max_dd_used ?? 0) > 6
    ).map((a: any) => ({
      ...a,
      alert_level: (a.daily_dd_used ?? 0) > 4.5 || (a.max_dd_used ?? 0) > 9 ? 'critical' : 'warning',
    }))
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