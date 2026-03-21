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
    id: 'trailing-drawdown',
    title: 'Trailing Drawdown — How It Works',
    subtitle: 'Understanding your moving drawdown floor',
    icon: '📉',
    order_index: 3,
    articles: [
      { id: 'td1', category_id: 'trailing-drawdown', order_index: 1, is_published: true,
        title: 'What is Trailing Drawdown?',
        body: "A trailing drawdown is a dynamic loss limit that moves upward as your account equity grows. Unlike a static drawdown — which is calculated on your starting balance and never moves — a trailing drawdown floor rises with your peak equity, locking in a progressively higher minimum level.\n\nThis means the better you trade, the higher your protection floor moves. It rewards consistent, upward-trending performance while setting a clear maximum loss threshold from any given high point.\n\n**In simple terms:** You can never lose more than a set percentage from the highest point your account has ever reached." },
      { id: 'td2', category_id: 'trailing-drawdown', order_index: 2, is_published: true,
        title: 'How Is the Floor Calculated?',
        body: "Your drawdown floor is calculated as:\n\n**Floor = Peak Equity × (1 − Trailing DD%)**\n\nThe floor is based on your peak **equity** — meaning the highest value of your account including any open positions at their unrealised P&L — not just your closed balance.\n\n**Example with 8% trailing drawdown on a $25,000 account:**\n\n- Account starts at $25,000 → floor starts at $23,000\n- You profit and equity peaks at $27,000 → floor moves up to $24,840\n- You take some losses, equity drops to $25,500 → floor remains at $24,840 (it never moves down)\n- Equity drops to $24,800 → floor is breached → account terminated\n\nThe floor only ever moves up. It cannot move down." },
      { id: 'td3', category_id: 'trailing-drawdown', order_index: 3, is_published: true,
        title: 'Does the Floor Stop Moving at Some Point?',
        body: "On TFD's 1-Step Challenge accounts, the trailing drawdown floor **stops trailing once your floor reaches your starting balance**.\n\nThis means once you have built enough profit that your drawdown floor equals your initial account size, you can never lose the firm's initial capital — and the floor no longer moves upward. From that point, it functions like a static floor at your starting balance.\n\n**Example:** $25,000 account with 8% trailing DD.\n- Starting floor: $23,000\n- Once equity peaks at $27,174 or above, the floor reaches $25,000 (starting balance)\n- The floor locks at $25,000 and does not trail further\n\nThis protects you from ever going below your starting balance once you have reached that performance level." },
      { id: 'td4', category_id: 'trailing-drawdown', order_index: 4, is_published: true,
        title: 'Trailing DD vs Static DD — Key Differences',
        body: "**Static Drawdown (2-Step accounts):**\n- Floor is fixed from day one (e.g. $90,000 on a $100K account with 10% max DD)\n- Floor never moves regardless of your performance\n- You always know exactly where your floor is\n- More forgiving if you start with losses early\n\n**Trailing Drawdown (1-Step accounts):**\n- Floor starts lower but rises as you profit\n- Rewards traders who grow their account consistently\n- Requires more discipline — early big profits mean a higher floor to maintain\n- Better for traders with a consistent, upward equity curve\n\nNeither is objectively better — the right choice depends on your trading style." },
      { id: 'td5', category_id: 'trailing-drawdown', order_index: 5, is_published: true,
        title: 'Tips for Trading with a Trailing Drawdown',
        body: "1. **Trade consistently.** Rapid large gains early in the challenge raise your floor quickly. A more measured approach keeps your floor manageable.\n\n2. **Monitor open P&L.** The floor tracks your peak equity including unrealised profits. A large open winner that reverses can move your floor up then hit it on the way down. Consider taking partial profits.\n\n3. **Avoid revenge trading.** After a drawdown, your floor is already elevated. Trading aggressively to recover can breach the floor faster.\n\n4. **Use your dashboard.** Your live equity, current floor, and distance to breach are shown in real time on your Risk Dashboard." }
    ]
  },
  {
    id: '1step-guide',
    title: '1-Step Challenge — Complete Guide',
    subtitle: 'Everything about the 1-Step evaluation model',
    icon: '1️⃣',
    order_index: 4,
    articles: [
      { id: '1s1', category_id: '1step-guide', order_index: 1, is_published: true,
        title: 'How the 1-Step Challenge Works',
        body: "The 1-Step Challenge is our fastest path to a funded account. There is only one evaluation phase to complete before you receive your funded account.\n\n**The process:**\n1. Purchase the 1-Step Challenge\n2. Receive your trading credentials by email\n3. Trade Phase 1 — hit the profit target while respecting all rules\n4. Pass → your funded account is created automatically\n5. Request payouts every 14 days\n\nThere is no Phase 2. As soon as you hit the profit target, you move directly to a funded account." },
      { id: '1s2', category_id: '1step-guide', order_index: 2, is_published: true,
        title: 'Phase 1 Rules',
        body: "**Profit target:** 10% of starting balance\n**Drawdown type:** Trailing Drawdown (8% from peak equity)\n**Daily drawdown:** 5% maximum per day\n**Minimum trading days:** None\n**News trading:** Check your plan details\n**Weekend holding:** Check your plan details\n\nAll rules are visible on your account dashboard under Risk Dashboard." },
      { id: '1s3', category_id: '1step-guide', order_index: 3, is_published: true,
        title: 'Trailing Drawdown on 1-Step Accounts',
        body: "1-Step accounts use a **trailing drawdown** based on peak equity. See the Trailing Drawdown section for a full explanation.\n\nKey points for 1-Step traders:\n- Your floor starts 8% below your starting balance\n- It rises every time your equity reaches a new high\n- The floor locks at your starting balance once you have profited enough to reach that level\n- Manage your open positions carefully — unrealised profits affect your peak equity" },
      { id: '1s4', category_id: '1step-guide', order_index: 4, is_published: true,
        title: 'What Happens After You Pass?',
        body: "Once your Phase 1 profit target is reached, your funded account is created automatically. You will receive:\n\n- An email with your new funded account credentials (login, password, server)\n- A Funded Trader Certificate\n- Full access to the payout system (first payout available 14 days after your first funded trade)\n\nYour funded account operates under the same trailing drawdown rules as Phase 1." }
    ]
  },
  {
    id: 'instant-guide',
    title: '⚡ Instant Funding — Complete Guide',
    subtitle: 'Get funded immediately with no evaluation',
    icon: '⚡',
    order_index: 5,
    articles: [
      { id: 'if1', category_id: 'instant-guide', order_index: 1, is_published: true,
        title: 'How Instant Funding Works',
        body: "Instant Funding is designed for experienced traders who want to skip the evaluation entirely. You pay once and receive a fully funded trading account immediately — no evaluation, no waiting.\n\n**The process:**\n1. Purchase the Instant Funding account\n2. Receive your funded account credentials by email within minutes\n3. Start trading immediately\n4. Request payouts every 14 days\n\nThere is no Phase 1 or Phase 2. Your account is live and funded from the moment your payment is confirmed." },
      { id: 'if2', category_id: 'instant-guide', order_index: 2, is_published: true,
        title: 'Instant Funding Rules & Drawdown',
        body: "Because there is no evaluation phase, Instant Funding accounts have specific rules to manage risk:\n\n**Drawdown type:** Trailing Drawdown\n**Profit split:** As per your plan (typically 80%)\n**Daily drawdown:** 5% maximum\n**Payout eligibility:** 14 days after first trade\n\nAll funded account rules apply from day one. Violations result in immediate termination." },
      { id: 'if3', category_id: 'instant-guide', order_index: 3, is_published: true,
        title: 'Who Is Instant Funding For?',
        body: "Instant Funding is best suited for:\n\n- Traders with a proven track record who do not wish to go through an evaluation\n- Experienced traders who prefer immediate access to capital\n- Traders who are confident in their risk management and consistency\n\nIf you are new to prop trading or still developing your strategy, we recommend starting with a 2-Step or 1-Step Challenge to build your track record in a lower-pressure environment." }
    ]
  },
  {
    id: 'payafter-guide',
    title: '💜 Pay After You Pass — Complete Guide',
    subtitle: 'Start trading now, pay only if you succeed',
    icon: '💜',
    order_index: 6,
    articles: [
      { id: 'pa1', category_id: 'payafter-guide', order_index: 1, is_published: true,
        title: 'How Pay After You Pass Works',
        body: "Pay After You Pass is our most accessible model. You pay a small upfront fee to access the evaluation, and the main activation fee is only charged if you successfully pass.\n\n**The process:**\n1. Pay the upfront evaluation fee\n2. Receive your Phase 1 credentials\n3. Trade the evaluation under standard rules\n4. If you pass → pay the activation fee → receive your funded account\n5. If you do not pass → no further charges\n\nThis model is designed for traders who are confident in their ability but want to reduce their initial financial commitment." },
      { id: 'pa2', category_id: 'payafter-guide', order_index: 2, is_published: true,
        title: 'The Two-Fee Structure',
        body: "Pay After You Pass has two separate fees:\n\n**Upfront fee** — paid at purchase. This gives you access to the evaluation account. It is non-refundable once credentials are issued.\n\n**Activation fee** — paid only if you pass the evaluation. This fee activates your funded account. You have 14 days from passing to pay the activation fee. If not paid within 14 days, the funded account offer lapses.\n\nBoth fee amounts are clearly displayed on the challenge product page before you purchase. There are no hidden charges." },
      { id: 'pa3', category_id: 'payafter-guide', order_index: 3, is_published: true,
        title: 'What If I Do Not Pass?',
        body: "If you do not reach the profit target or breach a drawdown rule during the evaluation, your account is terminated in the usual way. You are not charged the activation fee.\n\nYou may purchase a new challenge at any time to try again. Existing TFD traders receive no special penalty for failing a Pay After You Pass challenge — it is treated exactly like any other failed evaluation." },
      { id: 'pa4', category_id: 'payafter-guide', order_index: 4, is_published: true,
        title: 'Phase Rules for Pay After You Pass',
        body: "The evaluation rules for Pay After You Pass accounts are identical to our standard challenges. Your specific profit target, drawdown type, and daily DD limit are shown on your account dashboard.\n\nPay After You Pass accounts may use either static or trailing drawdown depending on the plan you select. Check your plan details before trading." }
    ]
  },
  {
    id: '2step-guide',
    title: '2-Step Challenge — Complete Guide',
    subtitle: 'The classic two-phase evaluation model',
    icon: '2️⃣',
    order_index: 7,
    articles: [
      { id: '2s1', category_id: '2step-guide', order_index: 1, is_published: true,
        title: 'How the 2-Step Challenge Works',
        body: "The 2-Step Challenge is our original and most popular evaluation model. It consists of two distinct phases before you receive a funded account.\n\n**The process:**\n1. Purchase the challenge\n2. Complete Phase 1 — hit the profit target (typically 8%)\n3. Automatically advance to Phase 2\n4. Complete Phase 2 — hit the verification target (typically 5%)\n5. Our team reviews your Phase 2 performance\n6. Approved → funded account issued with credentials\n\nPhase 1 advances automatically once the target is hit. The transition from Phase 2 to funded requires a brief review by our team." },
      { id: '2s2', category_id: '2step-guide', order_index: 2, is_published: true,
        title: 'Phase 1 Rules',
        body: "**Profit target:** 8% of starting balance\n**Drawdown type:** Static — fixed from your starting balance\n**Maximum drawdown:** 10% from starting balance\n**Daily drawdown:** 5% from daily high\n**Minimum trading days:** None\n**News trading & weekend holding:** Check your plan details\n\nOnce you hit 8% profit with your account active, you are automatically moved to Phase 2. A new set of credentials is issued for your Phase 2 account." },
      { id: '2s3', category_id: '2step-guide', order_index: 3, is_published: true,
        title: 'Phase 2 Rules',
        body: "**Profit target:** 5% of starting balance\n**Drawdown type:** Static\n**Maximum drawdown:** 10%\n**Daily drawdown:** 5%\n\nPhase 2 is a consistency verification. The lower target reflects that we are confirming your Phase 1 performance was not a fluke.\n\nOnce you reach the 5% target, your account enters a brief pending review period. Our team checks your trading for rule compliance before issuing the funded account. This typically takes 24–48 hours. You will receive an email as soon as your funded account is approved." },
      { id: '2s4', category_id: '2step-guide', order_index: 4, is_published: true,
        title: 'Static Drawdown on 2-Step Accounts',
        body: "2-Step accounts use a **static drawdown**. This means:\n\n- Your maximum loss limit is fixed from day one based on your starting balance\n- It does not move regardless of your performance\n- Example: On a $100,000 account with 10% max DD, your floor is always $90,000\n\nThe static floor means you always know exactly where you stand. It is generally considered more forgiving early in the challenge, as early losses do not compound against a rising floor.\n\nYour daily drawdown limit (5%) is calculated from your highest balance on the current trading day." },
      { id: '2s5', category_id: '2step-guide', order_index: 5, is_published: true,
        title: 'What Happens After Phase 2?',
        body: "After hitting your Phase 2 target:\n\n1. Your account shows **Pending Review** on the dashboard\n2. Our team reviews your trading (typically 24–48 hours)\n3. You receive an email — either your funded account credentials, or a request for additional information\n4. Once approved, a Funded Trader Certificate is issued\n5. Your first payout can be requested 14 days after your first funded trade\n\nDuring the pending review period, trading on your Phase 2 account is paused. You cannot open new positions but can view all your statistics and history." }
    ]
  }] = [
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
    id: 'prohibited-practices',
    title: 'Prohibited Practices & Fair Trading Rules',
    subtitle: 'What is and is not allowed',
    icon: '⚠️',
    order_index: 2,
    articles: [
      { id: 'p1', category_id: 'prohibited-practices', order_index: 1, is_published: true,
        title: 'Our Commitment to Fair Trading',
        body: "The Funded Diaries is committed to rewarding genuine trading talent. To protect the integrity of our programme and ensure fairness for all traders, we maintain a strict set of trading rules.\n\nAll accounts are monitored by our Risk Management team. Violations of our rules will result in account termination and forfeiture of profits. Serious violations — including fraud and coordinated abuse — will result in a permanent ban.\n\nIf your account is placed under review, you will be notified by email. Investigations are typically resolved within 48–72 hours. If you disagree with a decision, you may submit an appeal within 14 days to risk@thefundeddiaries.com." },

      { id: 'p2', category_id: 'prohibited-practices', order_index: 2, is_published: true,
        title: '🔄 Cross-Account Hedging — Prohibited',
        body: "Opening opposite positions on the same instrument across two or more TFD accounts — whether your own accounts or in coordination with another trader — is strictly prohibited.\n\nEach account must operate independently, based solely on your individual trading decisions.\n\n**Penalty:** Immediate termination of all involved accounts and permanent ban." },

      { id: 'p3', category_id: 'prohibited-practices', order_index: 3, is_published: true,
        title: '🪞 Copy Trading & Signal Groups — Prohibited',
        body: "Replicating trades from an external signal provider, copy trading platform, or any service that mirrors positions across multiple TFD accounts simultaneously is not permitted.\n\nEvery TFD account must reflect the independent judgment of its registered trader.\n\n**Allowed:** You may use automated strategies (EAs/bots) on your own single account, provided they represent your own strategy and are not shared or mirrored to other accounts.\n\n**Penalty:** Termination of all accounts involved and permanent ban." },

      { id: 'p4', category_id: 'prohibited-practices', order_index: 4, is_published: true,
        title: '👤 Multi-Accounting — Prohibited',
        body: "Each individual may hold only one registered trader profile with TFD. Creating or operating accounts under different identities, email addresses, or through family members for the purpose of multiplying allocations or concealing prohibited activity is not permitted.\n\n**Allowed:** You may purchase and hold multiple challenge accounts under your single verified profile.\n\n**Penalty:** All associated accounts terminated and permanent ban applied." },

      { id: 'p5', category_id: 'prohibited-practices', order_index: 5, is_published: true,
        title: '📰 News Trading — Plan Dependent',
        body: "News trading rules depend on your specific challenge plan. Please check your account details on the dashboard to confirm whether news trading is permitted.\n\n**If your plan allows news trading:** You may trade freely during news events.\n\n**If your plan restricts news trading:** You must not open or close trades within the restricted window around major scheduled economic announcements (e.g. NFP, FOMC, CPI).\n\n**Penalty:** Termination and forfeiture of profits from trades placed in violation of your plan's news trading rules." },

      { id: 'p6', category_id: 'prohibited-practices', order_index: 6, is_published: true,
        title: '⚡ High-Frequency & Automated Trading — Restricted',
        body: "Automated trading is permitted on TFD accounts, provided it operates at normal trading frequencies and represents a legitimate strategy.\n\nUltra-high-frequency strategies, latency arbitrage, tick data exploitation, and any system designed to exploit data feed anomalies rather than genuine market analysis are prohibited.\n\n**Allowed:** EAs, bots, and automated systems that trade at reasonable frequencies and apply a consistent, rule-based strategy.\n\n**Not allowed:** HFT systems, arbitrage bots, or any strategy exploiting platform or pricing vulnerabilities.\n\n**Penalty:** Account review. Termination if abuse is confirmed." },

      { id: 'p7', category_id: 'prohibited-practices', order_index: 7, is_published: true,
        title: '📅 Weekend Holding — Plan Dependent',
        body: "Whether you may hold open positions over the weekend depends on your specific challenge plan.\n\n**If your plan allows weekend holding:** Positions may remain open from Friday close through Sunday market open.\n\n**If your plan restricts weekend holding:** All positions must be closed before the market closes on Friday (21:00 UTC). New positions may only be opened after markets reopen on Sunday (22:00 UTC).\n\nCheck your account dashboard for your plan's specific rules." },

      { id: 'p8', category_id: 'prohibited-practices', order_index: 8, is_published: true,
        title: '🔒 Account Reviews & Frozen Accounts',
        body: "If our Risk Management team flags your account for review, trading will be temporarily suspended and you will receive an email notification. This is a standard compliance procedure and does not necessarily indicate wrongdoing.\n\n**During a review:**\n- Trading is paused\n- You can still view your dashboard and history\n- Our team aims to resolve all reviews within 48–72 hours\n\n**Possible outcomes:**\n✅ Cleared — No issue found. Trading restored immediately.\n⚠️ Warning — A concern was noted. Trading restored with a formal caution.\n❌ Terminated — A rule violation was confirmed. Account closed, profits forfeited.\n\n**Appeals:** Termination decisions may be appealed within 14 days by emailing risk@thefundeddiaries.com with a written explanation and any supporting evidence." },

      { id: 'p9', category_id: 'prohibited-practices', order_index: 9, is_published: true,
        title: '✅ What Is Fully Permitted',
        body: "The following are explicitly permitted on all TFD accounts (subject to your individual plan):\n\n✓ Automated trading and Expert Advisors (EAs) at normal frequencies\n✓ Scalping — no minimum hold time\n✓ Swing trading — hold positions for days or weeks\n✓ News trading (on plans where permitted)\n✓ Weekend holding (on plans where permitted)\n✓ Hedging within a single account (on plans where permitted)\n✓ Multiple challenge accounts under your single verified profile\n✓ All available instruments: Forex, Indices, Commodities, and others\n\nIf you are ever unsure whether a specific strategy or tool is permitted, contact us at support@thefundeddiaries.com before using it. We are happy to clarify — we would always rather answer a question upfront than terminate an account later." },
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