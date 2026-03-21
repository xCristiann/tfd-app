import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function fmt(n: number | null | undefined, currency = '$'): string {
  if (n == null) return '—'
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return (n < 0 ? '-' : '') + currency + abs
}

export function pct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + Number(n).toFixed(decimals) + '%'
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    phase1: 'Phase 1', phase2: 'Phase 2', funded: 'Funded',
    breached: 'Breached', passed: 'Passed', suspended: 'Suspended',
  }
  return map[phase] ?? phase
}

/** Returns a full label combining challenge type + phase.
 *  e.g. "⚡ Instant Funded", "1-Step · Phase 1", "💜 Pay After · Phase 1" */
export function accountTypeLabel(phase: string, challengeType?: string): string {
  const type = challengeType ?? '2step'
  const phaseMap: Record<string, string> = {
    phase1: 'Phase 1', phase2: 'Phase 2', funded: 'Funded',
    breached: 'Breached', passed: 'Passed', suspended: 'Suspended',
  }
  const ph = phaseMap[phase] ?? phase

  if (type === 'instant') {
    return phase === 'funded' ? '⚡ Instant Funded' : `⚡ Instant · ${ph}`
  }
  if (type === 'payafter') {
    return phase === 'funded' ? '💜 Pay After · Funded' : `💜 Pay After · ${ph}`
  }
  if (type === '1step') {
    return phase === 'funded' ? '1-Step · Funded' : `1-Step · ${ph}`
  }
  // 2step default
  return phase === 'funded' ? '2-Step · Funded' : `2-Step · ${ph}`
}

/** Short badge label for account selector */
export function accountBadgeLabel(phase: string, challengeType?: string): string {
  const type = challengeType ?? '2step'
  const phaseMap: Record<string,string> = {
    phase1:'Phase 1', phase2:'Phase 2', funded:'Funded',
    breached:'Breached', passed:'Passed', suspended:'Suspended',
  }
  const ph = phaseMap[phase] ?? phase
  if (type === 'instant')  return phase === 'funded' ? 'INSTANT FUNDED' : `INSTANT · ${ph.toUpperCase()}`
  if (type === 'payafter') return phase === 'funded' ? 'PAY AFTER · FUNDED' : `PAY AFTER · ${ph.toUpperCase()}`
  if (type === '1step')    return phase === 'funded' ? '1-STEP · FUNDED' : `1-STEP · ${ph.toUpperCase()}`
  return phase === 'funded' ? '2-STEP · FUNDED' : `2-STEP · ${ph.toUpperCase()}`
}

export function methodLabel(method: string): string {
  const map: Record<string, string> = {
    usdt_trc20: 'USDT TRC20', usdt_erc20: 'USDT ERC20',
    bitcoin: 'Bitcoin', wise: 'Wise', bank: 'Bank Transfer',
  }
  return map[method] ?? method
}