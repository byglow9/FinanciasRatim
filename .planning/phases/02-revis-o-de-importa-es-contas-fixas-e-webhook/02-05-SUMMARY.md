---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
plan: 05
subsystem: api
tags: [bank, pluggy, connect-token, reconnect, consent, express, react]
requires:
  - phase: 02-01
    provides: ITEM_ID_RE e syncItem (webhook.js, sync.js)
  - phase: 02-04
    provides: describeBankFreshness e os campos lidos em bank.service.ts
provides:
  - POST /api/connect-token com { itemId } (checagem de dono 400/404/403)
  - sync grava consentExpiresAt, executionStatus e errorCode em bankConnections
  - botao Reconectar (PluggyConnect updateItem) em Configuracoes > Bancos
affects: [fase-3-limites, plano-02-06]
tech-stack:
  added: []
  patterns: [dono sempre do token do Firebase, pessoa sempre do documento da conexao]
key-files:
  created: []
  modified:
    - server/src/app.js
    - server/src/sync.js
    - server/test/app.test.js
    - server/test/emu/sync.test.js
    - src/services/bank.service.ts
    - src/components/settings/BankConnections.tsx
    - test/static/bank-ui-copy.test.js
key-decisions:
  - "Documento sem ownerId tambem responde 403 no connect-token com itemId (fecha o IDOR)"
  - "A renovacao e so pelo widget; o servidor nunca chama PATCH /items nem createItem"
  - "errorCode guarda so error.code; a mensagem livre da Pluggy nunca vai ao Firestore"
requirements-completed: [REV-07]
status: complete
duration: 30min
completed: 2026-11-17
commits: 4
plan_head_before: 7af870385f5b1aff59baf5c212b158a427de879e
plan_head_after: 61123438ebf61c0409a3cb26cc8603cb29d08e00
actuals:
  tokens: 9000
  tasks: 2
  commits: 4
---

# Phase 2 Plan 05: Reconectar banco e dados de consentimento Summary

Reconectar de REV-07 (D-08): `POST /api/connect-token` aceita `{ itemId }` e so emite o token para o dono da conexao, o sync passa a gravar `consentExpiresAt`, `executionStatus` e `errorCode`, e a tela de Bancos abre o widget da Pluggy em modo `updateItem` pelo botao "Reconectar".

## O que foi feito

- **Task 1 (tracer, TDD):** RED com 7 testes de connect-token com `itemId` e uma trava estatica; depois o ramo `{ itemId }` em `server/src/app.js` (valida com `ITEM_ID_RE` importado de `./webhook.js`, 400 `Dados invalidos`; le `bankConnections/{itemId}`, 404 `Conexao nao encontrada`; 403 `Sem acesso` se `ownerId` difere de `req.owner.hid` ou falta; so entao `createConnectToken(itemId, { clientUserId: <person do documento> })`). Sem `itemId`, o ramo antigo ficou intacto (`Pessoa invalida`). `createConnectToken(person | { itemId })` no cliente e `reconnect(c)` em `BankConnections.tsx`, com `Button` "Reconectar" visivel quando `needsReconnect` ou `consent` e `expiring`/`expired`; apos o widget, `registerConnection(c.person, item.id)` so sincroniza.
- **Task 2 (TDD):** RED com tres testes de emulador, depois tres campos no `ref.set(..., { merge: true })` do `syncConnection`: `executionStatus`, `consentExpiresAt` (Timestamp ou null) e `errorCode` (so o codigo). Sem migracao: os campos aparecem no proximo sync.

## Verificacao

- `npm --prefix server test`: 81 de 81 passam (inclui os 7 casos novos de connect-token).
- `npm run test:static`: 49 passam, 0 falhas, 1 skipped (ja existente).
- `npm run test:core`: 65 de 65 passam.
- `npm run build`: passa.
- `npm run lint`: 4 erros e 2 avisos, todos pre-existentes em `src/components/ui/*`; nenhum nos arquivos deste plano.
- `shared/core/classify.js` sem diferenca contra a38c142a (D-05).
- `grep fixedExpense server/src`: vazio.
- **`npm run test:emu` NAO rodou:** o ambiente tem so Java 8 e o emulador do Firestore exige JRE 11+ (o `scripts/dev-env.sh` pede 21 e nao existe `~/.local/jdk`). Os tres testes novos de `server/test/emu/sync.test.js` passam em `node --check` mas nao foram executados no emulador; o RED deles tambem nao foi observado. Como substituto, rodei `syncConnection` real contra um Firestore falso em memoria (script fora do repositorio) e os tres cenarios deram o esperado: SUCCESS com `consentExpiresAt` 2027-02-10T12:30:00.000Z e `errorCode` nulo; item sem campos com os tres em null; erro `ACCOUNT_NEEDS_ACTION` gravando so o codigo e sem vazar a mensagem. Precisa rodar `npm run test:emu` num ambiente com JRE 21 antes de dar por fechado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] Base do worktree anterior ao merge do Plano 02-04**
- **Found during:** leitura inicial
- **Issue:** o worktree partia de um commit sem `describeBankFreshness`, `useNow` nem os campos de `bank.service.ts`, dos quais o plano depende.
- **Fix:** `git merge --ff-only main` (o HEAD era ancestral de main), sem commits proprios.
- **Commit:** n/a (fast-forward)

**2. [Rule 3 - Bloqueio] Ambiente sem JRE 21 para o emulador**
- **Found during:** Task 2
- **Issue:** `test:emu` nao inicia com Java 8.
- **Fix:** verificacao substituta em memoria descrita acima; `test:emu` fica pendente.

Fora isso, o plano foi executado como escrito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum: a unica superficie nova (connect-token com `itemId`) esta coberta por T-02-22 a T-02-26 do plano.

## Self-Check: PASSED

- Arquivos modificados existem e os 4 commits (4c476652, 5d68ff0b, ccf1f5b9, 61123438) estao no historico do branch.
