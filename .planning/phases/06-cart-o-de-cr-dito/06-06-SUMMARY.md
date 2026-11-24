---
phase: 06-cart-o-de-cr-dito
plan: 06
subsystem: cartao-de-credito
tags: [servidor, sync, pluggy, reconciliacao, agregados]
status: complete
requires: [06-03, 06-04, 06-05]
provides:
  - "syncCardTransactions e CARD_HISTORY_FLOOR (server/src/card-sync.js)"
  - "refreshCardAggregates: cards/{id}.billTotals, pendingCount, unassignedCents, firstPurchaseAt, lastPurchaseAt"
  - "conta CREDIT desviada do classify generico no laco de syncConnection; summary.cardTxs e summary.cardError"
affects: [06-08, 06-10, 06-12, 06-14, 06-18, 06-19]
key-files:
  created: []
  modified:
    - server/src/card-sync.js
    - server/src/sync.js
    - server/test/emu/card-sync.test.js
decisions:
  - "billMonth so e gravado quando vem da Pluggy; sem ele fica null e o mes e derivado na leitura pelo fechamento (D-12), tanto em refreshCardAggregates quanto no cliente"
  - "billTotals e gravado com mergeFields (substitui o mapa inteiro): com merge comum um mes que zera ou muda de fechamento ficaria velho"
  - "Reconciliacao separada por tipo (compra e estorno), para um estorno de mesmo valor nunca religar a uma compra"
  - "Importacao ja existente em bankImports (apagada a mao, revisao do caminho antigo, outro dono) nunca e recriada nem sobrescrita"
commits: 2
plan_head_before: 210b66c9
actuals:
  tokens: 11000
  tasks: 3
  commits: 2
---

# Phase 6 Plan 06: Sync do cartao com compras e agregados por fatura Summary

A conta CREDIT passa a ter caminho proprio no sync: compras e estornos gravados com os campos de cartao e o valor em reais (dolar por `amountInAccountCurrency`), pendente para confirmada sem duplicar (inclusive com id recriado), adocao das linhas antigas pelo mesmo id e `billTotals` por fatura em `cards/{id}`; as seis compras de exemplo dao `{ '2026-12': 18141 }`.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 e 2 (codigo) | cff00672 | `syncCardTransactions`, `refreshCardAggregates`, integracao em `sync.js` (categoria pelo mesmo `learned`/`mapCategory`, erro isolado em `summary.cardError`) |
| 1, 2 e 3 (testes) | 4b8d02da | 21 cenarios novos no emulador (compras, adocao, id recriado, remocao, estorno, pagamento, sem BRL, historico sem corte, manual, agregados, dois casais, apagada a mao, privacidade) |

As tres tarefas foram escritas juntas e commitadas em dois commits (codigo e testes), nao um por tarefa: os cenarios das tarefas 1 a 3 atravessam o mesmo caminho de sync.

## Verificacao

- `npm run test:emu`: 83 de 83 (62 anteriores + 21 novos), incluindo sync, webhook e backfill
- `npm run test:server`: 118 de 118; `npm run test:core:tz`: 842 de 842 em UTC e Asia/Tokyo; `npm run test:static`: 618 passam, 0 falham
- Cliente nao tocado: build e lint nao se aplicam. Sem rede, sem segredos, sem deploy, nenhum pacote novo.

## Deviations from Plan

**1. [Rule 2 - critico] Resposta vazia da Pluggy nao apaga nada**
- `syncCardTransactions` retorna zerado se `fetchAllTransactions` devolve lista vazia: uma falha passageira apagaria todas as pendentes (e as categorias editadas).
- Teste: "resposta vazia da Pluggy nao apaga compra pendente".

**2. [Escolha] billMonth derivado nao e gravado**
- O plano pedia ler `cardSettings` no sync para derivar o mes. Gravar um mes derivado ficaria velho quando o dono corrige o dia de fechamento (D-12). O sync grava `billMonth` so quando a Pluggy entrega e a derivacao fica em `sumBillTotals`/cliente, que le o `closingDay` do mesmo dono. Cobertos: mes derivado, sem fechamento (`unassignedCents`) e `cardSettings` de outro casal ignorado.

**3. [Escolha] Contagem extra e revisao legada**
- `summary.cardTxs` e `counts` trazem tambem `payments`. Revisao legada `review/card_refund` sem lancamento (caminho antigo) fica como esta: o sync nao sobrescreve decisao pendente do dono.

**4. [Processo] TDD**
- Implementacao e testes escritos na mesma sequencia, sem commit RED separado; os testes cobrem cada comportamento do plano e passam.

**5. Observacao fora do escopo**
- Uma rodada intermediaria do emulador mostrou 2 falhas em `check-indexes.test.js` (valor de prova de `cardId` no indice do 06-07); o agente do 06-07 ja ajustou o script e o teste na arvore de trabalho e a rodada final passou 83 de 83. Nao toquei nesses arquivos.

## Known Stubs

Nenhum.

## Riscos para o gate de producao (06-14)

- Leituras do Spark: cada rodada le TODOS os lancamentos do cartao duas vezes (reconciliacao e agregados) mais os `bankImports` ainda desconhecidos; cresce com o historico (D-13, sem teto). Medir no gate; mitigacao futura e leitura incremental (06-19), nunca teto de idade.
- Ordem de publicacao: o indice (ownerId, cardId, date) do 06-07 precisa estar publicado antes do servidor; as consultas do servidor sao so de igualdade e o emulador nao exige indice.
- Este plano grava as compras direto, sem o marcador `historyBaselineAt`; o 06-19 e quem trava a gravacao automatica ate o dono aplicar o historico (D-13). Nao publicar o servidor deste plano sem o 06-18 e o 06-19.
- Duplicidade com lancamento manual (D-12/D-13) continua como `review/duplicate` sem lancamento; a adocao pelo manual e do 06-18.
- Data da compra (campo `date`, `PURCHASE_DATE_FIELD`) e dia do fechamento (`CLOSING_DAY_STARTS_NEXT_BILL`) seguem suposicoes a confirmar com dados reais; parcelas continuam heuristica sem compra parcelada real.
- Adocao do legado corrige as seis compras pelo mesmo id na primeira rodada real: conferir no gate que `billTotals` bate com a fatura do Nubank (181,41).

## Threat Flags

Nenhum alem do plano. T-06-19 (lista fechada, teste com numero, titular, documento e adicionais), T-06-20 (toda consulta e gravacao com `ownerId`, `cardSettings` e `bankImports` alheios ignorados) e T-06-21 (so pendente sem par some, campos do banco apenas) mitigados e testados; T-06-22 e T-06-23: sem log de valores, custo de leitura a medir.

## Self-Check: PASSED

card-sync.js, sync.js e card-sync.test.js existem; commits cff00672 e 4b8d02da existem no historico.
