# Phase 1: Fundação de dados e acesso - Research

**Researched:** 2026-11-17
**Domain:** Firebase Auth (custom claims) + Firestore Security Rules por dono + migração de dados (backfill) + servidor Express com `verifyIdToken` + núcleo de cálculo compartilhado (ESM puro) + upgrade de dependências
**Confidence:** HIGH (quase tudo foi verificado por spike executado nesta sessão: regras com claims no emulador, `firebase-admin` 14 + Auth emulator, `BulkWriter`, build com `firebase` 13, imagem Docker com `shared/`); MEDIUM nos pontos que dependem de painéis que não consegui abrir (Railway, Firebase Auth "user actions").

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dono dos dados e login**
- **D-01:** Cada pessoa tem login Firebase individual (e-mail/senha); o sistema sabe quem é quem e o app abre na aba de quem entrou. As duas contas pertencem a um mesmo casal.
- **D-02:** O dono dos dados (`ownerId`) é o **id do casal (`hid`)**, não o uid de cada pessoa. Os dois logins compartilham o mesmo `hid`. — **Reversibility:** one-way — todo documento gravado e toda regra do Firestore passam a depender desse campo; trocar exige novo backfill e reescrever regras.
- **D-03:** O vínculo é feito por **custom claims no ID token**: `hid` (casal) e `person` (`ele`/`ela`). As regras do Firestore leem direto de `request.auth.token`, sem consulta extra. — **Reversibility:** costly — regras, cliente e servidor leem esses claims; mudar para documento `households/{hid}` toca todas as regras.
- **D-04:** Contas e claims criados por **script de admin do dono** (cria os 2 usuários no Firebase e grava os claims). O **cadastro aberto (`signUp`) e o login `ratimbum`** (`VITE_APP_USERNAME`/`VITE_APP_PASSWORD`, chaves em localStorage) são removidos de uma vez. Sem convite pela interface nesta fase.
- **D-05:** Abre na aba da pessoa (`person` do claim), mas **os dois continuam vendo e lançando em todas as abas**, como hoje. Sem privacidade ou somente-leitura entre o casal nesta fase.
- **D-06:** Manter a costura aberta (um `scope()`/`ownerId()` central) para a Fase 8 (amigo com dados separados) virar operação de dados, não reescrita.

**IDs estáveis de categoria**
- **D-07:** Categoria vira `{id, name, ...}` com **ID estável** (slug gerado na criação, nunca muda). O mesmo script de backfill do `ownerId` acrescenta `categoryId` a cada lançamento e conta fixa a partir do nome atual; o campo `category` (texto) permanece como cópia durante a transição. — **Reversibility:** one-way — o histórico e os limites futuros (Fase 3) passam a referenciar o ID.
- **D-08:** **Excluir arquiva, nunca apaga**: `archived=true` esconde das listas novas, mas lançamentos antigos continuam mostrando o nome.
- **D-09:** O servidor (importação bancária, `mapCategory` em `server/src/sync.js`) passa a devolver `categoryId` ao mapear o nome do banco; o sync grava `ownerId` e `categoryId` em tudo que importa.

**Núcleo compartilhado e testes**
- **D-10:** `shared/core/*.js` em ESM com JSDoc/`// @ts-check`, importado pelo site por alias e pelo servidor por `../../shared/...` (zero cópia). Exige que o **Railway use a raiz do repositório** (não só `server/`); verificar a configuração atual do Railway no planejamento. — **Reversibility:** costly — mudar de raiz-no-repo para cópia exige mexer no deploy e nos imports.
- **D-11:** Testes com **`node --test`** (mesmo runner de `server/test/`), sem dependência nova. Fuso `America/Sao_Paulo` e relógio injetado.
- **D-12:** Migrar para o núcleo **só o cálculo que já existe**: classificação de `classify.js`, saldo acumulado e gasto semanal. Orçamento, limites e alertas nascem na Fase 3.

**Corte das regras e rollback**
- **D-13:** Ensaio com **emulador + cópia exportada**: exportar os dados reais, rodar backfill e testes de regras no emulador, comparar contagens antes/depois por coleção; em produção, **dry-run primeiro** e **backup exportado** antes.
- **D-14:** Cutover por **checklist com verificação manual**: login, backfill, índices, cliente novo no ar, os dois entram e conferem as telas, só então publicar as regras. Manter `firestore.rules.legacy` (regras abertas atuais) para reverter com um deploy.
- **D-15:** O projeto do amigo (`financias-xrd`, `.env.amigo`, `build:amigo`) **não é tocado** nesta fase.

### Claude's Discretion
- Formato exato do slug de categoria e nomes de campos (`hid`, `person`, `archived`, `categoryId`), desde que respeitem as decisões acima.
- Estrutura interna do script de admin e do backfill (uso de `BulkWriter`, lotes, idempotência).
- Pastas e alias do `shared/core`, e como o site/servidor o consomem.

### Deferred Ideas (OUT OF SCOPE)
- Privacidade ou somente-leitura entre as abas do casal — escopo da Fase 8 (Visão do casal) se desejado.
- Convite de parceiro/amigo pela interface — Fase 8.
- Teste de fumaça automático pós-deploy das regras — descartado nesta fase (checklist manual escolhido).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FUND-01 | Login só Firebase (e-mail/senha); sem login `ratimbum` e sem cadastro aberto | AuthContext reescrito (claims via `getIdTokenResult`), remoção de `signUp`/legado/`VITE_APP_*`, limpeza de `localStorage`, "user actions" do Auth (§Pitfalls 3, §Security) |
| FUND-02 | `ownerId` em todos os dados, com backfill sem perda | Inventário de 12 coleções, script de backfill idempotente com `BulkWriter` (spike verde), contagens antes/depois, `verify` com "zero sem ownerId" (§Cutover, §Code Examples) |
| FUND-03 | Regras por dono, testadas no emulador, publicadas só no fim | Regras com `request.auth.token.hid` validadas por 8 testes no emulador (spike), ordem do cutover, `firestore.rules.legacy` (§Code Examples, §Cutover) |
| FUND-04 | Servidor só com token Firebase, dono derivado do token, domínios autorizados | `verifyIdToken` + `hid` claim (spike com Auth emulator), checagem explícita de `Origin`, app factory testável, ownership por endpoint (§Patterns 3) |
| FUND-05 | Categorias com ID estável | `shared/core/categories.js` (slug, defs, resolução por id), `categoryDefs` em `settings/main` mantendo `categories: string[]`, backfill de `categoryId`, exibição por id (§Patterns 5) |
| FUND-06 | Núcleo puro compartilhado, testado, fuso de São Paulo | `shared/core` sem dependências (Intl), spike de `monthRange` rodando verde em 3 fusos de host, alias TS/Vite validado, Dockerfile validado (§Patterns 4) |
| FUND-07 | Node 22.23.4+, `firebase` 13, `firebase-admin` 14 sem regressão | `firebase@13.4.0` passa `tsc -b` + `vite build`; `firebase-admin@14.5.1` passa os 12 testes do servidor; imagem `node:22.23.5-slim` validada (§Standard Stack) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Fontes: `./CLAUDE.md` (raiz) e `./.claude/CLAUDE.md`. Não existem skills de projeto (`.claude/skills/`, `.agents/skills/` sem `SKILL.md`).

- Todas as mudanças de arquivo passam por um fluxo GSD (`/gsd-execute-phase`, `/gsd-quick`); não editar fora do fluxo. (`.claude/CLAUDE.md`, "GSD Workflow Enforcement")
- **Custo**: o projeto deve rodar de graça (Firebase Spark/Hosting, Railway, IA gratuita). Implicações aqui: **export gerenciado do Firestore exige Blaze** (ver Pitfall 6) e **Cloud Functions/blocking functions são inviáveis**; usar scripts Admin SDK locais.
- **Compatibilidade**: manter o que já funciona (abas Ele/Ela/Porquinho, calendário, metas, sync bancária); sem perder dados nem trocar o projeto Firebase.
- **Idioma**: interface em pt-BR.
- Convenções de código: alias `@` → `src/`; serviços em `src/services/*.service.ts` com ramo `MOCK` (localStorage) quando `VITE_USE_EMULATOR=true`; hooks `{ data, loading, error, add, update, remove, refetch }`; componentes shadcn/ui + Tailwind; formulários react-hook-form + zod.
- `.claude/CLAUDE.md` (STACK) já recomenda: `firebase` ^13.4.0, `firebase-admin` ^14.5.1, `@firebase/rules-unit-testing` ^6.0.0, JDK para o emulador, Spark (50K reads / 20K writes por dia). **Divergência travada por CONTEXT:** o STACK diz "Do not use custom claims for tenancy"; D-03 trava custom claims. CONTEXT vence.
- `CLAUDE.md` da raiz documenta o login legado (`VITE_APP_USERNAME`/`VITE_APP_PASSWORD`, "defaults to ratimbum/ratimbum123") e `VITE_USE_EMULATOR`: **atualizar ambos os arquivos e o `README.md`** ao remover o login legado.

## Summary

A fase é uma migração de acesso e de dados em cima de um app que hoje roda com regras `allow read, write: if true`, login local no navegador e uma chave compartilhada embutida no bundle. A abordagem travada (claims `hid`/`person`, `ownerId = hid`) funciona e foi **provada nesta sessão**: regras que leem `request.auth.token.hid` negam anônimo, conta sem claim, outro casal, consulta sem filtro, criação com `ownerId` alheio e troca de `ownerId` no update (8/8 testes verdes no emulador); `firebase-admin` 14 cria usuário, grava claims e `verifyIdToken` devolve `hid`/`person`; um `BulkWriter` idempotente escreveu 5 docs na 1ª rodada e 0 na 2ª.

Os riscos reais são de **sequência e de ambiente**, não de API: (1) o cutover tem de seguir a ordem do ROADMAP, e o servidor/`sync` e clientes antigos continuam criando docs sem `ownerId` entre o backfill e as regras, então é preciso um portão final "zero documentos sem `ownerId`"; (2) o emulador exige **Java 21+** (não instalado aqui; a JRE Temurin 21 baixada por tarball, sem sudo, funcionou); (3) `@firebase/rules-unit-testing@6.0.0` declara `engines >=24.12.0`, mas carrega e roda normalmente no Node 22.17.1 (só aviso do npm); (4) o repositório GitHub é **público** e versiona `.env.local`, `.env.amigo`, `dist/` e `node_modules/` (a chave `VITE_BANK_API_KEY` e a senha legada devem ser tratadas como já expostas, o que reforça remover o login legado e a chave compartilhada); (5) o Railway não pôde ser inspecionado (CLI sem login): **D-10 exige confirmar a configuração atual**, e a rota recomendada é um `Dockerfile` na raiz do repositório (validado: build + import de `shared/` + Node 22.23.5), porque `railway.json`/`railway.toml` (Config as Code) para de ser lido em 2026-12-01.

**Primary recommendation:** Implementar em ondas independentes (núcleo + testes; regras + testes; scripts admin/backfill; servidor com token; cliente com `scope()`), sem deploy até o runbook de cutover; no cutover, seguir A → backfill → servidor → índices → B → portão "zero sem ownerId" → regras, com `firestore.rules.legacy` pronto para reverter.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Identidade (e-mail/senha) e emissão de ID token com claims | Firebase Auth (serviço gerenciado) | Browser (SDK `firebase/auth`) | Auth emite o token; claims só se gravam via Admin SDK |
| Criação de contas e claims (`hid`, `person`) | Script Admin local do dono | — | D-04: sem UI e sem Cloud Functions (Blaze) |
| Isolamento de dados por casal | Firestore Security Rules | API/Backend (checagem própria, pois Admin SDK ignora regras) | Cliente lê Firestore direto; regras são a fronteira |
| Montagem de queries com `ownerId` | Browser (`scope()` + services) | — | Regras não filtram; a query tem de incluir `where('ownerId','==',hid)` |
| Autenticação das chamadas `/api/*` | API/Backend (`verifyIdToken`) | Browser (envia `Authorization: Bearer`) | A chave compartilhada no bundle é pública |
| Restrição de origem (CORS) | API/Backend | — | CORS só protege navegadores; o token é o gate real |
| Gravação de `ownerId`/`categoryId` na importação bancária | API/Backend (`sync.js`) | Database | Admin SDK ignora regras; dono vem de `bankConnections.ownerId` |
| Backfill, export e verificação | Script Admin local | Emulador (ensaio) | Operação única, com dry-run e contagens |
| Cálculos puros (classificação, saldo, gasto semanal, categorias, fuso) | `shared/core` (JS puro) | Browser e API/Backend consomem | D-10/D-12: uma implementação, zero cópia |
| Hospedagem do servidor com `shared/` | Railway (raiz do repo, Dockerfile) | — | Servidor precisa enxergar `../../shared` |
| Índices compostos | Firestore (`firestore.indexes.json`) | — | Emulador não cobra índice; só produção revela |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase` (cliente) | ^13.4.0 (instalado: 12.10.0) | Auth, Firestore, `getIdTokenResult` | FUND-07. Em copia do cliente: `tsc -b` limpo e `vite build` ok com 13.4.0. Release notes: 13.0.0 só tem breaking changes em AI Logic; Auth sem mudanças [CITED: firebase.google.com/support/release-notes/js] |
| `firebase-admin` (servidor) | ^14.5.1 (instalado: 13.10.0) | `verifyIdToken`, `setCustomUserClaims`, Firestore, `BulkWriter` | FUND-07. `engines: node >=22` [VERIFIED: npm registry]. 14.0.0 removeu Node 18/20, Instance ID e namespaces legados; o servidor usa só imports modulares [CITED: github.com/firebase/firebase-admin-node/releases/tag/v14.0.0]. Os 12 testes do servidor passam com 14.5.1 |
| Node.js (servidor, Docker) | 22.23.5 (LTS "Jod") | Runtime | 22.23.4 e 22.23.5 existem [VERIFIED: nodejs.org/dist/index.json]; imagem `node:22.23.5-slim` existe [VERIFIED: hub.docker.com tags]. Local hoje: 22.17.1 (abaixo do exigido) |
| `@firebase/rules-unit-testing` (dev, raiz) | ^6.0.0 | Testar regras no emulador com claims | Peer `firebase ^13.0.0` [VERIFIED: npm registry]. `engines >=24.12.0`, mas carrega e roda no Node 22.17.1 (spike); só gera aviso EBADENGINE |
| `node:test` (built-in) | Node 22 | Runner de testes de `shared/`, servidor, regras e scripts | D-11; zero dependência nova. Usar glob (`node --test "shared/**/*.test.js"`); passar diretório falha no Node 22 (spike) |
| Firebase Emulator Suite (`firebase-tools`) | global 15.9.1 já instalado (latest 15.36.0) | `emulators:exec --only auth,firestore` | Config de portas já existe em `firebase.json`. **Exige Java 21+** [CITED: newreleases.io/project/npm/firebase-tools/release/15.0.0] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pluggy-sdk` | ^0.94.3 (instalado: 0.93.0) | Sync bancária | **Opcional nesta fase.** É o que de fato impõe Node `^22.23.4 \|\| >=24.22.1` (0.93.1+). Os 6 métodos usados pelo servidor existem em 0.94.3 e os testes passam. Recomendado subir junto, pois o pin de Node só faz sentido com ele |
| `cors` / `express` | 2.8.6 / 5.3.0 (instalados) | HTTP do servidor | Manter. `cors` reflete `Access-Control-Request-Headers` por padrão, então `Authorization` passa no preflight [VERIFIED: server/node_modules/cors/README.md:230] |
| JRE Temurin 21 | 21.0.13 | Rodar emuladores | Tarball extraído em diretório do usuário, sem sudo (spike OK). Alternativa: `apt install openjdk-21-jre-headless` (precisa sudo) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom claims (`hid`) | `households/{hid}` com `get()` nas regras | Travado em D-03; custa 1 leitura por avaliação e reescreve regras |
| Dockerfile na raiz (Railway) | Script `sync-shared` copiando para `server/src/shared/` | Alternativa já prevista (ARCHITECTURE §3 opção 2); usar só se o dono não quiser mudar a raiz do serviço. Exige teste que falhe se divergir |
| `railway.json`/`railway.toml` | `RAILWAY_DOCKERFILE_PATH` como variável do serviço | Config as Code está **deprecated e deixa de ser lido em 2026-12-01** [CITED: docs.railway.com/reference/config-as-code] |
| Export gerenciado (`gcloud firestore export`) | Script Admin que serializa para JSON | Export gerenciado exige Blaze e bucket [CITED: firebase.google.com/docs/firestore/manage-data/export-import]; contra a restrição de custo |
| `@date-fns/tz` no núcleo | `Intl.DateTimeFormat` com `timeZone` | `shared/` não pode ter import "bare": ele resolve a partir de `shared/`, e no Railway só `server/node_modules` existe (Pitfall 5). Intl não tem dependência |

**Installation:**
```bash
# Raiz (cliente + testes de regras)
npm install firebase@^13.4.0
npm install -D @firebase/rules-unit-testing@^6.0.0

# Servidor
cd server && npm install firebase-admin@^14.5.1 pluggy-sdk@^0.94.3   # pluggy opcional (ver Supporting)
# server/package.json: "engines": { "node": ">=22.23.4" }

# Ambiente local
nvm install 22.23.5 && nvm use 22.23.5
# JRE 21 sem sudo (verificado): baixar Temurin 21 JRE de api.adoptium.net, extrair em ~/.local/jdk e por no PATH
```

**Version verification:** [VERIFIED: npm registry, 2026-11-17] `firebase` 13.4.0 (publicado 2026-11-16), `firebase-admin` 14.5.1 (2026-11-12), `@firebase/rules-unit-testing` 6.0.0 (2026-10-07), `firebase-tools` 15.36.0 (2026-11-11), `pluggy-sdk` 0.94.3 (2026-11-16). Instalados hoje: `firebase@12.10.0`, `firebase-admin@13.10.0`, `pluggy-sdk@0.93.0`.

## Package Legitimacy Audit

Rodado: `gsd-tools query package-legitimacy check --ecosystem npm ...`. Todos são pacotes de longa data com repositório oficial; o veredito `SUS` vem só do motivo `too-new` (a **versão mais recente** foi publicada nos últimos dias), não da identidade do pacote.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `firebase` | npm | anos (13.4.0 saiu 2026-11-16) | ~14,6M/sem | github.com/firebase/firebase-js-sdk | SUS (too-new) | Aprovado com checkpoint: planner insere `checkpoint:human-verify` antes de instalar 13.4.0. Já validado em cópia (tsc + build) |
| `firebase-admin` | npm | anos (14.5.1 saiu 2026-11-12) | ~14,2M/sem | github.com/firebase/firebase-admin-node | SUS (too-new) | Aprovado com checkpoint. Já validado (12 testes + spikes) |
| `@firebase/rules-unit-testing` | npm | anos (6.0.0 em 2026-10-07) | ~2,0M/sem | github.com/firebase/firebase-js-sdk | OK | Aprovado |
| `firebase-tools` | npm | anos (15.36.0 em 2026-11-11) | ~5,2M/sem | github.com/firebase/firebase-tools | SUS (too-new) | Já instalado globalmente (15.9.1); **não adicionar ao projeto** nesta fase |
| `pluggy-sdk` | npm | anos (0.94.3 em 2026-11-16) | ~104K/sem | (SDK oficial Pluggy) | SUS (too-new) | Opcional; se adotado, checkpoint antes de instalar |

**Packages removed due to [SLOP] verdict:** nenhum.
**Packages flagged as suspicious [SUS]:** `firebase`, `firebase-admin`, `firebase-tools`, `pluggy-sdk` (todos `too-new`; versão pode ser fixada em uma anterior se o dono preferir: `firebase@13.3.0`). Nenhum tem `postinstall` (`postinstall: null` no sinal do seam). Nomes vieram de documentação oficial e do CONTEXT/STACK do projeto, não de busca aberta.

## Architecture Patterns

### System Architecture Diagram

```
 Dono roda localmente (service account, fora do git)
 ┌──────────────────────────────────────────────────────────────┐
 │ server/scripts/ (Admin SDK):                                  │
 │  export-firestore → JSON (backup)                             │
 │  create-users → Auth: cria Ele/Ela + setCustomUserClaims      │
 │                 {hid, person}                                 │
 │  backfill (--dry-run default | --apply) → ownerId + categoryId│
 │  verify → contagens por coleção, "sem ownerId" = 0            │
 └───────────────┬──────────────────────────────────────────────┘
                 │ (ensaio: mesmos scripts contra EMULADOR)
                 ▼
┌──────────── Navegador (Vite SPA) ────────────┐
│ LoginForm (só e-mail/senha)                   │
│   │ signInWithEmailAndPassword                │
│   ▼                                           │
│ AuthContext ── getIdTokenResult() ──► claims  │
│   │  {hid, person}; sem hid → "sem acesso"    │
│   ▼ setScope({hid, person}) ANTES de setUser  │
│ scope.ts: ownerId()                           │
│   │                                           │
│ services/*.service.ts ── where('ownerId','==',│
│   hid) + grava ownerId/categoryId             │
│   │ getDocs/onSnapshot        │ fetch /api/*  │
│   │                           │ Authorization:│
│   │                           │ Bearer <idTok>│
└───┼───────────────────────────┼───────────────┘
    ▼                           ▼
┌──────────────┐     ┌────────────────────────────────────────┐
│ FIRESTORE    │     │ Express (Railway, Docker, Node 22.23.x) │
│ Rules:       │     │ 1 Origin permitida? (403 se não)        │
│ token.hid ==  │◄────┤ 2 verifyIdToken → exige claim hid       │
│ ownerId       │     │ 3 req.owner = {uid, hid, person}        │
│ default-deny  │     │ 4 handler: ownerId := req.owner.hid     │
└──────▲───────┘     │    (nunca do corpo); confere dono do    │
       │             │    recurso (connections/:itemId)        │
       │ Admin SDK   │ sync.js (agendado + manual):            │
       └─────────────┤    ownerId := bankConnections.ownerId   │
         (ignora     │    categoryId := mapCategory(defs)      │
          regras)    └───────────────▲────────────────────────┘
                                     │ import ../../shared/core/*
                       ┌─────────────┴──────────────┐
                       │ shared/core (JS puro, ESM) │◄── import '@shared/core/*' (Vite/TS)
                       │ classify, ledger, time,    │
                       │ categories — sem deps, sem │
                       │ new Date() interno         │
                       └────────────────────────────┘
```

### Recommended Project Structure
```
shared/
├── package.json            # {"type":"module"} (seguro mesmo sem package.json acima, ex.: no Docker)
└── core/
    ├── time.js             # zonedParts, monthRange, daysRemainingInMonth (Intl, sem deps)
    ├── classify.js         # movido de server/src/classify.js (now injetado)
    ├── ledger.js           # accumulatedBalance, monthTotals, weeklySpend (centavos inteiros)
    ├── categories.js       # slugify, buildCategoryDefs, resolveCategoryId, categoryDisplayName
    └── *.test.js           # node --test "shared/**/*.test.js"
server/
├── src/
│   ├── app.js              # createApp({ verifyToken, db, pluggy, origins }) — testável
│   ├── index.js            # bootstrap (env, initializeApp, listen, agendador)
│   └── sync.js             # importa ../../shared/core/*
├── scripts/                # export-firestore, create-users, backfill, verify (resolvem server/node_modules)
└── test/                   # app.test.js, emu/*.test.js (emulador)
src/
├── lib/scope.ts            # setScope/ownerId()/ownerQuery()
├── contexts/AuthContext.tsx
└── services/*.service.ts   # todas filtram/gravam ownerId
test/rules/                 # *.test.js (rules-unit-testing) + firestore rules de produção
firestore.rules             # novas (restritivas)
firestore.rules.legacy      # cópia das regras abertas atuais (rollback)
Dockerfile + .dockerignore  # na raiz do repo (Railway)
```

### Pattern 1: Claims como fronteira + `scope()` como costura (D-02, D-03, D-06)
**What:** `hid` e `person` vêm do ID token; um módulo único (`src/lib/scope.ts`) guarda o escopo atual e é a única fonte de `ownerId` para services.
**When to use:** todo service, hook e query do cliente; no servidor, o equivalente é `req.owner`.
**Pontos críticos:**
- `setScope()` deve rodar **antes** de `setUser()` no `onAuthStateChanged`: `AreaProvider` dispara `loadSettings()` no efeito de `user`, e `getSettings()` já consulta o Firestore (`settings.service.ts:28-33`).
- Se o token não tem `hid`: forçar `getIdTokenResult(true)` uma vez (sessão antiga de antes do script de claims) e, persistindo, mostrar "conta sem acesso" e fazer `signOut`.
- `bank.service.ts:40` (`onSnapshot(query(collection(db, 'bankConnections')))`) é um listener **sem filtro**; precisa de `where('ownerId','==',hid)`. (O CONTEXT diz "sem onSnapshot", o que não é inteiramente verdade: este existe.)

### Pattern 2: Regras por dono, default-deny, `ownerId` imutável (FUND-03)
**What:** um único `match /{col}/{id}` com lista explícita de coleções; tudo fora da lista é negado. `bankConnections` e `bankImports` são **somente leitura** para o cliente (escrita só pelo servidor). Fase 2 vai precisar liberar escrita em `bankImports` e emendar as regras então.
**Detalhes verificados no emulador (spike):**
- Consulta **sem** `where('ownerId','==',hid)` é negada inteira; com filtro de outro `hid` também.
- `getDoc` de documento **inexistente** é negado (`resource` nulo): o caminho "criar `settings/main` se não existe" quebra sob regras. Aceitável porque o backfill garante que `settings/main` existe; se se quiser tolerar, usar `resource == null || ownsExisting()` só em `get` de `settings`.
- `request.resource.data` é o documento resultante do merge: `updateDoc(ref, {amount: 9})` passa a checagem de imutabilidade; `updateDoc(ref, {ownerId:'outro'})` falha. Logo `runTransaction` em `goals` (que só atualiza `currentAmount`) continua válido.
- Conta sem claim `hid` (inclusive cadastro aberto) não lê nem grava nada, o que torna o claim a barreira real mesmo que o cadastro aberto não possa ser desligado.

### Pattern 3: Servidor: app factory + token + dono do token (FUND-04)
**What:** extrair `createApp(deps)` para `server/src/app.js` (hoje `index.js` inicializa tudo no import e não é testável). Middleware nesta ordem: (1) `Origin` presente e fora da lista → 403; (2) `Authorization: Bearer` → `verifyIdToken` → 401 se inválido; (3) exigir `decoded.hid` string → 403; (4) `req.owner = { uid, hid, person }`.
**Regras por endpoint:**
- `ownerId` **nunca** do corpo; `person` do corpo continua aceito e validado contra `['ele','ela']` (D-05).
- `POST /api/connections`: se o doc já existe com `ownerId` diferente → 403; ao criar, gravar `ownerId`.
- `DELETE /api/connections/:itemId`: carregar o doc e exigir `ownerId === req.owner.hid` (IDOR).
- `POST /api/sync`: sincronizar só conexões do `hid` e filtrar o resultado; o agendador sincroniza todas.
- `/api/maintenance/clean-descriptions`: filtrar `.where('ownerId','==',hid)` (consulta só com igualdade, sem índice novo) ou remover a rota.
- `ALLOWED_ORIGINS`: passa a **obrigatória** (hoje vazio = `origin: true`, reflete qualquer origem; `index.js:35`). CORS é defesa de navegador; o gate real é o token.
- Remover `APP_API_KEY` (`required('APP_API_KEY')`, `index.js:18`) e o middleware `x-api-key`; remover `VITE_BANK_API_KEY` do cliente.

### Pattern 4: `shared/core` sem dependências, relógio e fuso injetados (FUND-06, D-10..D-12)
**What:** ESM puro, `// @ts-check` + JSDoc, sem `import` de pacote (resolução parte de `shared/`, e no Docker só existe `server/node_modules`), sem `new Date()` interno, fuso padrão `America/Sao_Paulo` via `Intl`.
**Escopo (D-12):** `classify`/`cleanDescription`/`findDuplicate`/`mapCategory` (movidos de `server/src/classify.js`), `accumulatedBalance` (hoje `getAccumulatedBalance`), `weeklySpend` (hoje em `OverviewDashboard.tsx:~110-125`: `daysRemaining + 1`, `Math.ceil(daysRemaining/7)`, `saldoMensal / weeksRemaining`), mais `time.js` e `categories.js`. Orçamento/limites/alertas ficam para a Fase 3.
**Método:** primeiro testes de caracterização do comportamento atual (mesmos números), depois mover. Somar em centavos inteiros e devolver reais (`Math.round(x*100)`), evitando ruído de ponto flutuante.
**Consumo:** TS/Vite via alias `@shared` + `allowJs` e `// @ts-check` por arquivo (spike: `tsc -b` e `vite build` passam; com `checkJs` global o TS exige JSDoc completo em todos os parâmetros, o que também é aceitável). Servidor via `../../shared/core/x.js`.
**Teste de fuso:** rodar a suíte com `TZ=UTC`, `TZ=America/Sao_Paulo` e `TZ=Asia/Tokyo` (spike: `monthRange` identico nos 3) e incluir o caso `2026-11-01T02:30Z` (ainda 31/10 em São Paulo).

### Pattern 5: Categorias com ID estável (FUND-05, D-07..D-09)
**What:** `settings/main.categoryDefs: [{ id, name, color?, archived? }]` **mais** `categories: string[]` mantido como derivado (nomes das não arquivadas). Motivo: `Settings.categories` é `string[]` (`src/types/index.ts:54`); trocar o tipo quebra o cliente antigo e o rollback.
**Backfill de categorias:** partir de `settings/main.categories`; todo texto de `category` encontrado em `transactions`, `fixedExpenses` e `bankImports` que **não** esteja na lista (ex.: categoria apagada antes) vira def com `archived: true` (D-08), casando por `normalize()` (acento/caixa/espaços). `categoryId` é acrescentado ao doc; `category` (texto) permanece.
**Slug:** `normalize` + `[^a-z0-9]+ → '-'` + aparar; colisão ganha sufixo `-2`, `-3`. IDs padrão: `alimentacao`, `transporte`, `moradia`, `saude`, `lazer`, `educacao`, `vestuario`, `servicos`, `salario`, `investimentos`, `outros` (derivados de `DEFAULT_CATEGORIES`, `src/types/index.ts`).
**Exibição:** `categoryDisplayName(tx, defs)` resolve por `categoryId` e cai no texto `category` se não achar; é isso que mantém o histórico certo depois de **renomear** (o critério de sucesso 4 exige demonstrar renomeação; hoje a tela de Configurações só adiciona e remove, `SettingsPage.tsx:67-96`, então incluir renomear mínimo ou cobrir por teste de `shared/core` + backfill).
**Servidor:** `mapCategory(names, defs)` devolve `{ id, name }` (ignora arquivadas; fallback `outros`); o mapa `learned` (descrição → categoria, `sync.js:127`) passa a guardar `categoryId`.

### Anti-Patterns to Avoid
- **Publicar `request.auth != null` ainda que temporariamente:** com cadastro aberto qualquer pessoa lê tudo. Ir direto de `if true` para regras por dono (ROADMAP).
- **`import` de pacote dentro de `shared/`:** quebra no Railway.
- **Confiar em `person`/`ownerId` do corpo da requisição.**
- **Usar `railway.json`/`railway.toml` como solução:** deprecated, para de funcionar em 2026-12-01.
- **Backfill que sobrescreve:** só preencher quando ausente; nunca tocar `createdAt` nem `description`.
- **Fiar-se do emulador para índices:** ele não cobra índice; só produção revela `failed-precondition`.
- **Deixar o modo MOCK com `auth` nulo:** em `VITE_USE_EMULATOR=true`, `firebase.ts` exporta `auth: null`, e `onAuthStateChanged(null, ...)` quebra. Ao remover o login legado, o modo MOCK perde seu único caminho de entrada. Recomendação: identidade fixa de desenvolvimento (`hid:'mock'`, `person:'ele'`) **somente** sob `import.meta.env.DEV` (eliminada do build de produção), ou aposentar o MOCK; decisão do planner.

## Cutover Runbook (ordem recomendada; cada deploy separado)

Respeita a ordem obrigatória do ROADMAP. O backfill só **adiciona campos**, então é invisível para clientes antigos.

| Passo | Ação | Verificação / portão |
|-------|------|----------------------|
| R0 | Ambiente: Node 22.23.5, JRE 21, testes verdes. **Backup**: `export-firestore` de produção para JSON fora do git. Auditar usuários do Auth (listar; marcar contas desconhecidas). `create-users` (dry-run → apply) com `--hid` e senhas informadas na hora | Contagens por coleção salvas; 2 usuários com claims |
| R1 | **Ensaio** no emulador: carregar o backup, rodar backfill + `verify`, rodar testes de regras | Contagens antes = depois; 0 sem `ownerId`; regras 100% |
| R2 | **Release A (cliente)**: login só Firebase, claims no contexto, `scope()`, gravações com `ownerId`/`categoryId`, leituras ainda sem filtro; sem `signUp`/legado/`VITE_APP_*`. Deploy Hosting | Ele e Ela entram e conferem as telas; botões do banco ficam indisponíveis até R4 (servidor antigo ainda quer `x-api-key`) |
| R3 | **Backfill de produção**: `--dry-run`, depois `--apply`, depois `verify` | Contagens antes/depois por coleção; 0 sem `ownerId` |
| R4 | **Servidor** (Railway: raiz do repo + Dockerfile, Node 22.23.5, `ALLOWED_ORIGINS`, sem `APP_API_KEY`) com token + `ownerId`. **Rodar `verify` de novo** | Chamada sem token = 401; origem estranha = 403; sync grava `ownerId`; 0 sem `ownerId` |
| R5 | **Índices**: `firebase deploy --only firestore:indexes`; aguardar todos `READY` | `firebase firestore:indexes` |
| R6 | **Release B (cliente)** consulta por `ownerId` | Ambos percorrem **todas** as telas; console sem `failed-precondition`; dados iguais aos de antes |
| R7 | **Portão final**: `verify` = 0 sem `ownerId`/`categoryId`; testes de regras verdes. Copiar regras atuais para `firestore.rules.legacy` (já guardada antes), publicar `firestore.rules` novas | Casal usa o app; rollback = `cp firestore.rules.legacy firestore.rules` + `firebase deploy --only firestore:rules` |
| R8 | Pós: no console, desligar "user actions" (criação) se disponível; remover contas desconhecidas; remover `VITE_BANK_API_KEY`/`VITE_APP_*` dos `.env*`; atualizar `CLAUDE.md`/`README.md` | — |

**Hazards de janela:** (H1) o sync agendado (6 h) e clientes antigos podem criar docs sem `ownerId` entre R3 e R4/R7: o `verify` repetido é o portão. (H2) Entre R2 e R4 os botões de banco falham (aceitável, uso pessoal). (H3) Cliente antigo em aba aberta após R7 recebe `permission-denied`: recarregar.

## Query & Index Inventory

Todas as consultas do cliente ganham `where('ownerId','==',hid)`. Com igualdade + `orderBy`/intervalo em outro campo é preciso índice composto; consultas só com igualdade usam o merge de índices simples [ASSUMED]. Manter os 7 índices antigos até não haver cliente velho.

| Coleção | Consulta (arquivo) | Índice composto novo (`ownerId ASC` primeiro) |
|---------|--------------------|------------------------------------------------|
| transactions | `person`, `date` intervalo, `orderBy date desc` (`getTransactions`; também `sync.js`) | `ownerId, person, date DESC` |
| transactions | `date` intervalo, `orderBy date desc` (`getAllTransactionsForMonth`) | `ownerId, date DESC` |
| fixedExpenses | `isActive`, `orderBy dueDay` | `ownerId, isActive, dueDay` |
| fixedExpenses | `person`, `isActive`, `orderBy dueDay` | `ownerId, person, isActive, dueDay` |
| goals | `orderBy createdAt desc` | `ownerId, createdAt DESC` |
| goalContributions | `date` intervalo, `orderBy date desc` | `ownerId, date DESC` |
| goalContributions | `goalId`, `orderBy date desc` | `ownerId, goalId, date DESC` |
| events | `date` intervalo, `orderBy date asc` | `ownerId, date ASC` |
| eventCategories | `orderBy createdAt asc` | `ownerId, createdAt ASC` |
| notes | `person`, `orderBy createdAt desc` | `ownerId, person, createdAt DESC` |
| savings | `orderBy date desc` | `ownerId, date DESC` |
| (só igualdade, sem composto) | `fixedExpensePayments` (`month`,`year`; `fixedExpenseId`), `getTransactionsByCategory`, `getFixedExpensesByCategory`, saldo acumulado (`person`), `goalContributions` por `goalId` (delete), `bankConnections`, `bankImports` (`person`), `transactions` `source=='bank'` | — |

Coleções do cliente [VERIFIED: grep das definições `const COL =` em `src/services/*.ts`]: `savings`, `transactions`, `events`, `goals`, `eventCategories`, `notes`, `fixedExpenses`, `fixedExpensePayments`, `goalContributions`, mais `settings` (doc `main`) e `bankConnections`. Do servidor [VERIFIED: server/src/sync.js:12-14]: `const CONNECTIONS = 'bankConnections'`, `const IMPORTS = 'bankImports'`, `const TRANSACTIONS = 'transactions'`. Total: 12. O script de backfill deve **enumerar `db.listCollections()`** e falhar se achar coleção fora dessa lista (as regras default-deny a esconderiam).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verificar token do usuário no servidor | Parser/validador de JWT | `getAuth().verifyIdToken()` | Chaves, expiração, audiência; spike devolve `hid`/`person` |
| Gravar claims | Tabela própria de papéis | `getAuth().setCustomUserClaims()` | Claims vão assinadas no token; limite de 1000 bytes [CITED: firebase.google.com/docs/auth/admin/custom-claims] |
| Testar regras | Checagem manual no console | `@firebase/rules-unit-testing` (`authenticatedContext(uid, {hid})`) | Regras são a fronteira de privacidade; spike 8/8 |
| Escrita em massa do backfill | Loop com `batch` manual de 400 | `db.bulkWriter()` | Retentativas e ritmo embutidos; idempotência por "só se ausente" |
| Fuso e fronteira de mês | `Date` local + `-3h` manual (como `index.js:80-82`) | `Intl.DateTimeFormat` com `timeZone` em `shared/core/time.js` | Servidor roda em UTC; independe do fuso do host (spike em 3 fusos) |
| Runner de testes | Vitest/Jest | `node --test` | D-11; já usado no servidor |
| Reconhecer CORS/preflight | Cabeçalhos à mão | `cors` com lista de origens | Já é dependência; só falta fechar a lista e checar `Origin` |

**Key insight:** o que parece "só trocar a regra" é uma sequência de dados e deploys; ferramentas prontas cobrem a segurança, e o trabalho próprio é a **ordem** e a **verificação** (contagens, portão "zero sem ownerId").

## Runtime State Inventory

Fase de migração de dados e acesso (acrescenta `ownerId`/`categoryId`, troca o auth): inventário obrigatório.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Firestore `financias-ratimbum`, 12 coleções (lista acima) sem `ownerId`; `category` só como texto em `transactions`, `fixedExpenses`, `bankImports`; `settings/main.categories` é `string[]`. Cerca de 52 lançamentos segundo o PITFALLS (contagem real não verificada: sem credenciais) | **Migração de dados** (backfill `ownerId` + `categoryId` + `categoryDefs`) **e** edição de código (novas gravações) |
| Live service config | Railway: raiz do serviço, builder, versão de Node e variáveis (`APP_API_KEY`, `ALLOWED_ORIGINS`, `FIREBASE_SERVICE_ACCOUNT`) vivem no painel, não no git; **não inspecionado** (CLI `railway` instalada mas sem login). Firebase Auth: usuários existentes e se o cadastro aberto já está desligado são desconhecidos. Pluggy: itens com `clientUserId` = `person` | Humano: confirmar painel do Railway e lista de usuários do Auth; trocar variáveis no cutover |
| OS-registered state | Nenhum (nada de cron/pm2/launchd no repo; o agendador é `setInterval` no processo do servidor) | Nenhuma; verificado por leitura de `server/src/index.js:135-143` |
| Secrets/env vars | `VITE_BANK_API_KEY` (também `APP_API_KEY` no servidor), `VITE_APP_USERNAME`/`VITE_APP_PASSWORD` (defaults `ratimbum`/`ratimbum123` no código, `AuthContext.tsx:22-23`). `.env.local` e `.env.amigo` estão **versionados** e o repositório `byglow9/FinanciasRatim` é **PÚBLICO** (`gh repo view`); conteúdo dos arquivos não lido (hook de segredos bloqueou) | Tratar chave e senha legada como já expostas; removê-las do cliente e do servidor; `.gitignore` + `git rm --cached` (decisão do dono, ver Open Questions) |
| Build artifacts / installed packages | `dist/` (bundle antigo com chave e login legado) e `node_modules/` versionados; `.firebase/hosting.*.cache`; deploy do amigo (`financias-xrd`) é build separado do mesmo código | Rebuild + deploy substitui `dist`; **não** rodar `build:amigo`/deploy do amigo depois desta fase (o código novo exige claims e `ownerId`, que o projeto do amigo não tem; D-15) |

## Common Pitfalls

### Pitfall 1: Apertar regras tranca o próprio dono
**What goes wrong:** regras publicadas antes de login Firebase único, backfill, índices e cliente novo = telas vazias/`permission-denied`.
**How to avoid:** runbook acima; portão final "zero sem ownerId"; `firestore.rules.legacy` para reverter em um deploy.
**Warning signs:** listas vazias com login "ok"; `failed-precondition` no console.

### Pitfall 2: Documentos novos sem `ownerId` depois do backfill
**What goes wrong:** sync agendado (servidor antigo) e abas antigas criam docs sem `ownerId`; ficam invisíveis para o cliente novo.
**How to avoid:** novas gravações já com `ownerId` desde o Release A; `verify` repetido em R4 e R7; o servidor lê `ownerId` de `bankConnections`.

### Pitfall 3: Cadastro aberto não é desligável como se esperava
**What goes wrong:** a documentação do Firebase diz que desligar "user actions" nas Configurações do Auth bloqueia criação/exclusão de conta com `auth/admin-restricted-operation` [CITED: firebase.google.com/docs/auth/users, via busca]; o rótulo exato e a disponibilidade no plano Spark **não foram confirmados**. A API de config do Identity Platform tem `client.permissions.disabledUserSignup` [CITED: docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config], mas não sei se exige upgrade para Identity Platform (cobrança).
**How to avoid:** não depender disso. As regras por `hid` já negam qualquer conta sem claim; remover `signUp` da UI; tentar desligar no console como defesa em profundidade; auditar contas desconhecidas no Auth.
**Nota:** `mapAuthError` já trata `auth/admin-restricted-operation` (`AuthContext.tsx`), sinal de que o setting pode já ter sido tocado.

### Pitfall 4: Claims não aparecem na sessão antiga
**What goes wrong:** claims novos só chegam ao token ao reautenticar, no refresh automático (≤1 h) ou com `getIdToken(true)` [CITED: firebase.google.com/docs/auth/admin/custom-claims].
**How to avoid:** rodar `create-users` antes do Release A; no cliente, `getIdTokenResult(true)` uma vez se faltar `hid`; mensagem "conta sem acesso" se persistir. Cada chamada de `setCustomUserClaims` **substitui** os claims (ler, mesclar e regravar).

### Pitfall 5: `shared/` com import de pacote ou sem os arquivos no deploy
**What goes wrong:** `import 'date-fns'` em `shared/` resolve a partir de `shared/`; no Railway só há `server/node_modules` → falha em runtime. Raiz do serviço em `server/` também esconde `../../shared`.
**How to avoid:** zero imports de pacote em `shared/`; Dockerfile na raiz do repo; `shared/package.json` com `{"type":"module"}` (no Node 22.17.1 funcionou sem ele, mas deixa explícito); validar com `docker build` + `import('./server/src/sync.js')` (feito no spike).

### Pitfall 6: Export gerenciado exige Blaze
**What goes wrong:** `gcloud firestore export` precisa de billing/Blaze e bucket [CITED: firebase.google.com/docs/firestore/manage-data/export-import].
**How to avoid:** script Admin que serializa todas as coleções (`listCollections()`) para JSON com tipos marcados (Timestamp → `{__ts: ISO}`) e um carregador para o emulador. Volume pequeno; leituras de dry-run/apply/verify somam poucas centenas contra 50K/dia [CITED: firebase.google.com/docs/firestore/quotas].

### Pitfall 7: Railway muda o que lê
**What goes wrong:** `railway.json`/`railway.toml` deixam de ser lidos em 2026-12-01; Railpack numa raiz com `vite build` trata o repo como SPA estática (Caddy) e não como servidor; `engines.node: ">=22.23.4"` pode resolver para uma versão mais nova.
**How to avoid:** Dockerfile na raiz (nome exato `Dockerfile`, auto-detectado) com `FROM node:22.23.5-slim`; Root Directory do serviço vazio; variáveis no painel. Se o serviço hoje tem Root Directory = `server`, é preciso limpar (passo humano).

### Pitfall 8: Testes de regras e `node --test` com diretório
**What goes wrong:** `node --test test/` falha no Node 22 (trata como módulo). **How to avoid:** passar glob/arquivo: `node --test "test/rules/*.test.js"`.

### Pitfall 9: Bundle antigo e repositório público
**What goes wrong:** chave e senha legada já públicas (repo + `dist/`). **How to avoid:** a mitigação real é o servidor deixar de aceitar `x-api-key` e o cliente deixar de ter login local; limpar versionamento é higiene adicional.

### Pitfall 10: Float em dinheiro e fuso do servidor
**What goes wrong:** somas em ponto flutuante e `startOfMonth` do `date-fns` usam o fuso do host (UTC no servidor) → 3 h/dia erradas. **How to avoid:** centavos inteiros e `zonedParts` no núcleo; testes com `now` injetado em fronteiras (`2026-11-01T02:30Z`).

## Code Examples

### Regras de produção (base testada no spike; ampliar a lista)
```
// Source: spike desta sessão (rules-unit-testing 6.0.0 + emulador): 8/8 testes verdes
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isMember() {
      return request.auth != null
        && request.auth.token.hid is string
        && request.auth.token.hid.size() > 0;
    }
    function ownsExisting() { return resource.data.ownerId == request.auth.token.hid; }
    function ownsIncoming() { return request.resource.data.ownerId == request.auth.token.hid; }

    // Coleções que o cliente lê e escreve
    match /{col}/{id} {
      allow read, delete: if isMember() && ownsExisting()
        && col in ['transactions','fixedExpenses','fixedExpensePayments','savings','goals',
                   'goalContributions','events','eventCategories','notes','settings'];
      allow create: if isMember() && ownsIncoming()
        && col in ['transactions','fixedExpenses','fixedExpensePayments','savings','goals',
                   'goalContributions','events','eventCategories','notes','settings'];
      allow update: if isMember() && ownsExisting()
        && request.resource.data.ownerId == resource.data.ownerId
        && col in ['transactions','fixedExpenses','fixedExpensePayments','savings','goals',
                   'goalContributions','events','eventCategories','notes','settings'];
    }
    // Escritas só pelo servidor (Admin SDK ignora regras)
    match /{col}/{id} {
      allow read: if isMember() && ownsExisting() && col in ['bankConnections','bankImports'];
    }
  }
}
```
Rollback: `firestore.rules.legacy` = cópia do arquivo atual, que contém exatamente (`firestore.rules:7`): `allow read, write: if true;`.

### Teste de regras (esqueleto, runner `node:test`)
```js
// Source: spike desta sessão. Rodar: firebase emulators:exec --only firestore "node --test test/rules/*.test.js"
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
const env = await initializeTestEnvironment({ projectId: 'demo-coinki', firestore: { rules, host: '127.0.0.1', port: 8080 } })
const ele = env.authenticatedContext('uidEle', { hid: 'casalA', person: 'ele' }).firestore()
await assertSucceeds(getDocs(query(collection(ele, 'transactions'), where('ownerId', '==', 'casalA'))))
await assertFails(getDocs(collection(ele, 'transactions')))                       // sem filtro
await assertFails(updateDoc(doc(ele, 'transactions/t1'), { ownerId: 'casalB' }))  // ownerId imutável
```

### Verificação de token no servidor (verificado com Auth emulator)
```js
// Source: spike desta sessão (firebase-admin 14.5.1 + Auth emulator)
import { getAuth } from 'firebase-admin/auth'
export const requireOwner = (verify = (t) => getAuth().verifyIdToken(t)) => async (req, res, next) => {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')
  if (!m) return res.status(401).json({ error: 'Nao autorizado' })
  let decoded
  try { decoded = await verify(m[1]) } catch { return res.status(401).json({ error: 'Nao autorizado' }) }
  if (typeof decoded.hid !== 'string' || !decoded.hid) return res.status(403).json({ error: 'Sem acesso' })
  req.owner = { uid: decoded.uid, hid: decoded.hid, person: decoded.person }
  next()
}
```

### Claims e backfill idempotente (verificado)
```js
// create-users: await auth.setCustomUserClaims(user.uid, { hid, person })  // substitui claims anteriores
// backfill (dry-run por padrão; --apply escreve):
const snap = await db.collection(col).get()
const bw = db.bulkWriter()
for (const d of snap.docs) {
  if (d.get('ownerId')) continue                      // idempotente: só preenche se ausente
  if (apply) bw.update(d.ref, { ownerId: hid, ...(categoryPatch(d) ?? {}) })
  counts.toWrite++
}
await bw.close()
// Spike: 1ª rodada escreveu 5, 2ª escreveu 0; count(ownerId=='casalA') = 5
```

### Mês no fuso de São Paulo, sem dependências (verificado em TZ=UTC, America/Sao_Paulo, Asia/Tokyo)
```js
// Source: spike desta sessão (shared/core/time.js)
export function zonedParts(date, tz = 'America/Sao_Paulo') {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
  const p = {}
  for (const { type, value } of f.formatToParts(date)) if (type !== 'literal') p[type] = Number(value)
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second }
}
export function zonedTimeToInstant(y, m, d, h = 0, mi = 0, s = 0, tz = 'America/Sao_Paulo') {
  const guess = Date.UTC(y, m - 1, d, h, mi, s)
  const p = zonedParts(new Date(guess), tz)
  return new Date(guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess))
}
// monthRange(new Date('2026-11-01T02:30:00Z')) => start 2026-10-01T03:00:00.000Z, end 2026-11-01T02:59:59.999Z
```
(No arquivo real, anotar todos os parâmetros com JSDoc `@param`; o `tsc` com `checkJs` acusou TS7006 no rascunho sem tipos.)

### Alias e tsconfig para o núcleo (verificado: `tsc -b` + `vite build`)
```jsonc
// tsconfig.app.json: "include": ["src", "shared"], "allowJs": true,
// "paths": { "@/*": ["./src/*"], "@shared/*": ["./shared/*"] }
// vite.config.ts:  alias: { '@': path.resolve(__dirname, './src'), '@shared': path.resolve(__dirname, './shared') }
```

### Dockerfile do servidor na raiz do repo (verificado: build, Node 22.23.5, `sync.js` importa `shared/`)
```dockerfile
FROM node:22.23.5-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json server/
RUN npm ci --omit=dev --prefix server
COPY server server
COPY shared shared
USER node
CMD ["node", "server/src/index.js"]
```
`.dockerignore` na raiz: `node_modules`, `dist`, `.env*`, `.planning`, `.git`, `.firebase`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `firebase-admin` 13 (Node >=18) | 14.x (Node >=22; sem Instance ID/namespaces legados) | 14.0.0 (2026-06-08) | Servidor precisa Node >=22; imports modulares já usados |
| `firebase` 12 | 13.x (breaking só em AI Logic) | 13.0.0 (2026-10-07) | Troca de versão sem mudança de código para Auth/Firestore |
| `railway.json`/`railway.toml` | Infrastructure as Code / configuração no painel | Config as Code lido até 2026-12-01 | Não depender desses arquivos |
| Emulador com Java 11 | Java 21+ obrigatório (firebase-tools 15) | firebase-tools 15.0.0 | JRE 21 é pré-requisito dos testes de regras |
| `@firebase/rules-unit-testing` 5.x (firebase ^12) | 6.0.0 (firebase ^13; `engines >=24.12.0` apenas declarado) | 2026-10-07 | Roda em Node 22 com aviso; alternativa é testar com Node 24 |

**Deprecated/outdated:** login local por env var (inseguro por definição: credencial no bundle); chave compartilhada `x-api-key` em navegador.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Consultas só com igualdade (várias) dispensam índice composto (merge de índices simples) | Query & Index Inventory | `failed-precondition` em produção em alguma tela; capturado no R6 (checklist), corrigido com mais um índice |
| A2 | Railway hoje usa Root Directory = `server` (ou similar) e Railpack; não consegui abrir o painel (CLI sem login) | Standard Stack, Pitfall 7 | Se já usa a raiz ou outro builder, o passo humano muda; planner deve incluir `checkpoint:human-action` para conferir |
| A3 | Desligar "user actions" do Auth funciona no Spark sem upgrade para Identity Platform | Pitfall 3 | Cadastro aberto permanece; mitigado porque as regras e o servidor exigem claim `hid` |
| A4 | `.env.local`/`.env.amigo` versionados contêm `VITE_BANK_API_KEY` e possivelmente `VITE_APP_PASSWORD` (não li o conteúdo: hook de segredos bloqueou) | Runtime State Inventory | Se não contêm, a urgência de rotação cai; a remoção do login legado/chave continua devida |
| A5 | Volume de dados é pequeno (~52 lançamentos, PITFALLS) e cabe com folga na cota Spark | Pitfall 6 | Se houver milhares de docs, dividir o backfill em dias (20K writes/dia) |
| A6 | Existem usuários extras no Firebase Auth (cadastro foi aberto) | Runtime State Inventory | Contas estranhas sem claim já não acessam dados, mas devem ser removidas |
| A7 | Manter `settings/main` (ID fixo) nesta fase e só trocar para `settings/{hid}` na Fase 8 | Pattern 5 / Open Questions | Se o dono quiser o ID por casal agora, o backfill precisa copiar o doc e o cliente antigo deixa de achá-lo |
| A8 | `hid` pode ser um identificador opaco gerado uma vez (ex.: 20 caracteres aleatórios) e passado ao script por `--hid` | Open Questions | Nenhum risco técnico; só convenção |
| A9 | Clientes antigos (abas abertas) não são problema: não há service worker hoje | Pitfall 1 | Fase 5 introduz PWA; fora do escopo aqui |

## Open Questions

1. **Qual é a configuração atual do Railway (Root Directory, builder, versão de Node, variáveis)?**
   - What we know: CLI `railway` 5.42.0 instalada, sem login; `server/` não tem `Dockerfile`/`railway.*`/`.node-version`.
   - What's unclear: se hoje o serviço aponta para `server/`.
   - Recommendation: tarefa `checkpoint:human-action` no R4: dono confere o painel, limpa Root Directory, define as variáveis e confirma o log "Using detected Dockerfile!". Plano B: script `sync-shared` com teste de divergência.

2. **Subir `pluggy-sdk` para ^0.94.3 agora?**
   - What we know: FUND-07 não lista `pluggy-sdk`, mas o Node 22.23.4 vem de `0.93.1+`; os 6 métodos usados existem em 0.94.3 e os 12 testes passam.
   - Recommendation: subir junto (checkpoint de pacote recente); caso contrário o pin de Node não tem motivo prático.

3. **Higiene do repositório público: `.gitignore` + `git rm --cached` de `.env.local`, `.env.amigo`, `dist/`, `node_modules/`, `.firebase/`?**
   - What we know: estão versionados e o repositório é público. Remover do índice não apaga o histórico.
   - Recommendation: incluir como tarefa pequena, com confirmação do dono (diff gigantesco por causa de `node_modules`); a mitigação de segurança real é invalidar chave/login legado.

4. **Doc de configurações: manter `settings/main` agora?** Recomendado manter (cliente antigo e servidor o conhecem) e centralizar o acesso em um helper (`settingsRef()`), deixando a troca por `settings/{hid}` para a Fase 8.

5. **Modo MOCK:** manter com identidade de desenvolvimento sob `import.meta.env.DEV`, ou aposentar? Decisão do planner; qualquer caminho precisa impedir que `VITE_USE_EMULATOR=true` num build de produção libere acesso.

6. **Renomear categoria na interface:** incluir renomear mínimo em Configurações (critério 4) ou provar só por teste de núcleo? Recomendado incluir (poucas linhas) para o casal ver o histórico preservado.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tudo | ✓ (versão abaixo da meta) | 22.17.1 (nvm tem 22.15, 22.17.1, 18) | `nvm install 22.23.5` (disponível: `nvm ls-remote` lista 22.23.4/22.23.5) |
| npm | instalação | ✓ | 10.9.2 | — |
| firebase-tools (global) | emuladores, deploy | ✓ | 15.9.1 | — |
| Java (JRE/JDK 21+) | Emulador Firestore/Auth | ✗ | — | Tarball Temurin 21 JRE (verificado sem sudo) ou `sudo apt install openjdk-21-jre-headless` (sem sudo sem senha aqui) |
| Docker | validar Dockerfile localmente | ✓ | 29.7.2 | — |
| `gh` | consultar visibilidade do repo | ✓ | autenticado | — |
| Railway CLI | inspecionar serviço | ✓ (sem login) | 5.42.0 | Painel web (passo humano) |
| gcloud | export gerenciado | ✗ | — | Não necessário (Blaze); usar script Admin |
| Credencial de serviço Firebase (local) | scripts admin em produção | ? (não verificado) | — | Dono baixa a chave do projeto `financias-ratimbum`; guardar fora do git |

**Missing dependencies with no fallback:** nenhuma. **Missing with fallback:** Java 21 (tarball), Node 22.23.5 (nvm).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 22); `@firebase/rules-unit-testing` 6.0.0 para regras; Auth+Firestore emulators para integração |
| Config file | nenhum (glob na linha de comando); `firebase.json` já define emuladores (`auth` 9099, `firestore` 8080, UI 4000) |
| Quick run command | `node --test "shared/**/*.test.js" && (cd server && node --test)` |
| Full suite command | `TZ=UTC node --test "shared/**/*.test.js" && TZ=Asia/Tokyo node --test "shared/**/*.test.js" && (cd server && node --test) && firebase emulators:exec --only auth,firestore "node --test test/rules/*.test.js server/test/emu/*.test.js" && npm run build && npm run lint` (com JRE 21 no `PATH`) |

Estado atual [VERIFIED: execução nesta sessão]: `server` tem 12 testes `node --test` passando em Node 22.17.1 (com `firebase-admin` 13 e também com 14.5.1). O cliente **não** tem runner; `npm run build` (`tsc -b && vite build`) e `npm run lint` são o portão de tipos.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FUND-01 | Nada de login legado, `signUp`, `VITE_APP_*`, chaves `financias_legacy_user`/`financias_auth` no `src/`; conta sem claim é barrada | static (grep em `node:test`) + manual | `node --test test/static/no-legacy-auth.test.js` | ❌ Wave 0 |
| FUND-02 | Backfill preenche `ownerId` em todas as 12 coleções, idempotente, contagens antes = depois, falha em coleção desconhecida | integration (emulador) | `firebase emulators:exec --only firestore "node --test server/test/emu/backfill.test.js"` | ❌ Wave 0 |
| FUND-02 | Toda query/escrita dos services usa `ownerId` | static | `node --test test/static/owner-queries.test.js` | ❌ Wave 0 |
| FUND-03 | Anônimo/sem claim/outro casal/sem filtro/`ownerId` alheio/mutação de `ownerId`: negados; dono OK; coleção desconhecida negada; `bankConnections`/`bankImports` só leitura | integration (emulador) | `firebase emulators:exec --only firestore "node --test test/rules/*.test.js"` | ❌ Wave 0 |
| FUND-04 | Sem token → 401; token inválido → 401; sem `hid` → 403; `Origin` não autorizada → 403; `DELETE` de conexão de outro dono → negado; `ownerId` vem do token | unit (app factory, verificador injetado) + integration (Auth emulator) | `cd server && node --test test/app.test.js` | ❌ Wave 0 |
| FUND-04 | `sync` grava `ownerId` e `categoryId` | unit (db falso) / emulator | `cd server && node --test test/sync.test.js` | ❌ Wave 0 |
| FUND-05 | Slug estável e sem colisão; renomear mantém `id`; arquivar não apaga; `categoryDisplayName` resolve por id; `mapCategory` devolve `{id,name}` | unit | `node --test shared/core/categories.test.js` | ❌ Wave 0 |
| FUND-06 | `classify` (12 casos existentes movidos), `accumulatedBalance`, `weeklySpend`, `monthRange`/dias restantes com relógio injetado nas fronteiras de mês, em 3 fusos de host | unit | `TZ=Asia/Tokyo node --test "shared/**/*.test.js"` | ✅ parcial (`server/test/classify.test.js` a mover) |
| FUND-07 | Servidor sobe em Node 22.23.x com `firebase-admin` 14 e imports `../../shared`; cliente compila com `firebase` 13 | smoke (Docker) + build | `docker build -t coinki-server . && docker run --rm --entrypoint node coinki-server -e "import('./server/src/sync.js')"` ; `npm run build` | ❌ Wave 0 (Dockerfile) |
| Manual | Ele e Ela entram, conferem todas as telas; sem `failed-precondition`; bancos e sync funcionam; rollback de regras ensaiado | manual (D-14) | checklist do runbook | — |

### Sampling Rate
- **Per task commit:** `node --test "shared/**/*.test.js" && (cd server && node --test)`
- **Per wave merge:** suíte completa acima (precisa de JRE 21 no `PATH` e `TZ` matrix)
- **Phase gate:** suíte completa verde + `npm run build` + `npm run lint` + checklist manual do cutover antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] JRE 21 no `PATH` (instalar/extrair) e `nvm use 22.23.5`
- [ ] `npm i -D @firebase/rules-unit-testing@^6.0.0` na raiz; scripts `test:core`, `test:rules`, `test:emu` no `package.json`
- [ ] `test/rules/*.test.js` (matriz de casos acima) e `firestore.rules` novas
- [ ] `shared/core/*.test.js` e movimento de `server/test/classify.test.js`
- [ ] `server/test/app.test.js`, `server/test/emu/*.test.js` (backfill, create-users, verify)
- [ ] `test/static/*.test.js` (sem legado, queries com `ownerId`)
- [ ] `Dockerfile` + `.dockerignore`
- [ ] Observação do spike: `authenticatedContext(uid, { hid, person })` injeta claims; `node --test` precisa de glob, não de diretório

## Security Domain

`security_enforcement` ativo (ASVS nível 1, bloqueio em `high`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase Auth e-mail/senha; sem login local; `signUp` removido; contas criadas por script |
| V3 Session Management | yes | ID token do Firebase (renovação automática); `getIdTokenResult(true)` quando faltar claim; `signOut` limpa estado |
| V4 Access Control | yes | Regras por `request.auth.token.hid`, default-deny, `ownerId` imutável; no servidor, dono do token e checagem de dono do recurso |
| V5 Input Validation | yes | Servidor valida `person` ∈ {`ele`,`ela`} e `itemId` string; regras validam `ownerId`; backfill valida tipos |
| V6 Cryptography | yes | Nunca manual: `verifyIdToken` e claims assinados pelo Firebase |
| V7/V8 Logging/Data | yes | Não registrar tokens, senhas nem service account; `handle` já loga só mensagem de erro |
| V13 API | yes | CORS com lista fechada obrigatória + checagem de `Origin`; sem `x-api-key` |
| V14 Config | yes | Service account fora do git (`.gitignore`), variáveis só no painel; `.dockerignore` exclui `.env*` |

### Known Threat Patterns for Firebase + Express

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cadastro aberto + `auth != null` | Elevation of Privilege | Regras por claim `hid`; não publicar `auth != null`; remover `signUp` |
| Credencial/chave no bundle e no repositório público | Information Disclosure | Remover login legado e `x-api-key`; token do Firebase; tratar como exposto |
| Usuário altera `ownerId` de um doc | Tampering | `request.resource.data.ownerId == resource.data.ownerId` no update (testado) |
| IDOR em `/api/connections/:itemId` | Elevation of Privilege | Conferir `ownerId` do doc contra `req.owner.hid` |
| Mass assignment (`ownerId` no corpo) | Tampering | Ignorar corpo; usar `req.owner` |
| CORS reflete qualquer origem | Spoofing | Lista obrigatória + 403 em `Origin` não permitida (CORS não protege clientes não-navegador; o token protege) |
| Sync grava sem `ownerId` (Admin SDK ignora regras) | Tampering / DoS de dados | `ownerId` de `bankConnections` em toda escrita; `verify` como portão |
| Vazamento do service account (scripts admin) | Information Disclosure | Arquivo fora do repo e no `.gitignore`; usar só localmente; rotacionar se vazar |
| Perda de dados no backfill | Denial of Service (dados) | Backup JSON, dry-run, idempotência, contagens antes/depois |

## Sources

### Primary (HIGH confidence)
- Spikes executados nesta sessão (scratchpad): regras + claims no emulador (8/8), `firebase-admin@14.5.1` com Auth emulator (`setCustomUserClaims`, `verifyIdToken`, conta sem claim sem `hid`), `BulkWriter` idempotente, `getDoc` de doc inexistente negado, `tsc -b` + `vite build` com `firebase@13.4.0`, 12 testes do servidor com `firebase-admin@14.5.1` e `pluggy-sdk@0.94.3`, `shared/` via alias TS/Vite, `monthRange` em 3 fusos, `docker build` com `node:22.23.5-slim` e `import('./server/src/sync.js')`
- Arquivos do repositório lidos: `server/src/index.js`, `server/src/sync.js`, `server/src/classify.js`, `firestore.rules`, `server/package.json`, `src/contexts/AuthContext.tsx`, `src/services/*.ts`, `src/types/index.ts`, `.planning/*`
- npm registry (`npm view`), `nodejs.org/dist/index.json`, `hub.docker.com` (tags `22.23.4-slim`, `22.23.5-slim`)
- https://github.com/firebase/firebase-admin-node/releases/tag/v14.0.0
- https://firebase.google.com/support/release-notes/js
- https://firebase.google.com/docs/auth/admin/custom-claims
- https://firebase.google.com/docs/firestore/manage-data/export-import
- https://firebase.google.com/docs/firestore/quotas
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config
- https://docs.railway.com/reference/config-as-code , https://docs.railway.com/builds/dockerfiles , https://docs.railway.com/guides/monorepo , https://railpack.com/languages/node

### Secondary (MEDIUM confidence)
- https://newreleases.io/project/npm/firebase-tools/release/15.0.0 (Java 21 obrigatório; via busca)
- https://firebase.google.com/docs/auth/users (user actions / `auth/admin-restricted-operation`; via resumo de busca)
- Resultado de busca sobre Config as Code deprecated até 2026-12-01 (confirmado também na própria página de referência do Railway)

### Tertiary (LOW confidence)
- Disponibilidade de "user actions" no plano Spark e rótulo exato no console (não confirmado)
- Configuração atual do Railway (não inspecionada)
- Conteúdo dos `.env*` versionados (não lido)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (versões do registry; upgrades validados por build e testes em cópia)
- Architecture: HIGH (regras, claims, backfill e Docker comprovados por spike); MEDIUM em Railway (painel não visto)
- Pitfalls: HIGH nos de regras/ordem/ambiente (reproduzidos); MEDIUM em Auth "user actions" e índices só de igualdade

**Research date:** 2026-11-17
**Valid until:** 2026-12-01 (Railway Config as Code cutoff e versões recentes de `firebase`/`firebase-admin` mudam rápido; revalidar versões antes de instalar)
