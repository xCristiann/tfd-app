import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmCard from '@/components/firm/FirmCard'
import type { Firm } from '@/types'

export const revalidate = 60

export default async function FirmsPage() {
  const supabase = await createClient()
  const { data: firms } = await supabase
    .from('firms')
    .select('*, challenges(*), rules(*)')
    .eq('is_published', true)
    .order('trust_score', { ascending: false })

  const firmsList: Firm[] = firms || []

  return (
    <>
      <Navbar />
      <main style={{maxWidth:'1200px',margin:'0 auto',padding:'56px 40px 80px'}}>
        <div style={{marginBottom:'40px'}}>
          <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--teal)',marginBottom:'10px'}}>All Firms</div>
          <h1 style={{fontSize:'40px',fontWeight:900,letterSpacing:'-.03em',marginBottom:'12px'}}>Compare Prop Firms</h1>
          <p style={{fontSize:'16px',color:'var(--t2)',maxWidth:'560px'}}>All firms ranked by trust score. Click any card to see full rules, challenges, and verified reviews.</p>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'36px'}}>
          {['All','Forex','Futures','Crypto','Under $100','High Split','No Time Limit','EA Allowed'].map(f => (
            <button key={f} style={{padding:'7px 16px',borderRadius:'100px',fontSize:'13px',fontWeight:500,color:f==='All'?'var(--teal)':'var(--t2)',background:f==='All'?'rgba(0,229,160,0.06)':'var(--bg1)',border:`1px solid ${f==='All'?'rgba(0,229,160,0.3)':'var(--border)'}`,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
              {f}
            </button>
          ))}
        </div>

        {firmsList.length > 0 ? (
          <>
            <div style={{fontSize:'13px',color:'var(--t3)',marginBottom:'20px'}}>{firmsList.length} firms found</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
              {firmsList.map((firm, i) => (
                <FirmCard key={firm.id} firm={firm} featured={i === 0} />
              ))}
            </div>
          </>
        ) : (
          <div style={{textAlign:'center',padding:'80px 20px',color:'var(--t2)'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🏦</div>
            <div style={{fontSize:'20px',fontWeight:700,marginBottom:'8px'}}>No firms yet</div>
            <p>Check back soon — we're adding firms regularly.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}

export const dynamic = 'force-dynamic'
