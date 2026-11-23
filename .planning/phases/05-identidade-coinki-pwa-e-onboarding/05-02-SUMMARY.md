---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 02
subsystem: pwa
tags: [pwa, service-worker, theme, shared-core, node-test]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: contexto, UI-SPEC e padroes da fase (D-08, D-09, D-14)
provides:
  - "shared/core/pwaUpdate.js: decideUpdate, decideReload, decidePreloadError e as constantes de janela e chave"
  - "shared/core/theme.js: normalizeTheme, resolveTheme, themeColorFor e as constantes de chave e cor"
affects: [05-06 useTheme e script inline do index.html, 05-10 registerPwa]

actuals:
  tokens: 3170
  tasks: 2
  commits: 3
plan_head_before: fbe19437f91ff22542a3b4eefd36aebecc441a83

tech-stack:
  added: []
  patterns:
    - "Politica de service worker como funcao pura que so decide; relogio e armazenamento ficam com o chamador"
    - "Conjunto fechado por igualdade exata para valores vindos do armazenamento local"

key-files:
  created:
    - shared/core/pwaUpdate.js
    - shared/core/pwaUpdate.test.js
    - shared/core/theme.js
    - shared/core/theme.test.js
  modified: []

key-decisions:
  - "decideReload com carimbo valido e now invalido ignora (nao da para provar que a janela de 10 s passou); sem carimbo valido recarrega"
  - "decideUpdate com entrada que nao e objeto devolve 'nada'; msSinceOpen negativo ou nao finito espera"
  - "themeColorFor usa comparacao explicita com 'escuro', sem lookup por chave, para nao aceitar nomes herdados do prototipo"

patterns-established:
  - "Nucleo puro de PWA/tema em shared/core, coberto automaticamente pela guarda purity.test.js"

requirements-completed: [IDEN-04, IDEN-05]

coverage:
  - id: D1
    description: "Politica de troca de versao e guarda contra laco de recarga, pura e testada em UTC e Asia/Tokyo"
    requirement: "IDEN-04"
    verification:
      - kind: unit
        ref: "TZ=UTC e TZ=Asia/Tokyo node --test shared/core/pwaUpdate.test.js"
        status: pass
  - id: D2
    description: "Resolucao de tema com conjunto fechado auto, claro e escuro e cor da barra por tema"
    requirement: "IDEN-05"
    verification:
      - kind: unit
        ref: "npm run test:core:tz (shared/core/theme.test.js)"
        status: pass

duration: 2min
completed: 2026-11-23
---

# Phase 5 Plan 02: Nucleo puro de atualizacao silenciosa e tema Summary

Duas funcoes puras em `shared/core`: a politica de quando trocar a versao do app e de quando recarregar sem entrar em laco (D-14), e a resolucao do tema em conjunto fechado auto, claro e escuro (D-08, D-09), ambas testadas em UTC e Asia/Tokyo.

## Accomplishments

- `decideUpdate({ hasWaiting, msSinceOpen, busy, hidden })` devolve `ativar`, `esperar` ou `nada`: sem versao esperando nunca age; em segundo plano ativa mesmo com algo em andamento; visivel com Sheet, Dialog ou campo em edicao espera; visivel e livre ativa ate 3000 ms (fronteira inclusa) e espera depois.
- `decideReload` ignora a segunda recarga em menos de 10 s (e relogio andando para tras); `decidePreloadError` recarrega uma vez e so `alreadyReloaded === true` vira `erro`.
- `normalizeTheme` aceita apenas os tres textos exatos; `resolveTheme` faz `auto` seguir o sistema e `claro` e `escuro` ignora-lo; `themeColorFor` devolve `#f5ecdb` ou `#0a1510`.
- Constantes exportadas para o script inline, o `useTheme` e o registro do service worker: `THEME_KEY`, `THEME_PREFS`, `THEME_COLORS`, `OPEN_WINDOW_MS`, `SW_RELOAD_GUARD_MS`, `SW_RELOAD_KEY`, `PRELOAD_RELOAD_KEY`.

## Task Commits

1. Task 1: politica de atualizacao silenciosa e guarda de recarga - `b9ea84c9`
2. Task 2: resolucao do tema com conjunto fechado - `b6458c46`

O campo `commits: 3` do frontmatter e a medicao `git rev-list` desde `plan_head_before`; inclui o commit `9a33413d` (`docs(05): fails_when na tarefa 3 do plano 20`), feito por outro agente em paralelo e que nao pertence a este plano.

## TDD

RED confirmado com um esqueleto que exporta os nomes e erra o comportamento: 12 falhas por asserção em `pwaUpdate.test.js` e 10 em `theme.test.js` (nao por modulo ausente). GREEN: `npm run test:core:tz` com 699 testes passando em UTC e em Asia/Tokyo, inclusive a guarda `purity.test.js`, que descobriu os dois modulos novos sem mudanca na lista. Teste e implementacao de cada tarefa foram comitados juntos, porque o plano e `type: execute`.

## Deviations from Plan

None - plan executed exactly as written.

Casos que o plano nao especificava e que ficaram conservadores: `now` invalido em `decideReload` com carimbo valido ignora; entrada que nao e objeto em `decideUpdate` devolve `nada`.

## Threat Model

T-05-02-01, T-05-02-02 e T-05-02-03 mitigados no codigo e cobertos por teste (conjunto fechado, guarda de 10 s e recarga unica por erro de trecho, espera quando ha algo em andamento).

## Known Stubs

None.

## Threat Flags

None.

## Issues Encountered

None.

## Self-Check: PASSED

- FOUND: shared/core/pwaUpdate.js, shared/core/pwaUpdate.test.js, shared/core/theme.js, shared/core/theme.test.js
- FOUND: commits b9ea84c9 e b6458c46
