---
phase: 07-push-e-vint-m-com-ia
plan: 01
subsystem: push
tags: [push, fcm, fid, service-worker, express, limiter]
requires: []
provides:
  - "createApp({ features }): ponto de montagem de routers depois do requireOwner, so em /api/"
  - "POST /api/push/register e POST /api/push/test (FID, so a pessoa do token)"
  - "createSender().sendToFids: uma mensagem por FID, lista fechada title/body/tag/url, limpeza de FID morto"
  - "createLimiter: limitador de janela fixa em memoria com relogio injetavel (reaproveitado pela IA no 07-09)"
  - "createFakeFirestore: Firestore falso para os testes das trilhas de push e IA"
  - "src/sw.ts com push, notificationclick e PUSH_PING no worker unico"
affects: [07-02, 07-06, 07-09, 07-15]
tech-stack:
  added: []
  patterns:
    - "features como lista de { mounts } passada ao createApp"
    - "handler de push proprio que sempre chama showNotification (iPhone revoga assinatura com push silencioso)"
key-files:
  created:
    - server/src/limiter.js
    - server/src/push/index.js
    - server/src/push/router.js
    - server/src/push/send.js
    - server/test/_fake-firestore.js
    - server/test/push.test.js
    - server/test/limiter.test.js
    - test/static/phase7-sw.test.js
  modified:
    - server/src/app.js
    - server/src/index.js
    - src/sw.ts
key-decisions:
  - "Titulo visivel do push e OINC (nome decidido na Fase 5, guarda phase5-oinc-name.test.js), nao Vintem"
  - "Limitador do teste usa o mesmo relogio injetado do feature (now), para o teste nao esperar um minuto"
  - "Campo invalido de tag ou url e descartado do payload em vez de rejeitar o envio"
status: complete
commits: 3
plan_head_before: c336378e6f91156afb66082aededf5ba85b79506
actuals:
  tokens: 10700
  tasks: 3
  commits: 3
metrics:
  duration: "cerca de 25 min"
  completed: 2026-11-25
---

# Phase 7 Plan 01: Tracer do push no servidor e worker Summary

Servidor Express registra FIDs e envia o aviso de teste pelo FCM (campo `fid`, so title/body/tag/url), com limitador proprio de 1 por minuto, e o service worker unico exibe todo push recebido, clica so na propria origem e responde `PUSH_PING` com `PUSH_READY`.

## O que foi feito

1. **Tracer do servidor (fb6fb9af):** `createApp` ganhou `features` (lista de `{ mounts: [{ path, router }] }`), montadas logo depois do `requireOwner` e recusadas na criacao se o caminho nao comecar com `/api/`. `server/src/push/` traz `send.js` (uma mensagem por FID, `webpush.headers` TTL 21600 e Urgency high, uma chamada `sendEach`, FID com `installation-id-not-registered` com ou sem prefixo apaga `pushRegistrations/{fid}`, outra falha so loga o codigo), `router.js` (register com validacao de FID e 409 para FID de outro casal; test so para os aparelhos de `ownerId` + `person` do token) e `index.js`. `index.js` do servidor monta a feature com `getMessaging()` e chama `feature.start?.()` depois do listen. `_fake-firestore.js` e o ajudante de teste das duas trilhas.
2. **Limitador (57e5096d):** `createLimiter({ max, windowMs, now })` de janela fixa, sem pacote nem timer, com limpeza a cada chamada e teto de 1000 chaves. `/api/push/test` responde 429 com `Retry-After` na segunda chamada do mesmo uid no minuto.
3. **Worker (03f28bc7):** escuta `push` (todo caminho termina em `showNotification`, json em try/catch, campos de `data`, do proprio payload ou de `notification`, `silent` com janela focada via `SILENT_WHEN_FOCUSED`), `notificationclick` (resolve contra `self.location.origin`, outra origem vira a raiz, foca a janela existente ou `openWindow`) e `PUSH_PING`. Guarda estatica `phase7-sw.test.js`.

## Verificacao

- `node --test server/test/push.test.js server/test/limiter.test.js`: 20 testes passam.
- `npm --prefix server test`: 144 passam, 0 falham (app.test.js intacto sem passar features).
- `node --test test/static/phase7-sw.test.js test/static/phase5-sw.test.js`: passam, sem alterar a guarda da Fase 5.
- `npm run lint`: limpo. `npx tsc -p tsconfig.sw.json --noEmit`: limpo. `npx vite build`: gera `dist/sw.js` com 22 entradas de pre-cache.
- Tracer reverificado de ponta a ponta antes da expansao (testes do servidor passam).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Titulo "Vintem" viola a guarda de nome da Fase 5**
- **Found during:** Task 3 (`npm run test:static`)
- **Issue:** `test/static/phase5-oinc-name.test.js` proibe "Vintém" em qualquer string visivel desde a decisao do dono de 24/11/2026 (o nome exibido e OINC). O plano manda o titulo "Vintém" no teste de aviso e no padrao do worker.
- **Fix:** titulo do teste de aviso (`server/src/push/router.js`) e titulo padrao do worker (`src/sw.ts`) passam a `OINC`; o teste do servidor confere `OINC`.
- **Files modified:** server/src/push/router.js, src/sw.ts, server/test/push.test.js
- **Commit:** 03f28bc7

## Issues Encountered (fora do escopo, de outros planos da onda)

Na verificacao final, `npm run build` (`tsc -b`) e `npm run test:static` falham por arquivos de outros executores da mesma onda, nao por este plano. Nada disso foi alterado aqui:

- `shared/core/vintemPhrasesPush.js` (07-04): dois erros TS (tipo `Readonly` em `bank`/`maxLen`, linhas 215 e 216), e 3 linhas com "Vintém" visivel (41, 140, 148) que quebram `phase5-oinc-name.test.js`. Deve usar OINC como titulo e nas frases.
- `src/lib/push/messaging.ts` (07-02): chave `coinc:push:fid` fora do conjunto fechado de chaves de armazenamento.
- Outros dois testes estaticos de 07-02 (contagem de ONLY e `push.service.ts`).

Os arquivos deste plano passam individualmente em tsc (`tsconfig.sw.json`), eslint e `vite build`. O orquestrador deve conferir `npm run build` e `npm run test:static` quando os demais planos da onda fecharem.

## Hipoteses a confirmar no aparelho (07-06)

- Formato do JSON do push para FID (o worker aceita `data`, raiz e `notification`).
- FCM repassa `TTL` e `Urgency` de `webpush.headers`.
- Prefixo `messaging/` no `error.code` de FID morto (o codigo aceita com e sem).
- `SILENT_WHEN_FOCUSED = true` no iPhone; se parar de entregar, virar `false`.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do registrado no `<threat_model>` do plano (T-07-01 a T-07-05 mitigados: dono e pessoa so de `req.owner`, limitador, lista fechada de campos, `showNotification` em todo caminho, clique resolvido contra a origem do worker).

## Self-Check: PASSED

- Arquivos criados e commits fb6fb9af, 57e5096d e 03f28bc7 presentes no historico.
