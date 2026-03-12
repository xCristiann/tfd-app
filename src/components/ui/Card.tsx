import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

// ─── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[var(--bg2)] border border-[var(--bdr)] p-[18px]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="serif text-[15px] font-semibold">{title}</h3>
      {action}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
interface KPIProps { label: string; value: string; sub?: string; subColor?: string }

export function KPICard({ label, value, sub, subColor }: KPIProps) {
  return (
    <div className="bg-[var(--bg2)] border border-[var(--bdr)] p-[14px]">
      <div className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-[7px]">{label}</div>
      <div className="serif text-[21px] font-bold mb-[3px]">{value}</div>
      {sub && <div className={cn('mono text-[10px]', subColor ?? 'text-[var(--text2)]')}>{sub}</div>}
    </div>
  )
}

// ─── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: string
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{label}</label>}
      <div className={cn('flex bg-[var(--bg3)] border transition-colors', error ? 'border-red-500/35' : 'border-[var(--dim)] focus-within:border-[var(--bdr2)]')}>
        {icon && <span className="px-[10px] flex items-center text-[var(--text3)] border-r border-[var(--dim)] text-xs">{icon}</span>}
        <input
          className={cn('flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[var(--text3)] font-sans text-[12px]', className)}
          {...props}
        />
      </div>
      {error && <span className="text-[10px] text-[var(--red)]">{error}</span>}
    </div>
  )
}

// ─── Textarea ──────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{label}</label>}
      <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
        <textarea
          className={cn('flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] placeholder-[var(--text3)] font-sans text-[12px] resize-y min-h-[80px]', className)}
          {...props}
        />
      </div>
    </div>
  )
}

// ─── Select ────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, children, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[7px] tracking-[2px] uppercase text-[var(--text3)] font-semibold">{label}</label>}
      <div className="flex bg-[var(--bg3)] border border-[var(--dim)] focus-within:border-[var(--bdr2)] transition-colors">
        <select
          className={cn('flex-1 px-3 py-[10px] bg-transparent outline-none text-[var(--text)] font-sans text-[12px] cursor-pointer appearance-none', className)}
          style={{ background: 'transparent' }}
          {...props}
        >
          {children}
        </select>
      </div>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean; onClose: () => void
  title: string; subtitle?: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, subtitle, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[8000] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--bg2)] border border-[var(--bdr2)] p-[22px] min-w-[360px] max-w-[520px] w-full animate-[fadeIn_.22s_ease]">
        <h2 className="serif text-[19px] font-bold mb-1">{title}</h2>
        {subtitle && <p className="text-[11px] text-[var(--text2)] mb-4">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

// ─── DrawdownBar ───────────────────────────────────────────────────────────
export function DrawdownBar({ label, value, max, warn = 70, danger = 90 }: {
  label: string; value: number; max: number; warn?: number; danger?: number
}) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= danger ? 'var(--red)' : pct >= warn ? 'var(--gold)' : 'var(--green)'
  return (
    <div className="mb-[11px]">
      <div className="flex justify-between mb-[4px]">
        <span className="text-[9px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold">{label}</span>
        <span className="mono text-[11px]" style={{ color }}>{value.toFixed(2)}% / {max}%</span>
      </div>
      <div className="h-[4px] bg-white/5 rounded-[2px] overflow-hidden">
        <div className="h-full rounded-[2px] transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
