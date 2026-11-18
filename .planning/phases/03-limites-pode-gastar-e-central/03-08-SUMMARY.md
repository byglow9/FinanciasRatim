---
phase: 03-limites-pode-gastar-e-central
plan: 08
subsystem: primitivos-de-interface
tags: [progress, card, button, badge, alert, input, select, dialog, acessibilidade, contraste]
requires: [03-02]
provides:
  - Progress com tone ok, warn, over e neutral, 8px, role progressbar e aria
  - Card sem borda e sem sombra (rounded-card), CardTitle 16/700
  - Button com rounded-btn, 16/700, alvos de 44px ou mais e tamanhos circle e circleLg
  - Badge success e warning com tinta AA; Alert no formato notice
  - Input, Select e Label no contrato de 48px e 16px
  - Dialog com role dialog, aria-modal, Esc, retorno de foco e rotulo Fechar
  - test/static/phase3-primitives-restyle.test.js (guarda do contrato)
affects: [03-10, 03-11, 03-12, 03-14, 03-19]
tech-stack:
  added: []
  patterns: ["raio por tamanho no cva porque tailwind-merge nao reconhece rounded-btn", "callback do Dialog em ref para o efeito de foco depender so de open"]
key-files:
  created: [test/static/phase3-primitives-restyle.test.js]
  modified: [src/components/ui/progress.tsx, src/components/ui/card.tsx, src/components/ui/button.tsx, src/components/ui/badge.tsx, src/components/ui/alert.tsx, src/components/ui/input.tsx, src/components/ui/label.tsx, src/components/ui/select.tsx, src/components/ui/dialog.tsx]
decisions:
  - "O raio do Button vive em cada tamanho (rounded-btn ou rounded-full), nao na base: tailwind-merge nao trata rounded-btn como raio, e rounded-btn mais rounded-full ficariam juntos no mesmo elemento"
  - "Esc e retorno de foco do Dialog usam o callback onOpenChange guardado em ref, para um onOpenChange inline do pai nao reexecutar o efeito e roubar o foco de um campo em digitacao"
  - "Dialog nao ganhou trap de foco nem aria-labelledby: o plano pede role, aria-modal, Esc, retorno de foco e Fechar; o trap fica para o Sheet novo"
requirements-completed: []
status: complete
commits: 3
plan_head_before: b95e4dedea984b648b3bdc4473739aceb5714afd
actuals:
  tokens: 10000
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 08: Restilo dos primitivos de interface

Os nove primitivos de `src/components/ui/` seguem o contrato do UI-SPEC (tokens Moeda, alvos de 44px, texto de 16px, pesos 400 e 700) e o `Dialog` legado passou a ser operavel por teclado e leitor de tela; as paginas legadas herdam o visual sem edicao e uma guarda estatica protege o contrato.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: Progress com tone e role e Card sem borda, guardados por teste estatico | 5de1ecee | progress.tsx, card.tsx, phase3-primitives-restyle.test.js |
| 2 | Button, Badge e Alert no contrato de alvos, contraste e notice | 1779cb3a | button.tsx, badge.tsx, alert.tsx, phase3-primitives-restyle.test.js |
| 3 | Input, Label, Select e Dialog acessivel | c1bfcd68 | input.tsx, label.tsx, select.tsx, dialog.tsx, phase3-primitives-restyle.test.js |

O gate do tracer foi cumprido (modo interativo, `<verify>` automatizado): `test:static`, `build` e `lint` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 69 passam, 0 falham, 1 pulado pre-existente (9 testes novos em `phase3-primitives-restyle.test.js`).
- `npm run build`: passa (tsc confere todos os usos legados de `size`, `variant` e `Progress`); aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- `git diff --stat` lista so os arquivos de `files_modified`; nenhuma exclusao nos commits.

## Decisoes e conferencias

- Requisitos: nenhum marcado como concluido neste plano. CENT-02 (a Central exibir estado e lancamentos de cada limite) depende da pagina e dos componentes de limite dos planos seguintes; este plano so entrega os primitivos que eles usam. IDEN-07 ja constava como concluido.

- `Progress` mantem a estrutura de filho `div` para o preenchimento, entao os overrides legados `[&>div]:bg-green-500` continuam valendo. `value` e limitado a 0..max e `max` invalido cai para 100.
- Nenhum tamanho de `Button` abaixo de 44px (`sm` 44, `default` 48, `lg` 56, `icon` 44, `circle` 44, `circleLg` 56); todos os `size` usados nas paginas (`sm` e `icon`) continuam existindo.
- Badge e Alert usam `#dcfce7` e `#fef3c7` (e `#fee2e2` no Alert destructive) do UI-SPEC com `ok-ink`, `warn-ink` e `danger-ink`, sem texto branco sobre verde ou amarelo.
- Mitigacoes: T-03-28 (Dialog com Esc, retorno de foco e Fechar de 44px, guardado por teste), T-03-29 (Progress expoe `role` e `aria-valuenow`), T-03-27 (os primitivos so renderizam children como texto React; nenhum HTML bruto adicionado).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum.

## Self-Check: PASSED

- Arquivos: os nove primitivos e `test/static/phase3-primitives-restyle.test.js` existem.
- Commits 5de1ecee, 1779cb3a e c1bfcd68 existem; contagem medida `rev-list b95e4ded..HEAD` = 3.
