import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalculatorClient from './CalculatorClient'

export const dynamic = 'force-dynamic'

export default async function CalculatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/calculator')
  return <CalculatorClient />
}