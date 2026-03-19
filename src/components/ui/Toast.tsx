import type { ToastMessage } from '@/types/database'

const config: Record<ToastMessage['type'], { border: string; bg: string }> = {
  success: { border: 'border-l-green-500',  bg: 'bg-green-50' },
  error:   { border: 'border-l-red-500',    bg: 'bg-red-50' },
  warning: { border: 'border-l-amber-500',  bg: 'bg-amber-50' },
  info:    { border: 'border-l-[#2255CC]',  bg: 'bg-[#EEF3FF]' },
}

export function ToastContainer({ toasts, dismiss }: { toasts: ToastMessage[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed top-[60px] right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => {
        const c = config[t.type]
        return (
          <div key={t.id} onClick={() => dismiss(t.id)}
            className={`${c.bg} border border-[#E8EEF8] border-l-4 ${c.border} px-4 py-3 min-w-[260px] max-w-[320px] flex items-start gap-3 cursor-pointer rounded-xl shadow-lg`}
            style={{animation:'slideIn .2s ease'}}>
            <span className="text-base flex-shrink-0">{t.icon}</span>
            <div>
              <div className="text-[12px] font-600 text-[#1A3A6B] mb-0.5" style={{fontWeight:600}}>{t.title}</div>
              <div className="text-[11px] text-[#5C7A9E] leading-relaxed">{t.body}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
