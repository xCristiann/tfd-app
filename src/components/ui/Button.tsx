import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'gold' | 'ghost' | 'danger' | 'success' | 'blue'

const base = 'inline-flex items-center justify-center gap-2 px-4 py-[10px] text-[9px] tracking-[2px] uppercase font-bold cursor-pointer transition-all duration-150 border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  gold:    'bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold2)]',
  ghost:   'bg-transparent border border-[var(--bdr2)] text-[var(--text2)] hover:bg-[var(--dim)]',
  danger:  'bg-red-500/10 border border-red-500/25 text-[var(--red)] hover:bg-red-500/20',
  success: 'bg-green-500/10 border border-green-500/25 text-[var(--green)] hover:bg-green-500/20',
  blue:    'bg-blue-500/10 border border-blue-500/25 text-[var(--blue)] hover:bg-blue-500/20',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'sm' | 'md'
}

export function Button({ variant = 'gold', loading, size = 'md', className, children, disabled, ...props }: ButtonProps) {
  const sm = size === 'sm' ? 'px-3 py-[5px] text-[8px]' : ''
  return (
    <button
      className={cn(base, variants[variant], sm, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
