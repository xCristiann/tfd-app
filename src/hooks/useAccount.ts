import { useState, useEffect } from 'react'
import { accountsApi } from '@/lib/api/accounts'
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
  }, [])

  // Subscribe to real-time updates on the primary account
  useEffect(() => {
    if (!primary) return
    const sub = accountsApi.subscribeToAccount(primary.id, (updated) => {
      setPrimary((p) => p ? { ...p, ...updated } : p)
    })
    return () => { sub.unsubscribe() }
  }, [primary?.id])

  return { accounts, primary, loading, error }
}
