---
phase: 01-funda-o-de-dados-e-acesso
plan: 07
subsystem: api
tags: [express, firebase-admin, auth, cors, firestore, sync, pluggy, ownerId, categoryId]

requires:
  - phase: 01-03
    provides: "requireOwner (auth.js), indices ownerId+person+date, emulador Auth+Firestore e _helpers de teste"
  - phase: 01-04
    provides: "shared/core (time.monthRange, categories, classify.mapCategory devolvendo { id, name })"
provides:
  - "app.js: createApp({ verifyToken, db, pluggy, sync, origins, now }) testavel, /api so com token do Firebase e Origin fechada"
  - "auth.js: parseOrigins e originGuard (alem de requireOwner)"
  - "index.js: bootstrap enxuto com ALLOWED_ORIGINS obrigatoria e agendador sem hid"
  - "sync.js: syncConnection exige ownerId; ownerId e categoryId em bankImports e transactions; syncAll({ hid }) por chave com fila unica; cleanExistingDescriptions(db, hid)"
affects: [01-08, 01-10, 01-11, FUND-04, FUND-05, FUND-07]

tech-stack:
  added: []
  patterns:
    - "Fabrica createApp com dependencias injetadas (verificador, db, Pluggy, sync, relogio) para teste HTTP sem rede"
    - "Admin SDK ignora regras: todo handler usa req.owner.hid e toda consulta do sync filtra por ownerId"
    - "Execucoes por chave (hid ou todas) compartilhadas em Map, com fila unica entre chaves"

key-files:
  created:
    - server/src/app.js
    - server/test/app.test.js
    - server/test/emu/sync.test.js
  modified:
    - server/src/auth.js
    - server/src/index.js
    - server/src/sync.js
    - server/.env.example

key-decisions:
  - "Conexao existente sem ownerId (legado antes do backfill) e tratada como de outro dono no POST/DELETE (403); o agendador a registra em lastSyncError ate o backfill rodar"
  - "POST /api/connections so consulta a Pluggy (fetchItem) ao criar a conexao; checagem de dono vem antes de qualquer efeito externo"
  - "syncAll recusa hid vazio ou nao string (rejeita) para que um hid vazio nunca vire 'sincronizar tudo'"
  - "settings/main so fornece categoryDefs ao dono quando nao tem ownerId ou ele coincide; senao categorias padrao"

patterns-established:
  - "Recusa de Origin por middleware proprio (originGuard) alem de cors com lista; sem Origin passa porque o token e o portao real"
  - "Learned map guarda { categoryId, category } e descarta definicao arquivada ou ausente; o nome gravado e sempre o da definicao atual"

requirements-completed: [FUND-04, FUND-05, FUND-07]

actuals:
  tokens: 10600
  tasks: 2
  commits: 2
plan_head_before: 170e550af21865d3c47970de9636f961cf11a245

coverage:
  - id: D1
    description: "/api recusa chamada sem token, com token invalido (401) ou sem hid (403); x-api-key sozinha nao autentica; Origin fora da lista recebe 403 mesmo com token valido; preflight libera Authorization"
    requirement: FUND-04
    verification:
      - kind: integration
        ref: "server/test/app.test.js (19 testes HTTP, todos pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dono sempre vindo do token: ownerId do corpo ignorado; POST de conexao de outro dono 403 sem sincronizar; DELETE confere o dono antes de chamar a Pluggy; sync e clean-descriptions recebem o hid do token"
    requirement: FUND-04
    verification:
      - kind: integration
        ref: "server/test/app.test.js#POST /api/connections grava ownerId do token e ignora o do corpo; DELETE de conexao de outro dono responde 403 sem chamar a Pluggy nem apagar"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sync grava ownerId e categoryId (category com nome atual) em bankImports e transactions, escopado ao dono, com conexao sem dono virando erro sem escrita"
    requirement: FUND-05
    verification:
      - kind: integration
        ref: "npm run test:emu -> server/test/emu/sync.test.js (7 pass)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Imagem Docker da raiz constroi e importa app.js e sync.js sob Node v22.23.5 com firebase-admin 14"
    requirement: FUND-07
    verification:
      - kind: other
        ref: "docker build -t coinki-server . && docker run --entrypoint node coinki-server -e (v22.23.5, imports-ok)"
        status: pass
    human_judgment: false

duration: ~30min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 07: Servidor com token do Firebase e sync por dono Summary

**API Express que aceita so ID token do Firebase com Origin em lista fechada (createApp testavel, requireOwner e originGuard) e sync bancaria que grava ownerId e categoryId por dono, sem misturar casais e sem rodar duas conexoes ao mesmo tempo.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2
- **Files:** 3 criados, 4 modificados

## Accomplishments

- `createApp(deps)` extrai o app do `index.js`: `cors({ origin: origins })`, `/health` publico e `app.use('/api', originGuard(origins), requireOwner(verifyToken))`. A chave `x-api-key`, `APP_API_KEY` e `timingSafeEqual` sairam; origens vazias fazem a fabrica lancar erro.
- Todos os endpoints usam `req.owner.hid`: conexao nova grava `ownerId` do token e `importFrom` por `monthRange(now()).start` do nucleo; existente de outro dono responde 403 antes de qualquer efeito, mesmo dono em outra pessoa 409; DELETE carrega o documento e confere o dono antes de chamar a Pluggy.
- `index.js` virou bootstrap: exige `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `FIREBASE_SERVICE_ACCOUNT` e `ALLOWED_ORIGINS`; avisa se `APP_API_KEY` ainda existir; o agendador segue chamando `syncAll` sem hid.
- `sync.js`: `syncConnection` exige `ownerId` (sem ele: `summary.error`, `lastSyncError` e nenhuma escrita); consultas de transactions e bankImports filtradas por `ownerId`; `bankImports` e `transactions` gravam `ownerId`, `categoryId` e `category` (nome atual); o mapa `learned` guarda `{ categoryId, category }` e ignora categoria arquivada ou desconhecida; `settings/main` so vale para o dono certo.
- `syncAll(db, pluggy, { hid })` compartilha a execucao por chave e usa uma fila unica entre chaves; `cleanExistingDescriptions(db, hid)` exige hid e usa so consultas de igualdade (`ownerId`, `source`).

## Task Commits

1. **Task 1: createApp com token do Firebase, Origin fechada e escopo por dono** - `d0cf3682` (feat)
2. **Task 2: Sync com ownerId e categoryId, escopo por dono e serializacao** - `f7514708` (feat)

**Plan metadata:** commit `docs(01-07): complete plan` (SUMMARY, STATE, ROADMAP, REQUIREMENTS)

## Verification

- `. ./scripts/dev-env.sh && npm --prefix server test`: 20 pass, 0 fail (app.test.js 19, shared-imports 1)
- `npm run test:emu`: 0 fail; sync.test.js 7 pass (mais owner-path, backfill, verify, rehearsal, export-import e check-indexes verdes)
- Docker: build ok; `node -e` dentro da imagem imprime `v22.23.5` e `imports-ok`
- Verificacoes estaticas: nenhum `x-api-key`/`timingSafeEqual` em `server/src`; `.env.example` sem `APP_API_KEY` e com `ALLOWED_ORIGINS` obrigatoria

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] syncAll recusa hid invalido**
- **Found during:** Task 2
- **Issue:** `hid ?? '*'` com `hid` vazio sincronizaria todas as conexoes (escopo vazando para o endpoint do usuario).
- **Fix:** `syncAll` rejeita com `syncAll: hid invalido` se `hid` for definido e nao for string nao vazia; teste cobre `hid: ''`.
- **Files modified:** server/src/sync.js, server/test/emu/sync.test.js
- **Commit:** f7514708

**2. [Process] Task 2: implementacao escrita antes do teste de emulador**
- **Found during:** Task 2
- **Issue:** a ordem RED primeiro nao foi seguida na Task 2 (o `sync.js` foi alterado e so depois o `sync.test.js` foi escrito e executado). Nao houve execucao do teste em vermelho contra o codigo antigo.
- **Impacto:** os 7 testes passam contra o codigo novo; nao foi demonstrado que cada um falharia antes. Task 1 seguiu RED (app.test.js falhou por app.js ausente) e depois GREEN.
- **Commit:** f7514708

**3. [Plan nuance] POST /api/connections nao chama fetchItem para conexao ja existente**
- A Pluggy so e consultada ao criar o documento; para existente do mesmo dono, `syncConnection` ja faz `fetchItem`. Evita efeito externo antes da checagem de dono.

**Total deviations:** 1 auto-fix (Rule 2), 1 desvio de processo (TDD), 1 ajuste de ordem. Impacto: sem mudanca de escopo.

## Authentication Gates

Nenhum.

## Issues Encountered

Nenhum bloqueio. `.env.local` continua tracked e modificado fora do escopo deste plano (tratado pelo dono) e nao foi tocado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum novo: a superficie (endpoints /api, Admin SDK, Pluggy) e a do `<threat_model>` do plano (T-01-26 a T-01-32, todas mitigadas e cobertas por teste).

## Next Phase Readiness

- Servidor pronto para o front enviar `Authorization: Bearer` (Plano seguinte do front de banco). `ALLOWED_ORIGINS` precisa estar definida no Railway antes do deploy; `APP_API_KEY` pode ser removida do ambiente.
- Conexoes existentes em `bankConnections` precisam do `ownerId` via backfill (Plano 06) antes do cutover; ate la o agendador registra `lastSyncError` nelas sem escrever dados.

## Self-Check: PASSED

- FOUND: server/src/app.js, server/test/app.test.js, server/test/emu/sync.test.js, server/src/auth.js, server/src/index.js, server/src/sync.js, server/.env.example
- FOUND commits: d0cf3682, f7514708 (`commits: 2` medido com `git rev-list --count` a partir de 170e550a)
