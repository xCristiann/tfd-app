import { useState, useEffect } from 'react'
import { accountsApi } from '@/lib/api/accounts'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/types/database'

export function useAccount() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [primary, setPrimary] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  async function refetch() {
    const data = await accountsApi.getMine()
    setAccounts(prev => data.map(updated => {
      const existing = prev.find(a => a.id === updated.id)
      return existing
        ? { ...updated, challenge_products: (existing as any).challenge_products ?? (updated as any).challenge_products }
        : updated
    }))
    setPrimary(prev => {
      const updated = data.find(a => a.id === prev?.id) ?? data.find(a => a.phase === 'funded') ?? data[0] ?? null
      if (!updated) return prev
      return {
        ...updated,
        challenge_products: (prev as any)?.challenge_products ?? (updated as any).challenge_products
      }
    })
  }

  useEffect(() => {
    accountsApi.getMine()
      .then(async (data) => {
        setAccounts(data)
        const funded = data.find((a) => a.phase === 'funded') ?? data[0] ?? null
        setPrimary(funded)
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!userId) return

    // Poll every 5s to catch any status changes
    const iv = setInterval(refetch, 5000)

    // Realtime filtered by user_id
    const channel = supabase
      .channel(`accounts-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'accounts',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as Account
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

    return () => {
      clearInterval(iv)
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { accounts, primary, loading, error }
}
