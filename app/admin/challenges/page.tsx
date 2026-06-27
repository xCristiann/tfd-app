import { createClient } from '@/lib/supabase/server'
import ChallengesBuilder from '@/components/admin/ChallengesBuilder'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase.from('firms').select('id, name').order('name')
  const { data: challenges } = await supabase.from('challenges').select('*').order('sort_order')
  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:800,marginBottom:'4px'}}>Challenges Builder</h1>
      <p style={{fontSize:'13.5px',color:'var(--t2)',marginBottom:'28px'}}>Configure challenge tiers per firm. Each firm can have multiple tiers.</p>
      <ChallengesBuilder firms={firms||[]} challenges={challenges||[]} />
    </div>
  )
}
