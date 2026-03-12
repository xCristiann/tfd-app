import { useState, useEffect, createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database'

interface AuthCtx {
  session: Session | null
  profile: User | null
  loading: boolean
}

const AuthContext = createContext<AuthCtx>({ session: null, profile: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const done = () => { if (mounted) setLoading(false) }

    // Hard timeout — after 2s, stop loading NO MATTER WHAT
    const timeout = setTimeout(done, 2000)

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      if (!s) { clearTimeout(timeout); done(); return }

      // Try to get profile but don't block on it
      supabase.from('users').select('*').eq('id', s.user.id).single()
        .then(({ data }) => { if (mounted) setProfile(data) })
        .catch(() => {})
        .finally(() => { clearTimeout(timeout); done() })
    }).catch(() => { clearTimeout(timeout); done() })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return
      setSession(s)
      if (!s) { setProfile(null); done(); return }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Don't block — navigate first, load profile in background
        done()
        supabase.from('users').select('*').eq('id', s.user.id).single()
          .then(({ data }) => { if (mounted) setProfile(data) })
          .catch(() => {})
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
