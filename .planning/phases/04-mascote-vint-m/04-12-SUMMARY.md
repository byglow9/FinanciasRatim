---
phase: 04-mascote-vint-m
plan: 12
subsystem: ui
tags: [vintem, home, provider, phrase-picker, live-region, cdp, static-guard]
requires: ["04-02", "04-04", "04-06", "04-07", "04-08", "04-09", "04-10", "04-11"]
provides:
  - "VintemProvider e useVintem (tone, speech, speak, pickPhrase, dismiss, slot, registerSlot) com regiao viva sempre montada"
  - "useHomeVintem({ view, cycle, transactions, enabled, readOnly, insights? }) devolvendo { state, situation, subject, onTap }"
  - "VintemSlot (botao 84x84, data-vintem-state, onTap) e VintemHomeBalloon (data-situation, data-phrase)"
  - "useCycleBudget devolve transactions; Transaction.source?: 'bank'"
  - "scripts/ux-audit/vintem-app.mjs (porta 5196, suites em vintem-app/*.mjs, --only, termina em FALHAS n) e suite home"
  - "test/static/phase4-home.test.js (8 testes)"
affects: [04-13, 04-14, 04-15, 04-16, 04-17]
status: complete
commits: 3
plan_head_before: d134f6f2e24f829acbbc7d50ee5d9ee4f46418ba
actuals:
  tokens: 9700
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Fala por provedor: speak sorteia por pick sobre PHRASES no tom do casal, historico de ids em sessionStorage (vintem:recent:v1)"
    - "Limpeza da fala ao trocar de rota ou de perfil por ajuste de estado durante a renderizacao, sem efeito com setState"
    - "Executor CDP com suites por arquivo: planos paralelos so acrescentam arquivos em scripts/ux-audit/vintem-app/"
key-files:
  created:
    - src/contexts/VintemContext.tsx
    - src/hooks/useHomeVintem.ts
    - src/components/vintem/VintemSlot.tsx
    - src/components/vintem/VintemHomeBalloon.tsx
    - scripts/ux-audit/vintem-app.mjs
    - scripts/ux-audit/vintem-app/home.mjs
    - test/static/phase4-home.test.js
  modified:
    - src/hooks/useCycleBudget.ts
    - src/types/index.ts
    - src/pages/DashboardPage.tsx
    - src/App.tsx
key-decisions:
  - "A fala de entrada dispara uma vez por chave pessoa:ciclo (ref no hook), com announce false; a fala por toque usa announce true"
  - "Tocar num Vintem sonolento so acorda (susto do proprio Vintem) e fala; o giro de lado fica para os demais estados e some com movimento reduzido"
  - "pickPhrase tambem grava o historico de recentes, para linhas em linha nao repetirem frase"
requirements-completed: [MASC-01, MASC-02, MASC-03, MASC-04, MASC-05]
---

# Phase 4 Plan 12: Vintem na Home Summary

**Vintem no arco da Home com humor derivado da BudgetView por deriveVintemState, fala de entrada uma por visita no tom do casal, balao dispensavel sem temporizador, toque que acorda ou gira de lado e regiao viva so para fala provocada.**

## Performance

- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 7 criados, 4 modificados
- **Commits:** 3

## Accomplishments

- Tracer: `VintemProvider` em `App.tsx` entre `LimitAlertsProvider` e `LaunchProvider`, `useHomeVintem` chamado antes dos retornos antecipados da Home, `VintemSlot` como filho do `ArcGauge` (que nao foi editado e segue com o `PiggyBank`).
- Humor de fundo: fatos montados so da `BudgetView` (carregando, sem renda, ciclo passado, dado velho, ritmo, linhas) e decididos pela funcao pura; neutro em todos os casos sem veredito.
- Fala de entrada: sorteio por `pick` sobre `PHRASES` com os encaixes da situacao (categoria, pct, restante, excesso, dias); sem frase possivel o balao nao aparece.
- Regiao viva `p.sr-only[role=status][aria-live=polite]` sempre montada no provedor; vazia depois da fala de entrada, preenchida na fala por toque.
- Toque: `situationForTap` (so `dados-velhos` em dado velho; silencio em somente leitura, ciclo passado e sem renda), giro com `setTurn(true)`, 600 ms, `setTurn(false)`, sem giro com movimento reduzido.
- Executor `vintem-app.mjs`: Vite MOCK em 127.0.0.1:5196, uma aba nova por suite (360 por 640, escala 2, toque), semente por `buildSeed(suite.seed ?? 'full')` mais `extraStorage`, `--only`, saida `FALHAS n`.

## Verificacao

- `npm run build` e `npm run lint` verdes.
- `node scripts/ux-audit/vintem-app.mjs --only home`: 20 verificacoes, `FALHAS 0` (slot 84 por 84, nome acessivel, svg aria-hidden, sete estados, sem rolagem horizontal, fala de entrada, regiao viva, dispensa do balao, toque com giro, movimento reduzido emulado sem perfil).
- `npm run test:static`: 389 testes, 0 falhas (1 pulado ja existente); `phase4-home` e `phase3-home-components` verdes.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | 785ab954 | Provedor minimo, hook, slot, Home, App e executor CDP com suite home |
| 2 | 9195d17f | Fala, balao, regiao viva e silencio nos casos sem veredito |
| 3 | 13caa6a6 | Toque, guarda estatica e suite de toque e movimento reduzido |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum stub de interface. `cycle` e `transactions` entram em `useHomeVintem` sem uso proprio (`cycle.key` so compoe a chave da visita; `transactions` fica reservado) por contrato do plano, para o 04-14 alimentar o detector de insights.

## Threat Flags

Nenhum: o unico armazenamento novo e o sessionStorage com ids de frase (T-04-12-03 mitigado, leitura filtrada e dentro de try).

## Pendente (humano)

- Conferir num celular real o olhar, o giro de lado e o tom das falas, com e sem "reduzir movimento" (verificacao humana da Task 3: D-18, D-11).
- O banco de frases ainda aguarda a revisao do dono (REVIEW.reviewedAt nulo); o tom padrao `sem-filtro` traz palavrao nas frases de toque.

## Self-Check: PASSED

- Arquivos criados presentes: VintemContext.tsx, useHomeVintem.ts, VintemSlot.tsx, VintemHomeBalloon.tsx, vintem-app.mjs, vintem-app/home.mjs, phase4-home.test.js.
- Commits presentes: 785ab954, 9195d17f, 13caa6a6.
