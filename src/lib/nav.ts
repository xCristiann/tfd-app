import type { NavItem } from '@/types/database'

export const TRADER_NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Trading', items: [
    { label: 'Overview',         icon: '◈',  path: '/dashboard' },
    { label: 'Trading Platform', icon: '📈', path: '/platform' },
    { label: 'Trade Journal',    icon: '📓', path: '/dashboard/journal' },
    { label: 'Trade History',    icon: '🕐', path: '/dashboard/history' },
  ]},
  { section: 'Account', items: [
    { label: 'Payouts',    icon: '💰', path: '/dashboard/payouts' },
    { label: 'Analytics',  icon: '📊', path: '/dashboard/analytics' },
    { label: 'Challenges', icon: '🎯', path: '/dashboard/challenges' },
    { label: 'Accounts',   icon: '🗂', path: '/dashboard/accounts' },
  ]},
  { section: 'Grow', items: [
    { label: 'Affiliates', icon: '🔗', path: '/dashboard/affiliates' },
  ]},
  { section: 'Help', items: [
    { label: 'Support',  icon: '💬', path: '/dashboard/support' },
    { label: 'Settings', icon: '⚙',  path: '/dashboard/settings' },
  ]},
]

export const ADMIN_NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [
    { label: 'Dashboard', icon: '◈', path: '/admin' },
  ]},
  { section: 'Traders', items: [
    { label: 'Trader Management', icon: '👥', path: '/admin/traders' },
    { label: 'All Accounts',      icon: '🗂', path: '/admin/accounts' },
  ]},
  { section: 'Finance', items: [
    { label: 'Payout Queue', icon: '💰', path: '/admin/payouts' },
    { label: 'Revenue',      icon: '📊', path: '/admin/revenue' },
  ]},
  { section: 'Risk', items: [
    { label: 'Risk Monitor', icon: '⚠️', path: '/admin/risk' },
  ]},
  { section: 'Operations', items: [
    { label: 'Support Tickets',    icon: '💬', path: '/admin/support' },
    { label: 'Challenge Products', icon: '🎯', path: '/admin/challenges' },
    { label: 'Affiliates',         icon: '🔗', path: '/admin/affiliates' },
    { label: 'Settings',           icon: '⚙',  path: '/admin/settings' },
  ]},
]

export const SUPPORT_NAV: { section?: string; items: NavItem[] }[] = [
  { section: 'Inbox', items: [
    { label: 'All Tickets', icon: '📥', path: '/support-crm' },
    { label: 'Urgent',      icon: '🚨', path: '/support-crm?filter=urgent' },
  ]},
  { section: 'Management', items: [
    { label: 'Analytics',        icon: '📊', path: '/support-crm/analytics' },
    { label: 'Canned Responses', icon: '💡', path: '/support-crm/canned' },
  ]},
]
