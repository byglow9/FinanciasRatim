---
phase: 03-limites-pode-gastar-e-central
plan: 12
subsystem: apresentacao-home-central
tags: [arco, ritmo, rolagem, limites, acessibilidade, guarda-estatica]
requires: [03-04, 03-06, 03-08, 03-09]
provides:
  - RHYTHM_LEVELS e arcToneFor em src/lib/rhythm.ts
  - ArcGauge (arco SVG do hero com slot de 84px para o mascote)
  - RhythmPill (5 niveis e estado "Aguardando dados do banco")
  - useSectionReveal e useHashReveal (rolagem com destaque, hash so por getElementById)
  - LimitRow e LimitsList (linhas expansiveis de limite com Gasto geral)
  - test/static/phase3-home-components.test.js (guarda do contrato)
affects: [03-16, 03-20, 03-21, 03-22]
tech-stack:
  added: []
  patterns: ["tabela de niveis e tom do arco fora dos componentes (.ts sem componente)", "estado derivado de alternancias do usuario + expandId em vez de efeito", "barra de limite limita o preenchimento a 100 porque BudgetRow.pct nao satura"]
key-files:
  created: [src/lib/rhythm.ts, src/components/dashboard/ArcGauge.tsx, src/components/dashboard/RhythmPill.tsx, src/hooks/useSectionReveal.ts, src/components/limits/LimitRow.tsx, test/static/phase3-home-components.test.js]
  modified: []
decisions:
  - "expandId de LimitsList e o id do elemento no DOM (cat-{categoryId}, o mesmo do hash), para casar direto com o retorno de useHashReveal"
  - "Com um unico limite escondido o link diz 'Ver o outro limite' (singular), em vez de 'Ver os outros 1 limites'"
  - "Progress de cada linha recebe min(max(gasto,0), limite): preenchimento visual nunca passa de 100 (lembrete do 03-06)"
requirements-completed: []
status: complete
commits: 2
plan_head_before: 8ecbeeba61989cbd84e26da037f3b57fb75ab6b9
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 12: Arco, ritmo, rolagem e linhas de limite

Componentes de apresentacao da Home e da Central que so exibem a `BudgetView` pronta: arco do hero, pilula de ritmo de 5 niveis, rolagem com destaque para os atalhos e hashes, e as linhas de limite expansiveis com "Gasto geral", protegidos por guarda estatica.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do nivel do ritmo ao arco e a pilula, com a rolagem de destaque | 91bfc7e0 | rhythm.ts, ArcGauge.tsx, RhythmPill.tsx, useSectionReveal.ts, phase3-home-components.test.js |
| 2 | LimitRow e LimitsList com a linha Gasto geral | f15968b1 | LimitRow.tsx, phase3-home-components.test.js |

Gate do tracer cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 91 passam, 0 falham, 1 pulado pre-existente (7 testes novos em `phase3-home-components.test.js`).
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- Nenhuma exclusao nos commits; o plano 03-11 (deploy de regras) nao foi tocado e nenhum `firebase deploy` rodou.

## Decisoes e conferencias

- Nenhum teste existente quebra de proposito neste plano (so arquivos novos).
- Lembrete do 03-06 aplicado: `BudgetRow.pct` nao satura em 100; a barra recebe `min(max(gasto, 0), limite)` e o texto "passou" usa `excessCents`. `pct` so aparece em texto.
- Estados do limite repetidos em texto e icone (`triangle-alert` e `circle-alert`, cores `-ink`), alem do `role="progressbar"` (T-03-57). Com dado velho (`neutralOk`) so "Em dia" vira neutro.
- T-03-54: so texto React, sem HTML bruto, guardado por teste. T-03-55: hash so por `getElementById(decodeURIComponent(...))` em `try`; guarda proibe `querySelector` com valor dinamico. T-03-56: `RhythmPill` mostra "Aguardando dados do banco" quando suprimido e o arco fica neutro via `arcToneFor(null)`. T-03-58: nenhum `console`.
- Componentes nao calculam orcamento: guarda impede `incomeCents`, `fixedCents`, `safeToSpend`, `perDayCents`, `limitState` e contas de gasto.
- Escala tipografica (12/16) e pesos 400/700 respeitados; sem texto branco, emoji nem HTML bruto, verificado pela guarda.

## Requisitos

Nenhum requisito marcado como concluido. LIM-02, LIM-03, LIM-04, LIM-08, LIM-09 e CENT-02 so se cumprem quando Home e Central montarem estes componentes com a `BudgetView` real (planos 16, 20, 21 e 22); aqui existem so os blocos, sem tela que os use. IDEN-07 ja constava como concluido (03-02).

## Deviations from Plan

None - plan executed exactly as written. (Dentro do texto do plano: "Ver os outros {n} limites" ganhou singular para n = 1; a regra do `eslint-disable` de fast refresh nao foi necessaria porque `useSectionReveal.ts` nao exporta componente.)

## Known Stubs

Nenhum. O slot do mascote exibe o `PiggyBank` por contrato; a Fase 4 troca o conteudo.

## Threat Flags

Nenhum. Sem rede, armazenamento nem superficie nova.

## Verificacao nao feita

Sem jsdom nem navegador (PR-16): foco, rolagem com destaque, animacao do arco e expansao ficam para o UAT humano.

## Self-Check: PASSED

- Arquivos existem: rhythm.ts, ArcGauge.tsx, RhythmPill.tsx, useSectionReveal.ts, LimitRow.tsx e phase3-home-components.test.js.
- Commits 91bfc7e0 e f15968b1 existem; contagem medida `rev-list 8ecbeeba..HEAD` = 2.
