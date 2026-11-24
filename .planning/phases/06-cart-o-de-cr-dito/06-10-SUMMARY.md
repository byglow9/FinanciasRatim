---
phase: 06-cart-o-de-cr-dito
plan: 10
subsystem: cartao-de-credito
tags: [ui, cartoes, home, fatura, parcelas]
status: complete
requires: [06-01, 06-07]
provides:
  - "pagina /cartoes completa por cartao: limite, fatura atual, status, historico mes a mes, proximas faturas e parcelas a vir (D-10, CENT-03)"
  - "HomeCardSummary: resumo do cartao na Home com link para /cartoes, sem ler compras"
  - "cardLabels (status, mes da fatura, texto de vencimento) e BillStatusChip, BillSummary, BillHistoryList, UpcomingBills"
  - "guarda estatica phase6-cards-ui.test.js"
affects: [06-12, 06-16, 06-20]
key-files:
  created:
    - src/lib/cardLabels.ts
    - src/components/cards/BillStatusChip.tsx
    - src/components/cards/BillSummary.tsx
    - src/components/cards/BillHistoryList.tsx
    - src/components/cards/UpcomingBills.tsx
    - src/components/dashboard/HomeCardSummary.tsx
    - test/static/phase6-cards-ui.test.js
  modified:
    - src/components/cards/CardLimitCard.tsx
    - src/pages/CardsPage.tsx
    - src/components/dashboard/HomeSections.tsx
decisions:
  - "BillHistoryList aceita onOpen(billMonth) e CardsPage ainda nao o passa: a abertura da fatura em detalhe e do 06-12"
  - "Sem somar na interface: UpcomingBills mostra 'Ja lancado' (total da fatura) e as parcelas a vir em linhas separadas, em vez de um total mensal calculado na tela"
  - "Sem as duas datas do dono a fatura aparece sem status e com aviso e link para /configuracoes#contas; com as datas e sem compra na fatura aberta, o status vem de cardBillStatus do nucleo"
  - "Home: um link por cartao para /cartoes e, quando faltam as datas, um segundo link para /configuracoes#contas ao lado (nao dentro), para nao aninhar ancoras"
commits: 3
plan_head_before: 0921343fd90dd45c31080ecccf66e688dbe61045
actuals:
  tokens: 8400
  tasks: 3
  commits: 3
---

# Phase 6 Plan 10: Pagina do cartao e resumo na Home Summary

`/cartoes` virou a area do cartao pedida pelo dono (D-10): por cartao do perfil, limite e uso, fatura atual do banco com status, fechamento, vencimento e dias para vencer, quanto foi gasto em cada fatura mes a mes, proximas faturas e parcelas a vir, e a Home ganhou um resumo que leva ate la.

## Tarefas

| Tarefa | Commit | O que entrega |
| ------ | ------ | ------------- |
| 1 | 40a747ad | `cardLabels`, `BillStatusChip`, `BillSummary`, `BillHistoryList`, `UpcomingBills` |
| 2 | c71760d1 | `CardLimitCard` recebe o limite de `useCardView`; `CardsPage` com uma secao por cartao (carregando, vazio, erro) |
| 3 | 6f594862 | `HomeCardSummary`, montado em `HomeSections` depois das contas fixas, e `phase6-cards-ui.test.js` (11 testes) |

## Verificacao

- `npm run build` e `npm run lint`: sem erros
- `npm run test:static`: 655 passam, 0 falham (inclui `phase6-cards-ui.test.js`, 11 de 11)
- `npm run test:core:tz`: 875 de 875 em UTC e em Asia/Tokyo
- `scripts/ux-audit/audit.mjs` em `/` e `/cartoes` a 360x640: sem rolagem horizontal, sem alvo pequeno, 0 violacoes (em MOCK nao ha cartao, entao `/cartoes` mostrou o estado vazio)
- `scripts/ux-audit/theme.mjs --audit --route /`: 0 violacoes nos dois temas e tamanhos
- Sem rede real, sem segredos, sem pacote novo, sem deploy, sem push.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Falha transitoria de guarda de outro plano**
- **Found during:** Task 2 (`npm run test:static`)
- **Issue:** `phase3-gaps.test.js` (LaunchSheet) falhou com o `LaunchSheet.tsx` do plano 06-11 ainda em edicao.
- **Fix:** nenhuma alteracao minha; reconferido mais tarde e passou (655 de 655).

**2. [Rule 1 - Bug] Guarda dos alvos de 44px parava no `=>` do `onClick`**
- **Found during:** Task 3
- **Issue:** a expressao `<(Link|button)\b[^>]*>` encerrava a tag no `>` de `() =>` e reprovava um botao correto.
- **Fix:** `(?:=>|[^>])*>`. A guarda continua estrita (exige `min-h-11` ou `h-11` em todo botao e link).

### Interpretacoes e limites

- `text-[28px]` aparece no valor da fatura e no titulo, como ja existia no `CardLimitCard` do 06-01 (escala de destaque do 05-UI-SPEC). A guarda aceita so o 28 alem de `text-base` e `text-xs`.
- O plano previa auditores de layout e tema com `/cartoes` e dados simulados; isso e do 06-16 (D-11) e do 06-20 (mocks). `theme.mjs` ainda nao conhece a rota `/cartoes` (falha "--route sem correspondencia"), entao ela foi auditada so em `audit.mjs`. Nao toquei nesses scripts.
- `commits:` e `plan_head_before:` seguem o protocolo, mas o repositorio e compartilhado com os planos 06-08, 06-09, 06-11, 06-13 e 06-17: `git rev-list --count` desde o ledger daria 20. O valor 3 e o dos commits deste plano (`git log --grep "(06-10)"`).

## Known Stubs

Nenhum. `onOpen` de `BillHistoryList` e opcional por desenho (ligado no 06-12) e sem ele as linhas sao so leitura.

## Threat Flags

Nenhum alem do registro do plano. T-06-35 (apelido e nomes so como texto React; a guarda falha com `dangerouslySetInnerHTML`/`innerHTML`), T-06-36 (aviso com a diferenca para o banco; sem as datas nao ha status) e T-06-37 (Home usa so `useCards`; a guarda falha se importar `useCardView` ou `getCardTransactions`) mitigados.

## Riscos

- `CardsPage` chama `useCardView` por cartao e cada chamada reabre `useCards` (assinatura de `cards` e `cardSettings`): para 1 ou 2 cartoes e aceitavel, mas multiplica as leituras de `/cartoes` pelo numero de cartoes.
- A leitura de compras de `/cartoes` e o historico inteiro (D-13) e conta contra a cota do Spark; so a Home foi poupada.
- Nenhuma conferencia visual com dados reais de cartao (simulados sao do 06-20); os estados com fatura, historico e parcelas foram validados por tipos, guarda estatica e leitura do codigo, nao por captura.

## Self-Check: PASSED

Arquivos criados e modificados existem; commits 40a747ad, c71760d1 e 6f594862 existem no historico.
