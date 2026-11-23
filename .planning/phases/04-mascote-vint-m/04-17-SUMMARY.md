---
phase: 04-mascote-vint-m
plan: 17
subsystem: ui
tags: [vintem, empty-state, error-state, home, transactions, calendar, fixed-expenses, cdp, static-guard]
requires: ["04-09", "04-12", "04-16"]
provides:
  - "VintemEmpty surpreso acima dos erros de carga da Home (configuracoes e numeros), de Transacoes, do Calendario e de Contas Fixas"
  - "VintemEmpty neutro em Nenhum limite definido, Nenhuma transacao neste ciclo, Nada encontrado, Nada agendado neste ciclo e Nenhuma conta fixa neste ciclo"
  - "suite empties em scripts/ux-audit/vintem-app/empties.mjs e test/static/phase4-empty.test.js (8 testes)"
affects: [04-18, 04-19, 04-20]
status: complete
commits: 3
plan_head_before: 93004e8fa0a91966e1535e9955a011a7cd62cab6
actuals:
  tokens: 3100
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Peca decorativa montada como primeiro filho do estado, acima do texto contratado; o erro vira fragmento com a peca e o Notice, sem mexer no Notice"
    - "Suite empties com helpers exportados (snapshot, checkPieces) para as proximas telas somarem verificacoes"
key-files:
  created:
    - scripts/ux-audit/vintem-app/empties.mjs
    - test/static/phase4-empty.test.js
  modified:
    - src/pages/DashboardPage.tsx
    - src/components/limits/LimitRow.tsx
    - src/pages/TransactionsPage.tsx
    - src/pages/CalendarPage.tsx
    - src/pages/FixedExpensesPage.tsx
key-decisions:
  - "Erro de carga usa sempre surpreso e nunca triste; a guarda estatica aceita so neutro e surpreso nos cinco arquivos"
  - "Limite de dois Vintens por tela por desenho: hero sem renda, cartao de contas fixas da Home e vazio por filtro de Contas Fixas ficam sem a peca"
requirements-completed: [MASC-01, MASC-02]
---

# Phase 4 Plan 17: Vintem calado nos estados vazios e de erro Summary

**VintemEmpty (neutro nos vazios, surpreso nos erros de carga) montado acima do texto ja contratado na Home, em Transacoes, no Calendario e em Contas Fixas, sem alterar nenhum texto, botao ou Notice e sem passar de dois Vintens por tela.**

## Performance

- **Tasks:** 3 (1 tracer, 2 auto)
- **Files:** 2 criados, 5 modificados
- **Commits:** 3

## Accomplishments

- Home: `VintemEmpty pose="surpreso"` como primeiro filho dos dois retornos de erro (configuracoes e numeros); `VintemEmpty pose="neutro"` dentro do bloco "Nenhum limite definido" de `LimitsList`. O bloco "Falta saber quanto entra" ficou intacto (o hero segue com um unico Vintem).
- Transacoes: surpreso no erro, neutro em "Nenhuma transacao neste ciclo" e em "Nada encontrado". Calendario: surpreso no erro e neutro em "Nada agendado neste ciclo". Contas Fixas: surpreso no erro e neutro em "Nenhuma conta fixa neste ciclo"; o vazio por filtro ("Nenhuma conta pendente"/"Nenhuma conta paga ainda") ficou sem Vintem, por contrato.
- Suite `empties` (semente `empty`): Home com no maximo 2 `svg.vt` visiveis, peca neutra acima do texto de limites e texto do hero preservado; nas rotas `/transacoes`, `/calendario` e `/contas-fixas` exatamente uma peca neutra, nenhum outro Vintem, peca acima do texto, `aria-hidden`, sem filhos focaveis nem botao, e sem rolagem horizontal a 360 px.
- Guarda `phase4-empty.test.js`: pose certa acima de cada texto e de cada Notice (por regex sobre o codigo sem comentarios), textos e botoes originais presentes, ausencia da peca no hero sem renda, no `FixedMonthCard` e no vazio por filtro, nenhuma pose triste, `VintemEmpty` sem `useVintem`/botao/fala, `scaleProblems` e `touchProblems` limpos.

## Verificacao

- `npm run build` e `npm run lint`: limpos.
- `node scripts/ux-audit/vintem-app.mjs --only empties`: 22 verificacoes mais a de console, `FALHAS 0` (rodada duas vezes depois do tracer, conforme o portao de feedback).
- `node --test test/static/phase4-empty.test.js`: 8 testes, 0 falhas.
- `npm run test:static`: 426 testes, 425 passam, 0 falhas (1 pulado ja existente).

## Task Commits

| Tarefa | Commit | Observacao |
|--------|--------|------------|
| 1 (tracer) | a95e7f12 | erros da Home, vazio de limites e suite empties; verify repetida e verde antes de expandir |
| 2 | 87d95d38 | Transacoes, Calendario e Contas Fixas e extensao da suite |
| 3 | a94ad620 | guarda estatica phase4-empty |

## Deviations from Plan

None - plan executed exactly as written.

Observacao de processo: o plano foi executado direto em `main`, sem worktree, por instrucao do orquestrador. As edicoes nao commitadas do dono (ArcGauge, VintemSlot, Vintem, VintemTestPage, home.mjs, phase4-home e phase3-home-components, mais `.planning/milestone.lock` e `.planning/state.json`) ficaram intactas e fora dos commits. `commits: 3` e a medida do ledger (`rev-list` desde `plan_head_before`).

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-04-17-01 (erro de rede nunca vira veredito) mitigado por pose fixa surpreso e guarda que aceita so neutro e surpreso; T-04-17-02 (excesso de Vintens animados) mitigado por desenho e conferido pela suite.

## Pendente (humano)

- Conferir num celular o Vintem calado nos vazios das quatro telas e forcar um erro de carga para ver o surpreso acima do aviso.
- Fora do escopo do plano e ainda sem Vintem: "Sem avisos por enquanto" (sino, sonolento) e "Sem lancamentos neste periodo" (Casal), previstos para outro plano.

## Self-Check: PASSED

- Arquivos presentes: `scripts/ux-audit/vintem-app/empties.mjs`, `test/static/phase4-empty.test.js`, e os cinco arquivos de `src/` editados.
- Commits presentes em `main`: a95e7f12, 87d95d38, a94ad620.
