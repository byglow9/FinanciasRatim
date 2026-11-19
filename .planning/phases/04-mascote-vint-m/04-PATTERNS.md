# Phase 4: Mascote Vintém - Pattern Map

**Mapped:** 2026-11-19
**Files analyzed:** 52 (35 a criar, 17 a modificar; inclui os `.test.js` pareados e a edição de guardas existentes)
**Analogs found:** 49 / 52 (3 sem analog no repositório: a fonte é o sketch 020, rastreado no git)

Todo caminho citado abaixo foi conferido com `git ls-files` (todos rastreados). Nenhum analog é espelho gitignored. O sketch `.planning/sketches/020-vintem-verde/index.html` também é rastreado e é a **fonte de porte** do motor e do autoteste.

## Achados que o planejador precisa saber antes de fatiar planos

1. **Guarda de hex literal (`test/static/palette-contrast.test.js:40-50`)** varre todo `.ts/.tsx/.js/.jsx` de `src/` e reprova `#rrggbb` e `bg|text|border-(white|black)` opaco. Logo: `geometry.ts`, `view.ts`, `selftest.ts`, `Vintem*.tsx` **não podem ter hex literal nem `text-white`**. As cores `--vintem-*` (e `--vintem-balloon-fg`, o branco do texto do balão) vão em `src/index.css` (CSS não é varrido); a arte SVG usa `fill="var(--vintem-body)"`/classes. O fundo `#fbf8f2` do rasterizador do autoteste tem que ser lido de `getComputedStyle` (token `--background`), nunca literal.
2. **`--color-action` já é `#4c513b` (oliva)** em `src/index.css:44`. D-01b já está aplicado no código-fonte; o UI-SPEC/RESEARCH ainda citam `#14532d`. O corpo do Vintém usa `var(--color-action)`; remedir contrastes com o oliva (RESEARCH Pitfall 4).
3. **`test/static/owner-queries.test.js:167`** faz `assert.equal(all.length, 11, 'esperados 11 services')`. Se o plano opcional criar `src/services/vintemInsights.service.ts`, esse número vira **12** no mesmo plano. Idem `test/rules/matrix.test.js:32` (`CLIENT_COLS`) e `firestore.rules` (`clientCollections()`), e `scripts/ux-audit/seed.mjs:7-18` (`COLLECTIONS`).
4. **`test/static/phase3-final.test.js:35-50`** exige exatamente 9 rotas; passa a 10 com `/vintem-teste` (editar o teste junto com `App.tsx`).
5. **`shared/core/purity.test.js:12-51` auto-descobre todo `.js` não-teste** de `shared/core`: proíbe import de pacote (só `./`), `Date.now(` e `new Date()` sem argumento. Os 7 módulos novos entram na guarda sem editar lista. `vintemPhrases.js` não pode importar nada.
6. **`scripts/ux-audit/calendar-collapse.mjs` termina com resumo JSON**; o UI-SPEC exige que `vintem.mjs` termine em texto `FALHAS 0` (como o autoteste do sketch, linha 710). Emitir também a linha `FALHAS ${n}`.
7. **`ArcGauge` deve manter a string `PiggyBank`** (`test/static/phase3-home-components.test.js:40`): só passar `<VintemSlot />` como `children` em `DashboardPage.tsx:114-118`; não editar `ArcGauge.tsx`.
8. **Toast real é inferior**, não superior (`toast.tsx:125`: `bottom-[calc(92px+env(safe-area-inset-bottom))]`), fundo `bg-action` e duração 3000 ms (`toast.tsx:5`). O `VintemToast` precisa de superfície clara (corpo oliva some sobre `bg-action`).

## File Classification

### Núcleo puro (`shared/core`, JS com `// @ts-check`, testado em UTC e Tokyo)

| Arquivo (novo) | Role | Data Flow | Closest Analog | Match |
|----------------|------|-----------|----------------|-------|
| `shared/core/vintemSpring.js` + `.test.js` | utility (física pura) | transform | `shared/core/alerts.js` (cabeçalho/estilo) + sketch 020 linhas 74-86, 125-134 (fonte do porte) | role-match |
| `shared/core/vintemStates.js` + `.test.js` | config (tabela congelada) | transform | `shared/core/budget.js:399` (`RHYTHM_CUTS`) + sketch 020 linhas 88-107 | role-match |
| `shared/core/vintemModel.js` + `.test.js` | model (modelo + `World` de tempo simulado) | event-driven | sketch 020 linhas 109-123, 222-290, 386-431 (sem analog em `shared/core`) | no repo analog |
| `shared/core/vintemMood.js` + `.test.js` | utility (derivação de humor) | request-response (função pura) | `shared/core/alerts.js` (`thresholdsToFire`) + `shared/core/budget.js:417-441` (`rhythm`) | exact |
| `shared/core/insights.js` + `.test.js` | service (detector de regras) | batch/transform | `shared/core/series.js` + `series.test.js` | exact |
| `shared/core/vintemPhrases.js` | config (dado congelado) | transform | `shared/core/dayKey.js:15` (`Object.freeze` de dado) | role-match |
| `shared/core/phrasePicker.js` + `.test.js` | utility (seleção sem repetição) | transform | `shared/core/format.js:219` (`plural`) + `alerts.js` (id determinístico) | role-match |

### Cliente: motor e arte (`src/lib/vintem`, TS)

| Arquivo (novo) | Role | Data Flow | Closest Analog | Match |
|----------------|------|-----------|----------------|-------|
| `src/lib/vintem/view.ts` | utility (escritor de atributos SVG) | streaming (por quadro) | sketch 020 `eyeDraw`/`draw` (linhas 291-380) | no repo analog |
| `src/lib/vintem/world.ts` | service (laço rAF singleton + observers) | event-driven | `src/contexts/LimitAlertsContext.tsx:168-176` (visibilitychange) + `src/hooks/useNow.ts` (subscribe/cleanup) + sketch `W` | role-match |
| `src/lib/vintem/geometry.ts` | config (constantes de paths) | transform | `src/components/dashboard/ArcGauge.tsx:5-7` (constantes de geometria) | role-match |
| `src/lib/vintem/selftest.ts` | test (autoteste por pixels, import dinâmico com `?test`) | batch | sketch 020 linhas 520-712 | no repo analog |

### Cliente: componentes, contexto, hooks, páginas

| Arquivo (novo) | Role | Data Flow | Closest Analog | Match |
|----------------|------|-----------|----------------|-------|
| `src/components/vintem/Vintem.tsx` | component (SVG em JSX + ponte de efeito) | event-driven | `src/components/dashboard/ArcGauge.tsx` | role-match |
| `src/components/vintem/VintemSlot.tsx` | component (botão 84x84 no arco) | request-response | `ArcGauge.tsx:73-78` (slot) + `LimitRow.tsx:53-59` (botão com foco) | role-match |
| `src/components/vintem/VintemBalloon.tsx` | component (balão dispensável) | request-response | `src/components/ui/notice.tsx` + `toast.tsx:54-78` | role-match |
| `src/components/vintem/VintemInlineRow.tsx` | component | request-response | `src/components/limits/LimitRow.tsx:222-235` (cabeçalho do cartão) | role-match |
| `src/components/vintem/VintemToast.tsx` | component | event-driven | `src/components/ui/toast.tsx:36-79` (`ToastView`) | exact |
| `src/components/vintem/VintemEmpty.tsx` | component (decorativo) | request-response | `DashboardPage.tsx:129-139` (bloco vazio) | role-match |
| `src/contexts/VintemContext.tsx` | provider | event-driven | `src/contexts/LimitAlertsContext.tsx` | exact |
| `src/hooks/useReducedMotion.ts` | hook | event-driven (store externo) | `src/hooks/useNow.ts` | exact |
| `src/services/vintemInsights.service.ts` (opcional, plano separável) | service | CRUD | `src/services/limitAlerts.service.ts` | exact |
| `src/components/settings/VintemToneCard.tsx` | component (cartão) | CRUD | `src/components/settings/NotificationsCard.tsx` + `ui/segmented-control.tsx:40-57` (teclado) | exact |
| `src/pages/VintemTestPage.tsx` | page | request-response | `src/pages/SettingsPage.tsx` (layout) + `BillFormSheet.tsx:212-225` (`Select`) + `NotificationsCard.tsx:71-81` (linha com `Switch`) | role-match |

### Scripts e testes

| Arquivo (novo) | Role | Data Flow | Closest Analog | Match |
|----------------|------|-----------|----------------|-------|
| `scripts/ux-audit/vintem.mjs` | test (CDP) | batch | `scripts/ux-audit/calendar-collapse.mjs` + `cdp.mjs` | exact |
| `scripts/vintem/review-sheet.mjs` | utility (gerador de Markdown) | file-I/O | `scripts/ux-audit/seed.mjs:1-5` (script Node que importa `../../shared/core/*.js`) | role-match |
| `test/static/phase4-home.test.js`, `phase4-settings.test.js`, `phase4-testpage.test.js`, `phase4-engine.test.js`, `phase4-content.test.js`, `phase4-content-review.test.js` | test (guarda estática) | batch | `test/static/phase3-1-savings.test.js` + `helpers/phase3-1.js`; ordem de cartões: `phase3-settings-categories.test.js:33-60`; Home: `phase3-home-components.test.js` | exact |

### Modificados

| Arquivo (existente) | Mudança | Analog do trecho a imitar |
|---------------------|---------|---------------------------|
| `src/App.tsx` | rota `/vintem-teste`; `VintemProvider` dentro de `LimitAlertsProvider`, envolvendo `LaunchProvider` | o próprio arquivo, linhas 26-34 e 43-59 |
| `src/pages/DashboardPage.tsx` | `<VintemSlot />` em `ArcGauge` (114-118), `<VintemBalloon />` após `RhythmPill` (156-160), `VintemEmpty` nos ramos 53-70, 72-89 e 129-139 | o próprio arquivo |
| `src/components/limits/LimitRow.tsx` | `<VintemInlineRow />` em `LimitsList` entre o cabeçalho (223-235) e a lista (237) | o próprio arquivo |
| `src/components/launcher/LaunchSheet.tsx` | `vintem.onLaunched(...)` logo depois de `bumpData()` (linha 204) | o próprio arquivo |
| `src/pages/GoalsPage.tsx` | `vintem.onGoal(...)` em `handleContribute` (81-85) | o próprio arquivo |
| `src/pages/SettingsPage.tsx` | `<VintemToneCard />` entre `<AppearanceCard />` e `<NotificationsCard />` (90-91) | o próprio arquivo |
| `src/hooks/useCycleBudget.ts` | expor `transactions` no retorno (94-100) | o próprio arquivo (variável `current`, linha 74) |
| `src/contexts/AreaContext.tsx` + `src/services/settings.service.ts` | `updateVintemTone` | `updateNotifications` (AreaContext 183-194) e `updatePersonConfig` (settings.service 60-82) |
| `src/types/index.ts` | `Settings.vintemTone?`, `Transaction.source?: 'bank'` | `Settings` 53-68, `Transaction` 6-20 |
| `src/components/ui/toast.tsx` | item `custom` na fila para o `VintemToast` | `ToastItem` 15-21, `show` 87-99 |
| `src/index.css` | bloco `.vt` com `--vintem-*` derivados de `var(--color-action)` | `@layer base` em 127 e `.anim-*` 349-364 |
| `test/static/phase3-final.test.js` | 9 -> 10 rotas | linhas 35-50 |
| `test/static/owner-queries.test.js` (se houver service) | 11 -> 12 services | linha 167 |

## Pattern Assignments

---

### `shared/core/vintemSpring.js`, `vintemStates.js`, `vintemModel.js` (modelo puro, event-driven)

**Analog de forma/convenção:** `shared/core/alerts.js` + `shared/core/alerts.test.js`. **Fonte do porte:** sketch 020.

**Cabeçalho e convenções do núcleo** (`shared/core/alerts.js:1-10`): `// @ts-check`, comentário em português **sem acento**, "Sem relogio, sem pacote", constante congelada exportada, JSDoc tipado:

```js
// @ts-check
// Alertas de limite (LIM-07): 80% e 100% por categoria, um por limiar e por
// ciclo. ... Sem relogio, sem pacote, sem float nas
// fronteiras (80% e `gasto * 100 >= limite * 80`).

/** Limiares de aviso, do menor para o maior (PR-13: sem interruptor). */
export const THRESHOLDS = /** @type {const} */ ([80, 100])
```

**Constante calibrável congelada** (`shared/core/budget.js:399`) — padrão para `SPIKE_TICKET_MULT`, `NO_LAUNCH_DAYS`, `BLINK`, `PARAMS`:

```js
export const RHYTHM_CUTS = Object.freeze({ folgado: 75, noRitmo: 100, atencao: 115 })
```

**Solver da mola — copiar do sketch 020 (linhas 74-86), convertendo `prototype` para `class` e tirando `var`** (já aparece em RESEARCH "Code Examples", conferido):

```js
function Spring(v,k,c,m){this.x=v;this.v=0;this.t=v;this.k=k;this.c=c;this.m=m||1}
Spring.prototype.step=function(dt,crit){
  var k=this.k,c=this.c;if(crit){k=Math.max(k,420);c=2*Math.sqrt(k*this.m)}
  var n=Math.max(1,Math.ceil(dt*240)),h=dt/n;
  for(var i=0;i<n;i++){var a=((this.t-this.x)*k-this.v*c)/this.m;this.v+=a*h;this.x+=this.v*h}
};
var P={body:[200,11],pos:[160,15],rot:[140,12],head:[60,13],look:[4000,126],pp:[260,21],popIn:[360,17],popOut:[200,29],
  ear:[150,6.5],tail:[90,4.5],turn:[70,12.5],wake:[200,18],droop:[90,13],gauge:[60,11],bub:[300,16]};
```

**Piscar** (sketch 125-134) -> `BLINK` + `blinkEnv(t)` (já transcrito em RESEARCH "Curva do piscar").

**Tabela de estados** (sketch 88-107): `KEYS`, `DEF`, `D(o, acc)`, `ST`, `stateFromPct` (linha 107: `p<40?'feliz':p<75?'neutro':p<=100?'atento':p<=130?'bravo':'triste'`). **Mudanças prescritas pelo UI-SPEC** (não copiar o sketch cegamente): remover `sm` e `op`; trocar `cv` por `cvL`/`cvR`; acrescentar `rt`; só `feliz2` -> `feliz`; neutro `{cvL:.30, cvR:.06, ba:-6, bc:2}`; triste `{ew:16,eh:21,cv:.3,cu:.1,pr:.74,wet:1,lt:-15,by:6,bt:-22,sy:.93,py:5,rt:5,ea:70,es:.72,ly:.7}`.

**Mundo de tempo simulado** (sketch 109-119) — copiar a ideia de `W.t`, `later(ms, fn)` com fila e `step(dt)` com `dt = clamp(dt, 0, 1/30)`. **Não portar `Math.random`** (sketch 247-277, 266): injetar `rand` (RESEARCH Pattern 1, `mulberry32`). Não usar `Date.now()` nem `new Date()` (`purity.test.js:41-51`).

**Reações** (sketch 386-431): `spend`, `susto`, `bronca`, `festa`, `wake`, cada uma com token `++V.react` e `at(ms, fn)` que ignora se o token mudou:

```js
Vintem.prototype.spend=function(){
 var V=this,tk=++V.react,S=V.S;V.clearOv();V.coin.on=false;V.coin.hit=false;
 var at=function(ms,fn){W.later(ms,function(){if(V.react===tk)fn()})};
 sq(V,.82);V.ov.ly=-.8;V.ov.lx=0;V.ov.py=5;
 at(190,function(){sq(V,1.15);V.ov.py=-32;V.ov.ly=-1});
 ...
```

**Teste do modelo: padrão (relógio simulado, RNG semeado)** — copiar a estrutura de `alerts.test.js:1-24` (imports `node:test`, `node:assert/strict`, helpers `row`/`fire`/`shape` no topo) e o esqueleto de RESEARCH "Modelo em teste de Node". Nomes de teste em português sem acento obrigatório (ex.: `test('molas assentam em menos de 3 s num alvo fixo', ...)`).

**Teste em UTC e Tokyo:** não há flag por arquivo; `npm run test:core:tz` (`package.json`) roda a pasta toda sob `TZ=UTC` e `TZ=Asia/Tokyo`. Os testes do modelo não dependem de fuso; os de `insights.js` e `vintemMood.js` dependem (ver abaixo).

---

### `shared/core/vintemMood.js` (utility, função pura)

**Analog:** `shared/core/alerts.js` (`thresholdsToFire`, linhas 64-94) e `shared/core/budget.js:417-441` (`rhythm`).

**Fronteiras por inteiros, sem float** (`alerts.js:64-79`) — o humor deve reusar exatamente esta regra, e `estourou` é `row.state === 'over'` (`spent > limit`), nunca `pct >= 100`:

```js
const limit = row?.limitCents
const spent = row?.spentCents
if (!isPositiveInt(limit)) continue
if (typeof spent !== 'number' || !Number.isFinite(spent)) continue
const reached = []
if (spent * 100 >= limit * 80) reached.push(80)
if (spent > limit) reached.push(100)
```

**Níveis de ritmo** (`budget.js:417-441`): `rhythmLevel` é `0..4` ou `null` (suprimido). Tipo TS em `src/lib/rhythm.ts:8` (`RhythmLevel`). Faixas D-06b: `pct < 75` ritmo; `75 <= pct < 80` atento; `80 <= pct <= 100` perto; estourou = `state === 'over'`.

**`BudgetRow`** (`budget.js:49-58`): `{ categoryId, spentCents, limitCents, state, pct, remainingCents, excessCents, txs }`; `pct` é inteiro e **não satura em 100**.

**Teste de fronteira** — copiar o estilo de `alerts.test.js:35-54`:

```js
test('fronteira do 100: 100,00% so gera o 80; 100,01% gera o 100', () => {
  assert.deepEqual(shape(fire([row(10000)])), [['alimentacao', 80, false]])
  assert.deepEqual(shape(fire([row(10001)])), [ ['alimentacao', 80, true], ['alimentacao', 100, false] ])
})
```
Aplicar: `spent===limit` ainda é "perto" (não "estourou"); 7499/7500, 7999/8000 em centavos.

---

### `shared/core/insights.js` (service, batch/transform)

**Analog:** `shared/core/series.js` (+ `series.test.js`).

**Imports relativos do núcleo + typedefs importados** (`series.js:7-13`):

```js
import { toCents } from './ledger.js'
import { isInCycle } from './cycle.js'
import { groupKeyOf } from './categoryOrder.js'

/** @typedef {import('./cycle.js').Cycle} Cycle */
/** @typedef {import('./budget.js').Tx} Tx */
```

**Núcleo da transformação** (`series.js:37-62`): ignora `transfer === true`, só `entrada`/`saida`, soma em centavos inteiros via `toCents(t.amount)`, não muta entradas, ordena com desempate estável por chave:

```js
for (const t of transactions) {
  if (t.transfer === true) continue
  if (t.type !== 'entrada' && t.type !== 'saida') continue
  const cents = toCents(t.amount)
  ...
byCategory: [...a.slices.values()].sort(
  (x, y) => y.cents - x.cents || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0)
)
```

**Fuso de São Paulo, nunca `Date#getDate`/date-fns** (`shared/core/dayKey.js:1-5, 33-40`, `time.js:14-38`, `cycle.js` `daysBetweenParts` ~linha 96):

```js
export function dayKeyOf(instant, tz = DEFAULT_TZ) {
  const p = zonedParts(instant, tz)
  return `${pad(p.year, 4)}-${pad(p.month, 2)}-${pad(p.day, 2)}`
}
export function daysBetweenParts(a, b) {
  const ua = Date.UTC(a.year, a.month - 1, a.day)
  const ub = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((ub - ua) / DAY_MS)
}
```
O "agora" entra como **argumento** (`time.js:2-4`: "o 'agora' e sempre passado como argumento").

**Normalização e filtro de privacidade para `merchantOf`:** `normalize` em `shared/core/classify.js:21-27` (NFD, sem acento, minúsculas, colapsa espaços). O que o banco gera (`classify.js:68`): `` return `Pix para ${titleCase(name)}` `` e `Pix de ...`, `Transferencia de ...`. Regra RESEARCH Pattern 5: bloquear `^pix (para|de) `, `^transferencia`, 6+ dígitos, `@`, nome igual ao da categoria; descrição nunca entra no `id`.

**ID determinístico sem barra** (`alerts.js:44-46`) — copiar para `Insight.id`:

```js
export function alertId(person, cycleKey, categoryId, threshold) {
  return `${person}__${cycleKey}__${categoryId}__${threshold}`
}
```

**Formatação dos encaixes (reuso, não reescrever):** `formatMoney(cents)` em `format.js:~55-63` (devolve `R$` + NBSP, `format.js:63`), `plural(n, 'vez', 'vezes')` em `format.js:219-221` (já inclui o número).

**Testes com fixtures cruzando o dia em Tokyo/UTC** — copiar o truque de `series.test.js:100-111`: 

```js
// 31/12 23:30 em SP e 01/01 de manha em Toquio: precisa cair no ciclo de dezembro.
const list = [ tx('saida', 12.34, '2026-01-01T02:30:00Z', { categoryId: 'lazer' }), ... ]
```
Helper de fixture: `const tx = (type, amount, iso, extra = {}) => ({ type, amount, date: new Date(iso), ...extra })` (`series.test.js:7`). Para "últimos 7 dias" e "dias sem lançar", usar instantes ISO fixos em torno da meia-noite de São Paulo (`T02:30:00Z`, `T03:00:00Z`) e `const NOW = new Date('2026-11-17T15:00:00Z')` no estilo de `bankStatus.test.js:5-9`. Fixtures de privacidade: "Pix para Maria Silva", CPF de 11 dígitos, e-mail -> `label: null`.

---

### `shared/core/vintemPhrases.js` e `phrasePicker.js` (data + utility)

**Analog de dado congelado:** `shared/core/dayKey.js:15` (`export const WEEKDAY_SHORT = Object.freeze([...])`). `vintemPhrases.js` exporta `TONES`, `SITUATIONS`, `PHRASES`, `REVIEW = { reviewedAt: null }`, sem nenhum `import`.

**Analog do seletor:** funções puras de `format.js` (`plural`, `formatMoney`), com rand injetado (RESEARCH "Seleção sem repetição").

**Testes do banco:** um `phrasePicker.test.js` que importa `PHRASES` e verifica por varredura (estilo `purity.test.js:26-39`, loop `for (const file of ALL) test(...)`): cada situação x tom >= N variantes, nenhum `\{[a-z]+\}` sobra, comprimento <= 110 / <= 80 contando NBSP como 1 (RESEARCH Pitfall 9: preencher com `formatMoney` real), acento pt-BR, regex de dado proibido (CPF/CNPJ/6+ dígitos, "Pix para/de", e-mail). Teste MASC-07: lê a lista de bloqueio **só se existir** o arquivo local (fora do git).

---

### `src/lib/vintem/world.ts` (service, laço rAF + observers)

**Analog parcial:** `src/contexts/LimitAlertsContext.tsx:168-176` (efeito com listener global e cleanup) e `src/hooks/useNow.ts` (store externo com assinatura). **Fonte:** sketch `W` (linhas 109-123).

**Listener global com cleanup** (`LimitAlertsContext.tsx:168-176`):

```tsx
useEffect(() => {
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return
    ...
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => document.removeEventListener('visibilitychange', onVisible)
}, [])
```

**Ordem do quadro (leituras antes das escritas)** — sketch 112-118:

```js
step:function(dt){ dt=clamp(dt,0,1/30); W.t+=dt;
  for(var j=0;j<W.inst.length;j++)W.inst[j].update(dt); ...},
render:function(){for(var j=0;j<W.inst.length;j++)W.inst[j].draw()}
```
Não existe `IntersectionObserver` em `src/` hoje; o rAF só aparece em `ArcGauge.tsx:33-36` (com `cancelAnimationFrame` no cleanup) e `useSectionReveal.ts:68-71`. Seguir o cleanup simétrico dessas duas (StrictMode, RESEARCH Pitfall 7).

---

### `src/lib/vintem/view.ts`, `geometry.ts` (escritor SVG, constantes)

**Analog de constantes de geometria** (`ArcGauge.tsx:5-7`):

```ts
// Comprimento do semicírculo M16 104 A84 84 0 0 1 184 104 (π × 84 ≈ 264).
const ARC_LENGTH = 264
const ARC_PATH = 'M16 104 A84 84 0 0 1 184 104'
```
`geometry.ts` guarda os paths do UI-SPEC "Anatomia congelada" (corpo `M28,120C28,74 66,48 120,48C174,48 212,74 212,120C212,156 178,174 120,174C62,174 28,156 28,120Z`, fenda `M98,56Q120,60 142,56`, orelha `M-19,8C-24,-14 -12,-40 3,-46C16,-36 26,-12 21,8Z`, perfil). Paths não são hex: passam na guarda de cor. **Nenhuma cor aqui.**

**Escrita de atributos com cache** (RESEARCH Pattern 2): guardar o último valor de cada atributo e só chamar `setAttribute` quando muda. Port de `eyeDraw` (sketch 291-300): `ER.g.setAttribute('transform','translate('+f2(x)+','+f2(y)+') scale('+f3(k)+',1)')` com `f2`/`f3` de arredondamento (evitar `NaN`/`Infinity` no DOM: o teste 1 do sketch faz `/NaN|Infinity|undefined/.test(host.innerHTML)`).

---

### `src/components/vintem/Vintem.tsx` (component, SVG em JSX + ponte)

**Analog:** `src/components/dashboard/ArcGauge.tsx` (SVG em JSX, efeito com rAF e cleanup, tokens por classe).

**Imports e props tipadas** (`ArcGauge.tsx:1-4, 16-24`):

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { PiggyBank } from 'lucide-react'
import type { ArcTone } from '@/lib/rhythm'
```

**Efeito com cleanup simétrico** (`ArcGauge.tsx:32-36`):

```tsx
useEffect(() => {
  const frame = requestAnimationFrame(() => setDrawn(true))
  return () => cancelAnimationFrame(frame)
}, [])
```
O `Vintem` segue o esqueleto de RESEARCH Pattern 3 (efeito de montagem cria `createVintemView(svgRef.current!)`, `destroy()` no cleanup; efeitos separados para `state` e `reduced`). `useId` sanitizado: `rawId.replace(/[^a-zA-Z0-9_-]/g, '')`.

**Cor do corpo:** classes/variáveis CSS (`fill: var(--vintem-body)`), nunca `fill="#..."` (guarda `palette-contrast.test.js:40-50`). SVG `aria-hidden="true" focusable="false"` (UI-SPEC Acessibilidade). Sem `dangerouslySetInnerHTML`/`innerHTML` (`helpers/phase3-1.js:46`, `scaleProblems`).

---

### `src/components/vintem/VintemSlot.tsx`, `VintemInlineRow.tsx`, `VintemBalloon.tsx`, `VintemEmpty.tsx`

**Botão com foco e alvo 44+** — copiar as classes de `LimitRow.tsx:58`:

```tsx
className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
O `VintemSlot` vai dentro do círculo existente do `ArcGauge` (`ArcGauge.tsx:73-78`: `h-[84px] w-[84px] ... rounded-full bg-card`), então o botão é `h-[84px] w-[84px]` e **não** substitui o círculo.

**Região viva sempre montada** — o padrão já existe em `DashboardPage.tsx:164-166`:

```tsx
<p className="sr-only" aria-live="polite">
  {live}
</p>
```
O Vintém acrescenta o seu próprio `<p className="sr-only" role="status" aria-live="polite">` (UI-SPEC S1) separado deste, que repete o número do hero; **a fala de entrada não entra nessa região**.

**Balão: texto simples + token de cor.** O texto é filho React; o branco do balão não pode ser `text-white` (guarda `palette-contrast.test.js:47`: `/\b(bg|text|border)-(white|black)\b(?!\/)/`). Definir `--vintem-balloon` e `--vintem-balloon-fg` em `src/index.css` e usar `bg-[var(--vintem-balloon)] text-[var(--vintem-balloon-fg)]` (ou classes utilitárias criadas no bloco `.vt`). Escala tipográfica: só `text-base`/`text-xs` (e `text-[28px]` no H1 da página de teste), pesos `font-normal`/`font-bold` (`scaleProblems`, `helpers/phase3-1.js:42-67`).

**Estado vazio calado e decorativo** — o `VintemEmpty` entra **acima** dos blocos existentes sem alterar o texto:
`DashboardPage.tsx:129-139`, `TransactionsPage.tsx:151,161`, `CalendarPage.tsx:293`, `FixedMonthCard.tsx:40`, `FixedExpensesPage.tsx:187`, `CouplePage.tsx:84`, `AlertsBell.tsx:225` (sonolento), erros em `DashboardPage.tsx:53-70` e `72-89` (surpreso). Não mexer em `reports/EmptyState.tsx` além de acrescentar a pose, se o plano decidir (a tabela do UI-SPEC S5 não lista Relatórios).

---

### `src/components/vintem/VintemToast.tsx` + modificação de `src/components/ui/toast.tsx`

**Analog:** `src/components/ui/toast.tsx` inteiro.

**`ToastView` com pausa em hover/foco e timer** (`toast.tsx:36-66`) — copiar a lógica de `remaining`/`paused`:

```tsx
function ToastView({ item, leaving, onDismiss }: ToastViewProps) {
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const paused = hovered || focused
  const remaining = React.useRef(item.durationMs)
  React.useEffect(() => {
    if (paused || leaving) return
    const startedAt = Date.now()
    const timer = setTimeout(onDismiss, remaining.current)
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt)) }
  }, [paused, leaving, onDismiss])
```
(`Date.now()` é permitido em `src/`; a proibição vale só em `shared/core`.)

**Fila FIFO e contêiner** (`toast.tsx:81-99, 122-126`): `show(message, options)` empilha `ToastItem`; o item atual é `queue[0]`. Estender `ToastItem` (15-21) com um campo opcional `custom?: React.ReactNode` (ou `kind: 'vintem'`) e renderizar fundo `bg-surface-2 border border-border shadow-float rounded-2xl` em vez de `bg-action text-action-text` (linha 60). Manter o contêiner inferior (125) e `DEFAULT_DURATION_MS` (linha 5) para o toast comum; o do Vintém usa `durationMs: 6000`. Botão `x` com `h-11 w-11` e `aria-label="Dispensar fala do Vintém"` (o do toast comum, 69-76, é `Fechar aviso`).

**Atenção:** `useToast` (140-146) lança fora do `ToastProvider`; o `VintemProvider` fica dentro dele (App.tsx 43-59, `ToastProvider` é o mais externo).

---

### `src/contexts/VintemContext.tsx` (provider, event-driven)

**Analog:** `src/contexts/LimitAlertsContext.tsx` (provider com `useMemo`, refs de "valor mais recente", hook com `throw`).

**Estrutura do contexto e do hook** (`LimitAlertsContext.tsx:56, 226-241`):

```tsx
const LimitAlertsContext = createContext<LimitAlertsContextType | undefined>(undefined)
...
const value = useMemo<LimitAlertsContextType>(
  () => ({ alerts, visible, unread, loaded, markRead, markAllRead, evaluate, rekeyForSalaryDay }),
  [alerts, visible, unread, loaded, markRead, markAllRead, evaluate, rekeyForSalaryDay]
)
return <LimitAlertsContext.Provider value={value}>{children}</LimitAlertsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLimitAlerts() {
  const context = useContext(LimitAlertsContext)
  if (context === undefined) {
    throw new Error('useLimitAlerts must be used within a LimitAlertsProvider')
  }
  return context
}
```

**Ref do valor mais recente sem recriar callbacks** (`LimitAlertsContext.tsx:116-120`):

```tsx
const latest = useRef({ now, personConfigFor, categoryDefs })
useEffect(() => {
  latest.current = { now, personConfigFor, categoryDefs }
})
```

**Dependências de hooks** do provider: `useAuth` (`user.person`), `useArea` (`settings.vintemTone?.[person]`, `categoryDefs`), `useCycle` (`now`, `viewPerson`, `dataVersion`). Comentário de cabeçalho no estilo de `LimitAlertsContext.tsx:33-36` ("melhor-esforco: erro e engolido sem registrar valor nem nome").

**Anti-padrão confirmado** (RESEARCH): não refazer `useCycleBudget` no provider; os fatos entram por quem já tem a `view` (Home) ou por props. Reação por barramento externo, sem `setState` por quadro. Evento de lançamento: payload montado no `LaunchSheet`.

---

### `src/hooks/useReducedMotion.ts` (hook, store externo)

**Analog:** `src/hooks/useNow.ts` (completo):

```ts
import { useMemo, useSyncExternalStore } from 'react'

export function useNow(intervalMs = 60_000): Date {
  const tick = useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, intervalMs)
      return () => clearInterval(id)
    },
    // Snapshot truncado ao intervalo: número estável dentro do mesmo intervalo.
    () => Math.floor(Date.now() / intervalMs) * intervalMs
  )
```
Trocar por `matchMedia('(prefers-reduced-motion: reduce)')` (RESEARCH "useReducedMotion", três argumentos incluindo o snapshot de servidor `() => false`). As leituras avulsas atuais **não são para refatorar**: `NavRail.tsx:46-48` e `useSectionReveal.ts:6-8`.

---

### `src/components/settings/VintemToneCard.tsx` (component, CRUD de configuração)

**Analogs:** `NotificationsCard.tsx` (estrutura, `readOnly`, `Notice` de falha, `show` de toast) e `segmented-control.tsx:40-57` (teclado).

**Imports e constantes** (`NotificationsCard.tsx:1-14`):

```tsx
import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Notice } from '@/components/ui/notice'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from '@/components/settings/SettingsCard'

const READ_ONLY_HINT = 'Volte ao seu perfil para editar'
const SAVE_FAILED = 'Não foi possível salvar. Confira a conexão e tente de novo.'
```
Texto de falha do tom é **diferente**: "Não foi possível salvar o tom. Confira a conexão e tente de novo." (UI-SPEC S6). Ícone `MessageCircle` de `lucide-react`.

**Cartão e linha com fundo `surface-2`** (`NotificationsCard.tsx:70-81`):

```tsx
<SettingsCard id="notificacoes" icon={Bell} title="Notificações" subtitle="Vencimentos e limites">
  <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 py-1 pl-4 pr-2">
```
`SettingsCard` (`SettingsCard.tsx:20-41`) já dá âncora `id`, `data-section-title` focável e legenda: usar `id="vintem"`, `title="Vintém"`, `subtitle="Tom das falas"`.

**Teclado do radiogroup** (copiar de `segmented-control.tsx:40-57`, trocando `role="tab"` por `role="radio"` + `aria-checked`, e `tabIndex={selected ? 0 : -1}`):

```tsx
const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
  const last = options.length - 1
  let target: number | null = null
  if (e.key === "ArrowRight") target = activeIndex >= last ? 0 : activeIndex + 1
  else if (e.key === "ArrowLeft") target = activeIndex <= 0 ? last : activeIndex - 1
  else if (e.key === "Home") target = 0
  else if (e.key === "End") target = last
  if (target === null) return
  e.preventDefault()
  move(target)
}
```
Acrescentar `ArrowDown`/`ArrowUp` (lista vertical).

**Salvar ao tocar, reverter na falha** (diferente do padrão "botão salvar"): estado otimista local + `try { await updateVintemTone(person, tone); show(\`Tom do Vintém: ${nome}\`) } catch { revert; setFailed(true) }`, com `readOnly` desabilitando como em `NotificationsCard.tsx:79` (`disabled={readOnly}`) e `aria-disabled="true"` nas linhas. Ressincronização com `settings` no estilo `NotificationsCard.tsx:35-43` (comparar com o valor anterior durante a renderização).

**Chip "padrão":** `src/components/ui/chip.tsx` (`tone="neutral"`, sem `onClick` = `span` estático).

---

### `AreaContext.tsx` + `settings.service.ts` + `types/index.ts` (`updateVintemTone`)

**Contexto — copiar `updateNotifications`** (`AreaContext.tsx:183-194`) e acrescentar na interface (36-38) e no `value` (207-226):

```tsx
const updateNotifications = async (
  partial: Partial<Pick<Settings, 'notificationsEnabled' | 'daysBeforeDueDate'>>
) => {
  assertReady()
  try {
    await updateSettings(partial)
    setSettings(prev => ({ ...prev, ...partial }))
  } catch (error) {
    console.error('Error updating notifications')
    throw error
  }
}
```
(`assertReady` em 98-100 é obrigatório antes de gravar; o `console.error` não registra valores.)

**Serviço — caminho pontilhado por pessoa, ramo MOCK com mescla manual** (`settings.service.ts:60-82`): o MOCK usa `mSetDoc` raso, então montar o objeto aninhado à mão; o Firestore usa `updateDoc`/`transaction.update` com `['vintemTone.' + person]`; **não mencionar `ownerId` em `updateDoc`** (guarda `owner-queries.test.js:136-141`):

```ts
if (MOCK) {
  // mSetDoc faz mescla rasa: o objeto aninhado e montado a mao para nao apagar o no do parceiro.
  const existing = mGetDoc<Settings>(DOC_KEY) ?? { id: SETTINGS_DOC_ID, ...DEFAULT_SETTINGS }
  mSetDoc(DOC_KEY, { ...existing, personConfig: { ...existing.personConfig, [person]: next } })
  return next
}
...
transaction.update(settingsRef(), { ['personConfig.' + person]: next })
```

**Tipos** (`types/index.ts:53-68`): acrescentar após `personConfig?`:
`vintemTone?: Partial<Record<PersonType, 'suave' | 'direto' | 'sem-filtro'>>`. `DEFAULT_SETTINGS` (173-184) **não muda** (ausente = `'sem-filtro'`; `getSettings` tolera parcial, `settings.service.ts:38-39`). `Transaction` (6-20) ganha `source?: 'bank'`.

---

### `src/pages/VintemTestPage.tsx` (page, request-response)

**Analog de layout:** `src/pages/SettingsPage.tsx`:

```tsx
const header = (
  <div>
    <h1 className="font-display text-[28px] font-bold leading-tight">Configurações</h1>
    <p className="text-xs font-normal text-muted-foreground">Ciclo, categorias, bancos e aparência</p>
  </div>
)
...
<div className="mx-auto w-full max-w-[480px] space-y-4 md:max-w-[560px]">
```
Cartões: `<section className="rounded-card bg-card p-4">`.

**`Select`** (`BillFormSheet.tsx:212-225`): `<Select id=... value={...} onChange={(e) => ...}><option .../></Select>`.
**`Switch` em linha** (`NotificationsCard.tsx:71-81`): `<Label htmlFor=... className="font-normal">` + `<Switch id=... checked onCheckedChange />`.
**`SegmentedControl`** (`segmented-control.tsx:5-22`): `options: {value,label}[]`, `ariaLabel`.
**Slider "Limite gasto":** **sem analog** (não há `type="range"` em `src/`); usar `<input type="range">` nativo com `min-h-11`, rótulo e valor Sora 16/700. Ver "No Analog Found".

**Rota:** `App.tsx:26-34`:

```tsx
<Route path="/casal" element={<CouplePage />} />
```
acrescentar `<Route path="/vintem-teste" element={<VintemTestPage />} />` na lista e **não** adicionar nada a `NavRail.tsx` (a lista de destinos termina em `{ href: '/porquinho', ... }`, ~linha 35-37; `isActive` em 40-43). `noindex`: `useEffect` que cria `<meta name="robots" content="noindex">` e remove no cleanup. A página não lê nem grava dado do usuário.

---

### `src/pages/DashboardPage.tsx` (integração Home)

Três pontos, todos dentro do ramo já existente:

1. `ArcGauge` (114-118), hoje sem `children`:
```tsx
<ArcGauge
  restPct={view && !noIncome ? view.restPct : null}
  tone={suppressed ? 'neutral' : arcToneFor(view?.rhythmLevel ?? null)}
  loading={loading}
/>
```
passar `<VintemSlot />` como filho (o `PiggyBank` do `ArcGauge` continua sendo o padrão, `ArcGauge.tsx:77`).
2. Balão após a pílula (156-160), dentro de `view && !noIncome && ...`, antes de `<StaleNotice placement="below" />` (169):
```tsx
{!past && (
  <div className="mt-2">
    <RhythmPill level={view.rhythmLevel} suppressed={suppressed} />
  </div>
)}
```
3. Fatos do humor já presentes no escopo da página: `noIncome` (91), `suppressed` (92), `past` (93), `view.rhythmLevel`, `view.spend.rows`, e `readOnly` (37, de `useReadOnly`).

---

### `src/components/limits/LimitRow.tsx` (integração, `LimitsList`)

Inserir `<VintemInlineRow />` entre o cabeçalho e as linhas. Trecho (`LimitRow.tsx:222-237`):

```tsx
<section id={id} aria-labelledby={titleId} className="scroll-mt-4 rounded-card bg-card p-4">
  <div className="flex items-center justify-between gap-3">
    ...
  </div>

  {rows.length === 0 && (
```
Condição: `rows.length > 0 && !neutralOk` (a prop `neutralOk`, linhas 196/210, já significa "dado velho"; ver `toneFor`, linhas 25-29). Humor da linha = categoria mais crítica na ordem que o núcleo já entrega em `rows`.

---

### `src/components/launcher/LaunchSheet.tsx` (disparo da reação)

**Ponto exato** (`LaunchSheet.tsx:204-206`):

```tsx
bumpData()
onClose()
toast.show(message, { icon: Check, detail })
```
Inserir `vintem.onLaunched({ kind, categoryId, cents, view })` **depois de `bumpData()`** (a gravação já foi confirmada pelo `await withTimeout(...)`, 158-170 e 176-191). Variáveis disponíveis no escopo: `view` (prop de `LaunchForm`, linha 83), `tab` (93), `cents` (94), `category` (112-115), `piggyMode` (96). `view` é a visão **anterior** ao gasto: a reação se calcula com `row.spentCents + cents` (RESEARCH Pattern 7). Importar o hook no estilo das linhas 15-18 (`import { useVintem } from "@/contexts/VintemContext"`; esse arquivo usa aspas duplas).
`GoalsPage.tsx:81-85`: após `await contribute(...)`/antes de `show('Aporte salvo')`, emitir `meta-batida` se `contributing.currentAmount + amount >= contributing.targetAmount`.

---

### `src/hooks/useCycleBudget.ts` (expor `transactions`)

Retorno atual (`useCycleBudget.ts:94-100`):

```ts
return {
  view,
  cycle,
  loading: enabled && current === null && error === null,
  error,
  refetch: fetchInputs,
}
```
Acrescentar `transactions: current?.transactions ?? null` (mudança aditiva; `current` está na linha 74). Nenhum consumidor existente quebra.

---

### `src/index.css` (bloco `.vt` com paleta derivada do token de ação)

**Analog:** `@theme inline` (linhas 5-124) e `@layer base` (127+). `--color-action: #4c513b` (44), `--color-action-text: #fbf6ea` (45), `--shadow-float` (120), `--radius-card: 22px` (122). Motivo do bloco plano em vez de `@theme inline`: variável Tailwind v4 só é emitida se usada (RESEARCH Pitfall 3). Padrão:

```css
@layer base {
  .vt {
    --vintem-body: var(--color-action);
    --vintem-snout: color-mix(in srgb, var(--color-action) 85%, #fff);
    --vintem-ink: color-mix(in srgb, var(--color-action) 55%, #000);
    ...
  }
}
```
CSS **não** é varrido pela guarda de hex (`listSrc` só pega `ts|tsx|js|jsx`, `helpers/phase3-1.js:35`), mas `test/static/helpers/palette.js:23-27` lê `index.css` por regex `--color-*: #hex` e por `:root {` — manter `.vt` fora de `@theme` e fora de `:root` evita contaminar o mapa de tokens da guarda de contraste. `prefers-reduced-motion` já zera transições CSS (334-340 e 366+); o laço JS lê o flag por conta própria.

---

### `scripts/ux-audit/vintem.mjs` (test, CDP)

**Analog:** `scripts/ux-audit/calendar-collapse.mjs` (copiar quase integralmente) + `cdp.mjs`.

**Cabeçalho e contrato de saída** (`calendar-collapse.mjs:1-13`): Vite em MOCK só em 127.0.0.1, Chrome via CDP, perfil temporário removido, "nada e lido de .env*", códigos 0/1/2. Trocar `PORT = 5198` por outra porta (ex.: 5199) e `ROUTE = '/vintem-teste?test&w=360'`.

**Sobe o Vite em MOCK** (`calendar-collapse.mjs:39-94`): `spawn('npm', ['run','dev','--','--host','127.0.0.1','--port',String(PORT),'--strictPort'], { env: { ...process.env, VITE_USE_EMULATOR:'true', BROWSER:'none' }, detached:true })` + `stop()` com SIGTERM/SIGKILL. **Semear o localStorage** (96-103) com `buildSeed('full')` de `scripts/ux-audit/seed.mjs:262` via `Page.addScriptToEvaluateOnNewDocument`.

**Navegação e espera de "pronto"** (`calendar-collapse.mjs:162-180`) — trocar a condição de pronto por `window.__done === true` (o autoteste do sketch seta `window.__done=true` e `document.title`, linhas 712-713) e ler `#selftest`:

```js
async function navigate(page, url) {
  const blank = page.waitFor('Page.loadEventFired', 15000)
  await page.send('Page.navigate', { url: 'about:blank' })
  await blank
  const loaded = page.waitFor('Page.loadEventFired', 30000)
  await page.send('Page.navigate', { url })
  await loaded
  ...
```

**Coletor de exceções e `console.error`** (445-454) e `check(name, ok, detail)` com linha JSON (206-210). **Encerramento** (105-113, 429-481): `cleanups` em `SIGINT/SIGTERM`, `finally` fecha página/Chrome/Vite, `process.exit` com 0/1/2. **Acrescentar** `console.log(\`FALHAS ${failed.length}\`)` (UI-SPEC "terminando em FALHAS 0").

**API do CDP** (`cdp.mjs`): `launchChrome()` (34-106, usa `process.env.CHROME_BIN || '/usr/bin/google-chrome'`), `connect(wsUrl)` -> `{ send, evaluate, on, waitFor, close }` (109-219). Viewport: `Emulation.setDeviceMetricsOverride({ width: 360, height: 640, deviceScaleFactor: 2, mobile: true })` e `Emulation.setTouchEmulationEnabled`.

**Teste de "repouso sem re-render"** — copiar `observeIdle(ms)` (148-160) com `MutationObserver`. **Cuidado:** o Vintém escreve atributos SVG por quadro, então a verificação de "sem re-render por quadro" tem que ignorar mutações de atributo dentro do `<svg>` do Vintém e contar apenas `childList` fora dele (ou usar o contador de commits do `Profiler`, como o RESEARCH prevê).

**Selftest em si (`src/lib/vintem/selftest.ts`)** — porta do sketch 020:
- helpers `ok(n, c, x)` e `info` (527-528), `tmp(state)` host invisível (530).
- molas assentam < 3 s e delta grande não explode (540-543).
- máscara com preenchimento de buracos (659-663), componentes conexas (664), distinção por pares a 84 e 48 px com limiar 12 e controle negativo (665-689), giro sem vazamento (690-702), orelhas ancoradas por `isPointInFill` (703-708), fechamento `FALHAS` (709-713).
- rasterizador que copia estilos **computados** para um clone do SVG (433-440: `['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity','display']`).
- Mudanças obrigatórias: fundo da máscara `b=[251,248,242]` e `BGC='#fbf8f2'` (657, 659) vêm do token computado (guarda de hex), e o limiar 150 tem de ser revalidado com o corpo oliva (RESEARCH Pitfall 4); incluir as verificações novas do UI-SPEC (neutro assimétrico, triste >= 92%, acessórios no perfil > 12 px, largura >= 50% e área >= 70% no giro).

---

### `scripts/vintem/review-sheet.mjs` (utility, file-I/O)

**Analog parcial:** `scripts/ux-audit/seed.mjs:1-5` (script Node ESM que importa `../../shared/core/*.js` por caminho relativo e só usa dado fictício). Importar `PHRASES`, `SITUATIONS`, `TONES` de `../../shared/core/vintemPhrases.js` e `formatMoney`/`plural` do núcleo para preencher os exemplos; escrever `.planning/phases/04-mascote-vint-m/04-PHRASES-REVIEW.md` com `node:fs/promises`. Cabeçalho de comentário em português sem acento, no estilo de `calendar-collapse.mjs:2-8`.

---

### `test/static/phase4-*.test.js` (guardas estáticas)

**Analog:** `test/static/phase3-1-savings.test.js` + `test/static/helpers/phase3-1.js`.

**Cabeçalho padrão** (`phase3-1-savings.test.js:1-13`):

```js
// Guarda estatica do Porquinho da Fase 3.1 (variante B do sketch 014, D-18, UX-07, UX-08).
// Rodar: node --test test/static/phase3-1-savings.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { code, read, scaleProblems, touchProblems } from './helpers/phase3-1.js'

const PAGE = 'src/pages/SavingsPage.tsx'
const FILES = [PAGE, BANK, HISTORY, FORM]
```

**Helpers disponíveis** (`helpers/phase3-1.js`): `ROOT` (8), `read` (11), `exists` (14), `code` (17-21, remove comentários de JSX, bloco e linha), `assertIncludes(file, texts)` (24-29), `listSrc(dir)` (32-40), `scaleProblems(files)` (53-67), `touchProblems(files)` (75-84). Fecham a guarda de escala/emoji/HTML bruto/alvo de toque:

```js
test('escala tipografica e alvos de toque limpos', () => {
  assert.deepEqual(scaleProblems(FILES), [])
  assert.deepEqual(touchProblems(FILES), [])
```

**Ordem de cartões** (`phase3-settings-categories.test.js:44-57`) — para `phase4-settings.test.js`: `<AppearanceCard` < `<VintemToneCard` < `<NotificationsCard` por `indexOf`:

```js
const order = ['<CycleIncomeCard', ..., '<AppearanceCard', '<NotificationsCard'].map((tag) => {
  const at = src.indexOf(tag)
  assert.ok(at >= 0, `SettingsPage sem ${tag}`)
  return at
})
assert.deepEqual(order, [...order].sort((a, b) => a - b), 'os seis cartoes estao fora da ordem do UI-SPEC')
```
(o texto "seis cartoes" desse teste existente pode ser atualizado por clareza; a ordem relativa não quebra.)

**Guarda da Home** — estilo de `phase3-home-components.test.js:29-55` (`for (const needle of [...]) has(src, needle, ARC)`). Itens do `phase4-home.test.js`: `ArcGauge.tsx` ainda contém `PiggyBank`; `DashboardPage.tsx` contém `VintemSlot` e `VintemBalloon`; região viva `role="status"` e `aria-live="polite"` montada; SVG `aria-hidden`; nenhum `innerHTML`/`dangerouslySetInnerHTML` em `src/components/vintem` e `src/lib/vintem`.

**`phase4-engine.test.js`:** nenhum `useState` ligado a rAF em `src/components/vintem`; `src/lib/vintem/*.ts` sem hex literal; `shared/core/vintem*.js` sem `Math.random` (a pureza já cobre `Date.now`/`new Date()`).

**`phase4-testpage.test.js`:** rota registrada (`/<Route\s+path="([^"]+)"/g` como em `phase3-final.test.js:37`), string `vintem-teste` ausente de `NavRail.tsx`, `SettingsPage.tsx` e `ShortcutRow.tsx`; `noindex`; rótulos do contrato ("Teste do Vintém", "Limite gasto", "Movimento reduzido"...).

**Edição obrigatória de guarda existente** — `phase3-final.test.js:35-50`: título "9 rotas" -> "10 rotas" e `'/vintem-teste'` na lista `expected`.

---

### `src/services/vintemInsights.service.ts` (opcional, plano separável no fim da fase)

**Analog:** `src/services/limitAlerts.service.ts` (copiar o esqueleto, inclusive o ramo MOCK).

**Imports e escopo de dono** (`limitAlerts.service.ts:1-16`):

```ts
import { collection, doc, getDocs, limit, orderBy, query, runTransaction, Timestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MOCK, mList, mSave } from '@/lib/mockStorage'
import { ownerId, ownerScope } from '@/lib/scope'
```

**Leitura com `...ownerScope()` primeiro** (56-62) — mas **sem `orderBy`** (um `orderBy` exigiria índice composto e mexeria no teste "exatamente 19" de `firestore-config.test.js:47-49`; RESEARCH Pitfall 8): filtrar por igualdades (`ownerScope()`, `person`, `cycleKey`) e ordenar no cliente.

```ts
const q = query(collection(db, COL), ...ownerScope(), where('person', '==', person), ...)
```

**Gravação idempotente por id determinístico, com `ownerId: ownerId()`** (98-115):

```ts
return runTransaction(db, async (transaction) => {
  const ref = doc(db, COL, draft.id)
  const existing = await transaction.get(ref)
  if (existing.exists()) return false
  transaction.set(ref, { ownerId: ownerId(), person: draft.person, ..., createdAt: Timestamp.now() })
  return true
})
```
**Ramo MOCK** (77-96): `mList`/`mSave`, datas em string ISO. O documento guarda **só** ids, centavos, chaves de ciclo e de dia, tipo e severidade (comentário de cabeçalho em 18-22 define o contrato: "nunca nome de categoria, descricao de lancamento nem nome de loja").

**Guardas que passam a exigir mudança:** `owner-queries.test.js:167` (11 -> 12), `test/rules/matrix.test.js:32` (`CLIENT_COLS`), `firestore.rules` (`clientCollections()`; guarda `phase3-final.test.js:93-98` confere só `limitAlerts`), `seed.mjs:7-18` (`COLLECTIONS`). `npm run test:rules` **não roda neste ambiente** (sem Java; RESEARCH Pitfall 12).

---

## Shared Patterns

### Núcleo puro sem relógio e sem pacote
**Fonte:** `shared/core/purity.test.js:12-51` e `shared/core/alerts.js:1-7`.
**Aplicar a:** os 7 módulos `shared/core/vintem*.js`, `insights.js`, `phrasePicker.js`.
Regras: imports só relativos (`/^\.\.?\//`, linha 36), `Date.now(` proibido (43), `new Date()` sem argumento proibido (49). Acaso e tempo entram por `rand` e `now`/`dt`. Comentários em português sem acento nos `.js` do núcleo; textos de interface (frases do banco) levam acento.

### Testes do núcleo em UTC e Tokyo
**Fonte:** `package.json` (`test:core:tz`: `TZ=UTC node --test "shared/**/*.test.js" && TZ=Asia/Tokyo node --test "shared/**/*.test.js"`) e `time.test.js:53-57`, `series.test.js:100-111`, `cycle.test.js:99-100`.
**Aplicar a:** `insights.test.js` e `vintemMood.test.js` (qualquer coisa com dia/ciclo). Datas como ISO fixos e `new Date('...Z')`; nunca `new Date()`.

### Dinheiro, plural e dia (reuso do núcleo)
**Fonte:** `shared/core/format.js` (`formatMoney` ~55-63, `plural` 219-221), `shared/core/ledger.js` (`toCents`), `shared/core/time.js` (`zonedParts`, `DEFAULT_TZ`), `shared/core/dayKey.js:33-40` (`dayKeyOf`), `shared/core/cycle.js` (`daysBetweenParts`, `cycleOf`).
**Aplicar a:** `insights.js`, `phrasePicker.js`, `vintemMood.js`. Centavos inteiros; nunca float nem `date-fns` no detector.

### Escala tipográfica 12/16/28/56, pesos 400/700, sem emoji, sem HTML bruto, alvos >= 44px
**Fonte:** `test/static/helpers/phase3-1.js:42-84` (`scaleProblems`, `touchProblems`).
**Aplicar a:** todos os `.tsx` novos (`src/components/vintem/*`, `VintemToneCard.tsx`, `VintemTestPage.tsx`) e `src/lib/vintem/*.ts`. Usar só `text-xs`, `text-base`, `text-[28px]`, `font-normal`, `font-bold`; proibido `text-sm|lg|xl|2xl`, `font-medium|semibold`, `h-7 w-7`, `h-8 w-8`, `size="iconSm"`.

### Cor só por token (sem hex literal em `src/**`, sem `text-white`/`bg-black` opaco)
**Fonte:** `test/static/palette-contrast.test.js:40-50`.
**Aplicar a:** toda a arte e a UI do Vintém. Cores `--vintem-*` em `src/index.css` (`.vt`), derivadas de `var(--color-action)`; corpo = `var(--vintem-body)`.

### Foco visível e botão tocável
**Fonte:** `src/components/limits/LimitRow.tsx:58` e `src/components/ui/switch.tsx:21` (alvo `h-11 w-11`, `focus:outline-none`, anel `ring`).
**Aplicar a:** `VintemSlot`, `VintemInlineRow`, `VintemBalloon` (botão dispensar), opções de tom, botões da página de teste.

### Somente leitura e `assertReady`
**Fonte:** `src/hooks/useReadOnly.ts` (`{ readOnly, partnerName, guard }`) e `AreaContext.tsx:98-100` (`assertReady`).
**Aplicar a:** `VintemContext` (somente leitura = neutro e calado, UI-SPEC P-10), `VintemToneCard` (linhas `aria-disabled`, legenda `Volte ao seu perfil para editar`), `updateVintemTone`.

### Dado velho do banco = neutro e calado
**Fonte:** `src/hooks/useBankFreshness.ts` (`suppress`, `hasConnections`) e `view.verdictSuppressed` (usado em `DashboardPage.tsx:92`); `StaleNotice.tsx` (reuso da mesma regra de supressão do núcleo `shared/core/bankStatus.js`).
**Aplicar a:** `vintemMood.js` (fato `suppressed`), `VintemSlot`, `VintemBalloon`, `VintemInlineRow`.

### Erro de carga e "Tentar de novo"
**Fonte:** `DashboardPage.tsx:53-70` (`Notice tone="danger" icon={CircleAlert} ... action={<Button ... Tentar de novo/>}`).
**Aplicar a:** `VintemEmpty pose="surpreso"` acima dos `Notice` existentes (não alterar o texto).

### Escopo de dono em serviços Firestore
**Fonte:** `test/static/owner-queries.test.js:105-150` (`QUERY`, `ADD_DOC`, `SET_DOC`, `TX_SET`, `UPDATE_DOC`) e `limitAlerts.service.ts`.
**Aplicar a:** apenas `vintemInsights.service.ts` (opcional). `query(` com `collection(...)` e `...ownerScope()` como 2 primeiros argumentos; toda gravação com `ownerId: ownerId()`; `updateDoc` nunca menciona `ownerId`; importar de `@/lib/scope`.

### Texto sempre como filho React; fala nunca truncada
**Fonte:** `src/components/ui/notice.tsx` ("Conteudo sempre como texto React") e `scaleProblems` (`RAW_HTML`).
**Aplicar a:** `VintemBalloon`, `VintemToast`, `VintemInlineRow`. Nada de `line-clamp` no balão (UI-SPEC: nunca truncar; `toast.tsx:66` usa `line-clamp-2`, **não copiar** para o Vintém).

## No Analog Found

Arquivos sem análogo próximo no repositório (o planejador usa o sketch 020 e o RESEARCH):

| Arquivo | Role | Data Flow | Fonte a usar |
|---------|------|-----------|--------------|
| `shared/core/vintemModel.js` | model | event-driven (tempo simulado) | `.planning/sketches/020-vintem-verde/index.html` linhas 109-123, 222-290, 386-431; RESEARCH Pattern 1 |
| `src/lib/vintem/view.ts` | utility (escritor DOM imperativo) | streaming por quadro | sketch linhas 291-380; RESEARCH Pattern 2 e 3. Não há código imperativo de DOM em `src/` |
| `src/lib/vintem/selftest.ts` (+ `IntersectionObserver` em `world.ts`) | test / service | batch / event-driven | sketch linhas 520-712. `IntersectionObserver` não é usado em `src/` hoje |
| Controle deslizante "Limite gasto" | component | request-response | nenhum `type="range"` em `src/`; `<input type="range">` nativo com rótulo e `min-h-11` |

(As quatro linhas contam como 3 arquivos sem analog + 1 controle; `world.ts` tem analog parcial.)

## Metadata

**Analog search scope:** `shared/core/`, `src/components/{dashboard,limits,launcher,settings,ui,layout}`, `src/contexts/`, `src/hooks/`, `src/services/`, `src/pages/`, `src/lib/`, `src/types/`, `src/index.css`, `src/App.tsx`, `test/static/` (+ `helpers/`), `test/rules/`, `scripts/ux-audit/`, `.planning/sketches/020-vintem-verde/`.
**Arquivos lidos:** 58 (todos com `git ls-files` não vazio).
**Pattern extraction date:** 2026-11-19
