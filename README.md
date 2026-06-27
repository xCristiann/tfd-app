# TheFundedDiaries

Independent prop firm comparison platform. Built with Next.js 14, Tailwind, Supabase, deployed on Vercel.

---

## Deploy în 5 pași

### 1. Supabase — setup bază de date

1. Mergi pe [supabase.com](https://supabase.com) → proiectul tău
2. Deschide **SQL Editor**
3. Copiază tot conținutul din `supabase-schema.sql` și apasă **Run**
4. Mergi la **Project Settings → API** și copiază:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Fă-te admin

După ce rulezi schema SQL și te înregistrezi pe site:
```sql
-- Rulează asta în SQL Editor, cu UUID-ul tău din auth.users
update public.profiles set is_admin = true where id = 'PASTE-YOUR-UUID-HERE';
```

### 3. Vercel — deploy

1. Push proiectul pe GitHub (repo nou, public sau privat)
2. Mergi pe [vercel.com](https://vercel.com) → **New Project** → importă repo-ul
3. La **Environment Variables** adaugă cele 4 variabile:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXT_PUBLIC_SITE_URL=https://thefundeddiaries.com
   ```
4. Deploy → gata!

### 4. Local development

```bash
cp .env.example .env.local
# completează .env.local cu valorile din Supabase

npm install
npm run dev
# → http://localhost:3000
```

### 5. Supabase Auth redirect URL

În Supabase → **Authentication → URL Configuration**:
- Site URL: `https://thefundeddiaries.com`
- Redirect URLs: `https://thefundeddiaries.com/**`

---

## Structura proiect

```
app/
  page.tsx              → Homepage cu firme
  firms/
    page.tsx            → Lista toate firmele
    [slug]/page.tsx     → Pagina firmă (challenges, rules, reviews)
  calculator/           → Calculator matching
  auth/
    login/              → Login admin + utilizatori
    register/           → Înregistrare utilizatori
  admin/
    page.tsx            → Dashboard
    firms/              → Manage firme + add/edit
    challenges/         → Challenges builder
    rules/              → Rules manager
    reviews/            → Moderare reviews

components/
  layout/               → Navbar, Footer
  firm/                 → FirmCard, FirmTabs, ReviewSection
  admin/                → AdminSidebar, FirmForm, ChallengesBuilder, RulesManager, ReviewsAdmin
  calculator/           → CalculatorClient

lib/supabase/           → Browser + server clients
types/index.ts          → TypeScript types
supabase-schema.sql     → Schema completă (rulează în Supabase SQL Editor)
```

---

## Flux Admin CRM

1. Du-te la `/auth/login` → intri cu contul de admin
2. Vei fi redirectat la `/admin` → dashboard
3. **Add Firm** → completezi datele firmei, toggle Published ON
4. **Challenges Builder** → selectezi firma, adaugi tier-uri de challenge
5. **Rules Manager** → selectezi firma, adaugi reguli per categorie
6. **Reviews** → aprobi/respin-gi review-urile utilizatorilor

