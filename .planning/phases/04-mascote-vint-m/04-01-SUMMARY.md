---
phase: 04-mascote-vint-m
plan: 01
subsystem: shared-core
tags: [vintem, springs, state-table, blink, mulberry32, node-test]
requires: []
provides:
  - "Spring, SPRING_PARAMS (15 molas), CRITICAL_MIN_K, springZeta, BLINK, blinkEnv, mulberry32 em shared/core/vintemSpring.js"
  - "STATE_KEYS (19), STATE_DEFAULTS, VINTEM_STATES (7), STATE_PARAMS, ACCESSORY_BY_STATE, stateFromPct em shared/core/vintemStates.js"
affects: [04-02, 04-05, 04-09, 04-13]
status: complete
commits: 3
plan_head_before: f1a5e52a42d941f81d7a5ac7800f9e16fa5ff575
actuals:
  tokens: 3900
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Estado como diferenca sobre STATE_DEFAULTS (mesclar antes de usar), tudo Object.freeze"
    - "Acaso so por gerador semeado injetado; tempo so por dt"
key-files:
  created:
    - shared/core/vintemSpring.js
    - shared/core/vintemSpring.test.js
    - shared/core/vintemStates.js
    - shared/core/vintemStates.test.js
  modified: []
key-decisions:
  - "STATE_PARAMS guarda so as diferencas em relacao a STATE_DEFAULTS (como o D() do sketch); o consumidor mescla, como o plano 04-05 ja prevê"
  - "Tabela do UI-SPEC manda sobre o sketch 020 (neutro assimetrico, triste corrigido, sem chaves de boca nem cv unico)"
requirements-completed: [MASC-02, MASC-03]
coverage:
  - id: D1
    description: "Uma mola por chave de expressao assenta em menos de 3 s e nao explode com salto de 1000 e dt de 1/30 s"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemSpring.test.js#cada chave de STATE_KEYS converge ao valor do neutro em menos de 3 s"
        status: pass
  - id: D2
    description: "Sete estados congelados com 19 chaves, neutro esperto e triste corrigido, stateFromPct com fronteiras"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemStates.test.js"
        status: pass
  - id: D3
    description: "Curva do piscar, acaso semeado e amortecimento critico sem overshoot"
    requirement: "MASC-03"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (UTC e Asia/Tokyo)"
        status: pass
---

# Phase 4 Plan 01: Molas e tabela de estados do Vintem Summary

Nucleo puro do Vintem: solver de molas amortecidas (15 molas), curva do piscar de 360 ms, gerador mulberry32 e a tabela dos sete estados com o neutro assimetrico (cvL .30 x cvR .06, ba -6) e o triste corrigido (sy .93, py 5, rt 5, ea 70, es .72).

## Accomplishments

- `Spring` com subpassos de 1/240 s e modo critico (`k >= 420`, `c = 2 sqrt(k m)`); a mola `pp` tem zeta 0,65 e assenta todas as 19 chaves em menos de 3 s, inclusive um salto de 1000 com dt de 1/30 s.
- `STATE_PARAMS` com os sete estados, `ACCESSORY_BY_STATE` e `stateFromPct` com as fronteiras 40/75/100/130 testadas (39, 40, 74, 75, 100, 101, 130, 131).
- `blinkEnv` (fecha 80 ms, segura 40 ms, abre com overshoot de -14%) e `mulberry32`; overshoot critico < .01, orelha livre > .1.
- `purity.test.js` descobriu os dois modulos sem editar lista; `npm run test:core:tz` verde em UTC e Tokyo (464 testes em cada).

## Task Commits

1. Task 1 (tracer): `49594e6b` feat(04-01): mola amortecida e neutro assimetrico no nucleo
2. Task 2: `821028b7` feat(04-01): sete estados do Vintem, acessorios e stateFromPct
3. Task 3: `2ae4857d` feat(04-01): curva do piscar, acaso semeado e modo critico

Tracer gate: o `<verify>` da Task 1 foi reexecutado de ponta a ponta (spring + purity, 77 testes) e passou antes da expansao.

## Deviations from Plan

None - plan executed exactly as written.

Observacao: Task 2 foi feita em RED (import falhando) e GREEN, mas comitada junto (teste e implementacao num unico commit por tarefa, como o plano pede).

## Decisions Made

- `STATE_PARAMS` e uma tabela de diferencas sobre `STATE_DEFAULTS`; testes e consumidores mesclam.
- O plano 04-13 podera ajustar valores de `STATE_PARAMS` se a regressao de pixels exigir (P-14); os testes deste plano fixam os valores atuais do UI-SPEC.

## Known Stubs

None.

## Threat Flags

None. Modulos puros, sem entrada de usuario, rede ou DOM. T-04-01-01 mitigado (subpassos + teste dt 1/30), T-04-01-02 mitigado (`Object.freeze` em todas as tabelas).

## Issues Encountered

`npm run test:rules` nao foi exigido por este plano (nucleo puro) e Java nao e necessario aqui.

## Self-Check: PASSED

- FOUND: shared/core/vintemSpring.js, vintemSpring.test.js, vintemStates.js, vintemStates.test.js
- FOUND commits: 49594e6b, 821028b7, 2ae4857d
