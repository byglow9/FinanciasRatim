---
phase: 01-funda-o-de-dados-e-acesso
plan: 09
subsystem: ui
tags: [categories, categoryId, settings, react, shared-core, weeklySpend, static-guard]

requires:
  - phase: 01-04
    provides: "shared/core (categories.js, ledger.weeklySpend) com testes"
  - phase: 01-05
    provides: "AuthContext com claims e aba inicial da pessoa no AreaContext"
  - phase: 01-08
    provides: "services por dono e getSettings tolerante a documento parcial"
provides:
  - "Tipos CategoryDef, categoryId em Transaction e FixedExpense, categoryDefs em Settings; DEFAULT_CATEGORIES e DEFAULT_SETTINGS derivados do nucleo"
  - "useArea() com categoryDefs e updateCategoryDefs (grava categoryDefs e categories ativas em settings/main)"
  - "Configuracoes: adicionar, renomear inline e arquivar categorias por id, sem bloquear por lancamentos"
  - "Formularios gravam category (texto) e categoryId; listas, calendario e relatorios mostram o nome atual por id"
  - "OverviewDashboard usa weeklySpend do nucleo (sem formula local com date-fns)"
  - "test/static/category-ids.test.js com grupos T1, T2 e T3"
affects: [01-10, 01-11, FUND-05, FUND-06]

tech-stack:
  added: []
  patterns:
    - "Nome de categoria na interface sempre por categoryDisplayName(item, categoryDefs); lista de escolha por activeCategoryNames"
    - "categoryDefs reconciliado com categories no AreaContext: categories e a fonte de quem esta ativo, para suportar documento antigo e cliente de rollback"

key-files:
  created:
    - test/static/category-ids.test.js
  modified:
    - src/types/index.ts
    - src/contexts/AreaContext.tsx
    - src/pages/SettingsPage.tsx
    - src/components/transactions/TransactionForm.tsx
    - src/components/fixed-expenses/FixedExpenseForm.tsx
    - src/components/transactions/TransactionList.tsx
    - src/components/fixed-expenses/FixedExpenseList.tsx
    - src/components/calendar/MonthCalendar.tsx
    - src/components/reports/IncomeBreakdown.tsx
    - src/pages/ReportsPage.tsx
    - src/components/reports/OverviewDashboard.tsx

key-decisions:
  - "categoryDefs do contexto sao reconciliados com settings.categories (nome na lista = ativa, fora = arquivada, nome novo ganha id); updateCategoryDefs grava as duas coisas juntas, entao no fluxo novo a reconciliacao nao altera nada"
  - "Formularios enviam categoryId so quando resolve (spread condicional), pois o Firestore recusa valor undefined"
  - "Ao editar item cuja categoria esta arquivada, a opcao atual (nome por id) e acrescentada na frente do select"

patterns-established:
  - "Guarda estatica por tarefa com prefixos T1, T2, T3 filtraveis por --test-name-pattern"

requirements-completed: [FUND-05, FUND-06]

actuals:
  tokens: 6000
  tasks: 3
  commits: 4
plan_head_before: 259d9b3471e7bfaf7957f0989d5f373f8b118375

coverage:
  - id: D1
    description: "Categoria com id estavel nos tipos e no contexto; renomear e arquivar por id nas Configuracoes sem bloquear por lancamentos"
    requirement: FUND-05
    verification:
      - kind: unit
        ref: "node --test --test-name-pattern=^T1 test/static/category-ids.test.js (4 pass); npm run build; eslint dos arquivos"
        status: pass
    human_judgment: true
    rationale: "A edicao inline no chip (Enter, Escape, perda de foco) e o fluxo renomear/arquivar contra o armazenamento nao sao exercitados por teste automatico; precisa de verificacao manual com VITE_USE_EMULATOR=true"
  - id: D2
    description: "Formularios gravam categoryId junto de category e mantem a categoria atual ao editar; listas e calendario mostram o nome atual"
    requirement: FUND-05
    verification:
      - kind: unit
        ref: "node --test --test-name-pattern=^T2 test/static/category-ids.test.js (5 pass)"
        status: pass
    human_judgment: true
    rationale: "A guarda estatica confere o uso das funcoes do nucleo; o comportamento do select com categoria arquivada so aparece na interface"
  - id: D3
    description: "Relatorios agregam por nome resolvido por id e o gasto semanal vem de weeklySpend do nucleo"
    requirement: FUND-06
    verification:
      - kind: unit
        ref: "node --test test/static/category-ids.test.js (13 pass); npm run test:core (50 pass); npm run build"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 09: Categorias com id estavel na interface Summary

**Categorias com `{ id, name, color?, archived? }` na interface: Configuracoes adiciona, renomeia (inline) e arquiva por id, formularios gravam `categoryId`, listas, calendario e relatorios mostram o nome atual resolvido por id, e o gasto semanal do OverviewDashboard passa a vir de `weeklySpend` do nucleo.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 (mais o commit RED da guarda estatica)
- **Files:** 1 criado, 11 modificados

## Accomplishments

- `test/static/category-ids.test.js`: 13 testes (T1: tipos, AreaContext e SettingsPage; T2: dois formularios, duas listas e o calendario; T3: tres relatorios e o uso de `weeklySpend`); os grupos falharam antes das mudancas e passam depois.
- `types/index.ts`: `CategoryDef`, `categoryId?` em `Transaction` e `FixedExpense` (o de `AgendaEvent` fica como esta), `categoryDefs?` em `Settings`; `DEFAULT_CATEGORIES` e `DEFAULT_SETTINGS` derivam de `DEFAULT_CATEGORY_DEFS` do nucleo (lista unica, D-10).
- `AreaContext`: `categoryDefs` e `updateCategoryDefs(defs)` (grava `categoryDefs` e `categories` ativas, mesmo `try/catch` + `console.error` + `throw`), no lugar de `updateCategories`; a aba inicial do Plano 05 foi mantida.
- `SettingsPage`: adicionar por `addCategory` (nome de arquivada reativa), botao de lapis com edicao inline (Enter ou perda de foco salva por `renameCategory`, Escape cancela), X arquiva por `archiveCategory` sem consultar lancamentos; erros do nucleo em pt-BR vao para `categoryError`; contador so de ativas; imports de `getTransactionsByCategory` e `getFixedExpensesByCategory` removidos da pagina.
- `TransactionForm` e `FixedExpenseForm`: opcoes de `activeCategoryNames`, categoria atual (nome por id) mantida no select mesmo arquivada, `categoryId` resolvido por `resolveCategoryId` no envio ao lado de `category`.
- `TransactionList`, `FixedExpenseList`, `MonthCalendar`: nome por `categoryDisplayName`.
- `IncomeBreakdown`, `ReportsPage`, `OverviewDashboard`: somas por `categoryDisplayName`, de modo que renomear nao divide o historico; `OverviewDashboard` troca o bloco local (`differenceInCalendarDays`, `startOfMonth`, `endOfMonth`) por `weeklySpend` com `month` de 1 a 12.

## Task Commits

1. **Task 1 (RED): guarda estatica de categorias por id e gasto semanal do nucleo** - `0fb74e97` (test)
2. **Task 1 (GREEN): tipos, AreaContext e Configuracoes** - `54befda5` (feat)
3. **Task 2: formularios gravam categoryId e listas e calendario mostram o nome atual** - `c53ce13c` (feat)
4. **Task 3: relatorios por id e gasto semanal pelo nucleo** - `2c4aba91` (feat)

**Plan metadata:** commit `docs(01-09): complete plan` (SUMMARY, STATE, ROADMAP, REQUIREMENTS)

## Verification

- RED: `node --test --test-name-pattern="^T1"` deu 0 pass e 4 fail antes das mudancas
- T1: 4 pass; T2: 5 pass; completo: 13 pass, 0 fail
- `npm run test:core`: 50 pass, 0 fail (inclui os testes de `weeklySpend` do Plano 04)
- `npm run test:static`: 35 pass, 0 fail, 1 skip (varredura de bundle, so com `DIST_SCAN`)
- `npm run build` e `eslint` dos arquivos tocados verdes em cada tarefa
- Verificacao manual (renomear Lazer para Diversao e arquivar Servicos com `VITE_USE_EMULATOR=true npm run dev`): nao executada neste plano automatizado; fica para a verificacao da fase (coverage D1 e D2 marcados `human_judgment: true`)

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] categoryDefs incorretos para documento antigo ou cliente de rollback**
- **Found during:** Task 1 (AreaContext)
- **Issue:** `getSettings` (Plano 08) mescla `DEFAULT_SETTINGS` com o documento; um documento sem `categoryDefs` recebia as 11 definicoes padrao em vez das do usuario, o que ressuscitaria categorias que ele ja removera e ignoraria as personalizadas. O plano mandava usar `settings.categoryDefs ?? buildCategoryDefs(settings.categories)`, que nao distingue esse caso. Alterar o service era proibido.
- **Fix:** no `AreaContext`, `categoryDefs` e um `useMemo` que parte de `buildCategoryDefs(categories, categoryDefs)` e reconcilia o estado de arquivamento com `settings.categories` (nome na lista = ativa; fora = arquivada; nome novo ganha id). No fluxo novo, `updateCategoryDefs` grava as duas partes juntas, entao nada muda; documento antigo e cliente de rollback passam a funcionar.
- **Files modified:** `src/contexts/AreaContext.tsx`
- **Commit:** `54befda5`

**2. [Rule 1 - Bug] categoryId undefined quebraria a gravacao no Firestore**
- **Found during:** Task 2
- **Issue:** `resolveCategoryId` devolve `null` quando nao acha; enviar `categoryId: undefined` ou `null` indevidamente faria o Firestore recusar o valor (undefined) ou gravar nulo.
- **Fix:** `...(categoryId ? { categoryId } : {})` nos dois formularios.
- **Files modified:** `TransactionForm.tsx`, `FixedExpenseForm.tsx`
- **Commit:** `c53ce13c`

**Total deviations:** 2 auto-fixed (2 bugs). **Impact:** nenhum aumento de escopo; ambas dentro dos arquivos do plano.

## Authentication Gates

Nenhum.

## Issues Encountered

Nenhum bloqueio. `.env.local` continua tracked e modificado fora do escopo (tratado pelo dono) e nao foi tocado.

## Deferred Items (fora do escopo, nao alterados)

- `getTransactionsByCategory` e `getFixedExpensesByCategory` continuam exportados pelos services (nao alterados, Plano 08 e dono); ficaram sem uso na interface e podem ser removidos num plano de limpeza.
- Outros pontos que ainda agrupam por `category` cru (por exemplo graficos que nao passam pelos tres arquivos do plano) nao foram varridos; o plano limitava o escopo aos 11 arquivos.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum novo: a superficie e a do `<threat_model>` do plano (T-01-37 mitigado por arquivar em vez de apagar, id imutavel e exibicao por id com queda para o texto; T-01-38 e T-01-39 aceitos).

## Next Phase Readiness

- Lancamentos e contas fixas novos ou editados carregam `categoryId`; os antigos continuam resolvendo pelo texto ate o backfill do Plano 06 preencher o id.
- Planos seguintes podem assumir `useArea().categoryDefs` e `categoryDisplayName` como unica forma de exibir categoria.

## Self-Check: PASSED

- FOUND: test/static/category-ids.test.js e os 11 arquivos modificados listados em `key-files`
- FOUND commits: 0fb74e97, 54befda5, c53ce13c, 2c4aba91 (`commits: 4` medido com `git rev-list --count` a partir de 259d9b34)
