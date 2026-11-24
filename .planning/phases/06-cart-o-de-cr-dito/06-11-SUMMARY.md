---
phase: 06-cart-o-de-cr-dito
plan: 11
subsystem: cartao-de-credito
tags: [transacoes, ledger, saldo-de-caixa, marcas]
status: complete
requires: [06-05, 06-07]
provides:
  - "cardSpendCents no nucleo: compras menos estornos do cartao, em centavos inteiros"
  - "saldo acumulado dos Detalhes com cardKind e transfer (regra de caixa enxerga o cartao)"
  - "marcas Cartao, Pendente, Pagamento de fatura e Estorno no cartao na lista"
  - "linha de compras no cartao fora do saldo nos totais"
affects: [06-12]
tech-stack:
  added: []
  patterns: ["soma so no nucleo, a interface apenas formata", "linha condicionada ao total do cartao"]
key-files:
  created:
    - test/static/phase6-transactions.test.js
  modified:
    - shared/core/ledger.js
    - shared/core/ledger.test.js
    - src/services/transactions.service.ts
    - src/hooks/useCycleTransactions.ts
    - src/components/transactions/TransactionTotals.tsx
    - src/components/transactions/TransactionRow.tsx
    - src/pages/TransactionsPage.tsx
decisions:
  - "cardSpendCents devolve centavos inteiros (40000 para 4 reais liquidos), como o hook e a tela pedem"
  - "Chip estatico com icone CreditCard so na marca Cartao; Pendente em tom muted; as demais em neutral (texto e o sinal, nao cor)"
  - "Detalhes ganha a linha 'Compras no cartao (fora do saldo)' antes do saldo acumulado, so quando ha compra"
commits: 3
plan_head_before: fdd5791b72352b4443732014cc6c8728f1647cd5
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
---

# Phase 6 Plan 11: Transacoes e regra de caixa do cartao Summary

Em Transacoes, o saldo do ciclo e o acumulado dos Detalhes so caem com o pagamento da fatura; compras e estornos do cartao continuam na lista com marcas textuais e uma linha avisa quanto foi comprado no cartao e que isso fica fora do saldo.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 (TDD) | 656b74a6 | `cardSpendCents` (4 testes novos, RED visto antes); `getAccumulatedBalanceUntil` leva `cardKind` e `transfer` nos dois ramos; hook devolve `cardSpendCents` |
| 2 | ffdb5961 | marcas na `TransactionRow`; linha do cartao e item nos Detalhes em `TransactionTotals`; pagina repassa o total |
| 3 | afee1959 | `test/static/phase6-transactions.test.js` (6 guardas; falha se o servico perder `cardKind`, conferido) |

## Verificacao

- `node --test shared/core/ledger.test.js`: 25 de 25
- `npm run test:core:tz`: 875 de 875 (uma rodada anterior mostrou 1 falha em `calendarModel.test.js` de outro plano em edicao, depois resolvida)
- `npm run build` e `npm run lint`: limpos (um erro transitorio de tipo em `CardsPage.tsx`, de outro plano, sumiu depois)
- `node --test test/static/phase6-transactions.test.js` e `phase3-1-transactions.test.js`: verdes, sem afrouxar guarda
- `npm run test:static`: 653 de 657. As 2 falhas sao de arquivos de outros planos ainda em edicao e nao tocam Transacoes: `LaunchSheet compacto...` (LaunchSheet) e `botoes e links tem alvo minimo de 44px` (`src/components/cards/BillHistoryList.tsx`, `phase6-cards-ui.test.js`)
- O plano nao define auditores proprios (`package.json` nao tem script de auditoria); nenhum rodado
- Sem rede, sem segredo, sem deploy, sem push

## Deviations from Plan

None - plano executado como escrito. Teste 3 da Tarefa 1 ja era coberto por regra do 06-05; foi acrescentado um caso com lancamentos mapeados como o servico faz. O trabalho foi retomado depois de uma interrupcao por limite de uso: nenhum commit existia antes, entao a Tarefa 1 foi feita do zero.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do registro do plano (T-06-38 mitigado pelo mapeamento no servico e pela guarda estatica; T-06-39 mitigado pela marca Cartao e pela linha explicativa).

## Riscos

- `npm run test:static` so fica 100% verde quando os planos de cartoes e do lancador (BillHistoryList, LaunchSheet) terminarem os ajustes de 44px e do chip compacto.
- O acumulado continua lendo todo o historico (consulta de igualdade, sem indice novo); o custo no Spark nao mudou.

## Self-Check: PASSED

Arquivos e commits 656b74a6, ffdb5961 e afee1959 existem.
