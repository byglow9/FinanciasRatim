---
phase: "1"
slug: "funda-o-de-dados-e-acesso"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-17"
---

# Phase 1 — Validation Strategy

> Contrato de validação por fase (amostragem de feedback durante a execução).

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22); `@firebase/rules-unit-testing` 6.0.0; emuladores Auth + Firestore |
| **Config file** | nenhum (glob na linha de comando); `firebase.json` já define os emuladores |
| **Quick run command** | `node --test "shared/**/*.test.js" && (cd server && node --test)` |
| **Full suite command** | `TZ=UTC node --test "shared/**/*.test.js" && TZ=Asia/Tokyo node --test "shared/**/*.test.js" && (cd server && node --test) && firebase emulators:exec --only auth,firestore "node --test test/rules/*.test.js server/test/emu/*.test.js" && npm run build && npm run lint` (JRE 21 no `PATH`) |
| **Estimated runtime** | ~90 segundos |

## Sampling Rate

- **After every task commit:** rodar o quick run command
- **After every plan wave:** rodar o full suite command
- **Before `/gsd-verify-work`:** suíte completa verde
- **Max feedback latency:** 90 segundos

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| FUND-01 | Sem login legado/`signUp`/`VITE_APP_*`; conta sem claim barrada | static + manual | `node --test test/static/no-legacy-auth.test.js` | ❌ W0 | ⬜ pending |
| FUND-02 | Backfill de `ownerId` idempotente, contagens antes = depois | integration (emulador) | `firebase emulators:exec --only firestore "node --test server/test/emu/backfill.test.js"` | ❌ W0 | ⬜ pending |
| FUND-02 | Toda query/escrita usa `ownerId` | static | `node --test test/static/owner-queries.test.js` | ❌ W0 | ⬜ pending |
| FUND-03 | Regras: anônimo, sem claim, outro casal, sem filtro, `ownerId` alheio/mutado negados | integration (emulador) | `firebase emulators:exec --only firestore "node --test test/rules/*.test.js"` | ❌ W0 | ⬜ pending |
| FUND-04 | Servidor: sem token 401, sem `hid` 403, `Origin` não autorizada 403, IDOR negado | unit + integration | `cd server && node --test test/app.test.js` | ❌ W0 | ⬜ pending |
| FUND-04 | `sync` grava `ownerId` e `categoryId` | unit | `cd server && node --test test/sync.test.js` | ❌ W0 | ⬜ pending |
| FUND-05 | Categorias com id estável; renomear mantém id | unit | `node --test shared/core/categories.test.js` | ❌ W0 | ⬜ pending |
| FUND-06 | Núcleo de cálculo em 3 fusos de host | unit | `TZ=Asia/Tokyo node --test "shared/**/*.test.js"` | ✅ parcial | ⬜ pending |
| FUND-07 | Servidor sobe em Node 22.23.x, `firebase-admin` 14; cliente compila com `firebase` 13 | smoke + build | `docker build -t coinki-server . && npm run build` | ❌ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] JRE 21 no `PATH` e `nvm use 22.23.5`
- [ ] `@firebase/rules-unit-testing@^6.0.0` (devDependency na raiz) e scripts `test:core`, `test:rules`, `test:emu`
- [ ] `test/rules/*.test.js` e novas `firestore.rules`
- [ ] `shared/core/*.test.js` e mover `server/test/classify.test.js`
- [ ] `server/test/app.test.js`, `server/test/emu/*.test.js`
- [ ] `test/static/*.test.js`
- [ ] `Dockerfile` + `.dockerignore`

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ele e Ela entram e conferem todas as telas; sem `failed-precondition`; bancos e sync funcionam; rollback de regras ensaiado | FUND-01..04 | Depende de produção (Firebase/Railway) | Checklist do runbook de cutover (D-14) |

## Validation Sign-Off

- [ ] Todas as tarefas têm `<automated>` ou dependência de Wave 0
- [ ] Continuidade de amostragem: sem 3 tarefas seguidas sem verificação automática
- [ ] Wave 0 cobre todas as referências MISSING
- [ ] Sem flags de watch-mode
- [ ] Latência de feedback < 90s
- [ ] `nyquist_compliant: true` no frontmatter

**Approval:** pending
