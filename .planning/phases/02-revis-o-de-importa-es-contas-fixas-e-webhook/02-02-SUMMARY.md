---
phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
plan: 02
subsystem: server
tags: [webhook, pluggy, script, idempotencia, seguranca, node-test]
requires:
  - phase: 02-revis-o-de-importa-es-contas-fixas-e-webhook
    provides: "POST /webhooks/pluggy autenticado por x-webhook-secret (Plano 01)"
provides:
  - "server/scripts/register-webhooks.js: registerWebhooks, validateWebhookUrl, main, WEBHOOK_EVENTS_TO_REGISTER"
  - "Comando unico e repetivel para registrar, reaplicar, reativar e testar (dry-run) os 4 webhooks da Pluggy"
affects: [02-06]
tech-stack:
  added: []
  patterns:
    - "Logica exportada e testavel com Pluggy falsa; main so le env e nunca chama process.exit"
    - "Segredo fora de qualquer saida: headers nunca logado e mensagens de erro de terceiros mascaradas"
key-files:
  created:
    - server/scripts/register-webhooks.js
    - server/test/register-webhooks.test.js
  modified: []
key-decisions:
  - "Contagem separada: webhook desativado pela Pluggy conta em reactivated, nao em updated"
  - "Mensagens de erro vindas do SDK passam por mascara que troca o segredo do webhook e o client secret por [oculto]"
  - "validateWebhookUrl devolve motivo fixo, nunca um trecho da URL (ela poderia carregar usuario e senha)"
requirements-completed: [REV-06]
duration: 20min
completed: 2026-11-17
status: complete
commits: 4
plan_head_before: e478d2468544017c97b865aeb0fffcab91a78c2f
actuals:
  tokens: 4400
  tasks: 2
  commits: 4
---

# Phase 2 Plan 02: Registro dos webhooks da Pluggy Summary

**Script local idempotente que registra na Pluggy os 4 eventos (item/updated, transactions/created|updated|deleted) com o cabecalho `x-webhook-secret`, reaplica cabecalhos, reativa webhooks desativados, desativa duplicados por update e nunca imprime o segredo.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-11-17
- **Tasks:** 2 (1 tracer, 1 auto, ambas TDD)
- **Files modified:** 2 (ambos novos)

## Accomplishments

- `main` com env completo e Pluggy falsa cria exatamente 4 webhooks, cada um com a URL e o cabecalho secreto, e devolve 0 (REV-06, D-06).
- Segunda execucao nao cria nada: 4 `updateWebhook` com `{ headers, enabled: true }`; o que falta e criado e o resto atualizado.
- Webhook com `disabledAt` e reativado e marcado `(estava desativado)`; duplicados do mesmo evento e URL recebem `{ enabled: false }` (nunca `deleteWebhook`); outras URLs e eventos ficam intocados.
- `--dry-run` so chama `fetchWebhooks` e loga criaria, atualizaria e desativaria.
- `validateWebhookUrl` rejeita http, usuario e senha, query, fragmento, localhost, IP literal (v4 e v6), porta diferente de 443 e caminho diferente de `/webhooks/pluggy`. Segredo com menos de 32 caracteres e recusado antes de criar o cliente.
- Teste com segredo sentinela coleta `log` e `logError` e prova que o valor nunca aparece, inclusive quando o proprio erro do SDK ecoa o segredo.

## Task Commits

1. **Task 1: Tracer, main, registerWebhooks e Pluggy falsa criam os quatro webhooks**
   - RED `788bcca7` test(02-02): add failing test for registro dos webhooks da Pluggy
   - GREEN `f9ec1555` feat(02-02): script cria os 4 webhooks da Pluggy com cabecalho secreto
2. **Task 2: Idempotencia, reativacao, duplicados, dry-run e validacao**
   - RED `0ec5198b` test(02-02): add failing tests for idempotencia, reativacao, duplicados e validacao
   - GREEN `ce608272` feat(02-02): registro idempotente com reativacao, duplicados, dry-run e validacao

## Files Created/Modified

- `server/scripts/register-webhooks.js` (novo): cabecalho de uso (4 variaveis, `--dry-run`, ordem de rotacao), `WEBHOOK_EVENTS_TO_REGISTER`, `validateWebhookUrl`, `registerWebhooks`, `main` e guarda de execucao direta.
- `server/test/register-webhooks.test.js` (novo): 15 testes com Pluggy falsa.

## Decisions Made

Ver `key-decisions` no frontmatter. Todas seguem D-06 e as mitigacoes T-02-08 a T-02-12 do plano. O script so usa `fetchWebhooks`, `createWebhook` e `updateWebhook`; nao importa Firebase nem le arquivos de ambiente.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Notas de execucao (nao sao desvios de codigo)

- **RED da Task 1 com esqueleto:** como o arquivo do script nao existia, o RED foi commitado junto com um esqueleto sem comportamento (`main` devolve 1, `registerWebhooks` devolve zeros), para que os 3 testes falhassem por assertiva e nao por erro de carga do modulo.
- **RED da Task 2:** 5 dos 12 testes novos falham por assertiva sobre `registerWebhooks`/`main`; os 2 de `validateWebhookUrl` falham porque a funcao ainda nao existia (comportamento planejado). Os 3 testes do tracer continuaram verdes.
- **Import:** o plano cita `fileURLToPath`; so `pathToFileURL` e necessario, entao so ele foi importado (evita variavel nao usada).
- **Gate do tracer:** `<verify>` do tracer rodado de ponta a ponta apos o GREEN (40 testes, 0 falhas) antes de expandir para a Task 2.
- Arquivos ja modificados antes do plano (`.env.local`, `.planning/config.json`, `.planning/milestone.lock`, `.planning/state.json`) ficaram fora dos commits, como mandam as regras de execucao; nenhum `.env*` foi lido.

## TDD Gate Compliance

- Task 1: `test(02-02)` `788bcca7` precede `feat(02-02)` `f9ec1555`.
- Task 2: `test(02-02)` `0ec5198b` precede `feat(02-02)` `ce608272`.
- Nenhum REFACTOR necessario.

## Issues Encountered

None.

## Known Stubs

None. O esqueleto do RED foi substituido pela implementacao no GREEN.

## Threat Flags

Nenhuma superficie nova alem do `<threat_model>` do plano. Mitigacoes aplicadas: T-02-08 (headers nunca logado, erro mascarado, teste sentinela), T-02-09 (so `process.env`, sem Firebase), T-02-10 (`validateWebhookUrl`), T-02-11 (listar antes de criar, duplicados desativados por update), T-02-12 (segredo minimo de 32 caracteres antes de qualquer chamada).

## Verificacao

- `. ./scripts/dev-env.sh && npm --prefix server test`: 52 testes, 0 falhas (15 novos de register-webhooks).
- `grep -o "pluggy\.[a-zA-Z]*"` no script lista so `fetchWebhooks`, `createWebhook` e `updateWebhook`.
- `npx eslint server/scripts/register-webhooks.js` sem avisos.

## Pendencias para o dono (Plano 06)

- Rodar o script com as credenciais no shell (`PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_SECRET`, `WEBHOOK_URL`), primeiro com `--dry-run`. A execucao real e do dono; o agente nao tem as credenciais.

## Self-Check: PASSED

Arquivos conferidos: `server/scripts/register-webhooks.js`, `server/test/register-webhooks.test.js`. Commits `788bcca7`, `f9ec1555`, `0ec5198b`, `ce608272` presentes em `git log`.
