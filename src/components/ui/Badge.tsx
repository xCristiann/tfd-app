import { cn } from '@/lib/utils'

type BadgeVariant = 'funded' | 'phase1' | 'phase2' | 'breached' | 'paid' | 'pending' | 'open' | 'warning' | 'admin' | 'blue'

const styles: Record<BadgeVariant, string> = {
  funded:   'bg-green-500/10 border border-green-500/20 text-[var(--green)]',
  phase1:   'bg-[var(--gold3)]/30 border border-[var(--bdr2)] text-[var(--gold)]',
  phase2:   'bg-blue-500/10 border border-blue-500/20 text-[var(--blue)]',
  breached: 'bg-red-500/10 border border-red-500/20 text-[var(--red)]',
  paid:     'bg-green-500/10 border border-green-500/20 text-[var(--green)]',
  pending:  'bg-orange-400/10 border border-orange-400/20 text-[var(--orange)]',
  open:     'bg-blue-500/10 border border-blue-500/20 text-[var(--blue)]',
  warning:  'bg-orange-400/10 border border-orange-400/20 text-[var(--orange)]',
  admin:    'bg-red-500/10 border border-red-500/20 text-[var(--red)]',
  blue:     'bg-blue-500/10 border border-blue-500/20 text-[var(--blue)]',
}

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-block text-[8px] px-[7px] py-[2px] tracking-[1px] uppercase font-bold',
      styles[variant],
      className
    )}>
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
