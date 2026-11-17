---
phase: 01-funda-o-de-dados-e-acesso
plan: 12
subsystem: infra
tags: [cutover, railway, indexes, release-b, runbook-r4-r5-r6]

requires:
  - phase: 01-11
    provides: "Release A no ar, backfill aplicado e verify limpo (371 docs com ownerId e categoryId)"
provides:
  - "Servidor novo no Railway (raiz do repositorio, Dockerfile, so token Firebase, origens fechadas)"
  - "18 indices no console (11 compostos com ownerId prontos e provados por check-indexes)"
  - "Release B (build normal, leituras filtradas por ownerId) no Hosting de financias-ratimbum"
  - "Go do dono para publicar as regras restritivas (go-publish-rules)"
affects: [01-13]

key-files:
  created: []
  modified: []

key-decisions:
  - "O amigo nao usa o servidor do Railway: aceito-perda-sync-amigo=nao-se-aplica (D-15 preservado, projeto do amigo nao tocado)"
  - "Dono autorizou o push de 51 commits (3fb92e37..8b4fb61d) para o Railway redeployar"

requirements-completed: [FUND-02, FUND-04]

actuals:
  tokens: 6000
  tasks: 3
  commits: 0
plan_head_before: 710f30623b07175f53a8d414b85479b35a71f051

duration: ~1h (orquestrador com o dono)
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 12: Cutover parte 3 (R4, R5 e R6) Summary

**Servidor no Railway so com token Firebase e origens fechadas, 11 indices compostos provados no ambiente real e Release B (leituras por ownerId) no ar; dono autorizou publicar as regras.**

## Task 1: R4 - Railway e push (checkpoint human-action)

- O dono executou/aprovou `git push origin main` (51 commits, `3fb92e37..8b4fb61d`), com autorizacao explicita ("pode dar push").
- Railway redeployou (log: `[server] ouvindo na porta 8080`). URL: https://financiasratim-production.up.railway.app
- O dono reconfigurou Root Directory (vazio), `ALLOWED_ORIGINS` e removeu `APP_API_KEY` no painel (declarado pelo dono; o log mostra o servidor novo em execucao).
- Resposta sobre o amigo: `amigo-usa-servidor=nao`, `aceito-perda-sync-amigo=nao-se-aplica`.
- Quatro checagens HTTP no servidor em producao:

| Chamada | Esperado | Obtido |
|---------|---------:|-------:|
| GET /health | 200 | 200 |
| POST /api/sync sem token | 401 | 401 |
| POST /api/sync com Origin https://origem-nao-autorizada.example + Bearer invalido | 403 | 403 |
| POST /api/sync com x-api-key e sem Authorization | 401 | 401 |

## Task 2: R5 e R6 - indices e Release B

- A primeira sincronizacao apos o deploy falhou com FAILED_PRECONDITION (indice ausente), como esperado antes dos indices.
- `firebase deploy --only firestore:indexes --project financias-ratimbum`: concluido; 18 indices no console, todos Ativado.
- `node server/scripts/check-indexes.js --hid 9825a991f72eba0c5292 --wait 45`: "Todos os 11 indices compostos estao prontos."
- Release B: `npm run build` normal (sem a variavel de Release A); `DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js` 5/5 pass; `firebase deploy --only hosting --project financias-ratimbum`; site HTTP 200, bundle `index-iE8JFAc1.js`.
- Nenhuma regra do Firestore foi publicada neste plano; alvo amigo e build:amigo nao usados.

## Task 3: checkpoint decision (blocking-human)

Resposta literal do dono ao prompt "Responda go-publish-rules ou hold: motivo": **"OK PODE FAZER"** = `go-publish-rules`.

Ressalva (human_judgment, nao comprovado): os donos informaram ter conferido as telas, mas o resultado do botao "Sincronizar agora" em Bancos com o Release B nao foi evidenciado separadamente. Registrado como nao verificado; o checklist manual pos-publicacao do Plano 13 cobre essa tela.

## Informacional

Decisao do nome do app COINC registrada em PROJECT.md (commit 710f3062); nao altera este plano.

## Deviations from Plan

Nenhuma correcao automatica (Rules 1-3). A falha FAILED_PRECONDITION da primeira sincronizacao antes dos indices era o comportamento previsto, resolvido pela Task 2.

## Known Stubs

Nenhum (plano operacional, sem arquivos rastreados alterados).

## Threat Flags

Nenhum.

## Pendencias

- Conferencia de "Sincronizar agora" em Bancos com Release B (nao evidenciada): coberta pelo checklist do Plano 13.

## Self-Check: PASSED

- `commits: 0` medido contra `plan_head_before` (docs-only legitimo). O push enviou commits ja existentes.
