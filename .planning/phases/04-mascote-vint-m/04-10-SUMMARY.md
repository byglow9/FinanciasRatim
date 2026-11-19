---
phase: 04-mascote-vint-m
plan: 10
subsystem: settings-ui
tags: [vintem, settings, tone, radiogroup, accessibility, node-test]
requires: []
provides:
  - "VintemTone, VINTEM_TONES, DEFAULT_VINTEM_TONE, vintemToneOf e Settings.vintemTone opcional em src/types/index.ts"
  - "updateVintemTone(tone) no AreaContext (interface e valor do provider)"
  - "VintemToneCard (radiogroup de tom, ancora #vintem) entre Aparencia e Notificacoes em SettingsPage"
  - "test/static/phase4-settings.test.js"
affects: [04-12, 04-16]
status: complete
commits: 2
plan_head_before: aabb615c353daec6f12cdf04af44dc600f68b81d
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - "Gravador de campo de topo na forma de updateNotifications (assertReady, updateSettings, setSettings, console.error sem valor)"
    - "Ressincronizacao durante a renderizacao comparando com o valor anterior (sem setState em efeito)"
    - "Radiogroup com teclado copiado do SegmentedControl (setas, Home, End; so a opcao ativa e tabulavel)"
key-files:
  created:
    - src/components/settings/VintemToneCard.tsx
    - test/static/phase4-settings.test.js
  modified:
    - src/types/index.ts
    - src/contexts/AreaContext.tsx
    - src/pages/SettingsPage.tsx
key-decisions:
  - "Resolucao 5 (D-10b): tom e UM so para o casal, no documento settings/main, campo de topo vintemTone; padrao sem-filtro quando ausente; DEFAULT_SETTINGS intacto"
  - "vintemToneOf aceita so os tres valores e cai no padrao para qualquer outro (T-04-10-01)"
  - "Sem service novo: updateSettings ja grava campos de topo e nao menciona ownerId"
requirements-completed: [MASC-05]
---

# Phase 4 Plan 10: Tom do Vintem em Configuracoes Summary

**Cartao "Vintem" com radiogroup acessivel de tres tons (Suave, Direto, Sem filtro), um so para o casal, padrao sem filtro, salvando ao tocar com aviso e reversao em falha.**

## Performance

- **Tasks:** 2 (1 tracer, 1 auto)
- **Files:** 2 criados, 3 modificados

## Accomplishments

- `Settings.vintemTone` opcional e `vintemToneOf` tolerante a documento antigo ou valor desconhecido (cai em `sem-filtro`).
- `updateVintemTone` no `AreaContext`: `assertReady()` antes de gravar, `updateSettings({ vintemTone: tone })`, estado local atualizado, `console.error` sem valor.
- `VintemToneCard`: `role="radiogroup"` "Tom do Vintém", tres linhas `role="radio"` de `min-h-14`, bolinha de selecao, borda `border-action` na marcada, chip "padrão" ao lado de Sem filtro, aviso "Tom do Vintém: {nome}".
- Teclado (ArrowDown/Right, ArrowUp/Left, Home, End movem e ativam), so a opcao ativa com `tabIndex={0}`.
- Perfil do parceiro: linhas `aria-disabled`, sem gravacao, legenda "Volte ao seu perfil para editar".
- Falha: reverte a selecao, `Notice` danger com o texto exato do contrato; nova tentativa limpa o aviso; toques durante o salvamento sao ignorados.
- Cartao posicionado entre `AppearanceCard` e `NotificationsCard`; a guarda de ordem da Fase 3 continua verde.

## Task Commits

1. **Task 1 (tracer): tom salvo no documento do casal e cartao** - `b74cf0c2`
2. **Task 2: teclado, somente leitura, reversao em falha e ressincronizacao** - `c5731782`

## Verification

- `node --test test/static/phase4-settings.test.js test/static/phase3-settings-categories.test.js`: 15/15 passam (apos a Task 1); `phase4-settings` 6/6 apos a Task 2.
- `npm run lint`: limpo.
- `npx tsc -b`: nenhum erro nos arquivos deste plano. O `npm run build` passou apos a Task 1; apos a Task 2 ele falha SOMENTE por erros de tipo em `shared/core/phrasePicker.js` e `shared/core/phraseRules.js` (plano 04-04, em andamento em paralelo, fora do escopo). Reexecutado depois de esperar, o erro persiste no trabalho do outro plano.
- `npm run test:static`: 349/351; a unica falha e `test/static/phase4-review-sheet.test.js`, do plano 04-04 (commit RED). Nada deste plano.
- `npm run test:rules` nao roda aqui (sem Java), como previsto no plano; este plano nao altera as regras do Firestore.

## Deviations from Plan

- O comentario do componente `SettingsPage` nao traz uma contagem fixa de cartoes (o plano pedia "oito"; a pagina tem sete cartoes reais, e o UI-SPEC numera Notificacoes como 8o). O comentario cita as ancoras e a posicao do `#vintem` entre Aparencia e Notificacoes. Sem efeito funcional.
- `commits: 2` e contagem dos commits deste plano (`git log --grep "(04-10)"`); `git rev-list` do ledger devolve 6 porque o plano 04-04 commita na mesma branch em paralelo.

## Known Stubs

Nenhum. A previa "Exemplo" do cartao chega no plano 04-16 e o balao le `settings.vintemTone` no 04-12, conforme o plano.

## Threat Flags

Nenhum. Mitigacoes T-04-10-01 (valor invalido cai no padrao), T-04-10-02 (`readOnly` e `assertReady`) e T-04-10-03 (log sem valor) aplicadas e cobertas pela guarda estatica.

## Self-Check: PASSED

- FOUND: src/components/settings/VintemToneCard.tsx, test/static/phase4-settings.test.js, este SUMMARY
- FOUND commits: b74cf0c2, c5731782
