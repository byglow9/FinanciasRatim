---
phase: 01-funda-o-de-dados-e-acesso
plan: 04
subsystem: core
tags: [shared-core, time, timezone, categories, ledger, node-test, esm, ts-check]

requires:
  - phase: 01-02
    provides: "scripts test:core e test:core:tz, alias @shared, tsconfig.app.json incluindo shared, shared/package.json (ESM)"
  - phase: 01-03
    provides: "server/src/auth.js e regras por dono (sync.js ainda sem escopo por dono, fica para o Plano 07)"
provides:
  - "shared/core/time.js: DEFAULT_TZ, zonedParts, zonedTimeToInstant, monthRange, monthRangeOf, daysRemainingInMonth (Intl, sem dependencias, relogio injetado)"
  - "shared/core/classify.js (movido por git mv, com ts-check e JSDoc) e mapCategory(names, defs) -> { id, name }"
  - "shared/core/categories.js: ids estaveis por slug, add/rename/archive imutaveis, ensureCategoryDefs, categoryDisplayName"
  - "shared/core/ledger.js: toCents, fromCents, monthTotals, accumulatedBalance, weeklySpend (centavos inteiros)"
  - "Guardas de pureza (purity.test.js) e prova de que o servidor importa ../../shared (shared-imports.test.js)"
affects: [01-06, 01-07, 01-08, 01-09, FUND-05, FUND-06]

tech-stack:
  added: []
  patterns:
    - "Nucleo puro em shared/core: ESM, // @ts-check, JSDoc em todo parametro (tsc acusa TS7006 sem tipos), zero import de pacote"
    - "Relogio e fuso sempre por argumento (now, tz); America/Sao_Paulo explicito; nunca new Date() vazio nem Date.now no nucleo"
    - "Dinheiro somado em centavos inteiros e devolvido em reais"
    - "Estruturas de categoria imutaveis: cada operacao devolve um novo array; erros em portugues sem acento"

key-files:
  created:
    - shared/core/time.js
    - shared/core/time.test.js
    - shared/core/categories.js
    - shared/core/categories.test.js
    - shared/core/ledger.js
    - shared/core/ledger.test.js
    - shared/core/purity.test.js
    - server/test/shared-imports.test.js
  modified:
    - shared/core/classify.js
    - shared/core/classify.test.js
    - server/src/sync.js

key-decisions:
  - "mapCategory casa o alvo da regra primeiro por id (slug) e depois por nome normalizado, entao renomear uma categoria nao quebra a classificacao automatica"
  - "weeklySpend filtra os lancamentos para o mes escolhido e arredonda o limite semanal ao centavo (a formula antiga devolvia float cru); com numeros divisiveis o resultado e identico ao antigo"
  - "Mes passado/futuro/fronteira: dia de referencia e hoje em Sao Paulo limitado ao mes (antes do mes = inicio, depois = fim), reproduzindo o OverviewDashboard"
  - "classify mantem o default now = new Date() (excecao documentada pelo plano, D-12 so move); purity.test.js nao proibe isso em classify.js, so em time, categories e ledger"
  - "Sem categorias salvas em settings/main, sync.js usa DEFAULT_CATEGORY_DEFS (11 padrao) em vez de so Outros, como o plano manda"

requirements-completed: []  # FUND-05 e FUND-06 declarados; marcacao fica para os planos que ligam o nucleo ao cliente e aos dados (06, 07, 08, 09)

actuals:
  tokens: 9400
  tasks: 3
  commits: 4
plan_head_before: d025d5cf8249344c1d14eeb83f94a2a24e35773b

coverage:
  - id: D1
    description: "Os 12 casos de classify.test.js movidos continuam passando como caracterizacao, antes de qualquer mudanca de comportamento"
    requirement: FUND-06
    verification:
      - kind: test
        ref: "shared/core/classify.test.js (20 pass logo apos o git mv, 12 de classify + 8 de time)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mes, dia e dias restantes em Sao Paulo, com fronteira 2026-11-01T02:30Z como 31/10, iguais em TZ padrao, UTC e Asia/Tokyo"
    requirement: FUND-06
    verification:
      - kind: test
        ref: "shared/core/time.test.js (npm run test:core e test:core:tz: 50 pass, 0 fail em cada fuso)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Categoria com id estavel por slug; renomear mantem id e historico resolve para o nome atual; arquivar nunca remove; mapCategory devolve { id, name } e ignora arquivadas"
    requirement: FUND-05
    verification:
      - kind: test
        ref: "shared/core/categories.test.js (12 testes) e shared/core/classify.test.js#categoria da Pluggy"
        status: pass
    human_judgment: false
  - id: D4
    description: "Somas em centavos inteiros (0.1 + 0.2 = 0.3), saldo acumulado e gasto semanal com a formula do OverviewDashboard (22 dias, 4 semanas em 09/11; passado 1/1; futuro 31/5; fronteira 30)"
    requirement: FUND-06
    verification:
      - kind: test
        ref: "shared/core/ledger.test.js (7 testes)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nucleo sem import de pacote, sem Date.now e sem new Date() vazio; servidor importa ../../shared por caminho relativo (zero copia)"
    requirement: FUND-06
    verification:
      - kind: test
        ref: "shared/core/purity.test.js (11 testes) e server/test/shared-imports.test.js (npm --prefix server test: 1 pass)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Id de categoria estavel gravado nos dados reais e usado na interface"
    requirement: FUND-05
    verification: []
    human_judgment: true
    rationale: "Aqui so existe a logica pura. O backfill de categoryId (Plano 06/11), a gravacao pelo sync (Plano 07) e a interface (Plano 09) fecham o criterio 4 da fase."

duration: ~15min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 04: Nucleo compartilhado (tempo, classificacao, categorias e ledger) Summary

**`shared/core` em JS puro com `// @ts-check`: tempo em America/Sao_Paulo por `Intl` com relogio injetado, `classify` movido sem mudar numeros, categorias com id estavel por slug (renomear mantem id, excluir arquiva) e ledger em centavos, tudo verde em tres fusos de host e importado pelo servidor por `../../shared`.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 (todas `auto` com `tdd="true"`)
- **Files:** 8 criados, 3 modificados (2 deles movidos por `git mv`)

## Accomplishments

- **Tempo (Task 1):** `zonedParts`, `zonedTimeToInstant`, `monthRange`, `monthRangeOf` e `daysRemainingInMonth` via `Intl.DateTimeFormat` (hourCycle h23). 2026-11-01T02:30Z cai em outubro (inicio 2026-10-01T03:00Z, fim 2026-11-01T02:59:59.999Z); 2028-02 tem 29 dias; 09/11 12h SP tem 22 dias restantes.
- **Movimentacao (Task 2, passo 1):** `git mv` de `server/src/classify.js` e do teste. Os 12 casos passaram sem nenhuma outra mudanca (caracterizacao) antes de mexer no comportamento; `git log --follow shared/core/classify.js` segue o historico. Commit proprio para o rename.
- **Categorias (Task 2):** `DEFAULT_CATEGORY_DEFS` (11, mesmos nomes e cores de `src/types`), `slugify` (a-z, 0-9, hifen; `lazer`, `lazer-2`; fallback `categoria`), `buildCategoryDefs`, `resolveCategoryId`, `ensureCategoryDefs` (orfas viram arquivadas), `addCategory` (reativa arquivada), `renameCategory`, `archiveCategory`, `activeCategoryNames`, `categoryDisplayName`. Tudo imutavel.
- **mapCategory (Task 2):** nova assinatura `(names, defs) -> { id, name }`, so categorias ativas, fallback `outros` -> primeira ativa -> `{ id: 'outros', name: 'Outros' }`. `CATEGORY_RULES` e a ordem das regras ficaram intactas.
- **sync.js (Task 2):** imports por `../../shared/core/`; `getAppCategories` devolve definicoes e a categoria gravada usa `.name`. Escopo por dono e `categoryId` ficam para o Plano 07.
- **Ledger (Task 3):** `toCents`, `fromCents`, `monthTotals`, `accumulatedBalance`, `weeklySpend` com a formula do `OverviewDashboard` (`daysRemaining + 1` do dia de referencia, `ceil(/7)`, saldo / semanas).
- **Guardas (Task 3):** `purity.test.js` varre `time`, `classify`, `categories` e `ledger` (comentarios removidos antes da busca); `shared-imports.test.js` importa `sync.js` e os quatro modulos a partir do servidor.

## Task Commits

1. **Task 1: tempo em Sao Paulo (time.js)** - `c747a44d` (feat)
2. **Task 2a: mover classify para shared/core (caracterizacao)** - `04ce0e7f` (refactor)
3. **Task 2b: categorias com id estavel e mapCategory { id, name }** - `ff3e325c` (feat)
4. **Task 3: ledger em centavos e guardas de pureza** - `05cdbabb` (feat)

**Plan metadata:** commit `docs(01-04): complete plan` (SUMMARY, STATE, ROADMAP)

## Verification

- `npm run test:core`: 50 pass, 0 fail (fuso do host)
- `npm run test:core:tz`: 50 pass, 0 fail em `TZ=UTC` e em `TZ=Asia/Tokyo`
- `npm --prefix server test`: 1 pass, 0 fail (`shared-imports.test.js`)
- `npm run build` (`tsc -b` com `shared` no type-check, mais `vite build`): ok
- Ciclo RED observado nas Tasks 1 e 3 (modulo ausente) antes das implementacoes; Task 2 comecou pelo teste de caracterizacao (20 pass logo apos o `git mv`).

## Decisions Made

Ver `key-decisions` no frontmatter. Em particular: a escolha de casar o alvo de `CATEGORY_RULES` primeiro por id (slug) e depois por nome protege a classificacao automatica contra renomeacoes; o limite semanal arredondado ao centavo e a unica diferenca numerica possivel contra a formula antiga (e so aparece quando saldo / semanas nao e exato em centavos).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tipagem de `CATEGORY_RULES` para o type-check do tsc**
- **Found during:** Task 2 (`npm run build`)
- **Issue:** a lista de tuplas era inferida como `(string | RegExp)[]`, e `tsc` acusava TS2339/TS2345 em `pattern.test` e `normalize`.
- **Fix:** anotacao JSDoc `/** @type {[RegExp, string][]} */`, sem mudar nenhuma regra.
- **Files modified:** shared/core/classify.js
- **Commit:** ff3e325c

Fora isso, o plano foi executado como escrito. Notas de processo: o rename de `classify` ficou em commit proprio (`04ce0e7f`), com o ajuste minimo de import em `sync.js` para o servidor nao quebrar entre commits, o que da 4 commits para 3 tasks.

## Issues Encountered

- `.env.local` continua rastreado e modificado no working tree (pendencia do dono, ja registrada nos Planos 02 e 03); nenhum arquivo `.env*` foi lido nem commitado.

## User Setup Required

None.

## Known Stubs

None.

## Threat Flags

None. Mitigacoes do threat model aplicadas: T-01-12 (somas em centavos; mes por `Intl` com fuso explicito; fronteiras testadas em tres fusos), T-01-13 (`slugify` so produz a-z, 0-9 e hifen; id nunca recalculado; colisao por sufixo), T-01-14 (`purity.test.js` falha com import de pacote em qualquer modulo do nucleo), T-01-15 (aceito: nucleo sem I/O nem log; `classify` sem mudanca de comportamento).

## Next Phase Readiness

- Plano 06 e 07 podem usar `resolveCategoryId`, `ensureCategoryDefs` e `mapCategory` para backfill e gravacao de `categoryId`.
- Plano 08 usa `accumulatedBalance`; Plano 09 usa `weeklySpend`, `categoryDisplayName` e as operacoes de categoria na interface (`@shared/core/...`).
- Limite conhecido: `classify` ainda tem `now = new Date()` como default (nao foi tocado, D-12 so move); chamadores novos devem passar `now` explicitamente.

## Self-Check: PASSED

- FOUND: `shared/core/time.js`, `time.test.js`, `classify.js`, `classify.test.js`, `categories.js`, `categories.test.js`, `ledger.js`, `ledger.test.js`, `purity.test.js`, `server/test/shared-imports.test.js`
- AUSENTES como esperado: `server/src/classify.js`, `server/test/classify.test.js`
- FOUND: commits `c747a44d`, `04ce0e7f`, `ff3e325c`, `05cdbabb`
- `commits:` medido por `git rev-list --count d025d5cf..HEAD` = 4 (antes do commit do SUMMARY)
- `shared/core` sem import de pacote (purity.test.js verde)

---
*Phase: 01-funda-o-de-dados-e-acesso*
*Completed: 2026-11-17*
