---
phase: 01-funda-o-de-dados-e-acesso
plan: 05
subsystem: auth
tags: [firebase-auth, custom-claims, scope, react-context, mock-dev-only, static-guard, release-a]

requires:
  - phase: 01-03
    provides: "Claims hid e person no ID token (create-users), regras por dono e requireOwner"
provides:
  - "AuthContext com claims hid/person: user {username, uid, hid, person}, accessError, signIn, signOut (sem cadastro)"
  - "src/lib/scope.ts: setScope, getScope, ownerId, ownerScope, SCOPED_READS (costura de dono, D-06)"
  - "purgeLegacyAuthKeys: apaga as duas chaves antigas de localStorage (so removeItem)"
  - "MOCK so em DEV (import.meta.env.DEV) e firebase.ts importando MOCK de mockStorage"
  - "LoginForm so de e-mail e senha, exibindo accessError"
  - "AreaContext abre na aba da pessoa do claim sem restringir abas"
  - "npm run build:release-a (leituras sem filtro de dono) e test/static/no-legacy-auth.test.js"
affects: [01-08, 01-10, 01-11, 01-12, 01-13, FUND-01]

tech-stack:
  added: []
  patterns:
    - "Dono no cliente so via scope.ts: setScope antes de setUser; ownerId() lanca erro claro sem escopo"
    - "Guarda estatica por varredura de texto de src/, CLAUDE.md e README.md, com varredura opcional do bundle (DIST_SCAN=1)"

key-files:
  created:
    - src/lib/scope.ts
    - src/lib/legacyAuthCleanup.ts
    - test/static/no-legacy-auth.test.js
  modified:
    - src/contexts/AuthContext.tsx
    - src/components/auth/LoginForm.tsx
    - src/contexts/AreaContext.tsx
    - src/lib/firebase.ts
    - src/lib/mockStorage.ts
    - package.json
    - CLAUDE.md
    - README.md

key-decisions:
  - "Usuario MOCK e escopo definidos no inicializador do useState (nao no efeito): a regra react-hooks/set-state-in-effect proibe setState sincrono no efeito, e assim o escopo ja existe antes de qualquer filho montar"
  - "Falha ao ler o token (getIdTokenResult lanca) e tratada como conta sem acesso, nao como erro silencioso"
  - "Varredura do bundle ignora 'signUp' (endpoint REST do SDK do Firebase) e as duas chaves antigas (presentes so em purgeLegacyAuthKeys); estas sao checadas por uso: nenhuma leitura nem gravacao"

requirements-completed: [FUND-01]

actuals:
  tokens: 7500
  tasks: 2
  commits: 2
plan_head_before: fdaa1640b868e6bcda6fff77291473bad6cf7f84

coverage:
  - id: D1
    description: "Login Firebase e o unico caminho: sem login local, sem cadastro, sem chaves antigas no codigo, na tela nem na documentacao"
    requirement: FUND-01
    verification:
      - kind: unit
        ref: "node --test test/static/no-legacy-auth.test.js#codigo e documentacao sem login legado (4 pass, 1 skip)"
        status: pass
      - kind: unit
        ref: "DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js#bundle de producao sem credenciais legadas (5 pass, 0 skip)"
        status: pass
    human_judgment: false
  - id: D2
    description: "AuthContext le claims hid/person, uma retentativa com refresh, barra conta sem acesso e chama setScope antes de setUser"
    requirement: FUND-01
    verification:
      - kind: unit
        ref: "test/static/no-legacy-auth.test.js#AuthContext le claims e chama setScope antes de setUser"
        status: pass
    human_judgment: true
    rationale: "O teste e estatico (ordem e presenca no texto); o comportamento em tempo de execucao (retentativa, signOut forcado e mensagem 'Conta sem acesso' sobrevivendo ao listener) so e provado no teste manual do Plano 11/12 com contas reais."
  - id: D3
    description: "MOCK nao vaza para producao (import.meta.env.DEV)"
    requirement: FUND-01
    verification:
      - kind: unit
        ref: "test/static/no-legacy-auth.test.js#MOCK so vale em desenvolvimento"
        status: pass
    human_judgment: false
  - id: D4
    description: "App abre na aba da pessoa do claim; os dois seguem vendo todas as abas"
    requirement: FUND-01
    verification: []
    human_judgment: true
    rationale: "Comportamento de interface sem teste automatizado neste plano; confirmar no navegador com a conta de Ela."
  - id: D5
    description: "Script build:release-a para o Release A do cutover"
    verification:
      - kind: other
        ref: "package.json scripts.build:release-a = VITE_OWNER_SCOPED_READS=false npm run build"
        status: unknown
    human_judgment: true
    rationale: "O script foi adicionado mas nao foi executado aqui; o Plano 11/12 gera e confere o build do Release A."

duration: ~12min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 05: Login Firebase unico com claims e escopo de dono Summary

**AuthContext que le os claims `hid`/`person` do ID token (com uma retentativa de refresh e bloqueio "Conta sem acesso"), `scope.ts` como unica fonte de `ownerId`, login legado e cadastro aberto removidos, MOCK restrito a DEV e guarda estatica que impede a volta das credenciais antigas.**

## Performance

- **Duration:** ~12 min (estimado); inicio 2026-11-17T16:03Z, fim 2026-11-17T16:16Z
- **Tasks:** 2
- **Files:** 3 criados, 8 modificados

## Accomplishments

- `AuthContext` reescrito: `onAuthStateChanged` com flag de cancelamento, `getIdTokenResult()` e uma retentativa `getIdTokenResult(true)` quando falta `hid`; `hid` string nao vazia e `person` igual a ele ou ela; senao `setScope(null)`, `setUser(null)`, `accessError = 'Conta sem acesso. Peca para liberar sua conta.'` e `signOut` do Firebase. O ramo sem usuario nao apaga `accessError`, entao a mensagem sobrevive ao signOut forcado.
- `setScope({ hid, person })` e chamado antes de `setUser(...)`, para o `AreaProvider` encontrar o escopo ao carregar as configuracoes.
- `src/lib/scope.ts`: `ownerId()` lanca `Sem escopo de dono (login necessario)` sem escopo; `ownerScope()` devolve `[where('ownerId', '==', ownerId())]` ou `[]` quando `VITE_OWNER_SCOPED_READS === 'false'` (Release A).
- `LoginForm` so de e-mail e senha, mostra tambem `accessError`; modo cadastro, `toggleMode` e `signUp` removidos.
- `AreaContext`: aba inicial `user?.person ?? 'ele'` e efeito que acompanha mudanca de usuario; nenhuma aba restrita.
- `MOCK = import.meta.env.DEV && VITE_USE_EMULATOR === 'true'`; `firebase.ts` importa `MOCK`.
- `test/static/no-legacy-auth.test.js`: 5 testes (4 sempre, 1 de bundle com `DIST_SCAN=1`). Com `DIST_SCAN=1` apos `npm run build`: 5 pass, 0 skip.
- `CLAUDE.md` e `README.md` descrevem so o login Firebase com claims e dizem que as contas vem de `server/scripts/create-users.js`.

## Task Commits

1. **Task 1: scope.ts, AuthContext com claims, MOCK so em DEV e LoginForm** - `0c6fd507` (feat)
2. **Task 2: aba inicial da pessoa, build:release-a, guarda estatica e docs** - `c5265bd7` (feat)

**Plan metadata:** commit `docs(01-05): complete plan` (SUMMARY, STATE, ROADMAP)

## Verification

- `npm run build` verde; `npx eslint` limpo nos 7 arquivos de `src/` tocados
- `node --test test/static/no-legacy-auth.test.js`: 4 pass, 0 fail, 1 skipped (bundle, sem `DIST_SCAN`)
- `DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js`: 5 pass, 0 fail
- `npm run test:static`: 10 pass, 0 fail (inclui `firestore-config.test.js`)

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Varredura do bundle falharia por falsos positivos**
- **Found during:** Task 2 (teste de bundle)
- **Issue:** Aplicar a lista proibida inteira em `dist/**/*.js` acusa `signUp` (endpoint REST `accounts:signUp` do SDK do Firebase) e as duas chaves antigas (que `purgeLegacyAuthKeys` precisa conter para removê-las). O teste nunca passaria com `DIST_SCAN=1`, quebrando a varredura que o Plano 11 vai rodar.
- **Fix:** No bundle, a lista usa `createUserWithEmailAndPassword`, `VITE_APP_USERNAME`, `VITE_APP_PASSWORD` e `ratimbum123` (senha padrao legada), e as chaves antigas sao verificadas por uso (regex que falha em `getItem`/`setItem` delas). A varredura de codigo-fonte e documentacao segue com a lista completa do plano.
- **Files modified:** test/static/no-legacy-auth.test.js
- **Verification:** `DIST_SCAN=1` com build real: 5 pass
- **Committed in:** c5265bd7

**2. [Rule 3 - Blocking] Duas violacoes de eslint nos arquivos tocados**
- **Found during:** Tasks 1 e 2 (verify exige eslint limpo)
- **Issue:** (a) `react-hooks/set-state-in-effect` no ramo MOCK do efeito; (b) `react-refresh/only-export-components` em `useAuth` e `useArea`, erro que ja existia no HEAD (confirmado com `git show HEAD:... | eslint --stdin`).
- **Fix:** (a) usuario MOCK e `setScope` movidos para o inicializador de `useState`; (b) `eslint-disable-next-line react-refresh/only-export-components` nos dois hooks, mesmo padrao ja usado em `select.tsx` e `CalendarPage.tsx`. Sem reestruturar arquivos.
- **Files modified:** src/contexts/AuthContext.tsx, src/contexts/AreaContext.tsx
- **Committed in:** 0c6fd507 e c5265bd7

**3. [Rule 2 - Robustez] signOut e falha de leitura do token**
- `signOut` pula `firebaseSignOut` no modo MOCK (onde `auth` e nulo e lancaria); falha em `getIdTokenResult` cai em "Conta sem acesso" em vez de rejeicao nao tratada. Dentro de `AuthContext.tsx`, commit 0c6fd507.

---

**Total deviations:** 3 auto-fixed (1 bug de teste, 1 bloqueio de lint, 1 robustez)
**Impact on plan:** Sem mudanca de escopo nem de comportamento prometido.

## Issues Encountered

- `.env.local` continua rastreado e modificado no working tree (pendencia do dono, herdada); nao foi lido, impresso nem adicionado.

## User Setup Required

None - nenhum servico externo. As contas reais so sao criadas no Plano 10 com `create-users.js`.

## Known Stubs

None.

## Threat Flags

None. Mitigacoes aplicadas: T-01-16 (login local, cadastro e variaveis removidos; teste estatico (a) e varredura de bundle), T-01-17 (MOCK exige `import.meta.env.DEV`; teste (c)), T-01-18 (conta sem hid/person barrada com retentativa e signOut), T-01-19 (`setScope` antes de `setUser`; `ownerId` lanca sem escopo; teste (d)), T-01-20 (`getIdTokenResult(true)` uma vez).

## Next Phase Readiness

- Plano 08 pode importar `ownerId()` e `ownerScope()` e estender `FORBIDDEN` com o nome da chave compartilhada do servidor.
- Plano 11 roda `npm run build && DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js`; Plano 12 gera o Release A com `npm run build:release-a` (script ainda nao executado aqui).
- As regras do Plano 03 nao estao publicadas: com as regras antigas abertas, o login por claims funciona, mas o isolamento so vale apos o Plano 13.

## Self-Check: PASSED

- FOUND: src/lib/scope.ts, src/lib/legacyAuthCleanup.ts, test/static/no-legacy-auth.test.js
- FOUND: commits 0c6fd507, c5265bd7
- `commits:` medido por `git rev-list --count fdaa1640..HEAD` = 2 (antes do commit do SUMMARY)

---
*Phase: 01-funda-o-de-dados-e-acesso*
*Completed: 2026-11-17*
