import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function TrustScorePage() {
  const factors = [
    { name: 'Payout Reliability', weight: '30 pts', desc: 'Whether the firm has confirmed payouts or reported issues. Source: community reports + official announcements.' },
    { name: 'Payout Speed', weight: '20 pts', desc: 'Average number of days from payout request to funds received. Faster = higher score.' },
    { name: 'Years Active', weight: '15 pts', desc: 'Firms operating for longer have proven staying power. New firms start at 0 until they establish a track record.' },
    { name: 'Delayed Payout Reports', weight: '-10 pts', desc: 'Deducted for each verified report of delayed or missed payouts in the community.' },
    { name: 'Support Quality', weight: '15 pts', desc: 'Response speed and helpfulness of customer support. Tested quarterly.' },
    { name: 'Rules Clarity', weight: '10 pts', desc: 'How clearly the firm publishes its trading rules, conditions, and challenge terms.' },
    { name: 'Trader Reviews', weight: '10 pts', desc: 'Average rating from verified TheFundedDiaries community reviews.' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '10px' }}>Methodology</div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-.03em', marginBottom: '14px' }}>How Trust Score Works</h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7 }}>
            The Trust Score is a number from 0 to 100 that represents how reliable and trustworthy a prop firm is based on objective, verifiable data. No firm can pay to improve its score.
          </p>
        </div>

        <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', marginBottom: '6px' }}>Independence Guarantee</div>
          <div style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: 1.7 }}>
            Affiliate relationships with prop firms do not affect Trust Scores. A firm paying us 20% commission and scoring 60/100 will always rank below a firm paying us 5% with a score of 90/100.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
          {factors.map(f => (
            <div key={f.name} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>{f.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: f.weight.startsWith('-') ? 'var(--coral)' : 'var(--teal)', whiteSpace: 'nowrap' }}>
                max {f.weight}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '12px' }}>Score Interpretation</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { range: '80-100', label: 'Excellent', color: 'var(--green)', desc: 'Highly reliable firm with confirmed payouts and strong community trust.' },
              { range: '60-79', label: 'Good', color: 'var(--teal)', desc: 'Generally reliable. Minor issues may exist but overall trustworthy.' },
              { range: '40-59', label: 'Average', color: 'var(--amber)', desc: 'Proceed with caution. Limited track record or some community concerns.' },
              { range: '0-39', label: 'Poor', color: 'var(--coral)', desc: 'Significant concerns. High risk. Research carefully before purchasing.' },
            ].map(s => (
              <div key={s.range} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: 'var(--bg2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 900, color: s.color, width: '60px', flexShrink: 0 }}>{s.range}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: s.color, width: '70px', flexShrink: 0 }}>{s.label}</div>
                <div style={{ fontSize: '13px', color: 'var(--t2)' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}