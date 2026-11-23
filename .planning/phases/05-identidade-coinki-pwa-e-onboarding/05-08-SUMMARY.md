---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 08
subsystem: infra
tags: [firebase-hosting, multi-site, cache-headers, service-worker, redirect]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-01: site coinc-financias criado e vazio (D-03a)"
provides:
  - "firebase.json com hosting em array: alvo coinc (dist) e alvo legacy (redirect 302 fixo)"
  - ".firebaserc com targets: coinc -> coinc-financias, legacy -> financias-ratimbum"
  - "hosting-legacy/index.html (pasta publica versionada, noindex, sem script)"
  - "test/static/phase5-hosting.test.js (10 testes)"
  - "05-08-HOSTING-NOTES.md (curl dos planos 18 e 19, politica 302 antes de 301, nota do amigo, ordem de producao)"
affects: [05-09 service worker, 05-17 ALLOWED_ORIGINS e dominio do login, 05-18 deploy do coinc, 05-19 redirect do legacy, 05-21 decisao 301]

actuals:
  tokens: 5200
  tasks: 2
  commits: 2
plan_head_before: b686035c8fa8d1057c33205189fff386e9f32277

tech-stack:
  added: []
  patterns:
    - "Cache-Control: so /assets/** imutavel; sw.js, manifest, raiz e HTML com no-cache; nenhuma regra por extensao js/css"
    - "Redirect do site antigo com destino absoluto fixo, sem captura de caminho ou parametro"

key-files:
  created:
    - hosting-legacy/index.html
    - test/static/phase5-hosting.test.js
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-08-HOSTING-NOTES.md
  modified:
    - firebase.json
    - .firebaserc

key-decisions:
  - "no-cache substitui no-cache, no-store, must-revalidate nos HTML e na raiz (o service worker serve o HTML pre-cacheado; no-store so atrapalharia o bfcache)"
  - "Redirect sobe como 302; 301 so por decisao do dono no plano 05-21"
  - "Alias do alvo segue coinc e aponta para o site coinc-financias (D-03a)"

requirements-completed: []

duration: ~15 min
completed: 2026-11-23
---

# Phase 5 Plan 08: Hosting em dois alvos Summary

**`firebase.json` com dois alvos (`coinc` serve `dist` com so `/assets/**` imutavel; `legacy` redireciona tudo para `https://coinc-financias.web.app/?origem=antigo` com 302 fixo), `.firebaserc` com `targets` aceito pelo CLI e guarda estatica que impede o `sw.js` de ser pinado em cache.**

## Accomplishments

- **Task 1 (TDD):** teste escrito primeiro (9 de 10 falhando) e depois `firebase.json` convertido: `hosting` virou array, as regras `**/*.js` e `**/*.css` imutaveis foram apagadas, `/sw.js` e `/manifest.webmanifest` ganharam `no-cache` explicito, `firestore` e `emulators` ficaram intactos. `.firebaserc` ganhou `targets` preservando `projects`. `hosting-legacy/index.html` e um documento minimo com `noindex`, sem script e sem aviso.
- **Task 2:** `firebase target --project financias-ratimbum` lista `coinc (coinc-financias)` e `legacy (financias-ratimbum)`; `firebase hosting:sites:list` confirma os dois sites. O formato escrito a mao foi aceito (A11 confirmada). `05-08-HOSTING-NOTES.md` registra os curl de conferencia, a politica 302 antes de 301, o canal de preview opcional (A8), a nota do projeto do amigo (A9) e a ordem de producao.

Verificacao: `node --test phase5-hosting.test.js firestore-config.test.js` (16 de 16) e `npm run test:static` (498 testes, 496 passam, 0 falham, 2 ignorados). Nenhum deploy, login ou comando de escrita do Firebase foi executado; Railway intocado.

## Commits

- `342693da`: feat(05-08): dois alvos de Hosting, cabecalhos do sw corrigidos e redirect 302
- `7a28fb1b`: docs(05-08): notas de hosting (curl, politica 302 antes de 301, amigo, ordem de producao)

## Deviations from Plan

None - plan executed exactly as written.

Observacoes sem desvio: o `ID` real do site e `coinc-financias` (alias `coinc`), conforme D-03a e como o plano ja estava escrito; a precondicao da Task 1 (site criado) estava satisfeita pelo 05-01. `.planning/milestone.lock` e `.planning/state.json` ficam modificados na arvore e nao foram incluidos nos commits.

## Authentication Gates

Nenhum. O CLI global ja estava autenticado e so rodou leitura.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-05-08-01 (destino fixo, guarda confere um so redirect sem captura), T-05-08-02 (regras js/css removidas, no-cache explicito, guarda estatica; conferencia por curl fica para o 05-18), T-05-08-03 (302) mitigadas; T-05-08-04 (amigo) aceita e documentada.

## Next Phase Readiness

- 05-09 pode gerar `sw.js` e `manifest.webmanifest` na raiz de `dist`; os cabecalhos ja estao prontos.
- 05-17 a 05-19: seguir a ordem de producao e os curl de `05-08-HOSTING-NOTES.md`.
- IDEN-01, IDEN-02 e IDEN-04 nao foram marcados como entregues (fecham adiante).

## Self-Check: PASSED

- FOUND: firebase.json, .firebaserc, hosting-legacy/index.html, test/static/phase5-hosting.test.js, 05-08-HOSTING-NOTES.md
- FOUND: commits 342693da e 7a28fb1b
- `git rev-list --count b686035c..HEAD` = 2 no momento da escrita
