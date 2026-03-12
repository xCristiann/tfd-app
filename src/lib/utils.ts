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

export function methodLabel(method: string): string {
  const map: Record<string, string> = {
    usdt_trc20: 'USDT TRC20', usdt_erc20: 'USDT ERC20',
    bitcoin: 'Bitcoin', wise: 'Wise', bank: 'Bank Transfer',
  }
  return map[method] ?? method
}
