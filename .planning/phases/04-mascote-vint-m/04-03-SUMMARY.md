---
phase: 04-mascote-vint-m
plan: 03
subsystem: shared-core
tags: [vintem, insights, privacy, merchant-dictionary, baseline, node-test]
requires: []
provides:
  - "INSIGHT_VERSION, INSIGHT_RULES, BRAND_DICTIONARY, ESTABLISHMENT_TOKENS, merchantOf, insightId, buildBaseline, baselineAvgToDay, buildInsights, isSpendSpike, toAiPayload em shared/core/insights.js"
  - "Tipos JSDoc Insight, InsightType, Baseline, BaselineEntry, Merchant"
affects: [04-04, 04-14, 04-15, 04-18]
status: complete
commits: 3
plan_head_before: 5196112565d3dc1fa641187dc5b3c75e8b99ca90
actuals:
  tokens: 12700
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Regras puras sobre lancamentos, limiares em constante congelada (estilo RHYTHM_CUTS)"
    - "Filtro de privacidade em ordem rigida antes do dicionario; chave por hash so com letras a-p"
    - "Linha de base so de ids e numeros (soma acumulada por dia do ciclo)"
key-files:
  created:
    - shared/core/insights.js
    - shared/core/insights.test.js
  modified: []
key-decisions:
  - "Resolucao 2: gasto grande = saida >= 3x o ticket medio da categoria (>= 5 amostras); sem historico, >= 30% do limite do mes; sem os dois nao dispara"
  - "Resolucao 3: politica conservadora de nomes; Pix para ou de, transferencia, TED, DOC, 6+ digitos (mesmo com pontos, tracos ou espacos), e-mail e nome de categoria bloqueiam antes do dicionario"
  - "Resolucao 4: ordinal em metrics.ordinal (igual a count nas regras de repeticao); o texto do ordinal fica com o seletor de frases"
  - "Chave por hash FNV-1a de 32 bits escrita com letras a-p: nunca forma sequencia de 6 digitos"
requirements-completed: []
coverage:
  - id: D1
    description: "Quatro compras de iFood em 7 dias de Sao Paulo viram delivery-heavy com count, total, ordinal e janela, sem IA"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/insights.test.js#iFood quatro vezes na semana vira delivery-heavy com contagem, total, ordinal e janela"
        status: pass
  - id: D2
    description: "Pix para ou de pessoa, CPF, e-mail e nome de categoria nunca viram loja nem aparecem em insight, id, payload ou baseline"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/insights.test.js#varredura de privacidade: nenhum insight, id, payload ou baseline tem dado pessoal"
        status: pass
  - id: D3
    description: "Gasto grande, categoria acima da media, dias sem lancar e limite perto ou estourado com limiares calibraveis"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "shared/core/insights.test.js (spend-spike, category-over-average, days-without-launch, limit-near e limit-over)"
        status: pass
  - id: D4
    description: "Mesma entrada, mesmo resultado em UTC e Asia/Tokyo, e entradas nao sao mutadas"
    requirement: "MASC-04"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (UTC e Asia/Tokyo, 534 testes em cada)"
        status: pass
---

# Phase 4 Plan 03: Detector local de insights e contrato Insight v1 Summary

Detector puro em `shared/core/insights.js` que entende o que foi gasto (delivery, loja repetida, categoria acima da media, gasto grande, dias sem lancar, limite perto e estourado) e o contrato unico Insight v1, com filtro de privacidade que impede nome de pessoa, CPF e e-mail de chegar a id, rotulo, evidencia ou payload.

## Accomplishments

- `merchantOf` em ordem rigida: bloqueio de privacidade (Pix para ou de, transferencia, TED, DOC, 6 ou mais digitos inclusive `123.456.789-01` e cartao com espacos, arroba, nome de categoria), dicionario de marcas (iFood e `ifd`, Rappi e 99Food no grupo `delivery`; Uber, 99, Netflix, Spotify, Mercado Livre, Amazon, Shopee fora dele), estabelecimento por token e, senao, rotulo nulo com chave `h:` mais oito letras.
- `buildInsights` com as sete regras e `rhythm` opcional; severidades, janelas de 7 dias e dias sem lancar pelo calendario de Sao Paulo; resultado ordenado por severidade, tipo e id; entradas congeladas profundamente nao sao alteradas.
- `buildBaseline` (so os 3 ciclos mais recentes, so ids de categoria e numeros), `baselineAvgToDay` e `isSpendSpike` (para a reacao de lancamento do plano 04-15).
- `insightId` deterministico sem barra e `toAiPayload` sem `evidence` (Fase 7); rotulo suspeito vira nulo ate no payload.
- `npm run test:core:tz` verde em UTC e Asia/Tokyo (534 testes em cada); a guarda de pureza descobriu o modulo novo sem editar lista.

## Task Commits

1. Task 1 (tracer): `e41276d3` feat(04-03): detector local com delivery-heavy e filtro de privacidade
2. Task 2: `c5a88743` feat(04-03): regras de repeticao, media, gasto grande, sem lancar e limite
3. Task 3: `fd981d4a` feat(04-03): toAiPayload e varredura de privacidade do contrato Insight

Tracer gate: o `<verify>` da Task 1 (insights + purity, 87 testes) passou de ponta a ponta antes da expansao.

## Deviations from Plan

None - plan executed exactly as written.

Escolhas onde o plano deixava espaco (todas calibraveis em `INSIGHT_RULES`):

- `insightId` entrou ja na Task 1 (o primeiro insight precisa de id); a Task 3 so acrescentou `toAiPayload` e a varredura.
- Constantes extras em `INSIGHT_RULES`: `CATEGORY_RATIO_SEV2_PCT` (160), `CATEGORY_RATIO_SEV3_PCT` (200), `CATEGORY_MIN_CYCLES` (2), `SPIKE_TICKET_MULT_SEV3` (5), `NO_LAUNCH_DAYS_SEV2` (5), `NO_LAUNCH_DAYS_SEV3` (7), `LIMIT_NEAR_PCT` (80).
- `buildBaseline` recebe `categoryDefs` opcional (para resolver categoria por nome como `spendByCategory`) e `cycles` conta so os ciclos com gasto na categoria.
- Gasto grande pelo fallback do limite tem severidade fixa 2; `rhythm` usa severidade 0, 0, 1, 2, 3 para os niveis 0 a 4 e metrica extra `level`.
- Janela do id: dia de hoje para delivery, repeticao, media, sem lancar e ritmo; dia da compra para `spend-spike`; `ciclo` para limite.

## Decisions Made

- Ver `key-decisions` no frontmatter (resolucoes 2, 3 e 4 do planejamento).
- Ordem de resolucao do nome: filtro de privacidade vence ate o dicionario ("Pix para iFood" nao e loja), de proposito, pela politica conservadora.

## Known Stubs

None.

## Threat Flags

None. Modulo puro, sem rede, DOM nem armazenamento. T-04-03-01 e T-04-03-02 mitigados (filtro em ordem rigida, evidencia so com ids e dias, varredura de privacidade); T-04-03-03 mitigado (rotulo limpo de marcacao e truncado em 24 caracteres); T-04-03-04 aceito (cache da linha de base e do plano 04-14).

## Issues Encountered

`npm run test:rules` nao se aplica a este plano (nucleo puro, sem regras do Firestore) e Java nao e necessario aqui.

Requisito MASC-04: nao marcado como concluido em REQUIREMENTS.md porque os planos 04-04, 04-07, 04-08, 04-06, 04-12, 04-14, 04-15, 04-16, 04-18 e 04-19 tambem o listam. Nenhuma marca precisou ser desfeita.

## Self-Check: PASSED

- FOUND: shared/core/insights.js, shared/core/insights.test.js
- FOUND commits: e41276d3, c5a88743, fd981d4a
