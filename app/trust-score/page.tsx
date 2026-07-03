import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function TrustScorePage() {
  const factors = [
    { label: 'Payout Reliability', max: 25, description: 'Has the firm confirmed all payouts? "Confirmed" = 25pts, "Unknown" = 10pts, "Issues reported" = 0pts.' },
    { label: 'Payout Speed', max: 20, description: 'How quickly does the firm pay out? Same day = 20pts, 1-3 days = 15pts, up to 7 days = 10pts, up to 14 days = 5pts.' },
    { label: 'Years Active', max: 20, description: 'Firm longevity signals stability. 5+ years = 20pts, 3-5 years = 14pts, 2-3 years = 10pts, 1-2 years = 6pts.' },
    { label: 'No Delayed Payouts', max: 15, description: 'Based on reported delays in our system. 0 delays = 15pts, 1-2 delays = 10pts, 3-5 = 5pts, 5+ = 0pts.' },
    { label: 'Support Quality', max: 10, description: 'Assessed from user reports and response time testing. Fast = 10pts, Medium = 6pts, Slow = 2pts.' },
    { label: 'Rules Clarity', max: 5, description: 'Are the trading rules clearly documented? Clear = 5pts, Ambiguous = 2pts, Unclear = 0pts.' },
    { label: 'Average Review Rating', max: 5, description: 'Based on verified reviews on TheFundedDiaries. 4.5+ stars = 5pts, 4.0+ = 4pts, 3.5+ = 2pts.' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Methodology</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '12px' }}>How Trust Score Works</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7 }}>
            The Trust Score is a number from 0–100 calculated automatically from real, verifiable data. It is updated every time we update a firm's information. It is never paid for or influenced by the firm.
          </p>
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
          <div style={{ background: 'var(--bg2)', padding: '14px 24px', display: 'grid', gridTemplateColumns: '1fr 80px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t3)' }}>
            <div>Factor</div><div style={{ textAlign: 'right' }}>Max Points</div>
          </div>
          {factors.map((f, i) => (
            <div key={f.label} style={{ padding: '18px 24px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>{f.max}</div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>{f.description}</div>
              <div style={{ marginTop: '10px', height: '4px', background: 'var(--bg3)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(f.max / 100) * 100}%`, background: 'linear-gradient(90deg,var(--teal2),var(--teal))', borderRadius: '100px' }} />
              </div>
            </div>
          ))}
          <div style={{ padding: '16px 24px', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg2)' }}>
            <div style={{ fontWeight: 700 }}>Total possible score</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>100</div>
          </div>
        </div>

        <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '12px', padding: '20px 24px', fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7 }}>
          <b style={{ color: 'var(--teal)' }}>Important:</b> The Trust Score is calculated automatically and updated when we update firm data. No firm can pay to improve their score. If you believe a score is incorrect, please <a href="/contact" style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>contact us</a>.
        </div>
      </main>
      <Footer />
    </>
  )
}