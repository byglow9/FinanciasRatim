# Technology Stack (milestone additions)

**Project:** Coinc (ex-Financias Ratimbum), a Brazilian personal-finance PWA
**Researched:** 2026-11-17
**Scope:** Only what must be ADDED or CHANGED for the target features. React 19, Vite 7, Tailwind v4, Firebase/Firestore, Express 5 on Railway, Pluggy and date-fns 4 are already in place and not re-researched.
**Overall confidence:** MEDIUM-HIGH. Versions and typings are HIGH (read from the npm registry and package tarballs on 2026-11-17). Free-tier quotas are MEDIUM (vendor pages, and they change often).

Confidence key used below:
- **HIGH**: verified in the npm registry, package typings, or an official page read directly.
- **MEDIUM**: official doc read through a summarizer, or two independent sources agree.
- **LOW**: single secondary source or inference. Do not treat as authoritative.

---

## Headline decisions

1. **One service worker, built by `vite-plugin-pwa` in `injectManifest` mode, that also hosts the FCM background handler.** Do not ship a separate `firebase-messaging-sw.js` next to a Workbox SW.
2. **Use the new FID-based FCM web API (`register()` / `onRegistered()`), not `getToken()`.** Firebase marks `getToken()` obsolete and says the token APIs are slated for removal. This forces two upgrades: `firebase` to ^13.4.0 on the client and `firebase-admin` to ^14.5.1 on the server (Node >= 22).
3. **The mascot needs no animation library.** Inline React SVG, CSS transforms driven by CSS variables, a pure-TS state machine, and a `matchMedia` reduced-motion guard. Lottie and Rive are the wrong tools for a cursor-following, state-driven character.
4. **LLM: Cloudflare Workers AI is the primary provider, called with plain `fetch`, no SDK.** It has an official "not used for training" statement. Gemini's free tier is excluded by default because Google states free-tier content is used to improve its products (Brazil is not in the exempt regions). The rule-based phrase bank is the real reliability layer.
5. **Cloud Functions are not an option** (Blaze plan only). All push triggering runs in the existing always-on Express server.
6. **Multi-user needs server-side ID-token verification.** The current shared `x-api-key` is a static header; if the web client sends it, it is public in the bundle. Replace it with Firebase ID tokens verified by `firebase-admin`.

---

## Recommended Stack

### Feature 1: Installable PWA + service worker

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| vite-plugin-pwa | ^2.0.0 | Manifest, SW build, update flow | Released 2026-10-03. Peer range includes Vite `^7` and `^8`, Node >= 20.19. `injectManifest` lets us write one `src/sw.ts` containing Workbox precache and the FCM handler. | HIGH (registry); MEDIUM (v2 has no documented breaking changes beyond the README note, so skim the v2 README before upgrading) |
| workbox-window | ^7.4.1 | SW registration and update events in the page | Required peer of vite-plugin-pwa 2.0.0. | HIGH |
| workbox-build | ^7.4.1 | Required peer of the plugin (manifest injection) | Required peer. | HIGH |
| workbox-precaching | ^7.4.1 (dev) | `precacheAndRoute`, `cleanupOutdatedCaches` inside `src/sw.ts` | Official guide: call `cleanupOutdatedCaches()` before `precacheAndRoute(self.__WB_MANIFEST)`. | HIGH |
| @vite-pwa/assets-generator | ^2.0.0 (dev) | Generate 192/512/maskable/apple-touch icons from one SVG | Plugin 2.0.0 allows the generator's `^2.0.0`. Node >= 20.19. Use the Coinc piggy SVG as the single source. | HIGH |

Configuration choices:
- `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'prompt'`. The registration uses `prompt` without any UI; when to activate the new version is decided in `shared/core/pwaUpdate.js` (D-14: update on open, no toast, never in the middle of an entry).
- Add `"WebWorker"` to `tsconfig` `lib` (or a separate `tsconfig.sw.json`) and `declare let self: ServiceWorkerGlobalScope` in the SW.
- Manifest: `id`, `lang: 'pt-BR'`, `display: 'standalone'`, `start_url: '/'`, a 512 maskable icon, `theme_color` and `background_color` from the chosen palette. The "Instale no celular" screen is hand-written: capture `beforeinstallprompt` on Android/desktop Chrome, and show Share > "Add to Home Screen" instructions on iOS. No library is needed.
- Cache strategy: precache the app shell only. Do NOT runtime-cache Firestore or `/api` calls in the SW; money data must not be stale-by-default.

### Feature 1b: Web Push via Firebase Cloud Messaging

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| firebase (client) | ^13.4.0 (currently ^12.10.0) | `firebase/messaging` + `firebase/messaging/sw` | `register()`/`onRegistered()` (FID flow) are in `@firebase/messaging` 0.13.3, shipped in firebase 12.19+ and 13.x. The installed 12.10.0 is too old. v13.0.0's only listed breaking changes are in the AI Logic product, which this app does not use. | HIGH (typings read), MEDIUM (12.10 lacking `register` inferred from version lineage) |
| firebase-admin (server) | ^14.5.1 (currently ^13.0.0, 13.10.0 installed) | Verify ID tokens, send FCM, Firestore writes | 14.5.1 typings include `fid` / `fids` message targets; 13.10.0 has no `fid` at all. Requires Node >= 22. Docs say `token` still accepts a FID during the migration window, so 13.x works short-term, but `token` is slated for removal. | HIGH |

Wiring (all verified against the typings):
- In `src/sw.ts`: `import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'`. The modular SW must be bundled, and injectManifest does that.
- In the page: after the user taps "Ativar avisos", call `Notification.requestPermission()`, then `register(messaging, { vapidKey, serviceWorkerRegistration })`. `RegisterOptions` accepts `serviceWorkerRegistration`, so pass the registration vite-plugin-pwa already created and you avoid FCM's default `firebase-messaging-sw.js` second worker.
- `onRegistered(messaging, fid => POST /api/push/register)` with the user's ID token. Store `pushRegistrations/{fid} = { ownerId, userAgent, updatedAt }`. Never mix FID APIs and legacy `getToken` for the same instance.
- Server sends with `getMessaging().sendEach(...)` using `fid`. Delete a registration on `UNREGISTERED`/404, and prune records not refreshed in ~30 days (Firebase guidance).
- Send **notification** messages (browser-displayed), not silent data-only ones: iOS Safari requires every push to show a visible notification, and repeated silent pushes can get a subscription revoked (MEDIUM; Apple behaviour, not re-verified in this session).
- iOS: push works only for a Home-Screen-installed PWA, iOS 16.4+, user gesture to grant, and the iOS Simulator cannot test it (real device required). Chrome/Firefox on iOS cannot subscribe. Gate the UI with `isSupported()` and the `display-mode: standalone` check. (MEDIUM, multiple consistent sources; FCM-specific iOS behaviour not separately confirmed, test on a real iPhone.)
- Trigger model without Cloud Functions: (a) the client calls `POST /api/limits/check` after saving a manual expense, (b) the existing sync loop calls the same function after importing bank items. The server recomputes category totals, compares with thresholds (80% / 100%), de-duplicates with a `notifiedAt` marker per category per month, then sends. No cron library is needed; the server already runs an interval-based sync.

### Feature 2: Animated SVG mascot (Vintém)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Inline React SVG + CSS | n/a | Character art and animation | Parts (eyes, pupils, ears, tail, coin slot) are separate `<g>` nodes. Animation is CSS `transform`/`opacity` plus CSS variables (`--look-x`, `--look-y`, `--lean`). Reduced motion is handled in CSS and in one hook. Zero runtime weight. | HIGH (approach), MEDIUM (effort estimate) |
| Typed reducer state machine | n/a | States: neutro, feliz, triste, bravo, sonolento, surpreso | Six states and a handful of transitions fit a `Record<State, Partial<Record<Event, State>>>` table plus `useReducer`. Pure TS, unit-testable without a DOM. | HIGH |
| motion (optional) | ^14.14.0 | Speech-bubble enter/exit, number tween, gauge arc | **Defer by default.** CSS transitions handle the gauge arc (`stroke-dashoffset`). Add only if you need `AnimatePresence` exit animations. Import `m` + `LazyMotion` (~5 kB initial, +24 kB for `domAnimation`) or `useAnimate` (~3.3 kB), never the full `motion` component (~43 kB). Set `MotionConfig reducedMotion="user"`. | HIGH (sizes from motion docs), MEDIUM (defer call is a judgment) |

Implementation rules:
- Cursor follow: ONE passive `pointermove` listener on `window`, throttled with `requestAnimationFrame`, writing CSS variables on the SVG root. No React state per move, so no re-renders. Clamp pupil travel to a few px. On touch devices, drop cursor-follow and use idle blink and gaze drift instead.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables lateral sway, blinking loop, and cursor follow in CSS; a `useReducedMotion()` hook (`matchMedia`, subscribed to changes) skips the JS follower. Expressions still change (static pose swaps), so the mascot stays informative.
- Prefer CSS over SMIL: SMIL cannot be driven by state or by the reduced-motion media query, and it is awkward to pause. The "girar de lado" (turn sideways) effect is a CSS `scaleX` / 3D-flip on a group.
- Test page with controls (state buttons, follow toggle, reduced-motion simulate) is plain React; no Storybook needed.

### Feature 3: Free LLM comments (server-side, aggregates only)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Cloudflare Workers AI (REST, OpenAI-compatible) | n/a | Primary generator | Free: 10,000 Neurons/day on the Free plan, reset 00:00 UTC. Endpoint `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1/chat/completions`, `Authorization: Bearer <token>`, token scoped to "Workers AI - Read/Edit". Cloudflare's data-usage page states Customer Content is not used to train models and is not retained after standard inference. Llama 3.3 official language list includes Portuguese. | MEDIUM-HIGH (limits and endpoint from official pages; the no-training statement was read through a search summary of the official page, re-read it before launch) |
| Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | n/a | pt-BR short comments | $0.293 / M input tokens, $2.253 / M output tokens, 24k context. At roughly 500 input and 100 output tokens per call, 10k Neurons/day (about $0.11 of paid-equivalent usage) is on the order of 250-300 calls/day (LOW: my arithmetic from list prices, 1,000 Neurons = $0.011). With caching, one household needs far fewer. | MEDIUM |
| Groq (fallback 1), plain `fetch` to `https://api.groq.com/openai/v1/chat/completions` | n/a | Secondary provider | Free-plan table lists `openai/gpt-oss-20b` and `openai/gpt-oss-120b` at 30 RPM / 1,000 RPD / 8K TPM. Groq docs: no retention of inference data by default (logs only for errors/abuse, up to 30 days); the training question is not answered on that page. | MEDIUM (limits shown on one page that did not list llama-3.3-70b; pick the model at implementation time) |
| Rule-based phrase bank (shipped in the client bundle) | n/a | Final fallback, offline, instant | Mandatory. Roughly 30 pt-BR phrases per (state x situation), with template slots (`{categoria}`, `{pct}`, `{dias}`). The AI is garnish; the core value ("quanto posso gastar") must not depend on any network call. | HIGH |
| zod | ^4.6.7 (server; client already ^4.3.6) | Validate and clamp LLM output | Max ~140 chars, strip newlines/markdown, reject empty or off-language output, then fall back. | HIGH |
| express-rate-limit | ^8.7.4 | Per-user and global throttle on `/api/vintem/*` | Protects the daily Neuron budget. Express >= 4.11 peer, Node >= 16. | HIGH |

Design rules:
- **Payload = aggregates only**: category label, % of limit used, days left in month, trend bucket, mood. No merchant names, no raw descriptions, no user names, no account or card identifiers. Consider rounding percentages to 5-point buckets; this also makes caching effective.
- **Cache**: Firestore doc (survives Railway restarts) keyed by `ownerId + month + situationHash`, with a TTL of ~24h; keep an in-process `Map` in front of it. Do not add `lru-cache`.
- **Budget guard**: server-side daily counter per provider. On HTTP 429/4xx/5xx, timeout (`AbortSignal.timeout(4000)`), or validation failure, fall to the next provider, then to the phrase bank. Never block a response on the LLM.
- **Call sites**: generate on events (limit crossed, new day, sync finished), not on every page view.
- Plain `fetch` (Node 22 global) with a ~40-line provider adapter. The `openai` SDK (7.57.0) is a candidate only if you later want streaming; today it adds peer-dependency surface for a single POST.
- **Model churn is real**: Gemini 2.0 Flash-Lite was shut down 2026-06-01 and `gemini-2.5-flash` routes elsewhere from 2026-12-01 per Google's pricing page. Keep provider and model IDs in server config, not hard-coded.

### Feature 4: Credit card via Pluggy

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pluggy-sdk (server) | ^0.94.3 (installed 0.93.0) | `creditData`, bills, installment fields | Typings in 0.94.3 confirm: `Account.creditData` (with `availableCreditLimit`), `client.fetchCreditCardBills(accountId, pageFilters)`, `fetchCreditCardBill(id)`, transaction `installmentNumber`, `billId`, and `billForecastDate` (YYYY-MM, also set on pending and future transactions, Open Finance connectors only). **From 0.93.1 the package requires Node ^22.23.4 or >=24.22.1.** | HIGH |
| pluggy-connect-sdk (client) | 2.15.0 (current, no change) | Connect widget | Already latest. | HIGH |

Facts the credit-card phase must plan around (from Pluggy docs):
- `creditData` fields: `creditLimit`, `availableCreditLimit`, `balanceDueDate`, `minimumPayment`, `brand`, `level`, `status`, `holderType`, `disaggregatedCreditLimits`. Many can be `null`. `balanceCloseDate` is always `null` on Open Finance connectors. `balanceDueDate` and `minimumPayment` usually appear only while a bill is open. On CREDIT accounts, `balance` is the unpaid open bill.
- Bills: `dueDate`, `totalAmount`, `minimumPaymentAmount`, `allowsInstallments`, `financeCharges[]`, `payments[]`. `financeCharges` is informational and can double count; do NOT turn it into transactions (interest, fees and IOF may already be card transactions).
- Installments: Open Finance gives no installment-group ID and no `totalAmount`. Group by heuristics (merchant, `totalInstallments`, first `date`, `installmentNumber`). Banks differ: some post all installments up front, others month by month, and `date` can be the purchase date or the bill posting date. A future-dated card transaction is not necessarily a bug.
- Transactions can be deleted and recreated with new IDs (1-3 days later). Reconcile on `providerId` when present, otherwise `date`+`amount`+`description`; keep the import idempotent.
- Historical fetch is capped (about 4 calls/month per CPF per bank); do not loop re-fetches in dev.
- **Unconfirmed (LOW):** whether MeuPluggy actually returns bills, installments and `creditData` for this user's card. The MeuPluggy page lists limits (free, personal use, up to 5 connections, refresh every 24h, authorization lasts 1 year) but is silent on credit cards. The planned "real test first" spike is the correct gate; build nothing downstream until it returns real payloads.
- Make Pluggy webhooks an optional enhancement only; whether MeuPluggy items support them is not confirmed.

### Feature 5: Category limits and "safe to spend"

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Plain TypeScript module in `src/lib/` | n/a | Pure functions: `monthWindow`, `spentByCategory`, `safeToSpend`, `pace` | No library. Keep it free of React and Firebase so it runs identically on client and server and can be unit tested. | HIGH |
| Integer centavos | n/a | Money arithmetic | Convert at the boundary; sum as integers; format with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Skip `decimal.js` / `dinero.js`: addition, subtraction, and percentages of two-decimal BRL do not need them. | HIGH |
| @date-fns/tz | ^1.5.0 | Month and day boundaries in `America/Sao_Paulo` | Railway runs in UTC. Without an explicit zone, "today" and "month start" are wrong for about 3 hours every night, which shifts limit totals and threshold pushes. Works with date-fns ^4 (`in:` option). | HIGH (version), MEDIUM (usage pattern) |
| vitest | ^5.1.0 (dev) | Unit tests for limits math, state machine, FID/ownerId logic | Peer range lists Vite `^6.4 || ^7 || ^8`. Node `^22.12 || ^24 || >=26` (local Node 22.17.1 is fine). The server keeps using `node --test`. | HIGH |

Business-rule notes (from PROJECT.md decisions): fixed bills are excluded from the day-to-day limit; card purchases count against the limit by purchase date (not bill due date); show "what leaves in each bill" separately. Encode these as explicit, tested functions, because this feature is the stated Core Value.

### Feature 6: New Hosting site `coinc-financias.web.app` (same Firebase project)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| firebase-tools | ^15.36.0 (dev or global) | `hosting:sites:create`, deploy targets, emulators | Node >= 20. Run `firebase hosting:sites:create coinc`, `firebase target:apply hosting coinc coinc`, then deploy with `--only hosting:coinc`. | HIGH |

Notes:
- Multi-site is supported on Spark, max 36 sites per project. Site ID must be <= 30 chars and globally unique (availability of `coinc` is unchecked; if it is taken, stop and ask the owner, D-03, no automatic fallback ID).
- Hosting quota (10 GB storage, 360 MB/day transfer) is shared across all sites in the project.
- `firebase.json` `hosting` becomes an array of `{ target, public, ... }` entries, or keep the single object and just retarget; either way, keep the old site live until installed users have moved. A different origin means separate localStorage, IndexedDB, and Firebase Auth session, so existing logged-in users must sign in again on the new URL.
- **Cache-header bug waiting to happen:** the current `firebase.json` marks `**/*.js` and `**/*.css` as `public, max-age=31536000, immutable`. That would also pin `/sw.js`, so SW updates would never reach users. Firebase documents that "matching rules are applied in the order they are defined" but does not document key-conflict resolution (MEDIUM/LOW). Fix: delete the `**/*.js` and `**/*.css` rules (hashed files already live under `/assets/**`, which keeps `immutable`), add explicit `no-cache` for `/sw.js` and `/manifest.webmanifest`, then verify with `curl -I` after deploy.
- Add the new domain to: Firebase Auth authorized domains, and the server's `CORS` origin list (env var).

### Feature 7: Multi-user (`ownerId`) and security rules

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Firebase Auth (already in use) | via firebase ^13 | Identity for rules and server | Email/password is free on Spark (50K MAU). The app already has `signInWithEmailAndPassword`; make it the only auth path and retire the env-var local login. | HIGH |
| Firestore Security Rules | n/a | Tenant isolation | `allow read, delete: if request.auth.uid == resource.data.ownerId`; `allow create: if request.auth.uid == request.resource.data.ownerId`; `allow update: if request.auth.uid == resource.data.ownerId && request.resource.data.ownerId == resource.data.ownerId` (owner cannot be changed). Default-deny everything else. | HIGH (pattern) |
| @firebase/rules-unit-testing | ^6.0.0 (dev) | Test rules against the emulator | Peer is `firebase ^13`, which is another reason to upgrade the client to 13.x. (5.0.x targets firebase ^12 if you must stay.) Needs `firebase-tools` and **JDK 11+** for the Firestore emulator. | HIGH (peers), MEDIUM (JDK stated in install doc) |
| firebase-admin `getAuth().verifyIdToken` | ^14.5.1 | Server-side auth | Replace the shared `x-api-key` gate on `/api` with `Authorization: Bearer <ID token>`; derive `ownerId` from the verified token, never from the request body. Keep a server-only key for any non-browser caller. | HIGH |
| firebase-admin `BulkWriter` | ^14.5.1 | One-off backfill and migration | Write `ownerId` onto every existing doc; for the friend's separate project (`financias-xrd`), initialise a second named admin app with its own credentials and copy under the new owner. | HIGH |

Notes:
- The Admin SDK bypasses rules. Every server query and write must set or filter `ownerId` explicitly; rules do not protect the server.
- Add composite indexes for `ownerId` plus date/category queries in `firestore.indexes.json`, and deploy them before the UI ships. `where('ownerId','==',uid)` combined with range/order fields fails without them.
- Spark quotas: 50K reads, 20K writes, 20K deletes per day. A one-time backfill of historical docs may need to be chunked over several days; real-time listeners multiply reads per user, so prefer one-shot reads for lists and `persistentLocalCache` with `persistentMultipleTabManager()` on the client to cut repeat reads and give the PWA offline reads (MEDIUM).
- Do not use custom claims for tenancy, and do not restructure into `users/{uid}/...` subcollections now; the decision in PROJECT.md is the `ownerId` field and it is the smaller migration.
- Skip `@firebase/eslint-plugin-security-rules` (0.0.2, immature).

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| SW strategy | `injectManifest` with one `sw.ts` | `generateSW` + separate `firebase-messaging-sw.js` | Two workers compete for scope; FCM would register its own default worker. One file keeps update logic and push logic together. |
| Push transport | FCM via Firebase (FID flow) | Raw Web Push with `web-push` 4.0.0 + own VAPID and own subscription store | Viable and vendor-free, but you already use Firebase, FCM is free, and it hides push-service differences. Pick `web-push` only if FCM FID proves flaky on iOS. |
| Push transport | FCM | OneSignal / Pusher / etc. | Third party holding user identifiers for no benefit. |
| FCM client API | `register()` / `onRegistered()` | `getToken()` | Marked obsolete; token APIs slated for removal. |
| Push trigger | Express server | Cloud Functions / Firestore triggers | Requires Blaze plan (every Functions row is "not applicable" on Spark). |
| Mascot | Inline SVG + CSS + reducer | Lottie (`@lottiefiles/dotlottie-react` 0.22.2) | Pre-rendered timeline; cannot track the cursor per part or react to six states without authored clips; needs an external design tool, and an original asset pipeline we do not have. |
| Mascot | Inline SVG + CSS + reducer | Rive (`@rive-app/react-canvas` 4.39.0) | Excellent state machines, but requires authoring `.riv` in the Rive editor and ships a WASM runtime. Overkill for one character. |
| Mascot | Pure TS reducer | XState (5.33.4) | Powerful but heavy for six states; adds concepts the team does not need. |
| Mascot motion | CSS (optionally `motion` `m`/`LazyMotion`) | Full `motion` component (~43 kB), GSAP | Bundle cost on a mobile-first PWA for effects CSS covers. |
| LLM primary | Cloudflare Workers AI | Gemini free tier | Google: free-tier prompts and responses are used to improve products, with human review possible; only EEA/CH/UK are exempt. Brazil is not. Free limits are also not published per model on the docs page. Acceptable only for aggregates and by explicit user choice. |
| LLM primary | Cloudflare Workers AI | OpenRouter `:free` models | 50 requests/day (1,000 only after buying $10 credit), 20 RPM, and requests route to varying upstream providers with their own retention. |
| LLM client | Plain `fetch` adapter | `openai` SDK, Vercel AI SDK, LangChain | One POST to an OpenAI-compatible endpoint; SDKs add dependency and upgrade surface. |
| Time zone | `@date-fns/tz` | `date-fns-tz`, Luxon, Temporal polyfill | `@date-fns/tz` is the first-party companion to date-fns 4, already in use. |
| Money | Integer centavos + `Intl` | decimal.js, dinero.js | No division or compounding in the feature set. |
| Rules tests | `@firebase/rules-unit-testing` 6 | Manual console checks | Rules are the tenant boundary; regressions leak another user's finances. |

## What NOT to Use

| Do not use | Reason |
|------------|--------|
| A second service worker file (`firebase-messaging-sw.js`) alongside Workbox | Scope conflict; pass `serviceWorkerRegistration` to `register()` instead. |
| `getToken()`, `deleteToken()`, legacy registration tokens | Obsolete; do not mix with FID APIs on the same instance. |
| Cloud Functions, scheduled functions, Firestore triggers | Blaze plan only; breaks the zero-cost constraint. |
| Gemini free tier for anything tied to a user's finances | Free-tier data is used for product improvement (confirmed on Google's pricing and terms pages), and no region exemption applies to Brazil. |
| Any LLM call with merchant names, descriptions, account IDs, or user names | Violates the PROJECT.md privacy constraint; send aggregated numbers only. |
| LLM output rendered unvalidated, or any user-visible feature that blocks on the LLM | Latency and quota failures are normal on free tiers; always fall back to phrases. |
| The shared `x-api-key` as the user auth for browser calls | It is embedded in client code if sent from the web app. Use ID tokens. |
| `**/*.js` immutable cache rule in `firebase.json` | Pins `sw.js` for a year. |
| Runtime SW caching of Firestore or `/api` responses | Stale balances undermine "quanto posso gastar". |
| SMIL for mascot state animation | Cannot honour `prefers-reduced-motion` or React state cleanly. |
| Lottie / Rive for the mascot | Wrong shape for a cursor-following, six-state, original character (see Alternatives). |
| Upgrading to Vite 8 / `@vitejs/plugin-react` 6 in this milestone | Latest `@vitejs/plugin-react` 6.3.0 peers `vite ^8`; stay on Vite 7.3.x with plugin-react 5.2.x. vite-plugin-pwa 2.0.0 supports both, so the upgrade can be a separate later chore. |
| Replicating the reference app's mascot, copy, or layout | Out of scope per PROJECT.md. |

## Installation

```bash
# Frontend: runtime
npm install firebase@^13.4.0 vite-plugin-pwa@^2.0.0 workbox-window@^7.4.1 workbox-build@^7.4.1 @date-fns/tz@^1.5.0

# Frontend: dev
npm install -D workbox-precaching@^7.4.1 @vite-pwa/assets-generator@^2.0.0 \
  vitest@^5.1.0 @firebase/rules-unit-testing@^6.0.0 firebase-tools@^15.36.0

# Optional (only if exit animations are needed)
# npm install motion@^14.14.0

# Server (server/package.json: raise "engines.node" to ">=22.23.4")
cd server
npm install firebase-admin@^14.5.1 pluggy-sdk@^0.94.3 zod@^4.6.7 express-rate-limit@^8.7.4 @date-fns/tz@^1.5.0 date-fns@^4.1.0
```

Runtime notes:
- Local Node is 22.17.1, which satisfies firebase-admin 14 (>=22) and vitest 5, but NOT pluggy-sdk 0.94.3 (needs ^22.23.4 or >=24.22.1). Upgrade local Node, and pin Railway to the same major through `engines` and a `.node-version` file (Railway's default Node version was not verified).
- Emulator-based rules tests need a JDK (11+).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| vite-plugin-pwa 2.0.0 | vite ^3.1 to ^8, workbox-build/window ^7.4.1, Node >=20.19 | Peer deps must be installed explicitly. |
| @firebase/rules-unit-testing 6.0.0 | firebase ^13 | 5.0.x pairs with firebase ^12. |
| firebase 13.4.0 | `register()` / `onRegistered()` via @firebase/messaging 0.13.3 | Also present in 12.19; 12.10.0 predates it. |
| firebase-admin 14.5.1 | Node >=22, `fid`/`fids` messaging | 13.10.0 (Node >=18) has no `fid`. |
| pluggy-sdk 0.94.3 | Node ^22.23.4 or >=24.22.1 | 0.93.0 allows Node >=12 but is missing later hardening. |
| vitest 5.1.0 | vite ^6.4 / ^7 / ^8, Node ^22.12 / ^24 / >=26 | vitest 4.1.12 is the safe fallback for Node 20. |

## Sources

- npm registry and package tarballs, read 2026-11-17 (HIGH): versions, peers and engines for vite-plugin-pwa, workbox-*, firebase, firebase-admin, @firebase/messaging (typings for `register`, `onRegistered`, `RegisterOptions.serviceWorkerRegistration`, `onBackgroundMessage`), pluggy-sdk (typings for `creditData`, `fetchCreditCardBills`, `billForecastDate`), vitest, @firebase/rules-unit-testing, @date-fns/tz, motion, firebase-tools.
- Firebase: FCM web get-started and receive-messages pages; FCM JS reference (`register`/`onRegistered`, obsolete `getToken`); Admin SDK send docs (`fid` recommended, `token` deprecated); registration management best practices; Hosting multisite and full-config pages; pricing page (Spark quotas; Functions not available on Spark); JS SDK release notes (13.0.0 to 13.3.0). https://firebase.google.com/docs/cloud-messaging/web/get-started , https://firebase.google.com/docs/hosting/multisites
- vite-plugin-pwa docs: https://vite-pwa-org.netlify.app/guide/inject-manifest ; GitHub releases for 2.0.0 (MEDIUM: release notes list no breaking changes beyond a README note).
- Pluggy docs v2: credit-card bills, installments, statement cycle, accounts (`creditData`), MeuPluggy personal use. https://v2.docs.pluggy.ai/docs/products/credit-card-bills
- Cloudflare Workers AI: pricing (10,000 Neurons/day, 00:00 UTC reset), OpenAI-compatibility endpoint, REST API, model page for Llama 3.3 70B fp8 fast, data-usage page (via search summary). https://developers.cloudflare.com/workers-ai/platform/pricing/
- Google Gemini: pricing page and terms (free-tier content used to improve products; EEA/CH/UK exception) at aistudio.google.com/docs. Per-model free limits not published on the docs page (secondary sites conflict, LOW).
- Groq: console.groq.com rate-limits and your-data pages. OpenRouter free-model limits: OpenRouter's own comparison blog (June 2026, updated September 2026) plus secondary sources (MEDIUM; the blog is authored by a competing provider).
- Motion bundle sizes: https://motion.dev/docs/react-reduce-bundle-size
- iOS web push requirements: multiple secondary guides (MEDIUM); FCM-on-iOS specifics were not confirmed in a primary source.

## Gaps to resolve during phase research

- Does MeuPluggy return `creditData`, bills and installments for the user's card? (Gate for the whole credit-card phase.)
- Re-read Cloudflare's data-usage page directly before shipping, and confirm current free-plan rate limits for the chosen model on the Workers AI limits page (not stated for the free plan).
- Real-iPhone test of FID registration plus a notification-message push on an installed PWA.
- Firebase Hosting header precedence for overlapping rules (undocumented); verify by deploy.
- Whether `coinc` is available as a Hosting site ID (if taken, stop and ask the owner, D-03). Store and INPI research was dropped (D-02).
- Confirm Railway's Node default and set the engine pin; confirm Railway cost status (the PROJECT constraint says "free"; the Railway plan was not researched here).
