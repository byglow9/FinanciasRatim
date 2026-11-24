---
phase: 06-cart-o-de-cr-dito
plan: 13
subsystem: cartao-de-credito
tags: [calendario, sino, alertas, fatura, vencimento]
status: complete
requires: [06-03, 06-07]
provides:
  - "cardBillEvents e cardBillAlerts: vencimento da fatura como item de conta e aviso do sino, funcoes puras (CENT-04)"
  - "buildDayModels aceita cardBillItems: item e pontinho de conta sem efeito em saldo, gasto ou calor"
  - "sino mostra fatura fechada ou atrasada e nao paga, com link para /cartoes"
affects: [06-12, 06-14]
key-files:
  created:
    - shared/core/cardCalendar.js
    - shared/core/cardCalendar.test.js
    - test/static/phase6-calendar.test.js
  modified:
    - shared/core/calendarModel.js
    - shared/core/calendarModel.test.js
    - src/hooks/useCalendarData.ts
    - src/components/layout/AlertsBell.tsx
decisions:
  - "O vencimento da fatura reaproveita o item de conta (kind bill): a tela do Calendario nao mudou"
  - "Evento usa o total da fatura (costCents); o aviso usa o saldo a pagar (total menos pagamentos ligados)"
  - "Eventos cobrem fatura aberta, fechada, futura e paga com total maior que zero; so fechada e atrasada geram aviso"
  - "O sino usa useCards (cards e cardSettings) e nunca as compras do cartao"
commits: 3
plan_head_before: bbd50c5b6f6459321b43e9f558ae60ced5295d0e
actuals:
  tokens: 7300
  tasks: 3
  commits: 3
---

# Phase 6 Plan 13: Calendario e sino com o vencimento da fatura Summary

O vencimento de cada fatura do cartao aparece no Calendario na data que o dono informou e o sino avisa quando a fatura fechada esta perto de vencer ou vencida, sem contar como gasto e sem ler compras.

## O que foi feito

1. **Funcoes puras (`shared/core/cardCalendar.js`).** `cardBillEvents({ cards, cycle, now, tz })` devolve itens no formato de conta do calendario (`billId` `card-<id>-<mes>`, nome "Fatura <apelido>", ocorrencia no vencimento, valor igual ao total da fatura, `paid` quando o status e paga) so dentro do ciclo. `cardBillAlerts({ cards, now, daysBefore, enabled, tz })` devolve aviso para fatura fechada ou atrasada, nao paga, que vence em 0 a `daysBefore` dias ou ja venceu, com dias, valor a pagar e `overdue`. Sem fechamento ou vencimento do dono, ou sem total maior que zero, nada sai (D-04, D-09). O apelido vale sobre o nome do cartao.
2. **Modelo do dia e hook.** `buildDayModels` aceita `cardBillItems` e os desenha junto das contas (mesmo `billStatus` por data, pontinho pendente ou pago) sem somar em saldo, gasto nem calor. `calendarSummary` nao recebe esses itens, entao o resumo "A pagar" continua so com contas fixas. `useCalendarData` filtra os cartoes do perfil de `useCards()` e passa `cardBillEvents` do ciclo.
3. **Sino.** `AlertsBell` ganhou o tipo `card`, calculado por `cardBillAlerts` com `settings.daysBeforeDueDate` e `settings.notificationsEnabled`. A linha segue a de conta fixa: "Fatura Nubank vence em 3 dias" / "venceu ha 2 dias" com valor e dia, icone `CreditCard`, link para `/cartoes`, e conta no selo como os vencimentos de contas fixas.
4. **Guarda estatica** `test/static/phase6-calendar.test.js` (6 casos): hook usa `cardBillEvents`, nada le compras do cartao, `calendarSummary` sem itens do cartao, sino com `cardBillAlerts`, `daysBeforeDueDate`, `notificationsEnabled` e `/cartoes`, guardas anteriores do sino intactas, sem emoji nem console.

## Verificacao

- `npm run test:core:tz`: 875 passam em UTC e em Asia/Tokyo (9 testes novos de `cardCalendar`, 3 novos de `calendarModel`; a suite existente passou sem edicao).
- `node --test shared/core/purity.test.js`: 132 passam.
- `npm run test:static`: 655 passam. Numa rodada intermediaria dois casos (`LaunchSheet compacto`, alvo de 44px em `BillHistoryList`) falharam por arquivos de outros planos ainda em edicao (06-09 e 06-17); reconferidos minutos depois, passaram.
- `npm run build` e `npm run lint`: sem erros.
- Os auditores de layout (`audit.mjs`, `theme.mjs`) nao foram rodados: o plano nao os pede e nao houve mudanca de tela alem de uma linha no painel do sino.

## Deviations from Plan

None - plano executado como escrito. Dois detalhes de interpretacao: o evento usa o total da fatura e o aviso usa o saldo a pagar (descontados os pagamentos ligados); o contador `commits` e medido pelos commits `(06-13)` porque outros planos commitaram em paralelo no mesmo ramo.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-06-44 (aviso so de fechada ou atrasada nao paga, some ao marcar como paga), T-06-45 (vencimento fora de saldo, gasto, calor e resumo, com testes) e T-06-46 (so `cards` e `cardSettings`, guarda estatica) mitigados.

## Riscos

- O sino assina `cards` e `cardSettings` em toda sessao (duas listas pequenas). Se 06-12 mudar os nomes dos campos em `cards`, o mapeamento em `AlertsBell` e `useCalendarData` precisa acompanhar.
- Fatura "atrasada" depende de pagamento detectado ou "marcar como paga" (06-12): sem isso o aviso persiste (T-06-44 aceito).
- O ciclo do Calendario usa o dia de salario; fatura que vence fora do ciclo exibido so aparece quando o dono navega ate ele.
- Os pontinhos ficam por conta do limite de 3 do modelo.

## Self-Check: PASSED

- shared/core/cardCalendar.js, shared/core/cardCalendar.test.js, test/static/phase6-calendar.test.js: presentes.
- Commits fdd5791b, 68a6aec0 e 5984ab1e: presentes.
