import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FirmTabs from '@/components/firm/FirmTabs'

export const revalidate = 60

export default async function FirmPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { data: firm } = await supabase
    .from('firms')
    .select('*, challenges(*), rules(*)')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!firm) notFound()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(username, full_name), comments(*, profiles(username, full_name))')
    .eq('firm_id', firm.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const challenges = firm.challenges?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []
  const rules = firm.rules?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

  return (
    <>
      <Navbar />
      <main style={{maxWidth:'1200px',margin:'0 auto',padding:'48px 40px 80px'}}>
        {/* HEADER */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'24px',paddingBottom:'36px',borderBottom:'1px solid var(--border)',marginBottom:'40px'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:'18px'}}>
            <div style={{width:'68px',height:'68px',borderRadius:'16px',background:'var(--bg2)',border:'1px solid var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:900,color:'var(--t2)',fontFamily:'JetBrains Mono, monospace',flexShrink:0}}>
              {firm.name.slice(0,2).toUpperCase()}
            </div>
            <div>
              <h1 style={{fontSize:'32px',fontWeight:900,letterSpacing:'-.03em',marginBottom:'10px'}}>{firm.name}</h1>
              <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
                <span style={{fontSize:'11.5px',fontWeight:600,padding:'4px 11px',borderRadius:'100px',background:'rgba(0,229,160,0.1)',color:'var(--teal)',border:'1px solid rgba(0,229,160,0.25)'}}>
                  Trust Score {firm.trust_score}/100
                </span>
                {firm.founded_year && <span style={{fontSize:'11.5px',fontWeight:600,padding:'4px 11px',borderRadius:'100px',background:'var(--bg2)',color:'var(--t2)',border:'1px solid var(--border2)'}}>Since {firm.founded_year}</span>}
                {firm.accepts_eu && <span style={{fontSize:'11.5px',fontWeight:600,padding:'4px 11px',borderRadius:'100px',background:'rgba(0,229,160,0.1)',color:'var(--teal)',border:'1px solid rgba(0,229,160,0.25)'}}>Accepts EU</span>}
                {firm.headquarters && <span style={{fontSize:'11.5px',fontWeight:600,padding:'4px 11px',borderRadius:'100px',background:'var(--bg2)',color:'var(--t2)',border:'1px solid var(--border2)'}}>{firm.headquarters}</span>}
              </div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'10px',flexShrink:0}}>
            {firm.affiliate_link && (
              <a href={firm.affiliate_link} target="_blank" rel="noopener noreferrer" style={{padding:'13px 26px',borderRadius:'10px',fontSize:'14px',fontWeight:800,color:'#04120c',background:'var(--teal)',textDecoration:'none',boxShadow:'0 0 24px var(--teal-glow)',whiteSpace:'nowrap'}}>
                Visit {firm.name} →
              </a>
            )}
            {firm.discount_code && (
              <div style={{fontSize:'12px',color:'var(--t3)',textAlign:'right'}}>
                Use code <b style={{color:'var(--teal)',fontFamily:'JetBrains Mono, monospace'}}>{firm.discount_code}</b> for discount
              </div>
            )}
          </div>
        </div>

        <FirmTabs firm={firm} challenges={challenges} rules={rules} reviews={reviews || []} />
      </main>
      <Footer />
    </>
  )
}
