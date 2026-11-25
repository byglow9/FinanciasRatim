---
phase: 06-cart-o-de-cr-dito
plan: 18
subsystem: cartao-de-credito
tags: [servidor, sync, adocao, lancamento-manual, nucleo-puro]
status: complete

requires:
  - phase: 06-04
    provides: "reconcileCardTxs (updates, rebinds, creates, vanished)"
  - phase: 06-06
    provides: "syncCardTransactions e o caminho proprio da conta CREDIT"
  - phase: 06-17
    provides: "isManualCardPurchase e o lancamento manual com cardId e cardKind"
provides:
  - "descriptionMatches, matchManualAdoptions e matchReverseAdoptions (shared/core/cardAdopt.js)"
  - "adocao para a frente e reassentamento dentro de syncCardTransactions (campo adoptedFromManual)"
  - "contagens adopted, adoptedLegacy, rehomed, nearMiss e ambiguous em summary.cardTxs"
affects: [06-14, 06-19]

actuals:
  tokens: 16000
  tasks: 3
  commits: 5

commits: 5
plan_head_before: 85067a7285eb5e2af06d3d8093280008de5399f0
plan_head_after: 6a5b9cbe784c3d118dacd117d753021272aa3fd0

tech-stack:
  added: []
  patterns:
    - "decisao pura no nucleo, servidor so monta candidatos e grava"
    - "planejar antes de gravar: as unidades so sao confirmadas no fim (reaproveitavel no ensaio do 06-19)"

key-files:
  created:
    - shared/core/cardAdopt.js
    - shared/core/cardAdopt.test.js
  modified:
    - server/src/card-sync.js
    - server/src/sync.js
    - server/test/emu/card-sync.test.js

key-decisions:
  - "Na duvida nao adota: duas compras de descricao diferente a menos de um dia de distancia uma da outra, para o mesmo manual, ficam sem adocao e contam em ambiguous"
  - "Manual antigo ja apontado por outra importacao (ex.: saida da conta) nao e adotado pelo cartao"
  - "Reassentamento so apaga documento com source bank, no mesmo lote em que o manual assume o bankImports"
  - "Os manuais do cartao saem da mesma consulta (ownerId, cardId) da reconciliacao, sem leitura extra"

requirements-completed: []  # CARD-03, CARD-06 e CARD-07 seguem Pending: testes de emulador nao rodaram

coverage:
  - id: D1
    description: "Regra pura de adocao e reassentamento, sem corte por idade"
    requirement: "CARD-07"
    verification:
      - kind: unit
        ref: "shared/core/cardAdopt.test.js (node --test)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Adocao e reassentamento no sync, sem duplicar, preservando descricao, categoria e nota"
    requirement: "CARD-07"
    verification:
      - kind: integration
        ref: "server/test/emu/card-sync.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel; reescreve documentos financeiros reais"
  - id: D3
    description: "Compra adotada deixa de baixar o saldo e entra nos totais da fatura"
    requirement: "CARD-06"
    verification:
      - kind: integration
        ref: "server/test/emu/card-sync.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel"
  - id: D4
    description: "Historico de 14 meses sem descarte, segunda rodada sem alteracao, dois casais isolados"
    requirement: "CARD-03"
    verification:
      - kind: integration
        ref: "server/test/emu/card-sync.test.js (npm run test:emu)"
        status: unknown
    human_judgment: true
    rationale: "Emulador indisponivel"

duration: cerca de 15min
completed: 2026-11-24
---

# Phase 6 Plan 18: Adoção do lançamento manual pela compra do cartão Summary

**O gasto lançado à mão como Cartão, ou o manual antigo sem cartão, passa a ser adotado pela compra importada em vez de duplicar, nos dois sentidos e sem limite de idade. Os testes de emulador NÃO rodaram: nada deve ser publicado antes deles e antes do 06-19.**

## Antes de qualquer push

1. **Este plano grava sem ensaio e sem cópia de segurança.** O portão do D-13 (`historyBaselineAt`) é do 06-19. Publicar o 06-18 sozinho deixa o sync automático reclassificar lançamentos reais na primeira rodada.
2. **Emulador e regras pendentes** (lista abaixo).
3. Há 14 commits locais à frente de `origin/main` (`a9897c61`, referência local, sem `git fetch`), mais o commit deste resumo. Nenhum push foi feito.

## Tarefas e commits

| Tarefa | Commits | O que entrega |
| ------ | ------- | ------------- |
| 1. Regra pura | `91ce2f2a` (test), `598ef4a7` (feat) | `cardAdopt.js` com 19 testes |
| 2. Sync | `65ce75f7` (test), `71216898` (feat) | adoção, reassentamento, proteção contra remoção, contagens |
| 3. Cenários longos | `6a5b9cbe` (test) | 14 meses, dois casais, idempotência, caminhos que apagam |

## Como funciona

- **Para a frente:** cada compra que seria criada é comparada com os manuais do cartão e os antigos. O adotado recebe valor em reais, data, status, mês da fatura, parcela, moeda, `bankImportId` e `adoptedFromManual`. Descrição, categoria, `categoryId` e nota não são tocadas.
- **Reassentamento:** manual lançado depois assume o `bankImports` e o importado duplicado é apagado no mesmo lote.
- **Manual antigo:** a busca começa na compra mais antiga ainda sem par menos 3 dias, pelo índice existente `(ownerId, person, date)`.
- **findDuplicate:** deixou de ser consultado no cartão; as contas BANK seguem iguais.
- **Para o 06-19:** o resumo traz também `ambiguous`; o ensaio deve imprimir essa contagem junto de `nearMiss`.

## Verificação executada

| Comando | Resultado |
| ------- | --------- |
| `node --test shared/core/cardAdopt.test.js` | 19 de 19 |
| `shared/**/*.test.js` em UTC e Asia/Tokyo (inclui pureza) | 900 de 900 em cada |
| `npm run test:server` | 124 de 124 |
| `npm run test:static` | 647 passam, 11 falham, 7 pulados: as 11 falhas da linha de base |
| `npx eslint shared/core server/src server/scripts server/test` | sem erros |
| `npm run test:emu` | **NÃO RODOU** (Java 8, sem firebase-tools) |
| `npm run test:rules` | **NÃO RODOU** |

Cliente não tocado: `build` não foi rodado. `scripts/dev-env.sh` não funciona nesta máquina; usei o Node 24.15.0 do sistema.

**Simulação, que não conta como emulador:** com um Firestore falso em memória, mantido fora do repositório, passaram `card-sync.test.js` (46 de 46), `sync.test.js` (17 de 17) e `card-payments.test.js` (21 de 21, sem os 2 testes de linha de comando). O maior lote observado teve 400 operações. O falso não confere índices, regras, limites reais nem o Admin SDK.

Na primeira rodada do falso, antes de excluir os 2 testes de linha de comando, eles abriram `reclassify-card-payments.js` em processo filho sem variáveis de emulador. Conferi em seguida que nenhuma variável de credencial estava definida (só presença): o script para antes de abrir o Firestore. Nenhuma produção foi acessada.

## TDD Gate Compliance

- **Tarefa 1:** RED com stub, classificado `RED_EVIDENCE_OK` (a falha alvo foi de asserção: lista de adoções vazia), depois GREEN.
- **Tarefa 2:** testes commitados antes da implementação; o RED (12 cenários novos e a asserção de contagens) foi visto só no Firestore falso.
- **Tarefa 3:** os cenários passaram de primeira sobre o código da tarefa 2; não houve RED nem mudança no servidor.

## Testes de emulador pendentes

`server/test/emu/card-sync.test.js`, "adocao do lancamento manual (D-12, D-13)":

1. adoção para a frente, um só lançamento
2. manual antigo de 10 meses vira compra e deixa de baixar o saldo
3. descrição específica diferente não é adotada (nearMiss)
4. duas lojas igualmente próximas não são adotadas (ambiguous)
5. reassentamento sem recriar o importado
6. manual adotado e manual sem par nunca são removidos
7. segunda rodada não altera nada
8. id recriado em compra adotada
9. outro casal, outra pessoa, entrada, transferência e ligado ao banco nunca são adotados
10. manual antigo ligado a uma saída da conta não é adotado
11. privacidade do documento adotado
12. BANK continua com findDuplicate; cartão não

Mesmo arquivo, "historico longo e isolamento da adocao":

13. 14 meses: 9 adoções, 3 intocados, 51 criações
14. segunda rodada idêntica sem alteração
15. dois casais
16. apelido do cartão alterado
17. manual em outro cartão
18. resumo só com contagens
19. reassentamento de compra que a Pluggy não devolve mais
20. reassentamento sem `bankImports` e importado ligado a outro manual
21. histórico acima de um lote (450 compras)

Também alterado: a asserção de contagens em "seis compras de exemplo ... segunda rodada idempotente".

Por regressão: o restante de `card-sync.test.js`, `sync.test.js`, `card-payments.test.js`, `backfill.test.js`, `check-indexes.test.js`, `export-import.test.js`, `owner-path.test.js`, `rehearsal.test.js`, `verify.test.js` e `test/rules/*.test.js`. As pendências do 06-08 continuam abertas.

**Critérios sem verificação real:** todos os de aceite das tarefas 2 e 3, o índice da busca de manuais antigos em produção, `update` e `delete` no mesmo lote e a contagem de leituras.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Crítico] Casamento ambíguo não é adotado** (`598ef4a7`)
- O plano mandava parear pela menor diferença de data. Com um manual genérico e duas lojas diferentes à mesma distância, a escolha seria arbitrária.
- Agora o par cai quando sobra, a menos de um dia a mais, outra compra de descrição diferente que casaria igual ou melhor. Instrução do orquestrador: na dúvida, não adotar.
- Efeito: o duplicado fica visível e é contado em `ambiguous`. Os casos do plano (idênticos, menor data, cartão antes do legado, menor docId) seguem iguais.

**2. [Rule 2 - Crítico] Manual antigo já apontado por outra importação fica de fora** (`71216898`)
- Uma saída da conta que já marcou o manual como possível duplicado é sinal de que ele não é do cartão.
- Vale só para o legado; o manual lançado como Cartão continua candidato.

**3. [Rule 1 - Bug] Id recriado mantém o vínculo com o manual** (`71216898`)
- O `bankImports` novo sairia com `matchedTransactionId` nulo e a conta bancária poderia reusar o manual adotado como duplicado.

**4. [Rule 3 - Bloqueio] `server/src/sync.js` alterado, fora de `files_modified`** (`71216898`)
- O resumo só soma as chaves que `sync.js` declara. Acrescentei as cinco contagens e removi o argumento `manual`, que o cartão não usa mais.

**5. [Cobertura] Três cenários além do plano** (`6a5b9cbe`): os de número 19 a 21.

## Riscos conhecidos, não corrigidos

1. **Importações do cartão feitas pelo código do 06-06 (se o Railway já publicou).** Compras que ficaram em `review/duplicate` não são recriadas nem adotadas, e não há tela de revisão. Compras já importadas também não adotam manual antigo, porque o legado só casa com criações (regra do plano). Conferir no 06-19 ou no 06-14 antes de aplicar o histórico.
2. **A conta BANK ainda compara com manuais do cartão.** `findDuplicate` do `sync.js` olha só valor e data: uma saída da conta de mesmo valor de um gasto lançado como Cartão pode ficar escondida em `review/duplicate`. Vem do 06-17; o plano mandava não mudar o caminho BANK. Recomendo excluir `cardKind: 'purchase'` desse mapa.
3. **Gasto em dinheiro com descrição genérica** pode ser adotado por uma compra de mesmo valor em até 3 dias. É a regra do D-13, mas vale também depois do primeiro histórico.
4. **Pendente adotada que o banco recria com outro valor ou descrição** deixa o adotado (nunca removido, D-12) e cria a compra nova: duplicado visível, a apagar à mão.
5. **Sem desfazer por documento.** A adoção troca a data do manual e acrescenta o cartão sem guardar os valores anteriores; voltar atrás depende da cópia de segurança do 06-19.
6. **Reassentamento apaga o importado**, junto com categoria ou descrição que o dono tenha editado nele (aceito em T-06-61).
7. **Insights do Vintém** que filtram `source === 'bank'` não enxergam a compra adotada, que não recebe `source`.
8. **Leituras do Spark:** rodada com compra nova lê os lançamentos da pessoa desde 3 dias antes dela; no primeiro histórico, quase tudo.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superfície nova. T-06-59 mitigado pela regra de descrição e pela ambiguidade (resta o risco 3); T-06-60 por `ownerId` e `person` em toda consulta; T-06-61 aceito; nenhum pacote instalado.

## Self-Check: PASSED

`shared/core/cardAdopt.js`, `shared/core/cardAdopt.test.js`, `server/src/card-sync.js`, `server/src/sync.js`, `server/test/emu/card-sync.test.js` existem; commits `91ce2f2a`, `598ef4a7`, `65ce75f7`, `71216898` e `6a5b9cbe` estão no histórico. O self-check cobre só arquivos e commits; os testes de emulador seguem pendentes.
