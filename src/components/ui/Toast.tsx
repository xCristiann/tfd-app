import type { ToastMessage } from '@/types/database'

const border: Record<ToastMessage['type'], string> = {
  success: 'border-l-[var(--green)]',
  error:   'border-l-[var(--red)]',
  warning: 'border-l-[var(--gold)]',
  info:    'border-l-[var(--blue)]',
}

export function ToastContainer({ toasts, dismiss }: {
  toasts: ToastMessage[]
  dismiss: (id: string) => void
}) {
  return (
    <div className="fixed top-[58px] right-[15px] z-[9999] flex flex-col gap-[7px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`bg-[var(--bg2)] border border-[var(--bdr2)] border-l-[3px] ${border[t.type]} px-[13px] py-[10px] min-w-[240px] flex items-start gap-[9px] cursor-pointer shadow-[0_6px_28px_rgba(0,0,0,.55)] animate-[slideIn_.25s_ease]`}
        >
          <span className="text-[15px] flex-shrink-0">{t.icon}</span>
          <div>
            <div className="text-[11px] font-semibold mb-[2px]">{t.title}</div>
            <div className="text-[10px] text-[var(--text2)] leading-[1.45]">{t.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
