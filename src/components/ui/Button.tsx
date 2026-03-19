import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'success' | 'secondary' | 'gold' | 'blue'

const base = 'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer transition-all duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed border'

const variants: Record<Variant, string> = {
  primary:   'bg-[#2255CC] text-white border-[#2255CC] hover:bg-[#1A44B0] hover:border-[#1A44B0]',
  gold:      'bg-[#2255CC] text-white border-[#2255CC] hover:bg-[#1A44B0] hover:border-[#1A44B0]',
  blue:      'bg-[#2255CC] text-white border-[#2255CC] hover:bg-[#1A44B0] hover:border-[#1A44B0]',
  ghost:     'bg-white text-[#1A3A6B] border-[#C5D5EA] hover:bg-[#EEF3FF] hover:border-[#2255CC]',
  secondary: 'bg-[#EEF3FF] text-[#2255CC] border-[#C5D5FA] hover:bg-[#E0EAFF]',
  danger:    'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]',
  success:   'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0] hover:bg-[#DCFCE7]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', loading, size = 'md', className, children, disabled, ...props }: ButtonProps) {
  const sz = size === 'sm'
    ? 'px-3 py-1.5 text-[11px] rounded-md'
    : size === 'lg'
    ? 'px-6 py-3 text-[13px] rounded-lg'
    : 'px-4 py-2 text-[12px] rounded-lg'
  return (
    <button className={cn(base, variants[variant], sz, className)} disabled={disabled || loading} {...props}>
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>}
      {children}
    </button>
  )
}
