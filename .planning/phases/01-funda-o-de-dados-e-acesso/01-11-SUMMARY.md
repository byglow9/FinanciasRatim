---
phase: 01-funda-o-de-dados-e-acesso
plan: 11
subsystem: infra
tags: [cutover, hosting, release-a, backfill, ownerId, categoryId, runbook-r2-r3]

requires:
  - phase: 01-10
    provides: "hid, backup pre-cutover (371 docs), contas Firebase criadas, go do dono"
  - phase: 01-05
    provides: "script build:release-a (leituras sem filtro de dono)"
  - phase: 01-06
    provides: "backfill.js e verify.js"
provides:
  - "Release A no ar em https://financias-ratimbum.web.app (login so Firebase, leituras sem filtro de dono)"
  - "Todo o historico de producao com ownerId = hid e categoryId (371 documentos, 11 colecoes com dados)"
  - "verify.js OK: 0 sem ownerId, 0 com dono errado, 0 sem categoryId"
affects: [01-12, 01-13]

key-files:
  created: []
  modified: []

key-decisions:
  - "Dry-run executado ANTES do deploy do Hosting (inversao dos passos 3 e 4 da Task 1) para poder parar antes de publicar caso houvesse conflito; ambos sao independentes"
  - "Task 2 (checkpoint blocking-human) tratado com o go literal do dono dado antes do Release A (ver abaixo); a conferencia manual das telas por Ele e Ela nao foi registrada separadamente"

requirements-completed: [FUND-01, FUND-02]

actuals:
  tokens: 6000
  tasks: 3
  commits: 0
plan_head_before: 29ea30e2300d88665e6811fdbd5df371aa7e2b95

duration: ~10min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 11: Cutover parte 2 (R2 e R3) Summary

**Release A publicado so no Hosting de financias-ratimbum e backfill de producao aplicado: 371 documentos com ownerId e categoryId, contagens antes = depois em todas as colecoes e verify limpo.**

## Go do dono (literal)

O dono respondeu no chat, ao prompt "Responda go: release A + backfill ou hold: motivo": **"CONTINUE PODE FAZER"**. Esse go cobre "release A + backfill" e foi repassado pelo orquestrador.

Ressalva registrada: o go foi dado antes de o Release A estar no ar. O checkpoint da Task 2 pedia que Ele e Ela conferissem as telas do site publicado antes do apply; essa conferencia manual nao foi feita/registrada separadamente antes do apply. O apply e aditivo (so preenche campos ausentes), idempotente e ha backup completo, mas a conferencia das telas continua pendente e deve ser feita por Ele e Ela (ver "Pendencias").

## Task 1: Release A e dry-run

1. `npm run build:release-a` ok (so aviso de chunk grande); bundle `index-CdE_pqss.js`.
2. `DIST_SCAN=1 node --test test/static/no-legacy-auth.test.js`: 5/5 pass, 0 skipped (bundle sem credencial legada nem chave compartilhada).
3. Dry-run do backfill em producao (somente leitura, antes do deploy): `toWrite` = documentos de cada colecao, antes = depois, zero conflitos, zero erros, nenhuma colecao desconhecida, `settings/main` presente. `categorias orfas arquivadas: 1` e comportamento previsto (D-08): uma categoria usada em lancamentos e sem definicao em `settings/main` e arquivada como definicao.
4. `firebase deploy --only hosting --project financias-ratimbum`: release complete. Nenhuma regra do Firestore publicada; alvo amigo (financias-xrd) e build:amigo nao usados.
5. `curl` em https://financias-ratimbum.web.app/: HTTP 200 e o HTML referencia `assets/index-CdE_pqss.js` (o build novo).

## Task 2: checkpoint decision (blocking-human)

Resolvido com o go literal acima (opcao go-backfill). Ver ressalva sobre a conferencia manual.

## Task 3: apply do backfill e verify

Tabela do apply (producao, projeto financias-ratimbum, hid 9825a991f72eba0c5292); saidas locais em `backups/2026-11-17-backfill-dryrun.txt`, `backups/2026-11-17-backfill-apply.txt` e `backups/2026-11-17-verify.txt` (ignorados pelo git):

| Colecao | antes | depois | a escrever (dry-run) | escritos (apply) |
|---------|------:|-------:|---------------------:|-----------------:|
| savings | 4 | 4 | 4 | 4 |
| transactions | 191 | 191 | 191 | 191 |
| events | 3 | 3 | 3 | 3 |
| goals | 0 | 0 | 0 | 0 |
| eventCategories | 3 | 3 | 3 | 3 |
| notes | 2 | 2 | 2 | 2 |
| fixedExpenses | 73 | 73 | 73 | 73 |
| fixedExpensePayments | 31 | 31 | 31 | 31 |
| goalContributions | 3 | 3 | 3 | 3 |
| settings | 1 | 1 | 1 | 1 |
| bankConnections | 1 | 1 | 1 | 1 |
| bankImports | 59 | 59 | 59 | 59 |
| **Total** | **371** | **371** | **371** | **371** |

As contagens batem com o backup pre-cutover (371) e com `backups/2026-11-17-counts.txt`.

`verify.js --hid HID --baseline backups/2026-11-17-pre-cutover.json` (sem modo estrito): exit 0, `verify: OK`; em todas as colecoes 0 sem ownerId, 0 com ownerId errado, 0 sem categoryId. Segundo apply nao foi necessario.

## Degradacao temporaria conhecida (bancos)

O Railway ainda roda o servidor ANTIGO (x-api-key). O Release A envia Bearer token nas chamadas bancarias, entao conectar/sincronizar o banco pelo site pode falhar ate o Plano 12 (servidor novo). Os botoes do banco falhando sao esperados nesse intervalo. Railway nao foi tocado neste plano. O Plano 12 resolve.

## Deviations from Plan

**1. [Ordem] Dry-run antes do deploy** — passos 3 e 4 da Task 1 invertidos de proposito (dry-run e somente leitura e independente do deploy); permitia abortar antes de publicar. Sem impacto no resultado.

**2. [Checkpoint] Task 2 resolvida pelo go previo do dono, sem conferencia manual registrada das telas** (ver "Go do dono").

Nenhuma correcao automatica (Rules 1-3) foi necessaria.

## Known Stubs

Nenhum (plano operacional, sem arquivos rastreados alterados).

## Threat Flags

Nenhum novo. `.env.local` aparece modificado no `git status` desde antes deste plano; nao foi lido nem commitado.

## Pendencias

- Ele e Ela devem entrar em https://financias-ratimbum.web.app e conferir Resumo, Transacoes, Contas fixas, Metas, Porquinho, Calendario, Relatorios, Notas e Configuracoes (historico igual ao de antes). Se algo estiver diferente, usar o backup `backups/2026-11-17-pre-cutover.json`.
- Plano 12: servidor novo no Railway (nao fazer `git push` antes, deploy automatico na main). Plano 13: regras restritivas.

## Self-Check: PASSED

- Site respondeu 200 e serve `index-CdE_pqss.js`, o bundle gerado localmente.
- `verify.js` exit 0 (`verify: OK`) apos o apply.
- `commits: 0` medido contra `plan_head_before` (docs-only legitimo; so SUMMARY/STATE/ROADMAP neste plano). Nenhum `git push`.
