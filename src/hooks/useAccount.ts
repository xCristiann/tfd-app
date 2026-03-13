import { useState, useEffect } from 'react'
import { accountsApi } from '@/lib/api/accounts'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/types/database'

export function useAccount() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [primary, setPrimary] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let userId: string | null = null

    accountsApi.getMine()
      .then(async (data) => {
        setAccounts(data)
        const funded = data.find((a) => a.phase === 'funded') ?? data[0] ?? null
        setPrimary(funded)

        // Get user id for realtime filter
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id ?? null
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

    // Realtime: subscribe to ALL account changes for this user
    // We use a channel on the whole table filtered by user_id
    const channel = supabase
      .channel('all-my-accounts')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'accounts',
      }, (payload) => {
        const updated = payload.new as Account
        // Update accounts array
        setAccounts(prev => {
          const newAccounts = prev.map(a => a.id === updated.id ? { ...a, ...updated } : a)
          return newAccounts
        })
        // Update primary if it's the same account
        setPrimary(p => p?.id === updated.id ? { ...p, ...updated } : p)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { accounts, primary, loading, error }
}
