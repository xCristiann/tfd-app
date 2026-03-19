import { cn } from '@/lib/utils'

type BadgeVariant = 'funded' | 'phase1' | 'phase2' | 'breached' | 'paid' | 'pending' | 'open' | 'warning' | 'admin' | 'blue'

const styles: Record<BadgeVariant, string> = {
  funded:   'bg-green-100 border border-green-200 text-green-700',
  phase1:   'bg-[#EEF3FF] border border-[#C5D5FA] text-[#2255CC]',
  phase2:   'bg-blue-100 border border-blue-200 text-blue-700',
  breached: 'bg-red-100 border border-red-200 text-red-600',
  paid:     'bg-green-100 border border-green-200 text-green-700',
  pending:  'bg-amber-100 border border-amber-200 text-amber-700',
  open:     'bg-[#EEF3FF] border border-[#C5D5FA] text-[#2255CC]',
  warning:  'bg-amber-100 border border-amber-200 text-amber-700',
  admin:    'bg-red-100 border border-red-200 text-red-600',
  blue:     'bg-[#EEF3FF] border border-[#C5D5FA] text-[#2255CC]',
}

interface BadgeProps { variant: BadgeVariant; children: React.ReactNode; className?: string }

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn('inline-block text-[10px] px-2 py-0.5 rounded-md font-600 uppercase tracking-wide', styles[variant], className)} style={{fontWeight:600}}>
      {children}
    </span>
  )
}

export function phaseVariant(phase: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    funded: 'funded', phase1: 'phase1', phase2: 'phase2',
    breached: 'breached', passed: 'funded', suspended: 'warning',
  }
  return map[phase] ?? 'open'
}
