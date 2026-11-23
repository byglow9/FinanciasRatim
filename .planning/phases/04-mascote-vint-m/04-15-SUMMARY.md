---
phase: 04-mascote-vint-m
plan: 15
subsystem: ui
tags: [vintem, reactions, launch, toast, goals, cheer, cdp, static-guard]
requires: ["04-02", "04-07", "04-09", "04-12", "04-14", "04-16"]
provides:
  - "launchRaw({ view, kind, categoryId, cents, counted }) e CHEER_MS em shared/core/vintemMood.js"
  - "onLaunched({ kind, categoryId, cents, view, person }), onGoal({ valorCents }) e cheer em VintemContext"
  - "ToastOptions.custom e item custom (superficie clara) na fila de src/components/ui/toast.tsx"
  - "VintemToastBody({ text, reaction }) em src/components/vintem/VintemToast.tsx"
  - "gatilhos em LaunchSheet e GoalsPage; cheer nos fatos de useHomeVintem"
  - "suite reactions em scripts/ux-audit/vintem-app/reactions.mjs e test/static/phase4-reactions.test.js (8 testes)"
affects: [04-17, 04-18, 04-19, 04-20]
status: complete
commits: 3
plan_head_before: e26150370599cea1ad72ff428a165eed2e8209f2
actuals:
  tokens: 8400
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Reacao de lancamento por entrega unica (deliver): slot da Home registrado reage e fala anunciada; sem slot, toast claro do Vintem na fila depois do toast de sucesso"
    - "Comemoracao em memoria do provedor com validade em ms (CHEER_MS); so o tipo entra nos fatos de humor, para os fatos nao mudarem a cada minuto do relogio"
    - "Item custom no toast: superficie bg-surface-2 com borda, Esc e botao de 44 px, mesmo temporizador com pausa em hover e foco"
key-files:
  created:
    - src/components/vintem/VintemToast.tsx
    - scripts/ux-audit/vintem-app/reactions.mjs
    - test/static/phase4-reactions.test.js
  modified:
    - shared/core/vintemMood.js
    - shared/core/vintemMood.test.js
    - src/contexts/VintemContext.tsx
    - src/components/launcher/LaunchSheet.tsx
    - src/components/ui/toast.tsx
    - src/hooks/useHomeVintem.ts
    - src/pages/GoalsPage.tsx
key-decisions:
  - "onLaunched e onGoal compartilham uma unica entrega (deliver): decide slot da Home contra toast do Vintem pela presenca do slot registrado, nunca pela rota"
  - "Guardar no Porquinho arma a comemoracao antes do portao da view: a festa de fundo nao depende da view ter carregado"
  - "A meta batida e decidida em centavos inteiros (toCents) e nao em reais de ponto flutuante"
requirements-completed: [MASC-01, MASC-02, MASC-03, MASC-04]
---

# Phase 4 Plan 15: Reacao do Vintem a lancamentos e metas Summary

**Salvar gasto, receita, depositar ou retirar do Porquinho e fechar uma meta faz o Vintem reagir e falar: no arco da Home com a fala anunciada, e fora dela num toast claro do Vintem na fila depois do toast de sucesso; meta batida e guardar alegram o humor de fundo por 10 minutos sem nunca vencer um limite estourado.**

## Performance

- **Duration:** cerca de 25 min de execucao
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 3 criados, 7 modificados

## Accomplishments

- Nucleo: `launchRaw` devolve pct (inteiro para baixo, sem saturar em 100), restante (nunca negativo), excesso e valor depois do lancamento, so por inteiros; sem linha de limite, receita e Porquinho devolvem so o valor. `CHEER_MS` e 600000 (10 minutos). Testes de fronteira 7499, 7500, 8000, 10000 e 10001, de `counted`, e a prova de que a festa nao vence o estouro (`vintemMood.test.js`, 50 testes).
- `onLaunched` no provedor: melhor esforco inteiro em try e catch sem registrar nada; `bigSpend` por `isSpendSpike` com a linha de base de `loadBaseline` (falha vale como sem linha de base); decisao por `reactionForLaunch` e encaixes por `launchRaw`. Sem view ou com ciclo passado nao faz nada.
- `LaunchSheet` chama `void vintem.onLaunched(...)` na linha seguinte a `toast.show(`, depois de `bumpData()` e `onClose()`; o fluxo de gravacao nao mudou.
- `toast.tsx`: `custom` em `ToastOptions` e `ToastItem`; item custom com `bg-surface-2`, `border-border`, `shadow-float`, botao `h-11 w-11` com `aria-label="Dispensar fala do Vintém"`, Esc enquanto visivel, mesmo temporizador com pausa em hover e foco. O toast comum segue com `bg-action` e "Fechar aviso".
- `VintemToastBody`: Vintem `inline` (48 por 40, decorativo, sem seguir o cursor) numa area de 48 por 48, fala em 16/400 como texto React sem `line-clamp`, `react(reaction)` na montagem. Duracao de 6 s (`VINTEM_TOAST_MS`).
- `onGoal` (festa, situacao `meta-batida`) e estado `cheer` (`meta-batida` ou `porquinho-guardou`, validade `Date.now() + CHEER_MS`); `useHomeVintem` passa `cheer` aos `MoodFacts` enquanto `now.getTime() < untilMs`. `GoalsPage` chama `onGoal` so quando o aporte fecha a meta e mostra `<VintemEmpty pose="surpreso" />` acima do `Notice` do erro de carga, sem alterar texto nem botao.
- Suite `reactions` (19 verificacoes mais a de console) e guarda `phase4-reactions.test.js` (8 testes).

## Verificacao

- `npm run test:core:tz`: 663 testes em UTC e em Asia/Tokyo, 0 falhas.
- `npm run test:static`: 417 testes, 0 falhas (inclui a guarda de formula de orcamento de `phase3-final` e `phase4-reactions`).
- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/vintem-app.mjs` (home, insights, limits, reactions, settings): `FALHAS 0`.
- Suite `reactions`: na Home um gasto de R$ 5 em Lazer deixa `data-situation="lancamento-ok"` no balao e a fala na regiao viva; em Transacoes o toast de sucesso (fundo de acao `rgb(76, 81, 59)`) vem primeiro e o do Vintem (fundo claro `rgb(237, 227, 203)`) em cerca de 3,2 s, botao de 44 por 44, fala de 55 caracteres, Esc fecha; aporte que fecha a meta mostra o toast do Vintem e o que nao fecha nao; de volta a Home com Alimentacao estourada o humor de fundo e `bravo`, nunca `feliz`.

Tracer gate: o `<verify>` da Tarefa 1 (core, static, build, lint e suite reactions) passou de ponta a ponta antes da expansao.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | d74e786b | launchRaw, CHEER_MS, onLaunched na Home, gatilho no LaunchSheet e suite reactions |
| 2 | 3f85298a | item custom do toast, VintemToastBody e toast do Vintem fora da Home |
| 3 | 52cfc07e | onGoal, cheer, GoalsPage com VintemEmpty e guarda phase4-reactions |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Meta batida decidida em centavos, nao em reais**
- **Found during:** Task 3
- **Issue:** o plano manda `contributing.currentAmount + amount >= contributing.targetAmount` em reais (ponto flutuante); somas como 0,1 + 0,2 podem ficar abaixo da meta por um residuo e a festa nao dispararia.
- **Fix:** a mesma comparacao em centavos inteiros (`toCents(currentAmount) + toCents(amount) >= toCents(targetAmount)`), guardada por `phase4-reactions.test.js`.
- **Files modified:** src/pages/GoalsPage.tsx
- **Commit:** 52cfc07e

### Ajustes de contrato (aditivos)

- O `VintemToast` ficou no conteiner INFERIOR real do toast (resolucao 6 do plano), nao no topo descrito no UI-SPEC S4; `data-situation`, regiao viva e fila nao mudaram.
- O arme de `cheer` para `porquinho-guardou` acontece antes do portao `view === null` do `onLaunched`: a festa de fundo nao depende da view ter carregado.
- `useHomeVintem` guarda so o tipo (`cheerKind`) nos fatos de humor, para os fatos nao serem recriados a cada minuto do relogio.
- Nenhum teste estatico existente de toast reprovou; nenhum foi editado.

Fora isso, o plano foi executado como escrito.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Mitigacoes: T-04-15-01 (`buildSlots` limita o encaixe e a fala entra como texto React, sem HTML bruto, coberto por `phase4-reactions.test.js`), T-04-15-02 (`onLaunched` e `onGoal` engolem erro sem `console`; a guarda confere ausencia de `console.` no provedor), T-04-15-03 (a reacao so nasce depois da gravacao confirmada e do `toast.show`, uma vez por submissao), T-04-15-04 (`loadBaseline` le do cache depois da primeira consulta do ciclo e a falha nao bloqueia o lancamento).

## Pendente (humano)

- Conferir no celular real, na Home e em Transacoes, as animacoes e o tom das falas: gasto comum (agacha, salta, moeda na fenda), perto do limite (susto), estourou (bronca com tremida), receita e Porquinho (festa), e a fala no toast claro depois do aviso de sucesso (D-09, D-11).
- O banco de frases das situacoes de reacao ainda aguarda a revisao do dono.

## Notas do ambiente

As edicoes nao commitadas do dono (ArcGauge, VintemSlot, Vintem, VintemTestPage, home.mjs, phase4-home e phase3-home-components, mais `.planning/milestone.lock` e `state.json`) ficaram intactas e fora dos commits (stage por arquivo). Nenhum outro agente commitou no intervalo: `commits: 3` e a medida do ledger.

## Self-Check: PASSED

- Arquivos presentes: src/components/vintem/VintemToast.tsx, scripts/ux-audit/vintem-app/reactions.mjs, test/static/phase4-reactions.test.js.
- Commits presentes em `main`: d74e786b, 3f85298a, 52cfc07e.
