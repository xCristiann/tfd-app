import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/* ── Types ───────────────────────────────────────────────────────── */
interface Article {
  id: string
  category_id: string
  title: string
  body: string
  order_index: number
  is_published: boolean
}

interface Category {
  id: string
  title: string
  subtitle: string
  icon: string
  order_index: number
  articles?: Article[]
}

/* ── Static fallback data (shown while DB loads or if empty) ──────── */
const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    subtitle: 'Everything you need to begin',
    icon: '🚀',
    order_index: 1,
    articles: [
      { id: '1', category_id: 'getting-started', title: 'What is The Funded Diaries?', order_index: 1, is_published: true, body: `The Funded Diaries is a proprietary trading firm that provides capital to skilled traders. You pass a trading evaluation (challenge), prove your skills, and we fund your account — allowing you to trade with our money and keep up to 90% of the profits.\n\nWe currently offer challenges from $10,000 to $200,000 in account size, with no time limits and industry-leading profit splits.` },
      { id: '2', category_id: 'getting-started', title: 'How do I get started?', order_index: 2, is_published: true, body: `Getting started is simple:\n\n1. **Create an account** at thefundeddiaries.com\n2. **Purchase a challenge** — choose your account size\n3. **Complete KYC** — verify your identity to unlock payouts\n4. **Start trading** — log in to TFD Platform with your credentials\n5. **Hit your target** — reach the profit target while respecting drawdown rules\n6. **Get funded** — receive your funded account and start withdrawing profits` },
      { id: '3', category_id: 'getting-started', title: 'What trading platform do you use?', order_index: 3, is_published: true, body: `We use **TFD Platform** as our primary trading platform. After purchasing a challenge, you will receive your login credentials (Login ID, Password, and Server) by email.\n\nLog in at our built-in web platform at thefundeddiaries.com/platform, or download the TFD Platform desktop application.\n\nMT4 and MT5 support is coming soon.` },
    ]
  },
  {
    id: 'challenge-rules',
    title: 'Challenge Rules',
    subtitle: 'Trading rules & evaluation criteria',
    icon: '📋',
    order_index: 2,
    articles: [
      { id: '4', category_id: 'challenge-rules', title: 'What are the profit targets?', order_index: 1, is_published: true, body: `**Phase 1 (Evaluation):** 8% profit target\n**Phase 2 (Verification):** 5% profit target\n**Funded:** No profit target — trade freely\n\nAll targets are calculated on your starting balance. For example, on a $100,000 account:\n- Phase 1: $8,000 profit required\n- Phase 2: $5,000 profit required\n\nThere is **no time limit** to reach these targets.` },
      { id: '5', category_id: 'challenge-rules', title: 'What are the drawdown limits?', order_index: 2, is_published: true, body: `We have two drawdown limits:\n\n**Daily Drawdown:** Maximum 5% loss from your highest balance of the day.\nExample: If your balance peaks at $100,000, you cannot lose more than $5,000 that day.\n\n**Maximum Drawdown:** Maximum 10% loss from your initial starting balance.\nExample: On a $100,000 account, your equity cannot fall below $90,000 at any time.\n\nBreaching either limit results in immediate account termination.` },
      { id: '6', category_id: 'challenge-rules', title: 'Is there a minimum trading days requirement?', order_index: 3, is_published: true, body: `There is no minimum number of trading days required to pass a phase. You can pass Phase 1 in as few days as you like, as long as you respect all drawdown rules and meet the profit target.\n\nQuality of trading matters more than quantity of days.` },
      { id: '7', category_id: 'challenge-rules', title: 'Can I trade news events?', order_index: 4, is_published: true, body: `News trading is permitted on most challenge plans. Check your specific challenge product details to confirm whether news trading is allowed.\n\nIf news trading is restricted, you must not open or close trades within 2 minutes before and after major news events (NFP, FOMC, CPI, etc.).` },
      { id: '8', category_id: 'challenge-rules', title: 'Can I hold trades over the weekend?', order_index: 5, is_published: true, body: `Weekend holding depends on your challenge plan. Check your product details on the dashboard.\n\nIf weekend holding is not permitted, all positions must be closed before the market closes on Friday (21:00 UTC) and may only be reopened when markets reopen on Sunday (22:00 UTC).` },
    ]
  },
  {
    id: 'payouts',
    title: 'Payouts & Withdrawals',
    subtitle: 'How to withdraw your profits',
    icon: '💰',
    order_index: 3,
    articles: [
      { id: '9', category_id: 'payouts', title: 'When can I request my first payout?', order_index: 1, is_published: true, body: `You can request your first payout **14 days after placing your first trade** on a funded account. This biweekly cycle ensures fair and sustainable profit withdrawals.\n\nAfter your first payout, subsequent payouts can be requested every 14 days.` },
      { id: '10', category_id: 'payouts', title: 'What is the profit split?', order_index: 2, is_published: true, body: `Our profit split is **up to 90%** in your favour, depending on your challenge plan:\n\n- Standard plans: **80% to trader**\n- Professional plans: **85% to trader**\n- Elite plans: **90% to trader**\n\nThe split applies to your net profit above the starting balance. There are no hidden fees.` },
      { id: '11', category_id: 'payouts', title: 'How long does a payout take?', order_index: 3, is_published: true, body: `Payout processing times:\n\n- **Cryptocurrency (USDT, Bitcoin):** Same day — usually within 24 hours of approval\n- **Bank Transfer (Wise):** 1–3 business days\n- **Standard Bank Wire:** 3–5 business days\n\nAll payouts are reviewed by our finance team before processing. You will receive email notifications at each stage.` },
      { id: '12', category_id: 'payouts', title: 'What is the minimum payout amount?', order_index: 4, is_published: true, body: `The minimum payout request is **$100**. There is no maximum — you can withdraw your full available profit split at any time.\n\nYour withdrawable amount is calculated as: (Current Balance − Starting Balance) × Your Split Percentage.` },
    ]
  },
  {
    id: 'account-management',
    title: 'Account Management',
    subtitle: 'Managing your trading accounts',
    icon: '🗂️',
    order_index: 4,
    articles: [
      { id: '13', category_id: 'account-management', title: 'What happens if I breach my account?', order_index: 1, is_published: true, body: `If you breach the daily drawdown or maximum drawdown limit, your account is automatically locked and marked as breached.\n\nYou will receive an email notification immediately. Trading is suspended and the account cannot be reactivated.\n\nYou can purchase a new challenge at any time to start again. There are no restrictions on how many challenges you can attempt.` },
      { id: '14', category_id: 'account-management', title: 'How do I advance to the next phase?', order_index: 2, is_published: true, body: `Phase advancement is reviewed and processed by our team:\n\n1. **Meet the profit target** for your current phase\n2. Your account is automatically flagged for review\n3. Our team reviews and advances your account (usually within 24 hours)\n4. You receive new login credentials for the next phase by email\n\nYou do not need to contact support — the process is automated.` },
      { id: '15', category_id: 'account-management', title: 'Can I have multiple accounts?', order_index: 3, is_published: true, body: `Yes, you can have multiple challenge accounts simultaneously. There is no limit on the number of challenges you can purchase.\n\nHowever, each account is evaluated independently and must follow all trading rules individually.` },
    ]
  },
  {
    id: 'kyc',
    title: 'Identity Verification (KYC)',
    subtitle: 'KYC requirements and process',
    icon: '🪪',
    order_index: 5,
    articles: [
      { id: '16', category_id: 'kyc', title: 'Why do I need to complete KYC?', order_index: 1, is_published: true, body: `KYC (Know Your Customer) verification is required to:\n\n- **Unlock payouts** — you cannot withdraw profits without a verified identity\n- **Comply with regulations** — we are required by law to verify trader identities\n- **Protect your account** — prevents unauthorised access and fraud\n\nKYC verification takes approximately 5 minutes and is powered by Didit, a trusted identity verification provider.` },
      { id: '17', category_id: 'kyc', title: 'What documents do I need for KYC?', order_index: 2, is_published: true, body: `You will need:\n\n1. **Government-issued photo ID** — passport, national ID card, or driver's licence\n   - Must be valid (not expired)\n   - Must clearly show your full name, date of birth, and photo\n\n2. **Liveness check** — a live selfie taken during the verification process\n   - No printed photos accepted\n   - Must match your ID photo\n\nDocuments are processed securely and deleted after verification.` },
      { id: '18', category_id: 'kyc', title: 'How long does KYC verification take?', order_index: 3, is_published: true, body: `The verification process itself takes approximately 5 minutes to complete.\n\nOnce submitted, our compliance team reviews your application within **1–2 business days**. You will receive an email notification with the result.\n\nIf additional information is required, you will be contacted by email.` },
    ]
  },
  {
    id: 'affiliate',
    title: 'Affiliate Program',
    subtitle: 'Earn by referring other traders',
    icon: '🔗',
    order_index: 6,
    articles: [
      { id: '19', category_id: 'affiliate', title: 'How does the affiliate program work?', order_index: 1, is_published: true, body: `Our affiliate program allows you to earn commission by referring new traders to The Funded Diaries.\n\n**How it works:**\n1. Get your unique referral link from the Affiliates section in your dashboard\n2. Share it with friends, followers, or your audience\n3. Earn **10% commission** on every successful challenge purchase made through your link\n4. Commissions are tracked in real-time in your dashboard\n\nThere is no limit on earnings — the more you refer, the more you earn.` },
      { id: '20', category_id: 'affiliate', title: 'When are affiliate commissions paid?', order_index: 2, is_published: true, body: `Affiliate commissions are processed once your referred traders complete a successful challenge purchase.\n\nCommissions accumulate in your affiliate balance and can be withdrawn once you reach the minimum threshold. Contact support to request your affiliate earnings payout.` },
    ]
  },
]

/* ── Article modal ───────────────────────────────────────────────── */
function ArticleModal({ article, category, onClose }: { article: Article; category: Category; onClose: () => void }) {
  // Simple markdown-ish renderer
  const renderBody = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} style={{ fontWeight: 700, color: '#1A3A6B', margin: '12px 0 4px' }}>{line.slice(2,-2)}</p>
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} style={{ margin: '4px 0', paddingLeft: '16px', color: '#374151' }}>
          <span style={{ color: '#2255CC', fontWeight: 600 }}>{line.match(/^\d+/)?.[0]}.</span>
          {line.replace(/^\d+\./, '').replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
      }
      if (line.startsWith('- ')) {
        return <p key={i} style={{ margin: '4px 0', paddingLeft: '16px', color: '#374151' }}>
          <span style={{ color: '#2255CC' }}>•</span> {line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
      }
      if (line === '') return <div key={i} style={{ height: '8px' }}/>
      // Bold inline
      const parts = line.split(/(\*\*.*?\*\*)/)
      return <p key={i} style={{ margin: '4px 0', color: '#374151', lineHeight: 1.75 }}>
        {parts.map((part, j) => part.startsWith('**') && part.endsWith('**')
          ? <strong key={j} style={{ color: '#1A3A6B' }}>{part.slice(2,-2)}</strong>
          : part
        )}
      </p>
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'680px', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'24px 28px', borderBottom:'1px solid #E5E7EB', flexShrink:0 }}>
          <div style={{ fontSize:'11px', color:'#2255CC', fontWeight:600, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px' }}>
            {category.icon} {category.title}
          </div>
          <h2 style={{ margin:0, fontSize:'20px', fontWeight:700, color:'#1A3A6B', lineHeight:1.3 }}>{article.title}</h2>
        </div>
        {/* Body */}
        <div style={{ padding:'24px 28px', overflowY:'auto', flex:1, fontSize:'14px', lineHeight:1.75 }}>
          {renderBody(article.body)}
        </div>
        {/* Footer */}
        <div style={{ padding:'16px 28px', borderTop:'1px solid #E5E7EB', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:'12px', color:'#9CA3AF' }}>Was this article helpful?&nbsp;
            <button style={{ background:'none', border:'none', cursor:'pointer', color:'#2255CC', fontSize:'12px' }}>👍 Yes</button>
            &nbsp;
            <button style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7280', fontSize:'12px' }}>👎 No</button>
          </span>
          <button onClick={onClose} style={{ padding:'8px 20px', background:'#2255CC', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── Help Center Page ────────────────────────────────────────────── */
export function HelpPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [selectedArt, setSelectedArt] = useState<Article | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: cats } = await supabase
        .from('faq_categories')
        .select('*, faq_articles(*)')
        .eq('is_active', true)
        .order('order_index')

      if (cats && cats.length > 0) {
        const mapped = cats.map((c: any) => ({
          ...c,
          articles: (c.faq_articles ?? [])
            .filter((a: any) => a.is_published)
            .sort((a: any, b: any) => a.order_index - b.order_index)
        }))
        setCategories(mapped)
      } else {
        setCategories(FALLBACK_CATEGORIES)
      }
    } catch {
      setCategories(FALLBACK_CATEGORIES)
    }
    setLoading(false)
  }

  // Most viewed = first 6 articles across all categories
  const mostViewed = useMemo(() => {
    return categories.flatMap(c => (c.articles ?? []).slice(0, 2)).slice(0, 6)
  }, [categories])

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return categories.flatMap(c =>
      (c.articles ?? [])
        .filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
        .map(a => ({ ...a, category: c }))
    ).slice(0, 10)
  }, [search, categories])

  const openArticle = (art: Article, cat: Category) => {
    setSelectedArt(art)
    setSelectedCat(cat)
    setSearch('')
  }

  const catForArticle = (art: Article) =>
    categories.find(c => c.id === art.category_id) ?? categories[0]

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", minHeight:'100vh', background:'#F8F9FC', color:'#1A3A6B' }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg, #1A3A6B 0%, #2255CC 100%)', padding:'0 24px 48px' }}>
        {/* Nav */}
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', borderBottom:'1px solid rgba(255,255,255,.1)', marginBottom:'48px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.7)', fontSize:'13px' }}>← Home</button>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', fontWeight:700, color:'#fff' }}>
              The Funded <span style={{ color:'#60A5FA', fontStyle:'italic' }}>Diaries</span>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard/support')} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>
            Contact Support
          </button>
        </div>

        <div style={{ maxWidth:'700px', margin:'0 auto', textAlign:'center' }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'36px', fontWeight:700, color:'#fff', margin:'0 0 8px', letterSpacing:'-0.5px' }}>
            The Funded Diaries Help Centre
          </h1>
          <p style={{ color:'rgba(255,255,255,.6)', fontSize:'15px', margin:'0 0 32px' }}>
            Find answers to your questions about challenges, trading rules, payouts and more.
          </p>

          {/* Search */}
          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', background:'#fff', borderRadius:'12px', padding:'0 16px', boxShadow:'0 4px 24px rgba(0,0,0,.2)', border: searchFocused ? '2px solid #2255CC' : '2px solid transparent' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0, color:'#9CA3AF' }}>
                <circle cx="8" cy="8" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
                <path d="M12.5 12.5L16 16" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                placeholder="Search for articles…"
                style={{ flex:1, padding:'16px 12px', background:'transparent', border:'none', outline:'none', fontSize:'15px', color:'#1A3A6B' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:'18px', padding:'4px' }}>✕</button>}
            </div>

            {/* Search dropdown */}
            {search && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,.15)', marginTop:'8px', zIndex:10, maxHeight:'360px', overflowY:'auto' }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding:'24px', textAlign:'center', color:'#9CA3AF', fontSize:'13px' }}>No articles found for "{search}"</div>
                ) : searchResults.map((r: any) => (
                  <div key={r.id} onClick={() => openArticle(r, r.category)}
                    style={{ padding:'14px 20px', cursor:'pointer', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:'12px' }}
                    onMouseEnter={e => (e.currentTarget.style.background='#F8F9FC')}
                    onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                    <span style={{ fontSize:'16px' }}>{r.category.icon}</span>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#1A3A6B' }}>{r.title}</div>
                      <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'2px' }}>{r.category.title}</div>
                    </div>
                    <span style={{ marginLeft:'auto', color:'#D1D5DB', fontSize:'16px' }}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 24px' }}>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#9CA3AF' }}>Loading…</div>
        ) : selectedCat ? (
          /* ── Category view ── */
          <div>
            <button onClick={() => setSelectedCat(null)}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#2255CC', fontSize:'13px', fontWeight:500, marginBottom:'24px', display:'flex', alignItems:'center', gap:'6px' }}>
              ← Back to all topics
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'32px' }}>
              <div style={{ width:'52px', height:'52px', background:'#EEF3FF', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>{selectedCat.icon}</div>
              <div>
                <h2 style={{ margin:0, fontSize:'22px', fontWeight:700, color:'#1A3A6B' }}>{selectedCat.title}</h2>
                <p style={{ margin:'4px 0 0', color:'#6B7280', fontSize:'13px' }}>{selectedCat.subtitle} · {selectedCat.articles?.length ?? 0} articles</p>
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' }}>
              {(selectedCat.articles ?? []).map((art, i) => (
                <div key={art.id} onClick={() => openArticle(art, selectedCat)}
                  style={{ padding:'16px 20px', cursor:'pointer', borderBottom: i < (selectedCat.articles?.length ?? 0) - 1 ? '1px solid #F3F4F6' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#F8F9FC')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <span style={{ fontSize:'14px', color:'#1A3A6B', fontWeight:500 }}>{art.title}</span>
                  <span style={{ color:'#D1D5DB', fontSize:'18px', flexShrink:0 }}>›</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Home view ── */
          <>
            {/* Most Viewed */}
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'24px 28px', marginBottom:'32px' }}>
              <h2 style={{ margin:'0 0 20px', fontSize:'16px', fontWeight:700, color:'#1A3A6B' }}>Most Viewed Articles</h2>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0' }}>
                {mostViewed.map((art, i) => {
                  const cat = catForArticle(art)
                  return (
                    <div key={art.id} onClick={() => openArticle(art, cat)}
                      style={{ padding:'10px 16px', cursor:'pointer', borderBottom:'1px solid #F3F4F6', borderRight: i % 2 === 0 ? '1px solid #F3F4F6' : 'none', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='#F8F9FC')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <span style={{ fontSize:'13px', color:'#374151' }}>{art.title}</span>
                      <span style={{ color:'#D1D5DB', fontSize:'16px', flexShrink:0, marginLeft:'8px' }}>›</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Categories grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              {categories.map(cat => (
                <div key={cat.id} onClick={() => setSelectedCat(cat)}
                  style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:'12px', padding:'24px', cursor:'pointer', transition:'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as any).style.borderColor='#2255CC'; (e.currentTarget as any).style.boxShadow='0 4px 12px rgba(34,85,204,.1)' }}
                  onMouseLeave={e => { (e.currentTarget as any).style.borderColor='#E5E7EB'; (e.currentTarget as any).style.boxShadow='none' }}>
                  <div style={{ width:'40px', height:'40px', background:'#EEF3FF', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', marginBottom:'14px' }}>
                    {cat.icon}
                  </div>
                  <div style={{ fontSize:'15px', fontWeight:700, color:'#1A3A6B', marginBottom:'4px' }}>{cat.title}</div>
                  <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'12px' }}>{cat.subtitle}</div>
                  <div style={{ fontSize:'11px', color:'#6B7280', fontWeight:500 }}>{cat.articles?.length ?? 0} articles</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Article modal */}
      {selectedArt && selectedCat && (
        <ArticleModal
          article={selectedArt}
          category={selectedCat}
          onClose={() => { setSelectedArt(null) }}
        />
      )}
    </div>
  )
}