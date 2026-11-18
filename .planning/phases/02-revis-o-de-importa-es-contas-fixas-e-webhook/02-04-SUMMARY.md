---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
plan: 04
subsystem: ui
tags: [bank, pluggy, freshness, consent, react, shared-core]
requires: []
provides:
  - describeBankFreshness (funcao pura do nucleo compartilhado, reuso na Fase 3 LIM-08)
  - useNow e useBankConnections
  - BankStatusNotice na Home
affects: [fase-3-limites, plano-02-05]
tech-stack:
  added: []
  patterns: [nucleo puro com relogio injetado, useSyncExternalStore para "agora"]
key-files:
  created:
    - shared/core/bankStatus.js
    - shared/core/bankStatus.test.js
    - src/hooks/useNow.ts
    - src/hooks/useBankConnections.ts
    - src/components/dashboard/BankStatusNotice.tsx
    - test/static/bank-ui-copy.test.js
  modified:
    - shared/core/purity.test.js
    - src/services/bank.service.ts
    - src/components/settings/BankConnections.tsx
    - src/pages/DashboardPage.tsx
key-decisions:
  - "bankUpdatedAt (data do banco) manda no frescor; lastSyncAt so e reserva rotulada como importacao do app"
  - "Sem data alguma conta como desatualizado; consentimento nulo nao gera aviso"
requirements-completed: [REV-07]
status: complete
duration: 25min
completed: 2026-11-17
commits: 4
plan_head_before: 57c91ccf4fa73357004bcd3875e05ccd84a08a19
plan_head_after: 1ffdf2ec8c89479f633a70fb4046270e137d086d
actuals:
  tokens: 14000
  tasks: 2
  commits: 4
---

# Phase 2 Plan 04: Frescor do banco e consentimento Summary

Frescor dos dados do banco e estado do consentimento (REV-07, D-08) por uma funcao pura `describeBankFreshness` no nucleo compartilhado, exibida por conexao em Configuracoes > Bancos e como indicador discreto na Home, com o texto "N para revisar" removido (D-05).

## O que foi feito

- **Task 1 (tracer, TDD):** teste RED, depois `shared/core/bankStatus.js` (relogio injetado, sem pacote, sem Date.now), leitura de `bankUpdatedAt`, `consentExpiresAt`, `executionStatus`, `errorCode`, `lastWebhookAt`, `lastWebhookEvent` em `bank.service.ts`, `useNow` (useSyncExternalStore) e linhas novas em `BankConnections.tsx` ("Atualizado há X", consentimento vencido/vence em N dias, "Precisa reconectar", "Dados do banco desatualizados", "Último aviso do banco: há X" so com webhook). Removidos os dois textos de contagem de revisao e a constante `review`.
- **Task 2 (TDD):** teste estatico RED, depois `useBankConnections`, `BankStatusNotice` (linha "Banco atualizado há X" quando tudo ok; `Alert` warning/destructive com link para `/configuracoes` so quando ha desatualizacao, consentimento perto de vencer/vencido ou reconexao) ligado na Home entre cabecalho e cartoes, e `bankStatus.js` incluido nas listas de pureza.

## Verificacao

- `node --test` de `shared/**` em TZ=UTC e TZ=Asia/Tokyo: 65 de 65 passam nos dois.
- `node --test test/static/*.test.js`: 0 falhas (inclui `bank-ui-copy.test.js`).
- `npm run build`: passa.
- `npm run lint`: 4 erros e 2 avisos, todos pre-existentes em arquivos nao tocados (ver abaixo); nenhum nos arquivos deste plano.
- `shared/core/classify.js` sem diferenca contra a38c142a (D-05).
- `npm --prefix server test`: NAO rodou de forma util (server/node_modules ausente no worktree; 4 falhas ERR_MODULE_NOT_FOUND). O plano nao toca em `server/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] `npm run test:core:tz` nao roda no shell cmd do npm no Windows**
- **Found during:** Task 1
- **Issue:** o script usa `TZ=UTC cmd`, que o cmd.exe nao entende.
- **Fix:** o mesmo comando rodado direto no bash (`TZ=UTC node --test ...` e `TZ=Asia/Tokyo node --test ...`). Script do package.json nao alterado.
- **Commit:** n/a

Fora disso, plano executado como escrito. Item pequeno: "vence em 1 dia" usa o singular.

## Deferred Issues (fora de escopo, pre-existentes)

`npm run lint` falha por: `src/components/ui/badge.tsx`, `button.tsx` (react-refresh/only-export-components), `input.tsx`, `select.tsx` (no-empty-object-type) e avisos de compilador em `EventForm.tsx` e `NoteForm.tsx`. Nao causados por este plano.

## Known Stubs

Nenhum. `useBankConnections` devolve `error` sempre nulo por paridade com os demais hooks (previsto no plano; a inscricao ja trata erro devolvendo lista vazia).

## Threat Flags

Nenhum. O plano so le dados; a escrita de `bankConnections` segue exclusiva do servidor. Mitigacoes T-02-18 a T-02-21 aplicadas (frescor pela data do banco, textos proprios, sem HTML cru, so leitura).

## Self-Check: PASSED

Arquivos criados e commits (cd6f9f59, 4fbf3dac, 761a0b50, 1ffdf2ec) existem no ramo do worktree.
