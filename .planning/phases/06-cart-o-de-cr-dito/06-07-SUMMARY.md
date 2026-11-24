---
phase: 06-cart-o-de-cr-dito
plan: 07
subsystem: cartao-de-credito
tags: [firestore, rules, indexes, service, hooks]
status: complete
requires: [06-01, 06-03]
provides:
  - "regra cardSettings por dono em clientCollections() e caso na matriz (CARD-08)"
  - "indice transactions ownerId, cardId, date desc (20 indices, 13 com ownerId)"
  - "tipos de cartao em Transaction e CardSettings"
  - "subscribeCardSettings, saveCardSettings, validateCardSettingsPatch e getCardTransactions"
  - "useCards com settings e displayName; useCardView (limite, faturas, atual e seguintes, a sair, diferenca com o banco)"
affects: [06-06, 06-08, 06-09, 06-10, 06-11, 06-12, 06-14]
key-files:
  modified:
    - firestore.rules
    - firestore.indexes.json
    - test/rules/matrix.test.js
    - test/static/firestore-config.test.js
    - test/static/phase4-persist.test.js
    - server/scripts/check-indexes.js
    - server/test/emu/check-indexes.test.js
    - src/types/index.ts
    - src/services/cards.service.ts
    - src/hooks/useCards.ts
  created:
    - src/hooks/useCardView.ts
decisions:
  - "cardSettings entra em clientCollections() (dono le e escreve, ownerId imutavel); o servidor nunca a escreve, entao o sync nao apaga o que o dono configurou"
  - "saveCardSettings recusa valor invalido com erro (nao corrige em silencio) e, sem Firestore, tambem recusa; mocks sao do 06-20"
  - "useCardView so entrega numero quando cartao, configuracao e compras do MESMO cartao estao carregados; refresh do mesmo cartao mantem as compras anteriores ate chegar a nova leitura"
  - "diferenca com o banco = balanceCents menos total da fatura aberta (0 se nao ha compra nela); nula sem balance ou sem fechamento informado"
commits: 5
plan_head_before: 210b66c98eeb3e3675750c32f90f72cfa75b91db
actuals:
  tokens: 15000
  tasks: 3
  commits: 5
---

# Phase 6 Plan 07: Camada de dados do cartao no cliente Summary

A configuracao do cartao (fechamento, vencimento, apelido, meses pagos) ganhou colecao propria `cardSettings/{accountId}` com regra por dono, as compras de um cartao tem indice `ownerId, cardId, date desc`, e `useCardView` monta a visao completa do cartao so com funcoes do nucleo (`cardLimitView`, `groupBills`, `futureInstallments`).

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 | 8a8ea1a0 | regra `cardSettings`, indice novo, matriz e guarda de indices (20 e 13) |
| 2 | 79efda6d | tipos, `Card` ampliado, `subscribeCardSettings`, `saveCardSettings`, `getCardTransactions` |
| 3 | 5ac8bfdf | `useCards` com configuracao e `useCardView` |
| fix | cff95a06, 1c8648cc | guardas que contavam 19 indices e 12 consultas de prova (ver desvios) |

## Verificacao

- `npm run test:rules`: 13 de 13 (cardSettings percorrido: Ele e Ela do mesmo casal criam, leem, listam, atualizam e apagam; anonimo, sem claim e outro casal negados)
- `node --test test/static/firestore-config.test.js`: 6 de 6 (20 indices, 13 com ownerId primeiro)
- `npm run test:static`: 618 passam, 0 falham (2 puladas ja existentes), incluindo `owner-queries.test.js`
- `npm run test:emu`: 83 de 83 (inclui `check-indexes` com 13 consultas de prova)
- `npm run test:server`: 118 de 118
- `npm run test:core:tz`: 842 de 842 em UTC e em Asia/Tokyo
- `npm run build` e `npm run lint`: sem erros
- Sem rede, sem segredos, sem pacote novo, sem deploy; nada de regras ou indices publicado.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Guarda de 19 indices em phase4-persist.test.js**
- **Found during:** Task 3 (`npm run test:static`)
- **Issue:** a guarda do Vintem afirmava `indexes.length === 19`; o indice novo faz 20. A parte que importa (nenhum indice de vintemInsights) segue valendo.
- **Fix:** 19 para 20 com a mensagem explicando o indice do cartao. Nenhuma afirmacao afrouxada.
- **Files modified:** test/static/phase4-persist.test.js (fora de `files_modified`)
- **Commit:** cff95a06

**2. [Rule 3 - Blocking] check-indexes nao conhecia o campo cardId**
- **Found during:** verificacao final (`npm run test:emu`)
- **Issue:** `server/scripts/check-indexes.js` monta uma consulta de prova por indice composto e lancava "Campo de igualdade sem valor de prova definido: cardId"; o teste contava 12 indices. Sem a correcao, o script de conferencia de indices do gate 06-14 quebraria.
- **Fix:** `cardId` ganha marcador inexistente (como `goalId`); testes passam a esperar 13.
- **Files modified:** server/scripts/check-indexes.js, server/test/emu/check-indexes.test.js (fora de `files_modified`)
- **Commit:** 1c8648cc

**3. Titulos da matriz** (previsto no plano): "11 colecoes" passou a "13 colecoes do cliente" e "3 de banco" (a contagem ja estava desatualizada desde o Vintem).

### Ambiente
Duas rodadas de `test:emu` colidiram com o emulador do plano 06-06 rodando em paralelo (porta 8080 ocupada e dados misturados); repetidas apos a porta liberar, sem mudar codigo.

## Decisoes de interpretacao

- `useCardView.limit` e todos os numeros ficam nulos enquanto carrega (inclusive o limite, que so depende do cartao), para cumprir "nenhum numero de cartao enquanto carrega" sem excecao.
- `upcoming` recebe todas as compras (nao so as parceladas) como base de `futureInstallments`, que usa as compras reais para nao projetar duas vezes a parcela que o banco ja lancou.
- Piso de leitura: primeiro dia do mes de `firstPurchaseAt` (fuso de Sao Paulo); reserva nomeada `FALLBACK_MONTHS_BACK = 12` enquanto o servidor nao gravar o campo (06-06).

## Known Stubs

Nenhum. `subscribeCardSettings` e `getCardTransactions` devolvem vazio sem Firestore e `saveCardSettings` recusa (desenvolvimento simulado e do plano 06-20); `Card.payments` so vem preenchido depois do 06-08.

## Threat Flags

Nenhum alem do registro do plano. T-06-24 (regra por dono, `ownerId` imutavel, matriz com os dois casais, dono so de `ownerId()`), T-06-25 (validacao em `saveCardSettings`: dia 1 a 31, apelido ate 24 sem controle, AAAA-MM ate 36 meses) e T-06-26 (indice declarado e testado) mitigados. Observacao: `validateCardSettingsPatch` nao tem teste unitario proprio (o cliente nao tem ambiente de teste de TypeScript); a cobertura e a revisao do codigo e o `owner-queries.test.js`.

## Self-Check: PASSED

Arquivos modificados e criados existem; commits 8a8ea1a0, 79efda6d, cff95a06, 5ac8bfdf e 1c8648cc existem no historico.
