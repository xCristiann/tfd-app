import { useState, useEffect, createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
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
    // Initial session check
    auth.getSession().then(async (s) => {
      setSession(s)
      if (s) {
        try { setProfile(await auth.getProfile()) } catch { setProfile(null) }
      }
      setLoading(false)
    })

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s) {
        try { setProfile(await auth.getProfile()) } catch { setProfile(null) }
      } else {
        setProfile(null)
      }
      setLoading(false)  // ← fix: always stop loading after auth change
    })

    return () => subscription.unsubscribe()
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
