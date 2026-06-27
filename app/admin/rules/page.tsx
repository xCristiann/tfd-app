import { createClient } from '@/lib/supabase/server'
import RulesManager from '@/components/admin/RulesManager'

export default async function RulesPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase.from('firms').select('id, name').order('name')
  const { data: rules } = await supabase.from('rules').select('*').order('sort_order')
  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:800,marginBottom:'4px'}}>Rules Manager</h1>
      <p style={{fontSize:'13.5px',color:'var(--t2)',marginBottom:'28px'}}>Set trading rules per firm. These appear on each firm's Rules tab.</p>
      <RulesManager firms={firms||[]} rules={rules||[]} />
    </div>
  )
}
