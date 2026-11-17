# Architecture Research

**Domain:** App de finanças pessoais (casal) em PWA, com sync bancária Open Finance, alertas push, mascote e IA gratuita
**Researched:** 2026-11-17
**Confidence:** MEDIUM-HIGH (código existente lido: HIGH; comportamento do MeuPluggy no cartão e integração FCM + vite-plugin-pwa: MEDIUM, precisam de spike)

> Escopo: como as features novas se encaixam no sistema que já existe. Tudo abaixo é baseado no código real de `src/`, `server/src/` e `firestore.rules`.

## 1. O que existe hoje (fatos que condicionam o design)

| Fato observado no código | Consequência arquitetural |
|---|---|
| Frontend lê Firestore **direto** (`services/*.service.ts`), com ramo `MOCK` (localStorage) em cada função. Hooks fazem `getDocs` + `refetch` após cada escrita; **não há `onSnapshot`** (só `subscribeBankConnections`). | Cálculos de limite/"pode gastar" devem ser funções puras sobre dados já carregados; a Home pode combinar `useTransactions` + `useFixedExpenses` + settings sem nova camada de dados. Sync em tempo real não é pré-requisito. |
| `Transaction` guarda `category` como **nome** (string), `person: 'ele'\|'ela'`, e não tem campo de dono, cartão, fatura nem vínculo com conta fixa. `Settings.categories` é `string[]`. | Renomear categoria quebra histórico. Limites devem ser indexados por nome de categoria (compatível) e por pessoa. Cartão e vínculo fixo exigem **campos novos opcionais** (ausente = comportamento atual). |
| `getAccumulatedBalance` soma **todas** as transações da pessoa (inclui compras de cartão, pois `classify.js` importa compras CREDIT como `saida`). | O saldo da conta hoje já mistura cartão com conta. Precisa de "visões" do ledger (ver §5, Pattern 2). |
| Marcar conta fixa como paga grava `fixedExpensePayments`, **não cria transação**. Um Pix de aluguel importado do banco vira transação em Moradia **e** a conta fixa continua "pendente". | Risco de dupla contagem em "Fixos" vs "Dia a dia". "Fixos ficam fora do limite" exige o vínculo `Transaction.fixedExpenseId` (ver §4). |
| Servidor: Express 5 + firebase-admin + `pluggy-sdk`; auth de `/api/*` por **uma chave compartilhada** `x-api-key`, e o cliente a embute como `VITE_BANK_API_KEY` (fica no bundle, ou seja, é pública). Sync agendado por `setInterval` (6 h) no processo; `syncAll` tem single-flight. | Processo é longevo (bom para agendador). Mas a chave não identifica usuário: endpoints novos (push, IA) precisam de **ID token do Firebase** (`verifyIdToken`), não dessa chave. |
| `sync.js` é **insert-only**: `if (existing.has(tx.id)) continue`. Compras PENDING do cartão entram como importadas e nunca são atualizadas. `getAppCategories` lê `settings/main` global; `PEOPLE = ['ele','ela']` fixo. | Cartão exige reconciliação (upsert por fatura), não insert-only. Multiusuário exige tirar `settings/main`, `PEOPLE` e `bankConnections` do modo global. |
| Login: `AuthContext` aceita usuário/senha **local** (env) sem sessão Firebase, ou e-mail/senha Firebase. Regras: `allow read, write: if true`. | Enquanto o login local existir, não há `request.auth`: não dá para fechar regras nem verificar token no servidor. Login Firebase precisa virar o único caminho **antes** de push/IA/regras. |
| `firebase.json` já tem `**/*.js` com cache `immutable` de 1 ano; `.firebaserc` tem alias `amigo` → `financias-xrd`; `build:amigo` usa `.env.amigo`. | Service worker precisa de header `no-cache` próprio. O amigo hoje roda como **deploy separado do mesmo código** em outro projeto Firebase: a "migração multiusuário" é mover dados entre projetos. |
| `server/test` usa `node --test`; regras puras já vivem em `classify.js` (sem I/O). Frontend não tem runner de testes. | Padrão a seguir: núcleo puro testável. Falta runner no frontend (Vitest) ou compartilhar o núcleo com o servidor. |

## 2. Arquitetura recomendada

```
┌───────────────────────────────────────────────────────────────────────────┐
│ CLIENTE (Vite SPA / PWA, Firebase Hosting: coinki.web.app)                 │
│                                                                            │
│  Pages: Home | Limites | Revisão | Cartão | Casal | Mascote(teste) | Config│
│     │                                                                      │
│  hooks (useBudget, useReviewQueue, useAlerts, useVintem, useCards)         │
│     │                       ▲ lê/escreve                                   │
│  ┌──┴──────────────┐   ┌────┴────────────────────────┐                    │
│  │ core/ (PURO)    │   │ services/*.service.ts        │                    │
│  │ budget, ledger, │   │ (Firestore client + MOCK)    │                    │
│  │ speech, alerts, │   └────┬────────────────────────┘                    │
│  │ review-plan     │        │                          sw.ts (1 só SW):    │
│  └─────────────────┘        │                          precache + FCM bg   │
├─────────────────────────────┼─────────────────────────────────────────────┤
│                             ▼                                              │
│   FIRESTORE  (transactions, bankImports, bankConnections, settings,        │
│   fixedExpenses..., NOVAS: cards, bills, alerts, pushTokens, vintemCache)  │
│                             ▲                                              │
├─────────────────────────────┼─────────────────────────────────────────────┤
│ SERVIDOR (Express/Railway, firebase-admin, processo longevo)               │
│                             │                                              │
│  sync.js ──► classify.js    │   scheduler (cron BRT) ──► alerts-engine ──► │
│  (Pluggy → bankImports/tx   │                              ▲   │           │
│   + cards/bills)            │   core/ (MESMO código puro) ─┘   ▼           │
│        │                    │                          push.js (FCM admin) │
│        └── pós-sync ────────┴──► alerts-engine                             │
│                                                                            │
│  POST /api/push/register   POST /api/vintem/comment ──► llm/provider.js    │
│  (Bearer: Firebase ID token)       (cache + quota)        (LLM grátis)     │
└───────────────────────────────────────────────────────────────────────────┘
         Pluggy/MeuPluggy  ◄── sync.js            FCM ──► SW no celular
```

Ideia central: **um núcleo puro (`core/`) que roda no cliente e no servidor**, com Firestore como único ponto de encontro. Cliente e servidor nunca chamam um ao outro para obter números; eles recalculam a partir dos mesmos dados. O servidor só é chamado para o que o cliente não pode fazer sozinho (push agendado, chave do LLM, sync Pluggy).

## 3. Fronteiras de componentes

| Componente | Responsabilidade | Fala com | Não faz |
|---|---|---|---|
| `core/budget` (puro) | `computeMonthBudget(input) → {limitTotal, spentByCategory, remaining, dailyAllowance, pace, monthInOneAccount}`; "pode gastar", ritmo, projeção. | Nada (só dados em memória). Usado por Home, Limites, Casal, alerts-engine, speech. | I/O, datas implícitas (recebe `today` e fuso). |
| `core/ledger` (puro) | Seletores de visão: `countsForLimit(tx)`, `countsForCashBalance(tx)`, `isFixedLinked(tx)`. | `core/budget`. | |
| `core/alerts` (puro) | `evaluateThresholds(prevState, budget) → Alert[]` (50/80/100 %, vencimento, estouro); chave determinística `ownerId_yyyymm_categoria_limiar`. | alerts-engine (servidor) e `useAlerts` (cliente). | Enviar nada. |
| `core/speech` (puro) | `speak(ctx) → {state, phrase}` determinístico; `ctx` = só agregados. Estados: neutro/feliz/triste/bravo/sonolento/surpreso. | `Vintem` (UI), `/api/vintem/comment` (como fallback). | Chamar LLM. |
| `core/review` (puro) | `planResolution(import, action, candidates) → {writes[]}` para importar/ignorar/vincular. | `review.service` executa os writes em `writeBatch`. | |
| `components/mascot/Vintem*` | SVG animado + balão; recebe `{state, phrase}` por props. Página `/vintem-teste` com controles. | `useVintem`. | Calcular estado. |
| `services/*` (existentes) | I/O Firestore; ganha `scope()` (ver §4). | Firestore. | Regras de negócio novas. |
| `server/sync.js` + `classify.js` | Pluggy → `bankImports` / `transactions`; agora também `cards`/`bills`. | Pluggy, Firestore. | Decidir alerta. Chama `alerts-engine` **depois** de gravar. |
| `server/alerts-engine.js` | Lê mês do dono, roda `core/alerts`, grava em `alerts` com `create()` (idempotente), dispara push. | Firestore, `push.js`. | |
| `server/scheduler.js` | Ticks em `America/Sao_Paulo` (resumo diário, contas a vencer). Substitui o `setInterval` do sync. | alerts-engine, sync. | |
| `server/push.js` | Registro de token + envio FCM (`firebase-admin/messaging`), limpa tokens inválidos. | FCM, `pushTokens`. | |
| `server/llm/*` | Provider adapter (timeout, quota por dono/dia), cache por hash de contexto, frase pronta como reserva. | LLM externo, `vintemCache`. | Ler dados financeiros do Firestore (só recebe o `ctx` agregado). |
| `sw.ts` | Um único service worker: precache (Workbox) + `onBackgroundMessage` do FCM + clique na notificação. | FCM, Cache API. | |

### Onde o código compartilhado mora

O servidor roda Node puro (sem build) e `engines: >=20`; o cliente é TS/Vite. **Recomendação:** `shared/core/*.js` em ESM com JSDoc (`// @ts-check`), importado no cliente por alias e no servidor por cópia/pasta. Duas formas viáveis, decidir no planejamento da fase:
1. Railway com raiz no repo (não em `server/`) e `import '../../shared/core/...'`. Zero cópia.
2. Script `sync-shared` que copia para `server/src/shared/` + teste que falha se divergir.

Testes do núcleo rodam com `node --test` (já usado em `server/test`) — **não é preciso adicionar Vitest** para a lógica que importa. Vitest só se surgirem testes de componente.

## 4. Modelo de dados (mudanças)

Regra geral: campos novos **opcionais**; ausente = comportamento atual. Coleções novas já nascem com `ownerId`.

| Coleção / campo | Mudança | Notas |
|---|---|---|
| `settings/main` | + `categoryLimits: { ele: Record<categoria, number>, ela: Record<categoria, number> }`, + `categoryMeta?: Record<categoria,{icon,kind}>`, + `themeMode: 'system'\|'light'\|'dark'`, + `notificationPrefs` | Limite **por pessoa** porque a Home é individual; Casal = soma. Manter `categories: string[]` intacto. Hoje `theme` é `'light'\|'dark'`; migrar para `themeMode` sem quebrar `getCachedTheme`. |
| `transactions` | + `fixedExpenseId?`, + `cardId?`, + `billId?`, + `installment?: {n, of}`, + `ownerId` (multiusuário) | `cardId` presente ⇒ saiu do **cartão**, não da conta. `fixedExpenseId` presente ⇒ fora do "dia a dia". |
| `bankImports` | + `resolvedAt?`, `resolution?: 'imported'\|'ignored'\|'linked'` | Mantém `status`; `matchedTransactionId` continua sendo o que impede o sync de reusar o manual. |
| `cards/{id}` (nova) | `{ownerId, person, pluggyAccountId, itemId, name, creditLimit, availableLimit, closeDay, dueDay, updatedAt}` | Fonte: `account.creditData` do Pluggy (ver risco no §9). Hoje o servidor não guarda nada disso. |
| `bills/{id}` (nova) | `{ownerId, cardId, pluggyBillId?, dueDate, closeDate, total, status: 'open'\|'closed'\|'paid', paidAt?}` | Fatura aberta é **derivada** de transações PENDING sem `billId`; fechada vem de `GET /bills`. |
| `alerts/{ownerId_yyyymm_cat_limiar}` (nova) | `{ownerId, kind, person, category?, threshold?, message, createdAt, readAt?, pushedAt?}` | ID determinístico + `create()` ⇒ idempotente sob restart/duas execuções. **Mesma coleção alimenta o sino in-app** (substitui o cálculo local do `NotificationsBell` aos poucos). |
| `pushTokens/{tokenHash}` (nova) | `{ownerId, token, platform, createdAt, lastSeenAt}` | Token por dispositivo; remover ao receber `registration-token-not-registered`. |
| `vintemCache/{ownerId_hash}` (nova) | `{ownerId, phrase, state, createdAt}` | Chave = hash do `ctx` **quantizado** (percentuais em faixas de 10 %, valores arredondados) para dar cache hit. TTL por dia. |
| `bankConnections` | + `ownerId` | `PEOPLE` e `clientUserId` deixam de ser `'ele'\|'ela'` fixos (vira `${ownerId}:${person}`). |

## 5. Padrões a seguir

### Pattern 1: Núcleo puro com relógio e fuso injetados
**What:** toda função de cálculo recebe `today`/`tz` e dados; devolve valores. Sem `new Date()` interno.
**When:** budget, alerts, speech, review-plan. **Why aqui:** o mesmo cálculo roda no navegador (instantâneo) e no servidor (pós-sync/cron); o servidor está em UTC e o mês do usuário é de Brasília (o `sync.js` já tem gambiarra manual de BRT).
**Trade-offs:** assinatura maior; compensado por testes triviais.

```typescript
// shared/core/budget.js
export function computeMonthBudget({ today, tz, limits, transactions, fixedExpenses, payments }) {
  const spent = transactions.filter(countsForLimit)           // exclui fixos vinculados e pagamentos de fatura
  // → { limitTotal, remaining, byCategory, dailyAllowance, pace }
}
```

### Pattern 2: Visões do ledger sobre uma única coleção
**What:** `transactions` continua única; dois predicados definem o que conta onde.
- `countsForLimit(tx)`: `saida`, não linkada a conta fixa, **inclui cartão pela data da compra**, exclui `bankImports` de `card_payment`.
- `countsForCashBalance(tx)`: exclui `cardId`; inclui o pagamento da fatura como saída de caixa.
**Why:** é a única forma de satisfazer "gasto no cartão separado do saldo da conta" **e** "cartão conta no limite pela data da compra" sem duplicar dados. `getAccumulatedBalance` passa a usar o predicado de caixa (hoje soma tudo).

### Pattern 3: Alerta idempotente por chave determinística
**What:** `alerts.create(id)` falha se o alerta do mês/categoria/limiar já existe; só quem **criou** envia push.
**When:** disparos pós-sync e por cron. Sobrevive a restart do Railway e a execução dupla sem estado em memória.
**Trade-off:** mudar limite no meio do mês pode exigir reabrir limiares (apagar alertas do mês daquela categoria).

### Pattern 4: Stale-while-revalidate para o Vintém
**What:** a UI renderiza `speak(ctx)` na hora (frase pronta); em paralelo pede `/api/vintem/comment` com timeout curto (~2,5 s); se vier, troca o balão e guarda em localStorage pelo hash. Falha/limite estourado ⇒ fica a frase local.
**Why:** o valor central ("quanto posso gastar") nunca depende de LLM, rede ou cota.

### Pattern 5: Escritas da revisão via `writeBatch` planejado por função pura
**What:** `planResolution` devolve a lista de writes; o service aplica atomicamente e checa `status === 'review'` antes (idempotência).
- **Importar:** cria `transactions/bank_<id>`, `bankImports.status='imported'`, `transactionId`.
- **Ignorar:** `status='ignored'`.
- **Vincular a manual:** `matchedTransactionId`, marca o manual com `bankImportId`/`source:'bank'`, import vira `imported` sem criar transação.
- **Vincular a conta fixa:** grava `fixedExpenseId` na transação + `markAsPaid` (fecha o buraco do §1).
**Why client-side e não endpoint:** é o padrão atual do app, e continua válido sob regras por `ownerId`.

### Pattern 6: Seam de escopo (`ownerId`) desde já
**What:** `services/scope.ts` expõe `ownerId()` (constante hoje, `auth.uid`/claim depois) e todo service novo grava/filtra por ele. Servidor: `OWNER_ID` por conexão.
**Why:** adiar só `ownerId` para o fim obriga reescrever todos os services, índices e o sync de uma vez. Com o seam, a fase multiusuário vira backfill + regras + índices.

## 6. Fluxos de dados principais

### 6.1 "Pode gastar" (caminho crítico do Core Value)
```
Firestore ─► useTransactions/useFixedExpenses/settings (já existem)
          ─► core/budget.computeMonthBudget(today, limits, txs, fixos)
          ─► Home (arco do medidor) + useVintem(ctx agregado) ─► speak() ─► balão
```
Sem servidor no caminho. Offline/PWA: dados vêm do cache do Firestore SDK (habilitar persistência local, hoje `initializeFirestore` não a configura).

### 6.2 Alerta com app fechado (push)
```
Pluggy ─► sync.js (insert/upsert tx) ─► alerts-engine (core/alerts sobre o mês do dono)
      ─► alerts.create(id) [só se novo] ─► push.js ─► FCM ─► sw.ts ─► notificação
cron BRT ─► alerts-engine (contas a vencer, resumo) ─► idem
```
Lançamento **manual** não precisa de push: o usuário está no app; o cliente roda o mesmo `core/alerts` e mostra alerta in-app na hora. Isso reduz o servidor a três gatilhos: pós-sync, cron e (futuro) o parceiro lançando.

### 6.3 Comentário do Vintém via LLM
```
cliente: ctx(agregado, quantizado) ─► POST /api/vintem/comment (Bearer ID token)
servidor: hash(ctx) ─► vintemCache hit? ─► resposta
                    └► miss: quota(dono/dia) ok? ─► llm.provider(timeout) ─► grava cache ─► resposta
falha/quota/timeout ─► 204/erro ─► cliente mantém speak(ctx)
```
O servidor **não lê transações**: só recebe o `ctx`. O nível de dado (só agregados vs nomes de lojas) fica restrito ao que o tipo `VintemContext` permite; mudar o nível é mudar esse tipo.

### 6.4 Revisão de importações
```
bankImports(status='review') ─► useReviewQueue ─► UI (importar/ignorar/vincular)
      ─► core/review.planResolution ─► writeBatch(tx + bankImports + fixedExpensePayments)
      ─► budget recalcula (a transação nova passa a contar)
```

### 6.5 Cartão (precisa de spike antes)
```
Pluggy: accounts(CREDIT).creditData, /bills, transactions(billId, installment*)
  ─► sync.js: upsert cards, bills; reconcilia transactions por (cardId, billId)
  ─► tx.cardId setado ─► ledger: conta no limite pela data; fora do saldo da conta
  ─► Cartão UI: fatura aberta, limite disponível, vencimento, "vai sair em cada fatura"
```

### 6.6 Visão Casal
`computeMonthBudget` roda para `ele` e para `ela` e um `mergeBudgets(a, b)` puro soma. Sem coleção nova, sem endpoint. É uma view, não um modelo.

## 7. Estrutura de projeto sugerida

```
shared/core/            # puro, JSDoc/ts-check, testado com node --test
  budget.js  ledger.js  alerts.js  speech.js  review.js  *.test.js
src/
  components/mascot/    # Vintem SVG, balão, controles da página de teste
  components/budget/    # medidor, categoria expansível, "mês em uma conta"
  components/review/    # fila de revisão
  components/cards/     # fatura, limite, parcelas
  hooks/                # useBudget, useReviewQueue, useAlerts, useVintem, useCards, usePush
  services/scope.ts  review.service.ts  cards.service.ts  alerts.service.ts  push.service.ts
  pages/                # HomePage (nova), LimitesPage, RevisaoPage, CartaoPage, CasalPage, VintemTestePage
  sw.ts                 # service worker único (injectManifest)
server/src/
  scheduler.js  alerts-engine.js  push.js  auth.js(verifyIdToken)  llm/  (index.js, sync.js, classify.js existentes)
scripts/                # one-offs admin: backfill-owner.js, migrate-from-xrd.js
```

Rotas novas entram no `AnimatedRoutes` de `App.tsx`; a Home atual (`DashboardPage`, comparativo Ele×Ela) pode ser **reaproveitada como base da aba Casal**.

## 8. Ordem de construção recomendada (dependências)

```
[0] Seams: shared/core + scope()/ownerId + categoryLimits no tipo
 │
 ├─► [1] Revisão de importações ──────────────┐   (independe do resto; destrava 7 itens presos e
 │        (+ vínculo tx↔conta fixa)           │    define semântica de card_payment/refund)
 │                                            ▼
 ├─► [2] Limites + "Pode gastar" + alertas in-app (core/budget, core/alerts, Home)
 │         │
 │         ├─► [3] Mascote Vintém (core/speech + SVG; reage ao ctx de [2])
 │         └─► [6] Visão Casal (merge de budgets; barato)
 │
 ├─► [4] Identidade Coinki + PWA + login Firebase único ──► [5] Push (FCM + scheduler + alerts-engine)
 │        (manifest, sw.ts, site coinki.web.app,                  (depende de [2] e de ID token)
 │         ID token disponível)                                   │
 │                                                                ▼
 ├─► [7] Cartão: SPIKE (dump de creditData/bills/installments) ► modelo + UI   (depende de [1], [2])
 │
 ├─► [8] Vintém com LLM (depende de [3], [4] para ID token, cache e quota)
 │
 └─► [9] Multiusuário: backfill ownerId, índices, regras, claims, migração xrd   (por último)
```

Justificativas:
- **[0] primeiro:** `shared/core` e `scope()` custam pouco agora e evitam retrabalho em 5 fases.
- **[1] antes de [2]:** limites calculados sobre dados com 7 itens `review` pendentes e sem vínculo com fixos dão números errados; arruma-se a verdade dos dados antes de mostrar "pode gastar".
- **[2] é o Core Value:** entrega valor sem PWA, sem push, sem LLM. Se o projeto parar aí, ainda cumpre o objetivo.
- **[4] antes de [5]:** push exige service worker, origem final (`coinki.web.app`) e usuário autenticado; tokens FCM são presos à origem, então registrar tokens na URL antiga é trabalho jogado fora.
- **[7] depois de [2]:** o spike do cartão pode começar cedo em paralelo (só leitura/log), mas o **modelo** só fecha quando os predicados do ledger existem.
- **[8] por último entre as features:** é o mais substituível; o Vintém já funciona com frases prontas.
- **[9] por último:** é a única fase que toca todos os services, índices e regras. Com os seams, vira operação de dados.

## 9. Pontos de integração

### Serviços externos
| Serviço | Integração | Notas / riscos |
|---|---|---|
| Pluggy / MeuPluggy | `sync.js` existente + `pluggy.fetch...` | Docs v2 confirmam endpoint `GET /bills` (por conta) e `installmentNumber`/`totalInstallments`/`billId` por transação **quando o banco fornece**. `totalAmount` **não** vem por Open Finance; `date` pode ser data da compra ou do lançamento na fatura conforme o banco; não há id de grupo de parcelas; ids podem mudar (`deleted`+`created`); transações abertas ficam `PENDING` sem `billId`. Plano gratuito limita histórico a 4 chamadas/CPF/banco/mês. **Tratar como MEDIUM até o spike com o Bradesco real.** |
| FCM | `firebase-admin/messaging` no servidor; `firebase/messaging` + SW no cliente | Spark/Hosting ok. iOS só com app na tela inicial (já está no PROJECT.md). Um SW só: `vite-plugin-pwa` em `injectManifest`, `onBackgroundMessage` dentro de `sw.ts`, e `getToken({serviceWorkerRegistration})` com o registro do PWA. Evitar `firebase-messaging-sw.js` separado (dois SWs brigam por escopo). **MEDIUM**: padrão conhecido, não validado neste repo. |
| LLM grátis | `server/llm/provider.js` atrás de interface única | Chave só no servidor (Railway env). Timeout, quota por dono/dia, cache. Camadas grátis podem treinar com o que recebem ⇒ só agregados. |
| Firebase Hosting | segundo site `coinki` no mesmo projeto | Adicionar domínio em Auth > Authorized domains e em `ALLOWED_ORIGINS` do servidor. Header `no-cache` para `/sw.js` (hoje `**/*.js` é `immutable`). |

### Fronteiras internas
| Fronteira | Comunicação | Notas |
|---|---|---|
| Cliente ↔ servidor | HTTPS REST; hoje `x-api-key` | Endpoints **novos** com `Authorization: Bearer <ID token>`; migrar os antigos quando o login Firebase for único. |
| Servidor ↔ Firestore | firebase-admin (ignora regras) | Servidor deve propagar `ownerId` da `bankConnection` em todo documento que grava. |
| `core/*` ↔ UI/servidor | import direto de funções puras | Nenhum I/O; mesma suíte de testes valida os dois lados. |
| Cliente ↔ SW | `postMessage`/FCM data payload | Clique na notificação abre rota (`/limites?cat=Lazer`). |

## 10. Escalabilidade (realista: 1 casal + 1 amigo)

| Preocupação | 2–3 usuários | Se crescer |
|---|---|---|
| Leitura do mês | `getDocs` por mês/pessoa já basta | Índices compostos incluindo `ownerId` |
| Agregação | Calculada no cliente a cada render do mês | Doc `monthlySummary` mantido pelo servidor |
| Agendador | Um processo Railway | Fila externa; não necessário |
| LLM | Quota por dono/dia, cache por hash | Trocar provider; interface já isola |
| Primeiro gargalo real | **Índices Firestore**: ao adicionar `ownerId`, todo `where(person)+date+orderBy` precisa de índice novo (`firestore.indexes.json`); consultas sem índice falham em produção | Deploy dos índices **antes** das regras |

## 11. Anti-padrões a evitar

1. **Duplicar a fórmula de limite no cliente e no servidor.** Divergência garante alerta que não bate com a Home. Um só `core/`.
2. **Usar `x-api-key` como identidade nos endpoints novos.** Está no bundle público; push e LLM viram abuso de cota. Usar ID token.
3. **Chamar o LLM no caminho do "pode gastar".** Dependência de rede, cota e latência no Core Value. LLM só enfeita o balão.
4. **Sincronizar cartão insert-only como hoje.** PENDING→POSTED e ids trocados geram duplicatas/ausências. Reconciliar por fatura.
5. **Contar pagamento de fatura como gasto.** Dobra o gasto do cartão. `card_payment` fora do limite, dentro do saldo de caixa.
6. **Contar parcela futura inteira na data da compra sem decidir a regra.** Compra de R$1.200 em 12x estoura o limite do mês e some nos 11 seguintes. Decisão de produto pendente (§12); recomendação: limite conta a **parcela do mês**, e a data da compra vale para a 1ª parcela e compras à vista.
7. **Fechar regras antes de existir `request.auth` para todos.** Com o login local, fechar o Firestore tranca o próprio dono. Ordem: login Firebase → backfill `ownerId` → índices → regras.
8. **Estado de alerta em memória no servidor.** Railway reinicia; usar ID determinístico em `alerts`.
9. **Um segundo service worker (`firebase-messaging-sw.js`) ao lado do PWA.**
10. **Tratar a migração do amigo como "copiar coleções".** `settings/main` é singleton (colide), `fixedExpensePayments.fixedExpenseId` e `goalContributions.goalId` referenciam ids (preservar ids ao copiar) e o Auth dele é outro projeto.

## 12. Decisões abertas que a pesquisa não fecha

| Decisão | Recomendação | Quem decide |
|---|---|---|
| Parcelas no limite: total na compra ou parcela do mês? | Parcela do mês (bate com o que o Pluggy entrega) | Fase do cartão |
| `ownerId` = uid do usuário ou id de "casa" (household)? | **Household**: o casal hoje compartilha um login; regras com custom claim `hid` (sem `get()` extra por leitura) | Fase multiusuário; seam já cobre ambos |
| Limites por pessoa ou do casal? | Por pessoa (Home individual); Casal soma | Fase de limites |
| Cópia vs raiz-no-repo para `shared/core` no Railway | Verificar como o Railway está configurado hoje | Fase 0 |
| Amigo usando o MeuPluggy do dono | **Não** no início: plano gratuito é só do mesmo titular | Fase multiusuário |

## 13. Flags de pesquisa por fase

| Fase | Precisa pesquisa mais funda? | Motivo |
|---|---|---|
| Limites / pode gastar / Casal | Não | Funções puras sobre dados existentes |
| Revisão | Não | Padrão do código atual; só regras de vínculo com fixos |
| Mascote | Pouca (animação SVG: CSS vs lib) | Sem dependência arquitetural |
| PWA + push | **Sim** | `injectManifest` + FCM no mesmo SW, iOS, segundo site Hosting, tokens por origem |
| Cartão | **Sim (spike obrigatório)** | O que o MeuPluggy realmente entrega para o Bradesco; regras de parcela |
| LLM | **Sim** | Escolha de provider gratuito, cotas, política de privacidade |
| Multiusuário | **Sim** | Custom claims, índices, migração Auth/Firestore entre projetos |

## Sources

- Código lido: `src/types/index.ts`, `src/services/{transactions,settings,bank,fixedExpenses}.service.ts`, `src/hooks/{useTransactions,useFixedExpenses}.ts`, `src/contexts/{AuthContext,AreaContext}.tsx`, `src/App.tsx`, `src/lib/{firebase,mockStorage}.ts`, `src/components/layout/{BottomNav,NotificationsBell}.tsx`, `server/src/{index,sync,classify}.js`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` (HIGH)
- Pluggy, Credit Card Installments: https://v2.docs.pluggy.ai/en/docs/products/credit-card-installments (HIGH, doc oficial)
- Pluggy, bills list: https://v2.docs.pluggy.ai/en/reference/bill/bills-list (HIGH)
- Pluggy, Credit Card Bills: https://docs.pluggy.ai/docs/credit-card-bills (HIGH)
- vite-plugin-pwa, injectManifest: https://vite-pwa-org.netlify.app/guide/inject-manifest (HIGH para o recurso; integração com FCM é MEDIUM, não confirmada por fonte oficial nesta pesquisa)
- Não verificados nesta pesquisa (conhecimento prévio, MEDIUM): campos exatos de `creditData`, API de custom claims em regras, requisitos de Web Push no iOS

---
*Architecture research for: Coinki (finanças pessoais PWA, casal)*
*Researched: 2026-11-17*
