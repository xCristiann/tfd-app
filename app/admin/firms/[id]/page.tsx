import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FirmForm from '@/components/admin/FirmForm'

export default async function EditFirmPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: firm } = await supabase.from('firms').select('*').eq('id', params.id).single()
  if (!firm) notFound()
  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:800,marginBottom:'4px'}}>Edit Firm</h1>
      <p style={{fontSize:'13.5px',color:'var(--t2)',marginBottom:'28px'}}>Editing: <b style={{color:'var(--teal)'}}>{firm.name}</b></p>
      <FirmForm firm={firm} />
    </div>
  )
}
