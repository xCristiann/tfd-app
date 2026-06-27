import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirect=/admin')

  // Use service role to bypass RLS when checking is_admin
  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/?error=unauthorized')

  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',minHeight:'100vh',background:'var(--bg)'}}>
      <AdminSidebar />
      <div style={{padding:'36px 40px',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}
