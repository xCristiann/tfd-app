import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmLogoServer from '@/components/firm/FirmLogoServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, firms(name, slug, logo_url), profiles(full_name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50)

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Community</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>Trader Reviews</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)' }}>Real reviews from verified traders across all listed prop firms.</p>
        </div>

        {(!reviews || reviews.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--t2)', background: 'var(--bg1)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No reviews yet</div>
            <div style={{ fontSize: '14px' }}>Be the first to review a prop firm!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((review: any) => (
              <div key={review.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <Link href={`/firms/${review.firms?.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <FirmLogoServer name={review.firms?.name || ''} logoUrl={review.firms?.logo_url} size={32} radius={7} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>{review.firms?.name}</span>
                  </Link>
                  <div style={{ fontSize: '16px', color: 'var(--amber)' }}>{stars(review.rating || 0)}</div>
                </div>
                {review.title && <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{review.title}</div>}
                <div style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65 }}>{review.content}</div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--t3)' }}>
                  {review.profiles?.full_name || 'Anonymous'} · {new Date(review.created_at).toLocaleDateString('en-GB')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}