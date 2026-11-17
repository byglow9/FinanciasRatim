---
phase: 01-funda-o-de-dados-e-acesso
plan: 06
subsystem: database
tags: [firestore, admin-sdk, backfill, backup, bulkwriter, emulator, migration]

requires:
  - phase: 01-03
    provides: "initAdmin (scripts/lib/admin.js), create-users, emulador Auth+Firestore e _helpers de teste"
  - phase: 01-04
    provides: "shared/core/categories.js (buildCategoryDefs, ensureCategoryDefs, resolveCategoryId, DEFAULT_CATEGORY_DEFS) e classify.normalize"
provides:
  - "export-firestore.js: exportAll, importAll (so emulador), countsOf, assertEmulator, assertSafeOutPath e CLI --out"
  - "backfill.js: KNOWN_COLLECTIONS (12), assertHid, runBackfill (dry-run padrao, idempotente) e CLI --hid --apply"
  - "verify.js: runVerify (portao zero sem ownerId/categoryId, linha de base, modo estrito) e CLI --hid --baseline --strict-counts"
  - "rehearsal.js: runRehearsal (ensaio completo no emulador a partir de um backup) e CLI --backup --hid"
affects: [01-10, 01-11, 01-12, 01-13, FUND-02, FUND-05]

tech-stack:
  added: []
  patterns:
    - "Script de admin importavel com CLI so quando e o ponto de entrada (import.meta.url vs pathToFileURL(argv[1]))"
    - "BulkWriter com onWriteError limitado a 3 tentativas, erros em report.errors"
    - "Patch somente com campos ausentes; documento de outro dono vira conflito sem patch"

key-files:
  created:
    - server/scripts/export-firestore.js
    - server/scripts/backfill.js
    - server/scripts/verify.js
    - server/scripts/rehearsal.js
    - server/test/emu/export-import.test.js
    - server/test/emu/backfill.test.js
    - server/test/emu/verify.test.js
    - server/test/emu/rehearsal.test.js
  modified: []

key-decisions:
  - "Timestamp e codificado como { __ts: true, seconds, nanoseconds }, mas o Firestore guarda microssegundos: o ciclo so preserva ate microssegundo (limite do banco, nao do codec)"
  - "O ensaio exige emulador vazio (recusa com dados) para que sobra de execucoes anteriores nao mascare divergencia de contagem"
  - "categoryDefs ja existentes em settings/main sao respeitadas e so recebem orfaos arquivados ao final; nunca sao recalculadas"
  - "assertEmulator extraida de importAll e compartilhada com rehearsal (uma unica protecao contra escrita em producao)"

requirements-completed: [FUND-02, FUND-05]

actuals:
  tokens: 26000
  tasks: 3
  commits: 3
plan_head_before: eaa074cf7b4dac69beba2cc7c9b4043b81ad553c

coverage:
  - id: D1
    description: "Backup por script Admin sem Blaze: exportAll enumera todas as colecoes, Timestamp sobrevive ao ciclo, tipo nao suportado falha, importAll recusa escrever fora do emulador"
    requirement: FUND-02
    verification:
      - kind: unit
        ref: "npm run test:emu -> server/test/emu/export-import.test.js (6 pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Backfill dry-run por padrao, so campos ausentes, idempotente, falha antes de escrever com colecao desconhecida ou settings/main ausente, conflito de ownerId reportado"
    requirement: FUND-02
    verification:
      - kind: unit
        ref: "npm run test:emu -> server/test/emu/backfill.test.js (10 pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "categoryId em transactions, fixedExpenses e bankImports a partir do nome atual, category mantido como copia, categoryDefs com orfaos arquivados"
    requirement: FUND-05
    verification:
      - kind: unit
        ref: "server/test/emu/backfill.test.js#apply: ownerId em tudo, categoryId nas 3 colecoes, orfao vira definicao arquivada, nada existente muda"
        status: pass
    human_judgment: false
  - id: D4
    description: "verify falha por documento sem ownerId, ownerId errado, sem categoryId, settings sem categoryDefs e compara com a linha de base (estrito opcional)"
    requirement: FUND-02
    verification:
      - kind: unit
        ref: "npm run test:emu -> server/test/emu/verify.test.js (10 pass)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Ensaio completo no emulador: importa, dry-run 0, apply, verify estrito, 2a rodada 0, tabela antes e depois, recusa sem emulador"
    requirement: FUND-02
    verification:
      - kind: unit
        ref: "npm run test:emu -> server/test/emu/rehearsal.test.js (5 pass)"
        status: pass
    human_judgment: false
  - id: D6
    description: "CLIs e execucao contra producao (initAdmin com chave de servico real)"
    verification: []
    human_judgment: true
    rationale: "So o caminho do emulador foi executado aqui (CLI de export contra o emulador, com recusa de caminho e permissao 600 conferidas); o uso em producao com credencial real ocorre no Plano 10 (ensaio) e Plano 11 (apply)."

duration: ~25min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 06: Ferramentas de migracao do cutover Summary

**Quatro scripts Admin importaveis (com CLI) para o cutover: backup JSON com Timestamp marcado e restauracao so no emulador, backfill idempotente de ownerId e categoryId com dry-run padrao, verify como portao "zero sem dono" e ensaio completo no emulador a partir de um backup.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files:** 8 criados, 0 modificados

## Accomplishments

- `export-firestore.js`: `exportAll(db)` enumera por `listCollections` (inclusive colecao desconhecida) e devolve `{ meta, collections }`; Timestamp vira `{ __ts, seconds, nanoseconds }`; GeoPoint, referencia de documento e numero nao finito lancam `Tipo nao suportado no backup`. `importAll` exige `FIRESTORE_EMULATOR_HOST` (`assertEmulator`) e usa `bulkWriter`. O CLI recusa caminho dentro do repositorio fora de `backups/`, grava com permissao 600 e imprime so contagens.
- `backfill.js`: `runBackfill` valida hid, colecoes (12 conhecidas) e `settings/main` antes de escrever; patch apenas com campos ausentes (`ownerId`, `categoryId`, `categoryDefs`); orfaos viram definicoes arquivadas (`Pets` -> `pets`); `ownerId` alheio vira conflito sem patch; relatorio `{ apply, hid, collections, categoryDefsAdded, conflicts, errors }`; CLI sai com 1 se houver erros ou conflitos.
- `verify.js`: `runVerify` conta por colecao e acusa sem dono, dono errado, sem `categoryId` (3 colecoes), `settings/main` sem `categoryDefs`, colecao desconhecida e contagem menor que a linha de base; estrito exige igualdade (e exige baseline).
- `rehearsal.js`: `runRehearsal` recusa fora do emulador e com emulador nao vazio; roda import, dry-run (0 escritos), apply, verify estrito e segunda rodada (0); devolve `{ ok, tabela, mismatches }` e imprime linhas `MISMATCH` em qualquer divergencia, sem dados financeiros.

## Task Commits

1. **Task 1: Backup e restauracao por JSON (export-firestore)** - `9f8294f1` (feat)
2. **Task 2: Backfill de ownerId e categoryId** - `083bb923` (feat)
3. **Task 3: verify e ensaio completo (rehearsal)** - `d240dee0` (feat)

**Plan metadata:** commit `docs(01-06): complete plan` (SUMMARY, STATE, ROADMAP, REQUIREMENTS)

## Verification

- `. ./scripts/dev-env.sh && npm run test:emu`: 41 pass, 0 fail (owner-path 6, check-indexes 4, export-import 6, backfill 10, verify 10, rehearsal 5)
- `npm run test:server`: 1 pass; `npm run test:static`: 10 pass, 0 fail
- CLI de export contra o emulador: caminho em `server/` recusado, `backups/` aceito com permissao 600

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Teste de ciclo exigia precisao de nanossegundo que o Firestore nao guarda**
- **Found during:** Task 1
- **Issue:** O plano pede que Timestamp "inclusive nanosegundos" sobreviva ao ciclo; o Firestore (emulador) trunca Timestamp para microssegundos ao gravar, entao `123456789` ns voltava como `123456000`. O codec do backup preserva seconds e nanoseconds exatos; o limite e do banco.
- **Fix:** O teste usa nanossegundos em multiplos de 1000 (maximo que o Firestore preserva) e documenta o motivo em comentario.
- **Files modified:** server/test/emu/export-import.test.js
- **Committed in:** 9f8294f1

**2. [Rule 1 - Bug] Dado de teste invalido: array dentro de array**
- **Found during:** Task 1
- **Issue:** O Firestore rejeita arrays aninhados diretamente (`INVALID_ARGUMENT: invalid nested entity`); o dado de teste inicial era invalido, nao o codec.
- **Fix:** Trocado por array de mapas, que contem arrays.
- **Files modified:** server/test/emu/export-import.test.js
- **Committed in:** 9f8294f1

**3. [Rule 2 - Robustez] Extras alem do plano**
- `assertSafeOutPath` exportada (testavel) para a regra de caminho do CLI (T-01-23); `assertEmulator` extraida de `importAll` e reaproveitada em `rehearsal`; `assertHid` exportada de `backfill.js` e reaproveitada em `verify.js`/`rehearsal.js`; o ensaio recusa emulador nao vazio. Tudo dentro dos arquivos de `files_modified`.
- **Committed in:** 9f8294f1, 083bb923, d240dee0

---

**Total deviations:** 3 auto-fixed (2 bugs de teste, 1 robustez)
**Impact on plan:** Sem mudanca de escopo; os criterios de aceite foram todos atendidos.

## Issues Encountered

- `.env.local` continua rastreado e modificado no working tree (pendencia do dono, herdada); nao foi lido, impresso nem adicionado.
- Resultado de interesse para o Plano 10/11: com `createdAt` em Timestamp com microssegundos, o backup e fiel; qualquer dado com precisao de nanossegundo real nao existe no Firestore.

## User Setup Required

None - nenhum servico externo. O uso em producao (`FIREBASE_SERVICE_ACCOUNT_FILE` fora do repositorio) acontece nos Planos 10 e 11.

## Known Stubs

None.

## Threat Flags

None. Mitigacoes aplicadas: T-01-21 (dry-run padrao, so campos ausentes, idempotente, contagens antes e depois, falha antes de escrever, ensaio no emulador), T-01-22 (`assertEmulator` testado: importAll e rehearsal lancam sem a variavel), T-01-23 (`assertSafeOutPath` + permissao 600; scripts imprimem so contagens, testado no ensaio), T-01-24 (ownerId alheio vira conflito sem patch; verify acusa wrongOwner), T-01-25 (initAdmin do Plano 03 reaproveitado, nenhuma credencial lida ou impressa).

## Next Phase Readiness

- Plano 10 roda o ensaio: `node server/scripts/export-firestore.js --out backups/...` contra producao, depois `node server/scripts/rehearsal.js --backup ... --hid ...` dentro de `firebase emulators:exec`.
- Plano 11 usa `backfill.js` (dry-run, depois `--apply`) e `verify.js --baseline ... --strict-counts` como portao final.
- O backfill exige `settings/main` existente; confirmar isso em producao antes do apply.

## Self-Check: PASSED

- FOUND: server/scripts/export-firestore.js, backfill.js, verify.js, rehearsal.js e os 4 testes em server/test/emu/
- FOUND: commits 9f8294f1, 083bb923, d240dee0
- `commits:` medido por `git rev-list --count eaa074cf..HEAD` = 3 (antes do commit do SUMMARY)

---
*Phase: 01-funda-o-de-dados-e-acesso*
*Completed: 2026-11-17*
