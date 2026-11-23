---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 06
subsystem: ui
tags: [tema, dark-mode, localStorage, useSyncExternalStore, cdp, node-vm]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "shared/core/theme.js (plano 05-02) e tokens dos dois temas em index.css (plano 05-03)"
provides:
  - "index.html com script inline síncrono que pinta o tema antes do primeiro desenho, título Coinc, uma só theme-color e sem metas de cache"
  - "src/hooks/useTheme.ts: initTheme() no boot e useTheme() com { pref, resolved, setPref }"
  - "src/components/settings/ThemeGroup.tsx: radiogroup Tema do aplicativo (Automático, Claro, Escuro) dentro de AppearanceCard"
  - "scripts/ux-audit/theme.mjs: auditor CDP do tema (porta 5190, termina em FALHAS n)"
  - "test/static/phase5-theme.test.js: guarda estática e execução do script inline em node:vm"
affects: [05-09 ícone novo no index.html, 05-16 dock, 05-17 revisão de telas no escuro, 05-20 fechamento de IDEN-05 e IDEN-06]

actuals:
  tokens: 9700
  tasks: 2
  commits: 2
plan_head_before: c898c1d613cd5d3ccc0d653a03b34e453c4166ab

tech-stack:
  added: []
  patterns:
    - "Tema do aparelho em módulo com useSyncExternalStore: dois snapshots primitivos (pref e resolved), troca sem animação de cor por <style> temporário"
    - "Script inline de head provado em node:vm com document, localStorage e matchMedia falsos, e comparado por texto com shared/core/theme.js"

key-files:
  created:
    - src/hooks/useTheme.ts
    - src/components/settings/ThemeGroup.tsx
    - test/static/phase5-theme.test.js
    - scripts/ux-audit/theme.mjs
  modified:
    - index.html
    - src/main.tsx
    - src/components/settings/AppearanceCard.tsx
    - src/contexts/AreaContext.tsx
    - test/static/phase3-base.test.js
    - test/static/phase3-data.test.js
    - test/static/phase3-final.test.js
    - test/static/phase3-settings-cycle.test.js

key-decisions:
  - "A meta theme-color vem antes do script inline no head: o script roda de forma síncrona e, se a meta ficasse depois, document.querySelector não a acharia e a cor da barra não mudaria no primeiro desenho"
  - "Troca de tema sem transição de cor por <style> temporário com transition:none, removido após 50 ms; o seletor não importa nada de dados, serviço nem toast"
  - "O seletor grava 'auto' explicitamente na chave (em vez de remover a chave); qualquer valor desconhecido já vale auto no script e no hook"

patterns-established:
  - "Preferência por aparelho nunca passa por AreaContext nem Firestore e nunca é desabilitada em somente leitura"

requirements-completed: []

coverage:
  - id: D1
    description: "Escuro forçado no aparelho nasce pintado: classe dark, color-scheme, theme-color e corpo rgb(10, 21, 16) antes do primeiro filho de #root"
    requirement: "IDEN-05"
    verification:
      - kind: unit
        ref: "node --test test/static/phase5-theme.test.js (script inline em node:vm: escuro, claro, auto nos dois sistemas, falhas de localStorage e matchMedia, valores desconhecidos)"
        status: pass
      - kind: e2e
        ref: "node scripts/ux-audit/theme.mjs --smoke (Chrome CDP, 360x640): FALHAS 0"
        status: pass
  - id: D2
    description: "Seletor Automático/Claro/Escuro em Ajustes: aplica na hora, vale só no aparelho, nunca desabilitado, acompanha o celular e sincroniza abas"
    requirement: "IDEN-05"
    verification:
      - kind: unit
        ref: "node --test phase5-theme phase4-settings phase3-settings-cycle; npm run test:static (479 testes, 0 falhas)"
        status: pass
      - kind: e2e
        ref: "node scripts/ux-audit/theme.mjs (seletor, recarregamento, Automático com Emulation.setEmulatedMedia, teclado, evento storage): FALHAS 0"
        status: pass
  - id: D3
    description: "Julgamento visual do cartão Aparência nos dois temas em aparelho real"
    requirement: "IDEN-06"
    verification:
      - kind: manual
        ref: "human-check do plano (UI-SPEC P-14): trocar Automático, Claro e Escuro a 360 px e olhar legibilidade e contraste percebido"
        status: pending

duration: 35min
completed: 2026-11-23
---

# Phase 5 Plan 06: Tema do aparelho Summary

Tema escolhido pelo usuário passa a valer de verdade: script inline síncrono pinta o escuro forçado antes do primeiro desenho, `useTheme` troca na hora e acompanha o celular em Automático, e o cartão Aparência ganha o seletor Automático, Claro e Escuro, tudo provado em `node:vm` e em Chrome por CDP.

## Accomplishments

- `index.html`: script inline de JavaScript antigo lê `coinc:tema:v1` (só `claro` e `escuro` valem, o resto é `auto`), consulta `matchMedia` em try próprio e escreve classe `dark`, `style.colorScheme` e a `theme-color` (`#0a1510` ou `#f5ecdb`). Título `Coinc`, uma só meta `theme-color`, `color-scheme` `light dark` mantida, três metas de cache removidas.
- `useTheme.ts`: `initTheme()` roda antes do `createRoot`, assina `matchMedia` e o evento `storage`; `useTheme()` devolve `{ pref, resolved, setPref }` por `useSyncExternalStore` com snapshots de texto estáveis. Falha de armazenamento ou de `matchMedia` cai em Automático e claro.
- `ThemeGroup.tsx` e `AppearanceCard.tsx`: radiogroup `Tema do aplicativo` com setas, Home e End, `min-h-14`, bolinha e borda de ação na opção marcada, legenda "Vale só neste aparelho.", sem `disabled`, sem toast, sem rede. Subtítulo "Tema e nomes das abas"; a nota "Tema claro..." saiu.
- `theme.mjs`: 34 verificações em Chrome, todas verdes: escuro nasce antes de `#root` (dark 17 a 600 ms contra #root 350 a 1900 ms), corpo `rgb(10, 21, 16)`, troca imediata, sobrevive a recarregamento, Automático acompanha o celular com o app aberto, teclado, evento `storage`, sem rolagem horizontal e alvos de 43,5 px ou mais.

## Task Commits

1. Task 1 (tracer): escuro forçado pinta a página antes do primeiro desenho - `b79a3bb8`
2. Task 2: seletor Automático, Claro e Escuro nos Ajustes - `2ddc1e97`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AreaContext removia a classe dark a cada montagem**
- **Found during:** Task 1
- **Issue:** `src/contexts/AreaContext.tsx` tinha um `useEffect` ("tema claro forçado até a Fase 5") que fazia `classList.remove('dark')`, desfazendo o escuro assim que o app montasse. O arquivo não está em `files_modified`.
- **Fix:** efeito removido; a guarda `phase5-theme.test.js` impede a volta dele.
- **Files modified:** src/contexts/AreaContext.tsx
- **Commit:** b79a3bb8

**2. [Rule 3 - Blocking] Guardas das fases 3 e 3.1 afirmavam o contrário do plano**
- **Found during:** Tasks 1 e 2
- **Issue:** quatro testes antigos exigiam tema claro forçado: `phase3-base` (sem `classList.add('dark')` no HTML), `phase3-data` (AreaContext tem `classList.remove('dark')`), `phase3-final` (HTML sem `classList.add/toggle('dark')`) e `phase3-settings-cycle` (nota "Tema claro..." no cartão).
- **Fix:** reescritos para a nova regra: a classe `dark` só entra no HTML depois de ler `coinc:tema:v1`, o AreaContext não mexe no tema, o cartão delega ao `ThemeGroup`. A chave antiga `financias_theme` continua proibida.
- **Files modified:** test/static/phase3-base.test.js, phase3-data.test.js, phase3-final.test.js, phase3-settings-cycle.test.js
- **Commits:** b79a3bb8, 2ddc1e97

**3. [Ajuste de ordem] Meta theme-color antes do script inline**
- **Issue:** o plano manda o script logo depois do `charset`; com a meta depois dele, `querySelector('meta[name="theme-color"]')` devolveria `null` no primeiro desenho.
- **Fix:** a meta fica entre o `charset` e o script. O script continua antes de qualquer `link` e do módulo; a guarda confere as duas ordens.
- **Commit:** b79a3bb8

**4. [Rule 1 - Bug do auditor] Recarregamento no mesmo URL**
- Navegar para o mesmo caminho com hash igual é navegação no mesmo documento e nunca dispara `Page.loadEventFired`; o auditor passou a usar `Page.reload` nos recarregamentos.
- **Commit:** 2ddc1e97

**Total deviations:** 4, nenhuma muda escopo nem arquitetura.

## Issues Encountered

- A contagem medida de commits do intervalo (`plan_head_before..HEAD`) deu 3 porque outro agente comitou `ad18557d` (05-05, focinho do ícone) em paralelo; os commits deste plano são 2, e `actuals.commits` registra 2.

## Known Stubs

Nenhum.

## Deferred Items

- O `human-check` da Task 2 (julgamento visual do cartão Aparência nos dois temas em aparelho real, UI-SPEC P-14) fica para o dono no UAT; o contraste medido e o auditor já passam.
- `requirements mark-complete` não foi executado: IDEN-05 e IDEN-06 só fecham no plano 05-20, por orientação do orquestrador.

## Threat Flags

Nenhum. T-05-06-01 a T-05-06-04 cobertos: só `claro` e `escuro` ligam algo, `try` separados com queda segura (teste em `node:vm`), `useTheme` sem importar serviço nem contexto de dados (guarda estática), sem CSP no Hosting (aceito).

## Verification

`npm run test:static` (479 testes, 0 falhas), `npm run test:core` (699, 0 falhas), `npm run build`, `npm run lint` e `node scripts/ux-audit/theme.mjs` (`FALHAS 0`), com `--smoke` também `FALHAS 0`.

## Self-Check: PASSED

- Arquivos: index.html, src/hooks/useTheme.ts, src/components/settings/ThemeGroup.tsx, test/static/phase5-theme.test.js e scripts/ux-audit/theme.mjs existem.
- Commits `b79a3bb8` e `2ddc1e97` existem no histórico.
