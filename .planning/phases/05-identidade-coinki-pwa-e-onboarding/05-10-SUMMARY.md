---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 10
subsystem: pwa
tags: [pwa, service-worker, atualizacao-silenciosa, boot-error, cdp, vite-plugin-pwa]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: "05-02 politica pura shared/core/pwaUpdate.js; 05-09 worker de pre-cache, installPrompt.ts e executor CDP pwa.mjs"
provides:
  - "src/lib/pwa/registerPwa.ts: registerPwa({ onBootError }) com a politica do nucleo, intervalo de 1 h, visibilitychange e vite:preloadError (so em producao)"
  - "src/lib/pwa/isBusy.ts: Sheet ou Dialog modal aberto ou campo em edicao"
  - "src/components/brand/BootError.tsx: tela cheia de falha de abertura, sem contexto"
  - "src/main.tsx: captureInstallPrompt antes do React, registerPwa com onBootError, gancho __coincBootError so em DEV"
  - "index.html: bloco estatico de falha se #root seguir vazio por 8 s"
  - "scripts/ux-audit/pwa.mjs: cenarios (a) bundle bloqueado, (b) vite:preloadError e (c) versao esperando"
affects: [05-15 auditoria de tema (usa window.__coincBootError em DEV), 05-18 deploy, 05-20 UAT de atualizacao A para B em aparelho]

actuals:
  tokens: 8600
  tasks: 2
  commits: 3
plan_head_before: 5954247b1ae70a0e04233dcaee6bda61b49cb6ec

tech-stack:
  added: []
  patterns:
    - "Efeitos (DOM, sessionStorage, recarga) no registro e toda a decisao no nucleo puro; nenhum literal de janela de tempo fora de shared/core"
    - "Bloco estatico de falha montado por DOM no HTML, separado do React e removido por MutationObserver se o React montar depois"

key-files:
  created:
    - src/lib/pwa/registerPwa.ts
    - src/lib/pwa/isBusy.ts
    - src/components/brand/BootError.tsx
    - test/static/phase5-boot.test.js
  modified:
    - src/main.tsx
    - index.html
    - scripts/ux-audit/pwa.mjs
    - test/static/phase5-sw.test.js

key-decisions:
  - "Em segundo plano com Sheet, Dialog ou campo em edicao a versao nova espera (hidden && !busy): so o chamador muda, o nucleo 05-02 segue intacto"
  - "Ao voltar a visivel a versao que esperava e reavaliada como nova abertura"
  - "sessionStorage inacessivel vale nao recarregar de novo, nos dois caminhos de recarga"
  - "BootError sem nenhuma importacao de contexto: so Button, VintemEmpty e lucide-react"

patterns-established:
  - "Auditoria de atualizacao sem dois deploys: anexar um comentario a dist/sw.js durante a execucao (restaurado no fim) para o navegador achar uma versao nova"

requirements-completed: []

duration: ~10 min
completed: 2026-11-23
---

# Phase 5 Plan 10: Atualizacao silenciosa e tela de falha de abertura Summary

**`registerPwa` liga o worker a politica pura do nucleo (ativa ao abrir ou em segundo plano, nunca com lancamento aberto, recarga com guarda de 10 s), `BootError` e um bloco estatico do HTML evitam a tela branca, e o executor CDP prova os tres cenarios no build de producao.**

## Accomplishments

- **Task 1:** `isBusy()` consulta `[role="dialog"][aria-modal="true"]` e o foco em `INPUT`, `TEXTAREA`, `SELECT` ou conteudo editavel. `registerPwa` so age sob `import.meta.env.PROD`, usa `registerSW` com `immediate: true`, delega tudo a `decideUpdate`, `decideReload` e `decidePreloadError` (chaves e janela de 10 s importadas do nucleo, nenhum literal 3000 nem 10000), busca versao nova a cada 1 h e ao voltar a visivel, e trata `vite:preloadError` com uma recarga e depois a tela de falha. Todo `sessionStorage` em try e catch. `main.tsx` chama `captureInstallPrompt()` antes do `createRoot` (pendencia deixada pelo 05-09) e `registerPwa` depois de montar.
- **Task 2:** `BootError` (Vintem surpreso, titulo 28/700, corpo, botao `h-14 w-full` com `RefreshCw`) renderiza na mesma raiz pelo `onBootError`, sem provider. O gancho `window.__coincBootError` existe so dentro de `if (import.meta.env.DEV)`. O `index.html` ganhou um script que, com `#root` vazio apos 8 s, monta por `createElement` e `textContent` um bloco com o mesmo texto e um botao que recarrega, so com `Canvas` e `CanvasText`; um `MutationObserver` o remove se o React montar depois.
- **Executor `pwa.mjs`:** `FALHAS 0` com 37 verificacoes. (a) bundle bloqueado: `#root` fica vazio, o bloco aparece em ate 10 s, o botao recarrega e, sem o bloqueio, o bloco some; (b) `vite:preloadError` cancelado e recarrega uma vez, a marca fica na sessao, a segunda falha nao recarrega e mostra a BootError, e o gancho nao existe em producao; (c) versao nova instalada e esperando, sem recarga com Sheet aberto (nem indo para segundo plano), nada perdido, e recarga ao ir para segundo plano sem nada em andamento.
- Verificacao final: `npm run test:static` (523 testes, 521 passam, 0 falham, 2 ignorados), `npm run build`, `npm run lint` e `node scripts/ux-audit/pwa.mjs` (`FALHAS 0`, sem processo orfao, `dist/sw.js` restaurado).

## Commits

- `452ab607`: feat(05-10): registro do worker com atualizacao silenciosa e captura da instalacao
- `8f1de71a`: fix(05-10): segundo plano nao troca a versao com lancamento aberto
- `166ef3f9`: feat(05-10): tela de falha de abertura, bloco estatico do HTML e cenarios de falha no Chrome

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Segundo plano ativava a versao mesmo com lancamento aberto**
- **Found during:** Task 2, ao escrever o cenario (c)
- **Issue:** o nucleo 05-02 faz `hidden` vencer `busy`. Quem sai do app com o lancamento aberto (para conferir um valor em outro app) voltaria e encontraria o formulario vazio, contra a verdade "nunca troca de versao no meio de um lancamento ou de uma edicao".
- **Fix:** `registerPwa` passa `hidden: document.visibilityState === 'hidden' && !busy`; o nucleo nao mudou. Ao voltar a visivel a versao que esperava e reavaliada (vale como nova abertura, janela de 3 s). Guarda estatica e cenario (c) cobrem os dois sentidos.
- **Files modified:** src/lib/pwa/registerPwa.ts, test/static/phase5-sw.test.js
- **Commit:** 8f1de71a

### Informativos

- **Cenario (c) simulado:** a versao B nao vem de dois deploys: o executor anexa um comentario a `dist/sw.js` durante a execucao (restaurado no fim, `dist/` e ignorado pelo git) e simula `visibilityState` oculto na pagina. Prova o ciclo do worker real e a politica, mas nao o ciclo de vida em aparelho.
- **Comentario de cabecalho do `pwa.mjs`** atualizado (o registro do worker agora tambem e feito pelo app); a ordem dos cenarios importa (o bloqueio do bundle precisa de perfil sem worker).

**Total deviations:** 1 correcao (Rule 2) e 2 informativas.

## Authentication Gates

Nenhum. Nenhum `firebase deploy`, login, mudanca no Railway nem pacote instalado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-05-10-01 (espera com algo em andamento, cenario (c) e guarda), T-05-10-02 (carimbo de 10 s e uma recarga por erro de trecho, cenario (b)), T-05-10-03 (`textContent`, sem `innerHTML`, guarda), T-05-10-04 (gancho so em DEV, conferido no build) e T-05-10-05 (`sessionStorage` em try, falha vale nao recarregar) mitigadas.

## Pendencias

- **Requisitos nao marcados:** IDEN-04 nao foi marcado como entregue. O codigo e a politica estao entregues e provados no build de producao com versao simulada, mas a prova pedida pelo requisito (deploy A para B reais, app instalado, e o comportamento de paginas ocultas no iPhone) e do roteiro do plano 05-20 e do deploy do 05-18. IDEN-03 tambem segue aberto (passos de instalacao nos planos 05-11 a 05-14).
- **Confirmacao em aparelho (human-check da Task 2):** publicar A, deixar o app instalado em segundo plano, publicar B (mais de 1 minuto depois) e reabrir: deve entrar em B sem aviso e sem tela branca. Consolidado no 05-20.

## Next Phase Readiness

- 05-15 pode chamar `window.__coincBootError()` em dev para auditar a BootError nos temas.
- `usePwaInstall()` ja recebe o evento capturado em `main.tsx`.

## Self-Check: PASSED

- FOUND: src/lib/pwa/registerPwa.ts, src/lib/pwa/isBusy.ts, src/components/brand/BootError.tsx, test/static/phase5-boot.test.js
- FOUND: commits 452ab607, 8f1de71a e 166ef3f9
- `git rev-list --count 5954247b..HEAD` = 3 no momento da escrita
