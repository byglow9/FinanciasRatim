# Feature Research

**Domain:** Personal finance for a couple (Brazil), mobile-first PWA, bank sync via Pluggy/MeuPluggy, mascot-driven "safe-to-spend" budgeting
**Researched:** 2026-11-17
**Confidence:** MEDIUM overall. Simplifi, Monarch, YNAB, Pluggy and iOS web push findings are checked against official docs (HIGH for those facts). Organizze, Mobills, Minhas Economias, Copilot-sharing and gamification-harm claims rest on third-party blogs and reviews, and the gamification claims are anecdotal, not peer-reviewed (LOW to MEDIUM). Product-judgement calls (what is table stakes) are the author's synthesis.

Scope note: the milestone adds target features to an existing app. Transactions, fixed bills, goals, Porquinho, calendar, reports and MeuPluggy sync already exist and are not re-researched. See PROJECT.md.

## Feature Landscape

### Table Stakes (Users Expect These)

Missing these and the app feels unfinished next to Organizze, Mobills, Copilot or Simplifi.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-category monthly limit with progress bar (spent / limit / remaining) | Every budgeting app (Organizze, Mobills, Copilot, YNAB, Monarch category mode) does this. It is the core mental model. | LOW | Limit = simple monthly cap per category. "Limite do mês" = sum of caps. Category row expands to its transactions. Needs `limit` field on category and a month-scoped spent aggregation. |
| Fixed bills excluded from day-to-day limit | Simplifi's Spending Plan sets recurring bills aside first, then shows what is left. Copilot counts known recurring bills as already spent. Without this, rent makes the number meaningless. | LOW-MEDIUM | Reuses existing fixed bills. Need a clear rule: fixed bill = flagged recurring item, not a category cap. Decide how a paid fixed bill vs. an unpaid one affects "Sobra". |
| "How much can I still spend" headline number | Simplifi "Available to Spend" and Monarch flex number are the market proof. Core value of this project. | MEDIUM | Formula: income (expected or actual) - fixed bills - savings set-asides - day-to-day spent = remaining. Show also per-day remaining. Must be correct before any mascot polish. |
| Expected income per month (editable) | Simplifi lets you edit expected income per month and the plan recalculates. Pay dates in Brazil vary (dia 5, dia 20, adiantamento). | MEDIUM | Income projection: confirmed income this month + expected-not-yet-received. Show "confirmado" vs "previsto" separately so the number is honest. |
| Exclude a transaction from the plan | Simplifi allows excluding reimbursables and own-account transfers. Needed for self-transfers, refunds, Porquinho moves. | LOW | A boolean `ignoreInPlan` per transaction, also set automatically by review-queue decisions. |
| Alert near limit and over limit (in-app) | Standard in Organizze/Mobills. Threshold alerts (e.g. 80% and 100%) are expected once limits exist. | LOW-MEDIUM | Compute on write (client or server). De-duplicate: one alert per category per threshold per month. Persist alert state. |
| Credit card as a first-class account: open bill, closing day, due day, limit, available limit | Brazilian users live on the card. Mobills and Organizze both model fatura, fechamento, vencimento, limite. | HIGH | Purchase after closing date falls on next bill. Limit frees up when bill is paid. See Pluggy caveats below. Start with a real data probe. |
| Card bill payment is a transfer, not an expense | YNAB, Simplifi and all serious apps do this. Otherwise every card purchase is counted twice (purchase plus payment). | MEDIUM | Review queue must recognise "pagamento de fatura" from the checking account and link it to the card bill. This is the single most common cause of wrong totals. |
| Installments (parcelas) shown with N/M and future bills | Core Brazilian behaviour. Pluggy exposes `installmentNumber` and `totalInstallments` and recommends them as the first grouping key. | HIGH | Today the server discards future installments. Decide: store only current-installment charges (simple) or project future ones (accurate bills, more work). |
| Review queue for imported transactions (import / ignore / link to manual entry) | Copilot, Monarch and Simplifi all have a review/inbox for new or uncertain items. Seven items are already stuck in `review` here. | MEDIUM | Reasons: duplicate, self-transfer, card payment, refund. Needs a single action model: import, ignore, link-to-existing. Show the reason and the matching candidate side by side. |
| Settings hub: accounts and cards, categories (icon + limit, split Gastos/Receitas), connected banks, appearance, notifications | Every modern app has this. The current flat settings is the weak point. | MEDIUM | Mostly UI plus data model for category icon/limit and account closing/due day. Connected-banks card shows last sync, expiry (~1 year consent) and re-connect action. |
| Edit categories (name, icon, limit) | Basic. Already partly exists (categories are editable). | LOW | Add icon and limit. Keep Gastos/Receitas split. |
| Installable PWA (manifest, icons, service worker, install prompt) | Stated goal. Users expect a home-screen app. | MEDIUM | iOS has no install prompt event, so show manual instructions ("Compartilhar > Adicionar à Tela de Início"). |
| Dark/light following device with override | Stated decision. Standard in 2026. | LOW | Tailwind v4 tokens already exist. |
| Onboarding (3 welcome screens, clean login) | Expected for a relaunch under a new name. | LOW | Keep it short. Do not gate on bank connection. |
| Couple view (aggregate of Ele + Ela) | The whole product is for a couple. Monarch gives a free partner, YNAB shares budgets, Organizze markets couple sharing. | MEDIUM | See open question below: individual Home plus a "Casal" mode. Aggregate is a read-only sum of two existing scopes, so it is cheap relative to a shared-budget model. |

### Differentiators (Competitive Advantage)

Align with the Core Value: "know in seconds how much you can still spend, and the mascot helps you not blow it".

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Vintém mascot as the status surface (gauge arc, moods: neutro/feliz/triste/bravo/sonolento/surpreso) | Competitors are spreadsheets with charts. A character that reflects pace gives glanceable emotional feedback. Copilot wins on design, but not on personality. | MEDIUM-HIGH | SVG animation without an animation library. Mood must be derived deterministically from pace so it is trustworthy. Keep a reduced-motion path. |
| "Pode gastar" pace status ("No ritmo" / "Acima do ritmo" / "Estourou") | Turns the number into judgement: not just how much is left, but whether you are on track for the day of the month. | MEDIUM | Compare spent-so-far with linear expected burn over the month. Be careful with front-loaded months (rent, card closings). Use day-to-day spend only (fixed excluded). |
| "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra, with projection) | One-glance month equation. Closest comparators are Simplifi's spending plan and Monarch's flex budgeting. Both condense budgeting to one number. | MEDIUM | Projection = spend rate extrapolated, plus upcoming unpaid fixed bills, plus card bills due. Label projection as estimate. |
| Card purchase counts against limit by purchase date, with separate view of what lands on each bill | Most Brazilian apps blur "what I spent" with "what I pay this month". Showing both prevents surprise and lets the mascot react immediately. | HIGH | Two views of the same data: behavioural (purchase date) and cash (by bill). Requires bill assignment logic (closing date rule). |
| Free AI commentary through Vintém (praise, scolding, alerts), numbers-only by default | Personality plus insight at zero cost. Copilot Intelligence and Simplifi AI Assist exist but are paid and chat-oriented. | HIGH | Server-side call only, cache per period and state, canned phrases as fallback (required: free tiers rate-limit and may be down). Send aggregates only. Free tiers may train on inputs, which is why aggregates are the default. Decide data level in that phase. |
| Real push notifications for limit thresholds | Alerts that arrive without opening the app are what make limits useful. | HIGH | Web Push (VAPID) via the Railway server and service worker. On iOS it works only for an installed home-screen app on iOS 16.4+, and the permission prompt must follow a user tap. Build an in-app notification centre first and treat push as the delivery layer on top. |
| Review queue that explains itself (reason chip, one-tap resolve, learn from correction) | Copilot's loop of "suggest, you correct, it learns" is a loved feature. A plain list of flagged rows is not. | MEDIUM-HIGH | Phase 1: deterministic reasons plus one-tap actions. Later: remember decisions as rules (merchant -> category/ignore). Rules are listed in future ideas, so keep the data shape ready. |
| Bills-aware "Sobra" that sets aside upcoming card bill | Copilot treats known recurring bills as already spent. Doing the same for the open card bill avoids the "I have money but the bill is coming" trap. | MEDIUM | Depends on card bill data being reliable. Gate it on the card phase. |
| Couple "Casal" tab with joint totals, per-person limits and shared Porquinho progress, while Home stays individual | Privacy-respecting couple model: each keeps their own number, both see the household. Avoids Monarch/YNAB shared-budget complexity. | MEDIUM | Aggregation query only if each user's data is already scoped (depends on `ownerId`/person scope). |
| Connected banks health card (last sync, consent expiry, reconnect) | Pluggy consent lasts about one year and free sync is every 24 hours. Surfacing expiry avoids silent staleness. | LOW-MEDIUM | Needs the server to expose connection status. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Streaks, daily check-in rewards, loss-framed "you broke your streak" | Popular engagement lever in fintech. Already deferred in PROJECT.md. | Anecdotal but consistent reports link pass/fail and guilt framing to abandonment. A personal app for a couple has no retention KPI to chase, and shame is a bad fit for money. | Vintém comments on what happened this month. No counters that reset. |
| Mascot that shames, insults or guilt-trips ("bronca") past a mild tone | "Bronca" is an explicit mascot state. | A scolding that targets the person rather than the spending turns a helper into a nag. Couples may read each other's screens. | Scolding is about the category or the pace, light and humorous, never moral. Make it switchable (tone: gentle / direct). Never comment on a partner's spending in the partner's view. |
| Mascot evolution, levels, XP, unlockable skins | Typical "pet" gamification. Already discarded. | Rewards activity instead of financial outcomes. Adds design and state surface area without helping "pode gastar". | Mood only reflects budget state. |
| Confetti or celebration for spending less than a category cap | Feels rewarding. | Can reward under-spending that hurts (skipping needed things) and trivialises real goals. | Celebrate only explicit goals reached (future idea: Vintém comemora metas). |
| Dark-pattern notifications (fake urgency, daily nudges, "you haven't logged today") | Engagement metric growth. | Notification fatigue leads users to disable push entirely, killing the one useful alert type. | Only threshold alerts (near / over limit) plus opt-in digests. Per-type toggles in Settings. Quiet hours. |
| YNAB-style envelope budgeting | Powerful and loved by a niche. | Already out of scope. Rigid, high setup cost, and card handling needs a "Credit Card Payment" category machinery. | Simple per-category cap. |
| Counting card purchase and card payment both as expenses | Seems like the obvious "spent" signal. | Doubles every card purchase. Most common bug in imported-data apps. | Purchase = expense (by purchase date). Bill payment from checking = transfer, linked to the bill. |
| Summing Pluggy `financeCharges` into transactions | Looks like free data for interest and fees. | Pluggy documents that interest, fees and IOF often also arrive as card transactions, and some `OTHER` lines are balances, so creating transactions from them duplicates entries. | Display `financeCharges` informationally; never create transactions from them. |
| Sending store names or transaction descriptions to a free AI by default | More specific, funnier comments. | Free tiers can retain and train on data. Violates the project's privacy constraint. | Aggregates only (category totals, percentages, pace). Opt-in for richer data decided in the AI phase. |
| Auto-importing every sync row without review | "Zero effort" promise. | Self-transfers, duplicates and refunds corrupt the headline number, which destroys trust in the core value. | Auto-import clear cases; hold ambiguous ones in the review queue. |
| Credit score, offers, loans, cashback marketplace | Brazilian apps monetise this way (Serasa-style). | Conflicts with a personal, no-commercial-use, free-tier project and adds compliance surface. | Do not build. |
| Investment portfolio tracking | Frequent request in finance apps. | Large scope, not the core value. | Keep Porquinho and Metas only. |
| Shared editable joint budget with permissions and invites | Monarch/YNAB/Organizze headline couple feature. | High complexity. The project already isolates by person and the multi-user `ownerId` phase is separate. | Read-only "Casal" aggregation over the two individual scopes. |
| Own Open Finance connection without an aggregator | Avoids vendor dependency. | Requires being a Central Bank authorised institution. Already out of scope. | MeuPluggy. |
| Social features, leaderboards, comparing with other users | Common in gamified apps. | Privacy and shame risk, no user base. | None. |

## Feature Dependencies

```
Category limits (cap per category)
    └──requires──> Category model with limit + icon (Settings: Categorias)
    └──requires──> Fixed bills excluded from day-to-day

"Pode gastar" number
    └──requires──> Category limits (sum = limite do mês)
    └──requires──> Expected + confirmed income
    └──requires──> Fixed bills (paid / unpaid)
    └──requires──> Clean transactions (self-transfers/duplicates/refunds resolved)
                       └──requires──> Review queue

"O mês em uma conta" (Entra / Fixos / Dia a dia / Sobra + projection)
    └──requires──> "Pode gastar" inputs
    └──enhanced-by──> Credit card open bill (set aside for upcoming bill)

Vintém mood + speech bubble
    └──requires──> Pace status (from "Pode gastar")
    └──enhanced-by──> AI commentary
                          └──requires──> Server proxy + cache + canned fallback

In-app alerts (near / over)
    └──requires──> Category limits
    └──requires──> Alert state persistence (de-dup per threshold/month)
Push notifications
    └──requires──> In-app alerts (same triggers)
    └──requires──> PWA installed (service worker, manifest, HTTPS)
    └──requires──> Subscription storage + sender on server

Credit card support
    └──requires──> Probe of what MeuPluggy returns (creditData, bills, installments, limit)
    └──requires──> Card accounts with closing day + due day (Settings: Contas e cartões)
    └──requires──> Server persistence of card transactions, bills, limit
    └──requires──> Card payment recognised as transfer (Review queue)
Installments
    └──requires──> Credit card support
Card limit by purchase date
    └──requires──> Credit card support
    └──enhanced-by──> Installments

Review queue
    └──requires──> Import reasons stored on `review` items (exists, 7 stuck)
    └──enhanced-by──> Card support (card-payment matching)

Couple view
    └──requires──> Per-person scoping of limits and spend
    └──conflicts──> Single shared joint budget (not building)
Multi-user (ownerId)
    └──requires──> Data migration + Firestore rules
    └──blocks──> Safe push (per-user subscriptions) and per-user AI context

Settings hub ──enhances──> everything above (home for cards, limits, banks, notifications)
PWA install ──enables──> Push (especially iOS)
```

### Dependency Notes

- **"Pode gastar" requires a clean ledger:** the headline number is only as good as the transactions. Review queue (self-transfers, duplicates, refunds, card payments) should land before or with the Home, or the number will be visibly wrong in week one.
- **Card support requires a data probe first:** Pluggy bills are "Only supported on Regulado connections" and come only for Inter PF and Itaú Cartões on Open Finance Direct. Coverage varies by institution (for example Itaú lacks available credit limit, Santander and Caixa have it). The Bradesco connection is the one that matters here, and nothing confirms it returns bills or limit. The probe decides whether bills are read from the bank or computed from closing/due days and transactions.
- **Card payment as transfer requires card accounts:** to link a payment to a bill, the bill (or at least the card account) must exist.
- **Push requires in-app alerts:** build trigger logic once, deliver it two ways. Do not write push-only logic.
- **Push on iOS requires install:** works for home-screen web apps on iOS 16.4+, and the permission prompt must be triggered by a tap. Onboarding should lead to install and then a "ativar avisos" button, not an automatic prompt.
- **AI requires deterministic mood first:** the mascot must work from rules alone. AI only rewrites the words. Fallback phrases are mandatory, not optional.
- **Couple view requires per-person scoping:** cheap if Ele/Ela scopes already exist, and the multi-user phase must not break it.
- **Multi-user conflicts with fast iteration on everything else:** it touches every collection. Sequence it so it does not rewrite features mid-flight (either before the new features' data models are finalised or after, as a dedicated phase).

## MVP Definition

### Launch With (v1: first phases of this milestone)

- [ ] Category model with icon + monthly limit, Gastos/Receitas split — everything else hangs off it
- [ ] Review queue for the stuck `review` items (import / ignore / link) — protects number correctness
- [ ] "Pode gastar" Home: number, remaining per day, pace status, per-category expandable list — the Core Value
- [ ] "O mês em uma conta" with projection (labelled estimate)
- [ ] In-app alerts at near (e.g. 80%) and over (100%) limit
- [ ] Settings hub with Contas e cartões (closing/due), Categorias, Bancos conectados, Aparência, Notificações
- [ ] Vintém SVG with mood states driven by rules + canned speech bubbles
- [ ] PWA install + theme follow-device + onboarding/login refresh (identity rename)

### Add After Validation (v1.x)

- [ ] Credit card: open bill, due/closing, available limit, installments, purchase-date limit counting — after the real-data probe, because scope depends on what MeuPluggy returns
- [ ] Push notifications — after PWA is installed and in-app alerts are proven
- [ ] AI commentary — after mascot and canned phrases work; aggregates only
- [ ] Couple view ("Casal" tab) — after per-person limits are stable
- [ ] Bills-aware "Sobra" (set aside open card bill)

### Future Consideration (v2+)

- [ ] Multi-user for a friend (`ownerId`, rules, migration) — separate phase per PROJECT.md; high blast radius
- [ ] Recurring-bill detection from statement history
- [ ] Rules engine (merchant -> category/ignore), learning from review corrections
- [ ] Weekly Vintém summary; leftover limit rolls into Porquinho; goal celebration
- [ ] CSV export and backup

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Category limits + icons | HIGH | LOW | P1 |
| "Pode gastar" Home + pace status | HIGH | MEDIUM | P1 |
| Review queue (resolve stuck items) | HIGH | MEDIUM | P1 |
| "O mês em uma conta" + projection | HIGH | MEDIUM | P1 |
| In-app near/over alerts | HIGH | LOW-MEDIUM | P1 |
| Settings hub | MEDIUM | MEDIUM | P1 |
| Vintém SVG + moods + bubble | HIGH | MEDIUM-HIGH | P1 |
| PWA install, theme, onboarding | MEDIUM | MEDIUM | P1 |
| Credit card (bill, limit, installments) | HIGH | HIGH | P2 (probe first) |
| Push notifications | MEDIUM-HIGH | HIGH | P2 |
| Couple view | MEDIUM | MEDIUM | P2 |
| AI commentary | MEDIUM | HIGH | P2 |
| Bills-aware Sobra with card bill | MEDIUM | MEDIUM | P2 |
| Multi-user (ownerId) | MEDIUM | HIGH | P3 (own phase) |
| Recurring detection, rules, weekly summary | MEDIUM | MEDIUM-HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone's launch
- P2: Should have, add when its dependency is proven
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor | How they do it | Our Approach |
|---------|------------|----------------|--------------|
| Headline "can spend" number | Simplifi | "Available to Spend": income minus recurring and planned spending, with per-day average, updated live; expected income editable per month; transactions can be excluded | Same idea with the day-to-day limit as the base, plus mascot and pace status |
| One-number budget | Monarch | Flex budgeting groups spend into three buckets with one top-line flex number; category mode remains for control | Simple category caps whose sum is the headline, no mode toggle |
| Review / inbox | Copilot | Suggests category and type, shows confidence, learns from corrections, detects recurring | Reason-chip queue with import / ignore / link now; learn-from-correction later |
| Recurring bills in balance | Copilot | Known recurring bills treated as already spent at start of month | Fixed bills set aside before day-to-day; open card bill later |
| Couples | Monarch, YNAB, Organizze | Shared access or shared budget; Copilot reportedly lacks native multi-user (sources conflict, verify) | Individual Home plus read-only "Casal" aggregate |
| Card handling | YNAB | Card purchase draws from category; payment is a transfer, no category; refunds return to category | Purchase = expense by purchase date; payment = transfer linked to bill; refund reverses category spend |
| Card handling | Mobills / Organizze | Cards with fatura, closing, due and limit; Mobills links some bank cards for automatic bill update, quality varies by bank | Same data model; bank sync depends on MeuPluggy probe |
| Bank sync cost | Organizze, Mobills | Open Finance and sync are paid tiers (Mobills free tier syncs once a day and limits accounts/cards) | Free via MeuPluggy personal plan, 24-hour refresh, up to 5 connections |
| Personality | None of the above | Neutral utility UIs | Vintém mood + AI comments, non-shaming |

## Sources

- Quicken Simplifi help and blog (spending plan, available to spend, expected income, exclusions): https://help.simplifimoney.com/en/articles/4212702-using-the-simplifi-spending-plan , https://www.quicken.com/blog/simplifi-spending-plan-better-than-budgeting/ (HIGH, official)
- Monarch flex vs category budgeting: https://www.monarch.com/blog/flex-vs-category-budgeting-how-to-choose-whats-right-for-you , https://help.monarch.com/hc/en-us/articles/360048883631 (HIGH, official)
- Pluggy credit card bills: https://v2.docs.pluggy.ai/docs/products/credit-card-bills (HIGH, official; fields, Regulado-only caveat, `financeCharges` double-count warning)
- Pluggy credit card installments: https://v2.docs.pluggy.ai/en/docs/products/credit-card-installments (HIGH, official; `installmentNumber`/`totalInstallments` as grouping key)
- Pluggy credit card coverage by institution: https://docs.pluggy.ai/docs/credit-cards-coverage (HIGH, official; limit and bill support vary per bank)
- Pluggy changelog 2026.07 (forecast bill date and closing date on card transactions and bills): https://v2.docs.pluggy.ai/en/changelog/2026.07 (MEDIUM, seen only in search summary)
- YNAB credit card handling: https://support.ynab.com/en_us/handling-credit-cards-overview-ry7cNub1s.md (HIGH, official; summarised via search)
- Copilot review queue, recurring, sharing: https://help.copilot.money/en/articles/11157550-quick-start-guide ; third-party reviews (MEDIUM for review and recurring, LOW for sharing since sources conflict)
- iOS web push requirements (iOS 16.4+, home-screen install, user-gesture prompt): MoEngage, OneSignal, MagicBell docs (MEDIUM; vendor docs, not verified against Apple; EU availability claim unverified)
- Brazilian app comparisons (Canaltech, Tecnoblog forum, Serasa blog) for Mobills/Organizze card and pricing behaviour: MEDIUM-LOW, pricing may be stale. No official Organizze source was found, so Organizze behaviour is inferred from the generic Brazilian card model.
- Gamification and shame framing: Saving Advice, Product Hunt post, 11:FS article (LOW; opinion and anecdote, no peer-reviewed evidence found). Treated as a design caution, not a finding.
- Project context: `.planning/PROJECT.md`

## Open Questions for Requirements

- **Card data:** run the MeuPluggy probe on the Bradesco connection before writing card requirements. Outcome decides "read bills from bank" vs "compute bills from closing/due days".
- **Installments:** store only the current charge, or project future installments onto future bills? Recommendation: project, but only after the probe confirms installment fields are populated for this bank.
- **Couple view format:** Home stays individual. Recommendation: a read-only "Casal" tab showing summed limits, summed spend and per-person split, plus the Porquinho. Confirm with mockups.
- **Alert thresholds:** recommendation 80% and 100%, per-category toggles, one alert per threshold per month.
- **Mascot tone:** recommendation gentle by default with a "direto" option; scolding targets spending, never the person.
- **AI data level:** recommendation aggregates only; revisit only if the provider's terms exclude training.

---
*Feature research for: personal finance app for a couple (Brazil), PWA with mascot*
*Researched: 2026-11-17*
