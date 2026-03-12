import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { Input } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type Panel = 'login' | 'register' | 'forgot'

const TESTIMONIALS = [
  { q: '"Passed Phase 1 in 11 days. Platform is clean, payout same day. TFD is the real deal."', av: 'SK', name: 'Sofia Kowalski', detail: '$200K Funded · Withdrawn $35,020' },
  { q: '"Signup to funded in under two weeks. Proprietary platform faster and cleaner than MT5."', av: 'MT', name: 'Marcus Thompson', detail: '$100K Funded · Withdrawn $24,174' },
  { q: '"First payout was $19,200. Submitted Sunday, crypto in wallet Monday afternoon."', av: 'DM', name: 'Daniel Moreira', detail: '$200K Funded · Withdrawn $19,200' },
]

export function LoginPage() {
  const [panel, setPanel] = useState<Panel>('login')
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [fn, setFn]         = useState('')
  const [ln, setLn]         = useState('')
  const [country, setCountry] = useState('')
  const [confPw, setConfPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [forgotDone, setForgotDone] = useState(false)
  const [regDone, setRegDone] = useState(false)
  const [testIdx, setTestIdx] = useState(0)
  const navigate = useNavigate()

  setInterval(() => setTestIdx((i) => (i + 1) % TESTIMONIALS.length), 5000)
  const test = TESTIMONIALS[testIdx]

  async function doLogin() {
    setError(''); setLoading(true)
    try {
      await auth.signIn(email, pw)
      const p = await auth.getProfile()
      const dest = p?.role === 'admin' ? '/admin' : p?.role === 'support' ? '/support-crm' : '/dashboard'
      navigate(dest)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid credentials')
    } finally { setLoading(false) }
  }

  async function doRegister() {
    if (pw !== confPw) { setError("Passwords don't match"); return }
    setError(''); setLoading(true)
    try {
      await auth.signUp(email, pw, { first_name: fn, last_name: ln, country })
      setRegDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally { setLoading(false) }
  }

  async function doForgot() {
    setLoading(true)
    try { await auth.resetPassword(email); setForgotDone(true) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Hero */}
      <div className="w-[54%] bg-[var(--bg2)] border-r border-[var(--bdr)] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(rgba(212,168,67,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(212,168,67,.025) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 25% 55%,rgba(212,168,67,.07) 0%,transparent 60%)' }} />

        <div className="relative z-10 flex-1 flex flex-col justify-center px-[60px] py-[52px]">
          <div className="flex items-center gap-[13px] mb-[52px]">
            <div className="w-[42px] h-[42px] border-2 border-[var(--gold)] flex items-center justify-center text-[17px] text-[var(--gold)]">✦</div>
            <div>
              <div className="serif text-[18px] font-bold">The Funded Diaries</div>
              <div className="text-[7px] tracking-[3.5px] uppercase text-[var(--gold)] font-semibold mt-[1px]">Write Your Trading Story</div>
            </div>
          </div>

          <h1 className="serif text-[46px] font-bold leading-[1.1] mb-[18px]">
            Every trader<br />has a <em className="text-[var(--gold)]">story</em>.<br />Write yours.
          </h1>
          <p className="text-[14px] text-[var(--text2)] leading-[1.72] max-w-[390px] mb-[44px]">
            Join 14,281 funded traders. Trade our capital, keep up to 90% of your profits. Same-day payouts.
          </p>

          <div className="flex">
            {[['$4.8M','Paid Out'],['14K+','Traders'],['$2M','Max Account'],['90%','Profit Split']].map(([n,l])=>(
              <div key={l} className="pr-[28px] mr-[28px] border-r border-[var(--bdr)] last:border-0 last:pr-0 last:mr-0">
                <div className="serif text-[26px] font-bold text-[var(--gold)]">{n}</div>
                <div className="text-[9px] tracking-[1.5px] uppercase text-[var(--text3)] font-semibold">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-[44px] bg-[rgba(212,168,67,.04)] border border-[var(--bdr)] border-l-[3px] border-l-[var(--gold)] px-[22px] py-[18px]">
            <p className="text-[13px] text-[var(--text2)] italic leading-[1.65] mb-[10px]">{test.q}</p>
            <div className="flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-full bg-[rgba(212,168,67,.14)] border-[1.5px] border-[var(--bdr2)] flex items-center justify-center serif text-[11px] font-bold text-[var(--gold)]">{test.av}</div>
              <div>
                <div className="text-[12px] font-semibold">{test.name}</div>
                <div className="text-[9px] text-[var(--text3)]">{test.detail}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payout ticker */}
        <div className="relative z-10 border-t border-[rgba(0,217,126,.1)] bg-[rgba(0,217,126,.04)] px-[60px] py-2 flex gap-[30px]">
          {['Marcus T. +$12,840','Sofia K. +$31,500','Daniel M. +$19,200','Yuki C. +$8,400'].map((p)=>(
            <div key={p} className="flex items-center gap-[7px] flex-shrink-0">
              <div className="w-[4px] h-[4px] bg-[var(--green)] rounded-full shadow-[0_0_5px_var(--green)]" />
              <span className="text-[10px] text-[var(--text2)]">{p.split(' ')[0]} {p.split(' ')[1]}</span>
              <span className="mono text-[10px] text-[var(--green)]">{p.split(' ')[2]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-[40px] overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Tabs */}
          <div className="flex border-b border-[var(--bdr)] mb-8">
            {(['login','register'] as Panel[]).map((p)=>(
              <button key={p} onClick={()=>{setPanel(p);setError('')}}
                className={`px-[22px] py-[9px] pb-[13px] text-[12px] font-semibold cursor-pointer bg-transparent border-none border-b-2 -mb-[1px] transition-all ${panel===p?'text-[var(--gold)] border-[var(--gold)]':'text-[var(--text3)] border-transparent hover:text-[var(--text2)]'}`}
              >{p === 'login' ? 'Sign In' : 'Create Account'}</button>
            ))}
            <button onClick={()=>{setPanel('forgot');setError('')}}
              className={`ml-auto px-[22px] py-[9px] pb-[13px] text-[11px] font-semibold cursor-pointer bg-transparent border-none border-b-2 -mb-[1px] transition-all ${panel==='forgot'?'text-[var(--gold)] border-[var(--gold)]':'text-[var(--text3)] border-transparent hover:text-[var(--text2)]'}`}
            >Forgot Password</button>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,51,82,.08)] border border-[rgba(255,51,82,.2)] text-[var(--red)] text-[11px] mb-4">
              ⚠ {error}
            </div>
          )}

          {/* LOGIN */}
          {panel === 'login' && (
            <div className="flex flex-col gap-4">
              <div><h2 className="serif text-[24px] font-bold">Welcome back</h2><p className="text-[11px] text-[var(--text2)] mt-1">Sign in to your trader portal</p></div>
              <Input label="Email Address" icon="✉" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} />
              <Input label="Password" icon="🔒" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} />
              <Button loading={loading} onClick={doLogin} className="w-full">Sign In to Portal</Button>
              <div className="text-[10px] text-[var(--text3)] text-center">
                <button onClick={()=>setPanel('forgot')} className="hover:text-[var(--gold)] cursor-pointer bg-none border-none text-[var(--text3)]">Forgot password?</button>
              </div>

              {/* Demo shortcuts */}
              <div className="border-t border-[var(--bdr)] pt-4">
                <div className="text-[8px] tracking-[2px] uppercase text-[var(--text3)] font-semibold mb-2">Quick Demo Access</div>
                {[['Trader Portal','james@tfd.com','Trader@2026!','funded'],['Admin Dashboard','sarah@tfd.com','Admin@2026!','admin'],['Support Agent','mike@tfd.com','Support@2026!','support']].map(([n,e,p,r])=>(
                  <div key={n} onClick={()=>{setEmail(e);setPw(p)}} className="flex items-center justify-between px-3 py-2 bg-[var(--bg3)] border border-[var(--dim)] mb-2 cursor-pointer hover:border-[var(--bdr2)] transition-colors">
                    <div>
                      <div className="text-[12px] font-semibold">{n}</div>
                      <div className="text-[9px] text-[var(--text3)]">{e}</div>
                    </div>
                    <span className={`text-[8px] px-[7px] py-[2px] tracking-[1px] uppercase font-bold ${r==='funded'?'bg-[rgba(0,217,126,.1)] border border-[rgba(0,217,126,.2)] text-[var(--green)]':r==='admin'?'bg-[rgba(255,51,82,.1)] border border-[rgba(255,51,82,.2)] text-[var(--red)]':'bg-[rgba(212,168,67,.1)] border border-[var(--bdr2)] text-[var(--gold)]'}`}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REGISTER */}
          {panel === 'register' && !regDone && (
            <div className="flex flex-col gap-3">
              <div><h2 className="serif text-[24px] font-bold">Start your journey</h2><p className="text-[11px] text-[var(--text2)] mt-1">Free account — no credit card needed</p></div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" placeholder="James" value={fn} onChange={e=>setFn(e.target.value)} />
                <Input label="Last Name"  placeholder="Mitchell" value={ln} onChange={e=>setLn(e.target.value)} />
              </div>
              <Input label="Email" icon="✉" type="email" placeholder="james@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
              <Input label="Country" placeholder="United Kingdom" value={country} onChange={e=>setCountry(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Password" type="password" placeholder="Min 8 chars" value={pw} onChange={e=>setPw(e.target.value)} />
                <Input label="Confirm" type="password" placeholder="Repeat" value={confPw} onChange={e=>setConfPw(e.target.value)} />
              </div>
              <Button loading={loading} onClick={doRegister} className="w-full">Create Account — It's Free</Button>
            </div>
          )}

          {regDone && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-[60px] h-[60px] bg-[rgba(0,217,126,.1)] border border-[rgba(0,217,126,.25)] flex items-center justify-center text-[26px]">✅</div>
              <h2 className="serif text-[22px] font-bold">Account Created!</h2>
              <p className="text-[11px] text-[var(--text2)] leading-[1.7] max-w-[300px]">Your account is live. Check your email to confirm, then sign in.</p>
              <Button onClick={()=>{setPanel('login');setRegDone(false)}} className="w-full">Go to Sign In →</Button>
            </div>
          )}

          {/* FORGOT */}
          {panel === 'forgot' && !forgotDone && (
            <div className="flex flex-col gap-4">
              <div><h2 className="serif text-[24px] font-bold">Reset Password</h2><p className="text-[11px] text-[var(--text2)] mt-1">Enter your email to receive a reset link</p></div>
              <Input label="Email Address" icon="✉" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
              <Button loading={loading} onClick={doForgot} className="w-full">Send Reset Link</Button>
              <div className="text-center"><button onClick={()=>setPanel('login')} className="text-[11px] text-[var(--gold)] cursor-pointer bg-none border-none">← Back to Sign In</button></div>
            </div>
          )}

          {forgotDone && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-[60px] h-[60px] bg-[rgba(0,217,126,.1)] border border-[rgba(0,217,126,.25)] flex items-center justify-center text-[26px]">📧</div>
              <h2 className="serif text-[22px] font-bold">Email Sent!</h2>
              <p className="text-[11px] text-[var(--text2)]">A reset link has been sent. Expires in 30 minutes.</p>
              <Button onClick={()=>{setPanel('login');setForgotDone(false)}} className="w-full">Back to Sign In</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
