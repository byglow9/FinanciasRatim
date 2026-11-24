---
phase: 06-cart-o-de-cr-dito
plan: 05
subsystem: cartao-de-credito
tags: [nucleo, ledger, orcamento, pagamento-de-fatura]
status: complete
requires: [06-02, 06-03, 06-04]
provides:
  - "isOnCardTx; monthTotals e accumulatedBalance sem compra e estorno do cartao (CARD-06)"
  - "weeklySpend e weeklySpendForCycle sem transferencias, contando a compra do cartao"
  - "detectCardPayments (card, bank-text, bank-self) ligando pagamento a fatura (CARD-04)"
  - "testes de regressao de orcamento, Casal e Relatorios (CARD-03, D-14)"
affects: [06-08, 06-11]
tech-stack:
  added: []
  patterns: ["semantica de caixa separada da de gasto", "fusao da mesma operacao vista por dois lados"]
key-files:
  created:
    - shared/core/cardPayments.js
    - shared/core/cardPayments.test.js
  modified:
    - shared/core/ledger.js
    - shared/core/ledger.test.js
    - shared/core/budget.js
    - shared/core/budget.test.js
    - shared/core/couple.test.js
    - shared/core/series.test.js
decisions:
  - "Fatura 'fechada' para FIFO e transferencia propria = pelo menos 1 dia de calendario depois do dia do fechamento (fuso de Sao Paulo)"
  - "Valor exato (tolerancia de 1 centavo) liga a fatura de saldo igual, a mais antiga primeiro, mesmo sem fechamento informado"
  - "Transferencia propria sem fechamento informado nunca vira pagamento"
  - "linkedBankId e o id do lado da conta: do debito fundido ao credito do cartao, ou o proprio id quando a evidencia ja e da conta"
commits: 3
plan_head_before: b1d2c4b854d143f87d1f50b29999ee68773d7ab3
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 05: Regras de caixa do cartao e deteccao do pagamento da fatura Summary

Saldo da conta ignora compra e estorno do cartao e so cai quando o pagamento da fatura sai dela; a projecao semanal conta a compra e ignora transferencia; `detectCardPayments` liga credito no cartao, debito por texto e transferencia propria de valor exato a fatura certa sem contar duas vezes.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 (TDD) | 86b7334b | `isOnCardTx`; caixa em `monthTotals`/`accumulatedBalance`; gasto em `weeklySpend`/`weeklySpendForCycle` (7 testes novos) |
| 3 (TDD, regressao) | b860d9ce | 6 casos em budget, 1 em couple, 1 em series; typedef `cardKind` em `budget.js` |
| 2 (TDD) | b71add24 | `cardPayments.js` com 10 testes |

(A Tarefa 3 foi feita antes da 2 so porque `cardBills.js` de 06-03 ainda nao estava no repositorio; as dependencias chegaram antes da Tarefa 2.)

## Verificacao

- `node --test shared/core/ledger.test.js` e `purity.test.js`: verdes (132 testes; RED visto antes da implementacao)
- `node --test shared/core/budget.test.js`, `couple.test.js`, `series.test.js`: verdes sem editar nenhum teste existente
- `node --test shared/core/cardPayments.test.js`: 10 de 10
- Suite `shared/**/*.test.js` completa: 842 de 842 em UTC e em Asia/Tokyo (rodada por fuso, apos 06-03 e 06-04 chegarem; uma rodada anterior mostrou 2 falhas em testes de 06-03 ainda sem implementacao, fora do escopo)
- Sem rede, sem segredo, sem deploy

## Deviations from Plan

None - plano executado como escrito. Os casos de regressao da Tarefa 3 passaram sem mudar a logica de budget, couple e series (so comentario e typedef em `budget.js`). Unica ordem diferente: Tarefa 3 antes da 2, acima.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do registro do plano (T-06-16..18 mitigados: `self` so com valor exato e ate 31 dias depois do fechamento; pagamento fora do gasto; `isOnCardTx` fora do saldo).

## Self-Check: PASSED

Arquivos e commits 86b7334b, b860d9ce e b71add24 existem.
