---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 09
subsystem: pwa
tags: [pwa, service-worker, workbox, manifest, vite-plugin-pwa, injectManifest, cdp]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-01 pacotes do PWA instalados; 05-02 politica shared/core/pwaUpdate.js; 05-06 head com tema; 05-07 icones em public/; 05-08 cabecalhos do Hosting"
provides:
  - "vite.config.ts com VitePWA em injectManifest (prompt, sem registro injetado, limite de pre-cache 3 MiB, manifest do UI-SPEC)"
  - "src/sw.ts: pre-cache da casca, uma NavigationRoute com denylist /api/ e /__/, ativacao so por SKIP_WAITING"
  - "tsconfig.sw.json (WebWorker) referenciado em tsconfig.json; src/sw.ts fora do tsconfig.app.json"
  - "src/lib/pwa/installPrompt.ts (captureInstallPrompt, subscribeInstall, getCanPrompt, promptInstall) e src/hooks/usePwaInstall.ts"
  - "index.html com favicon, apple-touch-icon e as quatro metas de app"
  - "test/static/phase5-sw.test.js, phase5-manifest.test.js e scripts/ux-audit/pwa.mjs (porta 5192)"
affects: [05-10 registro do worker e captureInstallPrompt em main.tsx, 05-11 a 05-14 onboarding e passos de instalacao, 05-18 deploy, 05-20 UAT em aparelho]

actuals:
  tokens: 6600
  tasks: 3
  commits: 3
plan_head_before: db7c4a0e976261369b9192b8838a4865e85e2d42

tech-stack:
  added: []
  patterns:
    - "Worker unico com so pre-cache; dados sempre da rede e prova por guarda estatica mais inspecao dos caches no Chrome"
    - "Estado externo sem React (installPrompt.ts) consumido por useSyncExternalStore, no molde de useReducedMotion"

key-files:
  created:
    - src/sw.ts
    - tsconfig.sw.json
    - src/lib/pwa/installPrompt.ts
    - src/hooks/usePwaInstall.ts
    - test/static/phase5-sw.test.js
    - test/static/phase5-manifest.test.js
    - scripts/ux-audit/pwa.mjs
  modified:
    - vite.config.ts
    - tsconfig.json
    - tsconfig.app.json
    - index.html

key-decisions:
  - "O plugin ja injeta o link rel=manifest no build; o link escrito a mao foi removido para nao duplicar (a guarda exige exatamente um)"
  - "O auditor registra /sw.js na propria pagina porque o registro pelo app e do plano 05-10 (injectRegister false); no primeiro registro nao ha worker ativo, entao o worker ativa sem esperar e o clientsClaim o poe no controle"
  - "navigator.serviceWorker.ready resolve com o worker em activating; o auditor aceita activating ou activated e prova o controle depois do recarregamento"

patterns-established:
  - "dist/sw.js sai em formato es mas empacotado (sem import/export), entao registra como worker classico, sem type module"

requirements-completed: []

duration: ~3 min
completed: 2026-11-23
---

# Phase 5 Plan 09: Tracer do PWA Summary

**VitePWA em `injectManifest` com `src/sw.ts` que so faz pre-cache da casca e cai a navegacao SPA no `index.html`, manifest Coinc com tres icones separados, captura do evento de instalacao em modulo sem React e prova no Chrome (registro, controle, casca offline, nenhum cache de dados).**

## Accomplishments

- **Tracer (Task 1):** `npm run build` gera `dist/sw.js` (23 entradas, 2.073 KiB de pre-cache) e `dist/manifest.webmanifest` com nome e nome curto Coinc, `pt-BR`, `standalone`, `portrait`, cores `#f5ecdb` e os icones 192 `any`, 512 `any` e 512 `maskable` em entradas separadas. O limite de pre-cache ficou em 3 MiB (o bundle principal tem 1,82 MB). `src/sw.ts` tem uma unica rota (`NavigationRoute` com `denylist` de `/__/` e `/api/`), `clientsClaim()` e um ouvinte de `message` que so chama `skipWaiting` com `SKIP_WAITING`; nenhum ouvinte de `fetch`, nenhum cache aberto a mao. `tsc -b` passa com o worker em `tsconfig.sw.json` e fora do projeto do app.
- **Task 2:** `installPrompt.ts` guarda `beforeinstallprompt` no modulo (idempotente, `preventDefault`, descarte depois do uso, `appinstalled` limpa) e `usePwaInstall()` devolve `{ canPrompt, prompt, isStandalone, platform }` por `useSyncExternalStore` (iPhone, iPad e iPadOS como Mac com toque contam como `iphone`). `index.html` ganhou favicon SVG e ICO, `apple-touch-icon` e as metas `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `-title` e `-status-bar-style`; `/piggy.svg` deixou de ser referenciado. As guardas `phase5-sw` (6 testes) e `phase5-manifest` (5 testes, rodam de verdade depois do build) passam.
- **Task 3:** `scripts/ux-audit/pwa.mjs` sobe `vite preview` em 127.0.0.1:5192 e confere no Chrome: worker registra e fica pronto, controla a pagina depois de recarregar, manifest 200 como `application/manifest+json`, `sw.js` 200, tres icones 200 como PNG, cache `workbox-precache-v2` com o `index.html`, nenhuma entrada de outra origem, de Firestore ou de `/api/`, so caches do pre-cache, casca aberta com a rede desligada (titulo Coinc, `workerStart` maior que zero) e nenhuma excecao nem `console.error` fora de ruido de rede. Saida: `FALHAS 0`, saida 0, sem processo orfao.

Verificacao final: `npm run build`, `npm run lint`, `npm run test:static` (509 testes, 507 passam, 0 falham, 2 ignorados) e `node scripts/ux-audit/pwa.mjs` (`FALHAS 0`).

## Commits

- `d78eddbc`: feat(05-09): service worker de pre-cache da casca e manifest do PWA
- `6653a829`: feat(05-09): captura da instalacao, estado standalone, head do HTML e guardas do PWA
- `aa372288`: test(05-09): executor CDP do PWA de producao

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Link do manifest duplicado no HTML**
- **Found during:** Task 2
- **Issue:** o plano mandava acrescentar `<link rel="manifest">` se o plugin nao injetasse; o plugin injeta, e o build saiu com dois links.
- **Fix:** link escrito a mao removido; a guarda de `dist/index.html` exige exatamente um.
- **Files modified:** index.html, test/static/phase5-manifest.test.js
- **Commit:** 6653a829

**2. [Rule 1 - Bug] Verificacao do auditor estrita demais**
- **Found during:** Task 3 (primeira execucao: FALHAS 1)
- **Issue:** `navigator.serviceWorker.ready` resolve quando o worker esta em `activating`, nao `activated`.
- **Fix:** o auditor aceita `activating` ou `activated`; o controle da pagina e provado depois do recarregamento.
- **Files modified:** scripts/ux-audit/pwa.mjs
- **Commit:** aa372288

**3. [Informativo] Registro feito pelo auditor**
- O app ainda nao registra o worker (`injectRegister: false`; registro e do plano 05-10), entao o auditor registra `/sw.js` na propria pagina. Nao ha desvio de contrato, mas a prova de que o app registra o worker fica para o 05-10.

**Total deviations:** 2 correcoes (Rule 1) e 1 informativa; sem impacto no contrato.

## Authentication Gates

Nenhum. Nenhum `firebase deploy`, login ou mudanca no Railway.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-05-09-01 (guarda proibe `fetch`, `caches.*` e estrategias de execucao; o auditor confere que nenhuma entrada de cache e de outra origem), T-05-09-02 (sem ativacao automatica, `cleanupOutdatedCaches`), T-05-09-04 (denylist conferida pela guarda) mitigadas; T-05-09-03 e T-05-SC sem mudanca (nenhum HTML de fora, nenhum pacote novo).

## Pendencias

- **Confirmacao em aparelho (human-check da Task 3):** oferta de Adicionar a tela inicial no Chrome do Android com nome Coinc, icone de 180 px sem cantos pretos no iPhone e abertura em tela cheia dependem de aparelho real (UAT do plano 05-20) e do deploy do plano 05-18. Nao foram executadas aqui.
- **Plano 05-10:** registrar o worker no app com a politica de `shared/core/pwaUpdate.js` e chamar `captureInstallPrompt()` em `main.tsx` antes de o React montar.
- IDEN-03 e IDEN-04 nao foram marcados como entregues (fecham adiante, conforme orientacao).

## Next Phase Readiness

- 05-10 pode importar `virtual:pwa-register` (tipos em `tsconfig.app.json`) e consumir o `SKIP_WAITING` ja tratado em `src/sw.ts`.
- Os passos de adicionar a tela inicial podem consumir `usePwaInstall()`.
- 05-13 troca o icone por substituicao dos SVGs e `npm run icons`; nada neste plano depende do desenho escolhido.

## Self-Check: PASSED

- FOUND: src/sw.ts, tsconfig.sw.json, src/lib/pwa/installPrompt.ts, src/hooks/usePwaInstall.ts, test/static/phase5-sw.test.js, test/static/phase5-manifest.test.js, scripts/ux-audit/pwa.mjs
- FOUND: commits d78eddbc, 6653a829 e aa372288
- `git rev-list --count db7c4a0e..HEAD` = 3 no momento da escrita
