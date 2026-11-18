---
phase: 03-limites-pode-gastar-e-central
verified: 2026-11-18T23:00:00Z
status: human_needed
score: 4/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-01-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-01-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-02-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-02-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-03-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-03-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-04-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-04-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-05-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-05-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-06-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-06-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-07-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-07-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-08-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-08-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-09-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-09-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-10-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-10-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-11-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-11-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-12-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-12-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-13-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-13-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-14-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-14-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-15-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-15-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-16-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-16-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-17-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-17-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-18-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-18-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-19-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-19-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-20-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-20-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-21-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-21-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-22-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-22-SUMMARY.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-23-PLAN.md"
  - ".planning/phases/03-limites-pode-gastar-e-central/03-23-SUMMARY.md"
  - "firestore.indexes.json"
  - "firestore.rules"
  - "shared/core/alerts.js"
  - "shared/core/budget.js"
  - "shared/core/cycle.js"
  - "shared/core/format.js"
  - "shared/core/limits.js"
  - "src/App.tsx"
  - "src/components/layout/NavRail.tsx"
  - "src/contexts/LimitAlertsContext.tsx"
  - "src/hooks/useCycleBudget.ts"
  - "src/pages/DashboardPage.tsx"
  - "src/pages/LimitsPage.tsx"
  - "src/pages/SettingsPage.tsx"
covered_digest: "v1:sha256:06070dd6099809244f42d52e80b9f677c313a4f21ae09f8f51fb3574f2a0fdf9"
behavior_unverified: 1
overrides_applied: 0
deferred:
  - truth: "Configurações > Contas e cartões com dia de fechamento e vencimento (parte de CENT-05)"
    addressed_in: "Phase 6"
    evidence: "Phase 6 SC1/SC2 e CARD-02, CARD-08, CENT-03: dia de fechamento e de vencimento informados pelo usuário; 03-CONTEXT D-15: 'Contas e cartões (esqueleto até a Fase 6)'"
behavior_unverified_items:
  - truth: "O usuário recebe um aviso dentro do app ao chegar a 80% e outro ao passar de 100%, uma única vez por limiar e por ciclo (LIM-07)"
    test: "Com o índice de limitAlerts Habilitado, lançar gastos até cruzar 80% e depois 100% de um limite; recarregar a página e abrir uma segunda aba"
    expected: "Um aviso por limiar no sino e na Home, sem repetição em recarga nem em outra aba; trocar o dia do salário não reenvia os já emitidos"
    why_human: "Núcleo (thresholdsToFire, rekeyAlerts) e regras/transação (emulador) têm teste, mas o avaliador do LimitAlertsProvider contra o Firestore real e o índice só têm guarda estática"
human_verification:
  - test: "Conferir no Console do Firebase (Firestore > Índices) que o índice limitAlerts (ownerId ASC, person ASC, createdAt DESC) está Habilitado"
    expected: "Estado Habilitado. Se estiver Criando, a leitura dos avisos falha com failed-precondition (o app não cai)"
    why_human: "A CLI não mostra o estado do índice e o dono não confirmou (03-11-SUMMARY, Pendente)"
  - test: "UAT passo (i) de 03-UAT-GUIDE.md: avisos de 80% e 100% sem repetição, em recarga e em segunda aba; troca do dia do salário regrava marcadores como silenciosos"
    expected: "Um aviso por limiar por ciclo; só o mais alto visível quando o gasto salta de 50% para 130%"
    why_human: "Depende de dados reais e de dois contextos de navegador; fecha LIM-07"
  - test: "UAT passos (a), (b), (c): Home a 360 e 430 px (número de 11 e 12 caracteres), texto a 200%, contraste (axe)"
    expected: "Sem corte, sem rolagem horizontal, sem falha de contraste nos textos de tinta e pílulas"
    why_human: "Sem runner de UI; aparência e legibilidade"
  - test: "UAT passos (d), (e): sheet de lançamento (teclado, preview 'depois: R$ y', offline com Tentar de novo, foco ao fechar) e dock rolável de 9 ícones com fade e item ativo centralizado"
    expected: "Lança gasto, receita e depósito no Porquinho; Porquinho não muda o Pode gastar; reenvio grava uma vez só"
    why_human: "Interação em celular real, teclado virtual, rolagem"
  - test: "UAT passos (f), (g), (h), (j), (k): perfil do parceiro somente leitura, troca do dia do salário e navegação de ciclo, renda esperada vs recebida, dado velho do banco suspendendo o ritmo, Marcar pago"
    expected: "Conforme 03-UAT-GUIDE.md; com dado velho a Home avisa e o ritmo fica neutro, sem elogio nem bronca"
    why_human: "Fluxo completo com dados reais e conexão bancária real"
---

# Phase 3: Limites, "Pode gastar" e Central - Verification Report

**Phase Goal:** Em segundos o usuário sabe quanto ainda pode gastar no ciclo (dinheiro real: renda menos fixas menos gastos), acompanha o gasto por categoria contra limites que só avisam, e vê tudo em uma Central própria
**Verified:** 2026-11-18T23:00:00Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Veredito

A meta está atingida no código. A fórmula vive só no núcleo, o limite nunca bloqueia, todos os componentes estão montados em telas e rotas, os avisos têm ID determinístico com criação "se ausente" em transação, e regras e índice de `limitAlerts` existem e estão testados. Nenhum BLOCKER. Ficam itens humanos: confirmar o índice como Habilitado, o UAT de avisos (que fecha LIM-07) e o UAT visual em celular.

## Goal Achievement

### Observable Truths (Success Criteria do ROADMAP)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Home mostra "Pode gastar" grande, por dia, ritmo em 5 níveis, atalhos (Novo gasto, Nova receita, Contas fixas, Limites), resumo da Central e das Contas Fixas; navegação por Home, Central e Contas Fixas | VERIFIED | `DashboardPage.tsx` renderiza `ArcGauge`, `MoneyValue(view.safeCents)`, `perDayReais(view.perDayCents)`, `RhythmPill`, `ShortcutRow` (âncoras `lm` e `fx` existem em `LimitsList id="lm"` e `FixedMonthCard id="fx"`) e `HomeSections` (MonthInOne, LimitsList, CentralSummaryCard, FixedMonthCard). `NavRail.tsx`: dock de 9 destinos com Início, Central de limites (`/limites`) e Contas fixas, mais botão + (`LaunchFab`). Rotas em `App.tsx` |
| 2 | Limite por categoria em Configurações > Categorias; Central e Home mostram gasto, limite, %, resta; expandir mostra lançamentos; "Gasto geral"; passar só avisa e soma o excesso; fixas fora do dia a dia; ciclo começa no dia do salário | VERIFIED | `CategoryEditorSheet` grava via `setCategoryLimit` + `updatePersonConfig` (único ponto de edição, D-21); `LimitRow` exibe spent/limit/pct/restam, `excessCents` ("passou R$ x do limite"), expande com `row.txs` (máx. 8); `GeneralRow` com `generalByCategory`; `spendByCategory` manda todo o resto para Gasto geral; fixas vêm de `billsForCycle` (não de transações); `CycleIncomeCard` usa `setSalaryDay`; `cycleOf(now, salaryDay)` no núcleo |
| 3 | "O mês em uma conta" (Entra, Fixos, Dia a dia, Sobra) com projeção marcada como estimativa; renda esperada separa o que entrou do esperado | VERIFIED | `monthInOne()` com `sobra.projected` (PR-05); `MonthInOneCard` na Home; `incomeForCycle` (esperada, override por ciclo, recebida, efetiva = máx., PR-01); `setExpectedIncome` na `CycleIncomeCard` |
| 4 | Alerta no app a 80% e a 100%, uma única vez por limiar e por ciclo | PRESENT_BEHAVIOR_UNVERIFIED | Ver LIM-07 abaixo: unidade, regras e transação provadas por teste; avaliador de cliente contra Firestore real e índice só com guarda estática. Vai para o UAT |
| 5 | Dado do banco velho ou consentimento vencido: a Home avisa e não elogia nem dá bronca | VERIFIED | `useBankFreshness` usa `shouldSuppressVerdict` (testado em `bankStatus.test.js`); `buildBudgetView` devolve `rhythmLevel: null` e `verdictSuppressed`; `RhythmPill suppressed`, `ArcGauge tone neutral`, `MoneyValue` sem tom de perigo quando suprimido, `StaleNotice` acima do hero, `LimitsList neutralOk` |

**Score:** 4/5 verdades verificadas (1 presente e ligada, comportamento ponta a ponta sem teste: vai para o UAT)

### Checagens-chave pedidas

| Checagem | Resultado | Evidência |
|----------|-----------|-----------|
| Fórmula do Pode gastar só no núcleo | OK | Única definição: `safeToSpend` em `shared/core/budget.js` (renda efetiva - contas do ciclo - todo gasto não fixo), consumida por `buildBudgetView`. Busca por `incomeCents -`, `effectiveCents -`, `safeToSpend(` em `src` e `server`: nenhuma ocorrência. A Home só lê `view.safeCents`; `LaunchSheet` usa `previewLaunch(view, ...)`; avisos usam `view.spend.rows`. A única conta fora do núcleo é a soma de dois `safeCents` em "Os dois juntos" da Central (D-01, só exibição) |
| Limite nunca bloqueia (D-09, D-21) | OK | `limitState` só devolve estado; busca por bloqueio em `src` sem ocorrência. `LaunchSheet` mostra apenas `Notice` "Você pode lançar mesmo assim" quando `previewLaunch.overspends`; `disabled` só por valor zero ou salvando. Edição de limite só em `CategoryEditorSheet`; `LimitsPage` apenas exibe e linka "Ajustar em Configurações" |
| Componentes montados | OK | Sem órfão: script varreu todos os `.ts/.tsx` tocados na fase; todos têm importador. Home monta `StaleNotice`, `LimitAlertNotice`, `ArcGauge`, `RhythmPill`, `ShortcutRow`, `HomeSections`, `CentralSummaryCard`. `/limites` monta `LimitsList`, `Totals`, `CardsSkeleton`, `Together`. `/casal` montada em `CouplePage` (rota em `App.tsx`). Configurações monta `CycleIncomeCard`, `CategoriesCard`, `AccountsSkeletonCard`, `BankConnections`, `AppearanceCard`, `NotificationsCard` (6 âncoras: ciclo, categorias, contas, bancos, aparência, notificações). `AppShell` monta `TopBar` (sino, engrenagem, perfil), `NavRail`, `LaunchSheet`. `LimitAlertsProvider` e `LaunchProvider` estão em `App.tsx` |
| Avisos 80/100 idempotentes | OK (núcleo, serviço, regras) | `alertId = person__cycleKey__categoryId__threshold`; `thresholdsToFire` filtra IDs existentes e marca como silenciosos os limiares abaixo do mais alto; `createLimitAlertIfAbsent` usa `runTransaction` (get, se existe devolve false e não escreve, senão set); `rekeyAlerts` regrava marcadores como silenciosos ao trocar o dia do salário. Limiar 100 só com `spent > limit`, igual ao `limitState` (sem divergência de fronteira). Avaliação só para a pessoa do claim (PR-04), serializada com `running`/`rerun`, foco da aba com intervalo mínimo de 5 min |
| Regras e índice de `limitAlerts` | OK no repositório | `firestore.rules`: `limitAlerts` em `clientCollections()`, `allow get` para documento inexistente só em `settings` e `limitAlerts`, update sem trocar `ownerId`. `firestore.indexes.json`: índice (ownerId, person, createdAt DESC), 19 índices, 12 com `ownerId`. Publicados em 03-11 (saída da CLI colada pelo dono). Estado "Habilitado" não confirmado: ver Humano |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/core/{cycle,limits,budget,alerts,format}.js` | Núcleo puro | VERIFIED | 235/243/603/159/172 linhas, substantivos, cobertos por testes em UTC e Asia/Tokyo |
| `src/hooks/useCycleBudget.ts` | View por pessoa e ciclo | VERIFIED | Delega tudo a `buildBudgetView`; view nula enquanto carrega ou com entrada de outro ciclo (nunca número falso) |
| `src/lib/cycleData.ts` | Entradas do ciclo | VERIFIED | `getTransactionsInRange` (ownerScope, índice ownerId+person+date), contas só da pessoa, pagamentos por meses cobertos |
| `src/contexts/LimitAlertsContext.tsx`, `src/services/limitAlerts.service.ts` | Avaliador e serviço | VERIFIED | Ligados ao `AlertsBell`, `LimitAlertNotice` e `CycleIncomeCard` |
| `src/pages/{DashboardPage,LimitsPage,SettingsPage,CouplePage}.tsx` | Telas | VERIFIED | Rotas `/`, `/limites`, `/configuracoes`, `/casal` em `App.tsx` |
| `src/components/layout/{NavRail,TopBar,AlertsBell,AppShell}.tsx` | Casca nova | VERIFIED | Dock de 9 destinos, sino com avisos de limite e vencimentos |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `DashboardPage` | `buildBudgetView` | `useCycleBudget` | WIRED |
| `LimitsPage` | `buildBudgetView` | `useCycleBudget` de ele e ela | WIRED |
| `LimitAlertsProvider` | Firestore `limitAlerts` | `getLimitAlerts`, `createLimitAlertIfAbsent` | WIRED |
| `AlertsBell`, `LimitAlertNotice` | `LimitAlertsProvider` | `useLimitAlerts` | WIRED |
| `LimitAlertNotice` | `/limites#cat-{id}` | `Link` e `useHashReveal` | WIRED |
| `CycleIncomeCard` | `rekeyForSalaryDay` | troca do dia do salário | WIRED |
| `CategoryEditorSheet` | `settings.personConfig.{person}` | `setCategoryLimit`, `updatePersonConfig` | WIRED |
| `ShortcutRow` | seções `lm` e `fx` | `useSectionReveal` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Variável | Fonte | Dado real | Status |
|----------|----------|-------|-----------|--------|
| `DashboardPage` (hero) | `view.safeCents` | `loadCycleInputs` -> Firestore (transações, fixas, pagamentos) -> `buildBudgetView` | Sim | FLOWING |
| `LimitsPage`, `LimitsList` | `view.spend.rows` | mesma view; limites de `settings.personConfig` | Sim | FLOWING |
| `AlertsBell`, `LimitAlertNotice` | `alerts` | `getLimitAlerts` (consulta por ownerId e person) | Sim (depende do índice Habilitado) | FLOWING (condicional) |

### Behavioral Spot-Checks e testes (rodados nesta verificação)

| Comando | Resultado | Status |
|---------|-----------|--------|
| `npm run test:core:tz` (UTC e Asia/Tokyo) | 234/234 em cada fuso, 0 falhas | PASS |
| `npm run test:static` | 173 testes: 172 passam, 0 falham, 1 pulado pré-existente | PASS |
| `npm run test:rules` | 12/12, inclui "limitAlerts: get de inexistente só para membro; criar-se-ausente por transação é idempotente (LIM-07)" | PASS |
| `npm run test:emu` | 58/58 | PASS |
| `npm run build` | verde | PASS |
| `npm run lint` | 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes | PASS |

Não rodei `npm --prefix server test` (81/81 declarado em 03-VALIDATION): fora do escopo de código da fase.

### Probe Execution

SKIPPED: a fase não declara probes `scripts/*/tests/probe-*.sh`.

### Requirements Coverage

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| LIM-01 | SATISFIED | Limite por categoria e pessoa, histórico por ciclo (`setLimit`, `limitForCycle`), editado em `CategoryEditorSheet`; só avisa e soma excesso |
| LIM-02 | SATISFIED | `LimitRow`: gasto, limite, %, resta, expansão com lançamentos |
| LIM-03 | SATISFIED | `spendByCategory` + `generalCents`; fixas fora do dia a dia (`billsForCycle`) |
| LIM-04 | SATISFIED | `safeToSpend`, `perDayCents`, `rhythm` em 5 níveis (cortes 75/100/115) na Home |
| LIM-05 | SATISFIED | `monthInOne` + `MonthInOneCard`, estimativa sinalizada (`sobra.projected`) |
| LIM-06 | SATISFIED | `incomeForCycle` + renda esperada na `CycleIncomeCard` |
| LIM-07 | PENDENTE DE HUMANO (código completo) | Todo o código, regras, índice e testes existem e estão ligados; falta confirmar índice Habilitado e rodar o UAT (i). A caixa `[ ]` em REQUIREMENTS.md segue coerente com isso: não marcar até o UAT passar |
| LIM-08 | SATISFIED | Supressão do veredito e `StaleNotice` |
| LIM-09 | SATISFIED | `ShortcutRow` com os 4 atalhos; `LaunchSheet` com abas Gasto, Receita, Porquinho |
| LIM-10 | SATISFIED | `DayPicker` + `setSalaryDay`, `cycleOf`, `rekeyForSalaryDay` |
| CENT-01 | SATISFIED | `/limites` + `CentralSummaryCard` na Home |
| CENT-02 | SATISFIED | Central só exibe; ajuste em Configurações (D-21) |
| CENT-05 | PARCIAL (ressalva) | 6 cartões com ícone e âncoras existem. O cartão "Contas e cartões" é esqueleto sem campos (chip "em breve"); o requisito diz "com dia de fechamento e vencimento". Adiado por D-15 e coberto pela Fase 6 (CARD-02, CARD-08, CENT-03). Marcado Complete em REQUIREMENTS.md sem essa ressalva |
| CENT-06 | SATISFIED | Contas Fixas continuam em `/contas-fixas`; `FixedMonthCard` na Home com Marcar pago manual (não cria lançamento) |
| IDEN-07 | SATISFIED no código; aparência no UAT | A navegação escolhida nos mockups (D-20: pílula rolável de ícones, 9 destinos, + ao lado, Configurações no canto superior direito) está em `NavRail`/`TopBar`/`AppShell`, com Central e Contas Fixas acessíveis. Difere da hipótese do ROADMAP (5 espaços com "Mais"), mas foi decisão registrada do dono. Há lastro de código; o conforto de uso em celular depende do UAT (e), (b) |

Requisitos órfãos (mapeados à Fase 3 em REQUIREMENTS.md e ausentes dos planos): nenhum. Os 15 IDs aparecem nos planos (guarda `phase3-final.test.js`).

### Anti-Patterns Found

| Arquivo | Padrão | Severidade | Impacto |
|---------|--------|------------|---------|
| `src/components/settings/AccountsSkeletonCard.tsx` | Esqueleto sem campos | Info | Intencional e declarado (D-15, Fase 6); ver CENT-05 |
| `src/pages/LimitsPage.tsx` (`CardsSkeleton`) | Cartões "em breve" | Info | Intencional, sem dado falso (CENT-03 é da Fase 6) |
| `src/components/calendar/MonthCalendar.tsx` (linhas 182, 334) | Glifos "✓" e "○" no texto | Info | Pré-existente, tela fora do escopo da fase, não são emoji coloridos |
| `src/` e `shared/` | `TBD`, `FIXME`, `XXX`, `TODO`, `HACK` | - | Nenhuma ocorrência. Sem emoji nos arquivos novos; sem Google Fonts; `lang="pt-BR"` |

Limitações aceitas pelo dono e não tratadas como falha: PR-02 (fixa paga pelo banco desconta duas vezes), PR-11 (Transações, Relatórios e Calendário por mês-calendário), tema escuro adiado, índice `limitAlerts` sem confirmação de Habilitado, escala tipográfica fora de CouplePage e dialog.

### Human Verification Required

Ver lista no frontmatter (`human_verification`). Resumo para o UAT:

1. **Índice de `limitAlerts` Habilitado no Console.** Pré-requisito do item 2.
2. **Avisos de 80% e 100% (UAT passo i).** Fecha LIM-07; sem repetição em recarga, em segunda aba e na troca do dia do salário.
3. **Home a 360/430 px, zoom de texto 200%, contraste (UAT a, b, c).**
4. **Sheet de lançamento e dock em celular real (UAT d, e).**
5. **Perfil do parceiro somente leitura, ciclo, renda, dado velho, Marcar pago (UAT f, g, h, j, k).**

### Gaps Summary

Sem lacunas bloqueantes. Observações de rastreabilidade, sem mudar o status:

- **LIM-07** corretamente pendente em REQUIREMENTS.md; marcar Complete só depois do UAT (i) e da confirmação do índice.
- **CENT-05** está Complete com a parte "dia de fechamento e vencimento" ainda em esqueleto. Sugestão: anotar em REQUIREMENTS.md que essa parte é entregue pela Fase 6 (CARD-02/CARD-08), para a rastreabilidade não afirmar mais do que existe.
- O checkbox da Fase 3 em `ROADMAP.md` (linha 16) segue desmarcado; marcar quando o UAT fechar.

---

_Verified: 2026-11-18T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
