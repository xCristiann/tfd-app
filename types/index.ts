export interface Firm {
  id: string
  name: string
  slug: string
  website?: string
  affiliate_link?: string
  discount_code?: string
  founded_year?: number
  headquarters?: string
  platforms?: string[]
  short_description?: string
  admin_notes?: string
  trust_score: number
  payout_reliability?: string
  avg_payout_days?: number
  support_quality?: string
  years_active?: number
  delayed_payout_reports?: number
  rules_clarity?: string
  total_funded_traders?: string
  payout_methods?: string[]
  accepts_eu: boolean
  markets_forex: boolean
  markets_futures: boolean
  markets_crypto: boolean
  markets_indices: boolean
  markets_metals: boolean
  markets_commodities: boolean
  is_published: boolean
  is_featured: boolean
  rules_last_verified?: string
  created_at: string
  updated_at: string
  challenges?: Challenge[]
  rules?: Rule[]
  reviews?: Review[]
}

export interface Challenge {
  id: string
  firm_id: string
  name: string
  account_size: number
  price_usd: number
  profit_split?: string
  phase1_target?: number
  phase1_daily_dd?: number
  phase1_max_dd?: number
  phase1_min_days?: number
  phase1_time_limit?: number
  phase2_target?: number
  phase2_daily_dd?: number
  phase2_max_dd?: number
  phase2_min_days?: number
  phase2_time_limit?: number
  payout_frequency?: string
  min_payout?: number
  payout_methods?: string[]
  allows_weekend_holding: boolean
  allows_news_trading: boolean
  allows_ea: boolean
  allows_hedging: boolean
  sort_order: number
}

export interface Rule {
  id: string
  firm_id: string
  label: string
  value: string
  value_type: 'green' | 'red' | 'amber' | 'neutral'
  category: string
  notes?: string
  sort_order: number
}

export interface Profile {
  id: string
  username?: string
  full_name?: string
  avatar_url?: string
  is_admin: boolean
  created_at: string
}

export interface Review {
  id: string
  firm_id: string
  user_id: string
  title?: string
  body: string
  rating: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profiles?: Profile
  comments?: Comment[]
}

export interface Comment {
  id: string
  review_id: string
  user_id: string
  body: string
  created_at: string
  profiles?: Profile
}
