# Phase 1: Fundação de dados e acesso - Context

**Gathered:** 2026-11-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Só o casal, autenticado no Firebase, lê e grava os dados, sem perda de histórico, sobre uma base pronta para as fases seguintes: login Firebase como único caminho, `ownerId` em todos os dados (com backfill), regras restritivas do Firestore testadas no emulador, servidor aceitando só token Firebase, categorias com ID estável, núcleo de cálculo puro compartilhado com testes e servidor em Node 22.23.4+ com `firebase` 13 / `firebase-admin` 14.

Requisitos: FUND-01 a FUND-07. Nenhuma funcionalidade nova visível ao usuário (exceção declarada do MVP vertical). Ordem interna obrigatória (ROADMAP): login Firebase único, remover login legado e cadastro, backfill de `ownerId` (ensaio e contagens), índices, cliente consultando por `ownerId`, só então regras restritivas. Nunca publicar `request.auth != null` como passo intermediário.

</domain>

<decisions>
## Implementation Decisions

### Dono dos dados e login
- **D-01:** Cada pessoa tem login Firebase individual (e-mail/senha); o sistema sabe quem é quem e o app abre na aba de quem entrou. As duas contas pertencem a um mesmo casal.
- **D-02:** O dono dos dados (`ownerId`) é o **id do casal (`hid`)**, não o uid de cada pessoa. Os dois logins compartilham o mesmo `hid`. — **Reversibility:** one-way — todo documento gravado e toda regra do Firestore passam a depender desse campo; trocar exige novo backfill e reescrever regras.
- **D-03:** O vínculo é feito por **custom claims no ID token**: `hid` (casal) e `person` (`ele`/`ela`). As regras do Firestore leem direto de `request.auth.token`, sem consulta extra. — **Reversibility:** costly — regras, cliente e servidor leem esses claims; mudar para documento `households/{hid}` toca todas as regras.
- **D-04:** Contas e claims criados por **script de admin do dono** (cria os 2 usuários no Firebase e grava os claims). O **cadastro aberto (`signUp`) e o login `ratimbum`** (`VITE_APP_USERNAME`/`VITE_APP_PASSWORD`, chaves em localStorage) são removidos de uma vez. Sem convite pela interface nesta fase.
- **D-05:** Abre na aba da pessoa (`person` do claim), mas **os dois continuam vendo e lançando em todas as abas**, como hoje. Sem privacidade ou somente-leitura entre o casal nesta fase.
- **D-06:** Manter a costura aberta (um `scope()`/`ownerId()` central) para a Fase 8 (amigo com dados separados) virar operação de dados, não reescrita.

### IDs estáveis de categoria
- **D-07:** Categoria vira `{id, name, ...}` com **ID estável** (slug gerado na criação, nunca muda). O mesmo script de backfill do `ownerId` acrescenta `categoryId` a cada lançamento e conta fixa a partir do nome atual; o campo `category` (texto) permanece como cópia durante a transição. — **Reversibility:** one-way — o histórico e os limites futuros (Fase 3) passam a referenciar o ID.
- **D-08:** **Excluir arquiva, nunca apaga**: `archived=true` esconde das listas novas, mas lançamentos antigos continuam mostrando o nome.
- **D-09:** O servidor (importação bancária, `mapCategory` em `server/src/sync.js`) passa a devolver `categoryId` ao mapear o nome do banco; o sync grava `ownerId` e `categoryId` em tudo que importa.

### Núcleo compartilhado e testes
- **D-10:** `shared/core/*.js` em ESM com JSDoc/`// @ts-check`, importado pelo site por alias e pelo servidor por `../../shared/...` (zero cópia). Exige que o **Railway use a raiz do repositório** (não só `server/`); verificar a configuração atual do Railway no planejamento. — **Reversibility:** costly — mudar de raiz-no-repo para cópia exige mexer no deploy e nos imports.
- **D-11:** Testes com **`node --test`** (mesmo runner de `server/test/`), sem dependência nova. Fuso `America/Sao_Paulo` e relógio injetado.
- **D-12:** Migrar para o núcleo **só o cálculo que já existe**: classificação de `classify.js`, saldo acumulado e gasto semanal. Orçamento, limites e alertas nascem na Fase 3.

### Corte das regras e rollback
- **D-13:** Ensaio com **emulador + cópia exportada**: exportar os dados reais, rodar backfill e testes de regras no emulador, comparar contagens antes/depois por coleção; em produção, **dry-run primeiro** e **backup exportado** antes.
- **D-14:** Cutover por **checklist com verificação manual**: login, backfill, índices, cliente novo no ar, os dois entram e conferem as telas, só então publicar as regras. Manter `firestore.rules.legacy` (regras abertas atuais) para reverter com um deploy.
- **D-15:** O projeto do amigo (`financias-xrd`, `.env.amigo`, `build:amigo`) **não é tocado** nesta fase.

### Claude's Discretion
- Formato exato do slug de categoria e nomes de campos (`hid`, `person`, `archived`, `categoryId`), desde que respeitem as decisões acima.
- Estrutura interna do script de admin e do backfill (uso de `BulkWriter`, lotes, idempotência).
- Pastas e alias do `shared/core`, e como o site/servidor o consomem.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planejamento
- `.planning/PROJECT.md` — visão, restrições, decisões-chave do Coinki
- `.planning/REQUIREMENTS.md` §Fundação de dados e acesso (FUND-01..FUND-07) — requisitos travados
- `.planning/ROADMAP.md` §Phase 1 — objetivo, ordem interna obrigatória, critérios de sucesso
- `.planning/STATE.md` §Blockers/Concerns — decisão de `ownerId` (resolvida aqui), Node 22.23.4+, Railway

### Pesquisa
- `.planning/research/ARCHITECTURE.md` §1 e §2 — fatos do código atual, `shared/core`, `scope()`
- `.planning/research/PITFALLS.md` — armadilhas de regras abertas, chave pública no bundle (P4), ordem das regras
- `.planning/research/STACK.md` — `firebase` ^13.4.0, `firebase-admin` ^14.5.1, `verifyIdToken`, `BulkWriter`
- `.planning/research/SUMMARY.md` — fases sugeridas e decisões de dono dos dados

### Código existente
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` — regras abertas atuais e config
- `src/contexts/AuthContext.tsx` — login legado e `signUp` a remover
- `server/src/index.js`, `server/src/sync.js`, `server/src/classify.js`, `server/test/classify.test.js`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/classify.js`: regras puras sem I/O, já testadas com `node --test`; ponto de partida do `shared/core`.
- `src/services/*.service.ts` e `src/hooks/*`: camada de dados do cliente (Firestore direto, com ramo `MOCK`); é onde entra `scope()`/`ownerId`.
- `src/components/auth/LoginForm.tsx` e `ProtectedRoute.tsx`: base do login só Firebase.

### Established Patterns
- Frontend lê Firestore direto, sem `onSnapshot`; hooks fazem `getDocs` + refetch após escrever.
- `Transaction.category` é string (nome); `Settings.categories` é `string[]` (`src/types/index.ts`, `DEFAULT_CATEGORIES`).
- Servidor Express 5 sem build, auth de `/api/*` por `x-api-key` compartilhada embutida no bundle (`VITE_BANK_API_KEY`), sync insert-only a cada 6 h.

### Integration Points
- `AuthContext` ganha `hid`/`person` do token; o app abre na aba da pessoa.
- Serviços do cliente passam a consultar por `ownerId` e gravar `ownerId`.
- Servidor: `verifyIdToken` em `/api/*`, `ownerId` derivado do token, CORS restrito a domínios autorizados.
- `.planning/codebase/` não existe (sem mapa do código).

</code_context>

<specifics>
## Specific Ideas

- "Cada um com login individual, mas o sistema sabe que eles têm a conta de casal": evitar ter de entrar no app e selecionar a aba de quem você é.

</specifics>

<deferred>
## Deferred Ideas

- Privacidade ou somente-leitura entre as abas do casal — escopo da Fase 8 (Visão do casal) se desejado.
- Convite de parceiro/amigo pela interface — Fase 8.
- Teste de fumaça automático pós-deploy das regras — descartado nesta fase (checklist manual escolhido).

</deferred>

---

*Phase: 1-Fundação de dados e acesso*
*Context gathered: 2026-11-17*
