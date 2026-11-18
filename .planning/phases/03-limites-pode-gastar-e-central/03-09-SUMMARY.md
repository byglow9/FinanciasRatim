---
phase: 03-limites-pode-gastar-e-central
plan: 09
subsystem: primitivos-de-interface
tags: [sheet, toast, notice, chip, switch, segmented-control, money-keypad, acessibilidade]
requires: [03-02, 03-04]
provides:
  - Sheet (bottom sheet) com portal, foco preso, Esc, retorno de foco, trava de rolagem e saida animada
  - ToastProvider e useToast com fila de um por vez, 5000ms e pausa em hover e foco
  - Notice, Chip, IconCircle, Collapsible e Switch no contrato do UI-SPEC
  - SegmentedControl (tablist com setas, Home e End)
  - MoneyKeypad e MoneyValue (centavos por applyKeypad, ajuste por displayTier)
  - CATEGORY_ICON_COMPONENTS e iconComponent em src/lib/categoryIcons.ts
  - test/static/phase3-primitives-new.test.js (guarda do contrato)
affects: [03-10, 03-12, 03-14, 03-15, 03-16, 03-17, 03-19, 03-20, 03-21, 03-22]
tech-stack:
  added: []
  patterns: ["montagem durante a saida por estado derivado (setMounted no render) em vez de efeito", "callback em ref para o efeito de foco depender so de open", "fila de toast com um item visivel e saida antes do proximo", "inert mais aria-hidden em painel recolhido"]
key-files:
  created: [src/components/ui/sheet.tsx, src/components/ui/toast.tsx, src/components/ui/notice.tsx, src/components/ui/chip.tsx, src/components/ui/icon-circle.tsx, src/components/ui/collapsible.tsx, src/components/ui/switch.tsx, src/components/ui/segmented-control.tsx, src/components/ui/money-keypad.tsx, src/lib/categoryIcons.ts, test/static/phase3-primitives-new.test.js]
  modified: []
decisions:
  - "Foco inicial do Sheet: o painel (tabIndex -1), ou o primeiro elemento do conteudo marcado com data-autofocus (o LaunchSheet usa na aba ativa)"
  - "Area do toast (role status, aria-live polite) fica sempre montada em portal no body; o aviso entra dentro dela, para o leitor de tela anunciar de forma confiavel"
  - "Saida do toast por transicao de opacidade de 200ms (nao ha classe anim-toast-out e index.css nao podia ser editado)"
  - "MoneyValue expoe o valor por role img com aria-label por extenso ('menos R$ 312'; centavos so quando nao zerados) e esconde o texto visual do leitor"
  - "Altura menor que 640px: variante [@media(max-height:639px)]:h-12 (confirmada no CSS gerado)"
requirements-completed: []
status: complete
commits: 3
plan_head_before: bd6dde4dfff1831ed96d36f8e3b1efd352046146
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 09: Primitivos novos de interface

Nove primitivos de `src/components/ui/` mais a tabela unica de icones de categoria, escritos a mao com os pacotes ja instalados e protegidos por guarda estatica: o lancamento, a barra superior, a Central, a Home e Configuracoes compoem estes blocos sem reimplementar dialogo, aviso, teclado nem icones.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: Sheet acessivel e Toast com fila, guardados por teste estatico | d1c0a38a | sheet.tsx, toast.tsx, phase3-primitives-new.test.js |
| 2 | Notice, Chip, IconCircle, Collapsible e Switch | 5443c963 | notice.tsx, chip.tsx, icon-circle.tsx, collapsible.tsx, switch.tsx, phase3-primitives-new.test.js |
| 3 | SegmentedControl, MoneyKeypad com MoneyValue e tabela de icones | bd37ec43 | segmented-control.tsx, money-keypad.tsx, categoryIcons.ts, phase3-primitives-new.test.js |

O gate do tracer foi cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 77 passam, 0 falham, 1 pulado pre-existente (9 testes novos em `phase3-primitives-new.test.js`).
- `npm run build`: passa (tsc confere o import de `@shared/core/format.js`, o generico do SegmentedControl e `inert`); aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- `src/index.css` e `dialog.tsx` intactos; nenhuma exclusao nos commits.

## Decisoes e conferencias

- Nenhuma dependencia nova (T-03-SC aceito): sem Radix nem biblioteca de modal ou toast.
- T-03-30: so texto React; a guarda falha se o atributo de HTML bruto aparecer nos arquivos novos. T-03-31: Esc, clique no escuro e Fechar de 44px chamam `onClose`, e a guarda confere. T-03-32: dinheiro so entra por `applyKeypad` (teto de 8 digitos); a guarda proibe `type="number"`. T-03-33: nenhum `console.*`, conferido pela guarda.
- O teclado fisico do `MoneyKeypad` ignora Ctrl, Meta e Alt e campos de texto, `textarea`, `select` e conteudo editavel.
- Para os consumidores: `Sheet` aceita `data-autofocus` no conteudo para escolher o foco inicial; `useToast().show(mensagem, { icon, durationMs })` aceita componente Lucide; `Collapsible` usa `inert` quando fechado (o gatilho e do chamador, com `aria-expanded` e `aria-controls`); barras de limite continuam limitadas a 100 de preenchimento (lembrete do 03-06, `pct` de `BudgetRow` nao satura).
- Requisitos: nenhum marcado neste plano. IDEN-07 ja constava como concluido (03-02). LIM-09 (atalhos Novo gasto, Nova receita, Contas fixas e Limites na Home) so se cumpre quando a Home usar estes primitivos (planos 14 e 16 em diante); aqui so existem os blocos.
- Nenhuma quebra planejada de teste existente (arquivos novos).
- Nao ha jsdom nem vitest (PR-16): comportamento de foco, trap e fila de toast e coberto por tsc, lint, guarda estatica e pelo UAT humano; sem verificacao em navegador neste plano.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. Os componentes nao abrem rede, armazenamento nem superficie nova; o listener global de `keydown` do teclado so existe quando `enableHardwareKeys` e verdadeiro.

## Self-Check: PASSED

- Arquivos existem: os nove primitivos, `src/lib/categoryIcons.ts` e `test/static/phase3-primitives-new.test.js`.
- Commits d1c0a38a, 5443c963 e bd37ec43 existem; contagem medida `rev-list bd6dde4d..HEAD` = 3.
