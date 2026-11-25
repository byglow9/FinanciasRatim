---
phase: 07-push-e-vint-m-com-ia
plan: 08
subsystem: push-servidor
tags: [push, preferencias, registro, status, regras-firestore, matriz]
requires:
  - phase: 07
    provides: "router do push, sender e fake do Firestore (07-01) e pushPrefs.js (07-03)"
  - phase: 07
    provides: "gate do push no iPhone real aprovado pelo dono (07-06)"
provides:
  - "server/src/push/prefs.js: createPrefsStore com get e put no documento pushPrefs/{hid}__{person}"
  - "GET e PUT /api/push/prefs, GET /api/push/status?fid= e POST /api/push/unregister"
  - "Matriz de regras com pushRegistrations, pushPrefs, pushEvents, aiUsage e aiCache negadas ao cliente"
  - "Guarda estatica phase7-rules.test.js: regras e indices da Fase 6 intactos"
affects: [07-09, 07-10, 07-15, 07-16]
tech-stack:
  added: []
  patterns:
    - "preferencias por pessoa em documento proprio, id {hid}__{person}, e o ownerId e a pessoa do documento sao conferidos na leitura"
    - "status e unregister nunca distinguem FID inexistente de FID de outro casal"
    - "so consultas por igualdade (ownerId e person): nenhum indice novo"
key-files:
  created:
    - server/src/push/prefs.js
    - test/static/phase7-rules.test.js
  modified:
    - server/src/push/router.js
    - server/src/push/index.js
    - server/test/push.test.js
    - test/rules/matrix.test.js
key-decisions:
  - "A mensagem do 409 passou a ser 'Aparelho ja cadastrado', a do plano; o status HTTP e o contrato do 07-01 ficam, e nenhum cliente depende do texto"
  - "O status exige casal e pessoa do token iguais aos do documento: o aparelho que trocou de login aparece como nao registrado para a pessoa anterior"
  - "unregister apaga pelo ownerId do casal (nao pela pessoa), de modo que Ele ou Ela do mesmo casal limpam o registro do aparelho"
  - "O store de preferencias tambem sai em createPushFeature (campo prefsStore) para os planos de notificador (07-15) lerem sem recriar"
requirements-completed: [PUSH-01, PUSH-03, PUSH-04]
status: complete
commits: 3
plan_head_before: cc0a1b37cfa996a939ef412f5123aac4ae5bf148
actuals:
  tokens: 5000
  tasks: 3
  commits: 3
---

# Phase 7 Plan 08: Servidor do push, preferencias e regras fechadas Summary

Preferencias de aviso por pessoa (GET e PUT /api/push/prefs, esquema fechado, padroes da D-06 e D-21), registro de aparelho robusto com status e unregister idempotente, e a matriz de regras provando que as cinco colecoes do servidor ficam fechadas ao cliente.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
| ------ | ---- | ------ | -------- |
| 1 (tracer) | Preferencias de GET e PUT ao documento do casal e da pessoa | 43cab847 | server/src/push/prefs.js, router.js, index.js, server/test/push.test.js |
| 2 | Registro robusto, status do aparelho e remocao | c82735a5 | server/src/push/router.js, server/test/push.test.js |
| 3 | Matriz de regras com as cinco colecoes do servidor | 28fe46d2 | test/rules/matrix.test.js, test/static/phase7-rules.test.js |

## O que foi feito

- `createPrefsStore(db)`: `get` devolve os padroes (silencio desligado, tres tipos ligados) quando nao ha documento ou quando o documento carrega outro dono ou outra pessoa; `put` grava `{ ownerId, person, uid, types, quiet, updatedAt }` ja normalizado.
- `PUT /prefs` valida o corpo por `validatePushPrefs` e responde 400 com a mensagem fixa do nucleo; dono, uid e pessoa vem so de `req.owner`.
- `GET /status`: `registered` so e verdadeiro com casal e pessoa do token; `devices` conta os aparelhos da pessoa por duas igualdades.
- `POST /unregister`: FID invalido da 400; devolve sempre `{ ok: true }` e so apaga documento do proprio casal.
- O `/register` do 07-01 ja mantinha `createdAt`, atualizava uid, person, plataforma e `updatedAt` e recusava outro casal com 409; a tarefa 2 trocou so a mensagem do 409 e fixou o comportamento com testes (troca de pessoa, plataforma ios, android ou desktop, User-Agent nunca gravado).
- Matriz: `SERVER_COLS` semeada nos dois casais; anonimo, sem claim, Ele, Ela e outro casal tem get, lista (com e sem where), create, update e delete negados, e os documentos semeados ficam intactos.
- `phase7-rules.test.js`: `firestore.rules` nao cita as cinco colecoes, `clientCollections` tem exatamente as 13, a lista de somente leitura nao mudou, nenhuma regra aberta e os indices continuam 20, sem indice para as colecoes novas.

## Verificacao

`npm run test:core:tz` (1084), `test:server` (167), `test:static` (714 passam, 2 ja ignorados antes), `test:rules` (14), `lint` e `build` passam.

## Deviations from Plan

None - plano executado como escrito. O unico ajuste foi o texto do 409, para o do plano.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. As rotas novas ficam sob o mesmo `/api/push` autenticado pelo ID token; nenhuma superficie fora do modelo de ameacas do plano.

## Self-Check: PASSED

- server/src/push/prefs.js e test/static/phase7-rules.test.js existem.
- Commits 43cab847, c82735a5 e 28fe46d2 existem.
