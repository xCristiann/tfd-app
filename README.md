# The Funded Diaries — React App

> Prop trading platform · React 18 + TypeScript + Vite + Supabase

---

## Quick Start

```bash
# 1. Install dependencies
cd tfd-app
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env and add your Supabase credentials:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key

# 3. Run dev server
npm run dev
# → http://localhost:5173
```

---

## Demo Accounts

| Email | Password | Portal |
|-------|----------|--------|
| james@tfd.com | Trader@2026! | /dashboard |
| sarah@tfd.com | Admin@2026! | /admin |
| mike@tfd.com | Support@2026! | /support-crm |

*(These work in demo mode without Supabase. Add real users to your DB for production.)*

---

## Project Structure

```
src/
├── app/                    # Pages (route-based)
│   ├── login/              # Auth page (login, register, forgot)
│   ├── marketing/          # Public landing page
│   ├── dashboard/          # Trader portal
│   │   ├── page.tsx        # Overview with equity curve
│   │   ├── payouts/        # Payout request form + history
│   │   ├── journal/        # Trade journal with modal
│   │   ├── history/        # Closed trade history table
│   │   ├── analytics/      # Performance stats + charts
│   │   ├── challenges/     # Challenge progress tracking
│   │   ├── accounts/       # All trader accounts
│   │   ├── support/        # Open tickets + support form
│   │   └── settings/       # Profile + security settings
│   ├── platform/           # Trading terminal (canvas charts)
│   ├── admin/              # Admin CRM portal
│   │   ├── page.tsx        # Admin dashboard + risk alerts
│   │   ├── traders/        # Trader management table
│   │   ├── accounts/       # All accounts with risk flags
│   │   ├── payouts/        # Payout approval queue
│   │   ├── risk/           # Real-time risk monitor
│   │   ├── challenges/     # Challenge product editor
│   │   ├── affiliates/     # Affiliate tracking
│   │   ├── revenue/        # Revenue analytics
│   │   └── settings/       # Platform + risk settings
│   └── support-crm/        # Support agent portal
│       ├── page.tsx        # 3-panel ticket inbox
│       ├── analytics/      # CSAT + volume analytics
│       └── canned/         # Canned response library
│
├── components/
│   ├── charts/
│   │   ├── EquityCurve.tsx # Canvas equity curve chart
│   │   └── PnLBars.tsx     # Canvas daily P&L bars
│   ├── layout/
│   │   ├── Sidebar.tsx     # Collapsible nav sidebar
│   │   └── DashboardLayout.tsx
│   └── ui/
│       ├── Badge.tsx       # Status badges (funded/phase1/phase2/etc)
│       ├── Button.tsx      # Gold/ghost/danger/success/blue variants
│       ├── Card.tsx        # Card, KPICard, DrawdownBar, Modal
│       └── Toast.tsx       # Toast notifications
│
├── hooks/
│   ├── useAuth.tsx         # Auth context + provider
│   ├── useAccount.ts       # Active account + real-time
│   └── useToast.ts         # Toast state management
│
├── lib/
│   ├── api/
│   │   ├── accounts.ts     # Account CRUD + subscriptions
│   │   ├── analytics.ts    # Stats, equity curve, journal
│   │   ├── payouts.ts      # Payout requests + admin approval
│   │   ├── support.ts      # Ticket system + real-time
│   │   └── trades.ts       # Open/close trades
│   ├── auth.ts             # Supabase auth helpers
│   ├── nav.ts              # Shared nav config
│   ├── supabase.ts         # Supabase client singleton
│   └── utils.ts            # fmt(), pct(), timeAgo(), cn()
│
├── types/
│   └── database.ts         # TypeScript types for all 12 DB tables
│
└── styles/
    └── globals.css         # CSS variables + fonts + animations
```

---

## Database Setup

Run the schema on your Supabase project:

```bash
# From Supabase dashboard → SQL Editor → paste schema.sql
# (included in the original tfd/schema.sql file)
```

Key tables:
- `users` — trader profiles with roles (trader/admin/support)
- `accounts` — funded/challenge accounts with balance, drawdown tracking
- `trades` — open and closed positions
- `payouts` — payout requests with approval workflow
- `support_tickets` + `ticket_messages` — support CRM
- `journal_entries` — trade journal
- `affiliates` — affiliate tracking
- `notifications` — real-time alerts
- `daily_snapshots` — equity history for charts

---

## Deployment (Vercel)

```bash
# Build
npm run build

# Deploy (install Vercel CLI first: npm i -g vercel)
vercel --prod

# Set env vars in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

The `vercel.json` already handles SPA routing (all paths → index.html).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Charts | HTML5 Canvas (custom, no library) |
| Styling | Tailwind CSS utility classes |
| Icons | Emoji (no icon library dependency) |
| Payments | Stripe (challenge purchases — integrate separately) |
| Payouts | Wise API / Crypto wallets (integrate separately) |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## Design System

```css
--bg:    #06060F   /* page background */
--bg2:   #0B0B18   /* cards, sidebar */
--bg3:   #101020   /* inputs, inner panels */
--gold:  #D4A843   /* primary accent */
--gold2: #F0C860   /* hover gold */
--green: #00D97E   /* profit, success */
--red:   #FF3352   /* loss, danger, admin accent */
--blue:  #3B9EFF   /* info, support accent */
--text:  rgba(230,226,248,.94)
--text2: rgba(230,226,248,.56)
--text3: rgba(230,226,248,.25)
```

Fonts: **Playfair Display** (headings) + **DM Sans** (body) + **DM Mono** (numbers)

Accent colors by portal:
- 🟡 **Gold** — Trader dashboard
- 🔴 **Red** — Admin CRM
- 🔵 **Blue** — Support CRM

---

## Connecting Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run `schema.sql` in the SQL editor
3. Enable Row Level Security on all tables
4. Create users via `supabase.auth.admin.createUser()` or the dashboard
5. Add user profiles to `users` table with correct `role` (trader/admin/support)
6. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`

---

## Status

- [x] Full React/TypeScript/Vite project
- [x] All pages implemented (26 pages across 3 portals)
- [x] Trader dashboard — all 9 sub-pages
- [x] Admin CRM — all 9 pages
- [x] Support CRM — 3-panel inbox + analytics + canned responses
- [x] Trading terminal — live candlestick chart + order panel
- [x] Marketing landing page — hero, plans, payouts, features, FAQ
- [x] Role-based routing (trader / admin / support)
- [x] Supabase API layer wired (needs env vars to activate)
- [ ] Stripe integration for challenge purchases
- [ ] Real broker MT5/cTrader data sync
- [ ] KYC provider integration
- [ ] Custom domain + SSL
