---
phase: 08-vis-o-do-casal-e-multiusu-rio
plan: 01
subsystem: ui
tags: [react, couple, budget, limits, read-only, node-test]

requires:
  - phase: 03-limites-e-pode-gastar
    provides: buildBudgetView, useCycleBudget e os cortes de limitState usados pela Home
provides:
  - coupleBudget no nucleo puro (Pode gastar, gasto e sobra somados, limites somados por categoria)
  - useCoupleBudget (duas leituras de useCycleBudget, cada pessoa no proprio ciclo)
  - TogetherHeadline e CoupleLimits na aba Casal, somente leitura
  - guarda estatica phase8-couple.test.js (somente leitura, Home individual, ordem e escopo)
affects: [08-vis-o-do-casal-e-multiusu-rio, 09-ajustes-finais]

plan_head_before: 9c05d3013241784b966ae51dc73fdf88e0bdde92
actuals:
  tokens: 6600
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Soma do casal nasce de duas BudgetView da Home (sem formula nova)"
    - "Linha de limite com parts.first/second: quem nao tem limite entra no detalhe como sem limite, com o gasto geral da categoria"

key-files:
  created:
    - src/hooks/useCoupleBudget.ts
    - src/components/couple/TogetherHeadline.tsx
    - src/components/couple/CoupleLimits.tsx
    - test/static/phase8-couple.test.js
  modified:
    - shared/core/couple.js
    - shared/core/couple.test.js
    - src/pages/CouplePage.tsx

key-decisions:
  - "Categoria com limite de um so: a barra soma so quem tem limite; o outro aparece no detalhe como 'sem limite, gastou R$ X'"
  - "pct da linha somada nao satura em 100 (igual a BudgetRow da Home); a barra da tela limita sozinha"
  - "O Pode gastar negativo de quem nao tem renda segue somado e visivel, com o aviso 'Sem renda informada em {nome}'"

requirements-completed: [CASAL-01, CASAL-02]

coverage:
  - id: D1
    description: "Pode gastar juntos em destaque acima do seletor Ciclo/Mes, soma dos safeCents de Ele e Ela cada um no proprio ciclo, negativo somando negativo"
    requirement: CASAL-01
    verification:
      - kind: unit
        ref: "shared/core/couple.test.js#coupleBudget: soma o Pode gastar, o gasto e a sobra dos dois"
        status: pass
      - kind: unit
        ref: "test/static/phase8-couple.test.js#os blocos somados vem antes do seletor Ciclo/Mes e dizem o escopo de cada numero"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gasto e sobra somados com chip de estimativa e aviso de sem renda informada"
    requirement: CASAL-01
    verification:
      - kind: unit
        ref: "shared/core/couple.test.js#coupleBudget: sobra projetada de um lado so marca sobraProjected"
        status: pass
      - kind: unit
        ref: "shared/core/couple.test.js#coupleBudget: noIncome por lado, sem esconder o numero"
        status: pass
    human_judgment: false
  - id: D3
    description: "Limites juntos por categoria com detalhe de cada pessoa ao tocar"
    requirement: CASAL-01
    verification:
      - kind: unit
        ref: "shared/core/couple.test.js#coupleBudget rows (6 testes)"
        status: pass
      - kind: other
        ref: "test/static/phase8-couple.test.js (aria-expanded, aria-controls, sem limite, gastou)"
        status: pass
    human_judgment: true
    rationale: "A leitura visual da barra e do detalhe no celular e a conferencia dos numeros contra a Home de cada um dependem do dono (roteiro human-check da Task 3)"
  - id: D4
    description: "Aba Casal somente leitura e Home individual, travado por teste"
    requirement: CASAL-02
    verification:
      - kind: unit
        ref: "test/static/phase8-couple.test.js#somente leitura: o Casal nao importa service de escrita nem hook de gravacao (CASAL-02)"
        status: pass
      - kind: unit
        ref: "test/static/phase8-couple.test.js#a Home continua individual: nenhum arquivo dela conhece o Casal somado (D-17)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-27
status: complete
---

# Phase 8 Plan 01: Casal somado, somente leitura Summary

**Aba Casal com Pode gastar juntos, gasto e sobra somados e limites por categoria somados, tudo vindo de duas buildBudgetView da Home (uma por pessoa, no ciclo dela), sem fórmula nova e sem nenhuma escrita.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-11-27
- **Tasks:** 3 (1 tracer, 1 TDD, 1 guarda estática)
- **Files modified:** 7 (3 existentes alterados, 4 novos)

## Accomplishments

- `coupleBudget({ first, second })` no núcleo puro: soma `safeCents`, `spend.totalCents` e `monthInOne.sobra`, marca `sobraProjected` e `noIncome` por lado, aceita lado nulo e devolve `rows` de limites somados.
- Linhas de limite: teto e gasto contam só quem tem limite; o estado usa `limitState` com os mesmos cortes da Home; ordem por urgência (over, warn, ok), depois gasto desc e categoryId; quem não tem limite entra em `parts` com o gasto vindo de `generalByCategory`.
- `useCoupleBudget` chama `useCycleBudget('ele')` e `useCycleBudget('ela')` sem o modo ciclo atual, então cada um fica no próprio ciclo de salário; devolve também o rótulo de cada ciclo.
- `TogetherHeadline` (acima do seletor Ciclo/Mês) e `CoupleLimits` (barra por categoria, `aria-expanded` e detalhe por pessoa); nomes vêm de `settings.tabNames`. A comparação antiga continua igual, abaixo de um subtítulo "Comparação" que agora fica ao lado do seletor.
- `phase8-couple.test.js` trava somente leitura, Home individual, ordem dos blocos, textos de escopo, ausência de fórmula nova e a escala visual.

## Task Commits

1. **Task 1: Tracer do Pode gastar juntos** - `07d1dc5` (feat)
2. **Task 2: Limites somados por categoria** - `3babbdc` (test, RED) e `5666df1` (feat, GREEN)
3. **Task 3: Guarda de somente leitura, ordem e escopo** - `5818e69` (test)

**Plan metadata:** commit docs(08-01) deste SUMMARY.

## Files Created/Modified

- `shared/core/couple.js` - `coupleBudget`, `limitRows` e typedefs `CoupleBudget`, `CoupleLimitRow`, `CouplePart`
- `shared/core/couple.test.js` - 11 casos novos (soma, negativo, projeção, sem renda, lado nulo, limites por categoria, ciclos diferentes, ordem)
- `src/hooks/useCoupleBudget.ts` - duas leituras de ciclo combinadas por `coupleBudget`
- `src/components/couple/TogetherHeadline.tsx` - Pode gastar juntos, gasto e sobra juntos, escopo e aviso de sem renda
- `src/components/couple/CoupleLimits.tsx` - limites juntos com detalhe por pessoa
- `src/pages/CouplePage.tsx` - blocos novos acima do seletor, estados de carregando e erro próprios
- `test/static/phase8-couple.test.js` - guarda estática do Casal somado

## Decisions Made

- Categoria com limite de um só: a barra soma só esse lado e o detalhe do outro diz "sem limite, gastou R$ X" (pergunta aberta 1 da pesquisa, já resolvida pelo dono).
- `pct` da linha somada segue a `BudgetRow` (inteiro para baixo, sem saturar em 100); só a barra da tela limita a 100.
- A ordenação reaproveita `sortByUrgency` da Home apenas para o estado e desempata por gasto desc e categoryId, como o plano pede.

## Deviations from Plan

None - plan executed exactly as written.

Detalhe de execução: o plano deixa `limitState` fora da Task 1 (as linhas nascem vazias); o import só entrou na Task 2 para não deixar import sem uso no lint.

## Issues Encountered

None.

## Verification

- `npm run test:core:tz` (UTC e Asia/Tokyo): 1316 passam, 0 falham em cada fuso.
- `npm run test:static`: 816 passam, 0 falham. `test/static/phase3-1-couple.test.js` passou sem alteração (11/11).
- `npm run build` e `npm run lint`: verdes.
- Conferência humana pendente (roteiro da Task 3): no celular, "Pode gastar juntos" deve ser a soma dos "Pode gastar" da Home de Ele e da Home de Ela; tocar numa linha de limite mostra o quanto é de cada um; nenhum campo da aba aceita edição.

## Known Stubs

None.

## Threat Flags

None - nenhuma leitura de coleção nova (as duas views vêm de `useCycleBudget`, que já usa o escopo de dono) e nenhuma escrita (T-08-01 coberto pela guarda).

## Next Phase Readiness

Plano independente do isolamento entre grupos; pronto para os demais planos da fase 8.

## Self-Check: PASSED

- Arquivos criados existem (hook, dois componentes, guarda estática) e os 4 commits constam no log.
