---
phase: 03-limites-pode-gastar-e-central
plan: 15
subsystem: casca-barra-superior
tags: [AlertsBell, CycleSelector, ProfileSwitcher, TopBar, acessibilidade, somente-leitura, guarda-estatica]
requires: [03-04, 03-08, 03-09, 03-10, 03-11, 03-13]
provides:
  - AlertsBell com avisos de limite de 80% e 100%, vencimentos no fuso de Sao Paulo, selo, painel acessivel e evento coinki:open-alerts
  - CycleSelector com chevrons, rotulo por cycleLabel e lista dos ultimos 12 ciclos
  - ProfileSwitcher com menu de perfil (proprio, parceiro em somente leitura) e Sair
  - TopBar (ciclo, sino, engrenagem das Configuracoes e perfil), ainda nao montada
  - test/static/phase3-topbar.test.js (7 asserções)
affects: [03-16, 03-18, 03-21]
tech-stack:
  added: []
  patterns: ["painel do sino ancorado no conteiner relativo da TopBar (nao no botao) para caber em 360px", "carga de vencimentos por .then com flag de cancelamento (passa react-hooks/set-state-in-effect)", "contador de aberturas do painel refaz a carga de vencimentos sem efeito por minuto do useNow", "ultimo relogio lido por ref para a carga nao depender do now que renova a cada 60s"]
key-files:
  created: [src/components/layout/AlertsBell.tsx, src/components/layout/CycleSelector.tsx, src/components/layout/ProfileSwitcher.tsx, src/components/layout/TopBar.tsx, test/static/phase3-topbar.test.js]
  modified: []
decisions:
  - "O painel do sino usa absolute right-4 top-full e a TopBar e o conteiner relative: ancorado ao botao, o painel de 328px sairia da tela em 360px, porque o botao nao e o ultimo da direita"
  - "Os vencimentos do sino cobrem todas as contas ativas devolvidas por getFixedExpenses() sem filtro de pessoa (como o plano manda), o que inclui as de pessoa conjunto; o orcamento ignora conjunto (PR-03), o aviso de vencimento nao"
  - "A carga de vencimentos refaz a consulta ao abrir o painel, para um pagamento feito em Contas fixas sumir do sino sem esperar o dataVersion"
  - "ProfileSwitcher navega para / ao escolher um perfil de pessoa estando em /porquinho, como o AreaSelector faz; sem isso a pagina do Porquinho ficaria sob um perfil de pessoa"
  - "A lista do CycleSelector parte do ciclo atual da pessoa (shiftCycle(cycleFor, -offset)), entao nao anda junto com o ciclo visto; com offset alem de 11 ciclos para tras nenhuma opcao fica marcada"
  - "Itens do menu de perfil e da lista de ciclos usam foco por codigo (tabIndex -1 nos itens do menu), Tab fecha o menu"
requirements-completed: []
status: complete
commits: 3
plan_head_before: 335f2867ccb6e08ef9fb7599ff5f336a8c240a61
actuals:
  tokens: 7400
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 15: Barra superior (sino, ciclo, perfil)

A barra superior da casca nova: sino com os avisos de limite guardados e os vencimentos próximos, seletor de ciclo, menu de perfil com o parceiro em somente leitura e engrenagem das Configurações, tudo pelo núcleo e protegido por guarda estática. Os componentes ficam prontos; o `AppShell` os monta no Plano 18 (o `Header` atual continua em uso).

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: do aviso guardado ao sino, a marca de lido e ao link da Central | ced91c99 | AlertsBell.tsx |
| 2 | CycleSelector e ProfileSwitcher | 3008409d | CycleSelector.tsx, ProfileSwitcher.tsx |
| 3 | TopBar e guarda estática da barra superior | 985959e5 | TopBar.tsx, phase3-topbar.test.js |

O gate do tracer foi cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portões

- `npm run test:core:tz`: 234 passam, 0 falham (UTC e Asia/Tokyo).
- `npm run test:static`: 108 passam, 0 falham, 1 pulado pré-existente (7 testes novos em `phase3-topbar.test.js`).
- `npm run test:rules`: 12 passam, 0 falham.
- `npm run test:emu`: 58 passam, 0 falham.
- `npm --prefix server test`: 81 passam, 0 falham.
- `npm run build`: passa; aviso de chunk acima de 500 kB é pré-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pré-existentes.
- Nenhuma exclusão nos commits. `Header`, `BottomNav`, `NotificationsBell`, `MainLayout` e `AreaSelector` intactos. Nenhum teste existente quebra de propósito neste plano (só arquivos novos).

## Mitigações

- T-03-49: nome de categoria e de conta só como texto React; a guarda falha se `dangerouslySetInnerHTML` aparecer nos quatro arquivos.
- T-03-50: o link monta `#cat-` só com o `categoryId` do aviso (slug), passado por `encodeURIComponent`; a resolução na Central é do Plano 21.
- T-03-51: o sino lê só `useLimitAlerts()`, que já filtra pela pessoa do claim.
- T-03-52: vencimento por `nextOccurrence` e `daysBetweenParts` do núcleo; a guarda falha se `getDate(` aparecer.
- T-03-53 (aceito): somente leitura é só de interface; o menu apenas liga o modo.
- Prova de que o sino não grava: a guarda falha se `createLimitAlertIfAbsent`, `evaluate` ou `rekeyForSalaryDay` aparecerem no `AlertsBell`. Nenhum `console.*` nos quatro arquivos (guarda).

## Requisitos

Nenhum marcado como concluído. IDEN-07 já constava como concluído. LIM-07 só se cumpre quando o sino estiver montado na casca (Plano 18) e o aviso discreto da Home existir (Plano 16); LIM-10 depende da tela de ciclo e renda em Configurações (Plano 17), que muda o dia do salário. Aqui existem os componentes, mas nada os monta ainda.

## Pendente herdado do 03-11

O estado "Habilitado" do índice `limitAlerts` segue sem confirmação no Console. Enquanto estiver "Criando", o provider engole `failed-precondition` e o sino mostra só os vencimentos. Conferir antes do UAT.

## Deviations from Plan

Nenhum desvio de regra. Escolhas de implementação dentro do plano (registradas em `decisions`):

- Painel do sino ancorado na TopBar e não no botão (largura em 360px).
- `ProfileSwitcher` navega para `/` ao sair do Porquinho (comportamento do `AreaSelector`).
- Seta para baixo no gatilho do perfil também abre o menu, e Home e End navegam no menu e na lista de ciclos.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Sem endpoint, rede nova nem coleção nova: o sino usa as leituras já existentes de `fixedExpenses` e `fixedExpensePayments` e o contexto de avisos.

## Verificação não feita

Sem jsdom nem navegador (PR-16): foco inicial e retorno de foco, clique fora, teclado do menu e da lista de ciclos, truncamento em 360px, posição do painel do sino e o evento `coinki:open-alerts` ficam para o UAT humano. A rota `/limites` ainda não existe (Plano 21 / casca no Plano 18), então o toque num aviso de limite só tem destino depois deles. Os componentes não estão montados, então não há como vê-los na tela até o Plano 18.

## Self-Check: PASSED

- Arquivos existem: AlertsBell.tsx, CycleSelector.tsx, ProfileSwitcher.tsx, TopBar.tsx e phase3-topbar.test.js.
- Commits ced91c99, 3008409d e 985959e5 existem; contagem medida `rev-list 335f2867..HEAD` = 3.
