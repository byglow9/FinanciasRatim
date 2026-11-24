---
phase: 06-cart-o-de-cr-dito
plan: 03
subsystem: cartao-de-credito
tags: [core, faturas, cardBills, tdd]
status: complete
requires: [06-01, 06-02]
provides:
  - "parseBillMonth, shiftBillMonth, closingPartsOf, duePartsOf, derivedBillMonth, billMonthOf, openBillMonth, derivationMismatch, CLOSING_DAY_STARTS_NEXT_BILL"
  - "sumBillTotals (total por fatura em centavos, unico para servidor e cliente)"
  - "BILL_STATUSES e cardBillStatus (aberta, fechada, paga, atrasada, futura; null sem datas do dono)"
  - "groupBills (faturas mes a mes com fechamento, vencimento, total, status, itens e origem)"
affects: [06-06, 06-07, 06-10, 06-12]
tech-stack:
  added: []
  patterns: ["regra do dia do fechamento em uma constante unica, parametro opcional para teste de contrato", "resultado conservador em vez de excecao"]
key-files:
  created:
    - shared/core/cardBills.js
    - shared/core/cardBills.test.js
  modified: []
decisions:
  - "mes da fatura = mes em que ela fecha; a Pluggy sempre vence, senao deriva pelo fechamento do dono, senao 'unknown'"
  - "derivedBillMonth(parts, closingDay, startsNextBill = CLOSING_DAY_STARTS_NEXT_BILL) e o unico ponto da regra; o parametro permite o teste de contrato sem reatribuir export ESM"
  - "groupBills devolve { bills, unassignedCents }; so existe fatura onde ha lancamento (nao cria fatura aberta vazia)"
  - "count conta compras (estorno entra no total e nos itens, nao na contagem); pendingCount so cardStatus pending"
  - "origin 'manual' = sem bankImportId e sem source 'bank'"
  - "fatura fechada com total zero fica 'fechada' (nunca paga nem atrasada)"
requirements-completed: []
requirements-partial: [CARD-08, CARD-02, CENT-03]
commits: 3
plan_head_before: 86b7334b40b540367904ba8cf53f6dd8b5a3e1c8
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 03: Nucleo puro das faturas Summary

`shared/core/cardBills.js` calcula mes da fatura, fechamento, vencimento, total e status a partir dos dias que o dono informa (fechamento 07, vencimento 14), sem depender de fatura da Pluggy; as seis compras reais de dezembro dao a fatura 2026-12 de 18141 centavos que fecha em 07/12 e vence em 14/12.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 (TDD) | c9cf06b5 | mes da fatura, fechamento, vencimento, mes aberto, derivationMismatch, constante da regra |
| 2 (TDD) | 3ba5f351 | sumBillTotals (centavos inteiros) e cardBillStatus |
| 3 (TDD) | e26da00a | groupBills com itens, origem manual ou banco, pagamentos e meses pagos |

## Verificacao

- `node --test shared/core/cardBills.test.js`: 28 de 28 (RED visto em cada tarefa antes da implementacao)
- `node --test shared/core/purity.test.js`: 117 de 117 (sem pacote, sem relogio)
- `npm run test:core:tz`: 829 de 829 em UTC e em Asia/Tokyo
- `tsc` do `tsconfig.app.json` (inclui `shared`): sem erro em cardBills.js
- Nenhum arquivo de cliente tocado (build e lint nao se aplicam); sem rede, sem deploy.

## Deviations from Plan

Nenhuma de regra. Notas de interpretacao:

- O teste de contrato da constante (Test 6) usa o parametro opcional `startsNextBill` de `derivedBillMonth` (padrao = `CLOSING_DAY_STARTS_NEXT_BILL`), pois um export ESM nao pode ser reatribuido. `derivedBillMonth` e `partsOfDate` sao exports extras.
- `groupBills` devolve objeto `{ bills, unassignedCents }` (o plano pedia o campo `unassignedCents` junto da lista).
- O campo `commits` do ledger (`rev-list` do `plan_head_before` ate HEAD) daria 10 porque os planos 06-04, 06-05 e 06-16 commitam em paralelo na mesma branch; o numero registrado (3) e o dos commits deste plano (`git log` filtrado pelos dois arquivos).
- A suposicao do dia do fechamento (compra no dia do fechamento fica na fatura que fecha nele) segue nao confirmada com dados reais: conferir no gate do 06-14, trocando so `CLOSING_DAY_STARTS_NEXT_BILL`. Resposta (a) do 06-02 sobre a data das compras continua pendente; `derivationMismatch` expoe divergencia.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-06-10 (dia fora de 1 a 31 vira null, funcoes nunca lancam) e T-06-11 (derivacao so sem mes da Pluggy, status null sem datas, `derivationMismatch`) mitigados e testados.

## Self-Check: PASSED

shared/core/cardBills.js e shared/core/cardBills.test.js existem; commits c9cf06b5, 3ba5f351 e e26da00a existem no historico.
