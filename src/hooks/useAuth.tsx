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

    const timeout = setTimeout(done, 2000)

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      if (!s) { clearTimeout(timeout); done(); return }

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
        done()
        supabase.from('users').select('*').eq('id', s.user.id).single()
          .then(({ data }) => { if (mounted) setProfile(data) })
          .catch(() => {})

        // Capture IP on every sign in
        if (event === 'SIGNED_IN') {
          fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(({ ip }) => {
              const now = new Date().toISOString()
              supabase.from('users').update({
                last_login_ip: ip,
                last_login_at: now,
              }).eq('id', s.user.id).then(() => {})
              // Append to history via RPC
              supabase.rpc('append_login_history', {
                p_user_id: s.user.id,
                p_ip: ip,
                p_at: now,
              }).then(() => {}).catch(() => {})
            })
            .catch(() => {})
        }
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
