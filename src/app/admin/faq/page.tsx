import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, KPICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { ADMIN_NAV } from '@/lib/nav'

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
  is_active: boolean
  articles?: Article[]
}

/* ── Fallback seed data (same as public page) ─────────────────────── */
const SEED_CATEGORIES = [
  { title:'Getting Started', subtitle:'Everything you need to begin', icon:'🚀', order_index:1 },
  { title:'Challenge Rules', subtitle:'Trading rules & evaluation criteria', icon:'📋', order_index:2 },
  { title:'Payouts & Withdrawals', subtitle:'How to withdraw your profits', icon:'💰', order_index:3 },
  { title:'Account Management', subtitle:'Managing your trading accounts', icon:'🗂️', order_index:4 },
  { title:'Identity Verification (KYC)', subtitle:'KYC requirements and process', icon:'🪪', order_index:5 },
  { title:'Affiliate Program', subtitle:'Earn by referring other traders', icon:'🔗', order_index:6 },
]

const ICONS = ['🚀','📋','💰','🗂️','🪪','🔗','⚡','🎯','💬','🔒','📊','🌐','⚙️','📱','💡']

export function AdminFaqPage() {
  const { toasts, toast, dismiss } = useToast()
  const [categories, setCategories]     = useState<Category[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [selectedCat, setSelectedCat]   = useState<Category | null>(null)
  const [selectedArt, setSelectedArt]   = useState<Article | null>(null)
  const [view, setView] = useState<'categories'|'articles'|'edit_cat'|'edit_art'>('categories')

  // Forms
  const [catForm, setCatForm]   = useState({ title:'', subtitle:'', icon:'📋', order_index:1, is_active:true })
  const [artForm, setArtForm]   = useState({ title:'', body:'', order_index:1, is_published:true })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('faq_categories')
        .select('*, faq_articles(*)')
        .order('order_index')
      if (data && data.length > 0) {
        setCategories(data.map((c: any) => ({
          ...c,
          articles: (c.faq_articles ?? []).sort((a: any, b: any) => a.order_index - b.order_index)
        })))
      } else {
        setCategories([])
      }
    } catch {}
    setLoading(false)
  }

  /* ── Categories CRUD ── */
  async function saveCategory() {
    if (!catForm.title.trim()) { toast('error','❌','Required','Category title is required.'); return }
    setSaving(true)
    if (selectedCat) {
      await supabase.from('faq_categories').update({ ...catForm }).eq('id', selectedCat.id)
      toast('success','✅','Saved','Category updated.')
    } else {
      await supabase.from('faq_categories').insert({ ...catForm })
      toast('success','✅','Created','Category created.')
    }
    setSaving(false)
    setView('categories')
    setSelectedCat(null)
    load()
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Delete category "${cat.title}" and all its articles? This cannot be undone.`)) return
    await supabase.from('faq_articles').delete().eq('category_id', cat.id)
    await supabase.from('faq_categories').delete().eq('id', cat.id)
    toast('success','🗑️','Deleted','Category deleted.')
    load()
  }

  async function toggleCategory(cat: Category) {
    await supabase.from('faq_categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
  }

  /* ── Articles CRUD ── */
  async function saveArticle() {
    if (!artForm.title.trim()) { toast('error','❌','Required','Article title is required.'); return }
    if (!artForm.body.trim())  { toast('error','❌','Required','Article content is required.'); return }
    if (!selectedCat)          { toast('error','❌','Error','No category selected.'); return }
    setSaving(true)
    if (selectedArt) {
      await supabase.from('faq_articles').update({ ...artForm }).eq('id', selectedArt.id)
      toast('success','✅','Saved','Article updated.')
    } else {
      await supabase.from('faq_articles').insert({ ...artForm, category_id: selectedCat.id })
      toast('success','✅','Created','Article created.')
    }
    setSaving(false)
    setView('articles')
    setSelectedArt(null)
    load()
  }

  async function deleteArticle(art: Article) {
    if (!confirm(`Delete article "${art.title}"?`)) return
    await supabase.from('faq_articles').delete().eq('id', art.id)
    toast('success','🗑️','Deleted','Article deleted.')
    load()
    // refresh selectedCat articles
    setSelectedCat(prev => prev ? { ...prev, articles: prev.articles?.filter(a => a.id !== art.id) } : prev)
  }

  async function toggleArticle(art: Article) {
    await supabase.from('faq_articles').update({ is_published: !art.is_published }).eq('id', art.id)
    load()
  }

  /* ── Seed DB with default data ── */
  async function seedDatabase() {
    if (!confirm('This will populate the database with default FAQ categories and articles. Continue?')) return
    setSaving(true)
    try {
      // Import fallback data from help page logic
      const res = await fetch('/help') // just to trigger, not needed
    } catch {}
    // Insert categories
    for (const cat of SEED_CATEGORIES) {
      await supabase.from('faq_categories').upsert({ ...cat, is_active: true }, { onConflict: 'title' })
    }
    toast('success','🌱','Seeded','Default categories created. Add articles manually.')
    setSaving(false)
    load()
  }

  /* ── Quick-add hedging article to Challenge Rules category ── */
  async function addHedgingArticle() {
    if (!confirm('Add the "Hedging Rules" article to the Challenge Rules category?')) return
    setSaving(true)
    // Find or create Challenge Rules category
    let catId: string | null = null
    const existing = categories.find(c => c.title === 'Challenge Rules')
    if (existing) {
      catId = existing.id
    } else {
      const { data: newCat } = await supabase
        .from('faq_categories')
        .insert({ title: 'Challenge Rules', subtitle: 'Trading rules & evaluation criteria', icon: '📋', order_index: 2, is_active: true })
        .select().single()
      catId = newCat?.id ?? null
    }
    if (!catId) { toast('error','❌','Error','Could not find/create Challenge Rules category.'); setSaving(false); return }

    const nextIndex = (existing?.articles?.length ?? 0) + 1
    await supabase.from('faq_articles').insert({
      category_id: catId,
      is_published: true,
      order_index: nextIndex,
      title: 'Is hedging allowed on my account?',
      body: `**Hedging is strictly prohibited on all TFD accounts.**

Hedging means holding simultaneous BUY and SELL positions on the same instrument within the same trading account. This practice is not permitted under any circumstances and violates our challenge rules.

**What counts as prohibited hedging:**

- Opening a BUY and a SELL trade on the same currency pair or instrument at the same time on the same account
- Partially hedging by holding opposite positions of different sizes on the same instrument
- Using pending orders to create a net-zero or near-zero exposure on any single instrument

**Why is hedging prohibited?**

Hedging on the same account eliminates real market risk and does not demonstrate genuine trading skill. Our evaluation programme is designed to identify skilled, directional traders who can manage risk and generate consistent profits. Hedging bypasses this assessment entirely.

**What happens if hedging is detected?**

Our risk monitoring system checks all open positions in real time. If same-account hedging is detected:

1. Your account will be immediately flagged for review
2. Trading may be suspended pending investigation
3. If confirmed, your account will be permanently breached and closed
4. No profits from the hedged period will be paid out

**Cross-account hedging is also prohibited.**

Holding opposite positions across multiple TFD accounts — whether owned by you or coordinated with another trader — is also strictly forbidden. This is treated as coordinated fraud and results in a permanent ban.

**What is allowed?**

You may hold multiple positions on the same instrument in the same direction (e.g. two BUY trades on EUR/USD). You may also hold positions on different, uncorrelated instruments simultaneously. The key rule is: no simultaneous opposing positions on the same instrument within the same account.

If you have any questions about whether a specific trading strategy is permitted, please contact our support team before placing the trade.`,
    })
    toast('success','✅','Article Added','Hedging rules article published to Challenge Rules.')
    setSaving(false)
    load()
  }

  const openCreateCat = () => {
    setSelectedCat(null)
    setCatForm({ title:'', subtitle:'', icon:'📋', order_index:(categories.length+1), is_active:true })
    setView('edit_cat')
  }

  const openEditCat = (cat: Category) => {
    setSelectedCat(cat)
    setCatForm({ title:cat.title, subtitle:cat.subtitle, icon:cat.icon, order_index:cat.order_index, is_active:cat.is_active })
    setView('edit_cat')
  }

  const openArticles = (cat: Category) => {
    setSelectedCat(cat)
    setView('articles')
  }

  const openCreateArticle = () => {
    setSelectedArt(null)
    setArtForm({ title:'', body:'', order_index:((selectedCat?.articles?.length ?? 0)+1), is_published:true })
    setView('edit_art')
  }

  const openEditArticle = (art: Article) => {
    setSelectedArt(art)
    setArtForm({ title:art.title, body:art.body, order_index:art.order_index, is_published:art.is_published })
    setView('edit_art')
  }

  const totalArticles = categories.reduce((s, c) => s + (c.articles?.length ?? 0), 0)
  const publishedArticles = categories.reduce((s, c) => s + (c.articles?.filter(a => a.is_published).length ?? 0), 0)

  return (
    <>
      <DashboardLayout title="FAQ / Help Centre" nav={ADMIN_NAV} accentColor="red"
        topbarRight={
          <div className="flex gap-2 items-center">
            <button onClick={addHedgingArticle} disabled={saving}
              className="text-[10px] text-[#DC2626] bg-[rgba(220,38,38,.06)] border border-[rgba(220,38,38,.2)] px-3 py-1.5 rounded cursor-pointer hover:bg-[rgba(220,38,38,.12)] transition-colors disabled:opacity-50">
              🚫 Add Hedging Rule Article
            </button>
            <a href="/help" target="_blank" className="text-[10px] text-[#2255CC] bg-[rgba(34,85,204,.08)] border border-[#C5D5EA] px-3 py-1.5 rounded cursor-pointer hover:bg-[rgba(34,85,204,.15)] transition-colors no-underline">
              🔗 View Help Page →
            </a>
          </div>
        }
      >
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-[11px]">
          <KPICard label="Categories"        value={String(categories.length)}      sub={`${categories.filter(c=>c.is_active).length} active`}/>
          <KPICard label="Total Articles"    value={String(totalArticles)}           sub="All categories" subColor="text-[#2255CC]"/>
          <KPICard label="Published"         value={String(publishedArticles)}       sub="Live on help page" subColor="text-[#16A34A]"/>
          <KPICard label="Drafts"            value={String(totalArticles-publishedArticles)} sub="Not visible"/>
        </div>

        {/* ── CATEGORIES LIST ── */}
        {view === 'categories' && (
          <Card>
            <CardHeader title={`Categories (${categories.length})`} action={
              <div className="flex gap-2">
                {categories.length === 0 && (
                  <Button size="sm" variant="ghost" onClick={seedDatabase} loading={saving}>
                    🌱 Seed Default Data
                  </Button>
                )}
                <Button size="sm" onClick={openCreateCat}>+ New Category</Button>
              </div>
            }/>
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin"/></div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-[28px] mb-3">📚</div>
                <div className="text-[13px] font-semibold mb-1">No categories yet</div>
                <p className="text-[11px] text-[#8FA3BF] mb-4">Create your first FAQ category or seed with default data.</p>
                <Button onClick={seedDatabase} loading={saving}>🌱 Seed Default Categories</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-4 p-4 border border-[#E8EEF8] rounded-lg hover:border-[#C5D5EA] transition-colors">
                    <div className="w-10 h-10 bg-[#EEF3FF] rounded-lg flex items-center justify-center text-[20px] flex-shrink-0">{cat.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-[#1A3A6B]">{cat.title}</div>
                      <div className="text-[11px] text-[#8FA3BF]">{cat.subtitle}</div>
                    </div>
                    <div className="text-[11px] text-[#5C7A9E] flex-shrink-0">
                      {cat.articles?.length ?? 0} articles · {cat.articles?.filter(a=>a.is_published).length ?? 0} published
                    </div>
                    <span className={`text-[8px] uppercase font-bold px-2 py-1 border flex-shrink-0 ${cat.is_active ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                      {cat.is_active ? 'Active' : 'Hidden'}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openArticles(cat)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[#C5D5EA] rounded hover:bg-[rgba(34,85,204,.15)] transition-colors">
                        Articles
                      </button>
                      <button onClick={() => openEditCat(cat)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[#F4F7FD] text-[#5C7A9E] border border-[#E8EEF8] rounded hover:text-[#1A3A6B] transition-colors">
                        Edit
                      </button>
                      <button onClick={() => toggleCategory(cat)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer border rounded transition-colors"
                        style={{ color: cat.is_active ? '#D97706' : '#16A34A', background: cat.is_active ? 'rgba(217,119,6,.08)' : 'rgba(22,163,74,.08)', borderColor: cat.is_active ? 'rgba(217,119,6,.2)' : 'rgba(22,163,74,.2)' }}>
                        {cat.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => deleteCategory(cat)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded hover:bg-[rgba(220,38,38,.15)] transition-colors">
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── ARTICLES LIST ── */}
        {view === 'articles' && selectedCat && (
          <Card>
            <CardHeader
              title={`${selectedCat.icon} ${selectedCat.title} — Articles (${selectedCat.articles?.length ?? 0})`}
              action={
                <div className="flex gap-2">
                  <button onClick={() => setView('categories')} className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[#F4F7FD] text-[#5C7A9E] border border-[#E8EEF8] rounded">← Back</button>
                  <Button size="sm" onClick={openCreateArticle}>+ New Article</Button>
                </div>
              }
            />
            {(selectedCat.articles ?? []).length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-[24px] mb-2">📄</div>
                <p className="text-[11px] text-[#8FA3BF] mb-3">No articles in this category yet.</p>
                <Button size="sm" onClick={openCreateArticle}>+ Add First Article</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(selectedCat.articles ?? []).map(art => (
                  <div key={art.id} className="flex items-center gap-4 p-4 border border-[#E8EEF8] rounded-lg hover:border-[#C5D5EA] transition-colors">
                    <div className="text-[#8FA3BF] text-[12px] font-mono flex-shrink-0 w-5 text-center">{art.order_index}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-[#1A3A6B]">{art.title}</div>
                      <div className="text-[11px] text-[#8FA3BF] truncate mt-0.5">{art.body.slice(0, 80)}…</div>
                    </div>
                    <span className={`text-[8px] uppercase font-bold px-2 py-1 border flex-shrink-0 ${art.is_published ? 'text-[#16A34A] bg-[rgba(22,163,74,.08)] border-[rgba(22,163,74,.2)]' : 'text-[#8FA3BF] bg-[#F4F7FD] border-[#E8EEF8]'}`}>
                      {art.is_published ? 'Published' : 'Draft'}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditArticle(art)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[rgba(34,85,204,.08)] text-[#2255CC] border border-[#C5D5EA] rounded">
                        Edit
                      </button>
                      <button onClick={() => toggleArticle(art)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer border rounded transition-colors"
                        style={{ color: art.is_published ? '#D97706' : '#16A34A', background: art.is_published ? 'rgba(217,119,6,.08)' : 'rgba(22,163,74,.08)', borderColor: art.is_published ? 'rgba(217,119,6,.2)' : 'rgba(22,163,74,.2)' }}>
                        {art.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deleteArticle(art)}
                        className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[rgba(220,38,38,.08)] text-[#DC2626] border border-[rgba(220,38,38,.2)] rounded">
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── EDIT CATEGORY FORM ── */}
        {view === 'edit_cat' && (
          <Card>
            <CardHeader
              title={selectedCat ? `Edit Category — ${selectedCat.title}` : 'New Category'}
              action={<button onClick={() => setView('categories')} className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[#F4F7FD] text-[#5C7A9E] border border-[#E8EEF8] rounded">← Cancel</button>}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Category Title *</label>
                <input value={catForm.title} onChange={e => setCatForm(f=>({...f,title:e.target.value}))}
                  placeholder="e.g. Getting Started"
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[13px] outline-none focus:border-[#2255CC] transition-colors rounded"/>
              </div>
              <div className="col-span-2">
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Subtitle</label>
                <input value={catForm.subtitle} onChange={e => setCatForm(f=>({...f,subtitle:e.target.value}))}
                  placeholder="e.g. Everything you need to begin"
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[13px] outline-none focus:border-[#2255CC] transition-colors rounded"/>
              </div>
              <div>
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Icon</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {ICONS.map(ico => (
                    <button key={ico} onClick={() => setCatForm(f=>({...f,icon:ico}))}
                      className={`w-9 h-9 text-[18px] border rounded-lg transition-all cursor-pointer ${catForm.icon === ico ? 'border-[#2255CC] bg-[rgba(34,85,204,.1)]' : 'border-[#E8EEF8] bg-[#F4F7FD] hover:border-[#C5D5EA]'}`}>
                      {ico}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-[#8FA3BF]">Selected: <span className="text-[18px]">{catForm.icon}</span></div>
              </div>
              <div>
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Sort Order</label>
                <input type="number" value={catForm.order_index} onChange={e => setCatForm(f=>({...f,order_index:parseInt(e.target.value)||1}))}
                  min="1"
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[13px] outline-none focus:border-[#2255CC] transition-colors rounded"/>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={catForm.is_active} onChange={e => setCatForm(f=>({...f,is_active:e.target.checked}))} className="accent-[#2255CC]"/>
                  <span className="text-[12px] text-[#5C7A9E]">Visible on Help page</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setView('categories')} className="flex-1 py-2.5 bg-[#F4F7FD] border border-[#E8EEF8] text-[#5C7A9E] text-[10px] uppercase font-bold cursor-pointer rounded">Cancel</button>
              <Button onClick={saveCategory} loading={saving} className="flex-1">{selectedCat ? 'Save Changes' : 'Create Category'}</Button>
            </div>
          </Card>
        )}

        {/* ── EDIT ARTICLE FORM ── */}
        {view === 'edit_art' && selectedCat && (
          <Card>
            <CardHeader
              title={selectedArt ? `Edit Article` : `New Article — ${selectedCat.title}`}
              action={<button onClick={() => setView('articles')} className="px-3 py-1.5 text-[9px] uppercase font-bold cursor-pointer bg-[#F4F7FD] text-[#5C7A9E] border border-[#E8EEF8] rounded">← Cancel</button>}
            />
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Article Title *</label>
                <input value={artForm.title} onChange={e => setArtForm(f=>({...f,title:e.target.value}))}
                  placeholder="e.g. What are the drawdown limits?"
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[13px] outline-none focus:border-[#2255CC] transition-colors rounded"/>
              </div>
              <div>
                <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-1">Content *</label>
                <div className="text-[10px] text-[#8FA3BF] mb-2">
                  Supports: **bold**, numbered lists (1. item), bullet lists (- item), blank lines for spacing
                </div>
                <textarea
                  value={artForm.body}
                  onChange={e => setArtForm(f=>({...f,body:e.target.value}))}
                  rows={16}
                  placeholder="Write article content here...&#10;&#10;Use **bold** for emphasis&#10;Use 1. 2. 3. for numbered lists&#10;Use - for bullet points&#10;Leave blank lines for spacing"
                  className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[12px] outline-none focus:border-[#2255CC] transition-colors resize-y rounded font-mono leading-relaxed"
                  style={{fontFamily:"'JetBrains Mono',monospace"}}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[8px] uppercase tracking-[1.5px] text-[#8FA3BF] font-semibold block mb-2">Sort Order</label>
                  <input type="number" value={artForm.order_index} onChange={e => setArtForm(f=>({...f,order_index:parseInt(e.target.value)||1}))}
                    min="1"
                    className="w-full px-3 py-2 bg-[#F4F7FD] border border-[#C5D5EA] text-[#1A3A6B] text-[13px] outline-none rounded"/>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={artForm.is_published} onChange={e => setArtForm(f=>({...f,is_published:e.target.checked}))} className="accent-[#2255CC]"/>
                    <span className="text-[12px] text-[#5C7A9E]">Publish immediately</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setView('articles')} className="flex-1 py-2.5 bg-[#F4F7FD] border border-[#E8EEF8] text-[#5C7A9E] text-[10px] uppercase font-bold cursor-pointer rounded">Cancel</button>
              <Button onClick={saveArticle} loading={saving} className="flex-1">{selectedArt ? 'Save Changes' : 'Create Article'}</Button>
            </div>
          </Card>
        )}
      </DashboardLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </>
  )
}