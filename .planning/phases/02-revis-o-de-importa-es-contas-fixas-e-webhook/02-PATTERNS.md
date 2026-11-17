# Fase 2: Revisão de importações, contas fixas e webhook (escopo reduzido) - Mapa de padrões

**Mapeado:** 2026-11-17
**Arquivos analisados:** 24 (13 novos, 11 modificados)
**Analogs encontrados:** 24 / 24 (todos rastreados no git; conferido com `git ls-files`)

Escopo (CONTEXT D-01 a D-08): webhook da Pluggy (REV-06), "atualizado há X" e consentimento (REV-07), trava de não regressão do pagamento manual de fixas (REV-03) e script de sonda somente leitura do cartão. Telas de revisão, vínculo com fixas e estorno estão fora (D-01 a D-05): `shared/core/classify.js` **não** é tocado.

Convenções que valem para todos os arquivos abaixo:
- Código do servidor (`server/src`, `server/scripts`, `server/test`): comentários em ASCII, sem acento, em pt-BR (ver `server/src/auth.js:3`). `shared/core` pode ter acento nos comentários, mas segue o estilo `// @ts-check` + JSDoc de `time.js`.
- Mensagens de erro/log do servidor também sem acento (`'Nao autorizado'`, `'Sem acesso'`).
- Nada de ler `.env*`; `server/.env.example` é tracked e pode ganhar a linha `PLUGGY_WEBHOOK_SECRET=` (só nome, sem valor), mas o executor não deve abrir arquivos `.env` reais.

## Classificação dos arquivos

| Arquivo novo/modificado | Papel | Fluxo de dados | Analog mais próximo | Qualidade |
|---|---|---|---|---|
| `server/src/webhook.js` (novo) | utility (puro) | request-response (validação) | `server/src/auth.js` | role-match |
| `server/src/app.js` (mod: rota `/webhooks/pluggy`, `connect-token` com `itemId`) | route/controller | request-response | ele mesmo (`app.js:32-40`, `:78-95`) | exact |
| `server/src/sync.js` (mod: `syncItem`, campos novos em `ref.set`) | service | event-driven + batch | ele mesmo (`sync.js:255-270`, `:280-306`) | exact |
| `server/src/index.js` (mod: segredo opcional, `syncItem` em `sync`) | config | request-response | ele mesmo (`index.js:25-27`, `:33-39`) | exact |
| `server/src/card-probe.js` (novo) | utility (puro, transform) | transform | `shared/core/time.js` + `buildProbeQueries` de `server/scripts/check-indexes.js` | role-match |
| `server/scripts/register-webhooks.js` (novo) | script (CLI idempotente) | CRUD externo (Pluggy) | `server/scripts/check-indexes.js` | role-match |
| `server/scripts/probe-card.js` (novo) | script (CLI somente leitura) | transform | `server/scripts/verify.js` | role-match |
| `shared/core/bankStatus.js` (novo) | utility (puro) | transform | `shared/core/time.js` | exact |
| `shared/core/bankStatus.test.js` (novo) | test | transform | `shared/core/time.test.js` | exact |
| `shared/core/purity.test.js` (mod: incluir `bankStatus.js` nas listas) | test | transform | ele mesmo (`purity.test.js:11-12`) | exact |
| `server/test/app.test.js` (mod) | test | request-response | ele mesmo | exact |
| `server/test/webhook.test.js` (novo) | test | transform | `server/test/shared-imports.test.js` + estilo de `app.test.js` | role-match |
| `server/test/card-probe.test.js` (novo) | test | transform | `shared/core/time.test.js` | role-match |
| `server/test/register-webhooks.test.js` (novo) | test | CRUD (Pluggy falso) | `server/test/app.test.js` (fakes) | role-match |
| `server/test/emu/sync.test.js` (mod: `syncItem`, campos de consentimento) | test | event-driven | ele mesmo (`:256-284`) | exact |
| `src/services/bank.service.ts` (mod) | service (cliente) | CRUD + request-response | ele mesmo | exact |
| `src/hooks/useBankConnections.ts` (novo) | hook | event-driven (onSnapshot) | `src/hooks/useNotes.ts` (forma `{ data, loading, error }`) + `subscribeBankConnections` | role-match |
| `src/components/settings/BankConnections.tsx` (mod) | component | request-response | ele mesmo (`:44-64`, `:99-121`) | exact |
| `src/components/dashboard/BankStatusNotice.tsx` (novo; a pasta `dashboard/` ainda não existe no git) | component | request-response (somente leitura) | `src/components/layout/NotificationsBell.tsx` + `src/components/ui/alert.tsx` | role-match |
| `src/pages/DashboardPage.tsx` (mod: montar o aviso) | component (página) | request-response | ele mesmo (`:33-60`) | exact |
| `test/static/fixed-expense-manual.test.js` (novo) | test (estático) | file-I/O | `test/static/no-legacy-auth.test.js` | exact |
| `test/static/*` trava "para revisar" e operações proibidas da sonda (pode ir no mesmo arquivo acima ou em `bank-ui-copy.test.js`) | test (estático) | file-I/O | `test/static/no-legacy-auth.test.js` + `purity.test.js:7-9` (`code()`) | exact |
| `server/.env.example` (mod: só o nome da variável) | config | n/a | ele mesmo | exact |

## Atribuições de padrão

### `server/src/app.js` (route, request-response) - rota do webhook e `connect-token` com `itemId`

**Analog:** o próprio `server/src/app.js`.

**Assinatura e ordem de middlewares** (linhas 12-23). A rota nova entra **entre** `app.get('/health')` (linha 21) e `app.use('/api', ...)` (linha 23); `webhookSecret` entra no objeto de dependências:
```javascript
export function createApp({ verifyToken, db, pluggy, sync, origins, now = () => new Date() }) {
  ...
  const app = express()
  app.use(cors({ origin: origins }))
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/api', originGuard(origins), requireOwner(verifyToken))
```

**Padrão de erro/resposta** (linhas 25-29): `handle(fn)` só vale para rotas `/api` (devolve 500 com a mensagem). A rota do webhook **não** usa `handle`: responde 200 antes de processar e só faz `console.error` depois (contrato em RESEARCH Padrão 1; mensagem sem corpo, sem cabeçalhos, sem segredo).

**Padrão de dono + 404/403** a copiar para `connect-token` com `itemId` (linhas 82-86, mesmo padrão de `:67`):
```javascript
const { itemId } = req.params
const ref = db.collection('bankConnections').doc(itemId)
const snap = await ref.get()
if (!snap.exists) return res.status(404).json({ error: 'Conexao nao encontrada' })
if (snap.data().ownerId !== req.owner.hid) return res.status(403).json({ error: 'Sem acesso' })
```

**Trecho atual do `connect-token` a estender** (linhas 32-40). Hoje exige `person` e passa `undefined` como `itemId` ao SDK:
```javascript
app.post('/api/connect-token', handle(async (req, res) => {
  const { person } = req.body ?? {}
  if (!PEOPLE.includes(person)) return res.status(400).json({ error: 'Pessoa invalida' })
  const { accessToken } = await pluggy.createConnectToken(undefined, { clientUserId: person })
  res.json({ accessToken })
}))
```
Novo comportamento (RESEARCH Padrão 4): se vier `itemId` string, ler `bankConnections/{itemId}`, 404/403 como acima, e chamar `pluggy.createConnectToken(itemId, { clientUserId: snap.data().person })`; sem `itemId`, manter o ramo atual (`person` obrigatório, 400 se ausente/inválido). O `ownerId` do documento é quem decide, nunca o corpo.

**Código novo da rota** (RESEARCH Padrão 1, snippet já pronto com `secretMatches`, `HANDLED_EVENTS`, `ITEM_ID_RE`; mover essas três peças para `server/src/webhook.js` e importar). Montar a rota **somente** `if (webhookSecret)`.

**Diferença entre o sketch da RESEARCH e os requisitos de teste (decisão do planejador):** o sketch chama `sync.syncItem(db, pluggy, itemId, { event })`, e o `syncItem` do Padrão 3 lê o documento dentro da fila. Mas a matriz de testes exige "item desconhecido → 200 **sem** `syncItem`" e gravar `lastWebhookAt`/`lastWebhookEvent` só para item conhecido. Então o handler, **depois** do `res.status(200)`, deve fazer `await db.collection('bankConnections').doc(itemId).get()`, sair se `!exists`, gravar `{ lastWebhookAt: Timestamp.now(), lastWebhookEvent: event }` com `set(..., { merge: true })` e só então chamar `sync.syncItem(...)`. Tudo dentro de um `.catch(err => console.error('[webhook] ...', err?.message ?? err))`.

---

### `server/src/webhook.js` (novo; utility puro, request-response)

**Analog:** `server/src/auth.js` (arquivo pequeno de exports puros/middleware, com comentário explicando o porquê e `node:` imports no topo).

**Estilo de imports e export** (`auth.js:1-8`):
```javascript
import { getAuth } from 'firebase-admin/auth'

// Lista de origens separadas por virgula (ALLOWED_ORIGINS): apara e descarta vazios.
export const parseOrigins = (csv) =>
  String(csv ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
```
Copiar: `export const` com arrow, comentário curto em ASCII acima de cada export, nenhuma dependência além de `node:crypto`.

**Conteúdo** (já especificado em RESEARCH Padrão 1 e 2): `secretMatches(given, expected)` com `sha256` + `timingSafeEqual`, `HANDLED_EVENTS`, `ITEM_ID_RE`, `validateWebhookBody(body)` e um `createSeenEvents(limit = 500)` (Set/Map limitado, descarta o mais antigo) para a deduplicação de `eventId`. Aceitar também `PLUGGY_WEBHOOK_SECRET_PREVIOUS` (RESEARCH Pitfall 6) recebendo `expected` como lista. Não logar segredo nem corpo.

---

### `server/src/sync.js` (service, event-driven) - `syncItem` e campos novos

**Analog:** o próprio `server/src/sync.js`.

**Fila única e coalescência** (linhas 280-306; `syncItem` deve usar o **mesmo** `tail`):
```javascript
// Execucoes em andamento por chave (hid ou todas): a mesma chave reaproveita a execucao.
// Chaves diferentes entram numa fila unica para nunca processar duas conexoes ao mesmo tempo.
const runs = new Map()
let tail = Promise.resolve()

export function syncAll(db, pluggy, { hid } = {}) {
  ...
  const key = hid ?? '*'
  if (!runs.has(key)) {
    const job = tail.then(async () => {
      const col = db.collection(CONNECTIONS)
      const snap = await (hid ? col.where('ownerId', '==', hid) : col).get()
      const results = []
      for (const doc of snap.docs) {
        results.push(await syncConnection(db, pluggy, { itemId: doc.id, ...doc.data() }))
      }
      return results
    })
    const run = job.finally(() => runs.delete(key))
    tail = run.catch(() => {})
    runs.set(key, run)
  }
  return runs.get(key)
}
```
Copiar o formato `tail.then(...)` + `tail = job.catch(() => {})`. O esboço de `syncItem` com `itemRuns`/`again` está em RESEARCH Padrão 3. Diferença deliberada: `syncAll` **reaproveita** a execução em andamento (perderia o último evento), `syncItem` marca `again = true` e repete uma vez.

**Recusa de conexão sem dono** (linhas 120-124, já protege o `syncItem`, não duplicar):
```javascript
if (typeof ownerId !== 'string' || !ownerId) {
  throw new Error('Conexao sem dono (ownerId): rode o backfill antes de sincronizar')
}
```

**Campos novos em `ref.set(..., { merge: true })`** (linhas 255-270; acrescentar `executionStatus`, `consentExpiresAt`, `errorCode`; `bankUpdatedAt` e `status` já existem). Copiar a forma de conversão de data da linha 265:
```javascript
bankUpdatedAt: item.lastUpdatedAt ? Timestamp.fromDate(new Date(item.lastUpdatedAt)) : null,
```
para `consentExpiresAt: item.consentExpiresAt ? Timestamp.fromDate(new Date(item.consentExpiresAt)) : null`, `executionStatus: item.executionStatus ?? null`, `errorCode: item.error?.code ?? null`. Item sem consentimento grava `null` (teste emu exige).

**Idempotência por dado** (linhas 168-173, 199, 202): não alterar. `existing.has(tx.id)` pula quem já existe; ids `bankImports/{tx.id}` e `transactions/bank_{tx.id}` são determinísticos. `transactions/updated` e `transactions/deleted` apenas disparam sync (nada de apagar/atualizar; D-03/D-05).

**Erro** (linhas 271-277): `syncConnection` captura o erro, grava `lastSyncError` e devolve `summary`; por isso o laço `do { } while (state.again)` do `syncItem` não trava. Não mexer em `classify`/`findDuplicate`.

---

### `server/src/index.js` (config)

**Analog:** o próprio `server/src/index.js`.

**Import de `sync`** (linha 7) e injeção (linha 37):
```javascript
import { cleanExistingDescriptions, syncAll, syncConnection } from './sync.js'
...
  sync: { syncAll, syncConnection, cleanExistingDescriptions },
```
Acrescentar `syncItem` aos dois.

**Variável opcional com aviso** (padrão de `index.js:25-27`; **não** usar `required()` de `:9-16` para o segredo, RESEARCH Anti-Pattern):
```javascript
if (process.env.APP_API_KEY) {
  console.warn('[server] APP_API_KEY nao e mais usada (a API aceita so token do Firebase); remova a variavel')
}
```
Inverter a lógica: se `PLUGGY_WEBHOOK_SECRET` estiver ausente, `console.warn('[server] PLUGGY_WEBHOOK_SECRET ausente: webhook da Pluggy desativado (so polling)')` e passar `webhookSecret: process.env.PLUGGY_WEBHOOK_SECRET` (e `..._PREVIOUS`) para `createApp`. O agendador de 6 h (linhas 44-53) fica intacto: é a reserva (D-06).

---

### `server/scripts/register-webhooks.js` (script, CRUD externo idempotente)

**Analog:** `server/scripts/check-indexes.js` (função de lógica exportada e testável + `parseArgs` + `main` + guarda de execução direta).

**Estrutura a copiar** (`check-indexes.js:1-5`, `:75-83`, `:101-108`):
```javascript
import { fileURLToPath, pathToFileURL } from 'node:url'
...
function parseArgs(argv) { ... }

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.hid || Number.isNaN(args.wait)) {
    console.error('Uso: node server/scripts/check-indexes.js --hid <id-do-casal> [--wait <segundos>]')
    process.exit(1)
  }
  ...
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`[script] ${err?.message ?? err}`)
    process.exit(1)
  })
}
```
Prefixo de log `[script]` (também em `verify.js:101-112`). **Diferença obrigatória em relação ao exemplo da RESEARCH:** o snippet de "Registro idempotente" roda no topo do módulo, o que não é testável. A matriz exige "unit com Pluggy falso" (cria só os que faltam, reativa `disabledAt`, não imprime o segredo). Então exportar `registerWebhooks({ pluggy, url, headers, log = () => {} })` (injeção de `pluggy`, como `runChecks({ db, ... , log })` em `check-indexes.js:57`) e deixar o `main()` só ler `process.env` (`PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET`, `WEBHOOK_URL`), validar `https://` e instanciar `PluggyClient`. Lógica de `fetchWebhooks` → `createWebhook`/`updateWebhook(id, { headers, enabled: true })` está em RESEARCH "Code Examples". Não importar `./lib/admin.js` (não usa Firebase). Nunca imprimir o valor de `headers`.

---

### `server/scripts/probe-card.js` (script, somente leitura, transform)

**Analog:** `server/scripts/verify.js` (script que só imprime contagens e mensagens, "nunca dados", com lógica exportada `runVerify`).

**Contrato de saída segura** (`verify.js:6-7` e `:95-112`):
```javascript
// ... So imprime contagens e mensagens, nunca dados.
...
  console.log('[script] colecao | documentos | sem ownerId | ownerId errado | sem categoryId')
  for (const [name, c] of Object.entries(result.collections)) {
    console.log(`[script] ${name} | ${c.count} | ...`)
  }
  console.log(`[script] verify: ${result.ok ? 'OK' : 'FALHOU'}`)
  if (!result.ok) process.exit(1)
```
Copiar o formato `[script] ...` e a guarda de execução direta (igual a `verify.js:107-112`). O script chama só `fetchItem`, `fetchAccounts`, `fetchCreditCardBills`, `fetchAllTransactions` e imprime exclusivamente o retorno de `summarizeCardShape` (`server/src/card-probe.js`). Regras adicionais (1 execução por dia: falhar se `02-CARD-PROBE.md` do mesmo dia existir; sem modo dump; credenciais só de `process.env` e `--item`) em RESEARCH Padrão 6. Proibidos no arquivo: `createItem`, `updateItem`, `deleteItem`, `createConnectToken`, `PATCH`.

---

### `server/src/card-probe.js` (novo; utility puro, transform)

**Analog:** `shared/core/time.js` (função pura, JSDoc, sem relógio implícito) e `buildProbeQueries` em `check-indexes.js:27-47` (função pura exportada que devolve estrutura de prova).

**Padrão de função pura exportada** (`time.js:1-12`):
```javascript
// @ts-check
// Tempo em America/Sao_Paulo, sem dependencias e sem relogio implicito: o
// "agora" e sempre passado como argumento (D-11). ...
/**
 * Partes de calendario de um instante no fuso pedido.
 * @param {Date} date
 ...
 */
export function zonedParts(date, tz = DEFAULT_TZ) {
```
`summarizeCardShape({ item, accounts, bills, txs }, now)` por allowlist (tipos, enumerados, contagens, booleanos derivados; nunca `id`, `description`, `merchant`, `cardNumber`, valores em reais, nome do titular). Dias até `consentExpiresAt` calculados com `now` injetado (nunca `Date.now()`).

---

### `shared/core/bankStatus.js` (novo; utility puro, transform) e `bankStatus.test.js`

**Analog:** `shared/core/time.js` e `shared/core/time.test.js`.

**Cabeçalho obrigatório** (`time.js:1-4`): `// @ts-check`, comentário em pt-BR, relógio sempre argumento.

**Regras de pureza que o novo arquivo precisa cumprir** (`purity.test.js:7-38`): sem import de pacote (só caminhos relativos), sem `Date.now(` e sem `new Date()` **sem argumento** (`new Date(x)` com argumento é permitido). Portanto `describeBankFreshness(conn, now, opts)` recebe `Date` já convertidos (cliente converte Timestamp → `Date` em `bank.service.ts`). **Modificar `purity.test.js`**:
```javascript
const ALL = ['time.js', 'classify.js', 'categories.js', 'ledger.js']
const CLOCK_FREE = ['time.js', 'categories.js', 'ledger.js']
```
incluindo `'bankStatus.js'` em `ALL` e `CLOCK_FREE`.

**Estilo de teste** (`time.test.js:1-19`): `node:test` + `assert/strict`, import nomeado do módulo vizinho, instantes fixos em ISO com `Z`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_TZ, zonedParts, ... } from './time.js'

test('monthRange: 2026-11-01T02:30Z ainda e 31/10 em Sao Paulo', () => {
  const r = monthRange(new Date('2026-11-01T02:30:00Z'))
  assert.equal(r.start.toISOString(), '2026-10-01T03:00:00.000Z')
```
Rodado por `npm run test:core` e `test:core:tz` (UTC e Asia/Tokyo; `package.json:14-15`). Casos exigidos: limiar 30 dias / 48 h, `consentExpiresAt` nulo (= "sem vencimento conhecido"), `LOGIN_ERROR`, vencido, `OUTDATED`, `PARTIAL_SUCCESS`, status desconhecido.

---

### `server/test/app.test.js` (test, request-response) - novos casos

**Analog:** o próprio arquivo.

**Fakes a estender** (linhas 24-82). Atenção ao `fakeDb`: o `set` ignora o segundo argumento, então `set(..., { merge: true })` **sobrescreve** o documento em vez de mesclar, e não existe `update` nem `getAll`:
```javascript
async set(data) {
  store.set(key, { ...data })
},
```
Mudar para `async set(data, opts) { store.set(key, opts?.merge ? { ...(store.get(key) ?? {}), ...data } : { ...data }) }` (Pitfall 10). `fakeSync` (linhas 67-82) ganha:
```javascript
async syncItem(db, pluggy, itemId, opts) { calls.push(['syncItem', itemId, opts]); return {} }
```
Helper `waitFor(fn)` (poll curto) porque o processamento ocorre depois do 200.

**Montagem do app** (linhas 90-105): passar `webhookSecret: SECRET` em `createApp({...})`. Para "sem segredo, a rota não existe (404)", montar um segundo app sem `webhookSecret` no próprio teste.

**Helper `call`** (linhas 116-126) já aceita `headers`, então `call('/webhooks/pluggy', { method: 'POST', body, headers: { 'x-webhook-secret': SECRET } })` funciona sem mudança.

**Casos** (exemplo completo em RESEARCH, "Teste HTTP do webhook"): 401 sem/errado segredo; 200 + `syncItem` com payload `ownerId` falso ignorado; 4 eventos acionam; evento fora da lista → 200 sem sync; corpo inválido → 400; item desconhecido → 200 sem sync; mesmo `eventId` duas vezes → um `syncItem`; `/api/sync` continua 401 sem token. Para `connect-token` com `itemId`, copiar o estilo das linhas 195-209 (400/200) com `tok-ele` (casalA) e `tok-outro` (casalB, 403), semeando `db.store.set('bankConnections/item-w1', { ownerId: 'casalA', person: 'ele' })`.

---

### `server/test/webhook.test.js` e `server/test/card-probe.test.js` (test, unitário puro)

**Analog:** `server/test/shared-imports.test.js` (arquivo curto, `node:test` + `assert/strict`) e `time.test.js`. O script do servidor é `node --test "test/*.test.js"` (`server/package.json`): só arquivos direto em `server/test/`, **não** entram os de `server/test/emu/`.

**Teste de não vazamento** (RESEARCH Padrão 6.4): fixture com sentinelas (`'LOJA-SECRETA'`, `'5555 **** **** 1234'`, `'12345678900'`, `987.65`) e `assert.doesNotMatch(JSON.stringify(resumo), /.../)` para cada uma.

---

### `server/test/register-webhooks.test.js` (test, Pluggy falso)

**Analog:** os fakes de `server/test/app.test.js:51-65` (objeto de métodos assíncronos que empurra para `calls`):
```javascript
function fakePluggy(calls) {
  return {
    async createConnectToken(itemId, options) {
      calls.push(['createConnectToken', itemId, options])
      return { accessToken: 'connect-token-falso' }
    },
```
Fake com `fetchWebhooks` (`{ results: [...] }`), `createWebhook`, `updateWebhook`. Afirmar: só cria os que faltam, reativa `disabledAt`, e que a saída coletada em `log` não contém o valor do segredo.

---

### `server/test/emu/sync.test.js` (test de integração, emulador) - `syncItem` e consentimento

**Analog:** o próprio arquivo.

**Estrutura e helpers** (linhas 1-80): `initAdmin()` em `before`, `resetEmulators()` em `beforeEach`, `seedConnection(itemId, ownerId, person)`, `countOf(name)`, `fakePluggy(itemsById, { onFetchItem })`. O `fakePluggy` retorna `item` sem `lastUpdatedAt`/`consentExpiresAt`/`executionStatus`: para o teste de consentimento, estender o retorno de `fetchItem` (ex.: opção `item` extra mesclada) e afirmar `consentExpiresAt`, `executionStatus`, `errorCode`, `bankUpdatedAt`, e `null` quando ausentes.

**Padrão de teste de rajada/serialização** a copiar para `syncItem` (linhas 256-284):
```javascript
let active = 0
let maxActive = 0
const pluggy = fakePluggy({ ... }, {
  onFetchItem: async () => {
    active++
    maxActive = Math.max(maxActive, active)
    await new Promise((r) => setTimeout(r, 50))
    active--
  },
})
const pA1 = syncAll(db, pluggy, { hid: HID_A })
...
assert.equal(maxActive, 1, 'no maximo uma conexao em processamento')
```
Novo: 3 chamadas `syncItem(db, pluggy, 'itemA')` durante uma execução lenta → contar `fetchItem` = 2 (execução + repetição final); `syncItem` e `syncAll` juntos → `maxActive === 1`. Replay: `countOf('bankImports')` e `countOf('transactions')` iguais antes/depois do segundo `syncItem`. Imports: `syncItem` vem de `../../src/sync.js` (linha 6).

---

### `src/services/bank.service.ts` (service cliente)

**Analog:** o próprio arquivo.

**Tipo e leitura do snapshot** (linhas 6-13, 47-57): acrescentar a `BankConnection` `bankUpdatedAt?: Date | null`, `consentExpiresAt?: Date | null`, `executionStatus?: string | null`, `lastWebhookAt?: Date | null`, e ler com o mesmo padrão de `lastSyncAt` (linha 55):
```javascript
lastSyncAt: data.lastSyncAt?.toDate?.() ?? null,
```
**Cliente HTTP** (linhas 27-39, `api<T>` com ID token): nada muda; só estender `createConnectToken` (linhas 67-71):
```typescript
export const createConnectToken = (person: PersonType) =>
  api<{ accessToken: string }>('/api/connect-token', {
    method: 'POST',
    body: JSON.stringify({ person }),
  })
```
para aceitar `{ person } | { itemId }` (ou `(person, itemId?)`), sem remover o ramo atual. O escopo de dono continua só via `ownerScope()` (linha 44); não escrever `ownerId` aqui.

---

### `src/hooks/useBankConnections.ts` (novo; hook)

**Analog:** forma `{ data, loading, error }` de `src/hooks/useNotes.ts` (linhas 4-9, 33-34) e a inscrição já pronta `subscribeBankConnections(cb)` (`bank.service.ts:41-65`), que devolve a função de cancelamento e chama `cb([])` em erro. Como a inscrição é em tempo real, não copiar o `fetchData/refetch` do `useNotes`; copiar só a assinatura de retorno:
```typescript
const [loading, setLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)
```
e o uso em `BankConnections.tsx:24` (`useEffect(() => subscribeBankConnections(setConnections), [])`). Retornar `{ connections, loading, error }`. Reuso na Fase 3 (LIM-08). Também um `useNow(60_000)` simples (não existe hoje; grep sem resultado) para o texto relativo não congelar.

---

### `src/components/settings/BankConnections.tsx` (component)

**Analog:** o próprio arquivo.

**Imports** (linhas 1-16): `lucide-react`, `@/components/ui/*`, `@/services/bank.service`. Acrescentar `formatDistanceToNowStrict` de `date-fns`, `ptBR` de `date-fns/locale` (mesmo import usado em `src/components/shared/MonthSelector.tsx:5`) e `describeBankFreshness` de `@shared/core/bankStatus.js` (alias `@shared` já usado, ex.: `src/services/transactions.service.ts:18-19`: `import { monthRangeOf } from '@shared/core/time.js'`).

**Padrão do widget Pluggy Connect para Reconectar** (linhas 44-64): copiar `connect()` e passar `updateItem: c.itemId` junto de `connectToken`:
```typescript
const connect = (person: PersonType) =>
  run(`connect-${person}`, async () => {
    const { accessToken } = await createConnectToken(person)
    await new Promise<void>((resolve, reject) => {
      const widget = new PluggyConnect({
        connectToken: accessToken,
        includeSandbox: false,
        onSuccess: ({ item }) => {
          registerConnection(person, item.id)
            .then((s) => { setMessage(`Banco conectado: ${s.imported} importados, ${s.review} para revisar.`); resolve() })
            .catch(reject)
        },
        onError: (error) => reject(new Error(error.message)),
        onClose: () => resolve(),
      })
      widget.init()
    })
  })
```
Novo `reconnect(c)`: `run(\`reconnect-${c.itemId}\`, ...)` chamando `createConnectToken({ itemId: c.itemId })` e `new PluggyConnect({ connectToken: accessToken, updateItem: c.itemId, includeSandbox: false, ... })`; `onSuccess` chama `registerConnection(c.person, item.id)` (só sincroniza para item existente do mesmo dono).

**Textos "para revisar" (D-05)**: remover nas linhas 54 e 71 (`${s.imported} importados, ${s.review} para revisar.` e `${imported} novos, ${review} para revisar.`); o cálculo de `review` da linha 70 deixa de ser usado (remover para não falhar no `eslint no-unused-vars`). Uma trava estática garante que a string "para revisar" não volta.

**Linha por conexão** (linhas 104-109): hoje mostra `ultima sync` (`lastSyncAt`, quando o servidor importou). Substituir/complementar por "atualizado há X" a partir de `bankUpdatedAt` (RESEARCH Pitfall 8: `lastSyncAt` só como reserva), estado de consentimento, linha pequena "último aviso do banco: há X" (`lastWebhookAt`, evidência de D-07) e botão `Reconectar` (padrão dos botões de `:111-119` e `:122-139`, `variant="outline" size="sm"`, `disabled={busy !== null}`) quando `needsReconnect` ou consentimento `expiring`/`expired`.

**Tratamento de erro/ocupado** (linhas 31-42): reutilizar `run(key, fn)` tal e qual (`busy`, `message`, `try/catch/finally`).

---

### `src/components/dashboard/BankStatusNotice.tsx` (novo; component, somente leitura)

**Analog:** `src/components/layout/NotificationsBell.tsx` (componente que lê hooks de dados e decide a exibição) e `src/components/ui/alert.tsx` (variantes `default | destructive | warning | success`, já tem `warning`).

A pasta `src/components/dashboard/` está citada no `CLAUDE.md` mas **não tem arquivos rastreados**; criar o arquivo nela. Imports do mesmo estilo (`NotificationsBell.tsx:1-7`):
```typescript
import { useEffect, useRef, useState } from 'react'
import { Bell, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useArea } from '@/contexts/AreaContext'
import { formatCurrency } from '@/lib/utils'
import { getDate } from 'date-fns'
```
Padrão de decisão de exibição (`NotificationsBell.tsx:18-25`, filtra e só mostra se há algo). Aqui: retornar `null` sem conexões; texto neutro (`text-xs text-muted-foreground`) quando `level === 'ok'`; `<Alert variant="warning">` / `variant="destructive"` só quando `level !== 'ok'`, com link para `/configuracoes` (rota em `src/App.tsx:27`). Usa `useBankConnections()` + `describeBankFreshness` + `useNow(60_000)`. Português sem acento só no código de servidor; no JSX do cliente seguir os textos existentes (a tela atual usa texto sem acento, ex.: "ultima sync", "Defina VITE_BANK_API_URL..."; manter consistência com o arquivo vizinho).

---

### `src/pages/DashboardPage.tsx` (mod)

**Analog:** o próprio arquivo. Inserir `<BankStatusNotice />` logo depois do bloco do cabeçalho/`MonthSelector` (linhas 49-58) e antes do `grid` dos cartões (linha 60). Import junto dos de `@/components/...` (linhas 3-5).

---

### `test/static/fixed-expense-manual.test.js` (test estático, file-I/O) - REV-03

**Analog:** `test/static/no-legacy-auth.test.js`.

**Cabeçalho e helpers a copiar** (linhas 1-34):
```javascript
// Guarda estatica: ...
// Rodar: node --test test/static/no-legacy-auth.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
  }
  return out
}
```
**Padrão de varredura com sanidade** (linhas 44-48): `assert.ok(files.length > N, 'a varredura deveria encontrar os arquivos')` para não passar por varrer pasta vazia.

**Remoção de comentários antes da busca** (`shared/core/purity.test.js:7-9`) para evitar falso positivo em texto explicativo:
```javascript
const code = (name) => read(name).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
```
**Alvos (RESEARCH Padrão 5):**
(a) corpo de `markAsPaid` em `src/services/fixedExpenses.service.ts` (fatiar de `export async function markAsPaid` até `export async function unmarkAsPaid`, linhas 137-156) não contém `transactions` nem `addTransaction`; hoje só grava `{ ownerId, fixedExpenseId, month, year, paidAmount, paidAt }` em `PAY_COL`;
(b) `src/hooks/useFixedExpenses.ts` não importa `@/services/transactions.service`;
(c) nenhum `.js` em `server/src` nem `shared/core` contém `fixedExpense` (o grep atual não acha nada; os comentários novos do webhook/sync também não podem usar essa palavra).
Mesmo arquivo (ou `bank-ui-copy.test.js`): `BankConnections.tsx` não contém `para revisar`; `server/scripts/probe-card.js` (sem comentários) não contém `createItem`, `updateItem`, `deleteItem`, `createConnectToken`, `PATCH`. Rodado por `npm run test:static` (`node --test "test/static/*.test.js"`).

---

## Padrões compartilhados

### Escopo de dono (nunca vem do payload nem do corpo)
**Fonte:** `server/src/app.js:50` (`const ownerId = req.owner.hid`), `server/src/sync.js:117-124` e `bankConnections/{itemId}.ownerId` (`app.js:51-58`).
**Aplicar a:** rota do webhook, `syncItem`, `connect-token` com `itemId`. O webhook não tem token: `itemId` → `bankConnections/{itemId}` → `ownerId`; qualquer `ownerId` vindo no payload é ignorado.

### Autenticação
**Fonte:** `server/src/auth.js:23-39` (`requireOwner`: Bearer, claim `hid`, 401/403) e `:12-18` (`originGuard`, só para navegadores).
**Aplicar a:** todas as rotas `/api` (sem mudança). O webhook fica **fora** do `/api` (nem Bearer nem `Origin`) e usa `x-webhook-secret` + `timingSafeEqual`.

### Resposta de erro do servidor
**Fonte:** `server/src/app.js:25-29` (`handle`: `console.error('[api] ...')` + 500 com mensagem) e `app.js:36,47-49,68-70,85-86` (400/403/404/409 com `{ error: '...' }` sem acento).
**Aplicar a:** `connect-token` com `itemId`. No webhook: 401/400 em JSON `{ error }`, resto 200.

### Injeção de dependências para teste
**Fonte:** `app.js:9-12` (`createApp({ verifyToken, db, pluggy, sync, origins, now })`) e `check-indexes.js:57` (`runChecks({ db, ..., sleep, log })`).
**Aplicar a:** `webhookSecret` em `createApp`; `registerWebhooks({ pluggy, ..., log })`; `summarizeCardShape(..., now)`; `describeBankFreshness(conn, now, opts)`. Relógio sempre injetado.

### Script CLI com guarda de execução direta e prefixo `[script]`
**Fonte:** `server/scripts/check-indexes.js:101-108`, `verify.js:107-112`.
**Aplicar a:** `register-webhooks.js`, `probe-card.js`. Credenciais do shell, nunca `.env`; saída sem segredo e sem dados financeiros (repositório público).

### Testes
**Fonte:** `node:test` + `node:assert/strict` em todos os arquivos. Servidor: `npm --prefix server test` (só `server/test/*.test.js`); núcleo: `npm run test:core` / `test:core:tz`; estáticos: `npm run test:static`; emulador: `source scripts/dev-env.sh && npm run test:emu` (`--test-concurrency=1`, `server/test/emu/*.test.js`).

### Privacidade de log
**Fonte:** convenção de `server/scripts/lib/admin.js:12-15` ("Nunca imprime credenciais") e `server/src/app.js:27`. No webhook, logar só `event` e fragmento do `itemId`; nunca cabeçalhos, corpo ou segredo.

## Sem analog

Nenhum arquivo sem analog. Pontos sem precedente direto no repositório, para o planejador usar a RESEARCH:

| Peça | Papel | Motivo |
|---|---|---|
| `syncItem` com coalescência por `itemId` e repetição final | service | `syncAll` só reaproveita a execução (por chave `hid`/`*`); o `again` é novo (RESEARCH Padrão 3) |
| `useNow(intervalo)` | hook | não existe no cliente; criar simples com `setInterval` |
| `createSeenEvents` (Set limitado de `eventId`) | utility | nenhuma deduplicação de evento no código atual (RESEARCH Padrão 2) |

## Metadados

**Escopo de busca de analogs:** `server/src`, `server/scripts`, `server/test` (+ `emu`), `shared/core`, `src/services`, `src/hooks`, `src/components/{settings,layout,ui,shared}`, `src/pages`, `test/static`.
**Arquivos lidos:** `app.js`, `auth.js`, `index.js`, `sync.js`, `check-indexes.js`, `verify.js`, `lib/admin.js`, `app.test.js`, `emu/sync.test.js`, `emu/_helpers.js`, `shared-imports.test.js`, `time.js`, `time.test.js`, `purity.test.js`, `no-legacy-auth.test.js`, `bank.service.ts`, `BankConnections.tsx`, `fixedExpenses.service.ts` (trecho), `useFixedExpenses.ts` (trecho), `useNotes.ts`, `NotificationsBell.tsx`, `alert.tsx`, `DashboardPage.tsx` (trecho).
**Verificação de rastreamento:** os 20 arquivos-analog conferidos com `git ls-files` estão rastreados (nenhum espelho/ignorado).
**Data da extração:** 2026-11-17
