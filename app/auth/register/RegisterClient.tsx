'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  const handleRegister = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  if (done) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{background:'var(--bg1)',border:'1px solid rgba(0,229,160,0.3)',borderRadius:'20px',padding:'48px',maxWidth:'420px',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>📧</div>
        <h2 style={{fontSize:'22px',fontWeight:800,marginBottom:'10px'}}>Check your email</h2>
        <p style={{color:'var(--t2)',fontSize:'14px',lineHeight:1.7}}>We sent a confirmation link to <b style={{color:'var(--t1)'}}>{email}</b>. Click it to activate your account.</p>
        <Link href="/auth/login" style={{display:'inline-block',marginTop:'24px',color:'var(--teal)',fontSize:'14px',fontWeight:600,textDecoration:'none'}}>Back to Sign In →</Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{background:'var(--bg1)',border:'1px solid var(--border2)',borderRadius:'20px',padding:'48px',width:'100%',maxWidth:'420px',textAlign:'center'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'32px',textDecoration:'none'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/><path d="M9 12h6M12 9v6" stroke="#04120c" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{fontSize:'18px',fontWeight:800,color:'var(--t1)'}}>TheFunded<span style={{color:'var(--teal)'}}>Diaries</span></span>
        </Link>
        <h2 style={{fontSize:'22px',fontWeight:800,marginBottom:'6px'}}>Create account</h2>
        <p style={{fontSize:'14px',color:'var(--t2)',marginBottom:'28px'}}>Join to leave reviews and comments.</p>
        {error && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'9px',padding:'12px',fontSize:'13.5px',color:'var(--coral)',marginBottom:'16px'}}>{error}</div>}
        <div style={{textAlign:'left',marginBottom:'14px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Full name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="input-base" placeholder="Your name" />
        </div>
        <div style={{textAlign:'left',marginBottom:'14px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Email address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input-base" placeholder="you@example.com" />
        </div>
        <div style={{textAlign:'left',marginBottom:'20px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input-base" placeholder="Min. 6 characters" />
        </div>
        <button onClick={handleRegister} disabled={loading} className="btn-primary" style={{width:'100%',padding:'13px',fontSize:'15px',borderRadius:'10px',opacity:loading?0.7:1}}>
          {loading ? 'Creating...' : 'Create Account →'}
        </button>
        <div style={{marginTop:'20px',fontSize:'13px',color:'var(--t3)'}}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{color:'var(--teal)',textDecoration:'none',fontWeight:600}}>Sign In</Link>
        </div>
      </div>
    </div>
  )
}
