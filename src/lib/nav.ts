import type { NavItem } from '@/types/database'

export const TRADER_NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Trading', items: [
    { label: 'Overview',         icon: '◈',  path: '/dashboard' },
    { label: 'Trading Platform', icon: '📈', path: '/platform' },
    { label: 'Trade Journal',    icon: '📓', path: '/dashboard/journal' },
    { label: 'Trade History',    icon: '🕐', path: '/dashboard/history' },
  ]},
  { section: 'Account', items: [
    { label: 'Payouts',    icon: '💰', path: '/dashboard/payouts',    badge: '$7K',  badgeType: 'gold' },
    { label: 'Analytics',  icon: '📊', path: '/dashboard/analytics' },
    { label: 'Challenges', icon: '🎯', path: '/dashboard/challenges' },
    { label: 'Accounts',   icon: '🗂', path: '/dashboard/accounts' },
  ]},
  { section: 'Help', items: [
    { label: 'Support',  icon: '💬', path: '/dashboard/support',  badge: 2, badgeType: 'red' },
    { label: 'Settings', icon: '⚙',  path: '/dashboard/settings' },
  ]},
]

export const ADMIN_NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [
    { label: 'Dashboard', icon: '◈', path: '/admin' },
  ]},
  { section: 'Traders', items: [
    { label: 'Trader Management', icon: '👥', path: '/admin/traders',   badge: '14K', badgeType: 'gold' },
    { label: 'All Accounts',      icon: '🗂', path: '/admin/accounts' },
  ]},
  { section: 'Finance', items: [
    { label: 'Payout Queue', icon: '💰', path: '/admin/payouts',  badge: 12, badgeType: 'gold' },
    { label: 'Revenue',      icon: '📊', path: '/admin/revenue' },
  ]},
  { section: 'Risk', items: [
    { label: 'Risk Monitor', icon: '⚠️', path: '/admin/risk', badge: 3, badgeType: 'red' },
  ]},
  { section: 'Operations', items: [
    { label: 'Support Tickets',    icon: '💬', path: '/admin/support',     badge: 28, badgeType: 'red' },
    { label: 'Challenge Products', icon: '🎯', path: '/admin/challenges' },
    { label: 'Affiliates',         icon: '🔗', path: '/admin/affiliates' },
    { label: 'Settings',           icon: '⚙',  path: '/admin/settings' },
  ]},
]

export const SUPPORT_NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Inbox', items: [
    { label: 'All Tickets', icon: '📥', path: '/support-crm',           badge: 28, badgeType: 'red' },
    { label: 'Urgent',      icon: '🚨', path: '/support-crm?filter=urgent', badge: 4, badgeType: 'red' },
  ]},
  { section: 'Management', items: [
    { label: 'Analytics',        icon: '📊', path: '/support-crm/analytics' },
    { label: 'Canned Responses', icon: '💡', path: '/support-crm/canned' },
  ]},
]
