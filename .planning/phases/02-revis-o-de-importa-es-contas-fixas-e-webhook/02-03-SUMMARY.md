---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
plan: 03
subsystem: server
tags: [pluggy, cartao, sonda, somente-leitura, rev-03, teste-estatico]
requires: []
provides:
  - "server/src/card-probe.js: summarizeCardShape, renderCardProbe, probeHeading, alreadyProbedToday, isProbeFile"
  - "server/scripts/probe-card.js: runProbe e main (uma sonda por dia, so sobrescreve sonda)"
  - "test/static/probe-readonly.test.js: trava de leitura da sonda"
  - "test/static/fixed-expense-manual.test.js: trava de nao regressao de REV-03"
affects: [02-06]
key-files:
  created:
    - server/src/card-probe.js
    - server/scripts/probe-card.js
    - server/test/card-probe.test.js
    - test/static/probe-readonly.test.js
    - test/static/fixed-expense-manual.test.js
  modified: []
requirements-completed: [REV-03]
completed: 2026-11-17
status: complete
commits: 5
---

# Phase 2 Plan 03: Sonda do cartao e trava de REV-03 Summary

**Sonda somente leitura que registra so o formato do que a Pluggy devolve para o cartao (sem valores, ids ou texto livre), com CLI de uma execucao por dia, e travas estaticas que impedem escrita na Pluggy e regressao do pagamento manual de conta fixa.**

## Accomplishments

- Tarefa 1: `summarizeCardShape`/`renderCardProbe` constroem o resumo campo a campo por allowlist; teste com sentinelas prova que nada sensivel vaza. `runProbe` chama apenas `fetchItem`, `fetchAccounts`, `fetchCreditCardBills` e `fetchAllTransactions`.
- Tarefa 2: `main` valida `--item`, `--days` e credenciais, recusa repetir a sonda no mesmo dia, nunca sobrescreve arquivo que nao e sonda; `probe-readonly.test.js` quebra se surgir metodo de escrita.
- Tarefa 3: `fixed-expense-manual.test.js` protege REV-03 (markAsPaid nao toca lancamentos; servidor e nucleo nao mencionam conta fixa).

## Verification

- `server`: 74 testes, 0 falhas. `test:static`: 43 ok, 1 skip, 0 falhas.
- Os 3 arquivos do plano: 30 testes, 30 ok.

## Deviations

- O plano foi fechado manualmente (SUMMARY escrito depois dos commits, por decisao do dono) apos a execucao parar. `server/node_modules` nao existia nesta maquina; `npm ci` em `server/` resolveu e a suite passou. Rodado com Node 24.15 (nvm ausente), sem diferenca nos resultados.
- A sonda ainda nao foi executada contra a Pluggy real: isso e do plano 02-06 (passo do dono).

## Commits

3ea4d294, f5105887, 69824a91, ccbee931, 57c91ccf
