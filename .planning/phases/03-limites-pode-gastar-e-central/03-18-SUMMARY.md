---
phase: 03-limites-pode-gastar-e-central
plan: 18
subsystem: casca-e-navegacao
tags: [AppShell, NavRail, LaunchFab, CouplePage, dock, guarda-estatica]
requires: [03-14, 03-15, 03-16]
provides:
  - NavRail (dock flutuante rolável de 9 destinos só de ícones, fade de borda, item ativo centralizado, regra do Porquinho derivada da rota) com o LaunchFab (botão + de 56px)
  - AppShell (TopBar, ReadOnlyBanner, conteúdo com folga de 112px, NavRail e LaunchSheet)
  - CouplePage em /casal (conteúdo antigo do Dashboard realocado, com aviso "em breve")
  - App.tsx com LaunchProvider e AppShell na ordem ToastProvider, ProtectedRoute, CycleProvider, LimitAlertsProvider, LaunchProvider, AppShell
  - test/static/phase3-shell.test.js (7 asserções)
affects: [03-19, 03-20, 03-21, 03-22, 03-23]
tech-stack:
  added: []
  patterns: ["primeira medida do fade do dock por requestAnimationFrame para não chamar setState de forma síncrona no efeito (react-hooks/set-state-in-effect)", "Porquinho derivado da rota em efeito que chama setCurrentArea do contexto", "atalho de lançar em somente leitura usa aria-disabled e não disabled, para o toque ainda mostrar o toast da guarda"]
key-files:
  created: [src/components/layout/NavRail.tsx, src/components/layout/AppShell.tsx, src/pages/CouplePage.tsx, test/static/phase3-shell.test.js]
  modified: [src/App.tsx]
  removed: [src/components/layout/MainLayout.tsx, src/components/layout/Header.tsx, src/components/layout/BottomNav.tsx, src/components/layout/NotificationsBell.tsx, src/components/shared/AreaSelector.tsx]
decisions:
  - "Item ativo do dock casa por caminho exato em Início e por prefixo de segmento nos demais; /configuracoes não tem item ativo"
  - "Rolagem do item ativo é smooth, e auto com prefers-reduced-motion"
  - "CouplePage mostra o H1 Casal em todos os tamanhos (o original só mostrava a partir de sm), porque o dock não tem rótulo e o UI-SPEC pede o nome do destino como H1 em cada página"
  - "A guarda estática confere pesos 500 e 600 por classe nos três arquivos e por fontWeight só nos dois arquivos novos, para não mexer no labelStyle do comparativo movido do Dashboard"
status: complete
commits: 3
plan_head_before: 5b4b162ff3df5eb3fda7b04c0a9ae4bf7f2b6bcd
actuals:
  tokens: 9500
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
requirements-completed: []
---

# Fase 3 Plano 18: Casca nova com dock flutuante, botão + e Casal

O app inteiro passa a viver na casca nova: dock flutuante de 9 destinos só de ícones com o botão + de lançamento, barra superior, faixa de somente leitura e sheet de lançamento. O conteúdo antigo do Dashboard segue acessível em `/casal` e a navegação antiga (Header, BottomNav, AreaSelector, sino antigo e MainLayout) deixou de existir.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: o app inteiro dentro da casca nova (AppShell, NavRail e App.tsx) | c8a83a73 | NavRail.tsx, AppShell.tsx, App.tsx, MainLayout.tsx (removido) |
| 2 | Casal (/casal) com o conteúdo antigo do Dashboard; remoção de Header e AreaSelector | 808d3d15 | CouplePage.tsx, App.tsx, Header.tsx e AreaSelector.tsx (removidos) |
| 3 | Remover BottomNav e o sino antigo e guardar a casca por teste estático | 0007d96a | phase3-shell.test.js, BottomNav.tsx e NotificationsBell.tsx (removidos) |

Gate do tracer cumprido (modo interativo, `human_verify_mode` end-of-phase, `<verify>` só automatizado): `test:static`, `build` e `lint` reexecutados verdes antes da Tarefa 2.

## Como funciona

- **Dock:** `nav` "Navegação principal" fixo (`z-40`, laterais de 12px, base `calc(16px + env(safe-area-inset-bottom))`, `max-w-[560px]` centralizado). Nove `Link` de 48x48 com ícone Lucide de 22px, `aria-label` e `title` com o nome e `aria-current="page"` no ativo (`bg-primary` com ícone branco). A pílula esconde a barra, contém a rolagem horizontal e mostra a máscara de 24px só do lado com conteúdo escondido (estado `{ left, right }` inicial `{ false, true }`, atualizado em scroll e resize passivos).
- **LaunchFab:** círculo de 56px `bg-brand` com `plus` branco de 28px; chama `useLaunch().open('gasto')`. Em somente leitura fica `aria-disabled` com `bg-track`, continua focável e o clique mostra o toast da guarda do `LaunchProvider`.
- **Porquinho:** efeito na rota liga `currentArea = 'porquinho'` em `/porquinho` e devolve `lastPerson` em qualquer outra rota (D-02).
- **AppShell:** `TopBar` não fixa, `ReadOnlyBanner` num bloco de 560px, `main` com `max-w-4xl` e `pb-[calc(112px+env(safe-area-inset-bottom))]`, `NavRail` e `LaunchSheet`.
- **Casal:** `CouplePage` é o JSX e os hooks do Dashboard (totais por pessoa, saldo do Porquinho e comparativo Recharts, por mês-calendário, PR-11), com título "Casal", legenda "Totais e comparativo por mês" e `Notice` "O relatório do casal completo chega em breve."; sem `BankStatusNotice`. `DashboardPage.tsx` ficou intacta (Plano 22).

## Deviations from Plan

### Auto-added Issues

**1. [Rule 2 - Descobribilidade] H1 do Casal visível em todos os tamanhos**
- **Found during:** Tarefa 2
- **Issue:** no código movido o título do Dashboard só aparecia a partir de `sm`. Com o dock só de ícones, o celular ficaria sem nome de página, contra o UI-SPEC ("cada página mostra o nome do destino como H1").
- **Fix:** removido o `hidden sm:block` do bloco do título e o contêiner passou a `flex flex-wrap items-center justify-between`. O restante do JSX movido não foi alterado.
- **Files modified:** src/pages/CouplePage.tsx
- **Commit:** 808d3d15

Fora isso, o plano foi executado como escrito. Nenhum teste existente foi quebrado pela troca de navegação (nenhum deles referenciava os cinco arquivos removidos), então não houve teste a atualizar.

## Requisitos

Nenhum requisito marcado como concluído neste plano.
- IDEN-07 já constava como concluído (03-02).
- CENT-01 só se fecha com a Central em `/limites` (Plano 21) e o resumo na Home (Planos 20 e 22).
- CENT-06 só se fecha quando a Home mostrar o resumo das Contas Fixas com atalho (Planos 20 e 22). Aqui só existe o acesso pelo dock.

## Threat Flags

Nenhuma superfície nova além do modelo do plano. T-03-64 mitigada (AppShell e providers dentro de `ProtectedRoute`, ordem guardada por teste); T-03-66 (pílula rolável com fade, item ativo centralizado, `aria-label` nos 9 itens; UAT em celular real fica no Plano 23); T-03-67 e T-03-68 (texto React apenas; hooks e comparativo do Dashboard conferidos pela guarda). T-03-65 aceita (bloqueio só de interface).

## Known Stubs

- O item "Central de limites" do dock aponta para `/limites`, que só ganha rota e tela no Plano 21, e a Home atual (`/`) segue sendo o `DashboardPage` antigo até o Plano 22. Entre este plano e eles o clique na Central cai numa página sem conteúdo. É intencional (o plano proíbe registrar `/limites` aqui) e não há entrega publicada nesse intervalo. Não foi gravado no `.planning/WINDOWS.md` porque os Planos 21 e 22 resolvem a lacuna na mesma fase.

## Verificação final

| Comando | Resultado |
|---------|-----------|
| `npm run test:core:tz` | 234/234 em UTC e 234/234 em Asia/Tokyo |
| `npm run test:static` | 135 passam, 0 falham, 1 ignorado (136) |
| `npm run test:rules` | 12/12 |
| `npm run test:emu` | 58/58 |
| `npm --prefix server test` | 81/81 |
| `npm run build` | verde |
| `npm run lint` | 0 erros (2 avisos já existentes, em EventForm e NoteForm) |

Não foi feita verificação visual em navegador neste plano (o `<verify>` é só automatizado); a conferência em celular real é do UAT do Plano 23.

## Self-Check: PASSED

Arquivos criados conferidos: NavRail.tsx, AppShell.tsx, CouplePage.tsx e phase3-shell.test.js. Os cinco arquivos removidos não existem mais. Commits c8a83a73, 808d3d15 e 0007d96a existem.
