# Project Research Summary

**Project:** Coinki (ex-Financias Ratimbum)
**Domain:** Personal finance PWA for a couple (Brazil), Open Finance bank sync via MeuPluggy, mascot-driven "safe to spend" budgeting
**Researched:** 2026-11-17
**Confidence:** MEDIUM-HIGH

## Executive Summary

Coinki is a brownfield milestone, not a new build. The existing app (React 19, Vite 7, Tailwind v4, Firestore read directly from the client, Express 5 sync server on Railway, Pluggy) already covers transactions, fixed bills, goals, calendar and bank import. The milestone adds a budgeting layer (per-category monthly limits and a "Pode gastar" headline number), a mascot (Vintém), credit-card support, Pluggy webhooks, push, free-LLM comments, a rename plus PWA install, and multi-user. Experts build this kind of product as a ledger with a few well-defined views over one transaction collection, a single pure calculation core shared by client and server, and everything decorative (mascot words, LLM, push) layered on top, so the core value never depends on a network call.

The recommended approach is: fix the data and access foundation first (the app currently has open Firestore rules, a public shared API key, and a local login with no Firebase identity), then make the ledger trustworthy (review queue, fixed-bill linking, webhook-driven sync), then deliver the Core Value (limits, "Pode gastar", the Limits and Cards central) before any polish. The mascot, PWA/rename, push and LLM follow in that order. Credit cards sit behind a mandatory real-data spike, because nobody has confirmed what MeuPluggy returns for this user's Bradesco card. Stay on the current stack with targeted upgrades: `firebase` ^13 and `firebase-admin` ^14 (FCM FID flow, Node >= 22), `vite-plugin-pwa` 2 in `injectManifest` mode with a single service worker, a swappable LLM provider layer (Cloudflare Workers AI, Groq or Grok as candidates) behind a guaranteed phrase-bank fallback, no animation library for the mascot, and no Cloud Functions (Blaze only).

The main risks are:
1. Tightening Firestore rules before every user has a real `request.auth` locks the owner out.
2. Double counting money (card purchase plus card-bill payment, fixed bill plus its bank import, refunds as income).
3. Stale or empty bank data shown as "you can spend R$ X", because MeuPluggy refreshes only every 24 h and consent expires after 1 year.
4. The service worker pinning old code under the current `**/*.js` immutable cache rule.
5. The LLM path, which now carries store names and a deliberately harsh tone, needs a sanitizer, output validation and a phrase-bank fallback.
6. The Pluggy webhook endpoint is a new unauthenticated-by-token public surface and is unconfirmed on MeuPluggy.

Each has a concrete prevention below.

## Owner Decisions That Override Research

PROJECT.md is the source of truth. Where the researchers disagree with it, the roadmap follows PROJECT.md. The researchers' concerns are kept as implementation guardrails, not as vetoes.

| Topic | Researchers said | PROJECT.md decision (binding) | Guardrail that remains |
|-------|------------------|-------------------------------|------------------------|
| Mascot tone | Keep scolding mild, never insulting (anti-feature in FEATURES) | Vintém may scold harshly, swear and embarrass; level adjustable in Settings | Tone level is a setting (suggest: gentle / direto / sem filtro). Mascot goes neutral when data is stale. The phrase bank needs harsh variants too, because free models may refuse or soften profanity and the fallback must match the chosen tone. No CPF, account numbers or person names in any generated text. |
| Data sent to LLM | Aggregates only, no merchant names (STACK, FEATURES, PITFALLS 11) | Category totals and merchant/establishment names are allowed; CPF, account/card numbers and names of individuals (Pix) stay out | One `buildLlmContext()` with an allowlist and a sanitizer. Pix descriptions are a real leak path (individuals' names appear there), so Pix and transfers to people collapse to a generic label before sending. Free text reopens prompt injection (PITFALLS 15): validate output against a schema, render as plain text, never as markup. |
| LLM provider | Workers AI primary (no-training statement); exclude Gemini free tier because of training | Provider sits behind a swappable layer. Candidates: Cloudflare Workers AI, Groq and Grok (xAI). Grok free credits are unconfirmed and require accepting training on prompts. The owner has accepted training. | Provider and model IDs live in server config, never in code. Choose the provider in the LLM phase and record its data and limit terms on that date. Do not plan around Grok free credits until confirmed. Workers AI stays the default, because it has no training exposure and a published free quota. The earlier Gemini exclusion is now a preference, not a rule. |
| Limits and Cards | Separate Limits page and Card page implied | One dedicated "Central de Limites e Cartões" with a summary on Home | Build the central in the limits phase with a cards section stubbed; cards content lands in the card phase. Card due dates also appear in Calendar and alerts. Navigation placement decided by mockups. |
| Fixed bills | Link bank import to fixed bill; risk of double counting | Marking a fixed bill paid is manual and never creates a transaction; the bank import is linked to the fixed bill and leaves "Dia a dia" | Add `Transaction.fixedExpenseId`; `countsForLimit()` excludes linked transactions. The import still creates its own transaction (the bank record); only the manual "mark paid" action never does. |
| Pluggy webhooks | Optional enhancement; MeuPluggy support unconfirmed (STACK) | Requirement: handle `item/updated` and `transactions/created`, `updated` and `deleted`, authenticated by a secret header, with polling kept as fallback | The endpoint is a public Railway route that cannot use a Firebase ID token, so it needs a constant-time secret-header check, an `ownerId` resolved from the item rather than the payload, and idempotent handlers. Needs a real test on MeuPluggy, since it is unconfirmed that MeuPluggy items deliver webhooks. Polling never goes away. |

## Key Findings

### Recommended Stack

Details in `STACK.md`. Keep React 19, Vite 7 (no move to Vite 8 or plugin-react 6 in this milestone), Tailwind v4, Firestore, Express 5 and date-fns 4, and add only what the features need. The server must move to Node >= 22.23.4 (required by `pluggy-sdk` 0.94.x and `firebase-admin` 14); local Node 22.17.1 is too old for `pluggy-sdk`.

**Core technologies:**
- `vite-plugin-pwa` ^2.0.0 (`injectManifest`, `registerType: 'prompt'`) plus `workbox-*` ^7.4.1: one service worker that holds precache and the FCM background handler. Prompt-style updates, so a financial app never swaps code silently.
- `firebase` ^13.4.0 and `firebase-admin` ^14.5.1: FID-based FCM (`register()`/`onRegistered()`), `verifyIdToken` for server auth, `BulkWriter` for the `ownerId` backfill. `getToken()` is obsolete.
- LLM provider adapter (plain `fetch`, about 40 lines, OpenAI-compatible shape) with candidates Cloudflare Workers AI (Llama 3.3 70B fp8 fast; free 10,000 Neurons/day; no-training statement), Groq (free tier, no default retention) and Grok/xAI (free credits unconfirmed, requires accepting training on prompts). `zod` validates output; `express-rate-limit` throttles per user. Re-read each vendor's terms and limits on the day of the decision.
- Rule-based phrase bank in the client bundle: mandatory final fallback. The core value never depends on a network call.
- Inline React SVG plus CSS variables plus a typed reducer for the mascot: no Lottie, Rive or XState. One passive `pointermove` listener throttled by `requestAnimationFrame`, `prefers-reduced-motion` honored, no per-move React state.
- `pluggy-sdk` ^0.94.3: `creditData`, `fetchCreditCardBills`, `installmentNumber`, `billId`, `billForecastDate`, and webhook registration. Needs the Node upgrade above.
- `@date-fns/tz` (America/Sao_Paulo) plus integer centavos plus `Intl.NumberFormat`: Railway runs in UTC, so month and day boundaries must be explicit.
- `@firebase/rules-unit-testing` ^6 (needs JDK 11+ for the emulator) and `firebase-tools` ^15: tenant-isolation tests and the second Hosting site.

**Test runner:** the researchers disagree. Use `node --test` for the shared pure core (already used in `server/test`, no new dependency). Add Vitest only if component tests appear.

### Expected Features

Details in `FEATURES.md`.

**Must have (table stakes):**
- Per-category monthly limit with progress (spent, limit, remaining) and a category row that expands to its transactions
- Fixed bills excluded from the day-to-day limit
- "Pode gastar" headline number, remaining per day, pace status, and editable expected income (confirmed vs expected shown separately)
- Review queue for imported items (import / ignore / link to manual entry or to a fixed bill), resolving the 7 stuck `review` items
- In-app alerts at 80% and 100% of a limit, deduplicated per category and month
- Settings hub: Contas e cartões (closing and due day), Categorias (icon, limit, Gastos/Receitas split), Bancos conectados, Aparência, Notificações
- Installable PWA, theme following the device with override, new onboarding and login
- Credit card as a first-class account: card bill payment is a transfer, never an expense; installments shown N/M

**Should have (competitive):**
- Vintém mascot as the status surface (six moods derived deterministically from pace, gauge arc, speech bubble)
- "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra) with a projection labelled as an estimate
- Central de Limites e Cartões: per-limit and per-card state in one place, with vencimentos in Calendar and alerts
- Card purchases count against the limit by purchase date, with a separate "what leaves on each bill" view
- Pluggy webhooks (item/updated, transaction created/updated/deleted) so new bank data lands faster than the 6 h poll, with polling as fallback
- Push for limit thresholds, and free LLM commentary (praise, scolding, alerts) with cache and phrase fallback
- Couple view ("Casal"): Home stays individual, a read-only aggregate of Ele and Ela
- Connected-banks health card (last sync, consent expiry, reconnect)

**Defer (v2+):**
- Recurring-bill detection, rules engine (merchant to category), weekly Vintém summary, leftover limit into Porquinho, CSV export, goal celebration
- Rejected: streaks, XP, mascot evolution, credit score or offers, investment tracking, YNAB-style envelopes, shared editable joint budget
- Never create transactions from Pluggy `financeCharges` (informational only, double counts)

### Architecture Approach

Details in `ARCHITECTURE.md`. The client keeps reading Firestore directly. The central idea is a pure `shared/core/` (budget, ledger, alerts, speech, review) that runs identically in the browser and on the server, with an injected clock and time zone. Client and server never call each other for numbers; they recompute from the same Firestore data. The server is called only for what the client cannot do: scheduled push, the LLM key, Pluggy sync and Pluggy webhooks. New fields on existing documents are optional (absent means current behavior), new collections are born with `ownerId`, and a `scope()`/`ownerId()` seam is introduced now so the later multi-user step is a data operation rather than a rewrite.

**Major components:**
1. `core/budget` and `core/ledger` (pure) — `computeMonthBudget`, pace and projection, plus two ledger views over one `transactions` collection. `countsForLimit` excludes fixed-linked items and card-bill payments and includes card purchases by purchase date. `countsForCashBalance` excludes card purchases and includes bill payments.
2. `core/alerts` plus an `alerts` collection with deterministic IDs (`ownerId_yyyymm_cat_limiar`) — idempotent under Railway restarts; the same collection feeds the in-app bell and push.
3. `core/speech` plus `components/mascot` — deterministic state and phrase from aggregates. The LLM only rewrites words, stale-while-revalidate with a short timeout.
4. `core/review` — pure `planResolution` returning writes applied by `writeBatch` (import, ignore, link to manual, link to fixed bill).
5. Server: `sync.js` (upsert by bill, not insert-only), `webhooks.js` (secret-header route feeding the same sync and reconcile code as polling), `alerts-engine`, `scheduler` (BRT), `push.js`, `auth.js` (`verifyIdToken`), `llm/` (swappable provider adapter, quota, cache).
6. Single `sw.ts` service worker; Hosting site `coinki` in the same Firebase project.

### Critical Pitfalls

Full list of 24 in `PITFALLS.md`. The ones that shape the roadmap:

1. **Tightening rules locks out the owner (P1-P3)** — the local `ratimbum` login has no `request.auth`. The order is fixed:
   1. Real Firebase Auth login becomes the only path.
   2. Remove the legacy login and open signup.
   3. Backfill `ownerId` (dry-run, counts before and after).
   4. Publish composite indexes.
   5. Ship the client querying with `ownerId`.
   6. Only then publish restrictive rules.

   Never publish `request.auth != null` as an intermediate step. Keep the old rules file for rollback.
2. **Server ignores rules and trusts a public key (P4)** — `VITE_BANK_API_KEY` is in the bundle. Replace it with Firebase ID tokens on `/api`, derive `ownerId` from the token or the connection (never the request body), put `ownerId` on every server write, and restrict `ALLOWED_ORIGINS` including the new domain. This is a prerequisite for push and LLM routes. The webhook route is the one deliberate exception: it uses a secret header, never a token and never an `ownerId` from the body.
3. **Double counting money (P9, P16)** — card purchase plus bill payment, fixed bill plus bank import, refunds modelled as income. Prevention is a single tested rule set in `core/ledger`, an explicit fixed-link, refunds as category credit, retroactive reclassification proposed in the review queue (never silently), and a stable `categoryId` before limits are stored. Category is a name string today, so renaming orphans history and limits.
4. **Stale or empty bank data shown as truth (P8)** — MeuPluggy refreshes every 24 h, cannot refresh manually, and consent expires after about 1 year with empty reads. Webhooks shorten the delay after an upstream update but do not remove it. Show "dados do banco até ...", mark `stale` after about 30 h or when item status is not `UPDATED`, treat expired consent as a "reconectar" state, and make Vintém neutral (no scolding or praise) when stale.
5. **Service worker and hosting cache (P6, P7, P18)** — `**/*.js` is `immutable` for one year and would pin `sw.js`, and the `** -> /index.html` rewrite returns HTML for missing JS. Restrict `immutable` to `/assets/**`, add explicit `no-cache` for `/sw.js`, manifest and HTML, verify with `curl -I`, use `registerType: 'prompt'`, one SW only, and have a kill-switch `sw.js` ready. The rename is a new origin: login is redone once, localStorage does not carry over, CORS and Auth authorized domains must be updated, and the old site should redirect.
6. **Cards and webhooks: dates, installments, recreated IDs (P10)** — `date` can be purchase or posting date by bank; there is no installment group ID or `totalAmount` over Open Finance; transactions can be deleted and recreated with new IDs 1 to 3 days later (exactly the `transactions/deleted` plus `created` webhook pair). The current sync is insert-only and drops future-dated items. Spike first, store `purchaseDate`/`postedDate`/`installmentNumber`/`totalInstallments`/`billId` separately, dedupe by natural key, and reconcile PENDING to POSTED. Webhook handlers must be idempotent and share this reconcile code with polling.

## Implications for Roadmap

The suggested order follows dependencies found across all four files. Phases are numbered for reference only; the roadmapper may merge small ones (for example 4 with 3, or 9 with 10) if granularity settings call for it.

### Phase 1: Data Foundation and Access
**Rationale:** Everything depends on real identity. Push, LLM and per-user caching need ID tokens, rules need `request.auth`, and cards and limits should be born with `ownerId`. Doing this later forces rewriting every service, index and the sync in one pass.
**Delivers:**
- Firebase Auth as the only login (legacy login and open signup removed)
- `ownerId` on all documents plus backfill, and the `scope()` seam
- Composite indexes and restrictive Firestore rules with emulator tests
- Server `verifyIdToken` and `ownerId` on all server writes, plus restricted CORS
- `shared/core` skeleton with `node --test`, and a stable `categoryId`
- `firebase` 13, `firebase-admin` 14 and Node >= 22.23.4 upgrades
- Firestore read-count measurement

**Addresses:** Multi-user groundwork for the couple's existing data (not the friend yet).
**Avoids:** P1, P2, P3, P4, P21 (cost and quota measurement), P23 (mock mode giving false confidence).
**Decisions to make here:**
- `ownerId` is the uid of the shared household login (recommended: simplest, matches the single shared login today) versus a household claim (`hid`). STACK says no custom claims for now; ARCHITECTURE leans household. Keep the seam so either works.
- Confirm the Railway plan and how `shared/core` reaches the server (repo-root deploy versus copy script).

### Phase 2: Import Review, Fixed-Bill Linking and Pluggy Webhooks
**Rationale:** Limits computed over a ledger with 7 unresolved `review` items and unlinked fixed bills give wrong numbers in week one. Webhook ingestion belongs here because it feeds the same ledger and reuses the import and reconcile path, and the card phase later depends on it.
**Delivers:**
- Review queue UI (reason chip, one-tap import / ignore / link), pure `planResolution` with `writeBatch` and an idempotency check
- `Transaction.fixedExpenseId` with auto-suggested fixed link by amount, description and date. "Mark paid" stays manual and never creates a transaction.
- `bankImports.resolution`, refunds as category credit, and card-payment recognition rules
- Pluggy webhook endpoint:
  - handles `item/updated` and `transactions/created`, `updated` and `deleted`
  - authenticated by a secret header with a constant-time compare
  - resolves `ownerId` from the stored item, never from the payload
  - idempotent, sharing the sync/reconcile code with polling
  - polling (the 6 h interval) stays as fallback
  - webhook registration and a real test on MeuPluggy, because support for MeuPluggy items is unconfirmed. If MeuPluggy does not deliver them, ship polling only and keep the handler dormant.

**Addresses:** Review queue, fixed-bill exclusion from day-to-day, Contas Fixas page kept with a summary, fresher bank data.
**Avoids:** P8 (partially), P9 (first half), P16 (fixed versus bank), P4 (endpoint auth done correctly).
**Parallel track:** start the read-only card spike (log `creditData`, bills and installments from the real Bradesco connection, no sensitive data in logs) here, so card scope is known by the time Phase 6 starts. Beware the history cap of about 4 calls per month per CPF per bank.

### Phase 3: Limits, "Pode gastar" and the Limits and Cards Central
**Rationale:** This is the Core Value and delivers it without PWA, push or LLM. If the project stopped here it would still meet its purpose.
**Delivers:**
- Category icon and limit in Settings (Gastos/Receitas split), `computeMonthBudget`, and the "Pode gastar" Home with pace and per-day remaining
- "O mês em uma conta" with a labelled projection, plus editable expected income
- Per-limit expandable rows and in-app 80%/100% alerts with deterministic IDs
- Settings hub: Contas e cartões, Categorias, Bancos conectados (with sync age and consent expiry), Aparência, Notificações
- The stale-data state
- The dedicated Central de Limites e Cartões (limits section complete, cards section stubbed) and a summary card on Home

Limits are per person, month windows use America/Sao_Paulo, and money is integer centavos.
**Uses:** `@date-fns/tz`, `core/budget`, `core/ledger`, `core/alerts`.
**Gate:** mockups for palette (2 or 3 proposals), mobile navigation (5 slots plus "Mais" is the hypothesis) and Central placement before building UI. Treat the mockups as a task at the start of this phase; palette and navigation tokens are consumed by every later UI phase.
**Avoids:** P8, P13 (in-app half), P16, P19 (safe-area, `dvh`).

### Phase 4: Mascot Vintém
**Rationale:** Needs the Phase 3 context (pace, percent used) to react to, but has no architectural dependency beyond that.
**Delivers:**
- Original SVG piggy-bank with six states (neutro, feliz, triste, bravo, sonolento, surpreso), a reducer state machine, the gauge arc, a speech bubble and a test page with controls
- `core/speech` phrase bank (about 30 pt-BR phrases per state and situation, with tone variants: gentle, direto, sem filtro) and a tone setting
- A reduced-motion path and a "Reduzir animações" switch
- Cursor follow on fine pointers only, and pause on `visibilitychange`

**Implements:** `core/speech`, `components/mascot`.
**Avoids:** P17, P20 (original art and original microcopy; audit copy against the reference prints).

### Phase 5: Coinki Identity, PWA and New Hosting Site
**Rationale:** Push needs a service worker and the final origin (FCM registrations are bound to the origin), so this precedes Phase 7. It also needs Phase 1 done, because a service worker makes every later data or rule change coexist with old clients.
**Delivers:**
- Rename, and the `coinki` Hosting site (reserve the ID early; have a fallback)
- `firebase.json` header rewrite: drop the `**/*.js` and `**/*.css` immutable rules, `no-cache` for `/sw.js`, manifest and HTML
- `sw.ts` via `injectManifest`, a manifest with final `id`, `start_url` and name set once, generated icons including maskable and `apple-touch-icon`, an update prompt and a kill-switch SW
- "Instale no celular" screen (Android install prompt, iOS Share instructions, standalone detection)
- Theme follows device with override and a `theme-color` meta
- 301 redirect or notice on the old site, Auth authorized domains and `ALLOWED_ORIGINS` updated
- Onboarding (3 screens), a clean login and `lang="pt-BR"`
- Trademark and store search for "Coinki"

**Uses:** `vite-plugin-pwa` 2, `@vite-pwa/assets-generator`, `firebase-tools`.
**Avoids:** P6, P7, P18, P19, P22.
**Research flag:** yes (see below).

### Phase 6: Credit Card
**Rationale:** Highest uncertainty and highest complexity, gated by the spike data. Needs the ledger predicates from Phases 2 and 3 and the reconcile path from Phase 2.
**Delivers (conditional on the spike):**
- `cards` and `bills` collections, with upsert-by-bill sync replacing insert-only for card items
- PENDING to POSTED reconciliation and dedupe by natural key (also covers webhook `deleted` plus `created` pairs)
- Installments (N/M) with a documented rule
- Card purchases counted against the limit by purchase date, and card-bill payment as a transfer linked to the bill
- Cash balance that excludes card purchases, plus a "what leaves on each bill" view
- The cards section of the Central: open bill, closes/due, available limit, upcoming bills, parcelas to come, and status paid / open / overdue
- Card due dates in Calendar and alerts
- Retroactive card-payment reclassification proposed through the review queue, and bills-aware "Sobra"

**Fallback:** if MeuPluggy does not return bills, compute bills from closing and due day plus transactions.
**Open product decision:** PROJECT.md says purchases count by purchase date. For installments, research recommends counting the month's installment against the limit and using the purchase date for the first installment and one-off purchases. Confirm with the owner before building.
**Avoids:** P9, P10.

### Phase 7: Push Notifications
**Rationale:** Delivery layer over alerts that already exist in-app. Depends on Phases 3 and 5 and on ID tokens from Phase 1.
**Delivers:**
- FID registration (`register()`/`onRegistered()` with the existing SW registration), `pushRegistrations`, and `push.js` with `sendEach` and pruning
- `alerts-engine` run after sync (poll or webhook) and after authenticated manual entries, plus a BRT scheduler for due-soon bills (including card due dates)
- "Notificações" screen with explicit states (unsupported / not installed / denied / active / lost subscription), per-type toggles and quiet hours
- One notification per event (notification messages only, no duplicate `showNotification`)

**Constraints:** iOS only for an installed Home Screen PWA on iOS 16.4+, permission requested on a tap, and a real-iPhone test is required. Lock-screen text carries no amounts or store names (generic, for example "Lazer perto do limite"); tone may follow the setting.
**Avoids:** P12, P13, P21.
**Research flag:** yes.

### Phase 8: Vintém with Free LLM
**Rationale:** The most replaceable feature; the mascot already works from phrases. Needs the mascot (4), ID tokens (1) and a deployed server route.
**Delivers:**
- `POST /api/vintem/comment` with Bearer ID token, a per-user daily cap, `express-rate-limit`, and a cache keyed by owner and quantized context hash
- A swappable provider layer behind one interface, with Cloudflare Workers AI, Groq and Grok (xAI) as candidates and the phrase bank as the last resort. It has timeouts, a daily budget counter and provider failover. Provider and model IDs are server config.
- `buildLlmContext()` with allowlist and sanitizer (category totals plus merchant names; strip CPF, account/card numbers and individuals' names, collapse Pix to people into a generic label)
- `zod` output validation with a length limit, plain-text rendering, tone levels in the system prompt, no prompt logging, and neutral behavior when data is stale

**Provider guidance:** default to Workers AI (no-training statement, published free quota). Treat Groq as secondary. Treat Grok as optional only after confirming that free credits exist and that accepting prompt training is acceptable (the owner has accepted it, but credits are unconfirmed). Never hard-code quota numbers.
**Avoids:** P11 (as relaxed by the owner), P14, P15.
**Research flag:** yes.

### Phase 9: Couple View ("Casal")
**Rationale:** Cheap once per-person limits and budgets are stable: `mergeBudgets(ele, ela)` plus a view. Reuse the existing Ele-versus-Ela dashboard as the base.
**Delivers:** A Casal tab with summed limits, summed spend, per-person split and Porquinho, with an explicit scope label on every number. Format confirmed with mockups.
**Note:** can be folded into Phase 3 or 4 if the roadmapper prefers fewer phases. Keep it out of the Phase 3 critical path.

### Phase 10: Multi-user (Friend with Separate Data)
**Rationale:** Touches every service, index and rule, so it comes last, after the seams from Phase 1 have made it a data operation.
**Delivers:**
- Invite-only account creation by the admin, and per-owner server sync with Pluggy `clientUserId` as `ownerId:person`. Webhook-to-owner resolution must also be per owner.
- A second named admin app for `financias-xrd`
- An idempotent migration with dry-run and collision report. It preserves IDs for `fixedExpensePayments.fixedExpenseId` and `goalContributions.goalId`, never overwrites `settings/main`, and uses a Firestore export first.
- Password reset instead of hash migration, and IndexedDB persistence cleared on sign-out

**Product decision first:** the friend uses manual entries only, or creates his own MeuPluggy account with his own credentials stored per owner. Do not reuse the owner's Pluggy credentials (the free plan covers the same holder only).
**Avoids:** P3 (invites), P5, P24.
**Research flag:** yes (medium).

### Phase Ordering Rationale

- Identity comes before data features: rules, push and LLM all need `request.auth`, and the current setup (open rules, public API key, local login) is the highest-severity item in the whole research.
- Ledger truth comes before numbers: review queue, fixed-linking and webhook-driven sync precede "Pode gastar", so the headline is right from week one.
- The Core Value comes early and independent: Phase 3 needs no PWA, push, LLM or card data.
- Origin comes before push: FCM registrations are bound to the origin, so rename and hosting (5) precede push (7).
- Cards come after the ledger predicates and behind a spike, with the spike started in Phase 2 as a read-only parallel task.
- LLM and friend-migration come last, being the most replaceable and the highest blast radius respectively.
- Mockups (palette, navigation, Central placement, Casal format) are a gate at the start of Phase 3, not a separate phase.

### Research Flags

Phases likely needing `/gsd-plan-phase --research-phase <N>`:
- **Phase 2 (webhooks part):** does MeuPluggy actually deliver webhooks to a registered URL, which event types, how the secret header is configured, and how retries and duplicates behave? Needs a real test.
- **Phase 5 (Identity/PWA):** `injectManifest` plus FCM in one SW, header precedence for overlapping Hosting rules (undocumented, verify by deploy), `coinki` ID availability, iOS standalone behavior.
- **Phase 6 (Card):** mandatory real-data spike on the Bradesco connection (is it Pattern A or B for `date`, are bills, installments and `creditData` returned at all), plus the installment rule.
- **Phase 7 (Push):** the FCM web API is in transition (FID flow), iOS subscription loss is documented only in forum reports, and a real-iPhone test is needed.
- **Phase 8 (LLM):** pick the provider and record its data and rate-limit terms on that date. Confirm Workers AI free-plan limits for the chosen model, Groq limits, and whether Grok free credits exist at all. Verify Portuguese quality and how each model handles a harsh or profane tone, and design the sanitizer for merchant names and Pix.
- **Phase 10 (Multi-user):** friend's banking decision, Auth migration method, custom claims versus uid.

Phases with standard patterns (skip research-phase, but apply the PITFALLS checklists):
- **Phase 1 (Foundation):** well-documented rules and migration patterns. The checklists are mandatory; a short phase research is enough.
- **Phase 2 (review part):** follows the existing code pattern; only the fixed-link matching rules need design.
- **Phase 3 (Limits/Home):** pure functions over existing data.
- **Phase 4 (Mascot):** CSS/SVG state machine, no external dependency.
- **Phase 9 (Casal):** a merge function and a view.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versions, peers and typings read from the npm registry on 2026-11-17 (HIGH). Free-tier quotas and the Cloudflare no-training statement come from vendor pages and summaries (MEDIUM). Grok/xAI free credits were not researched and are unconfirmed (LOW). FID-based FCM on iOS is not confirmed in a primary source. |
| Features | MEDIUM | Simplifi, Monarch, YNAB and Pluggy are official-doc based (HIGH). Organizze, Mobills, Copilot sharing and gamification-harm claims rest on third-party blogs (LOW-MEDIUM). Table-stakes calls are author judgment. |
| Architecture | MEDIUM-HIGH | Built from the real code (`src/`, `server/src/`, rules, `firebase.json`), so existing-state facts are HIGH. MeuPluggy card behavior, MeuPluggy webhook support and the FCM plus `injectManifest` integration are MEDIUM or lower until spiked. |
| Pitfalls | MEDIUM-HIGH | Rules, Hosting, Pluggy and WebKit points come from official sources. iOS silent subscription loss, third-party LLM policies and Railway pricing are MEDIUM-LOW. |

**Overall confidence:** MEDIUM-HIGH. The plan for everything except credit cards and webhooks is well grounded. Those two are where scope depends on behavior nobody has observed yet on MeuPluggy.

### Gaps to Address

- **MeuPluggy card payloads:** does the Bradesco connection return `creditData`, bills and installments, and with which date semantics? Run the spike (Phase 2 parallel track) and gate Phase 6 on it.
- **MeuPluggy webhooks:** support is unconfirmed. Test with a real item in Phase 2. If unsupported, keep polling only and note the data-freshness limit.
- **Railway plan and Node version:** the "free" constraint is unverified for Railway. Push, scheduled sync, webhooks and alerts all depend on that process staying up and reachable. Confirm cost status, set `engines` and a `.node-version`, and keep tasks idempotent with a single instance.
- **`ownerId` model:** uid of the shared login versus household claim. Decide in Phase 1; the seam keeps both options open.
- **Installments versus the limit:** purchase date for one-off purchases is decided. The rule for installments needs the owner's confirmation (recommended: the month's installment counts, and the total is shown as "a sair nas próximas faturas").
- **LLM provider, limits and tone behavior:** free-tier numbers change often and were inconsistent across sources. Do not hard-code them. Choose in Phase 8, and test harsh-tone prompts against the safety behavior of each candidate. Grok free credits and its training terms must be confirmed before it is considered.
- **iOS push with FCM FID:** test on a real installed iPhone before promising push on iOS.
- **Hosting:** `coinki` site ID availability (currently unclaimed, reserve early) and header precedence for overlapping rules.
- **Trademark:** "Coinki" has not been searched in stores and INPI (classes 36 and 42). Do it before baking the name into icons and manifest.
- **Couple view format and navigation:** open by design; resolve with mockups.
- **Alert thresholds and quiet hours:** defaults proposed (80% and 100%, per-category toggles, one per threshold per month). Confirm in Phase 3.

## Sources

### Primary (HIGH confidence)
- npm registry and package tarballs, read 2026-11-17 — versions, peers and typings for vite-plugin-pwa, workbox, firebase, firebase-admin, `@firebase/messaging`, pluggy-sdk, vitest, rules-unit-testing, `@date-fns/tz`, firebase-tools
- Project code — `src/types`, `src/services/*`, `src/hooks/*`, `src/contexts/*`, `server/src/{index,sync,classify}.js`, `firestore.rules`, `firebase.json`, `.firebaserc`
- Firebase docs — secure queries, Hosting full-config and multisites, FCM web (client and receive), Auth redirect best practices, pricing plans
- Pluggy docs v2 — credit card bills, installments, accounts, MeuPluggy personal use (5 connections, 24 h refresh, 1-year consent)
- WebKit — Web Push for Web Apps on iOS and iPadOS; Chrome "Fresher service workers"; vite-plugin-pwa guides
- Quicken Simplifi and Monarch official help/blog — spending plan and flex budgeting
- Cloudflare Workers AI pricing and OpenAI-compatibility pages; Google Gemini terms and pricing

### Secondary (MEDIUM confidence)
- Cloudflare data-usage statement (read through a search summary of the official page)
- Groq rate limits and data pages; OpenRouter free-model comparison (authored by a competitor)
- Pluggy changelog 2026.07 (forecast bill date, seen via summary)
- Vendor docs (MoEngage, OneSignal, MagicBell) on iOS web push requirements
- Copilot and YNAB help articles via summaries

### Tertiary (LOW confidence)
- Apple and WebKit forum threads on disappearing iOS push subscriptions
- Brazilian app comparisons (Canaltech, Tecnoblog, Serasa) for Mobills and Organizze behavior and pricing
- Gamification-harm articles (anecdotal)
- Railway plan details (not confirmed from an official page)
- Grok/xAI free credits and training terms (from PROJECT.md only; not researched)
- Pluggy webhook behavior on MeuPluggy items (not confirmed by any researcher)

Detailed per-source lists are in `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md` and `PITFALLS.md`.

---
*Research completed: 2026-11-17*
*Ready for roadmap: yes*
