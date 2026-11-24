---
phase: 06-cart-o-de-cr-dito
plan: 04
subsystem: cartao-de-credito
tags: [nucleo-puro, pluggy, parcelas, reconciliacao]
status: complete
requires: [06-02]
provides:
  - "cardAmountCents, parseBillForecast, classifyCardTx, PURCHASE_DATE_FIELD (shared/core/cardTx.js)"
  - "parseInstallment, installmentBaseName, futureInstallments (shared/core/cardInstallments.js)"
  - "reconcileCardTxs (shared/core/cardReconcile.js)"
  - "isCardBillPayment e isSelfTransfer exportadas por classify.js (corpo intacto)"
affects: [06-06, 06-18]
key-files:
  created:
    - shared/core/cardTx.js
    - shared/core/cardTx.test.js
    - shared/core/cardInstallments.js
    - shared/core/cardInstallments.test.js
    - shared/core/cardReconcile.js
    - shared/core/cardReconcile.test.js
  modified:
    - shared/core/classify.js
decisions:
  - "Data da compra: constante nomeada PURCHASE_DATE_FIELD = 'date' em cardTx.js (regra ainda nao confirmada pelo dono); trocar so ela, cai em date se o campo faltar"
  - "Moeda estrangeira sem amountInAccountCurrency: classifyCardTx devolve cents null e brlMissing true (nunca valor chutado)"
  - "reconcileCardTxs devolve os objetos de entrada junto do docId (updates, rebinds) para o servidor aplicar sem reindexar"
commits: 3
plan_head_before: 1c14d70a5eca246bcb72fd54019f4923ca3bc2af
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 04: Nucleo puro das compras do cartao Summary

Tres modulos puros e testados para o 06-06 ligar ao sync: valor em reais com a regra do dolar (D-08), classificacao em compra, estorno ou pagamento com mes da fatura da Pluggy, parcelas N/M so com dado, total "a sair" sem contar duas vezes e reconciliacao pendente para confirmada com id recriado.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 (TDD) | 35c1726b | `cardTx.js` (17 testes), `classify.js` exporta as duas funcoes internas |
| 2 (TDD) | 861c77fa | `cardInstallments.js` (12 testes) |
| 3 (TDD) | 7fd6326a | `cardReconcile.js` (12 testes) |

## Verificacao

- `node --test` de cardTx (17), cardInstallments (12), cardReconcile (12): todos passam
- `classify.test.js` sem nenhuma edicao: passa; `purity.test.js` (120) passa
- `npm run test:core:tz`: 829 de 829 em UTC e em Asia/Tokyo
- As seis compras de exemplo somam 18141 centavos; 5,00 USD vale 3008
- Sem rede, sem segredos, sem deploy, nenhum pacote novo

## Deviations from Plan

**1. [Rule 3 - Blocking] shiftBillMonth local em vez de importar de cardBills.js**
- `shared/core/cardBills.js` (plano 06-03, executado em paralelo) ainda nao existia no repositorio; importar quebraria o modulo e a guarda de pureza.
- Fix: helper interno `shiftMonth` (AAAA-MM, virada de ano testada) em `cardInstallments.js`. Quando o 06-03 estiver pronto, trocar por `shiftBillMonth` e apagar o helper e opcional.
- Files: shared/core/cardInstallments.js. Commit: 861c77fa

**2. [Escolha dentro do plano] Campos extras na saida**
- `classifyCardTx` ganhou `brlMissing` (boolean) para marcar "sem valor em reais" (cents null), como exige a verdade do plano; o teste de lista fechada de chaves o inclui.

**3. Regra da data da compra (instrucao do orquestrador)**
- 06-02 deixou a resposta do dono pendente. Usado `date` da Pluggy, isolado em `PURCHASE_DATE_FIELD` com comentario explicando como trocar.

Fora isso, o plano foi executado como escrito. Comentarios sem acento.

## Known Stubs

Nenhum. `installment` fica `null` em `classifyCardTx` por contrato do plano (preenchido pelo 06-06 via `parseInstallment`). A heuristica de parcela por texto esta marcada como a reavaliar com compra parcelada real (D-07).

## Threat Flags

Nenhum alem do registro do plano (T-06-12 a T-06-15 mitigados: regra unica do dolar com null sem conversao, atribuicao um a um, lista fechada de campos testada, texto truncado a 200 caracteres com padroes simples).

## Self-Check: PASSED

Arquivos criados e commits 35c1726b, 861c77fa e 7fd6326a existem no historico.
