'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null
            return window.sessionStorage.getItem(key)
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return
            window.sessionStorage.setItem(key, value)
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return
            window.sessionStorage.removeItem(key)
          },
        },
      },
    }
  )
}