---
phase: 01-funda-o-de-dados-e-acesso
plan: 10
subsystem: infra
tags: [cutover, backup, rehearsal, firebase-auth, railway, runbook-r0-r1]

requires:
  - phase: 01-03
    provides: "scripts de admin (export-firestore, backfill, verify, create-users, rehearsal)"
  - phase: 01-09
    provides: "suite completa e build verdes"
provides:
  - "hid do casal gerado uma vez (backups/cutover-hid.txt, local e ignorado pelo git)"
  - "Backup JSON completo de producao (371 documentos) e contagens por colecao, fora do git"
  - "Ensaio no emulador com o backup real: antes = depois em todas as colecoes, 0 sem dono, segunda rodada 0"
  - "Registro do estado do Railway e do Firebase CLI"
affects: [01-11, 01-12, 01-13]

key-files:
  created: []
  modified: []

key-decisions:
  - "Plano parou no checkpoint da Task 3 e foi concluido depois da resposta do dono (contas criadas, go registrado); neste plano nada foi escrito nos documentos de producao (so as contas Auth foram criadas pelo dono)"
  - "Permissao do arquivo da chave de servico ajustada de 664 para 600 (arquivo fora do repositorio; so o modo foi alterado, conteudo nunca lido)"

requirements-completed: []


actuals:
  tokens: 9000
  tasks: 1
  commits: 0
plan_head_before: 22c27e546df8f43537238b3454acbe658e0ef27b

duration: ~15min
completed: 2026-11-17
status: complete
---

# Phase 1 Plan 10: Cutover parte 1 (R0 e R1) Summary

**Status: COMPLETO. Backup de producao, suite completa e ensaio no emulador verdes; Firebase Authentication habilitado, as duas contas criadas pelo dono (claims verificados com create-users --list) e go registrado (Task 3).**

## Task 1 (checkpoint human-action): respondido pelo dono

- Chave de servico (fora do repositorio, conteudo nunca lido): `/home/glow/Downloads/financias-ratimbum-firebase-adminsdk-fbsvc-abd534cf05.json`. Existe, modo ajustado para 600. O caminho esta em `backups/cutover-sa-path.txt` (ignorado pelo git). A chave foi aceita pelo `initAdmin` (modo=production, projeto=financias-ratimbum) e leu o Firestore.
- Firebase CLI: o dono confirmou "Already logged in". Projeto alvo: `financias-ratimbum` (alvo default do `.firebaserc`; alvo `amigo` = `financias-xrd` NAO usado, D-15).
- Railway (capturas do dono): servico "FinanciasRatim" no projeto pure-communication/production; repositorio byglow9/FinanciasRatim, branch main com deploy automatico a cada push; Root Directory "/server"; builder Railpack (node@20.2.2 por padrao); sem comando de build/start personalizado; variaveis (so nomes): ALLOWED_ORIGINS, APP_API_KEY, FIREBASE_SERVICE_ACCOUNT, PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET (+8 adicionadas pelo Railway).
  - Consequencia para o Plano 12: o Root Directory precisa ser limpo e o Dockerfile da raiz usado (`shared/` fica fora de `/server`). ATENCAO: push na main faz deploy automatico; commits de codigo que mudem o servidor nao devem ser enviados (push) antes de o Plano 12 ser rodado de forma deliberada.
  - Ainda DESCONHECIDO (perguntar no Plano 12): se o mesmo servidor Railway tambem atende o site do amigo.
- Pendente da Task 1 (nao respondido): plano/custo do Railway, quantidade de usuarios no Auth, se existe opcao de desativar criacao de contas (user actions).

## Task 2 (auto): R0 e R1

1. **hid** gerado uma unica vez em `backups/cutover-hid.txt` (20 caracteres hexadecimais; valor: `9825a991f72eba0c5292`, identificador do casal, nao e segredo de acesso). Nao regenerar (D-02).
2. **Backup de producao** (somente leitura) em `backups/2026-11-17-pre-cutover.json` (129 KB, modo 600, `git status` nao lista), contagens em `backups/2026-11-17-counts.txt`:

   | Colecao | Documentos |
   |---------|-----------|
   | bankConnections | 1 |
   | bankImports | 59 |
   | eventCategories | 3 |
   | events | 3 |
   | fixedExpensePayments | 31 |
   | fixedExpenses | 73 |
   | goalContributions | 3 |
   | notes | 2 |
   | savings | 4 |
   | settings | 1 |
   | transactions | 191 |
   | **Total** | **371** |

   (`goals` nao existe em producao: 0 documentos.)
3. **Auditoria de usuarios do Auth: FALHOU, nao concluida.** `create-users.js --list` devolveu `There is no configuration corresponding to the provided identifier.` (CONFIGURATION_NOT_FOUND). Leitura mais provavel: o Firebase Authentication nunca foi inicializado no projeto `financias-ratimbum` (coerente com o login legado `ratimbum` por variavel de ambiente). Acao do dono: Console Firebase > Authentication > Comecar > habilitar o provedor E-mail/senha; depois repetir `--list`. Sem isso a Task 3 nao pode criar contas.
4. **Suite completa verde** antes de qualquer mudanca em producao: `test:core` 50/50, `test:core:tz` 50/50 (UTC) e 50/50 (Asia/Tokyo), `test:server` 20/20, `test:static` 36 testes (35 pass, 1 skipped, 0 fail), `test:rules` 10/10, `test:emu` 48/48, `npm run build` ok (so aviso de chunk grande).
5. **Ensaio no emulador** (`demo-coinki`, backup real) imprimiu `ensaio: OK`, sem MISMATCH:

   | Colecao | Antes | Depois | Sem dono |
   |---------|------:|-------:|---------:|
   | savings | 4 | 4 | 0 |
   | transactions | 191 | 191 | 0 |
   | events | 3 | 3 | 0 |
   | goals | 0 | 0 | 0 |
   | eventCategories | 3 | 3 | 0 |
   | notes | 2 | 2 | 0 |
   | fixedExpenses | 73 | 73 | 0 |
   | fixedExpensePayments | 31 | 31 | 0 |
   | goalContributions | 3 | 3 | 0 |
   | settings | 1 | 1 | 0 |
   | bankConnections | 1 | 1 | 0 |
   | bankImports | 59 | 59 | 0 |

Nenhum comando escreveu em producao (export e listagem sao somente leitura; o ensaio rodou so no emulador).

## Task 3 (checkpoint human-action, blocking-human): RESPONDIDO PELO DONO

- Firebase Authentication habilitado (provedor e-mail/senha); auditoria `create-users.js --list` repetida com sucesso.
- Contas criadas em producao (hid `9825a991f72eba0c5292`), claims `hid` e `person` verificados via `create-users --list`:
  - ele = renancavenaghizuri@gmail.com, uid `0PtYZUZXdYY5bKggll7mpTVPEok2`
  - ela = lothammerjulia1504@gmail.com, uid `x2TzrjEcIvQ7S75pKFs7hR4EfkV2`
  (senhas digitadas pelo dono; nunca passaram pelo agente).
- Go do dono, literal, no chat, em resposta ao prompt "Responda go: release A + backfill ou hold: motivo": **"CONTINUE PODE FAZER"**.

## Deviations from Plan

**1. [Rule 3 - Bloqueio, nao corrigivel pelo agente] Authentication nao habilitado no projeto (RESOLVIDO: o dono habilitou o provedor e a auditoria passou)**
- **Found during:** Task 2, passo 3 (auditoria de usuarios)
- **Issue:** `listUsers` falha com CONFIGURATION_NOT_FOUND.
- **Fix:** nenhum automatico (habilitar o provedor e acao de console do dono). Registrado como parte do checkpoint da Task 3.
- **Impacto:** resolvido; `--list` funcionou depois que o dono habilitou o Authentication.

**2. [Rule 2 - Seguranca] Permissao da chave de servico 664 -> 600** (T-01-40; fora do repositorio, so o modo foi alterado).

## Known Stubs

Nenhum (plano operacional, sem arquivos rastreados alterados).

## Self-Check: PASSED

- backups/cutover-hid.txt, backups/cutover-sa-path.txt, backups/2026-11-17-pre-cutover.json e backups/2026-11-17-counts.txt existem e nao aparecem no `git status`.
- Nenhum commit de codigo neste plano (`commits: 0` medido contra `plan_head_before`, docs-only legitimo).
