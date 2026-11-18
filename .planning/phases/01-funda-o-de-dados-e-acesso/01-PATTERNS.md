# Phase 1: Fundação de dados e acesso - Pattern Map

**Mapped:** 2026-11-17
**Files analyzed:** 52 (novos e modificados, agrupados abaixo)
**Analogs found:** 40 / 52 (12 sem analog no repo, ver "No Analog Found")

Todos os analogs abaixo foram conferidos com `git ls-files` (rastreados). Não existem `shared/`, `server/scripts/`, `test/`, `Dockerfile`, `.dockerignore` nem `.gitignore` na raiz: são arquivos novos. O repositório não tem `.planning/codebase/` nem skills de projeto.

Convenções gerais do código existente (valem para todo arquivo novo):
- Cliente: TypeScript estrito, `@/` para `src/`, aspas simples, sem ponto e vírgula, 2 espaços, textos da UI em pt-BR **sem acento** (ex.: "Nao e possivel remover", "Usuario ou senha incorretos").
- Servidor: ESM puro (`"type": "module"`), JS sem build, aspas simples, sem ponto e vírgula, mensagens de erro sem acento, `console.error('[api] ...')` / `console.warn('[sync] ...')` com prefixo.
- Testes do servidor: `node:test` + `node:assert/strict`.

## File Classification

### Núcleo compartilhado (FUND-05, FUND-06)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/package.json` | config | n/a | `server/package.json` (campo `type`) | role-match |
| `shared/core/classify.js` (mover de `server/src/classify.js`) | utility | transform | `server/src/classify.js` | exact (é o próprio arquivo) |
| `shared/core/classify.test.js` (mover) | test | transform | `server/test/classify.test.js` | exact (é o próprio arquivo) |
| `shared/core/time.js` | utility | transform | `server/src/classify.js` `toLocalDate` (l.60-68) | role-match |
| `shared/core/ledger.js` (`accumulatedBalance`, `monthTotals`, `weeklySpend`) | utility | transform | `src/services/transactions.service.ts` `getAccumulatedBalance` (l.162-192) + `src/components/reports/OverviewDashboard.tsx` (l.111-122) | role-match (lógica a extrair) |
| `shared/core/categories.js` (slug, defs, `categoryDisplayName`) | utility | transform | `server/src/classify.js` `normalize` + `mapCategory` (l.7-14, 84-96) | role-match |
| `shared/core/{time,ledger,categories}.test.js` | test | transform | `server/test/classify.test.js` | exact |

### Servidor (FUND-04, FUND-07)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/src/app.js` (`createApp(deps)`) | controller/middleware | request-response | `server/src/index.js` (l.28-130) | exact (extração) |
| `server/src/index.js` (bootstrap) | config | event-driven (agendador) | `server/src/index.js` (l.1-26, 132-143) | exact (modificar) |
| `server/src/sync.js` (modificar) | service | batch/CRUD | `server/src/sync.js` | exact (modificar) |
| `server/package.json` (modificar) | config | n/a | `server/package.json` | exact |
| `server/scripts/create-users.js` | utility (admin script) | CRUD (Auth) | `server/src/index.js` (`required`, `initializeApp`, l.9-26) | partial |
| `server/scripts/backfill.js` | utility (admin script) | batch | `server/src/sync.js` `cleanExistingDescriptions` (l.58-97) | role-match |
| `server/scripts/export-firestore.js` | utility (admin script) | file-I/O | `server/src/sync.js` (varredura `.get()`, l.70, 254) | partial |
| `server/scripts/verify.js` | utility (admin script) | batch | `server/src/sync.js` `cleanExistingDescriptions` | partial |
| `server/test/app.test.js` | test | request-response | `server/test/classify.test.js` | role-match |
| `server/test/sync.test.js` | test | batch | `server/test/classify.test.js` | role-match |
| `server/test/emu/*.test.js` (backfill, create-users, verify) | test | batch (emulador) | `server/test/classify.test.js` | partial |

### Cliente (FUND-01, FUND-02, FUND-05)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/scope.ts` (novo) | utility | n/a (módulo de estado) | `src/lib/mockStorage.ts` | role-match |
| `src/contexts/AuthContext.tsx` (reescrever) | provider | event-driven | `src/contexts/AuthContext.tsx` | exact (modificar) |
| `src/components/auth/LoginForm.tsx` (remover signup/legado) | component | request-response | `src/components/auth/LoginForm.tsx` | exact (modificar) |
| `src/components/auth/ProtectedRoute.tsx` (estado "sem acesso") | component | request-response | `src/components/auth/ProtectedRoute.tsx` | exact (modificar) |
| `src/contexts/AreaContext.tsx` (abrir na aba do `person`, `categoryDefs`) | provider | CRUD | `src/contexts/AreaContext.tsx` | exact (modificar) |
| `src/services/transactions.service.ts` | service | CRUD | ele mesmo | exact (modificar) |
| `src/services/{fixedExpenses,goals,goalContributions,savings,events,eventCategories,notes}.service.ts` | service | CRUD | `src/services/transactions.service.ts` | exact (modificar) |
| `src/services/settings.service.ts` | service | CRUD (doc único) | ele mesmo | exact (modificar) |
| `src/services/bank.service.ts` | service | request-response + event-driven | ele mesmo | exact (modificar) |
| `src/types/index.ts` | model | n/a | ele mesmo | exact (modificar) |
| `src/pages/SettingsPage.tsx` (categorias: arquivar, renomear) | component | CRUD | ele mesmo (l.55-96) | exact (modificar) |
| `src/components/reports/OverviewDashboard.tsx` (usar `weeklySpend` do núcleo) | component | transform | ele mesmo (l.111-122) | exact (modificar) |
| `src/lib/firebase.ts` (MOCK sem `auth`) | config | n/a | ele mesmo | exact (modificar) |
| `vite.config.ts`, `tsconfig.app.json`, `package.json` (alias `@shared`, `firebase` 13) | config | n/a | eles mesmos | exact (modificar) |

### Regras, índices, deploy, testes de raiz (FUND-03, FUND-07)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `firestore.rules` (reescrever) | config (security) | request-response | `firestore.rules` (10 linhas, aberta) + Code Examples do RESEARCH | no analog funcional |
| `firestore.rules.legacy` (cópia exata do atual) | config | n/a | `firestore.rules` | exact |
| `firestore.indexes.json` (acrescentar índices com `ownerId`) | config | n/a | `firestore.indexes.json` | exact |
| `test/rules/*.test.js` | test | request-response (emulador) | `server/test/classify.test.js` (estilo) + RESEARCH "Teste de regras" | partial |
| `test/static/*.test.js` | test | file-I/O (grep) | `server/test/classify.test.js` (estilo) | partial |
| `Dockerfile` + `.dockerignore` (raiz) | config | n/a | nenhum | no analog |
| `.gitignore` (raiz) | config | n/a | `server/.gitignore` | partial |
| `CLAUDE.md`, `.claude/CLAUDE.md`, `README.md` (docs do login) | doc | n/a | eles mesmos | exact |

## Pattern Assignments

### `shared/core/classify.js` (utility, transform) e `shared/core/classify.test.js`

**Analog:** `server/src/classify.js` e `server/test/classify.test.js` (mover com `git mv`, depois ajustar).

**Cabeçalho/estilo** (`server/src/classify.js` l.1-14): comentário de propósito em pt-BR, sem imports de pacote, `export function`, constantes `DAY_MS`.
```javascript
// Regras puras (sem I/O) que transformam uma transação da Pluggy em um
// lançamento do site e decidem se ela entra direto ou vai para revisão.

const DAY_MS = 24 * 60 * 60 * 1000
export const DUPLICATE_WINDOW_DAYS = 3

export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
```

**Relógio já injetável** (l.119): manter o padrão `now = new Date()` somente como default do parâmetro; o núcleo novo (`ledger`, `time`) NÃO deve ter `new Date()` interno nem default (RESEARCH Pattern 4).
```javascript
export function classify(tx, { accountType, hasCreditCard, categoryNames = [], now = new Date() }) {
```

**Mudança obrigatória em `mapCategory`** (l.84-96, D-09): hoje devolve o nome; deve devolver `{ id, name }` ignorando arquivadas e com fallback `outros`.
```javascript
export function mapCategory(pluggyCategoryNames, appCategories) {
  const available = new Map(appCategories.map((c) => [normalize(c), c]))
  const fallback = available.get('outros') ?? appCategories[0] ?? 'Outros'
  for (const name of pluggyCategoryNames) {
    const n = normalize(name)
    if (!n) continue
    for (const [pattern, target] of CATEGORY_RULES) {
      if (pattern.test(n)) return available.get(normalize(target)) ?? fallback
    }
  }
  return fallback
}
```
Os alvos de `CATEGORY_RULES` (l.71-82: `'Salario'`, `'Alimentacao'`...) coincidem com os nomes em `DEFAULT_CATEGORIES` (`src/types/index.ts` l.85-97), que geram os slugs padrão (`salario`, `alimentacao`...). Manter as regras; trocar o retorno.

**Teste** (`server/test/classify.test.js` l.1-16): estrutura a copiar para todos os `*.test.js`.
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, findDuplicate, mapCategory, toLocalDate } from '../src/classify.js'

const now = new Date('2026-11-09T15:00:00Z')
const tx = (over) => ({ id: 't1', date: '2026-11-05T00:00:00.000Z', description: 'Mercado',
  type: 'DEBIT', amount: -50.5, status: 'POSTED', ...over })
```
Ao mover: trocar o import para `./classify.js`; o `import { cleanDescription }` solto no meio do arquivo (l.81) deve subir para o topo; o caso `mapCategory` (l.72-79) passa a afirmar `{ id, name }`. Os 12 casos existentes são os testes de caracterização que garantem "mesmos números" (FUND-06). O teste de fuso (l.18-21) já usa `timeZone: 'America/Sao_Paulo'`; rodar a suíte também com `TZ=UTC` e `TZ=Asia/Tokyo`.

---

### `shared/core/time.js` (utility, transform)

**Analog:** `server/src/classify.js` `toLocalDate` (l.60-68), único trecho do repo que lida com fuso/meia-noite UTC; e o cálculo ingênuo que será substituído em `server/src/index.js` l.78-82.

**Antipadrão a substituir** (`server/src/index.js` l.78-82, depende de `-3h` manual e do fuso do host):
```javascript
const now = new Date()
const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
const importFrom = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), 1, 3))
```
Em `app.js` isto vira `monthRange(now).start` (relógio injetado).

**Código a copiar:** não há analog funcional de `Intl.DateTimeFormat`; usar o bloco "Mês no fuso de São Paulo" do RESEARCH.md (Code Examples, l.471-488: `zonedParts`, `zonedTimeToInstant`, `monthRange`), com JSDoc `@param` em todos os parâmetros e `// @ts-check` na primeira linha (o `tsc` acusa TS7006 sem tipos).

---

### `shared/core/ledger.js` (utility, transform)

**Analog 1:** `src/services/transactions.service.ts` `getAccumulatedBalance` (l.162-192): a regra de negócio a extrair é "entrada soma, saída subtrai, até o fim do mês".
```typescript
return snapshot.docs.reduce((acc, doc) => {
  const data = doc.data()
  const txDate = data.date.toDate()
  if (txDate > end) return acc
  return data.type === 'entrada' ? acc + data.amount : acc - data.amount
}, 0)
```
O service continua fazendo o I/O (query + `toDate()`); só o `reduce` vai para `accumulatedBalance(list, untilInstant)` no núcleo, em centavos inteiros (`Math.round(x*100)`) devolvendo reais.

**Analog 2:** `src/components/reports/OverviewDashboard.tsx` l.111-122 (gasto semanal):
```typescript
const monthStart = startOfMonth(selectedMonth)
const monthEnd = endOfMonth(selectedMonth)
const today = new Date()
const referenceDate = today < monthStart ? monthStart : today > monthEnd ? monthEnd : today
const daysRemaining = differenceInCalendarDays(monthEnd, referenceDate) + 1
const weeksRemaining = Math.ceil(daysRemaining / 7)
const saldoMensal = transactions.reduce(
  (acc, t) => (t.type === 'entrada' ? acc + t.amount : acc - t.amount), 0)
const maxWeeklySpend = saldoMensal / weeksRemaining
```
`weeklySpend({ transactions, now, month })` deve reproduzir exatamente `daysRemaining + 1`, `Math.ceil(daysRemaining / 7)` e `saldoMensal / weeksRemaining` (testar primeiro a caracterização com os mesmos números), mas com `now` injetado e dias no fuso de São Paulo. O componente passa a importar `@shared/core/ledger.js`.

**Mesmo reduce duplicado em** `src/hooks/useTransactions.ts` l.53-63 (`totals`) e `OverviewDashboard.tsx` l.59-64: candidatos a `monthTotals`.

---

### `shared/core/categories.js` (utility, transform)

**Analog:** `server/src/classify.js` `normalize` (l.7-14) e `mapCategory` (l.84-96); lista padrão em `src/types/index.ts` l.85-97.

Reusar `normalize` (importar de `./classify.js`, caminho relativo, nunca pacote) para o slug: `normalize(name).replace(/[^a-z0-9]+/g, '-')` + aparar `-`; colisão ganha sufixo `-2`, `-3` (RESEARCH Pattern 5). Funções: `slugify`, `buildCategoryDefs(names, existing)`, `resolveCategoryId(text, defs)` (casa por `normalize`), `categoryDisplayName(tx, defs)` (por `categoryId`, cai no texto `category`). Entrada padrão a derivar:
```typescript
// src/types/index.ts l.85-97
export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Alimentacao', isDefault: true, color: '#f97316' },
  ...
  { name: 'Outros', isDefault: true, color: '#64748b' },
]
```
Nota: `shared/` não pode importar `src/types`; duplicar apenas os 11 nomes/cores como constante em `categories.js` e fazer o cliente consumir de lá (zero cópia), ou manter `DEFAULT_CATEGORIES` em `src/types` e passá-la por parâmetro (decisão do planner).

---

### `shared/package.json` (config)

**Analog:** `server/package.json` l.5 (`"type": "module"`). Conteúdo: `{ "type": "module" }` e nada mais (RESEARCH Pitfall 5).

---

### `server/src/app.js` (controller/middleware, request-response)

**Analog:** `server/src/index.js` l.28-130 (extração quase literal para uma factory testável).

**Imports** (`index.js` l.1-7; em `app.js` sobram `express`, `cors` e o sync; remover `timingSafeEqual`):
```javascript
import express from 'express'
import cors from 'cors'
import { cleanExistingDescriptions, syncAll, syncConnection } from './sync.js'
```

**Wrapper de erros** (`index.js` l.49-53) copiar sem mudança, é o padrão do projeto (loga só `err.message`, atende V7 do ASVS):
```javascript
const handle = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(`[api] ${req.method} ${req.path}:`, err?.message ?? err)
    res.status(500).json({ error: err?.message ?? 'Erro interno' })
  })
```

**Validação de entrada** (`index.js` l.59-60, 70-73): manter `PEOPLE = ['ele','ela']` e as respostas 400 `'Pessoa invalida'` / `'Dados invalidos'`.
```javascript
const { person } = req.body ?? {}
if (!PEOPLE.includes(person)) return res.status(400).json({ error: 'Pessoa invalida' })
```

**Auth a SUBSTITUIR** (`index.js` l.40-47: gate `x-api-key` com `timingSafeEqual`). Trocar pelo middleware do RESEARCH (Code Examples l.441-454) montado em `app.use('/api', ...)` no mesmo ponto, mais a checagem de `Origin` antes dele; mensagens no mesmo tom (`'Nao autorizado'` 401, `'Sem acesso'` 403):
```javascript
app.use('/api', (req, res, next) => {            // l.40-47 atual: remover
  const given = Buffer.from(String(req.get('x-api-key') ?? ''))
  ...
```
```javascript
// novo (RESEARCH, verificado com Auth emulator)
export const requireOwner = (verify) => async (req, res, next) => {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')
  if (!m) return res.status(401).json({ error: 'Nao autorizado' })
  let decoded
  try { decoded = await verify(m[1]) } catch { return res.status(401).json({ error: 'Nao autorizado' }) }
  if (typeof decoded.hid !== 'string' || !decoded.hid) return res.status(403).json({ error: 'Sem acesso' })
  req.owner = { uid: decoded.uid, hid: decoded.hid, person: decoded.person }
  next()
}
```
`createApp({ verifyToken, db, pluggy, origins })` recebe `verifyToken` injetado (`(t) => getAuth().verifyIdToken(t)` em produção, fake nos testes).

**CORS** (`index.js` l.29-35): hoje `origin: origins.length ? origins : true` reflete qualquer origem. Novo: `origins` obrigatória (falhar na subida se vazia) e responder 403 quando `Origin` presente fora da lista.

**Pontos de dono por endpoint** (modificar a partir do código atual):
- `POST /api/connections` (l.75-94): gravar `ownerId: req.owner.hid` no `ref.set` (l.83-91) e, quando `existing.exists`, responder 403 se `existing.data().ownerId !== req.owner.hid` (hoje só confere `person`, l.92-94 com 409). Substituir `importFrom` (l.78-82) por `monthRange` do núcleo.
- `DELETE /api/connections/:itemId` (l.102-115): hoje só checa `exists` (l.107); carregar o doc e exigir `ownerId === req.owner.hid` (IDOR).
```javascript
const ref = db.collection('bankConnections').doc(itemId)
if (!(await ref.get()).exists) return res.status(404).json({ error: 'Conexao nao encontrada' })
```
- `POST /api/sync` (l.125-130): `syncAll(db, pluggy)` sincroniza tudo; filtrar por `hid` (novo parâmetro) quando vem de `/api/sync`, mantendo o agendador sincronizando todos.
- `/api/maintenance/clean-descriptions` (l.118-123): filtrar `where('ownerId','==',hid)` ou remover a rota.
- `ownerId` nunca do corpo; `person` do corpo continua aceito e validado (D-05).

---

### `server/src/index.js` (config, bootstrap)

**Analog:** o próprio arquivo, l.1-26 e l.132-143 (permanecem; o miolo vai para `app.js`).

**Padrão de env obrigatória** (l.9-16) copiar para qualquer nova variável (`ALLOWED_ORIGINS`):
```javascript
function required(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`)
    process.exit(1)
  }
  return value
}
```
**Remover** `const API_KEY = required('APP_API_KEY')` (l.18) e o import de `timingSafeEqual` (l.3). **Manter** (l.24-26):
```javascript
initializeApp({ credential: cert(JSON.parse(required('FIREBASE_SERVICE_ACCOUNT'))) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })
```
**Agendador** (l.135-143) manter; é o único gatilho de `syncAll` sem usuário (sem `req.owner`), então o dono vem sempre de `bankConnections.ownerId`.
```javascript
const hours = Number(process.env.SYNC_INTERVAL_HOURS ?? 6)
if (hours > 0) {
  const run = () => syncAll(db, pluggy).then((r) => console.log('[sync] agendada:', JSON.stringify(r)))
    .catch((err) => console.error('[sync] agendada falhou:', err?.message ?? err))
  setTimeout(run, 30_000)
  setInterval(run, hours * 60 * 60 * 1000)
}
```
Há um `server/.env.example` rastreado: atualizar (remover `APP_API_KEY`, acrescentar `ALLOWED_ORIGINS` obrigatória). Não ler `.env*` reais.

---

### `server/src/sync.js` (service, batch/CRUD) - modificar

**Analog:** o próprio arquivo.

**Imports** (l.1-9): trocar `./classify.js` por `../../shared/core/classify.js` (e `categories.js`). Sem mudança de estilo.
```javascript
import {
  classify, cleanDescription, findDuplicate, mapCategory, normalize, DUPLICATE_WINDOW_DAYS,
} from './classify.js'
```

**Leitura de categorias** (l.42-46): hoje `settings/main.categories` (`string[]`) com `DEFAULT_CATEGORIES = ['Outros']` (l.15); passar a ler `categoryDefs` (fallback a partir de `categories` para dados pré-backfill) e entregar defs a `mapCategory`.
```javascript
async function getAppCategories(db) {
  const snap = await db.collection('settings').doc('main').get()
  const categories = snap.exists ? snap.data().categories : null
  return Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES
}
```

**Dono e escopo da consulta** (l.99-123): `connection.ownerId` vem de `bankConnections`. As consultas do `Promise.all` (l.113-123) são a base do índice `ownerId, person, date DESC`; filtrar por `ownerId` também (admin SDK ignora regras):
```javascript
db.collection(TRANSACTIONS)
  .where('person', '==', person)
  .where('date', '>=', Timestamp.fromDate(windowStart))
  .orderBy('date', 'desc')
```

**Mapa `learned`** (l.126-136): guarda o nome (`d.category`); passa a guardar `categoryId` (D-09).
```javascript
if (key && !learned.has(key)) learned.set(key, d.category)
...
const category =
  learned.get(normalize(entry.description)) ?? mapCategory(categoryNames, appCategories)
```

**Gravações** (l.174-192 `IMPORTS` e l.196-209 `TRANSACTIONS`): ambos `batch.set` ganham `ownerId` e `categoryId`, mantendo `category` (texto) como cópia:
```javascript
batch.set(db.collection(TRANSACTIONS).doc(transactionId), {
  person, type: entry.type, amount: entry.amount, description: entry.description,
  category, date, createdAt: Timestamp.now(), source: 'bank', ...
```
Padrão de lote a manter (l.214-219): commit a cada 400 ops.
```javascript
if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0 }
```

**`cleanExistingDescriptions`** (l.60-97): varre `IMPORTS` e `TRANSACTIONS` inteiras; receber `hid` e filtrar. Também é o analog do backfill (ver abaixo).

**`syncAll`** (l.248-265): `running` único; aceitar filtro opcional de `hid` sem quebrar o reaproveitamento da execução em curso (cuidado: chamada filtrada não pode reaproveitar `running` de outra chamada de outro dono; o planner deve tratar).

---

### `server/scripts/backfill.js` (admin script, batch)

**Analog:** `server/src/sync.js` `cleanExistingDescriptions` (l.58-97): operação de manutenção idempotente que só toca docs que precisam, varrendo coleções com `.get()` e escrevendo em lotes.
```javascript
// Idempotente; não mexe no nome de lançamentos que você editou no site.
const imports = await db.collection(IMPORTS).get()
for (const doc of imports.docs) {
  const d = doc.data()
  ...
  if (d.description === clean && d.originalDescription === raw) continue   // idempotente
  batch.update(doc.ref, { description: clean, originalDescription: raw })
  ops++
  if (ops >= 400) await flush()
}
```
Diferenças a aplicar (RESEARCH "Claims e backfill idempotente"): trocar `db.batch()` manual por `db.bulkWriter()`; `--dry-run` por padrão e `--apply` explícito; só preencher se `ownerId` ausente (`if (d.get('ownerId')) continue`); nunca tocar `createdAt`/`description`; enumerar `db.listCollections()` e falhar se houver coleção fora das 12 conhecidas (`savings, transactions, events, goals, eventCategories, notes, fixedExpenses, fixedExpensePayments, goalContributions, settings, bankConnections, bankImports`); imprimir contagens por coleção antes/depois; acrescentar `categoryId` (via `categories.js`) em `transactions`, `fixedExpenses`, `bankImports`; criar `categoryDefs` em `settings/main` mantendo `categories: string[]`.

**Inicialização** (copiar de `server/src/index.js` l.24-26, mas apontando para o emulador via `FIRESTORE_EMULATOR_HOST` no ensaio e para credencial local fora do git em produção):
```javascript
initializeApp({ credential: cert(JSON.parse(required('FIREBASE_SERVICE_ACCOUNT'))) })
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })
```
Scripts ficam em `server/scripts/` para resolver `server/node_modules` (RESEARCH).

### `server/scripts/create-users.js`, `export-firestore.js`, `verify.js` (admin scripts)

**Analog:** mesmo `index.js` l.1-26 (inicialização e `required`) e `sync.js` l.70, 254 (varredura `collection().get()`). Específicos do RESEARCH: `create-users` usa `getAuth().createUser` + `setCustomUserClaims(uid, { hid, person })` (substitui claims: ler, mesclar, regravar), `--dry-run`/`--apply`, `--hid` e senhas informadas na hora (nunca no código); `export-firestore` serializa `Timestamp` como `{ __ts: ISO }` para JSON fora do git; `verify` conta por coleção e falha (exit 1) se houver doc sem `ownerId`/`categoryId`. Sem analog para `getAuth().createUser` no repo: usar RESEARCH.

---

### `server/test/app.test.js` e `server/test/sync.test.js` (test)

**Analog:** `server/test/classify.test.js` (estilo `node:test`, helpers de fábrica `tx = (over) => ({...})`, `assert.deepEqual([...])`).
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
```
Para `app.test.js`: criar `createApp({ verifyToken: fake, db: fake, pluggy: fake, origins: [...] })` e chamar via `app.listen(0)` + `fetch` (Node 22 global) ou `supertest`-livre; casos: sem token 401, token inválido 401, sem `hid` 403, `Origin` fora da lista 403, DELETE de conexão de outro dono negado, `ownerId` vem do token. Não há analog de teste HTTP no repo. Rodar com `cd server && node --test` (o glob padrão do Node 22 já pega `test/*.test.js`; `server/test/emu/` precisa ser incluído só no comando do emulador).

---

### `src/lib/scope.ts` (utility, módulo de estado)

**Analog:** `src/lib/mockStorage.ts` (módulo pequeno de funções exportadas, sem React, usado por todos os services).
```typescript
export const MOCK = import.meta.env.VITE_USE_EMULATOR === 'true'

export function mList<T>(key: string): T[] { ... }
export function mId(): string { ... }
```
Padrão a seguir: funções nomeadas exportadas, estado de módulo privado. API: `setScope({ hid, person } | null)`, `ownerId(): string` (lança erro claro se sem escopo), `ownerQuery()` helper que devolve `where('ownerId','==',ownerId())`. Este é o "costura" da D-06 e a única fonte de `ownerId` para services.

---

### `src/contexts/AuthContext.tsx` (provider, event-driven) - reescrever

**Analog:** o próprio arquivo.

**Manter** (l.1-8, 44-74): estrutura de imports `firebase/auth`, `mapAuthError`/`toError` (remover só o `case 'auth/email-already-in-use'` e `weak-password`), `useAuth` com o `throw` de uso fora do provider (l.139-145).
```typescript
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

**Remover** (FUND-01): `createUserWithEmailAndPassword` (l.5, 117-123), `signUp` (l.18, 133), `VALID_USERNAME/VALID_PASSWORD` (l.22-23), `LEGACY_AUTH_KEY`/`OLD_LEGACY_AUTH_KEY` (l.24-25), `getStoredLegacyUser` (l.29-42), o ramo do usuário sem `@` em `signIn` (l.98-107), e a limpeza de `localStorage` em `signOut` fica só como migração única (apagar as duas chaves antigas ao subir).

**Núcleo novo**: em `onAuthStateChanged` (l.80-92) ler claims e chamar `setScope()` ANTES de `setUser()` (porque `AreaProvider` dispara `loadSettings()` no efeito de `user`, `AreaContext.tsx` l.35-39):
```typescript
const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) { setScope(null); setUser(null); setLoading(false); return }
  let { claims } = await firebaseUser.getIdTokenResult()
  if (!claims.hid) ({ claims } = await firebaseUser.getIdTokenResult(true))   // 1 retentativa (sessão antiga)
  if (typeof claims.hid !== 'string' || !claims.hid) { await firebaseSignOut(auth); /* "conta sem acesso" */ ... }
  setScope({ hid: claims.hid, person: claims.person })
  setUser({ username: firebaseUser.email ?? '', hid: claims.hid, person: claims.person })
  setLoading(false)
})
```
`LocalUser` (l.10-12) passa a incluir `hid` e `person`. Para `bank.service.ts`, expor também uma função `getIdToken()` (`auth.currentUser?.getIdToken()`).

**Modo MOCK** (RESEARCH Open Question 5): `src/lib/firebase.ts` l.20 exporta `auth: null` em MOCK, então `onAuthStateChanged(null, ...)` quebra. Planner decide: identidade fixa `hid:'mock'`, `person:'ele'` só sob `import.meta.env.DEV`, ou aposentar o MOCK; nunca liberar acesso em build de produção com `VITE_USE_EMULATOR=true`.

---

### `src/components/auth/LoginForm.tsx` (component, request-response) - modificar

**Analog:** o próprio arquivo.

**Manter** (l.1-17, 26-33, 63-76, 91-120): imports (`react-hook-form`, `zodResolver`, `zod`, shadcn `Card/Button/Input/Label`, `lucide-react`), `useForm` com `loginSchema`, markup do card, bloco de erro `rounded-md bg-destructive/10`.
```typescript
const loginSchema = z.object({
  credential: z.string().min(1, 'Usuario obrigatorio'),
  password: z.string().min(1, 'Senha obrigatoria'),
})
```
**Mudar**: `credential` vira `email: z.string().email('E-mail invalido')`; remover `Mode`/`mode`/`toggleMode`/`isSignup`/`signUp` (l.19-24, 38-47, 55-61, 122-131); `autoComplete="username"`/`type="email"` fixos; rótulo "E-mail". Cuidado com `noUnusedLocals` (remover `reset` se sobrar sem uso).

---

### `src/components/auth/ProtectedRoute.tsx` (component, request-response) - modificar

**Analog:** o próprio arquivo (l.10-26). Manter o spinner `Loader2` e o `if (!user) return <LoginForm />`. Acrescentar o estado "conta sem acesso" (mensagem + botão de sair) quando o login Firebase ocorreu mas falta `hid`; o `AuthContext` pode expor `accessError`.
```typescript
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
if (!user) { return <LoginForm /> }
return <>{children}</>
```

---

### `src/contexts/AreaContext.tsx` (provider, CRUD) - modificar

**Analog:** o próprio arquivo.

**Abrir na aba da pessoa** (l.27, hoje fixo `'ele'`) usando `person` do `useAuth()` (D-01, D-05); manter os dois vendo todas as abas:
```typescript
const { user } = useAuth()
const [currentArea, setCurrentArea] = useState<AreaType>('ele')
```
→ inicializar a partir de `user?.person ?? 'ele'` e reagir à troca de usuário no `useEffect` de l.35-39.

**Categorias** (l.69-77 `updateCategories(categories: string[])`): padrão de update com `try/catch` + `console.error` + `throw` a reaproveitar para `updateCategoryDefs(defs)`; também `settings.categories` continua `string[]` derivado das não arquivadas (RESEARCH Pattern 5).
```typescript
const updateCategories = async (categories: string[]) => {
  try {
    await updateSettings({ categories })
    setSettings(prev => ({ ...prev, categories }))
  } catch (error) {
    console.error('Error updating categories:', error)
    throw error
  }
}
```

---

### `src/services/transactions.service.ts` (service, CRUD) - modificar (padrão para os outros 8 services)

**Analog:** o próprio arquivo é o molde; mesma estrutura em `fixedExpenses`, `goals`, `goalContributions`, `savings`, `events`, `eventCategories`, `notes` (todos com `const COL`, ramo `if (MOCK)` primeiro, depois Firestore).

**Imports** (l.1-16): acrescentar `import { ownerId } from '@/lib/scope'`.

**Leituras**: acrescentar `where('ownerId', '==', ownerId())` como primeiro filtro em TODA query (l.43-49, 74-79, 149-152, 181-184). O ramo `MOCK` não muda.
```typescript
const q = query(
  collection(db, COL),
  where('ownerId', '==', ownerId()),        // novo
  where('person', '==', person),
  where('date', '>=', Timestamp.fromDate(start)),
  where('date', '<=', Timestamp.fromDate(end)),
  orderBy('date', 'desc')
)
```
**Escritas**: `addDoc` (l.100-104) grava `ownerId` e `categoryId`; `updateDoc` (l.126-129) não precisa tocar `ownerId` (regras exigem imutável).
```typescript
const docRef = await addDoc(collection(db, COL), {
  ...transaction,
  ownerId: ownerId(),                       // novo
  date: Timestamp.fromDate(transaction.date),
  createdAt: Timestamp.now(),
})
```
**Não existe tratamento de erro** nos services: erros propagam; hooks capturam (`useTransactions.ts` l.17-32: `try/catch/finally` com `setError(err instanceof Error ? err : new Error('Failed to fetch ...'))`). Manter.

**`getAccumulatedBalance`** (l.162-192): o comentário "para evitar necessidade de índice composto" (l.179-180) continua válido: consulta só por igualdade (`ownerId` + `person`), sem composto novo.

**Casos que exigem atenção (consultas e escritas fora do `COL` principal, também precisam de `ownerId`; as regras negam listagem sem o filtro)**:
- `goalContributions.service.ts` l.117-141 (`runTransaction`): o `transaction.set(contributionRef, {...})` (l.130-136) ganha `ownerId`; `deleteContributionsByGoalId` (l.150-159: `where('goalId','==',goalId)`) ganha `where('ownerId','==',ownerId())`.
- `fixedExpenses.service.ts` l.54-70 (add), l.99-101 (`where('fixedExpenseId','==',id)`) e pagamentos (l.116, 142) idem.
- `goals.service.ts` l.39 (`query(collection(db, COL), orderBy('createdAt','desc'))`) e l.66 (`addDoc`).
- `settings.service.ts` (ver abaixo).

---

### `src/services/settings.service.ts` (service, CRUD doc único) - modificar

**Analog:** o próprio arquivo (44 linhas).

**Problema documentado** (l.28-33): `getDoc` de documento inexistente é NEGADO pelas regras (`resource` nulo); o ramo "cria `settings/main` se não existe" quebra sob regras. O backfill garante a existência de `settings/main`; manter o ID fixo `main` (A7) e centralizar em um helper `settingsRef()` (Open Question 4).
```typescript
const docRef = doc(db, 'settings', SETTINGS_DOC_ID)
const docSnap = await getDoc(docRef)
if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Settings
const defaultSettings = { ...DEFAULT_SETTINGS }
await setDoc(docRef, defaultSettings)               // criação precisa gravar ownerId: ownerId()
```
Acrescentar `ownerId` e `categoryDefs` nesse `setDoc`; o `updateDoc` (l.43) não muda.

---

### `src/services/bank.service.ts` (service, request-response + event-driven) - modificar

**Analog:** o próprio arquivo.

**`api()` (l.27-36)**: trocar `x-api-key` por `Authorization: Bearer <idToken>`; remover `API_KEY`/`VITE_BANK_API_KEY` (l.23, 25, 28) e ajustar `BANK_ENABLED` para depender só de `API_URL`.
```typescript
const res = await fetch(`${API_URL}${path}`, {
  ...init,
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, ...init.headers },
})
const body = await res.json().catch(() => ({}))
if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`)
```
→ `const token = await auth.currentUser?.getIdToken()` e `Authorization: \`Bearer ${token}\``.

**Único listener `onSnapshot` do cliente** (l.38-55): `query(collection(db, 'bankConnections'))` sem filtro; precisa `where('ownerId', '==', ownerId())` (RESEARCH Pattern 1, ponto crítico; o CONTEXT diz que não há `onSnapshot`, o que não é inteiramente verdade).

---

### `src/types/index.ts` (model) - modificar

**Analog:** o próprio arquivo.
- `Transaction.category: string` (l.10), `FixedExpense.category` (l.21): acrescentar `categoryId?: string` e `ownerId?: string`; `category` permanece.
- `Settings.categories: string[]` (l.54): manter; acrescentar `categoryDefs?: CategoryDef[]`.
- Já existe `Category` (l.77-83, `{ id, name, icon?, color?, isDefault }`): reutilizar/estender com `archived?: boolean` em vez de criar um tipo paralelo.
- `AgendaEvent.categoryId?` (l.128) é de **categoria de evento** (`eventCategories`), não de gasto: não confundir o nome com `categoryId` de lançamento (sugestão: manter o nome, documentar).
```typescript
export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  isDefault: boolean
}
```

---

### `src/pages/SettingsPage.tsx` (component, CRUD) - modificar

**Analog:** o próprio arquivo, l.61-96 (`handleAddCategory`, `handleRemoveCategory`).

`handleRemoveCategory` hoje BLOQUEIA a remoção se houver lançamentos (l.75-85, via `getTransactionsByCategory`/`getFixedExpensesByCategory`); D-08 muda para **arquivar** (`archived=true`), sem bloquear e sem apagar. Padrão de validação e mensagens a manter:
```typescript
const trimmed = newCategory.trim()
if (!trimmed) { setCategoryError('Nome da categoria nao pode ser vazio'); return }
const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase())
if (exists) { setCategoryError('Categoria ja existe'); return }
```
Acrescentar renomear mínimo (Open Question 6; critério 4 de sucesso): trocar `name` mantendo `id`. As funções `getTransactionsByCategory`/`getFixedExpensesByCategory` passam a consultar por `categoryId` (e precisam do filtro `ownerId`).

---

### `src/components/reports/OverviewDashboard.tsx` (component, transform) - modificar

**Analog:** o próprio arquivo (l.111-122, ver `ledger.js`). Substituir o bloco local por chamada a `weeklySpend` de `@shared/core/ledger.js`. Dois pontos de agregação por categoria (l.82-87, 97-102) usam `t.category` (nome): usar `categoryDisplayName(tx, defs)` para que renomear não quebre o histórico.

---

### Configs do cliente (`vite.config.ts`, `tsconfig.app.json`, `package.json`)

**`vite.config.ts`** (l.7-12): acrescentar alias no mesmo objeto (`path.resolve` já importado):
```typescript
alias: {
  '@': path.resolve(__dirname, './src'),
  '@shared': path.resolve(__dirname, './shared'),   // novo
},
```
**`tsconfig.app.json`** (l.28-33, l.33): `paths` ganha `"@shared/*": ["./shared/*"]`, `compilerOptions` ganha `"allowJs": true`, `"include": ["src", "shared"]` (RESEARCH, verificado com `tsc -b` + `vite build`). Atenção a `erasableSyntaxOnly`/`verbatimModuleSyntax` já ligados (sem efeito em JS).
**`package.json`** (l.20): `"firebase": "^13.4.0"`; devDependency `@firebase/rules-unit-testing@^6.0.0`; scripts `test:core`, `test:rules`, `test:emu` ao lado de `lint`/`preview` (l.5-12), com glob (`node --test "shared/**/*.test.js"`; passar diretório falha no Node 22). Os scripts `dev:amigo`/`build:amigo` (l.8, 10) **não** são tocados (D-15). Instalação de `firebase@13.4.0` e `firebase-admin@14.5.1` tem veredito SUS (`too-new`): planner insere `checkpoint:human-verify` antes de instalar.

**`server/package.json`** (l.8-10, 15-20): `"engines": { "node": ">=22.23.4" }` (hoje `>=20`), `firebase-admin ^14.5.1` (hoje `^13.0.0`), `pluggy-sdk` opcional `^0.94.3`. O script `"test": "node --test"` (l.13) permanece.

---

### `firestore.rules` (config, request-response) e `firestore.rules.legacy`

**Analog:** `firestore.rules` atual (10 linhas) só serve como arquivo a copiar para `firestore.rules.legacy` ANTES de sobrescrever (rollback D-14):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // App pessoal - autenticacao local no frontend
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
**Código a usar:** bloco "Regras de produção" do RESEARCH (Code Examples l.394-427; 8/8 testes no emulador). Pontos: `isMember()` exige `request.auth.token.hid is string`; `update` exige `request.resource.data.ownerId == resource.data.ownerId`; `bankConnections` e `bankImports` só leitura; default-deny por omissão. Nunca publicar `request.auth != null` como passo intermediário (ROADMAP). Conferir que a lista de coleções cobre as 12 (inclui `settings`).

### `firestore.indexes.json` (config) - modificar

**Analog:** o próprio arquivo (64 linhas, 7 índices). Formato de entrada a copiar (l.3-10):
```json
{
  "collectionGroup": "transactions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "person", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```
Acrescentar, mantendo os 7 antigos, os compostos da tabela "Query & Index Inventory" do RESEARCH com `{ "fieldPath": "ownerId", "order": "ASCENDING" }` primeiro (ex.: `ownerId, person, date DESC`; `ownerId, date DESC`; `ownerId, isActive, dueDay`; `ownerId, person, isActive, dueDay`; `ownerId, createdAt DESC` em `goals`; etc.). Implantar com `firebase deploy --only firestore:indexes` e esperar `READY` antes do Release B; o emulador não cobra índice.

---

### `test/rules/*.test.js` (test, request-response / emulador)

**Analog de estilo:** `server/test/classify.test.js` (`node:test` + `assert/strict`). Corpo: esqueleto do RESEARCH ("Teste de regras", l.430-439) com `initializeTestEnvironment`, `authenticatedContext(uid, { hid, person })`, `assertSucceeds`/`assertFails`. Ler as regras de `firestore.rules` (caminho de raiz) no `before`. Matriz mínima: anônimo, sem claim, outro casal, consulta sem filtro, criação com `ownerId` alheio, troca de `ownerId`, dono OK, coleção desconhecida, `bankConnections`/`bankImports` só leitura, `runTransaction` em `goals`. Rodar: `firebase emulators:exec --only firestore "node --test test/rules/*.test.js"` (JRE 21 no `PATH`).

### `test/static/*.test.js` (test, file-I/O)

**Analog de estilo:** idem. Sem analog funcional: testes que leem `src/**` (`node:fs`) e afirmam ausência de `signUp`, `VITE_APP_`, `financias_legacy_user`, `financias_auth`, `x-api-key`; e que toda `query(` em `src/services/*.service.ts` contém `ownerId`.

---

### `Dockerfile` + `.dockerignore` (raiz)

**Sem analog.** Usar o bloco do RESEARCH (l.497-509, verificado: `node:22.23.5-slim`, `npm ci --omit=dev --prefix server`, `COPY shared shared`, `CMD ["node","server/src/index.js"]`) e `.dockerignore` com `node_modules`, `dist`, `.env*`, `.planning`, `.git`, `.firebase`. Exige passo humano: Root Directory do serviço Railway vazio (Pitfall 7).

### `.gitignore` (raiz)

**Analog parcial:** `server/.gitignore` (contém só `node_modules`). Não existe `.gitignore` na raiz e `node_modules/`, `dist/`, `.env.local`, `.env.amigo` estão versionados em repositório público; higiene com `git rm --cached` é decisão do dono (Open Question 3). Incluir a service account local (`*.serviceAccount.json` ou similar) como regra obrigatória (ASVS V14).

---

## Shared Patterns

### ownerId via `scope()` (cliente)
**Source:** `src/lib/scope.ts` (novo), consumido por `AuthContext.tsx`
**Apply to:** os 10 services (`transactions`, `fixedExpenses` [e pagamentos], `goals`, `goalContributions`, `savings`, `events`, `eventCategories`, `notes`, `settings`, `bank`)
Toda `query(...)` começa com `where('ownerId','==',ownerId())`; todo `addDoc`/`setDoc`/`transaction.set` grava `ownerId: ownerId()`; `updateDoc` parcial nunca inclui `ownerId`. `setScope()` roda antes de `setUser()` no `AuthContext`.

### Ramo MOCK nos services
**Source:** `src/services/transactions.service.ts` l.29-39 e `src/lib/mockStorage.ts`
**Apply to:** todos os services (preservar). O ramo `if (MOCK)` não usa `ownerId` (localStorage); manter como está.
```typescript
if (MOCK) {
  return mList<RawTransaction>(COL).filter(...).map(...).sort(...)
}
```

### Hooks (fetch + refetch após escrever)
**Source:** `src/hooks/useTransactions.ts` l.11-51
**Apply to:** `src/hooks/*` (nenhuma mudança estrutural esperada; dependem dos services). Padrão `{ data, loading, error, add, update, remove, refetch }` com `useCallback` + `useEffect`.

### Erros do servidor
**Source:** `server/src/index.js` l.49-53 (`handle`) e `server/src/sync.js` l.239-244
**Apply to:** todo handler de `app.js` e todos os scripts de admin. Logar só `err.message` com prefixo `[api]`/`[sync]`/`[script]`; nunca registrar token, senha ou service account (ASVS V7).
```javascript
const message = err?.message ?? String(err)
console.error(`[sync] falha no item ${itemId}:`, message)
```

### Env obrigatória e Admin SDK
**Source:** `server/src/index.js` l.9-26
**Apply to:** `index.js`, `scripts/*.js`. `required(name)` + `initializeApp({ credential: cert(JSON.parse(...)) })` + `db.settings({ ignoreUndefinedProperties: true })`.

### Lotes e idempotência
**Source:** `server/src/sync.js` l.60-97 e 214-219 (commit a cada 400 ops; `continue` se nada a mudar)
**Apply to:** `backfill.js` (trocar por `BulkWriter`), `sync.js`, `cleanExistingDescriptions`.

### Núcleo sem dependências, relógio injetado
**Source:** `server/src/classify.js` (`now = new Date()` como parâmetro, l.119) e `server/test/classify.test.js` (`const now = new Date('2026-11-09T15:00:00Z')`, l.5)
**Apply to:** todo `shared/core/*.js`: zero import de pacote (só relativos), `// @ts-check` + JSDoc, sem `new Date()` interno, `TZ` testado em `UTC`/`America/Sao_Paulo`/`Asia/Tokyo`, dinheiro em centavos inteiros.

### Textos de UI e mensagens
**Source:** `LoginForm.tsx`, `AuthContext.tsx` `mapAuthError` (l.44-67), `SettingsPage.tsx` (l.61-96)
**Apply to:** qualquer string nova do cliente: pt-BR sem acento, tom curto (`'Conta sem acesso'`, `'E-mail ou senha incorretos'`).

### Testes (`node:test`)
**Source:** `server/test/classify.test.js` l.1-3
**Apply to:** todos os testes novos (`shared`, `server`, `test/rules`, `test/static`). Glob na linha de comando, nunca diretório.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `firestore.rules` (versão nova) | config (security) | request-response | Só existe a regra aberta; usar RESEARCH Code Examples |
| `test/rules/*.test.js` | test | emulador | Sem testes de regras nem emulador no repo; usar RESEARCH "Teste de regras" |
| `test/static/*.test.js` | test | file-I/O | Sem testes de análise estática |
| `server/test/app.test.js` | test | HTTP | Sem teste HTTP; `index.js` não é testável (inicializa tudo no import) |
| `server/test/emu/*.test.js` | test | emulador Auth+Firestore | Sem teste com emulador |
| `server/scripts/create-users.js` | utility | Auth Admin | Sem uso de `getAuth()` no repo; usar RESEARCH |
| `server/scripts/export-firestore.js` | utility | file-I/O | Sem escrita de arquivos no servidor |
| `shared/core/time.js` (núcleo `Intl`) | utility | transform | Só há `toLocalDate`; usar RESEARCH Code Examples |
| `Dockerfile`, `.dockerignore` | config | n/a | Nenhum Docker/Railway config rastreado; usar RESEARCH |
| `.gitignore` (raiz) | config | n/a | Não existe; só `server/.gitignore` (`node_modules`) |
| `firestore.rules.legacy` | config | n/a | Cópia literal de `firestore.rules` atual (sem lógica) |
| Handlers de custom claims no cliente (`getIdTokenResult`) | provider | n/a | Sem uso de claims hoje; usar RESEARCH Pattern 1 |

## Metadata

**Analog search scope:** `server/src`, `server/test`, `src/{contexts,services,hooks,lib,types,components/auth,components/reports,pages}`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `vite.config.ts`, `tsconfig.app.json`, `package.json`, `server/package.json`
**Files scanned:** ~45 (git ls-files filtrado; `node_modules/` e `dist/` ignorados; `.env*` não lidos por regra)
**Pattern extraction date:** 2026-11-17
