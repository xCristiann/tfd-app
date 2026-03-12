import { supabase } from './supabase'
import type { User } from '@/types/database'

export const auth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signUp(email: string, password: string, profile: {
    first_name: string; last_name: string; country?: string
  }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const { error: pe } = await supabase.from('users').insert({
        id: data.user.id, email,
        first_name: profile.first_name,
        last_name:  profile.last_name,
        country:    profile.country ?? null,
        role: 'trader',
      })
      if (pe) throw pe
    }
    return data
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getProfile(): Promise<User | null> {
    const user = await auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    return data
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  },

  onAuthStateChange(cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(cb)
  },
}
