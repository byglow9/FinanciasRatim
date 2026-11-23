---
phase: 05-identidade-coinki-pwa-e-onboarding
plan: 01
subsystem: infra
tags: [pwa, vite-plugin-pwa, workbox, firebase-hosting, supply-chain]
status: complete

requires:
  - phase: 05-identidade-coinki-pwa-e-onboarding
    provides: tabela de legitimidade de pacotes da pesquisa e decisões D-01 e D-03
provides:
  - "sete devDependencies do PWA com versão exata (vite-plugin-pwa 2.0.0, workbox-* 7.4.1, @vite-pwa/assets-generator 2.0.0)"
  - "site de Hosting coinc-financias (vazio) no projeto financias-ratimbum, URL https://coinc-financias.web.app"
  - "05-01-GATES-EVIDENCE.md com versões, ausência de script de instalação, baseline de testes e registro do site"
affects: [05-09 vite.config e service worker, 05-17 ALLOWED_ORIGINS e domínio do login, 05-18 deploy do site novo, 05-19 redirect do site antigo]

actuals:
  tokens: 1600
  tasks: 3
  commits: 2
plan_head_before: 33cdf71f6a6ef43a97d3de5c66d43852f2c09c54

tech-stack:
  added: [vite-plugin-pwa 2.0.0, workbox-window 7.4.1, workbox-build 7.4.1, workbox-precaching 7.4.1, workbox-routing 7.4.1, workbox-core 7.4.1, "@vite-pwa/assets-generator 2.0.0"]
  patterns:
    - "Pacote novo só entra com versão exata (--save-exact) depois da tabela de legitimidade da pesquisa"
    - "firebase-tools fica como CLI global, nunca como dependência do projeto"

key-files:
  created:
    - .planning/phases/05-identidade-coinki-pwa-e-onboarding/05-01-GATES-EVIDENCE.md
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "ID do site de Hosting é coinc-financias (o ID coinc está reservado por outro projeto); escolha do dono, registrada como D-03a no 05-CONTEXT.md"
  - "O alias do alvo em firebase.json/.firebaserc continua coinc e aponta para o site coinc-financias"
  - "firebase-tools 15.37.0 (SUS, too-new) não foi instalado; vale o CLI global 15.9.1"

requirements-completed: []

duration: ~1h (inclui os passos executados pelo orquestrador)
completed: 2026-11-23
---

# Phase 5 Plan 01: Portões do PWA e reserva do site Summary

Sete pacotes do PWA instalados com versão exata (sem script de instalação, provado localmente) e o site de Hosting `coinc-financias` reservado vazio no projeto `financias-ratimbum`, com a suíte estática e o build verdes.

## O que foi feito

- **Task 1 (humana, executada pelo orquestrador):** `npm install -D --save-exact` dos sete pacotes. `package.json` ganhou só esses sete, em versão exata. Comitado em `928407df`.
- **Task 2 (automática):** conferência local de versões e de `scripts` de cada pacote em `node_modules` (nenhum tem `preinstall`, `install` nem `postinstall`), `npm run test:static` (479 testes, 477 passam, 0 falham, 2 ignorados), `npm run build` verde, `firebase --version` 15.9.1 e criação do `05-01-GATES-EVIDENCE.md`. Comitado em `ab6d0e62`.
- **Task 3 (humana, executada pelo orquestrador):** `coinc` falhou (reservado por outro projeto); o dono escolheu `coinc-financias`; o site foi criado e aparece em `firebase hosting:sites:list` junto de `financias-ratimbum`. Nada foi publicado. Comitado em `928407df`.

Resposta literal registrada para os checkpoints (resume-signal): Task 1 "done" (comando rodado pelo orquestrador, a pedido do dono); Task 3 "id ocupado" seguido de decisão do dono por `coinc-financias` e "done" na criação.

## Commits

- `928407df`: chore(05-01): instala os 7 pacotes do PWA; site coinc-financias reservado (inclui a reescrita de coinc.web.app para coinc-financias.web.app nos planos e documentos e o D-03a)
- `ab6d0e62`: docs(05-01): evidência dos portões

## Deviations from Plan

### Passos humanos executados pelo orquestrador

**1. [Rule 4 - Decisão do dono] Tasks 1 e 3 (`checkpoint:human-action`) rodadas pelo orquestrador**
- **Contexto:** o plano e a proibição do plano ("O agente não roda npm install de pacote novo ... nem firebase ...: o dono faz esses passos") reservavam esses comandos ao dono. O dono pediu explicitamente "rode você os comandos"; o orquestrador os executou por essa autorização. Esta execução (Task 2) não rodou `npm install`, `firebase deploy`, `firebase login` nem tocou no Railway.
- **Mitigação preservada (T-05-SC):** tabela de legitimidade conferida antes, versão exata, conferência local de scripts de instalação na Task 2, `firebase-tools` SUS não instalado.

**2. [D-03 / D-03a] ID do site mudou de `coinc` para `coinc-financias`**
- **Found during:** Task 3
- **Issue:** `firebase hosting:sites:create coinc` falhou com HTTP 400 ("`coinc` is reserved by another project"). Pela D-03 não há nome reserva automático.
- **Fix:** o orquestrador perguntou ao dono, que escolheu `coinc-financias`. Site criado; planos e documentos reescritos (URL final https://coinc-financias.web.app); D-03a acrescentado ao `05-CONTEXT.md`. O alias do alvo (`coinc`) é mantido.
- **Commit:** `928407df`

**3. [Informativo] Linha de base de testes diferente da prevista**
- O plano esperava 449 testes (447 passam, 2 ignorados). Medido: 479 (477 passam, 0 falham, 2 ignorados). Os 30 testes a mais vêm dos planos 05-02 a 05-06, concluídos antes desta execução. Sem regressão.

Fora isso, o plano foi executado como escrito.

## Auth gates

Nenhum durante a Task 2. O CLI global do Firebase já estava autenticado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. A única superfície nova é o site de Hosting vazio, já prevista no plano; nada foi publicado.

## Issues

Nenhum bloqueio. Observação para os planos seguintes: o ID final do site é `coinc-financias`; os planos 05-17 e 05-18 (ALLOWED_ORIGINS, domínio do login, `firebase target:apply hosting coinc coinc-financias`, deploy) já foram reescritos pelo orquestrador.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-identidade-coinki-pwa-e-onboarding/05-01-GATES-EVIDENCE.md`
- FOUND: commits `928407df` e `ab6d0e62`
- `git rev-list --count 33cdf71f..HEAD` = 2 no momento da escrita
