---
phase: 01-funda-o-de-dados-e-acesso
plan: 13
subsystem: infra
tags: [cutover, firestore-rules, rollback, runbook-r7-r8]

requires:
  - phase: 01-12
    provides: "Servidor novo, 11 indices prontos, Release B no ar e go-publish-rules do dono"
provides:
  - "Regras restritivas por dono (firestore.rules do repositorio) publicadas em financias-ratimbum em 2026-11-17T18:31:31Z"
  - "Rollback em um deploy conhecido e ensaiado no emulador (firebase.rollback.json)"
  - "Decisao do dono: keep (regras mantidas)"
affects: [fase-2]

key-files:
  created: []
  modified: []

key-decisions:
  - "Dono respondeu keep ('tudo certo') no checkpoint de conferencia: regras restritivas permanecem publicadas"
  - "Task 3 (R8, pos-cutover) NAO confirmada pelo dono: ele recusou novas perguntas ('faz os bgl'); registrada como pendencias humanas nao bloqueantes, nao como feita"

requirements-completed: [FUND-03]

actuals:
  tokens: 4000
  tasks: 3
  commits: 0
plan_head_before: bc488bece14aa2978a76f3062850b8b375519a61

duration: ~1h (executor anterior + orquestrador com o dono)
completed: 2026-11-17
status: complete-with-pending-human-chores
---

# Phase 1 Plan 13: Cutover parte 4 (R7 e R8) Summary

**Regras restritivas por dono publicadas em producao depois de um portao final verde (backfill idempotente, verify limpo, suites e build), com rollback de um deploy ensaiado; dono manteve as regras. A limpeza pos-cutover (R8) ficou como pendencias humanas nao confirmadas.**

Status do plano: `complete-with-pending-human-chores`. O objetivo de seguranca (success criterion 2) esta cumprido e evidenciado; as pendencias da Task 3 nao bloqueiam a fase, mas nao estao verificadas.

## Task 1: R7 - portao final e publicacao (auto)

Saida local (somente contagens e mensagens) em `backups/2026-11-17-rules-publish.txt` (ignorado pelo git).

1. Portao de dados: `backfill.js --apply` repetido escreveu 0 documentos em todas as colecoes (idempotente); `verify.js` OK: 371 documentos, 0 sem `ownerId`, 0 com dono errado, 0 sem `categoryId`.
2. Portao local: `test:core` 50/50, `test:core:tz` 50/50, `test:server` 50/50, `test:static` 35 pass + 1 skip (varredura de bundle, so com `DIST_SCAN`), `test:rules` 10/10, `test:emu` 48/48, `build` ok; `DIST_SCAN=1` 5/5.
3. Rollback ensaiado no emulador com `firebase.rollback.json`: `rollback-config-ok`.
4. Deploy: `firebase deploy --only firestore:rules --project financias-ratimbum` -> "Deploy complete!" em 2026-11-17T18:31:31Z. Arquivo publicado = `firestore.rules` versionado, sem edicao neste plano.

Comando de rollback (um unico deploy):
`firebase deploy --only firestore:rules --config firebase.rollback.json --project financias-ratimbum`

Pos-checagens executadas uma vez pelo agente com scripts descartaveis (nao e teste de fumaca automatico mantido, D-14):

| Principal | Leitura | Escrita |
|-----------|--------:|--------:|
| Anonimo | 403 | 403 |
| Conta sem claim hid | 403 | 403 |
| Conta de outro hid | 403 | 403 |
| Ele | 200 | criar + apagar 200 |
| Ela | 200 | criar + apagar 200 |
| Gravacao com ownerId alheio | - | 403 |

Sem `failed-precondition`; 11 indices compostos prontos; `verify.js` OK depois dos testes.

## Task 2: checkpoint decision (blocking-human)

Resposta do dono, registrada literalmente: **`keep`** ("tudo certo"). As regras restritivas permanecem publicadas (deploy de 2026-11-17T18:31:31Z). O rollback nao foi executado.

Ressalva (human_judgment): o "keep" e a confirmacao do dono; a conferencia tela a tela do checklist nao foi detalhada na resposta. A tela Bancos > "Sincronizar agora" com Release B (pendencia do Plano 12) nao foi evidenciada separadamente; so o servidor foi provado por HTTP (401 sem token, 401 com `x-api-key` sem token).

## Task 3: R8 - pos-cutover (checkpoint human-action) - NAO confirmada

O dono recusou receber mais perguntas ("faz os bgl"). Nenhum item abaixo foi confirmado por ele e o agente nao consegue verificar os itens locais. Todos registrados como `human_judgment`/nao verificados, nao como feitos:

| # | Pendencia | Estado |
|---|-----------|--------|
| 1 | Firebase Auth: desativar "user actions" (criacao de contas pelos usuarios) | Nao verificado. Mitigacao ja ativa: as regras negam conta sem claim `hid`; auditoria do Auth mostra so 2 contas (ele uid=0PtYZUZXdYY5bKggll7mpTVPEok2, ela uid=x2TzrjEcIvQ7S75pKFs7hR4EfkV2, ambas hid=9825a991f72eba0c5292), nenhuma desconhecida |
| 2 | Remover do `.env.local` as variaveis do login legado e `VITE_BANK_API_KEY` | Nao verificado: o agente nao le esse arquivo |
| 3 | Confirmar que `APP_API_KEY` nao existe mais no Railway | Nao verificado no painel; evidencia indireta: servidor responde 401 a `x-api-key` sem token |
| 4 | Guardar `backups/` em local seguro ate o fim da Fase 2 e depois apagar | Pasta existe localmente e e ignorada pelo git (`git check-ignore backups`) |
| 5 | `git rm --cached .env.local` (arquivo ainda rastreado) | Pendente; o guard de segredos bloqueia o agente, rodar manualmente |
| 6 | Trocar as senhas das duas contas (foram compartilhadas no chat) por e-mail de redefinicao | Pendente |

Nenhuma conta foi excluida (nao havia desconhecidas); a verificacao `create-users.js --list` desta tarefa ja estava coberta pela auditoria de Auth registrada na Task 1 (2 contas, ambas com claims).

## Deviations from Plan

**1. [Checkpoint] Task 3 nao respondida** - o dono recusou perguntas adicionais; em vez do sinal "pos-cutover feito: ...", as pendencias acima foram registradas como nao confirmadas. Plano marcado `complete-with-pending-human-chores`.

Nenhuma correcao automatica (Rules 1-3). Nenhum arquivo rastreado alterado; alvo amigo (financias-xrd) e `build:amigo` nao usados; nenhum `git push` nem mudanca em producao nesta etapa de fechamento.

## Requisitos FUND-01..FUND-07

Todos marcados concluidos nos SUMMARYs da fase onde ha evidencia: FUND-03 marcado agora (regras testadas no emulador 10/10 e 48/48, publicadas apos login, `ownerId`, indices e cliente, e verificadas em producao); FUND-01, 02, 04, 05, 06 e 07 ja constavam concluidos. Ressalva em FUND-01 ("cadastro aberto deixa de existir"): a interface nao tem cadastro e as regras barram contas sem claim, mas o desligamento de "user actions" no Console (pendencia 1) nao esta verificado.

## Known Stubs

Nenhum (plano operacional, sem arquivos rastreados alterados).

## Threat Flags

Nenhum novo. Ameacas T-01-56 (contas desconhecidas) e T-01-57 (credenciais legadas) ficam mitigadas nas camadas de regras e servidor; a limpeza local/Console esta pendente (itens 1 a 3, 6).

## Self-Check: PASSED

- `backups/2026-11-17-rules-publish.txt` existe (local, ignorado pelo git).
- `commits: 0` medido contra `plan_head_before` (docs-only legitimo; nenhum arquivo rastreado de codigo alterado).
