# Fase 8: Visão do casal e multiusuário - Mapa de padrões

**Mapeado:** 2026-11-27
**Arquivos analisados:** 24 (novos e alterados)
**Analogs encontrados:** 22 / 24
**Escopo:** sem migração do amigo (CONTEXT D-11). Ignorar `migrate-legacy.js`, `migrationLedger` e o Padrão 5 da pesquisa. Todos os analogs abaixo são rastreados no git (`git ls-files` conferido para `server/src`, `shared/core`, `src/...`, `firestore.rules`).

## Classificação dos arquivos

| Arquivo novo/alterado | Papel | Fluxo | Analog mais próximo | Qualidade |
|---|---|---|---|---|
| `shared/core/couple.js` (+ `coupleBudget`) | utilitário puro | transform | o próprio `shared/core/couple.js` (`coupleSummary`) + `shared/core/budget.js` | exato |
| `src/pages/CouplePage.tsx` (alterar) | página | request-response (leitura) | o próprio arquivo | exato |
| `src/components/couple/CoupleLimits.tsx`, `TogetherHeadline.tsx` (novos) | componente | leitura | `src/components/couple/CoupleHeadline.tsx`, `TopCategoryRows.tsx` | papel igual |
| `src/hooks/useCoupleBudget.ts` (novo) | hook | leitura | `src/hooks/useCycleBudget.ts` | exato |
| `shared/core/household.js` (novo: `normalizeHousehold`, `genderFor`, `scopedId`) | utilitário puro | transform | `shared/core/oincSelect.js` (`genderOf`), `shared/core/alerts.js` (`alertId`) | papel igual |
| `shared/core/alerts.js`, `shared/core/insights.js` (ids com `hid`) | utilitário | transform | `alertId` (linhas 44-46) | exato |
| `src/services/settings.service.ts` (settings por `hid`) | serviço | CRUD | o próprio arquivo | exato |
| `src/services/household.service.ts` (novo) | serviço | CRUD (leitura) | `src/services/settings.service.ts` (ramo MOCK + Firestore) | papel igual |
| `src/contexts/AreaContext.tsx`, `NavRail.tsx`, `App.tsx`, `ProfileSwitcher.tsx` (modo sozinho) | contexto/layout | estado | próprios arquivos | exato |
| `src/pages/InvitePage.tsx` (novo, antes do `ProtectedRoute`) | página | request-response | `src/components/auth/ProtectedRoute.tsx` + `src/lib/legacyOrigin.ts` | parcial |
| `src/components/settings/InvitesCard.tsx`, `DeleteAccountCard.tsx`, `BankCredentialsCard.tsx` (novos) | componente | request-response | `src/components/settings/BankConnections.tsx` | papel igual |
| `server/src/invites.js` (novo) | serviço/rota | CRUD + transação | `server/src/push/router.js` (rota com `req.owner`) + `server/scripts/create-users.js` | papel igual |
| `server/src/public-routes.js` (rotas públicas de cadastro, novo) | rota | request-response | webhook em `server/src/app.js:49-85` + `server/src/limiter.js` | papel igual |
| `server/src/household.js` (`settingsFor(hid)`) | serviço | CRUD | `server/src/push/repo.js` (`readSettings`, linha 97) | papel igual |
| `server/src/secrets.js` (novo) | utilitário | transform | esboço da pesquisa (sem analog); estilo de `server/src/webhook.js` | sem analog de cifra |
| `server/src/pluggy-pool.js` (novo) | serviço | request-response | `server/src/index.js:22-25` | parcial |
| `server/src/app.js` (resolver Pluggy por `hid`, webhook por grupo, rotas `/api/bank/credentials`) | rota | request-response | o próprio arquivo | exato |
| `server/src/webhook.js` (+ assinatura HMAC por `hid`) | utilitário | transform | o próprio arquivo | exato |
| `server/src/account-delete.js` (novo) | serviço | batch (retomável) | `server/scripts/backfill.js` (BulkWriter) | parcial |
| `server/scripts/migrate-settings.js` (novo) | script | batch | `server/scripts/create-users.js` (simulação por padrão, `--apply`) | papel igual |
| `firestore.rules` (+ `households`, regras restritivas) | config | request-response | o próprio arquivo | exato |
| `firebase.rollback.json`, `firestore.rules.pre-fase8` | config | - | `firebase.rollback.json` atual | exato |
| `test/rules/matrix.test.js`, `test/static/firestore-config.test.js`, `test/static/phase3-1-couple.test.js` | teste | - | próprios arquivos | exato |
| `server/test/*.test.js` (novos: invites, secrets, pluggy-pool) | teste | - | `server/test/app.test.js` | exato |

## Atribuições de padrão

### `shared/core/couple.js` (`coupleBudget`) e `useCoupleBudget.ts`

**Analog:** `src/hooks/useCycleBudget.ts` (linhas 23-64) e `shared/core/couple.js` (cabeçalho, linhas 1-20).

Convenções do núcleo puro (copiar): `// @ts-check` na primeira linha, JSDoc `@typedef`, centavos inteiros, sem relógio, sem nomes de pessoas.
```javascript
import { toCents } from './ledger.js'
import { isDayToDay } from './budget.js'
```
Hook: chamar `useCycleBudget('ele')` e `useCycleBudget('ela')` (cada um usa `cycleFor(person)`, logo o ciclo próprio, D-16) e passar as duas views a `coupleBudget({ first, second, defs })`. Contrato proposto pela pesquisa: `safeTogetherCents = first.safeCents + second.safeCents`; sobra = soma de `monthInOne.sobra.cents`; linhas = união de `view.spend.rows`, limite e gasto somados só de quem tem limite. Somente leitura: nenhum import de service de escrita (CASAL-02).

### `src/pages/CouplePage.tsx`

**Analog:** o próprio arquivo. Estrutura a preservar (linhas 23-55, 94-121): `SegmentedControl` Ciclo/Mês, `Notice` de erro com "Tentar de novo", esqueleto `anim-pulse`, `PiggyCard`. Inserir os blocos novos (Pode gastar juntos, sobra, limites) **acima** do seletor, sempre no ciclo de cada um; o seletor desce e titula só a comparação atual. Não quebrar `test/static/phase3-1-couple.test.js` (exige `cycleFor(viewPerson)` e duas chamadas de `getTransactionsInRange` em `useCoupleData`).

### `src/services/settings.service.ts` e `server/src/household.js`

**Analog:** `src/services/settings.service.ts:16-43`.
```typescript
const DOC_KEY = 'settings::main'
const SETTINGS_DOC_ID = 'main'
const settingsRef = () => doc(db, 'settings', SETTINGS_DOC_ID)
...
if (docSnap.exists()) return { id: docSnap.id, ...DEFAULT_SETTINGS, ...docSnap.data() } as Settings
await setDoc(docRef, { ...DEFAULT_SETTINGS, ownerId: ownerId() })
```
Trocar por `settings/{hid}` com volta para `main` só quando não existir `households/{hid}` (Padrão 1 da pesquisa). Manter o ramo `if (MOCK)` (`mGetDoc`/`mSetDoc`) em todo service novo. `ownerId()` vem de `@/lib/scope`. Não criar `DEFAULT_SETTINGS` com `Nirigue`/`Nirigua`/`sem-filtro` para grupo novo (o servidor cria `settings/{hid}` no cadastro). Servidor: unificar os três leitores (`sync.js:51`, `push/repo.js:97`, `ai/snapshot.js:215`) em um helper `settingsFor(hid)`.

### `shared/core/alerts.js` e `insights.js` (ids com dono)

**Analog:** `shared/core/alerts.js:44-46`
```javascript
export function alertId(person, cycleKey, categoryId, threshold) {
  return `${person}__${cycleKey}__${categoryId}__${threshold}`
}
```
Aplicar `scopedId(hid, id) = `${hid}__${id}``. Atenção: `insights.js:224,297-298` valida `^(ele|ela)__`; ajustar a regex. Deduplicar por consulta `where ownerId` e devolver o id lógico (sem prefixo) para docs antigos e novos; nada de `get` do id antigo dentro de transação (`limitAlerts.service.ts:99-101`).

### `shared/core/household.js` (`genderFor`)

**Analog:** `shared/core/oincSelect.js:69-73`
```javascript
export function genderOf(person) {
  if (person === 'ele') return 'm'
  if (person === 'ela') return 'f'
  return null
}
```
`genderFor(person, profile)`: sem `households/{hid}` mantém `ele->m`, `ela->f`; com perfil usa o campo (`neutro -> null`). Passar o gênero como argumento até `VintemContext.tsx:385`, `aiPrompt.js:148-151,271,322,404`, `server/src/ai/refill.js:25,55,84`, `server/src/push/notifier.js:28,78,97,451`.

### `server/src/invites.js` e rotas públicas

**Analogs:**
- Rota autenticada: `server/src/push/router.js:1-50`: `Router()`, `handle` com log só do `code`, `hid`/`uid`/`person` só de `req.owner`.
```javascript
const { uid, hid, person } = req.owner
...
res.status(500).json({ error: 'Erro interno' })   // nunca err.message
```
- Rota pública: `server/src/app.js:49-85` (webhook fora de `/api`, responde 400 genérico, 401 sem detalhe). As rotas de cadastro ficam fora de `/api` (o `app.use('/api', originGuard(origins), requireOwner(verifyToken))` da linha 87 exige token), mas com `originGuard` e limitador.
- Limitador: `server/src/limiter.js:8`: `createLimiter({ max, windowMs, now })` -> `take(key)` devolve `{ ok, retryAfterMs }`. Usar uma chave por IP e uma global.
- Hash e comparação: `server/src/webhook.js:1,17`: `createHash('sha256').update(value).digest()`, `timingSafeEqual`.
- Criação de conta e claims: `server/scripts/create-users.js:52-56`
```javascript
const created = await auth.createUser({ email: item.email, password: item.password, emailVerified: true })
await auth.setCustomUserClaims(uid, { ...item.claims, hid, person: item.person })
```
Diferenças: `createUser({ uid: 'inv_' + hash.slice(0,28), ... })` (determinístico), senha mínima 8, tratar `auth/uid-already-exists` e `auth/email-already-exists`. Convite = `invites/{sha256}`, uso único por `runTransaction` (esboço na pesquisa), 7 dias. `HID_RE` de `create-users.js:5` serve para validar o `hid` gerado. Permissão D-02: `req.owner.hid === process.env.OWNER_HID` (variável obrigatória via `required()` de `server/src/index.js`).

### `server/src/secrets.js` e `pluggy-pool.js`

**Sem analog de cifra.** Usar o esboço AES-256-GCM da pesquisa (AAD `pluggy:v1:{hid}`, IV 12 bytes, tag 16). Convenção de rotação: copiar o desenho de `PLUGGY_WEBHOOK_SECRET` + `_PREVIOUS` de `server/src/index.js:36-44`. Variável ausente não derruba o servidor (mesmo estilo do webhook, não usar `required()` para `SECRETS_KEY`).

`pluggy-pool.js`: hoje há um cliente único (`server/src/index.js:22-25`):
```javascript
const pluggy = new PluggyClient({ clientId: required('PLUGGY_CLIENT_ID'), clientSecret: required('PLUGGY_CLIENT_SECRET') })
```
Trocar por `pluggyFor(hid)`: segredo do grupo, ou cliente de ambiente só se `hid === OWNER_HID`, senão `null`. Nunca cair no cliente do dono. `createApp({ pluggy, ... })` passa a receber o resolvedor; `sync.syncAll/syncItem/syncConnection`, `withAfterSync` e o agendador (`index.js:76-86`) também. Nas rotas `/api/bank/credentials`, usar o `handle` genérico sem devolver `err.message` (o de `app.js:93-97` devolve a mensagem crua; não copiar esse trecho).

### `server/src/app.js` e `webhook.js` (webhook por grupo)

**Analog:** `app.js:56-84`. Nova rota `/webhooks/pluggy/h/:hid/:sig`, com `sig = HMAC-SHA256(WEBHOOK_URL_KEY, hid)` comparada com `timingSafeEqual`. Reaproveitar `validateWebhookBody`, `HANDLED_EVENTS`, `createSeenEvents` e o padrão "responde 200 antes de processar". Trocar a leitura do dono: exigir `snap.data().ownerId === hid` antes de `sync.syncItem(db, pluggyFor(hid), itemId)`. `/api/connect-token` e `/api/connections`: recusar `person` ausente do grupo (modo sozinho) e usar `clientUserId: `${hid}:${person}`` com `webhookUrl`. A rota atual com `x-webhook-secret` fica para o dono.

### `server/src/account-delete.js` e `server/scripts/migrate-settings.js`

**Analog:** `server/scripts/create-users.js`: dois passos (inspeciona tudo, depois aplica só com `--apply`), `parseArgs`, `main()` só quando executado direto:
```javascript
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { main().catch(...) }
```
Para escrita em massa usar `BulkWriter` com `onWriteError` como em `server/scripts/backfill.js` (não li o arquivo; conferir antes de copiar). Exclusão: job idempotente retomado na subida, gravando `accountDeletions/{uid}`, lotes de até 400, Auth por último, nunca `recursiveDelete` de coleção inteira; filtrar sempre por `ownerId == hid` (Admin SDK ignora regras). Tabela de coleções a apagar está na pesquisa ("Exclusão de conta").

### `firestore.rules`

**Analog:** o próprio arquivo (linhas 10-37). Adicionar, sem tocar nas funções existentes:
```
match /households/{hid} { allow get: if isMember() && hid == request.auth.token.hid; }
```
Etapa restritiva (depois do cliente novo): em `settings` limitar `create` e `get` de inexistente a `id == request.auth.token.hid`; em `limitAlerts`/`vintemInsights`, `create` só com id começando por `hid + '__'`. Atualizar a linha 31 (`allow get ... resource == null`). `invites`, `householdSecrets`, `accountDeletions` ficam negadas por padrão; incluir em `SERVER_COLS` de `test/rules/matrix.test.js` e `test/static/phase7-rules.test.js`.

### Rollback seguro

`firebase.rollback.json` aponta para `firestore.rules.legacy` (`allow read, write: if true`). Antes de qualquer segundo grupo: copiar as regras atuais para `firestore.rules.pre-fase8`, repontar o rollback e ajustar `test/static/firestore-config.test.js:79-83`.

### Testes

**Analog:** `server/test/app.test.js` (fábrica `createApp` com `deps` injetadas: `verifyToken`, `db`, `pluggy`, `sync`, `origins`, `now`). Servidor usa `node --test`; cliente/núcleo seguem os testes estáticos de `test/static/*.test.js` (guarda tipo "componentes do Casal não importam services de escrita"). Testes de isolamento com dois `hid` no emulador em `test/rules/matrix.test.js`.

## Padrões compartilhados

### Dono vem do token, nunca do corpo
**Fonte:** `server/src/auth.js:23-39`. **Aplicar a:** toda rota nova autenticada.
```javascript
req.owner = { uid: decoded.uid, hid: decoded.hid, person: decoded.person }
```

### Erro sem vazamento
**Fonte:** `server/src/push/router.js` (`handle`, loga só `err?.code`, responde `'Erro interno'`). **Aplicar a:** convites, banco, exclusão.

### Filtro de dono em tudo que o servidor toca
**Fonte:** `server/src/app.js:113,151,170` (`doc.ownerId !== req.owner.hid` -> 403). **Aplicar a:** todo acesso Admin a `bankConnections`, convites, segredos.

### Serviço de cliente com ramo MOCK
**Fonte:** `src/services/settings.service.ts:24-34`. **Aplicar a:** `household.service.ts` e qualquer service novo.

### Núcleo puro compartilhado
**Fonte:** `shared/core/*.js` (`// @ts-check`, JSDoc, centavos inteiros). **Aplicar a:** `couple.js`, `household.js`.

### Limpeza de chaves locais
Chaves sem `hid` (`oinc:usadas:v1:*`, `vintem:baseline:v1:*`, `oinc:rejeitadas:v1`, `vintem:written:v1:`, `vintem:seen:v1:`, `vintem:recent:v1`, `coinc:push:fid`, `coinc:push:off`) devem ser limpas no logout e na exclusão; o logout chama `unregister` do push antes (`server/src/push/router.js:38-42` devolve 409 para FID de outro grupo).

## Sem analog

| Arquivo | Papel | Fluxo | Motivo |
|---|---|---|---|
| `server/src/secrets.js` | utilitário | transform | não há cifra em repouso no projeto; usar o esboço AES-256-GCM da pesquisa |
| `src/pages/InvitePage.tsx` | página pública | request-response | não há tela anônima além do Login; entrar antes do portão de `ProtectedRoute`, ler o token do fragmento `#` e limpar com `history.replaceState` (estilo de `src/lib/legacyOrigin.ts`) |

## Metadados

**Escopo de busca:** `server/src`, `server/scripts`, `shared/core`, `src/pages`, `src/components/couple`, `src/hooks`, `src/services`, `firestore.rules`, `test/`.
**Arquivos lidos por inteiro:** `app.js`, `limiter.js`, `webhook.js`, `auth.js`, `firestore.rules`, `create-users.js`, `CouplePage.tsx`; trechos de `couple.js`, `useCycleBudget.ts`, `settings.service.ts`, `alerts.js`, `push/router.js`, `index.js`. Os demais arquivos citados vêm do inventário da pesquisa (linhas não relidas); conferir antes de editar.
**Lacunas:** `server/scripts/backfill.js` e `shared/core/pushDue.js` (`dueEvent` precisa incluir `hid`) não foram lidos. O RESEARCH.md foi lido até a linha 557 de 682.
**Data:** 2026-11-27
