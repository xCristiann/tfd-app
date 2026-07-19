import Link from 'next/link'
export default function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'80px',fontWeight:900,background:'linear-gradient(135deg,var(--teal),var(--violet))',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',lineHeight:1,marginBottom:'16px'}}>404</div>
        <h1 style={{fontSize:'24px',fontWeight:800,marginBottom:'12px'}}>Page not found</h1>
        <p style={{color:'var(--t2)',marginBottom:'28px'}}>The page you're looking for doesn't exist.</p>
        <Link href="/" style={{padding:'11px 24px',borderRadius:'10px',fontSize:'14px',fontWeight:700,color:'#04120c',background:'var(--teal)',textDecoration:'none',boxShadow:'0 0 20px var(--teal-glow)'}}>Back to Home &rarr;</Link>
      </div>
    </div>
  )
}
