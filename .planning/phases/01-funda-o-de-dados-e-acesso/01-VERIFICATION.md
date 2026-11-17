---
phase: 01-funda-o-de-dados-e-acesso
verified: 2026-11-17T19:10:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-01-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-01-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-02-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-02-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-03-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-03-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-04-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-04-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-05-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-05-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-06-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-06-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-07-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-07-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-08-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-08-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-09-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-09-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-10-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-10-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-11-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-11-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-12-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-12-SUMMARY.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-13-PLAN.md"
  - ".planning/phases/01-funda-o-de-dados-e-acesso/01-13-SUMMARY.md"
  - "Dockerfile"
  - "firebase.rollback.json"
  - "firestore.indexes.json"
  - "firestore.rules"
  - "firestore.rules.legacy"
  - "package.json"
  - "server/package.json"
  - "server/src/app.js"
  - "server/src/auth.js"
  - "server/src/index.js"
  - "server/src/sync.js"
  - "shared/core/categories.js"
  - "shared/core/classify.js"
  - "shared/core/ledger.js"
  - "shared/core/time.js"
  - "src/contexts/AuthContext.tsx"
  - "src/lib/scope.ts"
covered_digest: "v1:sha256:12c00472c8bf4edb9a1a8e53596b1545b5e715af1c82a0e1eefc882ea629121e"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Console Firebase > Authentication > Configuracoes > Acoes do usuario: desativar a criacao de contas pelos usuarios (user actions)"
    expected: "Nao e possivel criar conta nova com o SDK/REST publico do Firebase Auth; so as 2 contas existentes (ele e ela) entram"
    why_human: "Configuracao de Console, sem leitura programatica sem tocar producao. O dono recusou confirmar. Impacto em FUND-01 / criterio 1 (cadastro aberto): o cliente nao tem cadastro e as regras e o servidor barram conta sem claim hid (provado), mas a criacao de contas vazias no Auth continua possivel ate desligar."
  - test: "Limpar o .env.local local (variaveis do login legado e VITE_BANK_API_KEY) e rodar manualmente `git rm --cached .env.local`; depois trocar as senhas das duas contas por e-mail de redefinicao"
    expected: ".env.local deixa de ser rastreado, sem credenciais legadas; senhas compartilhadas no chat substituidas"
    why_human: "Arquivo de segredo protegido (o agente nao le nem altera); `git ls-files` ainda lista .env.local como rastreado e git status o mostra modificado. Impacto: o login legado e a chave compartilhada ja estao inertes no codigo e no servidor (provado), entao o risco e residual (historico publico), nao funcional."
  - test: "Painel do Railway: confirmar que a variavel APP_API_KEY nao existe mais e que o Root Directory esta vazio (Dockerfile da raiz)"
    expected: "Variavel ausente; servico construido pelo Dockerfile"
    why_human: "Painel externo. Evidencia indireta forte: o servidor em producao responde 401 a x-api-key sem token e 403 a Origin nao autorizada com Bearer, comportamento so do codigo novo."
  - test: "Logado como Ele e como Ela em https://financias-ratimbum.web.app: percorrer Resumo, Transacoes, Contas fixas, Metas, Porquinho, Calendario, Relatorios, Notas, Configuracoes e Bancos > Sincronizar agora"
    expected: "Historico igual ao anterior (371 documentos); sem erro de permissao nem failed-precondition; sincronizacao bancaria importa lancamento novo com ownerId do casal"
    why_human: "Fluxo real em navegador contra producao. O dono respondeu keep, mas a conferencia por tela e o resultado de Sincronizar agora com Release B nao foram evidenciados (01-12 e 01-13 registram como nao verificado). O sync com ownerId esta provado no emulador (test:emu 48/48), nao em producao."
---

# Phase 1: Fundacao de dados e acesso - Relatorio de Verificacao

**Phase Goal:** So o dono, autenticado no Firebase, consegue ler e gravar os dados do casal, sem perda de historico, sobre uma base (nucleo de calculo, categorias estaveis, servidor atualizado) pronta para as fases seguintes.
**Verified:** 2026-11-17T19:10:00Z
**Status:** human_needed
**Re-verification:** Nao, verificacao inicial

## Resumo

O codigo, as regras e o servidor entregam o objetivo, e isso foi conferido contra o codigo e por execucao local, nao pelos SUMMARYs. Nenhum gap de codigo foi encontrado. O status e `human_needed` apenas por tarefas de Console/segredos que o dono recusou confirmar e por conferencias de producao nao evidenciadas.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Login so e-mail/senha Firebase; `ratimbum` e cadastro aberto nao existem; historico intacto | VERIFIED (com pendencia humana) | `src/contexts/AuthContext.tsx` usa so `signInWithEmailAndPassword`, le claims `hid`/`person` e barra conta sem claim com "Conta sem acesso". `grep` de `signUp`, `createUserWithEmailAndPassword`, `VITE_APP_USERNAME/PASSWORD`, `VITE_BANK_API_KEY`, `x-api-key` em `src/`, `shared/`, `server/scripts/` = 0 ocorrencias (so um aviso de depreciacao em `server/src/index.js`). `test:static` 35 pass / 1 skip; `DIST_SCAN=1 no-legacy-auth` 5/5 no bundle recem-gerado. Historico: `backups/2026-11-17-verify.txt` = 371 documentos, 0 sem ownerId, 0 dono errado, 0 sem categoryId (contagens iguais ao backup pre-cutover). Pendencia: "user actions" no Console nao confirmado (ver Verificacao Humana 1) |
| 2 | Sem login ou em outra conta nao le nem grava, comprovado no emulador; app funciona apos publicar as regras | VERIFIED | `firestore.rules`: so ha `request.auth != null` dentro de `isMember()` junto de `hid is string && size()>0`; nenhum allow solto. `test:rules` 10/10 (anonimo, sem claim, outro casal, lista sem filtro, create com ownerId alheio/ausente, update trocando ownerId, subcolecao e colecoes nao listadas, bancos so leitura). `test:emu` 48/48. Em producao (checado agora, sem credenciais): GET anonimo em `transactions`, `settings`, `bankImports` = 403; POST anonimo create = 403. Publicacao registrada em `backups/2026-11-17-rules-publish.txt` (2026-11-17T18:31:31Z); dono respondeu `keep` |
| 3 | Servidor recusa sem token ou dominio nao autorizado; sync segue gravando com dono correto | VERIFIED (producao do sync nao evidenciada) | `server/src/auth.js` (`requireOwner` exige Bearer, `verifyIdToken`, 403 sem `hid`; `originGuard` fecha Origin) montado em `/api` em `server/src/app.js`; `createApp` exige `ALLOWED_ORIGINS` nao vazia; dono vem de `req.owner.hid`, nunca do corpo. `server/src/sync.js` grava `ownerId` (da conexao) e `categoryId`. `test:server` 20/20 e `test:emu` 48/48 (inclui `sync.test.js`, `owner-path.test.js`). Curl em producao agora: `/health` 200, `POST /api/sync` sem token 401, Origin invalida + Bearer 403, `x-api-key` sem Bearer 401 |
| 4 | Renomear categoria mantem o historico (ID estavel) | VERIFIED | `shared/core/categories.js`: `slugify` gera id uma vez, `renameCategory` troca so `name`, `archiveCategory` nunca apaga, `categoryDisplayName` resolve por `categoryId`. `SettingsPage.tsx` usa add/rename/archive; `TransactionForm`, `FixedExpenseForm`, `OverviewDashboard`, `IncomeBreakdown`, `MonthCalendar` resolvem pelo id; `server/src/sync.js` devolve `categoryId`. Backfill deu `categoryId` a todos os documentos (verify: 0 sem categoryId). `categories.test.js` e `test/static/category-ids.test.js` passam |
| 5 | Nucleo compartilhado com testes (fuso Sao Paulo); servidor em Node 22.23.4+ com firebase 13 e firebase-admin 14 sem regressao | VERIFIED | `shared/core/{time,classify,categories,ledger}.js` com testes e `purity.test.js`; consumido por `@shared/core/*` em `src/` e por `../../shared/core/*` em `server/src/`. `test:core` 50/50; `test:core:tz` 50/50 em UTC e 50/50 em Asia/Tokyo; `DEFAULT_TZ = 'America/Sao_Paulo'`. Versoes instaladas: `firebase@13.4.0`, `firebase-admin@14.5.1`, `pluggy-sdk@0.94.3` (engines `^22.23.4 || >=24.22.1`). `server/package.json` engines `>=22.23.4`, `.nvmrc` 22.23.5, `Dockerfile` `FROM node:22.23.5-slim` copiando `shared/`. `npm run build` ok. Servidor novo rodando no Railway (curl acima) |

**Score:** 5/5 truths verificadas; 0 behavior-unverified. Itens humanos abaixo mantem o status em `human_needed`.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `firestore.rules` | Regras por dono (claim hid), default-deny | VERIFIED | 10 colecoes do cliente + 2 de banco somente leitura; criacao/leitura/update/delete amarrados a `ownerId == token.hid`; `ownerId` imutavel |
| `firestore.rules.legacy` | Regras abertas antigas para reverter | VERIFIED | Existe e esta rastreado (`allow read, write: if true`) |
| `firebase.rollback.json` | Config de rollback de um deploy | VERIFIED | Existe, rastreado, aponta `rules` para `firestore.rules.legacy` |
| `firestore.indexes.json` | 11 indices novos com ownerId + 7 antigos | VERIFIED | 18 indices; `firestore-config.test.js` passa; `check-indexes` provou 11 prontos em producao (01-12) |
| `shared/core/*.js` | Nucleo puro com testes | VERIFIED | Substantivo e ligado ao site e ao servidor |
| `server/src/{app,auth,sync,index}.js` | Token Firebase, origem fechada, sync por dono | VERIFIED | Ver criterio 3 |
| `src/lib/scope.ts` | Unico ponto de ownerId | VERIFIED | `setScope/ownerId/ownerScope`; todos os `src/services/*.service.ts` usam `ownerScope()` e gravam `ownerId()` (guarda `owner-queries.test.js`) |
| `src/contexts/AuthContext.tsx` | Login so Firebase + claims | VERIFIED | MOCK so em DEV (`import.meta.env.DEV`) |
| `Dockerfile` / `.nvmrc` / engines | Node 22.23.x | VERIFIED | Ver criterio 5 |
| Ferramentas de migracao | `server/scripts/{backfill,verify,create-users,export-firestore,rehearsal,check-indexes}.js` | VERIFIED | Cobertas por `test:emu` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AuthContext` | `scope.ts` | `setScope` antes de `setUser` | WIRED | Linhas de `onAuthStateChanged` |
| `src/services/*` | `scope.ts` | `...ownerScope()` e `ownerId()` | WIRED | Guarda estatica `owner-queries.test.js` |
| `bank.service.ts` | `server/src/auth.js` | `Authorization: Bearer <ID token>` | WIRED | `auth.currentUser.getIdToken()`; servidor responde 401/403 como esperado em producao |
| `server/src/sync.js` | `shared/core/*` | import `../../shared/core/...` | WIRED | `classify`, `categories`; Dockerfile copia `shared/` |
| `SettingsPage` | `shared/core/categories.js` | `addCategory/renameCategory/archiveCategory` | WIRED | Persistido via `updateCategoryDefs` |
| `firebase.json` | `firestore.rules` | `firestore.rules` | WIRED | Regras restritivas apontadas; rollback em arquivo separado |

### Data-Flow Trace (Level 4)

| Artifact | Variable | Source | Real Data | Status |
|----------|----------|--------|-----------|--------|
| `OverviewDashboard` / listas | transacoes, categoryDefs | `getDocs(query(..., ...ownerScope(), ...))` em Firestore; `settings.categoryDefs` | Sim (371 docs reais com ownerId/categoryId) | FLOWING |
| Sync bancario | `ownerId`, `categoryId` | `connection.ownerId` (gravado no backfill/`/api/connections` a partir do token) | Sim no emulador | FLOWING |

### Behavioral Spot-Checks

Executados nesta verificacao com `. ./scripts/dev-env.sh` (Node v22.23.5, OpenJDK 21.0.13).

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Nucleo de calculo | `npm run test:core` | 50/50 | PASS |
| Nucleo em UTC e Tokyo | `npm run test:core:tz` | 50/50 + 50/50 | PASS |
| Guardas estaticas | `npm run test:static` | 35 pass, 1 skip, 0 fail | PASS |
| Varredura do bundle | `DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js` | 5/5 | PASS |
| Servidor (unit) | `npm run test:server` | 20/20 | PASS |
| Matriz de regras | `npm run test:rules` | 10/10 | PASS |
| Backfill/sync/verify no emulador | `npm run test:emu` | 48/48 | PASS |
| Build | `npm run build` | ok (so aviso de chunk grande) | PASS |
| Servidor Railway | `curl /health`, `POST /api/sync` sem token, Origin invalida + Bearer, `x-api-key` | 200, 401, 403, 401 | PASS |
| Firestore em producao, anonimo | REST GET em `transactions`, `settings`, `bankImports`; POST create | 403, 403, 403, 403 | PASS |

### Probe Execution

SKIPPED: a fase nao declara probes (`scripts/*/tests/probe-*.sh`).

### Requirements Coverage

| Requirement | Plano(s) | Description | Status | Evidence |
|-------------|----------|-------------|--------|----------|
| FUND-01 | 01-05, 01-11 | Login so Firebase; legado e cadastro abertos removidos | SATISFIED no codigo; limpeza de Console/segredos pendente | Criterio 1. Pendencia: "user actions", `.env.local`, senhas |
| FUND-02 | 01-06, 01-08, 01-11, 01-12 | `ownerId` em tudo, backfill sem perda | SATISFIED | verify: 371 docs, 0 faltando; guarda `owner-queries` |
| FUND-03 | 01-03, 01-13 | Firestore so permite o dono, testado no emulador, publicado por ultimo | SATISFIED | Criterio 2; ordem do cutover respeitada (login, backfill, indices, Release B, regras) |
| FUND-04 | 01-03, 01-07, 01-12 | Servidor so com token, `ownerId` do token, origens fechadas | SATISFIED | Criterio 3 |
| FUND-05 | 01-04, 01-09 | Categorias com id estavel | SATISFIED | Criterio 4 |
| FUND-06 | 01-04 | Nucleo puro compartilhado com testes e fuso SP | SATISFIED | Criterio 5 |
| FUND-07 | 01-02 | Node 22.23.4+, firebase 13, firebase-admin 14 | SATISFIED | Criterio 5 |

Requisitos orfaos: nenhum (REQUIREMENTS.md mapeia FUND-01..07 para a Fase 1 e todos aparecem nos planos).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/ui/{badge,button,input,select}.tsx` | varias | 4 erros e 2 avisos de eslint | Info | Preexistentes (linha de base do 01-02 era 8 problemas; hoje 6, sem novo problema). Nao bloqueia |
| `.env.local` | - | Arquivo de segredo ainda rastreado pelo git e modificado | Warning | Higiene (ver Verificacao Humana 2); nao funcional |

Nenhum `TBD`, `FIXME` ou `XXX` em `src/`, `server/`, `shared/`, `test/`, `scripts/`, regras ou Dockerfile. Nenhum `request.auth != null` isolado.

### Verificacoes especificas pedidas

- `package.json` engines/pin: `server/package.json` engines `>=22.23.4`; `.nvmrc` 22.23.5; `Dockerfile` node 22.23.5. OK.
- `.env.amigo` (D-15): nao lido; nao aparece em `git status` como modificado e a data de modificacao do arquivo (5 de junho) e anterior a fase; `build:amigo`/`dev:amigo` e o alvo `amigo` do `.firebaserc` seguem intactos. OK.
- Sem `request.auth != null` como allow isolado: confirmado.
- `firestore.rules.legacy` e `firebase.rollback.json` existem e estao rastreados: confirmado.

### Observacoes sem impacto no status

- `01-13-SUMMARY` cita `test:server 50/50`; a execucao atual e 20/20 (o `01-10-SUMMARY` tambem diz 20/20). Parece erro de digitacao no resumo; os 50 batem com `test:core`.
- O cabecalho `**/*.js` imutavel em `firebase.json` e questao da Fase 5 (service worker), fora do escopo desta fase.
- Item de Wave 0 do `01-VALIDATION.md` (frontmatter `draft`, `nyquist_compliant: false`) nao foi atualizado; documental.

### Human Verification Required

1. **Desativar "user actions" no Firebase Auth** (Console). Esperado: criacao de contas fechada. Por que humano: Console externo; impacto em FUND-01/criterio 1.
2. **Higiene de segredos locais**: limpar `.env.local`, `git rm --cached .env.local` manualmente, redefinir as senhas das duas contas. Por que humano: arquivo protegido e senhas expostas no chat.
3. **Railway**: confirmar `APP_API_KEY` removida e Root Directory vazio. Evidencia indireta forte ja coletada.
4. **Conferencia real em producao** (telas e Bancos > Sincronizar agora como Ele e Ela). Por que humano: o dono respondeu `keep`, sem conferencia por tela evidenciada; sync com `ownerId` provado so no emulador.

### Gaps Summary

Nenhum gap de codigo. Os criterios 2, 4 e 5 e a parte de codigo dos criterios 1 e 3 estao verificados por execucao local e por checagens externas nao destrutivas (curl no Railway e no Firestore REST sem credenciais). A fase fica `human_needed` por 4 itens de Console, segredos e conferencia em producao, todos nao bloqueantes para o codigo. Nada foi publicado, empurrado ou alterado em producao nesta verificacao.

---

_Verified: 2026-11-17T19:10:00Z_
_Verifier: Claude (gsd-verifier)_
