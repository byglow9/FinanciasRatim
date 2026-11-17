---
phase: 01-funda-o-de-dados-e-acesso
plan: 03
subsystem: auth
tags: [firestore-rules, custom-claims, firebase-auth, verifyIdToken, composite-indexes, emulator, rollback]

requires:
  - phase: 01-02
    provides: "scripts/dev-env.sh (Node 22.23.5 + JRE 21), firebase 13, firebase-admin 14, scripts test:rules e test:emu"
provides:
  - "firestore.rules por dono (claim hid), default-deny, ownerId imutavel; NAO publicadas"
  - "firestore.rules.legacy (copia byte a byte das regras abertas) e firebase.rollback.json (rollback em um deploy)"
  - "initAdmin(): emulador sem credencial ou producao com chave fora do repositorio"
  - "create-users.js: createUsers, listUsers e CLI (--hid, --ele-email, --ela-email, --apply, --list)"
  - "requireOwner(verify): middleware Bearer ID token, claim hid obrigatorio, req.owner"
  - "11 indices compostos com ownerId em firestore.indexes.json (7 antigos mantidos) e check-indexes.js"
  - "Matriz de regras (10 testes) e tracer ponta a ponta (6 testes) no emulador"
affects: [01-04, 01-05, 01-10, 01-11, 01-12, 01-13, FUND-01, FUND-02, FUND-03, FUND-04]

tech-stack:
  added: []
  patterns:
    - "Dono dos dados = claim hid (id do casal) no ID token; regra compara request.auth.token.hid com ownerId; person nao entra nas regras (D-05)"
    - "Scripts de admin: initAdmin() unico, dry-run por padrao, --apply escreve, senha so por variavel de ambiente, saida sem segredo"
    - "Testes contra emulador via firebase emulators:exec; cliente firebase com apps nomeados por login; semeadura pelo Admin SDK"
    - "Prova de indice por consulta real (FAILED_PRECONDITION = nao pronto), porque o emulador nao cobra indice"

key-files:
  created:
    - firestore.rules.legacy
    - firebase.rollback.json
    - server/scripts/lib/admin.js
    - server/scripts/create-users.js
    - server/scripts/check-indexes.js
    - server/src/auth.js
    - server/test/emu/_helpers.js
    - server/test/emu/owner-path.test.js
    - server/test/emu/check-indexes.test.js
    - test/rules/matrix.test.js
    - test/static/firestore-config.test.js
  modified:
    - firestore.rules
    - firestore.indexes.json

key-decisions:
  - "Regras em dois blocos match /{col}/{id}: lista explicita de 10 colecoes do cliente (read/delete/create/update com dono) e leitura apenas para bankConnections e bankImports; o resto e negado por padrao"
  - "get de settings com resource == null permitido so para membro (cliente cria settings/main quando nao existe); nenhuma outra colecao tem essa excecao"
  - "create-users valida tudo (hid, person, e-mail, senha de conta nova, conflito de casal) antes de escrever qualquer coisa e mescla claims existentes antes de setCustomUserClaims"
  - "Adulteracao de token no teste e de conteudo (audiencia trocada, lixo no lugar do JWT), porque o emulador do Auth emite tokens sem assinatura"

requirements-completed: []  # FUND-01..FUND-04 declarados; marcacao pendente do shared-ID gate (ver State Updates abaixo)

actuals:
  tokens: 12500
  tasks: 3
  commits: 3
plan_head_before: 61b1dd99b00cd0cadf9c7e2fc2bcfce7f0c8c262

coverage:
  - id: D1
    description: "Tracer: contas Ele e Ela criadas por script, claims hid e person no token, leitura so do casal pelas regras e pelo middleware com verifyIdToken real"
    requirement: FUND-01
    verification:
      - kind: test
        ref: "server/test/emu/owner-path.test.js#TRACER (npm run test:emu: 10 pass, 0 fail)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Regras por dono com default-deny: anonimo, sem claim, outro casal, lista sem filtro, ownerId alheio e imutavel, colecao desconhecida, bank somente leitura, runTransaction e settings inexistente"
    requirement: FUND-03
    verification:
      - kind: test
        ref: "test/rules/matrix.test.js (npm run test:rules: 10 pass, 0 fail)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rollback das regras em um deploy: firestore.rules.legacy idêntica as regras abertas e firebase.rollback.json apontando para ela"
    requirement: FUND-03
    verification:
      - kind: test
        ref: "test/static/firestore-config.test.js#firebase.rollback.json (npm run test:static: 6 pass); diff com git show HEAD:firestore.rules sem diferencas"
        status: pass
    human_judgment: false
  - id: D4
    description: "Indices: 11 compostos com ownerId (18 no total) e check-indexes que monta e executa uma consulta de prova por indice"
    requirement: FUND-02
    verification:
      - kind: test
        ref: "test/static/firestore-config.test.js e server/test/emu/check-indexes.test.js (4 pass)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Servidor aceita somente ID token com claim hid (401 sem Bearer/invalido, 403 sem hid)"
    requirement: FUND-04
    verification:
      - kind: test
        ref: "server/test/emu/owner-path.test.js#requireOwner (testes 4 e 5)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Indices realmente prontos em producao (o emulador nao cobra indice)"
    requirement: FUND-02
    verification: []
    human_judgment: true
    rationale: "Prova real so roda contra producao no Plano 12 (check-indexes --hid ... --wait); aqui so se prova montagem e execucao no emulador."

duration: ~10min (estimado; primeira edicao a ultimo teste ~3 min de relogio)
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 03: Tracer de acesso por dono, regras, rollback e índices Summary

**Contas Ele/Ela criadas por script com claims `hid`/`person`, regras do Firestore por dono (default-deny, `ownerId` imutável) e `requireOwner` com `verifyIdToken` real provados juntos no emulador, mais rollback em um deploy e 11 índices compostos com `ownerId`.**

## Performance

- **Duration:** ~10 min (estimado); início 2026-11-17T16:03:20Z
- **Tasks:** 3 (1 tracer + 2 auto/tdd)
- **Files:** 11 criados, 2 modificados

## Accomplishments

- **Tracer ponta a ponta (Task 1):** `create-users` com `--apply` cria Ele e Ela com claims; cada um entra por e-mail e senha no Auth do emulador e o `getIdTokenResult` traz `hid` e `person`. O cliente de Ele lê com `where ownerId == hid`; consulta sem filtro, com `hid` alheio e sem login dão `permission-denied`. Ela lê documentos de `person: ele` (D-05). Conta sem claim entra mas não lê nada e `requireOwner` devolve 403. `requireOwner` com o verificador real (`getAuth().verifyIdToken`) dá 401 sem Bearer, preenche `req.owner = { uid, hid, person }` com token válido e dá 401 para token forjado.
- **Regras (Task 1 e 2):** `firestore.rules` com `isMember()`, `ownsExisting()`, `ownsIncoming()` e `clientCollections()` (10 coleções). `bankConnections` e `bankImports` só leitura para o cliente. `settings/main` inexistente pode ser lido por membro (exceção única). Nenhuma regra por autenticação não nula.
- **Matriz (Task 2):** 10 testes com `@firebase/rules-unit-testing`, laços sobre as 10 coleções (um teste por comportamento): anônimo, sem claim, Ele/Ela (create, get, list, update parcial, delete), outro casal, lista sem filtro, ownerId alheio/ausente/mutado, coleção fora da lista e subcoleção, bank somente leitura, `runTransaction` em `goals`, `get` de `settings/main`.
- **Rollback (Task 1 e 2):** `firestore.rules.legacy` idêntica byte a byte às regras abertas originais (diff contra `git show HEAD:firestore.rules` vazio) e `firebase.rollback.json` aponta para ela com o mesmo bloco `emulators`. Uso em produção só no Plano 13.
- **Índices (Task 3):** 11 índices novos (ownerId ASC primeiro) somados aos 7 antigos = 18. `check-indexes.js` monta uma consulta por índice composto com `ownerId` e trata `FAILED_PRECONDITION` (9) como pendente, repetindo a cada 15 s até `--wait`. Teste estático guarda índices, rollback e a proibição de regra aberta.
- **create-users:** dry-run por padrão, idempotente (`noop`), recusa usuário de outro casal, mescla claims existentes antes de gravar, nunca devolve nem registra senha (verificado no retorno, nos logs e na saída do CLI).

## Task Commits

1. **Task 1: tracer conta por script, claims, regras por dono e token** - `cd541abe` (feat)
2. **Task 2: matriz de regras e config de rollback** - `bbaf2fc1` (test)
3. **Task 3: índices compostos e check-indexes** - `5ee3f737` (feat)

**Plan metadata:** commit `docs(01-03): complete plan` (SUMMARY, STATE, ROADMAP, REQUIREMENTS)

## Verification

- `npm run test:rules`: 10 pass, 0 fail
- `npm run test:emu`: 10 pass, 0 fail (6 do tracer + 4 de check-indexes)
- `npm run test:static`: 6 pass, 0 fail (RED confirmado antes dos índices: 3 falhas)
- `npm run test:server`: 12 pass, 0 fail (sem regressão)
- Nenhum `firebase deploy` executado; `firestore.rules` restritivas só no repositório.

## Decisions Made

- Ver `key-decisions` no frontmatter. Em especial: a exceção de `get` em `settings` com `resource == null` fica restrita a `settings`; outras coleções continuam negando documento inexistente (coberto na matriz).
- Teste de adulteração de token cobre conteúdo (audiência trocada e não-JWT), não assinatura: o emulador do Auth emite tokens sem assinatura. A checagem de assinatura é do Admin SDK em produção e não foi exercitada aqui.

## Deviations from Plan

None - plan executed exactly as written.

Notas de processo (não são desvios de comportamento): na Task 1 as implementações foram escritas antes da primeira execução do teste do tracer (o teste passou de primeira, sem ciclo RED observado; a task é `type="tracer"`, não `tdd="true"`). Na Task 3 o ciclo RED foi observado (3 falhas) antes de os índices existirem. Ajuste só de teste: `setLogLevel('silent')` e captura por variável em `withSecurityRulesDisabled` (a função não devolve o valor do callback) em `matrix.test.js`.

## Issues Encountered

- Pendência herdada do Plano 02, fora do escopo deste plano: `.env.local` continua rastreado pelo git (o dono vai desrastrear manualmente). Nenhum arquivo `.env*` foi lido ou impresso.
- O emulador do Firestore gera `firestore-debug.log` na raiz; adicionei `*-debug.log` a `.git/info/exclude` (local, não versionado) e removi o arquivo. Não alterei `.gitignore` por não estar em `files_modified`; vale incluir `*-debug.log` no `.gitignore` em plano futuro.

## User Setup Required

None - nenhum serviço externo. As contas reais de Ele e Ela só são criadas no Plano 10 (R0) com `--hid` definitivo e senhas por `ELE_PASSWORD`/`ELA_PASSWORD`.

## Known Stubs

None.

## Threat Flags

None. Mitigações do threat model aplicadas: T-01-05 (isMember exige claim; Test 4 e matriz), T-01-06 (ownerId imutável na matriz), T-01-07 (lista sem filtro e com dono alheio negadas), T-01-08 (initAdmin exige caminho por variável, recusa chave dentro do repositório, sem credencial no banner), T-01-09 (senha só por variável; sem vazamento no retorno, log ou CLI), T-01-10 (claims só via Admin SDK; regra lê `request.auth.token`), T-01-11 (`firestore.rules.legacy` e `firebase.rollback.json`; regras não publicadas).

## Next Phase Readiness

- Planos 04 em diante podem importar `initAdmin`, `requireOwner`, `createUsers` e os helpers `_helpers.js`.
- Plano 12: `firebase deploy --only firestore:indexes` e depois `node server/scripts/check-indexes.js --hid <hid> --wait 600` contra produção. Se alguma consulta só com igualdade falhar sem índice, o Plano 12 acusa (Assumption A1).
- Plano 13: publicar `firestore.rules` só depois do checklist do cutover; rollback com `firebase deploy --only firestore:rules --config firebase.rollback.json --project financias-ratimbum`.

## Self-Check: PASSED

- FOUND: `firestore.rules.legacy`, `firebase.rollback.json`, `server/scripts/lib/admin.js`, `server/scripts/create-users.js`, `server/scripts/check-indexes.js`, `server/src/auth.js`, `server/test/emu/_helpers.js`, `server/test/emu/owner-path.test.js`, `server/test/emu/check-indexes.test.js`, `test/rules/matrix.test.js`, `test/static/firestore-config.test.js`
- FOUND: commits `cd541abe`, `bbaf2fc1`, `5ee3f737`
- `commits:` medido por `git rev-list --count 61b1dd99..HEAD` = 3 (antes do commit do SUMMARY)
- Critérios de aceitação das 3 tasks reexecutados e verdes; nenhum deploy.

---
*Phase: 01-funda-o-de-dados-e-acesso*
*Completed: 2026-11-17*
