---
phase: 03-limites-pode-gastar-e-central
reviewed: 2026-11-18T19:10:00Z
depth: standard
base: d07fae6f
files_reviewed: 61
files_reviewed_list:
  - firestore.rules
  - firestore.indexes.json
  - shared/core/alerts.js
  - shared/core/bankStatus.js
  - shared/core/budget.js
  - shared/core/categories.js
  - shared/core/cycle.js
  - shared/core/format.js
  - shared/core/limits.js
  - src/App.tsx
  - src/contexts/AreaContext.tsx
  - src/contexts/AuthContext.tsx
  - src/contexts/CycleContext.tsx
  - src/contexts/LaunchContext.tsx
  - src/contexts/LimitAlertsContext.tsx
  - src/hooks/useBankFreshness.ts
  - src/hooks/useCycleBudget.ts
  - src/hooks/useReadOnly.ts
  - src/hooks/useSectionReveal.ts
  - src/lib/cycleData.ts
  - src/lib/rhythm.ts
  - src/pages/CouplePage.tsx
  - src/pages/DashboardPage.tsx
  - src/pages/LimitsPage.tsx
  - src/pages/SettingsPage.tsx
  - src/services/fixedExpenses.service.ts
  - src/services/limitAlerts.service.ts
  - src/services/settings.service.ts
  - src/services/transactions.service.ts
  - src/components/dashboard/ArcGauge.tsx
  - src/components/dashboard/FixedMonthCard.tsx
  - src/components/dashboard/HomeSections.tsx
  - src/components/dashboard/LimitAlertNotice.tsx
  - src/components/dashboard/MonthInOneCard.tsx
  - src/components/dashboard/StaleNotice.tsx
  - src/components/launcher/LaunchSheet.tsx
  - src/components/layout/AlertsBell.tsx
  - src/components/layout/AppShell.tsx
  - src/components/layout/CycleSelector.tsx
  - src/components/layout/NavRail.tsx
  - src/components/layout/ProfileSwitcher.tsx
  - src/components/layout/TopBar.tsx
  - src/components/limits/LimitRow.tsx
  - src/components/settings/CategoriesCard.tsx
  - src/components/settings/CategoryEditorSheet.tsx
  - src/components/settings/CycleIncomeCard.tsx
  - src/components/settings/DayPicker.tsx
  - src/components/settings/NotificationsCard.tsx
  - src/components/ui/collapsible.tsx
  - src/components/ui/money-keypad.tsx
  - src/components/ui/notice.tsx
  - src/components/ui/progress.tsx
  - src/components/ui/segmented-control.tsx
  - src/components/ui/sheet.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/toast.tsx
  - src/main.tsx
  - test/rules/matrix.test.js
  - test/static/phase3-data.test.js
  - shared/core/purity.test.js
  - server/test/emu/check-indexes.test.js
findings:
  critical: 1
  high: 2
  medium: 7
  low: 10
  warning: 9
  info: 10
  total: 20
status: issues_found
---

# Fase 3: Relatório de revisão de código

**Revisado:** 2026-11-18
**Profundidade:** standard
**Base do diff:** `d07fae6f..HEAD` (shared, src, firestore.rules, firestore.indexes.json, server, test)
**Status:** issues_found

Mapeamento de severidade (frontmatter): crítico = `critical`; alto + médio = `warning`; baixo = `info`. Os IDs seguem a convenção do fluxo: `CR-` crítico, `WR-` alto/médio (a severidade está explícita em cada título), `IN-` baixo.

## Resumo

O núcleo puro (`shared/core`: `limits`, `budget`, `cycle`, `alerts`, `format`) é sólido. A aritmética é em centavos inteiros, a regra de 80% e 100% é cruzada por multiplicação, as fronteiras de ciclo usam `America/Sao_Paulo`, e `cycleOf` com dia 29 a 31 em meses curtos está correto (conferido manualmente para fev, abr e dez). Não achei segredo, `innerHTML`, `eval` nem `console.log` de valor financeiro.

Os problemas reais estão na camada entre o núcleo e o Firestore: gravação de configuração por sobrescrita de nó inteiro a partir de um snapshot em memória, ID de aviso sem o dono, gatilhos do avaliador incompletos e regras de `limitAlerts` sem validação de forma. Há um caminho de perda de dados (CR-01). O índice de `limitAlerts` e os testes de regras batem com a consulta; a confirmação no Console é limitação aceita e não foi reportada.

Itens de limitação aceita (PR-02, PR-11, tema escuro, escala tipográfica fora de CouplePage/dialog, índice sem confirmação) foram ignorados.

## Crítico

### CR-01: Falha ao carregar Configurações cai em padrões e qualquer gravação seguinte apaga limites e categorias

**Arquivo:** `src/contexts/AreaContext.tsx:75-86` (também `:112-121`, `:136-147`), `src/services/settings.service.ts:54-66`, `src/components/settings/CycleIncomeCard.tsx:170,210`, `src/components/settings/CategoryEditorSheet.tsx:165-166`, `src/pages/DashboardPage.tsx:77,115-125`

**Problema:** `loadSettings` engole o erro (`console.error`) e faz `setLoading(false)`, deixando `settings` no estado inicial `DEFAULT_SETTINGS` (`:40-44`). Não existe estado de erro nem nova tentativa. Com isso:

1. `personConfigFor` devolve a configuração padrão (dia 1, renda 0, sem limites).
2. A Home mostra "Falta saber quanto entra" com o botão "Informar renda esperada" (`DashboardPage.tsx:115-125`), sem sinal de que o carregamento falhou.
3. `CycleIncomeCard` e `CategoryEditorSheet` não ficam travados (só `locked` por perfil). Ao salvar, `updatePersonConfig` grava o nó inteiro `personConfig.<pessoa>` montado a partir do padrão (`settings.service.ts:65`). Todo o histórico de limites e as sobreposições de renda daquela pessoa somem.
4. `updateCategoryDefs` grava `categoryDefs` e `categories` derivados das categorias padrão, e as categorias personalizadas somem.

`SettingsPage` também não bloqueia a edição enquanto `loading` é verdadeiro (só adia a rolagem por hash, `:28`). Basta abrir o app com rede ruim, tocar no CTA da Home e salvar.

**Correção:**
```ts
// AreaContext: expor o estado real do carregamento
const [settingsStatus, setSettingsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
// loadSettings: setSettingsStatus('ready') no sucesso e 'error' no catch; reexecutar em "Tentar de novo"
// Expor settingsStatus e fazer updatePersonConfig/updateCategoryDefs/updateNotifications
// lançarem se settingsStatus !== 'ready'. Cartões de Configurações e a Home mostram erro + retry
// (em vez de "Falta saber quanto entra") quando status === 'error'.
```
Além disso, grave por caminho pontilhado o que mudou (`personConfig.ele.limits.<categoryId>`, `personConfig.ele.salaryDay`) em vez do nó inteiro; ver WR-01.

## Alto

### WR-01 (Alto): Escrita por sobrescrita de nó inteiro sobre snapshot velho perde edições entre aparelhos e entre os dois logins

**Arquivo:** `src/services/settings.service.ts:54-66`, `src/contexts/AreaContext.tsx:112-121,136-147`, `src/components/settings/CategoryEditorSheet.tsx:149-166`

**Problema:** `settings/main` é lido uma vez (`getDoc`, sem `onSnapshot`) e cada edição grava o resultado calculado sobre esse snapshot:
- `categoryDefs` e `categories` são compartilhados pelo casal e gravados inteiros por `updateCategoryDefs`. Se Ele cria "Pets" no celular e Ela (com a tela aberta antes) muda a cor de outra categoria, a gravação dela devolve a lista sem "Pets". A categoria some da lista e o limite fica órfão. Os lançamentos mantêm o `categoryId`, mas o nome deixa de resolver.
- `personConfig.<pessoa>` é gravado inteiro. Dois aparelhos da mesma pessoa (ou o mesmo aparelho depois de um `bumpData` que não recarrega settings) sobrescrevem o limite um do outro.

**Correção:** ler-mesclar-gravar em transação, ou atualizações pontilhadas:
```ts
export async function updatePersonConfig(person, patch) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(settingsRef())
    const cur = normalizePersonConfig(snap.data()?.personConfig?.[person])
    tx.update(settingsRef(), { ['personConfig.' + person]: mergePersonConfig(cur, patch) })
  })
}
// categoryDefs: mesclar por id dentro da transação, nunca substituir a lista pelo estado local.
```
Alternativa mínima: `onSnapshot` em `settings/main` para manter o estado fresco.

### WR-02 (Alto): ID do aviso não inclui o dono; colisão entre casais bloqueia avisos em silêncio e derruba o resto do lote

**Arquivo:** `shared/core/alerts.js:44-46`, `src/services/limitAlerts.service.ts:98-115`, `src/contexts/LimitAlertsContext.tsx:62-68,98-101`, `firestore.rules:22-30`

**Problema:** `alertId` é `pessoa__ciclo__categoria__limiar` (ex.: `ele__2026-11__alimentacao__80`) e `limitAlerts` é uma coleção global. Os `categoryId` são slugs previsíveis (`alimentacao`, `lazer`). Se outro casal (o PROJECT prevê migrar o amigo para o mesmo projeto sob outro `ownerId`) já tiver esse ID, o `transaction.get` do primeiro casal recebe `permission-denied`: o documento existe com outro dono, e a exceção `get` só vale para documento inexistente (`rules:29`).
- A exceção sobe até `runEvaluation`, que a engole (`:98-101`).
- `createAll` (`:62-68`) não isola cada rascunho, então um rascunho que falha aborta os seguintes. Nenhum aviso é gerado para aquela categoria e todos os posteriores do lote também não.

O teste de regras cobre só "outro casal não lê" (`matrix.test.js:304-306`), não a colisão de ID.

**Correção:**
```js
export function alertId(ownerId, person, cycleKey, categoryId, threshold) {
  return `${ownerId}__${person}__${cycleKey}__${categoryId}__${threshold}`
}
// createAll: try/catch por rascunho, continuando para os demais.
```
Passe `ownerId()` (claim `hid`) ao núcleo pelo contexto (`ctx`), mantendo o núcleo puro. Para marcadores já gravados, `rekey` ou aceitar o ID antigo como "existente" na leitura. A mesma colisão já existe em `settings/main` (adiada para a Fase 8 no código), mas aqui é nova na Fase 3.

## Médio

### WR-03 (Médio): O avaliador não roda depois de editar limite, renda, dia do salário nem depois de lançar fora do sheet

**Arquivo:** `src/contexts/LimitAlertsContext.tsx:157-170`; chamadores de `bumpData`: só `src/components/launcher/LaunchSheet.tsx:181` e `src/components/dashboard/HomeSections.tsx:49`; sem gatilho em `src/components/settings/CategoryEditorSheet.tsx:165`, `src/components/settings/CycleIncomeCard.tsx:170,210`, `src/hooks/useTransactions.ts:38-52`

**Problema:** `evaluate` dispara ao montar, em `dataVersion` e ao voltar o foco com intervalo mínimo de 5 minutos. Ficam sem gatilho:
- baixar um limite para menos do gasto atual (o aviso só sai depois de recarregar ou de 5 minutos de aba em segundo plano);
- trocar o dia do salário, que muda a janela e o gasto (apenas o rekey roda);
- lançar, editar ou apagar em Transações (`useTransactions` não chama `bumpData`);
- a virada de ciclo com a aba aberta, porque `now` anda mas nada reavalia.

O aviso de 80%/100% é o valor central da fase; o caminho manual pelo `+` funciona, mas os demais falham em silêncio.

**Correção:** chamar `bumpData()` depois de toda gravação que muda o número (limite, renda, dia, transação em qualquer tela) ou expor `evaluate` e chamá-lo ali. Reavaliar também quando `cycleOf(now, salaryDay).key` mudar:
```tsx
const cycleKey = cycleOf(now, personConfigFor(person).salaryDay).key
useEffect(() => { void evaluate() }, [evaluate, dataVersion, cycleKey])
```

### WR-04 (Médio): Configurações do login anterior sobrevivem à troca de usuário e alimentam o avaliador

**Arquivo:** `src/contexts/AreaContext.tsx:45,47-51,75-86`, `src/contexts/LimitAlertsContext.tsx:106,125-127,152-159`, `src/App.tsx:47-50`

**Problema:** `AreaProvider` fica acima de `ProtectedRoute`, então não desmonta no logout. `loading` nunca volta a `true` e `settings` não é resetado. No login seguinte `ProtectedRoute` remonta `LimitAlertsProvider` com `settingsLoading === false` e as configurações da sessão anterior. `evaluate` roda de imediato com limites, dia do salário e categorias velhos (`latest.current`), antes de `loadSettings` concluir, e grava marcadores calculados com a configuração errada. Num aparelho compartilhado por logins de casais diferentes, a UI também mostra por instantes nomes de abas e limites do usuário anterior.

**Correção:** no efeito de `user`, `setLoading(true)` e `setSettings(initial)` antes de `loadSettings()`, e resetar ao sair (`user === null`). Idealmente chavear `AreaProvider` por `user?.uid` (`<AreaProvider key={...}>`) ou movê-lo para dentro de `ProtectedRoute`.

### WR-05 (Médio): Regras de `limitAlerts` não validam forma nem imutabilidade; marcador pode ser apagado ou adulterado

**Arquivo:** `firestore.rules:23-26`

**Problema:** `limitAlerts` usa as mesmas regras genéricas das demais coleções. Qualquer membro pode:
- `delete` um marcador (o aviso 80/100 daquele ciclo dispara de novo, quebrando a idempotência que a coleção existe para garantir);
- `update` qualquer campo (`silent`, `threshold`, `spentCents`, `cycleKey`), não só `readAt`;
- `create` com campos arbitrários (`person` do parceiro, `threshold: 7`, valores não inteiros).

O cliente honesto não faz isso, mas o marcador é a trava de idempotência; a regra não o protege.

**Correção:** bloco específico antes do genérico (e tirar `limitAlerts` de `clientCollections()`):
```
match /limitAlerts/{id} {
  allow get: if isMember() && (resource == null || ownsExisting());
  allow list: if isMember() && ownsExisting();
  allow create: if isMember() && ownsIncoming()
    && request.resource.data.keys().hasOnly(['ownerId','person','categoryId','threshold','cycleKey','spentCents','limitCents','silent','createdAt','readAt'])
    && request.resource.data.threshold in [80, 100]
    && request.resource.data.person in ['ele','ela']
    && request.resource.data.spentCents is int && request.resource.data.limitCents is int
    && request.resource.data.readAt == null;
  allow update: if isMember() && ownsExisting()
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readAt']);
  allow delete: if false;
}
```
Atualizar `matrix.test.js` (o teste atual espera `update` de `amount` e `delete` passando em todas as coleções de cliente).

### WR-06 (Médio): Aviso do ciclo anterior continua aparecendo como atual na Home e no sino

**Arquivo:** `src/components/dashboard/LimitAlertNotice.tsx:23-27`, `shared/core/alerts.js:134-159`, `src/components/layout/AlertsBell.tsx:152-158`, `src/services/limitAlerts.service.ts:56-63`

**Problema:** `getLimitAlerts` devolve os 30 mais recentes sem filtro de ciclo, e `topAlert`/`visibleAlerts` também não olham `cycleKey`. Um aviso não lido de "Alimentação passou de 100%" do mês passado aparece na Home do ciclo novo (com gasto zerado) e o link leva à linha do ciclo atual, que está "ok". Avisos antigos nunca expiram e inflam o contador do sino.

**Correção:** o contexto filtra `alerts` por `cycleKey` do ciclo atual da pessoa (ou marca como lido o que for de ciclo encerrado ao abrir um ciclo novo) antes de calcular `visible`, `unread` e `topAlert`.

### WR-07 (Médio): Duplo toque em "Marcar pago" grava dois pagamentos e "desmarcar" não desfaz

**Arquivo:** `src/components/dashboard/HomeSections.tsx:44-54`, `src/components/dashboard/FixedMonthCard.tsx:68-74`, `src/hooks/useFixedExpenses.ts:60-70`, `shared/core/budget.js:321`

**Problema:** `onMarkPaid` não tem trava de envio e o botão só é desabilitado em somente leitura. Dois toques antes do `refetch` criam dois documentos em `fixedExpensePayments` para a mesma conta e mês. O núcleo funde por chave (`paidBy.set`), então o número não duplica. Na página Contas fixas, `togglePaid` apaga só o primeiro `find` e a conta continua paga pelo segundo documento, sem forma visível de desfazer.

**Correção:** estado `pending` por `billId`+ocorrência desabilitando o botão durante o `await`. Na gravação, usar ID determinístico (`${billId}__${year}-${month}`) com `setDoc`, no mesmo molde dos avisos.

### WR-08 (Médio): O sheet de lançamento pode ficar preso em "Lançando..." e a nova tentativa duplicar o gasto

**Arquivo:** `src/components/launcher/LaunchSheet.tsx:121-189` (checagem `navigator.onLine` em `:132-134`, `addTransaction` em `:159`, `finally` em `:187-189`)

**Problema:** a guarda offline roda uma única vez antes do envio. O SDK do Firestore não rejeita `addDoc` quando a conexão cai depois dela. A promessa fica pendente até o servidor confirmar, então `saving` fica verdadeiro sem fim e o botão fica `aria-disabled`. A escrita fica na fila local e é confirmada depois. Se o usuário fechar e lançar de novo, o gasto entra duas vezes e o Pode gastar e o limite divergem do real.

**Correção:** `Promise.race` com tempo limite, avisando "Sem confirmação, confira em Transações antes de tentar de novo". Idealmente gerar o ID do documento no cliente (`doc(collection(...))` + `setDoc`) para que a repetição seja idempotente.

### WR-09 (Médio): Ciclos passados não são históricos: contas fixas ativas hoje redefinem "Sobrou/Passou no ciclo"

**Arquivo:** `src/lib/cycleData.ts:19-23,40-42`, `src/services/fixedExpenses.service.ts:24-55,90-111`, `shared/core/budget.js:318-358,461-477`

**Problema:** `loadCycleInputs` busca só contas `isActive` agora, sem data de início ou fim de vigência. Para um ciclo passado, uma conta criada hoje entra nele, e uma conta apagada some (e seus pagamentos são excluídos em `deleteFixedExpense`). O resultado "real" do ciclo passado (`monthInOne.sobra`, "Sobrou/Passou no ciclo") muda retroativamente. O texto da UI promete "resultado do ciclo".

**Correção:** guardar `startsAt`/`endedAt` na conta e filtrar por vigência no ciclo (ou congelar o resumo do ciclo ao encerrar). Se isso ficar para depois, rotular o ciclo passado como "estimativa" e não "resultado".

## Baixo

### IN-01: `rekey` e `known` usam só os 30 avisos mais recentes

**Arquivo:** `src/services/limitAlerts.service.ts:41,43`, `src/contexts/LimitAlertsContext.tsx:79,94,207-208`

**Problema:** `getLimitAlerts` tem `max = 30`. Com mais de 15 categorias limitadas (30 marcadores por ciclo), `rekeyForSalaryDay` regrava só parte dos marcadores e os avisos já enviados se repetem na chave nova. A avaliação passa a tentar uma transação por marcador que ficou fora de `known`, a cada rodada.
**Correção:** para rekey e avaliação, consultar por `cycleKey` (os marcadores do ciclo, sem teto) e manter o teto só para a exibição.

### IN-02: Editar renda "Todos os ciclos" não muda nada visível quando há sobreposição no ciclo

**Arquivo:** `src/components/settings/CycleIncomeCard.tsx:188-219`, `shared/core/budget.js:284-287`

**Problema:** `openIncome` abre sempre com o escopo "todos" e o valor-base. Se existe `incomeOverrides[ciclo]`, o override vence e o toast "Salvo" aparece sem alterar o Pode gastar. Escolher "Só este ciclo" mostra o valor-base, não o override.
**Correção:** pré-carregar o valor e o escopo a partir do override do ciclo visto quando ele existir, e avisar que o ciclo atual tem renda própria.

### IN-03: Supressão do veredito é do casal inteiro, não da pessoa

**Arquivo:** `src/hooks/useBankFreshness.ts:15-36`, `shared/core/bankStatus.js:105-107`

**Problema:** `BankConnection` tem `person`, mas `suppress` agrega todas as conexões. Banco velho da Ela deixa o ritmo do Ele neutro (e o `neutralOk` da lista de limites).
**Correção:** filtrar `connections` por `person` no `useCycleBudget(person)`.

### IN-04: Prévia do sheet ignora a data escolhida

**Arquivo:** `src/components/launcher/LaunchSheet.tsx:117,138-140,176`

**Problema:** `previewLaunch` e o "depois:" usam sempre o ciclo atual. Se a data escolhida cai em outro ciclo, o lançamento não entra no Pode gastar mostrado, e o único aviso existente cobre apenas ciclo passado visto com data de hoje.
**Correção:** comparar a data escolhida com `view` do ciclo atual e mostrar "Entra em outro ciclo, o Pode gastar não muda".

### IN-05: Atualização otimista de leitura pode ser desfeita pela avaliação em andamento

**Arquivo:** `src/contexts/LimitAlertsContext.tsx:136-139,172-181`; `src/components/layout/AlertsBell.tsx:161-165`

**Problema:** `runEvaluation` lê `stored` antes de `markRead` gravar e depois faz `setAlerts(list)`, voltando o aviso para não lido. Além disso, `openLimit` chama `markRead` mesmo em aviso já lido: regrava `readAt` e, se a escrita falhar, o rollback (`readAt: null`) transforma um aviso lido em não lido.
**Correção:** mesclar a lista nova preservando `readAt` otimista pendente, e só chamar `markRead` quando `alert.readAt == null`. No rollback, restaurar o valor anterior, não `null`.

### IN-06: Mês-calendário no fuso do aparelho em Transações e Casal

**Arquivo:** `src/services/transactions.service.ts:33-45,97-110,208`

**Problema:** `getTransactions`/`getAllTransactionsForMonth` usam `startOfMonth`/`endOfMonth` do date-fns (fuso do host). `getAccumulatedBalance` monta `monthRangeOf(untilMonth.getFullYear(), untilMonth.getMonth() + 1)` no fuso de São Paulo a partir de partes do host. Com o aparelho fora de Brasília, o mês listado e o total divergem do ciclo da Home e do limite.
**Correção:** `monthRangeOf` do núcleo (fuso fixo) nas três funções.

### IN-07: A guarda do avaliador é só texto-fonte

**Arquivo:** `test/static/phase3-data.test.js:111-130`

**Problema:** o avaliador (corrida `running/rerun`, gatilhos, falha parcial de `createAll`, relogin) é verificado por regex no código-fonte, sem teste de comportamento. A verificação da fase já marcou LIM-07 como `human_needed` por isso, e os defeitos WR-02, WR-03 e WR-04 passam por ela.
**Correção:** extrair o avaliador (`runEvaluation` + `createAll`) para função pura com serviço injetado e cobrir: colisão de ID, erro no meio do lote, reavaliação em `rerun`, configuração trocada.

### IN-08: Regra do limiar duplicada e aceita não inteiros

**Arquivo:** `shared/core/alerts.js:72,75-76`, `shared/core/limits.js:130-145`

**Problema:** `thresholdsToFire` reimplementa 80% e 100% e aceita `spent` não inteiro (`Number.isFinite`), enquanto `limitState` exige inteiro. As duas fontes podem divergir se uma for alterada.
**Correção:** `thresholdsToFire` consumir `limitState(spent, limit).state` (`warn` ou `over`) e exigir `Number.isInteger(spent)`.

### IN-09: Acessibilidade de popups e controles

**Arquivo:** `src/components/layout/AlertsBell.tsx:125-142`, `src/components/layout/CycleSelector.tsx:32-49`, `src/components/limits/LimitRow.tsx:53-78`, `src/components/ui/segmented-control.tsx:61-69`, `src/components/ui/toast.tsx:5`

**Problema:**
- O painel do sino e a lista de ciclos só fecham por clique fora e Esc; Tab para fora deixa o painel aberto.
- `role="progressbar"` dentro de `<button>`: o conteúdo de um botão é apresentacional e o nome da barra se perde. A linha já tem o texto "X% · restam", mas a barra fica sem papel.
- `role="tablist"` sem `tabpanel`/`aria-controls` nos usos de escolha simples (`LaunchSheet`, `CategoriesCard`); `radiogroup` seria o papel correto.
- Toast some em 5 s mesmo com mensagem de conteúdo ("O Pode gastar não mudou...").
**Correção:** fechar no `focusout` quando o foco sai do contêiner; tirar a barra de dentro do botão ou marcar `aria-hidden` (o texto já informa); trocar por `radiogroup`; `durationMs` maior ou persistente para mensagens que explicam o número.

### IN-10: Aviso na Home mostra o ID da categoria; o sino mostra "Categoria"

**Arquivo:** `src/components/dashboard/LimitAlertNotice.tsx:28` e `src/components/layout/AlertsBell.tsx:237-238`

**Problema:** quando a definição some, a Home exibe o slug cru (`alimentacao-2`) e o sino "Categoria". Comportamento inconsistente para o mesmo aviso.
**Correção:** uma função única (`alertCategoryName`) usada nos dois lugares.

---

_Revisado: 2026-11-18_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_
