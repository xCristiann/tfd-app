import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-[#E8EEF8] rounded-xl p-[18px]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[13px] font-700 text-[#1A3A6B] tracking-wide uppercase" style={{fontWeight:700,letterSpacing:'0.05em',fontSize:'11px',color:'#8FA3BF'}}>{title}</h3>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

interface KPIProps { label: string; value: string; sub?: string; subColor?: string }
export function KPICard({ label, value, sub, subColor }: KPIProps) {
  return (
    <div className="bg-white border border-[#E8EEF8] rounded-xl p-4">
      <div className="text-[10px] font-600 uppercase tracking-[1.5px] text-[#8FA3BF] mb-2" style={{fontWeight:600}}>{label}</div>
      <div className="font-700 text-[#1A3A6B] mb-1" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'22px',fontWeight:500,letterSpacing:'-0.3px'}}>{value}</div>
      {sub && <div className={cn('text-[11px] font-400', subColor ?? 'text-[#8FA3BF]')}>{sub}</div>}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: string
}
export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-600 text-[#5C7A9E]" style={{fontWeight:600}}>{label}</label>}
      <div className={cn('flex bg-[#F4F7FD] border rounded-lg transition-colors', error ? 'border-red-400' : 'border-[#E8EEF8] focus-within:border-[#2255CC] focus-within:bg-white')}>
        {icon && <span className="px-3 flex items-center text-[#8FA3BF] border-r border-[#E8EEF8] text-sm">{icon}</span>}
        <input className={cn('flex-1 px-3 py-2.5 bg-transparent outline-none text-[#1A3A6B] placeholder-[#BCC9DA] text-[12px]', className)} {...props}/>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}
export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-600 text-[#5C7A9E]" style={{fontWeight:600}}>{label}</label>}
      <textarea className={cn('px-3 py-2.5 bg-[#F4F7FD] border border-[#E8EEF8] rounded-lg outline-none text-[#1A3A6B] placeholder-[#BCC9DA] text-[12px] resize-y focus:border-[#2255CC] focus:bg-white transition-colors', className)} {...props}/>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string
}
export function Select({ label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-600 text-[#5C7A9E]" style={{fontWeight:600}}>{label}</label>}
      <select className={cn('px-3 py-2.5 bg-[#F4F7FD] border border-[#E8EEF8] rounded-lg outline-none text-[#1A3A6B] text-[12px] cursor-pointer focus:border-[#2255CC] focus:bg-white transition-colors', className)} {...props}>{children}</select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }
export function Modal({ open, onClose, title, children, width = '520px' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,58,107,.4)]" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl border border-[#E8EEF8] shadow-xl" style={{width}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8EEF8]">
          <h2 className="text-[15px] font-700 text-[#1A3A6B]" style={{fontWeight:700}}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8FA3BF] hover:bg-[#F4F7FD] hover:text-[#1A3A6B] cursor-pointer border-none bg-transparent text-lg transition-colors">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

interface DrawdownBarProps { label: string; used: number; max: number; color?: string }
export function DrawdownBar({ label, used, max, color = '#2255CC' }: DrawdownBarProps) {
  const pct = Math.min(100, (used / max) * 100)
  const danger = pct > 80
  const warn = pct > 60
  const c = danger ? '#DC2626' : warn ? '#D97706' : color
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[#5C7A9E]">{label}</span>
        <span className="text-[11px] font-500" style={{fontFamily:"'JetBrains Mono',monospace",color:c,fontWeight:500}}>{used.toFixed(1)}% / {max}%</span>
      </div>
      <div className="h-[5px] bg-[#EEF3FF] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:c}}/>
      </div>
    </div>
  )
}
