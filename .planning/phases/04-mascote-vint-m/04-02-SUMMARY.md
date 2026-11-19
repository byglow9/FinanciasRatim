---
phase: 04-mascote-vint-m
plan: 02
subsystem: shared-core
tags: [vintem, humor, precedencia, limites, reacao, node-test]
requires:
  - "VINTEM_STATES de shared/core/vintemStates.js (04-01)"
  - "previewLaunch de shared/core/budget.js"
provides:
  - "MOOD_BANDS, limitBand, deriveVintemState, situationForTap, REACTION_MS, reactionState, reactionForLaunch, SAMPLE_SITUATION_BY_STATE em shared/core/vintemMood.js"
  - "tipos JSDoc MoodFacts, MoodResult, VintemState"
affects: [04-03, 04-09, 04-13, 04-14]
status: complete
commits: 5
plan_head_before: cdfed7d5e48a2aaf1b1e1dd3636a3b612bb4c9ed
actuals:
  tokens: 7500
  tasks: 3
  commits: 5
tech-stack:
  added: []
  patterns:
    - "Faixas do limite por inteiros (gasto * 100 contra limite * corte), sem divisao e sem ponto flutuante"
    - "Sem relogio: instante em nowMs e dia em todayKey; entrada por argumento"
key-files:
  created:
    - shared/core/vintemMood.js
    - shared/core/vintemMood.test.js
  modified: []
key-decisions:
  - "Resolucao 1: estourou segue as faixas do UI-SPEC; o tom so troca a faixa de 100 a 130 por cento (suave triste, direto e sem-filtro bravo); acima de 130 e sempre triste"
  - "O corte de 130 compara em centavos (gasto * 100 > limite * 130), entao 13001 de 10000 ja e triste mesmo com pct inteiro 130"
  - "O portao neutro vence ate uma reacao ativa: dado velho nunca gera elogio nem bronca (D-08)"
  - "Sujeito de insight: merchant-repeat vira { merchantKey }, os demais viram { categoryId }; nunca descricao crua (T-04-02-01)"
requirements-completed: []
coverage:
  - id: D1
    description: "Fronteiras 7499, 7500, 7999, 8000, 10000 e 10001 de um limite de 10000, e estourou so quando row.state e over"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemMood.test.js#limitBand: fronteiras em centavos para limite de 10000"
        status: pass
  - id: D2
    description: "Precedencia de D-06b nas nove posicoes, ritmo, sonolento e janela de reacao"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemMood.test.js#precedencia: cada nivel de D-06b vence o seguinte, na situacao escolhida"
        status: pass
  - id: D3
    description: "Dado velho, carregando, sem renda, ciclo passado e somente leitura dao neutro sem situacao"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "shared/core/vintemMood.test.js#portao neutro: cada uma das cinco condicoes devolve neutro sem situacao"
        status: pass
  - id: D4
    description: "reactionForLaunch, REACTION_MS e SAMPLE_SITUATION_BY_STATE em UTC e Asia/Tokyo"
    requirement: "MASC-02"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (504 testes, UTC e Asia/Tokyo)"
        status: pass
---

# Phase 4 Plan 02: Cerebro de humor do Vintem Summary

Funcao pura `deriveVintemState` com a precedencia de D-06b (estourou, gasto grande, perto, atento, leitura de gasto, meta ou aporte, ritmo, sem lancar), mais `reactionForLaunch` que devolve reacao, situacao e categoria de um lancamento novo sem reler nada.

## Tasks

| Task | Nome | Commits |
| ---- | ---- | ------- |
| 1 (tracer) | Faixas do limite viram estado e situacao | f766c506 |
| 2 (tdd) | Precedencia completa, ritmo, sonolento, janela de reacao | ede85655 (RED), fc7560ef (GREEN) |
| 3 (tdd) | Reacao a lancamento novo e duracao das reacoes | 96de13dd (RED), ec5a2b2c (GREEN) |

O gate do tracer (re-rodar o verify do Task 1 de ponta a ponta: 90 testes do vintemMood e da guarda de pureza) passou antes de expandir.

## Verificacao

- `node --test shared/core/vintemMood.test.js shared/core/purity.test.js`: 112 testes, 0 falhas.
- `npm run test:core:tz`: 504 testes em UTC e 504 em Asia/Tokyo, 0 falhas.
- `npm run test:rules` nao foi executado: Java nao existe neste ambiente, e este plano nao toca regras do Firestore.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Esqueleto minimo no passo RED**
- **Found during:** Task 2 e Task 3 (RED)
- **Issue:** Sem as exportacoes, o import do teste falhava com SyntaxError, o que e RED invalido (nao falha na asserção do comportamento).
- **Fix:** O commit RED inclui um esqueleto que devolve valores neutros (`situationForTap` e, no Task 3, `REACTION_MS`, `reactionState`, `reactionForLaunch` e `SAMPLE_SITUATION_BY_STATE`), assim os testes-alvo falham em asserção. O commit GREEN substitui o esqueleto.
- **Files modified:** shared/core/vintemMood.js
- **Commits:** ede85655, 96de13dd

**2. [Rule 1 - Interpretacao] Corte de 130 em centavos**
- **Issue:** O plano diz "pct acima de 130", mas `pct` e inteiro para baixo, entao 13001 de 10000 teria pct 130 e ficaria bravo.
- **Fix:** `overState` compara `gasto * 100 > limite * 130`. A diferenca em relacao a `stateFromPct` (04-01) existe so na casa de 130,0x por cento.
- **Files modified:** shared/core/vintemMood.js

### Decisoes onde o plano era omisso

- Reacao ativa durante o portao neutro: o portao vence (D-08, nunca bronca sobre dado velho).
- `reactionForLaunch` devolve `null` para `kind` desconhecido.
- `situationForTap` segue o plano literalmente (so `readOnly`, `suppressed` e demais); carregando, ciclo passado e sem renda devolvem `toque`. Se a UI quiser calar o toque nesses casos (P-13), o chamador decide.

## Requisitos (tratamento do pedido do orquestrador)

MASC-02 e compartilhado por varios planos da fase (ultimo plano que o lista: 04-20). Este plano nao marcou nada. O plano 04-01 tinha marcado MASC-02 e MASC-03 como completos cedo demais (ultimo plano de MASC-03: 04-15); desfiz as duas marcas em `.planning/REQUIREMENTS.md` (caixas de selecao e tabela de rastreio voltam a Pending).

## Known Stubs

Nenhum.

## Threat Flags

Nenhum: modulo puro, sem rede, leitura nem escrita. Mitigacoes do plano aplicadas: T-04-02-01 (sujeito so com categoryId ou merchantKey), T-04-02-02 (portao neutro com `suppressed`, testado nas cinco condicoes), T-04-02-03 (fronteiras por inteiros e `row.state`, testadas).

## Self-Check: PASSED

- shared/core/vintemMood.js e shared/core/vintemMood.test.js existem.
- Commits f766c506, ede85655, fc7560ef, 96de13dd, ec5a2b2c existem; `git rev-list --count cdfed7d..HEAD` mede 5.
