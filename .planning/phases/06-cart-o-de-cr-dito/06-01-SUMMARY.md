---
phase: 06-cart-o-de-cr-dito
plan: 01
subsystem: cartao-de-credito
tags: [pluggy, firestore, rules, react, tracer]
status: complete
requires: []
provides:
  - "cards/{accountId} com limite total, disponivel e fatura atual em centavos (CARD-02)"
  - "cardSnapshotFromAccount e cardLimitView (nucleo puro)"
  - "regra de leitura de cards so para o dono e caso na matriz"
  - "rota /cartoes (CardsPage, CardLimitCard, useCards, cards.service)"
affects: [06-02, 06-06, 06-10, 06-16, 06-20]
tech-stack:
  added: []
  patterns: ["snapshot por lista fechada de campos", "falha do cartao isolada em try/catch no laco de contas"]
key-files:
  created:
    - shared/core/cards.js
    - shared/core/cards.test.js
    - server/src/card-sync.js
    - server/test/emu/card-sync.test.js
    - src/services/cards.service.ts
    - src/hooks/useCards.ts
    - src/components/cards/CardLimitCard.tsx
    - src/pages/CardsPage.tsx
  modified:
    - server/src/sync.js
    - firestore.rules
    - test/rules/matrix.test.js
    - src/App.tsx
    - test/static/phase3-gaps.test.js
    - test/static/phase3-final.test.js
    - test/static/phase3-1-a11y.test.js
    - test/static/owner-queries.test.js
decisions:
  - "usado = max(limite - disponivel, 0); pct inteiro arredondado ao mais proximo, pode passar de 100; estado pelo limitState existente"
  - "o laco de contas de syncConnection grava o cartao antes de buscar as transacoes da conta; summary.cards so existe quando houve cartao"
  - "erro do listener de cards chega ao chamador (diferente de bankConnections) para a tela separar vazio de falha"
requirements-completed: []
requirements-partial: [CARD-02, CENT-03]
commits: 3
plan_head_before: bfea08a95e1a1d8aebeceea93b12546f7e4eae61
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 01: Cartao de credito, fatia tracer Summary

Trilha unica da conta CREDIT da Pluggy ate a tela `/cartoes`: o sync grava `cards/{accountId}` com limite, disponivel e fatura atual (`balance`, D-08) em centavos, as regras deixam so o dono ler, e a tela mostra tudo via `cardLimitView` (com os numeros reais do dono: usado 181,41, 91%, estado warn).

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 (tracer, TDD) | 2aff9806 | `cards.js` (snapshot e visao do limite), `card-sync.js`, chamada em `sync.js`, testes de nucleo (8) e de emulador (4) |
| 2 | 715e83d0 | `cards` na regra somente leitura e na matriz (`BANK_COLS`) |
| 3 | 0a632d53 | servico, hook, `CardLimitCard`, `CardsPage`, rota `/cartoes`, guardas de rotas |

## Verificacao

- `node --test shared/core/cards.test.js`: 8 de 8; `purity.test.js`: 111 de 111 (RED visto antes da implementacao)
- `npm run test:emu`: 62 de 62 (inclui card-sync: grava com dono/pessoa/item/centavos, 2a rodada sem duplicar, falha do cartao nao derruba a importacao bancaria, conexao sem dono nao grava)
- `npm run test:rules`: 13 de 13 (cards percorrido pela matriz); `firestore-config.test.js`: 6 de 6
- `npm run build` e `npm run lint`: sem erros
- `npm run test:static`: 613 passam, 0 falham (2 puladas ja existentes)
- `npm run test:core:tz`: 733 de 733 em UTC e em Asia/Tokyo
- `npm run test:server`: 118 de 118
- Nenhuma rede real, nenhuma credencial lida ou gravada, nenhum deploy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Guarda de contagem de services em owner-queries.test.js**
- **Found during:** Task 3 (`npm run test:static`)
- **Issue:** a guarda afirma `all.length === 12` services; o `cards.service.ts` novo faz 13. O proprio servico novo passa na checagem de dono (so a contagem quebrava).
- **Fix:** uma linha, 12 para 13 (valor e mensagem). Nenhuma afirmacao afrouxada.
- **Files modified:** test/static/owner-queries.test.js (fora de `files_modified`; autorizado pela clausula "guarda legitima precisa mudar" do `fails_when` da Task 3, mas fora da lista literal)
- **Commit:** 0a632d53

Fora isso, o plano foi executado como escrito. Comentarios novos sem acento, conforme as regras do plano.

## Known Stubs

Nenhum. Em desenvolvimento simulado (sem Firestore) `subscribeCards` entrega lista vazia de proposito; os dados simulados do cartao sao do plano 06-20.

## Threat Flags

Nenhum alem do registro do plano (T-06-01..05 mitigados: lista fechada de campos com teste das chaves sensiveis, leitura por dono na matriz, sem escrita de cliente, `syncCardSnapshot` recusa dono ausente, try/catch proprio no sync).

## Notas para o 06-02 (gate humano)

- Nada foi publicado: regras, servidor (Railway) e hospedagem seguem como estavam. O documento `cards/{id}` so existira em producao depois do deploy e de um sync.
- O caminho antigo de importacao das compras do cartao continua intacto (substituido no 06-06).
- O dock nao foi alterado (9o destino e do 06-16).

## Self-Check: PASSED

Arquivos criados e commits 2aff9806, 715e83d0 e 0a632d53 existem no historico.
