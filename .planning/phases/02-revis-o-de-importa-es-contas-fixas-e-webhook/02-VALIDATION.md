---
phase: "2"
slug: "revis-o-de-importa-es-contas-fixas-e-webhook"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-17"
---

# Phase 2 — Validation Strategy

> Contrato de validação por fase. Fonte completa: `02-RESEARCH.md` § Validation Architecture.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 22); emulador Auth + Firestore para integração |
| **Config file** | nenhum; scripts em `package.json` (raiz) e `server/package.json` |
| **Quick run command** | `npm --prefix server test && npm run test:core && npm run test:static` |
| **Full suite command** | `. ./scripts/dev-env.sh && npm --prefix server test && npm run test:core:tz && npm run test:static && npm run test:rules && npm run test:emu && npm run build && npm run lint` |
| **Estimated runtime** | ~90 segundos |

## Sampling Rate

- **After every task commit:** quick run command
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** suíte completa verde
- **Max feedback latency:** 90 segundos

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| REV-06 | Webhook: sem/errado segredo 401; segredo certo 200 e sync do item do dono; eventos válidos/ inválidos; dedupe por `eventId`; sem token do Firebase; sem segredo configurado a rota não existe | unit (HTTP) | `npm --prefix server test` | ❌ W0 | ⬜ pending |
| REV-06 | `syncItem` coalesce rajadas e serializa com `syncAll`; replay sem duplicata no emulador | unit + integração | `npm --prefix server test` / `npm run test:emu` | ❌ W0 | ⬜ pending |
| REV-06 | `register-webhooks.js` idempotente, reativa desativados, não imprime o segredo | unit | `npm --prefix server test` | ❌ W0 | ⬜ pending |
| REV-07 | `describeBankFreshness` (30 dias / 48 h, nulos, estados) em 3 fusos | unit | `npm run test:core:tz` | ❌ W0 | ⬜ pending |
| REV-07 | `syncConnection` grava `consentExpiresAt`, `executionStatus`, `errorCode`, `bankUpdatedAt` | integração | `npm run test:emu` | ❌ W0 | ⬜ pending |
| REV-07 | `POST /api/connect-token` com `itemId`: 200 dono, 403 outro dono, 404, 400 | unit (HTTP) | `npm --prefix server test` | ❌ W0 | ⬜ pending |
| REV-07 | Cliente compila/lint; "para revisar" removido de `BankConnections.tsx` | tipo/estático | `npm run build && npm run lint && npm run test:static` | ❌ W0 | ⬜ pending |
| REV-03 | `markAsPaid` não toca lançamentos; servidor e núcleo não mencionam conta fixa | estático | `npm run test:static` | ❌ W0 | ⬜ pending |
| Cartão | `summarizeCardShape` não vaza sentinelas; `probe-card.js` sem operações de escrita | unit + estático | `npm --prefix server test` / `npm run test:static` | ❌ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `server/test/app.test.js` estendido (fakeDb com `set`/merge, fakeSync com `syncItem`, helper `waitFor`)
- [ ] `server/test/webhook.test.js`, `server/test/card-probe.test.js`
- [ ] `shared/core/bankStatus.test.js`
- [ ] `server/test/emu/sync.test.js` (syncItem, consentimento)
- [ ] `test/static/fixed-expense-manual.test.js` + travas de "para revisar" e de operações proibidas da sonda
- [ ] Nenhuma instalação de framework

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Smoke do endpoint público (401 sem segredo, 200 com segredo) | REV-06 | Depende do Railway | curl conforme `02-RESEARCH.md` |
| Registro dos 4 webhooks e idempotência | REV-06 | Credenciais Pluggy do dono | rodar `register-webhooks.js` duas vezes |
| D-07: o MeuPluggy entrega webhooks? | REV-06 | Depende da nuvem da Pluggy | atualizar o item e checar `lastWebhookAt`/log; sem evento em 48 h = somente polling |
| Reconectar e aviso de consentimento | REV-07 | OAuth do MeuPluggy | tocar Reconectar e conferir datas |
| Sonda do cartão | trilha | Credenciais e dados reais | rodar `probe-card.js` 1x e colar resumo em `02-CARD-PROBE.md` |

## Validation Sign-Off

- [ ] Todas as tarefas têm `<automated>` ou dependência de Wave 0
- [ ] Sem 3 tarefas seguidas sem verificação automática
- [ ] Wave 0 cobre todas as referências MISSING
- [ ] Sem flags de watch-mode
- [ ] Latência de feedback < 90s
- [ ] `nyquist_compliant: true` no frontmatter

**Approval:** pending
