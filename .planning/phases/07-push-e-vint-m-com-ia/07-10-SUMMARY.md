---
phase: 07-push-e-vint-m-com-ia
plan: 10
subsystem: push-servidor
tags: [push, limites, notificador, marcador-atomico, silencio, teto-diario, emulador]
requires:
  - phase: 07
    provides: "createSender, createLimiter e router do push (07-01), pushEvents e pushPrefs do nucleo (07-03), banco de frases de push (07-04), store de preferencias (07-08)"
provides:
  - "server/src/push/repo.js: createRepo com leituras escopadas por casal e pessoa, claimEvent por create(), countSent por count(), listPending e transitionEvent por transacao"
  - "server/src/push/notifier.js: createNotifier com evaluateLimits e deliverHeld, readMaxPerDay (PUSH_MAX_PER_DAY, padrao 8)"
  - "POST /api/limits/check (10 por minuto por uid) montado pela feature do push"
  - "createPushFeature agora devolve repo e notifier (07-15 reaproveita)"
  - "src/services/limitsCheck.service.ts: checkLimits() em melhor esforco, chamado quando o app cria um alerta"
affects: [07-15, 07-16, 07-19]
tech-stack:
  added: []
  patterns:
    - "marcador pushEvents/{id} criado com create() do Firestore: quem perde a corrida nao envia, sobrevive a reinicio"
    - "claim primeiro, decide depois: o marcador entra ja com o status da decisao (enviando, pendente, desligado, silencioso)"
    - "transicao pendente para enviando por transacao: so um executor entrega o retido"
key-files:
  created:
    - server/src/push/notifier.js
    - server/src/push/repo.js
    - server/src/push/limits-router.js
    - server/test/notifier.test.js
    - server/test/emu/push-events.test.js
    - src/services/limitsCheck.service.ts
    - test/static/phase7-limits-check.test.js
  modified:
    - server/src/push/index.js
    - src/contexts/LimitAlertsContext.tsx
key-decisions:
  - "Marcador de retido volta a pendente (em vez de ser apagado) quando o envio falha por erro transitorio: o texto nao esta no marcador, mas tipo, limiar, categoria, tag e url estao, entao a proxima rodada de deliverHeld tenta de novo"
  - "O dia do marcador (dayKey) vira o dia da entrega quando o retido sai, para o teto diario contar o dia em que o aviso realmente foi enviado"
  - "So o aparelho em uso como unico aparelho da pessoa vira sem-aparelho com motivo aparelho-em-uso (nao conta no teto nem repete)"
  - "FID invalido no corpo do check responde 400 (consistente com /register); sem FID o check roda sem excluir aparelho"
  - "checkLimits importa getLocalFid de messaging.ts de forma estatica: SettingsPage ja e importada de forma estatica, entao o modulo ja esta no pacote principal"
requirements-completed: [PUSH-02, PUSH-03, PUSH-04]
status: complete
commits: 3
plan_head_before: fa78bde52f82b9a768b16cca3edb5732e69cf6da
actuals:
  tokens: 16000
  tasks: 3
  commits: 3
metrics:
  duration: "cerca de 50 min"
  completed: 2026-11-25
---

# Phase 7 Plan 10: Notificador de limites e gatilho no app Summary

Do check do app ao aviso no aparelho: o servidor recalcula os limites da pessoa pela mesma conta do cliente, reivindica um marcador por evento com `create()` do Firestore e envia uma unica notificacao com texto do banco de push, respeitando tipos, silencio (que segura e entrega depois), teto diario e aparelho em uso.

## Tarefas

| Tarefa | Nome | Commit |
| ------ | ---- | ------ |
| 1 (tracer) | Check que cruza 100 por cento e envia uma vez | 6349718e |
| 2 | Silencio que segura, tipos desligados, teto diario e colapso | f7fa851e |
| 3 | Unicidade sob corrida e reinicio, e gatilho no app | df8228ef |

## O que foi feito

- **repo.js:** `readSettings` (settings/main so vale sem dono ou com dono igual ao casal; tom, categorias, configuracao da pessoa, interruptor legado de fatura e antecedencia), `readCycleTransactions` (mesmo indice do cliente: ownerId, person, date), `readSilentAlertIds` (limitAlerts silenciosos do app), `listEventIds`, `readPrefs`, `listFids`, `claimEvent` (create(); codigo 6 ou ALREADY_EXISTS vira falso, qualquer outro erro sobe), `updateEvent`, `deleteEvent`, `countSent` (aggregate `count()`), `listPending` (a unica consulta sem filtro de dono, so por status) e `transitionEvent` (transacao). Todas por igualdades: nenhum indice novo, `firestore.rules` e `firestore.indexes.json` intactos.
- **notifier.js:** `evaluateLimits({ hid, person, excludeFid })` monta `buildBudgetView` com contas e pagamentos vazios, junta aos ids conhecidos os silenciosos do cliente e os marcadores ja criados e chama `limitEvents`. Evento silencioso grava `silencioso`; `deliveryDecision` leva a `desligado`, `pendente` ou ao envio. O envio monta o payload na hora com `buildPushPayload` (tom das configuracoes, nome da categoria, semente igual ao id do evento) e so manda `title`, `body`, `tag` e `url`. `deliverHeld({ now })` agrupa os pendentes por casal e pessoa, nao faz nada enquanto a pessoa esta no silencio, confere se o tipo continua ligado, colapsa 80 e 100 da mesma categoria no mais alto e envia com o tom atual. Teto `PUSH_MAX_PER_DAY` (padrao 8) por pessoa e por dia de Sao Paulo. Falha transitoria apaga o marcador (retido volta a pendente); FID morto mantem o marcador.
- **limits-router.js e index.js:** `POST /api/limits/check` com corpo `{ fid? }` (casal e pessoa so do token), limitador de 10 por minuto por uid (429 com Retry-After); a feature monta `/api/push` e `/api/limits` e expoe `repo` e `notifier`.
- **App:** `checkLimits()` em `limitsCheck.service.ts` (POST com Bearer, corpo so com o FID local, nunca lanca, sem log, prazo de 10 s) e chamada `void checkLimits()` no ramo `created` de `runEvaluation` do `LimitAlertsContext`.

## Provas

- `server/test/notifier.test.js` (31 testes): repo e sender falsos em memoria, mais o `POST /api/limits/check` por HTTP (token, FID, 429 e liberacao).
- `server/test/emu/push-events.test.js` (19 testes no emulador): marcador gravado sem texto, so a pessoa do gasto recebe (outra pessoa e outro casal nao), silencio com entrega depois e colapso, tipo desligado, teto contado no Firestore real, falha transitoria e FID morto, `excludeFid`, seis checks simultaneos e dois `deliverHeld` simultaneos enviam uma vez so, notificador novo sobre o mesmo banco (reinicio) nao reenvia, marcador apagado volta a ser reivindicavel e o `create()` recusa documento existente.
- `test/static/phase7-limits-check.test.js`: caminho unico, Bearer, sem console, sem throw e chamada so no ramo `created`.

## Verificacao

`test:core:tz` (1084), `test:server` (295), `test:static` (743), `test:emu` (189), `lint` e `build` passam. `test:rules` nao foi rodado: nenhuma regra nem indice foi tocado.

## Deviations from Plan

None - plano executado como escrito. Dois detalhes de interpretacao, sem desvio de regra: o retido que falha por erro transitorio volta a `pendente` em vez de ser apagado (apagar perderia o evento retido, ja que a decisao de silencio nao se repete no `deliverHeld`), e o `dayKey` do marcador passa a ser o dia da entrega quando o retido sai.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum alem do registrado no `<threat_model>`: T-07-38 (marcador por create(), provado com corrida e reinicio), T-07-39 (payload so do banco de push, marcador sem texto), T-07-40 (casal e pessoa so do token, consultas com ownerId e person, testes cruzados), T-07-41 (10 por minuto por uid, teto diario, colapso) e T-07-42 (marcador apagado em falha transitoria) mitigados.

## Para o 07-15

`createPushFeature` devolve `repo` e `notifier`; `deliverHeld` ja trata `kind` de fatura e espontanea pela situacao do marcador (`push-fatura`, `push-espontanea`), entao o 07-15 so precisa gravar marcadores `pendente` com `kind`, `tag`, `url` e `categoryLabel` quando couber. O limitador de `/api/limits/check` e o `config.maxPerDay` do notificador ja existem; `readMaxPerDay` le `PUSH_MAX_PER_DAY` do ambiente passado a `createPushFeature({ env })`.

## Self-Check: PASSED

- server/src/push/notifier.js, repo.js, limits-router.js, server/test/notifier.test.js, server/test/emu/push-events.test.js, src/services/limitsCheck.service.ts e test/static/phase7-limits-check.test.js existem.
- Commits 6349718e, f7fa851e e df8228ef existem na branch.
