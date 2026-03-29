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
  /* ─────────────────────────────────────────────────────────────────
     ORDER INDEX PLAN
     1  — Getting Started
     2  — Challenge Rules (all models)
     3  — 2-Step Challenge Guide
     4  — 1-Step Challenge Guide
     5  — Instant Funding Guide
     6  — Pay After You Pass Guide
     7  — Trailing Drawdown Deep-Dive
     8  — Prohibited Practices & Risk Rules
     9  — Payouts & Withdrawals
     10 — Account Management
     11 — KYC / Identity Verification
     12 — Affiliate Program
  ───────────────────────────────────────────────────────────────── */

  /* ══════════════════════════════════════════════════════════════
     1. GETTING STARTED
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'getting-started',
    title: 'Getting Started',
    subtitle: 'Account setup, platforms, and first steps',
    icon: '🚀',
    order_index: 1,
    articles: [
      { id: 'gs1', category_id: 'getting-started', order_index: 1, is_published: true,
        title: 'What is The Funded Diaries?',
        body: `The Funded Diaries (TFD) is a proprietary trading firm that provides capital to skilled traders. You complete a trading evaluation (challenge), prove your skills under real market conditions, and we fund your account — allowing you to trade with our capital and keep up to 90% of the profits.

We offer four distinct challenge models — 2-Step, 1-Step, Instant Funding, and Pay After You Pass — across account sizes from $10,000 to $200,000.

All trading is conducted on simulated accounts using real, live market data. Payouts to successful traders come from TFD's own proprietary funds, based on your simulated performance.` },

      { id: 'gs2', category_id: 'getting-started', order_index: 2, is_published: true,
        title: 'How do I get started?',
        body: `Getting started is straightforward:

1. **Create an account** at thefundeddiaries.com — free, takes 30 seconds
2. **Complete KYC** — verify your identity now to unlock payouts later (5 minutes)
3. **Choose a challenge** — pick your model (2-Step, 1-Step, Instant, Pay After You Pass) and account size
4. **Receive credentials** — login, password, and server are sent to your email immediately after payment
5. **Start trading** — log in to the TFD Platform and begin your evaluation
6. **Hit your target** — reach the profit target while respecting drawdown rules
7. **Get funded** — receive your funded account and withdraw profits every 14 days` },

      { id: 'gs3', category_id: 'getting-started', order_index: 3, is_published: true,
        title: 'What trading platform do you use?',
        body: `We use the **TFD Platform** — our built-in web-based trading terminal accessible at thefundeddiaries.com/platform. No download required; it works in any modern browser on desktop and mobile.

**Available instruments:** Forex pairs (EUR/USD, GBP/USD, USD/JPY, and 9 others), Gold (XAU/USD), Silver (XAG/USD), US indices (NAS100, US500, US30), German index (GER40), and Oil (WTI).

**Leverage:** 1:100 on all instruments.

After purchasing a challenge, you will receive your login credentials (Login ID, Password, Server) by email. Use these to log in to the platform.` },

      { id: 'gs4', category_id: 'getting-started', order_index: 4, is_published: true,
        title: 'Which challenge model should I choose?',
        body: `**2-Step Challenge** — Best for: traders who want the classic evaluation experience. Two phases with static drawdown. Most forgiving for traders who may have early losses.

**1-Step Challenge** — Best for: traders who are consistent and want faster funding. One phase with trailing drawdown. Higher discipline required.

**Instant Funding** — Best for: experienced traders with a proven track record who want to skip evaluation entirely. Funded immediately, trading rules apply from day one.

**Pay After You Pass** — Best for: traders who are confident in their ability but want to reduce upfront cost. Small initial fee; main activation fee only charged if you pass.

If you are new to prop trading, we recommend starting with the **2-Step Challenge** — the two-phase structure gives you more room to develop your approach before committing to the higher discipline of a 1-Step or Instant account.` },

      { id: 'gs5', category_id: 'getting-started', order_index: 5, is_published: true,
        title: 'When are my trading credentials issued?',
        body: `Your trading account credentials (Login ID, Password, Server) are generated automatically once your payment is confirmed. You will receive them by email within minutes of purchase.

If you do not receive your credentials within 15 minutes:
- Check your spam/junk folder
- Ensure your email address is correct in your account settings
- Contact support at support@thefundeddiaries.com with your order number

Your credentials are shown only once in the email. If you lose them, contact our accounts team at accounts@thefundeddiaries.com to request a password reset.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     2. CHALLENGE RULES — ALL MODELS COMPARED
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'challenge-rules',
    title: 'Challenge Rules — All Models',
    subtitle: 'Profit targets, drawdown limits, and trading rules for every model',
    icon: '📋',
    order_index: 2,
    articles: [
      { id: 'cr1', category_id: 'challenge-rules', order_index: 1, is_published: true,
        title: 'Overview: Rules Comparison Table',
        body: `Here is a high-level comparison of the key rules across all four TFD challenge models:

**2-Step Challenge**
- Phase 1 profit target: 8% | Phase 2 profit target: 5%
- Drawdown type: Static (fixed floor from starting balance)
- Max drawdown: 10% | Daily drawdown: 5%
- Minimum trading days: None
- Path: Phase 1 → Phase 2 → Funded

**1-Step Challenge**
- Profit target: 10%
- Drawdown type: Trailing (floor rises with peak equity)
- Trailing DD: 8% from peak | Daily drawdown: 5%
- Minimum trading days: None
- Path: Phase 1 → Funded

**Instant Funding**
- No profit target (already funded)
- Drawdown type: Trailing
- Daily drawdown: 5%
- Path: Funded immediately on purchase

**Pay After You Pass**
- Evaluation rules: same as standard 2-Step or 1-Step depending on plan
- No upfront activation fee — activation fee charged only after passing
- Path: Phase 1 (→ Phase 2 on 2-Step plans) → Pay Activation Fee → Funded

All specific numbers for your account are shown on your dashboard under Risk Dashboard.` },

      { id: 'cr2', category_id: 'challenge-rules', order_index: 2, is_published: true,
        title: 'Profit Targets — How Are They Calculated?',
        body: `Profit targets are calculated as a percentage of your **starting balance** — the balance your account begins with, not your current balance.

**Examples for a $100,000 account:**
- 8% target = $8,000 profit required (balance reaches $108,000)
- 5% target = $5,000 profit required (balance reaches $105,000)
- 10% target = $10,000 profit required (balance reaches $110,000)

**Important:** The target is measured on your **closed balance**, not your floating equity. Open positions do not count toward reaching the target. You must close trades and have the profit reflected in your account balance.

There is **no time limit** to reach any profit target. You can take as long as you need.` },

      { id: 'cr3', category_id: 'challenge-rules', order_index: 3, is_published: true,
        title: 'Daily Drawdown — How It Works',
        body: `The daily drawdown limit prevents excessive single-day losses. It is set at **5%** on all TFD accounts.

**How it is calculated:**
Daily drawdown = 5% from your **highest balance of the current trading day**

**Example — $100,000 account:**
- Day starts with balance of $100,000 — floor is $95,000
- You trade and balance peaks at $102,000 — floor moves to $96,900
- Balance drops to $96,800 — daily DD breached → account terminated

**Key rules:**
- The floor resets each new trading day at 00:00 UTC
- The floor uses your highest **balance** (closed equity), not floating equity
- Breaching the daily DD at any point during the day terminates the account immediately, regardless of your overall account status

The daily DD applies to all phases and funded accounts.` },

      { id: 'cr4', category_id: 'challenge-rules', order_index: 4, is_published: true,
        title: 'Maximum Drawdown (Static) — 2-Step & Pay After You Pass',
        body: `Static maximum drawdown applies to **2-Step Challenge** and applicable **Pay After You Pass** accounts.

**How it works:**
The maximum drawdown floor is fixed permanently at a set percentage below your **starting balance**. It never moves — it does not get worse if you lose, and it does not improve if you profit.

**Formula:**
Floor = Starting Balance × (1 - Max DD%)

**Example — $100,000 account with 10% max DD:**
- Floor = $100,000 × 0.90 = $90,000
- Your equity (balance + open P&L) must never fall below $90,000 at any time
- This floor is the same on day 1 as it is on day 100

**Why static DD is generally more forgiving for beginners:**
Because early losses do not compound against a rising floor. If you start badly and recover, you are not penalised further — the floor was already set from day one.` },

      { id: 'cr5', category_id: 'challenge-rules', order_index: 5, is_published: true,
        title: 'Maximum Drawdown (Trailing) — 1-Step & Instant Funding',
        body: `Trailing maximum drawdown applies to **1-Step Challenge** and **Instant Funding** accounts.

**How it works:**
The floor is not fixed — it rises as your equity grows. The floor is always a set percentage below your **peak equity ever recorded** (including unrealised profits from open positions).

**Formula:**
Floor = Peak Equity × (1 - Trailing DD%)

**Example — $100,000 account with 8% trailing DD:**
- Start: floor = $100,000 × 0.92 = $92,000
- Equity peaks at $105,000 → floor rises to $96,600
- Equity peaks at $110,000 → floor rises to $101,200
- Floor never falls — it only moves up

**Critical note:** The floor tracks your peak **equity**, which includes open floating profits. A large open position that reverses can move your floor up and then breach it before you can close. Manage open P&L carefully.

**1-Step accounts only:** The trailing floor **stops moving** once it reaches your starting balance. Once you have earned enough that your floor equals your starting balance, it locks there permanently — you can never lose the firm's initial capital from that point.` },

      { id: 'cr6', category_id: 'challenge-rules', order_index: 6, is_published: true,
        title: 'News Trading — Is It Allowed?',
        body: `News trading rules depend on your specific challenge plan.

**To check your plan:** Go to Dashboard → Challenges or Dashboard → Accounts and view your product details.

**If news trading is PERMITTED on your plan:**
You may trade freely during major economic news releases with no restrictions.

**If news trading is RESTRICTED on your plan:**
You must not open or close trades within **2 minutes before or after** major scheduled economic announcements. Restricted events include:
- Non-Farm Payrolls (NFP)
- FOMC interest rate decisions and minutes
- CPI, PPI, and inflation data
- GDP releases
- Central bank speeches and press conferences

**Penalty for violation:** Trades placed in the restricted window are flagged. Repeated violations result in account review and potential termination.` },

      { id: 'cr7', category_id: 'challenge-rules', order_index: 7, is_published: true,
        title: 'Weekend Holding — Is It Allowed?',
        body: `Weekend holding rules depend on your specific challenge plan.

**If weekend holding is PERMITTED:**
Positions may remain open from Friday close through Sunday market open. You accept the gap risk over the weekend.

**If weekend holding is RESTRICTED:**
All positions must be closed before the forex market closes on **Friday at 21:00 UTC**. New positions may only be opened after markets reopen on **Sunday at 22:00 UTC**.

Check your account dashboard for your specific plan's rules. If in doubt, close all positions before the Friday close to be safe.` },

      { id: 'cr8', category_id: 'challenge-rules', order_index: 8, is_published: true,
        title: 'Minimum Trading Days — Are There Any?',
        body: `**There is no minimum number of trading days required on any TFD challenge.**

You can pass Phase 1 or Phase 2 in as few days as you like — as long as you reach the profit target while respecting all drawdown and risk rules.

Quality of trading is valued over time served. A trader who reaches the target in 5 disciplined trading days is treated identically to one who takes 30 days.

This applies to all four challenge models: 2-Step, 1-Step, Instant Funding, and Pay After You Pass.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     3. 2-STEP CHALLENGE GUIDE
  ══════════════════════════════════════════════════════════════ */
  {
    id: '2step-guide',
    title: '2-Step Challenge — Complete Guide',
    subtitle: 'The classic two-phase evaluation model',
    icon: '2️⃣',
    order_index: 3,
    articles: [
      { id: '2s1', category_id: '2step-guide', order_index: 1, is_published: true,
        title: 'How the 2-Step Challenge Works',
        body: `The 2-Step Challenge is our most popular evaluation model. It consists of two phases before you receive a funded account.

**The full path:**
1. Purchase the 2-Step Challenge and receive Phase 1 credentials
2. **Phase 1:** Trade to 8% profit while respecting all rules
3. Automatic advance to Phase 2 — new credentials issued by email
4. **Phase 2:** Trade to 5% profit while respecting all rules
5. Account enters **Pending Review** — our team reviews your trading (24–48 hours)
6. Approved → funded account issued with new credentials and a Funded Trader Certificate

The two phases give you the opportunity to demonstrate consistency across multiple trading sessions, not just a single lucky run.` },

      { id: '2s2', category_id: '2step-guide', order_index: 2, is_published: true,
        title: 'Phase 1 Rules — Full Details',
        body: `**Profit target:** 8% of starting balance
**Drawdown type:** Static — floor fixed at starting balance − 10%
**Maximum drawdown:** 10% (floor never moves)
**Daily drawdown:** 5% from daily high balance
**Minimum trading days:** None
**Time limit:** None

**Example — $50,000 account:**
- Profit target: $4,000 (account reaches $54,000)
- Max DD floor: $45,000 (never changes)
- Daily DD: max $2,500 loss from daily high

Once you hit 8% profit with all positions closed, Phase 1 is complete. New Phase 2 credentials are emailed to you automatically. Your Phase 1 account is archived.` },

      { id: '2s3', category_id: '2step-guide', order_index: 3, is_published: true,
        title: 'Phase 2 Rules — Full Details',
        body: `**Profit target:** 5% of starting balance (same starting balance as Phase 1)
**Drawdown type:** Static — same 10% max DD from starting balance
**Daily drawdown:** 5%
**Minimum trading days:** None
**Time limit:** None

Phase 2 is a consistency check. The lower target (5%) is intentional — we are verifying that Phase 1 was not a one-off result but reflects your genuine trading ability.

Once you reach 5% profit, your Phase 2 account is paused and enters Pending Review. You cannot open new positions during this period, but you can view all your statistics, trade history, and equity curve.` },

      { id: '2s4', category_id: '2step-guide', order_index: 4, is_published: true,
        title: 'The Pending Review Process',
        body: `After reaching the Phase 2 profit target, your account enters **Pending Review**. This is a compliance check by our team.

**What happens during review:**
- Your complete trading history is reviewed for rule violations
- Our risk team checks for prohibited practices (hedging, copy trading, HFT, etc.)
- If everything is clean, a funded account is created immediately

**Timeline:** 24–48 hours in most cases. Complex accounts may take up to 5 business days.

**Possible outcomes:**
- ✅ Approved — funded account issued with credentials and Funded Trader Certificate
- ❌ Not Approved — a rule violation was found. Your account is closed with a full explanation. You may appeal within 14 days by emailing accounts@thefundeddiaries.com.

You will receive an email notification either way.` },

      { id: '2s5', category_id: '2step-guide', order_index: 5, is_published: true,
        title: 'Funded Account Rules (2-Step)',
        body: `Once funded through the 2-Step path, your account operates under the following rules:

**Drawdown:** Static max drawdown continues from your funded starting balance
**Daily drawdown:** 5%
**Profit split:** As per your plan (typically 80–90%)
**First payout:** Available 14 days after your first funded trade
**Subsequent payouts:** Every 14 days
**Minimum payout:** $100
**News trading & weekend holding:** As per your specific funded plan

Your funded account has no profit target — trade freely. Focus on managing risk and generating consistent returns to withdraw profits regularly.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     4. 1-STEP CHALLENGE GUIDE
  ══════════════════════════════════════════════════════════════ */
  {
    id: '1step-guide',
    title: '1-Step Challenge — Complete Guide',
    subtitle: 'One phase, trailing drawdown, fast path to funding',
    icon: '1️⃣',
    order_index: 4,
    articles: [
      { id: '1s1', category_id: '1step-guide', order_index: 1, is_published: true,
        title: 'How the 1-Step Challenge Works',
        body: `The 1-Step Challenge is our fastest evaluation path. There is only one phase to complete before you receive a funded account.

**The full path:**
1. Purchase the 1-Step Challenge and receive Phase 1 credentials
2. **Phase 1:** Trade to 10% profit while respecting all rules
3. Pass → funded account is created automatically, no review delay
4. Request payouts every 14 days

There is no Phase 2 and no pending review period. As soon as you close your positions with 10% profit on the books, your funded account is ready.

**Important:** 1-Step accounts use a **trailing drawdown**, which is more demanding than the static drawdown on 2-Step accounts. Read the trailing drawdown articles carefully before trading.` },

      { id: '1s2', category_id: '1step-guide', order_index: 2, is_published: true,
        title: 'Phase 1 Rules — Full Details',
        body: `**Profit target:** 10% of starting balance
**Drawdown type:** Trailing — floor rises with peak equity
**Trailing DD rate:** 8% from peak equity
**Daily drawdown:** 5% from daily high balance
**Minimum trading days:** None
**Time limit:** None

**Starting floor example — $25,000 account:**
- Starting balance: $25,000
- Initial floor: $25,000 × 0.92 = $23,000
- If equity peaks at $27,000 → floor rises to $24,840
- If equity peaks at $30,000 → floor rises to $27,600

The floor only moves up. If equity falls back down, the floor stays at the highest point it reached.

**Floor lock:** Once your floor reaches your starting balance ($25,000 in this example), it stops trailing and locks permanently at your starting balance. You can never lose the firm's initial capital from that point.` },

      { id: '1s3', category_id: '1step-guide', order_index: 3, is_published: true,
        title: 'Why the 1-Step Trailing DD Requires More Discipline',
        body: `The trailing drawdown rewards consistent upward performance but penalises volatile trading more than a static drawdown would.

**The key risk:** If you make fast, large profits early, your floor rises quickly — potentially close to your current equity. A subsequent drawdown that would have been fine under static rules may now breach the trailing floor.

**Example of a dangerous pattern:**
- $10,000 account, 8% trailing DD
- Starting floor: $9,200
- You gain 6% quickly → equity peaks at $10,600 → floor moves to $9,752
- You then lose 4% → equity drops to $10,176 → you are fine
- But if you lose another 2% to $9,968 → you are 3% below peak — still fine
- If you then gain 5% to $10,467 → floor moves to $9,630 — fine
- But if a big loss drops equity from $10,467 to $9,600 → floor is $9,630 → breached

**Best practice:** Trade at moderate, consistent sizes. Do not overleverage early to hit the target fast. Let the target come to you.` },

      { id: '1s4', category_id: '1step-guide', order_index: 4, is_published: true,
        title: 'What Happens After You Pass the 1-Step?',
        body: `As soon as your Phase 1 profit target (10%) is reached and your positions are closed, your funded account is activated automatically.

You will receive:
- An email with your funded account credentials (new login, password, server)
- A Funded Trader Certificate
- Full access to the payout system (first payout available 14 days after your first funded trade)

**Funded account rules:**
- Trailing drawdown continues on the funded account (same 8% rule from peak equity)
- Daily drawdown: 5%
- Profit split: as per your plan
- No profit target on the funded account — trade indefinitely

The floor lock feature continues: once your trailing floor reaches your funded starting balance, it locks permanently there.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     5. INSTANT FUNDING GUIDE
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'instant-guide',
    title: 'Instant Funding — Complete Guide',
    subtitle: 'Get funded immediately — no evaluation required',
    icon: '⚡',
    order_index: 5,
    articles: [
      { id: 'if1', category_id: 'instant-guide', order_index: 1, is_published: true,
        title: 'How Instant Funding Works',
        body: `Instant Funding is designed for experienced traders who want to skip the evaluation entirely. You pay once and receive a fully funded trading account immediately — no phases, no waiting.

**The full path:**
1. Purchase the Instant Funding account
2. Receive your funded account credentials by email within minutes of payment
3. Start trading immediately
4. Request payouts every 14 days

There is no Phase 1 or Phase 2. Your account is live and funded from the moment your payment is confirmed. All standard funded account rules apply from your very first trade.` },

      { id: 'if2', category_id: 'instant-guide', order_index: 2, is_published: true,
        title: 'Rules & Drawdown for Instant Funding',
        body: `Because there is no evaluation phase, Instant Funding accounts carry their funded account rules from day one.

**Drawdown type:** Trailing drawdown (8% from peak equity)
**Daily drawdown:** 5% from daily high balance
**Profit split:** As per your plan (typically 80%)
**First payout:** 14 days after your first trade
**Subsequent payouts:** Every 14 days

**Starting floor example — $25,000 account:**
- Initial floor: $25,000 × 0.92 = $23,000
- As equity grows, floor rises accordingly
- Floor locks permanently at $25,000 once your account has grown enough

All prohibited practices rules apply from the first trade. There is no grace period.` },

      { id: 'if3', category_id: 'instant-guide', order_index: 3, is_published: true,
        title: 'Is Instant Funding Right for Me?',
        body: `Instant Funding is best suited for traders who:
- Have a demonstrable, consistent track record of profitability
- Are experienced with prop firm rules and drawdown management
- Want immediate capital access without going through an evaluation
- Are confident in their risk management and consistency

**Consider an evaluated model instead if:**
- You are newer to prop trading or still refining your strategy
- You want to test your approach under evaluation conditions first
- You prefer the structure and feedback loop of a phased challenge

Instant Funding carries the same rules as any funded account — but without the evaluation safety net. A single bad day early on, before you have built a buffer, can breach the trailing drawdown.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     6. PAY AFTER YOU PASS GUIDE
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'payafter-guide',
    title: 'Pay After You Pass — Complete Guide',
    subtitle: 'Evaluate first, pay the activation fee only if you succeed',
    icon: '💜',
    order_index: 6,
    articles: [
      { id: 'pa1', category_id: 'payafter-guide', order_index: 1, is_published: true,
        title: 'How Pay After You Pass Works',
        body: `Pay After You Pass (PAYP) is our most accessible model for traders who want to reduce their upfront cost. You pay a small fee to access the evaluation; the main activation fee is only charged if you successfully pass.

**The full path:**
1. Pay the upfront evaluation fee (displayed clearly at checkout)
2. Receive your Phase 1 evaluation credentials
3. Trade the evaluation under standard challenge rules
4. **If you pass:** Pay the activation fee (within 14 days) → receive your funded account
5. **If you do not pass:** Account closes. No further charges.

This model is ideal for traders who are confident in their ability but want to limit their financial commitment until they prove their skills.` },

      { id: 'pa2', category_id: 'payafter-guide', order_index: 2, is_published: true,
        title: 'The Two-Fee Structure Explained',
        body: `Pay After You Pass has two separate fees, displayed transparently before purchase:

**Upfront fee** — paid at the time of purchase.
- Grants access to the evaluation account
- Non-refundable once credentials are issued
- Typically a fraction of the standard challenge fee

**Activation fee** — charged only if you successfully pass the evaluation.
- Activates your funded account
- You have 14 days from passing to pay this fee
- If the activation fee is not paid within 14 days, the funded account offer lapses and the account is closed

There are no hidden fees. Both amounts are shown clearly on the product page. If you do not pass, you pay only the upfront fee.` },

      { id: 'pa3', category_id: 'payafter-guide', order_index: 3, is_published: true,
        title: 'Evaluation Rules for Pay After You Pass',
        body: `The trading rules during the Pay After You Pass evaluation are identical to our standard challenge rules:

**Profit target:** As per your chosen plan (typically 8% for 2-Step style, 10% for 1-Step style)
**Drawdown:** Static or trailing depending on your plan
**Daily drawdown:** 5%
**Minimum trading days:** None
**Time limit:** None

All prohibited practices apply during the evaluation — same as any other TFD challenge. Violations (hedging, copy trading, HFT, etc.) will result in account termination with no refund of the upfront fee.

Your specific rules are displayed on your account dashboard.` },

      { id: 'pa4', category_id: 'payafter-guide', order_index: 4, is_published: true,
        title: 'What Happens If You Do Not Pass?',
        body: `If your account is terminated during the evaluation — whether by breaching a drawdown rule or by our team confirming a rule violation — the account closes in the usual way.

**You are NOT charged the activation fee.** The only charge you have incurred is the original upfront evaluation fee.

You may purchase a new Pay After You Pass challenge at any time to try again. There are no restrictions on repeat purchases. Failed attempts are not held against you when you start a new evaluation.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     7. TRAILING DRAWDOWN — DEEP DIVE
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'trailing-drawdown',
    title: 'Trailing Drawdown — Deep Dive',
    subtitle: 'Understanding your dynamic drawdown floor in full detail',
    icon: '📉',
    order_index: 7,
    articles: [
      { id: 'td1', category_id: 'trailing-drawdown', order_index: 1, is_published: true,
        title: 'What Is Trailing Drawdown?',
        body: `A trailing drawdown is a dynamic loss limit that moves upward as your account equity grows. Unlike a static drawdown — which is calculated from your starting balance and never moves — a trailing drawdown floor rises with your peak equity, always maintaining a fixed percentage gap below the highest point your account has ever reached.

This rewards consistent, upward-trending performance. The better you trade, the higher your floor rises — giving you a progressively stronger foundation.

**In simple terms:** You can never lose more than a set percentage from the highest equity level your account has ever recorded, including unrealised profits from open positions.

Trailing drawdown applies to: **1-Step Challenge** and **Instant Funding** accounts.` },

      { id: 'td2', category_id: 'trailing-drawdown', order_index: 2, is_published: true,
        title: 'How Is the Floor Calculated?',
        body: `**Formula:**
Floor = Peak Equity × (1 − Trailing DD%)

The floor is always based on **peak equity** — meaning the highest combined value of your account balance plus any unrealised profits from open positions, at any point in time.

**Step-by-step example — $25,000 account, 8% trailing DD:**

1. Account starts: equity = $25,000 → floor = $25,000 × 0.92 = **$23,000**
2. You open a trade and it moves into profit. Floating equity peaks at $26,500 → floor moves to $26,500 × 0.92 = **$24,380**
3. You close the trade for $1,000 profit. Balance = $26,000, no open trades → floor stays at **$24,380** (it never moves down)
4. Balance grows to $28,000 with more profitable trades → floor = $28,000 × 0.92 = **$25,760**
5. You hit a losing streak. Balance drops to $24,200 → floor is $25,760 → **account breached**

The floor only ever moves UP. A losing period never lowers the floor.` },

      { id: 'td3', category_id: 'trailing-drawdown', order_index: 3, is_published: true,
        title: 'The Floor Lock — When Does Trailing Stop?',
        body: `On **1-Step Challenge** accounts, the trailing floor has an important protection feature: **it stops trailing once it reaches your starting balance.**

Once you have built enough profit that your drawdown floor equals your initial account size, the floor locks permanently at that level — you can never lose the firm's original capital from that point.

**Example — $25,000 account, 8% trailing DD:**
- Starting floor: $23,000
- For the floor to lock at $25,000, your peak equity must reach: $25,000 ÷ 0.92 = **$27,174**
- Once your equity peaks at $27,174 or above, the floor locks permanently at $25,000
- The floor no longer trails above $25,000

This means once you have earned approximately 8.7% above your starting balance (enough to push the floor to your starting balance), you effectively have a permanently protected capital base. Your downside is now your own profits — not the firm's initial capital.

Note: This floor-lock feature applies specifically to **1-Step accounts**. Instant Funding accounts follow their own plan-specific terms.` },

      { id: 'td4', category_id: 'trailing-drawdown', order_index: 4, is_published: true,
        title: 'Open Positions and Floating P&L — Critical Warning',
        body: `The most common source of unexpected trailing DD breaches is **open position floating P&L affecting the peak equity calculation**.

**Why this matters:**
The floor tracks your peak *equity*, not just your balance. Equity includes unrealised P&L from open trades. If you have a large open winner that moves your equity to a new high, your floor rises — even though you have not taken the profit yet.

If that trade then reverses before you close it, your equity drops but your floor has already risen.

**Dangerous scenario:**
- Balance: $10,000 | Trailing DD: 8%
- You open a trade. It runs to +$1,200 floating profit. Equity = $11,200 → floor rises to $10,304
- Trade reverses. You decide to hold. Equity falls to $10,250 → floor is $10,304 → **breached**

You never took the profit but still lost your account.

**Best practices:**
- Set take-profit orders on large winning positions
- Consider taking partial profits on strong moves to lock in balance gains
- Monitor your dashboard's equity and floor display in real time
- Do not assume your floor is only based on closed trades` },

      { id: 'td5', category_id: 'trailing-drawdown', order_index: 5, is_published: true,
        title: 'Trailing DD vs Static DD — Which Is Right for You?',
        body: `**Static Drawdown (2-Step Challenge, applicable Pay After You Pass plans):**
- Floor is fixed from day one at Starting Balance − Max DD%
- Never moves regardless of performance
- You always know exactly where your floor is
- More forgiving if you have early losses before finding your rhythm
- Generally recommended for newer prop traders

**Trailing Drawdown (1-Step Challenge, Instant Funding):**
- Floor starts below starting balance but rises as you profit
- Rewards traders who grow their account upward consistently
- Requires higher discipline — early gains lock in a higher floor to maintain
- Better for traders with a consistently upward equity curve
- Riskier if you make large gains and then give them back

**Neither is objectively better.** Choose based on your trading style:
- Volatile or recovery-heavy style → Static (2-Step)
- Consistent, disciplined, low-drawdown style → Trailing (1-Step)` },

      { id: 'td6', category_id: 'trailing-drawdown', order_index: 6, is_published: true,
        title: 'Practical Tips for Trading With Trailing Drawdown',
        body: `1. **Trade at consistent, moderate sizes.** Rapid large gains early push your floor up fast — making early momentum both your best friend and greatest risk.

2. **Use stop-losses on every trade.** There is no excuse for a stop-loss-free trade on a trailing DD account. One unmanaged loss can wipe the buffer you have built.

3. **Take partial profits on large winners.** Realising some of a winning trade converts floating equity into closed balance — locking in the floor gain permanently.

4. **Do not "give back" gains.** On a static account, losing after winning only moves you back toward the floor. On a trailing account, your floor has already risen — you have less room to give back.

5. **Monitor the dashboard.** Your live equity, current floor, distance to breach, and floor lock status are displayed in real time on your Risk Dashboard.

6. **Check your floor before each session.** Know your current floor number before you open your first trade of the day.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     8. PROHIBITED PRACTICES & RISK RULES
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'prohibited-practices',
    title: 'Prohibited Practices & Risk Rules',
    subtitle: 'What is and is not allowed — know the rules before you trade',
    icon: '⚠️',
    order_index: 8,
    articles: [
      { id: 'pp0', category_id: 'prohibited-practices', order_index: 1, is_published: true,
        title: 'Our Commitment to Fair Trading',
        body: `The Funded Diaries is built to reward genuine trading talent. Every rule below exists to protect the integrity of our programme and ensure fairness for all participants.

All accounts are monitored 24/7 by our automated Risk Management system and human risk team. Violations result in account termination and forfeiture of profits. Serious violations — including coordinated fraud — result in a permanent ban across all accounts.

**If your account is placed under review:**
- You will be notified by email with the reason
- Trading is paused during the investigation
- Investigations are typically resolved within 48–72 hours
- If cleared, your account is unfrozen and all trading access is restored with a written notice

**Appeals:** Any termination decision may be appealed within 14 days by emailing risk@thefundeddiaries.com with your account number, a written explanation, and any supporting evidence. Our decision on appeal is final.` },

      { id: 'pp1', category_id: 'prohibited-practices', order_index: 2, is_published: true,
        title: '🚫 Same-Account Hedging — Strictly Prohibited',
        body: `**Same-account hedging is strictly prohibited on all TFD accounts, across all challenge models.**

Same-account hedging means holding simultaneous BUY and SELL positions on the **same instrument** within the **same account** at the same time.

**Examples of prohibited same-account hedging:**
- Opening a BUY EUR/USD and a SELL EUR/USD on the same account simultaneously
- Partially hedging by holding a 0.5 lot BUY and a 0.3 lot SELL on the same pair at the same time
- Using pending orders to create net-zero or near-zero exposure on the same instrument

**Why it is prohibited:**
Same-account hedging neutralises market exposure and does not demonstrate genuine directional trading skill. It eliminates real risk from the account, which defeats the purpose of an evaluation designed to assess a trader's ability to manage market risk and generate consistent directional profits.

**What our risk system checks:**
Our monitoring runs continuously on all open positions. Any account holding simultaneous opposing positions on the same instrument is flagged instantly and reviewed by our risk team.

**Consequences:**
- First detection: account frozen pending investigation
- Confirmed violation: account permanently breached, all profits forfeited
- Repeated or egregious violations: permanent ban

**What is allowed:**
You may hold multiple positions in the same direction on the same instrument (e.g. two BUY EUR/USD trades). You may hold positions on different, uncorrelated instruments simultaneously. The sole prohibition is simultaneous opposing positions on the same instrument within the same account.` },

      { id: 'pp2', category_id: 'prohibited-practices', order_index: 3, is_published: true,
        title: '🚫 Cross-Account Hedging — Strictly Prohibited',
        body: `Opening opposite positions on the same instrument **across two or more TFD accounts** — whether both accounts are yours, or you are coordinating with another trader — is strictly prohibited.

**Prohibited examples:**
- You own Account A and Account B. You BUY EUR/USD on Account A and SELL EUR/USD on Account B simultaneously to guarantee profits on one account.
- You coordinate with a friend: they BUY on their account while you SELL on yours, then split the profits from whichever account wins.
- A signal group organises opposing positions across member accounts to ensure guaranteed payouts.

**This is treated as coordinated prop firm fraud**, not a grey area. Both parties involved are permanently banned with all accounts terminated and profits forfeited.

Our risk system cross-references all open trades across all accounts by IP address, trading time, symbol, and trade size to detect this pattern automatically.

**Consequences:** Immediate permanent ban for all traders involved. No appeal available for confirmed coordinated fraud.` },

      { id: 'pp3', category_id: 'prohibited-practices', order_index: 4, is_published: true,
        title: '🚫 Copy Trading & Signal Groups — Prohibited',
        body: `Replicating trades from an external signal provider, copy trading service, or any tool that mirrors positions across multiple TFD accounts simultaneously is not permitted.

Every TFD account must reflect the **independent, original judgment** of its registered trader.

**Prohibited:**
- Subscribing to a signal service and copying trades to your TFD account
- Using a copy trading platform (e.g. Myfxbook Autotrade, ZuluTrade) to replicate signals
- Sharing your strategy with others who simultaneously replicate it on their own TFD accounts
- Mirror trading groups where multiple TFD traders all enter identical positions within seconds of each other

**Allowed:**
- Automated strategies (EAs/bots) running on **your own single account** that represent your own strategy
- Using technical analysis tools, trade calculators, or external research to inform your own decisions
- Having a prop coach or mentor advise you — provided you make your own final trade decisions independently

**How we detect it:**
Our mirror trading detector scans for clusters of 2+ accounts opening the same symbol, same direction, same lot size within 60 seconds of each other. Repeated patterns across sessions trigger an automatic flag.

**Consequences:** Termination of all involved accounts and permanent ban.` },

      { id: 'pp4', category_id: 'prohibited-practices', order_index: 5, is_published: true,
        title: '🚫 Multi-Accounting (One Identity, Multiple Profiles) — Prohibited',
        body: `Each individual may hold only **one registered trader profile** with The Funded Diaries. Creating or operating accounts under different names, email addresses, or through family members for the purpose of multiplying allocations or concealing prohibited activity is strictly prohibited.

**Prohibited:**
- Registering a second account under a different email or name after being banned
- Using a spouse, sibling, or friend's identity to create additional accounts that you trade
- Coordinating multiple accounts across household members to multiply challenge attempts

**Allowed:**
- Purchasing and holding multiple challenge accounts under **your single verified profile** — there is no limit on how many challenges you may run simultaneously under your own name
- Genuine separate accounts for legitimately different individual traders in the same household (subject to separate KYC verification and independent trading activity)

**How we detect it:**
We cross-reference login IP addresses, device fingerprints, KYC identity documents, and trading patterns across all accounts. Matching identifiers across different profiles trigger an automatic review.

**Consequences:** Immediate termination of all associated accounts and permanent ban.` },

      { id: 'pp5', category_id: 'prohibited-practices', order_index: 6, is_published: true,
        title: '⚠️ High-Frequency & Automated Trading — Restricted',
        body: `Automated trading is permitted on TFD accounts. Expert Advisors (EAs) and bots are welcome, provided they operate at normal trading frequencies and represent a legitimate, rules-based strategy.

**Allowed:**
- EAs and automated systems running on your own single account
- Scalping strategies (no minimum hold time)
- Grid and martingale systems at normal lot sizes and frequencies
- Any automated strategy that makes genuine market-direction decisions

**Prohibited:**
- Ultra-high-frequency trading (HFT) exceeding 15 trades per hour
- Latency arbitrage — systems that exploit pricing delays between data feeds
- Tick data exploitation — strategies designed to profit from anomalies in the platform's data stream rather than real market conditions
- Any system designed to exploit platform or pricing vulnerabilities

**How we detect it:**
Our velocity monitor tracks trade count per hour per account. Accounts exceeding 15 trades per hour are flagged automatically for review.

**Consequences:** Account review. If abuse is confirmed, account termination.` },

      { id: 'pp6', category_id: 'prohibited-practices', order_index: 7, is_published: true,
        title: '⚠️ Suspicious Win Rate & Bot-Like Patterns',
        body: `A win rate above 90% over 20+ closed trades, or a suspiciously consistent daily P&L pattern, may trigger a compliance review.

**This is not automatically a violation** — exceptional traders do achieve very high win rates legitimately. A review is a check, not an accusation.

**What we look for:**
- Win rate ≥ 90% over 20+ trades with no natural drawdown periods
- Daily P&L variance below 5% over 14+ consecutive days (bot-like consistency)
- Trades that always open and close near statistical extremes with perfect precision

**What happens during a review:**
Your trade history is examined manually by our risk team. If your strategy has a genuine technical or fundamental basis, the review will confirm that and your account will continue without interruption.

If the pattern indicates a platform exploit or data-feed abuse, the account is terminated.

**No action is needed from you unless contacted.** If you are reviewed, you will receive an email.` },

      { id: 'pp7', category_id: 'prohibited-practices', order_index: 8, is_published: true,
        title: '✅ What Is Fully Permitted',
        body: `The following are explicitly permitted on all TFD accounts (subject to your individual plan settings):

✅ Automated trading and Expert Advisors (EAs) on your own account
✅ Scalping — no minimum hold time
✅ Swing trading — hold positions for days or weeks
✅ Overnight holding (check your plan for weekend rules)
✅ News trading (on plans where it is enabled)
✅ Weekend holding (on plans where it is enabled)
✅ Multiple challenge accounts under your single verified profile
✅ Partial position management — scaling in and out of trades
✅ All available instruments: Forex, Gold, Silver, Indices, Oil
✅ Using risk management tools: stop-losses, take-profits, trailing stops

**If you are ever unsure** whether a specific strategy, tool, or approach is permitted, contact us at support@thefundeddiaries.com before using it. We are happy to clarify — we would always rather answer a question upfront than terminate an account later.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     9. PAYOUTS & WITHDRAWALS
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'payouts',
    title: 'Payouts & Withdrawals',
    subtitle: 'How to withdraw your profits, timelines, and methods',
    icon: '💰',
    order_index: 9,
    articles: [
      { id: 'pw1', category_id: 'payouts', order_index: 1, is_published: true,
        title: 'When Can I Request My First Payout?',
        body: `You can request your first payout **14 days after placing your first trade** on a funded account. This applies to all challenge models — 2-Step, 1-Step, Instant Funding, and Pay After You Pass.

After your first payout, subsequent payouts can be requested every 14 days.

**Important:** KYC (identity verification) must be completed before any payout can be processed. If you have not completed KYC, do so as soon as you receive your funded account — do not wait until payout day.

You cannot request a payout while you have open positions. All trades must be closed before submitting a payout request.` },

      { id: 'pw2', category_id: 'payouts', order_index: 2, is_published: true,
        title: 'What Is the Profit Split?',
        body: `Your profit split is displayed on your challenge plan page. Standard splits across TFD plans:

- Standard plans: **80% to trader**
- Professional plans: **85% to trader**
- Elite plans: **90% to trader**

**How it is calculated:**
Payout = (Current Balance − Starting Balance) × Your Split %

Example — $100,000 funded account at 80% split:
- Current balance: $108,000
- Profit above starting balance: $8,000
- Your payout: $8,000 × 0.80 = **$6,400**
- Remaining in account: $1,600 (TFD's 20% share + your account resets to $100,000 starting balance)

There are no hidden fees deducted from your payout beyond the split.` },

      { id: 'pw3', category_id: 'payouts', order_index: 3, is_published: true,
        title: 'Available Payout Methods & Processing Times',
        body: `We offer the following payout methods:

**Cryptocurrency (recommended for speed):**
- USDT TRC20 — typically within 24 hours of approval
- USDT ERC20 — typically within 24 hours of approval
- Bitcoin — typically within 24 hours of approval

**Bank Transfer:**
- Wise — 1–3 business days
- Standard bank wire — 3–5 business days

All payouts are reviewed by our finance team before processing. Once approved, you receive an email confirmation. Once dispatched, you receive a second email with your transaction reference or hash.

You will receive email notifications at every stage: Request Received → Under Review → Approved → Sent.` },

      { id: 'pw4', category_id: 'payouts', order_index: 4, is_published: true,
        title: 'Minimum and Maximum Payout Amounts',
        body: `**Minimum payout:** $100

**Maximum payout:** No upper limit — you may withdraw your full available profit split in a single request.

If you have less than $100 in withdrawable profit, you cannot request a payout until your profits exceed the minimum threshold. Your profit continues to accumulate until you are ready to withdraw.

You can make multiple payout requests in the same 14-day cycle if needed, provided each request meets the $100 minimum.` },

      { id: 'pw5', category_id: 'payouts', order_index: 5, is_published: true,
        title: 'What Happens to My Account During a Payout Review?',
        body: `When you submit a payout request, your funded account is **temporarily suspended** during the review. You cannot open new trades while the request is pending.

This is a standard process to protect the integrity of the withdrawal. Once the payout is approved and processed (or rejected), your account is automatically reactivated and you can resume trading.

**Timeline:**
- Request submitted → Finance team reviews within 1–2 business days
- Approved → Payment dispatched within 24 hours (crypto) or 1–5 business days (bank)
- Your account reactivates automatically after the payout is processed

If your request is rejected, your account is reactivated immediately and you will receive an explanation by email.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     10. ACCOUNT MANAGEMENT
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'account-management',
    title: 'Account Management',
    subtitle: 'Managing accounts, phases, breaches, and credentials',
    icon: '🗂',
    order_index: 10,
    articles: [
      { id: 'am1', category_id: 'account-management', order_index: 1, is_published: true,
        title: 'What Happens If I Breach My Account?',
        body: `If you breach either the daily drawdown or maximum drawdown limit, your account is automatically locked and marked as **Breached** immediately.

**What happens next:**
- An email is sent to you with the breach reason and your final balance
- Trading is suspended permanently on that account — it cannot be reactivated
- Any pending payout requests are cancelled
- Open positions may be closed by our risk team at market prices

Breaching is part of the evaluation process — it is how we identify traders who need further refinement of their risk management. There is no penalty beyond losing that specific account.

**Starting over:** You can purchase a new challenge at any time. There is no restriction on how many challenges you can attempt. Many of our most successful funded traders required multiple attempts.` },

      { id: 'am2', category_id: 'account-management', order_index: 2, is_published: true,
        title: 'How Do I Advance Between Phases?',
        body: `**1-Step and 2-Step Phase 1 → Phase 2:**
Phase advancement is automatic. As soon as your closed balance reaches the profit target with all positions closed, our system detects the pass and sends your new Phase 2 credentials by email. No action needed from you.

**2-Step Phase 2 → Funded:**
Once you hit the Phase 2 target, your account enters Pending Review (24–48 hours). Our team reviews your trading, then issues funded account credentials by email. You will receive a Funded Trader Certificate alongside your new credentials.

**1-Step Phase 1 → Funded:**
Automatic — no review period. Funded credentials are issued immediately when the target is reached.

**Pay After You Pass → Funded:**
After passing, you receive an invoice for the activation fee. Pay within 14 days to receive your funded account credentials.

In all cases, you will receive an email notification at each step.` },

      { id: 'am3', category_id: 'account-management', order_index: 3, is_published: true,
        title: 'Can I Have Multiple Accounts at Once?',
        body: `Yes. You can hold as many challenge accounts simultaneously as you wish — there is no limit under your single verified profile.

Each account is evaluated entirely independently:
- Separate drawdown rules per account
- Separate profit targets per account
- Separate payout schedules per account
- Rule violations on one account do not affect other accounts (unless cross-account hedging is detected)

Many traders run multiple accounts of different sizes simultaneously. This is fully permitted and encouraged as a risk diversification strategy.

**Important:** Each account must be traded independently. Using multiple accounts to hedge against each other (cross-account hedging) is strictly prohibited — see the Prohibited Practices section.` },

      { id: 'am4', category_id: 'account-management', order_index: 4, is_published: true,
        title: 'My Account Is Frozen — What Does That Mean?',
        body: `A frozen (soft-locked) account means our Risk Management team has temporarily suspended trading on your account pending an investigation.

**Why accounts are frozen:**
- A risk flag was detected (potential rule violation, unusual pattern, or trade under review)
- A compliance check was triggered automatically by our monitoring system
- Our team needs to verify a specific trade or series of trades

**What you can do:**
- You will receive an email explaining the reason for the freeze
- You can still view your dashboard, trade history, and statistics
- You cannot open or close trades until the investigation concludes
- If you have relevant information (e.g. explanation of a legitimate strategy), email risk@thefundeddiaries.com — your response helps resolve the review faster

**Timeline:** Investigations are typically resolved within 48–72 hours. You will receive an email with the outcome either way.

Being frozen is not the same as being breached — many frozen accounts are fully cleared and returned to active status.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     11. KYC / IDENTITY VERIFICATION
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'kyc',
    title: 'Identity Verification (KYC)',
    subtitle: 'Why it is required, what documents to use, and how long it takes',
    icon: '🪪',
    order_index: 11,
    articles: [
      { id: 'kyc1', category_id: 'kyc', order_index: 1, is_published: true,
        title: 'Why Do I Need to Complete KYC?',
        body: `KYC (Know Your Customer) verification is required to:

- **Unlock payouts** — you cannot withdraw profits from a funded account without a verified identity
- **Legal compliance** — we are required to verify trader identities under applicable financial regulations
- **Account security** — prevents unauthorised access, identity theft, and fraudulent account use

KYC does not affect your ability to purchase a challenge or trade during the evaluation. However, you cannot receive any payout until KYC is fully approved.

We strongly recommend completing KYC as soon as you register — not waiting until you are already funded and ready to withdraw.` },

      { id: 'kyc2', category_id: 'kyc', order_index: 2, is_published: true,
        title: 'What Documents Do I Need?',
        body: `You will need two things:

**1. Government-issued photo ID** (one of the following):
- Passport (preferred — highest acceptance rate)
- National identity card
- Driver's licence

Requirements for the document:
- Must be valid (not expired)
- Must clearly show your full legal name, date of birth, and photograph
- Must be readable — no blurry, partially cropped, or darkened images

**2. Liveness check** (selfie taken live during the verification):
- A live photo taken in real time through your camera
- Must clearly show your face matching the ID photo
- No printed photos, scanned images, or screenshots accepted
- Good lighting is essential

Our KYC is powered by **Didit**, a trusted identity verification provider. Your documents are processed securely and deleted after verification is complete.` },

      { id: 'kyc3', category_id: 'kyc', order_index: 3, is_published: true,
        title: 'How Long Does KYC Take?',
        body: `**Completing the verification:** approximately 5 minutes on your side.

**Processing time after submission:** Usually 1–2 business hours for automated checks. Complex cases reviewed manually within 1–2 business days.

You will receive an email notification when a decision is made:
- ✅ Approved — KYC complete. Payouts unlocked.
- ❌ Additional action required — explanation of what needs to be resubmitted

**If your KYC is declined:**
You can resubmit at any time from your dashboard (Dashboard → KYC / ID). Common reasons for initial rejections include blurry photos, expired documents, or a liveness check that did not match the ID. These are easily resolved on a second attempt.` },
    ]
  },

  /* ══════════════════════════════════════════════════════════════
     12. AFFILIATE PROGRAM
  ══════════════════════════════════════════════════════════════ */
  {
    id: 'affiliate',
    title: 'Affiliate Program',
    subtitle: 'Earn commission by referring other traders',
    icon: '🔗',
    order_index: 12,
    articles: [
      { id: 'aff1', category_id: 'affiliate', order_index: 1, is_published: true,
        title: 'How Does the Affiliate Program Work?',
        body: `Our affiliate program allows you to earn a commission for every new trader you refer to The Funded Diaries.

**How it works:**
1. Go to Dashboard → Affiliates to get your unique referral code and link
2. Share it with your audience — YouTube, Twitter/X, Discord, TikTok, email, anywhere
3. When someone purchases a challenge using your code, the commission is recorded automatically
4. Commissions accumulate in your affiliate balance in real time
5. Request your affiliate payout from the dashboard when you are ready

There is no cap on earnings and no requirement to be a funded trader yourself to participate.` },

      { id: 'aff2', category_id: 'affiliate', order_index: 2, is_published: true,
        title: 'Commission Rates and Payout',
        body: `**Default commission rate:** 20% of the challenge purchase price per referred sale

Your commission rate can be adjusted by our team for high-performing affiliates. Contact support@thefundeddiaries.com if you have a large audience and want to discuss a custom rate.

**Payout:**
Your earned commission is shown in your Affiliates dashboard alongside your referral history. Commissions are paid out on request — contact support to initiate your affiliate earnings payout.

**Tracking:**
Referrals are tracked via your unique code. Conversions (when someone purchases after clicking your link) are recorded in real time in your dashboard, showing the referral date, amount, commission earned, and status.` },
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

  // Most viewed = hand-picked key articles first, then fill from categories
  const mostViewed = useMemo(() => {
    const priority = [
      'Which challenge model should I choose?',
      'Is Same-Account Hedging Allowed?',
      '🚫 Same-Account Hedging — Strictly Prohibited',
      'Overview: Rules Comparison Table',
      'What Is Trailing Drawdown?',
      'How the 2-Step Challenge Works',
      'When Can I Request My First Payout?',
      'What happens if I breach my account?',
    ]
    const all = categories.flatMap(c => c.articles ?? [])
    const pinned = priority.map(t => all.find(a => a.title === t)).filter(Boolean) as typeof all
    const rest = all.filter(a => !priority.includes(a.title))
    return [...pinned, ...rest].slice(0, 8)
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
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