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
    accountsApi.getMine()
      .then((data) => {
        setAccounts(data)
        const funded = data.find((a) => a.phase === 'funded') ?? data[0] ?? null
        setPrimary(funded)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

    const channel = supabase
      .channel('all-my-accounts')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'accounts',
      }, (payload) => {
        const updated = payload.new as Account
        // Merge update but KEEP challenge_products from previous state
        setAccounts(prev => prev.map(a =>
          a.id === updated.id
            ? { ...updated, challenge_products: (a as any).challenge_products }
            : a
        ))
        setPrimary(p =>
          p?.id === updated.id
            ? { ...updated, challenge_products: (p as any).challenge_products }
            : p
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { accounts, primary, loading, error }
}
