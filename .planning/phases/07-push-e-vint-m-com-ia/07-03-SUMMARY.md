---
phase: 07-push-e-vint-m-com-ia
plan: 03
subsystem: core
tags: [push, preferencias, silencio, eventos, idempotencia, nucleo-puro]
status: complete
requires:
  - phase: 03-limites
    provides: alerts.js (alertId, thresholdsToFire)
  - phase: 06-cartoes
    provides: cardCalendar.js (cardBillAlerts)
provides:
  - "shared/core/pushPrefs.js: padroes D-06/D-21, normalizacao, validacao fechada, isQuiet, typeEnabled, parseWindow/inWindow, deliveryDecision"
  - "shared/core/pushEvents.js: limitEvents, billEvents, spontaneousEvent, collapseHeld, eventDayKey com id deterministico sem barra"
affects: [07-08, 07-10, 07-11, 07-15]
actuals:
  tokens: 7440
  tasks: 3
  commits: 3
plan_head_before: c336378e6f91156afb66082aededf5ba85b79506
tech-stack:
  added: []
  patterns:
    - "Nucleo puro: o agora entra como argumento, fuso America/Sao_Paulo via zonedParts"
    - "Id de evento = id do marcador unico (D-07), sem barra"
key-files:
  created:
    - shared/core/pushPrefs.js
    - shared/core/pushPrefs.test.js
    - shared/core/pushEvents.js
    - shared/core/pushEvents.test.js
  modified: []
key-decisions:
  - "deliveryDecision aceita kind 'limite' com threshold (vira limite80 ou limite100 via prefKindOf) ou o tipo direto; fatura vem de faturaEnabled (padrao ligado)"
  - "validatePushPrefs e fechado para chaves e tipos, mas campo ausente assume o padrao; mensagens fixas em PUSH_PREFS_ERRORS que nunca ecoam a entrada"
  - "docId troca barra por sublinhado nos ids compostos, para o id servir sempre de id de documento"
  - "collapseHeld mantem por tag o de maior limiar (limites) ou o maior id (demais, ids terminam em mes ou dia, entao o maior e o mais recente)"
requirements-completed: [PUSH-02, PUSH-03, PUSH-04]
---

# Phase 7 Plan 03: Nucleo de regras de entrega de push Summary

Nucleo puro de preferencias, silencio e eventos de push com id estavel: limite 80 e 100 pela mesma matematica do cliente, fatura reaproveitando cardBillAlerts, espontaneo por pessoa e dia de Sao Paulo, silencio que segura limite e fatura e pula o espontaneo.

## Tarefas

| Tarefa | Nome | Commit |
| ------ | ---- | ------ |
| 1 | Tracer: do limite cruzado a decisao de entrega | da87f974 |
| 2 | Preferencias completas, validacao fechada, silencio e janela do espontaneo | c4f92869 |
| 3 | Eventos de fatura e espontaneo, ids estaveis e colapso dos retidos | c6a81fe8 |

## Resultados

- Tracer: gasto que salta para 100 por cento gera o 100 visivel e o 80 silencioso; as 23:30 de Sao Paulo (silencio 22:00 a 08:00) a decisao e `reter`, as 10:00 e `enviar`, igual em UTC e Asia/Tokyo.
- `npm run test:core:tz` passa nos dois fusos (952 testes em cada, incluindo purity.test.js, que descobre os dois modulos novos sozinho).
- Silencio testado nas bordas 21:59, 22:00, 07:59 e 08:00, em janela do mesmo dia e com instantes em UTC que caem em dias diferentes de Sao Paulo.

## Deviations from Plan

None - plano executado como escrito. O campo `commits` reflete so os 3 commits deste plano; o intervalo `plan_head_before..HEAD` tambem contem commits dos planos 07-01 e 07-04, que rodaram em paralelo na mesma branch.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Modulos puros, sem rede, Firestore nem entrada direta; T-07-09, T-07-10 e T-07-11 mitigados por ids deterministicos, fuso de Sao Paulo testado e validacao de esquema fechado.

## Self-Check: PASSED

- shared/core/pushPrefs.js, pushPrefs.test.js, pushEvents.js, pushEvents.test.js existem
- commits da87f974, c4f92869, c6a81fe8 existem
