import { useState, useCallback } from 'react'
import type { ToastMessage } from '@/types/database'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((
    type: ToastMessage['type'],
    icon: string,
    title: string,
    body: string
  ) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((p) => [...p, { id, type, icon, title, body }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3800)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
