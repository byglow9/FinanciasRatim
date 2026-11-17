---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
plan: 01
subsystem: server
tags: [webhook, pluggy, express, sync, idempotencia, node-test, firestore-emulator]
requires:
  - phase: 01-funda-o-de-dados-e-acesso
    provides: "bankConnections/{itemId} com ownerId, syncConnection idempotente por id, fila unica do syncAll, requireOwner em /api"
provides:
  - "POST /webhooks/pluggy publico, autenticado por cabecalho x-webhook-secret, fora de /api"
  - "syncItem(db, pluggy, itemId) na mesma fila do syncAll, com coalescencia por item"
  - "lastWebhookAt e lastWebhookEvent em bankConnections/{itemId} (evidencia de entrega, D-07)"
  - "PLUGGY_WEBHOOK_SECRET (opcional) e PLUGGY_WEBHOOK_SECRET_PREVIOUS (rotacao)"
affects: [02-02, 02-03, 02-04, 02-05, 02-06]
tech-stack:
  added: []
  patterns:
    - "Pecas puras do webhook isoladas em webhook.js (sem rede, banco ou log)"
    - "Resposta 200 antes de qualquer leitura de banco ou sync (limite de 10 s da Pluggy)"
    - "Rota opcional que falha fechada: sem segredo, 404 e aviso no log"
key-files:
  created:
    - server/src/webhook.js
    - server/test/webhook.test.js
  modified:
    - server/src/app.js
    - server/src/sync.js
    - server/src/index.js
    - server/.env.example
    - server/test/app.test.js
    - server/test/emu/sync.test.js
key-decisions:
  - "Segredo comparado com timingSafeEqual sobre digests sha256, todas as entradas da lista avaliadas (janela de rotacao)"
  - "Dono sempre de bankConnections/{itemId}.ownerId; ownerId e clientUserId do corpo ignorados"
  - "Idempotencia em duas camadas: ids deterministicos de bankImports/transactions mais Set limitado (500) de eventId em memoria, sem colecao webhookEvents"
  - "syncItem usa o mesmo tail do syncAll e um mapa itemRuns: rajada vira uma execucao mais uma repeticao final"
  - "PLUGGY_WEBHOOK_SECRET lido por process.env, nunca por required(): ausencia desativa a rota, nao derruba o servidor"
patterns-established:
  - "Evento do webhook e so um sinal: valida formato, responde 200, e a verdade vem do documento da conexao"
requirements-completed: [REV-06]
duration: 40min
completed: 2026-11-17
status: complete
commits: 6
plan_head_before: 948f664a695aaf7b0c21a67b050e97ef6b63354c
actuals:
  tokens: 5800
  tasks: 3
  commits: 6
---

# Phase 2 Plan 01: Webhook da Pluggy Summary

**Webhook da Pluggy com segredo em cabecalho e comparacao em tempo constante, resposta 200 imediata, `syncItem` coalescido na fila do `syncAll`, idempotencia por `eventId` e evidencia `lastWebhookAt`, com o polling de 6 h intacto como reserva.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-11-17
- **Tasks:** 3 (1 tracer, 2 auto, todas TDD)
- **Files modified:** 8

## Accomplishments

- Um evento autenticado (`item/updated`, `transactions/created|updated|deleted`) recebe 200 e sincroniza o item do dono sem acao do usuario (REV-06, D-06).
- Sem cabecalho ou com valor errado: 401 e nada e lido nem sincronizado. Segredo em query string nao vale.
- O dono vem do documento da conexao; um corpo com `ownerId` de outro casal grava com o dono real (provado no emulador e no teste HTTP).
- Reenvio do mesmo `eventId` gera um unico sync; replay do mesmo item no emulador mantem as contagens de `bankImports` e `transactions`.
- Rajada de 3 eventos do mesmo item roda `fetchItem` exatamente 2 vezes; `syncItem` e `syncAll` juntos nunca passam de uma conexao ativa (`maxActive === 1`).
- Sem `PLUGGY_WEBHOOK_SECRET` a rota responde 404 e o servidor sobe com aviso; o agendador `setInterval` de 6 h nao foi tocado.
- `shared/core/classify.js` sem diferenca em relacao a `a38c142a` (D-05).

## Task Commits

1. **Task 1: Tracer, do evento da Pluggy ao dado no Firestore**
   - RED `8d3d0bb8` test(02-01): add failing test for webhook ponta a ponta
   - GREEN `693c3ae8` feat(02-01): webhook da Pluggy sincroniza o item do dono
2. **Task 2: Contrato HTTP, idempotencia por eventId e evidencia (D-07)**
   - RED `eb98dfd2` test(02-01): add failing tests for contrato HTTP do webhook e idempotencia
   - GREEN `798ca516` feat(02-01): idempotencia por eventId e evidencia de entrega do webhook
3. **Task 3: syncItem sob rajada, serializacao, replay e ligacao no servidor**
   - `a9268350` test(02-01): cobre syncItem sob rajada, serializacao, replay e entradas invalidas
   - `d33ae87a` feat(02-01): liga o webhook da Pluggy no bootstrap do servidor

## Files Created/Modified

- `server/src/webhook.js` (novo): `HANDLED_EVENTS`, `ITEM_ID_RE`, `secretMatches`, `validateWebhookBody`, `createSeenEvents`.
- `server/src/app.js`: `createApp({ ..., webhookSecret })` e `POST /webhooks/pluggy` antes do `/api`.
- `server/src/sync.js`: `syncItem` e mapa `itemRuns` apos `syncAll`; `syncAll` e `syncConnection` intactos.
- `server/src/index.js`: segredos opcionais, aviso quando ausentes, `syncItem` injetado.
- `server/.env.example`: so os nomes `PLUGGY_WEBHOOK_SECRET` e `PLUGGY_WEBHOOK_SECRET_PREVIOUS` (comentado), com a ordem de rotacao.
- `server/test/webhook.test.js` (novo), `server/test/app.test.js`, `server/test/emu/sync.test.js`: testes unitarios, HTTP e de emulador.

## Decisions Made

Ver `key-decisions` no frontmatter. Todas seguem D-06 e D-07 do CONTEXT; nenhuma decisao nova fora do plano.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Notas de execucao (nao sao desvios de codigo)

- **Task 3 sem RED proprio:** os testes de rajada, serializacao, replay, item desconhecido, sem dono e `itemId` vazio passaram na primeira execucao porque `syncItem` ja existia, entregue pelo tracer da Task 1 (o plano manda implementar `syncItem` nela e so testar a fundo na Task 3). Foi o caso de "GREEN inesperado" investigado: nao ha teste errado nem funcionalidade pre-existente fora do tracer. Para provar que os testes nao sao vacuos, mutei temporariamente `syncItem` (sem coalescencia e sem a fila compartilhada): os testes de rajada e de serializacao falharam, e o arquivo foi restaurado em seguida (sem diff).
- **Evidencia de RED (#3770):** `gsd_run check tdd-red-evidence` so le nomes de falha no nivel superior do TAP; como os testes estao dentro de `describe`, o alvo registrado foi a suite que contem o teste (`sync com dono`, `createSeenEvents`). Em ambos os casos o unico subteste falhando era o teste-alvo, por assercao do comportamento planejado (404 em vez de 401; `createSeenEvents` inexistente). Veredito `RED_EVIDENCE_OK` nas duas rodadas.
- Os arquivos do `.planning` e `.env.local` ja modificados antes do plano ficaram fora dos commits, como mandam as regras de execucao.

## TDD Gate Compliance

- RED antes de GREEN nas Tasks 1 e 2 (commits `test(02-01)` precedem `feat(02-01)`).
- Task 3: commit de teste (`a9268350`) e commit de ligacao (`d33ae87a`); o comportamento testado ja vinha da Task 1, ver nota acima.

## Issues Encountered

None.

## Known Stubs

None. Nenhum valor vazio fixo, placeholder ou componente sem fonte de dados nos arquivos tocados.

## Threat Flags

Nenhuma superficie nova alem da registrada no `<threat_model>` do plano (a rota `POST /webhooks/pluggy` e T-02-01 a T-02-07). Mitigacoes aplicadas: T-02-01 (sha256 + timingSafeEqual), T-02-02 (dono da conexao), T-02-03 (log so com nome do evento e 8 caracteres do itemId; teste captura `console.error/log/warn`), T-02-04 (Set de eventId + ids deterministicos), T-02-05 (200 antes do sync, coalescencia, fila unica), T-02-06 (lista fechada de eventos, `ITEM_ID_RE`), T-02-07 (sem segredo, 404).

## Verificacao

- `npm --prefix server test`: 37 testes, 0 falhas (antes da fase eram 20).
- `npm run test:emu`: 55 testes, 0 falhas.
- `node --check server/src/index.js` sem erro; `grep setInterval server/src/index.js` ainda encontra o agendador.
- `git diff --exit-code a38c142a HEAD -- shared/core/classify.js`: sem diferenca.

## Pendencias para o dono (fora deste plano)

- Gerar o segredo (`openssl rand -hex 32`) e defini-lo no Railway como `PLUGGY_WEBHOOK_SECRET`; registrar os 4 webhooks na Pluggy com o mesmo valor (script de registro previsto em plano posterior da fase).
- Depois do deploy, conferir `lastWebhookAt` em `bankConnections/{itemId}` para saber se o MeuPluggy entrega eventos (D-07); se nao entregar, o polling de 6 h segue como unico caminho.

## Self-Check: PASSED

Arquivos conferidos: `server/src/webhook.js`, `server/test/webhook.test.js`, `server/src/app.js`, `server/src/sync.js`, `server/src/index.js`, `server/.env.example`. Commits `8d3d0bb8`, `693c3ae8`, `eb98dfd2`, `798ca516`, `a9268350`, `d33ae87a` presentes em `git log`.
