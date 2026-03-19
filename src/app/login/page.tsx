import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Card'

export function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirst]   = useState('')
  const [lastName, setLast]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await auth.signIn(email, password)
      const profile = await auth.getProfile()
      if (profile?.role === 'admin') navigate('/admin')
      else if (profile?.role === 'support') navigate('/support-crm')
      else navigate('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await auth.signUp(email, password, { first_name: firstName, last_name: lastName })
      setSuccess('Account created! Please check your email to confirm.')
      setTab('login')
    } catch (err: any) {
      setError(err.message ?? 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{fontFamily:"'Inter',system-ui,sans-serif",background:'#F0F4FB'}}>
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12" style={{background:'#1A3A6B'}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:'22px',fontWeight:700,color:'#fff',letterSpacing:'-0.3px'}}>
            The Funded <span style={{color:'#60A5FA',fontStyle:'italic'}}>Diaries</span>
          </div>
          <div style={{fontSize:'10px',letterSpacing:'3px',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginTop:'4px',fontWeight:600}}>
            Write Your Trading Story
          </div>
        </div>
        <div>
          <div style={{fontSize:'32px',fontWeight:700,color:'#fff',fontFamily:"'Playfair Display',serif",lineHeight:1.1,marginBottom:'16px',letterSpacing:'-0.5px'}}>
            Trade our capital.<br/>Keep your <span style={{color:'#60A5FA',fontStyle:'italic'}}>profits.</span>
          </div>
          <p style={{fontSize:'13px',color:'rgba(255,255,255,.5)',lineHeight:1.7,fontWeight:300,marginBottom:'32px'}}>
            Get funded up to $200,000. Keep up to 90% of what you earn. One payment, no subscriptions.
          </p>
          <div style={{display:'flex',gap:'24px'}}>
            {[['$4.8M+','Paid out'],['90%','Max split'],['24h','Payouts']].map(([v,l])=>(
              <div key={l}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'20px',fontWeight:500,color:'#fff'}}>{v}</div>
                <div style={{fontSize:'10px',color:'rgba(255,255,255,.4)',letterSpacing:'1px',textTransform:'uppercase',marginTop:'2px'}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:'11px',color:'rgba(255,255,255,.25)'}}>© 2026 The Funded Diaries</div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-8" style={{fontFamily:"'Playfair Display',serif",fontSize:'20px',fontWeight:700,color:'#1A3A6B'}}>
            The Funded <span style={{color:'#2255CC',fontStyle:'italic'}}>Diaries</span>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#EEF3FF] rounded-xl p-1 mb-8">
            {(['login','register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className="flex-1 py-2 text-[12px] font-600 rounded-lg cursor-pointer border-none transition-all"
                style={{fontWeight:600,background: tab===t ? '#fff' : 'transparent', color: tab===t ? '#1A3A6B' : '#8FA3BF', boxShadow: tab===t ? '0 1px 4px rgba(26,58,107,.1)' : 'none'}}>
                {t === 'login' ? 'Log In' : 'Create Account'}
              </button>
            ))}
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700">{success}</div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{error}</div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/>
              <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
              <div className="flex justify-end">
                <button type="button" className="text-[11px] text-[#2255CC] bg-none border-none cursor-pointer hover:underline">Forgot password?</button>
              </div>
              <Button type="submit" loading={loading} className="w-full py-3 text-[13px]">Log In →</Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" value={firstName} onChange={e=>setFirst(e.target.value)} placeholder="Alex" required/>
                <Input label="Last name" value={lastName} onChange={e=>setLast(e.target.value)} placeholder="Johnson" required/>
              </div>
              <Input label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/>
              <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8}/>
              <Button type="submit" loading={loading} className="w-full py-3 text-[13px]">Create Account →</Button>
              <p className="text-center text-[11px] text-[#8FA3BF]">
                By creating an account you agree to our{' '}
                <a href="/terms" className="text-[#2255CC] no-underline hover:underline">Terms</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
