---
phase: 04-mascote-vint-m
plan: 20
subsystem: ui
tags: [vintem, empty-state, error-state, alerts-bell, couple, savings, reports, settings, cdp, static-guard]
requires: ["04-09", "04-12", "04-16"]
provides:
  - "VintemEmpty sonolento no painel vazio do sino, so fora da rota / (useLocation)"
  - "VintemEmpty neutro em Sem lancamentos neste periodo (Casal)"
  - "VintemEmpty surpreso acima dos erros de pagina de Casal, Porquinho, Relatorios e Configuracoes"
  - "suite empties-more em scripts/ux-audit/vintem-app/empties-more.mjs e test/static/phase4-empty-more.test.js (8 testes)"
affects: [04-18, 04-19]
status: complete
commits: 3
plan_head_before: d6bb4936a6e474dfe9ebba09353276fde548ba12
actuals:
  tokens: 4700
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Peca decorativa como primeiro filho do estado; o erro vira fragmento com a peca e o Notice, sem mexer no Notice"
    - "Suite empties-more reaproveita os helpers exportados de empties.mjs (snapshot, checkPieces)"
key-files:
  created:
    - scripts/ux-audit/vintem-app/empties-more.mjs
    - test/static/phase4-empty-more.test.js
  modified:
    - src/components/layout/AlertsBell.tsx
    - src/pages/CouplePage.tsx
    - src/pages/SavingsPage.tsx
    - src/pages/ReportsPage.tsx
    - src/pages/SettingsPage.tsx
key-decisions:
  - "O sino so monta o Vintem quando pathname !== '/': na Home o hero e o vazio de limites ja somam os dois Vintens permitidos"
  - "Relatorios recebe a peca apenas no erro da pagina; erros internos dos graficos e o EmptyState ficam intactos (uma unica ocorrencia, conferida pela guarda)"
requirements-completed: [MASC-01, MASC-02]
---

# Phase 4 Plan 20: Vintem calado no sino, no Casal e nos erros restantes Summary

**VintemEmpty sonolento no sino sem avisos (so fora da Home), neutro no Casal sem lancamentos e surpreso nos erros de pagina de Casal, Porquinho, Relatorios e Configuracoes, sem mudar nenhum texto, botao ou Notice e sem passar de dois Vintens por tela.**

## Performance

- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 2 criados, 5 modificados
- **Commits:** 3

## Accomplishments

- Sino: `useLocation` e `{pathname !== '/' && <VintemEmpty pose="sonolento" />}` acima de "Sem avisos por enquanto"; texto, legenda e resto do painel intactos.
- Casal: `neutro` no vazio e `surpreso` no erro de carga (fragmento com a peca e o Notice). Porquinho, Relatorios (so o erro da pagina, com `AlertCircle` preservado) e Configuracoes: `surpreso` acima do Notice existente.
- Suite `empties-more` (semente `empty`, 15 verificacoes mais a de console): em `/transacoes` o painel do sino traz exatamente um `[data-pose="sonolento"]` acima do texto, calado, `aria-hidden`, sem filhos focaveis, com no maximo 2 `svg.vt` na tela; em `/` o painel vazio nao tem `[data-pose]`; em `/casal` exatamente uma peca neutra acima do texto e nenhum outro Vintem; sem rolagem horizontal a 360 px.
- Guarda `phase4-empty-more.test.js` (8 testes): pose certa acima de cada texto e Notice, sino condicionado a `pathname` com `useLocation`, Relatorios com uma unica peca, nenhuma pose triste, `VintemEmpty` calado, `scaleProblems` e `touchProblems` limpos nos cinco arquivos.

## Verificacao

- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/vintem-app.mjs --only empties-more`: `FALHAS 0` (rodada duas vezes depois do tracer, conforme o portao de feedback, e de novo apos a Tarefa 2).
- `node --test test/static/phase4-empty-more.test.js`: 8 testes, 0 falhas.
- `npm run test:static`: 434 testes, 433 passam, 0 falhas (1 pulado ja existente). Nenhuma guarda anterior precisou ser editada.

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | b338d76d | sino sonolento fora da Home e suite empties-more; verify repetida e verde antes de expandir |
| 2 | ee282588 | Casal vazio e erros de Casal, Porquinho, Relatorios e Configuracoes; suite estendida |
| 3 | be9c0ca3 | guarda estatica phase4-empty-more |

## Deviations from Plan

None - plan executed exactly as written.

Observacao de processo: executado direto em `main`, sem worktree, por instrucao do orquestrador. As edicoes nao commitadas do dono (ArcGauge, VintemSlot, Vintem, VintemTestPage, home.mjs, phase4-home e phase3-home-components, mais `.planning/milestone.lock` e `.planning/state.json`) ficaram intactas e fora dos commits. `commits: 3` e a medida do ledger (`rev-list` desde `plan_head_before`).

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-04-20-01 (erro de rede nunca vira veredito) mitigado por pose fixa surpreso e guarda que proibe `triste`; T-04-20-02 (excesso de Vintens animados) mitigado pela condicao `pathname !== '/'` no sino e conferido pela suite (no maximo dois por tela).

## Pendente (humano)

- Conferir num celular o sonolento no sino aberto fora da Home, o neutro no Casal vazio e forcar um erro de carga em Casal, Porquinho, Relatorios e Configuracoes para ver o surpreso acima do aviso.

## Self-Check: PASSED

- Arquivos presentes: `scripts/ux-audit/vintem-app/empties-more.mjs`, `test/static/phase4-empty-more.test.js` e os cinco arquivos de `src/` editados.
- Commits presentes em `main`: b338d76d, ee282588, be9c0ca3.
