export type AccountPhase = 'phase1' | 'phase2' | 'funded' | 'passed' | 'breached' | 'review'
export type ChallengeType = '1step' | '2step' | 'instant' | 'payafter'
export type DrawdownType = 'static' | 'trailing'

export interface ChallengeProduct {
  id: string
  name: string
  account_size: number
  price_usd: number
  challenge_type: ChallengeType
  // Drawdown settings
  drawdown_type: DrawdownType
  trailing_drawdown: number        // % for trailing DD (used when drawdown_type='trailing')
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
  // Special models
  funded_immediately: boolean      // Instant funding — no evaluation
  pay_after_pass: boolean          // Pay After You Pass — fee charged only after passing
  activation_fee: number           // Fee for instant/payafter models
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
  // Trailing drawdown tracking
  drawdown_type: DrawdownType
  trailing_drawdown: number
  peak_balance: number | null      // Highest balance ever — for trailing DD calculation
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
  funded_immediately?: boolean | null
  ip_address?: string | null
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
  direction: 'buy' | 'sell'
  lots: number
  open_price: number
  close_price: number | null
  sl: number | null
  tp: number | null
  net_pnl: number | null
  gross_pnl: number | null
  pips: number | null
  swap: number | null
  commission: number | null
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
  close_reason: string | null
  ip_address: string | null
}

export interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'trader' | 'admin' | 'support'
  country: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  is_banned: boolean
  created_at: string
}

export interface Payout {
  id: string
  account_id: string
  user_id: string
  requested_usd: number
  method: string
  wallet: string | null
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled'
  tx_hash: string | null
  tx_reference: string | null
  admin_note: string | null
  created_at: string
  updated_at: string | null
  accounts?: Pick<Account, 'account_number'>
  users?: Pick<User, 'first_name' | 'last_name' | 'email'>
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

export interface TraderStats {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate_pct: number
  total_pnl: number
  best_trade: number
  worst_trade: number
  profit_factor: number
  avg_win: number
  avg_loss: number
}