# Phase 3: Limites, "Pode gastar" e Central - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 78 (novos e modificados; componentes visuais agrupados por família quando o análogo é o mesmo)
**Analogs found:** 66 / 78 (12 sem análogo útil, listados em "No Analog Found")

Todos os caminhos de análogo abaixo foram conferidos com `git ls-files` (todos rastreados; nenhum espelho gitignored). As referências de linha são do estado atual do repositório em 2026-11-18.

## File Classification

### Núcleo puro (`shared/core/`)

| Arquivo novo/modificado | Role | Data Flow | Análogo mais próximo | Match |
|---|---|---|---|---|
| `shared/core/cycle.js` | utility | transform | `shared/core/time.js` (`monthRangeOf`, `zonedParts`, `zonedTimeToInstant`) | exact |
| `shared/core/cycle.test.js` | test | transform | `shared/core/time.test.js` | exact |
| `shared/core/limits.js` | utility | transform | `shared/core/categories.js` (imutável, histórico por id) + `ledger.js` (centavos) | role-match |
| `shared/core/limits.test.js` | test | transform | `shared/core/bankStatus.test.js` (tabelar com fronteiras) | exact |
| `shared/core/budget.js` | utility | transform | `shared/core/ledger.js` (`weeklySpend`, `monthTotals`, centavos inteiros) | exact |
| `shared/core/budget.test.js` | test | transform | `shared/core/bankStatus.test.js` | exact |
| `shared/core/alerts.js` | utility | transform | `shared/core/categories.js` (`slugify`, ids determinísticos) | role-match |
| `shared/core/alerts.test.js` | test | transform | `shared/core/bankStatus.test.js` | exact |
| `shared/core/bankStatus.js` (+`shouldSuppressVerdict`) | utility | transform | o próprio arquivo (`describeBankFreshness`, linhas 41-96) | exact |
| `shared/core/bankStatus.test.js` (estender) | test | transform | o próprio arquivo, linhas 1-60 | exact |
| `shared/core/categories.js` (`icon`, `kind`, `addCategory(extra)`) | utility | transform | o próprio arquivo (`addCategory`, linhas 111-123) | exact |
| `shared/core/categories.test.js` (estender) | test | transform | o próprio arquivo | exact |
| `shared/core/purity.test.js` (listas `ALL`/`CLOCK_FREE`) | test | transform | o próprio arquivo, linhas 10-11 | exact |

### Dados (serviços, hooks, contexto, tipos)

| Arquivo | Role | Data Flow | Análogo | Match |
|---|---|---|---|---|
| `src/services/limitAlerts.service.ts` (novo) | service | CRUD (create-if-absent) | `src/services/savings.service.ts` + `settings.service.ts` (`getDoc`/`setDoc`) | role-match |
| `src/services/settings.service.ts` (`updatePersonConfig`) | service | CRUD (update parcial) | o próprio arquivo, `updateSettings` (linhas 42-50) | exact |
| `src/services/transactions.service.ts` (`getTransactionsInRange`) | service | request-response (consulta por intervalo) | o próprio arquivo, `getTransactions` (linhas 28-61) | exact |
| `src/services/fixedExpenses.service.ts` (`getPaymentsForMonths`) | service | request-response | o próprio arquivo, `getPaymentsForMonth` (linhas 113-135) | exact |
| `src/hooks/useCycleBudget.ts` (novo) | hook | request-response | `src/hooks/useTransactions.ts` | exact |
| `src/hooks/useLimitAlerts.ts` (novo) | hook | CRUD | `src/hooks/useEventCategories.ts` | exact |
| `src/hooks/useReadOnly.ts` (novo) | hook | derivação | `useArea()` em `src/contexts/AreaContext.tsx` (linhas 124-131) | role-match |
| `src/contexts/AreaContext.tsx` (`readOnly`, `personConfig`, tema fixo claro) | provider | event-driven | o próprio arquivo | exact |
| `src/types/index.ts` (`PersonConfig`, `LimitEntry`, `LimitAlert`, `CategoryDef.icon/kind`) | model | n/a | o próprio arquivo (`Settings`, `CategoryDef`) | exact |
| `firestore.rules` (`limitAlerts`) | config | n/a | o próprio arquivo, linhas 14-29 | exact |
| `firestore.indexes.json` (+1 índice) | config | n/a | entradas `ownerId`-first existentes (ex.: `notes`, `savings`) | exact |

### Testes estáticos e de regras

| Arquivo | Role | Data Flow | Análogo | Match |
|---|---|---|---|---|
| `test/rules/matrix.test.js` (estender `CLIENT_COLS`, get de inexistente) | test | request-response | o próprio arquivo, linhas 32-43 e 237-249 | exact |
| `test/static/firestore-config.test.js` (18→19, 11→12, `NEW_INDEXES`) | test | n/a | o próprio arquivo, linhas 15-75 | exact |
| `test/static/owner-queries.test.js` (`all.length` 10→11) | test | n/a | o próprio arquivo, linha 163 | exact |
| `test/static/phase3-*.test.js` (rotas, dock, emoji, fontes, âncoras, lang, tema) | test | n/a | `test/static/bank-ui-copy.test.js` | exact |

### Casca, primitivos de UI e tema

| Arquivo | Role | Data Flow | Análogo | Match |
|---|---|---|---|---|
| `src/components/layout/AppShell.tsx` (substitui `MainLayout`) | component | request-response | `src/components/layout/MainLayout.tsx` | exact |
| `src/components/layout/TopBar.tsx` | component | request-response | `src/components/layout/Header.tsx` | role-match |
| `src/components/layout/NavRail.tsx` + `LaunchFab` | component | request-response | `src/components/layout/BottomNav.tsx` | role-match |
| `src/components/layout/CycleSelector.tsx` | component | event-driven | `src/components/shared/MonthSelector.tsx` | role-match |
| `src/components/layout/ProfileSwitcher.tsx` | component | event-driven | `src/components/shared/AreaSelector.tsx` + click-outside do `NotificationsBell.tsx` | role-match |
| `src/components/layout/AlertsBell.tsx` (reescrita de `NotificationsBell.tsx`) | component | event-driven | `src/components/layout/NotificationsBell.tsx` | exact |
| `src/components/ui/sheet.tsx` | component | event-driven | `src/components/ui/dialog.tsx` (portal, trava de rolagem, contexto) | role-match |
| `src/components/ui/progress.tsx` (prop `tone`, `role`) | component | n/a | o próprio arquivo | exact |
| `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `dialog.tsx` (tokens, alturas, a11y) | component | n/a | os próprios arquivos | exact |
| `src/components/ui/switch.tsx` | component | event-driven | toggle manual em `SettingsPage.tsx` linhas 295-309 | role-match |
| `src/components/ui/notice.tsx` | component | n/a | `src/components/ui/alert.tsx` | exact |
| `src/components/ui/chip.tsx`, `icon-circle.tsx` | component | n/a | `src/components/ui/badge.tsx` (cva) | role-match |
| `src/components/ui/segmented-control.tsx` | component | event-driven | `src/components/ui/tabs.tsx` | role-match |
| `src/components/ui/toast.tsx` (`Toaster`/`useToast`) | provider | pub-sub | `AreaContext` (context + hook com throw) | role-match |
| `src/components/ui/money-keypad.tsx`, `collapsible.tsx` | component | event-driven | nenhum | none |
| `src/index.css`, `index.html`, `src/main.tsx` (tokens, fontes, lang, tema claro) | config | n/a | os próprios arquivos | exact |

### Telas e componentes de domínio

| Arquivo | Role | Data Flow | Análogo | Match |
|---|---|---|---|---|
| `src/pages/DashboardPage.tsx` (reescrita, Home) | page | request-response | o próprio arquivo (estrutura, `useArea`, `BankStatusNotice`) | role-match |
| `src/pages/CouplePage.tsx` (conteúdo antigo do Dashboard) | page | request-response | `src/pages/DashboardPage.tsx` linhas 22-181 (move, não reescreve) | exact |
| `src/pages/LimitsPage.tsx` | page | request-response | `src/pages/DashboardPage.tsx` + `FixedExpensesPage.tsx` | role-match |
| `src/pages/SettingsPage.tsx` (6 cartões) | page | CRUD | o próprio arquivo (handlers 66-126, cartões 190-531) | exact |
| `src/App.tsx` (rotas `/limites`, `/casal`, `AppShell`) | config | request-response | o próprio arquivo, linhas 15-30 | exact |
| `src/components/dashboard/StaleNotice.tsx` (reescrita de `BankStatusNotice.tsx`) | component | request-response | `src/components/dashboard/BankStatusNotice.tsx` | exact |
| `src/components/dashboard/ReadOnlyBanner.tsx` | component | n/a | `BankStatusNotice.tsx` (formato `Alert`) | role-match |
| `src/components/dashboard/{ArcGauge,RhythmPill,ShortcutRow,MonthInOneCard,CentralSummaryCard,FixedMonthCard}.tsx` | component | request-response | `DashboardPage.tsx` (cartões, `formatCurrency`); `ArcGauge` sem análogo | role-match |
| `src/components/limits/LimitRow.tsx` / `LimitsList` | component | request-response | `src/components/ui/progress.tsx` + `Collapsible` novo | role-match |
| `src/components/launcher/{LaunchSheet,CategoryPicker}.tsx` | component | CRUD | `src/components/transactions/TransactionForm.tsx` + `savings/SavingsForm.tsx` | role-match |
| `src/components/settings/{SettingsCard,FieldRow,CycleIncomeCard,CategoriesCard,CategoryEditorSheet,IconPicker,DayPicker,AppearanceCard,NotificationsCard,AccountsSkeletonCard}.tsx` | component | CRUD | `SettingsPage.tsx` (blocos de `Card` existentes) | role-match |

---

## Pattern Assignments

### `shared/core/cycle.js` (utility, transform)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/shared/core/time.js`

**Cabeçalho e convenções** (linhas 1-6): `// @ts-check`, comentário de módulo em ASCII sem acento (o núcleo inteiro escreve sem acento; a UI usa acento), sem dependências, sem relógio implícito (o "agora" é argumento).

```js
// @ts-check
// Tempo em America/Sao_Paulo, sem dependencias e sem relogio implicito: o
// "agora" e sempre passado como argumento (D-11). ...
export const DEFAULT_TZ = 'America/Sao_Paulo'
```

**Primitivos a importar** (assinaturas reais, `time.js` 14, 51, 65):

```js
export function zonedParts(date, tz = DEFAULT_TZ)                           // -> {year, month, day, hour, minute, second}
export function zonedTimeToInstant(y, m, d, h = 0, mi = 0, s = 0, tz = DEFAULT_TZ) // -> Date
export function monthRangeOf(year, month, tz = DEFAULT_TZ)                  // -> {start, end, year, month, daysInMonth}
```

**Padrão de fronteira de período** (`monthRangeOf`, linhas 65-73): `end` é `nextStart - 1 ms`, `daysInMonth` vem de `Date.UTC(year, month, 0).getUTCDate()` (aritmética de data de calendário, imune a horário de verão). `cycleOf` deve usar exatamente a mesma forma:

```js
const nextStart = zonedTimeToInstant(nextYear, nextMonth, 1, 0, 0, 0, tz)
const end = new Date(nextStart.getTime() - 1)
const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
```

**Core pattern:** o rascunho completo de `cycleOf`/`shiftCycle` está em `03-RESEARCH.md` Pattern 1 (linhas 253-281). Copiar de lá; só reaproveita `time.js`. Com `salaryDay = 1` o resultado deve coincidir com `monthRangeOf` (teste de regressão).

**Pureza (Pitfall 3):** `new Date(<argumento>)` é permitido (o próprio `time.js` linha 70 usa); `new Date()` sem argumento e `Date.now()` quebram `purity.test.js`. Só imports relativos (`./time.js`).

---

### `shared/core/limits.js`, `budget.js`, `alerts.js` (utility, transform)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/shared/core/ledger.js` (dinheiro em centavos) e `categories.js` (imutabilidade e ids)

**Imports e typedef** (`ledger.js` 1-8):

```js
// @ts-check
import { DEFAULT_TZ, monthRangeOf, zonedParts } from './time.js'

/** @typedef {{ type: string, amount: number, date: Date }} LedgerTx */
```

**Centavos nas fronteiras** (`ledger.js` 15-26, 33-39): importar `toCents`/`fromCents`, somar inteiros e só converter na saída.

```js
export function toCents(value) { return Math.round(Number(value) * 100) }
function netCents(transactions) {
  let sum = 0
  for (const t of transactions) sum += t.type === 'entrada' ? toCents(t.amount) : -toCents(t.amount)
  return sum
}
```

`budget.js` deve **somar `toCents(t.amount)` de `type === 'saida'`** (nunca `kind` da categoria; ver Anti-Patterns do RESEARCH) e aceitar `tx.transfer === true` fora do dia a dia.

**Resolução de categoria legada** (`categories.js` 50-54): usar `resolveCategoryId(tx.category, defs)` quando `tx.categoryId` faltar (Pitfall 10).

```js
export function resolveCategoryId(text, defs) {
  const key = normalize(text)
  if (!key) return null
  return defs.find((d) => normalize(d.name) === key)?.id ?? null
}
```

**Imutabilidade para `setLimit`** (`categories.js` 125-140, `renameCategory`): função devolve array/objeto novo, `throw new Error('...')` em pt-BR sem acento para entrada inválida (a UI mostra a mensagem):

```js
export function renameCategory(defs, id, newName) {
  const trimmed = requireName(newName)
  if (!defs.some((d) => d.id === id)) throw new Error('Categoria nao encontrada')
  ...
  return defs.map((d) => (d.id === id ? { ...d, name: trimmed } : d))
}
```

**ID determinístico** (`alerts.js`): mesma ideia de `slugify` (`categories.js` 32-42), id só `a-z0-9-` mais separador `__`. Rascunhos prontos de `limitState`, `safeToSpend`, `rhythm`, `thresholdsToFire`, `alertId` estão em `03-RESEARCH.md` Patterns 2-3 e "Code Examples" (linhas 285-478). Não usar ponto flutuante nas fronteiras (`spent*100 >= limit*80`).

**Aviso ao planejador:** `ledger.js` linha 3-4 diz que "orcamento, limites e alertas nascem na Fase 3 e nao entram aqui". Respeitar: os módulos novos ficam em arquivos próprios; **não** editar `ledger.js` nem `classify.js` (D-05 da Fase 2). `weeklySpend` fica intacto (usado por `OverviewDashboard`).

---

### `shared/core/bankStatus.js` (+ `shouldSuppressVerdict`) (utility, transform)

**Analog:** o próprio `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/shared/core/bankStatus.js`

Acrescentar uma função pura ao final, no mesmo estilo (JSDoc + `@ts-check`, sem relógio). Os campos que ela lê já são devolvidos por `describeBankFreshness` (linha 95): `{ updatedAt, updatedSource, ageHours, stale, consent, daysToExpire, needsReconnect, level }`. Regra e código em `03-RESEARCH.md` linhas 482-489. `consent === 'expiring'` sozinho **não** suprime.

---

### `shared/core/categories.js` (estender `icon`, `kind`) (utility, transform)

**Analog:** o próprio arquivo

**Typedef atual** (linha 8) e `addCategory` (111-123):

```js
/** @typedef {{ id: string, name: string, color?: string, archived?: boolean }} CategoryDef */

export function addCategory(defs, name, color) {
  const trimmed = requireName(name)
  const key = normalize(trimmed)
  const same = defs.find((d) => normalize(d.name) === key)
  if (same) {
    if (!same.archived) throw new Error('Categoria ja existe')
    return defs.map((d) => (d === same ? { ...d, archived: false } : d))
  }
  /** @type {CategoryDef} */
  const def = { id: slugify(trimmed, defs.map((d) => d.id)), name: trimmed }
  if (color) def.color = color
  return [...defs, def]
}
```

Estender: typedef ganha `icon?: string` e `kind?: 'gasto' | 'receita'`; `addCategory(defs, name, color, extra = {})` mantém a assinatura atual compatível (quarto parâmetro opcional) e só copia `icon`/`kind` se vierem. `DEFAULT_CATEGORY_DEFS` (11-23) ganha `icon` e `kind` por id estável conforme UI-SPEC S5 (`alimentacao`→`utensils`, ..., `salario`/`investimentos` com `kind: 'receita'`; `investimentos` pode ter saída, então `kind` só filtra listas de escolha). **Nunca** alterar `id` nem `name` dos padrões (nomes sem acento são histórico). `src/types/index.ts` linha 5 importa esse array e linha 99-103 deriva `DEFAULT_CATEGORIES`; conferir `test/static/category-ids.test.js` T1 antes de mudar a forma.

---

### `shared/core/*.test.js` novos e estendidos (test, transform)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/shared/core/time.test.js` (instantes em SP) e `bankStatus.test.js` (tabelas e fronteiras)

**Imports e estilo** (`time.test.js` 1-10, `bankStatus.test.js` 1-9):

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthRange, monthRangeOf } from './time.js'

const NOW = new Date('2026-11-17T15:00:00Z')
const H = 3600 * 1000
const ago = (ms) => new Date(NOW.getTime() - ms)
```

**Padrão de caso de fuso** (`time.test.js` 16-23): nome do teste descreve o instante UTC e o efeito em SP; asserta `toISOString()` exato:

```js
test('monthRange: 2026-11-01T02:30Z ainda e 31/10 em Sao Paulo', () => {
  const r = monthRange(new Date('2026-11-01T02:30:00Z'))
  assert.equal(r.start.toISOString(), '2026-10-01T03:00:00.000Z')
  assert.equal(r.end.toISOString(), '2026-11-01T02:59:59.999Z')
})
```

**Independência de fuso do host** (`time.test.js` 53-57) é obrigatória para `cycle.test.js`; roda por `npm run test:core:tz` (package.json: `TZ=UTC` e `TZ=Asia/Tokyo`). Casos mínimos listados em `03-RESEARCH.md` linhas 576-586 (dia 1 = mês-calendário, dia 31 em fev, virada dez→jan, `02:30Z` ainda no ciclo anterior, `shiftCycle` ida e volta; limites 79,99/80,00/100,00/100,01; 50→130 grava 80 silent + 100).

---

### `shared/core/purity.test.js` (test, transform)

**Analog:** o próprio arquivo, linhas 10-11. **Não descobre arquivos sozinho**:

```js
const ALL = ['time.js', 'classify.js', 'categories.js', 'ledger.js', 'bankStatus.js']
const CLOCK_FREE = ['time.js', 'categories.js', 'ledger.js', 'bankStatus.js']
```

Acrescentar `'cycle.js', 'limits.js', 'budget.js', 'alerts.js'` às **duas** listas na mesma tarefa que cria os arquivos. Os testes geram os casos por laço (linhas 13-38): nada mais a mudar.

---

### `src/services/settings.service.ts` (`updatePersonConfig`) (service, CRUD parcial)

**Analog:** o próprio `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/services/settings.service.ts`

**Imports e referência única** (linhas 1-18) e **`updateSettings` com ramo MOCK** (42-50):

```ts
const DOC_KEY = 'settings::main'
const settingsRef = () => doc(db, 'settings', SETTINGS_DOC_ID)

export async function updateSettings(settings: Partial<Omit<Settings, 'id'>>): Promise<void> {
  if (MOCK) {
    const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
    mSetDoc(DOC_KEY, { ...existing, ...settings })
    return
  }
  await updateDoc(settingsRef(), settings)
}
```

**Para `updatePersonConfig(person, cfg)`:** produção = `updateDoc(settingsRef(), { ['personConfig.' + person]: cfg })` (Pattern 6; o `updateDoc` não pode mencionar `ownerId`, regra de `owner-queries.test.js` linha 128-133). Ramo MOCK: `mSetDoc` é raso, então montar `{ ...existing, personConfig: { ...existing.personConfig, [person]: cfg } }` à mão. Se o `updateDoc` falhar com documento sem o mapa pai (A3), usar `setDoc(..., { merge: true })` com `ownerId: ownerId()` (a guarda exige `ownerId: ownerId()` em todo `setDoc`) e validar no emulador.

**Leitura tolerante** (linha 36): `{ id, ...DEFAULT_SETTINGS, ...docSnap.data() }` é raso, então `personConfig` pode vir `undefined`; o núcleo e o `AreaContext` aplicam defaults (`salaryDay: 1`, `expectedIncomeCents: 0`, `limits: {}`).

---

### `src/services/transactions.service.ts` (`getTransactionsInRange`) (service, request-response)

**Analog:** o próprio arquivo, `getTransactions` (linhas 28-61)

**Consulta com escopo de dono** (44-60), a copiar trocando `startOfMonth/endOfMonth` pelos limites do ciclo (Anti-Pattern: não usar date-fns para o ciclo):

```ts
const q = query(
  collection(db, COL),
  ...ownerScope(),
  where('person', '==', person),
  where('date', '>=', Timestamp.fromDate(start)),
  where('date', '<=', Timestamp.fromDate(end)),
  orderBy('date', 'desc')
)
const snapshot = await getDocs(q)
return snapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
  date: doc.data().date.toDate(),
  createdAt: doc.data().createdAt.toDate(),
})) as Transaction[]
```

**Ramo MOCK** (32-42): `mList<RawTransaction>(COL).filter(...)` com `new Date(t.date)`. A assinatura nova é `getTransactionsInRange(person, start: Date, end: Date)`, onde `start`/`end` vêm de `cycle.start`/`cycle.end` (núcleo). Usa o índice existente `(ownerId, person, date DESC)`; **sem índice novo**. Para a Central (as duas pessoas) chamar duas vezes; `getAllTransactionsForMonth` (63-92) é o análogo se um dia for preciso sem filtro de pessoa (índice `(ownerId, date DESC)` já existe).

**Importante:** `ownerScope()` vem sempre logo após `collection(...)` (guarda `owner-queries.test.js` 119-125).

---

### `src/services/fixedExpenses.service.ts` (`getPaymentsForMonths`) (service, request-response)

**Analog:** o próprio arquivo, `getPaymentsForMonth` (linhas 113-135)

```ts
const q = query(
  collection(db, PAY_COL),
  ...ownerScope(),
  where('month', '==', month),
  where('year', '==', year)
)
const snapshot = await getDocs(q)
return snapshot.docs.map((doc) => ({
  id: doc.id, ...doc.data(), paidAt: doc.data().paidAt.toDate(),
})) as FixedExpensePayment[]
```

`getPaymentsForMonths(pairs)` roda esta função em `Promise.all` para os até 2 `(month, year)` que o ciclo cobre e concatena (sem consulta nova nem índice). Ramo MOCK segue o do original (filtra `mList<RawPayment>(PAY_COL)`). O hook `useFixedExpenses` (linhas 14-40) fica como está para a página legada; o novo `useCycleBudget` chama o serviço direto. `FixedExpense.person` pode ser `'conjunto'` (types linha 21), mas o formulário só grava `ele|ela`; o núcleo ignora `'conjunto'` (A5).

---

### `src/services/limitAlerts.service.ts` (service, CRUD create-if-absent)

**Analog principal:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/services/savings.service.ts` (estrutura MOCK/Firestore, `ownerId()` em escrita, `ownerScope()` em leitura) com `getDoc`/`setDoc` de `settings.service.ts` linhas 33-38.

**Imports** (`savings.service.ts` 1-14):

```ts
import { collection, doc, addDoc, deleteDoc, query, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MOCK, mList, mSave, mId } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'
const COL = 'savings'   // aqui: const COL = 'limitAlerts'
```

**Leitura com escopo** (24-37): `query(collection(db, COL), ...ownerScope(), where('person','==',person), orderBy('createdAt','desc'), limit(30))`; converter `Timestamp` com `.toDate()` e `readAt` com `?.toDate?.() ?? null`.

**Escrita (criar-se-ausente), ID determinístico** (Pattern 4, `03-RESEARCH.md` 331-344): `getDoc(doc(db, COL, id))`; se `snap.exists()` devolve `false`; senão `setDoc(ref, { ownerId: ownerId(), ... })`. A guarda estática exige a literal `ownerId: ownerId()` em **todo** `setDoc`/`addDoc` (`owner-queries.test.js` 126-132) e proíbe `ownerId:` com outro valor (142-146). Marcar lido = `updateDoc(ref, { readAt: Timestamp.now() })` (sem mencionar `ownerId`). Não gravar nome de categoria nem descrição de lançamento (só `categoryId`, centavos, datas).

**Erro:** alerta é melhor-esforço; o chamador (`useLimitAlerts`) captura e **engole** o erro, nunca derruba a Home (Pitfall 1). Sem `console.*` com valores financeiros (V8 do RESEARCH).

**Efeito colateral nos testes:** ver `test/static/owner-queries.test.js` abaixo (contagem de services).

---

### `src/hooks/useCycleBudget.ts` (hook, request-response)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/hooks/useTransactions.ts`

**Estrutura de fetch/estado** (linhas 13-35) — copiar tal qual (`useState` + `useCallback` + `useEffect`, `loading`/`error`, `refetch`):

```ts
const [loading, setLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)

const fetchTransactions = useCallback(async () => {
  try {
    setLoading(true)
    const [data, accumulated] = await Promise.all([ getTransactions(...), getAccumulatedBalance(...) ])
    setTransactions(data)
    setError(null)
  } catch (err) {
    setError(err instanceof Error ? err : new Error('Failed to fetch transactions'))
  } finally {
    setLoading(false)
  }
}, [person, selectedMonth])

useEffect(() => { fetchTransactions() }, [fetchTransactions])
```

Adaptar: dependências = `[person, cycle.key]`; `Promise.all([getTransactionsInRange, getFixedExpenses(person), getPaymentsForMonths])`; calcular `BudgetView` com as funções puras do núcleo, **sem fórmula no hook nem no componente** (Anti-Pattern). O "agora" vem de `useNow()` (`src/hooks/useNow.ts` 8-17), nunca `new Date()` no cálculo. Mensagem de erro em pt-BR ("Não foi possível carregar seus números.") fica na UI. Cuidado com `react-hooks/set-state-in-effect` (Pitfall 12): este arquivo mantém o padrão do original, que já passa no lint; não introduzir `setState` síncrono novo dentro do efeito.

Bancos: `useBankConnections()` (`src/hooks/useBankConnections.ts` 8-25, `onSnapshot` já existente) alimenta `describeBankFreshness` → `shouldSuppressVerdict`.

---

### `src/hooks/useLimitAlerts.ts` (hook, CRUD)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/hooks/useEventCategories.ts` (linhas 10-52): `{ items, loading, error, add, update, remove, refetch }` com `fetchData` por `useCallback`, `refetch` após cada mutação. Aqui `add` vira "criar se ausente" e `update` vira `markRead`/`markAllRead`. O efeito de avaliação (`thresholdsToFire` → serviço) roda só com dados carregados, perfil próprio e fora de `readOnly` (Anti-Pattern "gravar o alerta a cada render").

---

### `src/hooks/useReadOnly.ts` (hook, derivação) e `src/contexts/AreaContext.tsx` (provider)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/contexts/AreaContext.tsx`

**Hook com guarda de contexto** (124-131; copiar o formato, inclusive o `eslint-disable` de `react-refresh/only-export-components`):

```tsx
// eslint-disable-next-line react-refresh/only-export-components
export function useArea() {
  const context = useContext(AreaContext)
  if (context === undefined) {
    throw new Error('useArea must be used within an AreaProvider')
  }
  return context
}
```

**Mudanças em `AreaContext`:**
- `readOnly = currentArea !== 'porquinho' && currentArea !== user.person` (Pattern 5; derivado, sem estado novo; `user.person` já vem do claim, linhas 28-31 do contexto: `const person = user?.person`).
- Tema forçado a claro (Pitfall 13): efeito das linhas 36-39 deixa de aplicar `dark` (`classList.toggle('dark', settings.theme === 'dark')`) e `getCachedTheme` (linhas 20-22) deixa de ler `financias_theme`. `index.html` linha 13 (script que aplica `dark` antes do React) também passa a ignorar. Mantém `Settings.theme` no tipo.
- Expor `personConfig` por pessoa (defaults do núcleo) e `updatePersonConfig`, seguindo o formato de `updateTabNames`/`updateCategoryDefs` (65-91: `try { await service; setSettings(prev => ({...prev, ...})) } catch { console.error('Error ...'); throw error }`). **Não** logar valores financeiros no `console.error` novo.
- `currentArea` continua `'ele' | 'ela' | 'porquinho'` (as 7 páginas legadas leem `currentArea`).

---

### `src/types/index.ts` (model)

**Analog:** o próprio arquivo, `Settings` (linhas 49-60) e `CategoryDef` (63-68)

```ts
export interface Settings {
  id: string
  tabNames: { area1: string; area2: string; piggy: string }
  notificationsEnabled: boolean
  daysBeforeDueDate: number
  categories: string[]
  categoryDefs?: CategoryDef[]
  theme: 'light' | 'dark'
}
export interface CategoryDef { id: string; name: string; color?: string; archived?: boolean }
```

Acrescentar `personConfig?: Partial<Record<PersonType, PersonConfig>>` em `Settings` (opcional, igual a `categoryDefs?`, para não quebrar documentos antigos), `CategoryDef.icon?: string`, `CategoryDef.kind?: 'gasto' | 'receita'`, e os tipos `PersonConfig`, `LimitEntry` (`{ from: 'YYYY-MM', cents: number | null }`), `LimitAlert`. `DEFAULT_SETTINGS` (linhas 150-162) **não** precisa de `personConfig` (defaults ficam no núcleo). Atenção: `test/static/category-ids.test.js` linhas 41-48 inspeciona `Settings`/`CategoryDef`/`Transaction` por regex; rodar a guarda depois da edição.

---

### `firestore.rules` (config)

**Analog:** o próprio arquivo, linhas 14-29

```
function clientCollections() {
  return ['transactions', 'fixedExpenses', 'fixedExpensePayments', 'savings', 'goals',
          'goalContributions', 'events', 'eventCategories', 'notes', 'settings'];
}
match /{col}/{id} {
  allow read, delete: if isMember() && col in clientCollections() && ownsExisting();
  allow create: if isMember() && col in clientCollections() && ownsIncoming();
  allow update: if isMember() && col in clientCollections() && ownsExisting()
    && request.resource.data.ownerId == resource.data.ownerId;
  // O cliente cria settings/main quando ainda nao existe (get de documento inexistente)
  allow get: if isMember() && col == 'settings' && resource == null;
}
```

Duas edições (Pitfall 1): (1) acrescentar `'limitAlerts'` à lista da função; (2) trocar a linha 28 por `col in ['settings', 'limitAlerts']`. Sem isso o `getDoc` do marcador ausente dá `permission-denied`. Publicação das regras e do índice é passo humano (`checkpoint:human-verify`; precedente Plano 01-13), **antes** de qualquer tela que leia alertas em produção.

---

### `firestore.indexes.json` (config)

**Analog:** entradas `ownerId`-first existentes (formato do arquivo, linhas 1-40). Novo índice, `ownerId` sempre primeiro:

```json
{
  "collectionGroup": "limitAlerts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "ownerId", "order": "ASCENDING" },
    { "fieldPath": "person", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### `test/rules/matrix.test.js` (test, request-response, emulador)

**Analog:** o próprio arquivo

- `CLIENT_COLS` (linhas 32-43): acrescentar `'limitAlerts'`. O `beforeEach` (linhas 73-84) semeia `a1`/`b1` em cada coleção do array, então o semeamento acompanha. Ajustar os textos "10 colecoes" dos nomes de teste.
- Teste do get de inexistente (linhas 237-249): estender o padrão para `limitAlerts`:

```js
await assertSucceeds(getDoc(doc(ele, 'settings', 'main')))
await assertFails(getDoc(doc(anon, 'settings', 'main')))
await assertFails(getDoc(doc(semClaim, 'settings', 'main')))
// so settings tem essa excecao: documento inexistente em outras colecoes continua negado
await assertFails(getDoc(doc(ele, 'transactions', 'nao-existe')))
```

Novo caso: membro faz `getDoc` de `limitAlerts/nao-existe` (passa), anônimo e sem claim (falha), `transactions/nao-existe` continua falhando, `HID_B` não lê o de `HID_A`. Caso de idempotência (`getDoc` + `setDoc` duas vezes não zera `readAt`) entra aqui. Rodar com `npm run test:rules`.

---

### `test/static/firestore-config.test.js` (test)

**Analog:** o próprio arquivo

- `NEW_INDEXES` (15-27): acrescentar `['limitAlerts', [f('ownerId'), f('person'), f('createdAt', DESC)]]` e atualizar o comentário "11 indices novos" para 12.
- Linha 48: `assert.equal(indexes.length, 18)` → `19` (e o título do teste: 7 antigos e 12 novos).
- Linha 71: `assert.equal(withOwner.length, 11)` → `12`.
- Título da linha 52 ("os 11 indices novos") → 12.

---

### `test/static/owner-queries.test.js` (test)

**Analog:** o próprio arquivo, linha 162-164. **Quebra de propósito ao criar `limitAlerts.service.ts`:**

```js
if (!only) {
  assert.equal(all.length, 10, 'esperados 10 services')
}
```

Atualizar para `11` (e o texto) na mesma tarefa que cria o service. A guarda varre automaticamente o novo arquivo e exige: `query(collection(...), ...ownerScope(), ...)`, `setDoc`/`addDoc` com `ownerId: ownerId()`, nenhum `updateDoc` citando `ownerId`, e `import ... from '@/lib/scope'`.

---

### `test/static/phase3-*.test.js` (test, estático)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/test/static/bank-ui-copy.test.js`

**Cabeçalho e helpers** (linhas 1-25) — copiar tal qual (leitura sem comentários, `walk` recursivo):

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
function walk(dir, out = []) { ... }
```

**Padrões de asserção a reaproveitar:** `assert.match(code('src/pages/DashboardPage.tsx'), /<BankStatusNotice\s*\/>/)` (presença de componente), varredura de `src/` por nome de arquivo (`walk(...).filter(/\.(ts|tsx)$/)`) e `assert.doesNotMatch(code('src/App.tsx'), /revis/i)`. Guardas novas (RESEARCH linhas 587-595): rotas `/limites` e `/casal` em `App.tsx`; 9 `aria-label` do dock; `Header`/`BottomNav`/`AreaSelector` não importados; sem emoji em `src/**/*.tsx` (D-18); sem `fonts.googleapis.com` em `index.html`/`src` (D-22); `lang="pt-BR"` em `index.html`; âncoras `#ciclo #categorias #contas #bancos #aparencia #notificacoes`; ids `lm`/`fx` na Home; tema não aplica `dark`. **Atenção:** o teste da linha 49-55 do `bank-ui-copy` exige `import { BankStatusNotice } from` e `<BankStatusNotice />` em `DashboardPage.tsx` e o texto `/configuracoes` em `BankStatusNotice.tsx`; ao reescrever para `StaleNotice` (renomear arquivo) esse teste precisa ser atualizado na mesma tarefa, ou manter o nome `BankStatusNotice` exportado.

---

### `src/components/layout/AppShell.tsx` (component, request-response)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/layout/MainLayout.tsx` (linhas 1-19)

```tsx
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-4xl">{children}</main>
      <BottomNav />
    </div>
  )
}
```

`AppShell` mantém `{ children: ReactNode }` e a mesma posição em `App.tsx` (linhas 38-40: `<ProtectedRoute><MainLayout><AnimatedRoutes/></MainLayout></ProtectedRoute>`). Trocar `Header` por `TopBar` (não fixa), `BottomNav` por `NavRail`+`LaunchFab`; `pb-[112px]` + `env(safe-area-inset-bottom)` (UI-SPEC Spacing). Páginas legadas continuam em `max-w-4xl`; Home, Central e Configurações usam `max-w-[480px]`/`md:max-w-[560px]` por página (UI-SPEC Responsivo).

---

### `src/components/layout/NavRail.tsx` (component, request-response)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/layout/BottomNav.tsx`

**Lista de destinos e item ativo** (linhas 12-21, 36-52): `navItems` como array `{ href, label, icon }`, `useLocation()`, `<Link>` com `cn(... isActive ? ... : ...)`:

```tsx
const navItems = [
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  ...
]
const location = useLocation()
<Link key={item.href} to={item.href}
  className={cn('flex flex-col items-center justify-center py-2 px-1',
                isActive ? 'text-primary' : 'text-muted-foreground')}>
```

Trocar por 9 itens na ordem e com os ícones do UI-SPEC S1 (`house, receipt, calendar, gauge, repeat, flag, chart-pie, users, piggy-bank`), só ícone, `aria-label`+`title`, `aria-current="page"` no ativo, `rounded-full` 48x48, sem rótulo. Remover a "linha indicadora" (linhas 28-35). Rolagem inicial com `scrollIntoView({ inline: 'center', block: 'nearest' })` e fade de borda por `scroll`/`resize` passivos não têm análogo no código.

**Porquinho:** hoje `AreaSelector.tsx` linhas 11-21 faz `setCurrentArea('porquinho')` + `navigate('/porquinho')`; o dock deve replicar isso ao entrar em `/porquinho` e devolver o último perfil ao sair.

---

### `src/components/layout/TopBar.tsx` (component)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/layout/Header.tsx` (linhas 21-57): `useAuth()` (`signOut`), `useArea()`, `<NotificationsBell />`, engrenagem `<Link to="/configuracoes"><Button variant="ghost" size="icon"><Settings/></Button></Link>`. Reaproveitar a engrenagem e o `signOut` (que vai para o menu do perfil e para o fim de Configurações). Remover navegação textual (44-61), logotipo e `AreaSelector`.

---

### `src/components/layout/CycleSelector.tsx` (component, event-driven)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/shared/MonthSelector.tsx`

Estrutura reaproveitável: props `{ selectedDate, onChange }` (linhas 8-11), `MONTHS` abreviados (14-17), chevrons `ChevronLeft/Right` (linha 2), clique fora com `useRef` + `mousedown` (35-48) e grade de meses. O novo seletor recebe `cycle` e navega com `shiftCycle(cycle, ±1)` do núcleo (**não** `addMonths`/`subMonths` de date-fns, linhas 21-27); rótulo "5 nov a 4 dez" por constante de meses curtos + `zonedParts` (Don't Hand-Roll do RESEARCH, não usar `Intl` pt-BR nem date-fns no fuso do host). `MonthSelector` continua existindo para as páginas legadas.

---

### `src/components/layout/ProfileSwitcher.tsx` (component, event-driven)

**Analogs:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/shared/AreaSelector.tsx` (troca de perfil) e `NotificationsBell.tsx` linhas 37-46 (fechar ao clicar fora)

```tsx
const { currentArea, setCurrentArea, settings } = useArea()
const handleAreaChange = (value: string) => {
  const area = value as AreaType
  setCurrentArea(area)
  ...
}
```
```tsx
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
  }
  if (open) {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }
}, [open])
```

Nomes vêm de `settings.tabNames.area1`/`area2` (nunca "Ele"/"Ela" fixo). Acrescentar o que o código atual **não** tem: Esc, setas, `role="menu"`/`menuitemradio`, devolver foco ao gatilho.

---

### `src/components/layout/AlertsBell.tsx` (component, event-driven)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/layout/NotificationsBell.tsx`

**Lógica de vencimentos a preservar** (linhas 12-29) e **selo/painel** (51-97). Cuidado: hoje faz `useFixedExpenses('ele', new Date())` e `('ela', ...)` (linhas 14-15, 17-29) comparando `e.dueDay - today` com `getDate(new Date())` do host (fuso do host, mês-calendário). Ao reescrever: usar `fixedOccurrence`/ciclo do núcleo e "hoje" de `useNow()`; sem textos sem acento ("Contas proximas do vencimento", linha 63). A lista passa a juntar avisos de limite (`useLimitAlerts`) e vencimentos, mais recentes primeiro. Selo: círculo mínimo 20px com texto 12px (o atual usa `text-[10px]`, linha 57, fora do contrato). O sino é **sempre do usuário logado** (UI-SPEC S6), mesmo em perfil de parceiro somente leitura.

---

### `src/components/ui/sheet.tsx` (component, event-driven)

**Analog parcial:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/ui/dialog.tsx`

**Padrões a reaproveitar:** contexto com `throw` se fora do provider (linhas 8-17, 41-43), `createPortal(..., document.body)` (69-71) e trava de rolagem do corpo (58-68):

```tsx
React.useEffect(() => {
  if (context?.open) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
  return () => { document.body.style.overflow = '' }
}, [context?.open])
if (!context?.open) return null
return createPortal(<>{children}</>, document.body)
```

Camadas: overlay `z-[9999]` (linha 91), conteúdo `z-[10000]` (111), toast `10001` (UI-SPEC S3). **O `Dialog` hoje falha** em `role="dialog"`, `aria-modal`, Esc, trap/retorno de foco e rótulo "Close" em inglês (linha 127: `<span className="sr-only">Close</span>`): corrigir no `Dialog` (UI-SPEC "Component Inventory", Dialog) e implementar o `Sheet` já correto. O `Sheet` sobe de baixo (`translateY`), raio `28px 28px 0 0`, `max-height: 92dvh`.

---

### `src/components/ui/progress.tsx`, `button.tsx`, `card.tsx`, `badge.tsx`, `alert.tsx`, `input.tsx`, `label.tsx`, `select.tsx` (component, retoques)

**Analogs:** os próprios arquivos.

- `progress.tsx` (1-33): hoje `ProgressProps { value, max }`, barra `h-4 ... bg-secondary`, fill `bg-primary`, sem `role`. Acrescentar `tone: 'ok'|'warn'|'over'|'neutral'`, `h-2` (8px), `role="progressbar"`, `aria-valuenow/min/max`, `aria-label`, `transition-[width] duration-[400ms]`.
- `button.tsx` (5-31): padrão `cva` com `variants.size`; adicionar `circle`, alturas `h-12`/`h-14`, `rounded-btn`. **Pitfall 12:** a linha 48 (`export { Button, buttonVariants }`) viola `react-refresh/only-export-components`; mover `buttonVariants` para arquivo próprio (ex.: `button-variants.ts`) e importar nos dois lados. Mesmo problema em `badge.tsx:39`; e `input.tsx:4`/`select.tsx:5` têm interface vazia: trocar por `type InputProps = React.InputHTMLAttributes<HTMLInputElement>`. Esses 4 erros de lint pré-existentes são tarefa de Wave 0 (o gate de fase exige `npm run lint` verde).
- `card.tsx` (5-14, 29-41): `rounded-lg border ... shadow-sm`, `CardTitle text-2xl font-semibold`; trocar para `rounded-card`, sem borda/sombra, `p-4`, título Sora 16/700 (assim as páginas legadas herdam sem edição).
- `alert.tsx` (5-22): variantes `warning`/`success` com `yellow-700`/`green-700` (reprovam AA). `Notice` novo segue a mesma forma `cva` + `forwardRef` + `role="alert"` (linhas 24-36), com formato "notice" do UI-SPEC.

---

### `src/components/ui/switch.tsx` (component, event-driven)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/pages/SettingsPage.tsx` linhas 295-309 (toggle manual com `theme === 'dark'`). Extrair o mesmo desenho (`relative inline-flex h-6 w-11 ... rounded-full`, bolinha com `translate-x-6`/`translate-x-1`) para `Switch` com `role="switch"`, `aria-checked`, alvo 44px. O toggle de tema some (a nota "Tema claro..." o substitui); `Switch` serve a "Avisos de vencimento" e a "Sem limite" do editor.

---

### `src/components/ui/segmented-control.tsx` (component, event-driven)

**Analog:** `src/components/ui/tabs.tsx` (controle com "slider", usado por `AreaSelector` linhas 28-46 com `activeIndex`/`itemCount`). O contrato (UI-SPEC) manda **não** reutilizar `Tabs` para Gasto/Receita/Porquinho nem perfil: criar `SegmentedControl` (`role="tablist"`, setas, `aria-selected`, trilho `bg-card` raio 999). `Tabs` permanece para as páginas legadas.

---

### `src/components/dashboard/StaleNotice.tsx` (component, request-response)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/dashboard/BankStatusNotice.tsx`

**Imports e hooks** (1-10, 18-21):

```tsx
import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useBankConnections } from '@/hooks/useBankConnections'
import { useNow } from '@/hooks/useNow'
import { BANK_ENABLED } from '@/services/bank.service'
import { describeBankFreshness } from '@shared/core/bankStatus.js'

const { connections, loading } = useBankConnections()
const now = useNow(60_000)
if (!BANK_ENABLED || loading || connections.length === 0) return null
```

**Montagem dos itens** (23-32) e **mensagem mais grave** (48-65): manter a precedência vencido > reconexão > velho > perto de vencer; só mudar o visual (`Notice`), os textos (UI-SPEC Copywriting "Aviso de dado velho", com acentos e "O ritmo fica em pausa") e o link para `/configuracoes#bancos`. A linha "Banco atualizado {há X}" (34-44) continua discreta, agora abaixo do hero. O componente (ou um hook irmão) deve **expor** o resultado de `shouldSuppressVerdict(items)` à Home para a pílula virar "Aguardando dados do banco" e o arco neutro; hoje o cálculo fica preso dentro do componente. `A6`: alertas de limite disparam mesmo com dado velho.

---

### `src/components/launcher/LaunchSheet.tsx` e `CategoryPicker.tsx` (component, CRUD)

**Analogs:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/components/transactions/TransactionForm.tsx` (lançamento) e `src/components/savings/SavingsForm.tsx` (aba Porquinho)

**Resolução categoria texto + id juntos** (TransactionForm 74-83), a copiar para o envio do sheet:

```tsx
// category (texto) e categoryId (resolvido pelas definicoes) seguem juntos durante a transicao (D-07).
const categoryId = resolveCategoryId(data.category, categoryDefs)
await onSubmit({
  ...data,
  ...(categoryId ? { categoryId } : {}),
  person,
  date: new Date(data.date + 'T' + new Date().toTimeString().slice(0, 8)),
})
```

**Lista de categorias ativas** (TransactionForm 41-47): `activeCategoryNames(categoryDefs)`; no sheet usar `categoryDefs.filter(d => !d.archived && d.kind === 'gasto' | 'receita')` (novo `kind`). **Escrita:** `addTransaction` (`transactions.service.ts` 94-112, já grava `ownerId: ownerId()`) e `addSavingsTransaction` (`savings.service.ts` 40-58). Validação: o schema `zod` do original (linhas 20-26) pede descrição obrigatória; o sheet permite descrição vazia usando o nome da categoria (UI-SPEC S3), então o schema novo não pode exigir `description`. `amount` entra em centavos pelo `MoneyKeypad`, convertido com `fromCents` do núcleo para o campo `amount` (reais) que o modelo guarda hoje. Resultado otimista: após `add`, chamar `refetch` do `useCycleBudget`. Em `readOnly`, o sheet não abre (toast).

---

### `src/pages/SettingsPage.tsx` e `src/components/settings/*` (page + component, CRUD)

**Analog:** o próprio `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/pages/SettingsPage.tsx`

**Handlers de categoria a reaproveitar sem mudar a lógica** (66-126): `applyCategoryChange` (validação do núcleo + persistência + rollback, mensagens de erro vêm do núcleo):

```tsx
const applyCategoryChange = async (change: (current: CategoryDef[]) => CategoryDef[]): Promise<boolean> => {
  let next: CategoryDef[]
  try { next = change(defs) } catch (err) {
    setCategoryError(err instanceof Error ? err.message : 'Nao foi possivel alterar a categoria')
    return false
  }
  setDefs(next); setCategoryError(null)
  try { await updateCategoryDefs(next) } catch { setDefs(defs); setCategoryError('Nao foi possivel salvar as categorias'); return false }
  return true
}
```

e `handleArchiveCategory` (D-08: arquivar nunca apaga). Mover para `CategoryEditorSheet`/`CategoriesCard`. Corrigir o texto sem acento ao reescrever ("Nao foi possivel...", "Aparencia", "Configuracoes").

**Cartões existentes a realocar:** `<BankConnections />` (linha 185) vira o cartão 4 sem mudar lógica; "Nomes das Abas" (190-231, `handleSave` 49-65) vira o cartão 5; `Card` de notificações (234-277) vira o cartão 6; Aparência (281-311) perde o toggle de tema; Categorias de Eventos (428-531, `useEventCategories`) vira a aba "Calendário" do `CategoriesCard` preservando comportamento (UI-SPEC S5). Salvar: manter um botão por cartão com rótulo verbo+objeto ("Salvar nomes das abas", "Salvar avisos") e toast "Salvo", no lugar do "Salvar" único (linhas 533-552, `saving`/`saved`).

**Limite por categoria e ciclo/renda:** `CategoryEditorSheet` grava o limite via `setLimit` (núcleo) + `updatePersonConfig`; "Dia em que recebo o salário" e "Renda esperada" via `updatePersonConfig`. Em `readOnly`: campos desabilitados com legenda "Volte ao seu perfil para editar". Âncoras `id="ciclo|categorias|contas|bancos|aparencia|notificacoes"`; foco no título ao entrar com hash; resolver hash com `document.getElementById(decodeURIComponent(...))`, nunca `querySelector` com string crua (Security Domain).

---

### `src/pages/DashboardPage.tsx` (Home) e `src/pages/CouplePage.tsx` (page, request-response)

**Analog:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/pages/DashboardPage.tsx`

O conteúdo atual (cartões de totais por pessoa 52-125, Porquinho 128-140, comparativo Recharts 142-181) **move inteiro** para `CouplePage` (Compatibilidade; UI-SPEC S9), incluindo os `useTransactions('ele'|'ela', selectedMonth)` (linhas 25-27), o `chartData` (30-44) e os imports de `recharts` (6-14). Esse conteúdo continua mensal-calendário; é a inconsistência temporária assumida (P-09). A nova `DashboardPage` mantém só: `useArea()` (`settings.tabNames`), `<BankStatusNotice />`/`StaleNotice` (linha 51) e `formatCurrency` (`src/lib/utils.ts` 8-13), e compõe `ArcGauge`, `ShortcutRow`, `MonthInOneCard`, `LimitsList`, `CentralSummaryCard`, `FixedMonthCard` a partir de `useCycleBudget(person)`, onde `person` = `currentArea` (D-01); na área `porquinho` não há "Pode gastar" (D-02).

**Formatação de dinheiro:** `formatCurrency` já usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. O contrato pede também reais inteiros nas linhas (`R$ 984`) e centavos separados no hero: acrescentar helper (`formatReais`) em `src/lib/utils.ts` junto de `formatCurrency` (linhas 8-13), mesmo `Intl`.

---

### `src/App.tsx` (config, request-response)

**Analog:** o próprio arquivo, linhas 15-30

```tsx
<Routes location={location}>
  <Route path="/" element={<DashboardPage />} />
  ...
  <Route path="/configuracoes" element={<SettingsPage />} />
  <Route path="/calendario" element={<CalendarPage />} />
</Routes>
```

Acrescentar `<Route path="/limites" element={<LimitsPage />} />` e `<Route path="/casal" element={<CouplePage />} />`; trocar `MainLayout` por `AppShell` (linhas 7, 38-40). Manter `<div key={location.pathname} className="page-transition">` (linha 18). `Toaster` entra dentro de `AreaProvider`.

---

## Shared Patterns

### Escopo de dono (toda leitura e escrita no Firestore)
**Source:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/lib/scope.ts` (linhas 27-36)
**Apply to:** `limitAlerts.service.ts`, `getTransactionsInRange`, `getPaymentsForMonths`, qualquer `query(`.
```ts
export function ownerId(): string {
  if (!current) throw new Error('Sem escopo de dono (login necessario)')
  return current.hid
}
export function ownerScope(): QueryConstraint[] {
  return SCOPED_READS ? [where('ownerId', '==', ownerId())] : []
}
```
Regras que a guarda `owner-queries.test.js` impõe: `query(collection(db, COL), ...ownerScope(), ...)` com `ownerScope()` como **primeiro** filtro; todo `addDoc`/`setDoc` com a literal `ownerId: ownerId()`; `updateDoc` nunca cita `ownerId`; o dono nunca vem de `uid`/`getScope()` fora de `scope.ts`. Índices compostos com `ownerId` primeiro.

### Ramo MOCK em todo serviço
**Source:** `/home/glow/Documentos/projetos/sitefinancias/financiasratimbum/src/lib/mockStorage.ts` (linhas 2-26) e qualquer `*.service.ts`
**Apply to:** todo serviço novo ou estendido.
```ts
export const MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true'
export function mList<T>(key: string): T[] { return JSON.parse(localStorage.getItem(`db::${key}`) ?? '[]') }
export function mSave<T>(key: string, items: T[]): void { localStorage.setItem(`db::${key}`, JSON.stringify(items)) }
export function mId(): string { ... }
export function mGetDoc<T>(key: string): T | null { ... }   // chave 'doc::...'
export function mSetDoc<T>(key: string, data: T): void { ... }
```
Cada função exportada começa com `if (MOCK) { ...; return }` espelhando o ramo Firestore (ver `savings.service.ts` 23-27).

### Núcleo puro e relógio injetado
**Source:** `shared/core/time.js` + `shared/core/purity.test.js`
**Apply to:** `cycle.js`, `limits.js`, `budget.js`, `alerts.js`, e qualquer cálculo exibido em Home/Central/sino.
Sem pacote, sem `Date.now()`, sem `new Date()` vazio; "agora" é argumento; no React vem de `useNow()` (`src/hooks/useNow.ts`). Importar do cliente como `@shared/core/<arquivo>.js` (precedente: `transactions.service.ts` linhas 18-19, `BankStatusNotice.tsx` linha 10). Um número = uma função pura (o arco, o sheet, a Central e o sino devem mostrar valores idênticos).

### Dinheiro
**Source:** `shared/core/ledger.js` (`toCents`/`fromCents`, linhas 15-26) e `src/lib/utils.ts` (`formatCurrency`, 8-13)
**Apply to:** todo cálculo (centavos inteiros, sem float) e toda exibição (`Intl.NumberFormat('pt-BR', BRL)`). Limiares com aritmética inteira (`spent * 100 >= limit * 80`), `pct` por `Math.floor`.

### Erro tratado sem derrubar a tela / sem vazar dado
**Source:** `AreaContext.tsx` 41-52 e 65-91; `SettingsPage.tsx` 66-90
**Apply to:** hooks, `AreaContext`, `limitAlerts`.
```tsx
try { await updateSettings({ tabNames }); setSettings(prev => ({ ...prev, tabNames })) }
catch (error) { console.error('Error updating tab names:', error); throw error }
```
Regras de privacidade do projeto: nenhum valor financeiro nem nome em `console.*`; alerta é melhor-esforço (engolir erro); a UI mostra a mensagem em pt-BR. Erros do núcleo (`throw new Error('Categoria ja existe')`) sobem até a tela, que os exibe sob o campo.

### Componentes com variantes (cva + forwardRef + cn)
**Source:** `src/components/ui/button.tsx` (5-48) e `alert.tsx` (5-36); `cn` em `src/lib/utils.ts` (4-6)
**Apply to:** `Chip`, `IconCircle`, `Notice`, `Progress` (tone), `Switch`, `SegmentedControl`. Exportar variantes `cva` de arquivo próprio para não violar `react-refresh/only-export-components` (Pitfall 12). Alias `@/` para `src/`, `@shared/` para `shared/`.

### Hooks de dados
**Source:** `src/hooks/useTransactions.ts` (13-35) e `useEventCategories.ts` (10-52)
**Apply to:** `useCycleBudget`, `useLimitAlerts`. Forma `{ data, loading, error, add, update, remove, refetch }`; `useCallback` + `useEffect`; mutação seguida de `await fetchData()`; sem `onSnapshot` novo (cota Spark), exceto o já existente `useBankConnections`.

### Textos
**Apply to:** toda UI nova ou reescrita: pt-BR com acento completo, sem emoji (D-18), sem "!" e sem elogio/bronca (UI-SPEC Copywriting). Páginas legadas não reescritas ficam como estão. Comentários e mensagens de erro do **núcleo** continuam sem acento (convenção do `shared/core`).

---

## No Analog Found

| Arquivo | Role | Data Flow | Razão |
|---|---|---|---|
| `src/components/ui/money-keypad.tsx` | component | event-driven | Nenhum teclado numérico no código; hoje valores entram por `<input type="number">` (`TransactionForm.tsx`). Seguir UI-SPEC S3 (entrada em centavos, máx. 8 dígitos). Pode extrair a lógica de "dígitos → centavos" como função pura testável (`shared/core` ou `src/lib`). |
| `src/components/ui/collapsible.tsx` | component | event-driven | Não há expansão animada; usar `grid-template-rows 0fr/1fr` (UI-SPEC Movimento) com `aria-expanded`/`aria-controls`. |
| `src/components/dashboard/ArcGauge.tsx` | component | transform | Sem SVG/gráfico próprio; os gráficos atuais são Recharts. Geometria e `stroke-dashoffset` definidos no UI-SPEC S2 (`viewBox="0 0 200 110"`, dasharray 264). |
| `src/components/ui/toast.tsx` | provider | pub-sub | Não existe fila de toasts; usar o padrão de contexto de `AreaContext` + hook com `throw`. |
| `src/components/dashboard/RhythmPill.tsx`, `ShortcutRow.tsx` | component | n/a | Sem análogo de pílula/atalho; usar `Badge`/`Button` (cva) como base de estilo. |
| `src/components/settings/IconPicker.tsx`, `DayPicker.tsx` | component | event-driven | Sem seletor em grade; botões 44x44 em grade, estado `selected` com `bg-primary`. |
| `src/components/launcher/CategoryPicker.tsx` | component | event-driven | Hoje categoria é `<Select>` nativo; o contrato pede `radiogroup` com círculos (UI-SPEC S3). |
| `src/components/limits/LimitRow.tsx` | component | request-response | Sem linha expansível; compor `IconCircle` + `Progress(tone)` + `Collapsible`. |
| Fontes `@fontsource-variable/*` em `src/main.tsx` | config | n/a | Nenhuma fonte auto-hospedada hoje (`body` usa `system-ui`, `index.css` linha ~75). Gate de pacotes humano (`checkpoint:human-verify`, precedente Plano 01-01). |
| Tokens Moeda em `src/index.css` | config | n/a | Estender `@theme inline` (linhas 4-29) e `:root` (33-52); fonte da verdade em `.planning/sketches/themes/moeda.css` e na tabela Color do UI-SPEC. |
| `src/components/layout/ProfileSwitcher.tsx` (menu `role="menu"`) | component | event-driven | Há análogo só de troca e click-outside; teclado e roles são novos. |
| Testes de componente/hook | test | n/a | Não há vitest/jsdom (RESEARCH recomenda não instalar); cobertura de UI = `tsc -b`, `eslint`, guardas estáticas e UAT humano. |

---

## Metadata

**Analog search scope:** `shared/core/`, `src/services/`, `src/hooks/`, `src/contexts/`, `src/components/{layout,ui,shared,dashboard,transactions,savings,settings}/`, `src/pages/`, `src/lib/`, `src/types/`, `test/static/`, `test/rules/`, `firestore.rules`, `firestore.indexes.json`, `package.json`, `.planning/sketches/`.
**Files scanned:** ~55 lidos integral ou parcialmente; todos os analogs citados confirmados como rastreados por `git ls-files`.
**Pattern extraction date:** 2026-11-18

### Pontos de quebra planejada (para o planejador agendar na mesma tarefa)

1. `test/static/firestore-config.test.js`: 18→19 índices, 11→12 com `ownerId`, `NEW_INDEXES` (linhas 48, 71).
2. `test/static/owner-queries.test.js`: `all.length` 10→11 (linha 163) ao criar `limitAlerts.service.ts`.
3. `shared/core/purity.test.js`: listas `ALL` e `CLOCK_FREE` (linhas 10-11) ao criar os 4 módulos do núcleo.
4. `test/rules/matrix.test.js`: `CLIENT_COLS` e exceção do `get` de documento inexistente (linhas 32-43 e 237-249) junto com a mudança em `firestore.rules` linhas 16-18 e 28.
5. `test/static/bank-ui-copy.test.js` (linhas 49-55): depende de `BankStatusNotice` na Home e do texto `/configuracoes`; atualizar se o componente for renomeado para `StaleNotice`.
6. `test/static/category-ids.test.js` (T1, linhas 41-48): inspeciona `Settings`, `CategoryDef`, `Transaction` por regex; reexecutar após editar `src/types/index.ts`.
7. Lint: 4 erros pré-existentes (`badge.tsx:39`, `button.tsx:48`, `input.tsx:4`, `select.tsx:5`) entram na Wave 0.
8. Commits desta fase com lista explícita de arquivos (o `git status` do diretório pai traz exclusões alheias de `LibreChat/`); nunca `git add -A`.
