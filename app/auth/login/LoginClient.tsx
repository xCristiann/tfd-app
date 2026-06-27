'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{background:'var(--bg1)',border:'1px solid var(--border2)',borderRadius:'20px',padding:'48px',width:'100%',maxWidth:'420px',textAlign:'center'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'32px',textDecoration:'none'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,var(--teal),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="#04120c" opacity=".6"/><path d="M9 12h6M12 9v6" stroke="#04120c" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <span style={{fontSize:'18px',fontWeight:800,color:'var(--t1)'}}>TheFunded<span style={{color:'var(--teal)'}}>Diaries</span></span>
        </Link>
        <h2 style={{fontSize:'22px',fontWeight:800,marginBottom:'6px'}}>Welcome back</h2>
        <p style={{fontSize:'14px',color:'var(--t2)',marginBottom:'28px'}}>Sign in to access the Admin CRM.</p>
        {error && <div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'9px',padding:'12px',fontSize:'13.5px',color:'var(--coral)',marginBottom:'16px'}}>{error}</div>}
        <div style={{textAlign:'left',marginBottom:'16px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Email address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input-base" placeholder="admin@example.com" onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
        </div>
        <div style={{textAlign:'left',marginBottom:'20px'}}>
          <label style={{fontSize:'12px',fontWeight:600,color:'var(--t2)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.04em'}}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input-base" placeholder="••••••••••" onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
        </div>
        <button onClick={handleLogin} disabled={loading} className="btn-primary" style={{width:'100%',padding:'13px',fontSize:'15px',borderRadius:'10px',opacity:loading?0.7:1}}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
        <div style={{marginTop:'20px',fontSize:'13px',color:'var(--t3)'}}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" style={{color:'var(--teal)',textDecoration:'none',fontWeight:600}}>Register</Link>
        </div>
        <div style={{marginTop:'12px'}}>
          <Link href="/" style={{fontSize:'13px',color:'var(--t3)',textDecoration:'none'}}>← Back to site</Link>
        </div>
      </div>
    </div>
  )
}
