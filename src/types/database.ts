// ─── Database Types ────────────────────────────────────────────────────────

export type UserRole = 'trader' | 'admin' | 'support'
export type KycStatus = 'pending' | 'approved' | 'rejected'
export type AccountPhase = 'phase1' | 'phase2' | 'funded' | 'breached' | 'passed' | 'suspended'
export type TradeDirection = 'buy' | 'sell'
export type TradeStatus = 'open' | 'closed' | 'cancelled'
export type OrderType = 'market' | 'limit' | 'stop'
export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled'
export type PayoutMethod = 'usdt_trc20' | 'usdt_erc20' | 'bitcoin' | 'wise' | 'bank'
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type TicketDept = 'billing' | 'technical' | 'account' | 'rules' | 'general'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TradeSentiment = 'positive' | 'neutral' | 'negative'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  country: string | null
  phone: string | null
  role: UserRole
  kyc_status: KycStatus
  affiliate_code: string | null
  referred_by: string | null
  created_at: string
  updated_at: string
}

export interface ChallengeProduct {
  id: string
  name: string
  account_size: number
  price_usd: number
  challenge_type: '1step' | '2step'
  ph1_profit_target: number
  ph1_daily_dd: number
  ph1_max_dd: number
  ph1_min_days: number
  ph2_profit_target: number
  ph2_daily_dd: number
  ph2_max_dd: number
  ph2_min_days: number
  funded_daily_dd: number
  funded_max_dd: number
  funded_profit_split: number
  news_trading: boolean
  weekend_holding: boolean
  is_active: boolean
  created_at: string
}

export interface Account {
  id: string
  account_number: string
  user_id: string
  product_id: string
  phase: AccountPhase
  balance: number
  equity: number
  starting_balance: number
  daily_dd_used: number
  max_dd_used: number
  daily_high_balance: number | null
  trading_days: number
  phase_started_at: string
  phase_passed_at: string | null
  funded_at: string | null
  breached_at: string | null
  breach_reason: string | null
  platform_login: string | null
  server: string
  stripe_payment_id: string | null
  purchase_price: number | null
  purchased_at: string
  created_at: string
  updated_at: string
  status: 'active' | 'passed' | 'breached' | 'suspended' | 'soft_locked' | 'inactive' | null
  payout_locked?: boolean | null
  // joined
  challenge_products?: ChallengeProduct
  users?: Pick<User, 'first_name' | 'last_name' | 'email' | 'country'>
}

export interface Trade {
  id: string
  account_id: string
  user_id: string
  ticket: number | null
  symbol: string
  direction: TradeDirection
  lots: number
  order_type: OrderType
  open_price: number
  close_price: number | null
  sl: number | null
  tp: number | null
  pips: number | null
  swap: number
  commission: number
  gross_pnl: number | null
  net_pnl: number | null
  status: TradeStatus
  opened_at: string
  closed_at: string | null
  magic_number: number | null
  comment: string | null
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  trade_id: string | null
  account_id: string | null
  title: string | null
  body: string
  tags: string[] | null
  pnl: number | null
  sentiment: TradeSentiment | null
  created_at: string
  updated_at: string
}

export interface Payout {
  id: string
  user_id: string
  account_id: string
  requested_usd: number
  approved_usd: number | null
  fee_usd: number
  net_usd: number | null
  method: PayoutMethod
  wallet_address: string
  status: PayoutStatus
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  rejection_reason: string | null
  tx_hash: string | null
  tx_reference: string | null
  trader_notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  // joined
  accounts?: Pick<Account, 'account_number'>
}

export interface SupportTicket {
  id: string
  ticket_number: string
  user_id: string
  account_id: string | null
  subject: string
  department: TicketDept
  priority: TicketPriority
  status: TicketStatus
  assigned_to: string | null
  assigned_at: string | null
  sla_due_at: string | null
  resolved_at: string | null
  resolved_by: string | null
  csat_score: number | null
  csat_comment: string | null
  created_at: string
  updated_at: string
  // joined
  users?: Pick<User, 'first_name' | 'last_name' | 'email'>
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  body: string
  is_internal: boolean
  created_at: string
  // joined
  users?: Pick<User, 'first_name' | 'last_name' | 'role'>
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface DailySnapshot {
  id: string
  account_id: string
  snapshot_date: string
  balance: number
  equity: number
  daily_pnl: number
  daily_dd: number
  max_dd: number
  trades_count: number
  created_at: string
}

export interface Affiliate {
  id: string
  user_id: string
  code: string
  commission_pct: number
  total_referrals: number
  total_revenue_usd: number
  total_earned_usd: number
  total_paid_usd: number
  is_active: boolean
  created_at: string
}

// ─── View Types ────────────────────────────────────────────────────────────

export interface RiskAlert {
  account_id: string
  account_number: string
  trader_name: string
  email: string
  phase: AccountPhase
  balance: number
  daily_dd_used: number
  max_dd_used: number
  risk_level: 'critical' | 'warning'
}

export interface PayoutSummary {
  id: string
  ticket_number: string
  trader_name: string
  email: string
  account_number: string
  requested_usd: number
  method: PayoutMethod
  wallet_address: string
  status: PayoutStatus
  created_at: string
}

export interface TraderStats {
  account_id: string
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate_pct: number
  total_pnl: number
  avg_win: number
  avg_loss: number
  best_trade: number
  worst_trade: number
  profit_factor: number
}

// ─── UI Types ──────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  icon: string
  title: string
  body: string
}

export interface NavItem {
  label: string
  icon: string
  path: string
  badge?: string | number
  badgeType?: 'red' | 'gold' | 'blue'
}
