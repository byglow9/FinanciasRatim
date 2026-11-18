---
phase: 03-limites-pode-gastar-e-central
plan: 07
subsystem: camada-de-dados
tags: [limitAlerts, regras, indices, transacao, idempotencia]
requires: [03-05]
provides:
  - limitAlerts em clientCollections() e get de inexistente para settings e limitAlerts em firestore.rules
  - indice limitAlerts (ownerId, person, createdAt DESC) em firestore.indexes.json
  - getLimitAlerts, createLimitAlertIfAbsent, markLimitAlertRead, markLimitAlertsRead e tipo LimitAlertDraft em src/services/limitAlerts.service.ts
  - matriz de regras com 11 colecoes e caso de idempotencia por transacao
affects: [03-11, 03-13, 03-15, 03-16]
tech-stack:
  added: []
  patterns: ["criar-se-ausente por runTransaction com ID deterministico", "excecao do get de inexistente restrita a duas colecoes"]
key-files:
  created: [src/services/limitAlerts.service.ts]
  modified: [firestore.rules, firestore.indexes.json, test/rules/matrix.test.js, test/static/firestore-config.test.js, test/static/owner-queries.test.js]
decisions:
  - "Ramo MOCK de createLimitAlertIfAbsent grava so os campos do rascunho mais createdAt e readAt, espelhando o corpo do Firestore"
  - "markLimitAlertsRead delega a markLimitAlertRead por id em Promise.all (um updateDoc por aviso)"
requirements-completed: []
status: complete
commits: 3
plan_head_before: 7d4e00667f15e6810e7f6d7c435d77e4a0f3ae3c
actuals:
  tokens: 6500
  tasks: 3
  commits: 3
metrics:
  completed: 2026-11-18
---

# Fase 3 Plano 07: Persistencia dos avisos de limite (limitAlerts)

Regras, indice e servico de `limitAlerts` com criar-se-ausente atomico por ID deterministico; os testes que fixam contagens foram atualizados nas mesmas tarefas que os quebram. Nada foi publicado em producao.

## Tarefas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|----------|
| 1 | Tracer: regras de limitAlerts e prova do criar-se-ausente no emulador | fac1eb65 | firestore.rules, test/rules/matrix.test.js |
| 2 | Indice composto de limitAlerts e guarda de contagem de indices | 034eac16 | firestore.indexes.json, test/static/firestore-config.test.js |
| 3 | Servico limitAlerts com criar-se-ausente atomico e guarda de services | bf25b884 | src/services/limitAlerts.service.ts, test/static/owner-queries.test.js |

O gate do tracer foi cumprido: `test:rules` (12 testes) e `test:static` verdes antes de expandir.

## Resultados dos portoes

- `npm run test:core:tz`: 234 passam, 0 falham, em UTC e em Asia/Tokyo.
- `npm run test:static`: 60 passam, 0 falham, 1 pulado pre-existente (inclui `limitAlerts.service.ts` na guarda owner-queries, 11 services; 19 indices e 12 com ownerId).
- `npm run test:rules` (emulador): 12 passam, 0 falham, incluindo o caso novo de LIM-07.
- `npm run build`: passa; aviso de chunk acima de 500 kB e pre-existente.
- `npm run lint`: 0 erros, 2 avisos `react-hooks/incompatible-library` pre-existentes.
- `git diff -- firebase.rollback.json firestore.rules.legacy`: vazio.

## Conferencias

- No emulador: membro le o marcador inexistente (Ele e Ela), anonimo e conta sem claim falham, `transactions/nao-existe` continua negado; a transacao cria uma vez, a segunda devolve `false` e `readAt` marcado pela parceira continua preenchido; trocar `ownerId` num update e negado; o outro casal nao le nem lista (T-03-21, T-03-22, T-03-23).
- T-03-25: lista com `limit(30)` por padrao, sem `onSnapshot`. T-03-26: o documento so tem ids, centavos, limiar, chave de ciclo e datas. O servico nao usa `console`.
- Publicacao de regras e indice em producao nao feita: e o checkpoint humano do Plano 11. O indice precisa estar publicado antes de qualquer tela que chame `getLimitAlerts` em producao.

## Requisitos

Nenhum marcado como concluido. LIM-07 exige o avaliador de 80% e 100% e o sino com os avisos (planos 13, 15 e 16) e a publicacao em producao (plano 11); este plano entrega so a persistencia.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

Nenhum.

## Threat Flags

Nenhum. T-03-SC aceito: nenhum pacote instalado.

## Self-Check: PASSED

- Arquivos existem: firestore.rules, firestore.indexes.json, src/services/limitAlerts.service.ts, test/rules/matrix.test.js, test/static/firestore-config.test.js, test/static/owner-queries.test.js.
- Commits fac1eb65, 034eac16 e bf25b884 existem; contagem medida `rev-list 7d4e0066..HEAD` = 3.
