---
phase: quick-261118-mkh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/index.css
  - src/components/ui/button.tsx
  - src/components/ui/chip.tsx
  - src/components/ui/toast.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/switch.tsx
  - src/components/ui/money-keypad.tsx
  - src/components/launcher/CategoryPicker.tsx
  - src/components/launcher/LaunchSheet.tsx
  - src/components/layout/NavRail.tsx
  - src/components/layout/CycleSelector.tsx
  - src/components/layout/ProfileSwitcher.tsx
  - src/components/layout/AlertsBell.tsx
  - src/components/dashboard/FixedMonthCard.tsx
  - src/components/dashboard/HomeSections.tsx
  - src/components/dashboard/LimitAlertNotice.tsx
  - src/components/limits/LimitRow.tsx
  - src/components/settings/CycleIncomeCard.tsx
  - src/components/settings/CategoryEditorSheet.tsx
  - src/components/settings/DayPicker.tsx
  - src/components/settings/IconPicker.tsx
  - src/components/fixed-expenses/FixedExpenseList.tsx
  - src/components/calendar/MonthCalendar.tsx
  - src/components/calendar/AgendaCalendar.tsx
  - src/pages/DashboardPage.tsx
  - src/pages/SettingsPage.tsx
  - src/pages/TransactionsPage.tsx
  - src/pages/CalendarPage.tsx
  - src/pages/FixedExpensesPage.tsx
  - src/pages/LimitsPage.tsx
  - src/components/dashboard/CentralSummaryCard.tsx
  - src/App.tsx
  - src/lib/cycleMonth.ts
  - src/lib/limitHash.ts
  - src/contexts/AreaContext.tsx
  - src/contexts/LimitAlertsContext.tsx
  - src/hooks/useCycleBudget.ts
  - src/hooks/useFixedExpenses.ts
  - src/services/settings.service.ts
  - src/services/transactions.service.ts
  - src/services/savings.service.ts
  - src/services/fixedExpenses.service.ts
  - shared/core/categories.js
  - shared/core/categories.test.js
  - shared/core/async.js
  - shared/core/async.test.js
  - shared/core/ids.js
  - shared/core/ids.test.js
  - test/static/phase3-gaps.test.js
  - test/static/phase3-primitives-restyle.test.js
  - test/static/phase3-shell.test.js
  - test/static/phase3-central.test.js
  - test/static/phase3-final.test.js
  - test/static/phase3-topbar.test.js
  - test/static/phase3-home-cards.test.js
  - test/static/phase3-home-components.test.js
  - test/static/phase3-home-sections.test.js
  - .planning/phases/03-limites-pode-gastar-e-central/03-UAT-GUIDE.md
autonomous: true
requirements: [LIM-07, LIM-10, CENT-01, CENT-02, IDEN-07]

must_haves:
  truths:
    - "Os botões de ação (Entrar, Lançar gasto, chip Conta, categoria selecionada no LaunchSheet, item ativo do dock) têm fundo verde escuro #14532d e texto branco; o ícone do dock ativo não some ao tocar"
    - "O LaunchSheet com os detalhes recolhidos cabe sem rolagem em 360x640 e 390x844"
    - "Marcar pago em Contas Fixas é um quadrado de cantos suaves (rounded-md), não um círculo"
    - "Transações, Calendário e Contas Fixas não têm seletor de mês próprio: seguem o ciclo escolhido no CycleSelector do topo, que ganhou rótulo sem truncar e lista de ciclos redesenhada"
    - "O Calendário não tem a linha do seletor de mês; a legenda (i) e o + ficam na linha do alternador Financeiro/Agenda; o detalhe do dia abre em Sheet e a grade ocupa a maior parte da tela"
    - "Não existem a rota /limites, a LimitsPage, o CentralSummaryCard nem o destino do dock; o dock tem 8 destinos; os limites aparecem só na seção Limites do mês da Home (todas as linhas) e em Configurações > Categorias; avisos do sino e da Home levam à Home com a linha expandida"
    - "CR-01: falha ao carregar as Configurações mostra erro com Tentar de novo na Home e em Configurações e bloqueia toda gravação de configuração"
    - "WR-01: personConfig e categoryDefs são gravados por transação sobre o documento atual, nunca sobre o snapshot velho do contexto"
    - "WR-03: o avaliador de avisos roda após editar limite, renda ou dia do salário, após lançar/editar/apagar em Transações e na virada de ciclo"
    - "WR-07: duplo toque em Marcar pago não cria dois pagamentos (trava de envio + ID determinístico)"
    - "WR-08: o LaunchSheet nunca fica preso em Lançando; a nova tentativa reaproveita o mesmo ID de documento e não duplica o gasto"
  artifacts:
    - path: "src/index.css"
      provides: "tokens --color-action e --color-action-text com hex literal"
    - path: "test/static/phase3-gaps.test.js"
      provides: "guarda estática desta tarefa (tokens, dock, Central removida, seletor único, correções da revisão)"
    - path: "shared/core/async.js"
      provides: "withTimeout puro com teste"
    - path: "shared/core/ids.js"
      provides: "paymentDocId determinístico com teste"
    - path: "src/lib/cycleMonth.ts"
      provides: "mês-calendário derivado do ciclo escolhido, memoizável por cycle.key"
  key_links:
    - from: "src/contexts/AreaContext.tsx"
      to: "src/services/settings.service.ts"
      via: "updatePersonConfig/updateCategoryDefs recebem um atualizador aplicado dentro de runTransaction"
    - from: "src/pages/TransactionsPage.tsx"
      to: "src/contexts/LimitAlertsContext.tsx"
      via: "bumpData() após add/update/remove dispara o avaliador"
    - from: "src/components/launcher/LaunchSheet.tsx"
      to: "src/services/transactions.service.ts"
      via: "ID de documento gerado no cliente e reaproveitado na nova tentativa"
---

<objective>
Fechar as lacunas do UAT no celular e os achados CR-01, WR-01, WR-03, WR-07 e WR-08 do 03-REVIEW.md antes do redesign da Fase 3.1. Nada de redesign amplo das abas: só o que o dono apontou.

Decisão nova do dono (UAT 2026-11-18) que substitui D-20 (dock com 9 destinos, incluindo a Central) e D-21 (a Central só exibe) e torna CENT-01 e CENT-02 obsoletos: a Central de Limites sai do app. Os limites ficam só na seção "Limites do mês" da Home e em Configurações > Categorias (D-12, D-21 continuam valendo para a edição em Configurações). Registrar essa substituição no SUMMARY.

Purpose: o Coinki volta a ser usável no celular (botões visíveis, lançamento sem rolagem, um seletor de ciclo só) e a camada de configurações deixa de poder apagar limites e categorias do casal.
Output: 3 tarefas, commits atômicos por assunto, guarda estática nova `test/static/phase3-gaps.test.js`, SUMMARY com o diagnóstico da causa raiz e a lista de pendências.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/phases/03-limites-pode-gastar-e-central/03-REVIEW.md
@.planning/phases/03-limites-pode-gastar-e-central/03-UI-SPEC.md
@.planning/phases/03-limites-pode-gastar-e-central/03-CONTEXT.md
@.planning/phases/03-limites-pode-gastar-e-central/03-UAT-GUIDE.md

Regras do repositório (valem para as 3 tarefas): sem emoji; só ícones Lucide; paleta Moeda (UI-SPEC: escala tipográfica 12/16/28/56 e pesos 400/700 nos arquivos novos e reescritos, que a guarda `phase3-final` confere); só `node:test` (sem jsdom); ambiente por `. ./scripts/dev-env.sh` em CADA chamada de Bash (o estado do shell não persiste); commits atômicos com `git add` explícito de caminhos; manter `.env.local`, `.planning/state.json` e `.planning/milestone.lock` fora de qualquer commit (não ler `.env.local`). Mensagens de commit terminam com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Nunca usar `pkill -f` (casa com o próprio comando do shell); guarde o PID e use `kill <pid>`.

Fatos já medidos pelo planejador (não refazer a pesquisa, só confirmar a linha de base na Tarefa 1):
- Em Chromium (versão do Playwright 1234, mobile 390x800 DPR 3 com toque), no servidor de dev (`VITE_USE_EMULATOR=true`, usuário MOCK) e no build de produção em `dist/`, todo elemento `bg-primary` computa `rgb(20, 83, 45)` com texto branco, inclusive o botão Entrar e o item ativo do dock. O CSS compilado tem `.bg-primary` com `hsl(var(--primary))`, a ordem das camadas está certa (`properties, theme, base, components, utilities`), o tailwind-merge preserva `bg-primary` em Button, Chip e NavRail, e nada sobrescreve `--primary` em tempo de execução. Logo camada, token e merge NÃO são a causa em Chromium: o defeito aparece só no navegador do celular do dono e não reproduz aqui.
- `size="icon"` do Button ganhou `rounded-btn` (16px) na 03-08; qualquer chamador que reduza para `h-8 w-8` ou `h-7 w-7` vira círculo. O tailwind-merge não reconhece `rounded-btn` como raio, então um `rounded-md` em `className` NÃO o substitui de forma confiável.
- Transações, Calendário e Contas Fixas guardam um `selectedMonth` próprio (`useState(new Date())`) e renderizam o `MonthSelector` de grade 3x4; a TopBar já tem o `CycleSelector` do ciclo. `useTransactions` e os efeitos do Calendário dependem da identidade do `Date`: o mês derivado do ciclo precisa ser memoizado por `cycle.key`, senão há laço de refetch.
- `src/pages/CouplePage.tsx` e `src/pages/ReportsPage.tsx` também usam o `MonthSelector`; ficam como estão (fora do pedido do dono, viram pendência da 3.1) e o componente `MonthSelector` NÃO é apagado.
</context>

<tasks>

<task type="auto">
  <name>Tarefa 1: Botões de ação (causa raiz), dock, LaunchSheet sem rolagem e Marcar pago (itens 1, 2, 3 e 5 do UAT)</name>
  <files>
    src/index.css, src/components/ui/button.tsx, src/components/ui/chip.tsx, src/components/ui/toast.tsx, src/components/ui/badge.tsx, src/components/ui/switch.tsx, src/components/ui/money-keypad.tsx, src/components/launcher/CategoryPicker.tsx, src/components/launcher/LaunchSheet.tsx, src/components/layout/NavRail.tsx, src/components/layout/CycleSelector.tsx, src/components/layout/ProfileSwitcher.tsx, src/components/layout/AlertsBell.tsx, src/components/dashboard/FixedMonthCard.tsx, src/components/limits/LimitRow.tsx, src/components/settings/CycleIncomeCard.tsx, src/components/settings/DayPicker.tsx, src/components/settings/IconPicker.tsx, src/components/fixed-expenses/FixedExpenseList.tsx, src/pages/DashboardPage.tsx, test/static/phase3-primitives-restyle.test.js, test/static/phase3-gaps.test.js
  </files>
  <read_first>
    src/index.css, src/components/ui/button.tsx, src/components/layout/NavRail.tsx, src/components/launcher/LaunchSheet.tsx, src/components/ui/sheet.tsx, src/components/ui/money-keypad.tsx, src/components/fixed-expenses/FixedExpenseList.tsx, test/static/phase3-primitives-restyle.test.js
  </read_first>
  <behavior>
    - Guarda: `--color-action` e `--color-action-text` em `src/index.css` são hex literais e `--color-action` é o mesmo valor (tolerância de 1 por canal) que o triplete HSL de `--primary` convertido para RGB, então os dois tokens não divergem.
    - Guarda: nenhum arquivo em `src/` (comentários removidos) usa `bg-primary` sólido (sem barra de opacidade) nem `text-primary-foreground`; tintas translúcidas (`bg-primary/10`) e `text-primary`/`border-primary` continuam permitidos.
    - Guarda: o ramo ativo do NavRail usa `bg-action text-action-text`.
    - Guarda: `button.tsx` declara o tamanho `iconSm` com `rounded-md`; `FixedExpenseList.tsx` usa `size="iconSm"` na versão móvel e não combina `size="icon"` com `h-8 w-8` nem `h-7 w-7`.
  </behavior>
  <action>
    1. Diagnóstico com evidência (antes de editar; registrar no SUMMARY). Suba `npx vite --port <porta livre>` com `VITE_USE_EMULATOR=true` em segundo plano (guarde o PID) e dirija o Chrome headless (`google-chrome --headless=new --no-sandbox --remote-debugging-port=<p>` com um perfil temporário no scratchpad) por um script CDP descartável (Node 22, `WebSocket` global, `Page.navigate`, `Runtime.evaluate` com `getComputedStyle`, `Emulation.setDeviceMetricsOverride` 390x800 mobile e `Emulation.setTouchEmulationEnabled`). Confirme a linha de base do contexto na Home, no sheet de lançamento (abra pelo "+") e no dock, e repita com `Emulation.setEmulatedMedia` para `prefers-color-scheme: dark` e `forced-colors: active`. Se alguma rodada reproduzir fundo ausente, corrija ESSA causa e pule o endurecimento do passo 2 apenas se ele ficar redundante. Se nenhuma reproduzir (esperado), escreva no SUMMARY: "causa não reproduzida em Chromium; defeito específico do navegador do celular; endurecimento aplicado; o dono confirma no aparelho". Não commitar o script.

    2. Endurecimento do caminho do fundo de ação. Em `src/index.css`, dentro de `@theme inline`, acrescente `--color-action: #14532d` e `--color-action-text: #ffffff` com um comentário curto dizendo que espelham `--primary`/`--primary-foreground` (UI-SPEC, cor de "Ação") em hex literal, para o fundo e o texto dos botões não dependerem de `hsl(var(...))` nem do nome `primary`. Mantenha `--primary`, `--primary-foreground` e `--ring` como estão (o anel de foco e as tintas translúcidas continuam neles). Em todos os arquivos listados em `<files>` que tenham `bg-primary` sólido, `text-primary-foreground`, `hover:bg-primary/90` ou `hover:bg-primary/80`, troque por `bg-action`, `text-action-text`, `hover:bg-action/90` e `hover:bg-action/80`. Preserve exatamente `bg-primary/10`, `bg-primary/[0.xx]`, `text-primary` e `border-primary...` (são tintas de acento, não superfícies de ação). Inclua os pontos de 8px de `ProfileSwitcher.tsx` e `AlertsBell.tsx` e o estado marcado de `switch.tsx`. `CycleSelector.tsx` só troca a classe da linha selecionada aqui (a Tarefa 2 o redesenha). O static `phase3-primitives-restyle.test.js` exige hoje `bg-primary text-primary-foreground` no Button: atualize essa expectativa para os novos tokens e acrescente `iconSm` à lista de tokens do Button.

    3. Dock (item 2). No `NavRail.tsx`, o item ativo usa `bg-action text-action-text`; o ícone herda a cor do link. O sumiço ao tocar tem a mesma causa do passo 2 (o ativo é o único item com fundo de ação), então não crie outro mecanismo. Não mexa nos destinos aqui (a Tarefa 2 remove a Central).

    4. LaunchSheet sem rolagem desnecessária (item 3). O painel do `Sheet` tem `max-h-[92dvh] overflow-y-auto`; a rolagem aparece quando o conteúdo passa disso. Não altere o `Sheet` compartilhado. Compacte o conteúdo de `LaunchSheet.tsx` e `money-keypad.tsx` até que, com os detalhes recolhidos, `scrollHeight <= clientHeight` do painel em 360x640 e em 390x844 (medir com o mesmo script CDP, no modo MOCK, para as três abas Gasto, Receita e Porquinho). Alavancas permitidas, nesta ordem: reduzir margens verticais (`mt-4` e `mt-3` para `mt-2`); no teclado, estender o corte de altura baixa (`max-height`) para que a tecla de 56px caia para 48px em telas até ~760px de altura (48px continua acima do alvo mínimo de 44px); levar a linha de chips "Conta" e "Cartão (em breve)" para a mesma linha do rótulo "Categoria". Proibido remover função ou chip visível com os detalhes recolhidos. Com os detalhes expandidos a rolagem interna é aceitável. Registre no SUMMARY as alturas medidas antes e depois.

    5. Marcar pago não circular (item 5). Em `button.tsx` acrescente o tamanho `iconSm: "h-8 w-8 rounded-md p-0"` (raio dentro do tamanho, como `circle`, porque o tailwind-merge não resolve `rounded-btn` contra `rounded-md`). Em `FixedExpenseList.tsx`, a versão móvel passa a usar `size="iconSm"` nos três botões (marcar pago, editar, excluir) e remove os `className` `h-8 w-8` e `h-7 w-7`; a versão desktop mantém `size="icon"` (44px, cantos suaves). Escreva no SUMMARY a causa do círculo: a 03-08 deu `rounded-btn` (16px) a todos os tamanhos e 16px em 32px é um círculo.

    6. Guarda e commits. Crie `test/static/phase3-gaps.test.js` (padrão dos outros: `node:test`, `read`/`code` que remove comentários, `ROOT` por `import.meta.url`) com as quatro guardas do bloco `<behavior>`. Commits sugeridos: (a) tokens de ação e troca das classes + testes; (b) dock, LaunchSheet e Marcar pago. `git add` explícito.
  </action>
  <verify>
    <automated>. ./scripts/dev-env.sh && npm run test:static && npm run lint && npm run build</automated>
  </verify>
  <done>
    Guarda estática verde; lint e build verdes; no Chromium em modo MOCK os elementos de ação computam `rgb(20, 83, 45)` com texto branco; o painel do LaunchSheet não rola com os detalhes recolhidos em 360x640 e 390x844 nas três abas; o Marcar pago móvel tem raio de 6px; SUMMARY registra o diagnóstico (reproduzido ou não) e as alturas medidas.
  </done>
</task>

<task type="auto">
  <name>Tarefa 2: Sai a Central de Limites, seletor de ciclo único, Calendário cheio e Contas Fixas enxuta (itens 4, 6, 7 e o extra do item 5)</name>
  <files>
    src/pages/LimitsPage.tsx (apagar), src/components/dashboard/CentralSummaryCard.tsx (apagar), src/App.tsx, src/components/layout/NavRail.tsx, src/pages/DashboardPage.tsx, src/components/dashboard/HomeSections.tsx, src/components/dashboard/LimitAlertNotice.tsx, src/components/layout/AlertsBell.tsx, src/components/limits/LimitRow.tsx, src/lib/limitHash.ts, src/lib/cycleMonth.ts, src/components/layout/CycleSelector.tsx, src/pages/TransactionsPage.tsx, src/pages/CalendarPage.tsx, src/pages/FixedExpensesPage.tsx, src/components/calendar/MonthCalendar.tsx, src/components/calendar/AgendaCalendar.tsx, test/static/phase3-gaps.test.js, test/static/phase3-shell.test.js, test/static/phase3-central.test.js, test/static/phase3-final.test.js, test/static/phase3-topbar.test.js, test/static/phase3-home-cards.test.js, test/static/phase3-home-components.test.js, test/static/phase3-home-sections.test.js, .planning/phases/03-limites-pode-gastar-e-central/03-UAT-GUIDE.md
  </files>
  <read_first>
    src/App.tsx, src/pages/DashboardPage.tsx, src/components/dashboard/HomeSections.tsx, src/components/limits/LimitRow.tsx, src/components/layout/CycleSelector.tsx, src/pages/TransactionsPage.tsx, src/pages/CalendarPage.tsx, src/pages/FixedExpensesPage.tsx, src/components/calendar/MonthCalendar.tsx, src/components/calendar/AgendaCalendar.tsx, src/components/ui/sheet.tsx, src/hooks/useSectionReveal.ts, test/static/phase3-central.test.js, test/static/phase3-final.test.js
  </read_first>
  <action>
    A. Central de Limites removida (item 7, substitui D-20 e D-21 por decisão do dono). Apague `src/pages/LimitsPage.tsx` e `src/components/dashboard/CentralSummaryCard.tsx`. Em `App.tsx` remova o import e a rota da Central (sobram 9 rotas). No `NavRail.tsx` remova o destino e o ícone `Gauge` do import; o dock passa a ter 8 destinos (Início, Transações, Calendário, Contas fixas, Metas, Relatórios, Casal, Porquinho) e o comentário de cabeçalho deixa de citar 9. Em `DashboardPage.tsx`: o ramo Porquinho mostra só o `Notice` com o texto "Na aba Porquinho não há Pode gastar nem limite." (sem link e sem o cartão de resumo); a Home passa a ler o hash da URL e entregar `expandId` ao `HomeSections`; chame `useHashReveal(undefined, view !== null)` (já existe em `useSectionReveal.ts`). Crie `src/lib/limitHash.ts` com a função `expandIdFromHash(hash)` movida da LimitsPage (aceita só `#cat-...`, decodifica dentro de try, devolve `undefined` se inválido; o hash nunca vira seletor, só `getElementById`). Em `HomeSections.tsx` tire o `CentralSummaryCard` e repasse `expandId` ao `LimitsList`; em `LimitRow.tsx` remova a prop `max`, o corte `visible/hidden` e o link "Ver os outros N limites" (a Home mostra TODAS as linhas, pois não há mais outra tela). O aviso da Home (`LimitAlertNotice.tsx`) e o sino (`AlertsBell.tsx`, `openLimit`) passam a levar à raiz da Home com o hash da linha (`/#cat-<id>` codificado) em vez da rota removida. O atalho "Limites" da Home continua descendo à seção `lm`. Não toque no núcleo (`BudgetView.counts` fica, apenas sem consumidor de tela).

    B. Seletor de ciclo único (item 4). Crie `src/lib/cycleMonth.ts` com `cycleMonthDate(cycle)`, que devolve o primeiro dia do mês-calendário em que o ciclo começa (usa `cycle.startParts.year` e `startParts.month`). Em `TransactionsPage.tsx`, `CalendarPage.tsx` e `FixedExpensesPage.tsx` apague o `MonthSelector`, o `useState` de `selectedMonth` e o `div` espaçador vazio; derive `selectedMonth` de `useCycle()` (`viewPerson`, `cycleFor`) e MEMOIZE por `cycle.key` (`useMemo` com `cycle.key` nas dependências), senão `useTransactions` e os efeitos do Calendário entram em laço de refetch. Deixe um comentário curto: o recorte dessas telas segue o mês em que o ciclo começa (com dia de salário diferente de 1 é aproximação; o recorte exato fica para a 3.1). Não apague `MonthSelector.tsx` (Casal e Relatórios ainda o usam). Redesenhe `CycleSelector.tsx` dentro da paleta Moeda, sem grade 3x4: (1) o rótulo do ciclo atual não pode truncar a 360px de largura (medir; se faltar largura, ajuste os chevrons laterais mantendo altura de 44px, e acrescente um `ChevronDown` de 16px muted ao lado do rótulo); (2) a lista passa a um painel `rounded-[22px] bg-surface-2 border border-border shadow-float p-2` com largura `min(320px, 100vw - 32px)`, linhas de 48px, agrupadas por ano com um rótulo pequeno (12/700 muted), cada linha com o rótulo do ciclo à esquerda (16/700 quando selecionada) e à direita, em 12 muted, o período `dd/mm a dd/mm` (use `dayMonth` do núcleo); a linha selecionada usa `bg-card` mais o ícone Lucide `Check`; o ciclo atual ganha o `Chip` estático "Atual" (tone `ok`). Preserve papéis e teclado (listbox, option, setas, Home, End, Esc, foco inicial no selecionado), a escolha por `setOffset`, e use só `shiftCycle` e `cycleLabel` do núcleo (nada de aritmética de data no fuso do host).

    C. Calendário (item 6). Pontos confirmados no código: existe UM alternador Financeiro/Agenda (não há segundo seletor duplicado); o "bloco inferior" é o painel de detalhe do dia que cresce abaixo da grade. Registre isso no SUMMARY. Remova a linha do seletor de mês; o `Tabs` Financeiro/Agenda fica no topo, e na MESMA linha, à direita, ficam o botão de legenda (ícone Lucide `Info`, 44px, popover de cores existente) e o botão "+" (nova nota no Financeiro, novo evento na Agenda; `Button` padrão, 44px). Tire o `+` absoluto da linha antiga. O detalhe do dia deixa de ser um bloco abaixo da grade e passa a abrir num `Sheet` (`@/components/ui/sheet`, título com a data) ao tocar num dia, tanto em `MonthCalendar.tsx` quanto em `AgendaCalendar.tsx`, mantendo todo o conteúdo e as ações (nova nota, editar, excluir); os botões `h-7 w-7` desses painéis passam a `size="iconSm"` (criado na Tarefa 1). A grade ocupa a maior parte da tela: contêiner com altura mínima baseada em `dvh` e linhas `auto-rows-fr` para as 6 semanas esticarem; confirme por medição CDP (modo MOCK, 390x844) que a grade tem pelo menos 55% da altura da janela e que nada fica sob o dock.

    D. Contas Fixas (item 5, elemento extra). Com o `MonthSelector` fora, remova também os cartões "Pagas" e "Pendentes" (fica só "Total Mensal", em largura total). O print do dono não está no repositório; esta é a leitura mais provável do "elemento extra" e o botão "+ Nova" foi MANTIDO porque é o único caminho de criar conta fixa (Transações mantém o seu). Descreva exatamente o que foi removido e por quê no SUMMARY (seção "O que removi em Contas Fixas") e deixe claro que é uma suposição a confirmar com o dono. O hook `useFixedExpenses` continua devolvendo `totals.paid`/`pending`; não mexa nele aqui.

    E. Testes e documentos (atualize o que a mudança quebra). `phase3-shell.test.js`: 8 destinos sem a Central e sem `Gauge` na lista de ícones; a rota `/limites` e o import da `LimitsPage` saem da expectativa do `App.tsx`. `phase3-central.test.js`: reescreva como guarda de AUSÊNCIA (os dois arquivos apagados não existem; nenhum arquivo de `src/` cita a rota removida; a Home trata o hash `#cat-` por `expandIdFromHash`; `LimitsList` não tem mais `max`). `phase3-final.test.js`: 9 rotas; tire `CentralSummaryCard` e `LimitsPage` da lista de arquivos novos e, se o piso `> 55` passar a falhar, ajuste-o ao novo tamanho da lista. `phase3-topbar.test.js`, `phase3-home-cards.test.js`, `phase3-home-components.test.js`, `phase3-home-sections.test.js`: troque as expectativas da rota e do cartão removidos pelas novas (aviso leva a `/#cat-`; ordem das seções sem o cartão da Central); revise também as expectativas do `CycleSelector` redesenhado. `03-UAT-GUIDE.md`: tire a Central dos passos (b), (c), (e), (i) e do título da seção 3.1, passe os ícones do dock a 8, ajuste o passo dos avisos (a linha abre expandida na Home) e corrija a nota "Transações, Relatórios e Calendário seguem por mês-calendário" para dizer que Transações, Calendário e Contas Fixas seguem o ciclo escolhido no topo (mês em que o ciclo começa) e que Relatórios e Casal mantêm seletor próprio. Estenda `phase3-gaps.test.js` com: ausência da Central e do `Gauge` no dock; `cycleMonthDate` memoizado por `cycle.key` nas três páginas e nenhum `MonthSelector` nelas; `CalendarPage` sem `MonthSelector` e com o detalhe do dia em `Sheet`; `FixedExpensesPage` sem "Pagas" nem "Pendentes". Commits sugeridos: (a) remoção da Central e dos links + testes + guia; (b) seletor de ciclo único e CycleSelector; (c) Calendário e Contas Fixas. `git add` explícito.
  </action>
  <verify>
    <automated>. ./scripts/dev-env.sh && npm run test:static && npm run lint && npm run build && test ! -e src/pages/LimitsPage.tsx && test ! -e src/components/dashboard/CentralSummaryCard.tsx</automated>
  </verify>
  <done>
    Guarda estática, lint e build verdes; dock com 8 destinos; nenhum acesso à Central no código nem no guia de UAT; Home mostra todas as linhas de Limites do mês e abre a linha pedida pelo hash do aviso; Transações, Calendário e Contas Fixas seguem o ciclo do topo sem seletor próprio e sem laço de refetch; CycleSelector redesenhado sem truncar a 360px; Calendário com legenda e + ao lado do alternador, detalhe do dia em Sheet e grade com pelo menos 55% da altura; SUMMARY lista o que foi removido em Contas Fixas e o que ficou como pendência (Casal e Relatórios ainda com `MonthSelector`).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Tarefa 3: Correções da revisão CR-01, WR-01, WR-03, WR-07 e WR-08</name>
  <files>
    src/contexts/AreaContext.tsx, src/services/settings.service.ts, shared/core/categories.js, shared/core/categories.test.js, shared/core/async.js, shared/core/async.test.js, shared/core/ids.js, shared/core/ids.test.js, src/pages/SettingsPage.tsx, src/pages/DashboardPage.tsx, src/hooks/useCycleBudget.ts, src/components/settings/CycleIncomeCard.tsx, src/components/settings/CategoryEditorSheet.tsx, src/contexts/LimitAlertsContext.tsx, src/pages/TransactionsPage.tsx, src/components/launcher/LaunchSheet.tsx, src/services/transactions.service.ts, src/services/savings.service.ts, src/services/fixedExpenses.service.ts, src/hooks/useFixedExpenses.ts, src/components/dashboard/HomeSections.tsx, src/components/dashboard/FixedMonthCard.tsx, test/static/phase3-gaps.test.js
  </files>
  <read_first>
    .planning/phases/03-limites-pode-gastar-e-central/03-REVIEW.md, src/contexts/AreaContext.tsx, src/services/settings.service.ts, src/contexts/LimitAlertsContext.tsx, src/components/launcher/LaunchSheet.tsx, src/services/fixedExpenses.service.ts, src/hooks/useFixedExpenses.ts, src/components/settings/CategoryEditorSheet.tsx, src/components/settings/CycleIncomeCard.tsx, shared/core/categories.js, shared/core/purity.test.js
  </read_first>
  <behavior>
    - `withTimeout(promise, ms)` (shared/core/async.js): resolve ou rejeição da promessa original passam intactos se vierem antes do prazo; depois do prazo rejeita com Error cujo `code` é `'timeout'`; limpa o temporizador nos dois caminhos; não usa `Date.now` (a guarda de pureza do núcleo proíbe).
    - `paymentDocId(billId, year, month)` (shared/core/ids.js): determinístico, mês com dois dígitos (`<billId>__<ano>-<mm>`), mesma entrada gera o mesmo ID e meses/contas diferentes geram IDs diferentes.
    - `reconcileCategoryDefs(names, defs)` (shared/core/categories.js): reproduz exatamente a reconciliação que hoje mora no `useMemo` do AreaContext (a lista `categories` decide quem está ativo: nome na lista = ativa, fora = arquivada, nome novo ganha id); cobrir documento antigo só com nomes, rollback e categoria arquivada.
  </behavior>
  <action>
    Escreva primeiro os três testes puros acima (vermelho), depois as funções (verde), cada uma exportada de um módulo de `shared/core` sem importar pacote (a guarda `purity.test.js` descobre o arquivo novo sozinha).

    CR-01 (erro de carga não cai em padrões). Em `AreaContext.tsx` substitua o booleano por um estado `settingsStatus` de `'loading' | 'ready' | 'error'` (o `loading` do contexto continua existindo como `settingsStatus === 'loading'` para os consumidores atuais) e exponha `reloadSettings()`, que volta a `'loading'` e relê. O `catch` de `loadSettings` marca `'error'` (sem registrar valores). Todo gravador do contexto (`updateTabNames`, `updateCategoryDefs`, `updatePersonConfig`, `updateNotifications`, `updateTheme`) lança um erro pt-BR claro quando o status não é `'ready'`, ANTES de qualquer escrita. `DashboardPage.tsx`: com `'error'`, em vez de "Falta saber quanto entra" mostra o `Notice` de perigo "Não foi possível carregar suas configurações." com o botão "Tentar de novo" que chama `reloadSettings`; `useCycleBudget.ts` só consulta com o status `'ready'` (junte isso ao `enabled`). `SettingsPage.tsx`: com `'loading'` mostra o esqueleto neutro e com `'error'` mostra o mesmo aviso com nova tentativa; nenhum cartão editável fora de `'ready'`. `LimitAlertsContext.tsx` só avalia com `'ready'`.

    WR-01 (gravar sobre o documento atual). Em `settings.service.ts`, `updatePersonConfig(person, atualizador)` e `updateCategoryDefs(atualizador)` passam a receber uma função pura e a aplicá-la dentro de `runTransaction` sobre o que o documento tem agora: para a pessoa, lê `personConfig.<pessoa>`, normaliza com `normalizePersonConfig`, aplica o atualizador e grava SÓ `personConfig.<pessoa>` por caminho pontilhado; para categorias, lê `categories` e `categoryDefs`, reconcilia com `reconcileCategoryDefs` (a mesma função que o contexto passa a usar no `useMemo`), aplica o atualizador e grava `categoryDefs` e `categories` (`activeCategoryNames`) juntos. Ambos devolvem o valor gravado e o contexto atualiza o estado local com ESSE valor, não com o snapshot velho. O caminho MOCK lê, aplica e grava sem transação. `CycleIncomeCard.tsx` e `CategoryEditorSheet.tsx` passam atualizadores que reaplicam os mesmos auxiliares puros do núcleo (`setSalaryDay`, `setExpectedIncome`, `setCategoryLimit`, `addCategory`, `renameCategory`, `archiveCategory`) sobre o valor fresco; a pré-validação sobre o snapshot continua para mostrar o erro no campo, e um erro de regra lançado dentro do atualizador também aparece pt-BR sob o campo (não vira "falha de conexão"). O atualizador precisa ser puro: a transação pode repetir.

    WR-03 (avaliador após edições). Chame `bumpData()` (de `useCycle()`) depois de gravação concluída em: `CategoryEditorSheet` ao salvar com limite alterado, `CycleIncomeCard` após salvar a renda e após salvar o dia do salário (neste último, DEPOIS do `await rekeyForSalaryDay`, para a reavaliação nunca correr contra os marcadores ainda na chave antiga), e em `TransactionsPage` após adicionar, editar e apagar (envolva o `onDelete`). Não coloque o `bumpData` dentro de `useTransactions` (Casal e Relatórios também o usam). Em `LimitAlertsContext.tsx` calcule `cycleKey` (`cycleOf(now, personConfigFor(person).salaryDay).key`, vazio sem pessoa) e acrescente-o às dependências do efeito que chama `evaluate`, para a virada de ciclo com a aba aberta reavaliar.

    WR-07 (duplo toque em Marcar pago). `markAsPaid` em `fixedExpenses.service.ts` grava com `setDoc(doc(db, 'fixedExpensePayments', paymentDocId(...)), ...)` (MOCK: substitui a entrada de mesmo id, sem duplicar). `useFixedExpenses.togglePaid` ignora chamada reentrante para a mesma conta (conjunto de pendentes em `useRef`) e, ao desmarcar, apaga TODOS os pagamentos daquela conta e mês (há duplicados legados). `HomeSections.tsx` mantém um conjunto de chaves pendentes (`billId-ano-mês`) em `useState` declarado ANTES do retorno antecipado; `FixedMonthCard.tsx` recebe `pendingKeys` e desabilita o botão (e põe `aria-busy`) enquanto a chave está pendente; a chave sai do conjunto no `finally`.

    WR-08 (sheet preso e nova tentativa duplicando). `addTransaction` e `addSavingsTransaction` aceitam um `id` opcional de documento e, quando presente, gravam com `setDoc` nesse id (sem ele seguem em `addDoc`); exporte um gerador de ID no cliente por serviço (Firestore: `doc(collection(db, ...)).id`, sem rede; MOCK: `mId()`). No `LaunchSheet.tsx`, gere o ID uma vez por montagem do formulário e reaproveite-o em toda tentativa; embrulhe a gravação em `withTimeout` de 8 000 ms. Em rejeição mantenha a mensagem atual; em `timeout` mostre "Sem confirmação do servidor. Confira em Transações antes de tentar de novo." com o botão "Tentar de novo", libere `saving` no `finally` (o botão nunca fica em "Lançando..." sem fim) e preserve os dígitos. A nova tentativa com o mesmo ID sobrescreve o mesmo documento, então não duplica; o guia de UAT (passo d.4) já promete uma única gravação.

    Guarda e verificação final. Estenda `phase3-gaps.test.js` com as guardas de texto-fonte destas correções (contexto expõe `settingsStatus` e `reloadSettings` e os gravadores checam o status; serviço usa `runTransaction` e o caminho pontilhado `personConfig.`; nenhum gravador recebe a lista/nó calculado do estado do contexto; `bumpData` nos três pontos e `cycleKey` nas dependências do avaliador; `LaunchSheet` usa `withTimeout` e ID estável; `markAsPaid` usa `setDoc` e `paymentDocId`; `HomeSections`/`FixedMonthCard` com pendência). Atualize as guardas antigas que olham os gravadores pelo padrão velho (`phase3-settings-cycle.test.js`, `phase3-settings-categories.test.js`, `phase3-data.test.js`, `phase3-launcher.test.js`, `phase3-home-sections.test.js`; descubra por `grep -ln`). Commits sugeridos: (a) núcleo puro + testes; (b) CR-01; (c) WR-01; (d) WR-03; (e) WR-07 e WR-08. `git add` explícito. Ao terminar, rode a bateria completa da seção de verificação e escreva o SUMMARY.
  </action>
  <verify>
    <automated>. ./scripts/dev-env.sh && npm run test:core:tz && npm run test:static && npm run lint && npm run build</automated>
  </verify>
  <done>
    Testes puros e guardas verdes; ao falhar a carga das Configurações a Home e Configurações mostram o erro com nova tentativa e nenhuma gravação de configuração acontece; limites, renda e categorias gravam por transação e caminho pontilhado; editar limite, renda ou dia, ou mexer em Transações, reavalia os avisos; Marcar pago com toque duplo gera um único pagamento; o LaunchSheet sai de "Lançando..." com aviso claro e a nova tentativa reaproveita o ID.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL hash para DOM | `#cat-<id>` vem de link, sino ou digitação; só chega a `getElementById`, nunca a seletor |
| cliente para Firestore | IDs de documento gerados no cliente (lançamento, pagamento); as regras por dono continuam sendo a barreira |
| cliente para `settings/main` | gravação de configuração do casal por dois aparelhos e dois logins |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qk-01 | Tampering | `settings/main` (`personConfig`, `categoryDefs`) | critical | mitigate | CR-01 bloqueia gravação fora de `'ready'`; WR-01 grava por transação/caminho pontilhado sobre o documento atual (sem sobrescrever o nó inteiro a partir de snapshot velho) |
| T-qk-02 | Tampering | `expandIdFromHash` e `useHashReveal` | low | mitigate | só `decodeURIComponent` dentro de try, prefixo `#cat-` obrigatório, elemento achado por `getElementById`; guarda estática confere |
| T-qk-03 | Tampering | gravação duplicada (`fixedExpensePayments`, `transactions`, `savings`) | medium | mitigate | ID determinístico (`paymentDocId`) e ID de cliente estável por tentativa; trava de envio na interface |
| T-qk-04 | Spoofing | ID de documento escolhido pelo cliente | low | accept | as regras por dono (`ownsIncoming` na criação, `ownerId` imutável na atualização) continuam valendo; o ID de pagamento embute o ID da conta, que é aleatório do Firestore |
| T-qk-05 | Denial of Service | LaunchSheet preso em "Lançando..." | medium | mitigate | `withTimeout` de 8 000 ms com `finally` liberando o estado |
| T-qk-06 | Information Disclosure | logs de erro | low | mitigate | sem valores, nomes de categoria ou descrições em `console`; manter o padrão atual de `catch` silencioso |

Sem instalação de pacote nesta tarefa (nenhuma dependência nova), portanto sem portão T-SC.
</threat_model>

<verification>
Bateria final (rodar depois da Tarefa 3, todas verdes; `. ./scripts/dev-env.sh` antes de cada comando ou no mesmo `&&`):

- `npm run test:core:tz`
- `npm run test:static`
- `npm run test:rules`
- `npm run test:emu`
- `npm --prefix server test`
- `npm run build`
- `npm run lint`

Conferências adicionais (medidas com o script CDP descartável, em modo MOCK): elementos de ação com `rgb(20, 83, 45)`; painel do LaunchSheet sem rolagem em 360x640 e 390x844; grade do Calendário com pelo menos 55% da altura da janela; rótulo do CycleSelector sem truncar a 360px.

Pendências a listar no SUMMARY (não fazer agora): WR-02, WR-04, WR-05, WR-06, WR-09 e IN-01 a IN-10 do 03-REVIEW.md; Casal e Relatórios ainda usam o `MonthSelector` de grade; recorte de Transações, Calendário e Contas Fixas é o mês em que o ciclo começa (exato na 3.1); LIM-07 segue pendente de confirmação humana no aparelho; CENT-01 e CENT-02 obsoletos por decisão do dono; o item do print em Contas Fixas é suposição a confirmar; a causa do fundo ausente dos botões só se confirma no celular do dono.
</verification>

<success_criteria>
- Os sete itens de bug do UAT estão tratados e documentados no SUMMARY (incluindo o que foi removido em Contas Fixas e o diagnóstico da causa raiz).
- CR-01, WR-01, WR-03, WR-07 e WR-08 corrigidos, com testes puros e guarda estática.
- Nenhuma menção operacional à Central de Limites no código nem no 03-UAT-GUIDE.md; dock com 8 destinos.
- Bateria final verde; commits atômicos; `.env.local`, `.planning/state.json` e `.planning/milestone.lock` fora dos commits.
</success_criteria>

<output>
Criar `.planning/quick/261118-mkh-fase-3-lacunas-do-uat-e-revisao-de-codig/261118-mkh-SUMMARY.md` ao terminar.
</output>
