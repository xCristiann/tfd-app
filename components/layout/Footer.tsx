import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{borderTop:'1px solid var(--border)',padding:'40px 0',marginTop:'80px'}}>
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 40px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'26px',height:'26px',borderRadius:'8px',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".9"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/>
                <path d="M9 12h6M12 9v6" stroke="#04120c" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{fontSize:'15px',fontWeight:800,letterSpacing:'-.02em'}}>TheFunded<span style={{color:'var(--teal)'}}>Diaries</span></span>
          </div>
          <div style={{display:'flex',gap:'24px',fontSize:'13px',color:'var(--t2)'}}>
            <Link href="/" style={{color:'var(--t2)',textDecoration:'none'}}>Firms</Link>
            <Link href="/firms" style={{color:'var(--t2)',textDecoration:'none'}}>Compare</Link>
            <Link href="/calculator" style={{color:'var(--t2)',textDecoration:'none'}}>Calculator</Link>
            <Link href="/auth/login" style={{color:'var(--t2)',textDecoration:'none'}}>Sign In</Link>
          </div>
        </div>
        <div style={{borderTop:'1px solid var(--border)',paddingTop:'24px',textAlign:'center',fontSize:'12px',color:'var(--t3)'}}>
          © 2026 TheFundedDiaries · Independent prop firm comparison · Data verified manually
        </div>
      </div>
    </footer>
  )
}
