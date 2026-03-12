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

async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial session check - with 3s timeout so it never hangs forever
    const timer = setTimeout(() => setLoading(false), 3000)

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      clearTimeout(timer)
      setSession(s)
      if (s?.user) setProfile(await fetchProfile(s.user.id))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (s?.user) {
        // Small delay to let DB trigger create the user row first
        await new Promise(r => setTimeout(r, 500))
        setProfile(await fetchProfile(s.user.id))
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => { clearTimeout(timer); subscription.unsubscribe() }
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
