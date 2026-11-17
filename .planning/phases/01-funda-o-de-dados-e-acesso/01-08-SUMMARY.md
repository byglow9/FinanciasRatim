---
phase: 01-funda-o-de-dados-e-acesso
plan: 08
subsystem: data
tags: [firestore, ownerId, scope, services, firebase-auth, bearer-token, static-guard, ledger]

requires:
  - phase: 01-03
    provides: "regras por hid e indices compostos com ownerId primeiro"
  - phase: 01-04
    provides: "shared/core (ledger.accumulatedBalance, time.monthRangeOf)"
  - phase: 01-05
    provides: "src/lib/scope.ts (ownerId, ownerScope, flag SCOPED_READS) e AuthContext com claims"
  - phase: 01-07
    provides: "servidor Express que so aceita ID token do Firebase"
provides:
  - "10 services do cliente consultam com ...ownerScope() e gravam com ownerId: ownerId() (scope.ts e a unica fonte do dono)"
  - "getAccumulatedBalance delega a accumulatedBalance do nucleo com limite de monthRangeOf (Sao Paulo, centavos)"
  - "bank.service: api() com Authorization Bearer do ID token; listener de bankConnections filtrado por dono"
  - "settings.service: settingsRef unico, getSettings tolerante a documento parcial e criacao com ownerId"
  - "test/static/owner-queries.test.js: guarda estatica com filtro ONLY por service"
  - "no-legacy-auth.test.js proibe VITE_BANK_API_KEY e x-api-key (src, docs e bundle)"
affects: [01-09, 01-10, 01-11, FUND-02, FUND-04, FUND-06]

tech-stack:
  added: []
  patterns:
    - "Toda query( dos services comeca por collection(...), ...ownerScope(); toda gravacao leva ownerId: ownerId(); updateDoc nunca menciona ownerId"
    - "Guarda estatica por extracao de chamadas com parenteses balanceados sobre fonte sanitizada (sem comentarios nem conteudo de strings)"

key-files:
  created:
    - test/static/owner-queries.test.js
  modified:
    - src/services/transactions.service.ts
    - src/services/fixedExpenses.service.ts
    - src/services/savings.service.ts
    - src/services/goals.service.ts
    - src/services/goalContributions.service.ts
    - src/services/events.service.ts
    - src/services/eventCategories.service.ts
    - src/services/notes.service.ts
    - src/services/settings.service.ts
    - src/services/bank.service.ts
    - src/components/settings/BankConnections.tsx
    - test/static/no-legacy-auth.test.js

key-decisions:
  - "settings continua com ID fixo main nesta fase (Open Question 4); a troca por documento por hid fica para a Fase 8"
  - "O ramo MOCK de getAccumulatedBalance tambem passa pelo nucleo (o plano pede mapear documentos e o ramo MOCK); os demais ramos MOCK ficam intactos"
  - "O listener de bankConnections entrega lista vazia no erro e registra so err.message (sem token nem cabecalhos)"

patterns-established:
  - "Dono do cliente so por src/lib/scope.ts; o teste estatico tambem recusa ownerId atribuido de outra fonte e uso de .uid ou getScope nos services"

requirements-completed: [FUND-02, FUND-04, FUND-06]

actuals:
  tokens: 6700
  tasks: 3
  commits: 4
plan_head_before: bfad7ff6d7d3a00557d597013cb9c9478a44fa9b

coverage:
  - id: D1
    description: "Toda consulta do cliente tem escopo de dono e toda gravacao grava ownerId; nenhum updateDoc inclui ownerId"
    requirement: FUND-02
    verification:
      - kind: unit
        ref: "node --test test/static/owner-queries.test.js (10 services, 0 fail)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Saldo acumulado vem do nucleo em centavos com limite do mes em Sao Paulo"
    requirement: FUND-06
    verification:
      - kind: other
        ref: "src/services/transactions.service.ts importa accumulatedBalance e monthRangeOf de @shared/core; npm run build e eslint verdes"
        status: pass
    human_judgment: true
    rationale: "Nao ha teste automatico do service contra o Firestore; a equivalencia numerica e coberta pelos testes do nucleo (shared/core/ledger.test.js, Plano 04), nao por este plano"
  - id: D3
    description: "Chamadas ao servidor com Bearer do ID token; chave compartilhada e VITE_BANK_API_KEY removidas do cliente e do bundle"
    requirement: FUND-04
    verification:
      - kind: unit
        ref: "node --test test/static/no-legacy-auth.test.js (5 pass); DIST_SCAN=1 apos npm run build (5 pass, 0 skip)"
        status: pass
    human_judgment: false
  - id: D4
    description: "getSettings tolera documento parcial e cria settings/main com ownerId; listener onSnapshot filtrado por dono"
    requirement: FUND-02
    verification:
      - kind: other
        ref: "owner-queries.test.js cobre setDoc com ownerId e query do listener; comportamento contra regras reais nao testado aqui"
        status: pass
    human_judgment: true
    rationale: "O comportamento em tempo de execucao contra as regras (get de settings inexistente, listener com filtro) depende do emulador/conta real e sera exercido na verificacao da fase"

duration: ~15min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 08: Camada de dados do cliente por dono Summary

**Os 10 services do cliente passam a consultar com `...ownerScope()` e gravar `ownerId: ownerId()` (so via `scope.ts`), o saldo acumulado vem do nucleo `shared/core/ledger` com o mes em Sao Paulo, e `bank.service` chama o servidor com o ID token do Firebase, protegido por uma guarda estatica contra regressao.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3
- **Files:** 1 criado, 12 modificados

## Accomplishments

- `test/static/owner-queries.test.js`: extrai chamadas `query(`, `addDoc(`, `setDoc(`, `transaction.set(` e `updateDoc(` por parenteses balanceados (comentarios e strings ignorados), exige `...ownerScope()` logo depois de `collection(...)`, `ownerId: ownerId()` nas gravacoes e nenhum `ownerId` em `updateDoc`; recusa `ownerId:` com outra origem e uso de `.uid`/`getScope`. `ONLY` filtra services; 0 verificacoes falha.
- transactions, fixedExpenses (e pagamentos), savings, goals, goalContributions (inclusive o `transaction.set` dentro do `runTransaction` e a limpeza por `goalId`), events, eventCategories e notes: escopo de dono em toda consulta e `ownerId` em toda gravacao; `updateDoc` e ramos MOCK intactos.
- `getAccumulatedBalance` mapeia documentos para `{ type, amount, date }` e delega a `accumulatedBalance`, com limite `monthRangeOf(ano, mes).end` (substitui o `reduce` e o `endOfMonth` local); continua so com igualdade (`ownerId` e `person`), sem indice composto novo.
- `settings.service`: `settingsRef()` unico (ID `main`), `getSettings` mescla `DEFAULT_SETTINGS` com o documento existente e cria com `ownerId`.
- `bank.service`: `API_KEY` e `x-api-key` saem; `BANK_ENABLED` depende so da URL; `api()` exige `auth.currentUser.getIdToken()` e envia `Authorization: Bearer`; o `onSnapshot` de `bankConnections` usa `...ownerScope()` e um callback de erro que registra so `err.message` e entrega lista vazia.
- `BankConnections.tsx` pede apenas `VITE_BANK_API_URL`; `no-legacy-auth.test.js` agora proibe `VITE_BANK_API_KEY` e `x-api-key` em `src`, `CLAUDE.md`, `README.md` e no bundle.

## Task Commits

1. **Task 1 (RED): guarda estatica de consultas e gravacoes por dono** - `a0ebc192` (test)
2. **Task 1 (GREEN): transactions, fixedExpenses e savings por dono e saldo do nucleo** - `6a6b4f91` (feat)
3. **Task 2: goals, goalContributions, events, eventCategories e notes por dono** - `f083d573` (feat)
4. **Task 3: settings tolerante, bank com token do Firebase e lista proibida estendida** - `e07a9944` (feat)

**Plan metadata:** commit `docs(01-08): complete plan` (SUMMARY, STATE, ROADMAP, REQUIREMENTS)

## Verification

- RED: `ONLY=transactions,fixedExpenses,savings node --test test/static/owner-queries.test.js` falhou antes das mudancas (3 falhas) e passou depois (5 pass)
- Task 2: `ONLY=goals,goalContributions,events,eventCategories,notes` 7 pass
- Task 3: `node --test test/static/owner-queries.test.js test/static/no-legacy-auth.test.js` 16 pass, 0 fail, 1 skip (varredura de bundle, que so roda com `DIST_SCAN`); depois do build, `DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js` 5 pass, 0 skip
- `npm run build` e `eslint` dos arquivos alterados verdes em cada tarefa

## Decisions Made

Ver `key-decisions` no frontmatter.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

Nenhum.

## Issues Encountered

Nenhum bloqueio. `.env.local` continua tracked e modificado fora do escopo deste plano (tratado pelo dono) e nao foi tocado.

## Deferred Items (fora do escopo, nao alterados)

- `.env.local.example` (linha 8) ainda descreve a chave compartilhada `APP_API_KEY` ("URL do servidor em server/ e chave compartilhada"). O arquivo nao esta em `files_modified` deste plano e nao e coberto pela varredura de `no-legacy-auth`; vale ajustar o texto quando o exemplo de ambiente for revisado (Plano de documentacao da fase).
- As consultas por dono com `orderBy` (`savings` por `date`, `goals`/`eventCategories` por `createdAt`, `goalContributions`, `events`, `notes`) dependem dos 11 indices compostos do Plano 03 estarem publicados antes de Release B; nao verificado contra o Firestore real aqui.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum novo: a superficie (consultas e gravacoes por dono, chamadas ao servidor com ID token) e a do `<threat_model>` do plano (T-01-33 a T-01-36, mitigadas pela guarda estatica, pela remocao da chave compartilhada e pelo log do listener so com `message`).

## Next Phase Readiness

- O cliente ja consulta e grava por dono; em Release A (`VITE_OWNER_SCOPED_READS=false`) as leituras seguem sem filtro, e as gravacoes ja levam `ownerId`, como pede a ordem do ROADMAP.
- Proximos planos podem assumir que todo service usa `scope.ts` e que o front de banco envia Bearer; antes do cutover, `bankConnections` e demais documentos legados precisam do `ownerId` pelo backfill (Plano 06).

## Self-Check: PASSED

- FOUND: test/static/owner-queries.test.js e os 11 arquivos modificados listados em `key-files`
- FOUND commits: a0ebc192, 6a6b4f91, f083d573, e07a9944 (`commits: 4` medido com `git rev-list --count` a partir de bfad7ff6)
