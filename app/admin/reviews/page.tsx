import { createClient } from '@/lib/supabase/server'
import ReviewsAdmin from '@/components/admin/ReviewsAdmin'

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(username, full_name), firms(name)')
    .order('created_at', { ascending: false })
  return (
    <div>
      <h1 style={{fontSize:'22px',fontWeight:800,marginBottom:'4px'}}>Reviews & Comments</h1>
      <p style={{fontSize:'13.5px',color:'var(--t2)',marginBottom:'28px'}}>Moderate user-submitted reviews before they go live.</p>
      <ReviewsAdmin reviews={reviews||[]} />
    </div>
  )
}
